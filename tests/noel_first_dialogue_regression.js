const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('js/boss_dialogues.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert.match(source, /noelFirstEncounter:\s*\{\s*intro:\s*talk\('永遠の裁定者《ノエル》'/,
  'the first Noël encounter must have intro dialogue data');
assert.match(source, /const id = raw === 'zenacad' \? 'zenakado' : raw;[\s\S]*const story = DATA\[id\]/,
  'startBossEncounter must resolve the Noël encounter id through the shared dialogue table');
assert.match(source, /await this\.playBossDialogue\(story\.intro\);[\s\S]*return origStartBossEncounter\.call/,
  'intro dialogue must finish before the boss battle starts');
assert.match(index, /js\/boss_dialogues\.js\?v=0\.1\.4/);

console.log('noel_first_dialogue_regression: ok');
