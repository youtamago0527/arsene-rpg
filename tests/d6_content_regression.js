const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
global.addEventListener = () => {};
for (const file of ['data', 'future_data', 'release_content', 'dungeon6_content', 'game']) require('../js/' + file + '.js');
const d = ARSENE_DATA;
const { dungeon, enemies } = d.futureContent.dungeon6;
assert.equal(d.futureContent.releaseFlags.d6Released, false);
assert.ok(!d.dungeons.includes(dungeon));
for (const enemy of enemies) {
  assert.ok(!d.enemies[enemy.id]);
  d.enemies[enemy.id] = enemy;
}
d.dungeons.push(dungeon);
const game = Object.create(BattleGame.prototype);
game.currentDungeonId = dungeon.id;
game.battleMode = 'slime';
game.profile = { flags: {}, bossDefeated: {} };
const d5 = game.getDungeon('dungeon5');
function compare(actual, reference) {
  for (const [stat, value] of Object.entries(reference)) assert.equal(actual[stat], value * 10, stat);
}
assert.deepEqual(dungeon.floors.map(f => f.element), ['火', '水', '風', '土', '雷', '光']);
assert.deepEqual(dungeon.midBossGates.map(g => g.afterFloor), [2, 4]);
const ids = new Set();
for (const [i, floor] of dungeon.floors.entries()) {
  assert.ok(game.isFloorUnlocked(floor.id));
  game.currentFloorId = floor.id;
  for (const {id} of floor.encounterProgression[0].pool) {
    ids.add(id);
    const actual = game.makeEnemy(id, 0);
    assert.equal(actual.element, floor.element);
    assert.deepEqual(actual.weaknesses, floor.weaknesses);
    game.activeFloor = () => d5.floors[Math.floor(i / 2)];
    compare(actual.stats, game.makeEnemy(id === 'prismMoth' ? 'venomWeaver' : 'repeatedHunter', 0).stats);
    delete game.activeFloor;
  }
  for (let n = 0; n < 9; n++) game.recordFloorWin(floor.id);
  assert.equal(game.checkpointState().saved, 0);
  assert.equal(game.profile.flags.floorWins?.[floor.id], undefined);
  const reload = Object.assign(Object.create(BattleGame.prototype), {profile: JSON.parse(JSON.stringify(game.profile))});
  assert.equal(reload.floorWins(floor.id), 0);
  assert.equal(game.rollbackToCheckpoint().nextBattle, 1);
  assert.equal(game.floorWins(floor.id), 0);
  for (let n = 0; n < 10; n++) game.recordFloorWin(floor.id);
  assert.equal(game.profile.flags.floorWins[floor.id], 10);
  assert.ok(game.isFloorCleared(floor.id));
  const gate = dungeon.midBossGates.find(g => g.afterFloor === i + 1);
  if (gate) {
    assert.ok(!game.isFloorUnlocked(dungeon.floors[i + 1].id));
    // Fixtures stand in for the two authored bosses, whose assets are maintained separately.
    d.enemies[gate.enemyId] = {id: gate.enemyId, name: gate.enemyId, dungeonId: dungeon.id};
    assert.equal(game.dungeonMidBossEntry(dungeon.id).key, gate.enemyId);
    game.markBossDefeated(gate.enemyId);
  }
}
assert.deepEqual([...ids].sort(), ['astralSurveyor', 'mirrorHound', 'prismMoth']);
assert.notEqual(d.enemies.astralSurveyor.kind, 'boss');
compare(d.enemies.chromatia.stats, d.enemies.ostina.stats);
assert.ok(!game.dungeonBossEntry(dungeon.id), 'wait for the approved portrait');
d.enemies.chromatia.sprite = 'test-bow-portrait';
assert.equal(game.dungeonBossEntry(dungeon.id).key, 'chromatia');
for (const asset of [dungeon.background, dungeon.music, d.enemies.chromatia.music, ...enemies.filter(e => e.id !== 'chromatia').map(e => e.sprite)]) {
  assert.ok(fs.existsSync(path.join(__dirname, '..', asset)), asset);
}
console.log('D6: six ten-win streaks, rollback, reload, both gates, elements and 10x stats OK');
