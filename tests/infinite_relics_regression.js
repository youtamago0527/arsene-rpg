const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Game {}
vm.runInNewContext(fs.readFileSync('js/infinite_relics.js', 'utf8'), {
  window: { BattleGame: Game }, document: { addEventListener() {} }
});
const game = new Game();
game.profile = {};
game.isRand = () => { throw Error('unexpected roll'); };
for (const count of [0, 1, 4, 6, 19, 39]) assert.equal(game.isRollStairRelic(count), null);
for (const count of [5, 10, 15, 25, 35]) {
  game.isRand = () => .30;
  assert.equal(game.isRollStairRelic(count), null);
  let values = [.299999, 0];
  game.isRand = () => values.shift();
  assert.ok(game.isRollStairRelic(count));
  assert.equal(values.length, 0);
}
function draw(index, count, poolSize) {
  game.isRand = () => (index + .5) / poolSize;
  return game.isRollStairRelic(count);
}
const normals = ['phial','shard','skull','knight','frost-flower','lantern','feather','hairpin','key'];
const uppers = ['wheat','chalice','claw','lock','tome','mirror','hourglass','fox-mask','crown'];
const stats = ['maxHp','maxMp','str','vit','mag','mnd','agi','dex','luk'];
function totals() {
  const result = Object.fromEntries(stats.map(key => [key,100]));
  game.isApplyRelicStats(result);
  return result;
}
game.profile = {};
for (let i = 0; i < 9; i++) {
  assert.match(draw(i,20,19), /Lv.1/);
  assert.equal(game.profile.infiniteRelicLevels[normals[i]],1);
  assert.equal(totals()[stats[i]],102);
  assert.match(draw(i+9,40,29), /Lv.1/);
  assert.equal(game.profile.infiniteRelicLevels[uppers[i]],1);
  assert.equal(totals()[stats[i]],132);
}
for (const [id, pairs] of [
  ['phial', [[1,2],[10,20],[20,40],[21,41],[50,70],[51,71],[1000,1020]]],
  ['wheat', [[1,30],[2,65],[3,100],[10,460],[18,1130],[19,1235],[20,1350],[50,7125]]]
]) {
  for (const [level, bonus] of pairs) {
    game.profile.infiniteRelicLevels = { [id]:level };
    assert.equal(totals().maxHp,100+bonus);
  }
}
game.profile = { infiniteRelicIds:['skull','signet','missing'], infiniteScore:{relicIds:['skull']} };
game.isMigrateRelicLevels(game.profile);
assert.equal(game.profile.infiniteRelicLevels.skull,3);
game.profile = JSON.parse(JSON.stringify(game.profile));
game.isMigrateRelicLevels(game.profile);
assert.deepEqual(game.profile.infiniteRelicLevels,{skull:3});
// Pick the last entry on every successful roll. This selects the mask exactly when eligible.
function drawLast(count) {
  const rolls = count % 20 === 0 ? [.99999] : [0,.99999];
  game.isRand = () => rolls.shift();
  return game.isRollStairRelic(count);
}
game.profile.infiniteRelicLevels = {};
for (let level = 1; level <= 4; level++) {
  const threshold = level * 20;
  assert.doesNotMatch(drawLast(threshold - 5), /時空の羅針盤/);
  assert.equal(game.isRollStairRelic(threshold - 1),null);
  assert.match(drawLast(threshold), /時空の羅針盤/);
  assert.equal(game.profile.infiniteRelicLevels['compass'],level);
  assert.doesNotMatch(drawLast(threshold + 5), /時空の羅針盤/);
}
game.profile = JSON.parse(JSON.stringify(game.profile));
assert.doesNotMatch(drawLast(20), /時空の羅針盤/);
assert.equal(game.isStairRelicDistance(),4);
assert.match(drawLast(105), /時空の羅針盤 Lv\.5/);
const oldRelics = { infiniteRelicLevels:{'fox-mask':3,compass:5} };
game.isMigrateRelicLevels(oldRelics);
game.isMigrateRelicLevels(oldRelics);
assert.deepEqual(oldRelics.infiniteRelicLevels,{compass:3,'fox-mask':5});
const supports = ['shell','lute','obsidian','gear','astrolabe','orb','quill','signet','globe','twin-rings'];
const allRelics = [...normals, ...uppers, ...supports, 'compass'];
game.profile.infiniteRelicLevels = Object.fromEntries(allRelics.map(id => [id,50]));
const uncappedShallow = [...normals, ...supports.filter(id => id !== 'obsidian' && id !== 'twin-rings')];
for (const [index,id] of uncappedShallow.entries()) {
  assert.match(draw(index,20,uncappedShallow.length), /Lv\.51/);
  assert.equal(game.profile.infiniteRelicLevels[id],51);
}
for (const [index,id] of uppers.entries()) {
  assert.match(draw(9+index,40,27), /Lv\.51/);
  assert.equal(game.profile.infiniteRelicLevels[id],51);
}
assert.match(draw(26,40,27), /双環の誓い Lv\.51/);
assert.match(draw(27,1020,28), /時空の羅針盤 Lv\.51/);
assert.equal(game.isStairRelicDistance(),51);
assert.equal(game.profile.deferredRelicDraws,undefined);
game.profile.deferredRelicDraws = 2;
draw(0,40,27);
assert.equal(game.profile.infiniteRelicLevels.wheat,53);
assert.equal(game.profile.deferredRelicDraws,0);
game.profile = { infiniteRelicLevels: { shell:1, lute:1, obsidian:1, gear:1, astrolabe:1 } };
const player = { hp:25, mp:0, stats:{ maxHp:200, maxMp:39 } };
const run = {};
assert.match(game.isRecoverRelicVitals(run,player),/HP \+2.*MP \+1/);
assert.deepEqual(run,{ hp:27, mp:1 });
player.hp=199; player.mp=39;
assert.equal(game.isRecoverRelicVitals(run,player), 'HP +1');
const enemy = {maxHp:500, atk:200, def:100, mag:95, mnd:70};
game.isWeakenRelicEnemy(enemy);
assert.deepEqual(enemy,{maxHp:495,atk:198,def:99,mag:95,mnd:70});
assert.equal(game.isEarnRelicCoins(run,99),99);
assert.equal(game.isEarnRelicCoins(run,1),2);
assert.deepEqual(Object.values(totals()),Array(9).fill(100));
const data = { items:{}, weapons:{}, armors:{}, skills:{} };
Game.prototype.totalStats = () => Object.fromEntries(stats.map(key=>[key,100]));
const gearContext = {window:{BattleGame:Game,ARSENE_DATA:data},document:{addEventListener(){}}};
for (const file of ['infinite_score_data','infinite_gear_v2_data','infinite_gear_v2','otherworld_gear']) {
  vm.runInNewContext(fs.readFileSync('js/' + file + '.js','utf8'),gearContext);
}
game.isRun = () => run;
function rolledTier(floor, roll, source='enemy') {
  let first = true;
  game.isRand = () => { if (first) { first=false; return roll; } return .317; };
  return game.owgGenerate({floor,source,part:'sword'}).tier;
}
const originalLevels = game.profile.infiniteRelicLevels;
game.profile.infiniteRelicLevels = {skull:1};
game.isRunForEquipment = () => run;
assert.equal(game.totalStats().str,102);
game.isRunForEquipment = () => null;
assert.equal(game.totalStats().str,100);
game.profile.infiniteRelicLevels = originalLevels;
// The released V2 table has a 2% enemy roll at floor 500; Lv.1 expands it to exactly 2.02%.
assert.equal(rolledTier(500,.97981),6);
assert.equal(rolledTier(500,.97979),5);
game.profile.infiniteRelicLevels.astrolabe = 0;
assert.equal(rolledTier(500,.97981),5);
assert.equal(rolledTier(500,.98001),6);
const sourceRolls = ['treasure','gacha'].map(source => [.25,.6,.95,.999999].map(p => rolledTier(500,p,source)));
game.profile.infiniteRelicLevels.astrolabe = 10000;
assert.equal(rolledTier(500,.01),6);
assert.deepEqual(['treasure','gacha'].map(source => [.25,.6,.95,.999999].map(p => rolledTier(500,p,source))),sourceRolls);
assert.equal(sourceRolls[0].at(-1),5);
assert.equal(sourceRolls[1].at(-1),3);
game.isRun = () => null;
assert.equal(rolledTier(500,.97981),5);
game.isRun = () => run;
game.profile.infiniteRelicLevels = Object.fromEntries(allRelics.map(id => [id,1000]));
assert.match(draw(0,40,27), /Lv\.1001/);
game.profile = JSON.parse(JSON.stringify(game.profile));
assert.equal(game.profile.infiniteRelicLevels.phial,1001);
assert.equal(game.isSupportRelicRate('gear'),1000);
assert.equal(game.isEarnRelicCoins({},10),110);
const highEnemy = {maxHp:7500, atk:200, def:0};
game.isWeakenRelicEnemy(highEnemy);
assert.deepEqual(highEnemy,{maxHp:3750,atk:100,def:0});
assert.equal(game.profile.infiniteRelicLevels.obsidian,50);
game.profile.infiniteRelicLevels.obsidian=49;
assert.match(draw(11,20,18), /黒曜の円盤 Lv\.50/);
assert.doesNotMatch(draw(11,20,17), /黒曜の円盤/);
assert.equal(game.isSupportRelicRate('obsidian'),50);
player.hp=1; player.mp=0;
game.isRecoverRelicVitals(run,player);
assert.equal(player.hp,200);
assert.equal(player.mp,39);
assert.equal(rolledTier(500,.79),6);
assert.equal(rolledTier(500,.77),5);
vm.runInNewContext(fs.readFileSync('js/infinite_score.js','utf8'), {
  window:{ BattleGame:Game, ARSENE_DATA:data }, document:{ addEventListener(){}, querySelector(){return null;}, getElementById(){return null;} }
});
vm.runInNewContext(fs.readFileSync('js/infinite_score_data.js','utf8'),{window:{ARSENE_DATA:data}});
data.items.fixtureArcana = {arcanaStat:'str'};
game.profile.infiniteRelicLevels['compass'] = 3;
Object.assign(run,{floor:18,relicDescents:4});
game.isEffectiveCfg = () => ({maxFloor:100});
game.isAtStairs = () => true;
game.isCreateFloorMap = game.isLog = game.isRenderExplore = () => {};
const milestones = [];
game.isRollStairRelic = used => { milestones.push(used); return null; };
const stairOptions = [...game.isStairHtml().matchAll(/<option value="(\d+)"/g)].map(match=>Number(match[1]));
assert.deepEqual(stairOptions,[1,2,3]);
for (const invalid of [0,4,1.5,NaN]) game.isDescend(invalid);
assert.deepEqual(milestones,[]);
game.isDescend(3);
assert.equal(run.floor,21);
assert.equal(run.relicDescents,5);
assert.deepEqual(milestones,[5]);
assert.match(game.isStairHtml(),/value="3" selected/);
run.floor=99;
assert.equal(game.isStairDistanceLimit(run),1);
game.isDescend();
assert.equal(run.floor,100);
game.isDescend();
assert.equal(run.relicDescents,6);
console.log('29 relics: milestone rolls, growth, recovery, weakness, coins and permanent saves: OK');

const { test } = require('node:test');

test('forge shards are debited using the displayed quill discount', async () => {
  const playerGame = new Game();
  playerGame.profile = {infiniteRelicLevels:{quill:20}};
  playerGame.isForgeUI = {opIndex:0};
  const target = {uid:'target',itemId:'test',otherWorldGear:true,ops:[],stars:3};
  const source = {uid:'source',itemId:'test',otherWorldGear:true,ops:[{key:'str',rank:1,value:1}]};
  const bag = [
    target, source,
    {uid:'shards',itemId:'otherworldShard',count:38},
    {uid:'core',itemId:'otherworldCore',count:1}
  ];
  const forgeRun = {lootBag:bag,equipment:{}};
  playerGame.isRun = () => forgeRun;
  playerGame.isForgeName = gear => gear.uid;
  playerGame.isCfg = () => ({opLabels:{str:'力'}});
  playerGame.isConfirm = async () => true;
  playerGame.isNotify = async (title) => { assert.equal(title, '強化成功'); };
  playerGame.isRand = () => 0;
  playerGame.owgTuneCost = () => ({shard:3,core:0});
  playerGame.isSave = playerGame.isLog = playerGame.isRenderWorkshop = () => {};
  assert.equal(playerGame.isForgeOpCost(source.ops[0]).shard, 24);
  assert.equal(playerGame.isForgeOpCost().shard, 8);
  await playerGame.isForgeEnhance(target.uid);
  assert.equal(target.plus, 1);
  assert.equal(playerGame.isForgeMaterialCount('otherworldShard'), 35);
  await playerGame.isForgeTransfer(source.uid, target.uid);
  assert.equal(playerGame.isForgeMaterialCount('otherworldShard'), 11);
  assert.equal(playerGame.isForgeMaterialCount('otherworldCore'), 0);
  assert.equal(target.ops[0].key, 'str');
  assert(!playerGame.isBagEntry(source.uid));
  await playerGame.isForgeDelete(target.uid);
  assert.equal(playerGame.isForgeMaterialCount('otherworldShard'), 3);
  assert.equal(target.ops.length, 0);
  playerGame.profile.infiniteRelicLevels.quill = 1000;
  assert.equal(playerGame.isForgeOpCost().shard, 1);
});

test('the signet saves a single offer through cancellation and reopening', async () => {
  const playerGame = new Game();
  playerGame.profile = {infiniteRelicLevels:{signet:1}};
  assert.equal(playerGame.isTreasureChoiceRate(), .05);
  playerGame.isCfg = () => ({chestRates:{silver:1}});
  playerGame.isPickWeighted = rows => rows[0];
  let floor = {currentId:'chest',node:{chestPending:true}};
  const chestRun = {lootBag:[],buffs:{}};
  playerGame.isRun = () => chestRun;
  playerGame.isFloorMap = () => floor;
  playerGame.isMapNode = () => floor.node;
  let generated = 0;
  playerGame.isGenerateGear = ({source}) => ({uid:'gear-'+(++generated),itemId:'t'+generated,stars:3,quality:100,ops:[],source});
  playerGame.isForgeStats = () => [{label:'ATK',value:10}];
  playerGame.isForgeName = playerGame.owgName = gear => gear.uid;
  playerGame.isSave = playerGame.isLog = () => {};
  let resultOptions;
  playerGame.isRenderRoomResult = (...args) => { resultOptions = args[3]; };
  playerGame.isAddLoot = gear => { chestRun.lootBag.push(gear); return true; };
  playerGame.isRand = () => .049;
  playerGame.isChoose = async (_, choices) => {
    assert.equal(choices.length, 2);
    assert.match(choices[1].note, /ATK 10/);
    return null;
  };
  await playerGame.isOpenTreasure();
  assert.equal(generated, 2);
  assert.equal(chestRun.lootBag.length, 0);
  assert.equal(floor.node.chestPending, true);

  floor = JSON.parse(JSON.stringify(floor));
  playerGame.isRand = () => { throw Error('a saved offer must not reroll'); };
  playerGame.isChoose = async (_, choices) => {
    assert.equal(choices[1].label, 'gear-2');
    return 1;
  };
  await playerGame.isOpenTreasure();
  await playerGame.isOpenTreasure();
  assert.equal(generated, 2);
  assert.deepEqual(chestRun.lootBag.map(gear => gear.uid), ['gear-2']);
  assert.equal(chestRun.lootBag[0].source, 'treasure');
  assert.equal(floor.node.chestOpened, true);
  assert.equal(resultOptions.remapOnClose, true);
});

test('return keeps all Arcana and only selected gear, with distinct relic capacity bonuses', () => {
  const playerGame = new Game();
  const equipment = {rightHand:'home-sword'};
  const first = {uid:'first',itemId:'owg_boundary_sword',kind:'equipment',otherWorldGear:true,quality:103,ops:[]};
  const second = {uid:'second',itemId:'owg_boundary_head',kind:'equipment',otherWorldGear:true,quality:92,ops:[]};
  const lootBag = [
    first, second, {uid:'unselected',itemId:'owg_boundary_feet',kind:'equipment',otherWorldGear:true},
    {uid:'return',itemId:'infiniteReturn',count:2},
    {uid:'hp',itemId:'owPotion20',count:4},
    {uid:'mp',itemId:'owManaPotion60',count:2},
    {uid:'shards',itemId:'otherworldShard',count:31},
    {uid:'stat',itemId:'fixtureArcana',count:3},
    {uid:'special',itemId:'blessedProtectionArcana',count:1}
  ];
  const testRun = {active:true,lootBag,equipment:{},homeEquipment:equipment,homeVitals:{hp:20,mp:5},floor:22};
  playerGame.profile = {
    infiniteScore:testRun, infiniteScoreDebug:{}, infiniteRelicLevels:{globe:4},
    inventory:{potion:2,owPotion20:8,owManaPotion60:5,infiniteReturn:5,fixtureArcana:2}, flags:{}
  };
  playerGame.isCfg = () => ({bagLimit:30});
  playerGame.saveProfile = playerGame.showResult = () => {};
  assert.equal(playerGame.isBagLimit(),34);
  assert.equal(playerGame.isReturnGearLimit(),1);
  assert.equal(playerGame.isReturnRun(['first','second'],testRun),false);
  playerGame.profile.infiniteRelicLevels['twin-rings'] = 1;
  assert.equal(playerGame.isReturnGearLimit(),2);
  assert.equal(playerGame.isReturnRun(['first','second'],testRun),true);
  assert.equal(playerGame.isReturnRun(['first','second'],testRun),false);
  assert.deepEqual(playerGame.profile.inventory,{potion:2,fixtureArcana:5,blessedProtectionArcana:1});
  assert.deepEqual(JSON.parse(JSON.stringify(playerGame.profile.otherWorldGear)), [first, second]);
  assert.equal(playerGame.profile.infiniteScore.active,false);
  assert.equal(playerGame.profile.infiniteScore.returnedCount,6);
});
