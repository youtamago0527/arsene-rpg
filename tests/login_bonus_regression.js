const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const node = { addEventListener() {}, querySelector() { return node; } };
const context = { window: {}, document: { ...node, getElementById: () => node }, addEventListener() {} };
vm.createContext(context);
for (const file of ['data.js', 'game.js', 'exchange_shop.js', 'login_bonus.js']) {
  const source = fs.readFileSync(path.join(__dirname, '../js', file), 'utf8');
  vm.runInContext(source, context, { filename: file });
  context.BattleGame = context.window.BattleGame;
}

const date = day => new Date(2026, 9, 29 + day, 2);
const game = Object.create(context.BattleGame.prototype);
let saved;
game.profile = { inventory: {}, premium: { adSkipTickets: 5 } };
game.saveProfile = () => { saved = JSON.stringify(game.profile); };
const ids = ['adSkipTickets', 'arcanaChaos', 'adSkipTickets', 'arcanaChaos', 'adSkipTickets', 'astra', 'rebirthArcana'];
ids.forEach((id, index) => {
  assert.equal(game.claimLoginBonus(date(index)).id, id, `day ${index + 1}`);
  game.profile = JSON.parse(saved);
  assert.equal(game.claimLoginBonus(date(index)), null, '再読み込みしても同じ日に再取得できない');
});
assert.deepEqual(game.profile.inventory, { arcanaChaos: 2, rebirthArcana: 1 });
assert.equal(game.profile.premium.adSkipTickets, 8);
assert.equal(game.exchangeShopState().balance, 100);
assert.equal(game.exchangeShopState().keeper, 'カズ');
assert.equal(game.exchangeShopState().products.length, 4);
assert.ok(game.exchangeShopState().products.every(product => product.affordable));
assert.equal(game.exchangeShopRedeem('nonexistent').reason, 'unknownProduct');
assert.equal(game.exchangeShopRedeem('otherworld-ticket').ok, true);
game.profile = JSON.parse(saved);
assert.equal(game.profile.premium.otherworldTickets, 1, '既存の異世界探索券の残高に加算する');
assert.equal(game.exchangeShopRedeem('otherworld-ticket').reason, 'insufficientCoins');
assert.equal(game.exchangeShopState().balance, 0);
assert.equal(game.claimLoginBonus(date(5)), null, '端末日付を戻しても再取得できない');
assert.equal(game.claimLoginBonus(date(7)).id, 'adSkipTickets', '7日目の翌日は次の周期');
assert.equal(game.claimLoginBonus(date(9)).id, 'adSkipTickets', '受取を逃した翌日は1日目から');

const beforeFailure = saved;
game.saveProfile = () => { throw new Error('storage is full'); };
assert.throws(() => game.claimLoginBonus(date(10)), /storage is full/);
assert.equal(JSON.stringify(game.profile), beforeFailure);

const shop = Object.create(context.BattleGame.prototype);
shop.profile = { inventory: { potion: 2 }, premium: { otherworldTickets: 5 } };
assert.equal(shop.exchangeShopState().balance, 0, '既存セーブには無料通貨の残高がない');
shop.saveProfile = () => {};
for (let day = 0; day < 14; day++) shop.claimLoginBonus(date(day));
assert.equal(shop.exchangeShopState().balance, 200, '周期が変わってもアストラを持ち越せる');
assert.equal(shop.exchangeShopRedeem('health-potions').quantity, 3);
assert.equal(shop.profile.inventory.potion, 5);
assert.equal(shop.profile.premium.otherworldTickets, 5, '回復薬を選んでも探索券は動かない');
shop.saveProfile = () => { throw new Error('storage is full'); };
assert.equal(shop.exchangeShopRedeem('mana-potions').reason, 'saveFailed');
assert.equal(shop.exchangeShopState().balance, 100);
assert.equal(shop.profile.inventory.manaPotion, undefined);

shop.profile.exchangeShop = { coins: 2, astra: 30 };
shop.saveProfile = () => {};
assert.equal(shop.exchangeShopState().balance, 230, '旧コインを1枚100アストラで引き継ぐ');
assert.equal(shop.exchangeShopRedeem('ad-skip-ticket').balance, 130);
assert.equal(shop.profile.premium.adSkipTickets, 7);
assert.equal(shop.profile.exchangeShop.coins, undefined, '旧コインの残高は交換時に一度だけ変換される');

game.profile.currentJob = 'mage';
game.profile.jobs = { mage: { level: 19 }, warrior: { level: 20 } };
game.profile.flags = { rebirthUnlocked: true };
assert.equal(game.kazuDialogueCondition('rebirth_ready'), false, '今のジョブだけを見る');
game.profile.jobs.mage.level = 20;
assert.equal(game.kazuDialogueCondition('rebirth_ready'), true);
game.profile.flags.jobLevelCapUnlocked = true;
assert.equal(game.kazuDialogueCondition('rebirth_ready'), false);
game.profile.jobs.mage.level = 40;
assert.equal(game.kazuDialogueCondition('rebirth_ready'), true);
game.profile.flags.rebirthUnlocked = false;
assert.equal(game.kazuDialogueCondition('rebirth_ready'), false);
console.log('login bonus and rebirth dialogue regression: OK');
