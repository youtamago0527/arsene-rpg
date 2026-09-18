import assert from 'node:assert/strict';
import { createHmac, webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';

globalThis.crypto ||= webcrypto;
globalThis.btoa ||= value => Buffer.from(value, 'binary').toString('base64');

const libSource = await readFile(new URL('../functions/api/_lib/web-store.js', import.meta.url), 'utf8');
const lib = await import(`data:text/javascript;base64,${Buffer.from(libSource).toString('base64')}`);

const expected = [
  'time-complete-pass', 'ad-skip-license', 'ad-skip-tickets', 'auto3-license',
  'sweep-license', 'otherworld-tickets', 'rebirth-arcana',
  'protection-arcana', 'blessed-protection-arcana'
];
assert.deepEqual(Object.keys(lib.PRODUCTS), expected, 'all nine products must be server-authoritative');
assert.equal(new Set(Object.values(lib.PRODUCTS).map(item => item.priceEnv)).size, 9);
assert.equal(new Set(Object.values(lib.PRODUCTS).map(item => item.productId)).size, 9);
assert.equal(lib.PRODUCTS['ad-skip-tickets'].amount, 160);

const restoreKey = lib.issueRestoreKey();
assert.equal(lib.validRestoreKey(restoreKey), true);
assert.equal(restoreKey.length, 48);

const raw = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed' });
const timestamp = 2_000_000_000;
const secret = 'whsec_test_only';
const signature = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
assert.equal(await lib.verifyStripeSignature(raw, `t=${timestamp},v1=${signature}`, secret, timestamp), true);
assert.equal(await lib.verifyStripeSignature(`${raw} `, `t=${timestamp},v1=${signature}`, secret, timestamp), false, 'raw-body mutation must fail');
assert.equal(await lib.verifyStripeSignature(raw, `t=${timestamp - 301},v1=${signature}`, secret, timestamp), false, 'stale webhook must fail');

const env = {
  STRIPE_SECRET_KEY: 'sk_test_only', STRIPE_LIVEMODE: 'false', STRIPE_CURRENCY: 'jpy',
  STRIPE_PRICE_AD_SKIP_TICKETS_10: 'price_ticket10'
};
const paidSession = {
  id: 'cs_test_good', payment_intent: 'pi_good', mode: 'payment', status: 'complete',
  payment_status: 'paid', livemode: false, currency: 'jpy', amount_total: 160,
  metadata: { item_id: 'ad-skip-tickets', buyer_hash: 'a'.repeat(64) },
  line_items: { data: [{ quantity: 1, currency: 'jpy', amount_total: 160,
    price: { id: 'price_ticket10', product: 'prod_VH71R5RoTzsTbU', active: true, type: 'one_time', currency: 'jpy', unit_amount: 160 } }] }
};
const originalFetch = globalThis.fetch;
const configuredPrice = { id: 'price_ticket10', product: { id: 'prod_VH71R5RoTzsTbU' }, active: true, type: 'one_time', currency: 'jpy', unit_amount: 160, livemode: false };
globalThis.fetch = async url => Response.json(String(url).includes('/prices/') ? configuredPrice : paidSession);
assert.equal((await lib.loadAndValidateSession(env, 'cs_test_good')).itemId, 'ad-skip-tickets');
for (const invalid of [
  { payment_status: 'unpaid' }, { status: 'open' }, { mode: 'subscription' },
  { livemode: true }, { amount_total: 999 },
  { line_items: { data: [{ ...paidSession.line_items.data[0], quantity: 2 }] } },
  { line_items: { data: [{ ...paidSession.line_items.data[0], price: { id: 'price_attacker' } }] } }
]) {
  globalThis.fetch = async url => Response.json(String(url).includes('/prices/') ? configuredPrice : { ...paidSession, ...invalid });
  await assert.rejects(() => lib.loadAndValidateSession(env, 'cs_test_bad'));
}
globalThis.fetch = originalFetch;

const migration = await readFile(new URL('../migrations/0001_web_store.sql', import.meta.url), 'utf8');
assert.match(migration, /session_id TEXT PRIMARY KEY/);
assert.match(migration, /payment_intent_id TEXT UNIQUE/);
assert.match(migration, /event_id TEXT PRIMARY KEY/);
const recorder = await readFile(new URL('../functions/api/_lib/web-store.js', import.meta.url), 'utf8');
assert.match(recorder, /INSERT OR IGNORE INTO web_store_events/);
assert.match(recorder, /SESSION_NOT_IN_LEDGER/, 'webhooks must not mint purchases outside a checkout-created ledger row');
assert.match(recorder, /ready_at=COALESCE\(ready_at/);
const claims = await readFile(new URL('../functions/api/store/claims.js', import.meta.url), 'utf8');
assert.match(claims, /claim_token_hash IS NULL OR claim_token_hash=\?1/,
  'a second browser must not overwrite an active delivery reservation');
assert.match(claims, /claim_token_hash=\?2/,
  'only rows reserved by the caller may be returned');
console.log('Web store backend regression checks passed.');
