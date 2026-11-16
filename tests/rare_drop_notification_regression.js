const fs = require('fs'), vm = require('vm'), assert = require('assert');
const timers = [], sounds = [], notices = [];
const makeNode = () => ({ children: [], classList: { add() {}, remove() {} }, append(...nodes) { this.children.push(...nodes); }, appendChild(node) { this.children.push(node); node.parentNode = this; }, remove() { this.removed = true; } });
const body = makeNode(), layer = makeNode();
const context = { window: {}, addEventListener() {}, document: { body, querySelector: () => layer, createElement: makeNode }, requestAnimationFrame: fn => fn(), setTimeout: fn => timers.push(fn) };
vm.runInNewContext(fs.readFileSync(`${__dirname}/../js/data.js`, 'utf8'), context);
vm.runInNewContext(fs.readFileSync(`${__dirname}/../js/game.js`, 'utf8'), context);
const D = context.window.ARSENE_DATA, actor = Object.create(context.window.BattleGame.prototype);
actor.audio = { sfx: sound => sounds.push(sound) };
for (const rarity of ['rare', 'epic', 'legendary']) assert(actor.shouldAnnounceDrop({ category: 'equipment', rarity }));
assert(!actor.shouldAnnounceDrop({ category: 'material', rarity: 'legendary' }));
assert(!actor.shouldAnnounceDrop({ category: 'equipment', rarity: 'common' }));
actor.announceRareDrop({ name: 'レア防具', rarity: 'rare' }, 2);
actor.announceRareDrop({ name: '伝説の装備', rarity: 'legendary' });
assert.strictEqual(layer.parentNode, body, 'result transitions must not hide notification');
assert.strictEqual(layer.children.length, 1, 'multiple drops display sequentially');
assert.strictEqual(layer.children[0].children[2].textContent, '装備を獲得！ ×2');
timers.shift()(); timers.shift()();
assert.strictEqual(layer.children.length, 2);
assert.strictEqual(layer.children[1].children[1].textContent, '伝説の装備');
timers.shift()(); timers.shift()();
assert.strictEqual(actor.rareDropShowing, false);
assert.strictEqual(sounds.length, 2);
// The same reward method is used by sweep, normal attacks, counters and instant death.
actor.rewardExpMultiplier = actor.rewardGoldMultiplier = () => 1;
actor.passiveEffectRate = actor.mealGoldBonusRate = () => 0;
actor.applyRewards = () => []; actor.grantJobExp = () => null; actor.updateHUD = () => {};
actor.announceRareDrop = (item, n) => notices.push([item.id, n]);
D.items.testRare = { id: 'testRare', name: 'テスト防具', category: 'equipment', rarity: 'rare' };
for (const quickResolving of [true, false]) {
  actor.quickResolving = quickResolving;
  actor.grantEnemyReward({ rolledDrops: [['testRare', 1], ['testRare', 1]] });
}
assert.deepStrictEqual(notices, [['testRare', 2], ['testRare', 2]]);
console.log('rare drop notification regression: ok');
