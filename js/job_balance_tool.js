(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  if (!D) return;

  const SUPPORTED_PASSIVES = new Set([
    'statPercent', 'multiStatPercent', 'criticalUp', 'magicDamageUp', 'elementDamageUp',
    'lowHpPhysicalUp', 'magicResist', 'goldUp', 'turnStartBuff', 'mpRegen', 'healUp',
    'skillMpDiscount', 'damageMpRecover', 'heavyHitRegenerate', 'dualWield', 'comboDance', 'offHandCritical', 'comboMaxBoost',
    'evadeCounter', 'evadeHeal', 'evadeNextDamage', 'ownDotDuration',
    'debuffedTargetAccuracy', 'debuffedTargetCritical', 'weakHealHp',
    'weakActionDamage', 'weakRecoverMp', 'hpCostDamageUp', 'damageHeal', 'defensePierce'
  ]);
  const WEAPON_BY_JOB = {
    warrior: 'sword', mage: 'staff', martialArtist: 'martial', priest: 'staff',
    magicKnight: 'instrument', guardian: 'shield', dualBlade: 'martial', phantomThief: 'sword',
    ronin: 'sword', hunter: 'bow', runeLancer: 'spear', darkKnight: 'greatsword'
  };
  const ROLE_ARMOR = {
    warrior: { def: 68, mdef: 42 }, mage: { def: 36, mdef: 70 }, martialArtist: { def: 42, mdef: 42 },
    priest: { def: 48, mdef: 72 }, magicKnight: { def: 50, mdef: 58 }, guardian: { def: 88, mdef: 76 },
    dualBlade: { def: 44, mdef: 42 }, phantomThief: { def: 56, mdef: 56 },
    ronin: { def: 52, mdef: 44 }, hunter: { def: 45, mdef: 48 },
    runeLancer: { def: 62, mdef: 65 }, darkKnight: { def: 72, mdef: 48 }
  };
  const COMMON_ARMOR = { def: 50, mdef: 50 };
  const D3_BUILD_LOADOUTS = {
    warrior: ['d3WarriorBlade','fortressHelm','fortressCoat','fortressGloves','fortressBoots','fortressCharm'],
    mage: ['d3MageStaff','voidweaveHood','voidweaveRobe','voidweaveGloves','voidweaveBoots','voidweaveCharm'],
    martialArtist: ['d3MartialClaw','riftBand','riftVest','riftGuards','riftBoots','riftCharm'],
    priest: ['d3PriestStaff','voidweaveHood','voidweaveRobe','voidweaveGloves','voidweaveBoots','voidweaveCharm'],
    magicKnight: ['d3MaestroInstrument','voidweaveHood','voidweaveRobe','voidweaveGloves','voidweaveBoots','voidweaveCharm'],
    guardian: ['d3GuardianAegis','fortressHelm','fortressCoat','fortressGloves','fortressBoots','fortressCharm'],
    dualBlade: ['d3TwinRight','d3TwinLeft','riftBand','riftVest','riftGuards','riftBoots','riftCharm']
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const avg = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const percentile = (values, p) => { const a = [...values].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor((a.length - 1) * p))] || 0; };
  const rngFrom = seed => { let s = (Number(seed) || 1) >>> 0; return () => ((s = Math.imul(1664525, s) + 1013904223 >>> 0) / 4294967296); };

  function activeJobIds() {
    const audited = window.ARSENE_JOB_AUDIT?.activeJobIds?.() || Object.keys(D.jobs || {});
    return [...new Set([...audited, ...(D.futureJobIds || [])])].filter(id => D.jobs?.[id]);
  }

  function jobGrowth(id) {
    const out = {};
    const core = D.growthBalance?.jobGrowthPerLevel?.[id];
    if (core) for (const [key, value] of Object.entries(core)) out[key] = (out[key] || 0) + value * 19;
    else for (const [level, row] of Object.entries(D.jobs?.[id]?.growth || {})) {
      if (+level > 20) continue;
      for (const [key, value] of Object.entries(row || {})) out[key] = (out[key] || 0) + (Number(value) || 0);
    }
    return out;
  }

  function passiveList(id) {
    return Object.entries(D.jobs?.[id]?.passiveUnlocks || {}).filter(([level]) => +level <= 20)
      .map(([, skillId]) => D.skills?.[skillId]).filter(Boolean);
  }

  function equipmentDef(itemId) { return D.weapons?.[itemId] || D.armors?.[itemId] || D.accessories?.[itemId] || {}; }
  function d3Build(id) {
    const ids = D3_BUILD_LOADOUTS[id] || [], out = { atk: 0, matk: 0, def: 0, mdef: 0, bonuses: {}, effects: {} };
    for (const itemId of ids) {
      const item = equipmentDef(itemId);
      out.atk += item.attackPower || 0; out.matk += item.magicAttackPower || 0;
      out.def += item.defensePower || 0; out.mdef += item.magicDefensePower || 0;
      for (const [key, value] of Object.entries(item.bonuses || {})) out.bonuses[key] = (out.bonuses[key] || 0) + value;
      for (const [key, value] of Object.entries(item.effects || {})) out.effects[key] = (out.effects[key] || 0) + value;
    }
    return out;
  }

  function baseStats(id, armorMode = 'job') {
    const base = { ...(D.player?.baseStats || {}) };
    const growth = id === 'phantomThief'
      ? activeJobIds().filter(x => x !== 'phantomThief').reduce((sum, source) => {
          for (const [key, value] of Object.entries(jobGrowth(source))) sum[key] = (sum[key] || 0) + value * .5;
          return sum;
        }, {})
      : jobGrowth(id);
    for (const [key, value] of Object.entries(growth)) base[key] = (base[key] || 0) + value;
    if (armorMode === 'd3build') for (const [key, value] of Object.entries(d3Build(id).bonuses)) base[key] = (base[key] || 0) + value;
    const equipmentPenalty = D.jobs?.[id]?.traits?.equipmentAgiPenalty;
    if (equipmentPenalty) {
      const armorSlots = armorMode === 'd3build'
        ? (D3_BUILD_LOADOUTS[id] || []).filter(itemId => !D.weapons?.[itemId]).length
        : 5;
      const hasWeapon = armorMode !== 'none';
      const pct = Math.min(equipmentPenalty.maxPercent ?? 100,
        (hasWeapon ? (equipmentPenalty.weaponPercent || 0) : 0) + armorSlots * (equipmentPenalty.armorPerSlotPercent || 0));
      base.agi = Math.max(1, Math.floor((base.agi || 0) * (1 - pct / 100)));
    }
    for (const passive of passiveList(id)) {
      const e = passive.passiveEffect || {};
      if (e.type === 'statPercent') base[e.stat] = (base[e.stat] || 0) * (1 + (e.rate || 0));
      if (e.type === 'multiStatPercent') for (const [key, rate] of Object.entries(e.stats || {})) base[key] = (base[key] || 0) * (1 + rate);
    }
    return base;
  }

  function skillPool(id, weaponType) {
    const weaponSubtype = D.jobs?.[id]?.weaponSubtype || null;
    const basicId = (weaponSubtype && D.basicAttackByWeaponSubtype?.[weaponSubtype]) || D.basicAttackByWeaponType?.[weaponType] || 'attack';
    const ids = new Set([basicId]);
    for (const skill of Object.values(D.skills || {})) {
      if (skill.source !== 'weapon' || skill.weaponType !== weaponType || skill.type === 'PASSIVE') continue;
      // 刀は剣学を共有するが、浪士の検証では刀Spark Familyだけを使用する。
      if (weaponSubtype && skill.weaponSubtype !== weaponSubtype) continue;
      // 通常JOBが将来予約の刀技を先取りしないようにする。
      if (!weaponSubtype && skill.weaponSubtype) continue;
      if (skill.devOnly && !(D.futureJobIds || []).includes(id)) continue;
      ids.add(skill.id);
    }
    const job = D.jobs?.[id] || {};
    for (const skillId of Object.values(job.skillUnlocks || {})) ids.add(skillId);
    // 旧JOBにはskillUnlocksが未接続のものがある。実在するLv20以下のJOB技を
    // データから自動収集し、接続漏れだけでランキングが下がらないようにする。
    for (const skill of Object.values(D.skills || {})) {
      if (skill.jobId === id && skill.type !== 'PASSIVE' && (skill.unlockJobLevel || 1) <= 20) ids.add(skill.id);
    }
    // RESONANCE BREAK は被弾で溜めた共鳴を消費する技。毎ACTION無料で撃てる
    // 通常技として候補へ入れると守護士の火力を過大評価するため、専用ローテ側で扱う。
    if (job.signatureSkillId && job.signatureSkillId !== 'resonanceBreak') ids.add(job.signatureSkillId);
    return [...ids].map(skillId => D.skills?.[skillId]).filter(skill => skill && skill.type !== 'PASSIVE' && skill.target !== 'self' && skill.kind !== 'support' && (skill.power || skill.hits || skill.hitPowersDual || skill.damageType));
  }

  function d3Samples() {
    const dungeon = (D.dungeons || []).find(x => x.id === 'dungeon3');
    const samples = [];
    for (const floor of dungeon?.floors || []) {
      const stages = floor.encounterProgression || [];
      for (let win = 0; win < (floor.winsToClear || 1); win++) {
        const stage = [...stages].filter(x => win >= (x.minWins || 0)).pop() || stages[0];
        if (!stage) continue;
        const count = Math.round(((stage.count?.[0] || 1) + (stage.count?.[1] || 1)) / 2);
        for (const entry of stage.pool || []) {
          const enemy = D.enemies?.[entry.id]; if (!enemy) continue;
          const scale = floor.enemyScale || {}, weight = (entry.weight || 1) * count;
          samples.push({
            id: enemy.id, name: enemy.name, weight,
            kind: enemy.kind || 'normal', infiniteHp: !!enemy.infiniteHp,
            instantDeathImmune: !!enemy.instantDeathImmune, cannotDefeat: !!enemy.cannotDefeat,
            hp: (enemy.stats?.maxHp || 1) * (scale.hp || 1), def: (enemy.stats?.def || 0) * (scale.def || 1),
            mnd: (enemy.stats?.mnd || 0) * (scale.mnd || 1), atk: (enemy.stats?.atk || 0) * (scale.atk || 1),
            mag: (enemy.stats?.mag || 0) * (scale.mag || 1), agi: (enemy.stats?.agi ?? enemy.stats?.spd ?? 0) * (scale.spd || 1),
            dex: (enemy.stats?.dex ?? enemy.stats?.spd ?? 0) * (scale.spd || 1),
            weaknesses: [...(enemy.weaknesses || [])], resistances: [...(enemy.resistances || [])],
            gold: (((enemy.gold?.min || 0) + (enemy.gold?.max || 0)) / 2) * (scale.rewards || 1), count
          });
        }
      }
    }
    return samples;
  }

  function weightedPick(samples, rng) {
    const total = samples.reduce((n, x) => n + x.weight, 0); let roll = rng() * total;
    for (const sample of samples) { roll -= sample.weight; if (roll <= 0) return sample; }
    return samples[samples.length - 1];
  }

  function unsupportedPassives(id) {
    return passiveList(id).filter(p => !SUPPORTED_PASSIVES.has(p.passiveEffect?.type)).map(p => p.name || p.id);
  }

  function modifiers(id, armorMode = 'job') {
    const out = {
      crit: 0, magic: 0, element: 0, lowHpPhysical: 0, magicResist: 0, gold: 0,
      evasionAgiRate: 0, evadeCounter: 0, evadeCounterPower: 1, evadeHealMaxHp: 0,
      evadeNextDamage: 0, dotDamage: 0, dotDuration: 0, debuffedAccuracy: 0,
      debuffedCritical: 0, weakHealMaxHp: 0, weakActionDamage: 0,
      weakRecoverMp: 0, hpCostPower: 0, hpCostDamage: 0, damageHeal: 0, defensePierce: 0,
      mpRegen: 0, damageMpRecover: 0, heavyHitRegenerate: null, healUp: 0
    };
    for (const trait of Object.values(D.jobs?.[id]?.traits || {})) {
      if (trait.type === 'agiEvasionEfficiency') out.evasionAgiRate += trait.rate || 0;
      if (trait.type === 'ownDotDamageUp') out.dotDamage += trait.rate || 0;
      if (trait.type === 'hpCostPower') out.hpCostPower += trait.rate || 0;
    }
    for (const passive of passiveList(id)) {
      const e = passive.passiveEffect || {};
      if (e.type === 'criticalUp') out.crit += e.rate || 0;
      if (e.type === 'magicDamageUp') out.magic += e.rate || 0;
      if (e.type === 'elementDamageUp') out.element += e.rate || 0;
      if (e.type === 'lowHpPhysicalUp') out.lowHpPhysical += (e.rate || 0) * .5;
      if (e.type === 'magicResist') out.magicResist += e.rate || 0;
      if (e.type === 'goldUp') out.gold += e.rate || 0;
      if (e.type === 'mpRegen') out.mpRegen += e.rate || 0;
      if (e.type === 'damageMpRecover') out.damageMpRecover += e.rate || 0;
      if (e.type === 'heavyHitRegenerate') out.heavyHitRegenerate = { ...e };
      if (e.type === 'healUp') out.healUp += e.rate || 0;
      if (e.type === 'evadeCounter') { out.evadeCounter += e.rate || 0; out.evadeCounterPower = Math.max(out.evadeCounterPower, e.power || 1); }
      if (e.type === 'evadeHeal') out.evadeHealMaxHp += e.maxHpRate || 0;
      if (e.type === 'evadeNextDamage') out.evadeNextDamage += e.rate || 0;
      if (e.type === 'ownDotDuration') out.dotDuration += e.turns || 0;
      if (e.type === 'debuffedTargetAccuracy') out.debuffedAccuracy += e.rate || 0;
      if (e.type === 'debuffedTargetCritical') out.debuffedCritical += e.rate || 0;
      if (e.type === 'weakHealHp') out.weakHealMaxHp += e.maxHpRate || 0;
      if (e.type === 'weakActionDamage') out.weakActionDamage += e.rate || 0;
      if (e.type === 'weakRecoverMp') out.weakRecoverMp += e.maxMpRate || 0;
      if (e.type === 'hpCostDamageUp') out.hpCostDamage += e.rate || 0;
      if (e.type === 'damageHeal') out.damageHeal += e.rate || 0;
      if (e.type === 'defensePierce') out.defensePierce += e.rate || 0;
    }
    if (armorMode === 'd3build') {
      const e = d3Build(id).effects;
      out.crit += e.criticalRateBonus || 0; out.magic += e.magicDamagePercent || 0;
      out.healUp += e.healingPowerPercent || 0; out.magicResist += e.magicDamageReductionPercent || 0;
      out.physicalDamage = e.physicalDamagePercent || 0;
      out.physicalResist = e.physicalDamageReductionPercent || 0;
      out.resonanceGain = e.resonanceGainPercent || 0;
    }
    return out;
  }

  const ELEMENT_ALIASES = {
    fire: ['fire', '火', '炎'], ice: ['ice', '氷'], thunder: ['thunder', '雷'],
    light: ['light', '光', '聖'], dark: ['dark', '闇']
  };

  function affinityMultiplier(enemy, element) {
    if (!element) return 1;
    const aliases = ELEMENT_ALIASES[element] || [String(element).toLowerCase()];
    const matches = list => (list || []).some(value => aliases.includes(String(value).toLowerCase()));
    const table = D.futureContent?.magicElements?.multipliers || {};
    if (matches(enemy.weaknesses)) return table.weak || 1.2;
    if (matches(enemy.resistances)) return table.resist || .75;
    return table.normal || 1;
  }

  function isMagical(skill) {
    return skill.damageType === 'magical' || skill.kind === 'magical';
  }

  function defenseValue(skill, enemy) {
    if (skill.kind === 'hybrid') return ((enemy.def || 0) + (enemy.mnd || 0)) * .5;
    return isMagical(skill) ? enemy.mnd : enemy.def;
  }

  function effectiveSkillPower(skill, id) {
    let power = Number(skill.power) || 1;
    // 狩人は毒＋炎上を維持した定常戦闘を仮定。仕留めはDEBUFFを消費しない。
    const debuffs = D.jobs?.[id]?.simulationAssumptions?.activeDebuffs || 0;
    if (skill.powerPerDebuff) power += (skill.powerPerDebuff || 0) * debuffs;
    return power;
  }

  function instantDeathExpectation(skill, stats, enemy) {
    const effect = skill?.effect || {};
    if (effect.type !== 'instantDeath') return null;
    if (!enemy || enemy.kind === 'boss' || enemy.instantDeathImmune || enemy.cannotDefeat || enemy.infiniteHp) {
      return { immune: true, chance: 0, damage: 0 };
    }
    const chance = clamp(
      (effect.baseChance ?? .20) + (((stats.mag || 0) + (stats.mnd || 0)) - (enemy.mnd || enemy.def || 0)) * (effect.statEdgeRate ?? .008),
      effect.minChance ?? .05,
      effect.maxChance ?? .60
    );
    return { immune: false, chance, damage: chance * Math.max(0, enemy.hp || 0) };
  }

  function shieldPowers(stats, armorMode = 'job', id = 'guardian') {
    // 全JOB共通の「武器性能+20」条件を、盾ではDEF/MDEF各+20として扱う。
    const build = armorMode === 'd3build' ? d3Build(id) : null;
    return { physical: (stats.vit || 0) + (build?.def || 20), magical: (stats.mnd || 0) + (build?.mdef || 20) };
  }

  function attackValue(skill, stats, weaponType, id, enemy = null, armorMode = 'job') {
    if (weaponType === 'shield') {
      const shield = shieldPowers(stats, armorMode, id);
      if (skill.shieldFormula === 'magicRepulse') return shield.magical * 1.2 + shield.physical * .3;
      if (skill.shieldFormula === 'revenge') {
        const magicHit = (enemy?.mag || 0) > (enemy?.atk || 0);
        return magicHit
          ? shield.magical * 1.35 + shield.physical * .25
          : shield.physical * 1.35 + shield.magical * .25;
      }
      const b = D.guardianBalance || {};
      return shield.physical * (b.shieldDefRate ?? .5) + shield.magical * (b.shieldMdefRate ?? .5);
    }
    const jobScaling = D.jobs?.[id]?.attackScaling;
    const weaponRule = D.weaponScaling?.[weaponType] || D.weaponScaling?.sword || { scaling: { str: 1 } };
    const scaling = jobScaling || ((skill.damageType === 'magical' || skill.kind === 'magical') && weaponRule.damageType !== 'magical'
      ? { mag: 1 }
      : weaponRule.scaling || { str: 1 });
    const build = armorMode === 'd3build' ? d3Build(id) : null;
    const weaponPower = build ? (isMagical(skill) ? (build.matk || build.atk) : (build.atk || build.matk)) : 20;
    return Object.entries(scaling).reduce((sum, [stat, rate]) => sum + (stats[stat] || 0) * (Number(rate) || 0), weaponPower);
  }

  function bestSkill(id, stats, enemy, options = {}) {
    const weaponType = WEAPON_BY_JOB[id] || 'sword';
    const skills = skillPool(id, weaponType).filter(skill => {
      if (options.target === 'single') return skill.target !== 'all';
      if (options.target === 'all') return skill.target === 'all';
      return true;
    });
    const subtype = D.jobs?.[id]?.weaponSubtype || null;
    const basicId = (subtype && D.basicAttackByWeaponSubtype?.[subtype]) || D.basicAttackByWeaponType?.[weaponType] || 'attack';
    const mods = modifiers(id, options.armorMode);
    let best = { skill: D.skills?.[basicId] || D.skills?.attack, score: 1 };
    for (const skill of skills) {
      const instantDeath = instantDeathExpectation(skill, stats, enemy);
      if (instantDeath) {
        if (options.allowInstantDeath === false) continue;
        if (!instantDeath.immune && instantDeath.damage > best.score) best = { skill, score: instantDeath.damage };
        continue;
      }
      const defense = defenseValue(skill, enemy) * (1 - clamp((skill.ignoreDef || 0) + mods.defensePierce, 0, .95));
      const powers = id === 'dualBlade' && skill.id === 'battleDance' ? skill.hitPowersDual : null;
      const power = powers
        ? (options.scoreMode === 'maxHit' ? Math.max(...powers) : powers.reduce((sum, value) => sum + value, 0))
        : effectiveSkillPower(skill, id);
      const hits = options.scoreMode === 'maxHit' || powers ? 1 : (Number(skill.hits) || 1);
      const aoe = options.scoreMode === 'maxHit' ? 1 : (skill.target === 'all' ? enemy.count : 1);
      const elements = skill.hitElements?.length ? skill.hitElements : Array(hits).fill(skill.element || skill.elementId || null);
      const affinities = elements.map(element => affinityMultiplier(enemy, element));
      const affinity = affinities.length ? avg(affinities) : 1;
      const weakBoost = mods.weakActionDamage && affinities.some(value => value > 1) ? 1 + mods.weakActionDamage : 1;
      let score = Math.max(1, attackValue(skill, stats, weaponType, id, enemy, options.armorMode) * power * affinity - defense) * hits * aoe * weakBoost;
      if (!isMagical(skill)) score *= 1 + (mods.physicalDamage || 0);
      if (id === 'hunter' && skill.dot) {
        const dotStat = stats[skill.dot.stat] || stats.dex || 0;
        score += dotStat * (skill.dot.rate || 0) * ((skill.dot.turns || 1) + mods.dotDuration) * (1 + mods.dotDamage);
      }
      if (score > best.score) best = { skill, score };
    }
    return { ...best, weaponType };
  }

  function oneFight(id, armorMode, rng, samples, options = {}) {
    const pickedEnemy = weightedPick(samples, rng);
    const enemy = { ...pickedEnemy, count: options.enemyCount ?? pickedEnemy.count };
    const stats = baseStats(id, armorMode), mods = modifiers(id, armorMode);
    const build = armorMode === 'd3build' ? d3Build(id) : null;
    const armor = build ? { def: build.def, mdef: build.mdef } : (armorMode === 'job' ? (ROLE_ARMOR[id] || COMMON_ARMOR) : COMMON_ARMOR);
    const defaultWeaponType = WEAPON_BY_JOB[id] || 'sword';
    const forcedSkill = options.skillId ? D.skills?.[options.skillId] : null;
    const picked = forcedSkill ? { skill: forcedSkill, weaponType: defaultWeaponType } : bestSkill(id, stats, enemy, { ...options, armorMode });
    const { skill, weaponType } = picked;
    const magical = isMagical(skill);
    const defense = defenseValue(skill, enemy);
    const attack = attackValue(skill, stats, weaponType, id, enemy, armorMode);
    const hitPowers = id === 'dualBlade' && skill.id === 'battleDance' ? skill.hitPowersDual : null;
    const hits = hitPowers?.length || Number(skill.hits) || 1;
    const count = skill.target === 'all' ? enemy.count : 1;
    const mastery = 1 + 20 * (D.growthBalance?.weaponMasteryDamagePerLevel || .005);
    const hasDebuff = (D.jobs?.[id]?.simulationAssumptions?.activeDebuffs || 0) > 0;
    const isFutureJob = (D.futureJobIds || []).includes(id);
    const futureAccuracy = isFutureJob
      ? (skill.accuracyModifier || 0) + (D.weaponScaling?.[weaponType]?.accuracyModifier || 0)
      : 0;
    const accuracy = D.accuracy || {};
    const rawHitRate = (accuracy.base ?? .90) + (stats.dex || 0) * (accuracy.dexRate ?? .006) - enemy.agi * (accuracy.defenderAgiRate ?? .005)
      + (skill.accuracy || 0) + futureAccuracy + (hasDebuff ? mods.debuffedAccuracy : 0);
    const hitRate = skill.unavoidable ? 1 : clamp(rawHitRate, .20, .99);
    const skillCrit = isFutureJob ? (skill.criticalModifier || 0) : 0;
    const critRate = clamp((D.combatBalance?.critical?.base || .06) + (stats.luk || 0) * (D.combatBalance?.critical?.luckRate || .008)
      + (stats.critBonus || 0) + mods.crit + skillCrit + (hasDebuff ? mods.debuffedCritical : 0), 0, D.combatBalance?.critical?.max || .28);
    let damage = 0, maxHit = 0, hitsLanded = 0, crits = 0, combo = 0;
    let weakTriggered = false;
    const instantDeath = instantDeathExpectation(skill, stats, enemy);
    if (instantDeath && !instantDeath.immune) {
      // 通常D3では「成功率×対象の残HP」を1ACTION期待値として比較する。
      damage = instantDeath.damage;
      hitsLanded = instantDeath.chance;
    } else for (let i = 0; i < hits; i++) {
      const comboCrit = id === 'dualBlade' && combo >= 5 ? .10 : 0;
      if (rng() > hitRate) { if (id === 'dualBlade') combo = 0; continue; }
      hitsLanded++;
      const critical = rng() < clamp(critRate + comboCrit, 0, .95); if (critical) crits++;
      if (id === 'dualBlade') combo = Math.min(5, combo + 1);
      const pierce = clamp((skill.ignoreDef || 0) + mods.defensePierce, 0, .95);
      const usedDefense = defense * (1 - pierce) * (critical ? .5 : 1);
      const hitPower = hitPowers ? hitPowers[i] : effectiveSkillPower(skill, id);
      const element = skill.hitElements?.[i] || skill.element || skill.elementId || null;
      const affinity = isFutureJob ? affinityMultiplier(enemy, element) : 1;
      if (affinity > 1) weakTriggered = true;
      let point = Math.max(1, attack * hitPower * affinity - usedDefense + (rng() * 4 - 2));
      if (critical) point *= D.combatBalance?.critical?.multiplier || 1.65;
      if (magical) point *= 1 + mods.magic + (skill.element ? mods.element : 0);
      else point *= 1 + mods.lowHpPhysical + (mods.physicalDamage || 0);
      if (skill.hpCostRate) point *= 1 + mods.hpCostPower + mods.hpCostDamage;
      if (id === 'dualBlade') point *= 1 + combo * .02;
      const masteredPoint = point * mastery;
      maxHit = Math.max(maxHit, masteredPoint);
      damage += masteredPoint * count;
    }
    if (weakTriggered) damage *= 1 + mods.weakActionDamage;
    const maintainedDots = new Set(D.jobs?.[id]?.simulationAssumptions?.maintainDots || []);
    if (maintainedDots.size) {
      // 毒＋炎上を維持する定常ローテーション。毒師の+1Tは更新猶予として緩やかに評価する。
      const dex = stats.dex || 0;
      const dotRate = Object.values(D.skills || {}).filter(entry => entry.dot && maintainedDots.has(entry.dot.id)).reduce((sum, entry) => sum + (entry.dot.rate || 0), 0);
      const steadyDot = dex * dotRate * (1 + mods.dotDamage) * (1 + mods.dotDuration / 6);
      damage += steadyDot;
      if (skill.effect?.type === 'triggerNextDotTick') damage += steadyDot;
    }
    // D3最適装備では爪を装備しているため《無手の型》の左拳追撃は発生しない。
    // 素手専用ツリーを追加した際は、素手ビルドを別ロードアウトとして比較する。
    if (id === 'martialArtist' && armorMode === 'none') damage *= 1 + (D.jobs.martialArtist?.traits?.bareFists?.rate || .125);
    // 戦姫乱舞の5Hitには左右の斬撃が含まれる。別技のときだけ左手25%追撃を加える。
    if (id === 'dualBlade' && skill.id !== 'battleDance' && hitsLanded > 0) damage *= 1.25;
    if (id === 'warrior' && rng() < .30) damage += Math.max(1, ((stats.str || 0) + (build?.atk || 20)) - enemy.def) * (D.settings?.counterPowerRate || .7);
    if (id === 'magicKnight') {
      const mb = D.maestroBalance || {};
      if (rng() < (mb.soloChance || .35)) damage *= 2;
      if (rng() < (mb.procChance || .5)) damage *= 1 + (mb.buffRate || .1);
    }
    if (id === 'phantomThief') damage *= 1.08;

    // 守護士の通常D3評価は「フォートレス→盾技→RESONANCE BREAK」の
    // 3ACTIONローテーションで平均化する。共鳴技を毎ACTION撃つ過大評価を避ける。
    if (id === 'guardian') {
      const shieldBasic = D.skills?.shieldBash || skill;
      const resonanceDamage = attackValue(shieldBasic, stats, 'shield', id, enemy, armorMode) * mastery;
      damage = (damage + resonanceDamage) / 3;
    }

    // 《分身》の3T維持を仮定。見切りは固定回避ではなくAGI由来の回避分だけを強化する。
    const signature = D.skills?.[D.jobs?.[id]?.signatureSkillId];
    const signatureAgi = D.jobs?.[id]?.simulationAssumptions?.maintainSignatureBuff ? (signature?.effect?.multiplier || 1) : 1;
    const evasionAgi = (stats.agi || 0) * (1 + mods.evasionAgiRate) * signatureAgi;
    const projectedEnemyHit = clamp((accuracy.base ?? .90) + enemy.dex * (accuracy.dexRate ?? .006) - evasionAgi * (accuracy.defenderAgiRate ?? .005), accuracy.min ?? .20, accuracy.max ?? .99);
    if ((mods.evadeCounter || mods.evadeNextDamage) && rng() > projectedEnemyHit) {
      damage *= 1 + mods.evadeNextDamage;
      if (rng() < mods.evadeCounter) {
        const counterAttack = attackValue(D.skills?.katanaSlash || skill, stats, weaponType, id, enemy, armorMode);
        damage += Math.max(1, counterAttack * mods.evadeCounterPower - enemy.def) * mastery;
      }
    }

    const enemyMagic = enemy.mag > enemy.atk || rng() < .40;
    // 盾の共通武器性能+20は、攻撃転換だけでなく被ダメージ計算にも反映する。
    const shieldDefense = id === 'guardian' ? 20 : 0;
    const playerDefense = (enemyMagic ? (stats.mnd || 0) + armor.mdef + shieldDefense : (stats.vit || 0) + armor.def + shieldDefense);
    const cfg = enemyMagic ? D.combatBalance?.enemyMagic : D.combatBalance?.enemyPhysical;
    const enemyPower = enemyMagic ? enemy.mag : enemy.atk;
    const enemyHit = projectedEnemyHit;
    let taken = rng() < enemyHit ? enemyPower * (cfg?.attackScale || .75) * (cfg?.defenseK || 40) / ((cfg?.defenseK || 40) + playerDefense) : 0;
    if (enemyMagic) taken *= 1 - mods.magicResist;
    else taken *= 1 - (mods.physicalResist || 0);
    // 守護士は3ACTION中1回だけフォートレス。恒常30%軽減としては扱わない。
    if (id === 'guardian') taken *= .90;
    if (id === 'warrior') taken *= .90;
    const turns = Math.max(1, Math.ceil((enemy.hp * enemy.count) / Math.max(1, damage)));
    let totalTaken = taken * turns;
    if (mods.evadeHealMaxHp) totalTaken -= (stats.maxHp || 0) * mods.evadeHealMaxHp * (1 - enemyHit) * turns;
    if (weakTriggered && mods.weakHealMaxHp) totalTaken -= (stats.maxHp || 0) * mods.weakHealMaxHp * turns;
    if (mods.damageHeal) totalTaken -= damage * mods.damageHeal * turns;
    if (skill.hpCostRate) totalTaken += (stats.maxHp || 0) * skill.hpCostRate * turns;
    const rewardGold = enemy.gold * enemy.count * (1 + mods.gold);
    return {
      dps: damage, taken: Math.max(0, totalTaken), netTaken: totalTaken, incomingTaken: taken, turns,
      gold: rewardGold, goldPerAction: rewardGold / turns,
      enemiesPerAction: enemy.count / turns, maxHit,
      evasionRate: 1 - enemyHit,
      hitRate: hits ? hitsLanded / hits : 0, critRate: hitsLanded ? crits / hitsLanded : 0,
      skillId: skill.id, mpCost: Number(skill.mp) || 0
    };
  }

  function simulate({ battles = 3000, seed = 527, armorMode = 'job' } = {}) {
    const samples = d3Samples();
    const results = activeJobIds().map(id => {
      const rows = [], singleRows = [], multiRows = [], oneHitRows = [];
      // JOB間で同じ敵抽選・同じ乱数列を共有し、比較時の標本差をなくす。
      for (let n = 0; n < battles; n++) {
        const battleSeed = (Number(seed) + Math.imul(n + 1, 7919)) >>> 0;
        rows.push(oneFight(id, armorMode, rngFrom(battleSeed), samples));
        singleRows.push(oneFight(id, armorMode, rngFrom(battleSeed), samples, { enemyCount: 1, allowInstantDeath: false }));
        multiRows.push(oneFight(id, armorMode, rngFrom(battleSeed), samples, { enemyCount: 3, allowInstantDeath: false }));
        oneHitRows.push(oneFight(id, armorMode, rngFrom(battleSeed), samples, { enemyCount: 1, allowInstantDeath: false, scoreMode: 'maxHit' }));
      }
      const unsupported = unsupportedPassives(id);
      return {
        id, name: D.jobs[id]?.name || id, dps: avg(rows.map(x => x.dps)), medianDps: percentile(rows.map(x => x.dps), .5),
        lowDps: percentile(rows.map(x => x.dps), .1), highDps: percentile(rows.map(x => x.dps), .9),
        taken: avg(rows.map(x => x.taken)), turns: avg(rows.map(x => x.turns)), gold: avg(rows.map(x => x.gold)),
        singleDps: avg(singleRows.map(x => x.dps)), multiDps: avg(multiRows.map(x => x.dps)),
        maxHit: avg(oneHitRows.map(x => x.maxHit)),
        clearSpeed: 100 / avg(rows.map(x => x.turns)),
        mobSpeed: avg(rows.map(x => x.enemiesPerAction)),
        farmSpeed: avg(rows.map(x => x.goldPerAction)),
        evasionRate: avg(rows.map(x => x.evasionRate)),
        hitRate: avg(rows.map(x => x.hitRate)), critRate: avg(singleRows.map(x => x.critRate)), unsupported
      };
    });
    const strong = simulateStrongTrial({ battles, seed, armorMode });
    const strongById = new Map((strong.results || []).map(row => [row.id, row.survivalActions]));
    const enriched = results.map(row => ({ ...row, strongSurvival: strongById.get(row.id) || 0 }));
    const evaluated = enriched.filter(row => row.id !== 'phantomThief');
    const ranked = (key, ascending = false, source = evaluated) => [...source].sort((a, b) => ascending ? a[key] - b[key] : b[key] - a[key]).map((row, i) => ({ ...row, rank: i + 1 }));
    const categories = {
      clearSpeed: ranked('clearSpeed'), mobSpeed: ranked('mobSpeed'), singleDps: ranked('singleDps'),
      multiDps: ranked('multiDps'), defense: ranked('taken', true), evasion: ranked('evasionRate'),
      critical: ranked('critRate'), maxHit: ranked('maxHit'), farmSpeed: ranked('farmSpeed'),
      strongSurvival: ranked('strongSurvival')
    };
    const balanceKeys = ['clearSpeed', 'mobSpeed', 'singleDps', 'multiDps', 'taken', 'evasionRate', 'critRate', 'maxHit', 'farmSpeed', 'strongSurvival'];
    const ranksByKey = Object.fromEntries(balanceKeys.map(key => {
      const ascending = key === 'taken';
      const sorted = [...evaluated].sort((a, b) => ascending ? a[key] - b[key] : b[key] - a[key]);
      return [key, new Map(sorted.map((row, index) => [row.id, index + 1]))];
    }));
    const overall = evaluated.map(row => {
      const ranks = Object.fromEntries(balanceKeys.map(key => [key, ranksByKey[key].get(row.id)]));
      return { ...row, categoryRanks: ranks, averageRank: avg(Object.values(ranks)) };
    }).sort((a, b) => a.averageRank - b.averageRank).map((row, index) => ({ ...row, rank: index + 1 }));
    return {
      conditions: { battles, seed, armorMode, weaponBonus: 20, jobLevel: 20, masteryLevel: 20 }, results: enriched,
      dps: ranked('dps'), defense: categories.defense, gold: ranked('gold'), categories, overall, strong
    };
  }

  function strongEnemySample() {
    const enemy = D.enemies?.debugOverpowerEnemy;
    if (!enemy) return null;
    return {
      id: enemy.id, name: enemy.name, weight: 1, hp: 1, count: 1,
      kind: enemy.kind || 'boss', infiniteHp: !!enemy.infiniteHp,
      instantDeathImmune: !!enemy.instantDeathImmune, cannotDefeat: !!enemy.cannotDefeat,
      def: enemy.stats?.def || 0, mnd: enemy.stats?.mnd || 0,
      atk: enemy.stats?.atk || 0, mag: enemy.stats?.mag || 0,
      agi: enemy.stats?.agi ?? enemy.stats?.spd ?? 0,
      dex: enemy.stats?.dex ?? enemy.stats?.spd ?? 0,
      weaknesses: [...(enemy.weaknesses || [])], resistances: [...(enemy.resistances || [])],
      gold: 0, ai: [...(enemy.ai || [])], maxActions: enemy.trialRules?.maxActions || 30,
      healingMultiplier: clamp(enemy.trialRules?.healingMultiplier ?? 1, 0, 1),
      attacksUnavoidable: !!enemy.trialRules?.attacksUnavoidable,
      trialLabel: enemy.trialRules?.label || ''
    };
  }

  function strongEnemyUsesMagic(enemy, rng) {
    const actions = enemy.ai || [];
    const total = actions.reduce((sum, action) => sum + (action.weight || 1), 0);
    if (total > 0) {
      let roll = rng() * total;
      for (const action of actions) {
        roll -= action.weight || 1;
        if (roll <= 0) return action.kind === 'magic' || action.kind === 'magical';
      }
    }
    return enemy.mag > enemy.atk || rng() < .40;
  }

  function strongIncoming(id, armorMode, stats, enemy, rng, reduction = 0) {
    const mods = modifiers(id, armorMode), accuracy = D.accuracy || {};
    const build = armorMode === 'd3build' ? d3Build(id) : null;
    const armor = build ? { def: build.def, mdef: build.mdef } : (armorMode === 'job' ? (ROLE_ARMOR[id] || COMMON_ARMOR) : COMMON_ARMOR);
    const signature = D.skills?.[D.jobs?.[id]?.signatureSkillId];
    const signatureAgi = D.jobs?.[id]?.simulationAssumptions?.maintainSignatureBuff ? (signature?.effect?.multiplier || 1) : 1;
    const evasionAgi = (stats.agi || 0) * (1 + mods.evasionAgiRate) * signatureAgi;
    const enemyHit = clamp((accuracy.base ?? .90) + enemy.dex * (accuracy.dexRate ?? .006) - evasionAgi * (accuracy.defenderAgiRate ?? .005), accuracy.min ?? .20, accuracy.max ?? .99);
    if (!enemy.attacksUnavoidable && rng() >= enemyHit) return 0;
    const magical = strongEnemyUsesMagic(enemy, rng);
    const shieldDefense = id === 'guardian' ? 20 : 0;
    const playerDefense = magical
      ? (stats.mnd || 0) + armor.mdef + shieldDefense
      : (stats.vit || 0) + armor.def + shieldDefense;
    const cfg = magical ? D.combatBalance?.enemyMagic : D.combatBalance?.enemyPhysical;
    const enemyPower = magical ? enemy.mag : enemy.atk;
    let damage = enemyPower * (cfg?.attackScale || .75) * (cfg?.defenseK || 40) / ((cfg?.defenseK || 40) + playerDefense);
    if (magical) damage *= 1 - mods.magicResist;
    else damage *= 1 - (mods.physicalResist || 0);
    if (id === 'warrior') damage *= .90;
    return Math.max(0, damage * (1 - reduction));
  }

  function resonanceMultiplier(value) {
    const tiers = D.guardianBalance?.resonanceTiers || [];
    const matched = tiers.find(tier => value >= tier.min);
    if (matched) return matched.multiplier || 0;
    // 50/50耐久ローテーションの比較では、微量でも溜まった共鳴を最低段階×1として扱う。
    return value > 0 ? (tiers[tiers.length - 1]?.multiplier || 1) : 0;
  }

  function priestResourceAudit() {
    const stats = baseStats('priest'), mods = modifiers('priest');
    const body = D.skills?.bodyToMind, regen = D.skills?.regenerate;
    const bodyEffect = body?.effect || {}, regenEffect = regen?.effect || {};
    const maxHp = Math.max(1, stats.maxHp || 80), maxMp = Math.max(0, stats.maxMp || 0);
    const hpCost = maxHp * (bodyEffect.hpCostRate || 0);
    const mpGain = maxMp * (bodyEffect.mpRecoverRate || 0);
    const regenTickChance = clamp(regenEffect.triggerChance ?? regenEffect.tickChance ?? regenEffect.procChance ?? 1, 0, 1);
    const regenHealOnAllSuccess = maxHp * (regenEffect.maxHpRate || 0) * (regenEffect.turns || 0) * (1 + mods.healUp);
    const regenHeal = regenHealOnAllSuccess * regenTickChance;
    const regenMpCost = Number(regen?.mp) || 0;
    const cooldownTurns = Math.max(1, Number(body?.cooldown) || 1);
    const passiveMpDuringCooldown = maxMp * mods.mpRegen * cooldownTurns;
    const rawMaxUses = body?.maxUsesPerBattle ?? bodyEffect.maxUsesPerBattle;
    const configuredMaxUses = Number.isFinite(Number(rawMaxUses)) ? Math.max(0, Number(rawMaxUses)) : null;
    return {
      maxHp, maxMp, hpCost, mpGain, regenHeal, regenHealOnAllSuccess, regenTickChance, regenMpCost, cooldownTurns, passiveMpDuringCooldown,
      damageMpRecoverRate: mods.damageMpRecover,
      heavyHitRegenerate: mods.heavyHitRegenerate,
      cycleHpNet: regenHeal - hpCost,
      cycleMpNet: mpGain - regenMpCost + passiveMpDuringCooldown,
      configuredMaxUses,
      simulatedMaxUses: configuredMaxUses ?? 1,
      repeatableInfiniteRisk: configuredMaxUses === null && regenHeal > hpCost && (mpGain + passiveMpDuringCooldown) >= regenMpCost,
      recommendation: { type: 'maxUsesPerBattle', value: 1 }
    };
  }

  function oneStrongTrial(id, armorMode, rng, enemy) {
    const stats = baseStats(id, armorMode), maxHp = Math.max(1, stats.maxHp || 80);
    const maxMp = Math.max(0, stats.maxMp || 0), mods = modifiers(id, armorMode);
    const healSkill = D.skills?.heal, regenerateSkill = D.skills?.regenerate, bodyToMindSkill = D.skills?.bodyToMind;
    const regenerateEffect = regenerateSkill?.effect || {};
    const bodyToMindEffect = bodyToMindSkill?.effect || {};
    const rawBodyToMindMaxUses = bodyToMindSkill?.maxUsesPerBattle ?? bodyToMindEffect.maxUsesPerBattle;
    const bodyToMindMaxUses = Number.isFinite(Number(rawBodyToMindMaxUses))
      ? Math.max(0, Number(rawBodyToMindMaxUses)) : 1;
    const maxActions = enemy.maxActions || 30, mastery = 1 + 20 * (D.growthBalance?.weaponMasteryDamagePerLevel || .005);
    const preferred = id === 'guardian' ? null : bestSkill(id, stats, enemy, { armorMode });
    const subtype = D.jobs?.[id]?.weaponSubtype || null;
    const basicId = preferred ? ((subtype && D.basicAttackByWeaponSubtype?.[subtype]) || D.basicAttackByWeaponType?.[preferred.weaponType] || 'attack') : null;
    let hp = maxHp, mp = maxMp, actions = 0, totalDamage = 0, resonance = 0, meditationCooldown = 0, regenerateTurns = 0;
    let regenerateHealRate = regenerateEffect.maxHpRate || 0;
    let regenerateTickChance = clamp(regenerateEffect.triggerChance ?? regenerateEffect.tickChance ?? regenerateEffect.procChance ?? 1, 0, 1);
    let regenerateSource = null;
    let bodyToMindCooldown = 0, bodyToMindUses = 0, mpDepleted = false, regenerateTicks = 0, regenerateSuccesses = 0;
    let activeRegenTicks = 0, activeRegenSuccesses = 0, passiveRegenTicks = 0, passiveRegenSuccesses = 0;
    let heavyRegenAttempts = 0, heavyRegenProcs = 0;
    const tryHeavyHitRegenerate = incoming => {
      const heavy = mods.heavyHitRegenerate;
      if (!heavy || incoming < maxHp * (heavy.thresholdRate ?? .10)) return;
      heavyRegenAttempts++;
      if (rng() >= (heavy.chance ?? .40)) return;
      heavyRegenProcs++;
      regenerateTurns = Math.max(regenerateTurns, Number(heavy.turns) || 0);
      regenerateHealRate = heavy.healRate ?? regenerateEffect.maxHpRate ?? .15;
      regenerateTickChance = clamp(heavy.triggerChance ?? heavy.tickChance ?? 1, 0, 1);
      regenerateSource = 'passive';
    };
    const receiveAttack = (reduction = 0) => {
      const incoming = strongIncoming(id, armorMode, stats, enemy, rng, reduction);
      hp -= incoming;
      if (mods.damageMpRecover) mp = Math.min(maxMp, mp + incoming * mods.damageMpRecover);
      tryHeavyHitRegenerate(incoming);
      return incoming;
    };
    for (let action = 1; action <= maxActions && hp > 0; action++) {
      actions++;
      // 自ターン開始効果。値は現在のPASSIVE/SKILLデータを読む。
      mp = Math.min(maxMp, mp + maxMp * mods.mpRegen);
      if (regenerateTurns > 0) {
        regenerateTicks++;
        if (regenerateSource === 'active') activeRegenTicks++;
        if (regenerateSource === 'passive') passiveRegenTicks++;
        if (rng() < regenerateTickChance) {
          regenerateSuccesses++;
          if (regenerateSource === 'active') activeRegenSuccesses++;
          if (regenerateSource === 'passive') passiveRegenSuccesses++;
          hp = Math.min(maxHp, hp + maxHp * regenerateHealRate * (1 + mods.healUp) * enemy.healingMultiplier);
        }
        regenerateTurns--;
        if (regenerateTurns <= 0) regenerateSource = null;
      }
      if (id === 'guardian') {
        const wantsFortress = action % 2 === 1;
        const fortressCost = Number(D.skills?.fortress?.mp) || 8;
        const fortressTurn = wantsFortress && mp >= fortressCost;
        if (fortressTurn) mp -= fortressCost;
        if (!fortressTurn) {
          const basic = D.skills?.shieldBash || { power: 1 };
          if (!wantsFortress && resonance > 0) {
            totalDamage += attackValue(basic, stats, 'shield', id, enemy, armorMode) * mastery * resonanceMultiplier(resonance);
            resonance = 0;
          } else if (wantsFortress) {
            // MP切れ後はフォートレスの代わりに通常の盾攻撃へ移る。
            totalDamage += Math.max(1, attackValue(basic, stats, 'shield', id, enemy, armorMode) - enemy.def) * mastery;
          }
        }
        const incoming = receiveAttack(fortressTurn ? (D.guardianBalance?.fortressReduction ?? .30) : 0);
        resonance = Math.min(D.guardianBalance?.resonanceMax || 100, resonance + incoming * (D.guardianBalance?.resonanceGainPerDamage ?? .05));
      } else {
        // 僧侶は長期戦を想定し、早い段階からリジェネを維持。危険域だけヒールで戻す。
        const shouldHeal = id === 'priest' && healSkill && hp / maxHp <= .45 && mp >= (healSkill.mp || 0);
        const activeRegenThreshold = mods.heavyHitRegenerate ? .65 : .90;
        const shouldRegenerate = id === 'priest' && regenerateSkill && regenerateTurns <= 0
          && mp >= (regenerateSkill.mp || 0) && (action === 1 || hp / maxHp < activeRegenThreshold);
        const priestMpReserve = (healSkill?.mp || 0) + (regenerateSkill?.mp || 0);
        const bodyHpCost = maxHp * (bodyToMindEffect.hpCostRate || 0);
        const shouldBodyToMind = id === 'priest' && bodyToMindSkill && bodyToMindEffect.type === 'hpToMp'
          && bodyToMindUses < bodyToMindMaxUses && bodyToMindCooldown <= 0 && mp < priestMpReserve
          && hp > bodyHpCost && (hp - bodyHpCost) / maxHp >= .55;
        const shouldMeditate = id === 'mage' && meditationCooldown <= 0 && maxMp > 0 && mp / maxMp <= .20;
        if (shouldHeal) {
          mp -= healSkill.mp || 0;
          const effect = healSkill.effect || {};
          const recovered = ((effect.baseHeal ?? effect.base ?? 0) + (stats.mnd || 0) * (effect.spiritScaling ?? effect.mndScale ?? 0)) * (1 + mods.healUp) * enemy.healingMultiplier;
          hp = Math.min(maxHp, hp + Math.max(1, recovered));
          receiveAttack();
        } else if (shouldRegenerate) {
          mp -= regenerateSkill.mp || 0;
          regenerateTurns = Math.max(0, Number(regenerateEffect.turns) || 0);
          regenerateHealRate = regenerateEffect.maxHpRate || 0;
          regenerateTickChance = clamp(regenerateEffect.triggerChance ?? regenerateEffect.tickChance ?? regenerateEffect.procChance ?? 1, 0, 1);
          regenerateSource = 'active';
          receiveAttack();
        } else if (shouldBodyToMind) {
          hp -= bodyHpCost;
          mp = Math.min(maxMp, mp + maxMp * (bodyToMindEffect.mpRecoverRate || 0));
          bodyToMindCooldown = bodyToMindSkill.cooldown || 0;
          bodyToMindUses++;
          receiveAttack();
        } else if (shouldMeditate) {
          const meditation = D.skills?.meditation;
          mp = Math.min(maxMp, mp + maxMp * (meditation?.effect?.maxMpRate || .10));
          meditationCooldown = meditation?.cooldown || 3;
          receiveAttack();
        } else {
          const useSkillId = mp >= (preferred.skill.mp || 0) ? preferred.skill.id : basicId;
          const row = oneFight(id, armorMode, rng, [enemy], { skillId: useSkillId });
          mp = Math.max(0, mp - row.mpCost);
          totalDamage += row.dps;
          // oneFightは攻撃威力・HPコスト・吸収だけを利用する。敵の攻撃は
          // 強敵試験専用条件（必中・回復封印）を通し、全JOBを同条件に揃える。
          const selfNet = row.netTaken - row.incomingTaken;
          if (selfNet > 0) hp -= selfNet;
          else if (selfNet < 0) hp = Math.min(maxHp, hp - selfNet * enemy.healingMultiplier);
          receiveAttack();
        }
      }
      meditationCooldown = Math.max(0, meditationCooldown - 1);
      bodyToMindCooldown = Math.max(0, bodyToMindCooldown - 1);
      if (mp <= .001) mpDepleted = true;
    }
    return { actions, totalDamage, reachedCap: hp > 0, hpRemaining: Math.max(0, hp), mpRemaining: mp, mpDepleted, bodyToMindUses, regenerateTicks, regenerateSuccesses, activeRegenTicks, activeRegenSuccesses, passiveRegenTicks, passiveRegenSuccesses, heavyRegenAttempts, heavyRegenProcs };
  }

  function simulateStrongTrial({ battles = 3000, seed = 527, armorMode = 'job' } = {}) {
    const enemy = strongEnemySample();
    if (!enemy) return { conditions: { battles, seed, armorMode }, results: [], survival: [], damage: [], missingEnemy: true };
    const results = activeJobIds().filter(id => id !== 'phantomThief').map(id => {
      const rows = [];
      for (let n = 0; n < battles; n++) rows.push(oneStrongTrial(id, armorMode, rngFrom((Number(seed) + Math.imul(n + 1, 104729)) >>> 0), enemy));
      return {
        id, name: D.jobs[id]?.name || id,
        survivalActions: avg(rows.map(row => row.actions)),
        survivalLow: percentile(rows.map(row => row.actions), .1),
        survivalHigh: percentile(rows.map(row => row.actions), .9),
        totalDamage: avg(rows.map(row => row.totalDamage)),
        damageLow: percentile(rows.map(row => row.totalDamage), .1),
        damageHigh: percentile(rows.map(row => row.totalDamage), .9),
        capRate: rows.filter(row => row.reachedCap).length / Math.max(1, rows.length),
        mpDepletionRate: rows.filter(row => row.mpDepleted).length / Math.max(1, rows.length),
        avgBodyToMindUses: avg(rows.map(row => row.bodyToMindUses || 0)),
        avgMpRemaining: avg(rows.map(row => row.mpRemaining || 0)),
        regenerateTickRate: rows.reduce((sum, row) => sum + (row.regenerateSuccesses || 0), 0) / Math.max(1, rows.reduce((sum, row) => sum + (row.regenerateTicks || 0), 0)),
        activeRegenerateTickRate: rows.reduce((sum, row) => sum + (row.activeRegenSuccesses || 0), 0) / Math.max(1, rows.reduce((sum, row) => sum + (row.activeRegenTicks || 0), 0)),
        passiveRegenerateTickRate: rows.reduce((sum, row) => sum + (row.passiveRegenSuccesses || 0), 0) / Math.max(1, rows.reduce((sum, row) => sum + (row.passiveRegenTicks || 0), 0)),
        heavyRegenProcRate: rows.reduce((sum, row) => sum + (row.heavyRegenProcs || 0), 0) / Math.max(1, rows.reduce((sum, row) => sum + (row.heavyRegenAttempts || 0), 0)),
        unsupported: unsupportedPassives(id)
      };
    });
    const survival = [...results].sort((a, b) => b.survivalActions - a.survivalActions || b.totalDamage - a.totalDamage).map((row, i) => ({ ...row, rank: i + 1 }));
    const damage = [...results].sort((a, b) => b.totalDamage - a.totalDamage || b.survivalActions - a.survivalActions).map((row, i) => ({ ...row, rank: i + 1 }));
    return {
      conditions: { battles, seed, armorMode, enemyId: enemy.id, maxActions: enemy.maxActions, healingMultiplier: enemy.healingMultiplier, attacksUnavoidable: enemy.attacksUnavoidable, trialLabel: enemy.trialLabel, rotation: 'guardian: fortress/resonance 50/50' },
      enemy, results, survival, damage
    };
  }

  function table(rows, type) {
    const value = type === 'dps' ? r => `${r.dps.toFixed(1)} <small>${r.lowDps.toFixed(0)}–${r.highDps.toFixed(0)}</small>`
      : type === 'taken' ? r => r.taken.toFixed(1) : r => r.gold.toFixed(1);
    return `<div class="jbs-table">${rows.map(r => `<div class="jbs-row"><b>${r.rank}</b><span>${esc(r.name)}${r.unsupported.length ? `<i title="${esc(r.unsupported.join(' / '))}">⚠ 未対応</i>` : ''}</span><strong>${value(r)}</strong></div>`).join('')}</div>`;
  }

  const CATEGORY_META = {
    clearSpeed: { title: '周回速度', note: '100ACTIONあたりの戦闘クリア数', value: row => `${row.clearSpeed.toFixed(1)} 戦` },
    mobSpeed: { title: '雑魚殲滅速度', note: '1ACTIONあたりの撃破数', value: row => `${row.mobSpeed.toFixed(2)} 体` },
    singleDps: { title: '単体DPS', note: '敵1体への1ACTION平均ダメージ', value: row => row.singleDps.toFixed(1) },
    multiDps: { title: '複数DPS', note: '敵3体への1ACTION総ダメージ', value: row => row.multiDps.toFixed(1) },
    defense: { title: '被ダメージ', note: '1戦合計・少ない順', value: row => row.taken.toFixed(1) },
    evasion: { title: '回避', note: 'D3敵攻撃への平均回避率', value: row => `${(row.evasionRate * 100).toFixed(1)}%` },
    critical: { title: '会心', note: '単体攻撃の実測会心率', value: row => `${(row.critRate * 100).toFixed(1)}%` },
    maxHit: { title: '最大一撃', note: '即死を除く1Hitの平均最大ダメージ', value: row => row.maxHit.toFixed(1) },
    farmSpeed: { title: '稼ぎ周回', note: '1ACTIONあたりの獲得GOLD', value: row => `${row.farmSpeed.toFixed(1)} G` },
    strongSurvival: { title: '格上耐久', note: '回復封印・必中の平均生存ACTION', value: row => `${row.strongSurvival.toFixed(2)} A` }
  };

  function metricTable(rows, key) {
    const meta = CATEGORY_META[key];
    return `<section class="jbs-metric"><h3>${meta.title} <small>${meta.note}</small></h3><div class="jbs-table">${rows.map(row => `<div class="jbs-row"><b>${row.rank}</b><span>${esc(row.name)}</span><strong>${meta.value(row)}</strong></div>`).join('')}</div></section>`;
  }

  function overallTable(rows) {
    const midpoint = (rows.length + 1) / 2;
    return `<div class="jbs-table jbs-overall">${rows.map(row => {
      const deviation = row.averageRank - midpoint;
      const verdict = deviation > 1.25 ? '要確認：平均が低い' : deviation < -1.25 ? '強め：突出確認' : '適正帯';
      const detail = Object.values(row.categoryRanks || {}).join(' / ');
      return `<div class="jbs-row"><b>${row.rank}</b><span>${esc(row.name)}<i>${verdict}｜各順位 ${detail}</i></span><strong>平均 ${row.averageRank.toFixed(2)}</strong></div>`;
    }).join('')}</div>`;
  }

  function strongTable(rows, type) {
    const value = type === 'survival'
      ? row => `${row.survivalActions.toFixed(2)} <small>ACTION / ${row.survivalLow.toFixed(0)}–${row.survivalHigh.toFixed(0)}${row.capRate ? ` / 生存${(row.capRate * 100).toFixed(1)}%` : ''}</small>`
      : row => `${row.totalDamage.toFixed(1)} <small>${row.damageLow.toFixed(0)}–${row.damageHigh.toFixed(0)}</small>`;
    return `<div class="jbs-table jbs-strong-table">${rows.map(row => `<div class="jbs-row"><b>${row.rank}</b><span>${esc(row.name)}${row.unsupported.length ? `<i title="${esc(row.unsupported.join(' / '))}">⚠ 未対応</i>` : ''}</span><strong>${value(row)}</strong></div>`).join('')}</div>`;
  }

  function show() {
    document.getElementById('job-balance-overlay')?.remove();
    const root = document.createElement('section'); root.id = 'job-balance-overlay';
    root.innerHTML = `<header><div><small>D3 / MONTE CARLO</small><h2>JOB実戦ランキング</h2></div><button data-jbs-close>閉じる</button></header>
      <div class="jbs-controls"><label>装備条件<select data-jbs-armor><option value="d3build">D3最適ビルド</option><option value="job">JOB適性防具（仮想）</option><option value="common">全JOB共通防具</option></select></label><label>戦闘数<input data-jbs-battles type="number" min="100" max="30000" step="100" value="3000"></label><label>乱数シード<input data-jbs-seed type="number" value="527"></label><button data-jbs-run>同SEEDで再計算</button><button data-jbs-reroll>乱数を変えて再計算</button></div>
      <p class="jbs-note">全JOB Lv20／武器学Lv20／全武器技習得／武器攻撃性能+20。JOB間は同じ敵抽選・同じ戦闘SEEDで比較します。同じSEEDなら同じ結果を再現し、乱数変更時だけ標本が変わります。</p><div data-jbs-output></div>`;
    document.body.appendChild(root);
    const run = () => {
      const battles = clamp(+root.querySelector('[data-jbs-battles]').value || 3000, 100, 30000);
      const seed = +root.querySelector('[data-jbs-seed]').value || 527, armorMode = root.querySelector('[data-jbs-armor]').value;
      const out = simulate({ battles, seed, armorMode });
      const strong = out.strong;
      const strongPriest = strong.results?.find(row => row.id === 'priest');
      const priestAudit = priestResourceAudit();
      const signed = value => `${value >= 0 ? '+' : ''}${value.toFixed(1)}`;
      const bodyLimitText = priestAudit.configuredMaxUses == null ? '未設定（試験は推奨1回）' : `${priestAudit.configuredMaxUses}回/戦`;
      const priestResource = strongPriest ? `<div class="jbs-summary jbs-priest-resource"><span>僧侶 MP枯渇 ${(strongPriest.mpDepletionRate * 100).toFixed(1)}%</span><span>30ACTION完走 ${(strongPriest.capRate * 100).toFixed(1)}%</span><span>BODY→MIND 平均${strongPriest.avgBodyToMindUses.toFixed(2)}回</span><span>ACTIVE REGEN成功 ${(strongPriest.activeRegenerateTickRate * 100).toFixed(1)}%</span><span>祈祷PROC ${(strongPriest.heavyRegenProcRate * 100).toFixed(1)}%</span><span>平均循環 HP${signed(priestAudit.cycleHpNet)} / MP${signed(priestAudit.cycleMpNet)}</span><span>使用上限 ${bodyLimitText}</span></div>` : '';
      const strongBlock = strong.missingEnemy ? '' : `<div class="jbs-divider"></div><div class="jbs-summary"><span>守護士向け別試験</span><span>${esc(strong.enemy.name)}</span><span>${esc(strong.conditions.trialLabel || '特殊条件なし')}</span><span>最大${strong.conditions.maxActions} ACTION</span></div><h3>格上・純受け耐久ランキング <small>平均生存ACTION・多い順</small></h3>${strongTable(strong.survival, 'survival')}<h3>格上累積ダメージランキング <small>KOまでの総与ダメージ</small></h3>${strongTable(strong.damage, 'damage')}${priestResource}<p class="jbs-note">敵HPは無限。HP/MPを各試行で保持し、この試験では回復封印・必中攻撃によって純粋な防御、盾受け、軽減、反撃を比較します。通常D3の継戦能力とは別ランキングです。守護士はMPが続く間フォートレス50%＋RESONANCE BREAK 50%、MP切れ後は盾攻撃へ移行します。</p>`;
      const categoryOrder = ['clearSpeed', 'mobSpeed', 'singleDps', 'multiDps', 'defense', 'evasion', 'critical', 'maxHit', 'farmSpeed', 'strongSurvival'];
      const categoryBlock = categoryOrder.map(key => metricTable(out.categories[key], key)).join('');
      const gearLabel = armorMode === 'd3build' ? 'D3最適ビルド' : armorMode === 'job' ? 'JOB適性防具（仮想）' : '共通防具';
      root.querySelector('[data-jbs-output]').innerHTML = `<div class="jbs-summary"><span>${battles.toLocaleString()}戦</span><span>SEED ${seed}</span><span>${gearLabel}</span></div><h3>総合バランス <small>10指標の平均順位</small></h3>${overallTable(out.overall)}<p class="jbs-note">実装済み・予約済みを含む全JOBで平均を算出し、ファントムシーフだけロマン枠として除外します。D3最適ビルドは実際の工房武器・防具・盾の戦闘能力を合算します。AGIは装備で加算せず、アルカナ育成を別枠とします。</p><div class="jbs-category-grid">${categoryBlock}</div>${strongBlock}<details><summary>計算上の注意</summary><p>⚠は計算モデル未対応のパッシブです。データ変更は次回再計算へ反映されます。単体は敵1体、複数は敵3体へ統一。周回・殲滅はD3の実出現重みを使用します。通常D3と格上耐久は別モデルです。《魂送の祈り》は通常敵にだけ「成功率×対象残HP」の1ACTION期待値で評価し、BOSS・HP無限敵では候補から除外します。複雑な行動条件は個別モデル追加が必要です。</p></details>`;
    };
    root.addEventListener('click', e => {
      if (e.target.closest('[data-jbs-close]')) root.remove();
      if (e.target.closest('[data-jbs-run]')) run();
      if (e.target.closest('[data-jbs-reroll]')) {
        const random = new Uint32Array(1);
        if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(random);
        else random[0] = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
        root.querySelector('[data-jbs-seed]').value = String(random[0] || 1);
        run();
      }
    });
    run();
  }

  const style = document.createElement('style');
  style.textContent = `#job-balance-overlay{position:fixed;inset:0;z-index:100002;overflow:auto;background:linear-gradient(160deg,#03070f,#07162b 55%,#100824);color:#e9f4ff;padding:12px;font-family:system-ui,sans-serif}#job-balance-overlay>header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:10px 8px;background:#050b16eF;border-bottom:1px solid #2877b8}#job-balance-overlay h2{margin:1px 0;font-size:20px}#job-balance-overlay header small{color:#67c9ff;letter-spacing:.18em}#job-balance-overlay button,#job-balance-overlay input,#job-balance-overlay select{min-height:38px;border:1px solid #376d9d;border-radius:4px;background:#07111f;color:#eff8ff;padding:6px 10px}.jbs-controls{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0}.jbs-controls label{display:grid;gap:3px;font-size:10px;color:#88a7c4}.jbs-controls button{align-self:end;background:#0d4c86}.jbs-controls [data-jbs-reroll]{grid-column:1/-1;background:#18375b;border-color:#618ab0}.jbs-note{font-size:11px;line-height:1.6;color:#8da6be}.jbs-summary{display:flex;flex-wrap:wrap;gap:6px}.jbs-summary span{padding:4px 7px;border:1px solid #294969;color:#8ed9ff;font-size:10px}.jbs-table{border:1px solid #244663}.jbs-row{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:7px;min-height:39px;padding:5px 8px;border-bottom:1px solid #162e43}.jbs-row:last-child{border:0}.jbs-row>b{color:#51baff}.jbs-row span{font-weight:700}.jbs-row span i{display:block;color:#ffbd72;font-size:9px;font-style:normal}.jbs-row strong{text-align:right;color:#fff}.jbs-row strong small{display:block;color:#718ca5;font-weight:400}.jbs-overall{border-color:#7251a4}.jbs-overall .jbs-row strong{color:#d8b9ff}.jbs-category-grid{display:grid;gap:2px}.jbs-metric{min-width:0}.jbs-strong-table .jbs-row strong{color:#d7c8ff}.jbs-divider{height:1px;margin:24px 0;background:linear-gradient(90deg,transparent,#884dca,#4cbef0,transparent)}.jbs-output h3,#job-balance-overlay h3{margin:18px 0 6px;color:#9edcff;font-size:15px}#job-balance-overlay h3 small{display:block;color:#7892aa;font-size:10px;font-weight:400}#job-balance-overlay details{margin:16px 0;padding:10px;border:1px solid #294969;color:#9db2c5;font-size:11px}@media(min-width:600px){#job-balance-overlay{max-width:720px;left:50%;transform:translateX(-50%);box-shadow:0 0 0 100vw #000b}.jbs-controls{grid-template-columns:repeat(4,1fr)}.jbs-controls [data-jbs-reroll]{grid-column:auto}.jbs-category-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.jbs-category-grid .jbs-metric:last-child{grid-column:1/-1}}`;
  document.head.appendChild(style);
  window.ARSENE_JOB_BALANCE = { simulate, simulateStrongTrial, priestResourceAudit, show, unsupportedPassives, conditions: { jobLevel: 20, masteryLevel: 20, weaponBonus: 20 } };
})();
