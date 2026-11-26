const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {test} = require('node:test');

const data = {
  items:{}, weapons:{}, armors:{}, accessories:{}, skills:{},
  infiniteScore:{bagLimit:30, rarity:{}, opLabels:{}, opRanks:{}}
};
const battleElement = {classList:{add(){}, remove(){}}};
const document = {addEventListener(){}, querySelector(selector){return ['#ren','#phase-label'].includes(selector) ? battleElement : null;}, getElementById(){return battleElement;}};
const context = {window:{ARSENE_DATA:data}, document, addEventListener(){}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/game.js','utf8'), context);
const Game = context.window.BattleGame;
// Supply fixed base stats while retaining the real battle and workshop methods.
Game.prototype.totalStats = () => ({maxHp:500, maxMp:100, str:100, vit:80});
for (const name of ['infinite_score', 'infinite_relics', 'otherworld_gear']) {
  vm.runInContext(fs.readFileSync('js/' + name + '.js','utf8'), context);
}

function fixture() {
  const g = Object.create(Game.prototype);
  g.profile = {equipment:{}, infiniteScore:{active:true, floor:150, equipment:{}, lootBag:[]}};
  g.player = {hp:400, mp:10, stats:{maxHp:500, maxMp:100}, buffs:{}};
  g.battleMode = 'infiniteScore';
  g.turn = 1;
  let seed = 27;
  g.isRand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  g.isApplyRelicStats = g.persistVitals = g.updateHUD = () => {};
  g.isLog = g.isSave = g.isRenderWorkshop = () => {};
  return g;
}

function gear(g, id, ops) {
  const item = g.isGenerateGear({stars:5, part:{id}});
  if (ops) item.ops = Object.entries(ops).map(([key,value]) => ({key, rank:1, value}));
  g.isRun().lootBag.push(item);
  return item;
}

test('weapon, gauntlet, shield, armor and accessory rolls use the correct distinct OP pools', () => {
  const g = fixture();
  assert.ok(data.otherWorldGearOps.length >= 70);
  const allowed = {sword:'attack', arms:'attack', shield:'support', body:'support'};
  for (const [part,family] of Object.entries(allowed)) {
    const pool = new Set();
    for (let i=0;i<100;i++) {
      const roll = g.isGenerateGear({stars:6, part:{id:part}}).ops;
      assert.equal(new Set(roll.map(op => op.key)).size, roll.length);
      for (const op of roll) {
        assert.equal(g.owgOpDefinition(op.key).family, family);
        pool.add(op.key);
      }
    }
    assert.ok(pool.size >= 25);
  }
  const accessoryFamilies = new Set();
  for (let i=0;i<100;i++) {
    const roll = g.isGenerateGear({stars:6, part:{id:'accessory'}}).ops;
    for (const op of roll) accessoryFamilies.add(g.owgOpDefinition(op.key).family);
  }
  assert.deepEqual([...accessoryFamilies].sort(), ['accessory','attack','support']);
  assert.equal(data.otherWorldGearOps.some(op => /弱点/.test(op.label)), false);
  assert.ok(g.owgOpDefinition('hpDrain').weight < g.owgOpDefinition('attackPower').weight);
  assert.ok(g.owgOpDefinition('mpRestoreOnDamage').weight < g.owgOpDefinition('defensePower').weight);
});

test('eight accessory profiles are registered at all four tiers and boost equipped stats', () => {
  const g = fixture();
  const archetypes = ['life','mana','might','sorcery','guard','haste','fortune','harmony'];
  for (const stars of [3,4,5,6]) for (const variant of archetypes) {
    const x = g.isGenerateGear({stars, part:{id:'accessory_' + variant}});
    assert.match(x.itemId, new RegExp('_accessory_' + variant + '$'));
    assert.equal(data.items[x.itemId].slot, 'accessory');
    assert.ok(Object.values(data.armors[x.itemId].bonuses).every(value => value > 0));
  }
  const life = gear(g, 'accessory_life', {maxHpRate:.25, strRate:.25});
  life.quality = 100;
  g.isRun().equipment.accessory = life.uid;
  const stats = g.totalStats();
  assert.equal(stats.maxHp, Math.round((500 + data.armors[life.itemId].bonuses.maxHp) * 1.25));
  assert.equal(stats.str, 125);
});

test('forge filters each donor OP and consumes a donor only for a compatible transfer', async () => {
  const g = fixture();
  const sword = gear(g, 'sword', {hpDrain:.008});
  const accessory = gear(g, 'accessory_mana', {maxMpRate:.12, hpDrain:.02});
  const armor = gear(g, 'body', {maxHpRate:.18});
  g.isRun().lootBag.push({itemId:'otherworldShard',count:90},{itemId:'otherworldCore',count:2});
  const [donor] = g.isForgeSourcesForTarget(g.isForgeTransferSources(g.isRun().lootBag.filter(x => x.ops)), sword);
  assert.equal(donor.item.uid, accessory.uid);
  assert.deepEqual(Array.from(donor.options, ({op}) => op.key), ['hpDrain']);
  g.isForgeState();
  let confirmed = 0;
  g.isConfirm = async () => { confirmed++; return true; };
  await g.isForgeTransfer(accessory.uid,sword.uid,0);
  assert.equal(confirmed, 0);
  assert.equal(g.isBagEntry(accessory.uid),accessory);
  await g.isForgeTransfer(accessory.uid,sword.uid,1,null,'enhance');
  assert.ok(Math.abs(sword.ops[0].value - .018) < 1e-12);
  assert.equal(g.isBagEntry(accessory.uid),undefined);
  assert.equal(g.isBagEntry(armor.uid),armor);
});

test('sublimation handles new OPs and keeps values grown in the forge', () => {
  const g = fixture();
  const op = {key:'opFollowupDamage',rank:1,value:.5};
  g.isSublimeOp(op);
  assert.deepEqual(op,{key:'opFollowupDamage',rank:2,value:.5});
  const ordinary = {key:'maxHpRate',rank:1,value:.02};
  g.isSublimeOp(ordinary);
  assert.equal(ordinary.value,.04);
});

test('on-hit recovery, conditional damage and additional damage use the equipped OPs', () => {
  const g = fixture();
  const sword = gear(g, 'sword', {hpDrain:.02, healthyDamageBonus:.2, opFollowupDamage:2.4});
  const armor = gear(g, 'body', {mpRestoreOnDamage:.025, firstTurnGuard:.25, turnHpRegenRate:.03, turnMpRegenRate:.04});
  Object.assign(g.isRun().equipment,{rightHand:sword.uid,body:armor.uid});
  const enemy = {hp:100,stats:{maxHp:100}};
  assert.equal(g.owgDamageWithOps(100,{id:'attack',kind:'weapon'},enemy,false),408);
  g.owgRecoverFromDamageDealt(100);
  assert.equal(g.player.hp,402);
  g.activeSetEffects = () => ({});
  g.activePassives = () => [];
  g.passiveEffectRate = () => 0;
  g.equipmentEffectRate = () => 0;
  g.resonanceEnabled = () => false;
  assert.equal(g.receivePlayerDamage(160),120);
  assert.equal(g.player.mp,13);
  g.owgTurnRecovery();
  assert.equal(g.player.hp,297);
  assert.equal(g.player.mp,17);
});

test('reflection uses actual HP lost, targets the attacker, and grants a reflected kill once', async () => {
  const g = fixture();
  const shield = gear(g, 'shield', {damageReflect:.24});
  const charm = gear(g, 'accessory_guard', {damageReflect:.26});
  assert.equal(g.owgOpFitsItem('damageReflect', shield.itemId), true);
  assert.equal(g.owgOpFitsItem('damageReflect', charm.itemId), true);
  assert.equal(g.owgOpFitsItem('damageReflect', gear(g, 'arms').itemId), false);
  Object.assign(g.isRun().equipment,{leftHand:shield.uid,accessory:charm.uid});
  g.player.buffs.guardUntil = g.turn;
  g.player.buffs.guardReduction = .5;
  g.activeSetEffects = () => ({});
  g.activePassives = () => [];
  g.passiveEffectRate = g.equipmentEffectRate = () => 0;
  g.resonanceEnabled = () => false;
  g.enemyRawDamage = () => 100;
  g.battleSleep = async () => {};
  g.rollEnemyAttackOutcome = () => ({hit:true});
  g.audio = {sfx(){}};
  g.playerName = () => 'ソラ';
  g.rollDrops = () => [];
  data.combatBalance = {enemyVariance:{min:0,max:0}};
  const popups = [];
  g.floating = (_, text) => {popups.push(text);};
  const rewards = [];
  g.grantEnemyReward = enemy => {rewards.push(enemy); return {exp:1,gold:0};};
  let won = 0;
  g.victory = async () => {won++;};
  const enemy = hp => ({uid:'enemy', name:'敵', label:'', hp, alive:true, stats:{atk:1}, ai:[{name:'打撃', kind:'physical', weight:1}]});
  const attacker = enemy(50), bystander = enemy(20);
  g.enemies = [attacker,bystander];
  await g.enemyAttack(attacker);
  assert.equal(g.player.hp, 350);
  assert.equal(attacker.hp, 25);
  assert.equal(bystander.hp, 20);
  assert.ok(popups.includes('反射 25'));
  assert.equal(rewards.length, 0);

  await g.enemyOnlyTurn();
  assert.equal(won, 1);
  assert.deepEqual(rewards,[attacker,bystander]);
  assert.equal(attacker.alive, false);
  assert.equal(bystander.alive, false);

  const storyBoss = {...enemy(25),cannotDefeat:true};
  g.receivePlayerDamage(100,'magical',{attacker:storyBoss});
  assert.equal(storyBoss.hp, 1);
  g.receivePlayerDamage(100,'magical');
  const hazardousAttacker = enemy(25);
  g.player.hp = 10;
  g.receivePlayerDamage(100,'magical',{attacker:hazardousAttacker});
  assert.equal(g.player.hp, 0);
  assert.equal(hazardousAttacker.hp, 25);
  assert.equal(rewards.length, 2);
});

test('additional actions carry at 100% and roll only the remainder', () => {
  const g = fixture();
  const sword = gear(g, 'sword', {repeatChance:.5});
  const charm = gear(g, 'accessory_might', {repeatChance:0});
  Object.assign(g.isRun().equipment,{rightHand:sword.uid,accessory:charm.uid});
  const unexpectedDraw = () => {throw Error('guaranteed repeats must not draw');};
  assert.equal(g.owgExtraActionCount(() => .49),1);
  assert.equal(g.owgExtraActionCount(() => .50),0);
  charm.ops[0].value = .5;
  assert.equal(g.owgExtraActionCount(unexpectedDraw),1);
  charm.ops[0].value = 1;
  assert.equal(g.owgExtraActionCount(() => .49),2);
  assert.equal(g.owgExtraActionCount(() => .50),1);
  charm.ops[0].value = 1.5;
  assert.equal(g.owgExtraActionCount(unexpectedDraw),2);
  charm.ops[0].value = 1.75;
  assert.equal(g.owgExtraActionCount(() => .24),3);
  assert.equal(g.owgExtraActionCount(() => .25),2);
  charm.ops[0].value = .4999999999999999;
  assert.equal(g.owgExtraActionCount(unexpectedDraw),1);
});

test('one attack command repeats without paying MP again and stops when the last enemy falls', async () => {
  const g = fixture();
  const sword = gear(g, 'sword', {repeatChance:4});
  g.isRun().equipment.rightHand = sword.uid;
  const spell = {id:'testSpell',name:'検証魔法',kind:'magical',target:'single',mp:3};
  data.skills.testSpell = spell;
  g.enemies = [{alive:true,stats:{spd:1}}];
  g.activeSetEffects = () => ({});
  g.cooldownRemaining = () => 0;
  g.canPaySkillCosts = g.skillEquipmentReady = g.skillBuffReady = () => true;
  g.skillMpCost = skill => skill.mp;
  g.playerCombatStats = () => ({agi:100});
  g.clearTargets = g.keepAutoControlVisible = g.flashTitle = g.setLog = () => {};
  g.battleSleep = async () => {};
  g.enemyAttack = async () => {throw Error('defeated enemy should not act');};
  g.isPendingBossTransform = () => false;
  let actions = 0, started = 0, victories = 0;
  g.beginPlayerTurn = async () => {started++;};
  g.victory = async () => {victories++;};
  g.playerAttack = async skill => {
    assert.equal(skill,spell);
    if (++actions === 4) g.enemies[0].alive = false;
  };
  g.playerActionWithSpark = async (skill, target) => g.playerAttack(skill, target);
  await g.executeRound(spell.id,0);
  assert.equal(actions,4);
  assert.equal(g.player.mp,7);
  assert.equal(started,1);
  assert.equal(victories,1);
  g.enemies[0].alive = true;
  await g.owgRepeatAttacks({target:'self', kind:'support'},0);
  assert.equal(actions,4);
});

test('weapon costs empower the chosen attack independently and leave at least 1 HP', () => {
  const g = fixture();
  const sword = gear(g,'sword',{mpCostDamageBonus:.30,hpCostDamageBonus:.36});
  const armor = gear(g,'body');
  g.isRun().equipment.rightHand = sword.uid;
  assert.equal(g.owgOpFitsItem('mpCostDamageBonus',armor.itemId),false);
  assert.equal(g.owgOpFitsItem('hpCostDamageBonus',armor.itemId),false);
  g.floating = () => {};
  const attack = {id:'attack',kind:'weapon',target:'single'};
  const enemy = {hp:100,stats:{maxHp:100}};
  const paid = g.owgEmpowerAttack(attack);
  assert.equal(g.player.mp,0);
  assert.equal(g.player.hp,375);
  assert.equal(g.usedMpThisBattle,true);
  assert.equal(g.owgDamageWithOps(100,paid,enemy,false),166);
  assert.equal(g.owgDamageWithOps(100,attack,enemy,false),100);

  g.player.hp = 25;
  assert.equal(g.owgEmpowerAttack(attack), attack);
  assert.equal(g.player.hp,25);
  g.player.hp = 26;
  assert.equal(g.owgDamageWithOps(100,g.owgEmpowerAttack(attack),enemy,false),136);
  assert.equal(g.player.hp,1);
  g.player.mp = 20;
  assert.equal(g.owgDamageWithOps(100,g.owgEmpowerAttack(attack),enemy,false),130);
  assert.equal(g.player.mp,10);
  assert.equal(g.owgEmpowerAttack({target:'self',kind:'support'}).owgPaidDamageBonus,undefined);
  assert.equal(g.player.mp,10);
});

test('revival uses the same rate for the roll and restored HP and can succeed once per battle', () => {
  const g = fixture();
  const armor = gear(g,'body',{reviveOnKnockout:.12});
  const charm = gear(g,'accessory_guard',{reviveOnKnockout:.08});
  Object.assign(g.isRun().equipment,{body:armor.uid,accessory:charm.uid});
  assert.equal(g.owgOpFitsItem('reviveOnKnockout',gear(g,'sword').itemId),false);
  g.activeSetEffects = () => ({});
  g.activePassives = () => [];
  g.passiveEffectRate = g.equipmentEffectRate = () => 0;
  g.resonanceEnabled = () => false;
  g.floating = g.setLog = g.flashTitle = () => {};
  g.player.hp = 0;
  assert.equal(g.owgTryRevive(undefined,() => .20),false);
  g.player.hp = 60;
  const revive = g.owgTryRevive;
  g.owgTryRevive = rate => revive.call(g,rate,() => .19);
  assert.equal(g.receivePlayerDamage(200),60);
  assert.equal(g.player.hp,100);
  assert.equal(g.player.owgRevived,true);
  assert.equal(g.receivePlayerDamage(200),100);
  assert.equal(g.player.hp,0);
  delete g.player.owgRevived;
  armor.ops[0].value = .65;
  charm.ops[0].value = .65;
  assert.equal(revive.call(g,undefined,() => {throw Error('guaranteed revival must not draw');}),true);
  assert.equal(g.player.hp,500);
});

test('HP and MP damage OPs share a 100% cap across all equipped items', () => {
  const g = fixture();
  const sword = gear(g,'sword',{mpCostDamageBonus:.60,hpCostDamageBonus:.60});
  const charm = gear(g,'accessory_might',{mpCostDamageBonus:.60});
  g.isRun().equipment.rightHand = sword.uid;
  g.floating = () => {};
  const attack = {id:'attack',kind:'weapon',target:'single'};
  const enemy = {hp:1000,stats:{maxHp:1000}};
  const combined = g.owgEmpowerAttack(attack);
  assert.equal(combined.owgPaidDamageBonus,1);
  assert.equal(g.owgDamageWithOps(100,combined,enemy,false),200);
  assert.equal(g.player.hp,375);
  assert.equal(g.player.mp,0);
  g.isRun().equipment.accessory = charm.uid;
  g.player.hp = 400;
  g.player.mp = 10;
  assert.equal(g.owgEmpowerAttack(attack).owgPaidDamageBonus,1);
  assert.equal(g.player.hp,400);
  assert.equal(g.player.mp,0);
});
