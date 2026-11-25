const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

class Game {}
const data = { items: { testGear: {name:'試験装備'}, protectionArcana: {name:'保護のアルカナ'} } };
const document = { addEventListener(){}, querySelector(){return null;} };
vm.runInNewContext(fs.readFileSync('js/infinite_score.js','utf8'),{window:{BattleGame:Game,ARSENE_DATA:data},document});

function makeGame({ rare = true, escaped = false, gearDrop = false, arcanaDrop = false, full = false } = {}) {
  const game = new Game();
  const run = {
    floor:45, buffs:{rareBonus:.20,treasureBonus:.10}, lootBag:full?Array.from({length:30},()=>({itemId:'testGear'})):[],
    dungeonGold:0, encounterCountOnFloor:0, returnMilestoneClaimed:true, pendingCards:[{id:'hunt',name:'狩猟'}]
  };
  game.battleMode='infiniteScore';
  game.player={hp:100,mp:40};
  game.enemies=[{id:rare?'merox':'voidWatcher',rareRun:rare,alive:false,escaped}];
  game.audio={sfx(){}};
  game.totalStats=()=>({maxHp:100,maxMp:40});
  game.profile={};
  game.isRun=()=>run;
  game.isEffectiveCfg=()=>({gearDropRate:gearDrop?1:0,recoveryDropRate:0,returnItemRate:0,cardRate:0,battleCardRate:0,currencyMultiplier:1});
  game.isRand=()=>.50;
  game.isRecoverRelicVitals=()=>null;
  game.isEarnRelicCoins=(_,gold)=>gold;
  game.isGenerateGear=()=>({uid:'new-gear',itemId:'testGear',kind:'equipment',count:1});
  game.isRollMonsterArcana=()=>arcanaDrop?'protectionArcana':null;
  game.isArcanaDropCount=()=>1;
  game.isClearMapRoom=game.isRollStairs=game.battleSleep=game.showResult=game.isHideDefaultResultMenu=()=>{};
  game.isShowLootPop=game.isShowBagFull=game.isAfterBattle=()=>{};
  game.saveProfile=()=>{game.saved=JSON.parse(JSON.stringify(run));};
  return {game,run};
}

test('hunt stacks by five points and clears after a rare enemy battle drops gear', async () => {
  const {game,run}=makeGame({gearDrop:true});
  await game.isApplyCard(0);
  assert.equal(run.buffs.rareBonus,.25);
  await game.victory();
  assert.equal(run.lootBag[0].uid,'new-gear');
  assert.equal(run.buffs.rareBonus,0);
  assert.equal(game.saved.buffs.rareBonus,0);
  assert.equal(run.buffs.treasureBonus,.10);
});

test('hunt clears even if the rare battle drop waits for room in the loot bag', async () => {
  const {game,run}=makeGame({gearDrop:true,full:true});
  await game.victory();
  assert.equal(run.pendingLoot.uid,'new-gear');
  assert.equal(run.lootBag.length,30);
  assert.equal(game.saved.buffs.rareBonus,0);
});

test('hunt also clears on an Arcana drop from a rare enemy', async () => {
  const {game,run}=makeGame({arcanaDrop:true});
  await game.victory();
  assert.equal(run.lootBag[0].itemId,'protectionArcana');
  assert.equal(run.buffs.rareBonus,0);
});

test('hunt persists after ordinary drops, a rare battle without an item, or a rare enemy escaping', async () => {
  for (const options of [{rare:false,gearDrop:true},{},{escaped:true,gearDrop:true}]) {
    const {game,run}=makeGame(options);
    await game.victory();
    assert.equal(run.buffs.rareBonus,.20);
  }
});
