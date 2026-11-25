const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
const otherworld = fs.readFileSync(path.join(root, 'js/otherworld.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(game, /const masterLevel = cap;/,
  'MASTER threshold must follow the currently unlocked cap');
assert.match(game, /if \(progress\.level >= masterLevel\) this\.markJobMastered\(jobId\);/,
  'reaching the current cap must mark the job mastered');
assert.match(game, /if \(progress\.level >= cap\) \{ progress\.exp = 0; progress\.expCarry = 0; \}/,
  'JEXP must only be cleared at the effective level cap');
assert.match(otherworld, /for \(const jobId of p\.jobMastered \|\| \[\]\)[\s\S]*p\.ptStealDone\[jobId\] = true;/,
  'recovered MASTER jobs must also recover PHANTOM STEAL state');

assert.match(game, /const currentMasterLevel = this\.effectiveJobLevelCap\(profile\);/);
assert.match(game, /profile\.flags\[resetFlag\] = true;/);
for (const name of ['data', 'game', 'otherworld']) {
  assert.ok(index.includes('js/' + name + '.js?v='), name + ' must use a versioned script');
}
console.log('job_level20_master_regression: ok');
