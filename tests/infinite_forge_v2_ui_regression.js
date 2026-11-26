const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {test} = require('node:test');

function fixture() {
  class BattleGame {}
  const data = {items:{}, weapons:{}, infiniteScore:{rarity:{}, opLabels:{}}};
  const document = {addEventListener(){}, querySelector(){return null;}};
  const context = {window:{BattleGame, ARSENE_DATA:data}, document};
  for (const file of ['infinite_gear_v2_data','infinite_gear_v2','infinite_score','infinite_relics']) {
    vm.runInNewContext(fs.readFileSync('js/' + file + '.js','utf8'), context);
  }
  const api = data.infiniteGear, game = new BattleGame();
  const run = {active:true, equipment:{}, lootBag:[
    {itemId:'otherworldShard', count:100}, {itemId:'otherworldCore', count:10}
  ]};
  game.profile = {infiniteScore:run, infiniteRelicLevels:{}};
  game.isLog = game.isSave = game.isRenderWorkshop = () => {};
  game.isConfirm = async () => true;
  game.isNotify = async () => {};
  game.isForgeState();
  function item(uid, ops, options = {}) {
    const gear = api.generate({uid, part:'sword', rarity:'rare', floor:1, random:() => .1, ...options});
    gear.ops = ops;
    run.lootBag.push(gear);
    return gear;
  }
  return {api,game,run,item};
}
const option = (key,value,grade='RARE') => ({key,value,grade});

test('real V2 transfer appends/overwrites exact OP values, charges for grade and respects the rarity slot cap', async () => {
  const {game:g,api,item,run} = fixture();
  const target = item('base',[option('strRate',17)]);
  const source = item('source',[option('maxHpRate',25)]);
  const donor = item('donor',[option('strRate',35,'EPIC')]);
  run.equipment.rightHand = source.uid;
  assert.equal(g.isForgeOpText(source.ops[0]), api.opText(source.ops[0]));
  const initial = JSON.stringify(run.lootBag);
  assert.equal(g.isForgeTransferPreview(target,source.ops[0],source,0).needsReplace,false);
  assert.equal(JSON.stringify(run.lootBag),initial);
  await g.isForgeTransfer('source','base',0);
  assert.equal(g.isBagEntry('source'),undefined);
  assert.equal(run.equipment.rightHand,undefined);
  assert.equal(JSON.stringify(target.ops[1]),JSON.stringify(option('maxHpRate',25)));
  assert.equal(g.isForgeMaterialCount('otherworldShard'),60);
  assert.equal(g.isForgeMaterialCount('otherworldCore'),9);
  const preview = g.isForgeTransferPreview(target,donor.ops[0],donor,0);
  assert.equal(preview.needsReplace,true);
  assert.deepEqual(Array.from(preview.slots),[0]);
  await g.isForgeTransfer('donor','base',0,1);
  assert.equal(g.isBagEntry('donor'),donor);
  await g.isForgeTransfer('donor','base',0,0);
  assert.equal(JSON.stringify(target.ops[0]),JSON.stringify(option('strRate',35,'EPIC')));
  assert.equal(target.ops.length,2);
  assert.equal(api.optionRates([target]).strRate,.35);
});

test('V2 transfer excludes unsuitable families, floor-locked options, Infinity mismatch and legacy mixing', () => {
  const {game:g,api,item,run} = fixture();
  const target = item('base',[]);
  const source = item('donor',[option('maxHpRate',23)]);
  const wrong = item('staff',[option('strRate',20)], {part:'staff'});
  const infinity = item('infinity',[option('maxHpRate',100)], {rarity:'infinity'});
  const late = item('late',[option('fireFollowUpRate',10)],{floor:80});
  const legacy = {uid:'legacy',kind:'equipment',otherWorldGear:true,itemId:target.itemId,stars:5,ops:[{key:'str',rank:2,value:2}]};
  run.lootBag.push(legacy);
  assert.ok(api.canAppend(source,target,0));
  for (const invalid of [wrong,infinity,late,legacy]) {
    assert.equal(g.isForgeTransferPreview(target,invalid.ops[0],invalid,0),null);
  }
  const candidates=g.isForgeSourcesForTarget(target,g.isForgeTransferSources(g.isWorkshopGear()));
  assert.deepEqual(Array.from(candidates, entry => entry.item.uid),['donor']);
  assert.equal(g.isForgeTransferPreview(legacy,source.ops[0],source,0),null);
});

test('same-item V2 enhancement preserves shipped grade, bonus, identity and progress while enforcing rarity', async () => {
  const {game:g,api,item,run} = fixture();
  const target=item('target',[option('strRate',21)]);
  target.plus=5;
  const material=item('material',[option('strRate',19)]);
  item('otherRarity',[option('strRate',64)],{rarity:'mythic'});
  item('locked',[]).locked=true;
  const legacy = {...material, uid:'legacy',gearVersion:1};
  run.lootBag.push(legacy);
  assert.deepEqual(Array.from(g.isForgeEnhanceMaterials(target,g.isWorkshopGear()),gear=>gear.uid),['material']);
  const state = JSON.stringify(target);
  g.owgTuneCost=gear=>({shard:gear.stars + gear.tuneLevel,core:1});
  assert.equal(g.isForgeEnhanceCost(target).shard,8);
  assert.equal(JSON.stringify(target),state);
  const base=target.baseStats.attackPower;
  await g.isForgeEnhance('target','material');
  assert.equal(target.plus,6);
  assert.equal('tuneLevel' in target,false);
  assert.equal(target.gearVersion,2);
  assert.equal(target.uid,'target');
  assert.equal(JSON.stringify(target.ops[0]),JSON.stringify(option('strRate',21)));
  assert.equal(api.strengthened(target).attackPower,Math.floor(base * (1.2 ** 6) + 1e-7));
  assert.equal(g.isBagEntry('material'),undefined);
});



test('extraction and treasure equipment choices show V2 rarity, individual name, real stats and percent grades without modifying the save', () => {
  const {game:g,api,item} = fixture();
  const gear=item('accessory',[option('maxMpRate',25)],{part:'accessory'});
  gear.plus=4;
  const snapshot=JSON.stringify(gear);
  const shown=g.isRunGearChoice(gear);
  assert.equal(shown.label,gear.name+' +4');
  assert.ok(shown.note.includes('RARE'));
  assert.ok(shown.note.includes('最大HP '+api.strengthened(gear).maxHp));
  assert.ok(shown.note.includes('最大MP '+api.strengthened(gear).maxMp));
  assert.ok(shown.note.includes(api.opText(gear.ops[0])));
  assert.doesNotMatch(shown.note,/undefined|NaN|QUALITY/);
  assert.equal(JSON.stringify(gear),snapshot);
});

test('a failed save restores the bag, stats, equipment and RNG; retry spends materials once and clamps vitals', async () => {
  const {game:g,run,item} = fixture();
  const target=item('target',[]);
  const donor=item('donor',[option('maxHpRate',23)]);
  run.hp=150;
  run.mp=88;
  run.equipment.rightHand=donor.uid;
  run.seed=6;
  g.totalStats = () => ({maxHp:105,maxMp:60});
  let fail=true, writes=0;
  const notices=[];
  g.isNotify = async title => notices.push(title);
  g.isSave = () => {
    writes++;
    if (fail) throw Error('simulated write failure');
  };
  const previous=JSON.stringify(run);
  await g.isForgeTransfer('donor','target',0);
  assert.equal(JSON.stringify(run),previous);
  assert.equal(g.isBagEntry('donor'),donor);
  assert.equal(g.isBagEntry('target'),target);
  assert.match(notices[0],/保存できません/);
  g.owgTuneRate = () => .5;
  await g.isForgeEnhance('target');
  assert.equal(JSON.stringify(run),previous);
  assert.equal(Object.hasOwn(run,'rngState'),false);
  fail=false;
  await g.isForgeTransfer('donor','target',0);
  assert.equal(writes,3);
  assert.equal(g.isForgeMaterialCount('otherworldShard'),60);
  assert.equal(g.isBagEntry('donor'),undefined);
  assert.equal(run.hp,105);
  assert.equal(run.mp,60);
});
