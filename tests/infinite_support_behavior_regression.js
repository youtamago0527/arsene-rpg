const assert=require('node:assert/strict');

class BattleGame {}
global.window={
  BattleGame,
  ARSENE_DATA:{items:{gear:{name:'境界剣',category:'equipment'}},infiniteScore:{rarity:{rare:{name:'RARE'}},opLabels:{}}},
  arseneAdMob:{isNativeIOS:()=>true},
  arseneQOffer:{hasAdSkip:()=>false,show:()=>true}
};
const fakePanel={querySelector(){return null;}};
global.document={addEventListener(){},getElementById(){return null;},querySelector(selector){return selector==='#menu-panel'?fakePanel:null;}};
require('../js/infinite_score.js');
BattleGame.prototype.isRun=function(){return this.profile?.infiniteScore?.active?this.profile.infiniteScore:null;};
BattleGame.prototype.isEnsureRunShape=function(run=this.isRun()){return run;};
BattleGame.prototype.isBagLimit=function(){return this._baseLimit||30;};
BattleGame.prototype.isBegin=function(){};
BattleGame.prototype.isResolveEvent=function(){};
BattleGame.prototype.isRenderExplore=function(){};
BattleGame.prototype.isRenderShop=function(){};
BattleGame.prototype.isBuy=function(){};

require('../js/infinite_support.js');

function game(){const g=new BattleGame();g.profile={inventory:{},otherWorldGear:[],equipment:{rightHand:'gear'},currentVitals:{hp:10,mp:5},flags:{},infiniteScore:{active:true,seed:7,dungeonGold:0,lootBag:[],equipment:{},importedItems:[],homeEquipment:{rightHand:'gear'},homeVitals:{hp:10,mp:5},support:{}}};g.saveProfile=()=>{g.saves=(g.saves||0)+1;};g.isSave=g.saveProfile;g.isLog=()=>{};g.isGenerateGear=()=>({uid:`g${++g.generated}`,kind:'equipment',itemId:'gear',otherWorldGear:true,quality:100,plus:0,ops:[]});g.generated=0;g.isBagUsed=()=>g.isRun()?.lootBag.length||0;g.audio={stopMusic(){},sfx(){}};g.showResult=()=>{};g.isHideDefaultResultMenu=()=>{};g.activeSetEffects=()=>({});g.player={};g.endAutoBattle=()=>{};return g;}

const bag=game();bag.isEnsureRunShape();assert.deepEqual(bag.isRun().support,{bagExpansionUsed:false,shopCounter:0});assert.equal(bag.isBagLimit(),30);bag.isRun().support.bagExpansionUsed=true;assert.equal(bag.isBagLimit(),33);bag._baseLimit=35;assert.equal(bag.isBagLimit(),35,'既存装備効果の35枠を縮小しない');

const shop=game();const first=shop.isStartShopEncounter(false);assert.equal(first.id,'7-1');assert.equal(first.rerollUsed,false);assert.equal(shop.isGrantShopReroll(),true);assert.equal(shop.isRun().lootBag.length,5);assert.equal(new Set(shop.isRun().lootBag.map(gear=>gear.uid)).size,5);assert.equal(first.rewardNames.length,5);assert.equal(shop.isRun().dungeonGold,0);const after=shop.generated;assert.equal(shop.isGrantShopReroll(),false);assert.equal(shop.generated,after,'同じショップで2回目を抽選しない');shop.isStartShopEncounter(true);assert.equal(shop.isRun().shopSupport.id,'7-2');assert.equal(shop.isRun().shopSupport.rerollUsed,false);assert.equal(shop.isGrantShopReroll(first),false,'前の店で開始した広告は新しい店に付与しない');const next=shop.isRun().shopSupport;shop._baseLimit=9;assert.equal(shop.isGrantShopReroll(next),false,'装備5個の空き枠がなければ支援を消費しない');assert.equal(next.rerollUsed,false);

(async()=>{
  for (const native of [true,false]) {
    window.arseneAdMob.isNativeIOS=()=>native;
    const g=game();
    g.battleMode='infiniteScore';
    g.isRun().lootBag=[{uid:'lost',itemId:'gear',kind:'equipment'}];
    await g.defeat();
    assert.equal(g.profile.infiniteScore.active,false);
    assert.equal(g.profile.infiniteScore.lostCount,1);
    assert.equal(g.profile.otherWorldGear.length,0);
    assert.deepEqual(g.profile.equipment,{rightHand:'gear'});
    assert.equal(g.isRun(),null);
  }
  for (const resume of [g=>g.isChooseActiveRun(),g=>g.renderMenuPanel('otherworld'),g=>g.isRenderExplore(fakePanel)]) {
  for (const earned of [false,true]) {
    const g=game(),run=g.isRun();
    run.phase='defeatPending';
    run.support.insuranceAuthorized=earned;
    run.lootBag=[{uid:'kept',kind:'equipment',itemId:'gear',otherWorldGear:true}];
    g.isChoose=async()=>{assert.ok(earned);return 0;};
    await resume(g);
    assert.equal(g.profile.infiniteScore.active,false);
    assert.equal(g.profile.otherWorldGear.length,earned?1:0);
    assert.equal(g.profile.infiniteScore.lostCount,earned?0:1);
    g.isFinalizeRunDefeat(run,run.lootBag[0]);
    assert.equal(g.profile.otherWorldGear.length,earned?1:0);
  }
  }
  console.log('infinite support behavior regression: ok');
})().catch(error=>{console.error(error);process.exitCode=1;});
