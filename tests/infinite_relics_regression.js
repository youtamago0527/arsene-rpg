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
const uppers = ['wheat','chalice','claw','lock','tome','mirror','hourglass','compass','crown'];
const stats = ['maxHp','maxMp','str','vit','mag','mnd','agi','dex','luk'];
function totals() {
  const result = Object.fromEntries(stats.map(key => [key,100]));
  game.isApplyRelicStats(result);
  return result;
}
game.profile = {};
for (let i = 0; i < 9; i++) {
  assert.match(draw(i,20,14), /Lv.1/);
  assert.equal(game.profile.infiniteRelicLevels[normals[i]],1);
  assert.equal(totals()[stats[i]],102);
  assert.match(draw(i+9,40,23), /Lv.1/);
  assert.equal(game.profile.infiniteRelicLevels[uppers[i]],1);
  assert.equal(totals()[stats[i]],132);
}
for (const [id, pairs] of [
  ['phial', [[1,2],[10,20],[20,40],[21,41],[50,70]]],
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
game.profile.infiniteRelicLevels = Object.fromEntries([...normals, 'shell','lute','obsidian','gear','astrolabe'].map(id => [id,50]));
assert.ok(draw(0,20,9));
assert.equal(game.profile.deferredRelicDraws,1);
draw(0,40,9);
assert.equal(game.profile.deferredRelicDraws,0);
assert.equal(game.profile.infiniteRelicLevels.wheat,2);
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
console.log('23 relics: milestone rolls, growth, recovery, weakness, coins and permanent saves: OK');
