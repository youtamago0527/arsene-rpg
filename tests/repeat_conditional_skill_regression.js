const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js/game.js'), 'utf8').replace(/\r\n/g, '\n');
const repeatBody = source.match(/    repeatLastBattleAction\(\) \{([\s\S]*?)\n    \}\n    async tryEscape/)?.[1];
const buffBody = source.match(/    skillBuffReady\(skill\) \{([^\n]*)\}/)?.[1];
assert.ok(repeatBody && buffBody, '戦闘スキルの再行動処理を取得できる');
assert.match(source, /async executeRound\(skillId, targetIndex\)[\s\S]*?if \(!this\.skillBuffReady\(skill\)\)/, '直接実行経路もバフ条件を再確認する');

const skills = {
  sforzando: { id: 'sforzando', name: 'スフォルツァンド', requiresBuff: 'atkUp', target: 'all' },
  attack: { id: 'attack', name: '通常攻撃', target: 'single' }
};
const repeat = new Function('D', `return function () {${repeatBody}\n}`)({ skills });
const buffReady = new Function('return function (skill) {' + buffBody + '}')();
const game = {
  locked: false, finished: false, turn: 3,
  player: { buffs: { songBuffs: { atkUp: [2] } } },
  enemies: [{ alive: true }],
  lastBattleAction: { type: 'skill', skillId: 'sforzando', targetIndex: -1 },
  cooldownRemaining: () => 0,
  canPaySkillCosts: () => true,
  skillEquipmentReady: () => true,
  skillBuffReady: buffReady,
  setLog(message) { this.message = message; },
  executeRound(skillId, targetIndex) { this.executed = { skillId, targetIndex }; }
};

repeat.call(game);
assert.equal(game.executed, undefined, 'バフが切れた限定技は再行動で発動しない');
assert.match(game.message, /再実行できない/);

game.player.buffs.songBuffs.atkUp = [3];
repeat.call(game);
assert.deepEqual(game.executed, { skillId: 'sforzando', targetIndex: -1 }, '有効なバフがあれば再行動できる');

game.executed = undefined;
game.lastBattleAction = { type: 'skill', skillId: 'attack', targetIndex: 0 };
game.player.buffs.songBuffs.atkUp = [];
repeat.call(game);
assert.deepEqual(game.executed, { skillId: 'attack', targetIndex: 0 }, '通常技の再行動は影響を受けない');

console.log('repeat conditional skill regression: OK');
