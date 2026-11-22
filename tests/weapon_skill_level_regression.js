const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { window: {}, document: {}, addEventListener() {} };
vm.createContext(context);
for (const file of ['data.js', 'game.js']) {
  const source = fs.readFileSync(path.join(__dirname, '../js', file), 'utf8');
  vm.runInContext(source, context, { filename: file });
}

const { BattleGame, ARSENE_DATA: data } = context.window;
const game = Object.create(BattleGame.prototype);
const skill = data.skills.doubleSlash;
const strongEnemy = { sparkLevel: 45, alive: true, stats: { def: 30 } };
let saved;
game.profile = {
  currentJob: 'warrior',
  equipment: {},
  weaponMastery: { sword: { level: 50, exp: 0 } },
  learnedWeaponSkills: Object.values(data.skills).filter(row => row.source === 'weapon').map(row => row.id)
};
game.saveProfile = () => { saved = JSON.stringify(game.profile); };
game.equippedWeapon = () => ({ weaponType: 'sword' });
game.passiveEffectRate = game.equipmentEffectRate = game.comboDanceDamageRate = () => 0;
game.elementWeaknessRate = () => 1;
game.playerCombatStats = () => ({ maxHp: 100, agi: 0 });
game.attackPowerFor = () => 100;
game.player = { hp: 100, buffs: {} };
game.enemies = [strongEnemy];
game.turn = 1;
data.combatBalance.playerVariance = { min: 0, max: 0 };

const damage = (entry = skill) => game.damageFor(entry, strongEnemy, { critical: false }).value;
const damageAtLevel = level => {
  const levels = game.profile.weaponSkillLevels;
  game.profile.weaponSkillLevels = { [skill.id]: level };
  const hit = damage();
  game.profile.weaponSkillLevels = levels;
  return hit;
};
const setRandom = value => vm.runInContext(`Math.random = () => ${value}`, context);
const mastery = level => { game.profile.weaponMastery.sword.level = level; };
const rollSkill = () => game.rollSpark(skill.id, strongEnemy);

async function verify() {
  setRandom(0);
  assert.equal(rollSkill(), null, '武器学50では強化抽選しない');
  mastery(51);
  setRandom(.02);
  assert.equal(game.rollSpark(skill.id, { sparkLevel: 1 }), null, '弱い敵では同じ乱数で落選する');
  setRandom(.99);
  assert.equal(rollSkill(), null, '強敵でも抽選は確定ではない');

  setRandom(.02);
  game.grantWeaponActionExp = () => {};
  const casts = [];
  game.sparkPresentation = async entry => { assert.match(entry.name, /Lv2$/); };
  game.playerAction = async (entry, target) => { casts.push({ id: entry.id, mp: entry.mp, hit: damage(entry), target }); };
  await game.playerActionWithSpark(skill, 0);
  assert.deepEqual(casts, [{ id: skill.id, mp: skill.mp, hit: damageAtLevel(2), target: 0 }], '閃いた同じ一撃からLv2倍率を適用');
  assert.equal(game.weaponSkillLevelRule(skill).multiplier, 1.2);
  game.profile = JSON.parse(saved);
  assert.equal(game.weaponSkillLevelRule(skill).level, 2);

  setRandom(0);
  mastery(99);
  assert.equal(rollSkill(), null);
  mastery(100);
  game.profile.currentJob = 'phantomThief';
  assert.equal(rollSkill(), null, '武器学が成長しないJOBは強化を閃かない');
  game.profile.currentJob = 'warrior';
  assert.equal(rollSkill().weaponSkillUpgrade, 3, 'Lv100からLv2の技がLv3になる');
  assert.equal(game.weaponSkillLevelRule(skill).multiplier, 1.3, 'Lv2倍率と重複させない');
  const masteryAdjusted = (100 * skill.power - strongEnemy.stats.def) * 1.5;
  assert.equal(damage(), Math.round(masteryAdjusted * 1.3));
  assert.equal(damageAtLevel(2), Math.round(masteryAdjusted * 1.2));
  assert.ok(damage() > damageAtLevel(2));
  assert.equal(rollSkill(), null, '技Lv3が上限');
  assert.equal(game.weaponSkillLevelRule(data.skills.gatheringQi), null, '自己回復技は威力強化対象外');
  game.unlockedWeaponTypes = () => [{ id: 'sword', name: '剣学' }];
  game.equipTabsHtml = () => '';
  game.artsOpenId = skill.id;
  const panel = {};
  game.renderWeaponArtsPanel(panel);
  assert.ok(panel.innerHTML.includes(`${skill.name} Lv3`));
  assert.ok(panel.innerHTML.includes('Lv1比 ×1.3'));

  game.profile.weaponSkillLevels = {};
  assert.equal(rollSkill().weaponSkillUpgrade, 2, '武器学100でも1回の抽選では1段階だけ');
  const missing = data.skills.tripleSlash;
  game.profile.learnedWeaponSkills = game.profile.learnedWeaponSkills.filter(id => id !== missing.id);
  assert.equal(rollSkill().id, missing.id, '既存の新技の閃きが優先される');
  assert.equal(game.weaponSkillLevelRule(skill).level, 2);
  console.log('weapon skill level regression: OK');
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
