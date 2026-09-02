const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('js/infinite_score.js', 'utf8');
const css = fs.readFileSync('css/infinite-score.css', 'utf8');

assert.match(source, /isExploreCharacterVisual/, '探索画面にキャラ別表示設定を提供する');
assert.match(source, /battleSpritesByWeaponType/, '戦闘と同じキャラ別スプライト設定を使う');
assert.match(source, /--is-character-size:\$\{portraitSize\}/, 'キャラ別拡大率を探索立ち絵へ渡す');
assert.match(css, /height:calc\(var\(--is-status-height\) \+ clamp\(48px,6\.2svh,58px\)\)/, '探索ログとステータスを合わせた高さで表示する');

console.log('infinite character scale regression: ok');
