const assert = require('node:assert/strict');

global.window = global;
require('../js/data.js');
require('../js/future_data.js');
require('../js/release_content.js');
require('../js/equipment_progression.js');

const D = global.ARSENE_DATA;
const expected = [
  { dungeonId: 'dungeon3', itemId: 'parentGiftGuitar', enemyId: 'versicrell', bossPower: 140 },
  { dungeonId: 'dungeon4', itemId: 'splurgeGuitar', enemyId: 'd4MidBoss', bossPower: 421 }
];

assert.equal(D.guitarSeries.policy.beginsAtDungeon, 3);
assert.equal(D.guitarSeries.policy.onePerDungeon, true);
assert.equal(D.guitarSeries.policy.archiveSourceHidden, true);
assert.equal(D.enemies.d4MidBoss.secondFormSprite, 'assets/enemy-characters/dungeon4/fegoria-form2.png');
assert.equal(D.enemies.d4MidBoss.secondFormArtReady, true);

for (const row of expected) {
  const item = D.items[row.itemId];
  const weapon = D.weapons[row.itemId];
  const drop = D.enemies[row.enemyId].dropTable.find(entry => entry.itemId === row.itemId);
  const seriesEntry = D.guitarSeries.entries.find(entry => entry.itemId === row.itemId);
  assert(item, `${row.itemId}: item missing`);
  assert(weapon, `${row.itemId}: weapon missing`);
  assert(drop, `${row.itemId}: drop missing`);
  assert(seriesEntry, `${row.itemId}: series entry missing`);
  assert.equal(item.source, 'secretGuitar');
  assert(item.archiveHint, `${row.itemId}: archive hint missing`);
  assert.equal(weapon.guitarSeriesId, 'secretGuitar');
  assert.equal(weapon.guitarSkillTree, 'versicrellGuitar');
  assert(weapon.magicAttackPower > row.bossPower, `${row.itemId}: must exceed its dungeon boss weapon`);
  assert.equal(drop.chance, D.guitarSeries.policy.defaultDropChance);
}

console.log('Guitar series regression passed.');
