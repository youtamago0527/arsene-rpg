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

const expected = [
  ['maxHp', 84480, 109824, 164736], ['atk', 560, 728, 1092], ['def', 500, 650, 975],
  ['mag', 580, 754, 1131], ['mnd', 520, 676, 1014], ['dex', 420, 546, 819]
];
for (const [key, first, second, third] of expected) {
  if (Math.round(first * 1.3) !== second) throw new Error(`${key} phase 2 is not 1.3x`);
  if (Math.round(second * 1.5) !== third) throw new Error(`${key} phase 3 is not 1.5x phase 2`);
  if (!data.includes(`${key}: ${second}`) || !data.includes(`${key}: ${third}`)) throw new Error(`${key} phase stats are missing`);
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
function averageHp(floor) {
  const pool = floor.encounterProgression[0].pool;
  const sum = pool.reduce((n, entry) => n + entry.weight * Math.round(enemies[entry.id].stats.maxHp * floor.enemyScale.hp), 0);
  return sum / pool.reduce((n, entry) => n + entry.weight, 0);
}
for (const [i, floor] of d5.floors.entries()) {
  const ratio = averageHp(floor) / averageHp(d4.floors[i]);
  if (ratio < 9 || ratio > 11) throw new Error('D5 normal enemy HP ratio on floor ' + (i + 1) + ': ' + ratio);
}
function combinedHp(boss) {
  return [boss, boss.form2, boss.form3].reduce((sum, form) => sum + (form?.stats.maxHp || 0), 0);
}
for (const key of ['midBossId', 'bossId']) {
  if (combinedHp(enemies[d5[key]]) !== 10 * combinedHp(enemies[d4[key]])) throw new Error('D5 total HP mismatch: ' + key);
}
if (Math.round(enemies.d5MidBoss.form3.stats.maxHp / 64) !== 2574) throw new Error('Unexpected base NESTUA regeneration');

console.log('d5 midboss forms regression: ok');
