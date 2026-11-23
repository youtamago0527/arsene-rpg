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
for (const [stage, expected] of Object.entries({
  d1: { physicalDamageReductionPercent: .03 }, d2: { magicDamageReductionPercent: .04 },
  d2e: { mpCostReductionFlat: 1 }, d3: { receivedHealingPercent: .06 },
  d3e: { victoryMpRestorePercent: .03 }, d4: { receivedCriticalDamageReductionPercent: .12 }
})) {
  const effects = D.accessories[`forge_${stage}_accessory`]?.effects || {};
  for (const [key, value] of Object.entries(expected)) assert.strictEqual(effects[key], value, `${stage}アクセの${key}が効かない`);
}
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
  assert(bossEquipment.every(drop => drop.chance === .01), `${enemy.id}のボス現物率が不正`);
  const secretGuitars = (enemy.dropTable || []).filter(drop => D.items[drop.itemId]?.source === 'secretGuitar');
  assert(secretGuitars.every(drop => drop.chance === D.guitarSeries.policy.defaultDropChance), `${enemy.id}の隠しギター率が不正`);
}

const gameSource = fs.readFileSync('js/game.js', 'utf8');
context.document = {};
context.addEventListener = () => {};
vm.runInContext(gameSource, context, { filename: 'js/game.js' });
const game = Object.create(context.window.BattleGame.prototype);
game.profile = { equipment: { accessory: 'forge_d2e_accessory' } };
game.enchantLevel = () => 0;
game.passiveEffectRate = () => 0;
game.traitDropRateBonus = () => 0;
game.collectionTitleEffect = () => 1;
context.Math = Object.create(Math);
context.Math.random = () => .02;
for (const dungeonId of ['dungeon1', 'dungeon2']) {
  const rare = Object.values(D.items).find(item => item.catalogDungeon === dungeonId && item.source === 'dropOnly' && item.stars === 4);
  const enemy = D.enemies[rare.dropEnemyId];
  const rareRow = enemy.dropTable.find(row => row.itemId === rare.id);
  game.profile.equipmentArchive = [];
  assert(game.rollDrops({ dropTable: [rareRow] }).some(([id]) => id === rare.id), `${dungeonId}の未入手★4初回確率が効かない`);
  game.profile.equipmentArchive = [rare.id];
  assert(!game.rollDrops({ dropTable: [rareRow] }).length, `${dungeonId}の入手済み★4確率が元に戻らない`);
}
context.Math.random = Math.random;
for (const [level, expected] of [[0, 1], [1, 1.15], [3, 1.45], [4, 1.75], [5, 2.05]])
  assert(Math.abs(game.enchantPowerMultiplier(level) - expected) < 1e-9, `+${level}の強化倍率が不正`);
game.enchantLevel = () => 4;
assert(Math.abs(game.equipmentEffectRate('mpCostReductionFlat') - 1.75) < 1e-9, '+4の装備効果が強化倍率を使わない');
game.enchantLevel = () => 0;
assert.strictEqual(game.skillMpCost({ mp: 6, source: 'job' }), 5, 'JOB魔法のMPが1減らない');
assert.strictEqual(game.skillMpCost({ mp: 1, source: 'weapon' }), 1, 'MP消費が0になってしまう');
game.profile.equipment.accessory = 'forge_d3_accessory';
assert.strictEqual(game.receivedHealAmount(100), 106, '被回復量+6%が反映されない');
game.profile.equipment.accessory = 'forge_d1_accessory';
assert.strictEqual(game.equipmentEffectRate('physicalDamageReductionPercent'), .03, '物理軽減が装備から取得できない');
assert(gameSource.includes("this.equipmentEffectRate('mpCostReductionFlat')"), 'アクセのMP軽減が技コストへ反映されない');
assert(gameSource.includes("this.equipmentEffectRate('victoryMpRestorePercent')"), 'アクセの勝利時MP回復が発動しない');
assert(gameSource.includes("this.equipmentEffectRate('receivedCriticalDamageReductionPercent')"), 'アクセの会心対策が発動しない');
assert(gameSource.includes("if (recipe.dungeonId && !this.isDungeonUnlocked(recipe.dungeonId)) return false;"), '工房のDungeon解放ゲートがない');
assert(gameSource.includes('if (equipmentHits.length) drops.push('), '装備DROPの1個上限がない');

console.log('equipment_balance_regression: PASS');
