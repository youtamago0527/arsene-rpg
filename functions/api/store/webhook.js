import { json, loadAndValidateSession, recordPaidSession, verifyStripeSignature } from '../_lib/web-store.js';

const ACCEPTED = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

export async function onRequestPost({ request, env }) {
  const rawBody = await request.text();
  const valid = await verifyStripeSignature(rawBody, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return json({ error: '署名を確認できません。' }, 400);
  let event;
  try { event = JSON.parse(rawBody); } catch { return json({ error: 'イベント形式が無効です。' }, 400); }
  if (!event?.id || !ACCEPTED.has(event.type)) return json({ received: true });
  try {
    const sessionId = event?.data?.object?.id;
    if (!/^cs_(?:test_|live_)?[A-Za-z0-9]+$/.test(sessionId || '')) throw new Error('INVALID_SESSION');
    const verified = await loadAndValidateSession(env, sessionId);
    await recordPaidSession(env, event.id, event.type, verified);
    return json({ received: true });
  } catch {
    return json({ error: '購入内容を検証できません。' }, 400);
  }
}
