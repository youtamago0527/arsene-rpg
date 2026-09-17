const PRODUCT_IDS = {
  'time-complete-pass': 'prod_VH6nGMFUaxHvIJ', 'ad-skip-license': 'prod_VH6nfCIri3kpb9', 'ad-skip-tickets': 'prod_VH71R5RoTzsTbU',
  'auto3-license': 'prod_VH716cQdZkZblT', 'sweep-license': 'prod_VH717WWwlug0FW', 'otherworld-tickets': 'prod_VH71C8l5amQwWl',
  'rebirth-arcana': 'prod_VH72mBEyQLD6b9', 'protection-arcana': 'prod_VH72wUCzrkVdlI', 'blessed-protection-arcana': 'prod_VH72x1uelHhtua'
};
const json = (data, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
export async function onRequestPost({ request, env }) {
  try {
    const { itemId } = await request.json(), productId = PRODUCT_IDS[itemId];
    if (!productId) return json({ error: 'この商品は決済対象外です。' }, 400);
    if (!env.STRIPE_SECRET_KEY) return json({ error: '決済サービスの設定が未完了です。' }, 503);
    const pricesResponse = await fetch(`https://api.stripe.com/v1/prices?product=${productId}&active=true&limit=1`, { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
    const prices = await pricesResponse.json(), priceId = prices?.data?.[0]?.id;
    if (!pricesResponse.ok || !priceId) return json({ error: 'この商品の有効なStripe価格が見つかりません。' }, 503);
    const origin = new URL(request.url).origin;
    const form = new URLSearchParams({ mode: 'payment', success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/?checkout=cancelled`, 'line_items[0][price]': priceId, 'line_items[0][quantity]': '1', 'metadata[item_id]': itemId });
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' }, body: form });
    const session = await response.json();
    if (!response.ok) return json({ error: 'Stripeの決済セッションを作成できませんでした。' }, 502);
    return json({ url: session.url });
  } catch { return json({ error: '決済リクエストの形式が正しくありません。' }, 400); }
}
