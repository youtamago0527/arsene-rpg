/* 工房・ドロップ・図鑑データの整合性検証。ファイルは変更しない。 */
'use strict';
global.window = global;
require('../js/data.js');
require('../js/equipment_progression.js');

const D = global.ARSENE_DATA;
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const equipmentDef = id => D.weapons[id] || D.armors[id] || D.accessories[id];
const progressionRecipes = Object.values(D.recipes).filter(recipe => recipe.progressionRecipe && !recipe.seriesId);
assert(D.settings.dungeon3TargetWins === 300, 'D3進行目標が300戦ではない');

for (const recipe of Object.values(D.recipes).filter(recipe => !recipe.legacy)) {
  assert(Boolean(D.items[recipe.resultItemId]), `完成品が未定義: ${recipe.id} -> ${recipe.resultItemId}`);
  for (const material of recipe.materials || []) {
    assert(Boolean(D.items[material.itemId]), `素材が未定義: ${recipe.id} -> ${material.itemId}`);
  }
}

for (const recipe of progressionRecipes) {
  const item = D.items[recipe.resultItemId];
  const def = equipmentDef(recipe.resultItemId);
  assert(Boolean(def), `装備定義が未登録: ${recipe.resultItemId}`);
  assert(Object.keys(def?.bonuses || {}).length === 0, `工房品に基本能力補正: ${recipe.resultItemId}`);
  assert(item?.stars === 2 || item?.stars === 3, `通常工房品の★が不正: ${recipe.resultItemId}`);
  if (D.weapons[recipe.resultItemId]) assert(item.slot === 'rightHand', `武器の装備部位が不正: ${recipe.resultItemId}`);
}

const d1Instruments = progressionRecipes.filter(recipe => {
  const item = D.items[recipe.resultItemId];
  return item?.dungeonId === 'dungeon1' && item?.weaponType === 'instrument';
});
assert(d1Instruments.length === 0, 'D1に楽器が登録されている');

const dropOnly = Object.values(D.items).filter(item => item.source === 'dropOnly');
for (const item of dropOnly) {
  assert(item.stars === 4, `DROP ONLYが★4ではない: ${item.id}`);
  assert(!Object.values(D.recipes).some(recipe => recipe.resultItemId === item.id), `★4が工房製作可能: ${item.id}`);
}

for (const enemy of Object.values(D.enemies).filter(enemy => enemy.kind !== 'boss' && /^dungeon[1-3]$/.test(enemy.dungeonId || ''))) {
  const uniqueDrops = (enemy.dropTable || []).filter(drop => D.items[drop.itemId]?.source === 'dropOnly');
  assert(uniqueDrops.length > 0, `★4固有ドロップなし: ${enemy.id}`);
}

for (const series of Object.values(D.bossEquipmentSeries || {})) {
  for (const itemId of series.equipment || []) {
    assert(D.items[itemId]?.stars === 5, `ボス装備が★5ではない: ${itemId}`);
  }
}

for (const [dungeonId, collection] of Object.entries(D.equipmentCollections || {})) {
  assert(collection.itemIds.length > 0, `収集対象なし: ${dungeonId}`);
  assert(Boolean(D.items[collection.rewardItemId]), `収集報酬が未定義: ${dungeonId}`);
  for (const itemId of collection.itemIds) assert(D.items[itemId]?.source === 'dropOnly', `収集対象がDROP ONLYではない: ${itemId}`);
}

const summary = {
  progressionRecipes: progressionRecipes.length,
  dropOnly4Star: dropOnly.length,
  collections: Object.fromEntries(Object.entries(D.equipmentCollections || {}).map(([id, value]) => [id, value.itemIds.length])),
  bossSeries: Object.fromEntries(Object.entries(D.bossEquipmentSeries || {}).map(([id, value]) => [id, value.equipment.length])),
  errors
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exitCode = 1;
