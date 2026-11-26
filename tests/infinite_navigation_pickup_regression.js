const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const infinite = fs.readFileSync(path.join(root, 'js', 'infinite_score.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');

assert.match(infinite, /this\.isBindLongPress\?\.\(panel\);/, '探索画面の方向ボタンに直接入力処理を結び直す');
assert.match(infinite, /addEventListener\('pointerdown',resolve/, '方向ボタンはpointerdown時点で移動を確定する');
assert.match(infinite, /querySelectorAll\('\.is-route-choice\[data-is-choice\]'\)/, '方向入力を矢印ボタンだけへ限定する');
assert.doesNotMatch(infinite, /isRouteInputLocked/, '前画面の入力ロックが新しい矢印タップを破棄する');
assert.match(infinite, /if\(btn\.dataset\.isResolved\)return/, '同じ矢印のpointerdownとclickを二重処理しない');
assert.match(infinite, /this\.isShowRouteTransition\(direction,node\)/, '同じ背景へ移動しても進行が分かる演出を出す');
const activeTreasure = infinite.slice(infinite.lastIndexOf('P.isTreasure = function'), infinite.indexOf('P.isRoomResultHtml=function()'));
assert.match(infinite, /current\?\.chestPending[^\n]*action:'treasure-open',label:'宝箱を開ける'/, '未開封の宝箱に開封操作を提示する');
assert.match(activeTreasure, /isRenderRoomResult\(name \+ 'を発見',[\s\S]*remapOnClose: true/, '開封後に装備名を表示する');
assert.doesNotMatch(activeTreasure, /isRollStairRelic/, '宝箱から遺物を取得しない');
assert.doesNotMatch(activeTreasure, /isRenderBag\(/, '最後に有効な宝箱処理がバッグ画面へ遷移している');
assert.match(infinite, /if\(act==='treasure-open'\)g\.isOpenTreasure\(\)/, '宝箱を開ける操作が開封処理へ接続されていない');
assert.match(infinite, /if\(remap\)g\.isRemapCurrentFloor\('宝箱部屋踏破'\)/, '取得POPを閉じた後に宝箱部屋を再マッピングしない');
assert.match(infinite, /if\(node\.type==='treasure'\)return node\.id\.length%2\?'assets\/bg\/infinite-score\/treasure-corridor\.png':'assets\/bg\/infinite-score\/treasure-room\.png'/, '宝箱部屋の専用背景が失われている');
assert.match(game, /!!D\.weapons\?\.\[item\.id\]/, '通常戦でも全武器DROPを取得通知の対象にする');
assert.match(game, /WEAPON PICKED UP/, '武器取得通知を明示する');
assert.match(game, /\$\{item\.name\}\$\{weapon \? 'を拾いました'/, '武器取得通知に実名を表示する');
assert.match(infinite, /class="is-sell-equipped">装備中/, '異世界の売却一覧で装備中を明示する');
assert.match(infinite, /isConfirm\('装備中のアイテムです',[\s\S]*外して売る/, '装備中の品をゲーム内モーダルで確認してから売る');

const hideout = { insertBefore(node) { node.parentNode = this; } };
const body = { appendChild(node) { node.parentNode = this; } };
const panel = { parentNode: hideout, dataset: {}, style: {}, classList: { add() {} } };
class BattleGame {
  renderMenuPanel(name) { panel.dataset.panel = name; }
}
const document = { body, querySelector: selector => selector === '#menu-panel' ? panel : null, addEventListener() {} };
vm.runInNewContext(infinite, { window: { BattleGame, ARSENE_DATA: { items: {} } }, document });
const player = new BattleGame();
player.usingInfiniteScoreEquipment = true;
player.profile = { infiniteScore: { active: true, equipment: {} }, equipment: {} };
player.isRenderExplore = () => {};
player.isOpenAbilitySettings();
assert.equal(panel.parentNode, body, 'ability settings stay outside the hidden hideout');
assert.equal(panel.dataset.panel, 'infinite-score-abilities');
assert.equal(panel.hidden, false);
player.renderMenuPanel('job');
assert.equal(panel.dataset.panel, 'infinite-score-abilities', 'ability changes keep the exploration panel visible');
player.renderMenuPanel('infinite-score');
assert.equal(panel.dataset.panel, 'infinite-score');
player.profile.infiniteScore.active = false;
player.renderMenuPanel('job');
assert.equal(panel.parentNode, hideout, 'normal job screen returns to the hideout');
assert.equal(panel.dataset.panel, 'job');

console.log('infinite navigation and weapon pickup regression: ok');
