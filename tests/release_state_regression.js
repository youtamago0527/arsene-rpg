const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const future = read('js/future_data.js');
const release = read('js/release_content.js');
const infinite = read('js/infinite_score_data.js');
const otherworld = read('js/otherworld.js');
const boss = read('js/boss_dialogues.js');
const game = read('js/game.js');
const start = read('js/start-flow.js');

assert.match(future, /id: 'ronin', name: '刀術士'/, 'D4 JOB must use its final name');
assert.doesNotMatch(`${future}\n${release}`, /浪士/, 'legacy D4 JOB name remains in release data');
assert.match(release, /name: '刀術士の証'/, 'D4 proof must use the final JOB name');
assert.doesNotMatch(infinite, /id: 'infiniteScore'[^\n]*debugOnly/, 'released Infinite Score must not be debug-only');
assert.match(otherworld, /《曜日異世界ダンジョン》が解放されました。/, 'D1 unlock message must name the weekday dungeon');
assert.match(boss, /<span>《無限奏廊》<br>PHANTOM THIEF ONLY<\/span>/, 'D3 unlock message must name Infinite Score independently');
assert.doesNotMatch(`${game}\n${start}\n${release}`, /EARLY ACCESS|Early Access/, 'App Store 1.0 release UI must not show Early Access');
assert.match(`${game}\n${start}`, /Ver\.1\.0/, 'release version label is missing');

console.log('release state regression: ok');
