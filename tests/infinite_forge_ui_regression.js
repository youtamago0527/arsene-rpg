const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

class BattleGame {}
const ids = ['base','donor','locked','expensive'];
const data = {
  items:Object.fromEntries(ids.map(id => [id, {name:id, category:'equipment', slot:'rightHand'}])),
  weapons:{},
  otherWorldGearOps:[{key:'critBonus', values:[.01,.02,.035,.05,.075,.10]}],
  infiniteScore:{bagLimit:30, rarity:{}, opLabels:{critBonus:'会心率'}}
};
const document = {addEventListener(){}, querySelector(){return null;}};
const context = {window:{BattleGame, ARSENE_DATA:data}, document};
for (const file of ['js/infinite_score.js','js/infinite_relics.js']) {
  vm.runInNewContext(fs.readFileSync(file,'utf8'), context);
}

function fixture() {
  const g = new BattleGame();
  const gear = (uid, ops, tuneLevel=0, locked=false) => ({uid, itemId:uid, kind:'equipment', otherWorldGear:true,
    stars:4, ops, tuneLevel, locked});
  const op = (key, rank) => ({key, rank, value:rank + 1});
  g.profile = {infiniteScoreDebug:{}, infiniteRelicLevels:{}, infiniteScore:{active:true,equipment:{},lootBag:[
    gear('base', ['str','vit','mnd','dex'].map(key => op(key,3))),
    gear('donor', [op('mag',1),op('agi',4)]),
    gear('locked', [op('luk',1)], 0, true),
    gear('expensive', [], 20),
    {itemId:'otherworldShard', count:45},
    {itemId:'otherworldCore', count:1}
  ]}};
  g.owgTuneCost = item => ({shard:5 + item.tuneLevel * 3, core:item.tuneLevel >= 5 ? 1 : 0});
  g.owgEffectiveStats = (item, level = item.tuneLevel || 0) => ({attackPower:{total:200 + level * 16}});
  g.isShowForgeSuccess = async result => {g.forgeSuccess = result;};
  return {g, panel:{dataset:{}, scrollTop:0, querySelector(){return null;}}};
}

test('only gear the player can afford to strengthen is listed', () => {
  const {g,panel} = fixture();
  g.isRenderWorkshop(panel);
  assert.match(panel.innerHTML,/data-is-forge-select="base"/);
  assert.doesNotMatch(panel.innerHTML,/data-is-forge-select="expensive"|品質|QUALITY/);
  g.isForgeState().selectedUid = 'base';
  g.isRenderWorkshop(panel);
  assert.match(panel.innerHTML,/200 → 216/);
  assert.match(panel.innerHTML,/必要素材　欠片 5/);
});

test('transfer chooses target, affordable source and OP, then an explicit replacement', () => {
  const {g,panel} = fixture();
  const state = g.isForgeState();
  state.mode = 'transfer';
  g.isRenderWorkshop(panel);
  assert.match(panel.innerHTML,/移植先の装備を選ぶ/);
  assert.doesNotMatch(panel.innerHTML,/data-is-forge-source=/);
  assert.doesNotMatch(panel.innerHTML,/data-is-forge-select="donor"/);
  state.selectedUid = 'base';
  g.isRenderWorkshop(panel);
  assert.match(panel.innerHTML,/data-is-forge-source="donor"/);
  assert.doesNotMatch(panel.innerHTML,/data-is-forge-source="locked"/);
  state.sourceUid = 'donor';
  g.isRenderWorkshop(panel);
  assert.match(panel.innerHTML,/data-is-forge-op="0"/);
  assert.doesNotMatch(panel.innerHTML,/data-is-forge-op="1"/);
  state.opIndex = 0;
  g.isRenderWorkshop(panel);
  assert.match(panel.innerHTML,/data-is-forge-execute disabled/);
  state.replaceIndex = 0;
  g.isRenderWorkshop(panel);
  assert.doesNotMatch(panel.innerHTML,/data-is-forge-execute disabled/);
  assert.match(panel.innerHTML,/欠片 30 \/ 核 1/);
});

test('without a usable source or necessary materials the list does not offer a transfer', () => {
  const {g,panel} = fixture();
  g.isForgeState().mode = 'transfer';
  g.isRun().lootBag.pop();
  g.isRenderWorkshop(panel);
  assert.match(panel.innerHTML,/移植できる組み合わせがありません/);
  assert.doesNotMatch(panel.innerHTML,/data-is-forge-select=/);
});

test('an identical weapon guarantees a high enhancement and contributes half of each matching OP', async () => {
  const {g,panel} = fixture();
  const run = g.isRun();
  const base = g.isBagEntry('base');
  base.plus = base.tuneLevel = 5;
  base.ops = [{key:'str', rank:2, value:3}, {key:'hpDrain', rank:2, value:.02}, {key:'vit', rank:2, value:2}];
  const material = {...base, uid:'duplicate', ops:[
    {key:'str', rank:3, value:5}, {key:'hpDrain', rank:3, value:.035}, {key:'mag', rank:1, value:1}
  ]};
  run.lootBag = [base, material, {...material, uid:'locked-duplicate', locked:true}];
  run.equipment.rightHand = material.uid;
  g.owgTuneRate = () => .55;
  g.isRand = () => {throw Error('identical gear must not roll chance');};
  g.isLog = g.isSave = () => {};
  g.isConfirm = async () => false;

  g.isRenderWorkshop(panel);
  assert.doesNotMatch(panel.innerHTML,/同型合成/);
  assert.match(panel.innerHTML,/data-is-forge-select="base"/);
  g.isForgeState().selectedUid = 'base';
  g.isRenderWorkshop(panel);
  assert.match(panel.innerHTML,/data-is-forge-material="duplicate"/);
  assert.doesNotMatch(panel.innerHTML,/data-is-forge-material="locked-duplicate"|欠片・核で強化|data-is-forge-execute/);
  g.isForgeState().materialUid = material.uid;
  g.isRenderWorkshop(panel);
  assert.match(panel.innerHTML,/成功率 100%/);
  assert.match(panel.innerHTML,/str \+3 → <b>str \+5\.5/);
  await g.isForgeEnhance(base.uid, 'locked-duplicate');
  assert.equal(base.plus,5);
  await g.isForgeEnhance(base.uid, material.uid);
  assert(g.isBagEntry(material.uid),'cancelling must keep the material');
  g.isConfirm = async (_, details) => {
    assert.match(details,/装備中の素材.*消費/);
    return true;
  };
  await g.isForgeEnhance(base.uid, material.uid);
  assert.equal(base.plus,6);
  assert.equal(base.tuneLevel,6);
  assert.equal(g.forgeSuccess.current,5);
  assert.equal(g.forgeSuccess.next,6);
  assert.equal(g.forgeSuccess.beforeStats.attackPower,280);
  assert.equal(g.forgeSuccess.afterStats.attackPower,296);
  assert.equal(g.forgeSuccess.changedOps[0].before.value,3);
  assert.equal(g.forgeSuccess.changedOps[0].after.value,5.5);
  assert.equal(base.ops[0].value,5.5);
  assert.equal(base.ops[0].rank,2);
  assert.equal(base.ops[1].value,.02 + .035 / 2);
  assert.equal(base.ops[2].value,2);
  assert(!base.ops.some(op => op.key === 'mag'));
  assert(!g.isBagEntry(material.uid));
  assert.equal(run.equipment.rightHand,undefined);
  assert.equal(g.isForgeMaterialCount('otherworldShard'),0);
});

test('shard enhancement from +3 can fail while preserving the gear, OPs, and protection Arcana', async () => {
  const {g,panel} = fixture();
  const run = g.isRun(), base = g.isBagEntry('base');
  base.plus = base.tuneLevel = 3;
  const originalOps = JSON.stringify(base.ops);
  run.equipment.rightHand = base.uid;
  g.profile.inventory = {protectionArcana:1};
  g.owgTuneRate = next => next <= 3 ? 1 : .85;
  g.isRand = () => .99;
  g.isConfirm = async () => true;
  g.isLog = g.isSave = () => {};
  g.isNotify = async (title, details) => {
    assert.equal(title,'強化失敗');
    assert.match(details,/欠片 14/);
  };
  g.isForgeState().selectedUid = base.uid;
  g.isRenderWorkshop(panel);
  assert.match(panel.innerHTML,/成功率 85%/);
  await g.isForgeEnhance(base.uid);
  assert.equal(g.isBagEntry(base.uid),base);
  assert.equal(run.equipment.rightHand,base.uid);
  assert.equal(base.plus,3);
  assert.equal(base.tuneLevel,3);
  assert.equal(g.forgeSuccess,undefined);
  assert.equal(JSON.stringify(base.ops),originalOps);
  assert.equal(g.isForgeMaterialCount('otherworldShard'),31);
  assert.equal(g.isForgeMaterialCount('otherworldCore'),1);
  assert.equal(g.profile.inventory.protectionArcana,1);

  base.plus = base.tuneLevel = 2;
  g.isRand = () => {throw Error('enhancement through +3 is guaranteed');};
  await g.isForgeEnhance(base.uid);
  assert.equal(base.plus,3);
  assert.equal(g.isForgeMaterialCount('otherworldShard'),20);
});

function sameOpFixture() {
  const {g,panel} = fixture();
  const base = g.isBagEntry('base'), donor = g.isBagEntry('donor');
  base.ops = [{key:'critBonus',rank:2,value:.04},{key:'str',rank:1,value:2}];
  donor.ops = [{key:'critBonus',rank:5,value:.075}];
  g.isRun().lootBag.find(item => item.itemId === 'otherworldShard').count = 100;
  g.isRun().lootBag.find(item => item.itemId === 'otherworldCore').count = 3;
  g.owgOpValueText = op => Number((op.value * 100).toFixed(2)) + '%';
  Object.assign(g.isForgeState(),{mode:'transfer',selectedUid:'base',sourceUid:'donor',opIndex:0});
  return {g,panel,base,donor};
}

test('matching OPs require a choice and show the actual effects of both options', async () => {
  const {g,panel,base,donor} = sameOpFixture();
  g.isRenderWorkshop(panel);
  assert.match(panel.innerHTML,/data-is-forge-same-op="enhance"[\s\S]*会心率 \+7\.75%/);
  assert.match(panel.innerHTML,/data-is-forge-same-op="transfer"[\s\S]*会心率 \+3\.5%/);
  assert.doesNotMatch(panel.innerHTML,/data-is-forge-execute|data-is-forge-replace=/);
  g.isConfirm = () => {throw Error('no method was selected');};
  await g.isForgeTransfer(donor.uid,base.uid,0);
  assert.equal(base.ops[0].value,.04);
  assert.equal(g.isBagEntry(donor.uid),donor);
  for (const [mode,result] of [['enhance','7\\.75'],['transfer','3\\.5']]) {
    g.isForgeState().sameOpMode = mode;
    g.isRenderWorkshop(panel);
    assert.match(panel.innerHTML,new RegExp('会心率 \\+4% → 会心率 \\+' + result + '%'));
  }
});

test('OP strengthening adds half and preserves rank, while OP transfer moves the capped source OP', async () => {
  for (const [mode,rank,value] of [['enhance',2,.04 + .075 / 2],['transfer',3,.035]]) {
    const {g,base,donor} = sameOpFixture();
    g.isConfirm = async () => false;
    g.isLog = g.isSave = () => {};
    await g.isForgeTransfer(donor.uid,base.uid,0,null,mode);
    assert.equal(g.isBagEntry(donor.uid),donor);
    assert.equal(g.isForgeMaterialCount('otherworldShard'),100);
    g.isConfirm = async (title) => {
      assert.equal(title,mode === 'enhance' ? 'OPを強化しますか？' : 'OPを移植しますか？');
      return true;
    };
    await g.isForgeTransfer(donor.uid,base.uid,0,null,mode);
    assert.equal(base.ops[0].rank,rank);
    assert.equal(base.ops[0].value,value);
    assert.equal(base.ops.length,2);
    assert.equal(base.ops[1].key,'str');
    assert.equal(g.isBagEntry(donor.uid),undefined);
    assert.equal(g.isForgeMaterialCount('otherworldShard'),30);
    assert.equal(g.isForgeMaterialCount('otherworldCore'),0);
  }
});
