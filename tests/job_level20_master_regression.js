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
assert.match(game, /jobLevelCapFinal \|\| 70/,
  'D5 clear must extend the JOB cap to Lv70');
assert.match(game, /jobMasterReset40Applied[\s\S]*jobMasterReset70Applied/,
  'D3 and D5 must each clear the previous MASTER tier once');
assert.match(game, /const currentMasterLevel = d5Cleared \? \(D\.jobLevelCapFinal \|\| 70\) : d3Cleared \? \(D\.jobLevelCapExtended \|\| 40\) : \(D\.jobLevelCap \|\| 20\);/,
  'save migration must restore MASTER only at 20/40/70 for the current story tier');
assert.match(otherworld, /for \(const jobId of p\.jobMastered \|\| \[\]\)[\s\S]*p\.ptStealDone\[jobId\] = true;/,
  'recovered MASTER jobs must also recover PHANTOM STEAL state');
assert.match(index, /js\/data\.js\?v=3\.12\.5/);
assert.match(index, /js\/game\.js\?v=4\.13\.12/);
assert.match(index, /js\/otherworld\.js\?v=0\.3\.7/);

console.log('job_level20_master_regression: ok');
