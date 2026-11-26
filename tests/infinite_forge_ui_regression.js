const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

class BattleGame {}
const ids = ['base','donor','locked','expensive'];
const data = {
  items:Object.fromEntries(ids.map(id => [id, {name:id, category:'equipment', slot:'rightHand'}])),
  weapons:{},
  infiniteScore:{bagLimit:30, rarity:{}, opLabels:{}}
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
  g.owgEffectiveStats = (_, level) => ({attackPower:{total:200 + level * 16}});
  return {g, panel:{dataset:{}, scrollTop:0, querySelector(){return null;}}};
}

test('only gear the player can afford to strengthen is listed', () => {
  const {g,panel} = fixture();
  g.isRenderWorkshop(panel);
  assert.match(panel.innerHTML,/data-is-forge-select="base"/);
  assert.doesNotMatch(panel.innerHTML,/data-is-forge-select="expensive"/);
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
