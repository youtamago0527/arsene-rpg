const assert = require('node:assert/strict');
const fs = require('node:fs');
const game = fs.readFileSync('js/game.js','utf8');
const css = fs.readFileSync('css/overlay-fixes.css','utf8');
const infinite = fs.readFileSync('css/infinite-score.css','utf8');
const methods = game.slice(game.indexOf('    closeLogOverlay()'), game.indexOf('\n',game.indexOf('    toggleBattleLog()')));
const nodes = new Map();
const doc = {
  getElementById: id => nodes.get(id),
  createElement: () => ({ addEventListener(){}, querySelector(){return {focus(){}}}, remove(){nodes.delete(this.id)} }),
  body: { appendChild(node){ nodes.set(node.id,node); } }
};
const Game = new Function('document',`return class { ${methods} renderBattleLog(){} }`)(doc);
const g = new Game(); g.battleLogHistory=['test'];
for(let i=0;i<100;i++) {
  g.toggleBattleLog(); assert.equal(nodes.size,1); assert.equal(g.battleLogExpanded,true);
  g.toggleBattleLog(); assert.equal(nodes.size,0); assert.equal(g.battleLogExpanded,false);
}
g.showLogOverlay('EXPLORE LOG','test');g.showLogOverlay('EXPLORE LOG','again');assert.equal(nodes.size,1);
g.closeLogOverlay();assert.equal(nodes.size,0);
const resultZ = Number(infinite.match(/#result\.result-overlay\{z-index:(\d+)/)[1]);
const offerZ = Number(css.match(/body > \.q-offer-modal \{ z-index: (\d+)/)[1]);
assert.ok(offerZ>resultZ,'Reward offers must be above the result screen');
assert.match(game,/cleanupBattleTransientUI\(\) \{\s*this.closeLogOverlay\(\)/);
console.log('Overlay lifecycle: 100 open/close cycles, replacement, cleanup and stacking PASS');
