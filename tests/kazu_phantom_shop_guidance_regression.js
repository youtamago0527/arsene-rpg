const assert = require('node:assert/strict');
const fs = require('node:fs');

const dialogues = fs.readFileSync('js/kazu_dialogues.js', 'utf8');
const game = fs.readFileSync('js/game.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

for (const id of ['early_phantom_shop_01', 'early_phantom_shop_02', 'early_phantom_shop_03']) {
  assert.match(dialogues, new RegExp(`id:'${id}'[^\n]+condition:'early_phantom_shop'[^\n]+once:true`), `${id} must be a one-time early hint`);
}
assert.match(dialogues, /俺に触っても意味ないからな/);
assert.match(dialogues, /俺を三回つついたら《PHANTOM SHOP》/);
assert.match(dialogues, /俺を三回タップして、買い物を選び/);
assert.match(game, /case 'early_phantom_shop': return !f\.noelFirstEncounterCleared;/,
  'shop hints must be frequent only during the opening section');
assert.match(index, /js\/kazu_dialogues\.js\?v=0\.1\.4/);
assert.match(index, /js\/game\.js\?v=4\.13\.16/);

console.log('kazu_phantom_shop_guidance_regression: ok');
