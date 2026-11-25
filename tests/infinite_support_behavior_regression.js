const assert=require('node:assert/strict');

class BattleGame {}
BattleGame.prototype.isRun=function(){return this.profile?.infiniteScore?.active?this.profile.infiniteScore:null;};
BattleGame.prototype.isEnsureRunShape=function(run=this.isRun()){return run;};
BattleGame.prototype.isBagLimit=function(){return this._baseLimit||30;};
BattleGame.prototype.isBegin=function(){};
BattleGame.prototype.isResolveEvent=function(){};
BattleGame.prototype.isRenderExplore=function(){};
BattleGame.prototype.isRenderShop=function(){};
BattleGame.prototype.isBuy=function(){};
BattleGame.prototype.defeat=async function(){this.originalDefeatCalled=true;};

global.window={
  BattleGame,
  ARSENE_DATA:{items:{gear:{name:'境界剣',category:'equipment'}},infiniteScore:{rarity:{rare:{name:'RARE'}},opLabels:{}}},
  arseneAdMob:{isNativeIOS:()=>true},
  arseneQOffer:{hasAdSkip:()=>false,show:()=>true}
};
const fakePanel={querySelector(){return null;}};
global.document={addEventListener(){},getElementById(){return null;},querySelector(selector){return selector==='#menu-panel'?fakePanel:null;}};
require('../js/infinite_support.js');

function game(){const g=new BattleGame();g.profile={inventory:{},otherWorldGear:[],equipment:{rightHand:'gear'},currentVitals:{hp:10,mp:5},flags:{},infiniteScore:{active:true,seed:7,dungeonGold:0,lootBag:[],equipment:{},importedItems:[],homeEquipment:{rightHand:'gear'},homeVitals:{hp:10,mp:5},support:{}}};g.saveProfile=()=>{g.saves=(g.saves||0)+1;};g.isSave=g.saveProfile;g.isLog=()=>{};g.isGenerateGear=()=>({uid:`g${++g.generated}`,kind:'equipment',itemId:'gear',otherWorldGear:true,quality:100,plus:0,ops:[]});g.generated=0;g.isBagUsed=()=>g.isRun()?.lootBag.length||0;g.audio={stopMusic(){},sfx(){}};g.showResult=()=>{};g.isHideDefaultResultMenu=()=>{};g.activeSetEffects=()=>({});g.player={};g.endAutoBattle=()=>{};return g;}

const bag=game();bag.isEnsureRunShape();assert.deepEqual(bag.isRun().support,{insuranceUsed:false,bagExpansionUsed:false,shopCounter:0});assert.equal(bag.isBagLimit(),30);bag.isRun().support.bagExpansionUsed=true;assert.equal(bag.isBagLimit(),33);bag._baseLimit=35;assert.equal(bag.isBagLimit(),35,'既存装備効果の35枠を縮小しない');

const shop=game();const first=shop.isStartShopEncounter(false);assert.equal(first.id,'7-1');assert.equal(first.rerollUsed,false);assert.equal(shop.isGrantShopReroll(),true);assert.equal(shop.isRun().lootBag.length,5);assert.equal(new Set(shop.isRun().lootBag.map(gear=>gear.uid)).size,5);assert.equal(first.rewardNames.length,5);assert.equal(shop.isRun().dungeonGold,0);const after=shop.generated;assert.equal(shop.isGrantShopReroll(),false);assert.equal(shop.generated,after,'同じショップで2回目を抽選しない');shop.isStartShopEncounter(true);assert.equal(shop.isRun().shopSupport.id,'7-2');assert.equal(shop.isRun().shopSupport.rerollUsed,false);assert.equal(shop.isGrantShopReroll(first),false,'前の店で開始した広告は新しい店に付与しない');const next=shop.isRun().shopSupport;shop._baseLimit=9;assert.equal(shop.isGrantShopReroll(next),false,'装備5個の空き枠がなければ支援を消費しない');assert.equal(next.rerollUsed,false);

(async()=>{
  const insured=game();insured.battleMode='infiniteScore';insured.isRun().lootBag=[{uid:'keep',kind:'equipment',itemId:'gear',otherWorldGear:true,quality:108,plus:4,ops:[]}];await insured.defeat();assert.equal(insured.isRun().phase,'defeatPending','全滅直後もロスト候補を保存する');assert.equal(insured.profile.infiniteScore.active,true);assert.equal(insured.isGrantInsurance(),true);assert.equal(insured.isGrantInsurance(),false,'保険権を二重付与しない');insured.isFinishDefeat('keep');assert.equal(insured.profile.infiniteScore.active,false);assert.equal(insured.profile.otherWorldGear.length,1);insured.isFinishDefeat('keep');assert.equal(insured.profile.otherWorldGear.length,1,'再実行で装備を複製しない');

  window.arseneAdMob.isNativeIOS=()=>false;const web=game();web.battleMode='infiniteScore';web.isRun().lootBag=[{uid:'lost',kind:'equipment',itemId:'gear'}];assert.equal(web.isSupportAvailable(),false);assert.equal(web.isRequestSupport('infiniteBag',()=>{}),false);await web.defeat();assert.equal(web.profile.infiniteScore.active,false,'Web版は保険入口を出さず通常ロストを確定する');
  const preview=game();
  preview.localScenario={id:'infinite-score-ready',ephemeral:true};
  window.location={hostname:'arsene.example'};
  assert.equal(preview.isRequestSupport('infiniteReroll',()=>{}),false);
  window.location.hostname='127.0.0.1';
  assert.equal(preview.isRequestSupport('infiniteReroll',()=>{}),false,'ショップに遭遇している必要がある');
  preview.isStartShopEncounter(true);
  let offer;
  window.arseneQOffer.show=(type,options)=>{offer={type,...options};return true;};
  assert.equal(preview.isRequestSupport('infiniteReroll',()=>{}),true);
  assert.equal(offer.type,'infiniteReroll');
  assert.equal(offer.previewAd,true);
  assert.equal(preview.isRequestSupport('infiniteInsurance',()=>{}),false);
  console.log('infinite support behavior regression: ok');
})().catch(error=>{console.error(error);process.exitCode=1;});
