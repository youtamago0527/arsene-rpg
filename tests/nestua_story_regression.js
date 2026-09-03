const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');
const data = fs.readFileSync(path.join(root, 'js', 'release_content.js'), 'utf8');

if (!data.includes("name: 'NESTUA', nameEn: 'NESTUA', title: '《ネストゥア》'")) throw new Error('NESTUA formal name is missing');
for (const line of ['当たり前じゃないなんて', '戦い続けなきゃならないのですか', '助けてくれ――！']) {
  if (!game.includes(line)) throw new Error(`phase 2 clear dialogue missing: ${line}`);
}
for (const line of ['……もう、戦わなくていいんだな。', '人の傷と記憶を使って異形を作っている', 'この先にも――まだいる。']) {
  if (!game.includes(line)) throw new Error(`phase 3 clear dialogue missing: ${line}`);
}
if (game.includes("{ who: '主人公'")) throw new Error('protagonist dialogue must not be added');
if (!game.includes('nestuaPhase3SceneSeen') || !game.includes('nestuaIdentityRevealed')) throw new Error('first-clear story flags are missing');
if (!game.includes("if (this.battleMode === 'd5MidBoss')")) throw new Error('NESTUA final-clear scene is not separated');
for (const skill of ['Mr.エリック', 'ナッシング', 'T.クライム', '5月の残響', '悪徳の美学', "What's Are You Doing?"]) {
  if (!game.includes(skill)) throw new Error(`NESTUA skill missing: ${skill}`);
}
if (!game.includes('(enemy.phaseTurn - 3) % 4 === 0')) throw new Error("What's 3/7/11 turn cycle is missing");
if (!game.includes('guarded ? 250 : 500')) throw new Error("What's fixed guard damage is incorrect");
if (!game.includes('const actions = phase === 3 ? 2 : 1')) throw new Error('phase 3 double action is missing');
if (!game.includes('enemy.regenTurns = 3') || !game.includes('enemy.stats.maxHp * .04')) throw new Error('three-turn 4% regeneration is missing');
if (!game.includes("if (enemy.id === 'd5MidBoss') { await this.bossAttackNestua(enemy); return; }")) throw new Error('NESTUA AI is not connected');

console.log('nestua story regression: ok');
