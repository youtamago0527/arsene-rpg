const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
const otherworld = fs.readFileSync(path.join(root, 'js/otherworld.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(game, /const masterLevel = D\.jobLevelCap \|\| 20;/,
  'MASTER threshold must stay at the original Lv20 cap');
assert.match(game, /if \(progress\.level >= masterLevel\) this\.markJobMastered\(jobId\);/,
  'Lv20 must mark the job mastered even when the effective cap is 40');
assert.match(game, /if \(progress\.level >= cap\) \{ progress\.exp = 0; progress\.expCarry = 0; \}/,
  'JEXP must only be cleared at the effective level cap');
assert.doesNotMatch(game, /progress\.level >= cap\) \{[^}]*markJobMastered/,
  'MASTER must not move to Lv40 with the extended cap');
assert.match(game, /const jobMasterLevel = D\.jobLevelCap \|\| 20;[\s\S]*profile\.jobMastered\.push\(id\);/,
  'Lv20+ legacy saves must recover their MASTER state');
assert.match(otherworld, /for \(const jobId of p\.jobMastered \|\| \[\]\)[\s\S]*p\.ptStealDone\[jobId\] = true;/,
  'recovered MASTER jobs must also recover PHANTOM STEAL state');
assert.match(index, /js\/game\.js\?v=4\.13\.11/);
assert.match(index, /js\/otherworld\.js\?v=0\.3\.7/);

console.log('job_level20_master_regression: ok');
