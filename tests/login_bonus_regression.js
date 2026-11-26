const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const node = {
  open: false,
  dataset: {},
  addEventListener() {},
  querySelector() { return node; },
  showModal() { this.open = true; },
  close() { this.open = false; }
};
const document = {
  ...node,
  getElementById: () => node,
  querySelector: selector => selector === 'dialog[open]' && node.open ? node : null
};
const context = { window: {}, document, addEventListener() {} };
vm.createContext(context);
for (const file of ['data.js', 'otherworld_data.js', 'game.js', 'exchange_shop.js', 'login_bonus.js']) {
  const source = fs.readFileSync(path.join(__dirname, '../js', file), 'utf8');
  vm.runInContext(source, context, { filename: file });
  context.BattleGame = context.window.BattleGame;
}

const date = day => new Date(2026, 9, 29 + day, 2);
const game = Object.create(context.BattleGame.prototype);
let saved;
game.profile = { inventory: { arcanaChaos: 2, rebirthArcana: 1 }, premium: { adSkipTickets: 5 } };
game.saveProfile = () => { saved = JSON.stringify(game.profile); };
const quantities = [100, 200, 300, 400, 500, 600, 1000];
quantities.forEach((quantity, index) => {
  const reward = game.claimLoginBonus(date(index));
  assert.equal(reward.id, 'astra', `day ${index + 1}`);
  assert.equal(reward.quantity, quantity);
  assert.equal(game.exchangeShopState().balance, quantities.slice(0, index + 1).reduce((sum, value) => sum + value, 0));
  game.profile = JSON.parse(saved);
  assert.equal(game.claimLoginBonus(date(index)), null, '再読み込みしても同じ日に再取得できない');
});
assert.deepEqual(game.profile.inventory, { arcanaChaos: 2, rebirthArcana: 1 });
assert.equal(game.profile.premium.adSkipTickets, 5);
assert.equal(game.exchangeShopState().balance, 3100);
assert.equal(game.exchangeShopState().keeper, 'カズ');
assert.equal(game.exchangeShopState().products.length, 9);
assert.ok(game.exchangeShopState().products.every(product => product.affordable));
assert.equal(game.exchangeShopRedeem('nonexistent').reason, 'unknownProduct');
assert.equal(game.exchangeShopRedeem('otherworld-ticket').ok, true);
game.profile = JSON.parse(saved);
assert.equal(game.profile.premium.otherworldTickets, 1, '既存の異世界探索券の残高に加算する');
assert.equal(game.exchangeShopState().balance, 2800);
assert.equal(game.claimLoginBonus(date(5)), null, '端末日付を戻しても再取得できない');
assert.equal(game.claimLoginBonus(date(7)).quantity, 100, '7日目の翌日は次の周期');
assert.equal(game.claimLoginBonus(date(9)).quantity, 100, '受取を逃した翌日は1日目から');

const beforeFailure = saved;
game.saveProfile = () => { throw new Error('storage is full'); };
assert.throws(() => game.claimLoginBonus(date(10)), /storage is full/);
assert.equal(JSON.stringify(game.profile), beforeFailure);

const shop = Object.create(context.BattleGame.prototype);
shop.profile = { inventory: { potion: 2 }, premium: { otherworldTickets: 5 } };
assert.equal(shop.exchangeShopState().balance, 0, '既存セーブには無料通貨の残高がない');
assert.equal(shop.exchangeShopRedeem('otherworld-ticket').reason, 'insufficientCoins');
shop.saveProfile = () => {};
for (let day = 0; day < 14; day++) shop.claimLoginBonus(date(day));
assert.equal(shop.exchangeShopState().balance, 6200, '周期が変わってもアストラを持ち越せる');
assert.equal(shop.exchangeShopRedeem('health-potions').quantity, 3);
assert.equal(shop.profile.inventory.potion, 5);
assert.equal(shop.profile.premium.otherworldTickets, 5, '回復薬を選んでも探索券は動かない');
shop.saveProfile = () => { throw new Error('storage is full'); };
assert.equal(shop.exchangeShopRedeem('mana-potions').reason, 'saveFailed');
assert.equal(shop.exchangeShopState().balance, 6100);
assert.equal(shop.profile.inventory.manaPotion, undefined);

shop.profile.exchangeShop = { coins: 2, astra: 30 };
shop.saveProfile = () => {};
assert.equal(shop.exchangeShopState().balance, 230, '旧コインを1枚100アストラで引き継ぐ');
assert.equal(shop.exchangeShopRedeem('ad-skip-ticket').balance, 130);
assert.equal(shop.profile.premium.adSkipTickets, 1);
assert.equal(shop.profile.exchangeShop.coins, undefined, '旧コインの残高は交換時に一度だけ変換される');

const newProducts = {
  'chaos-arcana': ['arcanaChaos', 100],
  'exp-boost': ['astraExpBoost', 600],
  'reincarnation-arcana': ['rebirthArcana', 1000],
  'protection-arcana': ['protectionArcana', 200],
  'blessed-protection-arcana': ['blessedProtectionArcana', 500]
};
const exchange = Object.create(context.BattleGame.prototype);
exchange.profile = { inventory: {}, exchangeShop: { astra: 3100 } };
exchange.saveProfile = () => {};
exchange.audio = { sfx() {} };
exchange.renderMenuPanel = () => {};
const listing = exchange.exchangeShopState().products.filter(product => product.en);
assert.deepEqual(Array.from(listing, product => [product.id, product.price]), [
  ['ad-skip-ticket', 100],
  ['chaos-arcana', 100],
  ['otherworld-ticket', 300],
  ['exp-boost', 600],
  ['reincarnation-arcana', 1000],
  ['protection-arcana', 200],
  ['blessed-protection-arcana', 500]
]);
for (const [id, [itemId, price]] of Object.entries(newProducts)) {
  assert.equal(listing.find(product => product.id === id).price, price);
  const balance = exchange.exchangeShopState().balance;
  assert.equal(exchange.exchangeShopRedeem(id).balance, balance - price);
  assert.equal(exchange.profile.inventory[itemId], 1, id);
}
assert.equal(exchange.arcanaCount(), 1, '交換した輪廻のアルカナを転生処理が参照する');
exchange.profile.gold = 1000000;
exchange.profile.equipment = { rightHand: 'phantomSword' };
exchange.profile.inventory.phantomSword = 3;
exchange.profile.weaponEnchants = { phantomSword: 6 };
exchange.enchantSuccessRate = () => 0;
exchange.renderMenuSummary = () => {};
exchange.renderWorkshopKeepingAnchor = () => {};
context.prompt = () => '2';
exchange.enchantWeapon('phantomSword');
assert.equal(exchange.profile.inventory.blessedProtectionArcana, 0);
assert.equal(exchange.profile.weaponEnchants.phantomSword, 6);
context.confirm = () => true;
exchange.enchantWeapon('phantomSword');
assert.equal(exchange.profile.inventory.protectionArcana, 0);
assert.equal(exchange.profile.weaponEnchants.phantomSword, 3);
assert.equal(exchange.profile.inventory.phantomSword, 1);
delete context.prompt;
delete context.confirm;
const duration = 24 * 60 * 60 * 1000;
const beforeUse = Date.now();
assert.equal(exchange.useMenuItem('astraExpBoost'), true);
const expiresAt = exchange.profile.astraExpBoostExpiresAt;
assert.ok(expiresAt >= beforeUse + duration && expiresAt <= Date.now() + duration);
assert.equal(exchange.profile.inventory.astraExpBoost, 0);
assert.equal(exchange.rewardExpMultiplier(), 2);
context.window.arseneQOffer = { isActive: type => type === 'exp2' };
assert.equal(exchange.rewardExpMultiplier(), 4, '通常ダンジョンではアイテムと広告の経験値2倍を重ねがけできる');
exchange.battleMode = 'infiniteScore';
assert.equal(exchange.rewardExpMultiplier(), 2, '無限奏廊ではアイテムの倍率だけが有効');
exchange.battleMode = 'slime';
delete context.window.arseneQOffer;
assert.equal(exchange.exchangeShopRedeem('exp-boost').ok, true);
exchange.saveProfile = () => { throw new Error('storage is full'); };
assert.equal(exchange.useMenuItem('astraExpBoost'), false);
assert.equal(exchange.profile.inventory.astraExpBoost, 1);
assert.equal(exchange.profile.astraExpBoostExpiresAt, expiresAt);
exchange.saveProfile = () => {};
assert.equal(exchange.useMenuItem('astraExpBoost'), true);
assert.equal(exchange.profile.astraExpBoostExpiresAt, expiresAt + duration);
exchange.profile.astraExpBoostExpiresAt = Date.now() - 1;
assert.equal(exchange.rewardExpMultiplier(), 1);
context.window.arseneQOffer = { isActive: type => type === 'exp2' };
assert.equal(exchange.rewardExpMultiplier(), 2, 'アイテムの期限後も広告の経験値2倍は有効');
delete context.window.arseneQOffer;

const legacy = Object.create(context.BattleGame.prototype);
legacy.profile = { exchangeShop: { astra: 100, rewardedAds: 9 } };
legacy.profile.loginBonus = { lastClaimDay: legacy.loginBonusState(date(5)).today, streak: 6 };
legacy.saveProfile = () => {};
assert.equal(legacy.claimLoginBonus(date(5)), null, '旧報酬を受け取った日は追加で受け取れない');
assert.equal(legacy.claimLoginBonus(date(6)).quantity, 1000, '旧セーブの連続日数を引き継ぐ');
assert.equal(legacy.exchangeShopState().balance, 1100);
assert.equal(legacy.rewardedAdAstraProgress().total, 9);

const automatic = Object.create(context.BattleGame.prototype);
automatic.profile = { inventory: {} };
automatic.saveProfile = () => {};
assert.equal(automatic.openLoginBonus({ automatic: true }), true, '未受領で拠点に入ると表示できる');
assert.equal(node.dataset.rewardPending, 'true', '拠点のお知らせに未受取を表示する');
node.close();
assert.equal(automatic.openLoginBonus({ automatic: true }), false, '同じ日・同じ起動中は閉じた後に再表示しない');
assert.equal(automatic.openLoginBonus(), true, 'お知らせからは開き直せる');
node.close();
automatic.claimLoginBonus();
delete automatic.loginBonusShownDay;
assert.equal(automatic.openLoginBonus({ automatic: true }), false, '同日の受取済みデータは起動し直しても表示しない');
assert.equal(node.dataset.rewardPending, 'false', '受取済みなら拠点のお知らせを通常表示に戻す');

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
