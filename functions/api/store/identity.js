import { assertOrigin, ensureBuyer, issueRestoreKey, json } from '../_lib/web-store.js';

export async function onRequestPost({ request, env }) {
  try {
    assertOrigin(request, env);
    const restoreKey = issueRestoreKey();
    await ensureBuyer(env, restoreKey);
    return json({ restoreKey });
  } catch (error) {
    return json({ error: '復元キーを発行できませんでした。' }, ['ORIGIN_REQUIRED', 'ORIGIN_REJECTED'].includes(error?.message) ? 403 : 503);
  }
}
