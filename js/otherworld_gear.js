// ARSÈNE RPG / 異世界個体装備・調律
(() => {
  'use strict';
  const D = window.ARSENE_DATA, G = window.BattleGame;
  if (!D || !G) return;
  const gearV2 = D.infiniteGear;
  const P = G.prototype, copy = value => JSON.parse(JSON.stringify(value));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const slots = [
    { id:'sword', slot:'rightHand', weaponType:'sword', names:['境界剣リフト','深界剣アビス','幻奏剣《ノクターン》','終奏神器《インフィニティ》'] },
    { id:'martial', slot:'rightHand', weaponType:'martial', names:['境界拳リズム','深界爪ヴォイド','幻奏闘装《ラプソディ》','無限闘装《ウロボロス》'] },
    { id:'staff', slot:'rightHand', weaponType:'staff', names:['境界杖エコー','深界杖ゲヘナ','幻奏杖《レクイエム》','無限魔杖《アカシック》'] },
    { id:'instrument', slot:'rightHand', weaponType:'instrument', names:['境界琴コード','深界奏器アビサル','幻奏器《ファンタジア》','終奏楽器《エンドレス》'] },
    { id:'shield', slot:'rightHand', weaponType:'shield', names:['境界盾リフレイン','深界盾タルタロス','幻奏盾《エタニティ》','無限聖盾《メビウス》'] },
    { id:'head', slot:'head', names:['境界の仮面','深界の魔眼','幻奏冠《ノクス》','無限冠《アイン》'] },
    { id:'body', slot:'body', names:['境界の外套','深界の黒衣','幻奏装《ファントム》','無限装《アペイロン》'] },
    { id:'arms', slot:'arms', names:['境界の手袋','深界の魔手','幻奏手《グリモア》','無限手《カオス》'] },
    { id:'feet', slot:'feet', names:['境界の靴','深界の影靴','幻奏脚《ミラージュ》','無限脚《ホライゾン》'] },
    { id:'accessory', slot:'accessory', names:['境界の指環','深界の黒環','幻奏環《アルカナ》','無限環《ゼロ》'] }
  ];
  const series = [
    { stars:3, id:'boundary', name:'境界', power:160, armor:85, color:'#62c5e8' },
    { stars:4, id:'deep', name:'深界', power:260, armor:150, color:'#8d70ff' },
    { stars:5, id:'phantasm', name:'幻奏', power:425, armor:235, color:'#e05eff' },
    { stars:6, id:'infinite', name:'無限', power:575, armor:315, color:'#ffbd4a' }
  ];
  D.otherWorldGearSeries = series;
  D.otherWorldGearIds = [];
  for (const s of series) for (const part of slots) {
    const id = `owg_${s.id}_${part.id}`, name = part.names[s.stars - 3];
    const item = { id, name, nameEn:`${s.id.toUpperCase()} ${part.id.toUpperCase()}`, category:'equipment', slot:part.slot, rarity:s.stars >= 6 ? 'mythic' : s.stars === 5 ? 'legendary' : s.stars === 4 ? 'epic' : 'rare', stars:s.stars, otherWorldGear:true, otherWorldSeriesId:s.id, description:`無限奏廊で発見された★${s.stars}異世界装備。個体品質とOPを持つ。` };
    D.items[id] = item; D.otherWorldGearIds.push(id);
    const def = { ...item, bonuses:{} };
    if (part.weaponType) {
      def.weaponType = part.weaponType;
      if (part.weaponType === 'staff' || part.weaponType === 'instrument') def.magicAttackPower = s.power;
      else if (part.weaponType === 'shield') { def.defensePower = s.power; def.magicDefensePower = Math.round(s.power * .72); }
      else def.attackPower = s.power;
      D.weapons[id] = def;
    } else {
      const rate = { head:.72, body:1.25, arms:.66, feet:.66, accessory:.52 }[part.slot] || 1;
      def.defensePower = Math.round(s.armor * rate); def.magicDefensePower = Math.round(s.armor * rate * .82);
      (D.armors ||= {})[id] = def;
    }
  }

  const op = (key, label, values, weight=10, kind='normal') => ({ key,label,values,weight,kind });
  D.otherWorldGearOps = [
    op('attackPower','攻撃力',[4,8,14,22,34,50]), op('defensePower','防御力',[4,8,14,22,34,50]), op('magicAttackPower','魔法攻撃力',[4,8,14,22,34,50]), op('magicDefensePower','魔法防御力',[4,8,14,22,34,50]),
    ...['str:力','vit:体力','mag:魔力','mnd:精神','agi:素早さ','dex:器用さ','luk:運'].map(x=>{const [k,l]=x.split(':');return op(k,l,[1,2,4,7,11,16]);}),
    op('maxHp','最大HP',[10,22,40,70,110,170]), op('maxMp','最大MP',[5,11,20,34,52,78]), op('critBonus','会心率',[.01,.02,.035,.05,.075,.10],7),
    op('expUp','EXP UP',[.03,.06,.10,.16,.24,.35],7,'growth'), op('jobExpUp','JOB EXP UP',[.03,.06,.10,.16,.24,.35],7,'growth'), op('masteryExpUp','武器学EXP UP',[.03,.06,.10,.16,.24,.35],7,'growth'),
    op('goldUp','GOLD UP',[.04,.08,.13,.20,.30,.45],7,'loot'), op('materialDropUp','素材ドロップUP',[.02,.04,.07,.11,.17,.25],6,'loot'), op('gearDropUp','装備ドロップUP',[.01,.02,.035,.055,.08,.12],5,'loot'), op('rareDropUp','レアドロップUP',[.005,.01,.018,.028,.04,.06],4,'loot'),
    op('physicalDamagePercent','物理与ダメージ',[.03,.06,.10,.15,.22,.32],6), op('magicDamagePercent','魔法与ダメージ',[.03,.06,.10,.15,.22,.32],6), op('damageReductionPercent','被ダメージ軽減',[.02,.04,.07,.10,.14,.20],5),
    op('hpDrain','HP吸収',[.01,.02,.03,.045,.06,.08],4), op('mpCostDown','消費MP軽減',[.02,.04,.07,.10,.15,.22],5), op('repeatChance','追加発動',[.01,.02,.035,.05,.075,.10],3),
    op('treasureUp','宝箱率UP',[.01,.02,.035,.05,.08,.12],5,'infinite'), op('rareEnemyUp','レア敵率UP',[.005,.01,.018,.028,.04,.06],4,'infinite'), op('returnUp','RETURN率UP',[.001,.002,.004,.007,.011,.018],2,'infinite'), op('stairUp','階段発見率UP',[.01,.02,.04,.06,.09,.13],4,'infinite'), op('bagPlus','バッグ枠',[1,1,2,2,3,5],3,'infinite')
  ];
  D.otherWorldGearUniqueSkills = {
    sword:{ id:'owgBoundarySlash', name:'境界断ち', nameEn:'RIFT BREAK', type:'ACTIVE', kind:'physical', target:'single', mp:8, power:1.8, powerText:'攻撃力×1.8', effectText:'敵HP30%以下で威力上昇', description:'世界の継ぎ目ごと敵を断つ固有奏技。' },
    martial:{ id:'owgSilentBeat', name:'無拍子', nameEn:'SILENT BEAT', type:'ACTIVE', kind:'physical', target:'single', mp:0, power:.55, hits:3, powerText:'攻撃力×0.55×3', effectText:'MP消費なし', description:'拍子を捨てた三連撃。' },
    staff:{ id:'owgAbyssCast', name:'深淵詠唱', nameEn:'ABYSS CAST', type:'ACTIVE', kind:'magical', target:'all', mp:18, power:1.35, powerText:'魔力×1.35', effectText:'敵全体へ虚属性魔法', description:'深界の言葉で虚無を呼ぶ。' },
    instrument:{ id:'owgEncore', name:'幻奏再演', nameEn:'PHANTOM ENCORE', type:'ACTIVE', kind:'magical', target:'all', mp:20, power:1.45, powerText:'魔力×1.45', effectText:'敵全体へ幻奏攻撃', description:'存在しない旋律を再演する。' },
    shield:{ id:'owgCounterWall', name:'反界', nameEn:'COUNTER RIFT', type:'ACTIVE', kind:'physical', target:'single', mp:10, power:1.6, powerText:'防御力依存', effectText:'盾の境界を叩きつける', description:'受けた力を境界から返す。' }
  };
  Object.values(D.otherWorldGearUniqueSkills).forEach(skill => { D.skills[skill.id] = skill; });

  const normalize = p => { p.otherWorldGear ||= []; p.otherWorldEquipment ||= {}; p.otherWorldGearUid ||= 0; return p; };
  const oldLoad=P.loadProfile; P.loadProfile=function(){return normalize(oldLoad.call(this));};
  const oldFresh=P.freshProfile; P.freshProfile=function(){return normalize(oldFresh.call(this));};
  if (window.arseneGame?.profile) normalize(window.arseneGame.profile);
  P.owgEntry=function(uid){return (this.profile.otherWorldGear||[]).find(x=>x.uid===uid)||(this.isRun?.()?.lootBag||[]).find(x=>x.uid===uid);};
  P.owgEquipped=function(){const run=this.isRunForEquipment?.();if(run)return Object.values(run.equipment||{}).map(uid=>this.owgEntry(uid)).filter(x=>x?.otherWorldGear);return Object.values(this.profile.otherWorldEquipment||{}).map(uid=>(this.profile.otherWorldGear||[]).find(x=>x.uid===uid)).filter(Boolean);};
  P.owgDefinition=function(x){return this.equipmentDefinition?.(x?.itemId)||{};};
  P.owgName=function(x){
    if (!x) return '';
    if (gearV2.isV2(x)) return x.name || D.items[x.itemId]?.name || x.itemId;
    const base=D.items[x.itemId]?.name||x.itemId, rare=(x.ops||[]).slice().sort((a,b)=>b.rank-a.rank)[0];
    return `${rare&&rare.rank>=5?`《${D.otherWorldGearOps.find(o=>o.key===rare.key)?.label||'異能'}の》`:''}${base}${x.uniqueSkillId?' — 奏技':''}`;
  };
  P.owgGenerate=function({floor=this.isRun()?.floor||1,rarity,part}={}){
    normalize(this.profile);
    const uid=`owg-v2-${Date.now()}-${++this.profile.otherWorldGearUid}`;
    return gearV2.generate({uid,floor,rarity,part,random:()=>this.isRand()});
  };
  P.owgOpText=function(item,op){
    if (gearV2.isV2(item)) return gearV2.opText(op);
    const label=D.otherWorldGearOps.find(row=>row.key===op.key)?.label||D.infiniteScore.opLabels[op.key]||op.key;
    const value=Math.abs(op.value)<1?`${Number((op.value*100).toFixed(2))}%`:op.value;
    return `${label} +${value}［旧R${op.rank}］`;
  };
  P.owgMetaHtml=function(x){
    const rarity=D.infiniteScore.rarity[x.rarity];
    const name=rarity?.name||'旧装備';
    const badge=`<span class="owg-rarity${x.rarity==='infinity'?' owg-infinity-badge':''}" style="--owg-color:${rarity?.color||'#b8c2cd'}">${esc(name)}</span>`;
    return `${badge} <span>${x.obtainedFloor?`入手 ${gearV2.number(x.obtainedFloor)}F`:'入手階不明'}</span> <span>強化 +${gearV2.number(x.plus||x.tuneLevel||0)}</span> <span>OP ${x.ops?.length||0}</span>${x.locked?' <span>ロック中</span>':''}${gearV2.isV2(x)?'':' <span>旧装備</span>'}`;
  };
  P.owgBaseText=function(x){
    const stats=this.owgEffectiveStats(x);
    return Object.entries(stats).map(([key,row])=>{
      const label=D.infiniteScore.opLabels[key]||key;
      return `${label} ${gearV2.number(row.total)}${gearV2.isV2(x)&&row.total!==row.base?`（基礎 ${gearV2.number(row.base)}）`:''}`;
    }).join(' ／ ');
  };

  const oldReturn=P.isReturnRun; P.isReturnRun=function(){const r=this.isRun?.();if(!r)return oldReturn.call(this);normalize(this.profile);for(const x of r.lootBag){if(x.otherWorldGear)this.profile.otherWorldGear.push(copy(x));else this.profile.inventory[x.itemId]=(this.profile.inventory[x.itemId]||0)+(x.count||1);}const count=r.lootBag.length,floor=r.floor;this.profile.equipment=copy(r.homeEquipmentInProfile ? this.profile.equipment : (r.homeEquipment||this.profile.equipment));this.profile.currentVitals=copy(r.homeVitals||this.profile.currentVitals);this.profile.infiniteScore={active:false,lastResult:'return',returnedCount:count,lastFloor:floor,endedAt:Date.now()};this.profile.flags.owRestoreJobPending=true;this.saveProfile();document.getElementById('is-modal')?.remove();this.showResult('RETURN SUCCESS',`${count}枠の戦利品を持ち帰った。`,'INFINITE SCORE // ESCAPED',`<div class="is-stairs"><b>FLOOR ${floor}から生還</b><p>異世界装備は《異世界装備庫》へ保管されました。</p></div>`);};

  P.owgEffects=function(){
    const equipped=this.owgEquipped(), out=gearV2.optionRates(equipped);
    for (const x of equipped) if (!gearV2.isV2(x)) {
      for (const op of x.ops||[]) out[op.key]=(out[op.key]||0)+(Number(op.value)||0);
    }
    return out;
  };
  const oldEffect=P.equipmentEffectRate;
  P.equipmentEffectRate=function(type,...args){
    return oldEffect.call(this,type,...args)+(Number(this.owgEffects()[type])||0);
  };
  P.owgEffectiveStats=function(x,atLevel){
    if (gearV2.isV2(x)) {
      return Object.fromEntries(Object.entries(gearV2.strengthened(x,atLevel)).map(([key,total])=>
        [key,{base:x.baseStats[key],tune:total,op:0,total}]));
    }
    const definition=this.owgDefinition(x), quality=(x?.quality||100)/100, tune=1+(atLevel ?? x?.tuneLevel ?? 0)*.08;
    const out={};
    for (const key of gearV2.combatKeys) {
      const base=Number(definition[key])||0;
      const op=(x?.ops||[]).filter(entry=>entry.key===key).reduce((sum,entry)=>sum+(Number(entry.value)||0),0);
      if (base||op) out[key]={base,quality:Math.round(base*quality),tune:Math.round(base*quality*tune),op,total:Math.round(base*quality*tune)+op};
    }
    return out;
  };
  P.owgBaseEquipment=function(source=this.profile.equipment){if(this.isRunForEquipment?.())return {};const equipment={...(source||{})};for(const x of this.owgEquipped()){const slot=D.items[x.itemId]?.slot;if(slot)delete equipment[slot];}return equipment;};
  const useBaseEquipment=(game,args)=>game.isRunForEquipment?.()||!args.length||args[0]===game.profile.equipment
    ? [game.owgBaseEquipment(args[0])] : args;
  const oldTotal=P.totalStats;
  P.totalStats=function(...args){
    const total=oldTotal.apply(this,useBaseEquipment(this,args));
    const equipped=this.owgEquipped(), rates=gearV2.optionRates(equipped);
    for (const x of equipped) {
      if (gearV2.isV2(x)) {
        const values=gearV2.strengthened(x);
        for (const key of gearV2.vitalKeys) if (values[key]) total[key]=(total[key]||0)+values[key];
        continue;
      }
      const scale=(x.quality||100)/100*(1+(x.tuneLevel||0)*.08);
      for (const key of [...gearV2.vitalKeys,'critBonus']) {
        const bonus=Math.round((this.owgDefinition(x).bonuses?.[key]||0)*scale);
        const op=(x.ops||[]).filter(o=>o.key===key).reduce((sum,o)=>sum+(Number(o.value)||0),0);
        total[key]=(total[key]||0)+bonus+op;
      }
    }
    if (equipped.some(gearV2.isV2)) {
      for (const key of gearV2.vitalKeys) total[key]=gearV2.applyStatRate(total[key]||0,rates[key+'Rate']);
    }
    total.def=total.vit;
    return total;
  };
  const oldCombat=P.equipmentCombatStats;
  P.equipmentCombatStats=function(...args){
    const out=oldCombat.apply(this,useBaseEquipment(this,args));
    const equipped=this.owgEquipped(), rates=gearV2.optionRates(equipped);
    for (const x of equipped) {
      const values=this.owgEffectiveStats(x);
      for (const key of gearV2.combatKeys) out[key]=(out[key]||0)+(values[key]?.total||0);
    }
    if (equipped.some(gearV2.isV2)) {
      for (const key of gearV2.combatKeys) out[key]=gearV2.applyStatRate(out[key],rates[key+'Rate']);
    }
    return out;
  };
  P.owgAdjustDamage=function(value,skill,enemy,critical){
    const equipped=this.owgEquipped();
    if (!equipped.some(gearV2.isV2)) return null;
    const rates=gearV2.optionRates(equipped);
    const base=Math.max(1,Math.round(gearV2.damage(value,rates,{
      basic:skill.id===this.basicAttackSkill().id, skill,enemy,critical,
      turn:this.turn,hp:this.player.hp,maxHp:this.player.stats.maxHp,
      alive:this.enemies?.filter(target=>target.hp>0).length||0,
      previousBasicHit:this.player.owgBasicHitTurn===this.turn-1,
      previousGuardHit:this.player.owgGuardHitTurn===this.turn-1
    })));
    const additionalDamage=gearV2.extraDamage(base,rates);
    return {value:base+additionalDamage, additionalDamage};
  };
  P.owgRestoreFromDamage=function(vital,amount){
    const player=this.player;
    if (amount<=0 || !player?.hp) return 0;
    const hp=vital==='hp';
    const max=player.stats[hp?'maxHp':'maxMp'];
    if (player[vital]>=max) return 0;
    const rate=gearV2.optionRates(this.owgEquipped())[hp?'lifeStealRate':'hitMpRecoveryRate'];
    if (!rate) return 0;
    // Small hits accumulate fractional recovery within the current battle.
    const carry=player.owgRecoveryCarry ||= {};
    const total=(carry[vital]||0)+amount*rate;
    const whole=Math.floor(total+1e-9);
    carry[vital]=Math.max(0,total-whole);
    const gained=Math.min(whole,max-player[vital]);
    if (gained>0) {
      player[vital]+=gained;
      this.floating(document.querySelector('#ren'),`${hp?'HP':'MP'} +${gained}`,'heal');
      this.setLog(`《${hp?'HP吸収':'被ダメージ時MP回復'}》${hp?'HP':'MP'}が${gained}回復！`);
    }
    return gained;
  };
  function restoreBattleVital(game,key,rate,label) {
    const player=game.player;
    if (!rate || !player?.hp) return 0;
    const max=player.stats[key==='hp'?'maxHp':'maxMp'];
    const gained=Math.min(Math.max(0,max-player[key]),Math.floor(max*rate+1e-9));
    if (gained>0) {
      player[key]+=gained;
      const vital=key.toUpperCase();
      game.setLog(`《${label}》${vital}が${gained}回復！`);
      game.floating(document.querySelector('#ren'),`${vital} +${gained}`,'heal');
    }
    return gained;
  }
  const oldBeginTurn=P.beginPlayerTurn;
  P.beginPlayerTurn=async function(...args){
    if (restoreBattleVital(this,'hp',this.owgEffects().turnHealRate,'戦闘再生')) {
      this.persistVitals();
      this.updateHUD();
    }
    return oldBeginTurn.apply(this,args);
  };
  P.owgOpeningWard=function(damage){
    if (damage<=0 || this.player.owgWardUsed) return damage;
    const rate=this.owgEffects().firstHitWardRate;
    if (!rate) return damage;
    this.player.owgWardUsed=true;
    const reduced=Math.round(damage*(1-rate));
    if (reduced<damage) this.setLog(`《初撃防壁》被ダメージ -${damage-reduced}`);
    return reduced;
  };
  P.owgOnGuardHit=function(actual){
    if (actual<=0 || !this.player.hp || this.player.buffs?.guardUntil!==this.turn ||
        this.player.owgGuardHitTurn===this.turn) return;
    this.player.owgGuardHitTurn=this.turn;
    restoreBattleVital(this,'mp',this.owgEffects().guardMpRate,'防御充填');
  };
  P.owgAfterLandedHit=function(target,actual,skill){
    if (actual<=0) return;
    const effects=this.owgEffects();
    if (effects.basicToSkillRate && skill?.id===this.basicAttackSkill().id) this.player.owgBasicHitTurn=this.turn;
    if (!effects.weaponDefBreakRate || target.hp<=0) return;
    target.owgBreachHits=(target.owgBreachHits||0)+1;
    if (target.owgBreachHits<3) return;
    target.owgBreachHits=0;
    target.owgBreachUntil=this.turn+1;
    target.owgBreachRate=effects.weaponDefBreakRate;
    this.setLog(`《護り崩し》${target.name}の物理・魔法防御 -${gearV2.number(effects.weaponDefBreakRate*100)}%`);
  };
  const oldWeapon=P.equippedWeapon;
  P.equippedWeapon=function(){
    const run=this.isRunForEquipment?.();
    const uid=run ? run.equipment?.rightHand : this.profile.otherWorldEquipment?.rightHand;
    const item=run ? this.isBagEntry(uid) : (this.profile.otherWorldGear||[]).find(x=>x.uid===uid);
    return (item && D.weapons[item.itemId]) || oldWeapon.call(this);
  };
  const oldSkills=P.availableSkills; P.availableSkills=function(){const list=oldSkills.call(this),skills=this.owgEquipped().map(x=>D.skills[x.uniqueSkillId]).filter(Boolean);return [...new Map([...list,...skills].map(x=>[x.id,x])).values()];};
  // Combat reads these two individual OPs through the existing boss-set effect API.
  const oldSet=P.activeSetEffects;
  P.activeSetEffects=function(...args){
    const effects=oldSet.apply(this,args);
    const {damageReductionPercent=0,repeatChance=0}=this.owgEffects();
    if(!damageReductionPercent&&!repeatChance)return effects;
    const result={...effects};
    if(damageReductionPercent){
      result.damageReductionPercent=Math.min(80,(effects.damageReductionPercent||0)+damageReductionPercent*100);
    }
    if(repeatChance){
      result.physicalRepeatChance=Math.min(.30,(effects.physicalRepeatChance||0)+repeatChance);
      result.magicRepeatChance=Math.min(.30,(effects.magicRepeatChance||0)+repeatChance);
    }
    return result;
  };
  const oldMpCost=P.skillMpCost;
  P.skillMpCost=function(skill){
    const effects=this.owgEffects(), legacy=Math.min(.75,effects.mpCostDown||0);
    const efficiency=effects.mpEfficiencyRate||0;
    const factor=Math.max(.25,(1-legacy)/(1+efficiency));
    return Math.max(0,Math.ceil(oldMpCost.call(this,skill)*factor));
  };
  const oldCfg=P.isEffectiveCfg;P.isEffectiveCfg=function(){const c=oldCfg.call(this),fx=this.owgEffects();return {...c,gearDropRate:Math.min(.95,(c.gearDropRate||0)+(fx.gearDropUp||0)),rareEnemyRate:(c.rareEnemyRate||0)+(fx.rareEnemyUp||0),returnItemRate:Math.min(.15,(c.returnItemRate||0)+(fx.returnUp||0)),treasureRate:(c.treasureRate||0)+(fx.treasureUp||0),stairBaseRate:Math.min(95,(c.stairBaseRate||0)+(fx.stairUp||0)*100)};};
  const oldBagLimit=P.isBagLimit;P.isBagLimit=function(){return oldBagLimit.call(this)+(this.owgEffects().bagPlus||0);};

  P.owgEquip=function(uid){const x=this.owgEntry(uid),item=D.items[x?.itemId];if(!x||!item)return;this.profile.otherWorldEquipment[item.slot]=uid;this.saveProfile();this.owgRenderVault(document.querySelector('#menu-panel'));};
  P.owgRenderVault=function(panel){normalize(this.profile);const rows=this.profile.otherWorldGear.map(x=>{const eq=Object.values(this.profile.otherWorldEquipment).includes(x.uid);return `<article class="owg-card stars-${x.stars||x.tier} ${x.rarity==='infinity'?'owg-infinity':''}${eq?' equipped':''}"><header><div class="owg-meta">${this.owgMetaHtml(x)}</div><b>${esc(this.owgName(x))}</b></header><p>${esc(this.owgBaseText(x))}</p><p>${(x.ops||[]).map(o=>`${esc(this.owgOpText(x,o))}`).join(' / ')||'OPなし'}</p>${x.uniqueSkillId?`<strong>固有奏技《${esc(D.skills[x.uniqueSkillId]?.name)}》</strong>`:''}<footer><button data-owg-equip="${esc(x.uid)}">${eq?'装備中':'装備'}</button></footer></article>`;}).join('');panel.dataset.panel='otherworld-gear';panel.innerHTML=`<button class="panel-home" data-lenny="otherworld">異世界へ戻る</button><small>OTHER WORLD ARSENAL</small><h2>異世界装備庫</h2><div class="owg-res"><b>異界の欠片 ${(this.profile.inventory.otherworldShard||0)}</b><b>異界の核 ${(this.profile.inventory.otherworldCore||0)}</b></div><p class="ow-rule">持ち帰った異世界装備の閲覧・装備変更専用。加工は無限奏廊で遭遇する《異世界工房》だけで行えます。</p><div class="owg-list">${rows||'<p class="item-empty">持ち帰った異世界装備はありません。</p>'}</div>`;};
  const oldPanel=P.renderMenuPanel;P.renderMenuPanel=function(name){if(name==='otherworld-gear'){this.owgRenderVault(document.querySelector('#menu-panel'));return;}return oldPanel.call(this,name);};
  const oldOw=P.renderOtherWorldPanel;P.renderOtherWorldPanel=function(panel){oldOw.call(this,panel);panel.querySelector('.ow-mode-guide')?.insertAdjacentHTML('beforebegin','<button class="ow-ability-link owg-vault-link" data-menu="otherworld-gear"><b>異世界装備庫</b><span>個体装備の閲覧・装備変更</span></button>');};
  function carriedRewardMultiplier(game,key) {
    const mode=String(game.battleMode||'');
    if (!mode || mode==='infiniteScore' || mode.startsWith('ow') || mode==='debugOverpower' || game.isRun?.()) return 1;
    return 1+(gearV2.optionRates(game.owgEquipped())[key]||0);
  }
  const oldRewardExpMultiplier=P.rewardExpMultiplier;
  P.rewardExpMultiplier=function(){
    return oldRewardExpMultiplier.call(this)*carriedRewardMultiplier(this,'normalDungeonExpRate');
  };
  const oldRewardGoldMultiplier=P.rewardGoldMultiplier;
  P.rewardGoldMultiplier=function(){
    return oldRewardGoldMultiplier.call(this)*carriedRewardMultiplier(this,'normalDungeonGoldRate');
  };
  const oldApplyRewards=P.applyRewards;
  P.applyRewards=function(reward,awarded){
    const fx=this.owgEffects(), next={...reward,drops:{...(reward?.drops||{})}};
    if(next.exp)next.exp=Math.round(next.exp*(1+(fx.expUp||0)));
    if(next.gold)next.gold=Math.round(next.gold*(1+(fx.goldUp||0)));
    const bonus=Math.max(0,fx.materialDropUp||0);
    for(const [id,n] of Object.entries(next.drops))if(D.items[id]?.category==='material'){
      let extra=0;
      for(let i=0;i<n;i++)if(Math.random()<bonus)extra++;
      next.drops[id]+=extra;
    }
    const levels=oldApplyRewards.call(this,next);
    if (awarded) Object.assign(awarded,{exp:next.exp,gold:next.gold});
    return levels;
  };
  const oldJobExp=P.grantJobExp;P.grantJobExp=function(exp,...args){return oldJobExp.call(this,Math.round(exp*(1+(this.owgEffects().jobExpUp||0))),...args);};
  const oldWeaponExp=P.grantWeaponExp;P.grantWeaponExp=function(exp,...args){return oldWeaponExp.call(this,Math.round(exp*(1+(this.owgEffects().masteryExpUp||0))),...args);};
  const oldVictory=P.victory;
  P.victory=async function(...args){
    const run=this.battleMode==='infiniteScore' ? this.isRun?.() : null;
    if (run && !this.finished) restoreBattleVital(this,'hp',this.owgEffects().victoryHealRate,'戦後手当');
    const floor=run?.floor;
    if (floor>=25) {
      const rate=floor>=150?.12:floor>=100?.08:floor>=50?.05:.02;
      if(this.isRand()<rate)this.isAddLoot({uid:this.isUid('core'),kind:'item',itemId:'otherworldCore',count:1});
    }
    return oldVictory.apply(this,args);
  };
  document.addEventListener('click',e=>{
    const equip=e.target.closest('[data-owg-equip]'),g=window.arseneGame;
    if(equip&&g)g.owgEquip(equip.dataset.owgEquip);
  },true);
})();
