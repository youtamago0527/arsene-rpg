(() => {
  'use strict';

  const D = window.ARSENE_DATA;
  const proto = BattleGame.prototype;
  const config = D.exchangeShop = {
    name: '裏ショップ',
    keeper: 'カズ',
    currency: { store: 'exchangeShop', id: 'astra', name: 'アストラ', quantity: 100 },
    rewardedAds: { required: 10, quantity: 100 },
    products: [
      { id: 'ad-skip-ticket', name: '広告スキップ券', en: 'AD SKIP TICKET', store: 'premium', itemId: 'adSkipTickets', quantity: 1, price: 100 },
      { id: 'chaos-arcana', en: 'CHAOS ARCANA', store: 'inventory', itemId: 'arcanaChaos', quantity: 1, price: 100 },
      { id: 'otherworld-ticket', name: '異世界探索券', en: 'EXPLORATION TICKET', store: 'premium', itemId: 'otherworldTickets', quantity: 1, price: 300 },
      { id: 'exp-boost', en: 'EXP ×2 (1 DAY)', store: 'inventory', itemId: 'astraExpBoost', quantity: 1, price: 600 },
      { id: 'reincarnation-arcana', en: 'REINCARNATION ARCANA', store: 'inventory', itemId: 'rebirthArcana', quantity: 1, price: 1000 },
      { id: 'protection-arcana', en: 'PROTECTION ARCANA', store: 'inventory', itemId: 'protectionArcana', quantity: 1, price: 200 },
      { id: 'blessed-protection-arcana', en: 'BLESSED PROTECTION ARCANA', store: 'inventory', itemId: 'blessedProtectionArcana', quantity: 1, price: 500 },
      { id: 'health-potions', store: 'inventory', itemId: 'potion', quantity: 3, price: 100 },
      { id: 'mana-potions', store: 'inventory', itemId: 'manaPotion', quantity: 3, price: 100 }
    ]
  };

  function owned(store, id) {
    const count = Number(store?.[id]);
    return Number.isSafeInteger(count) && count > 0 ? count : 0;
  }

  function productName(product) {
    return product.name || D.items[product.itemId].name;
  }

  proto.exchangeShopWallet = function () {
    const wallet = this.profile[config.currency.store] || {};
    const balance = owned(wallet, config.currency.id) + owned(wallet, 'coins') * 100;
    const { coins: legacyCoins, ...current } = wallet;
    return { ...current, astra: balance };
  };

  proto.rewardedAdAstraProgress = function () {
    const { required, quantity } = config.rewardedAds;
    const total = owned(this.profile[config.currency.store], 'rewardedAds');
    return { total, progress: total % required, required, quantity };
  };

  // Q’s OFFERが元の報酬と同じセーブ操作で確定する。
  proto.recordRewardedAdForAstra = function () {
    if (this.localScenario?.ephemeral) return 0;
    const { total, required, quantity } = this.rewardedAdAstraProgress();
    const rewardedAds = total + 1;
    const awarded = rewardedAds % required === 0 ? quantity : 0;
    const wallet = this.exchangeShopWallet();
    this.profile[config.currency.store] = { ...wallet, astra: wallet.astra + awarded, rewardedAds };
    return awarded;
  };

  proto.exchangeShopState = function () {
    const { name, keeper, currency, products } = config;
    const balance = this.exchangeShopWallet().astra;
    return {
      name, keeper, currencyName: currency.name, balance,
      products: products.map(product => ({
        id: product.id, name: productName(product), en: product.en, price: product.price, quantity: product.quantity,
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

    const previousWallet = this.profile[currency.store];
    const wallet = this.exchangeShopWallet();
    const balance = wallet.astra;
    if (balance < product.price) return { ok: false, reason: 'insufficientCoins' };
    const stock = this.profile[product.store];
    const name = productName(product);
    const remaining = balance - product.price;
    this.profile[currency.store] = { ...wallet, [currency.id]: remaining };
    this.profile[product.store] = { ...stock, [product.itemId]: owned(stock, product.itemId) + product.quantity };

    try {
      this.saveProfile();
    } catch {
      this.profile[currency.store] = previousWallet;
      this.profile[product.store] = stock;
      return { ok: false, reason: 'saveFailed' };
    }
    return { ok: true, id: productId, name, quantity: product.quantity, balance: remaining };
  };
})();
