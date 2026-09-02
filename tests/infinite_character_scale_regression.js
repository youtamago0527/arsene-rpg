const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('js/infinite_score.js', 'utf8');
const css = fs.readFileSync('css/infinite-score.css', 'utf8');

assert.match(source, /isExploreCharacterVisual/, '探索画面にキャラ別表示設定を提供する');
assert.match(source, /battleSpritesByWeaponType/, '戦闘と同じキャラ別スプライト設定を使う');
assert.match(source, /<img src="\$\{portrait\}" alt="\$\{name\}">/, 'iOSでも安定する画像要素で探索立ち絵を表示する');
assert.match(css, /height:calc\(var\(--is-status-height\) \+ clamp\(48px,6\.2svh,58px\)\)/, '探索ログとステータスを合わせた高さで表示する');
assert.match(css, /mix-blend-mode:screen/, '画像の黒背景を探索背景へなじませる');

console.log('infinite character scale regression: ok');
