const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class BattleGame {
  equippedWeapon() { return { id: 'normal-world-starter' }; }
  usesBareFists() { return false; }
}

const window = { BattleGame };
const document = { addEventListener() {}, querySelector() { return null; } };
const runtime = vm.createContext({ window, document });
for (const file of ['data', 'battle_fx', 'infinite_score', 'otherworld_gear']) {
  vm.runInContext(fs.readFileSync('js/' + file + '.js', 'utf8'), runtime, { filename: file });
}

const game = new BattleGame();
const home = { uid: 'home', itemId: 'owg_deep_martial', otherWorldGear: true };
const found = { uid: 'found', itemId: 'owg_boundary_martial', otherWorldGear: true };
const basic = window.ARSENE_DATA.skills.martialStrike;
game.profile = { otherWorldGear: [home], otherWorldEquipment: { rightHand: home.uid } };
assert.equal(game.equippedWeapon().id, home.itemId);
const run = game.profile.infiniteScore = { active: true, lootBag: [found], equipment: {} };
function expectEmptyHand() {
  assert.equal(game.equippedWeapon().id, 'bareFist');
  assert.equal(game.usesBareFists(), true);
  assert.equal(game.fxWeaponType(basic), 'fist');
  assert.equal(game.owgEquipped().length, 0);
}
expectEmptyHand();
run.equipment.rightHand = home.uid;
expectEmptyHand();
run.equipment.rightHand = found.uid;
assert.equal(game.equippedWeapon().id, found.itemId);
assert.equal(game.usesBareFists(), false);
assert.equal(game.fxWeaponType(basic), 'martial');
assert.equal(game.owgEquipped()[0], found);
delete run.equipment.rightHand;
expectEmptyHand();
run.active = false;
assert.equal(game.equippedWeapon().id, home.itemId);
assert.equal(game.owgEquipped()[0], home);
console.log('Infinite Score weapon isolation passed');
