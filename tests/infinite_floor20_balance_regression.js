const fs = require('fs');
const assert = require('assert');

const data = fs.readFileSync('js/infinite_score_data.js', 'utf8');
const score = fs.readFileSync('js/infinite_score.js', 'utf8');
const baseline = fs.readFileSync('tests/progression-baseline.js', 'utf8');

assert.match(data, /enemyScalePerFloor:\s*\.16/, '敵は1階ごとに線形16%強化する');
assert.match(data, /returnMinFloor:\s*20/, 'RETURN解禁は20F');
assert.match(data, /shopRate:\s*\.02/, '通常ショップの出現設定は旧8%の4分の1');
assert.equal(1 + (20 - 1) * .16, 4.04, '20Fは基礎能力の4.04倍');
assert.match(data, /minFloor:\s*1, maxFloor:\s*4, pool:\s*\['shadowSlime', 'nightBat', 'ratThief'\]/, '1〜4FはD1序盤敵だけ');
assert.match(data, /minFloor:\s*5, maxFloor:\s*10, pool:\s*\['shadowSlime'.*'ghostBone'\]/, '5〜10FはD1敵だけ');
assert.match(data, /minFloor:\s*11, maxFloor:\s*15, pool:\s*\['hushMoth'/, '11〜15FでD2敵へ更新する');
assert.match(data, /minFloor:\s*16, maxFloor:\s*9999, pool:\s*\['voidWatcher'/, '16FからD3敵へ更新する');
assert.match(score, /if\(rare&&!pool\.length\)\{rare=false;pool=this\.isEnemyPoolForFloor\(r\.floor,false\);\}/, 'レア未解禁階では通常敵へ戻してネタバレを防ぐ');
assert.match(score, /r\.floor>=returnFloor&&!this\.isHasReturn\(\)&&!r\.returnMilestoneClaimed/, '20F初勝利でRETURNを確定入手する');
assert.match(score, /cards\.filter\(x=>x\.id!==['"]return['"]\|\|returnUnlocked\)/, '20F未満のカード候補にRETURNを出さない');
assert.match(score, /hasReturn=returnUnlocked&&merchant/, '20F未満の行商人にRETURNを出さない');
assert.match(baseline, /dungeon5Clear:[^\n]*maxHp:\s*1168,[^\n]*jobLevel:\s*50/, 'D5クリア想定基準を保持する');

console.log('infinite floor 20 balance regression: ok');
