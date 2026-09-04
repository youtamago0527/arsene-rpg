const fs = require('fs');
const assert = require('assert');

const game = fs.readFileSync('js/game.js', 'utf8');
const css = fs.readFileSync('css/menu.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert.match(game, /workshopUnlockTutorialHTML\(\)/, 'workshop guide helper must exist');
for (const text of ['ドロップした素材', '同じ装備', '＋3', '100％', '＋4', 'ロスト']) {
  assert.ok(game.includes(text), `workshop guide must explain: ${text}`);
}
assert.match(game, /battleMode === 'noel'[\s\S]*?showBossRewardSequence\([\s\S]*?workshopUnlockTutorialHTML\(\)/, 'Noel defeat must sequence unlock and workshop guide');
assert.ok(css.includes('.workshop-unlock-tutorial'), 'workshop guide styles must exist');
assert.ok(index.includes('css/menu.css?v=0.9.5'), 'menu CSS cache version must be bumped');
assert.ok(index.includes('js/game.js?v=4.13.15'), 'game JS cache version must include the Noel tutorial');

console.log('noel workshop tutorial regression: ok');
