/* INFINITE SCORE — optional rewarded support for the iOS app. */
(() => {
  'use strict';
  const G=window.BattleGame;
  if(!G)return;
  const P=G.prototype;

  P.isSupportAvailable=function(){return !!window.arseneAdMob?.isNativeIOS?.();};
  P.isSupportSkip=function(){return !!window.arseneQOffer?.hasAdSkip?.();};
  P.isRequestSupport=function(type,onGrant){
    const notify=message=>window.arseneStartFlow?.toast?.(message);
    if(!this.isSupportAvailable()||!window.arseneQOffer){notify('この端末では広告を利用できません');return false;}
    if(window.arseneQOffer.isOpen?.()){notify('別の広告処理が進行中です');return false;}
    const opened=window.arseneQOffer.show(type,{onGrant});
    if(!opened)notify('広告の確認画面を開けませんでした。もう一度お試しください');
    return opened;
  };
  P.isEnsureSupportState=function(run=this.isRun?.()){
    if(!run)return null;
    run.support ||= {};
    run.support.bagExpansionUsed=!!run.support.bagExpansionUsed;
    run.support.shopCounter=Math.max(0,Number(run.support.shopCounter)||0);
    return run.support;
  };

  const oldEnsure=P.isEnsureRunShape;
  P.isEnsureRunShape=function(...args){const run=oldEnsure.apply(this,args);this.isEnsureSupportState(run);return run;};
  const oldBagLimit=P.isBagLimit;
  P.isBagLimit=function(){const base=oldBagLimit.call(this),run=this.isRun?.();return run?.support?.bagExpansionUsed?Math.max(base,33):base;};
  P.isCanExpandBag=function(){const run=this.isRun?.(),support=this.isEnsureSupportState(run);if(!run||!support||!this.isSupportAvailable())return false;if(support.bagExpansionUsed)return false;return this.isBagLimit()<33;};
  P.isSupportLabel=function(action){return this.isSupportSkip()?action:`🎬 広告を見て${action}`;};

  const oldBegin=P.isBegin;
  P.isBegin=function(...args){const result=oldBegin.apply(this,args),run=this.isRun?.();if(run){run.support={bagExpansionUsed:false,shopCounter:0};this.isSave?.();}return result;};

  const oldShowBagFull=P.isShowBagFull;
  P.isShowBagFull=function(){oldShowBagFull.call(this);if(!this.isCanExpandBag())return;const modal=document.getElementById('is-modal'),actions=modal?.querySelector('.is-actions');if(!actions||actions.querySelector('[data-is-support="bag"]'))return;actions.insertAdjacentHTML('afterbegin',`<button class="is-support-button" data-is-support="bag">${this.isSupportLabel('+3枠')}<small>このRUNのみ／最大33枠</small></button>`);};
  P.isGrantBagExpansion=function(){const run=this.isRun?.(),support=this.isEnsureSupportState(run);if(!run||!support||support.bagExpansionUsed||this.isBagLimit()>=33)return false;support.bagExpansionUsed=true;this.isLog?.('怪盗支援：バッグを33枠へ緊急拡張');this.isSave?.();document.getElementById('is-modal')?.remove();const pending=run.pendingLoot;run.pendingLoot=null;if(pending)this.isAddLoot(pending);this.isRenderBag?.(document.querySelector('#menu-panel'));return true;};

  P.isStartShopEncounter=function(merchant=false){const run=this.isRun?.(),support=this.isEnsureSupportState(run);if(!run||!support)return null;support.shopCounter++;run.shopSupport={id:`${run.seed}-${support.shopCounter}`,merchant:!!merchant,gearPurchased:false};this.isSave?.();return run.shopSupport;};
  P.isEnsureShopEncounter=function(merchant=false){const run=this.isRun?.();return run?.shopSupport||this.isStartShopEncounter(merchant);};
  const oldResolveEvent=P.isResolveEvent;
  P.isResolveEvent=function(type){if(type==='shop'||type==='merchant')this.isStartShopEncounter(type==='merchant');return oldResolveEvent.call(this,type);};
  const oldRenderExplore=P.isRenderExplore;
  P.isRenderExplore=function(panel){const run=this.isRun?.();if(run?.phase==='defeatPending')return this.isFinishDefeat();if(run)run.shopSupport=null;return oldRenderExplore.call(this,panel);};
  const oldRenderShop=P.isRenderShop;
  P.isRenderShop=function(panel,merchant=false){
    this.isEnsureShopEncounter(merchant);
    this.isShopMerchantMode=!!merchant;
    return oldRenderShop.call(this,panel,merchant);
  };

  document.addEventListener('click',event=>{
    const game=window.arseneGame, button=event.target.closest('[data-is-support="bag"]');
    if(!game||!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(!button.disabled)game.isRequestSupport('infiniteBag',()=>game.isGrantBagExpansion());
  },true);
})();
