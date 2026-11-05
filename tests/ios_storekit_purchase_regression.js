const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../js/phantom_shop.js'), 'utf8');
const element = () => ({ hidden: true, innerHTML: '', dataset: {}, append() {}, addEventListener() {}, querySelector() { return null; }, insertAdjacentHTML() {} });
const profile = { premium: {}, inventory: {} };
let saves = 0;
const game = { profile, saveProfile() { saves++; } };
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
  console.log('iOS StoreKit purchase regression: ok');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
