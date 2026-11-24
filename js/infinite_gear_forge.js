(() => {
  'use strict';
  const D=window.ARSENE_DATA, P=window.BattleGame.prototype, G=D.infiniteGear;
  const panel=()=>document.querySelector('#menu-panel');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const equipped=(run,uid)=>Object.values(run.equipment||{}).includes(uid);
  const materialWarning=(run,item)=>[
    equipped(run,item.uid)?'装備中のため取り外されます。':'',
    item.locked?'ロック中の装備です。':''
  ].filter(Boolean).join('\n');

  P.isWorkshopGear=function(){
    return (this.isRun()?.lootBag||[]).filter(item=>G.isV2(item)&&item.otherWorldGear);
  };

  P.isForgeState=function(){
    const run=this.isRun();
    if (this.isForgeUI?.run!==run) {
      this.isForgeUI={run,mode:'merge',base:'',material:'',source:'',op:'',target:'',replace:'',busy:false};
    }
    return this.isForgeUI;
  };

  function canCommit(game,run,target,source) {
    return game.isRun()===run && game.isBagEntry(target.uid)===target && game.isBagEntry(source.uid)===source;
  }

  function commit(game,run,target,source,changes,logText) {
    if (!canCommit(game,run,target,source)) return false;
    const previous={lootBag:run.lootBag,equipment:run.equipment,log:run.log,hp:run.hp,mp:run.mp};
    const lootBag=run.lootBag.filter(item=>item.uid!==source.uid).map(item=>item.uid===target.uid?{...item,...changes}:item);
    const equipment=Object.fromEntries(Object.entries(run.equipment||{}).filter(([,uid])=>uid!==source.uid));
    const log=[...(run.log||[]),{floor:run.floor,at:Date.now(),message:logText}].slice(-120);
    Object.assign(run,{lootBag,equipment,log});
    try {
      const stats=game.totalStats();
      run.hp=Math.min(run.hp,stats.maxHp);
      run.mp=Math.min(run.mp,stats.maxMp);
      game.saveProfile();
    } catch (error) {
      Object.assign(run,previous);
      game.isForgeState().saveError=true;
      console.error('Infinite Score forge could not save',error);
      return false;
    }
    return true;
  }

  P.isForgeMerge=async function(targetUid,sourceUid) {
    const run=this.isRun(), target=this.isBagEntry(targetUid), source=this.isBagEntry(sourceUid);
    if (!run||!G.canMerge(target,source)) return false;
    const next=G.level(target)+1;
    const warning=materialWarning(run,source);
    const message=`${this.owgName(source)}は素材として完全に消滅します。\n強化先 +${G.number(G.level(target))} → +${G.number(next)}。OPは変わりません。\n${warning}`;
    if (!await this.isConfirm('同名装備を合成しますか？',message,{kicker:'SAME-NAME SYNTHESIS',confirmLabel:'合成する',danger:true})) return false;
    if (warning!==materialWarning(run,source)) return false;
    return commit(this,run,target,source,{plus:next},`異世界工房：${this.owgName(target)}を +${G.number(next)}に強化`);
  };

  P.isForgeTransfer=async function(sourceUid,targetUid,sourceIndex,targetIndex) {
    const run=this.isRun(), source=this.isBagEntry(sourceUid), target=this.isBagEntry(targetUid);
    if (!run||!G.canReplace(source,target,sourceIndex,targetIndex)) return false;
    const moved=source.ops[sourceIndex], replaced=target.ops[targetIndex];
    const warning=materialWarning(run,source);
    const message=`${this.owgName(source)}は素材として完全に消滅します。\n${G.opText(replaced)} → ${G.opText(moved)}\n${warning}`;
    if (!await this.isConfirm('OPを上書き移植しますか？',message,{kicker:'OPTION TRANSPLANT',confirmLabel:'移植する',danger:true})) return false;
    if (warning!==materialWarning(run,source)||!G.canReplace(source,target,sourceIndex,targetIndex)||
        source.ops[sourceIndex]!==moved||target.ops[targetIndex]!==replaced) return false;
    const ops=target.ops.map((op,index)=>index===targetIndex?{...moved}:op);
    return commit(this,run,target,source,{ops},`異世界工房：${this.owgName(target)}へ ${G.opText(moved)} を移植`);
  };

  function select(label,key,selected,choices,busy) {
    return `<label class="is-forge-input">${esc(label)}
      <select data-is-forge-field="${key}" ${busy||!choices.length?'disabled':''}>
        <option value="">${choices.length?'選択してください':'候補がありません'}</option>
        ${choices.map(([id,name])=>`<option value="${esc(id)}" ${selected===String(id)?'selected':''}>${esc(name)}</option>`).join('')}
      </select></label>`;
  }

  function itemChoices(game,rows) {
    return rows.map(item=>[item.uid,`${game.owgName(item)} +${G.number(G.level(item))} ／ ${G.number(item.obtainedFloor)}F${item.locked?' ／ ロック中':''}${equipped(game.isRun(),item.uid)?' ／ 装備中':''}`]);
  }

  function itemDetail(game,item,label,busy) {
    if (!item) return '';
    return `<article class="is-forge-v2-card${item.rarity==='infinity'?' owg-infinity':''}">
      <small>${esc(label)}</small><h3>${esc(game.owgName(item))}</h3><div class="owg-meta">${game.owgMetaHtml(item)}</div>
      <p>${esc(game.owgBaseText(item))}</p><ul>${item.ops.map(op=>`<li>${esc(G.opText(op))}</li>`).join('')}</ul>
      <button data-is-gear-lock="${esc(item.uid)}" aria-pressed="${!!item.locked}" ${busy?'disabled':''}>${item.locked?'ロック解除':'ロックする'}</button>
    </article>`;
  }

  function mergePanel(game,state,items) {
    const target=items.find(item=>item.uid===state.base);
    const candidates=items.filter(item=>G.canMerge(target,item));
    const source=candidates.find(item=>item.uid===state.material);
    const next=target?G.level(target)+1:0;
    const preview=source?game.owgBaseText({...target,plus:next}):'';
    const multiplier=D.infiniteGearV2.enhancementMultiplier;
    return {
      ready:!!source,
      html:`${select('1. 強化先','base',state.base,itemChoices(game,items),state.busy)}
        ${select('2. 同名・同レアの素材','material',state.material,itemChoices(game,candidates),state.busy)}
        <p>同名装備1個で強化値 +1。基礎能力に1回ごとに ×${multiplier}、OPは維持します。</p>
        ${preview?`<p class="is-forge-v2-preview">強化後 +${G.number(next)} ／ ${esc(preview)}</p>`:''}
        <div class="is-forge-v2-grid">${itemDetail(game,target,'強化先',state.busy)}${itemDetail(game,source,'消滅する素材',state.busy)}</div>`
    };
  }

  function transferPanel(game,state,items) {
    const source=items.find(item=>item.uid===state.source);
    const opIndex=state.op===''?-1:Number(state.op);
    const op=source?.ops[opIndex];
    const candidates=op?items.filter(item=>G.canTransfer(source,item)&&item.ops.some((_,i)=>G.canReplace(source,item,opIndex,i))):[];
    const target=candidates.find(item=>item.uid===state.target);
    const replacements=target?.ops.map((entry,i)=>[i,G.opText(entry)]).filter(([i])=>G.canReplace(source,target,opIndex,i))||[];
    const ready=!!target && state.replace!=='' && G.canReplace(source,target,opIndex,Number(state.replace));
    return {
      ready,
      html:`${select('1. 移植元','source',state.source,itemChoices(game,items.filter(item=>item.ops.length)),state.busy)}
        ${select('2. 移すOP','op',state.op,source?.ops.map((entry,i)=>[i,G.opText(entry)])||[],state.busy)}
        ${select('3. 同系統の移植先','target',state.target,itemChoices(game,candidates),state.busy)}
        ${select('4. 上書きするOP','replace',state.replace,replacements,state.busy)}
        <p>成功率100%。種類・数値・グレードを維持し、選んだ1枠を上書きします。</p>
        <div class="is-forge-v2-grid">${itemDetail(game,source,'消滅する移植元',state.busy)}${itemDetail(game,target,'移植先',state.busy)}</div>`
    };
  }

  P.isRenderWorkshop=function(root){
    if (!root||!this.isRun()) return;
    const items=this.isWorkshopGear(),state=this.isForgeState();
    const scroll=root.dataset.panel==='infinite-score-workshop'?root.scrollTop:0;
    const current=state.mode==='transfer'?transferPanel(this,state,items):mergePanel(this,state,items);
    root.dataset.panel='infinite-score-workshop';
    root.innerHTML=`<main class="is-forge-screen is-forge-v2">
      <header class="is-forge-header"><div><small>OTHER WORLD FORGE</small><h2>異世界工房</h2></div><button data-is-forge-exit ${state.busy?'disabled':''}>工房を出る</button></header>
      <nav class="is-forge-tabs" aria-label="加工方法">
        ${[['merge','装備合成・強化'],['transfer','OP移植']].map(([mode,label])=>`<button data-is-forge-mode="${mode}" aria-pressed="${state.mode===mode}" class="${state.mode===mode?'active':''}" ${state.busy?'disabled':''}>${label}</button>`).join('')}
      </nav>
      <div class="is-forge-v2-body">${items.length?current.html:'<p>Ver.2の装備を入手すると加工できます。旧装備はそのまま装備・持ち帰りができます。</p>'}
        ${current.ready?'<p class="is-forge-warning">素材にする装備は加工後に消滅します。</p>':''}
        <button class="is-forge-execute" data-is-forge-execute ${current.ready&&!state.busy?'':'disabled'}>${state.busy?'確認中…':state.mode==='transfer'?'移植を確認':'合成を確認'}</button>
      </div></main>`;
    root.scrollTop=scroll;
  };

  const clears={base:['material'],source:['op','target','replace'],op:['target','replace'],target:['replace'],material:[],replace:[]};
  document.addEventListener('change',event=>{
    const field=event.target.closest('.is-forge-v2 [data-is-forge-field]'), game=window.arseneGame;
    if (!field||!game?.isRun()) return;
    const state=game.isForgeState(),key=field.dataset.isForgeField;
    if (state.busy||!Object.hasOwn(clears,key)) return;
    state[key]=field.value;
    for (const reset of clears[key]) state[reset]='';
    game.isRenderWorkshop(panel());
    panel().querySelector(`[data-is-forge-field="${key}"]`)?.focus({preventScroll:true});
  },true);

  document.addEventListener('click',async event=>{
    const button=event.target.closest('.is-forge-v2 button'),game=window.arseneGame;
    if (!button||button.disabled||!game?.isRun()) return;
    const state=game.isForgeState();
    if (state.busy) return;
    if (button.hasAttribute('data-is-forge-exit')) {
      game.isRollStairs();
      game.renderMenuPanel('infinite-score');
      return;
    }
    if (button.dataset.isForgeMode) {
      state.mode=button.dataset.isForgeMode;
    } else if (button.dataset.isGearLock) {
      game.owgSetRunLock?.(button.dataset.isGearLock);
    } else if (button.hasAttribute('data-is-forge-execute')) {
      state.busy=true;
      game.isRenderWorkshop(panel());
      try {
        const success=state.mode==='merge' ? await game.isForgeMerge(state.base,state.material)
          : await game.isForgeTransfer(state.source,state.target,Number(state.op),Number(state.replace));
        if (success) {
          state.material=state.source=state.op=state.target=state.replace='';
          game.audio?.sfx?.('confirm');
        } else if (state.saveError) await game.isNotify('保存できませんでした','装備は加工前の状態に戻しました。');
      } finally {
        state.saveError=false;
        state.busy=false;
      }
    } else return;
    if (game.isRun()===state.run&&panel()?.dataset.panel==='infinite-score-workshop') game.isRenderWorkshop(panel());
  },true);
})();
