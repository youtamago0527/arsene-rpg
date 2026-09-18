import { assertOrigin, bearer, ensureBuyer, json, productType, readJson, sha256 } from '../_lib/web-store.js';

const SELECT_PENDING = `SELECT session_id, item_id FROM web_store_sessions
  WHERE buyer_hash=?1 AND ready_at IS NOT NULL AND claimed_at IS NULL
  ORDER BY ready_at ASC LIMIT 50`;

export async function onRequestGet({ request, env }) {
  try {
    const buyerHash = await ensureBuyer(env, bearer(request));
    const pending = await env.STORE_DB.prepare(SELECT_PENDING).bind(buyerHash).all();
    const permanent = await env.STORE_DB.prepare(`SELECT DISTINCT item_id FROM web_store_sessions
      WHERE buyer_hash=?1 AND ready_at IS NOT NULL AND item_id IN
      ('time-complete-pass','ad-skip-license','auto3-license','sweep-license')`).bind(buyerHash).all();
    return json({
      pending: (pending.results || []).map(row => ({ deliveryId: row.session_id, itemId: row.item_id })),
      permanent: (permanent.results || []).map(row => row.item_id)
    });
  } catch {
    return json({ error: '購入情報を取得できませんでした。' }, 401);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    assertOrigin(request, env);
    const buyerHash = await ensureBuyer(env, bearer(request));
    const { claimToken } = await readJson(request, 256);
    if (typeof claimToken !== 'string' || !/^[a-f0-9]{64}$/.test(claimToken)) return json({ error: '受領予約が無効です。' }, 400);
    const tokenHash = await sha256(claimToken);
    const now = Date.now();
    await env.STORE_DB.prepare(`UPDATE web_store_sessions SET claim_token_hash=?1, claim_started_at=?2, updated_at=?2
      WHERE buyer_hash=?3 AND ready_at IS NOT NULL AND claimed_at IS NULL
        AND (claim_token_hash IS NULL OR claim_token_hash=?1)`).bind(tokenHash, now, buyerHash).run();
    const rows = await env.STORE_DB.prepare(`SELECT session_id, item_id FROM web_store_sessions
      WHERE buyer_hash=?1 AND ready_at IS NOT NULL AND claimed_at IS NULL AND claim_token_hash=?2
      ORDER BY ready_at ASC LIMIT 50`).bind(buyerHash, tokenHash).all();
    const pending = rows.results || [];
    return json({
      claimToken,
      deliveries: pending.map(row => ({ deliveryId: row.session_id, itemId: row.item_id, type: productType(row.item_id) }))
    });
  } catch {
    return json({ error: '購入情報を準備できませんでした。' }, 401);
  }
}
