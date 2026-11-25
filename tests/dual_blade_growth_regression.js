const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ window: {}, addEventListener() {} });
for (const file of ['js/data.js', 'js/game.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const game = Object.create(context.window.BattleGame.prototype);
const data = context.window.ARSENE_DATA;
const job = 'dualBlade';
game.profile = { currentJob: job, jobs: { [job]: { level: 1 } }, jobRebirths: {} };
const growth = data.jobs[job].growth;
const sum = (count) => Object.entries(growth)
  .filter(([level]) => Number(level) <= count)
  .reduce((total, [, stats]) => total + (stats.str || 0), 0);
const first20 = sum(20);
for (const cycles of [0, 1, 3]) {
  game.profile.jobRebirths[job] = cycles;
  for (const [level, expected] of [
    [20, first20], [40, first20 * 3], [41, first20 * 3 + 2 * sum(1)],
    [60, first20 * 5], [70, first20 * 5 + 2 * sum(10)]
  ]) {
    game.profile.jobs[job].level = level;
    assert.equal(game.activeJobBonuses().str, Math.floor(expected * game.rebirthGrowthMultiplier(job)),
      `dualBlade STR at level ${level}, rebirth ${cycles}`);
  }
}
console.log('dual blade growth regression: ok');
