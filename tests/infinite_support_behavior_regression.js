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
require('../js/infinite_score.js');
require('../js/infinite_support.js');

function game(){const g=new BattleGame();g.profile={inventory:{},otherWorldGear:[],equipment:{rightHand:'gear'},currentVitals:{hp:10,mp:5},flags:{},infiniteScore:{active:true,seed:7,lootBag:[],equipment:{},importedItems:[],homeEquipment:{rightHand:'gear'},homeVitals:{hp:10,mp:5},support:{}}};g.saveProfile=()=>{g.saves=(g.saves||0)+1;};g.isSave=g.saveProfile;g.isLog=()=>{};g.isGenerateGear=()=>({uid:`g${++g.generated}`,kind:'equipment',itemId:'gear',otherWorldGear:true,quality:100,plus:0,ops:[]});g.generated=0;g.isBagUsed=()=>g.isRun()?.lootBag.length||0;g.audio={stopMusic(){},sfx(){}};g.showResult=()=>{};g.isHideDefaultResultMenu=()=>{};g.activeSetEffects=()=>({});g.player={};g.endAutoBattle=()=>{};return g;}

const bag=game();bag.isEnsureRunShape();assert.deepEqual(bag.isRun().support,{bagExpansionUsed:false,shopCounter:0});assert.equal(bag.isBagLimit(),30);bag.isRun().support.bagExpansionUsed=true;assert.equal(bag.isBagLimit(),33);bag.profile.infiniteScoreDebug={bagLimit:35};assert.equal(bag.isBagLimit(),35,'既存装備効果の35枠を縮小しない');

const shop=game();
const first=shop.isStartShopEncounter(false);
assert.equal(first.id,'7-1');
assert.equal(first.gearPurchased,false);
assert.equal(shop.generated,0,'在庫を表示するだけでは装備を抽選しない');
first.gearPurchased=true;
assert.equal(shop.isEnsureShopEncounter(false).gearPurchased,true,'タブを戻しても購入済みを維持する');
assert.equal(shop.isStartShopEncounter(true).gearPurchased,false,'次の来店で1回分の在庫を用意する');

(async()=>{
  for (const phase of ['explore','defeatPending']) {
    const defeated=game();
    defeated.battleMode='infiniteScore';
    const run=defeated.isRun();
    run.phase=phase;
    run.support.insuranceAuthorized=true;
    run.lootBag=[{uid:'lost',kind:'equipment',itemId:'gear',otherWorldGear:true}];
    defeated.profile.otherWorldGear=[{uid:'already-home',kind:'equipment',itemId:'gear'}];
    defeated.showResult=(...args)=>{defeated.result=args;};
    if (phase==='defeatPending') await defeated.isChooseActiveRun();
    else await defeated.defeat();
    assert.equal(defeated.profile.infiniteScore.active,false);
    assert.equal(defeated.profile.infiniteScore.lostCount,1);
    assert.deepEqual(defeated.profile.otherWorldGear.map(item=>item.uid),['already-home']);
    assert.doesNotMatch(defeated.result.join(' '), /広告|奪還/);
  }
  window.arseneAdMob.isNativeIOS=()=>false;
  const web=game();
  assert.equal(web.isSupportAvailable(),false);
  assert.equal(web.isRequestSupport('infiniteBag',()=>{}),false);
  console.log('infinite support behavior regression: ok');
})().catch(error=>{console.error(error);process.exitCode=1;});
