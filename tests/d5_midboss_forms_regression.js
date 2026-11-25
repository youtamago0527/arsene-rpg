const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const data = fs.readFileSync(path.join(root, 'js', 'release_content.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');

for (let form = 1; form <= 3; form++) {
  const asset = path.join(root, 'assets', 'enemy-characters', 'dungeon5', `d5-midboss-form${form}.png`);
  if (!fs.existsSync(asset)) throw new Error(`D5 midboss form ${form} asset is missing`);
  if (!data.includes(`d5-midboss-form${form}.png`)) throw new Error(`D5 midboss form ${form} is not registered`);
}

if (!game.includes("enemy.id === 'd5MidBoss' && enemy.form < 3")) throw new Error('three-phase transform guard is missing');
if (!game.includes('transformD5MidBoss(enemy)')) throw new Error('D5 midboss transform is missing');
if (!game.includes("applyBossOverdriveStats('d5MidBoss'")) throw new Error('overdrive scaling is not retained across forms');

global.window = global;
for (const moduleName of ['data', 'future_data', 'release_content', 'd4_extra_enemies', 'equipment_progression']) {
  require('../js/' + moduleName + '.js');
}
const { dungeons, enemies } = window.ARSENE_DATA;
const [d4, d5] = ['dungeon4', 'dungeon5'].map(id => dungeons.find(d => d.id === id));
const nestua = enemies.d5MidBoss;
for (const form of [nestua, nestua.form2, nestua.form3]) {
  if (form.name !== 'ネストゥア') throw new Error('Nestua must have a Japanese display name in every phase');
}
if (!d5.music || d5.music === d4.music || nestua.music !== d5.music || !nestua.form3.music || nestua.form3.music === d5.music) {
  throw new Error('D5 requires its own battle theme and a distinct final-form theme');
}
for (const track of [d5.music, nestua.form3.music]) {
  if (!fs.existsSync(path.join(root, track))) throw new Error('Missing D5 music: ' + track);
}
global.addEventListener = () => {};
require('../js/game.js');
const assert = require('node:assert/strict');
const battle = Object.create(window.BattleGame.prototype);
function encounterStats(id, floor) {
  battle.activeFloor = () => floor;
  return battle.makeEnemy(id, 0).stats;
}
function assertTenfold(actual, baseline) {
  for (const [key, value] of Object.entries(baseline)) assert.equal(actual[key], value * 10, key);
}
const counterparts = { venomWeaver: 'lanternMask', repeatedHunter: 'moonEdgeKnight' };
for (const [i, floor] of d5.floors.entries()) {
  for (const tier of floor.encounterProgression) {
    for (const { id } of tier.pool) assertTenfold(encounterStats(id, floor), encounterStats(counterparts[id], d4.floors[i]));
  }
}
assertTenfold(enemies.ostina.stats, enemies.astact.stats);
const fegoria = enemies.d4MidBoss;
for (const [key, first] of Object.entries(fegoria.stats)) {
  if (key === 'maxHp') continue;
  const last = fegoria.form2.stats[key];
  assert.equal(nestua.stats[key], first * 10);
  assert.equal(nestua.form2.stats[key], (first + last) * 5);
  assert.equal(nestua.form3.stats[key], last * 10);
}
assert.deepEqual([nestua.stats.maxHp, nestua.form2.stats.maxHp, nestua.form3.stats.maxHp], [84480, 109824, 164736]);
function combinedHp(boss) {
  return [boss, boss.form2, boss.form3].reduce((sum, form) => sum + (form?.stats.maxHp || 0), 0);
}
for (const key of ['midBossId', 'bossId']) {
  if (combinedHp(enemies[d5[key]]) !== 10 * combinedHp(enemies[d4[key]])) throw new Error('D5 total HP mismatch: ' + key);
}
if (Math.round(enemies.d5MidBoss.form3.stats.maxHp / 64) !== 2574) throw new Error('Unexpected base NESTUA regeneration');

console.log('d5 midboss forms regression: ok');
