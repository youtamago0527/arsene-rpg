const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const root = `${__dirname}/..`;
const context = { window: {} };
context.window.window = context.window;
vm.runInNewContext(fs.readFileSync(`${root}/js/data.js`, 'utf8'), context);

const D = context.window.ARSENE_DATA;
const job = D.jobs.martialArtist;
assert.strictEqual(job.signatureSkillId, 'gatheringQi', '武道家MASTERの盗得技は集気法');
assert.deepStrictEqual(Object.values(job.skillUnlocks), ['burstFist', 'stunningPalm', 'shortPower', 'tigerBreakFist'], '現行素手攻撃ツリーを接続する');

for (const id of Object.values(job.skillUnlocks)) {
  assert.strictEqual(D.skills[id].requiresBareFists, true, `${id}は素手専用`);
}
assert.strictEqual(D.skills.stunningPalm.power, 1.1, '震撃は1.1倍');
assert.strictEqual(D.skills.shortPower.ignoreDef, .50, '短勁は防御50%貫通');
assert.strictEqual(D.skills.tigerBreakFist.effect.maxStacks, 5, '猛虎破砕拳はSTRを5段階蓄積');
assert.strictEqual(D.skills.gatheringQi.effect.spiritScaling, 1.8, '集気法は精神依存回復');
assert.strictEqual(D.skills.thousandHandKannon.devOnly, true, '千手観音は非公開予約');
assert.strictEqual(D.skills.dragonGodBlazingFist.devOnly, true, '龍神烈火拳は非公開予約');

const game = fs.readFileSync(`${root}/js/game.js`, 'utf8');
assert(/skill\?\.requiresBareFists && !this\.usesBareFists\(\)/.test(game), '装備中は素手技を使用不可にする');
assert(/bareRightHand = slotId === 'rightHand' && this\.jobHasTrait\('bareFists'\)/.test(game), '武道家は右手武器を外せる');
assert(/martialStrStacks/.test(game), '戦闘中STR蓄積を戦闘能力へ反映する');

console.log('martial bare-fist tree regression: ok');
