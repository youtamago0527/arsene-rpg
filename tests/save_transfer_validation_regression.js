const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const writes = [];
let reloads = 0;
const context = { window: {}, document: {}, addEventListener() {},
  localStorage: { getItem() { return null; }, setItem(k, v) { writes.push([k, v]); } },
  location: { reload() { reloads++; } },
  atob: s => Buffer.from(s, 'base64').toString('binary'),
  btoa: s => Buffer.from(s, 'binary').toString('base64'),
  escape, unescape, Date, console
};
vm.createContext(context);
for (const file of ['js/data.js', 'js/game.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
const game = Object.create(context.window.BattleGame.prototype);
game.profile = game.freshProfile();
const encode = payload => Buffer.from(JSON.stringify(payload)).toString('base64');
const valid = { app: 'arsene-rpg', v: 1, save: JSON.parse(JSON.stringify(game.profile)), meta: null };
assert(game.decodeSaveTransferCode(encode(valid)), 'current fresh-profile export must remain importable');
const legacy = JSON.parse(JSON.stringify(valid)); legacy.save.version = 1;
assert(game.decodeSaveTransferCode(encode(legacy)), 'older profile versions must remain importable');
for (const payload of [
  { save: true }, { ...valid, save: true }, { ...valid, save: [] }, { ...valid, save: {} },
  { ...valid, app: 'unrelated-app' }, { ...valid, v: 999 },
  { ...valid, save: { ...valid.save, inventory: [] } },
  { ...valid, meta: 'broken metadata' }
]) {
  assert.equal(game.decodeSaveTransferCode(encode(payload)), null, `reject malformed import: ${JSON.stringify(payload).slice(0, 100)}`);
  assert.equal(game.applySaveTransfer(payload), false, 'invalid payload must not write or reload even if called directly');
}
assert.equal(game.decodeSaveTransferCode('not a transfer code'), null);
assert.equal(writes.length, 0, 'rejected imports must preserve the existing save');
assert.equal(reloads, 0);
game.applySaveTransfer(valid);
assert.equal(writes.length, 1, 'valid import still writes the profile');
assert.equal(reloads, 1);
console.log('save transfer validation regression: ok');
