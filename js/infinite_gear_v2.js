(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  const cfg = D.infiniteGearV2;
  const byPart = new Map(cfg.parts.map(part => [part.id,part]));
  const byItem = new Map(cfg.parts.map(part => ['owg_v2_'+part.id,part]));
  const byOp = new Map(cfg.ops.map(op => [op.key,op]));
  const rareOptions = cfg.ops.filter(op => op.chance);
  const statCombinations = cfg.ops.filter(op => op.stats);
  const combatKeys = cfg.equipmentPower;
  const vitalKeys = ['maxHp','maxMp',...cfg.baseAttributes];
  const floorNumber = value => Math.max(1, clampInteger(value,Number.MAX_SAFE_INTEGER));
  const sample = random => Math.min(1-Number.EPSILON, Math.max(0, Number(random()) || 0));
  const between = ([min,max],random) => min + Math.floor(sample(random)*(max-min+1));
  const clampInteger = (value,max) => Math.floor(Math.max(0,Math.min(max,Number(value)||0)));
  const stat = value => clampInteger(value,cfg.limits.stat);
  const applyStatRate = (value,rate) => stat(value*(100+Math.round((rate||0)*100))/100);
  const format = new Intl.NumberFormat('ja-JP');
  const isV2 = gear => gear?.gearVersion === 2;
  const tier = gear => cfg.tiers[gear?.tier-1];
  const level = gear => clampInteger(gear?.plus,Number.MAX_SAFE_INTEGER);
  const rate = (rateTotal,key) => rateTotal[key] || 0;
  const allowedOn = (op,part) => !op.table || !!part && Object.values(part.base).some(([table])=>table===op.table);

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

  function rollOption(op,rarity,floor,random) {
    if (op.uncappedGrowth) {
      const base = rarity.values ? op.values[Math.floor(sample(random)*op.values.length)]
        : floor*cfg.infinity.opMinimumPerFloor;
      return {key:op.key,grade:cfg.grades[op.grade],value:base+tail(random,cfg.infinity.opTail)};
    }
    const value = op.values ? op.values[Math.floor(sample(random)*op.values.length)]
      : rarity.values ? between(rarity.values,random)
        : clampInteger(floor*cfg.infinity.opMinimumPerFloor + tail(random,cfg.infinity.opTail),cfg.limits.optionPercent);
    return {key:op.key,grade:cfg.grades[op.grade],value};
  }

  function pickOption(pool,grade,random) {
    const combinations = pool.filter(op=>op.stats).length;
    if (!combinations || combinations===pool.length) return pool[Math.floor(sample(random)*pool.length)];
    const share = cfg.combinationShare[grade];
    const weights = pool.map(op=>op.stats ? share/combinations : (1-share)/(pool.length-combinations));
    return pool[weighted(weights,random)];
  }

  function rollOptions(rarity,part,floor,random) {
    const count = between(rarity.count,random), ops = [];
    // These odds apply once per eligible item, including when the ordinary grade pool runs out.
    const special = rareOptions.find(op=>rarity.weights[op.grade] && allowedOn(op,part) && sample(random)<op.chance);
    if (special) ops.push(rollOption(special,rarity,floor,random));
    const available = cfg.ops.filter(op=>!op.chance && allowedOn(op,part));
    for (let i=ops.length;i<count;i++) {
      const weights = rarity.weights.map((weight,grade)=>available.some(op=>op.grade===grade) ? weight : 0);
      const grade = weighted(weights,random);
      const pool = available.filter(op=>op.grade===grade);
      if (!pool.length) throw new Error('Not enough eligible OPs in Infinite gear grade tables');
      const pick = pickOption(pool,grade,random);
      if (!pick.repeatable) available.splice(available.indexOf(pick),1);
      ops.push(rollOption(pick,rarity,floor,random));
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
      obtainedFloor:floor, baseStats:rollBase(part,index,floor,random), ops:rollOptions(rarity,part,floor,random),
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
        const definition = byOp.get(op.key);
        if (!definition || !allowedOn(definition,byItem.get(gear.itemId))) continue;
        if (definition.uncappedGrowth) {
          const value = Number(op.value);
          if (Number.isFinite(value) && value>0) out[op.key] = rate(out,op.key)+Math.floor(value)/100;
          continue;
        }
        const cap = definition.totalCapPercent;
        out[op.key] = cap === undefined
          ? rate(out,op.key) + clampInteger(op.value,cfg.limits.optionPercent)/100
          : Math.min(cap/100,rate(out,op.key) + Math.max(0,Number(op.value)||0)/100);
      }
    }
    for (const {key,stats} of statCombinations) {
      const bonus = out[key];
      if (!bonus) continue;
      for (const statKey of stats) {
        const rateKey=statKey+'Rate';
        out[rateKey] = rate(out,rateKey)+bonus;
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
    const definition=byOp.get(op?.key);
    return Number.isInteger(sourceIndex) && Number.isInteger(targetIndex) && sourceIndex>=0 && targetIndex>=0 &&
      canTransfer(source,target) && definition && allowedOn(definition,byItem.get(source.itemId)) &&
      allowedOn(definition,byItem.get(target.itemId)) && !!target.ops[targetIndex] &&
      (definition.repeatable || !target.ops.some((existing,index)=>existing.key===op.key && index!==targetIndex));
  }

  function damage(value, rates, {basic,skill,enemy,critical,turn,hp,maxHp,alive,previousBasicHit,previousGuardHit}) {
    const multiplier =
      (!basic ? rate(rates,'skillDamageRate') : 0) +
      (skill.element ? rate(rates,'elementDamageRate') : 0) +
      (enemy.kind==='boss' ? rate(rates,'bossDamageRate') : 0) +
      (critical ? rate(rates,'criticalDamageRate') : 0) +
      (turn===1 ? rate(rates,'openingDamageRate') : 0) +
      (enemy.hp>0 && enemy.hp<=enemy.stats?.maxHp*.3 ? rate(rates,'executeDamageRate') : 0) +
      (hp>=maxHp*.9 ? rate(rates,'healthyDamageRate') : 0) + (alive>=2 ? rate(rates,'groupDamageRate') : 0) +
      (!basic && previousBasicHit ? rate(rates,'basicToSkillRate') : 0) +
      (previousGuardHit ? rate(rates,'guardStrikeRate') : 0);
    return Math.min(cfg.limits.stat,value*(1+multiplier));
  }

  function extraDamage(base,rates) {
    return Math.min(cfg.limits.stat-base,Math.floor(base*rate(rates,'echoDamageRate')+1e-8));
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
  function opText(op) {
    if (op.key==='weakDamageRate') return '廃止OP（工房で上書き可）';
    const definition = byOp.get(op.key);
    const stats = definition?.summary || definition?.stats?.map(key=>byOp.get(key+'Rate').label).join('・');
    return `${definition?.label||op.key} +${format.format(op.value)}%［${op.grade}］${stats?`（${stats}）`:''}`;
  }
  D.infiniteGear = {isV2,tier,level,ratesAt,generate,strengthened,optionRates,stat,applyStatRate,damage,extraDamage,
    canMerge,canTransfer,canReplace,combatKeys,vitalKeys,
    number:value=>format.format(value),opText
  };
})();
