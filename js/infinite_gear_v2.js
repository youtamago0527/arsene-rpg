(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  const cfg = D.infiniteGearV2;
  const byPart = new Map(cfg.parts.map(part => [part.id,part]));
  const byOp = new Map(cfg.ops.map(op => [op.key,op]));
  const combatKeys = ['attackPower','defensePower','magicAttackPower','magicDefensePower'];
  const vitalKeys = ['maxHp','maxMp','str','vit','mag','mnd','agi','dex','luk'];
  const floorNumber = value => Math.max(1, clampInteger(value,Number.MAX_SAFE_INTEGER));
  const sample = random => Math.min(1-Number.EPSILON, Math.max(0, Number(random()) || 0));
  const between = ([min,max],random) => min + Math.floor(sample(random)*(max-min+1));
  const clampInteger = (value,max) => Math.floor(Math.max(0,Math.min(max,Number(value)||0)));
  const stat = value => clampInteger(value,cfg.limits.stat);
  const format = new Intl.NumberFormat('ja-JP');
  const isV2 = gear => gear?.gearVersion === 2;
  const tier = gear => cfg.tiers[gear?.tier-1];
  const level = gear => clampInteger(gear?.plus,Number.MAX_SAFE_INTEGER);
  const rate = (rateTotal,key) => rateTotal[key] || 0;

  function ratesAt(value) {
    const floor = floorNumber(value);
    const table = cfg.rarityRates;
    const bracket = table.findIndex(([upper]) => floor <= upper);
    if (bracket < 0) return [...table.at(-1)[1]];
    if (!bracket) return [...table[0][1]];
    const [low,a] = table[bracket-1], [high,b] = table[bracket];
    if (floor===high) return [...b];
    return a.map((value,i) => value + (b[i]-value)*(floor-low)/(high-low));
  }

  function weighted(weights,random) {
    let roll = sample(random) * weights.reduce((sum,value)=>sum+value,0);
    for (let i=0;i<weights.length;i++) {
      roll -= weights[i];
      if (roll < 0) return i;
    }
    for (let i=weights.length-1;i>=0;i--) if (weights[i]>0) return i;
    return -1;
  }

  function tail(random,{scale,shape}) {
    return Math.floor(scale * Math.expm1(-Math.log1p(-sample(random))/shape));
  }

  function rollOptions(rarity,floor,random) {
    const count = between(rarity.count,random), ops = [];
    const available = [...cfg.ops];
    for (let i=0;i<count;i++) {
      const weights = rarity.weights.map((weight,grade)=>available.some(op=>op.grade===grade) ? weight : 0);
      const grade = weighted(weights,random);
      const pool = available.filter(op=>op.grade===grade);
      if (!pool.length) throw new Error('Not enough unique OPs in Infinite gear grade tables');
      const pick = pool[Math.floor(sample(random)*pool.length)];
      available.splice(available.indexOf(pick),1);
      const value = rarity.values ? between(rarity.values,random)
        : clampInteger(floor*cfg.infinity.opMinimumPerFloor + tail(random,cfg.infinity.opTail),cfg.limits.optionPercent);
      ops.push({key:pick.key,grade:cfg.grades[grade],value});
    }
    return ops;
  }

  function rollBase(part,rarityIndex,floor,random) {
    return Object.fromEntries(Object.entries(part.base).map(([key,[table,weight]])=>{
      if (rarityIndex < 5) {
        const raw = between(cfg.ranges[table][rarityIndex],random);
        // Keep the factor in hundredths until the final division.
        return [key,stat(raw*weight*(100+(floor-1)*cfg.floorStepPercent)/100)];
      }
      const role = cfg.infinityTableScale[table] * weight;
      const minimum = 1 + (floor-1)*cfg.infinity.attackMinimumStep;
      const guaranteed = table === 'weapon' ? stat(minimum) : Math.max(1,stat(minimum*role));
      const bonus = tail(random,cfg.infinity.statTail) * role;
      return [key,stat(guaranteed+bonus)];
    }));
  }

  function generate({uid,floor:rawFloor=1,random,rarity:forced,part:requested}) {
    const floor = floorNumber(rawFloor);
    const index = forced === undefined ? weighted(ratesAt(floor),random)
      : typeof forced === 'string' ? cfg.tiers.findIndex(row=>row.id===forced) : forced-1;
    const rarity = cfg.tiers[index];
    const part = requested ? byPart.get(typeof requested==='string' ? requested : requested.id)
      : cfg.parts[Math.floor(sample(random)*cfg.parts.length)];
    if (!rarity || !part) throw new Error('Unknown Infinite gear rarity or item type');
    return {
      gearVersion:2, uid, itemId:'owg_v2_'+part.id, name:rarity.prefix+part.name, slot:part.slot,
      kind:'equipment', count:1, generated:true, otherWorldGear:true, rarity:rarity.id, tier:index+1,
      obtainedFloor:floor, baseStats:rollBase(part,index,floor,random), ops:rollOptions(rarity,floor,random),
      plus:0, locked:false
    };
  }

  function strengthened(gear, atLevel=level(gear)) {
    return Object.fromEntries(Object.entries(gear.baseStats || {}).map(([key,value]) => {
      const original = stat(value);
      const multiplier = Math.pow(cfg.enhancementMultiplier,atLevel);
      return [key,original ? stat(original*multiplier + 1e-7) : 0];
    }));
  }

  function optionRates(equipment) {
    const out = {};
    for (const gear of equipment) if (isV2(gear)) {
      for (const op of gear.ops || []) {
        if (!byOp.has(op.key)) continue;
        out[op.key] = rate(out,op.key) + clampInteger(op.value,cfg.limits.optionPercent)/100;
      }
    }
    return out;
  }

  function canMerge(target, source) {
    return isV2(target) && isV2(source) && target.uid!==source.uid &&
      target.itemId===source.itemId && target.name===source.name &&
      target.rarity===source.rarity && level(target)<Number.MAX_SAFE_INTEGER;
  }

  function canTransfer(source,target) {
    if (!isV2(source) || !isV2(target) || source.uid===target.uid || !source.ops?.length ||
        !target.ops?.length || target.ops.length>(tier(target)?.count[1] || 0)) return false;
    const a = D.items[source.itemId], b = D.items[target.itemId];
    if (!a?.gearFamily || !b?.gearFamily) return false;
    const rules=cfg.transfer;
    return (!rules.sameFamily || a.gearFamily===b.gearFamily) &&
      (rules.allowCrossRarity || source.rarity===target.rarity) &&
      (!rules.infinityOnlyWithInfinity || (source.rarity==='infinity')===(target.rarity==='infinity'));
  }

  function canReplace(source,target,sourceIndex,targetIndex) {
    const op=source?.ops?.[sourceIndex];
    return Number.isInteger(sourceIndex) && Number.isInteger(targetIndex) && sourceIndex>=0 && targetIndex>=0 &&
      canTransfer(source,target) && byOp.has(op?.key) && !!target.ops[targetIndex] &&
      !target.ops.some((existing,index)=>existing.key===op.key && index!==targetIndex);
  }

  function damage(value, rates, {basic,skill,enemy,critical,weak,turn,hp,maxHp,alive}) {
    const multiplier = rate(rates,'echoDamageRate') +
      (!basic ? rate(rates,'skillDamageRate') : 0) +
      (skill.element ? rate(rates,'elementDamageRate') : 0) +
      (enemy.kind==='boss' ? rate(rates,'bossDamageRate') : 0) +
      (critical ? rate(rates,'criticalDamageRate') : 0) + (weak ? rate(rates,'weakDamageRate') : 0) +
      (turn===1 ? rate(rates,'openingDamageRate') : 0) +
      (enemy.hp>0 && enemy.hp<=enemy.stats?.maxHp*.3 ? rate(rates,'executeDamageRate') : 0) +
      (hp>=maxHp*.9 ? rate(rates,'healthyDamageRate') : 0) + (alive>=2 ? rate(rates,'groupDamageRate') : 0);
    return Math.min(cfg.limits.stat,value*(1+multiplier));
  }

  for (const part of cfg.parts) {
    const id='owg_v2_'+part.id;
    const item={id,name:part.name,category:'equipment',slot:part.slot,otherWorldGear:true,gearFamily:part.family,
      description:'無限奏廊で手に入る個体装備。基礎能力とOPは入手時に確定します。'};
    D.items[id]=item;
    if (part.weaponType) D.weapons[id]={...item,weaponType:part.weaponType};
    else (D.armors ||= {})[id]=item;
  }
  for (const row of cfg.tiers) D.infiniteScore.rarity[row.id] = {
    ...D.infiniteScore.rarity[row.id], name:row.name, color:row.color
  };
  D.infiniteGear = {isV2,tier,level,ratesAt,generate,strengthened,optionRates,stat,damage,
    canMerge,canTransfer,canReplace,combatKeys,vitalKeys,
    number:value=>format.format(value),
    opText:op=>`${byOp.get(op.key)?.label||op.key} +${format.format(op.value)}%［${op.grade}］`
  };
})();
