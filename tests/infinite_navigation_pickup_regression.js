const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const infinite = fs.readFileSync(path.join(root, 'js', 'infinite_score.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');

assert.match(infinite, /this\.isBindLongPress\?\.\(panel\);/, '探索画面の方向ボタンに直接入力処理を結び直す');
assert.match(infinite, /addEventListener\('pointerdown',resolve/, '方向ボタンはpointerdown時点で移動を確定する');
assert.match(infinite, /querySelectorAll\('\.is-route-choice\[data-is-choice\]'\)/, '方向入力を矢印ボタンだけへ限定する');
assert.doesNotMatch(infinite, /isRouteInputLocked/, '前画面の入力ロックが新しい矢印タップを破棄する');
assert.match(infinite, /if\(btn\.dataset\.isResolved\)return/, '同じ矢印のpointerdownとclickを二重処理しない');
assert.match(infinite, /this\.isShowRouteTransition\(direction,node\)/, '同じ背景へ移動しても進行が分かる演出を出す');
const activeTreasure = infinite.slice(infinite.lastIndexOf('P.isTreasure=function()'), infinite.indexOf('P.isRoomResultHtml=function()', infinite.lastIndexOf('P.isTreasure=function()')));
assert.match(activeTreasure, /isRenderRoomResult\('宝箱を発見',[\s\S]*action:'treasure-open',label:'宝箱を開ける'/, '宝箱背景で開封操作を提示する');
assert.match(activeTreasure, /P\.isOpenTreasure=function\(\)[\s\S]*isRenderRoomResult\(`\$\{name\}を拾いました`,'LOOT BAGへ収めた。','item',\{remapOnClose:true\}\)/, '開封後に名称付き中央取得POPを表示する');
assert.doesNotMatch(activeTreasure, /isRenderBag\(/, '最後に有効な宝箱処理がバッグ画面へ遷移している');
assert.match(infinite, /if\(act==='treasure-open'\)g\.isOpenTreasure\(\)/, '宝箱を開ける操作が開封処理へ接続されていない');
assert.match(infinite, /if\(remap\)g\.isRemapCurrentFloor\('宝箱部屋踏破'\)/, '取得POPを閉じた後に宝箱部屋を再マッピングしない');
assert.match(infinite, /if\(node\.type==='treasure'\)return node\.id\.length%2\?'assets\/bg\/infinite-score\/treasure-corridor\.png':'assets\/bg\/infinite-score\/treasure-room\.png'/, '宝箱部屋の専用背景が失われている');
assert.match(game, /!!D\.weapons\?\.\[item\.id\]/, '通常戦でも全武器DROPを取得通知の対象にする');
assert.match(game, /WEAPON PICKED UP/, '武器取得通知を明示する');
assert.match(game, /\$\{item\.name\}\$\{weapon \? 'を拾いました'/, '武器取得通知に実名を表示する');
assert.match(infinite, /class="is-sell-equipped">装備中/, '異世界の売却一覧で装備中を明示する');
assert.match(infinite, /isConfirm\('装備中のアイテムです',[\s\S]*外して売る/, '装備中の品をゲーム内モーダルで確認してから売る');

console.log('infinite navigation and weapon pickup regression: ok');
