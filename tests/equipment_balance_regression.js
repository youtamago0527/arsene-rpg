const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = { window: {} };
vm.createContext(context);
for (const file of [
  'js/data.js',
  'js/future_data.js',
  'js/release_content.js',
  'js/d4_extra_enemies.js',
  'js/equipment_progression.js'
]) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });

const D = context.window.ARSENE_DATA;
const gear = id => D.weapons[id] || D.armors[id] || D.accessories[id];
const workshop3 = Object.values(D.items).filter(item => item.source === 'workshop' && Number(item.stars) === 3);
assert(workshop3.length > 0, '★3工房装備が見つからない');
assert.deepStrictEqual(
  workshop3.filter(item => Object.keys(gear(item.id)?.bonuses || {}).length).map(item => item.id),
  [],
  '★3工房装備に基礎能力補正を付けない'
);

for (const [dungeonId, expectedRate, minimumMagicItems, agiCap] of [
  ['dungeon1', .0040, 3, 2],
  ['dungeon2', .0035, 4, 2]
]) {
  const drops = Object.values(D.items).filter(item => item.catalogDungeon === dungeonId && item.source === 'dropOnly' && Number(item.stars) === 4);
  assert(drops.length > 0, `${dungeonId}の★4が見つからない`);
  assert(drops.filter(item => Number(gear(item.id)?.bonuses?.mag) > 0).length >= minimumMagicItems, `${dungeonId}の魔力装備が不足`);
  assert(drops.every(item => !gear(item.id)?.bonuses?.luk), `${dungeonId}の★4にLUKを付けない`);
  assert(drops.every(item => (gear(item.id)?.bonuses?.agi || 0) <= agiCap), `${dungeonId}のAGI補正が上限超過`);
  for (const item of drops) {
    const enemy = D.enemies[item.dropEnemyId];
    const row = enemy?.dropTable?.find(drop => drop.itemId === item.id);
    assert(row && row.chance === expectedRate, `${item.id}のDROP率が不正`);
  }
}

for (const enemy of Object.values(D.enemies)) {
  const bossEquipment = (enemy.dropTable || []).filter(drop => Number(D.items[drop.itemId]?.stars) === 5 && D.items[drop.itemId]?.source !== 'secretGuitar');
  assert(bossEquipment.every(drop => drop.chance === .001), `${enemy.id}のボス現物率が不正`);
  const secretGuitars = (enemy.dropTable || []).filter(drop => D.items[drop.itemId]?.source === 'secretGuitar');
  assert(secretGuitars.every(drop => drop.chance === D.guitarSeries.policy.defaultDropChance), `${enemy.id}の隠しギター率が不正`);
}

const gameSource = fs.readFileSync('js/game.js', 'utf8');
assert(gameSource.includes("if (recipe.dungeonId && !this.isDungeonUnlocked(recipe.dungeonId)) return false;"), '工房のDungeon解放ゲートがない');
assert(gameSource.includes('if (equipmentHits.length) drops.push('), '装備DROPの1個上限がない');

console.log('equipment_balance_regression: PASS');
