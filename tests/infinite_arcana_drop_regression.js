const fs = require('fs');
const assert = require('assert');

const infinite = fs.readFileSync('js/infinite_score.js', 'utf8');
const data = fs.readFileSync('js/otherworld_data.js', 'utf8');
const help = fs.readFileSync('js/help_data.js', 'utf8');
const forge = fs.readFileSync('js/infinite_gear_forge.js', 'utf8');
const game = fs.readFileSync('js/game.js', 'utf8');

assert.match(infinite, /Math\.min\(\.20,\.009\+Math\.max\(1,Number\(floor\)\|\|1\)\*\.001\)/, 'アルカナ総ドロップ率は階層比例・20%上限であること');
assert.match(infinite, /\{id:'stat',weight:70\},\{id:'protectionArcana',weight:20\},\{id:'rebirthArcana',weight:10\}/, '基礎値・保護・輪廻の抽選比率を維持すること');
assert.match(infinite, /isRollMonsterArcana\(\)/, '無限奏廊の勝利時にアルカナ抽選を行うこと');
assert.match(game, /inventory\.protectionArcana/, '通常強化で保護のアルカナを参照すること');
assert.doesNotMatch(forge, /protectionArcana|owgTune/, '無限奏廊工房は調律や保護のアルカナを使わない');
assert.match(data, /protectionArcana:\s*\{[^}]*name:\s*'保護のアルカナ'/s, '保護のアルカナをアイテムとして定義すること');
assert(help.includes('総ドロップ率は階層ごとに上昇し、最大20％'), 'HELPにドロップ上限を明記すること');

console.log('infinite arcana drop regression: OK');
