const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const infinite = fs.readFileSync(path.join(root, 'js', 'infinite_score.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');

assert.match(infinite, /this\.isBindLongPress\?\.\(panel\);/, '探索画面の方向ボタンにpointerup処理を結び直す');
assert.match(infinite, /this\.isShowRouteTransition\(direction,node\)/, '同じ背景へ移動しても進行が分かる演出を出す');
assert.match(infinite, /isRenderRoomResult\(`\$\{name\}を拾いました`,'LOOT BAGへ収めた。','item'\)/, '宝箱装備は名称付きの取得画面を即時表示する');
assert.match(game, /!!D\.weapons\?\.\[item\.id\]/, '通常戦でも全武器DROPを取得通知の対象にする');
assert.match(game, /WEAPON PICKED UP/, '武器取得通知を明示する');
assert.match(game, /\$\{item\.name\}\$\{weapon \? 'を拾いました'/, '武器取得通知に実名を表示する');

console.log('infinite navigation and weapon pickup regression: ok');
