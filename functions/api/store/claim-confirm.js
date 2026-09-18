import { assertOrigin, bearer, ensureBuyer, json, readJson, sha256 } from '../_lib/web-store.js';

export async function onRequestPost({ request, env }) {
  try {
    assertOrigin(request, env);
    const buyerHash = await ensureBuyer(env, bearer(request));
    const { claimToken, deliveryIds } = await readJson(request, 4096);
    if (typeof claimToken !== 'string' || !Array.isArray(deliveryIds) || !deliveryIds.length || deliveryIds.length > 50) {
      return json({ error: '受領確認が無効です。' }, 400);
    }
    const cleanIds = [...new Set(deliveryIds.filter(id => typeof id === 'string' && /^cs_[A-Za-z0-9_]+$/.test(id)))];
    if (cleanIds.length !== deliveryIds.length) return json({ error: '受領確認が無効です。' }, 400);
    const tokenHash = await sha256(claimToken);
    const placeholders = cleanIds.map((_, index) => `?${index + 4}`).join(',');
    const now = Date.now();
    const result = await env.STORE_DB.prepare(`UPDATE web_store_sessions SET claimed_at=?1, updated_at=?1
      WHERE buyer_hash=?2 AND claim_token_hash=?3 AND claimed_at IS NULL AND session_id IN (${placeholders})`)
      .bind(now, buyerHash, tokenHash, ...cleanIds).run();
    if ((result.meta?.changes || 0) !== cleanIds.length) return json({ error: '受領状態が一致しません。' }, 409);
    return json({ confirmed: cleanIds.length });
  } catch {
    return json({ error: '受領を確定できませんでした。' }, 400);
  }
}
