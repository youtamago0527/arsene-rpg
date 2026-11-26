const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

const plain = value => JSON.parse(JSON.stringify(value));

function restoredGame() {
  class Game {
    isRand() { return .42; }
    isTwoHandedWeapon() { return false; }
    saveProfile() { this.lastSave = plain(this.profile); }
    showResult() {}
    renderMenuSummary() {}
    renderMenuPanel() {}
  }
  const data = {items:{}, weapons:{}, armors:{}, skills:{}, enemies:{}};
  const document = {addEventListener(){}, querySelector(){return null;}, getElementById(){return null;}};
  const context = {window:{BattleGame:Game, ARSENE_DATA:data}, document};
  for (const script of ['infinite_score_data','infinite_gear_v2_data','infinite_gear_v2','infinite_score','otherworld_gear','infinite_relics']) {
    vm.runInNewContext(fs.readFileSync('js/'+script+'.js','utf8'),context,{filename:script+'.js'});
  }
  const game = new Game();
  const drop = (uid, part) => data.infiniteGear.generate({uid,part,floor:50,rarity:'mythic',random:()=>.42});
  const sword = drop('selected-v2','sword');
  sword.plus = 4;
  sword.locked = true;
  const legacy = {uid:'selected-old',itemId:'owg_boundary_head',kind:'equipment',otherWorldGear:true,plus:3,quality:110,ops:[]};
  const saved = {
    inventory:{}, equipment:{rightHand:'new-home-sword'}, flags:{}, otherWorldGear:[drop('already-owned','staff')],
    otherWorldEquipment:{rightHand:'already-owned'}, infiniteRelicLevels:{'twin-rings':1},
    infiniteScore:{
      active:true,floor:51,equipment:{rightHand:sword.uid},homeEquipment:{rightHand:'older-sword'},
      homeEquipmentInProfile:true,homeVitals:{hp:42,mp:15},pendingCards:[{id:'return'}],
      lootBag:[sword, legacy, drop('discarded','staff'), {uid:'arcana',itemId:'fixtureArcana',count:3}]
    }
  };
  data.items.fixtureArcana = {arcanaStat:'str'};
  game.profile = plain(saved);
  return {game, sword:plain(sword), legacy, saved:plain(saved)};
}

test('RETURN enchant card on a reloaded 1.0.7 run keeps chosen V2 and legacy gear with the edited home loadout', async () => {
  const {game, sword, legacy, saved} = restoredGame();
  const run = game.isRun();
  assert.equal(game.isReturnRun([],run,{id:'return'}),false);
  let pick = null;
  game.isGameDialog = async options => {
    assert.equal(options.selectionLimit,2);
    assert.equal(options.choices.length,3);
    return pick;
  };
  await game.isApplyCard(0);
  assert.strictEqual(game.isRun(),run);
  assert.deepEqual(plain(game.profile),saved);
  pick = [0,1];
  await game.isApplyCard(0);
  assert.deepEqual(game.lastSave.otherWorldGear,[saved.otherWorldGear[0],sword,legacy]);
  assert.deepEqual(game.lastSave.inventory,{fixtureArcana:3});
  assert.deepEqual(game.lastSave.equipment,{rightHand:'new-home-sword'});
  assert.deepEqual(game.lastSave.currentVitals,{hp:42,mp:15});
  assert.equal(game.lastSave.infiniteScore.lastResult,'return');
  assert.equal(game.lastSave.flags.owRestoreJobPending,true);
  assert.equal(game.isReturnRun([sword.uid],run),false);
  game.profile = plain(game.lastSave);
  game.owgEquip(sword.uid);
  assert.equal(game.profile.otherWorldEquipment.rightHand,sword.uid);
});

test('RETURN item on an older run restores the saved home loadout and leaves declined gear behind', async () => {
  const {game, saved} = restoredGame();
  const run = game.isRun();
  delete run.homeEquipmentInProfile;
  delete run.pendingCards;
  game.profile.equipment = {rightHand:null};
  run.lootBag.push({uid:'exit',itemId:'infiniteReturn',count:1});
  game.isGameDialog = async () => [];
  await game.isUseBagItem('exit');
  assert.deepEqual(game.lastSave.equipment,{rightHand:'older-sword'});
  assert.deepEqual(game.lastSave.otherWorldGear,saved.otherWorldGear);
  assert.deepEqual(game.lastSave.inventory,{fixtureArcana:3});
});
