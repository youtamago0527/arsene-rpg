const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/menu.css'), 'utf8');
assert(game.includes('data-equip-best'), 'best equipment button is missing');
assert(game.includes('equipBestLoadout()'), 'best equipment button is not connected');
assert(game.includes("{ id: 'attackPower', name: '攻撃力' }"), 'attack sort is missing');
assert(game.includes("{ id: 'defensePower', name: '防御力' }"), 'defense sort is missing');
assert(game.includes("{ id: 'magicDefensePower', name: '魔法防御力' }"), 'magic defense sort is missing');
assert(game.includes("attackPower: 'attack', defensePower: 'defense', magicDefensePower: 'magicDefense'"), 'combat sort values are not connected');
assert(css.includes('.equipment-best{'), 'best equipment button styling is missing');
console.log('equipment best/sort regression: ok');

global.window = {};
global.addEventListener = () => {};
const panel = { dataset: {}, style: {}, classList: { add() {} } };
global.document = {
  addEventListener() {},
  querySelector(selector) { return selector === '#menu-panel' ? panel : null; },
  body: { appendChild(element) { element.parentNode = this; } },
};
require('../js/data.js');
require('../js/game.js');
const { BattleGame, ARSENE_DATA: data } = window;
BattleGame.prototype.renderMenuPanel = function () {};
BattleGame.prototype.showMenu = function () { return this.equippedWeapon(); };
require('../js/infinite_score.js');
require('../js/otherworld_gear.js');

const player = Object.create(BattleGame.prototype);
player.profile = player.freshProfile();
player.audio = { sfx() {} };
player.renderMenuSummary = () => {};
player.isRenderExplore = () => {};
player.isRenderEquipment = () => {};
let saved;
player.saveProfile = () => { saved = JSON.stringify(player.profile); };

const weakest = 'regressionWeakSword', strongest = 'regressionStrongSword';
for (const [id, power] of [[weakest, 2], [strongest, 90]]) {
  data.weapons[id] = { id, weaponType: 'sword', attackPower: power, bonuses: {} };
  data.items[id] = { id, category: 'equipment', slot: 'rightHand', ...data.weapons[id] };
  player.profile.inventory[id] = 1;
}
const runGear = { uid: 'run-sword', itemId: 'owg_deep_martial', otherWorldGear: true, quality: 100, ops: [] };
assert(data.weapons[runGear.itemId], 'use an actual generated Infinite Score weapon definition');
player.profile.equipment.rightHand = null;
player.profile.infiniteScore = {
  active: true, floor: 11, homeEquipment: { ...player.profile.equipment, rightHand: weakest },
  equipment: { rightHand: runGear.uid }, lootBag: [runGear],
};

player.renderMenuPanel('infinite-score');
assert.equal(player.equippedWeapon(), data.weapons[runGear.itemId]);
assert.equal(player.showMenu('home'), data.weapons[weakest], 'normal status restores home gear before rendering');
assert.equal(player.owgEquipped().length, 0, 'a paused run cannot add its gear to normal stats');
assert.equal(player.equipmentCombatStats({ rightHand: strongest }).attackPower, 90, 'normal combat values use the actual candidate');
player.equipBestLoadout();
assert.equal(player.profile.equipment.rightHand, strongest, '最強 chooses the stronger owned sword');
assert.equal(player.isRun().equipment.rightHand, runGear.uid, '最強 leaves the exploration loadout untouched');

player.profile = JSON.parse(saved);
player.usingInfiniteScoreEquipment = undefined;
player.renderMenuPanel('infinite-score');
assert.equal(player.isRun().homeEquipment.rightHand, strongest, 'resuming captures the saved normal loadout');
assert.equal(player.equippedWeapon(), data.weapons[runGear.itemId]);
player.isRun().equipment.rightHand = null;
player.profile.otherWorldGear = [{ ...runGear, uid: 'vault-sword' }];
player.profile.otherWorldEquipment = { rightHand: 'vault-sword' };
assert.notEqual(player.equippedWeapon(), data.weapons[runGear.itemId], 'an empty run slot does not fall back to the normal vault');
player.showMenu('home');
assert.equal(player.profile.equipment.rightHand, strongest, 'the selected normal loadout survives resuming and leaving');
assert.equal(player.equippedWeapon(), data.weapons[runGear.itemId], 'normal vault gear is still available outside the run');
player.profile.otherWorldEquipment = {};
player.isRun().equipment.rightHand = runGear.uid;
player.profile.infiniteScore.active = false;
assert.equal(player.owgEquipped().length, 0, 'finished runs cannot add unreturned gear to normal stats');
assert.equal(player.equippedWeapon(), data.weapons[strongest]);
console.log('active Infinite Score equipment isolation: ok');
