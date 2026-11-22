(() => {
  'use strict';

  const D = window.ARSENE_DATA;
  const proto = BattleGame.prototype;
  const config = D.exchangeShop = {
    name: '裏ショップ',
    keeper: 'カズ',
    currency: { store: 'exchangeShop', id: 'coins', name: '専用コイン' },
    products: [
      { id: 'otherworld-ticket', name: '異世界探索券', store: 'premium', itemId: 'otherworldTickets', quantity: 1, price: 1 },
      { id: 'health-potions', store: 'inventory', itemId: 'potion', quantity: 3, price: 1 },
      { id: 'mana-potions', store: 'inventory', itemId: 'manaPotion', quantity: 3, price: 1 }
    ]
  };

  function owned(store, id) {
    const count = Number(store?.[id]);
    return Number.isSafeInteger(count) && count > 0 ? count : 0;
  }

  function productName(product) {
    return product.name || D.items[product.itemId].name;
  }

  proto.exchangeShopState = function () {
    const { name, keeper, currency, products } = config;
    const balance = owned(this.profile[currency.store], currency.id);
    return {
      name, keeper, currencyName: currency.name, balance,
      products: products.map(product => ({
        id: product.id, name: productName(product), price: product.price, quantity: product.quantity,
        owned: owned(this.profile[product.store], product.itemId),
        affordable: balance >= product.price
      }))
    };
  };

  proto.exchangeShopRedeem = function (productId) {
    if (this.localScenario?.ephemeral) return { ok: false, reason: 'unavailable' };
    const { currency, products } = config;
    const product = products.find(entry => entry.id === productId);
    if (!product) return { ok: false, reason: 'unknownProduct' };

    const wallet = this.profile[currency.store];
    const balance = owned(wallet, currency.id);
    if (balance < product.price) return { ok: false, reason: 'insufficientCoins' };
    const stock = this.profile[product.store];
    const name = productName(product);
    const remaining = balance - product.price;
    this.profile[currency.store] = { ...wallet, [currency.id]: remaining };
    this.profile[product.store] = { ...stock, [product.itemId]: owned(stock, product.itemId) + product.quantity };

    try {
      this.saveProfile();
    } catch {
      this.profile[currency.store] = wallet;
      this.profile[product.store] = stock;
      return { ok: false, reason: 'saveFailed' };
    }
    return { ok: true, id: productId, name, quantity: product.quantity, balance: remaining };
  };
})();
