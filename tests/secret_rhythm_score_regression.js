const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const data = fs.readFileSync('js/data.js', 'utf8');
const game = fs.readFileSync('js/game.js', 'utf8');
const rhythm = fs.readFileSync('js/kazu_minigame.js', 'utf8');
const shop = fs.readFileSync('js/phantom_shop.js', 'utf8');
const audio = path.join('音楽系', '隠し音ゲー', '絶望の戦利品-LOOT-.mp3');

assert(data.includes("use: 'secretMusicGame'"), 'CADENZA must unlock the secret rhythm track');
assert(shop.includes("scoreId: 'cadenzaLoot'"), 'LOOT track must require the CADENZA score');
assert(shop.includes("const displayTitle = unlocked ? track.title : '？？？？？？'"), 'locked track title must stay hidden');
assert(rhythm.includes('kazuRhythmHighScores?.[this.track.id]'), 'high scores must be stored per track');
assert(game.includes("score.use === 'secretMusicGame'"), 'score reward destination must be selected per score');
assert(fs.existsSync(audio), 'LOOT audio asset is missing');

console.log('secret rhythm score regression: ok');
