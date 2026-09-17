const ALLOWED_ITEMS = new Set(['time-complete-pass','ad-skip-license','ad-skip-tickets','auto3-license','sweep-license','otherworld-tickets','rebirth-arcana','protection-arcana','blessed-protection-arcana']);
const json = (data, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
export async function onRequestGet({ request, env }) {
  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (!sessionId || !sessionId.startsWith('cs_')) return json({ error: '決済セッションが無効です。' }, 400);
  if (!env.STRIPE_SECRET_KEY) return json({ error: '決済サービスの設定が未完了です。' }, 503);
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  const session = await response.json(), itemId = session?.metadata?.item_id;
  if (!response.ok || session.payment_status !== 'paid' || !ALLOWED_ITEMS.has(itemId)) return json({ paid: false, error: '決済を確認できませんでした。' }, 400);
  return json({ paid: true, itemId });
}
