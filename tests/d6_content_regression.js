const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
global.addEventListener = () => {};
for (const file of ['data', 'future_data', 'release_content', 'dungeon6_content', 'game']) require('../js/' + file + '.js');
const d = ARSENE_DATA;
const { dungeon, enemies } = d.futureContent.dungeon6;
assert.equal(d.futureContent.releaseFlags.d6Released, false);
assert.ok(!d.dungeons.some(entry => entry.id === dungeon.id));
for (const enemy of enemies) assert.ok(!d.enemies[enemy.id]);
const game = Object.create(BattleGame.prototype);
function compare(actual, reference) {
  assert.deepEqual(actual, Object.fromEntries(Object.entries(reference).map(([key, value]) => [key, value * 10])));
}
for (const enemy of enemies) d.enemies[enemy.id] = enemy;
const d5 = d.dungeons.find(entry => entry.id === 'dungeon5');
for (const [i, floor] of dungeon.floors.entries()) {
  for (const [j, entry] of floor.encounterProgression[0].pool.entries()) {
    game.activeFloor = () => floor;
    const stats = game.makeEnemy(entry.id, 0).stats;
    game.activeFloor = () => d5.floors[i];
    compare(stats, game.makeEnemy(d5.floors[i].encounterProgression[0].pool[j].id, 0).stats);
  }
}
const n = d.enemies.d5MidBoss;
compare(d.enemies[dungeon.midBossId].stats, { ...n.form3.stats, maxHp: n.stats.maxHp + n.form2.stats.maxHp + n.form3.stats.maxHp });
compare(d.enemies[dungeon.bossId].stats, d.enemies.ostina.stats);
for (const asset of [dungeon.music, dungeon.background, ...enemies.map(e => e.sprite), ...enemies.filter(e => e.kind === 'boss').map(e => e.music)]) {
  assert.ok(fs.existsSync(path.join(__dirname, '..', asset)), asset);
}
console.log('D6 assets, reserved release, three floor stat scales and both boss comparisons OK');
