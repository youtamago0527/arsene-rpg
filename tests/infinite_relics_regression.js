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
  assert.match(draw(i,20,16), /Lv.1/);
  assert.equal(game.profile.infiniteRelicLevels[normals[i]],1);
  assert.equal(totals()[stats[i]],102);
  assert.match(draw(i+9,40,25), /Lv.1/);
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
const supports = ['shell','lute','obsidian','gear','astrolabe','orb'];
const allRelics = [...normals, ...uppers, ...supports, 'compass'];
game.profile.infiniteRelicLevels = Object.fromEntries(allRelics.map(id => [id,50]));
for (const [index,id] of [...normals,...supports].entries()) {
  assert.match(draw(index,20,15), /Lv\.51/);
  assert.equal(game.profile.infiniteRelicLevels[id],51);
}
for (const [index,id] of uppers.entries()) {
  assert.match(draw(9+index,40,24), /Lv\.51/);
  assert.equal(game.profile.infiniteRelicLevels[id],51);
}
assert.match(draw(24,1020,25), /時空の羅針盤 Lv\.51/);
assert.equal(game.isStairRelicDistance(),51);
assert.equal(game.profile.deferredRelicDraws,undefined);
game.profile.deferredRelicDraws = 2;
draw(0,40,24);
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
vm.runInNewContext(fs.readFileSync('js/otherworld_gear.js','utf8'), {
  window:{ BattleGame:Game, ARSENE_DATA:data }, document:{ addEventListener(){} }
});
game.isRun = () => run;
game.isRand = () => .9799;
assert.equal(game.owgRollStar(25),6);
game.profile.infiniteRelicLevels.astrolabe = 0;
assert.equal(game.owgRollStar(25),5);
game.profile.infiniteRelicLevels.astrolabe = 1;
game.isRand = () => .97979;
assert.equal(game.owgRollStar(25),5);
game.isRand = () => .999999;
assert.equal(game.owgRollStar(9),5);
game.profile.infiniteRelicLevels = Object.fromEntries(allRelics.map(id => [id,1000]));
assert.match(draw(0,40,24), /Lv\.1001/);
game.profile = JSON.parse(JSON.stringify(game.profile));
assert.equal(game.profile.infiniteRelicLevels.phial,1001);
assert.equal(game.isSupportRelicRate('gear'),1000);
assert.equal(game.isEarnRelicCoins({},10),110);
const highEnemy = {maxHp:7500, atk:200, def:0};
game.isWeakenRelicEnemy(highEnemy);
assert.deepEqual(highEnemy,{maxHp:1,atk:1,def:0});
player.hp=1; player.mp=0;
game.isRecoverRelicVitals(run,player);
assert.equal(player.hp,200);
assert.equal(player.mp,39);
game.isRand = () => 0;
assert.equal(game.owgRollStar(150),6);
game.isRand = () => .999999;
assert.equal(game.owgRollStar(9),5);
vm.runInNewContext(fs.readFileSync('js/infinite_score.js','utf8'), {
  window:{ BattleGame:Game, ARSENE_DATA:data }, document:{ addEventListener(){}, querySelector(){return null;} }
});
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
console.log('25 relics: milestone rolls, growth, recovery, weakness, coins and permanent saves: OK');
