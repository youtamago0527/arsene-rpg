/* INFINITE SCORE — optional rewarded support for the iOS app. */
(() => {
  'use strict';
  const D=()=>window.ARSENE_DATA, G=window.BattleGame;
  if(!G)return;
  const P=G.prototype;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const shopDrawCount=5;

  P.isSupportAvailable=function(){return !!window.arseneAdMob?.isNativeIOS?.();};
  P.isSupportSkip=function(){return !!window.arseneQOffer?.hasAdSkip?.();};
  P.isRequestSupport=function(type,onGrant){
    if(!this.isSupportAvailable()||!window.arseneQOffer)return false;
    return window.arseneQOffer.show(type,{onGrant});
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

  P.isStartShopEncounter=function(merchant=false){const run=this.isRun?.(),support=this.isEnsureSupportState(run);if(!run||!support)return null;support.shopCounter++;run.shopSupport={id:`${run.seed}-${support.shopCounter}`,merchant:!!merchant,rerollUsed:false};this.isSave?.();return run.shopSupport;};
  P.isEnsureShopEncounter=function(merchant=false){const run=this.isRun?.();return run?.shopSupport||this.isStartShopEncounter(merchant);};
  const oldResolveEvent=P.isResolveEvent;
  P.isResolveEvent=function(type){if(type==='shop'||type==='merchant')this.isStartShopEncounter(type==='merchant');return oldResolveEvent.call(this,type);};
  const oldRenderExplore=P.isRenderExplore;
  P.isRenderExplore=async function(panel){
    const run=this.isRun?.();
    // Old saves may have stopped between defeat and reward selection.
    if (run?.phase === 'defeatPending') {
      const choices = run.support?.insuranceAuthorized ? (run.lootBag || []).filter(item => item.kind === 'equipment') : [];
      let recovered = null;
      if (choices.length) {
        if (this.pendingLegacyReward === run) return;
        this.pendingLegacyReward = run;
        let pick;
        try {
          pick = await this.isChoose('受取済みの装備を選択', choices.map(item => ({
            label: this.isLootName?.(item) || D().items[item.itemId]?.name || item.itemId,
            note: `強化 +${item.plus || 0} ／ QUALITY ${item.quality || 100}`
          })), {message:'前のバージョンで獲得した装備を1個引き継げます。'});
        } finally { this.pendingLegacyReward = null; }
        if (this.isRun() !== run) return;
        if (pick == null) { this.showMenu('otherworld'); return; }
        recovered = choices[pick];
      }
      this.isFinalizeRunDefeat(run, recovered);
      return;
    }
    if (run) run.shopSupport=null;
    return oldRenderExplore.call(this,panel);
  };
  P.isCanClaimShopGacha=function(state=this.isRun()?.shopSupport){
    return !!state&&!state.rerollUsed&&this.isBagLimit()-this.isBagUsed()>=shopDrawCount;
  };
  P.isShopSupportHtml=function(){
    if(!this.isSupportAvailable())return '';
    const state=this.isRun().shopSupport;
    const used=state.rerollUsed,skip=this.isSupportSkip(),canClaim=this.isCanClaimShopGacha(state);
    const rewards=(state.rewardNames||[]).map(name=>`<li>${esc(name)}</li>`).join('');
    return `<section class="is-support-strip is-shop-support">
      <div><small>PHANTOM SUPPORT</small><h3>${skip?'5連ガチャ':'広告で5連ガチャ'}</h3>
      <p>抽選した装備5個をバッグに入手。</p></div>
      <button type="button" data-is-support="reroll" ${canClaim?'':'disabled'}>
        ${used?'使用済み':!canClaim?'空き枠不足':skip?'5連ガチャ':'▶ 広告を視聴'}${canClaim&&!skip?'<small>5連ガチャ</small>':''}
      </button>
      <p class="is-shop-support-limit">${!used&&!canClaim?'バッグに5枠の空きが必要です。':'1回のショップ遭遇につき <b>1回</b>'}</p>
      ${rewards?`<ul class="is-shop-rewards" aria-label="入手した装備">${rewards}</ul>`:''}
    </section>`;
  };
  P.isGrantShopReroll=function(state=this.isRun()?.shopSupport){
    const run=this.isRun();
    if(run?.shopSupport!==state||!this.isCanClaimShopGacha(state))return false;
    const rewards=Array.from({length:shopDrawCount},()=>this.isGenerateGear());
    state.rewardNames=rewards.map(gear=>this.isLootName?.(gear)||this.owgName?.(gear)||D().items[gear.itemId]?.name||gear.itemId);
    state.rerollUsed=true;
    run.lootBag.push(...rewards);
    this.isLog?.(`怪盗支援：装備${shopDrawCount}個を入手`);
    this.isSave?.();
    const panel=document.querySelector('#menu-panel');
    if(panel?.dataset?.panel==='infinite-score-shop')this.isRenderShop(panel,state.merchant);
    return true;
  };

  document.addEventListener('click',event=>{
    const support=event.target.closest('[data-is-support]'), game=window.arseneGame;
    if (!support || !game) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (support.disabled) return;
    if (support.dataset.isSupport==='bag') {
      game.isRequestSupport('infiniteBag',()=>game.isGrantBagExpansion());
    } else if (support.dataset.isSupport==='reroll') {
      const state=game.isRun()?.shopSupport;
      if (game.isCanClaimShopGacha(state)) game.isRequestSupport('infiniteReroll',()=>game.isGrantShopReroll(state));
    }
  },true);
})();
