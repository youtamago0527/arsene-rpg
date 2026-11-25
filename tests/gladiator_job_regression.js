const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ window: {}, addEventListener() {} });
for (const file of ['js/data.js', 'js/game.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const game = Object.create(context.window.BattleGame.prototype);
const data = context.window.ARSENE_DATA;
game.profile = game.freshProfile();
game.profile.jobs.warrior.level = 40;
assert.equal(game.checkGladiatorUnlock(), false);
game.profile.jobs.warrior.level = 1;
game.profile.jobs.martialArtist.level = 40;
assert.equal(game.checkGladiatorUnlock(), true);
assert.equal(game.checkGladiatorUnlock(), false);
game.profile.currentJob = 'gladiator';
game.profile.jobMastered = ['warrior'];
assert.equal(game.passiveSlotCount(), 2);
for (const parent of data.jobs.gladiator.parentJobs) {
  assert(game.jobLearnedActiveSkills('gladiator').some(skill => skill.id === data.jobs[parent].signatureSkillId));
}
const choices = game.selectablePassives();
assert(choices.every(s => data.jobs.gladiator.parentJobs.includes(s.jobId)));
const first = choices.find(s => s.jobId === 'warrior');
const second = choices.find(s => s.jobId === 'martialArtist');
game.profile.gladiatorPassiveSlots = [first.id, second.id];
assert.equal(game.activePassives().length, 2);
assert(game.activePassives().some(s => s.id === first.id));
assert(game.activePassives().some(s => s.id === second.id));
const stats = { str: 20, agi: 100, mag: 20 };
assert.equal(game.attackPowerFor('sword', stats, {}), 50);
assert.equal(game.attackPowerFor('martial', stats, {}), 90);
assert.equal(game.attackPowerFor('staff', stats, {}), 20);
game.profile.currentJob = 'warrior';
assert.equal(game.passiveSlotCount(), 1);
assert.equal(game.equippedPassiveList().length, 0);
assert.equal(game.attackPowerFor('sword', stats, {}), 20);
console.log('Gladiator job regression passed');
