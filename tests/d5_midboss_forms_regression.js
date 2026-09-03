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
  ['maxHp', 33000, 42900, 64350], ['atk', 560, 728, 1092], ['def', 500, 650, 975],
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

console.log('d5 midboss forms regression: ok');
