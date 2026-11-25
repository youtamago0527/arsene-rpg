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
// Later cache revisions also include the 20/40/70 cap migration.
for (const [script, minor, minPatch] of [['data', '3.12', 10], ['game', '4.13', 15], ['otherworld', '0.3', 8]]) {
  const src = index.match(new RegExp('js/' + script + '\\.js\\?v=([\\d.]+)'));
  assert(src, script + ' cache key missing');
  const [major, sub, patch] = src[1].split('.').map(Number);
  const [minMajor, minSub] = minor.split('.').map(Number);
  assert(major > minMajor || (major === minMajor && (sub > minSub || (sub === minSub && patch >= minPatch))), script + ' cache version predates the cap migration');
}

console.log('job_level20_master_regression: ok');
