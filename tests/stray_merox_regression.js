const assert = require('node:assert/strict');
const fs = require('node:fs');

global.window = global;
global.addEventListener = () => {};
global.document = { addEventListener(){}, querySelector(){return null;} };
for (const moduleName of ['data','future_data','release_content','d4_extra_enemies','equipment_progression','infinite_score_data','game','infinite_score']) {
  require('../js/'+moduleName+'.js');
}
const D = ARSENE_DATA;
const battle = Object.create(BattleGame.prototype);
battle.collectionTitleEffect = () => 1;
const upper = D.enemies.strayMerukuru;
assert.equal(upper.name,'はぐれメロクス');
assert.equal(upper.kind,'rare');
assert(upper.stats.def>D.enemies.merox.stats.def && upper.stats.spd>D.enemies.merox.stats.spd);
assert(upper.exp>D.enemies.merox.exp);
assert(upper.ai.some(move=>move.kind==='flee'));
assert(fs.existsSync(upper.sprite));
assert(battle.archiveEnemyList('dungeon5').includes(upper));

function encounter(dungeonId,random,progression) {
  const previous=Math.random;
  try {
    Math.random=()=>random;
    battle.currentDungeonId=dungeonId;
    return battle.rollEncounter(0,progression);
  } finally {
    Math.random=previous;
  }
}
const d5=D.dungeons.find(dungeon=>dungeon.id==='dungeon5');
for (const floor of d5.floors) {
  assert.deepEqual(encounter('dungeon5',.009,floor.encounterProgression),[upper.id]);
  assert(!encounter('dungeon5',.02,floor.encounterProgression).includes(upper.id));
  battle.activeFloor=()=>floor;
  assert.deepEqual(battle.makeEnemy(upper.id,0).stats,upper.stats);
}
assert.deepEqual(encounter('dungeon3',.01),['merox']);
assert.deepEqual(encounter('dungeon3',.04),['gildedHoarder']);
assert.deepEqual(battle.isEnemyPoolForFloor(15,true),[]);
for (const floor of [16,30]) assert.deepEqual(battle.isEnemyPoolForFloor(floor,true),['merox']);
for (const floor of [31,45,9999]) assert.deepEqual(battle.isEnemyPoolForFloor(floor,true),['merox',upper.id]);
assert(!battle.isEnemyPoolForFloor(31).includes(upper.id));

console.log('Stray Merox sprite, D5 rare draw, Infinite Score floor tiers and D3 regression: OK');
