const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const root = `${__dirname}/..`;
const context = { window: {} };
context.window.window = context.window;
vm.runInNewContext(fs.readFileSync(`${root}/js/data.js`, 'utf8'), context);

const D = context.window.ARSENE_DATA;
const job = D.jobs.martialArtist;
assert.strictEqual(job.signatureSkillId, 'burstFist', '武道家の固有技はばくれつけん');
assert.deepStrictEqual(Object.values(job.skillUnlocks), ['burstFist'], '武道家のJOB技は固有技ばくれつけんだけ');
assert.strictEqual(D.skills.burstFist.weaponIndependent, undefined, 'ばくれつけんは装備条件を無視しない');
assert.strictEqual(D.skills.burstFist.requiresBareFists, true, 'ばくれつけんは素手専用');
for (const id of ['stunningPalm', 'shortPower', 'tigerBreakFist']) {
  assert.strictEqual(D.skills[id].source, 'weapon', `${id}は体術武器学技`);
  assert.strictEqual(D.skills[id].weaponType, 'martial', `${id}は体術へ所属`);
  assert.strictEqual(D.skills[id].requiresBareFists, true, `${id}は素手専用`);
}
assert.strictEqual(D.skills.stunningPalm.power, 1.1, '震撃は1.1倍');
assert.strictEqual(D.skills.shortPower.ignoreDef, .50, '短勁は防御50%貫通');
assert.strictEqual(D.skills.tigerBreakFist.effect.maxStacks, 5, '猛虎破砕拳はSTRを5段階蓄積');
assert.strictEqual(D.skills.gatheringQi.effect.spiritScaling, 1.8, '集気法は精神依存回復');
assert.strictEqual(D.skills.gatheringQi.source, 'weapon', '集気法はMASTER報酬ではなく武器学技');
assert.strictEqual(D.skills.gatheringQi.weaponType, 'martial', '集気法は体術武器学へ所属する');
assert.strictEqual(D.skills.gatheringQi.requiresBareFists, true, '集気法は素手専用');
assert.strictEqual(D.skills.thousandHandKannon.devOnly, true, '千手観音は非公開予約');
assert.strictEqual(D.skills.dragonGodBlazingFist.devOnly, true, '龍神烈火拳は非公開予約');

const game = fs.readFileSync(`${root}/js/game.js`, 'utf8');
assert(/skill\?\.requiresBareFists && !this\.usesBareFists\(\)/.test(game), '装備中は素手技を使用不可にする');
assert(/skill\?\.weaponIndependent\) return true/.test(game), '装備不問技は武器条件より優先する');
assert(/canUseBareFists\(jobId = this\.profile\.currentJob/.test(game), '武道家とPHANTOM THIEFの素手適性を判定する');
assert(/jobId === 'phantomThief'/.test(game), 'PHANTOM THIEFも体術選択時は素手になれる');
assert(/martialStrStacks/.test(game), '戦闘中STR蓄積を戦闘能力へ反映する');

console.log('martial bare-fist tree regression: ok');

context.addEventListener = () => {}; context.document = {};
vm.runInNewContext(fs.readFileSync(`${root}/js/game.js`, 'utf8'), context);
const actor = Object.create(context.window.BattleGame.prototype);
let type = 'martial', bare = false;
actor.equippedWeaponType = () => type;
actor.equippedWeapon = () => ({ weaponType: type });
actor.usesBareFists = () => bare;
for (const id of ['stunningPalm', 'gatheringQi', 'shortPower', 'burstFist']) {
  assert.strictEqual(D.skills[id].requiresBareFists, true);
  type = 'martial'; bare = false;
  assert.strictEqual(actor.skillEquipmentReady(D.skills[id]), false, `${id}: claws rejected`);
  bare = true;
  assert(actor.skillEquipmentReady(D.skills[id]), `${id}: bare fists allowed`);
  for (const other of ['sword', 'staff', 'instrument', 'shield']) {
    type = other; bare = false;
    assert.strictEqual(actor.skillEquipmentReady(D.skills[id]), false, `${id}: ${other} rejected`);
  }
}
// Every starting JOB wins over every weapon-major choice and character default.
vm.runInNewContext(fs.readFileSync(`${root}/js/equipment_progression.js`, 'utf8'), context);
actor.weaponTypeList = () => D.weaponTypes;
actor.characterList = [{ id: 'sora', baseStats: { maxHp: 100, maxMp: 50 } }];
for (const jobId of D.startingJobIds) for (const major of ['sword', 'staff', 'martial']) {
  const profile = actor.freshProfile(); profile.selectedCharacter = 'sora';
  actor.applyStartingChoice(profile, major, jobId); actor.profile = profile;
  const expectedType = jobId === 'warrior' ? 'sword' : 'staff';
  const expected = jobId === 'martialArtist' ? null : D.weaponTypes.find(t => t.id === expectedType).starterWeaponId;
  assert.strictEqual(profile.equipment.rightHand, expected, `${jobId}/${major}: JOB determines initial equipment`);
  assert.strictEqual(profile.equipment.leftHand, null);
  const equipment = Object.keys(profile.inventory).filter(id => D.items[id]?.category === 'equipment');
  assert.deepStrictEqual(equipment, expected ? [expected] : [], 'no extra default staff or claw');
  assert.strictEqual(profile.inventory.potion, 3, 'consumables preserved');
  assert.strictEqual(profile.preferredWeaponType, major, 'major choice preserved');
  if (jobId === 'martialArtist') {
    delete actor.usesBareFists;
    assert(actor.usesBareFists(), 'martial artist really starts bare handed');
    assert(actor.skillEquipmentReady(D.skills.burstFist), 'signature usable from start');
  }
}
console.log('bare fist skills and JOB starting equipment: ok');
