/* INFINITE SCORE — optional rewarded support for the iOS app. */
(() => {
  'use strict';
  const D=()=>window.ARSENE_DATA, G=window.BattleGame;
  if(!G)return;
  const P=G.prototype, copy=value=>JSON.parse(JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const shopDrawCount=5;

  P.isSupportAvailable=function(){return !!window.arseneAdMob?.isNativeIOS?.();};
  P.isShopAdPreview=function(){
    const host=window.location?.hostname;
    return !this.isSupportAvailable()&&(host==='localhost'||host==='127.0.0.1')
      &&this.localScenario?.id==='infinite-score-ready'&&this.localScenario?.ephemeral===true;
  };
  P.isSupportSkip=function(){return !!window.arseneQOffer?.hasAdSkip?.();};
  P.isRequestSupport=function(type,onGrant){
    const previewAd=type==='infiniteReroll'&&this.isShopAdPreview();
    if((!this.isSupportAvailable()&&!previewAd)||!window.arseneQOffer)return false;
    if(type==='infiniteReroll'&&!this.isCanClaimShopGacha())return false;
    return window.arseneQOffer.show(type,{onGrant,previewAd});
  };
  P.isEnsureSupportState=function(run=this.isRun?.()){
    if(!run)return null;
    run.support ||= {};
    run.support.insuranceUsed=!!run.support.insuranceUsed;
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
  P.isBegin=function(...args){const result=oldBegin.apply(this,args),run=this.isRun?.();if(run){run.support={insuranceUsed:false,bagExpansionUsed:false,shopCounter:0};this.isSave?.();}return result;};

  const oldShowBagFull=P.isShowBagFull;
  P.isShowBagFull=function(){oldShowBagFull.call(this);if(!this.isCanExpandBag())return;const modal=document.getElementById('is-modal'),actions=modal?.querySelector('.is-actions');if(!actions||actions.querySelector('[data-is-support="bag"]'))return;actions.insertAdjacentHTML('afterbegin',`<button class="is-support-button" data-is-support="bag">${this.isSupportLabel('+3枠')}<small>このRUNのみ／最大33枠</small></button>`);};
  P.isGrantBagExpansion=function(run=this.isRun?.(),pending=run?.pendingLoot){
    if(!pending||run!==this.isRun?.()||run.pendingLoot!==pending)return false;
    const support=this.isEnsureSupportState(run);
    if(support.bagExpansionUsed||this.isBagLimit()>=33||this.isBagUsed()>=33)return false;
    support.bagExpansionUsed=true;
    run.pendingLoot=null;
    document.getElementById('is-modal')?.remove();
    this.isAddLoot(pending);
    this.isLog?.('怪盗支援：バッグを33枠へ緊急拡張');
    this.isSave?.();
    const panel=document.querySelector('#menu-panel');
    if(panel?.dataset?.panel==='infinite-score-bag')this.isRenderBag(panel);
    if(panel?.dataset?.panel==='infinite-score'&&this.isRoomResult?.remapOnClose){
      const name=this.isLootName?.(pending)||this.owgName?.(pending)||D().items[pending.itemId]?.name||pending.itemId;
      this.isRenderRoomResult(`${name}を拾いました`,'LOOT BAGへ収めた。','item',{remapOnClose:true});
    }
    return true;
  };

  P.isStartShopEncounter=function(merchant=false){const run=this.isRun?.(),support=this.isEnsureSupportState(run);if(!run||!support)return null;support.shopCounter++;run.shopSupport={id:`${run.seed}-${support.shopCounter}`,merchant:!!merchant,rerollUsed:false};this.isSave?.();return run.shopSupport;};
  P.isEnsureShopEncounter=function(merchant=false){const run=this.isRun?.();return run?.shopSupport||this.isStartShopEncounter(merchant);};
  const oldResolveEvent=P.isResolveEvent;
  P.isResolveEvent=function(type){if(type==='shop'||type==='merchant')this.isStartShopEncounter(type==='merchant');return oldResolveEvent.call(this,type);};
  const oldRenderExplore=P.isRenderExplore;
  P.isRenderExplore=function(panel){const run=this.isRun?.();if(run?.phase==='defeatPending'){this.isRenderInsurancePanel(panel);return;}if(run)run.shopSupport=null;return oldRenderExplore.call(this,panel);};
  P.isCanClaimShopGacha=function(state=this.isRun()?.shopSupport){
    return !!state&&!state.rerollUsed&&this.isBagLimit()-this.isBagUsed()>=shopDrawCount;
  };
  P.isShopSupportHtml=function(){
    const previewAd=this.isShopAdPreview();
    if(!this.isSupportAvailable()&&!previewAd)return '';
    const state=this.isRun().shopSupport;
    const used=state.rerollUsed,skip=!previewAd&&this.isSupportSkip(),canClaim=this.isCanClaimShopGacha(state);
    const rewards=(state.rewardNames||[]).map(name=>`<li>${esc(name)}</li>`).join('');
    return `<section class="is-support-strip is-shop-support">
      <div><small>PHANTOM SUPPORT</small><h3>${skip?'5連ガチャ':previewAd?'テスト広告で5連ガチャ':'広告で5連ガチャ'}</h3>
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

  P.isInsuranceCandidates=function(run=this.isRun?.()){return (run?.lootBag||[]).filter(x=>x.kind==='equipment');};
  P.isInsuranceGearHTML=function(x){const item=D().items[x.itemId]||{},rar=this.isCfg?.().rarity?.[x.rarity]||{},stats=this.isGearValues?.(x)||{},main=Object.entries(stats).filter(([,v])=>v).map(([k,v])=>`${this.isCfg().opLabels?.[k]||k} ${v}`).join(' / '),ops=(x.ops||[]).map(o=>`${this.isCfg().opLabels?.[o.key]||o.key} R${o.rank}`).join(' / ');return `<button data-is-insurance-gear="${esc(x.uid)}"><b>${esc(this.owgName?.(x)||item.name||x.itemId)} +${x.plus||0}</b><span>${esc(rar.name||x.rarity||'EQUIPMENT')} ／ QUALITY ${x.quality||100}</span><small>${esc(main||'主要補正なし')}<br>${esc(ops||'OPなし')}</small></button>`;};
  P.isInsuranceBody=function(){const run=this.isRun?.(),support=this.isEnsureSupportState(run),list=this.isInsuranceCandidates(run),authorized=!!support?.insuranceAuthorized;if(!list.length)return `<div class="is-warning"><strong>ALL LOOT LOST</strong><p>救出対象となる装備はありません。</p><button data-is-insurance-skip>結果を確定</button></div>`;if(authorized)return `<section class="is-insurance"><small>PHANTOM INSURANCE // AUTHORIZED</small><h2>奪還する装備を1個選択</h2><div>${list.map(x=>this.isInsuranceGearHTML(x)).join('')}</div><button data-is-insurance-skip>保険を使わない</button></section>`;return `<section class="is-insurance"><small>PHANTOM INSURANCE // ONE PER RUN</small><h2>怪盗の保険</h2><p>失われる装備から1個だけ奪還できます。</p><button class="is-primary" data-is-support="insurance">${this.isSupportLabel('1個奪還')}</button><button data-is-insurance-skip>保険を使わない</button></section>`;};
  P.isShowInsuranceResult=function(){this.showResult('GAME OVER','無限奏廊からの脱出に失敗した。','DEFEAT // INSURANCE',this.isInsuranceBody());this.isHideDefaultResultMenu?.();};
  P.isRenderInsurancePanel=function(panel){panel.hidden=false;panel.dataset.panel='infinite-score-insurance';panel.innerHTML=`<main class="is-insurance-screen">${this.isHeader?.()||''}${this.isInsuranceBody()}</main>`;};
  P.isGrantInsurance=function(){const run=this.isRun?.(),support=this.isEnsureSupportState(run);if(!run||run.phase!=='defeatPending'||!support||support.insuranceUsed||support.insuranceAuthorized)return false;support.insuranceUsed=true;support.insuranceAuthorized=true;this.isSave?.();this.isShowInsuranceResult();return true;};
  P.isFinishDefeat=function(rescueUid=null){const run=this.isRun?.();if(!run||run.phase!=='defeatPending'||run.defeatFinalizing)return;run.defeatFinalizing=true;const rescue=this.isInsuranceCandidates(run).find(x=>x.uid===rescueUid)||null,lost=this.isBagUsed(),lostIds=new Set((run.importedItems||[]).map(x=>x.itemId));if(rescue){lostIds.delete(rescue.itemId);if(rescue.otherWorldGear){this.profile.otherWorldGear||=[];if(!this.profile.otherWorldGear.some(x=>x.uid===rescue.uid))this.profile.otherWorldGear.push(copy(rescue));}else this.profile.inventory[rescue.itemId]=(this.profile.inventory[rescue.itemId]||0)+(rescue.count||1);}const home=copy(run.homeEquipment||this.profile.equipment);for(const slot of Object.keys(home))if(lostIds.has(home[slot]))home[slot]=null;this.profile.equipment=home;this.profile.currentVitals=copy(run.homeVitals||this.profile.currentVitals);this.profile.infiniteScore={active:false,lastResult:'defeat',lostCount:Math.max(0,lost-(rescue?1:0)),rescuedItemId:rescue?.itemId||null,endedAt:Date.now()};this.profile.flags.owRestoreJobPending=true;this.saveProfile();this.audio.stopMusic?.(400);this.audio.sfx?.('defeat');this.showResult('GAME OVER',rescue?'装備を1個奪還し、無限奏廊から退いた。':'探索中に拾った戦利品は、すべて無限奏廊へ消えた。','ALL LOOT LOST',`<div class="is-warning"><strong>${rescue?'1 ITEM RESCUED':'LOST'}</strong><p>${rescue?`${esc(this.owgName?.(rescue)||D().items[rescue.itemId]?.name||rescue.itemId)}を奪還しました。`: `${lost}枠の戦利品を失いました。`}</p></div>`);};
  const oldDefeat=P.defeat;
  P.defeat=async function(...args){if(this.battleMode!=='infiniteScore'||!this.isRun?.())return oldDefeat.apply(this,args);if(this.finished&&this.isRun().phase==='defeatPending')return;this.finished=true;this.endAutoBattle?.();const run=this.isRun(),support=this.isEnsureSupportState(run),candidates=this.isInsuranceCandidates(run);run.phase='defeatPending';run.defeatPendingAt=Date.now();this.saveProfile();this.audio.stopMusic?.(400);this.audio.sfx?.('defeat');if(!this.isSupportAvailable()||support.insuranceUsed||!candidates.length){this.isFinishDefeat();return;}this.isShowInsuranceResult();};

  document.addEventListener('click',async event=>{const game=window.arseneGame;if(!game)return;const support=event.target.closest('[data-is-support]'),skip=event.target.closest('[data-is-insurance-skip]'),gear=event.target.closest('[data-is-insurance-gear]');if(!support&&!skip&&!gear)return;event.preventDefault();event.stopImmediatePropagation();if(support){if(support.disabled)return;const type=support.dataset.isSupport;if(type==='bag'){const run=game.isRun(),pending=run?.pendingLoot;if(pending)game.isRequestSupport('infiniteBag',()=>game.isGrantBagExpansion(run,pending));}else if(type==='reroll'){const state=game.isRun()?.shopSupport;if(!game.isCanClaimShopGacha(state))return;game.isRequestSupport('infiniteReroll',()=>game.isGrantShopReroll(state));}else game.isRequestSupport('infiniteInsurance',()=>game.isGrantInsurance());return;}if(skip){if(await game.isConfirm('怪盗の保険を使わず確定しますか？','失われる装備は元に戻せません。',{kicker:'PHANTOM INSURANCE',confirmLabel:'確定する',danger:true}))game.isFinishDefeat();return;}if(gear){const x=game.isInsuranceCandidates().find(v=>v.uid===gear.dataset.isInsuranceGear);if(x&&await game.isConfirm('この装備を奪還しますか？',`${game.owgName?.(x)||D().items[x.itemId]?.name||x.itemId} +${x.plus||0}\nQUALITY ${x.quality||100}`,{kicker:'PHANTOM INSURANCE',confirmLabel:'奪還する'}))game.isFinishDefeat(x.uid);}},true);
})();
