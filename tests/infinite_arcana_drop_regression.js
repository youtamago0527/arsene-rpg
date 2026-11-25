const fs = require('fs');
const assert = require('assert');

const infinite = fs.readFileSync('js/infinite_score.js', 'utf8');
const data = fs.readFileSync('js/otherworld_data.js', 'utf8');
const help = fs.readFileSync('js/help_data.js', 'utf8');

assert.match(infinite, /Math\.min\(\.20,\.009\+Math\.max\(1,Number\(floor\)\|\|1\)\*\.001\)/, 'アルカナ総ドロップ率は階層比例・20%上限であること');
assert.match(infinite, /\{id:'stat',weight:70\},\{id:'protectionArcana',weight:20\},\{id:'rebirthArcana',weight:10\}/, '基礎値・保護・輪廻の抽選比率を維持すること');
assert.match(infinite, /isRollMonsterArcana\(\)/, '無限奏廊の勝利時にアルカナ抽選を行うこと');
assert.match(infinite, /profile\?\.inventory\?\.protectionArcana/, '通常所持の保護のアルカナを参照すること');
assert.match(infinite, /保護のアルカナが\$\{name\}を守った/, '調律失敗時に保護効果を適用すること');
assert.match(data, /protectionArcana:\s*\{[^}]*name:\s*'保護のアルカナ'/s, '保護のアルカナをアイテムとして定義すること');
assert(help.includes('総ドロップ率は階層ごとに上昇し、最大20％'), 'HELPにドロップ上限を明記すること');

console.log('infinite arcana drop regression: OK');

// Exercise the same roll, pickup and quantity methods used by Infinite Score victory.
const vm = require('node:vm');
class Game {}
const context = {window:{BattleGame:Game, ARSENE_DATA:{items:{protectionArcana:{name:'保護のアルカナ'}}}},document:{addEventListener(){},querySelector(){return null;}}};
vm.runInNewContext(infinite,context);
vm.runInNewContext(fs.readFileSync('js/infinite_relics.js','utf8'),context);
const game = new Game();
game.profile = {infiniteRelicLevels:{}};
let run;
game.isRun = () => run;
game.isPickWeighted = () => ({id:'protectionArcana'});
let uid=0;
game.isUid = () => String(++uid);
game.isSave = game.isShowBagFull = game.isShowLootPop = game.isLog = () => {};
game.isHasReturn = () => false;
game.isBagUsed = () => run.lootBag.length;
game.isBagLimit = () => 3;
function rollSequence(values, action) {
  game.isRand=()=>{assert(values.length,'unexpected RNG draw');return values.shift();};
  const result=action();
  assert.equal(values.length,0,'unused RNG');
  return result;
}
for(const [level,max] of [[0,1],[1,2],[49,2],[50,3],[99,3],[100,4],[149,4],[150,5],[500,12]]) {
  game.profile.infiniteRelicLevels.orb=level;
  assert.equal(rollSequence(Array(Math.max(0,max-2)).fill(0),()=>game.isArcanaDropCount()),max);
}
game.profile.infiniteRelicLevels.orb=1;
run={floor:1,lootBag:[]};
rollSequence([0],()=>game.isCollectMonsterArcana([]));
assert.equal(run.lootBag.length,2);
game.profile.infiniteRelicLevels.orb=50;
assert.equal(rollSequence([.01],()=>game.isArcanaDropCount()),2);
assert.equal(rollSequence([.00999],()=>game.isArcanaDropCount()),3);
game.profile.infiniteRelicLevels.orb=100;
run={floor:999,lootBag:[]};
const drops=[];
rollSequence([.20],()=>game.isCollectMonsterArcana(drops));
assert.deepEqual(drops,[]);
rollSequence([.199,0,0],()=>game.isCollectMonsterArcana(drops));
assert.match(drops[0],/保護のアルカナ ×4/);
assert.equal(run.lootBag.length,3);
assert.equal(run.pendingLoot.count,1);
assert.ok(run.lootBag.every(x=>x.itemId===run.pendingLoot.itemId));
run.lootBag=[];run.pendingLoot=null;
game.profile.infiniteRelicLevels.orb=150;
game.isBagLimit=()=>0;
rollSequence([.1,0,0,0],()=>game.isCollectMonsterArcana(drops));
run=JSON.parse(JSON.stringify(run));
assert.equal(run.pendingLoot.count,5);
for(const limit of [2,4,5]){
  game.isBagLimit=()=>limit;
  const pending=run.pendingLoot;run.pendingLoot=null;
  assert.equal(game.isAddLoot(pending),limit===5);
  assert.equal(run.lootBag.length+(run.pendingLoot?.count||0),5);
}
assert.equal(new Set(run.lootBag.map(x=>x.uid)).size,5);
console.log('Arcana drop/quantity independence, 50-level milestones and bag overflow: OK');
