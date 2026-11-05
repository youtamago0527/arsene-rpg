const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../js/phantom_shop.js'), 'utf8');
const element = () => ({ hidden: true, innerHTML: '', dataset: {}, append() {}, addEventListener() {}, querySelector() { return null; }, insertAdjacentHTML() {} });
const profile = { premium: {}, inventory: {} };
let saves = 0;
let persisted = null;
let failSave = false;
const game = {
  profile,
  saveProfile() {
    if (failSave) throw new Error('simulated storage failure');
    persisted = structuredClone(this.profile);
    saves++;
  },
  loadProfile() { return structuredClone(persisted || {}); }
};
const window = {
  arseneGame: game,
  Capacitor: { getPlatform: () => 'ios', Plugins: {} }
};
const document = {
  readyState: 'complete', body: { append() {} }, createElement: element,
  addEventListener() {}, querySelector() { return null; }
};
vm.runInNewContext(script, { window, document, setTimeout() {}, addEventListener() {} });

async function run() {
  const shop = window.phantomSecret;
  shop.purchase('ad-skip-tickets');
  assert.equal(profile.premium.adSkipTickets || 0, 0, 'missing native plugin must not grant');

  window.Capacitor.getPlatform = () => 'web';
  await shop.purchase('ad-skip-tickets');
  assert.equal(profile.premium.adSkipTickets || 0, 0, 'web fallback must not grant');
  window.Capacitor.getPlatform = () => 'ios';

  let response = { status: 'cancelled' };
  let finishCount = 0;
  window.Capacitor.Plugins.ArseneStoreKit = {
    async purchase() { return response; },
    async finish() { finishCount++; return { finished: true }; }
  };
  shop.iosProducts = { 'ad-skip-tickets': { id: 'ad-skip-tickets', type: 'consumable' } };

  await shop.purchase('ad-skip-tickets');
  assert.equal(profile.premium.adSkipTickets || 0, 0, 'cancelled purchase must not grant');
  response = { status: 'pending' };
  await shop.purchase('ad-skip-tickets');
  assert.equal(profile.premium.adSkipTickets || 0, 0, 'pending purchase must not grant');
  response = { productId: 'ad-skip-tickets', transactionId: '123', verified: false };
  await shop.purchase('ad-skip-tickets');
  assert.equal(profile.premium.adSkipTickets || 0, 0, 'unverified purchase must not grant');
  response = { productId: 'otherworld-tickets', transactionId: '123', verified: true };
  await shop.purchase('ad-skip-tickets');
  assert.equal(profile.premium.adSkipTickets || 0, 0, 'wrong product must not grant');
  response = { productId: 'ad-skip-tickets', transactionId: '123', verified: true };
  await shop.purchase('ad-skip-tickets');
  assert.equal(profile.premium.adSkipTickets, 10);
  assert.equal(profile.premiumTransactions['123'], 'ad-skip-tickets');
  await shop.purchase('ad-skip-tickets');
  assert.equal(profile.premium.adSkipTickets, 10, 'same transaction must grant only once');
  assert.equal(finishCount, 2);
  assert.equal(saves, 1);

  response = { productId: 'ad-skip-tickets', transactionId: '124', verified: true };
  failSave = true;
  await shop.purchase('ad-skip-tickets');
  assert.equal(profile.premium.adSkipTickets, 10, 'failed save must roll back in-memory grant');
  assert.equal(profile.premiumTransactions['124'], undefined);
  assert.equal(finishCount, 2, 'failed save must leave transaction unfinished');
  failSave = false;
  await shop.purchase('ad-skip-tickets');
  assert.equal(profile.premium.adSkipTickets, 20, 'unfinished transaction may be granted after storage recovers');
  assert.equal(finishCount, 3);

  game.profile = structuredClone(persisted);
  await shop.applyIOSTransaction(response);
  assert.equal(game.profile.premium.adSkipTickets, 20, 'replayed purchase after restart must not grant again');
  assert.equal(finishCount, 4);

  window.Capacitor.Plugins.ArseneStoreKit.getProducts = async () => { throw new Error('offline'); };
  window.Capacitor.Plugins.ArseneStoreKit.pending = async () => ({
    transactions: [{ productId: 'ad-skip-tickets', transactionId: '125', verified: true }]
  });
  await shop.loadIOSProducts();
  assert.equal(game.profile.premium.adSkipTickets, 30, 'pending purchase must recover even when product fetch fails');
  assert.equal(finishCount, 5);

  window.Capacitor.Plugins.ArseneStoreKit.restore = async () => ({
    transactions: [{ productId: 'ad-skip-license', transactionId: '126', verified: true }]
  });
  await shop.restorePurchases();
  assert.equal(game.profile.premium.adSkipLicense, true, 'verified non-consumable must restore');
  const savesAfterRestore = saves;
  await shop.restorePurchases();
  assert.equal(saves, savesAfterRestore, 'repeated restore must not grant twice');

  window.Capacitor.Plugins.ArseneStoreKit.getProducts = async () => ({
    products: [{ id: 'ad-skip-tickets', type: 'nonConsumable', displayPrice: '¥160' }]
  });
  window.Capacitor.Plugins.ArseneStoreKit.pending = async () => ({ transactions: [] });
  await shop.loadIOSProducts();
  assert.equal(shop.iosProducts['ad-skip-tickets'], undefined, 'wrong App Store product type must be disabled');
  console.log('iOS StoreKit purchase regression: ok');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
