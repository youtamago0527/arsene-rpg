const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Game {}
vm.runInNewContext(fs.readFileSync('js/infinite_relics.js', 'utf8'), {
  window: { BattleGame: Game }, document: { addEventListener() {} }
});

const game = new Game();
game.profile = {};
game.isPickWeighted = tiers => tiers[0];
game.isRand = () => 0;
const run = {};
const stats = {};
game.isApplyRelics(stats, run);
assert.deepEqual(stats, {});
for (let i = 0; i < 36; i++) {
  const item = game.isAcquireChestRelic(run);
  assert.ok(item.name && item.effect);
  const before = {};
  game.isApplyRelics(before, { relicIds: run.relicIds.slice(0, -1) });
  const after = {};
  game.isApplyRelics(after, run);
  const changed = Object.keys(after).filter(key => after[key] !== before[key]);
  assert.equal(changed.length, 1);
  assert.equal(after[changed[0]] - (before[changed[0]] || 0), Number(item.effect.split('+')[1]));
}
assert.equal(new Set(run.relicIds).size, 36);
assert.equal(game.isAcquireChestRelic(run), null);
assert.equal(game.profile.infiniteRelicIds, undefined);
const saved = JSON.parse(JSON.stringify(run));
assert.equal(game.isBankRunRelics(saved), 36);
assert.equal(game.isBankRunRelics(saved), 0);
assert.equal(game.profile.infiniteRelicIds.length, 36);
const next = {};
game.isApplyRelics(next, {});
assert.deepEqual(next, {});
assert.equal(game.isBankRunRelics({ relicIds: ['missing', 'hourglass', 'hourglass'] }), 0);
console.log('Infinite relic acquisition, stat bonuses, and collection: ok');
