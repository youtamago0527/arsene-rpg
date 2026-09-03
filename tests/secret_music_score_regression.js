const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');
const shop = fs.readFileSync(path.join(root, 'js', 'phantom_shop.js'), 'utf8');

for (const id of ['CADENZA', 'RHYTHM', 'REPRISE', 'STACCATO', 'OSTINATO']) {
  if (!game.includes(`'${id}'`)) throw new Error(`${id} is missing from secret SCORE result routing`);
}
if (!game.includes("stage.kicker === 'PHANTOM SCORE'")) throw new Error('PHANTOM SCORE result routing is missing');
if (!game.includes("copy: '盗んだ旋律は、隠し音ゲーで演奏できる。'")) throw new Error('secret music result copy is missing');
if (!game.includes("scoreId = isD4 ? 'staccato' : 'ostinato'")) throw new Error('D4/D5 SCORE split is missing');
if (!shop.includes("scoreId: 'rhythm'")) throw new Error('RHYTHM track unlock is missing');
if (!shop.includes("audio: '音楽系/隠し音ゲー/道化師の楽園.mp3'")) throw new Error('RHYTHM audio mapping is missing');
if (!shop.includes("scoreId: 'reprise'")) throw new Error('REPRISE track unlock is missing');
if (!shop.includes("audio: '音楽系/隠し音ゲー/赤狐の怪盗.mp3'")) throw new Error('REPRISE audio mapping is missing');
if (!shop.includes("scoreId: 'staccato'")) throw new Error('STACCATO track unlock is missing');
if (!shop.includes("audio: '音楽系/隠し音ゲー/Qの予告状-Phantom Letter Q-.mp3'")) throw new Error('STACCATO audio mapping is missing');
const rhythm = fs.readFileSync(path.join(root, 'js', 'kazu_minigame.js'), 'utf8');
for (const itemId of ['arcanaMagic', 'arcanaGale', 'arcanaGuard', 'arcanaLuck', 'arcanaDext']) {
  if (!rhythm.includes(`itemId: '${itemId}'`)) throw new Error(`${itemId} S-rank reward is missing`);
}
if (!rhythm.includes("accuracy >= 95 ? 'S'")) throw new Error('S-E rank thresholds are missing');
if (!rhythm.includes('kazuRhythmSRewards')) throw new Error('first-clear S reward guard is missing');

console.log('secret music score regression: ok');
