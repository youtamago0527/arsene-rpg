export const PRODUCTS = Object.freeze({
  'time-complete-pass': { priceEnv: 'STRIPE_PRICE_TIME_COMPLETE_PASS', productId: 'prod_VH6nGMFUaxHvIJ', amount: 1500, type: 'nonConsumable' },
  'ad-skip-license': { priceEnv: 'STRIPE_PRICE_AD_SKIP_LICENSE', productId: 'prod_VH6nfCIri3kpb9', amount: 900, type: 'nonConsumable' },
  'ad-skip-tickets': { priceEnv: 'STRIPE_PRICE_AD_SKIP_TICKETS_10', productId: 'prod_VH71R5RoTzsTbU', amount: 160, type: 'consumable' },
  'auto3-license': { priceEnv: 'STRIPE_PRICE_AUTO3_LICENSE', productId: 'prod_VH716cQdZkZblT', amount: 480, type: 'nonConsumable' },
  'sweep-license': { priceEnv: 'STRIPE_PRICE_SWEEP_LICENSE', productId: 'prod_VH717WWwlug0FW', amount: 480, type: 'nonConsumable' },
  'otherworld-tickets': { priceEnv: 'STRIPE_PRICE_OTHERWORLD_TICKETS_5', productId: 'prod_VH71C8l5amQwWl', amount: 200, type: 'consumable' },
  'rebirth-arcana': { priceEnv: 'STRIPE_PRICE_REBIRTH_ARCANA_1', productId: 'prod_VH72mBEyQLD6b9', amount: 200, type: 'consumable' },
  'protection-arcana': { priceEnv: 'STRIPE_PRICE_PROTECTION_ARCANA_1', productId: 'prod_VH72wUCzrkVdlI', amount: 200, type: 'consumable' },
  'blessed-protection-arcana': { priceEnv: 'STRIPE_PRICE_BLESSED_PROTECTION_ARCANA_1', productId: 'prod_VH72x1uelHhtua', amount: 500, type: 'consumable' }
});

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const TOKEN_PREFIX = 'arsr_';

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff'
    }
  });
}

export function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function issueRestoreKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${TOKEN_PREFIX}${base64Url(bytes)}`;
}

export function validRestoreKey(value) {
  return typeof value === 'string' && /^arsr_[A-Za-z0-9_-]{43}$/.test(value);
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function bearer(request) {
  const value = request.headers.get('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

export function assertOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) throw new Error('ORIGIN_REQUIRED');
  const own = new URL(request.url).origin;
  const allowed = new Set(String(env.STORE_ALLOWED_ORIGINS || own).split(',').map(value => value.trim()).filter(Boolean));
  if (origin !== own && !allowed.has(origin)) throw new Error('ORIGIN_REJECTED');
  return origin;
}

export async function readJson(request, maxBytes = 2048) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw new Error('JSON_REQUIRED');
  const text = await request.text();
  if (encoder.encode(text).byteLength > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
  return JSON.parse(text);
}

export function priceIdFor(env, itemId) {
  const entry = PRODUCTS[itemId];
  const priceId = entry && env[entry.priceEnv];
  if (!entry || typeof priceId !== 'string' || !/^price_[A-Za-z0-9]+$/.test(priceId)) return null;
  return priceId;
}

export async function stripeRequest(env, path, init = {}) {
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_NOT_CONFIGURED');
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(init.headers || {})
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'STRIPE_REQUEST_FAILED');
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function loadPrice(env, itemId) {
  const product = PRODUCTS[itemId];
  if (!product) throw new Error('UNKNOWN_PRODUCT');
  const configuredPriceId = priceIdFor(env, itemId);
  let price;
  if (configuredPriceId) {
    price = await stripeRequest(env, `/prices/${encodeURIComponent(configuredPriceId)}?expand[]=product`);
  } else {
    const prices = await stripeRequest(env, `/prices?product=${encodeURIComponent(product.productId)}&active=true&type=one_time&limit=10`);
    const matches = (prices.data || []).filter(candidate =>
      candidate.active && candidate.type === 'one_time'
      && candidate.currency === String(env.STRIPE_CURRENCY || 'jpy').toLowerCase()
      && candidate.unit_amount === product.amount
      && !!candidate.livemode === (String(env.STRIPE_LIVEMODE) === 'true'));
    if (matches.length !== 1) throw new Error('EXPECTED_PRICE_NOT_UNIQUE');
    price = matches[0];
  }
  const currency = String(env.STRIPE_CURRENCY || 'jpy').toLowerCase();
  const actualProductId = typeof price.product === 'string' ? price.product : price.product?.id;
  if (!price.active || price.type !== 'one_time' || actualProductId !== product.productId
    || price.unit_amount !== product.amount || price.currency !== currency) throw new Error('INVALID_PRICE');
  if (!!price.livemode !== (String(env.STRIPE_LIVEMODE) === 'true')) throw new Error('PRICE_MODE_MISMATCH');
  return price;
}

export async function loadAndValidateSession(env, sessionId) {
  const session = await stripeRequest(env, `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items.data.price`);
  const itemId = session?.metadata?.item_id;
  const buyerHash = session?.metadata?.buyer_hash;
  const expectedPrice = await loadPrice(env, itemId);
  const expectedPriceId = expectedPrice.id;
  const expectedCurrency = String(env.STRIPE_CURRENCY || 'jpy').toLowerCase();
  const lines = session?.line_items?.data || [];
  const line = lines[0];
  const valid = PRODUCTS[itemId]
    && /^[a-f0-9]{64}$/.test(buyerHash || '')
    && session.mode === 'payment'
    && session.status === 'complete'
    && session.payment_status === 'paid'
    && !!session.livemode === (String(env.STRIPE_LIVEMODE) === 'true')
    && lines.length === 1
    && line?.price?.id === expectedPriceId
    && line?.price?.active === true
    && line?.price?.type === 'one_time'
    && line?.price?.currency === expectedCurrency
    && Number.isInteger(line?.price?.unit_amount)
    && line?.quantity === 1
    && line?.currency === expectedCurrency
    && session.currency === expectedCurrency
    && line?.amount_total === line.price.unit_amount
    && session.amount_total === line.price.unit_amount;
  if (!valid) throw new Error('SESSION_VALIDATION_FAILED');
  return { session, itemId, buyerHash, priceId: expectedPriceId };
}

function parseStripeSignature(header) {
  const parts = String(header || '').split(',');
  let timestamp = '';
  const signatures = [];
  for (const part of parts) {
    const [key, value] = part.split('=', 2);
    if (key === 't') timestamp = value;
    if (key === 'v1') signatures.push(value);
  }
  return { timestamp, signatures };
}

function hexBytes(hex) {
  if (!/^[a-f0-9]{64}$/i.test(hex)) return null;
  return new Uint8Array(hex.match(/../g).map(value => Number.parseInt(value, 16)));
}

function equalBytes(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

export async function verifyStripeSignature(rawBody, header, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const { timestamp, signatures } = parseStripeSignature(header);
  const numericTimestamp = Number(timestamp);
  if (!secret || !Number.isInteger(numericTimestamp) || Math.abs(nowSeconds - numericTimestamp) > 300 || !signatures.length) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${rawBody}`)));
  return signatures.some(signature => equalBytes(digest, hexBytes(signature)));
}

export function decodeJson(bytes) {
  return JSON.parse(decoder.decode(bytes));
}

export async function ensureBuyer(env, restoreKey) {
  if (!env.STORE_DB) throw new Error('STORE_DB_NOT_CONFIGURED');
  if (!validRestoreKey(restoreKey)) throw new Error('INVALID_RESTORE_KEY');
  const buyerHash = await sha256(restoreKey);
  const now = Date.now();
  await env.STORE_DB.prepare(`INSERT INTO web_store_buyers (buyer_hash, created_at, updated_at)
    VALUES (?1, ?2, ?2) ON CONFLICT(buyer_hash) DO UPDATE SET updated_at = excluded.updated_at`).bind(buyerHash, now).run();
  return buyerHash;
}

export async function recordPaidSession(env, eventId, eventType, verified) {
  const { session, itemId, buyerHash, priceId } = verified;
  const pending = await env.STORE_DB.prepare(`SELECT buyer_hash, item_id, price_id, quantity, mode, livemode
    FROM web_store_sessions WHERE session_id=?1`).bind(session.id).first();
  if (!pending
    || pending.buyer_hash !== buyerHash
    || pending.item_id !== itemId
    || pending.price_id !== priceId
    || pending.quantity !== 1
    || pending.mode !== 'payment'
    || !!pending.livemode !== !!session.livemode) throw new Error('SESSION_NOT_IN_LEDGER');
  const now = Date.now();
  await env.STORE_DB.batch([
    env.STORE_DB.prepare(`INSERT OR IGNORE INTO web_store_events (event_id, event_type, session_id, received_at)
      VALUES (?1, ?2, ?3, ?4)`).bind(eventId, eventType, session.id, now),
    env.STORE_DB.prepare(`UPDATE web_store_sessions SET
      payment_intent_id=?1, status='complete', payment_status='paid', stripe_event_id=?2,
      ready_at=COALESCE(ready_at, ?3), updated_at=?3
      WHERE session_id=?4 AND buyer_hash=?5 AND item_id=?6 AND price_id=?7
        AND quantity=1 AND mode='payment' AND livemode=?8`)
      .bind(session.payment_intent || null, eventId, now, session.id, buyerHash, itemId, priceId, session.livemode ? 1 : 0)
  ]);
}

export function productType(itemId) {
  return PRODUCTS[itemId]?.type || null;
}
