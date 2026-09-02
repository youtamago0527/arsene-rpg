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
