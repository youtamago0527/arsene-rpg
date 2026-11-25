const assert = require('node:assert/strict');

global.window = global;
global.addEventListener = () => {};
const saves = new Map();
global.localStorage = {
  getItem: key => saves.get(key) ?? null,
  setItem: (key, value) => saves.set(key, value)
};
for (const name of ['data', 'future_data', 'release_content', 'game']) require('../js/' + name + '.js');

const g = Object.create(BattleGame.prototype);
const steps = [
  [null, null, 20], ['seripes', 'dungeon3Clear', 40], ['astact', 'dungeon4Clear', 60],
  ['ostina', 'dungeon5Clear', 80], ['chromatia', 'dungeon6Clear', 100]
];
for (const [boss, flag, cap] of steps) {
  for (const legacy of ['boss', 'flag']) {
    const profile = g.freshProfile();
    if (boss && legacy === 'boss') profile.bossDefeated[boss] = true;
    if (flag && legacy === 'flag') profile.flags[flag] = true;
    const jobId = profile.currentJob;
    profile.jobs[jobId].level = cap - 1;
    localStorage.setItem(ARSENE_DATA.settings.saveKey, JSON.stringify(profile));
    g.profile = g.loadProfile();
    assert.equal(g.effectiveJobLevelCap(), cap);
    assert.equal(g.profile.jobs[jobId].level, cap - 1);
    const cost = g.jobExpNeeded(cap - 1);
    assert.ok(cost > 0);
    g.grantJobExp(cost * 4);
    assert.equal(g.profile.jobs[jobId].level, cap);
    assert.equal(g.jobExpNeeded(cap), null);
    g.grantJobExp(1000);
    assert.equal(g.profile.jobs[jobId].exp, 0);
  }
}
g.profile.flags.rebirthUnlocked = true;
g.arcanaCount = () => 1;
g.profile.jobs[g.profile.currentJob].level = 20;
assert.equal(g.canRebirth(g.profile.currentJob).ok, true);
for (let lv = 20; lv < 99; lv++) assert.ok(g.jobExpNeeded(lv + 1) > g.jobExpNeeded(lv));
for (const [boss, level] of [['astact', 40], ['ostina', 60], ['ostina', 70], ['chromatia', 80]]) {
  g.profile = g.freshProfile();
  const job = g.profile.jobs[g.profile.currentJob];
  job.level = level;
  g.markBossDefeated(boss);
  g.grantJobExp(g.jobExpNeeded(level) * 4);
  assert.equal(job.level, level + 1);
}
// A table-based JOB must keep gaining its own stats above Lv40, including after rebirth.
g.profile.jobs.dualBlade = { level: 40, exp: 0 };
const before = g.activeJobBonuses('dualBlade');
g.profile.jobs.dualBlade.level = 60;
const after = g.activeJobBonuses('dualBlade');
assert.ok(Object.keys(after).some(key => after[key] > (before[key] || 0)));
console.log('JOB cap progression: 20/40/60/80/100, old saves, JEXP and rebirth OK');
