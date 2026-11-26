const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {test} = require('node:test');

const data = {
  items:{}, weapons:{}, armors:{}, accessories:{}, skills:{},
  infiniteScore:{bagLimit:30, rarity:{}, opLabels:{}, opRanks:{}}
};
const document = {addEventListener(){}, querySelector(){return null;}};
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
