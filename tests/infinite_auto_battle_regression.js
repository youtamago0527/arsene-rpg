const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('js/infinite_score.js', 'utf8');

assert.match(source, /const keep=this\.battleMode==='infiniteScore'&&!!this\.autoBattle/, '無限戦闘勝利前のAUTO状態を記録する');
assert.match(source, /if\(keep\)\{this\.autoBattle=true;this\.autoBattleSpeedIndex=index;\}/, '勝利画面でもAUTO設定と倍率を保持する');
assert.match(source, /this\.showMainCommands\(\)/, '無限戦闘開始時に通常戦闘コマンドを表示する');

console.log('infinite auto battle regression: ok');
