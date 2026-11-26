// ARSÈNE RPG / 異世界個体装備・調律
(() => {
  'use strict';
  const D = window.ARSENE_DATA, G = window.BattleGame;
  if (!D || !G) return;
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
  const accessoryVariants = [
    {id:'accessory_life', name:'生命の護符', bonuses:{maxHp:.85}, focus:'HP型'},
    {id:'accessory_mana', name:'魔泉の耳飾り', bonuses:{maxMp:.32}, focus:'MP型'},
    {id:'accessory_might', name:'猛攻の腕輪', bonuses:{str:.11}, focus:'力型'},
    {id:'accessory_sorcery', name:'魔導の首飾り', bonuses:{mag:.11}, focus:'魔力型'},
    {id:'accessory_guard', name:'守護の勲章', bonuses:{vit:.065,mnd:.065}, focus:'防御型'},
    {id:'accessory_haste', name:'疾風のピアス', bonuses:{agi:.065,dex:.065}, focus:'速度・命中型'},
    {id:'accessory_fortune', name:'幸運の指輪', bonuses:{luk:.10}, focus:'運型'},
    {id:'accessory_harmony', name:'万象の印章', bonuses:{str:.026,vit:.026,mag:.026,mnd:.026,agi:.026,dex:.026,luk:.026}, focus:'全能力型'}
  ].map(part => ({...part, slot:'accessory'}));
  const gearParts = [...slots, ...accessoryVariants];
  const partsById = new Map(gearParts.map(part => [part.id, part]));

  const series = [
    { stars:3, id:'boundary', name:'境界', power:160, armor:85, color:'#62c5e8' },
    { stars:4, id:'deep', name:'深界', power:260, armor:150, color:'#8d70ff' },
    { stars:5, id:'phantasm', name:'幻奏', power:425, armor:235, color:'#e05eff' },
    { stars:6, id:'infinite', name:'無限', power:575, armor:315, color:'#ffbd4a' }
  ];
  D.otherWorldGearSeries = series;
  D.otherWorldGearIds = [];
  for (const s of series) for (const part of gearParts) {
    const id = `owg_${s.id}_${part.id}`, name = part.names?.[s.stars - 3] || `${s.name}・${part.name}`;
    const item = { id, name, nameEn:`${s.id.toUpperCase()} ${part.id.toUpperCase()}`, category:'equipment', slot:part.slot, rarity:s.stars >= 6 ? 'mythic' : s.stars === 5 ? 'legendary' : s.stars === 4 ? 'epic' : 'rare', stars:s.stars, otherWorldGear:true, otherWorldSeriesId:s.id, opFamily:part.slot === 'accessory' ? 'accessory' : part.slot === 'arms' || (part.weaponType && part.weaponType !== 'shield') ? 'attack' : 'support', description:`無限奏廊で発見された★${s.stars}異世界装備。${part.focus ? '特化：' + part.focus + '。' : ''}` };
    D.items[id] = item; D.otherWorldGearIds.push(id);
    const bonuses = Object.fromEntries(Object.entries(part.bonuses || {}).map(([key, rate]) => [key, Math.max(1, Math.round(s.armor * rate))]));
    const def = { ...item, bonuses };
    if (part.weaponType) {
      def.weaponType = part.weaponType;
      if (part.weaponType === 'staff' || part.weaponType === 'instrument') def.magicAttackPower = s.power;
      else if (part.weaponType === 'shield') { def.defensePower = s.power; def.magicDefensePower = Math.round(s.power * .72); }
      else def.attackPower = s.power;
      D.weapons[id] = def;
    } else {
      const rate = part.focus ? .38 : ({head:.72, body:1.25, arms:.66, feet:.66, accessory:.52}[part.slot] || 1);
      def.defensePower = Math.round(s.armor * rate); def.magicDefensePower = Math.round(s.armor * rate * .82);
      (D.armors ||= {})[id] = def;
    }
  }

  const damageCurve = [.03,.06,.10,.15,.22,.32];
  const conditionalCurve = [.04,.08,.13,.20,.30,.45];
  const defenseCurve = [.02,.04,.07,.10,.14,.20];
  const statCurve = [.02,.04,.07,.11,.16,.23];
  const dualStatCurve = [.01,.025,.045,.07,.10,.15];
  const op = (key, label, values, family, weight = 10, stats = null) => ({key, label, values, family, weight, stats});
  const attack = (key, label, values, weight) => op(key,label,values,'attack',weight);
  const support = (key, label, values, weight) => op(key,label,values,'support',weight);
  const statOp = (key,label,stats,family,values = statCurve) => op(key,label,values,family,6,stats);
  const baseStats = ['str','vit','mag','mnd','agi','dex','luk'];
  const combatKeys = ['attackPower','magicAttackPower','defensePower','magicDefensePower'];

  D.otherWorldGearOps = [
    attack('attackPower','攻撃力',[4,8,14,22,34,50]),
    attack('magicAttackPower','魔法攻撃力',[4,8,14,22,34,50]),
    attack('str','力',[1,2,4,7,11,16]),
    attack('mag','魔力',[1,2,4,7,11,16]),
    attack('dex','器用さ',[1,2,4,7,11,16]),
    attack('critBonus','会心率',[.01,.02,.035,.05,.075,.10],7),
    attack('physicalDamagePercent','物理与ダメージ',damageCurve,6),
    attack('magicDamagePercent','魔法与ダメージ',damageCurve,6),
    attack('hpDrain','HP吸収',[.003,.005,.008,.012,.018,.025],2),
    attack('repeatChance','追加発動',[.01,.02,.035,.05,.075,.10],3),
    attack('normalAttackDamageBonus','通常攻撃ダメージ',damageCurve,6),
    attack('skillDamageBonus','技・魔法ダメージ',damageCurve,6),
    attack('singleDamageBonus','単体攻撃ダメージ',damageCurve,5),
    attack('allDamageBonus','全体攻撃ダメージ',damageCurve,5),
    attack('openingDamageBonus','初ターンの与ダメージ',conditionalCurve,5),
    attack('healthyDamageBonus','HP80％以上で与ダメージ',conditionalCurve,5),
    attack('lowHpDamageBonus','HP35％以下で与ダメージ',conditionalCurve,5),
    attack('finisherDamageBonus','HP30％以下の敵に与ダメージ',conditionalCurve,5),
    attack('firstStrikeDamageBonus','HP満タンの敵に与ダメージ',conditionalCurve,5),
    attack('rareBossDamageBonus','レア敵・ボスへのダメージ',conditionalCurve,5),
    attack('criticalDamageBonus','会心ダメージ',conditionalCurve,5),
    attack('opFollowupDamage','追加ダメージ',[.04,.08,.15,.24,.38,.55],3),
    attack('accuracyUp','命中率',[.01,.02,.035,.05,.075,.10],6),
    attack('fireDamagePercent','火属性ダメージ',conditionalCurve,4),
    attack('elementalDamageBonus','属性付きの技のダメージ',damageCurve,5),
    statOp('attackPowerRate','攻撃力上昇',['attackPower'],'attack'),
    statOp('magicAttackPowerRate','魔法攻撃力上昇',['magicAttackPower'],'attack'),
    statOp('strRate','力上昇',['str'],'attack'),
    statOp('magRate','魔力上昇',['mag'],'attack'),
    statOp('dexRate','器用さ上昇',['dex'],'attack'),
    statOp('mightTechniqueRate','武技の素質',['str','dex'],'attack',dualStatCurve),
    statOp('magicTechniqueRate','魔技の素質',['mag','dex'],'attack',dualStatCurve),

    support('defensePower','防御力',[4,8,14,22,34,50]),
    support('magicDefensePower','魔法防御力',[4,8,14,22,34,50]),
    support('vit','体力',[1,2,4,7,11,16]),
    support('mnd','精神',[1,2,4,7,11,16]),
    support('agi','素早さ',[1,2,4,7,11,16]),
    support('luk','運',[1,2,4,7,11,16]),
    support('maxHp','最大HP',[10,22,40,70,110,170]),
    support('maxMp','最大MP',[5,11,20,34,52,78]),
    support('expUp','獲得経験値UP',[.03,.06,.10,.16,.24,.35],7),
    support('jobExpUp','JOB経験値UP',[.03,.06,.10,.16,.24,.35],7),
    support('masteryExpUp','武器学経験値UP',[.03,.06,.10,.16,.24,.35],7),
    support('goldUp','獲得GOLD UP',[.04,.08,.13,.20,.30,.45],7),
    support('materialDropUp','素材ドロップ率UP',[.02,.04,.07,.11,.17,.25],6),
    support('gearDropUp','装備ドロップ率UP',[.01,.02,.035,.055,.08,.12],5),
    support('rareDropUp','レア装備ドロップ倍率',[.005,.01,.018,.028,.04,.06],4),
    support('damageReductionPercent','被ダメージ軽減',defenseCurve,5),
    support('mpCostDown','消費MP軽減',[.02,.04,.07,.10,.15,.22],5),
    support('treasureUp','宝箱出現率UP',[.01,.02,.035,.05,.08,.12],5),
    support('rareEnemyUp','レア敵出現率UP',[.01,.02,.035,.055,.08,.12],4),
    support('returnUp','帰還札出現率UP',[.001,.002,.004,.007,.011,.018],2),
    support('stairUp','階段発見率UP',[.01,.02,.04,.06,.09,.13],4),
    support('bagPlus','バッグ枠追加',[1,1,2,2,3,5],3),
    support('physicalDamageReductionPercent','物理被ダメージ軽減',defenseCurve,6),
    support('magicDamageReductionPercent','魔法被ダメージ軽減',defenseCurve,6),
    support('receivedCriticalDamageReductionPercent','被会心ダメージ軽減',defenseCurve,5),
    support('receivedHealingPercent','受けるHP回復量',damageCurve,6),
    support('healingPowerPercent','回復技の効果',damageCurve,6),
    support('mpRestoreOnDamage','被ダメージの一部をMP回復',[.003,.006,.01,.015,.022,.032],2),
    support('turnHpRegenRate','行動開始時HP再生',[.003,.007,.012,.020,.03,.045],3),
    support('turnMpRegenRate','行動開始時MP再生',[.003,.007,.012,.020,.03,.045],3),
    support('evadeBonus','回避率',[.01,.02,.035,.05,.075,.10],5),
    support('trapDamageDown','罠ダメージ軽減',conditionalCurve,5),
    support('extraPotionHpRate','HP回復薬の効果',damageCurve,5),
    support('extraPotionMpRate','MP回復薬の効果',damageCurve,5),
    support('firstTurnGuard','初ターンの被ダメージ軽減',defenseCurve,5),
    support('lowHpGuard','HP35％以下で被ダメージ軽減',defenseCurve,5),
    support('healthyGuard','HP80％以上で被ダメージ軽減',defenseCurve,5),
    statOp('defensePowerRate','防御力上昇',['defensePower'],'support'),
    statOp('magicDefensePowerRate','魔法防御力上昇',['magicDefensePower'],'support'),
    statOp('vitRate','体力上昇',['vit'],'support'),
    statOp('mndRate','精神上昇',['mnd'],'support'),
    statOp('agiRate','素早さ上昇',['agi'],'support'),
    statOp('lukRate','運上昇',['luk'],'support'),
    statOp('maxHpRate','最大HP上昇',['maxHp'],'support'),
    statOp('maxMpRate','最大MP上昇',['maxMp'],'support'),
    statOp('defensesRate','堅守の素質',['vit','mnd'],'support',dualStatCurve),
    statOp('vitalsRate','生気の素質',['maxHp','maxMp'],'support',dualStatCurve),
    statOp('balancedStatsRate','全基礎能力上昇',baseStats,'accessory',[.01,.02,.03,.045,.065,.09])
  ];
  const opDefinitions = new Map(D.otherWorldGearOps.map(entry => [entry.key, entry]));
  if (D.infiniteScore?.opLabels) {
    for (const entry of D.otherWorldGearOps) D.infiniteScore.opLabels[entry.key] ||= entry.label;
    D.infiniteScore.opLabels.rareDropUp = opDefinitions.get('rareDropUp').label;
  }

  P.owgOpDefinition = function (key) {
    return opDefinitions.get(key);
  };

  P.owgOpFitsItem = function (key, itemId) {
    const item = D.items[itemId], family = opDefinitions.get(key)?.family;
    if (!item?.otherWorldGear || !family) return true;
    if (item.slot === 'accessory') return true;
    return family === item.opFamily;
  };

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
  P.owgEquipped=function(){const run=this.profile?.infiniteScore?.active?this.isRun?.():null;if(run)return Object.values(run.equipment||{}).map(uid=>this.owgEntry(uid)).filter(x=>x?.otherWorldGear);return Object.values(this.profile.otherWorldEquipment||{}).map(uid=>(this.profile.otherWorldGear||[]).find(x=>x.uid===uid)).filter(Boolean);};
  P.owgDefinition=function(x){return this.equipmentDefinition?.(x?.itemId)||{};};
  P.owgOpValueText = function (op) {
    const firstValue = this.owgOpDefinition(op.key)?.values[0];
    const isPercent = firstValue > 0 && firstValue < 1;
    const value = Number(op.value) * (isPercent ? 100 : 1);
    return value.toLocaleString('ja-JP', {maximumFractionDigits:4}) + (isPercent ? '%' : '');
  };
  P.owgName=function(x){const base=D.items[x.itemId]?.name||x.itemId, rare=(x.ops||[]).slice().sort((a,b)=>b.rank-a.rank)[0];return `${rare&&rare.rank>=5?`《${D.otherWorldGearOps.find(o=>o.key===rare.key)?.label||'異能'}の》`:''}${base}${x.uniqueSkillId?' — 奏技':''}`;};
  P.owgRollStar = function (floor) {
    const bands = floor >= 150 ? [0,10,60,30] : floor >= 100 ? [5,25,55,15] :
      floor >= 50 ? [15,40,38,7] : floor >= 25 ? [35,45,18,2] : floor >= 10 ? [60,32,7.5,.5] : [82,16,2,0];
    const top = bands[3];
    const bonus = this.isRun?.() ? this.isSupportRelicRate('astrolabe') : 0;
    const enhanced = Math.min(100, top * (1 + bonus / 100));
    let roll = this.isRand() * 100;
    if (roll >= 100 - enhanced) return 6;
    roll *= (100 - top) / (100 - enhanced);
    for (let i = 0; i < 3; i++) {
      if (roll < bands[i]) return i + 3;
      roll -= bands[i];
    }
    return 5;
  };
  P.owgQuality=function(floor){const range=floor>=150?[100,120]:floor>=100?[97,118]:floor>=50?[94,115]:floor>=25?[90,110]:[87,105];return range[0]+Math.floor(this.isRand()*(range[1]-range[0]+1));};
  P.owgRollOp = function (maxRank, used = [], rareDrop = false, itemId) {
    const pool = D.otherWorldGearOps.filter(entry => !used.includes(entry.key) && this.owgOpFitsItem(entry.key, itemId));
    if (!pool.length) return null;
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = this.isRand() * total;
    const pick = pool.find(entry => (roll -= entry.weight) < 0) || pool[pool.length - 1];
    const rollValue = () => rareDrop ? Math.max(this.isRand(), this.isRand()) : this.isRand();
    const rank = 1 + Math.floor(rollValue() * maxRank), base = pick.values[rank - 1];
    const value = base * (.9 + rollValue() * .2);
    return {key:pick.key, rank, value:base < 1 ? Number(value.toFixed(4)) : Math.max(1, Math.round(value))};
  };

  P.owgGenerate = function (force = {}) {
    normalize(this.profile);
    const floor = force.floor || this.isRun?.()?.floor || 1;
    const stars = force.stars || this.owgRollStar(floor), s = series[stars - 3];
    let part = partsById.get(force.part?.id);
    if (!part) {
      part = slots[Math.floor(this.isRand() * slots.length)];
      if (part.id === 'accessory') {
        part = [part, ...accessoryVariants][Math.floor(this.isRand() * (accessoryVariants.length + 1))];
      }
    }
    const itemId = `owg_${s.id}_${part.id}`, quality = this.owgQuality(floor);
    const maxRank = stars === 6 && floor >= 150 && this.isRand() < .01 ? 6 : Math.min(5, stars - 1);
    const countRoll = force.rareDrop ? Math.max(this.isRand(), this.isRand()) : this.isRand();
    const count = stars - 3 + Math.floor(countRoll * 2), ops = [];
    for (let i = 0; i < count; i++) {
      const op = this.owgRollOp(maxRank, ops.map(row => row.key), force.rareDrop, itemId);
      if (!op) break;
      ops.push(op);
    }
    const skillRate = {3:0,4:.005,5:.03,6:.08}[stars];
    const uniqueSkillId = part.weaponType && this.isRand() < skillRate ? D.otherWorldGearUniqueSkills[part.id]?.id : null;
    return {uid:`owg-${Date.now()}-${++this.profile.otherWorldGearUid}`, kind:'equipment', itemId, count:1,
      generated:true, otherWorldGear:true, stars, rarity:D.items[itemId].rarity, quality, multiplier:quality / 100,
      plus:0, tuneLevel:0, ops, uniqueSkillId, obtainedFloor:floor, locked:false};
  };

  P.isGenerateGear=function(force={}){return this.owgGenerate({floor:this.isRun()?.floor||1,...force});};
  const oldItemHtml=P.isItemHtml; P.isItemHtml=function(x){let html=oldItemHtml.call(this,x);if(x?.otherWorldGear)html=html.replace(/<button data-is-merge="[^"]+">合体<\/button>/,'').replace(D.items[x.itemId]?.name||x.itemId,this.owgName(x));return html;};
  P.isOpenMerge=function(){return this.isNotify?.('同名合体は廃止されました','帰還後に《異界の欠片》で調律できます。');};

  P.owgEffects=function(){const out={};for(const x of this.owgEquipped())for(const o of x.ops||[])out[o.key]=(out[o.key]||0)+o.value;return out;};
  const oldEffect=P.equipmentEffectRate;
  P.equipmentEffectRate=function(type,...args){
    return oldEffect.call(this,type,...args)+(Number(this.owgEffects()[type])||0);
  };
  P.owgEffectiveStats=function(x,level=x?.tuneLevel||0){const d=this.owgDefinition(x),quality=(x?.quality||100)/100,tune=1+Math.max(0,Number(level)||0)*.08,out={};for(const k of ['attackPower','defensePower','magicAttackPower','magicDefensePower']){const base=Number(d[k])||0,op=(x?.ops||[]).filter(o=>o.key===k).reduce((n,o)=>n+(Number(o.value)||0),0);if(base||op)out[k]={base,quality:Math.round(base*quality),tune:Math.round(base*quality*tune),op,total:Math.round(base*quality*tune)+op};}return out;};
  P.owgBaseEquipment=function(source=this.profile.equipment){if(this.isRun?.())return {};const equipment={...(source||{})};for(const x of this.owgEquipped()){const slot=D.items[x.itemId]?.slot;if(slot)delete equipment[slot];}return equipment;};

  function applyStatOps(stats, keys, effects) {
    const rates = {};
    for (const [key, value] of Object.entries(effects)) {
      for (const stat of opDefinitions.get(key)?.stats || []) rates[stat] = (rates[stat] || 0) + value;
    }
    for (const key of keys) if (rates[key]) stats[key] = Math.round((stats[key] || 0) * (1 + rates[key]));
  }

  const characterKeys = [...baseStats, 'maxHp', 'maxMp', 'critBonus'];
  const oldTotal = P.totalStats;
  P.totalStats = function (...args) {
    const run = this.isRun?.();
    const filterBase = !run && (!args.length || args[0] === this.profile.equipment);
    const total = oldTotal.apply(this, run || filterBase ? [this.owgBaseEquipment(args[0])] : args);
    const effects = this.owgEffects();
    for (const item of this.owgEquipped()) {
      const definition = this.owgDefinition(item);
      const multiplier = (item.quality || 100) / 100 * (1 + (item.tuneLevel || 0) * .08);
      for (const [key, value] of Object.entries(definition.bonuses || {})) {
        if (characterKeys.includes(key)) total[key] = (total[key] || 0) + Math.round(value * multiplier);
      }
    }
    for (const key of characterKeys) total[key] = (total[key] || 0) + (effects[key] || 0);
    applyStatOps(total, characterKeys, effects);
    if (run) this.isApplyRelicStats(total);
    total.def = total.vit;
    return total;
  };

  const oldCombat = P.equipmentCombatStats;
  P.equipmentCombatStats = function (...args) {
    const run = this.isRun?.();
    const filterBase = !run && (!args.length || args[0] === this.profile.equipment);
    const total = oldCombat.apply(this, run || filterBase ? [this.owgBaseEquipment(args[0])] : args);
    for (const item of this.owgEquipped()) {
      const stats = this.owgEffectiveStats(item);
      for (const key of combatKeys) total[key] = (total[key] || 0) + (stats[key]?.total || 0);
    }
    applyStatOps(total, combatKeys, this.owgEffects());
    return total;
  };

  P.owgDamageWithOps = function (value, skill, enemy, critical) {
    const fx = this.owgEffects();
    const playerHp = this.player.hp / this.player.stats.maxHp;
    const enemyHp = enemy.hp / enemy.stats?.maxHp;
    const normal = skill.kind === 'weapon' || skill.id === 'attack' ||
      (skill.id && skill.id === this.basicAttackSkill?.()?.id);
    const allTargets = skill.target === 'all';
    const rareOrBoss = enemy.rareRun || enemy.rare || this.battleMode === 'owBoss' ||
      (enemy.id && ((this.battleMode !== 'slime' && enemy.id === this.battleMode) || (D.dungeons || []).some(d => d.bossId === enemy.id || d.midBossId === enemy.id)));
    const bonus = (fx[normal ? 'normalAttackDamageBonus' : 'skillDamageBonus'] || 0) +
      (fx[allTargets ? 'allDamageBonus' : 'singleDamageBonus'] || 0) +
      (this.turn === 1 ? fx.openingDamageBonus || 0 : 0) +
      (playerHp >= .8 ? fx.healthyDamageBonus || 0 : 0) +
      (playerHp <= .35 ? fx.lowHpDamageBonus || 0 : 0) +
      (enemyHp <= .3 ? fx.finisherDamageBonus || 0 : 0) +
      (enemyHp >= 1 ? fx.firstStrikeDamageBonus || 0 : 0) +
      (rareOrBoss ? fx.rareBossDamageBonus || 0 : 0) +
      (critical ? fx.criticalDamageBonus || 0 : 0) +
      (skill.element ? fx.elementalDamageBonus || 0 : 0);
    const damage = bonus ? Math.max(1, Math.round(value * (1 + bonus))) : value;
    return damage + Math.floor(damage * (fx.opFollowupDamage || 0));
  };

  P.owgGuardDamage = function (amount, fx = this.owgEffects()) {
    const hp = this.player.hp / this.player.stats.maxHp;
    const rate = (this.turn === 1 ? fx.firstTurnGuard || 0 : 0) +
      (hp <= .35 ? fx.lowHpGuard || 0 : 0) +
      (hp >= .8 ? fx.healthyGuard || 0 : 0);
    return rate ? Math.round(amount * (1 - Math.min(.8, rate))) : amount;
  };

  P.owgRestoreCombatResource = function (key, amount) {
    if (!(amount > 0) || !(this.player?.hp > 0)) return false;
    const max = this.player.stats[key === 'hp' ? 'maxHp' : 'maxMp'];
    const gain = Math.min(max - this.player[key], Math.floor(amount));
    if (!(gain > 0)) return false;
    this.player[key] += gain;
    return true;
  };

  P.owgRecoverFromDamageDealt = function (damage) {
    if (damage > 0 && this.owgRestoreCombatResource('hp', damage * (this.owgEffects().hpDrain || 0))) this.persistVitals();
  };

  P.owgTurnRecovery = function () {
    const {turnHpRegenRate = 0, turnMpRegenRate = 0} = this.owgEffects();
    if (!(turnHpRegenRate || turnMpRegenRate)) return;
    const hp = this.owgRestoreCombatResource('hp', this.player.stats.maxHp * turnHpRegenRate);
    const mp = this.owgRestoreCombatResource('mp', this.player.stats.maxMp * turnMpRegenRate);
    if (hp || mp) { this.persistVitals(); this.updateHUD(); }
  };

  P.owgTrapDamage = function (amount) {
    return Math.round(amount * (1 - Math.min(.9, this.owgEffects().trapDamageDown || 0)));
  };
  const oldWeapon=P.equippedWeapon; P.equippedWeapon=function(){const run=this.isRun?.(),uid=run?.equipment?.rightHand||this.profile.otherWorldEquipment?.rightHand,x=this.owgEntry(uid);if(x)return D.weapons[x.itemId]||oldWeapon.call(this);return oldWeapon.call(this);};
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
  const oldMpCost=P.skillMpCost;P.skillMpCost=function(skill){return Math.max(0,Math.ceil(oldMpCost.call(this,skill)*(1-Math.min(.75,this.owgEffects().mpCostDown||0))));};
  const oldCfg=P.isEffectiveCfg;P.isEffectiveCfg=function(){const c=oldCfg.call(this),fx=this.owgEffects();return {...c,gearDropRate:Math.min(.95,(c.gearDropRate||0)+(fx.gearDropUp||0)),rareEnemyRate:(c.rareEnemyRate||0)+(fx.rareEnemyUp||0),returnItemRate:Math.min(.15,(c.returnItemRate||0)+(fx.returnUp||0)),treasureRate:(c.treasureRate||0)+(fx.treasureUp||0),stairBaseRate:Math.min(95,(c.stairBaseRate||0)+(fx.stairUp||0)*100)};};
  const oldBagLimit=P.isBagLimit;P.isBagLimit=function(){return oldBagLimit.call(this)+Math.floor(this.owgEffects().bagPlus||0);};

  P.owgTuneCost=function(x){const lv=x.tuneLevel||0,base={3:3,4:5,5:8,6:12}[x.stars],step={3:2,4:3,5:4,6:5}[x.stars];return {shard:base+lv*step,core:lv<5?0:{3:1,4:1,5:2,6:3}[x.stars]};};
  P.owgTuneRate=function(next){return next<=3?1:({4:.85,5:.70,6:.55,7:.42,8:.32,9:.24,10:.18}[next]??Math.max(.05,.18-(next-10)*.02));};
  P.owgTune=function(uid){const x=this.owgEntry(uid);if(!x)return;const c=this.owgTuneCost(x),next=(x.tuneLevel||0)+1,rate=this.owgTuneRate(next),inv=this.profile.inventory;if((inv.otherworldShard||0)<c.shard||(inv.otherworldCore||0)<c.core){alert('異界素材が足りません。');return;}if(!confirm(`${this.owgName(x)} +${x.tuneLevel||0} → +${next}\n欠片 ${c.shard}${c.core?` / 核 ${c.core}`:''}\n成功率 ${Math.round(rate*100)}%${next>=4?'（失敗時ロスト）':''}`))return;inv.otherworldShard-=c.shard;inv.otherworldCore-=c.core;if(Math.random()<rate){x.tuneLevel=next;x.plus=next;this.saveProfile();this.audio?.sfx?.('confirm');this.owgRenderVault(document.querySelector('#menu-panel'));return;}const backup=copy(x),i=this.profile.otherWorldGear.indexOf(x);if(i>=0)this.profile.otherWorldGear.splice(i,1);for(const s of Object.keys(this.profile.otherWorldEquipment))if(this.profile.otherWorldEquipment[s]===uid)delete this.profile.otherWorldEquipment[s];this.saveProfile();const restore=()=>{this.profile.otherWorldGear.push(backup);this.saveProfile();this.owgRenderVault(document.querySelector('#menu-panel'));};const shown=window.arseneQOffer?.show?.('protect',{title:'保護のアルカナ',copy:`${this.owgName(backup)} +${backup.tuneLevel||0}をロストから保護する。`,onGrant:restore,onClose:()=>this.owgRenderVault(document.querySelector('#menu-panel'))});if(!shown){alert('調律失敗。装備は無限奏廊へ消えた……');this.owgRenderVault(document.querySelector('#menu-panel'));}};
  P.owgEquip=function(uid){const x=this.owgEntry(uid),item=D.items[x?.itemId];if(!x||!item)return;this.profile.otherWorldEquipment[item.slot]=uid;this.saveProfile();this.owgRenderVault(document.querySelector('#menu-panel'));};
  P.owgTransfer=function(sourceUid){const src=this.owgEntry(sourceUid);if(!src?.ops?.length)return;const weapon=!!D.weapons[src.itemId],targets=this.profile.otherWorldGear.filter(x=>x.uid!==src.uid&&!!D.weapons[x.itemId]===weapon);if(!targets.length){alert('移植できる異世界装備がありません。');return;}const oi=Number(prompt(`移植するOP\n${src.ops.map((o,i)=>`${i+1}: ${D.otherWorldGearOps.find(d=>d.key===o.key)?.label||o.key} R${o.rank}`).join('\n')}`))-1,opv=src.ops[oi];if(!opv)return;const ti=Number(prompt(`移植先\n${targets.map((x,i)=>`${i+1}: ${this.owgName(x)} +${x.tuneLevel||0}`).join('\n')}`))-1,target=targets[ti];if(!target)return;if(!this.owgOpFitsItem(opv.key,target.itemId)){alert('その装備に移植できるOPではありません。');return;}const cost={shard:20+opv.rank*10,core:Math.max(1,opv.rank-2)},inv=this.profile.inventory;if((inv.otherworldShard||0)<cost.shard||(inv.otherworldCore||0)<cost.core){alert('移植素材が足りません。');return;}if(!confirm(`${this.owgName(src)}を消滅させ、OPを${this.owgName(target)}へ移植しますか？\n欠片 ${cost.shard} / 核 ${cost.core}`))return;inv.otherworldShard-=cost.shard;inv.otherworldCore-=cost.core;const same=target.ops.findIndex(o=>o.key===opv.key);if(same>=0)target.ops[same]=copy(opv);else if(target.ops.length<4)target.ops.push(copy(opv));else{const replace=clamp((Number(prompt(`上書きするOP 1～${target.ops.length}`))||1)-1,0,target.ops.length-1);target.ops[replace]=copy(opv);}this.profile.otherWorldGear.splice(this.profile.otherWorldGear.indexOf(src),1);for(const s of Object.keys(this.profile.otherWorldEquipment))if(this.profile.otherWorldEquipment[s]===src.uid)delete this.profile.otherWorldEquipment[s];this.saveProfile();this.owgRenderVault(document.querySelector('#menu-panel'));};
  P.owgRenderVault=function(panel){normalize(this.profile);const rows=this.profile.otherWorldGear.map(x=>{const eq=Object.values(this.profile.otherWorldEquipment).includes(x.uid);return `<article class="owg-card stars-${x.stars}${eq?' equipped':''}"><header><small>${'★'.repeat(x.stars)} / 品質 ${x.quality}</small><b>${esc(this.owgName(x))}</b><em>+${x.tuneLevel||0}</em></header><p>${(x.ops||[]).map(o=>`${esc(D.otherWorldGearOps.find(d=>d.key===o.key)?.label||o.key)} +${this.owgOpValueText(o)} R${o.rank}`).join(' / ')||'OPなし'}</p>${x.uniqueSkillId?`<strong>固有奏技《${esc(D.skills[x.uniqueSkillId]?.name)}》</strong>`:''}<footer><button data-owg-equip="${x.uid}">${eq?'装備中':'装備'}</button></footer></article>`;}).join('');panel.dataset.panel='otherworld-gear';panel.innerHTML=`<button class="panel-home" data-lenny="otherworld">異世界へ戻る</button><small>OTHER WORLD ARSENAL</small><h2>異世界装備庫</h2><div class="owg-res"><b>異界の欠片 ${(this.profile.inventory.otherworldShard||0)}</b><b>異界の核 ${(this.profile.inventory.otherworldCore||0)}</b></div><p class="ow-rule">持ち帰った異世界装備の閲覧・装備変更専用。加工は無限奏廊で遭遇する《異世界工房》だけで行えます。</p><div class="owg-list">${rows||'<p class="item-empty">持ち帰った異世界装備はありません。</p>'}</div>`;};
  const oldPanel=P.renderMenuPanel;P.renderMenuPanel=function(name){if(name==='otherworld-gear'){this.owgRenderVault(document.querySelector('#menu-panel'));return;}return oldPanel.call(this,name);};
  const oldOw=P.renderOtherWorldPanel;P.renderOtherWorldPanel=function(panel){oldOw.call(this,panel);panel.querySelector('.ow-mode-guide')?.insertAdjacentHTML('beforebegin','<button class="ow-ability-link owg-vault-link" data-menu="otherworld-gear"><b>異世界装備庫</b><span>個体装備の閲覧・装備変更</span></button>');};
  const oldApplyRewards=P.applyRewards;P.applyRewards=function(reward){const fx=this.owgEffects(),next={...reward,drops:{...(reward?.drops||{})}};if(next.exp)next.exp=Math.round(next.exp*(1+(fx.expUp||0)));if(next.gold)next.gold=Math.round(next.gold*(1+(fx.goldUp||0)));const bonus=Math.max(0,fx.materialDropUp||0);for(const [id,n] of Object.entries(next.drops))if(D.items[id]?.category==='material'){let extra=0;for(let i=0;i<n;i++)if(Math.random()<bonus)extra++;next.drops[id]+=extra;}return oldApplyRewards.call(this,next);};
  const oldJobExp=P.grantJobExp;P.grantJobExp=function(exp,...args){return oldJobExp.call(this,Math.round(exp*(1+(this.owgEffects().jobExpUp||0))),...args);};
  const oldWeaponExp=P.grantWeaponExp;P.grantWeaponExp=function(exp,...args){return oldWeaponExp.call(this,Math.round(exp*(1+(this.owgEffects().masteryExpUp||0))),...args);};
  const oldVictory=P.victory;P.victory=async function(...args){if(this.battleMode==='infiniteScore'&&this.isRun?.()?.floor>=25){const floor=this.isRun().floor,rate=floor>=150?.12:floor>=100?.08:floor>=50?.05:.02;if(this.isRand()<rate)this.isAddLoot({uid:this.isUid('core'),kind:'item',itemId:'otherworldCore',count:1});}return oldVictory.apply(this,args);};
  document.addEventListener('click',e=>{const g=window.arseneGame;if(!g)return;const equip=e.target.closest('[data-owg-equip]'),tune=e.target.closest('[data-owg-tune]'),transfer=e.target.closest('[data-owg-transfer]');if(equip){g.owgEquip(equip.dataset.owgEquip);return;}if(tune){g.owgTune(tune.dataset.owgTune);return;}if(transfer){g.owgTransfer(transfer.dataset.owgTransfer);}},true);
})();
