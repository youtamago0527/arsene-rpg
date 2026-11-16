const fs = require('fs'), vm = require('vm'), assert = require('assert');
const read = file => fs.readFileSync(`${__dirname}/../${file}`, 'utf8');
for (const file of ['index.html', 'js/game.js', 'js/data.js']) {
  assert(!/arseneDebugRoom|debugPassword|data-debug-(enter|open|pw)|debug_room\.js/.test(read(file)), `${file}: no editor entry or credential`);
}
assert(!fs.existsSync(`${__dirname}/../js/debug_room.js`), 'editor implementation removed');
const context = { window: {}, document: {}, addEventListener() {} };
vm.runInNewContext(read('js/data.js'), context);
vm.runInNewContext(read('js/game.js'), context);
const actor = Object.create(context.window.BattleGame.prototype);
actor.systemTab = 'debug'; actor.audio = { getVolumes: () => ({ bgm: 50, sfx: 50, voice: 50 }) };
const panel = {};
actor.renderSystemPanel(panel);
assert.strictEqual(actor.systemTab, 'sound', 'old saved debug tab falls back safely');
assert(!/data-debug-|data-system-tab="debug"/.test(panel.innerHTML));
assert(panel.innerHTML.includes('data-system-tab="data"'), 'save transfer remains available');
console.log('release debug room regression: ok');
