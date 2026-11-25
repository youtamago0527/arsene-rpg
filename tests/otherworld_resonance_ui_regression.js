const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const gear = fs.readFileSync('js/otherworld_gear.js', 'utf8');
const infinite = fs.readFileSync('js/infinite_score.js', 'utf8');
const support = fs.readFileSync('js/infinite_support.js', 'utf8');

class BattleGame {
  isRun() { return this.profile.infiniteScore.active ? this.profile.infiniteScore : null; }
  activeSetEffects() { return this.isRun() ? {} : { vitPercent: 8, damageReductionPercent: 10 }; }
  equipmentEffectRate(type, equipment) { return equipment?.rightHand==='oldSword' && type==='physicalDamagePercent' ? .20 : 0; }
  equippedSeriesCount(seriesId, equipment) { return seriesId==='boss' && equipment?.rightHand==='oldSword' ? 1 : 0; }
  gearCardHtml(slot, item) { return this.owgName(item); }
  bossSetBonusSectionHTML() { return 'BOSS SET'; }
  defeat() { return 'defeated'; }
}

const data = { items: {}, weapons: {}, armors: {}, skills: {}, equipmentSlots: [
  { id:'rightHand', name:'右手' }, { id:'head', name:'頭' }
] };
vm.runInNewContext(gear, { window: { BattleGame, ARSENE_DATA: data }, document: { addEventListener() {} } });

assert.doesNotMatch(gear + infinite + support, /owgResonanceSectionHTML|otherWorldLastStand|owgLastStandUsed/);
const game = new BattleGame();
const allGear = ['sword','head','body','arms','feet','accessory'].map(part => ({
  uid: part, itemId: `owg_infinite_${part}`, otherWorldGear: true, stars: 6, quality: 105, ops: []
}));
const slots = Object.fromEntries(allGear.map(x => [data.items[x.itemId].slot, x.uid]));
const run = { active: true, lootBag: allGear, equipment: slots };
game.profile = { inventory: {}, equipment:{rightHand:'oldSword'}, infiniteScore: run, otherWorldGear: [], otherWorldEquipment: {} };
game.player = { hp: 0 };

assert.deepEqual(game.activeSetEffects(), {}, '異世界装備6部位を揃えても奏廊内で発動しない');
assert.equal(game.defeat(), 'defeated', '致死ダメージでも通常の敗北処理へ進む');
assert.equal(game.player.hp, 0);
allGear[0].ops.push(
  { key: 'damageReductionPercent', value: .05 },
  { key: 'repeatChance', value: .075 },
  { key: 'physicalDamagePercent', value: .10 }
);
assert.deepEqual({ ...game.activeSetEffects() }, {
  damageReductionPercent: 5, physicalRepeatChance: .075, magicRepeatChance: .075
}, '軽減・追加発動は装備個別のOPから適用する');
assert.equal(game.equipmentEffectRate('physicalDamagePercent'), .10);
assert.equal(game.equippedSeriesCount('boss'), 0);

run.active = false;
assert.deepEqual(game.activeSetEffects(), { vitPercent: 8, damageReductionPercent: 10 }, '帰還前の装備は通常戦闘へ混入しない');
game.profile.otherWorldGear = allGear;
game.profile.otherWorldEquipment = slots;
assert.equal(game.equipmentEffectRate('physicalDamagePercent'), .10, '持ち帰り装備と隠れた通常武器の効果は重複しない');
assert.equal(game.equippedSeriesCount('boss'), 0, '上書きされた通常装備はセット集計から除外');
assert.deepEqual({ ...game.activeSetEffects() }, {
  vitPercent: 8, damageReductionPercent: 15, physicalRepeatChance: .075, magicRepeatChance: .075
}, '帰還後も異世界のセット効果は発動せず、ボスセットと個別OPを適用する');
assert.equal(game.bossSetBonusSectionHTML(), 'BOSS SET');
const panel = { dataset: {}, querySelector() { return { scrollTop:0 }; } };
game.owgRenderVault(panel);
assert.match(panel.innerHTML, /終奏神器/);
assert.doesNotMatch(panel.innerHTML, /共鳴|\/6<\/span>/);
console.log('otherworld resonance removal regression: ok');
