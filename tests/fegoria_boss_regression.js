const assert = require('node:assert/strict');

global.window = global;
global.document = { addEventListener() {}, getElementById() { return null; }, querySelector() { return null; }, fonts: null };
global.addEventListener = () => {};
require('../js/data.js');
require('../js/future_data.js');
require('../js/release_content.js');
require('../js/equipment_progression.js');
require('../js/game.js');

const D = global.ARSENE_DATA;
const proto = global.BattleGame.prototype;
const template = D.enemies.d4MidBoss;
const runtime = (form = 1) => ({ ...template, stats: { ...(form === 2 ? template.form2.stats : template.stats) }, hp: (form === 2 ? template.form2.stats : template.stats).maxHp, alive: true, form, sparklerPhase: 0, hideUntil: 0, despairTurns: 0, despairStep: 0, hasUsedDespairDays: false });
const harness = () => {
  const game = Object.create(proto);
  game.turn = 10; game.player = { hp: 100, stats: { str: 100, vit: 100, mag: 100, mnd: 100, agi: 100, dex: 100 }, buffs: {} };
  game.calls = [];
  game.fegoriaGarakuta = async () => game.calls.push('garakuta');
  game.fegoriaSparkler = async enemy => { game.calls.push(`sparkler:${enemy.sparklerPhase}`); enemy.sparklerPhase = enemy.sparklerPhase >= 3 ? 0 : enemy.sparklerPhase + 1; };
  game.fegoriaHideAndSeek = async () => game.calls.push('hide');
  game.fegoriaDespairDays = async enemy => { game.calls.push('despairDays'); enemy.hasUsedDespairDays = true; };
  game.setLog = text => game.calls.push(`log:${text}`); game.floating = () => {}; game.updateHUD = () => {}; game.battleSleep = async () => {};
  return game;
};

assert.deepEqual(template.ai.map(action => action.id), ['garakuta', 'sparkler']);
assert.equal(template.secondFormPending, false);
assert.equal(template.form2.sprite, template.secondFormSprite);
assert.equal(template.specialAttacks.hideAndSeek.evasionRate, .60);
assert.equal(template.specialAttacks.despairDays.threshold, .30);

(async () => {
  const oldRandom = Math.random;
  try {
    let game = harness(), enemy = runtime(1); Math.random = () => 0; await game.bossAttackFegoria(enemy);
    assert.deepEqual(game.calls, ['garakuta'], 'first form must use only Garakuta or Sparkler');

    game = harness(); enemy = runtime(1); Math.random = () => .99; await game.bossAttackFegoria(enemy);
    assert.equal(game.calls[0], 'sparkler:1');

    game = harness(); enemy = runtime(2); enemy.sparklerPhase = 2; enemy.hp = enemy.stats.maxHp * .2; await game.bossAttackFegoria(enemy);
    assert.equal(game.calls[0], 'sparkler:2', 'Sparkler sequence must finish before Despair Days');

    game = harness(); enemy = runtime(2); enemy.hp = enemy.stats.maxHp * .3; await game.bossAttackFegoria(enemy);
    assert.equal(game.calls[0], 'despairDays');
    game.calls.length = 0; await game.bossAttackFegoria(enemy);
    assert.notEqual(game.calls[0], 'despairDays', 'Despair Days must not repeat');

    game = harness(); enemy = runtime(2); enemy.despairTurns = 3;
    await game.bossAttackFegoria(enemy); await game.bossAttackFegoria(enemy); await game.bossAttackFegoria(enemy);
    assert.deepEqual(game.calls.filter(call => call.startsWith('log:')), [
      'log:フェゴリアは絶望の中に沈んでいる……。', 'log:詩は、もう続かない。', 'log:……それでも、まだ終われない。'
    ]);
    assert.equal(enemy.despairTurns, 0);

    game = harness(); game.battleMode = 'd4MidBoss';
    assert.equal(game.isPendingBossTransform(runtime(1)), true);
    assert.equal(game.isPendingBossTransform(runtime(2)), false);

    game = harness(); enemy = runtime(2); enemy.hideUntil = game.turn;
    game.playerCombatStats = () => ({ str: 100, vit: 100, mag: 100, mnd: 100, agi: 100, dex: 100, luk: 0 });
    game.equippedWeapon = () => ({ weaponType: 'sword' }); game.equippedWeaponType = () => 'sword'; game.activePassiveByType = () => null; game.criticalChanceFor = () => 0;
    Math.random = () => .5;
    const hiddenOutcome = game.rollPlayerAttackOutcome({ id: 'attack', weaponType: 'sword' }, enemy);
    assert.equal(hiddenOutcome.hit, false, 'Hide and Seek must materially reduce hit chance for normal attacks');
    assert(hiddenOutcome.hitChance <= .4);
  } finally { Math.random = oldRandom; }
  console.log('Fegoria boss regression passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
