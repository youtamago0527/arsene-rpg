// ARSÈNE RPG / 異世界個体装備・調律・共鳴
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
  const series = [
    { stars:3, id:'boundary', name:'境界', power:34, armor:18, color:'#62c5e8' },
    { stars:4, id:'deep', name:'深界', power:52, armor:29, color:'#8d70ff' },
    { stars:5, id:'phantasm', name:'幻奏', power:78, armor:44, color:'#e05eff' },
    { stars:6, id:'infinite', name:'無限', power:112, armor:64, color:'#ffbd4a' }
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
  P.owgEquipped=function(){if(this.isRun?.())return Object.values(this.isRun().equipment||{}).map(uid=>this.owgEntry(uid)).filter(x=>x?.otherWorldGear);return Object.values(this.profile.otherWorldEquipment||{}).map(uid=>this.owgEntry(uid)).filter(Boolean);};
  P.owgDefinition=function(x){return this.equipmentDefinition?.(x?.itemId)||{};};
  P.owgName=function(x){const base=D.items[x.itemId]?.name||x.itemId, rare=(x.ops||[]).slice().sort((a,b)=>b.rank-a.rank)[0];return `${rare&&rare.rank>=5?`《${D.otherWorldGearOps.find(o=>o.key===rare.key)?.label||'異能'}の》`:''}${base}${x.uniqueSkillId?' — 奏技':''}`;};
  P.owgRollStar=function(floor){const bands=floor>=150?[0,10,60,30]:floor>=100?[5,25,55,15]:floor>=50?[15,40,38,7]:floor>=25?[35,45,18,2]:floor>=10?[60,32,7.5,.5]:[82,16,2,0],r=this.isRand()*100;let n=r;for(let i=0;i<4;i++){n-=bands[i];if(n<=0)return i+3;}return 3;};
  P.owgQuality=function(floor){const range=floor>=150?[100,120]:floor>=100?[97,118]:floor>=50?[94,115]:floor>=25?[90,110]:[87,105];return range[0]+Math.floor(this.isRand()*(range[1]-range[0]+1));};
  P.owgRollOp=function(maxRank,used=[]){const pool=D.otherWorldGearOps.filter(x=>!used.includes(x.key)),sum=pool.reduce((n,x)=>n+x.weight,0);let r=this.isRand()*sum,pick=pool[0];for(const x of pool){r-=x.weight;if(r<=0){pick=x;break;}}const rank=1+Math.floor(this.isRand()*maxRank),base=pick.values[rank-1],value=typeof base==='number'&&base<1?+(base*(.9+this.isRand()*.2)).toFixed(4):Math.max(1,Math.round(base*(.9+this.isRand()*.2)));return {key:pick.key,rank,value};};
  P.owgGenerate=function(force={}){normalize(this.profile);const floor=force.floor||this.isRun?.()?.floor||1,stars=force.stars||this.owgRollStar(floor),s=series[stars-3],parts=slots,part=force.part||parts[Math.floor(this.isRand()*parts.length)],itemId=`owg_${s.id}_${part.id}`,quality=this.owgQuality(floor),maxRank=stars===6&&floor>=150&&this.isRand()<.01?6:Math.min(5,stars-1),count=stars===3?Math.floor(this.isRand()*2):stars===4?1+Math.floor(this.isRand()*2):stars===5?2+Math.floor(this.isRand()*2):3+Math.floor(this.isRand()*2),ops=[];while(ops.length<count)ops.push(this.owgRollOp(maxRank,ops.map(x=>x.key)));const skillRate={3:0,4:.005,5:.03,6:.08}[stars],uniqueSkillId=part.weaponType&&this.isRand()<skillRate?D.otherWorldGearUniqueSkills[part.id]?.id:null,rarity=stars===6?'mythic':stars===5?'legendary':stars===4?'epic':'rare';return {uid:`owg-${Date.now()}-${++this.profile.otherWorldGearUid}`,kind:'equipment',itemId,count:1,generated:true,otherWorldGear:true,stars,rarity,quality,multiplier:quality/100,plus:0,tuneLevel:0,ops,uniqueSkillId,obtainedFloor:floor,locked:false};};
  P.isGenerateGear=function(force={}){return this.owgGenerate({floor:this.isRun()?.floor||1,...force});};
  const oldItemHtml=P.isItemHtml; P.isItemHtml=function(x){let html=oldItemHtml.call(this,x);if(x?.otherWorldGear)html=html.replace(/<button data-is-merge="[^"]+">合体<\/button>/,'').replace(D.items[x.itemId]?.name||x.itemId,this.owgName(x));return html;};
  P.isOpenMerge=function(){alert('異世界装備の同名合体は廃止されました。帰還後に《異界の欠片》で調律できます。');};

  const oldReturn=P.isReturnRun; P.isReturnRun=function(){const r=this.isRun?.();if(!r)return oldReturn.call(this);normalize(this.profile);for(const x of r.lootBag){if(x.otherWorldGear)this.profile.otherWorldGear.push(copy(x));else this.profile.inventory[x.itemId]=(this.profile.inventory[x.itemId]||0)+(x.count||1);}const count=r.lootBag.length,floor=r.floor;this.profile.equipment=copy(r.homeEquipment||this.profile.equipment);this.profile.currentVitals=copy(r.homeVitals||this.profile.currentVitals);this.profile.infiniteScore={active:false,lastResult:'return',returnedCount:count,lastFloor:floor,endedAt:Date.now()};this.profile.flags.owRestoreJobPending=true;this.saveProfile();document.getElementById('is-modal')?.remove();this.showResult('RETURN SUCCESS',`${count}枠の戦利品を持ち帰った。`,'INFINITE SCORE // ESCAPED',`<div class="is-stairs"><b>FLOOR ${floor}から生還</b><p>異世界装備は《異世界装備庫》へ保管されました。</p></div>`);};

  P.owgEffects=function(){const out={};for(const x of this.owgEquipped())for(const o of x.ops||[])out[o.key]=(out[o.key]||0)+o.value;return out;};
  const oldEffect=P.equipmentEffectRate; P.equipmentEffectRate=function(type,...args){let value=oldEffect.call(this,type,...args);const fx=this.owgEffects();value+=Number(fx[type])||0;const set=this.activeSetEffects?.()||{};if(type==='physicalDamagePercent'||type==='magicDamagePercent')value+=(Number(set.allDamagePercent)||0)/100;return value;};
  const oldTotal=P.totalStats; P.totalStats=function(...args){const total=oldTotal.apply(this,args);if(this.isRun?.())return total;const fx=this.owgEffects();for(const k of ['str','vit','mag','mnd','agi','dex','luk','maxHp','maxMp','critBonus'])total[k]=(total[k]||0)+(fx[k]||0);total.def=total.vit;return total;};
  const oldCombat=P.equipmentCombatStats; P.equipmentCombatStats=function(...args){const out=oldCombat.apply(this,args);if(this.isRun?.())return out;for(const x of this.owgEquipped()){const d=this.owgDefinition(x),mult=(x.quality||100)/100*(1+(x.tuneLevel||0)*.08);for(const k of ['attackPower','defensePower','magicAttackPower','magicDefensePower'])out[k]=(out[k]||0)+Math.round((d[k]||0)*mult)+(x.ops||[]).filter(o=>o.key===k).reduce((n,o)=>n+o.value,0);}return out;};
  const oldWeapon=P.equippedWeapon; P.equippedWeapon=function(){if(!this.isRun?.()){const x=this.owgEntry(this.profile.otherWorldEquipment?.rightHand);if(x)return D.weapons[x.itemId]||oldWeapon.call(this);}return oldWeapon.call(this);};
  const oldSkills=P.availableSkills; P.availableSkills=function(){const list=oldSkills.call(this),skills=this.owgEquipped().map(x=>D.skills[x.uniqueSkillId]).filter(Boolean);return [...new Map([...list,...skills].map(x=>[x.id,x])).values()];};
  const oldSet=P.activeSetEffects; P.activeSetEffects=function(...args){const out={...oldSet.apply(this,args)},counts={},fx=this.owgEffects();for(const x of this.owgEquipped()){const id=D.items[x.itemId]?.otherWorldSeriesId;if(id)counts[id]=(counts[id]||0)+1;}const add=(k,v)=>out[k]=(out[k]||0)+v;add('damageReductionPercent',(fx.damageReductionPercent||0)*100);add('physicalRepeatChance',fx.repeatChance||0);add('magicRepeatChance',fx.repeatChance||0);for(const [id,n] of Object.entries(counts)){const stars=series.find(x=>x.id===id)?.stars||3;if(n>=2)for(const k of ['strPercent','vitPercent','magPercent','mndPercent','agiPercent','dexPercent','lukPercent'])add(k,{3:5,4:8,5:12,6:16}[stars]);if(n>=4){add('allDamagePercent',{3:8,4:12,5:18,6:25}[stars]);add('damageReductionPercent',{3:5,4:8,5:12,6:15}[stars]);}if(n>=6){add('physicalRepeatChance',{3:.07,4:.10,5:.12,6:.15}[stars]);add('magicRepeatChance',{3:.07,4:.10,5:.12,6:.15}[stars]);if(stars===4)add('freeMagicMpChance',.10);if(stars>=5)add('critBonusFlat',stars===5?.08:.12);if(stars===6)out.otherWorldLastStand=true;}}out.physicalRepeatChance=Math.min(.30,out.physicalRepeatChance||0);out.magicRepeatChance=Math.min(.30,out.magicRepeatChance||0);out.damageReductionPercent=Math.min(80,out.damageReductionPercent||0);return out;};
  const oldMpCost=P.skillMpCost;P.skillMpCost=function(skill){return Math.max(0,Math.ceil(oldMpCost.call(this,skill)*(1-Math.min(.75,this.owgEffects().mpCostDown||0))));};
  const oldCfg=P.isEffectiveCfg;P.isEffectiveCfg=function(){const c=oldCfg.call(this),fx=this.owgEffects();return {...c,gearDropRate:Math.min(.95,(c.gearDropRate||0)+(fx.gearDropUp||0)),rareEnemyRate:(c.rareEnemyRate||0)+(fx.rareEnemyUp||0),returnItemRate:Math.min(.15,(c.returnItemRate||0)+(fx.returnUp||0)),treasureRate:(c.treasureRate||0)+(fx.treasureUp||0),stairBaseRate:Math.min(95,(c.stairBaseRate||0)+(fx.stairUp||0)*100)};};
  const oldBagLimit=P.isBagLimit;P.isBagLimit=function(){return oldBagLimit.call(this)+(this.owgEffects().bagPlus||0);};

  P.owgTuneCost=function(x){const lv=x.tuneLevel||0,base={3:3,4:5,5:8,6:12}[x.stars],step={3:2,4:3,5:4,6:5}[x.stars];return {shard:base+lv*step,core:lv<5?0:{3:1,4:1,5:2,6:3}[x.stars]};};
  P.owgTuneRate=function(next){return next<=3?1:({4:.85,5:.70,6:.55,7:.42,8:.32,9:.24,10:.18}[next]??Math.max(.05,.18-(next-10)*.02));};
  P.owgTune=function(uid){const x=this.owgEntry(uid);if(!x)return;const c=this.owgTuneCost(x),next=(x.tuneLevel||0)+1,rate=this.owgTuneRate(next),inv=this.profile.inventory;if((inv.otherworldShard||0)<c.shard||(inv.otherworldCore||0)<c.core){alert('異界素材が足りません。');return;}if(!confirm(`${this.owgName(x)} +${x.tuneLevel||0} → +${next}\n欠片 ${c.shard}${c.core?` / 核 ${c.core}`:''}\n成功率 ${Math.round(rate*100)}%${next>=4?'（失敗時ロスト）':''}`))return;inv.otherworldShard-=c.shard;inv.otherworldCore-=c.core;if(Math.random()<rate){x.tuneLevel=next;x.plus=next;this.saveProfile();this.audio?.sfx?.('confirm');this.owgRenderVault(document.querySelector('#menu-panel'));return;}const backup=copy(x),i=this.profile.otherWorldGear.indexOf(x);if(i>=0)this.profile.otherWorldGear.splice(i,1);for(const s of Object.keys(this.profile.otherWorldEquipment))if(this.profile.otherWorldEquipment[s]===uid)delete this.profile.otherWorldEquipment[s];this.saveProfile();const restore=()=>{this.profile.otherWorldGear.push(backup);this.saveProfile();this.owgRenderVault(document.querySelector('#menu-panel'));};const shown=window.arseneQOffer?.show?.('protect',{title:'保護のアルカナ',copy:`${this.owgName(backup)} +${backup.tuneLevel||0}をロストから保護する。`,onGrant:restore,onClose:()=>this.owgRenderVault(document.querySelector('#menu-panel'))});if(!shown){alert('調律失敗。装備は無限奏廊へ消えた……');this.owgRenderVault(document.querySelector('#menu-panel'));}};
  P.owgEquip=function(uid){const x=this.owgEntry(uid),item=D.items[x?.itemId];if(!x||!item)return;this.profile.otherWorldEquipment[item.slot]=uid;this.saveProfile();this.owgRenderVault(document.querySelector('#menu-panel'));};
  P.owgTransfer=function(sourceUid){const src=this.owgEntry(sourceUid);if(!src?.ops?.length)return;const weapon=!!D.weapons[src.itemId],targets=this.profile.otherWorldGear.filter(x=>x.uid!==src.uid&&!!D.weapons[x.itemId]===weapon);if(!targets.length){alert('移植できる異世界装備がありません。');return;}const oi=Number(prompt(`移植するOP\n${src.ops.map((o,i)=>`${i+1}: ${D.otherWorldGearOps.find(d=>d.key===o.key)?.label||o.key} R${o.rank}`).join('\n')}`))-1,opv=src.ops[oi];if(!opv)return;const ti=Number(prompt(`移植先\n${targets.map((x,i)=>`${i+1}: ${this.owgName(x)} +${x.tuneLevel||0}`).join('\n')}`))-1,target=targets[ti];if(!target)return;const cost={shard:20+opv.rank*10,core:Math.max(1,opv.rank-2)},inv=this.profile.inventory;if((inv.otherworldShard||0)<cost.shard||(inv.otherworldCore||0)<cost.core){alert('移植素材が足りません。');return;}if(!confirm(`${this.owgName(src)}を消滅させ、OPを${this.owgName(target)}へ移植しますか？\n欠片 ${cost.shard} / 核 ${cost.core}`))return;inv.otherworldShard-=cost.shard;inv.otherworldCore-=cost.core;const same=target.ops.findIndex(o=>o.key===opv.key);if(same>=0)target.ops[same]=copy(opv);else if(target.ops.length<4)target.ops.push(copy(opv));else{const replace=clamp((Number(prompt(`上書きするOP 1～${target.ops.length}`))||1)-1,0,target.ops.length-1);target.ops[replace]=copy(opv);}this.profile.otherWorldGear.splice(this.profile.otherWorldGear.indexOf(src),1);for(const s of Object.keys(this.profile.otherWorldEquipment))if(this.profile.otherWorldEquipment[s]===src.uid)delete this.profile.otherWorldEquipment[s];this.saveProfile();this.owgRenderVault(document.querySelector('#menu-panel'));};
  P.owgRenderVault=function(panel){normalize(this.profile);const counts={};for(const x of this.owgEquipped()){const id=D.items[x.itemId]?.otherWorldSeriesId;if(id)counts[id]=(counts[id]||0)+1;}const rows=this.profile.otherWorldGear.map(x=>{const eq=Object.values(this.profile.otherWorldEquipment).includes(x.uid);return `<article class="owg-card stars-${x.stars}${eq?' equipped':''}"><header><small>${'★'.repeat(x.stars)} / 品質 ${x.quality}</small><b>${esc(this.owgName(x))}</b><em>+${x.tuneLevel||0}</em></header><p>${(x.ops||[]).map(o=>`${esc(D.otherWorldGearOps.find(d=>d.key===o.key)?.label||o.key)} +${o.value} R${o.rank}`).join(' / ')||'OPなし'}</p>${x.uniqueSkillId?`<strong>固有奏技《${esc(D.skills[x.uniqueSkillId]?.name)}》</strong>`:''}<footer><button data-owg-equip="${x.uid}">${eq?'装備中':'装備'}</button></footer></article>`;}).join('');panel.dataset.panel='otherworld-gear';panel.innerHTML=`<button class="panel-home" data-lenny="otherworld">異世界へ戻る</button><small>OTHER WORLD ARSENAL</small><h2>異世界装備庫</h2><div class="owg-res"><b>異界の欠片 ${(this.profile.inventory.otherworldShard||0)}</b><b>異界の核 ${(this.profile.inventory.otherworldCore||0)}</b></div><div class="owg-series">${series.map(s=>`<span style="--c:${s.color}">${s.name} ${counts[s.id]||0}/6</span>`).join('')}</div><p class="ow-rule">持ち帰った異世界装備の閲覧・装備変更専用。加工は無限奏廊で遭遇する《異世界工房》だけで行えます。</p><div class="owg-list">${rows||'<p class="item-empty">持ち帰った異世界装備はありません。</p>'}</div>`;};
  const oldPanel=P.renderMenuPanel;P.renderMenuPanel=function(name){if(name==='otherworld-gear'){this.owgRenderVault(document.querySelector('#menu-panel'));return;}return oldPanel.call(this,name);};
  const oldOw=P.renderOtherWorldPanel;P.renderOtherWorldPanel=function(panel){oldOw.call(this,panel);panel.querySelector('.ow-mode-guide')?.insertAdjacentHTML('beforebegin','<button class="ow-ability-link owg-vault-link" data-menu="otherworld-gear"><b>異世界装備庫</b><span>個体装備の閲覧・装備変更・共鳴セット</span></button>');};
  const oldApplyRewards=P.applyRewards;P.applyRewards=function(reward){const fx=this.owgEffects(),next={...reward,drops:{...(reward?.drops||{})}};if(next.exp)next.exp=Math.round(next.exp*(1+(fx.expUp||0)));if(next.gold)next.gold=Math.round(next.gold*(1+(fx.goldUp||0)));const bonus=Math.max(0,fx.materialDropUp||0);for(const [id,n] of Object.entries(next.drops))if(D.items[id]?.category==='material'){let extra=0;for(let i=0;i<n;i++)if(Math.random()<bonus)extra++;next.drops[id]+=extra;}return oldApplyRewards.call(this,next);};
  const oldJobExp=P.grantJobExp;P.grantJobExp=function(exp,...args){return oldJobExp.call(this,Math.round(exp*(1+(this.owgEffects().jobExpUp||0))),...args);};
  const oldWeaponExp=P.grantWeaponExp;P.grantWeaponExp=function(exp,...args){return oldWeaponExp.call(this,Math.round(exp*(1+(this.owgEffects().masteryExpUp||0))),...args);};
  const oldVictory=P.victory;P.victory=async function(...args){if(this.battleMode==='infiniteScore'&&this.isRun?.()?.floor>=25){const floor=this.isRun().floor,rate=floor>=150?.12:floor>=100?.08:floor>=50?.05:.02;if(this.isRand()<rate)this.isAddLoot({uid:this.isUid('core'),kind:'item',itemId:'otherworldCore',count:1});}return oldVictory.apply(this,args);};
  const oldDefeat=P.defeat;P.defeat=async function(...args){const set=this.activeSetEffects?.()||{};if(set.otherWorldLastStand&&this.player&&!this.player.owgLastStandUsed){this.player.owgLastStandUsed=true;this.player.hp=1;this.locked=false;this.finished=false;this.persistVitals?.();this.updateHUD?.();this.flashTitle?.('INFINITE RESONANCE','HP 1 // LAST STAND');this.setLog?.('無限共鳴が致死の一撃を拒絶した！');this.showMainCommands?.();return;}return oldDefeat.apply(this,args);};
  document.addEventListener('click',e=>{const g=window.arseneGame;if(!g)return;const equip=e.target.closest('[data-owg-equip]'),tune=e.target.closest('[data-owg-tune]'),transfer=e.target.closest('[data-owg-transfer]');if(equip){g.owgEquip(equip.dataset.owgEquip);return;}if(tune){g.owgTune(tune.dataset.owgTune);return;}if(transfer){g.owgTransfer(transfer.dataset.owgTransfer);}},true);
})();
