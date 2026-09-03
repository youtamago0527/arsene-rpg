const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'js', 'release_content.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');

for (const file of ['D4中ボス第一形態.mp3', 'D4中ボス第二形態.mp3']) {
  if (!fs.existsSync(path.join(root, '音楽系', '戦闘用', file))) throw new Error(`${file} is missing`);
  if (!content.includes(`音楽系/戦闘用/${file}`)) throw new Error(`${file} is not registered`);
}

if (!game.includes("this.playBossMusic('d4MidBoss', 2)")) throw new Error('form 2 music switch is missing');
if (!game.includes('enemy?.form2?.music || enemy?.music')) throw new Error('form-aware boss music resolver is missing');
if (!game.includes('this.enemies?.[0]?.form || 1')) throw new Error('revive does not restore the active boss form music');

console.log('d4 midboss music regression: ok');
