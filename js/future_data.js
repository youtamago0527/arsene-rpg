(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  if (!D) return;

  // D4〜D7は設計・検証専用の予約データ。
  // 通常ゲームの解放判定やダンジョン一覧へは接続しない。
  const DEV = { devOnly: true, futureOnly: true, contentState: 'reserved', balanceState: 'provisional' };
  D.futureContent = {
    schemaVersion: 1,
    devOnly: true,
    note: 'D4〜D7は未実装。DEBUG ROOM / ARSÈNE DEV TOOLS / Monte Carlo専用。',
    releaseFlags: { d4Released: false, d5Released: false, d6Released: false, d7Released: false },
    roadmap: [
      { dungeonId: 'dungeon4', bossId: 'astact', origin: 'STACCATO', jobId: 'ronin', weapon: 'katana', mastery: 'sword' },
      { dungeonId: 'dungeon5', bossId: 'ostina', origin: 'OSTINATO', jobId: 'hunter', weapon: 'bow', mastery: 'bow' },
      { dungeonId: 'dungeon6', bossId: 'chromatia', origin: 'CHROMATIC', jobId: 'runeLancer', weapon: 'spear', mastery: 'spear' },
      { dungeonId: 'dungeon7', bossId: 'eclaim', origin: 'REQUIEM', jobId: 'darkKnight', weapon: 'greatsword', mastery: 'greatsword' }
    ],
    d3ToD4Transition: {
      trigger: { bossDefeated: 'seripes', futureReleaseFlag: 'd4Released' },
      reward: { itemId: 'rebirthArcana', count: 2 },
      purpose: '転生導線。D4正式実装時にセリペス初回撃破報酬へ接続する。',
      dialogue: [
        '……見事だ。', 'だが、思い違いをするな。', '私はただの第三奏域の守護者にすぎん。',
        'ここから先、その程度の力では進めんぞ。', '己を壊せ。',
        '積み上げた力を魂へ刻み――もう一度、生まれ直せ。', '輪廻を重ねろ。',
        '次なる守護者は、私のように刃を受けてはくれん。'
      ]
    },
    dotRules: {
      ignoresDefense: true, canCritical: false, timing: 'turnEnd', bossDefault: 'effective',
      bossResistanceAllowed: true, note: 'ボス完全無効を原則使用しない。耐性倍率で調整する。'
    },
    magicElements: {
      ids: ['fire', 'ice', 'thunder', 'light', 'dark'],
      multipliers: { strongResist: .50, resist: .75, normal: 1.00, weak: 1.20, greatWeak: 1.50, specialMin: 2.00, specialMax: 3.00 }
    }
  };

  D.futureBosses = {
    astact: {
      id: 'astact', name: 'アスタクト', nameEn: 'ASTACT', title: '第四奏卿・瞬断の奏刃', origin: 'STACCATO', dungeonId: 'dungeon4',
      battleTheme: ['accuracy', 'evasion', 'speed', 'counter'], releaseFlag: 'd4Released', ...DEV,
      stats: { maxHp: 3200, atk: 132, def: 92, mag: 70, mnd: 82, spd: 148, dex: 132 },
      mechanics: { agiEvasionScale: 1.35, counterOnEvade: .35 },
      designNote: '攻撃を受けず、短く切る高速移動と瞬間反撃で戦う七奏卿。'
    },
    ostina: {
      id: 'ostina', name: 'オスティナ', nameEn: 'OSTINA', title: '第五奏卿・反復の狩律', origin: 'OSTINATO', dungeonId: 'dungeon5',
      battleTheme: ['dex', 'dot', 'debuff', 'attrition'], releaseFlag: 'd5Released', ...DEV,
      stats: { maxHp: 5600, atk: 138, def: 108, mag: 126, mnd: 118, spd: 124, dex: 162 },
      mechanics: { signatureSkillId: 'bossOstinato', debuffScaling: true },
      designNote: '毒・炎上・能力低下を執拗に反復し、有効DEBUFF数を大技へ変換する七奏卿。'
    },
    chromatia: {
      id: 'chromatia', name: 'クロマティア', nameEn: 'CHROMATIA', title: '第六奏卿・彩律の変奏者', origin: 'CHROMATIC', dungeonId: 'dungeon6',
      battleTheme: ['elements', 'weakness', 'shift', 'hybrid'], releaseFlag: 'd6Released', ...DEV,
      stats: { maxHp: 8800, atk: 156, def: 126, mag: 178, mnd: 152, spd: 136, dex: 148 },
      mechanics: { signatureSkillId: 'chromaticShift', forms: ['fire', 'ice', 'thunder', 'light', 'dark'] },
      designNote: 'CHROMATIC SHIFTで五属性の耐性と弱点を変え続ける七奏卿。'
    },
    eclaim: {
      id: 'eclaim', name: 'エクレイム', nameEn: 'ECLAIM', title: '第七奏卿・終命の鎮魂者', origin: 'REQUIEM', dungeonId: 'dungeon7',
      battleTheme: ['hpCost', 'life', 'dark', 'unavoidable', 'pierce'], releaseFlag: 'd7Released', ...DEV,
      stats: { maxHp: 13800, atk: 224, def: 164, mag: 198, mnd: 176, spd: 142, dex: 172 },
      mechanics: { hpCostSkills: true, unavoidableFinishers: true, penetration: true },
      designNote: '生命を燃料に、必中・貫通・超火力を重ねる終幕の七奏卿。'
    }
  };

  D.futureBossRewards = {
    astact: { bossId: 'astact', scoreId: 'staccato', proofItemId: 'roninProof', unlockJobId: 'ronin', releaseFlag: 'd4Released', ...DEV },
    ostina: { bossId: 'ostina', scoreId: 'ostinato', proofItemId: 'hunterProof', unlockJobId: 'hunter', unlockWeaponMastery: 'bow', releaseFlag: 'd5Released', ...DEV },
    chromatia: { bossId: 'chromatia', scoreId: 'chromatic', proofItemId: 'runeLancerProof', unlockJobId: 'runeLancer', unlockWeaponMastery: 'spear', releaseFlag: 'd6Released', ...DEV },
    eclaim: { bossId: 'eclaim', scoreId: 'requiem', proofItemId: 'darkKnightProof', unlockJobId: 'darkKnight', unlockWeaponMastery: 'greatsword', releaseFlag: 'd7Released', ...DEV }
  };

  D.futureJobIds = ['ronin', 'hunter', 'runeLancer', 'darkKnight'];
  Object.assign(D.jobs, {
    ronin: {
      id: 'ronin', name: '刀術士', nameEn: 'RONIN', description: '刀と見切りで攻撃を避け、反撃へ変える高速カウンターJOB。',
      signatureSkillId: 'afterimageClone', passiveUnlocks: { 5: 'p_returnBlade', 10: 'p_zanshin', 15: 'p_instantEdge' },
      traits: { insight: { name: '見切り', nameEn: 'INSIGHT', type: 'agiEvasionEfficiency', rate: .20, description: '固定回避率ではなく、既存の素早さ回避性能を20%強化する。' } },
      attackScaling: { str: 1.0, agi: .3 }, simulationAssumptions: { maintainSignatureBuff: true },
      growthStats: ['str', 'agi'], featureText: '回避成功を反撃・回復・次撃強化へ変換する。刀は両手占有で剣学を共有。',
      unlockCondition: { bossDefeated: 'astact', releaseFlag: 'd4Released' }, skillUnlocks: {}, weaponTypes: ['sword'], weaponSubtype: 'katana', ...DEV
    },
    hunter: {
      id: 'hunter', name: '狩人', nameEn: 'HUNTER', description: '弓とDOT・DEBUFFを操り、弱った敵を仕留める器用さ型JOB。',
      signatureSkillId: 'finishingShot', passiveUnlocks: { 5: 'p_toxicologist', 10: 'p_tracking', 15: 'p_weaknessHunter' },
      traits: { hunting: { name: '狩猟', nameEn: 'HUNTING', type: 'ownDotDamageUp', rate: .20, description: '自身が付与したDOTのダメージを20%上昇させる。' } },
      attackScaling: { dex: 1.0 }, simulationAssumptions: { activeDebuffs: 2, maintainDots: ['poison', 'burn'] },
      growthStats: ['dex', 'agi'], featureText: 'DOTとDEBUFFを消費せず維持し、《仕留め》の倍率へ変換する。',
      unlockCondition: { bossDefeated: 'ostina', releaseFlag: 'd5Released' }, skillUnlocks: {}, weaponTypes: ['bow'], ...DEV
    },
    runeLancer: {
      id: 'runeLancer', name: '紋槍士', nameEn: 'RUNE LANCER', description: '五属性を槍へ転写し、弱点を突いて生命と魔力を循環させる物魔複合JOB。',
      signatureSkillId: 'fiveRuneStars', passiveUnlocks: { 5: 'p_runeDrain', 10: 'p_resonantRune', 15: 'p_chainRune' },
      traits: { runeTransfer: { name: '魔紋転写', nameEn: 'RUNE TRANSFER', type: 'selectWeaponElement', elements: ['fire', 'ice', 'thunder', 'light', 'dark'], mp: 0, actionCost: 1, description: '1ACTIONを使い武器属性を五属性から選択する。' } },
      attackScaling: { str: .7, mag: .7 }, simulationAssumptions: { chooseCurrentWeakness: true },
      growthStats: ['str', 'mag'], featureText: 'WEAKをHP回復・MP回復・最終ダメージ上昇へ連鎖させる。',
      unlockCondition: { bossDefeated: 'chromatia', releaseFlag: 'd6Released' }, skillUnlocks: {}, weaponTypes: ['spear'], ...DEV
    },
    darkKnight: {
      id: 'darkKnight', name: '暗黒騎士', nameEn: 'DARK KNIGHT', description: '自身のHPを代価に、必中・貫通・超火力を引き出す大剣JOB。',
      signatureSkillId: 'darkness', passiveUnlocks: { 5: 'p_bloodEdge', 10: 'p_lifeEater', 15: 'p_abyssPierce' },
      traits: { lifeConversion: { name: '命換', nameEn: 'LIFE CONVERSION', type: 'hpCostPower', rate: .25, description: 'HP消費を攻撃性能へ変換する。数値はD7正式設計時に再調整する。' } },
      attackScaling: { str: 1.15 }, simulationAssumptions: { hpCostEnabled: true },
      growthStats: ['str', 'vit'], featureText: 'HP管理を代償とした高威力・必中・防御貫通。現段階は検証用仮設計。',
      unlockCondition: { bossDefeated: 'eclaim', releaseFlag: 'd7Released' }, skillUnlocks: {}, weaponTypes: ['greatsword'], ...DEV
    }
  });

  Object.assign(D.growthBalance.jobGrowthPerLevel, {
    ronin:       { str: 2, vit: 0, mag: 0, mnd: 0, agi: 3, dex: 1, luk: 0 },
    hunter:      { str: 0, vit: 0, mag: 0, mnd: 0, agi: 2, dex: 3, luk: 1 },
    runeLancer:  { str: 2, vit: 1, mag: 2, mnd: 1, agi: 0, dex: 0, luk: 0 },
    darkKnight:  { str: 3, vit: 2, mag: 0, mnd: 0, agi: 1, dex: 0, luk: 0 }
  });
  Object.assign(D.jobCommandAbilities, {
    ronin: { cmd: '刀技', cmdEn: 'KATANA ARTS' }, hunter: { cmd: '狩技', cmdEn: 'HUNT ARTS' },
    runeLancer: { cmd: '紋槍', cmdEn: 'RUNE ARTS' }, darkKnight: { cmd: '暗黒', cmdEn: 'DARK ARTS' }
  });

  const futureWeaponTypes = [
    { id: 'bow', name: '弓', nameEn: 'BOW', description: '器用さのみで射抜く遠隔武器。', damageStats: ['dex'], starterWeaponId: null, unlockFlag: 'bowUnlocked', releaseFlag: 'd5Released', ...DEV },
    { id: 'spear', name: '槍', nameEn: 'SPEAR', description: '力と魔力を複合参照する魔法槍。', damageStats: ['str', 'mag'], starterWeaponId: null, unlockFlag: 'spearUnlocked', releaseFlag: 'd6Released', ...DEV },
    { id: 'greatsword', name: '大剣', nameEn: 'GREATSWORD', description: '両手占有。生命を代価に重い一撃を放つ。', damageStats: ['str'], starterWeaponId: null, unlockFlag: 'greatswordUnlocked', releaseFlag: 'd7Released', ...DEV }
  ];
  for (const type of futureWeaponTypes) if (!D.weaponTypes.some(current => current.id === type.id)) D.weaponTypes.push(type);
  Object.assign(D.weaponScaling, {
    bow: { scaling: { dex: 1.0 }, powerKey: 'attackPower', damageType: 'physical', accuracyModifier: .12 },
    spear: { scaling: { str: .7, mag: .7 }, powerKey: 'attackPower', damageType: 'physical', accuracyModifier: .02 },
    greatsword: { scaling: { str: 1.15 }, powerKey: 'attackPower', damageType: 'physical', accuracyModifier: -.10 }
  });
  Object.assign(D.weaponArtsCommand, {
    bow: { name: '弓技', nameEn: 'BOW ARTS' }, spear: { name: '槍技', nameEn: 'SPEAR ARTS' }, greatsword: { name: '大剣技', nameEn: 'GREATSWORD ARTS' }
  });
  Object.assign(D.basicAttackByWeaponType, { bow: 'bowShot', spear: 'runeSpearThrust', greatsword: 'greatswordCleave' });
  D.basicAttackByWeaponSubtype = { ...(D.basicAttackByWeaponSubtype || {}), katana: 'katanaSlash' };

  Object.assign(D.skills, {
    // D4 / 刀（剣学共有・刀専用Spark Family）
    katanaSlash: { id: 'katanaSlash', name: '刀撃', nameEn: 'KATANA SLASH', source: 'weapon', type: 'ACTIVE', kind: 'weapon', weaponType: 'sword', weaponSubtype: 'katana', sparkFamily: 'katana', target: 'single', mp: 0, power: 1.0, ...DEV },
    quickDraw: { id: 'quickDraw', name: '居合一閃', nameEn: 'QUICK DRAW', source: 'weapon', type: 'ACTIVE', kind: 'physical', weaponType: 'sword', weaponSubtype: 'katana', requiresWeaponSubtype: 'katana', sparkFamily: 'katana', prerequisiteSkill: 'katanaSlash', sparkRank: 28, mp: 7, power: 1.65, speedBonus: 18, target: 'single', ...DEV },
    moonReversal: { id: 'moonReversal', name: '月返し', nameEn: 'MOON REVERSAL', source: 'weapon', type: 'ACTIVE', kind: 'physical', weaponType: 'sword', weaponSubtype: 'katana', requiresWeaponSubtype: 'katana', sparkFamily: 'katana', prerequisiteSkill: 'quickDraw', sparkRank: 37, mp: 10, power: 1.85, effect: { type: 'counterStance', rate: .35, turns: 1 }, target: 'single', ...DEV },
    scarletMoment: { id: 'scarletMoment', name: '朱刹', nameEn: 'SCARLET MOMENT', source: 'weapon', type: 'ACTIVE', kind: 'physical', weaponType: 'sword', weaponSubtype: 'katana', requiresWeaponSubtype: 'katana', sparkFamily: 'katana', prerequisiteSkill: 'quickDraw', sparkRank: 46, mp: 13, power: 2.35, criticalModifier: .12, target: 'single', ...DEV },
    emptyCicada: { id: 'emptyCicada', name: '空蝉断ち', nameEn: 'EMPTY CICADA', source: 'weapon', type: 'ACTIVE', kind: 'physical', weaponType: 'sword', weaponSubtype: 'katana', requiresWeaponSubtype: 'katana', sparkFamily: 'katana', prerequisiteSkill: 'moonReversal', sparkRank: 58, mp: 17, power: 2.8, effect: { type: 'evasionWindow', agiMultiplier: 1.2, turns: 1 }, target: 'single', ...DEV },
    p_returnBlade: { id: 'p_returnBlade', name: '返し刃', nameEn: 'RETURN BLADE', type: 'PASSIVE', jobId: 'ronin', passiveEffect: { type: 'evadeCounter', rate: .30, power: 1.0 }, effectText: '回避成功時30%で通常攻撃相当の反撃', ...DEV },
    p_zanshin: { id: 'p_zanshin', name: '残心', nameEn: 'ZANSHIN', type: 'PASSIVE', jobId: 'ronin', passiveEffect: { type: 'evadeHeal', maxHpRate: .03, oncePerAction: true }, effectText: '回避成功時、最大HP3%回復（1ACTION1回）', ...DEV },
    p_instantEdge: { id: 'p_instantEdge', name: '刹那', nameEn: 'INSTANT EDGE', type: 'PASSIVE', jobId: 'ronin', passiveEffect: { type: 'evadeNextDamage', rate: .15, stacks: 1 }, effectText: '回避成功時、次の攻撃ダメージ+15%', ...DEV },
    afterimageClone: { id: 'afterimageClone', name: '分身', nameEn: 'AFTERIMAGE CLONE', source: 'job', jobId: 'ronin', unlockJobLevel: 20, type: 'ACTIVE', kind: 'support', target: 'self', mp: 18, effect: { type: 'evasionAgiMultiplier', multiplier: 1.5, turns: 3 }, effectText: '3T、回避判定時素早さ×1.5', ...DEV },

    // D5 / 弓学・DOT
    bowShot: { id: 'bowShot', name: '射撃', nameEn: 'BOW SHOT', source: 'weapon', type: 'ACTIVE', kind: 'weapon', weaponType: 'bow', target: 'single', mp: 0, power: 1.0, ...DEV },
    snipe: { id: 'snipe', name: '狙撃', nameEn: 'SNIPE', source: 'weapon', type: 'ACTIVE', kind: 'physical', weaponType: 'bow', prerequisiteSkill: 'bowShot', sparkRank: 30, target: 'single', mp: 5, power: 1.3, accuracyModifier: .20, ...DEV },
    poisonArrow: { id: 'poisonArrow', name: '毒矢', nameEn: 'POISON ARROW', source: 'weapon', type: 'ACTIVE', kind: 'physical', weaponType: 'bow', prerequisiteSkill: 'snipe', sparkRank: 39, target: 'single', mp: 8, power: 1.0, dot: { id: 'poison', turns: 3, damageType: 'dot', stat: 'dex', rate: .22 }, ...DEV },
    flameArrow: { id: 'flameArrow', name: '焔矢', nameEn: 'FLAME ARROW', source: 'weapon', type: 'ACTIVE', kind: 'physical', weaponType: 'bow', prerequisiteSkill: 'snipe', sparkRank: 44, target: 'single', mp: 9, power: 1.1, element: 'fire', dot: { id: 'burn', turns: 3, damageType: 'dot', stat: 'dex', rate: .25 }, ...DEV },
    arrowRain: { id: 'arrowRain', name: '五月雨', nameEn: 'ARROW RAIN', source: 'weapon', type: 'ACTIVE', kind: 'physical', weaponType: 'bow', prerequisiteSkill: 'poisonArrow', sparkRank: 57, target: 'single', mp: 15, power: .48, hits: 4, effect: { type: 'triggerNextDotTick', consumesDot: false }, ...DEV },
    p_toxicologist: { id: 'p_toxicologist', name: '毒師', nameEn: 'TOXICOLOGIST', type: 'PASSIVE', jobId: 'hunter', passiveEffect: { type: 'ownDotDuration', turns: 1 }, effectText: '自身が付与するDOTの持続+1T', ...DEV },
    p_tracking: { id: 'p_tracking', name: '追跡', nameEn: 'TRACKING', type: 'PASSIVE', jobId: 'hunter', passiveEffect: { type: 'debuffedTargetAccuracy', rate: .10 }, effectText: 'DEBUFF状態の敵への命中+10%', ...DEV },
    p_weaknessHunter: { id: 'p_weaknessHunter', name: '弱り目', nameEn: 'EXPLOIT WEAKNESS', type: 'PASSIVE', jobId: 'hunter', passiveEffect: { type: 'debuffedTargetCritical', rate: .10 }, effectText: 'DEBUFF状態の敵への会心率+10%', ...DEV },
    finishingShot: { id: 'finishingShot', name: '仕留め', nameEn: 'FINISHING SHOT', source: 'job', jobId: 'hunter', unlockJobLevel: 20, type: 'ACTIVE', kind: 'physical', weaponType: 'bow', target: 'single', mp: 16, power: 1.5, powerPerDebuff: .35, consumesDebuffs: false, effectText: '倍率1.50＋有効DEBUFF数×0.35／DEBUFF非消費', ...DEV },
    bossOstinato: { id: 'bossOstinato', name: 'OSTINATO', nameEn: 'OSTINATO', source: 'boss', bossId: 'ostina', type: 'ACTIVE', kind: 'magical', target: 'single', power: 1.7, powerPerDebuff: .45, ...DEV },

    // D6 / 槍学・五属性
    runeSpearThrust: { id: 'runeSpearThrust', name: '紋槍突き', nameEn: 'RUNE THRUST', source: 'weapon', type: 'ACTIVE', kind: 'weapon', weaponType: 'spear', target: 'single', mp: 0, power: 1.0, ...DEV },
    blazeLance: { id: 'blazeLance', name: '炎紋槍', nameEn: 'BLAZE LANCE', source: 'weapon', type: 'ACTIVE', kind: 'hybrid', weaponType: 'spear', prerequisiteSkill: 'runeSpearThrust', sparkRank: 36, target: 'single', mp: 8, power: 1.35, element: 'fire', ...DEV },
    frozenHelix: { id: 'frozenHelix', name: '氷紋螺旋', nameEn: 'FROZEN HELIX', source: 'weapon', type: 'ACTIVE', kind: 'hybrid', weaponType: 'spear', prerequisiteSkill: 'blazeLance', sparkRank: 45, target: 'single', mp: 11, power: 1.7, element: 'ice', ...DEV },
    thunderVault: { id: 'thunderVault', name: '雷紋跳槍', nameEn: 'THUNDER VAULT', source: 'weapon', type: 'ACTIVE', kind: 'hybrid', weaponType: 'spear', prerequisiteSkill: 'blazeLance', sparkRank: 49, target: 'single', mp: 12, power: 1.85, element: 'thunder', speedBonus: 10, ...DEV },
    eclipseImpale: { id: 'eclipseImpale', name: '光闇穿ち', nameEn: 'ECLIPSE IMPALE', source: 'weapon', type: 'ACTIVE', kind: 'hybrid', weaponType: 'spear', prerequisiteSkill: 'frozenHelix', sparkRank: 62, target: 'single', mp: 17, power: 1.25, hits: 2, hitElements: ['light', 'dark'], ...DEV },
    p_runeDrain: { id: 'p_runeDrain', name: '紋吸', nameEn: 'RUNE DRAIN', type: 'PASSIVE', jobId: 'runeLancer', passiveEffect: { type: 'weakHealHp', maxHpRate: .03, oncePerAction: true }, effectText: 'WEAK発生時、最大HP3%回復（1ACTION1回）', ...DEV },
    p_resonantRune: { id: 'p_resonantRune', name: '共鳴紋', nameEn: 'RESONANT RUNE', type: 'PASSIVE', jobId: 'runeLancer', passiveEffect: { type: 'weakActionDamage', rate: .10 }, effectText: 'WEAK発生時、そのACTIONの最終ダメージ+10%', ...DEV },
    p_chainRune: { id: 'p_chainRune', name: '連環', nameEn: 'CHAIN RUNE', type: 'PASSIVE', jobId: 'runeLancer', passiveEffect: { type: 'weakRecoverMp', maxMpRate: .03, oncePerAction: true }, effectText: 'WEAK発生時、最大MP3%回復（1ACTION1回）', ...DEV },
    fiveRuneStars: { id: 'fiveRuneStars', name: '五紋連星', nameEn: 'FIVE RUNE STARS', source: 'job', jobId: 'runeLancer', unlockJobLevel: 20, type: 'ACTIVE', kind: 'hybrid', weaponType: 'spear', target: 'single', mp: 22, power: .60, hits: 5, hitElements: ['fire', 'ice', 'thunder', 'light', 'dark'], independentElementCheck: true, effectText: '0.60×5／各Hit個別属性判定', ...DEV },
    chromaticShift: { id: 'chromaticShift', name: 'CHROMATIC SHIFT', nameEn: 'CHROMATIC SHIFT', source: 'boss', bossId: 'chromatia', type: 'ACTIVE', kind: 'support', target: 'self', mp: 0, effect: { type: 'cycleElementAffinity', elements: ['fire', 'ice', 'thunder', 'light', 'dark'] }, ...DEV },

    // D7 / 大剣学（可視仕様までの検証用仮値）
    greatswordCleave: { id: 'greatswordCleave', name: '大断ち', nameEn: 'GREAT CLEAVE', source: 'weapon', type: 'ACTIVE', kind: 'weapon', weaponType: 'greatsword', target: 'single', mp: 0, power: 1.0, ...DEV },
    heavyRend: { id: 'heavyRend', name: '重裂', nameEn: 'HEAVY REND', source: 'weapon', type: 'ACTIVE', kind: 'physical', weaponType: 'greatsword', prerequisiteSkill: 'greatswordCleave', sparkRank: 42, target: 'single', mp: 8, power: 1.55, ...DEV },
    bloodCross: { id: 'bloodCross', name: '血十字', nameEn: 'BLOOD CROSS', source: 'weapon', type: 'ACTIVE', kind: 'physical', weaponType: 'greatsword', prerequisiteSkill: 'heavyRend', sparkRank: 53, target: 'single', mp: 10, hpCostRate: .05, power: 2.0, ...DEV },
    abyssBreaker: { id: 'abyssBreaker', name: '深淵砕き', nameEn: 'ABYSS BREAKER', source: 'weapon', type: 'ACTIVE', kind: 'physical', weaponType: 'greatsword', prerequisiteSkill: 'bloodCross', sparkRank: 65, target: 'single', mp: 15, hpCostRate: .08, power: 2.65, ignoreDef: .20, ...DEV },
    executionerFall: { id: 'executionerFall', name: '終命墜し', nameEn: 'EXECUTIONER FALL', source: 'weapon', type: 'ACTIVE', kind: 'physical', weaponType: 'greatsword', prerequisiteSkill: 'abyssBreaker', sparkRank: 78, target: 'single', mp: 20, hpCostRate: .12, power: 3.5, accuracyModifier: -.15, ...DEV },
    p_bloodEdge: { id: 'p_bloodEdge', name: '血装', nameEn: 'BLOOD ARMAMENT', type: 'PASSIVE', jobId: 'darkKnight', passiveEffect: { type: 'hpCostDamageUp', rate: .15 }, effectText: 'HP消費技の最終ダメージ+15%', ...DEV },
    p_lifeEater: { id: 'p_lifeEater', name: '生命喰らい', nameEn: 'LIFE EATER', type: 'PASSIVE', jobId: 'darkKnight', passiveEffect: { type: 'damageHeal', rate: .03, oncePerAction: true }, effectText: '与ダメージの3%をHP回復（1ACTION1回）', ...DEV },
    p_abyssPierce: { id: 'p_abyssPierce', name: '冥穿', nameEn: 'ABYSS PIERCE', type: 'PASSIVE', jobId: 'darkKnight', passiveEffect: { type: 'defensePierce', rate: .20 }, effectText: '物理防御を20%貫通', ...DEV },
    darkness: { id: 'darkness', name: '暗黒', nameEn: 'DARKNESS', source: 'job', jobId: 'darkKnight', unlockJobLevel: 20, type: 'ACTIVE', kind: 'physical', weaponType: 'greatsword', target: 'single', mp: 18, hpCostRate: .20, power: 4.0, ignoreDef: .50, unavoidable: true, element: 'dark', effectText: '最大HP20%消費／必中／防御力50%貫通', ...DEV }
  });

  Object.assign(D.items, {
    roninProof: { id: 'roninProof', name: '刀術士の証', nameEn: 'PROOF OF THE RONIN', category: 'key', rarity: 'epic', description: 'アスタクトから盗み出す、刀と見切りを継ぐ資格の証。', ...DEV },
    hunterProof: { id: 'hunterProof', name: '狩人の証', nameEn: 'PROOF OF THE HUNTER', category: 'key', rarity: 'epic', description: 'オスティナから盗み出す、反復の狩律を断つ者の証。', ...DEV },
    runeLancerProof: { id: 'runeLancerProof', name: '紋槍士の証', nameEn: 'PROOF OF THE RUNE LANCER', category: 'key', rarity: 'epic', description: 'クロマティアから盗み出す、五属性の紋を束ねる証。', ...DEV },
    darkKnightProof: { id: 'darkKnightProof', name: '暗黒騎士の証', nameEn: 'PROOF OF THE DARK KNIGHT', category: 'key', rarity: 'epic', description: 'エクレイムから盗み出す、生命を暗黒へ変える者の証。', ...DEV },
    devKatana: { id: 'devKatana', name: '試製刀・瞬月', category: 'equipment', slot: 'rightHand', rarity: 'rare', description: 'D4バランス検証用。両手占有の刀。', ...DEV },
    devBow: { id: 'devBow', name: '試製弓・反律', category: 'equipment', slot: 'rightHand', rarity: 'rare', description: 'D5バランス検証用の弓。', ...DEV },
    devRuneSpear: { id: 'devRuneSpear', name: '試製紋槍・星彩', category: 'equipment', slot: 'rightHand', rarity: 'rare', description: 'D6バランス検証用の魔法槍。', ...DEV },
    devGreatsword: { id: 'devGreatsword', name: '試製大剣・終命', category: 'equipment', slot: 'rightHand', rarity: 'rare', description: 'D7バランス検証用。両手占有の大剣。', ...DEV }
  });
  Object.assign(D.weapons, {
    devKatana: { id: 'devKatana', name: '試製刀・瞬月', weaponType: 'sword', masteryType: 'sword', weaponSubtype: 'katana', twoHanded: true, attackPower: 40, scaling: { str: 1.0, agi: .3 }, bonuses: {}, ...DEV },
    devBow: { id: 'devBow', name: '試製弓・反律', weaponType: 'bow', attackPower: 42, bonuses: {}, ...DEV },
    devRuneSpear: { id: 'devRuneSpear', name: '試製紋槍・星彩', weaponType: 'spear', attackPower: 34, magicAttackPower: 34, bonuses: {}, ...DEV },
    devGreatsword: { id: 'devGreatsword', name: '試製大剣・終命', weaponType: 'greatsword', twoHanded: true, attackPower: 56, bonuses: {}, ...DEV }
  });

  Object.assign(D.musicScores, {
    staccato: { id: 'staccato', title: 'STACCATO', subtitle: 'Qの予告状', artist: 'ASTACT', use: 'secretMusicGame', unlockBoss: 'astact', releaseFlag: 'd4Released', description: 'アスタクトから盗み出す、瞬断の合図を刻む予告状の楽曲。隠し音ゲーで演奏可能。', ...DEV },
    ostinato: { id: 'ostinato', title: 'OSTINATO', subtitle: '月影の迷宮', artist: 'OSTINA', use: 'secretMusicGame', unlockBoss: 'ostina', releaseFlag: 'd5Released', description: 'オスティナから盗み出す、月影の迷宮を執拗な反復で巡る楽曲。隠し音ゲーで演奏可能。', ...DEV },
    chromatic: { id: 'chromatic', title: 'CHROMATIC', subtitle: '星霞の理由', artist: 'CHROMATIA', use: 'privateMode', unlockBoss: 'chromatia', releaseFlag: 'd6Released', description: 'クロマティアから盗み出す、五色の星霞を辿る楽曲。プライベートモードで演奏可能。', ...DEV },
    requiem: { id: 'requiem', title: 'REQUIEM', subtitle: '終幕の凱歌', artist: 'ECLAIM', use: 'privateMode', unlockBoss: 'eclaim', releaseFlag: 'd7Released', description: 'エクレイムから盗み出す、終幕を勝利へ塗り替える鎮魂の楽曲。プライベートモードで演奏可能。', ...DEV }
  });
})();
