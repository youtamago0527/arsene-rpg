const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const infinite = fs.readFileSync(path.join(root, 'js', 'infinite_score.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');

assert.match(infinite, /this\.isBindLongPress\?\.\(panel\);/, '探索画面の方向ボタンに直接入力処理を結び直す');
assert.match(infinite, /addEventListener\('pointerdown',resolve/, '方向ボタンはpointerdown時点で移動を確定する');
assert.match(infinite, /isRouteInputLocked=true/, '方向ボタンの二重発火を防ぐ');
assert.match(infinite, /this\.isShowRouteTransition\(direction,node\)/, '同じ背景へ移動しても進行が分かる演出を出す');
assert.match(infinite, /isRenderRoomResult\(`\$\{name\}を拾いました`,'LOOT BAGへ収めた。','item'\)/, '宝箱装備は名称付きの取得画面を即時表示する');
const activeTreasure = infinite.slice(infinite.lastIndexOf('P.isTreasure=function()'), infinite.indexOf('P.isRoomResultHtml=function()', infinite.lastIndexOf('P.isTreasure=function()')));
assert.match(activeTreasure, /isRenderRoomResult\(`\$\{name\}を拾いました`,'LOOT BAGへ収めた。','item'\)/, '最後に有効な宝箱処理が中央取得POPを表示する');
assert.doesNotMatch(activeTreasure, /isRenderBag\(/, '最後に有効な宝箱処理がバッグ画面へ遷移している');
assert.match(game, /!!D\.weapons\?\.\[item\.id\]/, '通常戦でも全武器DROPを取得通知の対象にする');
assert.match(game, /WEAPON PICKED UP/, '武器取得通知を明示する');
assert.match(game, /\$\{item\.name\}\$\{weapon \? 'を拾いました'/, '武器取得通知に実名を表示する');
assert.match(infinite, /class="is-sell-equipped">装備中/, '異世界の売却一覧で装備中を明示する');
assert.match(infinite, /isConfirm\('装備中のアイテムです',[\s\S]*外して売る/, '装備中の品をゲーム内モーダルで確認してから売る');

console.log('infinite navigation and weapon pickup regression: ok');
