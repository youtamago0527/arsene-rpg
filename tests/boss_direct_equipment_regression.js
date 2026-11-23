const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = { window: {} };
vm.createContext(context);
for (const file of ['js/data.js', 'js/future_data.js', 'js/release_content.js', 'js/d4_extra_enemies.js', 'js/equipment_progression.js'])
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });

const D = context.window.ARSENE_DATA;
for (const bossId of ['seripes', 'astact', 'ostina']) {
  const series = D.bossEquipmentSeries[bossId];
  const enemy = D.enemies[bossId];
  assert(series && enemy, `${bossId}のボスとセットが必要`);
  assert(series.equipment.length >= 6, `${bossId}のセットが不足`);
  for (const id of series.equipment) {
    assert.strictEqual(D.items[id]?.category, 'equipment', `${id}は装備品`);
    assert(D.weapons[id] || D.armors[id] || D.accessories[id], `${id}の装備定義が必要`);
    assert.strictEqual(enemy.dropTable.find(row => row.itemId === id)?.chance, .01, `${id}は現物ドロップ`);
  }
  for (const recipeId of series.recipes) {
    const recipe = D.recipes[recipeId];
    assert(series.equipment.includes(recipe?.resultItemId), `${recipeId}の製作品がセットに含まれる`);
    for (const material of recipe.materials) assert(D.items[material.itemId], `${recipeId}の素材が必要`);
  }
}
assert.strictEqual(D.bossEquipmentSeries.ostina.setBonuses[6].effect.physicalRepeatChance, .10);
assert.strictEqual(D.weapons.ostina_bow.attackMotion, 'shoot');
const guitar = D.items.memberGiftGuitar;
assert.strictEqual(guitar?.source, 'secretGuitar');
assert.strictEqual(D.weapons.memberGiftGuitar?.weaponType, 'instrument');
assert.strictEqual(D.enemies.d5MidBoss.dropTable.find(row => row.itemId === guitar.id)?.chance, .002);
assert(D.guitarSeries.entries.some(row => row.itemId === guitar.id && row.dropEnemyId === 'd5MidBoss'));
console.log('boss_direct_equipment_regression: PASS');
