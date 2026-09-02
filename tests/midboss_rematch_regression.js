const fs = require('fs');
const assert = require('assert');

const game = fs.readFileSync(`${__dirname}/../js/game.js`, 'utf8');

assert.match(game, /rematch = cleared \? this\.rematchProgress\(enemyId\) : null/, '全ダンジョンの中ボスへ再戦進捗を付ける');
assert.match(game, /再戦まであと \$\{rm\.need - rm\.done\} 戦/, '中ボスの残り通常戦数を表示する');
assert.match(game, /noteBossRematchSnapshot\('versicrell'\)/, 'D3中ボス撃破時に5戦カウントを開始する');
assert.match(game, /some\(dungeon => dungeon\.midBossId === this\.battleMode\)/, 'D5以降もmidBossIdから中ボス勝利を共通判定する');
assert.match(game, /this\.noteBossRematchSnapshot\(this\.battleMode\)/, 'D4・D5以降の中ボス撃破時に5戦カウントを開始する');
assert(!/key === 'versicrell'\) \{ if \(this\.isBossDefeated\('versicrell'\)\) return;/.test(game), 'D3中ボスの再戦開始を初回撃破フラグだけで拒否しない');

console.log('midboss rematch regression: ok');
