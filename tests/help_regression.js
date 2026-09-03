const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/help_data.js'), 'utf8'), context, { filename: 'help_data.js' });

const help = Array.from(context.window.ARSENE_HELP || []);
const byId = Object.fromEntries(help.map(row => [row.id, row]));
const body = id => Array.from(byId[id].body || []).join('\n');
const visible = unlocked => help.filter(row => !row.lockedBy || unlocked.has(row.lockedBy)).map(row => row.id);

assert.equal(new Set(help.map(row => row.id)).size, help.length, 'HELP id must be unique');

const initial = visible(new Set());
for (const id of ['workshop', 'magicKnight', 'phantomThief', 'otherWorld', 'enhance', 'dualBlade', 'rebirth', 'guardian', 'levelCap', 'levelCapFinal']) {
  assert(!initial.includes(id), `${id} must not be visible before unlock`);
}
assert(!body('job').includes('PHANTOM'), 'initial JOB help must not spoil PHANTOM THIEF');
assert(!body('jobSkill').includes('魔奏士'), 'initial JOB skill help must not spoil locked jobs');
assert(!body('mastery').includes('楽器'), 'initial mastery help must not spoil instrument unlock');

assert(body('stats').includes('器用さ'), 'stats help must include DEX');
assert(body('passive').includes('Lv1'), 'passive help must cover level-1 passives');
assert(body('magicKnight').includes('魔力装填'), 'magic knight signature action must match current implementation');
assert(body('magicKnight').includes('Lv5') && body('magicKnight').includes('アンサンブル'), 'ensemble unlock level must be documented');
assert(body('otherWorld').includes('土＝器用さ'), 'Saturday arcana must grant DEX');
assert(!body('otherWorld').includes('土＝運'), 'obsolete Saturday LUK reward must not return');
assert(body('phantomThief').includes('ACTION 2個') && body('phantomThief').includes('PASSIVE 2個'), 'RE:MIX slot counts must be documented');
assert(body('levelCap').includes('Lv40') && !body('levelCap').includes('Lv70'), 'D3 cap HELP must not spoil the D5 cap');
assert(body('levelCapFinal').includes('Lv70'), 'D5 cap HELP must document the final cap');
assert(body('enhance').includes('+3') && body('enhance').includes('+4'), 'enhancement safety and destruction thresholds must be documented');

const gameSource = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
assert(gameSource.includes('list.filter(e => !e.lockedBy || this.helpUnlocked(e.lockedBy))'), 'locked HELP rows must be removed from the list');
assert(gameSource.includes("key === 'levelCapFinal'"), 'D5 cap HELP must have a dedicated unlock gate');
assert(!gameSource.includes("locked ? '🔒 '"), 'locked HELP headings must not be rendered');

console.log('help regression: ok');
