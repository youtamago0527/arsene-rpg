const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const node = { addEventListener() {}, querySelector() { return node; } };
const context = { window: {}, document: { ...node, getElementById: () => node }, addEventListener() {} };
vm.createContext(context);
for (const file of ['data.js', 'game.js', 'login_bonus.js']) {
  const source = fs.readFileSync(path.join(__dirname, '../js', file), 'utf8');
  vm.runInContext(source, context, { filename: file });
  context.BattleGame = context.window.BattleGame;
}

const date = day => new Date(2026, 9, 29 + day, 2);
const game = Object.create(context.BattleGame.prototype);
let saved;
game.profile = { inventory: {}, premium: { adSkipTickets: 5 } };
game.saveProfile = () => { saved = JSON.stringify(game.profile); };
const ids = ['adSkipTickets', 'arcanaChaos', 'adSkipTickets', 'arcanaChaos', 'adSkipTickets', 'arcanaChaos', 'rebirthArcana'];
ids.forEach((id, index) => {
  assert.equal(game.claimLoginBonus(date(index)).id, id, `day ${index + 1}`);
  game.profile = JSON.parse(saved);
  assert.equal(game.claimLoginBonus(date(index)), null, '再読み込みしても同じ日に再取得できない');
});
assert.deepEqual(game.profile.inventory, { arcanaChaos: 3, rebirthArcana: 1 });
assert.equal(game.profile.premium.adSkipTickets, 8);
assert.equal(game.claimLoginBonus(date(5)), null, '端末日付を戻しても再取得できない');
assert.equal(game.claimLoginBonus(date(7)).id, 'adSkipTickets', '7日目の翌日は次の周期');
assert.equal(game.claimLoginBonus(date(9)).id, 'adSkipTickets', '受取を逃した翌日は1日目から');

const beforeFailure = saved;
game.saveProfile = () => { throw new Error('storage is full'); };
assert.throws(() => game.claimLoginBonus(date(10)), /storage is full/);
assert.equal(JSON.stringify(game.profile), beforeFailure);

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
