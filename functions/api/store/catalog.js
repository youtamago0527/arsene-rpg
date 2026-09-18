import { json, loadPrice, PRODUCTS } from '../_lib/web-store.js';

export async function onRequestGet({ env }) {
  try {
    const products = await Promise.all(Object.keys(PRODUCTS).map(async itemId => {
      const price = await loadPrice(env, itemId);
      return {
        itemId,
        type: PRODUCTS[itemId].type,
        displayPrice: price.currency === 'jpy' ? `¥${price.unit_amount.toLocaleString('ja-JP')}` : `${price.unit_amount} ${price.currency.toUpperCase()}`,
        unitAmount: price.unit_amount,
        currency: price.currency,
        livemode: !!price.livemode
      };
    }));
    return json({ products });
  } catch {
    return json({ error: '商品情報を取得できませんでした。' }, 503);
  }
}
