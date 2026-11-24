const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = { window: {}, document: { addEventListener() {} } };
context.window.BattleGame = function BattleGame() {};
vm.createContext(context);
for (const file of ['js/data.js', 'js/future_data.js', 'js/release_content.js', 'js/d4_extra_enemies.js', 'js/equipment_progression.js', 'js/infinite_score_data.js', 'js/infinite_gear_v2_data.js', 'js/infinite_gear_v2.js', 'js/otherworld_gear.js'])
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });

const D = context.window.ARSENE_DATA;
for (const tier of D.infiniteScore.enemyTiers.filter(tier => tier.maxFloor <= 15)) {
  assert(tier.pool.length > 0, `${tier.minFloor}Fの敵プールが空`);
  for (const id of tier.pool) assert.strictEqual(D.enemies[id]?.dungeonId, 'dungeon4', `${id}はD4通常敵`);
}
assert.strictEqual(D.infiniteScore.enemyBaseScale, 1.25);
assert.strictEqual(D.infiniteScore.enemyScalePerFloor, .16);
const series = D.otherWorldGearSeries;
assert(series.every((s, i) => i === 0 || s.power > series[i - 1].power));
assert(series.every((s, i) => i === 0 || s.armor > series[i - 1].armor));
assert(D.weapons.owg_phantasm_sword.attackPower >= D.weapons.astact_katana.attackPower, '★5異世界武器はD4ボス武器級');
const game = Object.create(context.window.BattleGame.prototype);
game.equipmentDefinition = id => D.weapons[id] || D.armors[id];
const gear = { itemId: 'owg_phantasm_sword', quality: 105, tuneLevel: 0, ops: [{ key: 'attackPower', value: 22 }] };
assert.strictEqual(game.owgEffectiveStats(gear).attackPower.total, Math.round(425 * 1.05) + 22, '品質とOPは基礎値に加わる');
console.log('infinite_entry_reward_balance_regression: PASS');
