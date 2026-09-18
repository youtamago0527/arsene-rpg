import { assertOrigin, bearer, ensureBuyer, json, loadPrice, PRODUCTS, readJson, stripeRequest } from '../_lib/web-store.js';

export async function onRequestPost({ request, env }) {
  try {
    const origin = assertOrigin(request, env);
    const restoreKey = bearer(request);
    const buyerHash = await ensureBuyer(env, restoreKey);
    const { itemId, attemptId } = await readJson(request, 1024);
    if (!PRODUCTS[itemId] || typeof attemptId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)) {
      return json({ error: '決済リクエストが無効です。' }, 400);
    }
    if (PRODUCTS[itemId].type === 'nonConsumable') {
      const owned = await env.STORE_DB.prepare(`SELECT 1 AS owned FROM web_store_sessions
        WHERE buyer_hash=?1 AND item_id=?2 AND ready_at IS NOT NULL LIMIT 1`).bind(buyerHash, itemId).first();
      if (owned?.owned) return json({ error: 'この商品は購入済みです。' }, 409);
    }
    const price = await loadPrice(env, itemId);
    const form = new URLSearchParams({
      mode: 'payment',
      success_url: `${origin}/?checkout=success&return=shop`,
      cancel_url: `${origin}/?checkout=cancelled&return=shop`,
      'line_items[0][price]': price.id,
      'line_items[0][quantity]': '1',
      'metadata[item_id]': itemId,
      'metadata[buyer_hash]': buyerHash,
      'metadata[attempt_id]': attemptId
    });
    const session = await stripeRequest(env, '/checkout/sessions', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'idempotency-key': `${buyerHash.slice(0, 32)}-${attemptId}`
      },
      body: form
    });
    const now = Date.now();
    await env.STORE_DB.prepare(`INSERT INTO web_store_sessions
      (session_id, buyer_hash, item_id, price_id, quantity, mode, status, payment_status, livemode, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, 1, 'payment', ?5, ?6, ?7, ?8, ?8)
      ON CONFLICT(session_id) DO NOTHING`)
      .bind(session.id, buyerHash, itemId, price.id, session.status || 'open', session.payment_status || 'unpaid', session.livemode ? 1 : 0, now).run();
    return json({ url: session.url });
  } catch (error) {
    const status = ['ORIGIN_REQUIRED', 'ORIGIN_REJECTED'].includes(error?.message) ? 403 : 400;
    return json({ error: status === 403 ? 'このサイトからは決済を開始できません。' : '決済を開始できませんでした。' }, status);
  }
}
