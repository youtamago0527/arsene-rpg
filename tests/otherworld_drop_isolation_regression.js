const fs = require('fs');
const assert = require('assert');

const data = fs.readFileSync('js/otherworld_data.js', 'utf8');
const otherworld = fs.readFileSync('js/otherworld.js', 'utf8');
const infinite = fs.readFileSync('js/infinite_score.js', 'utf8');
const gear = fs.readFileSync('js/otherworld_gear.js', 'utf8');

assert.match(data, /dropTable:\s*\[\]/, '曜日異世界モンスターは通常dropTableを持たない');
assert.match(data, /zakoShardRate:\s*0\.35/, '曜日異世界の雑魚は異界の欠片を専用抽選する');
assert.match(data, /zakoArcanaRate:\s*0/, '雑魚からアルカナを直接落とさない');
assert.match(otherworld, /profile\.inventory\.otherworldShard/, '曜日異世界の撃破報酬を異界の欠片へ加算する');
assert.doesNotMatch(otherworld, /cfg\.zakoArcanaRate/, '雑魚撃破の旧アルカナ抽選を残さない');

const infiniteReward = infinite.match(/P\.grantEnemyReward=function\(enemy\)\{[\s\S]*?const origEnemySteal=/)?.[0] || '';
assert.ok(infiniteReward, '無限奏廊の敵報酬処理が存在する');
assert.doesNotMatch(infiniteReward, /enemy\.rolledDrops/, '無限奏廊へ通常モンスター素材を持ち込まない');
assert.match(gear, /floor>=25/, '異界の核は25階以上でのみ抽選する');
assert.match(gear, /floor>=150\?\.12:floor>=100\?\.08:floor>=50\?\.05:\.02/, '深層ほど核の抽選率が上がる');

console.log('otherworld drop isolation regression: ok');
