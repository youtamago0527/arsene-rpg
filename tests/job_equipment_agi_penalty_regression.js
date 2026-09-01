const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const root = `${__dirname}/..`;
const context = { window: {} };
context.window.window = context.window;
vm.runInNewContext(fs.readFileSync(`${root}/js/data.js`, 'utf8'), context);

const jobs = context.window.ARSENE_DATA.jobs;
const martial = jobs.martialArtist.traits.equipmentAgiPenalty;
const dual = jobs.dualBlade.traits.equipmentAgiPenalty;

assert.strictEqual(martial.weaponPercent, 10, '武道家は武器装備でAGIが10%低下する');
assert.strictEqual(martial.armorPerSlotPercent, 2, '武道家は防具1枠につきAGIが2%低下する');
assert.strictEqual(martial.maxPercent, 20, '武道家の装備AGI低下は20%を上限とする');
assert.strictEqual(dual.weaponPercent, 0, '双刃士は二刀でAGIが低下しない');
assert.strictEqual(dual.armorPerSlotPercent, 5, '双刃士は防具1枠につきAGIが5%低下する');
assert(dual.armorPerSlotPercent > martial.armorPerSlotPercent, '双刃士の防具ペナルティは武道家より重い');

const game = fs.readFileSync(`${root}/js/game.js`, 'utf8');
assert(/jobEquipmentAgiPenaltyRate\(equipment = this\.profile\?\.equipment/.test(game), '装備プレビューを含め、指定された装備からJOBペナルティを計算する');
assert(/shieldAgiPenaltyRate\(equipment\) \+ this\.jobEquipmentAgiPenaltyRate\(equipment\)/.test(game), '盾とJOBのAGI低下を戦闘能力へ反映する');

console.log('job equipment AGI penalty regression: ok');
