const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

class Game {}
const stats=['arcanaChaos','arcanaMight','arcanaGuard','arcanaMagic','arcanaSpirit','arcanaGale','arcanaDext'];
const arcana=[...stats,'rebirthArcana','protectionArcana','blessedProtectionArcana'];
const data={
  items:Object.fromEntries([...arcana,'testGear','infiniteReturn','otherworldShard','otherworldCore'].map(id=>[id,{name:id}])),
  arcana:{weekly:stats.map(id=>({id}))},
  infiniteScore:{rareEnemyArcanaCount:7}
};
const document = { addEventListener(){}, querySelector(){return null;}, getElementById(){return null;} };
vm.runInNewContext(fs.readFileSync('js/infinite_score.js','utf8'),{window:{BattleGame:Game,ARSENE_DATA:data},document});

function makeGame({rare=true,escaped=false,arcanaDrop=false,full=false,forgeDrops,random=()=>.5}={}) {
  const game=new Game();
  let run={
    floor:45,seed:1,buffs:{rareBonus:.20,treasureBonus:.10},
    lootBag:full?Array.from({length:30},()=>({itemId:'testGear'})):[],
    dungeonGold:0,encounterCountOnFloor:0,returnMilestoneClaimed:true,pendingCards:[{id:'hunt',name:'狩猟'}]
  };
  game.battleMode='infiniteScore';
  game.player={hp:100,mp:40};
  game.enemies=[{rareRun:rare,alive:false,escaped}];
  game.audio={sfx(){}};
  game.totalStats=()=>({maxHp:100,maxMp:40});
  game.profile={};
  game.isRun=()=>run;
  game.isEffectiveCfg=()=>({gearDropRate:.14,rareGearDropMultiplier:2,recoveryDropRate:0,returnItemRate:0,cardRate:0,currencyMultiplier:1,forgeDrops});
  game.isRand=random;
  game.isRecoverRelicVitals=()=>null;
  game.isEarnRelicCoins=(_,gold)=>gold;
  game.isGenerateGear=options=>{
    game.rareGear=options?.rareDrop===true;
    return {uid:'new-gear',itemId:'testGear',kind:'equipment',count:1};
  };
  game.isRollMonsterArcana=()=>arcanaDrop?'protectionArcana':null;
  game.isArcanaDropCount=()=>1;
  game.isClearMapRoom=game.isRollStairs=game.battleSleep=game.showResult=game.isHideDefaultResultMenu=()=>{};
  game.isShowLootPop=game.isShowBagFull=game.isAfterBattle=()=>{};
  game.saveProfile=()=>{game.saved=JSON.stringify(run);};
  game.reloadRun=()=>{run=JSON.parse(game.saved);return run;};
  return {game,run};
}

test('at floor 45 a 50% roll yields rare gear and seven Arcana, and resets Hunt', async () => {
  const {game,run}=makeGame();
  await game.isApplyCard(0);
  assert.equal(run.buffs.rareBonus,.25);
  await game.victory();
  assert.equal(game.rareGear,true);
  assert.equal(run.lootBag[0].uid,'new-gear');
  assert.equal(run.lootBag.filter(item=>arcana.includes(item.itemId)).length,7);
  assert.equal(game.reloadRun().buffs.rareBonus,0);
  assert.equal(run.buffs.treasureBonus,.10);
});

test('all ten equal-width Arcana slots are reachable and equipment is not required', async () => {
  for(const [i,itemId] of arcana.entries()){
    const draws=[.5,.90,.5];
    const {game,run}=makeGame({random:()=>draws.shift()??((i+.5)/arcana.length)});
    await game.victory();
    assert.equal(run.lootBag.length,7);
    assert(run.lootBag.every(item=>item.itemId===itemId));
  }
});

test('gear and all seven mixed Arcana survive a full bag and save/reload', async () => {
  const draws=[.5,.50,.01,.11,.21,.71,.81,.91,.99];
  const {game}=makeGame({full:true,random:()=>draws.shift()??.50});
  await game.victory();
  const run=game.reloadRun();
  assert.equal(run.pendingLoot.uid,'new-gear');
  assert.equal(run.pendingLootQueue.reduce((count,item)=>count+item.count,0),7);
  assert.equal(run.buffs.rareBonus,0);
  assert(game.isResolvePendingLoot(true),'passing on the gear opens the next individual reward');
  run.lootBag.splice(0,3);
  assert(game.isResolvePendingLoot());
  assert.equal(run.lootBag.filter(item=>arcana.includes(item.itemId)).length,3);
  assert.equal(run.pendingLoot.count+run.pendingLootQueue.reduce((count,item)=>count+item.count,0),4);
  run.lootBag.splice(0,4);
  assert(game.isResolvePendingLoot());
  const items=run.lootBag.filter(item=>arcana.includes(item.itemId));
  assert.equal(items.length,7);
  assert.equal(new Set(items.map(item=>item.uid)).size,7);
  assert(items.some(item=>item.itemId==='blessedProtectionArcana'));
  assert.equal(run.pendingLoot,null);
});

test('the milestone RETURN is awarded together with rare drops', async () => {
  const {game,run}=makeGame();
  run.returnMilestoneClaimed=false;
  await game.victory();
  assert(run.returnMilestoneClaimed);
  assert.equal(run.lootBag.length,9);
  assert.equal(run.lootBag[0].itemId,'infiniteReturn');
  assert.equal(run.lootBag[1].uid,'new-gear');
});

test('normal encounters and escaped rare enemies use the ordinary Arcana roll and keep Hunt', async () => {
  for(const options of [{rare:false,arcanaDrop:true},{escaped:true,arcanaDrop:true}]){
    const {game,run}=makeGame(options);
    await game.victory();
    assert.equal(run.lootBag.length,1);
    assert.equal(run.lootBag[0].itemId,'protectionArcana');
    assert.equal(run.buffs.rareBonus,.20);
  }
});

test('ordinary and rare victories drop forge materials that stack within a run', async () => {
  const forgeDrops = {shards:2, rareShards:5, rareCores:1};
  const normal = makeGame({rare:false, forgeDrops});
  await normal.game.victory();
  await normal.game.victory();
  const shards = normal.game.reloadRun().lootBag.filter(item => item.itemId === 'otherworldShard');
  assert.equal(shards.length, 1);
  assert.equal(shards[0].count, 4);

  const rare = makeGame({forgeDrops});
  await rare.game.victory();
  const bag = rare.game.reloadRun().lootBag;
  assert.equal(bag.find(item => item.itemId === 'otherworldShard').count, 5);
  assert.equal(bag.find(item => item.itemId === 'otherworldCore').count, 1);
  assert.equal(bag.filter(item => arcana.includes(item.itemId)).length, 7);
});

test('a full bag still accepts forge materials that already have a stack', async () => {
  const {game,run} = makeGame({full:true,rare:false,forgeDrops:{shards:2,rareShards:5,rareCores:1}});
  run.lootBag[0] = {uid:'old-shards',itemId:'otherworldShard',count:8};
  await game.victory();
  const loaded = game.reloadRun();
  assert.equal(loaded.lootBag.length, 30);
  assert.equal(loaded.lootBag[0].count, 10);
  assert.equal(loaded.pendingLoot, undefined);
  loaded.lootBag[1] = {uid:'old-single',itemId:'otherworldShard',count:1};
  game.isEnsureRunShape(loaded);
  assert.equal(loaded.lootBag.length, 29);
  assert.equal(loaded.lootBag[0].count, 11);
});
