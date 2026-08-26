// ARSÈNE RPG / 無限奏廊 - INFINITE SCORE (DEBUG playable prototype)
(() => {
  'use strict';
  const BG = window.BattleGame;
  if (!BG) return;
  const P = BG.prototype, $ = s => document.querySelector(s), D = () => window.ARSENE_DATA;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const copy = v => JSON.parse(JSON.stringify(v));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  P.isCfg = function () { return D().infiniteScore || {}; };
  P.isDebugAllowed = function () { return !!window.arseneDebugRoom?.isUnlocked?.() || this.localScenario?.id === 'infinite-score-ready'; };
  P.isRun = function () { return this.profile?.infiniteScore?.active ? this.profile.infiniteScore : null; };
  P.isEnsureRunShape = function (run = this.isRun()) {
    if (!run) return null;
    run.version = 2;
    run.floor = Math.max(1, Number(run.floor) || 1);
    run.encounterCountOnFloor = Math.max(0, Number(run.encounterCountOnFloor) || 0);
    run.lootBag = Array.isArray(run.lootBag) ? run.lootBag : [];
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
    this.profile.currentJob = 'phantomThief';
    this.profile.jobs.phantomThief ||= {level:1,exp:0};
    Object.assign(this.profile.inventory,{potion:5,manaPotion:5});
    const stats=this.totalStats();
    this.profile.currentVitals={hp:stats.maxHp,mp:stats.maxMp};
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
    const total = origTotalStats.apply(this, args);
    for (const gear of this.isRunGear()) {
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
    const out = origCombatStats.apply(this, args), keys = ['attackPower','defensePower','magicAttackPower','magicDefensePower'];
    for (const gear of this.isRunGear()) {
      const base = this.equipmentDefinition?.(gear.itemId) || {}, mult = gear.generated ? (gear.multiplier || 1) : 1;
      for (const key of keys) out[key] = (out[key] || 0) + Math.round((Number(base[key]) || 0) * mult);
      for (const op of gear.ops || []) if (keys.includes(op.key)) out[op.key] = (out[op.key] || 0) + op.value;
      if (gear.plus) for (const key of keys) out[key] = Math.round((out[key] || 0) * (1 + gear.plus * .08));
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
    if (!this.isDebugAllowed()) return;
    const active = this.isEnsureRunShape(this.isRun());
    if (active) this.saveProfile();
    panel.insertAdjacentHTML('beforeend', `<button class="ow-enter is-score-entry" data-is-action="${active ? 'resume' : 'warning'}"><b>無限奏廊</b><span>INFINITE SCORE // DEBUG${active ? ` // FLOOR ${active.floor}` : ''}</span></button>`);
  };
  P.isRenderWarning = function (panel) {
    panel.innerHTML = `<button class="panel-home" data-lenny="otherworld">異世界へ戻る</button><small>INFINITE SCORE // DEBUG</small><h2>無限奏廊</h2>
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
  P.isToolbar = function () { return `<div class="is-toolbar"><button data-is-action="explore">探索</button><button data-is-action="map">MAP</button><button data-is-action="bag">バッグ</button><button data-is-action="equipment">装備</button><button data-is-action="debug">DEBUG</button><button data-is-action="return-check">RETURN</button></div>`; };
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
    const width=mini?145:300,height=mini?132:520,pad=mini?9:18;
    // 左右端へ張り付き過ぎないよう、通路を中央約68%へ寄せる。
    const sideInset=width*.16,mapLeft=pad+sideInset,mapRight=width-pad-sideInset;
    const laneSpan=(mapRight-mapLeft)/Math.max(1,map.width-1),miniBase=Math.max(0,(current?.row||0)-1);
    const rowSpan=mini?(height-pad*2)/3:(height-pad*2)/Math.max(1,map.rows-1);
    const xy=n=>{const weave=((((n.row*7+n.col*3)%3)-1)*laneSpan*.12);return{x:Math.max(mapLeft,Math.min(mapRight,mapLeft+n.col*laneSpan+weave)),y:height-pad-(n.row-(mini?miniBase:0))*rowSpan};};
    const cells=[],addSegment=(p,q)=>{const steps=Math.max(1,Math.ceil(Math.max(Math.abs(q.x-p.x),Math.abs(q.y-p.y))/(mini?7:9)));for(let i=0;i<=steps;i++){const t=i/steps;cells.push(`<i class="is-map-cell" style="left:${(p.x+(q.x-p.x)*t).toFixed(1)}px;top:${(p.y+(q.y-p.y)*t).toFixed(1)}px"></i>`);}};for(const [a,b] of map.links){if(!known.has(a)||!known.has(b))continue;const p=xy(this.isMapNode(a)),q=xy(this.isMapNode(b)),midY=(p.y+q.y)/2,turnA={x:p.x,y:midY},turnB={x:q.x,y:midY};addSegment(p,turnA);addSegment(turnA,turnB);addSegment(turnB,q);}
    const nodes=map.nodes.filter(n=>known.has(n.id)).map(n=>{const p=xy(n),cls=n.id===map.currentId?' current':n.visited?' visited':next.has(n.id)?' reachable':'';return `<span class="is-map-node${cls}" style="left:${p.x}px;top:${p.y}px" title="${esc(n.visited?n.type:'未踏')}" aria-label="${n.id===map.currentId?'現在地':n.visited?'訪問済み':'未踏の分岐'}">${this.isMapEventIcon(n)}</span>`;}).join('');
    return `<section class="is-map${mini?' is-map-mini':''}"><div class="is-map-title"><b>${mini?'迷宮マップ':`FLOOR ${map.floor} MAP`}</b><span>${map.nodes.filter(n=>n.visited).length} / ${map.nodes.length}</span></div><div class="is-map-canvas" style="--map-width:${width}px;--map-height:${height}px">${cells.join('')}${nodes}</div>${mini?'':'<small>紫：探索済み　赤：現在地　白菱形：階段</small>'}</section>`;
  };
  P.isRenderMap = function(panel){const next=this.isMapNextNodes(),back=this.isMapBackNode();panel.dataset.panel='infinite-score-map';panel.innerHTML=`<div class="is-full-map-view"><button class="panel-home" data-is-action="explore">探索画面へ</button><small>INFINITE SCORE // FLOOR MAP</small><h2>無限奏廊 FLOOR ${this.isRun().floor}</h2>${this.isMapHtml(false)}${this.isAtStairs()?`<div class="is-stairs"><b>現在地に階段がある</b><button data-is-action="descend">次の階へ降りる</button></div>`:!next.length&&back?`<div class="is-deadend"><b>DEAD END</b><button data-is-action="map-back">一つ前の分岐へ戻る</button></div>`:''}</div>`;};
  P.isHasReturn = function(){return !!this.isRun()?.lootBag?.some(x=>x.itemId==='infiniteReturn'&&(x.count||1)>0);};
  P.isDirectionLabel = function(node,index){const current=this.isMapNode(this.isFloorMap()?.currentId),delta=(node?.col??index)-(current?.col??index);return delta<0?{name:'左',arrow:'↖'}:delta>0?{name:'右',arrow:'↗'}:{name:'奥',arrow:'↑'};};
  P.isDirectionOverlay = function(mode){
    if(!mode)return'';const next=this.isMapNextNodes(),back=this.isMapBackNode();
    if(!next.length)return `<div class="is-route-return"><span>${back?'この先は行き止まり':'すべての道を調べた'}</span>${back?'<button data-is-action="map-back">戻る</button>':'<button data-is-action="map-remap">再マッピング</button>'}</div>`;
    const choices=this.isRun().pendingChoices||this.isMakeChoices();
    return `<div class="is-route-overlay ${mode==='examine'?'examining':''}"><div class="is-route-list">${choices.map((choice,index)=>{const node=this.isMapNode(choice.nodeId),d=this.isDirectionLabel(node,index),direction=d.name==='左'?'left':d.name==='右'?'right':'straight';return `<button data-is-choice="${index}" class="is-route-choice ${direction}" aria-label="${d.name}へ"><span class="is-route-art" aria-hidden="true"></span>${mode==='examine'?`<em>${esc(choice.hint)}</em>`:''}</button>`;}).join('')}</div><button class="is-route-close" data-is-action="route-close" aria-label="閉じる">×</button></div>`;
  };
  P.isStairHtml=function(){
    if(!this.isAtStairs())return'';
    const currentId=this.isFloorMap()?.currentId,dismissed=this.isStairPromptDismissed===currentId;
    return dismissed
      ? '<button class="is-stair-marker" data-is-action="stairs-open"><b>階段を発見</b><span>ここから次の階へ降りられる</span></button>'
      : '<div class="is-stair-object"><b>階段を発見</b><span>現在地に階段がある</span><div><button data-is-action="descend">次の階へ降りる</button><button data-is-action="stairs-continue">探索を続ける</button></div></div>';
  };
  P.isExploreMenuHtml=function(){this.renderBattleMenu?.();const source=$('#battle-menu-popover')?.innerHTML||'';return `<div class="is-explore-menu" ${this.isExploreMenuOpen?'':'hidden'}>${source.replaceAll('data-battle-menu-close','data-is-explore-menu-close')}</div>`;};
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
      <aside class="player-card is-player-status"><div class="player-meta"><small>PHANTOM // IS</small><strong>${name}</strong><span>${job} Lv.${jobLevel}</span></div><div class="meter-row"><label>HP</label><div class="meter hp"><i style="width:${hp}%"></i></div><output>${r.hp} / ${stats.maxHp}</output></div><div class="meter-row"><label>MP</label><div class="meter mp"><i style="width:${mp}%"></i></div><output>${r.mp} / ${stats.maxMp}</output></div><div class="xp-row"><div class="xp-cell"><small>${esc(this.weaponTypeName(weaponType))} Lv.${mastery.level}</small><div class="meter exp"><i style="width:${masteryPct}%"></i><output>${masteryPct.toFixed(2)}%</output></div></div><div class="xp-cell"><small>${job} Lv.${jobLevel}</small><div class="meter jexp"><i style="width:${jobPct}%"></i><output>${jobNeed?`${jobPct.toFixed(2)}%`:'MASTER'}</output></div></div></div><div class="is-status-meta"><span>LOOT BAG ${this.isBagUsed()} / ${this.isBagLimit()}</span><span>探索 ${map.nodes.filter(n=>n.visited).length}/${map.nodes.length}</span></div></aside>
      ${this.isDirectionOverlay(this.isExploreOverlayMode)}
      <nav class="is-explore-commands"><button class="is-explore-command advance" data-is-action="route-advance" aria-label="進む"></button><button class="is-explore-command examine" data-is-action="route-examine" aria-label="調べる"></button><button class="is-explore-command item" data-is-action="bag" aria-label="バッグ"></button><button class="is-explore-command equipment" data-is-action="equipment" aria-label="装備"></button><button class="is-explore-command map" data-is-action="map" aria-label="マップ"></button><button class="is-explore-command return ${hasReturn?'available':'locked'}" data-is-action="${hasReturn?'return-check':'return-locked'}" aria-label="${hasReturn?'帰還':'RETURN未所持'}"></button></nav>
      ${this.isExploreLogHtml()}${this.isExploreMenuHtml()}${notice?'<button class="is-return-unlocked" data-is-action="return-notice-close"><b>RETURN UNLOCKED</b><span>帰還が可能になった</span></button>':''}
    </main>`;
  };
  P.isEventTable = function () {
    const cfg=this.isEffectiveCfg(), weights={...(this.isCfg().eventWeights||{})};
    for(const [event,key] of [['treasure','treasureRate'],['rare','rareEnemyRate'],['shop','shopRate'],['trap','trapRate'],['card','cardRate']]) {
      if(Number.isFinite(Number(cfg[key]))) weights[event]=Math.max(0,Number(cfg[key])*100);
    }
    return Object.entries(weights).map(([id,weight])=>({id,weight}));
  };
  P.isMakeChoices = function () {
    const choices=[],run=this.isRun(),next=this.isMapNextNodes();
    for(let i=0;i<next.length;i++){const node=next[i];let type=node.type;if(this.isRand()<Number(this.isEffectiveCfg().sublimationRate||0))type='sublime';else if(this.isRand()<(run.buffs.treasureBonus||0))type='treasure';else if(this.isRand()<(run.buffs.rareBonus||0))type='rare';choices.push({id:i,nodeId:node.id,hintId:node.hintId,hint:node.hint,type});}
    this.isRun().pendingChoices=choices; this.isSave(); return choices;
  };
  P.isRenderChoices = function (panel) {this.isExploreOverlayMode='advance';this.isRenderExplore(panel);};
  P.isBindLongPress = function(panel){panel.querySelectorAll('[data-is-choice]').forEach(btn=>{let timer,long=false;const start=()=>{long=false;timer=setTimeout(()=>{long=true;const c=this.isRun().pendingChoices[+btn.dataset.isChoice];$('#is-hint').textContent=c.hint;this.audio?.sfx?.('ui');},520)};const end=e=>{clearTimeout(timer);if(long){e.preventDefault();e.stopPropagation();}};btn.addEventListener('pointerdown',start);btn.addEventListener('pointerup',end);btn.addEventListener('pointercancel',()=>clearTimeout(timer));btn.addEventListener('contextmenu',e=>e.preventDefault());});};
  P.isRenderBag = function(panel){const r=this.isRun();panel.dataset.panel='infinite-score-bag';panel.innerHTML=`${this.isHeader()}<small>LOOT BAG</small><h2>バッグ ${this.isBagUsed()} / ${this.isBagLimit()}</h2><div class="is-list">${r.lootBag.length?r.lootBag.map(x=>this.isItemHtml(x)).join(''):'<p>空です。</p>'}</div>${this.isToolbar()}`;};
  P.isGearValues = function(x){const def=this.equipmentDefinition?.(x?.itemId)||{},mult=x?.generated?(x.multiplier||1):1,out={};for(const key of ['attackPower','defensePower','magicAttackPower','magicDefensePower'])out[key]=Math.round((Number(def[key])||0)*mult)+(x?.ops||[]).filter(o=>o.key===key).reduce((n,o)=>n+o.value,0);return out;};
  P.isItemHtml = function(x){const item=D().items[x.itemId]||{},rar=this.isCfg().rarity[x.rarity]||{},values=this.isGearValues(x),currentUid=this.isRun()?.equipment?.[item.slot],current=currentUid&&currentUid!==x.uid?this.isBagEntry(currentUid):null,currentValues=current?this.isGearValues(current):{},combat=Object.entries(values).filter(([,v])=>v).map(([k,v])=>{const delta=current? v-(currentValues[k]||0):null;return `${this.isCfg().opLabels[k]} ${v}${delta===null?'':` (${delta>=0?'+':''}${delta})`}`;}).join(' / ');return `<article class="is-item"><div><strong>${esc(item.name||x.itemId)} ${x.plus?`+${x.plus}`:''}</strong><small>${esc(item.slot||item.category||x.kind)} ${x.count>1?`×${x.count}`:''}${combat?` / ${combat}`:''}</small></div><span class="is-rarity" style="color:${rar.color||'#aaa'}">${rar.name||''}</span>${x.ops?.length?`<div class="is-ops">${x.ops.map(o=>`${esc(this.isCfg().opLabels[o.key]||o.key)} ${o.key==='critBonus'?`+${Math.round(o.value*100)}%`:`+${o.value}`} (R${o.rank})`).join(' / ')}</div>`:''}<div class="is-item-actions">${item.category==='equipment'?`<button data-is-equip="${x.uid}">装備</button>${x.generated?`<button data-is-merge="${x.uid}">合体</button>`:''}`:''}${item.effect?`<button data-is-use="${x.uid}">使用</button>`:''}${x.generated?`<button data-is-op-delete="${x.uid}">OPを消す</button>`:''}<button data-is-drop="${x.uid}">捨てる</button></div></article>`;};
  P.isRenderEquipment=function(panel){
    const r=this.isRun(),slots=D().equipmentSlots||[],active=this.isRunEquipSlot&&slots.some(s=>s.id===this.isRunEquipSlot)?this.isRunEquipSlot:null;
    const candidates=slot=>r.lootBag.filter(x=>{const item=D().items[x.itemId];return x.kind==='equipment'&&item?.category==='equipment'&&item.slot===slot;});
    const slotHtml=slots.map(slot=>{const uid=r.equipment[slot.id],x=uid&&this.isBagEntry(uid),item=x&&D().items[x.itemId],count=candidates(slot.id).length;return `<button type="button" data-is-run-slot="${slot.id}" class="equipment-slot ${x?'filled':'empty'} ${active===slot.id?'slot-active':''}"><span>${slot.name}<small>${slot.enName}</small></span><b>${item?esc(item.name):'なし'}</b>${count?`<i class="slot-count">${count}</i>`:''}</button>`;}).join('');
    let overlay='';
    if(active){const slot=slots.find(s=>s.id===active),current=r.equipment[active],list=candidates(active);overlay=`<section class="equipment-selector-overlay is-run-equipment-overlay" role="dialog" aria-modal="true" aria-label="${slot?.name||'装備'}を選択"><header><div><small>INFINITE SCORE // RUN EQUIPMENT</small><b>${slot?.name||'装備'}の装備 <span>${slot?.enName||''}</span></b></div><button type="button" data-is-run-slot-close aria-label="装備部位一覧へ戻る">×</button></header>${current?`<button class="equip-unequip" data-is-run-unequip="${active}">${slot?.name||'装備'}を外す<span>UNEQUIP</span></button>`:''}<div class="equipment-candidate-list">${list.map(x=>{const item=D().items[x.itemId]||{},values=this.isGearValues(x),bonus=Object.entries(values).filter(([,v])=>v).map(([k,v])=>`${this.isCfg().opLabels[k]||k} ${v}`).join(' / '),equipped=current===x.uid;return `<button data-is-run-equip="${x.uid}" class="equipment-candidate rarity-${item.rarity||x.rarity} ${equipped?'equipped-now':''}" ${equipped?'disabled':''}><span class="candidate-title"><b>${esc(item.name||x.itemId)}${x.plus?` +${x.plus}`:''}</b>${equipped?'<em>EQUIPPED</em>':''}</span><strong>${esc(bonus||item.description||'補正なし')}</strong>${x.ops?.length?`<small>${x.ops.map(o=>`${esc(this.isCfg().opLabels[o.key]||o.key)} R${o.rank}`).join(' / ')}</small>`:''}</button>`;}).join('')||'<p class="item-empty">この部位に装備できる戦利品がありません。</p>'}</div></section>`;}
    panel.dataset.panel='infinite-score-equipment';panel.innerHTML=`${this.isHeader()}<small>RUN EQUIPMENT</small><h2>奏廊装備</h2><div class="equipment-screen"><section class="equipment-slots-wrap"><h3>装備中 <span>CURRENT LOADOUT</span></h3><div class="equipment-slots">${slotHtml}</div></section><section class="equipment-workbench"><div class="equip-hint"><b>装備部位を選んでください</b><span>奏廊内で拾った装備だけを使用します。通常装備とは同期しません。</span></div></section></div>${overlay}${this.isToolbar()}`;
  };
  P.isRenderDebug=function(panel){const c=this.isEffectiveCfg();panel.dataset.panel='infinite-score-debug';panel.innerHTML=`${this.isHeader()}<small>INFINITE SCORE DEV TOOLS</small><h2>DEBUG</h2><div class="is-debug"><div class="is-debug-grid">${[['floor','現在階',this.isRun().floor],['mapRows','MAP行数',c.mapRows],['stairBaseRate','階段初期率',c.stairBaseRate],['stairRateIncrease','階段上昇率',c.stairRateIncrease],['bagLimit','バッグ上限',c.bagLimit],['equippedUsesBag','装備も枠使用(1/0)',c.equippedUsesBag?1:0],['treasureRate','宝箱率',c.treasureRate],['rareEnemyRate','レア敵率',c.rareEnemyRate],['returnItemRate','RETURN率',c.returnItemRate],['shopRate','SHOP率',c.shopRate],['trapRate','TRAP率',c.trapRate],['cardRate','CARD率',c.cardRate],['sublimationRate','昇華率',c.sublimationRate],['enemyScalePerFloor','敵強化/階',c.enemyScalePerFloor]].map(([k,l,v])=>`<label>${l}<input data-is-debug-key="${k}" type="number" step="0.01" value="${v}"></label>`).join('')}</div><div class="is-actions"><button data-is-debug-force="treasure">次回宝箱</button><button data-is-debug-force="shop">次回ショップ</button><button data-is-debug-force="merchant">次回行商人</button><button data-is-debug-force="returnCard">次回RETURNカード</button><button data-is-debug-force="rare">次回レア敵</button><button data-is-debug-force="sublime">次回昇華</button><button data-is-debug-force="stairs">次回階段</button><button data-is-action="generate">装備生成</button><button class="danger" data-is-action="death-test">死亡テスト</button><button data-is-action="debug-reset">設定を初期化</button></div></div><div class="is-log">${(this.isRun().log||[]).slice().reverse().map(x=>`F${x.floor} ${esc(x.message)}`).join('<br>')}</div>${this.isToolbar()}`;};
  const origIsRenderDebug=P.isRenderDebug;
  P.isRenderDebug=function(panel){origIsRenderDebug.call(this,panel);const box=panel.querySelector('.is-debug-grid'),c=this.isEffectiveCfg();box?.insertAdjacentHTML('beforeend',`<label>装備DROP率<input data-is-debug-key="gearDropRate" type="number" step="0.01" value="${c.gearDropRate}"></label><label>奏貨倍率<input data-is-debug-key="currencyMultiplier" type="number" step="0.1" value="${c.currencyMultiplier}"></label>`);const actions=panel.querySelector('.is-debug .is-actions');actions?.insertAdjacentHTML('beforeend','<button data-is-generate-specified>指定装備生成</button>');};

  // ── 装備生成 / バッグ処理 ─────────────────────────────────
  P.isRollRarity=function(bonus=0){const rates={...this.isCfg().rarityRates};if(bonus){rates.common=Math.max(1,rates.common-bonus*2);rates.epic+=bonus;rates.legendary+=Math.floor(bonus/2);}return this.isPickWeighted(Object.entries(rates).map(([id,weight])=>({id,weight}))).id;};
  P.isGenerateGear=function(force={}){const cfg=this.isCfg(),pool=cfg.equipmentPool||[],itemId=force.itemId||pool[Math.floor(this.isRand()*pool.length)],rarity=force.rarity||this.isRollRarity(this.isRun()?.buffs?.qualityBattles||0),r=cfg.rarity[rarity],mult=r.min+this.isRand()*(r.max-r.min),opCount=force.opCount??(r.opMin+Math.floor(this.isRand()*(r.opMax-r.opMin+1))),keys=Object.keys(cfg.opRanks),ops=[];while(ops.length<opCount&&ops.length<4){const key=keys[Math.floor(this.isRand()*keys.length)];if(ops.some(o=>o.key===key))continue;const rank=force.opRank||Math.min(4,1+Math.floor(this.isRand()*(rarity==='mythic'?4:rarity==='legendary'?3:2))),value=cfg.opRanks[key][rank-1];ops.push({key,rank,value});}return {uid:this.isUid('gear'),kind:'equipment',itemId,count:1,generated:true,rarity,multiplier:+mult.toFixed(3),plus:0,ops};};
  P.isGenerateDebugGear=function(){const cfg=this.isCfg(),itemList=cfg.equipmentPool.map((id,i)=>`${i+1}: ${D().items[id]?.name||id}`).join('\n'),itemIndex=Number(prompt(`生成する装備を選択\n${itemList}`))-1,itemId=cfg.equipmentPool[itemIndex];if(!itemId)return null;const rarity=prompt('レアリティを入力\ncommon / rare / epic / legendary / mythic','epic');if(!cfg.rarity[rarity])return null;const opCount=clamp(Number(prompt('OP数 0〜4','2'))||0,0,4),opRank=clamp(Number(prompt('OP Rank 1〜4','1'))||1,1,4);return this.isGenerateGear({itemId,rarity,opCount,opRank});};
  P.isAddLoot=function(entry){const r=this.isRun();if(!r)return false;const isReturn=entry.itemId==='infiniteReturn',hadReturn=this.isHasReturn(),stack=entry.kind!=='equipment'&&r.lootBag.find(x=>x.itemId===entry.itemId&&!x.generated);if(stack){stack.count=(stack.count||1)+(entry.count||1);if(isReturn&&!hadReturn)r.returnButtonNew=true;this.isSave();return true;}if(this.isBagUsed()>=this.isBagLimit()){r.pendingLoot=entry;this.isSave();this.isShowBagFull();return false;}r.lootBag.push(entry);if(isReturn&&!hadReturn)r.returnButtonNew=true;this.isLog(`入手：${D().items[entry.itemId]?.name||entry.itemId}`);return true;};
  P.isShowBagFull=function(){const r=this.isRun(),x=r?.pendingLoot;if(!x)return;document.getElementById('is-modal')?.remove();const el=document.createElement('div');el.id='is-modal';el.className='is-modal';el.innerHTML=`<div><small>LOOT BAG FULL</small><h2>${esc(D().items[x.itemId]?.name||x.itemId)}</h2><p>バッグ ${this.isBagUsed()} / ${this.isBagLimit()}。使用・装備・破棄で空きを作ってください。</p><div class="is-list">${r.lootBag.map(y=>this.isItemHtml(y)).join('')}</div><div class="is-actions"><button data-is-action="retry-loot">拾う</button><button data-is-action="discard-loot">拾わない</button></div></div>`;document.body.appendChild(el);};
  P.isEquip=function(uid){const x=this.isBagEntry(uid),item=D().items[x?.itemId];if(!x||item?.category!=='equipment')return;this.isRun().equipment[item.slot||'accessory']=uid;this.isLog(`装備：${item.name}`);this.isSave();this.isRenderEquipment($('#menu-panel'));};
  P.isUseBagItem=function(uid){const x=this.isBagEntry(uid),item=D().items[x?.itemId],effect=item?.effect;if(!x||!effect)return;if(x.itemId==='infiniteReturn'){this.isReturnRun();return;}const r=this.isRun(),stats=this.totalStats();if(effect.hp)r.hp=Math.min(stats.maxHp,r.hp+effect.hp);if(effect.mp)r.mp=Math.min(stats.maxMp,r.mp+effect.mp);x.count--;if(x.count<=0)r.lootBag.splice(r.lootBag.indexOf(x),1);this.isLog(`使用：${item.name}`);this.isRenderBag($('#menu-panel'));};
  P.isDrop=function(uid){const r=this.isRun(),x=this.isBagEntry(uid);if(!x)return;Object.keys(r.equipment).forEach(s=>{if(r.equipment[s]===uid)delete r.equipment[s]});r.lootBag.splice(r.lootBag.indexOf(x),1);this.isLog(`破棄：${D().items[x.itemId]?.name||x.itemId}`);this.isRenderBag($('#menu-panel'));};
  P.isDeleteOp=function(uid){const x=this.isBagEntry(uid);if(!x?.ops?.length)return;const list=x.ops.map((o,i)=>`${i+1}: ${this.isCfg().opLabels[o.key]||o.key} R${o.rank}`).join('\n');const idx=Number(prompt(`削除するOP番号\n${list}`))-1;if(idx>=0&&idx<x.ops.length){x.ops.splice(idx,1);this.isLog('OP削除');this.isRenderBag($('#menu-panel'));}};
  P.isOpenMerge=function(uid){const base=this.isBagEntry(uid),candidates=(this.isRun()?.lootBag||[]).filter(x=>x.uid!==uid&&x.itemId===base?.itemId&&x.rarity===base?.rarity);if(!candidates.length){alert('同一装備・同一レアリティの素材がありません。');return;}const lines=candidates.map((x,i)=>`${i+1}: ${D().items[x.itemId]?.name||x.itemId} +${x.plus||0}`).join('\n'),pick=Number(prompt(`合体素材を選択\n${lines}`))-1;if(pick<0||pick>=candidates.length)return;const mat=candidates[pick],newOps=(mat.ops||[]).filter(o=>!base.ops.some(x=>x.key===o.key));let inherit=0;if(base.ops.length<4&&newOps.length>1){const opLines=newOps.map((o,i)=>`${i+1}: ${this.isCfg().opLabels[o.key]||o.key} R${o.rank}`).join('\n');inherit=Math.max(0,Number(prompt(`継承するOPを選択\n${opLines}`))-1);}if(this.isMerge(uid,mat.uid,inherit)){this.audio?.sfx?.('rareDrop');this.isRenderBag($('#menu-panel'));}};
  P.isMerge=function(baseUid,matUid,inheritIndex=0){const r=this.isRun(),a=this.isBagEntry(baseUid),b=this.isBagEntry(matUid);if(!a||!b||a.itemId!==b.itemId||a.rarity!==b.rarity||a.uid===b.uid)return false;a.plus=(a.plus||0)+1;for(const op of b.ops||[]){const same=a.ops.find(x=>x.key===op.key);if(same){same.rank=Math.min(4,same.rank+1);same.value=this.isCfg().opRanks[same.key][same.rank-1];}}if(a.ops.length<4){const candidates=(b.ops||[]).filter(o=>!a.ops.some(x=>x.key===o.key));if(candidates[inheritIndex])a.ops.push(copy(candidates[inheritIndex]));}Object.keys(r.equipment).forEach(s=>{if(r.equipment[s]===b.uid)delete r.equipment[s]});r.lootBag.splice(r.lootBag.indexOf(b),1);this.isLog(`合体：${D().items[a.itemId]?.name}+${a.plus}`);this.isSave();return true;};

  // ── 探索 / 戦闘 ───────────────────────────────────────────
  P.isDescend=function(){const r=this.isRun();r.floor=Math.min(this.isEffectiveCfg().maxFloor||9999,r.floor+1);r.encounterCountOnFloor=0;r.stairsFound=false;r.pendingChoices=null;r.floorMap=null;this.isExploreOverlayMode=null;this.isStairPromptDismissed=null;this.isCreateFloorMap();this.isLog(`FLOOR ${r.floor}へ降下`);this.isRenderExplore($('#menu-panel'));};
  P.isRollStairs=function(){const r=this.isRun(),c=this.isEffectiveCfg(),rate=clamp(c.stairBaseRate+(r.encounterCountOnFloor-1)*c.stairRateIncrease,0,c.stairMaxRate),forced=r.forcedEvent==='stairs',roll=this.isRand()*100,found=forced||roll<rate;if(forced)r.forcedEvent=null;const node=this.isMapNode(this.isFloorMap()?.currentId);if(node&&found)node.stairs=true;r.stairsFound=!!node?.stairs;this.isLog(`階段抽選 ${roll.toFixed(2)} / ${rate}% → ${found?'発見':'未発見'}`);return found;};
  P.isStartBattle=async function(rare=false){const r=this.isRun(),cfg=this.isEffectiveCfg(),pool=rare&&this.isCfg().rareEnemyPool.length?this.isCfg().rareEnemyPool:this.isCfg().enemyPool;if(!pool.length)return;document.querySelector('.is-encounter-transition')?.remove();const transition=document.createElement('div');transition.className='is-encounter-transition';transition.innerHTML=`<b>${rare?'RARE ENCOUNTER':'ENCOUNTER'}</b><span>FLOOR ${r.floor}</span>`;document.body.appendChild(transition);await new Promise(resolve=>setTimeout(resolve,520));const count=rare?1:(1+Math.floor(this.isRand()*Math.min(3,1+Math.floor(r.floor/5)))),scale=1+(r.floor-1)*cfg.enemyScalePerFloor;this.closeBattleMenu?.();this.cancelAutoPick?.();const stats=this.totalStats();this.player=this.freshBattlePlayer(stats,clamp(r.hp,1,stats.maxHp),clamp(r.mp,0,stats.maxMp));this.enemies=Array.from({length:count},(_,i)=>{const id=pool[Math.floor(this.isRand()*pool.length)],e=this.makeEnemy(id,i);for(const k of ['maxHp','atk','def','mag','mnd','spd','agi','dex'])if(e.stats[k]!=null)e.stats[k]=Math.max(1,Math.round(e.stats[k]*scale));e.hp=e.stats.maxHp;e.infiniteScore=true;e.rareRun=rare;return e;});this.battleMode='infiniteScore';this.turn=1;this.locked=false;this.finished=false;this.resetBattleLog();this.battleRewards={exp:0,gold:0,drops:{},levels:[],masteryResults:[],jobResults:[],newRecipes:[]};$('#menu-screen').hidden=true;$('#menu-screen').style.display='none';$('#game').hidden=false;$('#game').style.display='grid';$('#result').hidden=true;$('#result').style.display='none';$('#ren').className='ren fighter idle';this.applySetBattleVisual();const bf=$('#battlefield'),roomBg=r.currentRoomBackground||this.isRoomBackground();bf.dataset.dungeon='infiniteScore';bf.style.backgroundImage=`linear-gradient(#09132a55,#02071355),url("${roomBg}")`;bf.style.backgroundSize='auto,cover';bf.style.backgroundPosition='center,center center';this.renderEnemies();this.applyEquipmentVisual();this.updateHUD();this.setLog(`無限奏廊 FLOOR ${r.floor}：${this.enemies.map(e=>e.name).join('と')}が現れた！`);this.flashTitle(rare?'RARE ENCOUNTER':'INFINITE SCORE',`FLOOR ${r.floor}`);this.showMainCommands();this.isLog('戦闘開始',{rare,count,scale,roomBg});setTimeout(()=>transition.remove(),240);};
  const isStartBattleWithMusic=P.isStartBattle;
  P.isStartBattle=function(rare=false){
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
  P.showBattleItems=function(){if(this.battleMode!=='infiniteScore'||!this.isRun())return origShowBattleItems.call(this);const entries=this.isRun().lootBag.filter(x=>D().items[x.itemId]?.category==='consumable'&&(D().items[x.itemId]?.effect?.hp||D().items[x.itemId]?.effect?.mp));const grouped=[...new Set(entries.map(x=>x.itemId))].map(id=>({item:D().items[id],count:entries.filter(x=>x.itemId===id).reduce((n,x)=>n+(x.count||1),0)}));if(!grouped.length){this.panel(this.button('もどる','BACK','back'));this.bindActions({back:()=>this.showMainCommands()});this.setLog('LOOT BAGに使えるアイテムがない。');return;}const actions={back:()=>this.showMainCommands()},rows=grouped.map(({item,count})=>{const full=item.effect.hp?this.player.hp>=this.player.stats.maxHp:this.player.mp>=this.player.stats.maxMp;actions[`is-item-${item.id}`]=()=>this.isUseBattleItem(item.id);return this.button(item.name,`${item.effect.hp?`HP +${item.effect.hp}`:`MP +${item.effect.mp}`} // ×${count}`,`is-item-${item.id}`,full,'item',item.description||'');}).join('');this.panel(this.button('閉じる','BACK','back')+rows,'list');this.bindActions(actions);};
  P.isUseBattleItem=async function(id){const run=this.isRun(),entry=run?.lootBag.find(x=>x.itemId===id),item=D().items[id];if(!entry||!item)return;const key=item.effect?.hp?'hp':'mp',maxKey=key==='hp'?'maxHp':'maxMp',amount=item.effect?.[key]||0;if(this.player[key]>=this.player.stats[maxKey])return;this.locked=true;this.keepAutoControlVisible();await this.beginPlayerTurn();const gain=Math.min(amount,this.player.stats[maxKey]-this.player[key]);this.player[key]+=gain;entry.count--;if(entry.count<=0)run.lootBag.splice(run.lootBag.indexOf(entry),1);run.hp=this.player.hp;run.mp=this.player.mp;this.audio.sfx('heal');this.setLog(`${item.name}を使った。${key.toUpperCase()}が${gain}回復！`);this.floating($('#ren'),`+${gain}`,'heal');this.updateHUD();this.saveProfile();await this.battleSleep(500);await this.enemyOnlyTurn();};
  const origGrantEnemyReward=P.grantEnemyReward;
  P.grantEnemyReward=function(enemy){
    if(this.battleMode!=='infiniteScore'||!this.isRun())return origGrantEnemyReward.call(this,enemy);
    const rewards=(this.battleRewards||={exp:0,gold:0,drops:{},levels:[],masteryResults:[],jobResults:[]}),baseExp=enemy.exp||0,exp=Math.round(baseExp*(1+this.mealExpBonusRate())),baseGold=Math.max(0,Math.round(((enemy.gold?.min||0)+(enemy.gold?.max||0))/2)),gold=Math.round(baseGold*(1+this.passiveEffectRate('goldUp'))),levels=this.applyRewards({exp,gold:0,drops:{}}),job=this.grantJobExp(exp),run=this.isRun();
    run.dungeonGold+=Math.round(gold*Math.max(0,Number(this.isEffectiveCfg().currencyMultiplier)||0))+(enemy.stolenRunGold||0);
    for(const [id,count] of enemy.rolledDrops||[])for(let i=0;i<count;i++)this.isAddLoot({uid:this.isUid('drop'),kind:D().items[id]?.category==='equipment'?'equipment':'item',itemId:id,count:1,imported:false,generated:false,plus:0,ops:[]});
    for(const loot of enemy.stolenRunLoot||[])this.isAddLoot(loot);
    rewards.exp=(rewards.exp||0)+exp;rewards.gold=(rewards.gold||0)+gold;rewards.levels||=[];rewards.levels.push(...levels);rewards.jobResults||=[];if(job)rewards.jobResults.push(job);
    if(job?.to>job?.from&&!this.quickResolving)this.queueGrowthBubble('JOB Lv.UP!',`${job.jobName} Lv.${job.from} → ${job.to}`);
    this.isLog(`撃破報酬：EXP ${exp} / 奏貨 ${gold}`);this.updateHUD();return {exp,gold};
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
  const origVictory=P.victory;
  P.victory=async function(){if(this.battleMode!=='infiniteScore'||!this.isRun())return origVictory.call(this);this.finished=true;this.endAutoBattle?.();this.audio.sfx('victory');const r=this.isRun(),cfg=this.isEffectiveCfg();r.hp=this.player.hp;r.mp=this.player.mp;r.encounterCountOnFloor++;this.isClearMapRoom();if(r.buffs.qualityBattles>0)r.buffs.qualityBattles--;const baseGold=10+Math.round(r.floor*2+this.isRand()*12),gold=Math.round(baseGold*(1+(r.buffs.goldBonus||0))*Math.max(0,Number(cfg.currencyMultiplier)||0));r.dungeonGold+=gold;let drop='';if(this.isRand()<Math.min(.95,Math.max(0,Number(cfg.gearDropRate)||0)+r.floor*.004)){const gear=this.isGenerateGear();this.isAddLoot(gear);drop=D().items[gear.itemId]?.name||gear.itemId;}else if(this.isRand()<cfg.returnItemRate){this.isAddLoot({uid:this.isUid('return'),kind:'item',itemId:'infiniteReturn',count:1});drop='RETURN';}this.isRollStairs();const showCards=this.isRand()<cfg.cardRate;this.saveProfile();await this.battleSleep(500);if(showCards){this.isShowCards();return;}this.showResult('VICTORY',`奏貨 +${gold}${drop?` ／ ${drop}を発見`:''}`,'INFINITE SCORE',`<div class="is-run-grid"><div><small>FLOOR</small><b>${r.floor}</b></div><div><small>HP</small><b>${r.hp}</b></div><div><small>BAG</small><b>${this.isBagUsed()}/${this.isBagLimit()}</b></div><div><small>階段</small><b>${r.stairsFound?'FOUND':'—'}</b></div></div><button class="is-primary" data-is-action="after-battle">探索へ戻る</button>`);this.isHideDefaultResultMenu();};
  const origDefeat=P.defeat;
  P.defeat=async function(){if(this.battleMode!=='infiniteScore'||!this.isRun())return origDefeat.call(this);this.finished=true;this.endAutoBattle?.();const run=this.isRun(),lost=this.isBagUsed(),lostIds=new Set((run.importedItems||[]).map(x=>x.itemId)),home=copy(run.homeEquipment||this.profile.equipment);for(const slot of Object.keys(home))if(lostIds.has(home[slot]))home[slot]=null;this.profile.equipment=home;this.profile.currentVitals=copy(run.homeVitals||this.profile.currentVitals);this.profile.infiniteScore={active:false,lastResult:'defeat',lostCount:lost,endedAt:Date.now()};this.profile.flags.owRestoreJobPending=true;this.saveProfile();this.audio.stopMusic?.(400);this.audio.sfx('defeat');this.showResult('GAME OVER','持ち込んだ物も、拾った物も、すべて無限奏廊へ消えた。','ALL LOOT LOST',`<div class="is-warning"><strong>LOST</strong><p>${lost}枠の戦利品を失いました。</p><p>基礎能力・JOB・転生・武器学・習得技・RE:MIXは失われません。</p></div>`);};

  P.isAfterBattle=function(){
    const result=$('#result'),game=$('#game'),menu=$('#menu-screen');
    result.hidden=true;result.style.display='none';game.hidden=true;game.style.display='none';
    // 探索は拠点の子画面ではない。復帰時もHIDEOUTを表示しない。
    menu.hidden=true;menu.style.display='none';this.isExploreOverlayMode=null;
    this.isPlayExploreMusic();this.renderMenuPanel('infinite-score');window.scrollTo({top:0,behavior:'instant'});
  };
  P.isResolveChoice=function(index){const r=this.isRun(),choice=r.pendingChoices?.[index];r.pendingChoices=null;this.isExploreOverlayMode=null;document.querySelector('.is-route-overlay')?.remove();if(!choice){this.isRenderExplore($('#menu-panel'));return;}const node=choice.nodeId&&this.isMapNode(choice.nodeId);if(node){this.isFloorMap().currentId=node.id;node.visited=true;r.stairsFound=!!node.stairs;this.isStairPromptDismissed=null;}const forced=r.forcedEvent;if(forced){choice.type=forced;r.forcedEvent=null;if(node)node.type=forced;}if(node&&!['encounter','rare'].includes(choice.type))node.cleared=true;const direction=this.isDirectionLabel(node,index).name;this.isLog(`${direction}の道へ進む → ${choice.type}`);this.isResolveEvent(choice.type);};
  P.isResolveEvent=function(type){const r=this.isRun();if(type==='encounter'){this.isStartBattle(false);return;}if(type==='rare'){this.isStartBattle(true);return;}if(type==='treasure'){this.isTreasure();return;}if(type==='item'){const id=this.isCfg().consumablePool[Math.floor(this.isRand()*this.isCfg().consumablePool.length)];this.isAddLoot({uid:this.isUid('item'),kind:'item',itemId:id,count:1});}else if(type==='gold'){const g=Math.round((20+r.floor*4)*(1+r.buffs.goldBonus));r.dungeonGold+=g;this.isLog(`奏貨 +${g}`);}else if(type==='trap'){const stats=this.totalStats(),dmg=Math.max(1,Math.round(stats.maxHp*(.08+this.isRand()*.17)));r.hp=Math.max(1,r.hp-dmg);this.isLog(`罠：HP -${dmg}`);}else if(type==='shop'){this.isRenderShop($('#menu-panel'),false);return;}else if(type==='merchant'){this.isRenderShop($('#menu-panel'),true);return;}else if(type==='card'||type==='returnCard'||type==='sublime'){this.isShowCards(type);return;}this.isRollStairs();this.isRenderExplore($('#menu-panel'));};
  P.isTreasure=function(){const cfg=this.isCfg(),r=this.isRun(),ch=this.isPickWeighted(Object.entries(cfg.chestRates).map(([id,weight])=>({id,weight}))).id,bonus=ch==='gold'?3:ch==='silver'?1:0,gear=this.isGenerateGear({opRank:bonus||undefined});this.isAddLoot(gear);r.buffs.treasureBonus=0;this.isLog(`宝箱(${ch})`,{rarity:gear.rarity,item:gear.itemId,ops:gear.ops});this.isRollStairs();this.isRenderBag($('#menu-panel'));};

  // ── CARD / SHOP / RETURN ───────────────────────────────────
  P.isCardPicks=function(force=null){let pool=this.isCfg().cards.slice();if(force==='returnCard')pool=[pool.find(x=>x.id==='return'),...pool.filter(x=>x.id!=='return')];if(force==='sublime')pool=[pool.find(x=>x.id==='sublime'),...pool.filter(x=>x.id!=='sublime')];const out=[];while(out.length<3&&pool.length){const pick=(force&&out.length===0)?pool[0]:this.isPickWeighted(pool);out.push(pick);pool=pool.filter(x=>x.id!==pick.id);}return out;};
  P.isShowCards=function(force=null){const picks=this.isCardPicks(force);this.isRun().pendingCards=picks;this.saveProfile();this.showResult('ENCHANT CARD','3枚から1枚を選ぶ。選ばなかったカードは消滅する。','INFINITE SCORE',`<div class="is-cards">${picks.map((c,i)=>`<button class="is-card" data-is-card="${i}"><b>《${esc(c.name)}》</b><span>${esc(c.text)}</span></button>`).join('')}</div>`);this.isHideDefaultResultMenu();};
  P.isChooseGear=function(title,predicate=()=>true){const list=this.isRun().lootBag.filter(x=>x.kind==='equipment'&&predicate(x));if(!list.length)return null;const n=Number(prompt(`${title}\n${list.map((x,i)=>`${i+1}: ${D().items[x.itemId]?.name||x.itemId} +${x.plus||0}`).join('\n')}`))-1;return n>=0&&n<list.length?list[n]:null;};
  P.isApplyCard=function(index){const r=this.isRun(),c=r.pendingCards?.[index];if(!c)return;r.pendingCards=null;const stats=this.totalStats();if(c.id==='heal')r.hp=Math.min(stats.maxHp,r.hp+Math.ceil(stats.maxHp*.2));else if(c.id==='mana')r.mp=Math.min(stats.maxMp,r.mp+Math.ceil(stats.maxMp*.2));else if(c.id==='treasure')r.buffs.treasureBonus=Math.min(1,(r.buffs.treasureBonus||0)+.1);else if(c.id==='hunt')r.buffs.rareBonus=Math.min(1,(r.buffs.rareBonus||0)+.05);else if(c.id==='stairs'){this.isAfterBattle();this.isDescend();return;}else if(c.id==='return'){this.isReturnRun();return;}else if(c.id==='gold')r.buffs.goldBonus=(r.buffs.goldBonus||0)+.2;else if(c.id==='quality')r.buffs.qualityBattles=3;else if(c.id==='merchant'){this.isAfterBattle();this.isRenderShop($('#menu-panel'),true);return;}else if(c.id==='forge'){const x=this.isChooseGear('鍛造する装備を選択');if(x)x.plus=(x.plus||0)+1;}else if(c.id==='sublime'){const x=this.isChooseGear('昇華する装備を選択',x=>x.ops?.some(o=>o.rank<4));if(x){const candidates=x.ops.filter(o=>o.rank<4),n=Number(prompt(`強化するOPを選択\n${candidates.map((o,i)=>`${i+1}: ${this.isCfg().opLabels[o.key]||o.key} R${o.rank}`).join('\n')}`))-1,op=candidates[n];if(op){op.rank++;op.value=this.isCfg().opRanks[op.key][op.rank-1];}}}this.isLog(`CARD《${c.name}》`);this.saveProfile();this.isAfterBattle();};
  P.isRenderShop=function(panel,merchant=false){const r=this.isRun();panel.dataset.panel='infinite-score-shop';const hasReturn=merchant&&this.isRand()<.12;panel.innerHTML=`${this.isHeader()}<small>${merchant?'WANDERING MERCHANT':'SHOP'}</small><h2>${merchant?'行商人':'奏廊ショップ'}</h2><p>売却できるのはここだけ。支払いは奏貨。</p><div class="is-shop"><button data-is-buy="potion" data-price="25">回復薬<br>25</button><button data-is-buy="manaPotion" data-price="35">MP薬<br>35</button><button data-is-buy="gear" data-price="80">ランダム装備<br>80</button>${hasReturn?'<button data-is-buy="infiniteReturn" data-price="180">RETURN<br>180</button>':''}</div><h3>売却</h3><div class="is-list">${r.lootBag.map(x=>`<article class="is-item"><strong>${esc(D().items[x.itemId]?.name||x.itemId)}</strong><small>${this.isSellPrice(x)} 奏貨</small><div class="is-item-actions"><button data-is-sell="${x.uid}">売る</button></div></article>`).join('')}</div><button class="is-primary" data-is-action="explore">店を出る</button>`;};
  P.isSellPrice=function(x){const ri=['common','rare','epic','legendary','mythic'].indexOf(x.rarity);return Math.max(5,10+(ri<0?0:ri*18)+(x.plus||0)*12+(x.ops?.length||0)*7);};
  P.isBuy=function(id,price){const r=this.isRun();if(r.dungeonGold<price)return;if(this.isBagUsed()>=this.isBagLimit()){alert('LOOT BAGが満杯です。先に使用・装備・破棄してください。');return;}r.dungeonGold-=price;const x=id==='gear'?this.isGenerateGear():{uid:this.isUid('buy'),kind:'item',itemId:id,count:1};this.isAddLoot(x);this.isRenderShop($('#menu-panel'),true);};
  P.isSell=function(uid){const r=this.isRun(),x=this.isBagEntry(uid);if(!x)return;Object.keys(r.equipment).forEach(s=>{if(r.equipment[s]===uid)delete r.equipment[s]});r.dungeonGold+=this.isSellPrice(x);r.lootBag.splice(r.lootBag.indexOf(x),1);this.isLog(`売却：${D().items[x.itemId]?.name||x.itemId}`);this.isRenderShop($('#menu-panel'),true);};
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
  document.addEventListener('click',e=>{const a=e.target.closest('[data-is-action]'),g=window.arseneGame;if(!a||!g)return;const act=a.dataset.isAction;if(!['stairs-continue','stairs-open'].includes(act))return;e.preventDefault();e.stopImmediatePropagation();if(act==='stairs-continue')g.isStairPromptDismissed=g.isFloorMap()?.currentId;else g.isStairPromptDismissed=null;g.isRenderExplore($('#menu-panel'));},true);
  document.addEventListener('click',e=>{const g=window.arseneGame;if(!g)return;const a=e.target.closest('[data-is-action]');if(a){e.preventDefault();const act=a.dataset.isAction,p=$('#menu-panel');if(act==='warning')g.renderMenuPanel('infinite-score-warning');else if(act==='import')g.renderMenuPanel('infinite-score-import');else if(act==='begin'||act==='begin-empty'){const ids=[];if(act==='begin')for(const input of document.querySelectorAll('[data-is-import]'))for(let n=0;n<Math.max(0,Number(input.value)||0);n++)ids.push(input.dataset.isImport);g.isBegin(ids);}else if(act==='resume'||act==='explore'){g.isExploreOverlayMode=null;g.renderMenuPanel('infinite-score');}else if(act==='map')g.renderMenuPanel('infinite-score-map');else if(act==='route-advance'){g.isExploreOverlayMode='advance';g.isRun().pendingChoices=null;g.isRenderExplore(p);}else if(act==='route-examine'){g.isExploreOverlayMode='examine';g.isRun().pendingChoices=null;g.isRenderExplore(p);}else if(act==='route-close'){g.isExploreOverlayMode=null;g.isRenderExplore(p);}else if(act==='explore-menu'){g.isExploreMenuOpen=!g.isExploreMenuOpen;g.isRenderExplore(p);}else if(act==='explore-menu-close'){g.isExploreMenuOpen=false;g.isRenderExplore(p);}else if(act==='return-notice-close'){g.isRenderExplore(p);}else if(act==='return-locked'){window.arseneStartFlow?.toast('RETURNを入手すると帰還できます');}else if(act==='map-back')g.isMapBack();else if(act==='map-remap'){g.isRun().floorMap=null;g.isCreateFloorMap();g.isExploreOverlayMode=null;g.isRenderExplore(p);}else if(act==='bag')g.renderMenuPanel('infinite-score-bag');else if(act==='equipment')g.renderMenuPanel('infinite-score-equipment');else if(act==='debug')g.renderMenuPanel('infinite-score-debug');else if(act==='choices')g.renderMenuPanel('infinite-score-choices');else if(act==='battle')g.isStartBattle(false);else if(act==='descend'){g.isDescend();g.renderMenuPanel('infinite-score');}else if(act==='after-battle')g.isAfterBattle();else if(act==='return-check'){if(confirm('現在のLOOT BAGを持って帰還しますか？（RETURNが必要）')){const x=g.isRun()?.lootBag.find(x=>x.itemId==='infiniteReturn');if(x)g.isUseBagItem(x.uid);else alert('RETURNを持っていません。');}}else if(act==='generate'){g.isAddLoot(g.isGenerateGear());g.isRenderDebug(p);}else if(act==='death-test'){if(confirm('死亡処理を実行し、RUN内の全アイテムをロストしますか？')){g.battleMode='infiniteScore';g.defeat();}}else if(act==='debug-reset'){g.profile.infiniteScoreDebug={};g.saveProfile();g.isRenderDebug(p);}else if(act==='retry-loot'){const r=g.isRun();if(g.isBagUsed()<g.isBagLimit()){const x=r.pendingLoot;r.pendingLoot=null;g.isAddLoot(x);document.getElementById('is-modal')?.remove();g.isRenderBag(p);}}else if(act==='discard-loot'){g.isRun().pendingLoot=null;g.saveProfile();document.getElementById('is-modal')?.remove();}return;}
    const menuClose=e.target.closest('[data-is-explore-menu-close]');if(menuClose){g.isExploreMenuOpen=false;g.isRenderExplore($('#menu-panel'));return;}const audioToggle=e.target.closest('.is-explore-menu [data-battle-audio-toggle]');if(audioToggle){const channel=audioToggle.dataset.battleAudioToggle,current=g.audio.levels[channel]||0;if(current>0){g.battleAudioRestore[channel]=current;g.audio.setVolume(channel,0);}else g.audio.setVolume(channel,Math.round(100*(g.battleAudioRestore[channel]||{bgm:.42,sfx:.72,voice:.70}[channel])));g.isRenderExplore($('#menu-panel'));return;}
    const runSlot=e.target.closest('[data-is-run-slot]');if(runSlot){g.isRunEquipSlot=runSlot.dataset.isRunSlot;g.isRenderEquipment($('#menu-panel'));return;}const runSlotClose=e.target.closest('[data-is-run-slot-close]');if(runSlotClose){g.isRunEquipSlot=null;g.isRenderEquipment($('#menu-panel'));return;}const runEquip=e.target.closest('[data-is-run-equip]');if(runEquip){g.isEquip(runEquip.dataset.isRunEquip);return;}const runUnequip=e.target.closest('[data-is-run-unequip]');if(runUnequip){delete g.isRun().equipment[runUnequip.dataset.isRunUnequip];g.isSave();g.isRenderEquipment($('#menu-panel'));return;}
    const choice=e.target.closest('[data-is-choice]');if(choice){g.isResolveChoice(+choice.dataset.isChoice);return;}const card=e.target.closest('[data-is-card]');if(card){g.isApplyCard(+card.dataset.isCard);return;}const equip=e.target.closest('[data-is-equip]');if(equip){g.isEquip(equip.dataset.isEquip);return;}const unequip=e.target.closest('[data-is-unequip]');if(unequip){delete g.isRun().equipment[unequip.dataset.isUnequip];g.isSave();g.isRenderEquipment($('#menu-panel'));return;}const use=e.target.closest('[data-is-use]');if(use){g.isUseBagItem(use.dataset.isUse);return;}const drop=e.target.closest('[data-is-drop]');if(drop){if(confirm('このアイテムを捨てますか？'))g.isDrop(drop.dataset.isDrop);return;}const del=e.target.closest('[data-is-op-delete]');if(del){g.isDeleteOp(del.dataset.isOpDelete);return;}const merge=e.target.closest('[data-is-merge]');if(merge){g.isOpenMerge(merge.dataset.isMerge);return;}const force=e.target.closest('[data-is-debug-force]');if(force){g.isRun().forcedEvent=force.dataset.isDebugForce;g.isLog(`次回強制：${force.dataset.isDebugForce}`);g.isRenderDebug($('#menu-panel'));return;}const buy=e.target.closest('[data-is-buy]');if(buy){g.isBuy(buy.dataset.isBuy,+buy.dataset.price);return;}const sell=e.target.closest('[data-is-sell]');if(sell){g.isSell(sell.dataset.isSell);return;}},true);
  document.addEventListener('change',e=>{const input=e.target.closest('[data-is-debug-key]'),g=window.arseneGame;if(!input||!g)return;const key=input.dataset.isDebugKey,val=Number(input.value);if(key==='floor')g.isRun().floor=clamp(Math.round(val),1,g.isCfg().maxFloor||9999);else g.profile.infiniteScoreDebug[key]=val;g.saveProfile();},true);
  document.addEventListener('input',e=>{const slider=e.target.closest('.is-explore-menu [data-battle-volume]'),g=window.arseneGame;if(!slider||!g)return;const channel=slider.dataset.battleVolume,percent=Number(slider.value)||0;g.audio.setVolume(channel,percent);if(percent>0)g.battleAudioRestore[channel]=percent/100;const value=document.querySelector(`.is-explore-menu [data-battle-volume-value="${channel}"]`);if(value)value.textContent=`${percent}%`;},true);
  document.addEventListener('click',e=>{const button=e.target.closest('[data-is-generate-specified]'),g=window.arseneGame;if(!button||!g)return;e.preventDefault();const gear=g.isGenerateDebugGear();if(gear)g.isAddLoot(gear);g.isRenderDebug($('#menu-panel'));},true);
})();
