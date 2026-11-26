const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');

class BattleGame {
  isRun() { return this.profile.infiniteScore?.active ? this.profile.infiniteScore : null; }
  isBagEntry(uid) { return this.isRun()?.lootBag.find(x => x.uid === uid); }
  isRand() { return .42; }
  totalStats(equipment = this.profile.equipment) {
    return { maxHp:100, maxMp:40, str:10, vit:20, mag:15, mnd:12, agi:9, dex:10, luk:10,
      ...(equipment?.head ? { vit:24 } : {}) };
  }
  equipmentCombatStats(equipment = this.profile.equipment) {
    return { attackPower:equipment?.rightHand ? 200 : 0, defensePower:0, magicAttackPower:0, magicDefensePower:0 };
  }
  equipmentDefinition(id) { return data.weapons[id] || data.armors[id]; }
  equipmentEffectRate() { return 0; }
  rewardExpMultiplier() { return 1.5; }
  rewardGoldMultiplier() { return 2; }
  applyRewards(reward) { this.creditedReward=reward; return []; }
  async beginPlayerTurn() {}
  activeSetEffects() { return {}; }
  skillMpCost(skill) { return skill.mp; }
  basicAttackSkill() { return { id:'attack' }; }
}
const data = { items:{}, weapons:{}, armors:{}, enemies:{}, skills:{} };
const context = { window:{ ARSENE_DATA:data, BattleGame },document:{addEventListener(){},querySelector(){return null;}},console:{error(){}} };
for (const file of ['infinite_score_data','infinite_gear_v2_data','infinite_gear_v2','otherworld_gear','infinite_gear_forge']) {
  runInNewContext(readFileSync('js/'+file+'.js','utf8'),context,{filename:file+'.js'});
}
const statModel = data.infiniteGear;
const cfg = data.infiniteGearV2;
const plain = value => JSON.parse(JSON.stringify(value));
const nonRepeatableOps = gear => gear.ops.filter(option=>!cfg.ops.find(op=>op.key===option.key)?.repeatable);
const roll = (rarity, part='sword', floor=1, random=()=>.42, uid='item') =>
  statModel.generate({ uid,floor,part,random,rarity });

test('drop rarity is interpolated; all six outcomes are reachable on floor 1', () => {
  for (const [floor,rates] of cfg.rarityRates) {
    assert.deepEqual(plain(statModel.ratesAt(floor)),plain(rates));
    assert(Math.abs(rates.reduce((a,b)=>a+b,0)-100)<1e-9);
  }
  let prior = 0;
  statModel.ratesAt(1).forEach((pct,i)=>{
    const draw=[(prior+pct/2)/100,0];
    assert.equal(roll(undefined,'sword',1,()=>draw.shift()??0).tier,i+1);
    prior+=pct;
  });
  for (const floor of [2,13,24,49,99,150,350,750]) {
    assert(Math.abs(statModel.ratesAt(floor).reduce((a,b)=>a+b,0)-100)<1e-9);
  }
  assert.equal(statModel.ratesAt(13)[0],65);
  assert.deepEqual(plain(statModel.ratesAt(999)),plain(statModel.ratesAt(500)));
});

test('base stats, independent option counts and values, and grade pools', () => {
  for (let tier=1;tier<=5;tier++) {
    const [min,max]=cfg.ranges.weapon[tier-1];
    assert.equal(roll(tier,'sword',1,()=>0).baseStats.attackPower,min);
    assert.equal(roll(tier,'sword',1,()=>.99999).baseStats.attackPower,max);
    assert.equal(roll(tier,'sword',50,()=>0).baseStats.attackPower,Math.floor(min*198/100));
    const rank=cfg.tiers[tier-1];
    for (const random of [()=>0,()=>.17,()=>.42,()=>.61,()=>.91,()=>.99999]) {
      const gear=roll(tier,'sword',100,random);
      assert.equal(gear.obtainedFloor,100);
      assert.equal(gear.name,rank.prefix+'魔剣');
      assert(gear.ops.length>=rank.count[0]&&gear.ops.length<=rank.count[1]);
      const unique=nonRepeatableOps(gear);
      assert.equal(new Set(unique.map(x=>x.key)).size,unique.length);
      for (const op of gear.ops) {
        const special = cfg.ops.find(definition=>definition.key===op.key && definition.values);
        if (special?.uncappedGrowth) assert(op.value>=special.values[0]);
        else if (special) assert(special.values.includes(op.value));
        else assert(op.value>=rank.values[0]&&op.value<=rank.values[1]);
        assert(rank.weights[cfg.grades.indexOf(op.grade)]>0);
      }
    }
  }
  const armor=roll(1,'body',1,()=>0);
  assert.equal(armor.baseStats.defensePower,25);
  assert(!Object.hasOwn(armor.baseStats,'attackPower'));
  assert.equal(roll(1,'accessory',1,()=>0).baseStats.maxHp,15);
  assert.equal(roll(1,'staff',1,()=>0).baseStats.magicAttackPower,83);
});

test('INFINITY guarantees, tail behavior, and format/stat safety', () => {
  for (const floor of [1,50,100,200,500,1000]) {
    const item=roll(6,'accessory',floor,()=>0);
    assert.equal(item.ops.length,6);
    assert.equal(roll(6,'sword',floor,()=>0).baseStats.attackPower,1+(floor-1)*20);
    for (const op of item.ops) {
      const definition = cfg.ops.find(definition=>definition.key===op.key);
      const fixed = definition.uncappedGrowth ? null : definition.values;
      assert.equal(op.value,fixed?.[0] ?? floor);
    }
    const unique=nonRepeatableOps(item);
    assert.equal(new Set(unique.map(op=>op.key)).size,unique.length);
  }
  const low=roll(6,'sword',1,()=>.5),high=roll(6,'sword',1,()=>.9999999);
  assert(high.baseStats.attackPower>low.baseStats.attackPower);
  assert(high.ops.every(op=>op.value>low.ops[0].value));
  const enhanced={...high,plus:1_000_000};
  assert(statModel.strengthened(enhanced).attackPower<=cfg.limits.stat);
  assert(!/Infinity|NaN/.test(statModel.opText(high.ops[0])));
  assert.equal(statModel.damage(1e99,{}, {skill:{},enemy:{},basic:true}),cfg.limits.stat);
});

test('recovery OPs roll once on eligible gear and use fractional values even on INFINITY', () => {
  const draws = threshold => [0, 0, threshold, .99];
  const draw = values => () => values.shift() ?? .5;
  const hpKey = 'lifeStealRate', mpKey = 'hitMpRecoveryRate';
  const weapon = roll(6,'sword',500,draw(draws(.009999)));
  const armor = roll(6,'body',500,()=>0);
  const get = (item,key) => item.ops.find(option=>option.key===key)?.value;
  assert.equal(get(weapon,hpKey),3);
  assert.equal(get(armor,mpKey),.25);
  assert.equal(get(roll(6,'sword',500,draw(draws(.01))),hpKey),undefined);
  assert.equal(get(roll(6,'body',500,draw([0,0,0,.0075])),mpKey),undefined);
  assert.equal(get(weapon,mpKey),undefined);
  assert.equal(get(armor,hpKey),undefined);
  assert.equal(get(roll(6,'shield',500,()=>0),mpKey),.25);
  assert.equal(get(roll(3,'sword',500,()=>0),hpKey),undefined);
  assert.equal(get(roll(6,'accessory',500,()=>0),mpKey),undefined);
  assert.equal(statModel.optionRates([armor])[mpKey],.0025);
  assert.equal(statModel.optionRates([{...armor,ops:[{key:hpKey,value:3}]}])[hpKey],undefined);
  assert.equal(statModel.optionRates([armor,armor,{...armor,ops:[{key:mpKey,value:100}]}])[mpKey],.02);
  assert(!cfg.ops.some(op=>op.key==='weakDamageRate'));
  assert.match(statModel.opText({key:'weakDamageRate',grade:'LEGEND',value:60}),/工房で上書き可/);
});

test('additional damage can exceed the final base hit, and recovery carries over fractions', () => {
  const sword = {...roll(6,'sword'),ops:[{key:'echoDamageRate',value:125},{key:'lifeStealRate',value:3},{key:'weakDamageRate',value:500}]};
  const armor = {...roll(6,'body',1,()=>.5,'armor'),ops:[{key:'hitMpRecoveryRate',value:.25}]};
  const game = gameWithGear(sword,armor);
  game.isRun().equipment={rightHand:sword.uid,body:armor.uid};
  game.player={hp:50,mp:20,stats:{maxHp:100,maxMp:40}};
  game.floating=()=>{};
  game.setLog=()=>{};
  const hit=game.owgAdjustDamage(200,{id:'attack'},{hp:500,stats:{maxHp:500}},false);
  assert.deepEqual(plain(hit),{value:450,additionalDamage:250});
  assert.equal(statModel.extraDamage(cfg.limits.stat-3,{echoDamageRate:20}),3);
  assert.equal(game.owgRestoreFromDamage('hp',30),0);
  assert.equal(game.owgRestoreFromDamage('hp',4),1);
  assert.equal(game.owgRestoreFromDamage('mp',200),0);
  assert.equal(game.owgRestoreFromDamage('mp',200),1);
  game.player.hp=0;
  assert.equal(game.owgRestoreFromDamage('mp',1_000),0);
});

test('tactical OPs appear only on their equipment families and keep the listed values', () => {
  const tactical = cfg.ops.filter(op=>op.values && !op.chance && !op.stats && op.table);
  assert.equal(tactical.length,10);
  let seed=57823;
  const random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/2**32);
  const rolled = new Set();
  for (const part of cfg.parts) {
    for (let i=0;i<120;i++) {
      const gear=roll(i%6+1,part.id,500,random);
      for (const option of gear.ops) {
        const definition=tactical.find(op=>op.key===option.key);
        if (!definition) continue;
        assert(Object.values(part.base).some(([table])=>table===definition.table));
        assert(definition.values.includes(option.value));
        rolled.add(option.key);
      }
    }
  }
  assert.equal(rolled.size,tactical.length);
});

test('paired and all-stat options roll on their assigned grades and eligible equipment', () => {
  const definitions=cfg.ops.filter(op=>op.stats);
  assert.equal(definitions.length,18);
  let seed=67924;
  const random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/2**32);
  const rolled=new Set();
  for (const part of cfg.parts) for (let i=0;i<120;i++) {
    const gear=roll(i%6+1,part.id,500,random);
    for (const option of gear.ops) {
      const definition=definitions.find(op=>op.key===option.key);
      if (!definition) continue;
      assert.equal(option.grade,cfg.grades[definition.grade]);
      assert(cfg.tiers[gear.tier-1].weights[definition.grade]>0);
      assert(definition.values.includes(option.value));
      if (definition.table) assert(Object.values(part.base).some(([table])=>definition.table===table));
      rolled.add(option.key);
    }
  }
  assert.equal(rolled.size,definitions.length);
});

test('all-stat and paired options stack additively and transfer as one OP', () => {
  const source=roll(5,'sword',80,()=>.5,'source');
  const target=roll(5,'sword',80,()=>.5,'target');
  const armor=roll(5,'body',80,()=>.5,'armor');
  const all={key:'allAbilities',grade:'MYTHIC',value:8};
  source.ops=[all,{key:'physAttackSpeed',grade:'EPIC',value:18},{key:'attackPowerRate',grade:'COMMON',value:20}];
  target.ops=[{key:'hpAttack',grade:'LEGEND',value:24}];
  const rates=statModel.optionRates([source]);
  for (const stat of [...statModel.vitalKeys,...statModel.combatKeys]) {
    const expected=stat==='attackPower'?.46:stat==='agi'?.26:.08;
    assert(Math.abs(rates[stat+'Rate']-expected)<1e-10);
  }
  assert.equal(statModel.applyStatRate(100,.16+.13),129);
  assert(statModel.canTransplant(source,target,0,0));
  assert(!statModel.canTransplant(source,armor,0,0));
  target.ops.push(all);
  assert(!statModel.canTransplant(source,target,0,0));
  const game=gameWithGear(source,target);
  game.isRun().equipment.rightHand=source.uid;
  assert.equal(game.equipmentCombatStats().attackPower,statModel.applyStatRate(source.baseStats.attackPower,.46));
  assert.equal(game.totalStats().maxHp,108);
  assert.match(statModel.opText(all),/全能の律.*8%.*最大HP・MP/);
  assert.match(statModel.opText(source.ops[1]),/物理攻撃力・素早さ/);
});

test('returned reward OPs require equipped gear and a normal battle, and add together', () => {
  const expKey='normalDungeonExpRate', goldKey='normalDungeonGoldRate';
  const make=(part,uid)=>({...roll(5,part,20,()=>.5,uid),ops:[{key:expKey,value:20,grade:'LEGEND'},{key:goldKey,value:25,grade:'EPIC'}]});
  const sword=make('sword','sword'), head=make('head','head'), ring=make('accessory','ring');
  const game=gameWithGear(sword);
  game.profile.infiniteScore.active=false;
  game.profile.otherWorldGear=[sword,head,ring];
  game.battleMode='slime';
  assert.equal(game.rewardExpMultiplier(),1.5);
  assert.equal(game.rewardGoldMultiplier(),2);
  game.profile.otherWorldEquipment={rightHand:'sword',head:'head',accessory:'ring'};
  assert(Math.abs(game.rewardExpMultiplier()-2.4)<1e-12);
  assert.equal(game.rewardGoldMultiplier(),3.5);
  for (const mode of ['infiniteScore','ow','owBoss','debugOverpower']) {
    game.battleMode=mode;
    assert.equal(game.rewardExpMultiplier(),1.5);
    assert.equal(game.rewardGoldMultiplier(),2);
  }
  game.battleMode='myrthi';
  assert.equal(game.rewardGoldMultiplier(),3.5);
  game.profile.infiniteScore.active=true;
  game.isRun().equipment={rightHand:sword.uid};
  assert.equal(game.rewardExpMultiplier(),1.5);
  assert.equal(game.rewardGoldMultiplier(),2);
  assert.equal(statModel.opText(sword.ops[0]),'EXP UP +20%［LEGEND］');
  assert.equal(statModel.opText(sword.ops[1]),'GOLD UP +25%［EPIC］');
});

test('reward OPs roll past their base ranges and can stack a 1,000% roll into all 42 slots', () => {
  const expKey='normalDungeonExpRate', goldKey='normalDungeonGoldRate';
  const parts=['sword','buckler','head','body','arms','feet','accessory'];
  const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-12);
  for (const [key,gradeDraw,normalTier] of [[expKey,.20,5],[goldKey,.025,3]]) {
    const draws=[0,0,0,...Array.from({length:6},()=>[gradeDraw,.99999,0]).flat()];
    const source=roll(6,'accessory',1000,()=>draws.shift()??.999,'source');
    assert.equal(source.ops.length,6);
    assert(source.ops.every(op=>op.key===key && op.value===1000));
    const extremeDraws=[0,0,0,gradeDraw,.99999,1];
    const extreme=roll(6,'accessory',1000,()=>extremeDraws.shift()??.5).ops[0];
    assert.equal(extreme.key,key);
    assert(extreme.value>cfg.limits.optionPercent);
    assert.equal(statModel.optionRates([{...source,ops:[extreme]}])[key],extreme.value/100);
    const normalDraws=[0,0,0,normalTier===5?.20:.99999,.99999,0,1];
    const normal=roll(normalTier,'accessory',1,()=>normalDraws.shift()??.5).ops[0];
    assert.equal(normal.key,key);
    assert(normal.value>cfg.limits.optionPercent);
    const target=roll(6,'accessory',1,()=>.5,'target');
    target.ops[0]={...source.ops[0]};
    assert(statModel.canTransplant(source,target,0,1),'repeatable OP may fill another slot');

    const equipment=parts.map(part=>({...roll(6,part,20,()=>.5,part),ops:source.ops}));
    assert.equal(new Set(equipment.map(gear=>gear.slot)).size,7);
    const game=gameWithGear(...equipment);
    game.profile.infiniteScore.active=false;
    game.profile.otherWorldGear=equipment;
    game.profile.otherWorldEquipment=Object.fromEntries(equipment.map(gear=>[gear.slot,gear.uid]));
    game.battleMode='slime';
    near(statModel.optionRates(equipment)[key],420);
    if (key===expKey) near(game.rewardExpMultiplier(),1.5*421);
    else near(game.rewardGoldMultiplier(),2*421);
  }
});

test('awarded battle totals can include legacy OP bonuses without applying them twice', () => {
  const game=gameWithGear();
  game.profile.infiniteScore.active=false;
  game.profile.otherWorldGear=[{uid:'old',itemId:'owg_boundary_sword',ops:[{key:'expUp',value:.1},{key:'goldUp',value:.2}]}];
  game.profile.otherWorldEquipment={rightHand:'old'};
  const awarded={exp:144,gold:142};
  game.applyRewards({exp:144,gold:142,drops:{}},awarded);
  assert.deepEqual(awarded,{exp:158,gold:170});
  assert.equal(game.creditedReward.exp,158);
  assert.equal(game.creditedReward.gold,170);
});

test('turn, guard, first-hit and three-hit procs stay scoped to their trigger', async () => {
  const sword = {...roll(6,'sword'),ops:[{key:'basicToSkillRate',value:25},{key:'weaponDefBreakRate',value:12}]};
  const armor = {...roll(6,'body',1,()=>.5,'body'),ops:[{key:'firstHitWardRate',value:20},{key:'guardMpRate',value:5},{key:'guardStrikeRate',value:20}]};
  const accessory = {...roll(6,'accessory',1,()=>.5,'ring'),ops:[{key:'turnHealRate',value:3},{key:'victoryHealRate',value:4}]};
  const game = gameWithGear(sword,armor,accessory);
  game.isRun().equipment={rightHand:sword.uid,body:armor.uid,accessory:accessory.uid};
  game.player={hp:50,mp:20,stats:{maxHp:100,maxMp:40},buffs:{}};
  game.floating=game.setLog=game.updateHUD=game.persistVitals=()=>{};
  game.turn=1;
  await game.beginPlayerTurn();
  assert.equal(game.player.hp,53);
  assert.equal(game.owgOpeningWard(0),0);
  assert.equal(game.owgOpeningWard(100),80);
  assert.equal(game.owgOpeningWard(100),100);
  game.owgOnGuardHit(80);
  assert.equal(game.player.mp,20);
  game.player.buffs.guardUntil=1;
  game.owgOnGuardHit(80);
  game.owgOnGuardHit(80);
  assert.equal(game.player.mp,22);
  const target={hp:100,stats:{maxHp:100}};
  for (let i=0;i<2;i++) game.owgAfterLandedHit(target,5,{id:'attack'});
  assert.equal(target.owgBreachUntil,undefined);
  game.owgAfterLandedHit(target,5,{id:'attack'});
  assert.equal(target.owgBreachUntil,2);
  assert.equal(target.owgBreachRate,.12);
  game.turn=2;
  assert.equal(game.owgAdjustDamage(100,{id:'spell'},target,false).value,145);
  assert.equal(game.owgAdjustDamage(100,{id:'attack'},target,false).value,120);
  game.turn=3;
  assert.equal(game.owgAdjustDamage(100,{id:'spell'},target,false).value,100);
});

function gameWithGear(...items) {
  const game=new BattleGame();
  game.profile={equipment:{rightHand:'normal-sword',head:'normal-hat'},otherWorldGear:[],otherWorldEquipment:{},
    infiniteScore:{active:true,gearVersion:2,floor:900,hp:50,mp:20,equipment:{},lootBag:items,log:[]}};
  game.saveProfile=()=>{ game.saves=(game.saves||0)+1;game.saved=JSON.stringify(game.profile); };
  return game;
}

test('confirmed same-name fusion is atomic; OPs, base rolls and original drop floor survive loading', async () => {
  const target=roll(2,'sword',50,()=>.42,'target');
  const source=roll(2,'sword',70,()=>.17,'source');
  const wrong=roll(1,'sword',1,()=>.42,'wrong-rarity');
  const renamed={...source,name:'別名'};
  assert(!statModel.canMerge(target,renamed));
  const game=gameWithGear(target,source,wrong);
  game.isRun().equipment.rightHand=source.uid;
  source.locked=true;
  let confirmation='';
  game.isConfirm=async (_, text)=>{confirmation=text;return false;};
  assert(!await game.isForgeMerge(target.uid,source.uid));
  assert.match(confirmation,/装備中/);
  assert.match(confirmation,/ロック中/);
  assert.match(confirmation,/完全に消滅/);
  assert.equal(game.isRun().lootBag.length,3);
  assert.equal(game.saves,undefined);
  game.isConfirm=async ()=>true;
  assert(!await game.isForgeMerge(target.uid,wrong.uid));
  assert(await game.isForgeMerge(target.uid,source.uid));
  const upgraded=game.isBagEntry(target.uid);
  assert.equal(game.saves,1);
  assert.equal(upgraded.plus,1);
  assert(!game.isBagEntry(source.uid));
  assert(!game.isRun().equipment.rightHand);
  assert.deepEqual(plain(upgraded.ops),plain(target.ops));
  assert.deepEqual(plain(upgraded.baseStats),plain(target.baseStats));
  game.profile=JSON.parse(game.saved);
  assert.equal(game.isBagEntry(target.uid).obtainedFloor,50);
  assert.deepEqual(game.isBagEntry(target.uid),plain(upgraded));
  assert.equal(game.owgEffectiveStats(game.isBagEntry(target.uid)).attackPower.total,Math.floor(target.baseStats.attackPower*1.2+1e-7));
});

test('transplant preserves grade and value and rolls back if saving fails', async () => {
  const a=roll(5,'sword',1,()=>.42,'source');
  const b=roll(2,'sword',1,()=>.42,'target');
  const c=roll(6,'sword',1,()=>.42,'infinity');
  const d=roll(5,'shield',1,()=>.42,'shield');
  const op={key:'skillDamageRate',grade:'EPIC',value:79};
  a.ops=[op];
  b.ops=[{key:'maxHpRate',grade:'COMMON',value:18},{...op,value:20}];
  assert(!statModel.canTransfer(a,c));
  assert(!statModel.canTransfer(d,b));
  assert(!statModel.canTransplant(a,b,0,0),'an OP cannot be duplicated in another slot');
  assert(statModel.canTransplant(a,b,0,1));
  const game=gameWithGear(a,b,c,d);
  game.isConfirm=async ()=>true;
  const save=game.saveProfile;
  game.saveProfile=()=>{throw new Error('storage unavailable');};
  assert(!await game.isForgeTransfer(a.uid,b.uid,0,1));
  assert.equal(game.isBagEntry(b.uid).ops[1].value,20);
  assert(game.isBagEntry(a.uid));
  game.saveProfile=save;
  assert(await game.isForgeTransfer(a.uid,b.uid,0,1));
  assert.equal(game.saves,1);
  assert.equal(game.isBagEntry(a.uid),undefined);
  assert.equal(game.isBagEntry(b.uid).ops.length,2);
  assert.deepEqual(plain(game.isBagEntry(b.uid).ops[1]),op);
});

test('transplant adds to an empty slot without overwriting or exceeding the rarity limit', async () => {
  const source=roll(5,'sword',1,()=>.42,'donor');
  const target=roll(2,'sword',1,()=>.42,'recipient');
  const moved={key:'skillDamageRate',grade:'EPIC',value:79};
  const original={key:'maxHpRate',grade:'COMMON',value:18};
  source.ops=[moved];
  target.ops=[original];
  assert(statModel.canTransplant(source,target,0,1));
  assert(!statModel.canTransplant(source,target,0,2),'cannot skip the next empty slot');
  assert(statModel.canTransplant(source,{...target,ops:[]},0,0),'an item with zero OPs is eligible');
  assert(!statModel.canTransplant(source,{...target,ops:[moved]},0,1),'unique OPs cannot be duplicated into an empty slot');
  assert(!statModel.canTransplant(source,{...target,ops:[original,{key:'maxMpRate',grade:'COMMON',value:9}]},0,2),'a full item cannot gain an extra OP');
  const reward={key:'normalDungeonGoldRate',grade:'MYTHIC',value:1000};
  assert(statModel.canTransplant({...source,ops:[reward]},{...target,ops:[reward]},0,1),'repeatable OPs can use a free slot');

  const game=gameWithGear(source,target);
  game.isConfirm=async (title,message)=>{
    assert.match(title,/空き枠/);
    assert.match(message,/完全に消滅/);
    assert.match(message,/空き枠 → /);
    return false;
  };
  assert(!await game.isForgeTransfer(source.uid,target.uid,0,1));
  assert(game.isBagEntry(source.uid));
  assert.deepEqual(game.isBagEntry(target.uid).ops,[original]);

  game.isConfirm=async ()=>true;
  assert(await game.isForgeTransfer(source.uid,target.uid,0,1));
  assert.equal(game.saves,1);
  assert.equal(game.isBagEntry(source.uid),undefined);
  assert.deepEqual(plain(game.isBagEntry(target.uid).ops),[original,moved]);
  game.profile=JSON.parse(game.saved);
  assert.deepEqual(game.isBagEntry(target.uid).ops,[original,moved]);
});

test('V2 affects only equipped bonuses; legacy individuals remain usable and ordinary gear is untouched', () => {
  const newSword=roll(1,'sword',1,()=>0,'new');
  const oldSword={uid:'old',itemId:'owg_boundary_sword',otherWorldGear:true,quality:110,tuneLevel:2,ops:[{key:'attackPower',value:7,rank:1}]};
  newSword.ops=[{key:'attackPowerRate',grade:'COMMON',value:10},{key:'maxHpRate',grade:'COMMON',value:10}];
  const game=gameWithGear(newSword,oldSword);
  assert(!statModel.canMerge(newSword,oldSword));
  assert.equal(game.owgEffectiveStats(oldSword).attackPower.total,
    Math.round(data.weapons[oldSword.itemId].attackPower*1.10*1.16)+7);
  game.isRun().equipment.rightHand=newSword.uid;
  assert.equal(game.equipmentCombatStats().attackPower,88);
  assert.equal(game.totalStats().maxHp,110);
  game.profile.infiniteScore.active=false;
  assert.equal(game.equipmentCombatStats().attackPower,200);
  assert.equal(game.totalStats().maxHp,100);
  assert.equal(game.owgAdjustDamage(200,{id:'skill'},{kind:'boss'},true),null);
});

test('rare enemy gear skews OP count, grade and value toward stronger results', () => {
  const totals=[false,true].map(rareDrop=>{
    const sums={count:0,grade:0,value:0,variableCount:0};
    for(let i=1;i<=700;i++){
      let seed=i;
      const random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/2**32);
      const item=statModel.generate({uid:'test',rarity:4,part:'sword',floor:45,random,rareDrop});
      sums.count+=item.ops.length;
      for(const op of item.ops){
        sums.grade+=cfg.grades.indexOf(op.grade);
        const definition=cfg.ops.find(candidate=>candidate.key===op.key);
        if(!definition.values){sums.value+=op.value;sums.variableCount++;}
      }
    }
    return [sums.count,sums.grade/sums.count,sums.value/sums.variableCount];
  });
  for(let i=0;i<3;i++)assert(totals[1][i]>totals[0][i]);
});
