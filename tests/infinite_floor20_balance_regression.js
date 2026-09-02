const fs = require('fs');
const assert = require('assert');

const data = fs.readFileSync('js/infinite_score_data.js', 'utf8');
const score = fs.readFileSync('js/infinite_score.js', 'utf8');
const baseline = fs.readFileSync('tests/progression-baseline.js', 'utf8');

assert.match(data, /enemyScalePerFloor:\s*\.16/, '敵は1階ごとに線形16%強化する');
assert.match(data, /returnMinFloor:\s*20/, 'RETURN解禁は20F');
assert.equal(1 + (20 - 1) * .16, 4.04, '20Fは基礎能力の4.04倍');
assert.match(score, /r\.floor>=returnFloor&&!this\.isHasReturn\(\)&&!r\.returnMilestoneClaimed/, '20F初勝利でRETURNを確定入手する');
assert.match(score, /cards\.filter\(x=>x\.id!==['"]return['"]\|\|returnUnlocked\)/, '20F未満のカード候補にRETURNを出さない');
assert.match(score, /hasReturn=returnUnlocked&&merchant/, '20F未満の行商人にRETURNを出さない');
assert.match(baseline, /dungeon5Clear:[^\n]*maxHp:\s*1168,[^\n]*jobLevel:\s*50/, 'D5クリア想定基準を保持する');

console.log('infinite floor 20 balance regression: ok');
