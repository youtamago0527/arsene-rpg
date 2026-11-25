const fs = require('fs');
const assert = require('assert');

const data = fs.readFileSync('js/infinite_score_data.js', 'utf8');
const score = fs.readFileSync('js/infinite_score.js', 'utf8');
const baseline = fs.readFileSync('tests/progression-baseline.js', 'utf8');

assert.match(data, /enemyScalePerFloor:\s*\.16/, '敵は1階ごとに線形16%強化する');
assert.match(data, /enemyBaseScale:\s*1\.25/, '入口の敵はD4通常敵より25%強い');
assert.match(data, /returnMinFloor:\s*20/, '戦闘・カード・行商人のRETURN解禁は20F');
assert.match(data, /shopRate:\s*\.02/, '通常ショップの出現設定は旧8%の4分の1');
assert.equal(1.25 * (1 + (20 - 1) * .16), 5.05, '20Fは原種能力の5.05倍');
assert.match(score, /scale=\(cfg\.enemyBaseScale\|\|1\)\*\(1\+\(r\.floor-1\)\*cfg\.enemyScalePerFloor\)/, '戦闘能力へ入口倍率を適用する');
assert.match(data, /minFloor:\s*1, maxFloor:\s*4, pool:\s*\['flashHound'/, '1〜4FからD4敵を出す');
assert.match(data, /minFloor:\s*5, maxFloor:\s*10, pool:\s*\['severKite'/, '5〜10FもD4敵を出す');
assert.match(data, /minFloor:\s*11, maxFloor:\s*15, pool:\s*\['severedChoir'/, '11〜15FもD4敵を出す');
assert.match(data, /minFloor:\s*16, maxFloor:\s*9999, pool:\s*\['voidWatcher'/, '16Fから異界の強敵へ更新する');
assert.match(score, /if\(rare&&!pool\.length\)\{rare=false;pool=this\.isEnemyPoolForFloor\(r\.floor,false\);\}/, 'レア未解禁階では通常敵へ戻してネタバレを防ぐ');
assert.match(score, /r\.floor>=returnFloor&&!this\.isHasReturn\(\)&&!r\.returnMilestoneClaimed/, '20F初勝利でRETURNを確定入手する');
assert.match(score, /cards\.filter\(x=>x\.id!==['"]return['"]\|\|returnUnlocked\)/, '20F未満のカード候補にRETURNを出さない');
assert.match(score, /hasReturn=state.merchant&&run.floor>=returnFloor/, '20F未満の行商人にRETURNを出さない');
assert.match(baseline, /dungeon5Clear:[^\n]*maxHp:\s*1168,[^\n]*jobLevel:\s*50/, 'D5クリア想定基準を保持する');

console.log('infinite floor 20 balance regression: ok');
