// ARSÈNE RPG / 無限奏廊 - INFINITE SCORE
(() => {
  'use strict';
  const BG = window.BattleGame;
  if (!BG) return;
  const P = BG.prototype, $ = s => document.querySelector(s), D = () => window.ARSENE_DATA;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const copy = v => JSON.parse(JSON.stringify(v));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Native dialogs suspend WebAudio on iOS. Keep decisions inside the game UI.
  P.isGameDialog = function ({ kicker='INFINITE SCORE', title='', message='', choices=[], danger=false }={}) {
    document.getElementById('is-game-dialog')?.remove();
    return new Promise(resolve => {
      const root=document.createElement('div');root.id='is-game-dialog';root.className='is-modal is-game-dialog';
      const buttons=choices.map((choice,index)=>`<button type="button" data-is-dialog-choice="${index}" class="${choice.danger?'danger':''}"><b>${esc(choice.label)}</b>${choice.note?`<span>${esc(choice.note)}</span>`:''}</button>`).join('');
      root.innerHTML=`<div role="dialog" aria-modal="true" aria-labelledby="is-dialog-title"><small>${esc(kicker)}</small><h2 id="is-dialog-title">${esc(title)}</h2>${message?`<p>${esc(message)}</p>`:''}<div class="is-dialog-choices">${buttons}</div><button type="button" class="is-dialog-cancel" data-is-dialog-cancel>${danger?'やめる':'閉じる'}</button></div>`;
      const finish=value=>{root.remove();resolve(value);};
      root.addEventListener('click',e=>{const pick=e.target.closest('[data-is-dialog-choice]');if(pick){finish(Number(pick.dataset.isDialogChoice));return;}if(e.target===root||e.target.closest('[data-is-dialog-cancel]'))finish(-1);});
      document.body.appendChild(root);root.querySelector('[data-is-dialog-choice], [data-is-dialog-cancel]')?.focus();
    });
  };
  P.isNotify = function (title,message='',options={}) { return this.isGameDialog({title,message,choices:[{label:options.label||'確認'}],...options}); };
  P.isConfirm = async function (title,message='',options={}) { return (await this.isGameDialog({title,message,danger:true,choices:[{label:options.confirmLabel||'決定する',note:options.confirmNote||'',danger:!!options.danger}],...options}))===0; };
  P.isChoose = async function (title, choices, options={}) { const index=await this.isGameDialog({title,choices:(choices||[]).map(x=>typeof x==='string'?{label:x}:x),...options});return index>=0?index:null; };
  P.isShowLootPop = function (entry,count=1) {
    const item=D().items[entry?.itemId]||{},name=entry?.otherWorldGear&&this.owgName?this.owgName(entry):(item.name||entry?.itemId||'戦利品');
    document.querySelector('.is-loot-pop')?.remove();const pop=document.createElement('div');pop.className='is-loot-pop';pop.setAttribute('role','status');pop.innerHTML=`<small>LOOT ACQUIRED</small><b>${esc(name)}${count>1?` ×${count}`:''}を拾った</b>`;document.body.appendChild(pop);
    requestAnimationFrame(()=>pop.classList.add('show'));setTimeout(()=>{pop.classList.remove('show');setTimeout(()=>pop.remove(),260);},1900);
  };

  P.isCfg = function () { return D().infiniteScore || {}; };
  P.isInfiniteScoreUnlocked = function () { return !!(this.profile?.flags?.infiniteScoreUnlocked && this.isJobUnlocked?.('phantomThief')); };
  P.isDebugAllowed = function () { return this.isInfiniteScoreUnlocked() || !!window.arseneDebugRoom?.isUnlocked?.() || this.localScenario?.id === 'infinite-score-ready'; };
  P.isRun = function () { return this.profile?.infiniteScore?.active ? this.profile.infiniteScore : null; };
  P.isEnsureRunShape = function (run = this.isRun()) {
    if (!run) return null;
    run.version = 2;
    run.floor = Math.max(1, Number(run.floor) || 1);
    run.encounterCountOnFloor = Math.max(0, Number(run.encounterCountOnFloor) || 0);
    run.lootBag = Array.isArray(run.lootBag) ? run.lootBag : [];
    // v2以前のRUNでスタックされていた品も、無限奏廊内では1個＝1枠へ展開する。
    if (run.lootBag.some(entry => (Number(entry?.count) || 1) > 1)) {
      const split = [];
      for (const entry of run.lootBag) {
        const count = Math.max(1, Math.floor(Number(entry?.count) || 1));
        for (let i = 0; i < count; i++) split.push({ ...copy(entry), uid: i ? `${entry.uid}-split-${i + 1}` : entry.uid, count:1 });
      }
      run.lootBag = split;
    }
    run.importedItems = Array.isArray(run.importedItems) ? run.importedItems : [];
    run.equipment = run.equipment && typeof run.equipment === 'object' ? run.equipment : {};
    run.buffs = { treasureBonus:0, rareBonus:0, goldBonus:0, qualityBattles:0, ...(run.buffs || {}) };
    run.log = Array.isArray(run.log) ? run.log : [];
    run.dungeonGold = Math.max(0, Number(run.dungeonGold) || 0);
    run.seed = (Number(run.seed) || 527) >>> 0;
    run.rngState = (Number(run.rngState) || run.seed) >>> 0;
    run.uidCounter = Math.max(run.lootBag.length, Number(run.uidCounter) || 0);
    const map=run.floorMap,validMap=map&&map.floor===run.floor&&Array.isArray(map.nodes)&&map.nodes.length>0&&Array.isArray(map.links)&&map.nodes.some(n=>n?.id===map.currentId);
    if (!validMap) { run.floorMap=null; run.pendingChoices=null; }
    return run;
  };
  P.isSave = function () { this.saveProfile(); return this.isRun(); };
  P.isPlayExploreMusic = function () { this.audio?.playTrack?.(encodeURI('音楽系/ダンジョン/ダンジョン1Moonlit Reliquary.mp3')); };
  P.isRand = function () {
    const run = this.isRun();
    if (!run) return Math.random();
    let x = (run.rngState || run.seed || 527) >>> 0;
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    run.rngState = x;
    return x / 4294967296;
  };
  P.isPickWeighted = function (table, key = 'weight') {
    const rows = (table || []).filter(Boolean), total = rows.reduce((n, x) => n + Math.max(0, Number(x[key]) || 0), 0);
    let r = this.isRand() * total;
    for (const row of rows) { r -= Math.max(0, Number(row[key]) || 0); if (r <= 0) return row; }
    return rows[rows.length - 1];
  };
  P.isArcanaDropRate=function(floor=this.isRun()?.floor||1){return Math.min(.20,.009+Math.max(1,Number(floor)||1)*.001);};
  P.isRollMonsterArcana=function(){const r=this.isRun();if(!r||this.isRand()>=this.isArcanaDropRate(r.floor))return null;const kind=this.isPickWeighted([{id:'stat',weight:70},{id:'protectionArcana',weight:20},{id:'rebirthArcana',weight:10}])?.id;if(kind!=='stat')return kind;const pool=(D().arcana?.weekly||[]).map(x=>x.id).filter(id=>D().items[id]);return pool[Math.floor(this.isRand()*pool.length)]||'arcanaChaos';};
  P.isLog = function (message, details = null) {
    const run = this.isRun(); if (!run) return;
    run.log ||= []; run.log.push({ floor: run.floor, at: Date.now(), message, details });
    if (run.log.length > 120) run.log.shift();
    this.saveProfile();
  };
  P.isEffectiveCfg = function () { return { ...this.isCfg(), ...(this.profile.infiniteScoreDebug || {}) }; };
  P.isBagUsed = function () {
    const run = this.isRun(), bag = run?.lootBag || [];
    if (this.isEffectiveCfg().equippedUsesBag !== false && Number(this.isEffectiveCfg().equippedUsesBag) !== 0) return bag.length;
    const equipped = new Set(Object.values(run?.equipment || {}).filter(Boolean));
    return bag.reduce((count, entry) => count + (equipped.has(entry.uid) ? 0 : 1), 0);
  };
  P.isBagLimit = function () { return Number(this.isEffectiveCfg().bagLimit) || 30; };
  P.isBagEntry = function (uid) { return (this.isRun()?.lootBag || []).find(x => x.uid === uid); };
  P.isUid = function (prefix = 'loot') { const run = this.isRun(); run.uidCounter = (run.uidCounter || 0) + 1; return `${prefix}-${run.seed}-${run.uidCounter}`; };

  // localhost専用：通常セーブへ書き込まない奏廊確認データ。
  P.prepareLocalInfiniteScoreScenario = function () {
    this.localScenario = { id:'infinite-score-ready', ephemeral:true };
    this.profile = copy(this.profile);
    this.profile.flags ||= {};
    this.profile.inventory ||= {};
    this.profile.jobs ||= {};
    this.profile.unlockedJobs = [...new Set([...(this.profile.unlockedJobs||[]),'phantomThief'])];
    Object.assign(this.profile.flags,{phantomThiefUnlocked:true,otherWorldUnlocked:true,infiniteScoreUnlocked:true,phantomTutorialViewed:true,phantomMascotGuided:true});
    this.profile.currentJob = 'phantomThief';
    this.profile.jobs.phantomThief = {level:8,exp:0};
    this.profile.level = Math.max(12,this.profile.level||1);
    this.profile.baseStats = {...this.profile.baseStats,maxHp:Math.max(150,this.profile.baseStats.maxHp||0),maxMp:Math.max(80,this.profile.baseStats.maxMp||0),str:Math.max(18,this.profile.baseStats.str||0),vit:Math.max(18,this.profile.baseStats.vit||0),mag:Math.max(18,this.profile.baseStats.mag||0),mnd:Math.max(18,this.profile.baseStats.mnd||0),agi:Math.max(16,this.profile.baseStats.agi||0),dex:Math.max(16,this.profile.baseStats.dex||0),luk:Math.max(14,this.profile.baseStats.luk||0)};
    Object.assign(this.profile.inventory,{potion:8,manaPotion:8});
    const stats=this.totalStats();
    this.profile.currentVitals={hp:stats.maxHp,mp:stats.maxMp};
  };
  P.prepareLocalInfiniteForgeScenario = function () {
    this.prepareLocalInfiniteScoreScenario();
    // 工房の単体確認では、初回だけのセリペス警告会話を再生しない。
    this.profile.flags.infiniteScoreWarningSeen = true;
    this.isBegin([]);
    const run=this.isRun();run.floor=26;run.dungeonGold=1060;
    const first=this.isGenerateGear({stars:4});this.isAddLoot(first);
    const duplicate={...copy(first),uid:this.isUid('forge-mat'),plus:0,tuneLevel:0,quality:Math.max(87,(first.quality||100)-2)};this.isAddLoot(duplicate);
    for(let i=0;i<4;i++)this.isAddLoot(this.isGenerateGear({stars:i<2?4:3}));
    run.equipment[D().items[first.itemId]?.slot||'rightHand']=first.uid;
    const panel=$('#menu-panel');if(panel.parentNode!==document.body)document.body.appendChild(panel);panel.hidden=false;panel.style.display='block';
    this.localScenario.id='infinite-forge-ready';this.isRenderWorkshop(panel);
  };

  const origLoad = P.loadProfile;
  P.loadProfile = function () {
    const p = origLoad.call(this);
    p.infiniteScore ||= { active: false };
    p.infiniteScoreDebug ||= {};
    p.infiniteScoreGear ||= [];
    return p;
  };
  const origFresh = P.freshProfile;
  P.freshProfile = function () {
    const p = origFresh.call(this);
    p.infiniteScore = { active: false };
    p.infiniteScoreDebug = {};
    p.infiniteScoreGear = [];
    return p;
  };

  // ── RUN装備を既存戦闘式へ安全に合流 ─────────────────────
  P.isRunGear = function () {
    const run = this.isRun(); if (!run) return [];
    return Object.values(run.equipment || {}).map(uid => this.isBagEntry(uid)).filter(Boolean);
  };
  const origTotalStats = P.totalStats;
  P.totalStats = function (...args) {
    const run = this.isRun();
    const total = run ? origTotalStats.call(this, {}) : origTotalStats.apply(this, args);
    for (const gear of this.isRunGear()) {
      if (gear.otherWorldGear) continue;
      const base = D().items[gear.itemId] || this.equipmentDefinition?.(gear.itemId);
      const mult = gear.generated ? (gear.multiplier || 1) : 1;
      for (const [k, v] of Object.entries(base?.bonuses || {})) total[k] = (total[k] || 0) + Math.round(v * mult);
      for (const op of gear.ops || []) if (['str','vit','mag','mnd','agi','dex','luk','maxHp','maxMp','critBonus'].includes(op.key)) total[op.key] = (total[op.key] || 0) + op.value;
    }
    total.def = total.vit;
    return total;
  };
  const origCombatStats = P.equipmentCombatStats;
  P.equipmentCombatStats = function (...args) {
    const run = this.isRun();
    const out = run ? origCombatStats.call(this, {}) : origCombatStats.apply(this, args), keys = ['attackPower','defensePower','magicAttackPower','magicDefensePower'];
    for (const gear of this.isRunGear()) {
      if (gear.otherWorldGear) continue;
      const base = this.equipmentDefinition?.(gear.itemId) || {}, mult = gear.generated ? (gear.multiplier || 1) : 1;
      for (const key of keys) out[key] = (out[key] || 0) + Math.round((Number(base[key]) || 0) * mult);
      for (const op of gear.ops || []) if (keys.includes(op.key)) out[op.key] = (out[op.key] || 0) + op.value;
      if (gear.plus) for (const key of keys) out[key] += Math.round((Number(base[key]) || 0) * mult * gear.plus * .08);
    }
    return out;
  };
  const origEquippedWeapon = P.equippedWeapon;
  P.equippedWeapon = function () {
    const uid = this.isRun()?.equipment?.rightHand, gear = uid && this.isBagEntry(uid), weapon = gear && D().weapons[gear.itemId];
    return weapon || origEquippedWeapon.call(this);
  };
  const origEffectRate = P.equipmentEffectRate;
  P.equipmentEffectRate = function (type, ...rest) {
    let value = origEffectRate.call(this, type, ...rest);
    for (const gear of this.isRunGear()) value += Number((this.equipmentDefinition?.(gear.itemId) || {}).effects?.[type]) || 0;
    return value;
  };
  const origPersistVitals = P.persistVitals;
  P.persistVitals = function () {
    const run=this.isRun();
    if(this.battleMode==='infiniteScore'&&run&&this.player){run.hp=this.player.hp;run.mp=this.player.mp;this.saveProfile();return;}
    return origPersistVitals.call(this);
  };

  // ── 入口 / 持ち込み ───────────────────────────────────────
  const origRenderOw = P.renderOtherWorldPanel;
  P.renderOtherWorldPanel = function (panel) {
    origRenderOw.call(this, panel);
    const slot = panel.querySelector('[data-infinite-entry]');
    if (!slot) return;
    const unlocked = this.isDebugAllowed();
    if (!unlocked) {
      slot.innerHTML = `<article class="ow-mode-card infinite locked"><div class="ow-mode-badges"><em>LOCKED</em><span>INFINITE SCORE</span></div><h3>無限奏廊</h3><strong>第三奏卿の先に眠る異世界</strong><p>第三奏卿《不落の反奏騎士》セリペスを撃破すると解放されます。</p><div class="ow-mode-lock">D3 踏破で解放</div></article>`;
      return;
    }
    const active = this.isEnsureRunShape(this.isRun());
    if (active) this.saveProfile();
    slot.innerHTML = `<article class="ow-mode-card infinite"><div class="ow-mode-badges"><em>高危険度</em><span>INFINITE SCORE</span></div><h3>無限奏廊</h3><strong>${active ? `FLOOR ${active.floor}から再開` : '終わりなき探索へ'}</strong><p>HP・MPを引き継いで進む連続探索。死亡すると持ち込み品と探索中の戦利品を失います。</p><div class="ow-mode-stats"><span><small>進行</small><b>${active ? `FLOOR ${active.floor}` : 'ENDLESS'}</b></span><span><small>帰還</small><b>任意</b></span><span><small>HP / MP</small><b>継続</b></span><span><small>死亡時</small><b>戦利品消失</b></span></div><button class="ow-mode-action danger" data-is-action="${active ? 'resume' : 'warning'}"><b>${active ? '探索を再開' : '無限奏廊へ'}</b><span>${active ? '前回の続きから侵入' : '危険事項を確認して侵入'}</span></button></article>`;
  };
  P.isRenderWarning = function (panel) {
    panel.innerHTML = `<button class="panel-home" data-lenny="otherworld">異世界へ戻る</button><small>INFINITE SCORE</small><h2>無限奏廊</h2>
      <div class="is-warning"><strong>WARNING</strong><p>持ち込んだ装備・アイテムも、死亡時にはすべて失われます。</p><p>持ち帰れるのは、生還した時のみです。</p></div>
      <p class="ow-rule">「持ち帰るまで、それはお前のものじゃない。」</p>
      <div class="is-actions"><button class="is-primary" data-is-action="import">侵入準備へ</button><button data-lenny="otherworld">戻る</button></div>`;
  };
  P.isImportable = function () {
    return Object.entries(this.profile.inventory || {}).filter(([id, count]) => count > 0 && D().items[id] && !D().items[id].keyItem && !D().items[id].arcanaStat);
  };
  P.isRenderImport = function (panel) {
    if (!this.isPhantomThief()) {
      const current=D().jobs[this.profile.currentJob]?.name||this.profile.currentJob;
      const unlocked=this.isJobUnlocked?.('phantomThief');
      panel.innerHTML = `<button class="panel-home" data-lenny="otherworld">戻る</button><small>JOB CHANGE REQUIRED</small><h2>無限奏廊 侵入確認</h2>
        <div class="is-warning"><p>無限奏廊へ侵入できるのは<br><b>PHANTOM THIEF</b>のみです。</p><div class="ow-job-swap"><span>${esc(current)}</span><i>▶</i><b>PHANTOM THIEF</b></div></div>
        ${unlocked?'<div class="is-actions"><button class="is-primary" data-is-job-change-import>PHANTOM THIEFに切り替えて侵入準備へ</button><button data-lenny="otherworld">戻る</button></div>':'<div class="is-warning"><p>PHANTOM THIEFがまだ解放されていません。</p></div>'}`; return;
    }
    const rows = this.isImportable();
    panel.innerHTML = `<button class="panel-home" data-is-action="warning">警告へ戻る</button><small>LOADOUT</small><h2>持ち込み選択</h2><p>選んだ物はRUN専用バッグへ移され、死亡時にロストします。装備もバッグ1枠を使用します。</p>
      <div class="is-import">${rows.length ? rows.map(([id,count]) => { const i=D().items[id]; return `<label><input type="number" min="0" max="${count}" value="0" data-is-import="${esc(id)}"><span><b>${esc(i.name)}</b><small>${esc(i.category === 'equipment' ? `装備 / ${i.slot}` : i.category)}</small></span><em>所持 ×${count}</em></label>`; }).join('') : '<p>持ち込める所持品がありません。手ぶらで侵入できます。</p>'}</div>
      <div class="is-actions"><button class="is-primary" data-is-action="begin">選択した物を持って侵入</button><button data-is-action="begin-empty">手ぶらで侵入</button></div>`;
  };
  P.isBegin = function (selected = []) {
    if (!this.isDebugAllowed() || !this.isPhantomThief()) return;
    const cfg = this.isEffectiveCfg(), seed = (Date.now() ^ Math.floor(Math.random()*0xffffffff)) >>> 0;
    const bag = [];
    for (const id of selected.slice(0, cfg.bagLimit || 30)) {
      if (!(this.profile.inventory[id] > 0)) continue;
      this.profile.inventory[id]--;
      bag.push({ uid: `import-${seed}-${bag.length+1}`, kind: D().items[id]?.category === 'equipment' ? 'equipment' : 'item', itemId:id, count:1, imported:true, generated:false, plus:0, ops:[] });
    }
    const stats = origTotalStats.call(this), vitals = this.storedVitals(stats), homeEquipment = copy(this.profile.equipment || {});
    this.profile.equipment = { rightHand:null, leftHand:null, head:null, body:null, arms:null, feet:null, accessory:null };
    this.profile.infiniteScore = { active:true, version:2, floor:1, encounterCountOnFloor:0, stairsFound:false, phase:'explore', lootBag:bag, equipment:{}, dungeonGold:0, buffs:{ treasureBonus:0, rareBonus:0, goldBonus:0, qualityBattles:0 }, importedItems:copy(bag), homeEquipment, homeVitals:copy(this.profile.currentVitals || vitals), seed, rngState:seed, uidCounter:bag.length, hp:vitals.hp, mp:vitals.mp, log:[], forcedEvent:null, floorMap:null, opTransferReserved:{ enabled:false, version:1 }, startedAt:Date.now() };
    this.isCreateFloorMap();
    this.isLog('RUN開始', { seed, imported:selected }); this.saveProfile(); this.isPlayExploreMusic(); this.isRenderExplore($('#menu-panel'));
  };

  // ── 画面 ──────────────────────────────────────────────────
  P.isHeader = function () { const r=this.isRun(); return `<div class="is-head"><b>無限奏廊</b><span>FLOOR ${r.floor}</span><small>SEED ${r.seed}</small></div><div class="is-run-grid"><div><small>HP</small><b>${r.hp} / ${this.totalStats().maxHp}</b></div><div><small>MP</small><b>${r.mp} / ${this.totalStats().maxMp}</b></div><div><small>LOOT BAG</small><b>${this.isBagUsed()} / ${this.isBagLimit()}</b></div><div><small>奏貨</small><b>${r.dungeonGold}</b></div></div>`; };
  P.isToolbar = function () { return `<div class="is-toolbar"><button data-is-action="explore">探索</button><button data-is-action="map">MAP</button><button data-is-action="bag">バッグ</button><button data-is-action="equipment">装備</button><button data-is-action="abilities">アビリティ</button><button data-is-action="return-check">RETURN</button></div>`; };

  const originalOwJobNavHTML = P.owJobNavHTML;
  P.owJobNavHTML = function () {
    if (this.isRun()) return '<div class="ow-jobnav"><button class="ow-jobnav-back" data-lenny="ability-back">← 無限奏廊へ戻る</button></div>';
    return typeof originalOwJobNavHTML === 'function' ? originalOwJobNavHTML.call(this) : '';
  };
  P.isOpenAbilitySettings = function () {
    this.jobUI ||= { tab:'abilitySet', detailId:null, modal:null, passiveSlotIdx:null, passiveFilter:'all' };
    this.jobUI.tab = 'abilitySet';
    this.jobUI.detailId = null;
    this.jobUI.modal = null;
    this.owAbilityReturn = true;
    this.owAbilityFrom = 'infinite-score';
    this.renderMenuPanel('job');
  };
  P.isCreateFloorMap = function () {
    const run=this.isRun(); if(!run)return null;
    const cfg=this.isEffectiveCfg(),rows=Math.max(5,Math.round(cfg.mapRows||8)),width=Math.max(3,Math.round(cfg.mapWidth||3));
    const nodes=[],links=[],hints=Object.entries(this.isCfg().hints||{}),makeNode=(row,col,start=false)=>{
      const type=start?'encounter':this.isPickWeighted(this.isEventTable()).id;
      const matching=hints.filter(([,h])=>h.events.includes(type)),source=matching.length?matching:hints,[hintId,hint]=source[Math.floor(this.isRand()*source.length)];
      const node={id:`f${run.floor}-r${row}-c${col}-${nodes.length}`,row,col,type,hintId,hint:hint?.text||'気配を読めない……',visited:start,cleared:start};nodes.push(node);return node;
    };
    let previous=[makeNode(0,Math.floor(width/2),true)];
    for(let row=1;row<rows;row++){
      const count=1+Math.floor(this.isRand()*Math.min(3,width)),cols=[];
      while(cols.length<count){const col=Math.floor(this.isRand()*width);if(!cols.includes(col))cols.push(col);}cols.sort((a,b)=>a-b);
      const current=cols.map(col=>makeNode(row,col));
      const advancing=previous.filter((_,i)=>previous.length===1||i===0||this.isRand()>.22);
      for(const from of advancing){const ranked=current.slice().sort((a,b)=>Math.abs(a.col-from.col)-Math.abs(b.col-from.col)),roll=this.isRand(),amount=Math.min(ranked.length,roll<.12?3:roll<.62?2:1);for(const to of ranked.slice(0,amount))links.push([from.id,to.id]);}
      for(const to of current)if(!links.some(([,b])=>b===to.id)){const from=advancing.slice().sort((a,b)=>Math.abs(a.col-to.col)-Math.abs(b.col-to.col))[0];links.push([from.id,to.id]);}
      previous=current;
    }
    run.floorMap={floor:run.floor,width,rows,nodes,links,currentId:nodes[0].id,generatedAt:Date.now()};run.pendingChoices=null;this.isLog(`FLOOR ${run.floor} MAP生成`,{nodes:nodes.length,links:links.length});return run.floorMap;
  };
  P.isFloorMap = function () { const r=this.isEnsureRunShape();if(!r)return null;if(!r.floorMap||r.floorMap.floor!==r.floor)this.isCreateFloorMap();return r.floorMap; };
  P.isMapNode = function (id) { return this.isFloorMap()?.nodes.find(n=>n.id===id)||null; };
  P.isMapNextNodes = function () { const map=this.isFloorMap();if(!map)return[];const ids=map.links.filter(([a])=>a===map.currentId).map(([,b])=>b);return ids.map(id=>this.isMapNode(id)).filter(n=>n&&!n.visited); };
  P.isMapBackNode = function () { const map=this.isFloorMap();if(!map)return null;const id=map.links.slice().reverse().find(([,b])=>b===map.currentId)?.[0];return id?this.isMapNode(id):null; };
  P.isRoomBackground = function (node=this.isMapNode(this.isFloorMap()?.currentId)) {
    if(!node)return'assets/bg/infinite-score/corridor-straight.png';
    if(node.type==='treasure')return node.id.length%2?'assets/bg/infinite-score/treasure-corridor.png':'assets/bg/infinite-score/treasure-room.png';
    const exits=this.isFloorMap()?.links.filter(([a])=>a===node.id).length||0;
    if(exits<=0)return'assets/bg/infinite-score/corridor-dead-end.png';
    if(exits===1)return'assets/bg/infinite-score/corridor-straight.png';
    if(exits===2)return'assets/bg/infinite-score/corridor-branch-two.png';
    return'assets/bg/infinite-score/corridor-branch-three.png';
  };
  P.isClearMapRoom = function () { const map=this.isFloorMap(),node=map&&this.isMapNode(map.currentId);if(node){node.visited=true;node.cleared=true;} };
  P.isAtStairs = function () { return !!this.isMapNode(this.isFloorMap()?.currentId)?.stairs; };
  P.isMapBack = function () { const map=this.isFloorMap(),back=this.isMapBackNode();if(!map||!back)return;map.currentId=back.id;this.isRun().stairsFound=!!back.stairs;this.isRun().pendingChoices=null;this.isExploreOverlayMode=null;this.isStairPromptDismissed=null;this.isLog('行き止まりから前の分岐へ戻った');this.isRenderExplore($('#menu-panel')); };
  P.isMapEventIcon = function (node) { if(node.stairs)return'◇';if(!node.cleared)return node.visited?'◆':'';return ({rare:'★',treasure:'◇',trap:'×',item:'＋',gold:'G',shop:'S',merchant:'M',card:'♬',sublime:'✦'})[node.type]||''; };
  P.isMapKnownIds = function (mini=false) {
    const map=this.isFloorMap(),known=new Set(),current=this.isMapNode(map?.currentId);if(!map||!current)return known;
    const adjacent=new Set();for(const [a,b] of map.links){if(a===current.id)adjacent.add(b);if(b===current.id)adjacent.add(a);}
    for(const node of map.nodes)if(node.visited||adjacent.has(node.id)||node.id===current.id){if(!mini||Math.abs(node.row-current.row)<=2)known.add(node.id);}
    return known;
  };
  P.isMapHtml = function (mini=false) {
    const map=this.isFloorMap();if(!map)return'';const current=this.isMapNode(map.currentId),known=this.isMapKnownIds(mini),next=new Set(this.isMapNextNodes().map(n=>n.id));
    // 縦画面の進行方向に合わせ、現在地（入口側）を下、深部を上へ描く。
    // ミニマップは現在地の一つ手前から三つ先までを同じ座標系で切り出す。
    const width=mini?126:230,height=mini?112:360,pad=mini?8:16;
    // 左右端へ張り付き過ぎないよう、通路を中央約68%へ寄せる。
    const sideInset=width*.24,mapLeft=pad+sideInset,mapRight=width-pad-sideInset;
    const laneSpan=(mapRight-mapLeft)/Math.max(1,map.width-1),miniBase=Math.max(0,(current?.row||0)-1);
    const rowSpan=mini?(height-pad*2)/3:(height-pad*2)/Math.max(1,map.rows-1);
    const xy=n=>{const weave=((((n.row*7+n.col*3)%3)-1)*laneSpan*.12);return{x:Math.max(mapLeft,Math.min(mapRight,mapLeft+n.col*laneSpan+weave)),y:height-pad-(n.row-(mini?miniBase:0))*rowSpan};};
    const cells=[],addSegment=(p,q)=>{const steps=Math.max(1,Math.ceil(Math.max(Math.abs(q.x-p.x),Math.abs(q.y-p.y))/(mini?7:9)));for(let i=0;i<=steps;i++){const t=i/steps;cells.push(`<i class="is-map-cell" style="left:${(p.x+(q.x-p.x)*t).toFixed(1)}px;top:${(p.y+(q.y-p.y)*t).toFixed(1)}px"></i>`);}};for(const [a,b] of map.links){if(!known.has(a)||!known.has(b))continue;const p=xy(this.isMapNode(a)),q=xy(this.isMapNode(b)),midY=(p.y+q.y)/2,turnA={x:p.x,y:midY},turnB={x:q.x,y:midY};addSegment(p,turnA);addSegment(turnA,turnB);addSegment(turnB,q);}
    const nodes=map.nodes.filter(n=>known.has(n.id)).map(n=>{const p=xy(n),cls=n.id===map.currentId?' current':n.visited?' visited':next.has(n.id)?' reachable':'';return `<span class="is-map-node${cls}" style="left:${p.x}px;top:${p.y}px" title="${esc(n.visited?n.type:'未踏')}" aria-label="${n.id===map.currentId?'現在地':n.visited?'訪問済み':'未踏の分岐'}">${this.isMapEventIcon(n)}</span>`;}).join('');
    return `<section class="is-map${mini?' is-map-mini':''}"><div class="is-map-title"><b>${mini?'迷宮マップ':`FLOOR ${map.floor} MAP`}</b><span>${map.nodes.filter(n=>n.visited).length} / ${map.nodes.length}</span></div><div class="is-map-canvas" style="--map-width:${width}px;--map-height:${height}px">${cells.join('')}${nodes}</div>${mini?'':'<small>紫：探索済み　赤：現在地　白菱形：階段</small>'}</section>`;
  };
  P.isRenderMap = function(panel){const next=this.isMapNextNodes(),back=this.isMapBackNode();panel.dataset.panel='infinite-score-map';panel.innerHTML=`<div class="is-full-map-view"><button class="panel-home" data-is-action="explore">探索画面へ</button><small>INFINITE SCORE // FLOOR MAP</small><h2>無限奏廊 FLOOR ${this.isRun().floor}</h2>${this.isMapHtml(false)}${this.isAtStairs()?`<div class="is-stairs"><b>現在地に階段がある</b><button data-is-action="descend">次の階へ降りる</button></div>`:!next.length&&back?`<div class="is-deadend"><b>DEAD END</b><button data-is-action="map-remap">再マッピング</button></div>`:''}</div>`;};
  P.isHasReturn = function(){return !!this.isRun()?.lootBag?.some(x=>x.itemId==='infiniteReturn'&&(x.count||1)>0);};
  P.isDirectionLabel = function(node,index){const current=this.isMapNode(this.isFloorMap()?.currentId),delta=(node?.col??index)-(current?.col??index);return delta<0?{name:'左',arrow:'↖'}:delta>0?{name:'右',arrow:'↗'}:{name:'奥',arrow:'↑'};};
  P.isRouteCandidates = function(nodes=this.isMapNextNodes()){
    const current=this.isMapNode(this.isFloorMap()?.currentId),best=new Map();
    for(const node of nodes){const delta=(node?.col??0)-(current?.col??0),key=delta<0?'left':delta>0?'right':'straight',distance=Math.abs(delta),found=best.get(key);if(!found||distance<found.distance)best.set(key,{node,distance});}
    return [...best.values()].map(x=>x.node).sort((a,b)=>a.col-b.col);
  };
  P.isDirectionOverlay = function(mode){
    if(!mode)return'';const next=this.isMapNextNodes();
    if(!next.length)return '<div class="is-route-return"><span>この先は行き止まり</span><button data-is-action="map-remap">再マッピング</button></div>';
    const choices=this.isRun().pendingChoices||this.isMakeChoices(),order={left:0,straight:1,right:2};
    const routes=choices.map((choice,index)=>{const node=this.isMapNode(choice.nodeId),d=this.isDirectionLabel(node,index),direction=d.name==='左'?'left':d.name==='右'?'right':'straight';return{choice,index,d,direction};}).sort((a,b)=>order[a.direction]-order[b.direction]);
    return `<div class="is-route-overlay ${mode==='examine'?'examining':''}"><div class="is-route-list">${routes.map(({choice,index,d,direction})=>`<button data-is-action="route-choice" data-is-choice="${index}" class="is-route-choice ${direction}" aria-label="${d.name}へ"><span class="is-route-art" aria-hidden="true"></span>${mode==='examine'?`<em>${esc(choice.hint)}</em>`:''}</button>`).join('')}</div><button class="is-route-close" data-is-action="route-close" aria-label="閉じる">×</button></div>`;
  };
  P.isStairHtml=function(){
    if(!this.isAtStairs())return'';
    return '<div class="is-stair-object forced"><b>階段を発見</b><span>このフロアの探索は終了です</span><div><button data-is-action="descend">次の階へ降りる</button></div></div>';
  };
  P.isExploreMenuHtml=function(){this.renderBattleMenu?.();const source=$('#battle-menu-popover')?.innerHTML||'';return `<div class="is-explore-menu" ${this.isExploreMenuOpen?'':'hidden'}>${source.replaceAll('data-battle-menu-close','data-is-explore-menu-close')}<button class="is-explore-ability" data-is-action="abilities"><b>アビリティ設定</b><span>PHANTOM THIEFのACTION / PASSIVEを変更</span></button></div>`;};
  P.isExploreLogHtml=function(){
    const history=this.isRun()?.log||[],rows=(this.isExploreLogExpanded?history:history.slice(-3)).slice().reverse();
    return `<section class="battle-log is-explore-log${this.isExploreLogExpanded?' expanded':''}" data-is-action="explore-log" role="button" tabindex="0" aria-label="探索ログ。タップで履歴を表示"><small>EXPLORE LOG // ${this.isExploreLogExpanded?'TAP TO CLOSE':'TAP FOR HISTORY'}</small><div class="battle-log-lines">${rows.length?rows.map(x=>`<p>F${x.floor} // ${esc(x.message)}</p>`).join(''):'<p>無限奏廊に侵入した</p>'}</div></section>`;
  };
  P.isRenderExplore = function (panel) {
    const r=this.isRun(); if(!r){this.renderMenuPanel('otherworld');return;}
    const map=this.isFloorMap(),current=this.isMapNode(map.currentId);if(current?.row===0&&!current.cleared)current.cleared=true;
    // 部屋のイベントを解決した時点で先がなければ、進むを押し直さず帰路を提示する。
    const atDeadEnd=!!(current?.visited&&current?.cleared&&!current?.stairs&&!this.isMapNextNodes().length&&this.isMapBackNode());
    if(atDeadEnd)this.isExploreOverlayMode='deadend';
    r.stairsFound=!!current?.stairs;const stats=this.totalStats(),hp=Math.max(0,Math.min(100,(r.hp/stats.maxHp)*100)),mp=Math.max(0,Math.min(100,(r.mp/stats.maxMp)*100));
    const portrait=esc(this.profile.customBattlePortrait||this.defaultBattlePortraitSource?.()||this.selectedCharacterData?.()?.image||''),name=esc(this.playerName?.()||'蓮'),jobId=this.profile.currentJob,jobDef=D().jobs[jobId]||{},jobState=this.profile.jobs?.[jobId]||{},jobLevel=jobState.level||1,jobNeed=this.jobExpNeeded(jobLevel),jobPct=jobNeed?Math.min(100,100*(jobState.exp||0)/jobNeed):100,job=esc(jobDef.name||'PHANTOM THIEF'),weaponType=this.equippedWeaponType(),mastery=this.masteryOf(weaponType),masteryNeed=this.masteryExpNeeded(mastery.level),masteryPct=masteryNeed?Math.min(100,100*(mastery.exp||0)/masteryNeed):100,hasReturn=this.isHasReturn();
    const bg=esc(this.isRoomBackground(current)),notice=r.returnButtonNew;delete r.returnButtonNew;r.currentRoomBackground=bg;
    panel.hidden=false;panel.dataset.panel='infinite-score';panel.classList.add('panel-tall');
    const goldDigits=String(Math.max(0,r.dungeonGold||0)).length;
    panel.innerHTML=`<main class="is-explore-screen" style="--is-explore-bg:url('../${bg}')">
      <header class="is-explore-top battle-topbar"><div class="turn-info"><span>FLOOR</span><b>${r.floor}</b><small>${this.isAtStairs()?'STAIRS':'探索中'}</small></div><div class="battle-gold-display" aria-label="奏廊内所持ゴールド"><small>GOLD</small><strong data-amount-size="${goldDigits>=9?'tiny':goldDigits>=7?'compact':'normal'}">${r.dungeonGold.toLocaleString()} G</strong></div><button class="battle-menu-button" data-is-action="explore-menu" aria-label="MENU"><i></i> MENU</button></header>
      <div class="is-mini-map-wrap">${this.isMapHtml(true)}</div>
      ${this.isStairHtml()}
      <span class="is-explore-character"><img src="${portrait}" alt="${name}"></span>
      <div class="player-ui-stack is-explore-player-stack">
        ${this.isExploreLogHtml()}
        <aside class="player-card is-player-status"><div class="player-meta"><small>PHANTOM // IS</small><strong>${name}</strong><span>${job} Lv.${jobLevel}</span></div><div class="meter-row"><label>HP</label><div class="meter hp"><i style="width:${hp}%"></i></div><output>${r.hp} / ${stats.maxHp}</output></div><div class="meter-row"><label>MP</label><div class="meter mp"><i style="width:${mp}%"></i></div><output>${r.mp} / ${stats.maxMp}</output></div><div class="xp-row"><div class="xp-cell"><small>${esc(this.weaponTypeName(weaponType))} Lv.${mastery.level}</small><div class="meter exp"><i style="width:${masteryPct}%"></i><output>${masteryPct.toFixed(2)}%</output></div></div><div class="xp-cell"><small>${job} Lv.${jobLevel}</small><div class="meter jexp"><i style="width:${jobPct}%"></i><output>${jobNeed?`${jobPct.toFixed(2)}%`:'MASTER'}</output></div></div></div><div class="is-status-meta"><span>LOOT BAG ${this.isBagUsed()} / ${this.isBagLimit()}</span><span>探索 ${map.nodes.filter(n=>n.visited).length}/${map.nodes.length}</span></div></aside>
      </div>
      ${this.isDirectionOverlay(this.isExploreOverlayMode)}
      <nav class="is-explore-commands"><button class="is-explore-command advance" data-is-action="route-advance" aria-label="進む"></button><button class="is-explore-command examine" data-is-action="route-examine" aria-label="調べる"></button><button class="is-explore-command item" data-is-action="bag" aria-label="バッグ"></button><button class="is-explore-command equipment" data-is-action="equipment" aria-label="装備"></button><button class="is-explore-command map" data-is-action="map" aria-label="マップ"></button><button class="is-explore-command return ${hasReturn?'available':'locked'}" data-is-action="${hasReturn?'return-check':'return-locked'}" aria-label="${hasReturn?'帰還':'RETURN未所持'}"></button></nav>
      ${this.isExploreMenuHtml()}${this.isRoomResultHtml?.()||''}${notice?'<button class="is-return-unlocked" data-is-action="return-notice-close"><b>RETURN UNLOCKED</b><span>帰還が可能になった</span></button>':''}
    </main>`;
    // iOS WebViewでは方向ボタンのclickが次のタップまで遅延することがある。
    // 描画直後にpointerupを直接結び、矢印を離した時点で部屋移動を確定する。
    this.isBindLongPress?.(panel);
  };
  P.isEventTable = function () {
    const cfg=this.isEffectiveCfg(), weights={...(this.isCfg().eventWeights||{})};
    for(const [event,key] of [['treasure','treasureRate'],['rare','rareEnemyRate'],['shop','shopRate'],['trap','trapRate'],['card','cardRate']]) {
      if(Number.isFinite(Number(cfg[key]))) weights[event]=Math.max(0,Number(cfg[key])*100);
    }
    weights.workshop=Math.min(6,3+Math.floor(Math.max(0,(this.isRun()?.floor||1)-1)/25));
    return Object.entries(weights).map(([id,weight])=>({id,weight}));
  };
  P.isMakeChoices = function () {
    const choices=[],run=this.isRun(),next=this.isRouteCandidates();
    for(let i=0;i<next.length;i++){const node=next[i];let type=node.type;if(this.isRand()<Number(this.isEffectiveCfg().sublimationRate||0))type='sublime';else if(this.isRand()<(run.buffs.treasureBonus||0))type='treasure';else if(this.isRand()<(run.buffs.rareBonus||0))type='rare';choices.push({id:i,nodeId:node.id,hintId:node.hintId,hint:node.hint,type});}
    this.isRun().pendingChoices=choices; this.isSave(); return choices;
  };
  P.isRenderChoices = function (panel) {this.isExploreOverlayMode='advance';this.isRenderExplore(panel);};
  P.isDismissRouteOverlay = function () {
    this.isExploreOverlayMode=null;
    if(this.isRun())this.isRun().pendingChoices=null;
    document.querySelector('.is-route-overlay')?.remove();
  };
  P.isShowRouteTransition = function (direction, node) {
    document.querySelector('.is-route-transition')?.remove();
    const el=document.createElement('div'),visited=this.isFloorMap()?.nodes?.filter(n=>n.visited).length||1;
    el.className='is-route-transition';
    el.innerHTML=`<b>${esc(direction)}へ移動</b><span>FLOOR ${this.isRun()?.floor||1} // ROOM ${visited}</span>`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),520);
  };
  P.isBindLongPress = function(panel){panel.querySelectorAll('[data-is-choice]').forEach(btn=>{const resolve=e=>{if(btn.dataset.isResolved||this.isRouteInputLocked)return;e.preventDefault();e.stopPropagation();btn.dataset.isResolved='1';this.isRouteInputLocked=true;this.isResolveChoice(+btn.dataset.isChoice);setTimeout(()=>{this.isRouteInputLocked=false;},600);};btn.addEventListener('contextmenu',e=>e.preventDefault());btn.addEventListener('pointerdown',resolve,{once:true});btn.addEventListener('click',resolve,{once:true});});};
  P.isBagDetailHtml=function(x){
    if(!x)return `<section class="is-bag-detail empty"><small>ITEM DETAIL</small><h3>アイテムを選択</h3><p>上の一覧から確認したいアイテムをタップしてください。</p></section>`;
    const item=D().items[x.itemId]||{},rar=this.isCfg().rarity[x.rarity]||{},values=this.isGearValues(x),equippedUid=item.slot&&this.isRun()?.equipment?.[item.slot],isEquipped=equippedUid===x.uid,equipped=equippedUid&&!isEquipped?this.isBagEntry(equippedUid):null,equippedValues=equipped?this.isGearValues(equipped):{},name=x.otherWorldGear&&this.owgName?this.owgName(x):(item.name||x.itemId),combat=Object.entries(values).filter(([,v])=>v).map(([k,v])=>{const delta=equipped?v-(equippedValues[k]||0):v,state=delta>0?'up':delta<0?'down':'same';return `<span class="${state}"><i>${esc(this.isCfg().opLabels[k]||k)}</i><b>${v}</b><em>${delta>0?'▲':delta<0?'▼':'—'} ${delta>0?'+':''}${delta}</em></span>`;}).join(''),ops=(x.ops||[]).map(o=>`<li><span>${esc(this.isCfg().opLabels[o.key]||o.key)}</span><b>${o.key==='critBonus'?`+${Math.round(o.value*100)}%`:`+${o.value}`}</b><em>R${o.rank}</em></li>`).join('');
    return `<section class="is-bag-detail${isEquipped?' is-equipped':''}" style="--bag-accent:${rar.color||'#52d9ff'}"><header><div><small>${esc(item.slot||item.category||x.kind||'ITEM')}</small><h3>${esc(name)} ${x.plus?`+${x.plus}`:''}</h3></div><strong>${isEquipped?'EQUIPPED':esc(rar.name||'ITEM')}</strong></header><p>${esc(item.description||'奏廊で入手した戦利品。生還すると持ち帰ることができる。')}</p>${combat?`<div class="is-bag-stats">${combat}</div>`:''}${ops?`<div class="is-bag-ops"><small>OPTION EFFECTS</small><ul>${ops}</ul></div>`:''}<div class="is-bag-detail-actions">${item.category==='equipment'?(isEquipped?'<button class="is-equipped" disabled aria-disabled="true">装備中</button>':`<button class="primary" data-is-equip="${x.uid}">装備する</button>`):''}${item.effect?`<button class="primary" data-is-use="${x.uid}">使用する</button>`:''}<button class="danger" data-is-drop="${x.uid}">捨てる</button></div></section>`;
  };
  P.isRenderBag = function(panel){
    const r=this.isRun();panel.dataset.panel='infinite-score-bag';
    const equipped=new Set(Object.values(r.equipment||{}).filter(Boolean)),rows=r.lootBag.map((x,index)=>{const item=D().items[x.itemId]||{},rar=this.isCfg().rarity[x.rarity]||{},name=x.otherWorldGear&&this.owgName?this.owgName(x):(item.name||x.itemId),isEquipped=equipped.has(x.uid);return `<article class="is-bag-item${isEquipped?' is-equipped':''}" style="--bag-accent:${rar.color||'#52d9ff'}"><button type="button" class="is-bag-row" data-is-bag-select="${x.uid}" aria-expanded="false"><i>${String(index+1).padStart(2,'0')}</i><span><small>${esc(item.slot||item.category||x.kind||'ITEM')}</small><b>${esc(name)} ${x.plus?`+${x.plus}`:''}</b>${isEquipped?'<mark>装備中</mark>':''}</span><em>${isEquipped?'EQUIPPED':esc(rar.name||'ITEM')}</em><strong>▼</strong></button><div class="is-bag-inline-detail" hidden>${this.isBagDetailHtml(x)}</div></article>`;}).join('');
    panel.innerHTML=`<button class="panel-home" data-is-action="explore">探索画面へ</button>${this.isHeader()}<section class="is-bag-screen"><header class="is-bag-title"><div><small>LOOT BAG // PHANTOM STORAGE</small><h2>戦利品バッグ</h2></div><div class="is-bag-title-actions"><strong>${this.isBagUsed()}<span>/ ${this.isBagLimit()}</span></strong><button type="button" data-is-bag-sort ${r.lootBag.length<2?'disabled':''}><i>⇅</i>整頓</button></div></header><div class="is-bag-list">${rows||'<p class="is-bag-empty">戦利品はまだ入っていない。</p>'}</div></section>`;
  };
  P.isSortBag=function(){const r=this.isRun();if(!r||r.lootBag.length<2)return;const slots=['rightHand','leftHand','head','body','arms','feet','accessory'],rarities=['mythic','legendary','epic','rare','uncommon','common'];r.lootBag.sort((a,b)=>{const ai=D().items[a.itemId]||{},bi=D().items[b.itemId]||{},ae=ai.category==='equipment',be=bi.category==='equipment',aEquipped=Object.values(r.equipment||{}).includes(a.uid),bEquipped=Object.values(r.equipment||{}).includes(b.uid);return Number(bEquipped)-Number(aEquipped)||Number(be)-Number(ae)||(ae&&be?(slots.indexOf(ai.slot)-slots.indexOf(bi.slot)||rarities.indexOf(a.rarity)-rarities.indexOf(b.rarity)||(b.plus||0)-(a.plus||0)):0)||String(ai.name||a.itemId).localeCompare(String(bi.name||b.itemId),'ja')||String(a.uid).localeCompare(String(b.uid));});this.isLog('LOOT BAGを整頓');this.isSave();this.audio?.sfx?.('ui');this.isRenderBag($('#menu-panel'));};
  P.isGearValues = function(x){const def=this.equipmentDefinition?.(x?.itemId)||{},mult=x?.generated?(x.multiplier||1):1,out={};for(const key of ['attackPower','defensePower','magicAttackPower','magicDefensePower'])out[key]=Math.round((Number(def[key])||0)*mult)+(x?.ops||[]).filter(o=>o.key===key).reduce((n,o)=>n+o.value,0);return out;};
  P.isItemHtml = function(x){const item=D().items[x.itemId]||{},rar=this.isCfg().rarity[x.rarity]||{},values=this.isGearValues(x),currentUid=this.isRun()?.equipment?.[item.slot],current=currentUid&&currentUid!==x.uid?this.isBagEntry(currentUid):null,currentValues=current?this.isGearValues(current):{},combat=Object.entries(values).filter(([,v])=>v).map(([k,v])=>{const delta=current? v-(currentValues[k]||0):null;return `${this.isCfg().opLabels[k]} ${v}${delta===null?'':` (${delta>=0?'+':''}${delta})`}`;}).join(' / ');return `<article class="is-item"><div><strong>${esc(item.name||x.itemId)} ${x.plus?`+${x.plus}`:''}</strong><small>${esc(item.slot||item.category||x.kind)} ${x.count>1?`×${x.count}`:''}${combat?` / ${combat}`:''}</small></div><span class="is-rarity" style="color:${rar.color||'#aaa'}">${rar.name||''}</span>${x.ops?.length?`<div class="is-ops">${x.ops.map(o=>`${esc(this.isCfg().opLabels[o.key]||o.key)} ${o.key==='critBonus'?`+${Math.round(o.value*100)}%`:`+${o.value}`} (R${o.rank})`).join(' / ')}</div>`:''}<div class="is-item-actions">${item.category==='equipment'?`<button data-is-equip="${x.uid}">装備</button>`:''}${item.effect?`<button data-is-use="${x.uid}">使用</button>`:''}<button data-is-drop="${x.uid}">捨てる</button></div></article>`;};
  P.isRenderEquipment=function(panel){
    const r=this.isRun(),slots=D().equipmentSlots||[],active=this.isRunEquipSlot&&slots.some(s=>s.id===this.isRunEquipSlot)?this.isRunEquipSlot:null;
    const candidates=slot=>r.lootBag.filter(x=>{const item=D().items[x.itemId];return x.kind==='equipment'&&item?.category==='equipment'&&item.slot===slot;});
    const slotHtml=slots.map(slot=>{const uid=r.equipment[slot.id],x=uid&&this.isBagEntry(uid),item=x&&D().items[x.itemId],count=candidates(slot.id).length;return `<button type="button" data-is-run-slot="${slot.id}" class="equipment-slot ${x?'filled':'empty'} ${active===slot.id?'slot-active':''}"><span>${slot.name}<small>${slot.enName}</small></span><b>${item?esc(item.name):'なし'}</b>${count?`<i class="slot-count">${count}</i>`:''}</button>`;}).join('');
    let overlay='';
    if(active){const slot=slots.find(s=>s.id===active),current=r.equipment[active],list=candidates(active);overlay=`<section class="equipment-selector-overlay is-run-equipment-overlay" role="dialog" aria-modal="true" aria-label="${slot?.name||'装備'}を選択"><header><div><small>INFINITE SCORE // RUN EQUIPMENT</small><b>${slot?.name||'装備'}の装備 <span>${slot?.enName||''}</span></b></div><button type="button" data-is-run-slot-close aria-label="装備部位一覧へ戻る">×</button></header>${current?`<button class="equip-unequip" data-is-run-unequip="${active}">${slot?.name||'装備'}を外す<span>UNEQUIP</span></button>`:''}<div class="equipment-candidate-list">${list.map(x=>{const item=D().items[x.itemId]||{},values=this.isGearValues(x),bonus=Object.entries(values).filter(([,v])=>v).map(([k,v])=>`${this.isCfg().opLabels[k]||k} ${v}`).join(' / '),equipped=current===x.uid;return `<button data-is-run-equip="${x.uid}" class="equipment-candidate rarity-${item.rarity||x.rarity} ${equipped?'equipped-now':''}" ${equipped?'disabled':''}><span class="candidate-title"><b>${esc(item.name||x.itemId)}${x.plus?` +${x.plus}`:''}</b>${equipped?'<em>EQUIPPED</em>':''}</span><strong>${esc(bonus||item.description||'補正なし')}</strong>${x.ops?.length?`<small>${x.ops.map(o=>`${esc(this.isCfg().opLabels[o.key]||o.key)} R${o.rank}`).join(' / ')}</small>`:''}</button>`;}).join('')||'<p class="item-empty">この部位に装備できる戦利品がありません。</p>'}</div></section>`;}
    panel.dataset.panel='infinite-score-equipment';panel.innerHTML=`<button class="panel-home" data-is-action="explore">探索画面へ</button>${this.isHeader()}<small>RUN EQUIPMENT</small><h2>奏廊装備</h2><div class="equipment-screen"><section class="equipment-slots-wrap"><h3>装備中 <span>CURRENT LOADOUT</span></h3><div class="equipment-slots">${slotHtml}</div></section><section class="equipment-workbench"><div class="equip-hint"><b>装備部位を選んでください</b><span>奏廊内で拾った装備だけを使用します。通常装備とは同期しません。</span></div></section></div>${overlay}`;
  };
  P.isRenderDebug=function(panel){const c=this.isEffectiveCfg();panel.dataset.panel='infinite-score-debug';panel.innerHTML=`${this.isHeader()}<small>INFINITE SCORE DEV TOOLS</small><h2>DEBUG</h2><div class="is-debug"><div class="is-debug-grid">${[['floor','現在階',this.isRun().floor],['mapRows','MAP行数',c.mapRows],['stairBaseRate','階段初期率',c.stairBaseRate],['stairRateIncrease','階段上昇率',c.stairRateIncrease],['bagLimit','バッグ上限',c.bagLimit],['equippedUsesBag','装備も枠使用(1/0)',c.equippedUsesBag?1:0],['treasureRate','宝箱率',c.treasureRate],['rareEnemyRate','レア敵率',c.rareEnemyRate],['returnItemRate','RETURN率',c.returnItemRate],['shopRate','SHOP率',c.shopRate],['trapRate','TRAP率',c.trapRate],['cardRate','CARD率',c.cardRate],['sublimationRate','昇華率',c.sublimationRate],['enemyScalePerFloor','敵強化/階',c.enemyScalePerFloor]].map(([k,l,v])=>`<label>${l}<input data-is-debug-key="${k}" type="number" step="0.01" value="${v}"></label>`).join('')}</div><div class="is-actions"><button data-is-debug-force="treasure">次回宝箱</button><button data-is-debug-force="shop">次回ショップ</button><button data-is-debug-force="merchant">次回行商人</button><button data-is-debug-force="returnCard">次回RETURNカード</button><button data-is-debug-force="rare">次回レア敵</button><button data-is-debug-force="sublime">次回昇華</button><button data-is-debug-force="stairs">次回階段</button><button data-is-action="generate">装備生成</button><button class="danger" data-is-action="death-test">死亡テスト</button><button data-is-action="debug-reset">設定を初期化</button></div></div><div class="is-log">${(this.isRun().log||[]).slice().reverse().map(x=>`F${x.floor} ${esc(x.message)}`).join('<br>')}</div>${this.isToolbar()}`;};
  const origIsRenderDebug=P.isRenderDebug;
  P.isRenderDebug=function(panel){origIsRenderDebug.call(this,panel);const box=panel.querySelector('.is-debug-grid'),c=this.isEffectiveCfg();box?.insertAdjacentHTML('beforeend',`<label>装備DROP率<input data-is-debug-key="gearDropRate" type="number" step="0.01" value="${c.gearDropRate}"></label><label>奏貨倍率<input data-is-debug-key="currencyMultiplier" type="number" step="0.1" value="${c.currencyMultiplier}"></label>`);const actions=panel.querySelector('.is-debug .is-actions');actions?.insertAdjacentHTML('beforeend','<button data-is-generate-specified>指定装備生成</button>');};

  // ── 装備生成 / バッグ処理 ─────────────────────────────────
  P.isGenerateGear=function(force={}){if(typeof this.owgGenerate!=='function')throw new Error('異世界装備生成器が読み込まれていません。');return this.owgGenerate({floor:this.isRun()?.floor||1,...force});};
  P.isGenerateDebugGear=async function(){const n=await this.isChoose('生成する装備の★',['★3','★4','★5','★6'],{kicker:'DEBUG // GEAR GENERATOR'});return n===null?null:this.isGenerateGear({stars:n+3});};
  P.isAddLoot=function(entry){const r=this.isRun();if(!r)return false;const count=Math.max(1,Math.floor(Number(entry.count)||1)),isReturn=entry.itemId==='infiniteReturn',hadReturn=this.isHasReturn();let added=0;for(let i=0;i<count;i++){const one={...copy(entry),uid:i===0?entry.uid:this.isUid('loot'),count:1};if(this.isBagUsed()>=this.isBagLimit()){r.pendingLoot=one;this.isSave();this.isShowBagFull();break;}r.lootBag.push(one);added++;}if(isReturn&&!hadReturn&&added)r.returnButtonNew=true;if(added){this.isLog(`入手：${D().items[entry.itemId]?.name||entry.itemId}${added>1?` ×${added}`:''}`);this.isShowLootPop(entry,added);}return added===count;};
  P.isShowBagFull=function(){const r=this.isRun(),x=r?.pendingLoot;if(!x)return;document.getElementById('is-modal')?.remove();const el=document.createElement('div');el.id='is-modal';el.className='is-modal';el.innerHTML=`<div><small>LOOT BAG FULL</small><h2>${esc(D().items[x.itemId]?.name||x.itemId)}</h2><p>バッグ ${this.isBagUsed()} / ${this.isBagLimit()}。使用・装備・破棄で空きを作ってください。</p><div class="is-list">${r.lootBag.map(y=>this.isItemHtml(y)).join('')}</div><div class="is-actions"><button data-is-action="retry-loot">拾う</button><button data-is-action="discard-loot">拾わない</button></div></div>`;document.body.appendChild(el);};
  P.isEquip=function(uid){const x=this.isBagEntry(uid),item=D().items[x?.itemId];if(!x||item?.category!=='equipment')return;this.isRun().equipment[item.slot||'accessory']=uid;this.isLog(`装備：${item.name}`);this.isSave();this.isRenderEquipment($('#menu-panel'));};
  P.isUseBagItem=function(uid){const x=this.isBagEntry(uid),item=D().items[x?.itemId],effect=item?.effect;if(!x||!effect)return;if(x.itemId==='infiniteReturn'){this.isReturnRun();return;}const r=this.isRun(),stats=this.totalStats(),recovery=this.recoveryItemInfo?.(item,stats);if(!recovery)return;const gain=Math.min(recovery.amount,stats[recovery.maxKey]-r[recovery.key]);if(gain<=0)return;r[recovery.key]+=gain;r.lootBag.splice(r.lootBag.indexOf(x),1);this.isLog(`使用：${item.name}（${recovery.key.toUpperCase()} +${gain}）`);this.isRenderBag($('#menu-panel'));};
  P.isDrop=function(uid){const r=this.isRun(),x=this.isBagEntry(uid);if(!x)return;Object.keys(r.equipment).forEach(s=>{if(r.equipment[s]===uid)delete r.equipment[s]});r.lootBag.splice(r.lootBag.indexOf(x),1);this.isLog(`破棄：${D().items[x.itemId]?.name||x.itemId}`);this.isRenderBag($('#menu-panel'));};
  P.isDeleteOp=async function(uid){const x=this.isBagEntry(uid);if(!x?.ops?.length)return;const idx=await this.isChoose('削除するOPを選択',x.ops.map(o=>({label:this.isCfg().opLabels[o.key]||o.key,note:`RANK ${o.rank}`})),{kicker:'OPTION DELETE'});if(idx!==null&&x.ops[idx]){x.ops.splice(idx,1);this.isLog('OP削除');this.isRenderBag($('#menu-panel'));}};
  P.isOpenMerge=function(uid){const base=this.isBagEntry(uid),candidates=(this.isRun()?.lootBag||[]).filter(x=>x.uid!==uid&&x.itemId===base?.itemId&&x.rarity===base?.rarity);if(!candidates.length){alert('同一装備・同一レアリティの素材がありません。');return;}const lines=candidates.map((x,i)=>`${i+1}: ${D().items[x.itemId]?.name||x.itemId} +${x.plus||0}`).join('\n'),pick=Number(prompt(`合体素材を選択\n${lines}`))-1;if(pick<0||pick>=candidates.length)return;const mat=candidates[pick],newOps=(mat.ops||[]).filter(o=>!base.ops.some(x=>x.key===o.key));let inherit=0;if(base.ops.length<4&&newOps.length>1){const opLines=newOps.map((o,i)=>`${i+1}: ${this.isCfg().opLabels[o.key]||o.key} R${o.rank}`).join('\n');inherit=Math.max(0,Number(prompt(`継承するOPを選択\n${opLines}`))-1);}if(this.isMerge(uid,mat.uid,inherit)){this.audio?.sfx?.('rareDrop');this.isRenderBag($('#menu-panel'));}};
  P.isMerge=function(baseUid,matUid,inheritIndex=0){const r=this.isRun(),a=this.isBagEntry(baseUid),b=this.isBagEntry(matUid);if(!a||!b||a.itemId!==b.itemId||a.rarity!==b.rarity||a.uid===b.uid)return false;a.plus=(a.plus||0)+1;for(const op of b.ops||[]){const same=a.ops.find(x=>x.key===op.key);if(same){same.rank=Math.min(4,same.rank+1);same.value=this.isCfg().opRanks[same.key][same.rank-1];}}if(a.ops.length<4){const candidates=(b.ops||[]).filter(o=>!a.ops.some(x=>x.key===o.key));if(candidates[inheritIndex])a.ops.push(copy(candidates[inheritIndex]));}Object.keys(r.equipment).forEach(s=>{if(r.equipment[s]===b.uid)delete r.equipment[s]});r.lootBag.splice(r.lootBag.indexOf(b),1);this.isLog(`合体：${D().items[a.itemId]?.name}+${a.plus}`);this.isSave();return true;};

  // ── 探索 / 戦闘 ───────────────────────────────────────────
  P.isDescend=function(){const r=this.isRun();r.floor=Math.min(this.isEffectiveCfg().maxFloor||9999,r.floor+1);r.encounterCountOnFloor=0;r.stairsFound=false;r.pendingChoices=null;r.floorMap=null;this.isExploreOverlayMode=null;this.isStairPromptDismissed=null;this.isCreateFloorMap();this.isLog(`FLOOR ${r.floor}へ降下`);this.isRenderExplore($('#menu-panel'));};
  P.isRollStairs=function(){const r=this.isRun(),c=this.isEffectiveCfg(),rate=clamp(c.stairBaseRate+(r.encounterCountOnFloor-1)*c.stairRateIncrease,0,c.stairMaxRate),forced=r.forcedEvent==='stairs',roll=this.isRand()*100,found=forced||roll<rate;if(forced)r.forcedEvent=null;const node=this.isMapNode(this.isFloorMap()?.currentId);if(node&&found)node.stairs=true;r.stairsFound=!!node?.stairs;this.isLog(`階段抽選 ${roll.toFixed(2)} / ${rate}% → ${found?'発見':'未発見'}`);return found;};
  P.isEnemyPoolForFloor=function(floor,rare=false){const cfg=this.isCfg(),tiers=rare?cfg.rareEnemyTiers:cfg.enemyTiers,tier=(tiers||[]).find(x=>floor>=(x.minFloor||1)&&floor<=(x.maxFloor||cfg.maxFloor||9999)&&x.pool?.length);if(tier)return tier.pool;return rare?(cfg.rareEnemyPool||[]):(cfg.enemyPool||[]);};
  P.isStartBattle=async function(rare=false){const r=this.isRun(),cfg=this.isEffectiveCfg();let pool=this.isEnemyPoolForFloor(r.floor,rare);if(rare&&!pool.length){rare=false;pool=this.isEnemyPoolForFloor(r.floor,false);}if(!pool.length)return;document.querySelector('.is-encounter-transition')?.remove();const transition=document.createElement('div');transition.className='is-encounter-transition';transition.innerHTML=`<b>${rare?'RARE ENCOUNTER':'ENCOUNTER'}</b><span>FLOOR ${r.floor}</span>`;document.body.appendChild(transition);await new Promise(resolve=>setTimeout(resolve,520));const count=rare?1:(1+Math.floor(this.isRand()*Math.min(3,1+Math.floor(r.floor/5)))),scale=1+(r.floor-1)*cfg.enemyScalePerFloor;this.closeBattleMenu?.();this.cancelAutoPick?.();const stats=this.totalStats();this.player=this.freshBattlePlayer(stats,clamp(r.hp,1,stats.maxHp),clamp(r.mp,0,stats.maxMp));this.enemies=Array.from({length:count},(_,i)=>{const id=pool[Math.floor(this.isRand()*pool.length)],e=this.makeEnemy(id,i);for(const k of ['maxHp','atk','def','mag','mnd','spd','agi','dex'])if(e.stats[k]!=null)e.stats[k]=Math.max(1,Math.round(e.stats[k]*scale));e.hp=e.stats.maxHp;e.infiniteScore=true;e.rareRun=rare;return e;});this.battleMode='infiniteScore';this.turn=1;this.locked=false;this.finished=false;this.resetBattleLog();this.battleRewards={exp:0,gold:0,drops:{},levels:[],masteryResults:[],jobResults:[],newRecipes:[]};$('#menu-screen').hidden=true;$('#menu-screen').style.display='none';$('#game').hidden=false;$('#game').style.display='grid';$('#result').hidden=true;$('#result').style.display='none';$('#ren').className='ren fighter idle';this.applySetBattleVisual();const bf=$('#battlefield'),roomBg=r.currentRoomBackground||this.isRoomBackground();bf.dataset.dungeon='infiniteScore';bf.style.backgroundImage=`linear-gradient(#09132a55,#02071355),url("${roomBg}")`;bf.style.backgroundSize='auto,cover';bf.style.backgroundPosition='center,center center';this.renderEnemies();this.applyEquipmentVisual();this.updateHUD();this.setLog(`無限奏廊 FLOOR ${r.floor}：${this.enemies.map(e=>e.name).join('と')}が現れた！`);this.flashTitle(rare?'RARE ENCOUNTER':'INFINITE SCORE',`FLOOR ${r.floor}`);this.showMainCommands();this.isLog('戦闘開始',{rare,count,scale,roomBg});setTimeout(()=>transition.remove(),240);};
  const isStartBattleWithMusic=P.isStartBattle;
  P.isStartBattle=function(rare=false){
    this.prepareBattleInteractionState?.();
    // ブラックアウト開始直後から拠点を消す。元の開始処理が戦闘DOMを作るまで
    // HIDEOUTが一瞬だけ背面に見える状態を防ぐ。
    const menu=$('#menu-screen'),panel=$('#menu-panel'),result=$('#result');
    if(menu){menu.hidden=true;menu.style.display='none';}
    if(panel){panel.hidden=true;panel.style.display='none';}
    if(result){result.hidden=true;result.style.display='none';}
    this.audio?.playTrack?.(this.battleMusic);
    return isStartBattleWithMusic.call(this,rare);
  };
  P.isHideDefaultResultMenu=function(){const menu=$('#result-menu');if(menu){menu.hidden=true;menu.style.display='none';}};
  const origShowBattleItems=P.showBattleItems;
  P.showBattleItems=function(){if(this.battleMode!=='infiniteScore'||!this.isRun())return origShowBattleItems.call(this);const entries=this.isRun().lootBag.filter(x=>D().items[x.itemId]?.category==='consumable'&&this.recoveryItemInfo?.(D().items[x.itemId],this.player.stats));const grouped=[...new Set(entries.map(x=>x.itemId))].map(id=>({item:D().items[id],count:entries.filter(x=>x.itemId===id).length}));if(!grouped.length){this.panel(this.button('もどる','BACK','back'));this.bindActions({back:()=>this.showMainCommands()});this.setLog('LOOT BAGに使えるアイテムがない。');return;}const actions={back:()=>this.showMainCommands()},rows=grouped.map(({item,count})=>{const recovery=this.recoveryItemInfo(item,this.player.stats),full=this.player[recovery.key]>=this.player.stats[recovery.maxKey];actions[`is-item-${item.id}`]=()=>this.isUseBattleItem(item.id);return this.button(item.name,`${recovery.label} // ×${count}（${count}枠）`,`is-item-${item.id}`,full,'item',item.description||'');}).join('');this.panel(this.button('閉じる','BACK','back')+rows,'list');this.bindActions(actions);};
  P.isUseBattleItem=async function(id){const run=this.isRun(),entry=run?.lootBag.find(x=>x.itemId===id),item=D().items[id],recovery=this.recoveryItemInfo?.(item,this.player?.stats);if(!entry||!item||!recovery)return;const {key,maxKey}=recovery;if(this.player[key]>=this.player.stats[maxKey])return;this.locked=true;this.keepAutoControlVisible();await this.beginPlayerTurn();const gain=Math.min(recovery.amount,this.player.stats[maxKey]-this.player[key]);this.player[key]+=gain;run.lootBag.splice(run.lootBag.indexOf(entry),1);run.hp=this.player.hp;run.mp=this.player.mp;this.audio.sfx('heal');this.setLog(`${item.name}を使った。${key.toUpperCase()}が${gain}回復！`);this.floating($('#ren'),`+${gain}`,'heal');this.updateHUD();this.saveProfile();await this.battleSleep(500);await this.enemyOnlyTurn();};
  const origGrantEnemyReward=P.grantEnemyReward;
  P.grantEnemyReward=function(enemy){
    if(this.battleMode!=='infiniteScore'||!this.isRun())return origGrantEnemyReward.call(this,enemy);
    const rewards=(this.battleRewards||={exp:0,gold:0,drops:{},levels:[],masteryResults:[],jobResults:[]}),baseExp=enemy.exp||0,exp=Math.round(baseExp*(1+this.mealExpBonusRate())),gold=0,levels=this.applyRewards({exp,gold:0,drops:{}}),job=this.grantJobExp(exp),run=this.isRun();
    run.dungeonGold+=enemy.stolenRunGold||0;
    // 原種モンスターの通常dropTableは無限奏廊へ持ち込まない。
    // 奏廊装備・回復品・RETURN・異界素材は、それぞれ専用の勝利／イベント抽選だけで生成する。
    for(const loot of enemy.stolenRunLoot||[])this.isAddLoot(loot);
    rewards.exp=(rewards.exp||0)+exp;rewards.gold=(rewards.gold||0)+gold;rewards.levels||=[];rewards.levels.push(...levels);rewards.jobResults||=[];if(job)rewards.jobResults.push(job);
    if(job?.to>job?.from&&!this.quickResolving)this.queueGrowthBubble('JOB Lv.UP!',`${job.jobName} Lv.${job.from} → ${job.to}`);
    this.isLog(`撃破報酬：EXP ${exp}`);this.updateHUD();return {exp,gold};
  };
  const origEnemySteal=P.enemySteal;
  P.enemySteal=async function(enemy,action){
    if(this.battleMode!=='infiniteScore'||!this.isRun())return origEnemySteal.call(this,enemy,action);
    const run=this.isRun(),el=document.getElementById(enemy.uid),materials=run.lootBag.filter(x=>(x.count||1)>0&&D().items[x.itemId]?.category==='material'),stealMaterial=materials.length&&(!run.dungeonGold||this.isRand()<.42);
    this.flashTitle(action.name,'LOOT BAG AT RISK');this.audio.sfx('dark');el?.classList.add('enemy-attacking');await this.battleSleep(260);
    if(stealMaterial){const x=materials[Math.floor(this.isRand()*materials.length)],stolen={...copy(x),uid:this.isUid('stolen'),count:1};x.count--;if(x.count<=0)run.lootBag.splice(run.lootBag.indexOf(x),1);enemy.stolenRunLoot||=[];enemy.stolenRunLoot.push(stolen);this.setLog(`${enemy.name}は${D().items[x.itemId]?.name||x.itemId}を奪った！`);}
    else if(run.dungeonGold>0){const amount=Math.max(1,Math.min(Math.round(run.dungeonGold*.12),180+run.floor*80));run.dungeonGold-=amount;enemy.stolenRunGold=(enemy.stolenRunGold||0)+amount;this.setLog(`${enemy.name}は${amount} 奏貨を奪った！`);}
    else this.setLog(`${enemy.name}は盗める物を見つけられなかった！`);
    enemy.hasStolen=true;this.saveProfile();el?.classList.remove('enemy-attacking');this.updateHUD();await this.battleSleep(440);
  };
  const origTryEscape=P.tryEscape;
  P.tryEscape=async function(){
    if(this.battleMode!=='infiniteScore'||!this.isRun())return origTryEscape.call(this);
    this.locked=true;this.keepAutoControlVisible();await this.beginPlayerTurn();
    const live=this.enemies.filter(e=>e.alive),avg=live.reduce((s,e)=>s+(e.stats.spd||e.stats.agi||0),0)/Math.max(1,live.length),chance=clamp(.45+(this.player.stats.agi-avg)*.025,.35,.9);
    this.setLog('奏廊の分岐へ退く道を探している……');await this.battleSleep(500);
    if(this.isRand()<chance){const r=this.isRun();r.hp=this.player.hp;r.mp=this.player.mp;this.isClearMapRoom();this.finished=true;this.endAutoBattle?.();this.saveProfile();this.audio.sfx('escape');this.showResult('ESCAPED','戦利品を保ったまま、この戦闘から離脱した。','INFINITE SCORE',`<button class="is-primary" data-is-action="after-battle">探索へ戻る</button>`);this.isHideDefaultResultMenu();}
    else{this.setLog('逃げられない！');await this.battleSleep(350);await this.enemyOnlyTurn();}
  };
  const origEnemyEncounterEscaped=P.enemyEncounterEscaped;
  P.enemyEncounterEscaped=async function(){if(this.battleMode!=='infiniteScore'||!this.isRun())return origEnemyEncounterEscaped.call(this);const r=this.isRun();r.hp=this.player.hp;r.mp=this.player.mp;this.isClearMapRoom();this.finished=true;this.endAutoBattle?.();this.isLog('希少怪異が逃走');this.showResult('RARE ESCAPED','希少怪異は戦利品を抱えて逃走した。','INFINITE SCORE',`<button class="is-primary" data-is-action="after-battle">探索へ戻る</button>`);this.isHideDefaultResultMenu();};
  P.isRollRecoveryItem=function(){const floor=this.isRun()?.floor||1,pool=(this.isCfg().recoveryItems||[]).filter(row=>floor>=(row.minFloor||1)&&D().items[row.itemId]);return pool.length?this.isPickWeighted(pool)?.itemId:null;};
  const origVictory=P.victory;
  P.victory=async function(){if(this.battleMode!=='infiniteScore'||!this.isRun())return origVictory.call(this);this.finished=true;this.endAutoBattle?.();this.audio.sfx('victory');const r=this.isRun(),cfg=this.isEffectiveCfg(),returnFloor=Math.max(1,Number(cfg.returnMinFloor)||20);r.hp=this.player.hp;r.mp=this.player.mp;r.encounterCountOnFloor++;this.isClearMapRoom();if(r.buffs.qualityBattles>0)r.buffs.qualityBattles--;const baseGold=10+Math.round(r.floor*2+this.isRand()*12),gold=Math.round(baseGold*(1+(r.buffs.goldBonus||0))*Math.max(0,Number(cfg.currencyMultiplier)||0));r.dungeonGold+=gold;const drops=[];if(r.floor>=returnFloor&&!this.isHasReturn()&&!r.returnMilestoneClaimed){if(this.isAddLoot({uid:this.isUid('return'),kind:'item',itemId:'infiniteReturn',count:1})){r.returnMilestoneClaimed=true;drops.push('RETURN');}}else if(this.isRand()<Math.min(.95,Math.max(0,Number(cfg.gearDropRate)||0)+r.floor*.004)){const gear=this.isGenerateGear();if(this.isAddLoot(gear))drops.push(D().items[gear.itemId]?.name||gear.itemId);}else if(r.floor>=returnFloor&&this.isRand()<cfg.returnItemRate){if(this.isAddLoot({uid:this.isUid('return'),kind:'item',itemId:'infiniteReturn',count:1}))drops.push('RETURN');}if(!r.pendingLoot&&this.isRand()<Math.max(0,Number(cfg.recoveryDropRate)||0)){const itemId=this.isRollRecoveryItem();if(itemId&&this.isAddLoot({uid:this.isUid('medicine'),kind:'item',itemId,count:1}))drops.push(D().items[itemId]?.name||itemId);}if(!r.pendingLoot){const arcanaId=this.isRollMonsterArcana();if(arcanaId&&this.isAddLoot({uid:this.isUid('arcana'),kind:'item',itemId:arcanaId,count:1}))drops.push(D().items[arcanaId]?.name||arcanaId);}this.isRollStairs();const showCards=this.isRand()<cfg.cardRate;this.saveProfile();await this.battleSleep(500);if(showCards){this.isShowCards();return;}this.showResult('VICTORY',`奏貨 +${gold}${drops.length?` ／ ${drops.join('・')}を発見`:''}`,'INFINITE SCORE',`<div class="is-run-grid"><div><small>FLOOR</small><b>${r.floor}</b></div><div><small>HP</small><b>${r.hp}</b></div><div><small>BAG</small><b>${this.isBagUsed()}/${this.isBagLimit()}</b></div><div><small>階段</small><b>${r.stairsFound?'FOUND':'—'}</b></div></div><button class="is-primary" data-is-action="after-battle">探索へ戻る</button>`);this.isHideDefaultResultMenu();};
  const origDefeat=P.defeat;
  P.defeat=async function(){if(this.battleMode!=='infiniteScore'||!this.isRun())return origDefeat.call(this);this.finished=true;this.endAutoBattle?.();const run=this.isRun(),lost=this.isBagUsed(),lostIds=new Set((run.importedItems||[]).map(x=>x.itemId)),home=copy(run.homeEquipment||this.profile.equipment);for(const slot of Object.keys(home))if(lostIds.has(home[slot]))home[slot]=null;this.profile.equipment=home;this.profile.currentVitals=copy(run.homeVitals||this.profile.currentVitals);this.profile.infiniteScore={active:false,lastResult:'defeat',lostCount:lost,endedAt:Date.now()};this.profile.flags.owRestoreJobPending=true;this.saveProfile();this.audio.stopMusic?.(400);this.audio.sfx('defeat');this.showResult('GAME OVER','持ち込んだ物も、拾った物も、すべて無限奏廊へ消えた。','ALL LOOT LOST',`<div class="is-warning"><strong>LOST</strong><p>${lost}枠の戦利品を失いました。</p><p>基礎能力・JOB・転生・武器学・習得技・RE:MIXは失われません。</p></div>`);};

  P.isAfterBattle=function(){
    const result=$('#result'),game=$('#game'),menu=$('#menu-screen');
    result.hidden=true;result.style.display='none';game.hidden=true;game.style.display='none';
    // 探索は拠点の子画面ではない。復帰時もHIDEOUTを表示しない。
    menu.hidden=true;menu.style.display='none';this.isExploreOverlayMode=null;
    this.isPlayExploreMusic();this.renderMenuPanel('infinite-score');window.scrollTo({top:0,behavior:'instant'});
  };
  P.isResolveChoice=function(index){const r=this.isRun(),choice=r.pendingChoices?.[index];this.isDismissRouteOverlay();if(!choice){this.isRenderExplore($('#menu-panel'));return;}const node=choice.nodeId&&this.isMapNode(choice.nodeId);if(node){this.isFloorMap().currentId=node.id;node.visited=true;r.stairsFound=!!node.stairs;this.isStairPromptDismissed=null;}const forced=r.forcedEvent;if(forced){choice.type=forced;r.forcedEvent=null;if(node)node.type=forced;}if(node&&!['encounter','rare'].includes(choice.type))node.cleared=true;const direction=this.isDirectionLabel(node,index).name;this.isShowRouteTransition(direction,node);this.isLog(`${direction}の道へ進む → ${choice.type}`);this.isResolveEvent(choice.type);};
  P.isResolveEvent=function(type){const r=this.isRun();this.isDismissRouteOverlay();if(type==='encounter'){this.isStartBattle(false);return;}if(type==='rare'){this.isStartBattle(true);return;}if(type==='treasure'){this.isTreasure();return;}if(type==='workshop'){this.isRenderWorkshop($('#menu-panel'));return;}if(type==='item'){const id=this.isCfg().consumablePool[Math.floor(this.isRand()*this.isCfg().consumablePool.length)];this.isAddLoot({uid:this.isUid('item'),kind:'item',itemId:id,count:1});}else if(type==='gold'){const g=Math.max(1,Math.round((1+Math.floor(this.isRand()*5))*(1+r.buffs.goldBonus)));r.dungeonGold+=g;this.isLog(`奏貨 +${g}`);}else if(type==='trap'){const stats=this.totalStats(),dmg=Math.max(1,Math.round(stats.maxHp*(.08+this.isRand()*.17)));r.hp=Math.max(1,r.hp-dmg);this.isLog(`罠：HP -${dmg}`);}else if(type==='shop'){this.isRenderShop($('#menu-panel'),false);return;}else if(type==='merchant'){this.isRenderShop($('#menu-panel'),true);return;}else if(type==='card'||type==='returnCard'||type==='sublime'){this.isShowCards(type);return;}this.isRollStairs();this.isRenderExplore($('#menu-panel'));};
  P.isTreasure=function(){const cfg=this.isCfg(),r=this.isRun(),ch=this.isPickWeighted(Object.entries(cfg.chestRates).map(([id,weight])=>({id,weight}))).id,bonus=ch==='gold'?3:ch==='silver'?1:0,gear=this.isGenerateGear({opRank:bonus||undefined}),name=this.owgName?.(gear)||D().items[gear.itemId]?.name||gear.itemId;this.isAddLoot(gear);r.buffs.treasureBonus=0;this.isLog(`宝箱(${ch})`,{rarity:gear.rarity,item:gear.itemId,ops:gear.ops});this.isRollStairs();this.isSave();this.isRenderRoomResult(`${name}を拾いました`,'LOOT BAGへ収めた。','item');};

  // ── CARD / SHOP / RETURN ───────────────────────────────────
  P.isCardPicks=function(force=null){const returnUnlocked=(this.isRun()?.floor||1)>=Math.max(1,Number(this.isEffectiveCfg().returnMinFloor)||20);let pool=this.isCfg().cards.filter(x=>x.id!=='return'||returnUnlocked);if(force==='returnCard'&&returnUnlocked)pool=[pool.find(x=>x.id==='return'),...pool.filter(x=>x.id!=='return')];if(force==='sublime')pool=[pool.find(x=>x.id==='sublime'),...pool.filter(x=>x.id!=='sublime')];const out=[];while(out.length<3&&pool.length){const pick=(force&&out.length===0)?pool[0]:this.isPickWeighted(pool);out.push(pick);pool=pool.filter(x=>x.id!==pick.id);}return out;};
  P.isShowCards=function(force=null){const picks=this.isCardPicks(force);this.isRun().pendingCards=picks;this.saveProfile();this.showResult('ENCHANT CARD','3枚から1枚を選ぶ。選ばなかったカードは消滅する。','INFINITE SCORE',`<div class="is-cards">${picks.map((c,i)=>`<button class="is-card" data-is-card="${i}"><b>《${esc(c.name)}》</b><span>${esc(c.text)}</span></button>`).join('')}</div>`);this.isHideDefaultResultMenu();};
  P.isChooseGear=async function(title,predicate=()=>true){const list=this.isRun().lootBag.filter(x=>x.kind==='equipment'&&predicate(x));if(!list.length)return null;const n=await this.isChoose(title,list.map(x=>({label:D().items[x.itemId]?.name||x.itemId,note:`+${x.plus||0}`})),{kicker:'GEAR SELECT'});return n===null?null:list[n];};
  P.isApplyCard=function(index){const r=this.isRun(),c=r.pendingCards?.[index];if(!c)return;r.pendingCards=null;const stats=this.totalStats();if(c.id==='heal')r.hp=Math.min(stats.maxHp,r.hp+Math.ceil(stats.maxHp*.2));else if(c.id==='mana')r.mp=Math.min(stats.maxMp,r.mp+Math.ceil(stats.maxMp*.2));else if(c.id==='treasure')r.buffs.treasureBonus=Math.min(1,(r.buffs.treasureBonus||0)+.1);else if(c.id==='hunt')r.buffs.rareBonus=Math.min(1,(r.buffs.rareBonus||0)+.05);else if(c.id==='stairs'){this.isAfterBattle();this.isDescend();return;}else if(c.id==='return'){this.isReturnRun();return;}else if(c.id==='gold')r.buffs.goldBonus=(r.buffs.goldBonus||0)+.2;else if(c.id==='quality')r.buffs.qualityBattles=3;else if(c.id==='merchant'){this.isAfterBattle();this.isRenderShop($('#menu-panel'),true);return;}else if(c.id==='forge'){const x=this.isChooseGear('鍛造する装備を選択');if(x)x.plus=(x.plus||0)+1;}else if(c.id==='sublime'){const x=this.isChooseGear('昇華する装備を選択',x=>x.ops?.some(o=>o.rank<4));if(x){const candidates=x.ops.filter(o=>o.rank<4),n=Number(prompt(`強化するOPを選択\n${candidates.map((o,i)=>`${i+1}: ${this.isCfg().opLabels[o.key]||o.key} R${o.rank}`).join('\n')}`))-1,op=candidates[n];if(op){op.rank++;op.value=this.isCfg().opRanks[op.key][op.rank-1];}}}this.isLog(`CARD《${c.name}》`);this.saveProfile();this.isAfterBattle();};
  const isApplyCardNative=P.isApplyCard;
  P.isApplyCard=async function(index){const c=this.isRun()?.pendingCards?.[index];if(!c||!['forge','sublime'].includes(c.id))return isApplyCardNative.call(this,index);this.isRun().pendingCards=null;const x=await this.isChooseGear(c.id==='forge'?'鍛造する装備を選択':'昇華する装備を選択',c.id==='sublime'?x=>x.ops?.some(o=>o.rank<4):()=>true);if(x&&c.id==='forge')x.plus=(x.plus||0)+1;if(x&&c.id==='sublime'){const candidates=x.ops.filter(o=>o.rank<4),n=await this.isChoose('強化するOPを選択',candidates.map(o=>({label:this.isCfg().opLabels[o.key]||o.key,note:`RANK ${o.rank} → ${o.rank+1}`})),{kicker:'SUBLIMATION'}),op=n===null?null:candidates[n];if(op){op.rank++;op.value=this.isCfg().opRanks[op.key][op.rank-1];}}this.isLog(`CARD《${c.name}》`);this.saveProfile();this.isAfterBattle();};
  P.isRenderShop=function(panel,merchant=false){
    const r=this.isRun(),floor=r.floor||1,returnUnlocked=floor>=Math.max(1,Number(this.isEffectiveCfg().returnMinFloor)||20),hasReturn=returnUnlocked&&merchant&&this.isRand()<.12;
    const product=(id,name,en,price,mark)=>`<button class="is-shop-product" data-is-buy="${id}" data-price="${price}"><i>${mark}</i><span><small>${en}</small><b>${name}</b></span><strong>${price}<em>奏貨</em></strong></button>`;
    const stock=[
      product('owPotion20','異界回復薬','HP 20% // 1F',9,'＋'),product('owManaPotion20','異界魔力回復薬','MP 20% // 1F',12,'✦'),
      floor>=30?product('owPotion40','異界回復薬・中級','HP 40% // 30F',12,'＋'):null,floor>=30?product('owManaPotion40','異界魔力回復薬・中級','MP 40% // 30F',15,'✦'):null,
      floor>=60?product('owPotion60','異界回復薬・高級','HP 60% // 60F',15,'＋'):null,floor>=60?product('owManaPotion60','異界魔力回復薬・高級','MP 60% // 60F',15,'✦'):null,
      product('gear','ランダム装備','CURRENT FLOOR GEAR',15,'?'),hasReturn?product('infiniteReturn','RETURN','ESCAPE RELIC',15,'↩'):null
    ].filter(Boolean).join('');
    panel.dataset.panel='infinite-score-shop';
    panel.innerHTML=`<section class="is-shop-screen"><header class="is-shop-hero"><small><i></i>${merchant?'WANDERING MERCHANT':'INFINITE SCORE // SHOP'}</small><h2>✦ ${merchant?'彷徨う行商人':'奏廊ショップ'} ✦</h2><p>${merchant?'迷宮を渡る影の商人':'奏廊の狭間でだけ開く商店'} ／ FLOOR ${floor}</p><strong>${r.dungeonGold.toLocaleString()}<em> 奏貨</em></strong></header><nav class="is-shop-tabs"><b>購入</b><button data-is-action="shop-sell">売却 ${r.lootBag.length}</button></nav><div class="is-shop-stock"><small>AVAILABLE STOCK // 通常戦闘 約3〜5回分</small>${stock}</div><button class="is-shop-exit" data-is-action="explore">◀ 奏廊へ戻る</button></section>`;
  };
  P.isRenderShopSell=function(panel){const r=this.isRun(),equipped=new Set(Object.values(r.equipment||{}).filter(Boolean)),sell=r.lootBag.map(x=>{const active=equipped.has(x.uid);return `<article class="is-item is-shop-sell${active?' equipped':''}"><div><strong>${esc(D().items[x.itemId]?.name||x.itemId)}${active?'<em class="is-sell-equipped">装備中</em>':''}</strong><small>${x.kind==='equipment'?'EQUIPMENT':'LOOT ITEM'}${active?' // EQUIPPED':''}</small></div><b>${this.isSellPrice(x)}<em> 奏貨</em></b><button data-is-sell="${x.uid}"${active?' data-is-sell-equipped="true"':''}>${active?'装備中を売却':'売却'}</button></article>`;}).join('');panel.dataset.panel='infinite-score-shop-sell';panel.innerHTML=`<section class="is-shop-screen"><header class="is-shop-hero"><small><i></i>TRADE-IN</small><h2>✦ 戦利品売却 ✦</h2><p>LOOT BAGの戦利品を奏貨へ交換</p><strong>${r.dungeonGold.toLocaleString()}<em> 奏貨</em></strong></header><nav class="is-shop-tabs"><button data-is-action="shop-buy">購入</button><b>売却 ${r.lootBag.length}</b></nav><section class="is-shop-trade is-shop-trade-only"><header><div><small>SELECT LOOT</small><h3>売却する戦利品</h3></div><span>${r.lootBag.length} ITEMS</span></header><div class="is-list">${sell||'<p class="is-shop-empty">売却できる戦利品はまだない。</p>'}</div></section><button class="is-shop-exit" data-is-action="shop-buy">◀ 購入画面へ戻る</button></section>`;};
  P.isSellPrice=function(x){if(x.kind!=='equipment')return 1;const ri=['common','rare','epic','legendary','mythic'].indexOf(x.rarity);return Math.max(2,Math.min(12,2+(ri<0?0:ri*2)+(x.plus||0)+(x.ops?.length||0)));};
  P.isBuy=async function(id,price){const r=this.isRun();if(r.dungeonGold<price)return;if(this.isBagUsed()>=this.isBagLimit()){await this.isNotify('LOOT BAGが満杯です','先にアイテムを使用・装備・破棄して空きを作ってください。',{kicker:'SHOP // BAG FULL'});return;}r.dungeonGold-=price;const x=id==='gear'?this.isGenerateGear():{uid:this.isUid('buy'),kind:'item',itemId:id,count:1};this.isAddLoot(x);this.isRenderShop($('#menu-panel'),!!this.isShopMerchantMode,false);};
  P.isSell=async function(uid){const r=this.isRun(),x=this.isBagEntry(uid);if(!x)return;const slots=Object.keys(r.equipment).filter(s=>r.equipment[s]===uid),name=D().items[x.itemId]?.name||x.itemId;if(slots.length&&!await this.isConfirm('装備中のアイテムです',`${name}を外して売却しますか？`,{kicker:'SHOP // SELL',confirmLabel:'外して売る',danger:true}))return;slots.forEach(s=>delete r.equipment[s]);r.dungeonGold+=this.isSellPrice(x);r.lootBag.splice(r.lootBag.indexOf(x),1);this.isLog(`売却：${name}`);this.isRenderShopSell($('#menu-panel'));};
  P.isReturnRun=function(){const r=this.isRun();if(!r)return;for(const x of r.lootBag){if(x.kind==='equipment'&&x.generated)this.profile.infiniteScoreGear.push(copy(x));this.profile.inventory[x.itemId]=(this.profile.inventory[x.itemId]||0)+(x.count||1);}const count=r.lootBag.length,floor=r.floor;this.profile.equipment=copy(r.homeEquipment||this.profile.equipment);this.profile.currentVitals=copy(r.homeVitals||this.profile.currentVitals);this.profile.infiniteScore={active:false,lastResult:'return',returnedCount:count,lastFloor:floor,endedAt:Date.now()};this.profile.flags.owRestoreJobPending=true;this.saveProfile();document.getElementById('is-modal')?.remove();this.showResult('RETURN SUCCESS',`${count}枠の戦利品を通常所持品へ持ち帰った。`,'INFINITE SCORE // ESCAPED',`<div class="is-stairs"><b>FLOOR ${floor}から生還</b><p>生成装備のレアリティ・OP・強化値は専用インスタンス記録にも保存されています。</p></div>`);};

  // RETURNを奏廊専用アイテムとして登録（通常UIで未所持なら見えない）。
  D().items.infiniteReturn ||= {id:'infiniteReturn',name:'RETURN',nameEn:'RETURN',category:'consumable',rarity:'legendary',description:'無限奏廊から戦利品を持って即時帰還する。',infiniteScoreOnly:true,effect:{returnRun:true}};

  // ── パネル接続と操作 ─────────────────────────────────────
  const origRenderPanel=P.renderMenuPanel,infinitePanel=$('#menu-panel'),infinitePanelHome=infinitePanel?.parentNode,infinitePanelNext=infinitePanel?.nextSibling;
  P.renderMenuPanel=function(name){
    name=String(name||'');
    const panel=$('#menu-panel');
    if(panel&&name.startsWith('infinite-score')){
      panel.dataset.panel=name;
      if(panel.parentNode!==document.body)document.body.appendChild(panel);
      panel.hidden=false;panel.style.display='block';panel.classList.add('panel-tall');panel.scrollTop=0;
      if(name==='infinite-score-warning')this.isRenderWarning(panel);
      else if(name==='infinite-score-import')this.isRenderImport(panel);
      else if(name==='infinite-score-bag')this.isRenderBag(panel);
      else if(name==='infinite-score-equipment')this.isRenderEquipment(panel);
      else if(name==='infinite-score-debug')this.isRenderDebug(panel);
      else if(name==='infinite-score-choices')this.isRenderChoices(panel);
      else if(name==='infinite-score-map')this.isRenderMap(panel);
      else this.isRenderExplore(panel);
      return;
    }
    if(panel&&infinitePanelHome&&panel.parentNode===document.body)infinitePanelHome.insertBefore(panel,infinitePanelNext?.parentNode===infinitePanelHome?infinitePanelNext:null);
    if(panel)panel.style.display='';
    return origRenderPanel.call(this,name);
  };

  const isRollStairsOriginal=P.isRollStairs;
  P.isRollStairs=function(){const r=this.isRun(),map=this.isFloorMap?.(),current=this.isMapNode?.(map?.currentId),existing=map?.nodes?.find(node=>node.stairs);if(existing){if(r)r.stairsFound=existing.id===current?.id;return false;}return isRollStairsOriginal.call(this);};
  P.isRemapCurrentFloor=function(reason='行き止まり'){const r=this.isRun();if(!r)return;r.floorMap=null;r.pendingChoices=null;r.stairsFound=false;this.isExploreOverlayMode=null;this.isRoomResult=null;this.isCreateFloorMap();this.isLog(`${reason}：迷宮を再マッピング`);this.isSave();};
  P.isReturnToDiscoveredStairs=function(){const r=this.isRun(),map=this.isFloorMap?.(),stairs=map?.nodes?.find(node=>node.stairs);if(!r||!stairs)return;map.currentId=stairs.id;stairs.visited=true;r.stairsFound=true;r.pendingChoices=null;this.isExploreOverlayMode=null;this.isStairPromptDismissed=null;this.isRenderExplore($('#menu-panel'));};
  P.isTreasure=function(){const cfg=this.isCfg(),r=this.isRun(),ch=this.isPickWeighted(Object.entries(cfg.chestRates).map(([id,weight])=>({id,weight}))).id,bonus=ch==='gold'?3:ch==='silver'?1:0,gear=this.isGenerateGear({opRank:bonus||undefined});this.isAddLoot(gear);r.buffs.treasureBonus=0;this.isLog(`宝箱(${ch})`,{rarity:gear.rarity,item:gear.itemId,ops:gear.ops});this.isRemapCurrentFloor('宝箱部屋踏破');this.isRenderBag($('#menu-panel'));};
  P.isRoomResultHtml=function(){const result=this.isRoomResult;if(!result)return'';return `<section class="is-room-result ${result.tone||'normal'}"><small>ROOM EVENT // FLOOR ${this.isRun()?.floor||1}</small><h2>${esc(result.title)}</h2><p>${esc(result.text)}</p><button class="is-primary" data-is-action="room-result-close">探索を続ける</button></section>`;};
  P.isRenderRoomResult=function(title,text,tone='normal'){this.isRoomResult={title,text,tone};this.isExploreOverlayMode=null;this.isRenderExplore($('#menu-panel'));};
  P.isResolveEvent=function(type){const r=this.isRun();this.isDismissRouteOverlay();if(type==='encounter'){this.isStartBattle(false);return;}if(type==='rare'){this.isStartBattle(true);return;}if(type==='treasure'){this.isTreasure();return;}if(type==='workshop'){this.isRenderWorkshop($('#menu-panel'));return;}if(type==='shop'){this.isRenderShop($('#menu-panel'),false);return;}if(type==='merchant'){this.isRenderShop($('#menu-panel'),true);return;}if(type==='card'||type==='returnCard'||type==='sublime'){this.isShowCards(type);return;}let title='何もない',message='周囲を調べたが、何も見つからなかった。',tone='empty';if(type==='item'){const id=this.isCfg().consumablePool[Math.floor(this.isRand()*this.isCfg().consumablePool.length)],name=D().items[id]?.name||id;this.isAddLoot({uid:this.isUid('item'),kind:'item',itemId:id,count:1});title=`${name}を発見`;message='バッグへ収めた。';tone='item';}else if(type==='gold'){const gold=Math.max(1,Math.round((1+Math.floor(this.isRand()*5))*(1+r.buffs.goldBonus)));r.dungeonGold+=gold;this.isLog(`奏貨 +${gold}`);title=`奏貨 ${gold}枚を発見`;message='奏廊内で使用できる奏貨を入手した。';tone='gold';}else if(type==='trap'){const stats=this.totalStats(),dmg=Math.max(1,Math.round(stats.maxHp*(.08+this.isRand()*.17)));r.hp=Math.max(1,r.hp-dmg);this.isLog(`罠：HP -${dmg}`);title='罠が作動';message=`仕掛けを受け、HPが${dmg}減少した。`;tone='trap';}this.isRollStairs();this.isSave();this.isRenderRoomResult(title,message,tone);};
  P.isWorkshopGear=function(){return (this.isRun()?.lootBag||[]).filter(x=>x.kind==='equipment'&&x.otherWorldGear);};
  P.isForgeChoice=function({title,copyText='',choices=[]}){document.getElementById('is-forge-modal')?.remove();return new Promise(resolve=>{const el=document.createElement('div');el.id='is-forge-modal';el.className='is-modal is-forge-modal';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.innerHTML=`<div><small>OTHER WORLD FORGE</small><h2>${esc(title)}</h2>${copyText?`<p>${esc(copyText).replace(/\n/g,'<br>')}</p>`:''}<div class="is-forge-choices">${choices.map((x,i)=>`<button type="button" data-forge-choice="${i}">${esc(x.label)}</button>`).join('')}<button type="button" data-forge-cancel>戻る</button></div></div>`;const close=value=>{el.remove();this.audio?.unlock?.();resolve(value);};el.addEventListener('click',e=>{const pick=e.target.closest('[data-forge-choice]');if(pick){close(choices[Number(pick.dataset.forgeChoice)]?.value);return;}if(e.target.closest('[data-forge-cancel]')||e.target===el)close(null);});document.body.appendChild(el);el.querySelector('button')?.focus();});};
  P.isForgeStatPreview=function(x,next=(x.tuneLevel||0)+1){const labels={attackPower:'攻撃力',defensePower:'防御力',magicAttackPower:'魔法攻撃',magicDefensePower:'魔法防御'},now=this.owgEffectiveStats?.(x,x.tuneLevel||0)||{},after=this.owgEffectiveStats?.(x,next)||{};return Object.keys(labels).filter(k=>now[k]||after[k]).map(k=>`<span><b>${labels[k]}</b><em>${now[k]?.total||0} → ${after[k]?.total||0}</em><i>▲${(after[k]?.total||0)-(now[k]?.total||0)}</i></span>`).join('');};
  P.isForgeState=function(){const gear=this.isWorkshopGear(),s=(this.isForgeUI||={mode:'enhance',selectedUid:null,materialUid:null,sourceUid:null,opIndex:0,help:false,busy:false});if(!gear.some(x=>x.uid===s.selectedUid))s.selectedUid=gear[0]?.uid||null;return s;};
  P.isForgeName=function(x){return this.owgName?.(x)||D().items[x?.itemId]?.name||x?.itemId||'装備なし';};
  P.isForgeOpText=function(o){if(!o)return'OP なし';const label=this.isCfg().opLabels[o.key]||o.key,value=Math.abs(Number(o.value))<1?`${Math.round(Number(o.value)*100)}%`:o.value;return `${label} +${value}`;};
  P.isForgeStats=function(x){const values=this.isGearValues(x),labels={attackPower:'ATK',magicAttackPower:'MAG',defensePower:'DEF',magicDefensePower:'M.DEF'};return Object.entries(labels).map(([key,label])=>({key,label,value:Number(values[key])||0}));};
  P.isForgeGearCard=function(x,selected,equipped){const item=D().items[x.itemId]||{},stats=this.isForgeStats(x).filter(v=>v.value).slice(0,2),ops=(x.ops||[]).map(o=>this.isForgeOpText(o)).join(' / ')||'OP なし';return `<button class="is-forge-gear-card stars-${x.stars||3}${selected?' selected':''}${equipped?' equipped':''}" data-is-forge-select="${x.uid}" aria-pressed="${selected}">${equipped?'<i>EQUIPPED</i>':''}<em>+${x.plus||0}</em><span class="is-forge-gear-icon">${D().weapons[x.itemId]?'◆':'◇'}</span><b>${esc(this.isForgeName(x))}</b><small>${esc(item.slot||'EQUIPMENT')}</small><strong>${'★'.repeat(x.stars||3)}</strong><small>QUALITY <b>${x.quality||100}</b></small><span class="is-forge-card-stats">${stats.map(v=>`<i>${v.label} <b>${v.value}</b></i>`).join('')||'<i>特殊効果型</i>'}</span><span class="is-forge-card-op">${esc(ops)}</span></button>`;};
  P.isForgeSelectedHtml=function(x,equipped){if(!x)return'';const item=D().items[x.itemId]||{},stats=this.isForgeStats(x).filter(v=>v.value),ops=(x.ops||[]).map(o=>this.isForgeOpText(o));return `<aside class="is-forge-selected">${equipped?'<i>EQUIPPED</i>':''}<small>SELECTED GEAR</small><span class="is-forge-selected-art">${D().weapons[x.itemId]?'◆':'◇'}</span><h3>${esc(this.isForgeName(x))}</h3><em>${esc(item.slot||'EQUIPMENT')}</em><strong>${'★'.repeat(x.stars||3)}</strong><b>QUALITY ${x.quality||100}</b><b>+${x.plus||0}</b><div>${stats.map(v=>`<span><small>${v.label}</small><b>${v.value}</b></span>`).join('')}</div><p>${ops.length?ops.map(esc).join('<br>'):'OP なし'}</p></aside>`;};
  P.isForgeModePanel=function(x,state){
    if(!x)return'<div class="is-forge-empty">加工できる異世界装備がありません。</div>';
    const r=this.isRun(),mode=state.mode,stats=this.isForgeStats(x),current=x.plus||0,cost=this.owgTuneCost?.(x)||{shard:3+current*2,core:current>=5?1:0},equipped=new Set(Object.values(r.equipment||{}).filter(Boolean));
    const statRows=stats.map(v=>`<div><span>${v.label}</span><b>${v.value}</b><i>→</i><strong>${v.value}</strong><em>—</em></div>`).join('');
    const ops=(x.ops||[]).map((o,i)=>`<button class="${state.opIndex===i?'selected':''}" data-is-forge-op="${i}">${esc(this.isForgeOpText(o))}</button>`).join('')||'<p>OP なし</p>';
    if(mode==='enhance'){
      const can=this.isForgeHasMaterials(cost),rate=this.owgTuneRate?.(current+1)??1,protect=this.isForgeProtectionCount();
      return `<section class="is-forge-preview"><header><small>ENHANCEMENT PREVIEW</small><h3>${esc(this.isForgeName(x))}</h3><b>+${current} <i>≫</i> +${current+1}</b></header><div class="is-forge-stat-table"><small><span>能力</span><b>現在</b><i></i><strong>強化後</strong><em>差分</em></small>${statRows}</div><p class="is-forge-note">成功率 ${Math.round(rate*100)}%。+6以降は異界の核も必要です。${rate<1?'失敗時は装備が消滅します。':''}</p>${rate<1?`<p class="is-forge-note">保護のアルカナ 所持 ${protect}（通常所持品も使用可能）</p>`:''}${this.isForgeMaterialCostHtml(cost,can)}<button class="is-forge-execute" data-is-forge-execute ${can&&!state.busy?'':'disabled'}>${state.busy?'調律中…':'調律する'}<span>${this.isForgeCostText(cost)}</span></button></section>`;
    }
    if(mode==='merge'){
      const candidates=this.isWorkshopGear().filter(v=>v.uid!==x.uid&&v.itemId===x.itemId),mat=candidates.find(v=>v.uid===state.materialUid)||candidates[0];state.materialUid=mat?.uid||null;
      return `<section class="is-forge-preview"><header><small>SAME-TYPE SYNTHESIS</small><h3>同型合成</h3><b>+${current} <i>＋</i> ${mat?`+${mat.plus||0}`:'素材なし'}</b></header><div class="is-forge-pair"><article><small>BASE</small><b>${esc(this.isForgeName(x))}</b><span>QUALITY ${x.quality||100}</span></article><i>＋</i><article><small>MATERIAL</small><b>${mat?esc(this.isForgeName(mat)):'同型装備なし'}</b><span>${mat?`QUALITY ${mat.quality||100}`:'素材を入手してください'}</span></article></div><div class="is-forge-candidates">${candidates.map(v=>`<button class="${v.uid===mat?.uid?'selected':''}" data-is-forge-material="${v.uid}">${equipped.has(v.uid)?'<i>EQUIPPED</i>':''}<b>${esc(this.isForgeName(v))}</b><span>+${v.plus||0} / QUALITY ${v.quality||100}</span></button>`).join('')}</div><div class="is-forge-result"><small>完成予測</small><b>+${current+1} / QUALITY ${mat?Math.min(120,Math.max(x.quality||100,mat.quality||100)+1):x.quality||100}</b></div><p class="is-forge-warning">素材装備は合成後に消滅します。</p><button class="is-forge-execute" data-is-forge-execute ${mat&&!state.busy?'':'disabled'}>${state.busy?'合成中…':'同型合成する'}<span>奏貨消費なし</span></button></section>`;
    }
    if(mode==='transfer'){
      const sources=this.isWorkshopGear().filter(v=>v.uid!==x.uid&&v.ops?.length),src=sources.find(v=>v.uid===state.sourceUid)||sources[0];state.sourceUid=src?.uid||null;const op=src?.ops?.[Math.min(state.opIndex,src.ops.length-1)]||src?.ops?.[0];if(src&&state.opIndex>=src.ops.length)state.opIndex=0;const transferCost=op?{shard:20+op.rank*10,core:Math.max(1,op.rank-2)}:{shard:0,core:0},can=!!op&&this.isForgeHasMaterials(transferCost),preview=op?this.isForgeTransferOp(op,x):null;
      return `<section class="is-forge-preview"><header><small>OPTION TRANSPLANT</small><h3>OP移植</h3><b>TARGET <i>←</i> SOURCE</b></header><div class="is-forge-pair"><article><small>TARGET / 移植先</small><b>${esc(this.isForgeName(x))}</b><span>${esc((x.ops||[]).map(o=>this.isForgeOpText(o)).join(' / ')||'OP なし')}</span></article><i>←</i><article><small>SOURCE / 提供装備</small><b>${src?esc(this.isForgeName(src)):'提供装備なし'}</b><span>${op?esc(this.isForgeOpText(op)):'移植可能OPなし'}</span></article></div><div class="is-forge-candidates">${sources.map(v=>`<button class="${v.uid===src?.uid?'selected':''}" data-is-forge-source="${v.uid}">${equipped.has(v.uid)?'<i>EQUIPPED</i>':''}<b>${esc(this.isForgeName(v))}</b><span>${v.ops.length} OP</span></button>`).join('')}</div><div class="is-forge-op-list">${src?src.ops.map((o,i)=>`<button class="${state.opIndex===i?'selected':''}" data-is-forge-op="${i}">${esc(this.isForgeOpText(o))}</button>`).join(''):'<p>OPを持つ提供装備がありません。</p>'}</div><div class="is-forge-result"><small>移植後OP（★上限 R${Math.min(5,Math.max(1,(Number(x.stars)||3)-1))}）</small><b>${preview?esc(this.isForgeOpText(preview)):'—'}</b></div><p class="is-forge-warning">SOURCE装備は移植後に消滅します。</p>${this.isForgeMaterialCostHtml(transferCost,can)}<button class="is-forge-execute" data-is-forge-execute ${can&&!state.busy?'':'disabled'}>${state.busy?'移植中…':'OPを移植する'}<span>${this.isForgeCostText(transferCost)}</span></button></section>`;
    }
    const op=x.ops?.[Math.min(state.opIndex,x.ops.length-1)]||x.ops?.[0];if(x.ops?.length&&state.opIndex>=x.ops.length)state.opIndex=0;const deleteCost={shard:10,core:0},can=!!op&&this.isForgeHasMaterials(deleteCost);
    return `<section class="is-forge-preview danger"><header><small>OPTION DELETE</small><h3>OP削除</h3><b>${op?esc(this.isForgeOpText(op)):'削除可能OPなし'}</b></header><div class="is-forge-op-list">${ops}</div><div class="is-forge-result"><small>削除後</small><b>選択OPを削除</b></div>${this.isForgeMaterialCostHtml(deleteCost,can)}<button class="is-forge-execute danger" data-is-forge-execute ${can&&!state.busy?'':'disabled'}>${state.busy?'削除中…':'このOPを削除する'}<span>欠片 10</span></button></section>`;
  };
  P.isForgeCostHtml=function(cost,can){const gold=this.isRun()?.dungeonGold||0,remaining=gold-cost;return `<div class="is-forge-cost${can?'':' short'}"><span><small>現在奏貨</small><b>${gold.toLocaleString()}</b></span><i>−</i><span><small>加工費</small><b>${cost.toLocaleString()}</b></span><i>＝</i><span><small>残り奏貨</small><b>${Math.max(0,remaining).toLocaleString()}</b></span></div>${can?'':'<p class="is-forge-short">奏貨が不足しています</p>'}`;};
  P.isForgeMaterialCount=function(itemId){return (this.isRun()?.lootBag||[]).filter(x=>x.itemId===itemId).reduce((sum,x)=>sum+Math.max(1,Number(x.count)||1),0);};
  P.isForgeHasMaterials=function(cost={}){return this.isForgeMaterialCount('otherworldShard')>=(cost.shard||0)&&this.isForgeMaterialCount('otherworldCore')>=(cost.core||0);};
  P.isForgeSpendMaterials=function(cost={}){if(!this.isForgeHasMaterials(cost))return false;const bag=this.isRun().lootBag,spend=(itemId,need)=>{for(let i=bag.length-1;i>=0&&need>0;i--){const x=bag[i];if(x.itemId!==itemId)continue;const take=Math.min(need,Math.max(1,Number(x.count)||1));x.count=(Number(x.count)||1)-take;need-=take;if(x.count<=0)bag.splice(i,1);}};spend('otherworldShard',cost.shard||0);spend('otherworldCore',cost.core||0);return true;};
  P.isForgeCostText=function(cost={}){return `欠片 ${cost.shard||0}${cost.core?` / 核 ${cost.core}`:''}`;};
  P.isForgeProtectionCount=function(){return Math.max(0,Number(this.profile?.inventory?.protectionArcana)||0)+this.isForgeMaterialCount('protectionArcana');};
  P.isForgeSpendProtection=function(){const bag=this.isRun()?.lootBag||[],i=bag.findIndex(x=>x.itemId==='protectionArcana');if(i>=0){bag.splice(i,1);return true;}const inv=this.profile.inventory||{};if((inv.protectionArcana||0)>0){inv.protectionArcana--;return true;}return false;};
  P.isForgeMaterialCostHtml=function(cost,can){return `<div class="is-forge-cost${can?'':' short'}"><span><small>所持素材</small><b>欠片 ${this.isForgeMaterialCount('otherworldShard')} / 核 ${this.isForgeMaterialCount('otherworldCore')}</b></span><i>−</i><span><small>加工費</small><b>${this.isForgeCostText(cost)}</b></span></div>${can?'':'<p class="is-forge-short">異界素材が不足しています</p>'}`;};
  P.isRenderWorkshop=function(panel){
    const r=this.isRun(),gear=this.isWorkshopGear(),state=this.isForgeState(),selected=gear.find(x=>x.uid===state.selectedUid),equipped=new Set(Object.values(r.equipment||{}).filter(Boolean)),used=this.isBagUsed(),limit=this.isBagLimit(),full=used>=limit;
    panel.dataset.panel='infinite-score-workshop';
    panel.innerHTML=`<main class="is-forge-screen"><header class="is-forge-header"><button data-is-forge-help aria-label="ヘルプ">?</button><div><small>RARE ENCOUNTER // OTHER WORLD FORGE</small><h2>異世界工房</h2></div><button data-is-action="workshop-exit">工房を出る</button></header><section class="is-forge-resource"><div><small>異界の欠片</small><b>${this.isForgeMaterialCount('otherworldShard')}</b><em>FORGE MATERIAL</em></div><p>工房の加工で消費するRUN内素材。奏貨は帰還時消滅。</p><div><small>異界の核</small><b>${this.isForgeMaterialCount('otherworldCore')}</b><em>+6以降・OP移植</em></div></section><nav class="is-forge-tabs">${[['enhance','強化'],['merge','同型合成'],['transfer','OP移植'],['delete','OP削除']].map(([id,label])=>`<button class="${state.mode===id?'active':''}${id==='delete'?' danger':''}" data-is-forge-mode="${id}">${label}</button>`).join('')}</nav><section class="is-forge-picker"><header><b>装備選択</b><span class="${full?'full':''}">バッグ ${used} / ${limit}</span></header><div>${gear.map(x=>this.isForgeGearCard(x,x.uid===selected?.uid,equipped.has(x.uid))).join('')||'<p class="is-forge-empty">異世界装備を所持していません。</p>'}</div></section><section class="is-forge-detail-layout">${this.isForgeSelectedHtml(selected,equipped.has(selected?.uid))}<div class="is-forge-preview-column"><small>PROCESS PREVIEW // 右側プレビュー</small>${this.isForgeModePanel(selected,state)}</div></section>${state.help?`<section class="is-forge-help"><div><header><b>異世界工房ガイド</b><button data-is-forge-help>×</button></header><p><strong>調律</strong> 異界の欠片を使い、RUN中の装備強化値を+1します。+6以降は異界の核も必要です。</p><p><strong>同型合成</strong> 同じ種類の装備を素材にして、強化値とQUALITYを上げます。</p><p><strong>OP移植</strong> 欠片と核を使い、SOURCE装備のOPをTARGETへ移します。移植ランクはTARGETの★に制限されます。</p><p><strong>OP削除</strong> 異界の欠片10個で選択したOPを取り除きます。</p><p><strong>異界素材</strong> 無限奏廊内で拾った欠片と核だけを使用します。</p></div></section>`:''}</main>`;
  };
  const isRenderWorkshopBase=P.isRenderWorkshop;
  P.isRenderWorkshop=function(panel){
    const previous=panel?.querySelector('.is-forge-picker>div')?.scrollLeft??this.isForgePickerScroll??0;
    this.isForgePickerScroll=previous;
    isRenderWorkshopBase.call(this,panel);
    if(this.isForgeUI?.mode==='transfer'){
      const target=this.isBagEntry(this.isForgeUI.selectedUid),source=this.isBagEntry(this.isForgeUI.sourceUid),sourceOp=source?.ops?.[this.isForgeUI.opIndex||0],targetOp=target?.ops?.find(op=>op.key===sourceOp?.key),result=targetOp&&sourceOp?this.isForgeCombinedOp?.(targetOp,sourceOp):null,resultNode=panel?.querySelector('.is-forge-result b');
      if(result&&resultNode)resultNode.textContent=`同一OP合成後：${this.isForgeOpText(result)}`;
    }
    const picker=panel?.querySelector('.is-forge-picker>div');
    if(picker){picker.scrollLeft=previous;requestAnimationFrame(()=>{if(picker.isConnected)picker.scrollLeft=previous;});}
  };
  P.isForgeEnhance=async function(uid){const r=this.isRun(),x=this.isBagEntry(uid);if(!r||!x?.otherWorldGear)return;const current=x.plus||0,next=current+1,cost=this.owgTuneCost?.(x)||{shard:3+current*2,core:current>=5?1:0},rate=this.owgTuneRate?.(next)??1,name=this.isForgeName(x);if(!this.isForgeHasMaterials(cost)){await this.isNotify('異界素材が足りません',`必要 ${this.isForgeCostText(cost)}`);return;}let protectedByArcana=false;if(rate<1&&this.isForgeProtectionCount()>0){const use=await this.isChoose('保護のアルカナを使いますか？',[{label:'使用する',note:`所持 ${this.isForgeProtectionCount()}／失敗時も装備と強化値を維持`},{label:'使用しない',note:'失敗時は装備消滅'}],{kicker:'TUNING PROTECTION'});if(use===null)return;protectedByArcana=use===0;}if(!await this.isConfirm(`${name}を調律しますか？`,`+${current} → +${next}\n必要 ${this.isForgeCostText(cost)}\n成功率 ${Math.round(rate*100)}%${protectedByArcana?'／保護あり':rate<1?'／失敗時消滅':''}`,{kicker:'OTHER WORLD FORGE',confirmLabel:'調律する',danger:rate<1&&!protectedByArcana}))return;this.isForgeSpendMaterials(cost);if(protectedByArcana)this.isForgeSpendProtection();if(this.isRand()<rate){x.plus=next;x.tuneLevel=next;this.isLog(`異世界工房：${name}を+${next}へ調律`);this.audio?.sfx?.('confirm');}else if(protectedByArcana){this.isLog(`異世界工房：調律失敗、保護のアルカナが${name}を守った`);this.audio?.sfx?.('defeat');await this.isNotify('調律失敗','保護のアルカナにより、装備と現在の強化値を維持しました。',{kicker:'ARCANA PROTECTION'});}else{Object.keys(r.equipment).forEach(s=>{if(r.equipment[s]===x.uid)delete r.equipment[s]});r.lootBag.splice(r.lootBag.indexOf(x),1);this.isLog(`異世界工房：調律失敗、${name}が消滅`);this.audio?.sfx?.('defeat');await this.isNotify('調律失敗',`${name}は無限奏廊へ消滅しました。`,{kicker:'TUNING FAILED'});}this.isSave();this.isRenderWorkshop($('#menu-panel'));};
  P.isForgeMerge=async function(uid,materialUid=null){const base=this.isBagEntry(uid),candidates=this.isWorkshopGear().filter(x=>x.uid!==uid&&x.itemId===base?.itemId),mat=materialUid?candidates.find(x=>x.uid===materialUid):null;if(!mat){await this.isNotify('合成できません','同じ種類の異世界装備がありません。',{kicker:'OTHER WORLD FORGE'});return;}if(!await this.isConfirm('同型合成しますか？',`${this.isForgeName(mat)}は素材として消滅します。`,{kicker:'SAME-TYPE SYNTHESIS',confirmLabel:'合成する',danger:true}))return;const r=this.isRun();base.plus=(base.plus||0)+1;base.tuneLevel=base.plus;base.quality=Math.min(120,Math.max(base.quality||100,mat.quality||100)+1);const pool=(mat.ops||[]).filter(o=>!base.ops.some(v=>v.key===o.key));if(base.ops.length<4&&pool.length)base.ops.push(copy(pool.sort((a,b)=>b.rank-a.rank)[0]));Object.keys(r.equipment).forEach(s=>{if(r.equipment[s]===mat.uid)delete r.equipment[s]});r.lootBag.splice(r.lootBag.indexOf(mat),1);this.isLog(`異世界工房：同型合成 +${base.plus}`);this.isSave();this.audio?.sfx?.('confirm');this.isRenderWorkshop($('#menu-panel'));};
  P.isForgeCombinedOp=function(targetOp,sourceOp){
    if(!targetOp||!sourceOp||targetOp.key!==sourceOp.key)return copy(sourceOp);
    return {...copy(targetOp),rank:Math.max(targetOp.rank||1,sourceOp.rank||1),value:(Number(targetOp.value)||0)+(Number(sourceOp.value)||0)};
  };
  P.isForgeTransferOp=function(op,target){const out=copy(op),maxRank=Math.min(5,Math.max(1,(Number(target?.stars)||3)-1));if(out.rank<=maxRank)return out;out.rank=maxRank;const def=D().otherWorldGearOps?.find(x=>x.key===out.key),cap=def?.values?.[maxRank-1];if(Number.isFinite(cap))out.value=Math.min(Number(out.value)||cap,cap);return out;};
  P.isForgeTransfer=async function(sourceUid,targetUid=null,opIndex=0){
    const src=this.isBagEntry(sourceUid),chosen=src?.ops?.[opIndex],target=this.isBagEntry(targetUid);
    if(!src||!chosen||!target||src.uid===target.uid)return;
    const r=this.isRun(),cost={shard:20+chosen.rank*10,core:Math.max(1,chosen.rank-2)},moved=this.isForgeTransferOp(chosen,target),same=target.ops.findIndex(o=>o.key===chosen.key),combined=same>=0?this.isForgeTransferOp(this.isForgeCombinedOp(target.ops[same],moved),target):null;
    if(!this.isForgeHasMaterials(cost)){await this.isNotify('異界素材が足りません',`必要 ${this.isForgeCostText(cost)}`);return;}
    const replace=same<0&&target.ops.length>=4?await this.isChoose('上書きするOPを選択',target.ops.map(o=>({label:this.isCfg().opLabels[o.key]||o.key,note:`RANK ${o.rank}`})),{kicker:'OPTION TRANSPLANT'}):-1;
    if(same<0&&target.ops.length>=4&&!target.ops[replace])return;
    const resultText=same>=0?`同一OPを合成して ${this.isForgeOpText(combined)} に強化します。\n`:'';
    if(!await this.isConfirm('OPを移植しますか？',`${this.isForgeName(src)}は消滅します。\n${resultText}必要 ${this.isForgeCostText(cost)}`,{kicker:'OPTION TRANSPLANT',confirmLabel:'移植する',danger:true}))return;
    this.isForgeSpendMaterials(cost);
    if(same>=0)target.ops[same]=combined;else if(replace>=0)target.ops[replace]=moved;else target.ops.push(moved);
    Object.keys(r.equipment).forEach(s=>{if(r.equipment[s]===src.uid)delete r.equipment[s]});
    r.lootBag.splice(r.lootBag.indexOf(src),1);this.isForgeUI.sourceUid=null;this.isLog(same>=0?`異世界工房：同一OP合成 ${this.isForgeOpText(combined)}`:'異世界工房：OP移植');this.isSave();this.isRenderWorkshop($('#menu-panel'));
  };
  P.isForgeDelete=async function(uid,index=0){const x=this.isBagEntry(uid),op=x?.ops?.[index],cost={shard:10,core:0};if(!op)return;if(!this.isForgeHasMaterials(cost)){await this.isNotify('異界の欠片が足りません','必要 欠片 10');return;}if(!await this.isConfirm('このOPを削除しますか？',`${this.isForgeOpText(op)}\n${this.isForgeName(x)}\n必要 欠片 10`,{kicker:'OPTION DELETE',confirmLabel:'削除する',danger:true}))return;this.isForgeSpendMaterials(cost);x.ops.splice(index,1);this.isForgeUI.opIndex=0;this.isLog('異世界工房：OP削除');this.isSave();this.isRenderWorkshop($('#menu-panel'));};

  P.isForgeExecute=async function(){const s=this.isForgeState(),x=this.isBagEntry(s.selectedUid);if(!x||s.busy)return;s.busy=true;this.isRenderWorkshop($('#menu-panel'));try{if(s.mode==='enhance')await this.isForgeEnhance(x.uid);else if(s.mode==='merge')await this.isForgeMerge(x.uid,s.materialUid);else if(s.mode==='transfer')await this.isForgeTransfer(s.sourceUid,x.uid,s.opIndex);else await this.isForgeDelete(x.uid,s.opIndex);}finally{s.busy=false;if(this.isRun())this.isRenderWorkshop($('#menu-panel'));}};

  document.addEventListener('click',e=>{const g=window.arseneGame;if(!g)return;const button=e.target.closest('[data-is-forge-mode],[data-is-forge-select],[data-is-forge-material],[data-is-forge-source],[data-is-forge-op],[data-is-forge-execute],[data-is-forge-help],[data-action="workshop-exit"],[data-is-action="workshop-exit"]');if(!button)return;e.preventDefault();e.stopImmediatePropagation();const s=g.isForgeState();if(button.matches('[data-is-forge-mode]')){s.mode=button.dataset.isForgeMode;s.materialUid=null;s.sourceUid=null;s.opIndex=0;}else if(button.matches('[data-is-forge-select]')){s.selectedUid=button.dataset.isForgeSelect;s.materialUid=null;s.sourceUid=null;s.opIndex=0;}else if(button.matches('[data-is-forge-material]'))s.materialUid=button.dataset.isForgeMaterial;else if(button.matches('[data-is-forge-source]')){s.sourceUid=button.dataset.isForgeSource;s.opIndex=0;}else if(button.matches('[data-is-forge-op]'))s.opIndex=Number(button.dataset.isForgeOp)||0;else if(button.matches('[data-is-forge-help]'))s.help=!s.help;else if(button.matches('[data-is-forge-execute]')){g.isForgeExecute();return;}else{g.isRollStairs();g.renderMenuPanel('infinite-score');return;}g.isRenderWorkshop($('#menu-panel'));},true);
  document.addEventListener('click',e=>{if(e.target.closest('[data-is-action="resume"]'))window.arseneGame?.isPlayExploreMusic?.();},true);
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-is-job-change-import]'),g=window.arseneGame;
    if(!button||!g)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(!g.isJobUnlocked?.('phantomThief')){g.renderMenuPanel('infinite-score-import');return;}
    if(!g.isPhantomThief()){
      g.profile.otherWorldReturnJob=g.profile.currentJob;
      g.profile.lastNormalJob=g.profile.currentJob;
      g.profile.flags.owRestoreJobPending=false;
    }
    g.switchJobState('phantomThief',false);
    g.renderMenuPanel('infinite-score-import');
  },true);
  document.addEventListener('click',e=>{const a=e.target.closest('[data-is-action="explore-log"]'),g=window.arseneGame;if(!a||!g)return;e.preventDefault();e.stopImmediatePropagation();g.isExploreLogExpanded=!g.isExploreLogExpanded;g.isRenderExplore($('#menu-panel'));});
  document.addEventListener('click',e=>{const a=e.target.closest('[data-is-action="shop-sell"],[data-is-action="shop-buy"]'),g=window.arseneGame;if(!a||!g)return;e.preventDefault();e.stopImmediatePropagation();const panel=$('#menu-panel');if(a.dataset.isAction==='shop-sell')g.isRenderShopSell(panel);else g.isRenderShop(panel,!!g.isShopMerchantMode,false);},true);
  document.addEventListener('click',e=>{const row=e.target.closest('[data-is-bag-select]');if(!row)return;e.preventDefault();e.stopImmediatePropagation();const item=row.closest('.is-bag-item'),wasOpen=item?.classList.contains('open'),list=item?.parentElement;if(!item||!list)return;list.querySelectorAll('.is-bag-item.open').forEach(other=>{other.classList.remove('open');other.querySelector('.is-bag-row')?.setAttribute('aria-expanded','false');const detail=other.querySelector('.is-bag-inline-detail');if(detail)detail.hidden=true;});if(!wasOpen){item.classList.add('open');row.setAttribute('aria-expanded','true');const detail=item.querySelector('.is-bag-inline-detail');if(detail)detail.hidden=false;}},true);
  document.addEventListener('click',e=>{const button=e.target.closest('[data-is-bag-sort]'),g=window.arseneGame;if(!button||!g)return;e.preventDefault();e.stopImmediatePropagation();g.isSortBag();},true);
  document.addEventListener('click',e=>{const a=e.target.closest('[data-is-action]'),g=window.arseneGame;if(!a||!g)return;const act=a.dataset.isAction;if(!['stairs-continue','stairs-open'].includes(act))return;e.preventDefault();e.stopImmediatePropagation();if(act==='stairs-continue')g.isStairPromptDismissed=g.isFloorMap()?.currentId;else g.isStairPromptDismissed=null;g.isRenderExplore($('#menu-panel'));},true);
  document.addEventListener('click',async e=>{const g=window.arseneGame;if(!g)return;const action=e.target.closest('[data-is-action="return-check"]'),drop=e.target.closest('[data-is-drop]');if(!action&&!drop)return;e.preventDefault();e.stopImmediatePropagation();if(action){const item=g.isRun()?.lootBag.find(x=>x.itemId==='infiniteReturn');if(!item){await g.isNotify('RETURNを持っていません','探索中にRETURNを入手すると帰還できます。');return;}if(await g.isConfirm('無限奏廊から帰還しますか？','現在のLOOT BAGをすべて持ち帰ります。',{kicker:'RETURN CHECK',confirmLabel:'帰還する'}))g.isUseBagItem(item.uid);return;}const x=g.isBagEntry(drop.dataset.isDrop),name=D().items[x?.itemId]?.name||x?.itemId;if(x&&await g.isConfirm(`${name}を捨てますか？`,'捨てた戦利品は元に戻せません。',{kicker:'LOOT DISCARD',confirmLabel:'捨てる',danger:true}))g.isDrop(x.uid);},true);
  document.addEventListener('click',e=>{const g=window.arseneGame;if(!g)return;const a=e.target.closest('[data-is-action]');if(a){e.preventDefault();const act=a.dataset.isAction,p=$('#menu-panel');if(act==='warning')g.renderMenuPanel('infinite-score-warning');else if(act==='import')g.renderMenuPanel('infinite-score-import');else if(act==='begin'||act==='begin-empty'){const ids=[];if(act==='begin')for(const input of document.querySelectorAll('[data-is-import]'))for(let n=0;n<Math.max(0,Number(input.value)||0);n++)ids.push(input.dataset.isImport);g.isBegin(ids);}else if(act==='resume'||act==='explore'){g.isExploreOverlayMode=null;g.renderMenuPanel('infinite-score');}else if(act==='map')g.renderMenuPanel('infinite-score-map');else if(act==='route-advance'){g.isExploreOverlayMode='advance';g.isRun().pendingChoices=null;g.isRenderExplore(p);}else if(act==='route-examine'){g.isExploreOverlayMode='examine';g.isRun().pendingChoices=null;g.isRenderExplore(p);}else if(act==='route-close'){g.isExploreOverlayMode=null;g.isRenderExplore(p);}else if(act==='route-choice'){if(a.dataset.isResolved)return;a.dataset.isResolved='1';g.isResolveChoice(+a.dataset.isChoice);}else if(act==='explore-menu'){g.isExploreMenuOpen=!g.isExploreMenuOpen;g.isRenderExplore(p);}else if(act==='explore-menu-close'){g.isExploreMenuOpen=false;g.isRenderExplore(p);}else if(act==='return-notice-close'){g.isRenderExplore(p);}else if(act==='room-result-close'){g.isRoomResult=null;g.isRenderExplore(p);}else if(act==='return-locked'){window.arseneStartFlow?.toast('RETURNを入手すると帰還できます');}else if(act==='map-back')g.isMapBack();else if(act==='map-remap'){g.isRemapCurrentFloor();g.isRenderExplore(p);}else if(act==='bag')g.renderMenuPanel('infinite-score-bag');else if(act==='equipment')g.renderMenuPanel('infinite-score-equipment');else if(act==='abilities')g.isOpenAbilitySettings();else if(act==='debug')g.renderMenuPanel('infinite-score-debug');else if(act==='choices')g.renderMenuPanel('infinite-score-choices');else if(act==='battle')g.isStartBattle(false);else if(act==='descend'){g.isDescend();g.renderMenuPanel('infinite-score');}else if(act==='after-battle')g.isAfterBattle();else if(act==='return-check'){if(confirm('現在のLOOT BAGを持って帰還しますか？（RETURNが必要）')){const x=g.isRun()?.lootBag.find(x=>x.itemId==='infiniteReturn');if(x)g.isUseBagItem(x.uid);else alert('RETURNを持っていません。');}}else if(act==='generate'){g.isAddLoot(g.isGenerateGear());g.isRenderDebug(p);}else if(act==='death-test'){if(confirm('死亡処理を実行し、RUN内の全アイテムをロストしますか？')){g.battleMode='infiniteScore';g.defeat();}}else if(act==='debug-reset'){g.profile.infiniteScoreDebug={};g.saveProfile();g.isRenderDebug(p);}else if(act==='retry-loot'){const r=g.isRun();if(g.isBagUsed()<g.isBagLimit()){const x=r.pendingLoot;r.pendingLoot=null;g.isAddLoot(x);document.getElementById('is-modal')?.remove();g.isRenderBag(p);}}else if(act==='discard-loot'){g.isRun().pendingLoot=null;g.saveProfile();document.getElementById('is-modal')?.remove();}return;}
    const menuClose=e.target.closest('[data-is-explore-menu-close]');if(menuClose){g.isExploreMenuOpen=false;g.isRenderExplore($('#menu-panel'));return;}const audioToggle=e.target.closest('.is-explore-menu [data-battle-audio-toggle]');if(audioToggle){const channel=audioToggle.dataset.battleAudioToggle,current=g.audio.levels[channel]||0;if(current>0){g.battleAudioRestore[channel]=current;g.audio.setVolume(channel,0);}else g.audio.setVolume(channel,Math.round(100*(g.battleAudioRestore[channel]||{bgm:.42,sfx:.72,voice:.70}[channel])));g.isRenderExplore($('#menu-panel'));return;}
    const runSlot=e.target.closest('[data-is-run-slot]');if(runSlot){g.isRunEquipSlot=runSlot.dataset.isRunSlot;g.isRenderEquipment($('#menu-panel'));return;}const runSlotClose=e.target.closest('[data-is-run-slot-close]');if(runSlotClose){g.isRunEquipSlot=null;g.isRenderEquipment($('#menu-panel'));return;}const runEquip=e.target.closest('[data-is-run-equip]');if(runEquip){g.isEquip(runEquip.dataset.isRunEquip);return;}const runUnequip=e.target.closest('[data-is-run-unequip]');if(runUnequip){delete g.isRun().equipment[runUnequip.dataset.isRunUnequip];g.isSave();g.isRenderEquipment($('#menu-panel'));return;}
    const choice=e.target.closest('[data-is-choice]');if(choice){if(choice.dataset.isResolved)return;choice.dataset.isResolved='1';g.isResolveChoice(+choice.dataset.isChoice);return;}const card=e.target.closest('[data-is-card]');if(card){g.isApplyCard(+card.dataset.isCard);return;}const equip=e.target.closest('[data-is-equip]');if(equip){g.isEquip(equip.dataset.isEquip);return;}const unequip=e.target.closest('[data-is-unequip]');if(unequip){delete g.isRun().equipment[unequip.dataset.isUnequip];g.isSave();g.isRenderEquipment($('#menu-panel'));return;}const use=e.target.closest('[data-is-use]');if(use){g.isUseBagItem(use.dataset.isUse);return;}const drop=e.target.closest('[data-is-drop]');if(drop){if(confirm('このアイテムを捨てますか？'))g.isDrop(drop.dataset.isDrop);return;}const del=e.target.closest('[data-is-op-delete]');if(del){g.isDeleteOp(del.dataset.isOpDelete);return;}const merge=e.target.closest('[data-is-merge]');if(merge){g.isOpenMerge(merge.dataset.isMerge);return;}const force=e.target.closest('[data-is-debug-force]');if(force){g.isRun().forcedEvent=force.dataset.isDebugForce;g.isLog(`次回強制：${force.dataset.isDebugForce}`);g.isRenderDebug($('#menu-panel'));return;}const buy=e.target.closest('[data-is-buy]');if(buy){g.isBuy(buy.dataset.isBuy,+buy.dataset.price);return;}const sell=e.target.closest('[data-is-sell]');if(sell){g.isSell(sell.dataset.isSell);return;}},true);
  document.addEventListener('change',e=>{const input=e.target.closest('[data-is-debug-key]'),g=window.arseneGame;if(!input||!g)return;const key=input.dataset.isDebugKey,val=Number(input.value);if(key==='floor')g.isRun().floor=clamp(Math.round(val),1,g.isCfg().maxFloor||9999);else g.profile.infiniteScoreDebug[key]=val;g.saveProfile();},true);
  document.addEventListener('input',e=>{const slider=e.target.closest('.is-explore-menu [data-battle-volume]'),g=window.arseneGame;if(!slider||!g)return;const channel=slider.dataset.battleVolume,percent=Number(slider.value)||0;g.audio.setVolume(channel,percent);if(percent>0)g.battleAudioRestore[channel]=percent/100;const value=document.querySelector(`.is-explore-menu [data-battle-volume-value="${channel}"]`);if(value)value.textContent=`${percent}%`;},true);
  document.addEventListener('click',e=>{const button=e.target.closest('[data-is-generate-specified]'),g=window.arseneGame;if(!button||!g)return;e.preventDefault();const gear=g.isGenerateDebugGear();if(gear)g.isAddLoot(gear);g.isRenderDebug($('#menu-panel'));},true);
})();
