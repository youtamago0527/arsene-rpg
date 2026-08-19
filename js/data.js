window.ARSENE_DATA = {
  settings: { healOnBattleStart: false, saveKey: 'arsene-rpg-save-v01', bossRematchWins: 5 },
  dualBladeOffHandRate: 0.70,
  // 武器種マスタ。ここに追記すれば得意武器選択・アイテム欄のタブへ自動反映される。
  // damageStats は将来の体術ダメージ計算（力＋素早さ）用の予約情報。
  weaponTypes: [
    { id: 'sword', name: '剣', nameEn: 'SWORD', description: '力で斬り込む近接武器。素直な物理攻撃。', damageStats: ['str'], starterWeaponId: 'phantomSword' },
    { id: 'staff', name: '杖', nameEn: 'STAFF', description: '魔力を導く杖。魔法主体で戦う。', damageStats: ['mag'], starterWeaponId: 'mageStaff' },
    { id: 'martial', name: '体術', nameEn: 'MARTIAL', description: '爪や籠手を使う徒手格闘。速さで手数を稼ぐ。', damageStats: ['str', 'agi'], starterWeaponId: 'ironClaw' }
  ],
  // 武器種ごとの通常攻撃。未定義の武器種は 'attack'（剣と同じ物理攻撃）にフォールバック。
  basicAttackByWeaponType: { sword: 'attack', staff: 'staffFireball', martial: 'martialStrike' },
  // 武器種ごとの技コマンド名。閃いた技はここに集約される。
  weaponArtsCommand: {
    sword: { name: '剣技', nameEn: 'SWORD ARTS' },
    staff: { name: '魔法', nameEn: 'MAGIC' },
    martial: { name: '拳技', nameEn: 'FIST ARTS' }
  },
  startingJobIds: ['warrior', 'martialArtist', 'mage', 'priest'],

  // ══════════════════════════════════════════════════════════════
  // 成長バランス設定：テストプレイ調整はすべてここを触れば済む
  // ══════════════════════════════════════════════════════════════
  growthBalance: {
    // ── 武器学 ──────────────────────────────────────────────
    weaponMasteryMaxLevel: 999,
    // 敵から得たEXP × この倍率 が武器学へ入る（敵データは変更しない）
    weaponExpMultiplier: 1.0,
    // 必要EXP = base + growth * (lv-1)^curve （小数は切り上げ）
    weaponExpTable: { base: 40, growth: 18, curve: 1.35 },

    // ── HP / MP 成長（戦闘終了時の確率判定）──────────────────
    baseHpGrowthRate: 0.15,
    baseMpGrowthRate: 0.08,
    hpGrowthAmount: { min: 3, max: 6 },
    mpGrowthAmount: { min: 1, max: 3 },
    jobHpGrowthBonus: { warrior: 0.10, martialArtist: 0.07, mage: 0.00, priest: 0.05 },
    jobMpGrowthBonus: { warrior: 0.00, martialArtist: 0.02, mage: 0.10, priest: 0.08 },

    // ── 閃き ────────────────────────────────────────────────
    sparkBaseRate: 0.05,
    // キャラクター固有特性 "small" が何倍になるか（characters.json 側は記号のみ保持）
    traitBonusScale: { small: { weaponExp: 1.15, spark: 1.5, mpGrowth: 1.3, heal: 1.15, critical: 0.03 } },

    // ── 成長しないジョブ ────────────────────────────────────
    noGrowthJobs: ['phantomThief']
  },

  battleProgression: { noelEncounterWins: 3, zenakadoEncounterWins: 7 },
  expTable: { 1: 50, 2: 120, 3: 220 },
  jobExpTable: { 1: 25, 2: 45, 3: 70, 4: 100, 5: 135, 6: 175, 7: 220, 8: 270, 9: 330, 10: 400, 11: 480, 12: 570, 13: 670, 14: 780, 15: 900, 16: 1040, 17: 1190, 18: 1360, 19: 1550 },
  jobLevelCap: 20,
  enchantTable: { successRates: [1.00, 1.00, 1.00, 0.97, 0.93, 0.88, 0.82, 0.75, 0.66, 0.55], goldCosts: [100, 200, 300, 500, 700, 1000, 1400, 1800, 2500, 3500], maxLevel: 10, statBonus: 5 },
  combatBalance: {
    playerVariance: { min: -2, max: 2 },
    critical: { base: .06, luckRate: .008, max: .28, multiplier: 1.65 },
    enemyPhysical: { attackScale: 2, defenseScale: .45 },
    enemyMagic: { attackScale: 2.2, defenseScale: .3 },
    enemyVariance: { min: -1, max: 2 }
  },
  normalEncounters: [
    ['shadowSlime', 'shadowSlime'],
    ['soulMage', 'shadowSlime'],
    ['soulMage', 'soulMage'],
    ['ratThief', 'soulMage'],
    ['ratThief', 'ratThief'],
    ['shadowSlime', 'soulMage', 'ratThief'],
    ['ratThief', 'soulMage', 'ratThief'],
    ['goblin', 'goblin'],
    ['nightBat', 'nightBat', 'nightBat'],
    ['ghostBone', 'ghostBone'],
    ['goblin', 'nightBat', 'ghostBone']
  ],
  encounterProgression: [
    { minWins: 0, count: [2, 2], pool: [{ id: 'shadowSlime', weight: 1 }] },
    { minWins: 1, count: [2, 2], pool: [{ id: 'shadowSlime', weight: 3 }, { id: 'soulMage', weight: 1 }, { id: 'goblin', weight: 1 }] },
    { minWins: 2, count: [2, 3], pool: [{ id: 'shadowSlime', weight: 2 }, { id: 'soulMage', weight: 2 }, { id: 'goblin', weight: 2 }, { id: 'nightBat', weight: 1 }] },
    { minWins: 3, count: [2, 3], pool: [{ id: 'shadowSlime', weight: 2 }, { id: 'soulMage', weight: 2 }, { id: 'ratThief', weight: 1 }, { id: 'goblin', weight: 2 }, { id: 'nightBat', weight: 2 }, { id: 'ghostBone', weight: 1 }] },
    { minWins: 5, count: [3, 3], pool: [{ id: 'shadowSlime', weight: 1 }, { id: 'soulMage', weight: 2 }, { id: 'ratThief', weight: 2 }, { id: 'goblin', weight: 2 }, { id: 'nightBat', weight: 2 }, { id: 'ghostBone', weight: 2 }] }
  ],
  player: {
    id: 'ren', name: '雨宮 蓮', shortName: 'REN', level: 1, exp: 0, gold: 0,
    baseStats: { maxHp: 80, maxMp: 40, str: 12, vit: 10, mag: 10, mnd: 14, agi: 18, dex: 12, luk: 14 },
    growth: { maxHp: 8, maxMp: 5, str: 0, vit: 0, mag: 0, mnd: 0, agi: 0, dex: 0, luk: 0 },
    skills: ['quickSlash'], inventory: { potion: 3, mageStaff: 1, phantomSword: 1 },
    equipment: { rightHand: 'mageStaff', leftHand: null, head: null, body: null, arms: null, feet: null, accessory: null }
  },
  characterSkillProgression: [
    { level: 1, skillId: 'blueNote' },
    { level: 3, skillId: 'blueEcho' },
    { level: 5, skillId: 'meditation' }
  ],
  jobs: {
    warrior: {
      id: 'warrior', name: '戦士', nameEn: 'WARRIOR', description: '力と耐久力で正面から怪異を打ち破る。', signatureSkillId: 'powerCharge', growthStats: ['str', 'vit'], featureText: '力・体力を伸ばしやすいジョブ。物理攻撃・HP・耐久力などの脳筋系パッシブを習得できる。',
      growth: { 1: { str: 2 }, 2: { maxHp: 5 }, 3: { vit: 1 }, 4: { str: 2, vit: 1 }, 5: { maxHp: 8 }, 6: { str: 2 }, 7: { maxHp: 8, vit: 2 }, 8: { str: 3 }, 9: { vit: 2 }, 10: { str: 4, maxHp: 12 }, 11: { str: 2 }, 12: { maxHp: 10, vit: 2 }, 13: { str: 3 }, 14: { vit: 3, maxHp: 8 }, 15: { str: 4 }, 16: { maxHp: 12, vit: 3 }, 17: { str: 4 }, 18: { vit: 4 }, 19: { str: 5 }, 20: { str: 6, maxHp: 18, vit: 5 } },
      skillUnlocks: { 3: 'powerStrike', 6: 'breakEdge', 9: 'recklessEdge', 12: 'warCry', 16: 'titanBlow' }
    },
    mage: {
      id: 'mage', name: '魔導士', nameEn: 'MAGE', description: '魔力を操り、単体・全体魔法を使い分ける。', signatureSkillId: 'meditation', growthStats: ['mag'], featureText: '魔力を伸ばしやすいジョブ。MP上昇・魔法威力などの魔法系パッシブを習得できる。',
      growth: { 1: { mag: 2 }, 2: { maxMp: 5 }, 3: { mag: 2 }, 4: { maxMp: 6 }, 5: { mag: 2 }, 6: { maxMp: 8 }, 7: { mag: 3 }, 8: { maxMp: 8 }, 9: { mag: 3 }, 10: { mag: 4, maxMp: 12 }, 11: { mag: 3 }, 12: { maxMp: 14 }, 13: { mag: 4 }, 14: { maxMp: 12 }, 15: { mag: 4 }, 16: { maxMp: 16 }, 17: { mag: 5 }, 18: { maxMp: 14 }, 19: { mag: 5 }, 20: { mag: 6, maxMp: 20 } },
      skillUnlocks: { 3: 'blueFlame', 6: 'manaBurst', 9: 'astralRay', 12: 'arcaneExplosion', 16: 'voidNova' }
    },
    martialArtist: {
      id: 'martialArtist', name: '武道家', nameEn: 'MARTIAL ARTIST', description: '速度と多段攻撃でクリティカルを狙う。', signatureSkillId: 'burstFist', growthStats: ['agi', 'luk'], featureText: '素早さ・運を伸ばしやすいジョブ。会心率・素早い行動などに関係するパッシブを習得できる。',
      growth: { 1: { agi: 2 }, 2: { str: 2, maxHp: 4 }, 3: { agi: 2 }, 4: { str: 2 }, 5: { agi: 3 }, 6: { str: 2 }, 7: { critBonus: .02 }, 8: { agi: 3, str: 2 }, 9: { critBonus: .03 }, 10: { critBonus: .05, agi: 3 }, 11: { agi: 3 }, 12: { str: 3, critBonus: .02 }, 13: { agi: 4 }, 14: { str: 3 }, 15: { agi: 4, critBonus: .03 }, 16: { str: 4 }, 17: { agi: 4 }, 18: { str: 4, critBonus: .03 }, 19: { agi: 5 }, 20: { critBonus: .07, agi: 5, str: 4 } },
      skillUnlocks: { 3: 'doubleStrike', 6: 'breakFist', 9: 'shadowRush', 12: 'swiftBarrage', 16: 'shadowSeven' }
    },
    priest: {
      id: 'priest', name: '僧侶', nameEn: 'PRIEST', description: '精神力を活かして回復と光魔法を扱う。', signatureSkillId: 'heal', growthStats: ['mnd', 'vit'], featureText: '精神・体力を伸ばしやすいジョブ。回復能力や耐久・支援に関係するパッシブを習得できる。',
      growth: { 1: { mnd: 2 }, 2: { maxMp: 5 }, 3: { mnd: 2 }, 4: { maxMp: 6 }, 5: { mnd: 2, maxHp: 5 }, 6: { maxMp: 8 }, 7: { mnd: 3 }, 8: { maxMp: 8 }, 9: { mnd: 3 }, 10: { mnd: 4, maxMp: 12 }, 11: { mnd: 3 }, 12: { maxMp: 14, maxHp: 5 }, 13: { mnd: 4 }, 14: { maxMp: 12 }, 15: { mnd: 4 }, 16: { maxMp: 16 }, 17: { mnd: 5 }, 18: { maxMp: 14 }, 19: { mnd: 5 }, 20: { mnd: 6, maxMp: 20, maxHp: 8 } },
      skillUnlocks: { 3: 'heal', 6: 'holyLight', 9: 'regenerate', 12: 'greatHeal', 16: 'divineSmite' }
    },
    arcaneMaestro: {
      id: 'arcaneMaestro', name: '魔奏士', nameEn: 'ARCANE MAESTRO', description: '魔法と回復を極めた上位職。ゼナカド撃破後、魔導士と僧侶をLv20にすると解放。',
      unlockCondition: { bossDefeated: 'zenacad', jobLevels: { mage: 20, priest: 20 } },
      growth: { 1: { mag: 3 }, 2: { mnd: 3 }, 3: { mag: 3, maxMp: 8 }, 4: { mnd: 3 }, 5: { mag: 4, maxMp: 8 }, 6: { mnd: 4 }, 7: { mag: 4 }, 8: { mnd: 4, maxMp: 10 }, 9: { mag: 5 }, 10: { mnd: 5, maxMp: 12 }, 11: { mag: 4 }, 12: { mnd: 4, maxMp: 12 }, 13: { mag: 5 }, 14: { mnd: 5 }, 15: { mag: 6, maxMp: 14 }, 16: { mnd: 6 }, 17: { mag: 6 }, 18: { mnd: 6, maxMp: 16 }, 19: { mag: 7 }, 20: { mag: 8, mnd: 8, maxMp: 24 } },
      skillUnlocks: { 3: 'resonantSpell', 6: 'celestialNote', 9: 'divineMelody', 12: 'grandOrchestra', 16: 'cosmicAria' }
    },
    dualBlade: {
      id: 'dualBlade', name: '双刃士', nameEn: 'DUAL BLADE', description: '速度と多段クリティカルを極めた上位職。ミルティ撃破後、戦士と武道家をLv20にすると解放。',
      unlockCondition: { bossDefeated: 'myrthi', jobLevels: { warrior: 20, martialArtist: 20 } },
      growth: { 1: { str: 3, agi: 2 }, 2: { critBonus: .02 }, 3: { str: 3, agi: 2 }, 4: { critBonus: .02 }, 5: { str: 4, agi: 3 }, 6: { critBonus: .03 }, 7: { str: 3, agi: 3 }, 8: { critBonus: .03 }, 9: { str: 4, agi: 3 }, 10: { critBonus: .05, str: 5, agi: 3 }, 11: { str: 4, agi: 3 }, 12: { critBonus: .03, str: 4 }, 13: { agi: 4, str: 3 }, 14: { critBonus: .03, agi: 4 }, 15: { str: 5, agi: 5 }, 16: { critBonus: .04 }, 17: { str: 5, agi: 4 }, 18: { critBonus: .04, str: 4 }, 19: { str: 6, agi: 5 }, 20: { critBonus: .08, str: 7, agi: 6, maxHp: 15 } },
      skillUnlocks: { 3: 'twistingEdge', 6: 'sunderDance', 9: 'crimsonRush', 12: 'dualEdgeBarrage', 16: 'battleDance' }
    }
  },
  jobCommandAbilities: {
    warrior: { cmd: '剣技', cmdEn: 'SWORD ARTS' },
    mage: { cmd: '魔導', cmdEn: 'ARCANA' },
    martialArtist: { cmd: '拳技', cmdEn: 'FIST ARTS' },
    priest: { cmd: '神聖', cmdEn: 'SACRED ARTS' },
    arcaneMaestro: { cmd: '魔奏', cmdEn: 'ARCANE SONG' },
    dualBlade: { cmd: '双刃技', cmdEn: 'DUAL ARTS' }
  },
  equipmentSlots: [
    { id: 'rightHand', name: '右手', enName: 'RIGHT HAND' },
    { id: 'leftHand', name: '左手', enName: 'LEFT HAND' },
    { id: 'head', name: '頭', enName: 'HEAD' },
    { id: 'body', name: '体', enName: 'BODY' },
    { id: 'arms', name: '腕', enName: 'ARMS' },
    { id: 'feet', name: '足', enName: 'FEET' },
    { id: 'accessory', name: 'アクセ', enName: 'ACCESSORY' }
  ],
  workshop: {
    unlockFlag: 'noelFirstEncounterCleared',
    tabs: [{ id: 'weapon', name: '武器', enName: 'WEAPON' }, { id: 'armor', name: '防具', enName: 'ARMOR' }, { id: 'disassemble', name: '分解', enName: 'DISASSEMBLE' }, { id: 'materials', name: '素材一覧', enName: 'MATERIALS' }, { id: 'catalog', name: '図鑑', enName: 'CATALOG' }],
    armorTabs: [{ id: 'leftHand', name: '盾', enName: 'SHIELD' }, { id: 'head', name: '頭', enName: 'HEAD' }, { id: 'body', name: '体', enName: 'BODY' }, { id: 'arms', name: '腕', enName: 'ARMS' }, { id: 'feet', name: '足', enName: 'FEET' }, { id: 'accessory', name: 'アクセ', enName: 'ACCESSORY' }],
    materialIds: ['slimeJelly', 'darkCore', 'manaDrop', 'stardustShard', 'magicPowder', 'moonstone', 'tatteredRobe', 'gnawedBag', 'ratWhisker', 'stolenCoin', 'ratTail', 'rustedKnife', 'tornCloth', 'goblinMedicine', 'batFang', 'tornWingMembrane', 'beastBlood', 'obsidianFang', 'spiritFragment', 'oldBone', 'darkSoulStone', 'resentmentCrystal', 'zenacad_core', 'cadenza_fragment', 'reverbJelly', 'echoShard', 'stoneShard', 'violinString', 'spectralDust', 'silentNote', 'silentArmor', 'voidShard', 'darkIron', 'chaosDust', 'phantomCore', 'voidEssence', 'myrthi_core', 'myrthi_fragment'],
    bossBlueprints: [{ id: 'noelJudgementStaff', bossId: 'noelFirstEncounter', name: 'ノエルの審判杖', slot: 'rightHand', status: 'awaitingSecondEncounter' }]
  },
  materialUnlockMap: {
    reverbJelly:  ['abyssGlovesRecipe'],
    echoShard:    ['nightwalkerBootsRecipe'],
    stoneShard:   ['abyssCoatRecipe'],
    violinString: ['silentHoodRecipe'],
    spectralDust: ['echoPendantRecipe'],
    silentNote:   ['lunaEdgeRecipe'],
    voidShard:    ['voidBladeRecipe'],
    chaosDust:    ['chaosRodRecipe'],
    darkIron:     ['voidHelmRecipe', 'abyssalArmorRecipe'],
    phantomCore:  ['phantomGauntletRecipe', 'voidRingRecipe']
  },
  dungeons: [
    {
      id: 'dungeon1', name: 'ダンジョン1', enName: 'DUNGEON I',
      background: 'assets/bg/dungeon-battle-01.png',
      thumbnail: 'assets/bg/dungeon-battle-01.png',
      description: '怪異の気配が漂う闇のダンジョン。怪盗団最初の潜入先。',
      recommendedLevel: 1,
      unlockCondition: null,
      encounterProgression: [
        { minWins: 0, count: [2, 2], pool: [{ id: 'shadowSlime', weight: 1 }] },
        { minWins: 1, count: [2, 2], pool: [{ id: 'shadowSlime', weight: 3 }, { id: 'soulMage', weight: 1 }, { id: 'goblin', weight: 1 }] },
        { minWins: 2, count: [2, 3], pool: [{ id: 'shadowSlime', weight: 2 }, { id: 'soulMage', weight: 2 }, { id: 'goblin', weight: 2 }, { id: 'nightBat', weight: 1 }] },
        { minWins: 3, count: [2, 3], pool: [{ id: 'shadowSlime', weight: 2 }, { id: 'soulMage', weight: 2 }, { id: 'ratThief', weight: 1 }, { id: 'goblin', weight: 2 }, { id: 'nightBat', weight: 2 }, { id: 'ghostBone', weight: 1 }] },
        { minWins: 5, count: [3, 3], pool: [{ id: 'shadowSlime', weight: 1 }, { id: 'soulMage', weight: 2 }, { id: 'ratThief', weight: 2 }, { id: 'goblin', weight: 2 }, { id: 'nightBat', weight: 2 }, { id: 'ghostBone', weight: 2 }] }
      ]
    },
    {
      id: 'dungeon2', name: '沈黙の楽殿', nameEn: 'THE HALL OF SILENCE',
      background: 'assets/bg/dungeon-battle-02.png',
      thumbnail: 'assets/bg/dungeon-battle-02.png',
      music: encodeURI('音楽系/ダンジョン/零時侵蝕ダンジョン2Version.mp3'),
      description: 'かつて七奏卿の一人が築いた、音なき楽園。音を奪われた者たちの残響が、今もこの殿堂に漂っている。',
      recommendedLevel: 10,
      unlockCondition: 'dungeon1Clear',
      encounterProgression: [
        { minWins: 0,  count: [1, 2], pool: [{ id: 'reverbSlime', weight: 8 }, { id: 'echoWraith', weight: 2 }, { id: 'silentHarmonist', weight: 1 }] },
        { minWins: 3,  count: [1, 2], pool: [{ id: 'reverbSlime', weight: 5 }, { id: 'echoWraith', weight: 4 }, { id: 'nocturneBanshee', weight: 2 }, { id: 'silentHarmonist', weight: 1 }] },
        { minWins: 5,  count: [2, 2], pool: [{ id: 'echoWraith', weight: 4 }, { id: 'nocturneBanshee', weight: 3 }, { id: 'nocturneChandelier', weight: 2 }, { id: 'reverbSlime', weight: 2 }, { id: 'silentHarmonist', weight: 1 }] },
        { minWins: 8,  count: [2, 3], pool: [{ id: 'nocturneChandelier', weight: 3 }, { id: 'silentKnight', weight: 2 }, { id: 'muteGargoyle', weight: 2 }, { id: 'echoWraith', weight: 2 }, { id: 'silentHarmonist', weight: 1 }] },
        { minWins: 12, count: [2, 3], pool: [{ id: 'silentKnight', weight: 3 }, { id: 'muteGargoyle', weight: 2 }, { id: 'nocturneChandelier', weight: 2 }, { id: 'nocturneBanshee', weight: 2 }, { id: 'silentHarmonist', weight: 1 }] }
      ]
    },
    {
      id: 'dungeon3', name: '崩界の深廊', nameEn: 'DEPTHS OF THE VOID',
      background: 'assets/bg/dungeon-battle-03.png',
      thumbnail: 'assets/bg/dungeon-battle-03.png',
      music: encodeURI('音楽系/ダンジョン/零時侵蝕ダンジョン3Version.mp3'),
      description: 'かつて怪盗団の先人が封じた「崩界の門」の深部。混沌と虚無が渦巻く、最深層への試練。',
      recommendedLevel: 20,
      unlockCondition: 'dungeon2Clear',
      encounterProgression: [
        { minWins: 0,  count: [1, 2], pool: [{ id: 'voidWatcher', weight: 7 }, { id: 'abyssalKnight', weight: 3 }, { id: 'voidOrchestra', weight: 1 }] },
        { minWins: 3,  count: [1, 2], pool: [{ id: 'voidWatcher', weight: 5 }, { id: 'abyssalKnight', weight: 4 }, { id: 'chaosWitch', weight: 3 }, { id: 'voidOrchestra', weight: 1 }] },
        { minWins: 6,  count: [2, 2], pool: [{ id: 'chaosWitch', weight: 4 }, { id: 'voidGargoyle', weight: 3 }, { id: 'abyssalKnight', weight: 3 }, { id: 'voidWatcher', weight: 2 }, { id: 'voidOrchestra', weight: 1 }] },
        { minWins: 10, count: [2, 3], pool: [{ id: 'phantomEmperor', weight: 3 }, { id: 'voidGargoyle', weight: 3 }, { id: 'chaosWitch', weight: 3 }, { id: 'abyssalKnight', weight: 2 }, { id: 'voidOrchestra', weight: 1 }] },
        { minWins: 15, count: [2, 3], pool: [{ id: 'phantomEmperor', weight: 4 }, { id: 'chaosWitch', weight: 3 }, { id: 'voidGargoyle', weight: 3 }, { id: 'voidOrchestra', weight: 2 }] }
      ]
    }
  ],
  foodMenu: {
    comingSoon: [
      { id: 'sapporoMiso', name: '札幌味噌ラーメン' },
      { id: 'asahikawaShoyu', name: '旭川醤油ラーメン' },
      { id: 'hakodateShio', name: '函館塩ラーメン' }
    ]
  },
  musicScores: {
    cadenzaLoot: { id: 'cadenzaLoot', title: 'CADENZA', subtitle: '戦利品のLOOT', artist: 'ZENAKADO', use: 'privateMode', description: '独奏卿ゼナカドから盗み出した禁断の楽譜。プライベートモードで演奏可能。' }
  },
  bossEquipmentSeries: {
    zenacad: {
      id: 'zenacad', name: 'ZENACAD SERIES', nameJa: 'ゼナカドシリーズ', stars: 5,
      unlockCondition: { bossDefeated: 'zenacad' },
      equipment: ['cadenza_staff', 'soloist_mask', 'soloist_coat', 'maestro_gloves', 'finale_boots', 'maestri_baton'],
      recipes: ['cadenza_staff_recipe', 'soloist_mask_recipe', 'soloist_coat_recipe', 'maestro_gloves_recipe', 'finale_boots_recipe', 'maestri_baton_recipe'],
      dismantle: { materialId: 'cadenza_fragment', count: 3 },
      setBonuses: {
        2: { id: 'solo', name: 'SOLO', description: 'MAG +5%', effect: { magPercent: 5 } },
        4: { id: 'maestro', name: 'MAESTRO', description: '魔法使用時10%でMP消費なし', effect: { freeMagicMpChance: .10 } },
        6: { id: 'cadenza', name: 'CADENZA', description: '魔法使用時5%で追加発動', effect: { magicRepeatChance: .05 } }
      }
    },
    myrthi: {
      id: 'myrthi', name: 'MYRTHI SERIES', nameJa: 'ミルティシリーズ', stars: 5,
      unlockCondition: { bossDefeated: 'myrthi' },
      equipment: ['myrthi_blade', 'myrthi_headband', 'myrthi_coat', 'myrthi_bangle', 'myrthi_boots', 'myrthi_metro'],
      recipes: ['myrthi_blade_recipe', 'myrthi_headband_recipe', 'myrthi_coat_recipe', 'myrthi_bangle_recipe', 'myrthi_boots_recipe', 'myrthi_metro_recipe'],
      dismantle: { materialId: 'myrthi_fragment', count: 3 },
      setBonuses: {
        2: { id: 'beat', name: 'BEAT', description: 'クリティカル率 +3%', effect: { critBonusFlat: .03 } },
        4: { id: 'accelerando', name: 'ACCELERANDO', description: 'クリティカル率さらに +5%', effect: { critBonusFlat: .05 } },
        6: { id: 'deadlyRhythm', name: 'DEADLY RHYTHM', description: '物理攻撃後5%で追加発動', effect: { physicalRepeatChance: .05 } }
      }
    }
  },
  recipes: {
    flameStaff: { id: 'flameStaff', name: 'フレイムスタッフ', craftCategory: 'weapon', dungeonId: 'dungeon1', resultItemId: 'flameStaff', resultCount: 1, gold: 120, materials: [{ itemId: 'manaDrop', count: 3 }, { itemId: 'magicPowder', count: 2 }, { itemId: 'stardustShard', count: 2 }] },
    wizardRod: { id: 'wizardRod', name: 'ウィザードロッド', craftCategory: 'weapon', dungeonId: 'dungeon1', resultItemId: 'wizardRod', resultCount: 1, gold: 220, materials: [{ itemId: 'manaDrop', count: 4 }, { itemId: 'moonstone', count: 2 }, { itemId: 'magicPowder', count: 3 }] },
    sunStaff: { id: 'sunStaff', name: '太陽の杖', craftCategory: 'weapon', dungeonId: 'dungeon1', resultItemId: 'sunStaff', resultCount: 1, gold: 400, materials: [{ itemId: 'moonstone', count: 3 }, { itemId: 'darkCore', count: 2 }, { itemId: 'manaDrop', count: 5 }] },
    roughHood: { id: 'roughHood', name: '粗削りフード', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'roughHood', resultCount: 1, gold: 40, materials: [{ itemId: 'slimeJelly', count: 2 }, { itemId: 'ratWhisker', count: 1 }] },
    shadowCap: { id: 'shadowCap', name: 'シャドウキャップ', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'shadowCap', resultCount: 1, gold: 90, materials: [{ itemId: 'manaDrop', count: 2 }, { itemId: 'stardustShard', count: 2 }] },
    arcaneHat: { id: 'arcaneHat', name: '魔導士の帽子', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'arcaneHat', resultCount: 1, gold: 160, materials: [{ itemId: 'manaDrop', count: 3 }, { itemId: 'moonstone', count: 1 }, { itemId: 'magicPowder', count: 2 }] },
    phantomMask: { id: 'phantomMask', name: '怪盗仮面', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'phantomMask', resultCount: 1, gold: 320, materials: [{ itemId: 'darkCore', count: 2 }, { itemId: 'moonstone', count: 2 }, { itemId: 'stardustShard', count: 3 }] },
    tatterCoat: { id: 'tatterCoat', name: 'ボロのコート', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'tatterCoat', resultCount: 1, gold: 40, materials: [{ itemId: 'gnawedBag', count: 2 }, { itemId: 'slimeJelly', count: 1 }] },
    leatherVest: { id: 'leatherVest', name: 'レザーベスト', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'leatherVest', resultCount: 1, gold: 90, materials: [{ itemId: 'gnawedBag', count: 3 }, { itemId: 'ratTail', count: 1 }] },
    shadowMantle: { id: 'shadowMantle', name: '影のマント', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'shadowMantle', resultCount: 1, gold: 190, materials: [{ itemId: 'gnawedBag', count: 3 }, { itemId: 'manaDrop', count: 3 }, { itemId: 'magicPowder', count: 1 }] },
    phantomSuit: { id: 'phantomSuit', name: '怪盗スーツ', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'phantomSuit', resultCount: 1, gold: 380, materials: [{ itemId: 'darkCore', count: 2 }, { itemId: 'gnawedBag', count: 4 }, { itemId: 'moonstone', count: 2 }] },
    roughGloves: { id: 'roughGloves', name: '粗削りグローブ', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'roughGloves', resultCount: 1, gold: 35, materials: [{ itemId: 'gnawedBag', count: 1 }, { itemId: 'ratWhisker', count: 2 }] },
    leatherGloves: { id: 'leatherGloves', name: 'レザーグローブ', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'leatherGloves', resultCount: 1, gold: 80, materials: [{ itemId: 'ratWhisker', count: 3 }, { itemId: 'ratTail', count: 1 }] },
    magicGloves: { id: 'magicGloves', name: '魔導グローブ', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'magicGloves', resultCount: 1, gold: 150, materials: [{ itemId: 'magicPowder', count: 3 }, { itemId: 'manaDrop', count: 2 }, { itemId: 'stardustShard', count: 1 }] },
    phantomGloves: { id: 'phantomGloves', name: '怪盗グローブ', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'phantomGloves', resultCount: 1, gold: 280, materials: [{ itemId: 'darkCore', count: 1 }, { itemId: 'ratWhisker', count: 4 }, { itemId: 'moonstone', count: 1 }] },
    roughBoots: { id: 'roughBoots', name: '粗削りブーツ', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'roughBoots', resultCount: 1, gold: 35, materials: [{ itemId: 'ratWhisker', count: 2 }, { itemId: 'gnawedBag', count: 1 }] },
    lightBoots: { id: 'lightBoots', name: '軽靴', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'lightBoots', resultCount: 1, gold: 80, materials: [{ itemId: 'ratTail', count: 2 }, { itemId: 'stolenCoin', count: 1 }] },
    swiftBoots: { id: 'swiftBoots', name: '疾走ブーツ', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'swiftBoots', resultCount: 1, gold: 150, materials: [{ itemId: 'stolenCoin', count: 2 }, { itemId: 'ratTail', count: 2 }, { itemId: 'magicPowder', count: 1 }] },
    phantomBoots: { id: 'phantomBoots', name: '怪盗ブーツ', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'phantomBoots', resultCount: 1, gold: 280, materials: [{ itemId: 'darkCore', count: 1 }, { itemId: 'stolenCoin', count: 3 }, { itemId: 'ratTail', count: 3 }] },
    silverRing: { id: 'silverRing', name: '銀の指輪', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'silverRing', resultCount: 1, gold: 80, materials: [{ itemId: 'stolenCoin', count: 3 }, { itemId: 'ratWhisker', count: 2 }] },
    manaStone: { id: 'manaStone', name: 'マナストーン', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'manaStone', resultCount: 1, gold: 110, materials: [{ itemId: 'manaDrop', count: 3 }, { itemId: 'stardustShard', count: 2 }] },
    shadowAmulet: { id: 'shadowAmulet', name: '影の護符', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'shadowAmulet', resultCount: 1, gold: 180, materials: [{ itemId: 'darkCore', count: 1 }, { itemId: 'magicPowder', count: 3 }, { itemId: 'moonstone', count: 1 }] },
    phantomBadge: { id: 'phantomBadge', name: '怪盗バッジ', craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'phantomBadge', resultCount: 1, gold: 360, materials: [{ itemId: 'darkCore', count: 2 }, { itemId: 'moonstone', count: 2 }, { itemId: 'stardustShard', count: 2 }] },
    lunaEdgeRecipe: { id: 'lunaEdgeRecipe', name: '月影剣ルナエッジ', craftCategory: 'weapon', dungeonId: 'dungeon2', materialUnlockId: 'silentNote', resultItemId: 'lunaEdge', resultCount: 1, gold: 450, materials: [{ itemId: 'silentNote', count: 5 }, { itemId: 'echoShard', count: 4 }, { itemId: 'spectralDust', count: 2 }] },
    silentHoodRecipe: { id: 'silentHoodRecipe', name: '静寂のフード', craftCategory: 'armor', dungeonId: 'dungeon2', materialUnlockId: 'violinString', resultItemId: 'silentHood', resultCount: 1, gold: 380, materials: [{ itemId: 'violinString', count: 4 }, { itemId: 'spectralDust', count: 3 }, { itemId: 'silentNote', count: 2 }] },
    abyssCoatRecipe: { id: 'abyssCoatRecipe', name: '深域の外套', craftCategory: 'armor', dungeonId: 'dungeon2', materialUnlockId: 'stoneShard', resultItemId: 'abyssCoat', resultCount: 1, gold: 520, materials: [{ itemId: 'stoneShard', count: 6 }, { itemId: 'reverbJelly', count: 4 }, { itemId: 'silentArmor', count: 2 }] },
    abyssGlovesRecipe: { id: 'abyssGlovesRecipe', name: '魔蝕のグローブ', craftCategory: 'armor', dungeonId: 'dungeon2', materialUnlockId: 'reverbJelly', resultItemId: 'abyssGloves', resultCount: 1, gold: 360, materials: [{ itemId: 'reverbJelly', count: 5 }, { itemId: 'echoShard', count: 3 }, { itemId: 'stoneShard', count: 3 }] },
    nightwalkerBootsRecipe: { id: 'nightwalkerBootsRecipe', name: '夜渡りのブーツ', craftCategory: 'armor', dungeonId: 'dungeon2', materialUnlockId: 'echoShard', resultItemId: 'nightwalkerBoots', resultCount: 1, gold: 360, materials: [{ itemId: 'echoShard', count: 5 }, { itemId: 'reverbJelly', count: 3 }, { itemId: 'violinString', count: 2 }] },
    echoPendantRecipe: { id: 'echoPendantRecipe', name: '残響のペンダント', craftCategory: 'armor', dungeonId: 'dungeon2', materialUnlockId: 'spectralDust', resultItemId: 'echoPendant', resultCount: 1, gold: 420, materials: [{ itemId: 'spectralDust', count: 4 }, { itemId: 'violinString', count: 3 }, { itemId: 'silentNote', count: 2 }] },
    voidBladeRecipe: { id: 'voidBladeRecipe', name: '虚空刃ヴォイドブレード', craftCategory: 'weapon', dungeonId: 'dungeon3', materialUnlockId: 'voidShard', resultItemId: 'voidBlade', resultCount: 1, gold: 800, materials: [{ itemId: 'voidShard', count: 6 }, { itemId: 'darkIron', count: 4 }, { itemId: 'phantomCore', count: 2 }] },
    chaosRodRecipe: { id: 'chaosRodRecipe', name: '混沌の魔杖カオスロッド', craftCategory: 'weapon', dungeonId: 'dungeon3', materialUnlockId: 'chaosDust', resultItemId: 'chaosRod', resultCount: 1, gold: 900, materials: [{ itemId: 'chaosDust', count: 6 }, { itemId: 'voidShard', count: 4 }, { itemId: 'voidEssence', count: 2 }] },
    voidHelmRecipe: { id: 'voidHelmRecipe', name: '虚空の兜', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'darkIron', resultItemId: 'voidHelm', resultCount: 1, gold: 550, materials: [{ itemId: 'darkIron', count: 5 }, { itemId: 'voidShard', count: 4 }, { itemId: 'phantomCore', count: 1 }] },
    abyssalArmorRecipe: { id: 'abyssalArmorRecipe', name: '深淵の鎧', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'darkIron', resultItemId: 'abyssalArmor', resultCount: 1, gold: 750, materials: [{ itemId: 'darkIron', count: 8 }, { itemId: 'voidShard', count: 5 }, { itemId: 'voidEssence', count: 1 }] },
    phantomGauntletRecipe: { id: 'phantomGauntletRecipe', name: '幻影拳甲', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'phantomCore', resultItemId: 'phantomGauntlet', resultCount: 1, gold: 600, materials: [{ itemId: 'phantomCore', count: 4 }, { itemId: 'darkIron', count: 4 }, { itemId: 'chaosDust', count: 3 }] },
    voidRingRecipe: { id: 'voidRingRecipe', name: '虚無の指輪', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'phantomCore', resultItemId: 'voidRing', resultCount: 1, gold: 1000, materials: [{ itemId: 'voidEssence', count: 4 }, { itemId: 'phantomCore', count: 4 }, { itemId: 'chaosDust', count: 3 }] },
    cadenza_staff_recipe: { id: 'cadenza_staff_recipe', seriesId: 'zenacad', craftCategory: 'boss', resultItemId: 'cadenza_staff', resultCount: 1, gold: 850, materials: [{ itemId: 'zenacad_core', count: 2 }, { itemId: 'cadenza_fragment', count: 8 }, { itemId: 'manaDrop', count: 6 }] },
    soloist_mask_recipe: { id: 'soloist_mask_recipe', seriesId: 'zenacad', craftCategory: 'boss', resultItemId: 'soloist_mask', resultCount: 1, gold: 620, materials: [{ itemId: 'zenacad_core', count: 1 }, { itemId: 'cadenza_fragment', count: 6 }, { itemId: 'moonstone', count: 3 }] },
    soloist_coat_recipe: { id: 'soloist_coat_recipe', seriesId: 'zenacad', craftCategory: 'boss', resultItemId: 'soloist_coat', resultCount: 1, gold: 780, materials: [{ itemId: 'zenacad_core', count: 2 }, { itemId: 'cadenza_fragment', count: 7 }, { itemId: 'tatteredRobe', count: 5 }] },
    maestro_gloves_recipe: { id: 'maestro_gloves_recipe', seriesId: 'zenacad', craftCategory: 'boss', resultItemId: 'maestro_gloves', resultCount: 1, gold: 560, materials: [{ itemId: 'zenacad_core', count: 1 }, { itemId: 'cadenza_fragment', count: 5 }, { itemId: 'magicPowder', count: 5 }] },
    finale_boots_recipe: { id: 'finale_boots_recipe', seriesId: 'zenacad', craftCategory: 'boss', resultItemId: 'finale_boots', resultCount: 1, gold: 560, materials: [{ itemId: 'zenacad_core', count: 1 }, { itemId: 'cadenza_fragment', count: 5 }, { itemId: 'stolenCoin', count: 6 }] },
    maestri_baton_recipe: { id: 'maestri_baton_recipe', seriesId: 'zenacad', craftCategory: 'boss', resultItemId: 'maestri_baton', resultCount: 1, gold: 700, materials: [{ itemId: 'zenacad_core', count: 2 }, { itemId: 'cadenza_fragment', count: 6 }, { itemId: 'stardustShard', count: 5 }] },
    myrthi_blade_recipe: { id: 'myrthi_blade_recipe', seriesId: 'myrthi', craftCategory: 'boss', resultItemId: 'myrthi_blade', resultCount: 1, gold: 1000, materials: [{ itemId: 'myrthi_core', count: 2 }, { itemId: 'myrthi_fragment', count: 8 }, { itemId: 'silentNote', count: 6 }] },
    myrthi_headband_recipe: { id: 'myrthi_headband_recipe', seriesId: 'myrthi', craftCategory: 'boss', resultItemId: 'myrthi_headband', resultCount: 1, gold: 700, materials: [{ itemId: 'myrthi_core', count: 1 }, { itemId: 'myrthi_fragment', count: 6 }, { itemId: 'violinString', count: 4 }] },
    myrthi_coat_recipe: { id: 'myrthi_coat_recipe', seriesId: 'myrthi', craftCategory: 'boss', resultItemId: 'myrthi_coat', resultCount: 1, gold: 900, materials: [{ itemId: 'myrthi_core', count: 2 }, { itemId: 'myrthi_fragment', count: 7 }, { itemId: 'silentArmor', count: 5 }] },
    myrthi_bangle_recipe: { id: 'myrthi_bangle_recipe', seriesId: 'myrthi', craftCategory: 'boss', resultItemId: 'myrthi_bangle', resultCount: 1, gold: 650, materials: [{ itemId: 'myrthi_core', count: 1 }, { itemId: 'myrthi_fragment', count: 5 }, { itemId: 'stoneShard', count: 6 }] },
    myrthi_boots_recipe: { id: 'myrthi_boots_recipe', seriesId: 'myrthi', craftCategory: 'boss', resultItemId: 'myrthi_boots', resultCount: 1, gold: 650, materials: [{ itemId: 'myrthi_core', count: 1 }, { itemId: 'myrthi_fragment', count: 5 }, { itemId: 'echoShard', count: 6 }] },
    myrthi_metro_recipe: { id: 'myrthi_metro_recipe', seriesId: 'myrthi', craftCategory: 'boss', resultItemId: 'myrthi_metro', resultCount: 1, gold: 800, materials: [{ itemId: 'myrthi_core', count: 2 }, { itemId: 'myrthi_fragment', count: 6 }, { itemId: 'spectralDust', count: 5 }] }
  },
  skills: {
    attack: { id: 'attack', name: 'たたかう', mp: 0, kind: 'weapon', target: 'single', power: 2, agiScale: 0 },

    // ══ 武器カテゴリ別の通常攻撃 ══════════════════════════════
    // 装備武器の weaponType から basicAttackByWeaponType で引かれる。
    // 剣は既存 attack をそのまま使用（力依存の物理攻撃）。
    // 3種の通常攻撃は同一の計算式（武器power × 参照ステータス）。参照する能力だけが異なる。
    //   剣 → 力 ／ 爪 → 素早さ ／ 杖 → 魔力
    martialStrike: { id: 'martialStrike', name: 'たたかう', nameEn: 'MARTIAL STRIKE', mp: 0, kind: 'weapon', weaponType: 'martial', target: 'single', agiScale: 0, damageType: 'physical', powerText: 'AGI依存', description: '拳と爪による打撃。素早さを参照する。' },
    staffFireball: { id: 'staffFireball', name: 'ファイアーボール', nameEn: 'FIREBALL', mp: 0, kind: 'weapon', weaponType: 'staff', target: 'single', agiScale: 0, damageType: 'magical', element: 'fire', powerText: 'MAG依存', effectText: '炎属性／MP消費なし', description: '杖に灯した炎弾を撃ち出す。杖の通常攻撃。' },

    // ══ 閃き技（対応する攻撃の使用中に閃く）═══════════════════
    // weaponType / prerequisiteSkill / requiredWeaponLevel / sparkRate で
    // 派生ツリーを構成する。戦闘コードに技ごとの条件は書かない。
    doubleSlash: {
      id: 'doubleSlash', name: '二段斬り', nameEn: 'DOUBLE SLASH', source: 'weapon', type: 'ACTIVE',
      weaponType: 'sword', prerequisiteSkill: 'attack', requiredWeaponLevel: 3, sparkRate: null,
      mp: 0, kind: 'physical', damageType: 'physical', target: 'single',
      power: 0.7, hitCount: 2, hits: 2, agiScale: 0, criticalModifier: 0,
      powerText: 'STR×0.7×2回', effectText: '2連撃／合計1.4倍', description: '踏み込みから返す刃で二度斬りつける。'
    },
    doubleClaw: {
      id: 'doubleClaw', name: 'ダブルクロー', nameEn: 'DOUBLE CLAW', source: 'weapon', type: 'ACTIVE',
      weaponType: 'martial', prerequisiteSkill: 'martialStrike', requiredWeaponLevel: 3, sparkRate: null,
      mp: 0, kind: 'physical', damageType: 'physical', target: 'single',
      power: 0.65, hitCount: 2, hits: 2, agiScale: 0, criticalModifier: 0.08,
      powerText: 'AGI×0.65×2回', effectText: '2連撃／各撃で会心判定＋会心率上昇', description: '両の爪で切り裂く連撃。会心を狙いやすい。'
    },
    fireStorm: {
      id: 'fireStorm', name: 'ファイアストーム', nameEn: 'FIRE STORM', source: 'weapon', type: 'ACTIVE',
      weaponType: 'staff', prerequisiteSkill: 'staffFireball', requiredWeaponLevel: 3, sparkRate: null,
      mp: 5, kind: 'magical', damageType: 'magical', element: 'fire', target: 'all',
      power: 0.7, hitCount: 1, agiScale: 0, criticalModifier: 0,
      powerText: 'MAG×0.7（全体）', effectText: '敵全体へ炎属性魔法', description: '渦巻く業火が戦場を包む。'
    },

    quickSlash: { id: 'quickSlash', name: 'クイックスラッシュ', nameEn: 'QUICK SLASH', source: 'character', type: 'ACTIVE', mp: 5, kind: 'physical', target: 'single', power: 3.5, agiScale: 0.8, powerText: 'ATK×3.5＋AGI×0.8', effectText: '素早さも威力へ加算', description: '素早い踏み込みから放つ斬撃。力と素早さを参照して敵単体へダメージを与える。' },
    flame: { id: 'flame', name: 'フラム', mp: 6, kind: 'magical', target: 'all', power: 0.8, agiScale: 0, elementId: 'fire' },
    fireball: { id: 'fireball', name: 'ファイアボール', mp: 5, kind: 'magical', target: 'single', power: 1.4, agiScale: 0, elementId: 'fire' },
    blueNote: { id: 'blueNote', name: 'ブルーノート', nameEn: 'BLUE NOTE', source: 'character', unlockLevel: 1, type: 'ACTIVE', kind: 'hybrid', target: 'single', mp: 5, power: 1, strScale: 1.7, magScale: 1.7, agiScale: 0, powerText: 'ATK×1.7＋MAG×1.7', effectText: '物理攻撃力と魔力の双方を参照', description: '青い魔力を武器へ纏わせて敵を攻撃する。物理攻撃力と魔力の双方を参照してダメージを与える。' },
    blueEcho: { id: 'blueEcho', name: '蒼の残響', nameEn: 'BLUE ECHO', source: 'character', unlockLevel: 3, type: 'PASSIVE', kind: 'passive', target: 'self', mp: 0, powerText: '－', effectText: 'ターン開始時20%でMAG +10%／2ターン。重複せず残り時間を更新', description: '戦いの中で魔力の波長を捉え、自らの魔力を高める。' },
    meditation: { id: 'meditation', name: '精神集中', nameEn: 'MEDITATION', source: 'character', unlockLevel: 5, type: 'ACTIVE', kind: 'support', target: 'self', mp: 0, cooldown: 3, powerText: '最大MPの10%', effect: { type: 'mpRecover', maxMpRate: .10 }, effectText: '最大MPの10%回復／クールタイム3ターン', description: '呼吸を整え、乱れた魔力を収束させる。自身のMPを回復する。' },
    powerCharge: { id: 'powerCharge', name: 'ちからため', nameEn: 'POWER CHARGE', source: 'job', jobId: 'warrior', unlockJobLevel: 1, type: 'ACTIVE', kind: 'support', target: 'self', mp: 0, cooldown: 3, powerText: '次の物理攻撃 ×3.5', effect: { type: 'selfAtkCharge', rate: 2.5 }, effectText: '次に使う物理攻撃の威力+250%／クールタイム3ターン', description: '全身に力を溜める。次に使用する物理攻撃の威力を大きく高める。' },
    burstFist: { id: 'burstFist', name: 'ばくれつけん', nameEn: 'BURST FIST', source: 'job', jobId: 'martialArtist', unlockJobLevel: 1, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 4, power: 1.5, hits: 3, agiScale: 0, powerText: 'ATK×1.5×3回', effectText: '3回連続攻撃／各攻撃で個別クリティカル判定', description: '目にも留まらぬ拳の連打を叩き込む。' },
    powerStrike: { id: 'powerStrike', name: '強撃', nameEn: 'POWER STRIKE', source: 'job', jobId: 'warrior', unlockJobLevel: 3, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 4, power: 4.2, agiScale: 0, powerText: 'ATK×4.2', effectText: '通常攻撃より高威力', description: '力を込めた一撃。ATKを参照して敵単体へ物理ダメージを与える。' },
    breakEdge: { id: 'breakEdge', name: 'ブレイクエッジ', nameEn: 'BREAK EDGE', source: 'job', jobId: 'warrior', unlockJobLevel: 6, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 7, power: 3.5, agiScale: 0, effect: { type: 'enemyDefDown', rate: .20, turns: 2 }, powerText: 'ATK×3.5', effectText: '敵DEF -20%／2ターン', description: '防御を断つ斬撃。物理ダメージと同時に敵のDEFを低下させる。' },
    recklessEdge: { id: 'recklessEdge', name: '捨て身斬り', nameEn: 'RECKLESS EDGE', source: 'job', jobId: 'warrior', unlockJobLevel: 9, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 10, power: 6.0, agiScale: 0, effect: { type: 'selfDefDown', rate: .20, turns: 2 }, powerText: 'ATK×6.0', effectText: '使用後、自身のDEF -20%／2ターン', description: '守りを捨てて放つ高威力の斬撃。' },
    blueFlame: { id: 'blueFlame', name: '蒼炎弾', nameEn: 'BLUE FLAME', source: 'job', jobId: 'mage', unlockJobLevel: 3, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 6, power: 4.2, agiScale: 0, powerText: 'MAG×4.2', effectText: '敵単体へ魔法ダメージ', description: '蒼い炎を凝縮し、敵単体へ撃ち出す魔法。' },
    manaBurst: { id: 'manaBurst', name: '魔力炸裂', nameEn: 'MANA BURST', source: 'job', jobId: 'mage', unlockJobLevel: 6, type: 'ACTIVE', kind: 'magical', target: 'all', mp: 12, power: 2.8, agiScale: 0, powerText: 'MAG×2.8', effectText: '敵全体へ魔法ダメージ', description: '周囲へ魔力を炸裂させ、敵全体を攻撃する。' },
    astralRay: { id: 'astralRay', name: 'アストラルレイ', nameEn: 'ASTRAL RAY', source: 'job', jobId: 'mage', unlockJobLevel: 9, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 15, power: 6.5, agiScale: 0, powerText: 'MAG×6.5', effectText: '敵単体へ高威力魔法攻撃', description: '大量のMPを収束した星幽の光線で敵を貫く。' },
    doubleStrike: { id: 'doubleStrike', name: '連撃', nameEn: 'DOUBLE STRIKE', source: 'job', jobId: 'martialArtist', unlockJobLevel: 3, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 6, power: 2.0, hits: 2, agiScale: 0, powerText: 'ATK×2.0×2回', effectText: '2回攻撃／各攻撃で個別クリティカル判定', description: '間を置かず二撃を叩き込む。' },
    breakFist: { id: 'breakFist', name: '崩拳', nameEn: 'BREAK FIST', source: 'job', jobId: 'martialArtist', unlockJobLevel: 6, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 8, power: 3.8, ignoreDef: .40, agiScale: 0, powerText: 'ATK×3.8', effectText: '敵DEFを40%無視', description: '防御の隙間へ衝撃を通し、敵DEFの一部を無視する。' },
    shadowRush: { id: 'shadowRush', name: '無影連舞', nameEn: 'SHADOW RUSH', source: 'job', jobId: 'martialArtist', unlockJobLevel: 9, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 12, power: 2.0, hits: 3, agiScale: 0, powerText: 'ATK×2.0×3回', effectText: '3回攻撃／各攻撃で個別クリティカル判定', description: '影すら残さない三連撃。' },
    heal: { id: 'heal', name: 'ヒール', nameEn: 'HEAL', source: 'job', jobId: 'priest', unlockJobLevel: 3, type: 'ACTIVE', kind: 'support', target: 'self', mp: 6, powerText: 'MND×3.0＋20', effect: { type: 'hpRecover', mndScale: 3, base: 20 }, effectText: 'MND参照で自身のHP回復', description: '精神力を癒やしの力へ変え、自身のHPを回復する。' },
    holyLight: { id: 'holyLight', name: 'ホーリーライト', nameEn: 'HOLY LIGHT', source: 'job', jobId: 'priest', unlockJobLevel: 6, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 8, power: 4.0, agiScale: 0, elementId: 'light', powerText: 'MAG×4.0', effectText: '敵単体へ光属性魔法攻撃', description: '聖なる光を放ち、敵単体へ魔法ダメージを与える。' },
    regenerate: { id: 'regenerate', name: 'リジェネレート', nameEn: 'REGENERATE', source: 'job', jobId: 'priest', unlockJobLevel: 9, type: 'ACTIVE', kind: 'support', target: 'self', mp: 10, powerText: '最大HPの12%×3回', effect: { type: 'regenerate', maxHpRate: .12, turns: 3 }, effectText: '3ターン、ターン開始時にHP回復', description: '継続する癒やしの力を自身へ付与する。' },
    warCry: { id: 'warCry', name: '雄叫び', nameEn: 'WAR CRY', source: 'job', jobId: 'warrior', unlockJobLevel: 12, type: 'ACTIVE', kind: 'support', target: 'self', mp: 0, cooldown: 4, powerText: '自身DEF +35%／3T', effect: { type: 'selfDefUp', rate: .35, turns: 3 }, effectText: '自身のDEF +35%／3ターン、CT4', description: '魂の底から放つ雄叫び。一時的に防御力を大幅に高める。' },
    titanBlow: { id: 'titanBlow', name: '天地崩拳', nameEn: 'TITAN BLOW', source: 'job', jobId: 'warrior', unlockJobLevel: 16, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 14, power: 8.0, agiScale: 0, powerText: 'ATK×8.0', effectText: '極大物理ダメージ', description: '全身の力を一点に凝縮した、天地を砕く究極の一撃。' },
    arcaneExplosion: { id: 'arcaneExplosion', name: '魔力爆発', nameEn: 'ARCANE EXPLOSION', source: 'job', jobId: 'mage', unlockJobLevel: 12, type: 'ACTIVE', kind: 'magical', target: 'all', mp: 16, power: 3.8, agiScale: 0, powerText: 'MAG×3.8', effectText: '敵全体へ高威力魔法攻撃', description: '体内に蓄えた魔力を一気に爆発させ、周囲の敵すべてを薙ぎ払う。' },
    voidNova: { id: 'voidNova', name: '虚空の星霊', nameEn: 'VOID NOVA', source: 'job', jobId: 'mage', unlockJobLevel: 16, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 20, power: 9.0, agiScale: 0, powerText: 'MAG×9.0', effectText: '敵単体へ極大魔法攻撃', description: '虚空から星霊の力を引き出した究極魔法。魔導士の到達点。' },
    swiftBarrage: { id: 'swiftBarrage', name: '迅雷四連撃', nameEn: 'SWIFT BARRAGE', source: 'job', jobId: 'martialArtist', unlockJobLevel: 12, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 12, power: 2.0, hits: 4, agiScale: 0, powerText: 'ATK×2.0×4回', effectText: '4回攻撃／各攻撃で個別クリティカル判定', description: '稲妻のような四連撃。体術の極みが生み出す怒涛の連打。' },
    shadowSeven: { id: 'shadowSeven', name: '幻影七閃', nameEn: 'SHADOW SEVEN', source: 'job', jobId: 'martialArtist', unlockJobLevel: 16, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 18, power: 2.5, hits: 5, agiScale: 0, powerText: 'ATK×2.5×5回', effectText: '5回攻撃／各攻撃で個別クリティカル判定', description: '影を七つに見せる五連閃。武道家の至高の多段技。' },
    greatHeal: { id: 'greatHeal', name: 'グレートヒール', nameEn: 'GREAT HEAL', source: 'job', jobId: 'priest', unlockJobLevel: 12, type: 'ACTIVE', kind: 'support', target: 'self', mp: 12, powerText: 'MND×5.0＋40', effect: { type: 'hpRecover', mndScale: 5, base: 40 }, effectText: 'MND参照で大量HP回復', description: '精神力のすべてを傾けた大回復術。大きく傷を癒やし、戦場への帰還を可能にする。' },
    divineSmite: { id: 'divineSmite', name: '神裁の一閃', nameEn: 'DIVINE SMITE', source: 'job', jobId: 'priest', unlockJobLevel: 16, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 22, power: 7.0, agiScale: 0, elementId: 'light', powerText: 'MAG×7.0', effectText: '敵単体へ極大光属性魔法攻撃', description: '神の裁定を下す一閃。光を凝縮した究極の聖魔法。' },
    resonantSpell: { id: 'resonantSpell', name: '共鳴魔法', nameEn: 'RESONANT SPELL', source: 'job', jobId: 'arcaneMaestro', unlockJobLevel: 3, type: 'ACTIVE', kind: 'magical', target: 'all', mp: 14, power: 3.2, agiScale: 0, powerText: 'MAG×3.2', effectText: '敵全体へ魔法攻撃', description: '魔奏士の共鳴する魔力を解き放ち、敵全体を攻撃する。' },
    celestialNote: { id: 'celestialNote', name: '天韻の一節', nameEn: 'CELESTIAL NOTE', source: 'job', jobId: 'arcaneMaestro', unlockJobLevel: 6, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 18, power: 8.0, agiScale: 0, powerText: 'MAG×8.0', effectText: '敵単体へ強力な魔法攻撃', description: '天上の旋律を一音に凝縮した、高威力の魔法弾。' },
    divineMelody: { id: 'divineMelody', name: '神癒の律動', nameEn: 'DIVINE MELODY', source: 'job', jobId: 'arcaneMaestro', unlockJobLevel: 9, type: 'ACTIVE', kind: 'support', target: 'self', mp: 16, powerText: 'MND×6.0＋50', effect: { type: 'hpRecover', mndScale: 6, base: 50 }, effectText: 'MND参照で大量HP回復', description: '神聖な旋律の加護により、大量のHPを回復する。' },
    grandOrchestra: { id: 'grandOrchestra', name: '大演奏', nameEn: 'GRAND ORCHESTRA', source: 'job', jobId: 'arcaneMaestro', unlockJobLevel: 12, type: 'ACTIVE', kind: 'magical', target: 'all', mp: 22, power: 4.5, agiScale: 0, powerText: 'MAG×4.5', effectText: '敵全体へ高威力魔法攻撃', description: '全ての魔力を交響曲として解き放つ。敵全体を薙ぎ払う大魔法。' },
    cosmicAria: { id: 'cosmicAria', name: '宇宙の詠唱', nameEn: 'COSMIC ARIA', source: 'job', jobId: 'arcaneMaestro', unlockJobLevel: 16, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 28, power: 11.0, agiScale: 0, powerText: 'MAG×11.0', effectText: '敵単体へ極大魔法攻撃', description: '宇宙の律動を一点に収束させた究極魔法。魔奏士の境地。' },
    twistingEdge: { id: 'twistingEdge', name: '連刃突き', nameEn: 'TWISTING EDGE', source: 'job', jobId: 'dualBlade', unlockJobLevel: 3, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 8, power: 2.5, hits: 2, agiScale: 0, powerText: 'ATK×2.5×2回', effectText: '2回物理攻撃', description: '双刃を連続して突き込む。' },
    sunderDance: { id: 'sunderDance', name: '乱舞斬', nameEn: 'SUNDER DANCE', source: 'job', jobId: 'dualBlade', unlockJobLevel: 6, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 12, power: 2.0, hits: 3, ignoreDef: .20, agiScale: 0, powerText: 'ATK×2.0×3回', effectText: '3回攻撃 / DEF20%無視', description: '舞うように放つ三連斬。防御を部分的に無視する。' },
    crimsonRush: { id: 'crimsonRush', name: '黒紅突進', nameEn: 'CRIMSON RUSH', source: 'job', jobId: 'dualBlade', unlockJobLevel: 9, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 15, power: 7.0, ignoreDef: .30, agiScale: 0, powerText: 'ATK×7.0', effectText: 'DEF30%無視の高威力突進', description: '黒紅の軌跡を描きながら敵へ一直線に突進する。' },
    dualEdgeBarrage: { id: 'dualEdgeBarrage', name: '双刃乱打', nameEn: 'DUAL EDGE BARRAGE', source: 'job', jobId: 'dualBlade', unlockJobLevel: 12, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 16, power: 1.8, hits: 5, agiScale: 0, powerText: 'ATK×1.8×5回', effectText: '5回物理攻撃', description: '双刃を猛烈に振り回す五連打。各攻撃が個別にクリティカルを狙う。' },
    battleDance: { id: 'battleDance', name: '戦姫乱舞', nameEn: 'BATTLE DANCE', source: 'job', jobId: 'dualBlade', unlockJobLevel: 16, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 24, power: 2.0, hits: 7, agiScale: 0, powerText: 'ATK×2.0×7回', effectText: '7回物理攻撃 // 双刃士の頂点', description: '戦場を舞台に踊るような七連撃。双刃士の奥義。' }
  },
  items: {
    potion: { id: 'potion', name: '回復薬', category: 'consumable', rarity: 'common', description: 'HPを30回復する。', effect: { hp: 30 } },
    slimeJelly: { id: 'slimeJelly', name: 'スライムゼリー', category: 'material', rarity: 'common', description: 'シャドウスライムから採れる不思議なゼリー。' },
    manaPotion: { id: 'manaPotion', name: '魔力回復薬', category: 'consumable', rarity: 'common', description: 'MPを20回復する。', effect: { mp: 20 } },
    mageStaff: { id: 'mageStaff', name: '魔導士の杖', category: 'equipment', slot: 'rightHand', rarity: 'common', description: '青い魔力を導く魔導士の基本杖。' },
    phantomSword: { id: 'phantomSword', name: '青影の剣', category: 'equipment', slot: 'rightHand', rarity: 'common', description: '青い残光を引く怪盗の細身剣。' },
    ironClaw: { id: 'ironClaw', name: '鉄の爪', category: 'equipment', slot: 'rightHand', rarity: 'common', description: '拳に装着する鋼の爪。素早い連撃に適する。' },
    shadowWand: { id: 'shadowWand', name: 'シャドウワンド', category: 'equipment', slot: 'rightHand', rarity: 'rare', description: '闇の魔力を帯びたシャドウスライム由来の杖。' },
    slimeRing: { id: 'slimeRing', name: 'スライムリング', category: 'equipment', slot: 'accessory', rarity: 'rare', description: '不思議な弾力を持つ魔力の指輪。' },
    darkCore: { id: 'darkCore', name: 'ダークコア', category: 'material', rarity: 'epic', description: 'シャドウスライムの核。強い闇の魔力を宿している。' },
    manaDrop: { id: 'manaDrop', name: 'マナドロップ', category: 'material', rarity: 'common', description: '魔力が結晶化した水滴。魔法系装備の素材になる。' },
    stardustShard: { id: 'stardustShard', name: '星屑のかけら', category: 'material', rarity: 'common', description: 'ほのかに光る砂状の素材。' },
    magicPowder: { id: 'magicPowder', name: '魔法粉', category: 'material', rarity: 'common', description: '淡く光る粉末。薬や装備の製作に使う。' },
    moonstone: { id: 'moonstone', name: '月光石', category: 'material', rarity: 'rare', description: '月の光を閉じ込めたような半透明の石。' },
    tatteredRobe: { id: 'tatteredRobe', name: 'ボロローブ', category: 'material', rarity: 'common', description: 'ソルメイジのかけらしのローブ。素材として使える。' },
    soulRobe: { id: 'soulRobe', name: 'ソルローブ', category: 'equipment', slot: 'body', rarity: 'rare', source: 'dropOnly', description: 'ソルメイジの魂布で編まれた魔導ローブ。工房の第三段階装備に迫る魔法性能を持つ。' },
    gnawedBag: { id: 'gnawedBag', name: '齧られた袋', category: 'material', rarity: 'common', description: '盗鼠に噛み荒らされた布袋。' },
    ratWhisker: { id: 'ratWhisker', name: '鼠の髭', category: 'material', rarity: 'common', description: '盗鼠から採れる感覚器官。細く丈夫。' },
    stolenCoin: { id: 'stolenCoin', name: '盗まれた硬貨', category: 'material', rarity: 'common', description: '盗鼠が奪った硬貨。不思議な力を帯びている。' },
    ratTail: { id: 'ratTail', name: '鼠の尻尾', category: 'material', rarity: 'common', description: '盗鼠の細い尾。腱が強く、加工素材に向く。' },
    ratBoots: { id: 'ratBoots', name: 'ラットブーツ', category: 'equipment', slot: 'feet', rarity: 'rare', source: 'dropOnly', description: '盗鼠の俊敏さを宿す軽量ブーツ。足音を消し、素早い踏み込みを可能にする。' },
    flameStaff: { id: 'flameStaff', name: 'フレイムスタッフ', category: 'equipment', slot: 'rightHand', rarity: 'epic', description: '紅蓮の魔力を宿した杖。振るうと全体に炎の波動が広がる。' },
    wizardRod: { id: 'wizardRod', name: 'ウィザードロッド', category: 'equipment', slot: 'rightHand', rarity: 'epic', description: '熟練の魔導士が用いる杖。狙った一点を穿つ炎弾を放てる。' },
    sunStaff: { id: 'sunStaff', name: '太陽の杖', category: 'equipment', slot: 'rightHand', rarity: 'epic', description: '太陽そのものを封じたような杖。振るうだけで敵を圧倒する光と熱を放つ。' },
    roughHood: { id: 'roughHood', name: '粗削りフード', category: 'equipment', slot: 'head', rarity: 'common', description: '廃材をつなぎ合わせた粗い頭巾。ないよりはまし。' },
    shadowCap: { id: 'shadowCap', name: 'シャドウキャップ', category: 'equipment', slot: 'head', rarity: 'common', description: '影の素材を編み込んだ帽子。魔力も身も守る。' },
    arcaneHat: { id: 'arcaneHat', name: '魔導士の帽子', category: 'equipment', slot: 'head', rarity: 'rare', description: '魔導系の紋様が刻まれた帽子。精神力と魔力を高める。' },
    phantomMask: { id: 'phantomMask', name: '怪盗仮面', category: 'equipment', slot: 'head', rarity: 'epic', description: '怪盗の象徴となる黒い仮面。着けるだけで身が引き締まる。' },
    tatterCoat: { id: 'tatterCoat', name: 'ボロのコート', category: 'equipment', slot: 'body', rarity: 'common', description: 'ダンジョンで拾った使い古しのコート。防御にはなる。' },
    leatherVest: { id: 'leatherVest', name: 'レザーベスト', category: 'equipment', slot: 'body', rarity: 'common', description: '鼠革を重ねて縫ったベスト。頑丈な作りが防御を高める。' },
    shadowMantle: { id: 'shadowMantle', name: '影のマント', category: 'equipment', slot: 'body', rarity: 'rare', description: '影の力を宿した漆黒のマント。物理・精神双方を守る。' },
    phantomSuit: { id: 'phantomSuit', name: '怪盗スーツ', category: 'equipment', slot: 'body', rarity: 'epic', description: '怪盗仕様の強化スーツ。機動性も守備力も高水準を誇る。' },
    roughGloves: { id: 'roughGloves', name: '粗削りグローブ', category: 'equipment', slot: 'arms', rarity: 'common', description: '鼠の毛皮を丸めて作ったグローブ。器用さが微増する。' },
    leatherGloves: { id: 'leatherGloves', name: 'レザーグローブ', category: 'equipment', slot: 'arms', rarity: 'common', description: '薄い革を二重に縫い合わせたグローブ。器用さと防御を両立。' },
    magicGloves: { id: 'magicGloves', name: '魔導グローブ', category: 'equipment', slot: 'arms', rarity: 'rare', description: '指先に魔法陣が刻まれた手袋。魔力の流れを強化する。' },
    phantomGloves: { id: 'phantomGloves', name: '怪盗グローブ', category: 'equipment', slot: 'arms', rarity: 'epic', description: '怪盗御用達の精密グローブ。器用さと機動力を同時に引き上げる。' },
    roughBoots: { id: 'roughBoots', name: '粗削りブーツ', category: 'equipment', slot: 'feet', rarity: 'common', description: '鼠の皮で作った簡素なブーツ。素足よりは速い。' },
    lightBoots: { id: 'lightBoots', name: '軽靴', category: 'equipment', slot: 'feet', rarity: 'common', description: '軽量素材で作られた靴。素早さが増す。' },
    swiftBoots: { id: 'swiftBoots', name: '疾走ブーツ', category: 'equipment', slot: 'feet', rarity: 'rare', description: '盗まれた硬貨の呪力を宿したブーツ。足取りが格段に軽くなる。' },
    phantomBoots: { id: 'phantomBoots', name: '怪盗ブーツ', category: 'equipment', slot: 'feet', rarity: 'epic', description: '怪盗専用の高機動ブーツ。走破力と精密さを兼ね備える。' },
    silverRing: { id: 'silverRing', name: '銀の指輪', category: 'equipment', slot: 'accessory', rarity: 'common', description: '磨かれた銀の指輪。運と体力を引き上げる。' },
    manaStone: { id: 'manaStone', name: 'マナストーン', category: 'equipment', slot: 'accessory', rarity: 'rare', description: 'マナの結晶を加工した護石。MPと魔力が増大する。' },
    shadowAmulet: { id: 'shadowAmulet', name: '影の護符', category: 'equipment', slot: 'accessory', rarity: 'rare', description: '影の力が宿った護符。守りと精神を底上げする。' },
    phantomBadge: { id: 'phantomBadge', name: '怪盗バッジ', category: 'equipment', slot: 'accessory', rarity: 'epic', description: '怪盗の証。すべての能力をまんべんなく高める万能の証。' },
    rustedKnife: { id: 'rustedKnife', name: 'サビたナイフ', category: 'material', rarity: 'common', description: 'ゴブリンが持つ錆びたナイフ。使い古された安物の得物。' },
    tornCloth: { id: 'tornCloth', name: 'ボロ布切れ', category: 'material', rarity: 'common', description: 'ゴブリンが身につけていたボロ布の切れ端。' },
    goblinMedicine: { id: 'goblinMedicine', name: 'ゴブリンの薬', category: 'material', rarity: 'common', description: 'ゴブリンが調合する怪しげな薬草。素材として使える。' },
    goblinEarring: { id: 'goblinEarring', name: 'ゴブリンの耳飾り', category: 'equipment', slot: 'accessory', rarity: 'epic', description: 'ゴブリンの首領が着けていたという耳飾り。微かな加護が宿る。' },
    goblinGloves: { id: 'goblinGloves', name: 'ゴブリングローブ', category: 'equipment', slot: 'arms', rarity: 'rare', source: 'dropOnly', description: 'ゴブリンの荒々しい腕力を宿す革手袋。力任せの一撃を強化する。' },
    batFang: { id: 'batFang', name: 'コウモリの牙', category: 'material', rarity: 'common', description: '鋭く尖ったコウモリの牙。加工素材として重宝される。' },
    tornWingMembrane: { id: 'tornWingMembrane', name: '破れた翼膜', category: 'material', rarity: 'common', description: '薄く裂けたコウモリの翼膜。' },
    beastBlood: { id: 'beastBlood', name: '夜獣の血', category: 'material', rarity: 'rare', description: '夜の魔獣から採れる濃い血液。魔力を帯びている。' },
    obsidianFang: { id: 'obsidianFang', name: '黒曜の牙', category: 'material', rarity: 'epic', description: '黒曜石のように黒く輝く牙。強い魔力を宿す希少な素材。' },
    nightHat: { id: 'nightHat', name: 'ナイトハット', category: 'equipment', slot: 'head', rarity: 'rare', source: 'dropOnly', description: 'ナイトバットの翼膜を仕立てた闇色の帽子。夜目と反応速度を高める。' },
    spiritFragment: { id: 'spiritFragment', name: '霊のかけら', category: 'material', rarity: 'common', description: '彷徨う魂の欠片。ほのかに冷たい。' },
    oldBone: { id: 'oldBone', name: '古びた骨', category: 'material', rarity: 'common', description: '朽ちかけた古い骨。加工素材になる。' },
    darkSoulStone: { id: 'darkSoulStone', name: '闇の魂石', category: 'material', rarity: 'rare', description: '闇の魂が凝縮した石。禍々しい気配を纏う。' },
    resentmentCrystal: { id: 'resentmentCrystal', name: '怨念の結晶', category: 'material', rarity: 'rare', description: '強い怨念が結晶化したもの。触れると微かに疼く。' },
    silentNote: { id: 'silentNote', name: '無音の楽譜', category: 'material', rarity: 'uncommon', description: '音を封じ込めた楽譜の切れ端。静寂が染みついている。' },
    echoShard: { id: 'echoShard', name: 'エコーの欠片', category: 'material', rarity: 'uncommon', description: '消えかけた音の残響が結晶化した欠片。' },
    stoneShard: { id: 'stoneShard', name: '石像の破片', category: 'material', rarity: 'common', description: '石像から砕け落ちた欠片。魔力を帯びている。' },
    violinString: { id: 'violinString', name: '亡霊のヴァイオリン弦', category: 'material', rarity: 'uncommon', description: '音を奪われた楽器から抜き取った弦。かすかに振動する。' },
    spectralDust: { id: 'spectralDust', name: '霊幻の粉塵', category: 'material', rarity: 'rare', description: '精霊が消滅する際に生じる粉塵。淡い紫色に輝く。' },
    reverbJelly: { id: 'reverbJelly', name: 'リバーブゼリー', category: 'material', rarity: 'common', description: '残響スライムの体液が固まったゼリー状の物質。' },
    silentArmor: { id: 'silentArmor', name: '静寂の装甲片', category: 'material', rarity: 'rare', description: 'サイレント・ナイトの甲冑から剥がれた欠片。音を吸収する。' },
    cursedNecklace: { id: 'cursedNecklace', name: '呪われた首飾り', category: 'equipment', slot: 'accessory', rarity: 'epic', description: '呪いを宿す首飾り。身につける者に力を与えるという。' },
    lunaEdge: { id: 'lunaEdge', name: '月影剣ルナエッジ', nameEn: 'LUNA EDGE', category: 'equipment', slot: 'rightHand', rarity: 'epic', dungeonId: 'dungeon2', description: '深域に沈む月影鉱から鍛えられた刃。暗闇の中で淡い月光を宿す。' },
    silentHood: { id: 'silentHood', name: '静寂のフード', nameEn: 'SILENT HOOD', category: 'equipment', slot: 'head', rarity: 'epic', dungeonId: 'dungeon2', description: '深域の魔力を織り込んだ頭装備。周囲の雑音を遮断し、術者の集中力を高める。' },
    abyssCoat: { id: 'abyssCoat', name: '深域の外套', nameEn: 'ABYSS COAT', category: 'equipment', slot: 'body', rarity: 'epic', dungeonId: 'dungeon2', description: '深域を漂う魔力から仕立てられた黒衣。見た目以上に強固な魔力障壁を持つ。' },
    abyssGloves: { id: 'abyssGloves', name: '魔蝕のグローブ', nameEn: 'ARCANE GLOVES', category: 'equipment', slot: 'arms', rarity: 'epic', dungeonId: 'dungeon2', description: '魔力を帯びた素材で作られた手袋。武器と魔法、双方の制御を補助する。' },
    nightwalkerBoots: { id: 'nightwalkerBoots', name: '夜渡りのブーツ', nameEn: 'NIGHTWALKER BOOTS', category: 'equipment', slot: 'feet', rarity: 'epic', dungeonId: 'dungeon2', description: '深域を音もなく歩くための軽装靴。身につけた者の足取りを闇へ溶かす。' },
    echoPendant: { id: 'echoPendant', name: '残響のペンダント', nameEn: 'ECHO PENDANT', category: 'equipment', slot: 'accessory', rarity: 'epic', dungeonId: 'dungeon2', description: '失われた旋律の残響を封じ込めたペンダント。最大MPと魔力を高める。' },
    zenacad_core: { id: 'zenacad_core', name: '独奏卿の魔核', nameEn: 'ZENACAD CORE', category: 'material', rarity: 'legendary', bossId: 'zenacad', description: '独奏卿の魔力と旋律が凝縮した魔核。ゼナカドシリーズの中核素材。' },
    cadenza_fragment: { id: 'cadenza_fragment', name: '魔奏の欠片', nameEn: 'CADENZA FRAGMENT', category: 'material', rarity: 'epic', bossId: 'zenacad', description: '魔力へ変換された音の欠片。ボス装備の製作・再構成に使う。' },
    voidShard: { id: 'voidShard', name: '虚空の欠片', nameEn: 'VOID SHARD', category: 'material', rarity: 'uncommon', dungeonId: 'dungeon3', description: '崩界の深廊で採れる虚無の結晶の断片。武器・防具の素材となる。' },
    darkIron: { id: 'darkIron', name: '深淵鉄鉱', nameEn: 'DARK IRON', category: 'material', rarity: 'uncommon', dungeonId: 'dungeon3', description: '深淵の騎士が纏う黒鎧と同質の鉄鉱石。硬度が極めて高い。' },
    chaosDust: { id: 'chaosDust', name: '混沌の粉塵', nameEn: 'CHAOS DUST', category: 'material', rarity: 'rare', dungeonId: 'dungeon3', description: 'カオス・ウィッチが操る混沌エネルギーが粉末状に凝固したもの。魔力増幅素材。' },
    phantomCore: { id: 'phantomCore', name: '幻影核', nameEn: 'PHANTOM CORE', category: 'material', rarity: 'rare', dungeonId: 'dungeon3', description: '幻影皇の核心部から生まれる幻影の結晶。高度な装備製作に用いられる。' },
    voidEssence: { id: 'voidEssence', name: '虚無の精髄', nameEn: 'VOID ESSENCE', category: 'material', rarity: 'epic', dungeonId: 'dungeon3', description: '虚無の楽団が奏でる虚空の旋律が液化したもの。最高位のダンジョン素材。' },
    voidHelm: { id: 'voidHelm', name: '虚空の兜', nameEn: 'VOID HELM', category: 'equipment', slot: 'head', rarity: 'epic', dungeonId: 'dungeon3', description: '崩界の深廊の素材で鍛えた兜。精神と防御を高める。' },
    abyssalArmor: { id: 'abyssalArmor', name: '深淵の鎧', nameEn: 'ABYSSAL ARMOR', category: 'equipment', slot: 'body', rarity: 'epic', dungeonId: 'dungeon3', description: '深淵鉄鉱を用いた最高位の鎧。強靭な防御力を誇る。' },
    phantomGauntlet: { id: 'phantomGauntlet', name: '幻影拳甲', nameEn: 'PHANTOM GAUNTLET', category: 'equipment', slot: 'arms', rarity: 'epic', dungeonId: 'dungeon3', description: '幻影核の力が宿る拳甲。攻撃力と俊敏を高める。' },
    voidRing: { id: 'voidRing', name: '虚無の指輪', nameEn: 'VOID RING', category: 'equipment', slot: 'accessory', rarity: 'epic', dungeonId: 'dungeon3', description: '虚無の精髄を封じた指輪。あらゆる能力値を高める。' },
    cadenza_staff: { id: 'cadenza_staff', name: '魔杖カデンツァ', nameEn: 'CADENZA', category: 'equipment', slot: 'rightHand', rarity: 'legendary', stars: 5, seriesId: 'zenacad', description: '独奏卿ゼナカドが振るった魔導指揮杖。杖が描く軌跡に魔力が追従し、ひとりの術者を楽団へと変える。' },
    soloist_mask: { id: 'soloist_mask', name: '独奏卿の仮面', nameEn: 'SOLOIST MASK', category: 'equipment', slot: 'head', rarity: 'legendary', stars: 5, seriesId: 'zenacad', description: 'ゼナカドが身につけていた、片眼を覆う妖艶な仮面。' },
    soloist_coat: { id: 'soloist_coat', name: '独奏卿の燕尾服', nameEn: 'SOLOIST COAT', category: 'equipment', slot: 'body', rarity: 'legendary', stars: 5, seriesId: 'zenacad', description: '黒・紫・金で仕立てられた独奏卿の燕尾服。魔力と精神を守る。' },
    maestro_gloves: { id: 'maestro_gloves', name: '指揮者の白手袋', nameEn: 'MAESTRO GLOVES', category: 'equipment', slot: 'arms', rarity: 'legendary', stars: 5, seriesId: 'zenacad', description: '精緻な魔法制御を可能にする、指揮者の白手袋。' },
    finale_boots: { id: 'finale_boots', name: '終演の革靴', nameEn: 'FINALE BOOTS', category: 'equipment', slot: 'feet', rarity: 'legendary', stars: 5, seriesId: 'zenacad', description: '終演まで歩みを止めない、高速連続行動のための革靴。' },
    maestri_baton: { id: 'maestri_baton', name: '七奏のタクト', nameEn: 'MAESTRI BATON', category: 'equipment', slot: 'accessory', rarity: 'legendary', stars: 5, seriesId: 'zenacad', description: '七つの音を束ねる者の証。正体不明の旋律が微かに脈打つ。' },
    myrthi_core: { id: 'myrthi_core', name: '双刃戦姫の魔核', nameEn: 'MYRTHI CORE', category: 'material', rarity: 'legendary', bossId: 'myrthi', description: 'ミルティの踊るような戦闘から生まれた魔核。ミルティシリーズの中核素材。' },
    myrthi_fragment: { id: 'myrthi_fragment', name: '黒紅の欠片', nameEn: 'CRIMSON FRAGMENT', category: 'material', rarity: 'epic', bossId: 'myrthi', description: '双刃が砕け散った黒紅の結晶片。ボス装備の製作に使う。' },
    myrthi_blade: { id: 'myrthi_blade', name: '黒紅刃ミルティア', nameEn: 'MYRTHI BLADE', category: 'equipment', slot: 'rightHand', rarity: 'legendary', stars: 5, seriesId: 'myrthi', description: 'ミルティが舞い踊るように振るう漆黒と深紅の双刃。武道家・双刃士が装備できる。' },
    myrthi_headband: { id: 'myrthi_headband', name: '律動の髪飾り', nameEn: 'RHYTHM HEADBAND', category: 'equipment', slot: 'head', rarity: 'legendary', stars: 5, seriesId: 'myrthi', description: 'ミルティが舞う際に軽やかに揺れる漆黒の髪飾り。素早さとクリティカルを高める。' },
    myrthi_coat: { id: 'myrthi_coat', name: '黒紅の戦舞装', nameEn: 'CRIMSON BATTLE SUIT', category: 'equipment', slot: 'body', rarity: 'legendary', stars: 5, seriesId: 'myrthi', description: '動きを一切阻まない、戦場を舞台とした戦姫の戦闘衣。' },
    myrthi_bangle: { id: 'myrthi_bangle', name: '拍動のバングル', nameEn: 'BEAT BANGLE', category: 'equipment', slot: 'arms', rarity: 'legendary', stars: 5, seriesId: 'myrthi', description: 'リズムを刻むように脈打つバングル。攻撃の勢いを増幅する。' },
    myrthi_boots: { id: 'myrthi_boots', name: '加速の舞踏靴', nameEn: 'ACCELERANDO BOOTS', category: 'equipment', slot: 'feet', rarity: 'legendary', stars: 5, seriesId: 'myrthi', description: 'ミルティが超高速で踏み込む際の舞踏靴。限界を超えた機動力を秘める。' },
    myrthi_metro: { id: 'myrthi_metro', name: '第二奏のメトロノーム', nameEn: 'SECOND BEAT METRO', category: 'equipment', slot: 'accessory', rarity: 'legendary', stars: 5, seriesId: 'myrthi', description: '正確なリズムを刻み続けるメトロノーム。着けた者のあらゆる動作を研ぎ澄ます。' }
  },
  weapons: {
    mageStaff: { id: 'mageStaff', name: '魔導士の杖', weaponType: 'staff', weaponSprite: 'staff_01', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 2.2, bonuses: { mag: 2 } },
    shadowWand: { id: 'shadowWand', name: 'シャドウワンド', weaponType: 'staff', weaponSprite: 'staff_shadow', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 2.45, bonuses: { mag: 4, mnd: 1 } },
    phantomSword: { id: 'phantomSword', name: '青影の剣', weaponType: 'sword', weaponSprite: 'sword_01', battleSprite: null, attackMotion: 'slash', damageStat: 'str', power: 2, bonuses: { str: 2 } },
    ironClaw: { id: 'ironClaw', name: '鉄の爪', weaponType: 'martial', weaponSprite: 'claw_01', battleSprite: null, attackMotion: 'slash', damageStat: 'agi', power: 2, bonuses: { agi: 2 } },
    flameStaff: { id: 'flameStaff', name: 'フレイムスタッフ', weaponType: 'staff', weaponSprite: 'staff_flame', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 2.6, bonuses: { mag: 6 }, grantsSkillId: 'flame' },
    wizardRod: { id: 'wizardRod', name: 'ウィザードロッド', weaponType: 'staff', weaponSprite: 'staff_wizard', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 2.9, bonuses: { mag: 9 }, grantsSkillId: 'fireball' },
    sunStaff: { id: 'sunStaff', name: '太陽の杖', weaponType: 'staff', weaponSprite: 'staff_sun', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 3.2, bonuses: { mag: 14 } },
    cadenza_staff: { id: 'cadenza_staff', name: '魔杖カデンツァ', seriesId: 'zenacad', weaponType: 'staff', weaponSprite: 'staff_cadenza', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 3.05, bonuses: { mag: 11, maxMp: 8 } },
    lunaEdge: { id: 'lunaEdge', name: '月影剣ルナエッジ', dungeonId: 'dungeon2', weaponType: 'sword', weaponSprite: 'sword_luna', battleSprite: null, attackMotion: 'slash', damageStat: 'str', power: 2.8, bonuses: { str: 14, dex: 4, critBonus: 0.05 } },
    voidBlade: { id: 'voidBlade', name: '虚空刃ヴォイドブレード', nameEn: 'VOID BLADE', dungeonId: 'dungeon3', weaponType: 'sword', weaponSprite: 'sword_void', battleSprite: null, attackMotion: 'slash', damageStat: 'str', power: 3.4, bonuses: { str: 18, agi: 6, critBonus: 0.06 } },
    chaosRod: { id: 'chaosRod', name: '混沌の魔杖カオスロッド', nameEn: 'CHAOS ROD', dungeonId: 'dungeon3', weaponType: 'staff', weaponSprite: 'staff_chaos', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 3.6, bonuses: { mag: 20, maxMp: 10 } },
    myrthi_blade: { id: 'myrthi_blade', name: '黒紅刃ミルティア', nameEn: 'MYRTHI BLADE', seriesId: 'myrthi', dungeonId: 'dungeon2', weaponType: 'sword', weaponSprite: 'sword_myrthi', battleSprite: null, attackMotion: 'slash', damageStat: 'str', power: 3.0, bonuses: { str: 16, agi: 8, critBonus: .06 } }
  },
  accessories: {
    slimeRing: { id: 'slimeRing', name: 'スライムリング', bonuses: { vit: 2, luk: 2 } },
    silverRing: { id: 'silverRing', name: '銀の指輪', bonuses: { luk: 3, maxHp: 6 } },
    manaStone: { id: 'manaStone', name: 'マナストーン', bonuses: { maxMp: 8, mag: 1 } },
    shadowAmulet: { id: 'shadowAmulet', name: '影の護符', bonuses: { vit: 2, mnd: 2, luk: 1 } },
    phantomBadge: { id: 'phantomBadge', name: '怪盗バッジ', bonuses: { str: 1, mag: 1, agi: 2, luk: 1 } },
    goblinEarring: { id: 'goblinEarring', name: 'ゴブリンの耳飾り', bonuses: { agi: 2, luk: 2 } },
    cursedNecklace: { id: 'cursedNecklace', name: '呪われた首飾り', bonuses: { mag: 3, luk: -1 } },
    maestri_baton: { id: 'maestri_baton', name: '七奏のタクト', seriesId: 'zenacad', bonuses: { mag: 4, maxMp: 12 } },
    echoPendant: { id: 'echoPendant', name: '残響のペンダント', dungeonId: 'dungeon2', bonuses: { maxMp: 16, mag: 5 } },
    voidRing: { id: 'voidRing', name: '虚無の指輪', dungeonId: 'dungeon3', bonuses: { str: 5, mag: 5, agi: 5, vit: 5, mnd: 5, maxHp: 20, maxMp: 15 } },
    myrthi_metro: { id: 'myrthi_metro', name: '第二奏のメトロノーム', seriesId: 'myrthi', bonuses: { agi: 6, critBonus: .05 } }
  },
  armors: {
    roughHood: { id: 'roughHood', name: '粗削りフード', slot: 'head', bonuses: { vit: 1, mnd: 1 } },
    shadowCap: { id: 'shadowCap', name: 'シャドウキャップ', slot: 'head', bonuses: { vit: 2, mnd: 2 } },
    arcaneHat: { id: 'arcaneHat', name: '魔導士の帽子', slot: 'head', bonuses: { mnd: 3, mag: 2, vit: 1 } },
    phantomMask: { id: 'phantomMask', name: '怪盗仮面', slot: 'head', bonuses: { vit: 3, mnd: 3, agi: 1 } },
    nightHat: { id: 'nightHat', name: 'ナイトハット', slot: 'head', bonuses: { agi: 3, mnd: 1, luk: 1 } },
    tatterCoat: { id: 'tatterCoat', name: 'ボロのコート', slot: 'body', bonuses: { vit: 2 } },
    leatherVest: { id: 'leatherVest', name: 'レザーベスト', slot: 'body', bonuses: { vit: 4 } },
    shadowMantle: { id: 'shadowMantle', name: '影のマント', slot: 'body', bonuses: { vit: 5, mnd: 2 } },
    phantomSuit: { id: 'phantomSuit', name: '怪盗スーツ', slot: 'body', bonuses: { vit: 6, mnd: 3, agi: 1 } },
    soulRobe: { id: 'soulRobe', name: 'ソルローブ', slot: 'body', bonuses: { vit: 2, mag: 3, mnd: 3 } },
    roughGloves: { id: 'roughGloves', name: '粗削りグローブ', slot: 'arms', bonuses: { vit: 1, dex: 1 } },
    leatherGloves: { id: 'leatherGloves', name: 'レザーグローブ', slot: 'arms', bonuses: { vit: 2, dex: 2 } },
    magicGloves: { id: 'magicGloves', name: '魔導グローブ', slot: 'arms', bonuses: { vit: 2, mag: 2, mnd: 1 } },
    phantomGloves: { id: 'phantomGloves', name: '怪盗グローブ', slot: 'arms', bonuses: { vit: 3, dex: 3, agi: 1 } },
    goblinGloves: { id: 'goblinGloves', name: 'ゴブリングローブ', slot: 'arms', bonuses: { str: 3, vit: 2 } },
    roughBoots: { id: 'roughBoots', name: '粗削りブーツ', slot: 'feet', bonuses: { vit: 1, agi: 1 } },
    lightBoots: { id: 'lightBoots', name: '軽靴', slot: 'feet', bonuses: { vit: 2, agi: 2 } },
    swiftBoots: { id: 'swiftBoots', name: '疾走ブーツ', slot: 'feet', bonuses: { vit: 2, agi: 4 } },
    phantomBoots: { id: 'phantomBoots', name: '怪盗ブーツ', slot: 'feet', bonuses: { vit: 3, agi: 3, dex: 1 } },
    ratBoots: { id: 'ratBoots', name: 'ラットブーツ', slot: 'feet', bonuses: { agi: 4, dex: 2 } },
    soloist_mask: { id: 'soloist_mask', name: '独奏卿の仮面', seriesId: 'zenacad', slot: 'head', bonuses: { mag: 4, mnd: 4 } },
    soloist_coat: { id: 'soloist_coat', name: '独奏卿の燕尾服', seriesId: 'zenacad', slot: 'body', bonuses: { maxHp: 12, maxMp: 10, mag: 3, mnd: 4 } },
    maestro_gloves: { id: 'maestro_gloves', name: '指揮者の白手袋', seriesId: 'zenacad', slot: 'arms', bonuses: { mag: 4, dex: 4 } },
    finale_boots: { id: 'finale_boots', name: '終演の革靴', seriesId: 'zenacad', slot: 'feet', bonuses: { agi: 4, dex: 4 } },
    silentHood: { id: 'silentHood', name: '静寂のフード', slot: 'head', dungeonId: 'dungeon2', bonuses: { mag: 5, mnd: 5, maxMp: 6 } },
    abyssCoat: { id: 'abyssCoat', name: '深域の外套', slot: 'body', dungeonId: 'dungeon2', bonuses: { maxHp: 20, vit: 6, mnd: 5 } },
    abyssGloves: { id: 'abyssGloves', name: '魔蝕のグローブ', slot: 'arms', dungeonId: 'dungeon2', bonuses: { str: 4, mag: 4, dex: 3 } },
    nightwalkerBoots: { id: 'nightwalkerBoots', name: '夜渡りのブーツ', slot: 'feet', dungeonId: 'dungeon2', bonuses: { agi: 7, dex: 3 } },
    voidHelm: { id: 'voidHelm', name: '虚空の兜', slot: 'head', dungeonId: 'dungeon3', bonuses: { mnd: 8, vit: 7, maxHp: 16 } },
    abyssalArmor: { id: 'abyssalArmor', name: '深淵の鎧', slot: 'body', dungeonId: 'dungeon3', bonuses: { vit: 12, maxHp: 30, mnd: 5 } },
    phantomGauntlet: { id: 'phantomGauntlet', name: '幻影拳甲', slot: 'arms', dungeonId: 'dungeon3', bonuses: { str: 8, agi: 6, dex: 4 } },
    myrthi_headband: { id: 'myrthi_headband', name: '律動の髪飾り', seriesId: 'myrthi', slot: 'head', bonuses: { agi: 8, critBonus: .04 } },
    myrthi_coat: { id: 'myrthi_coat', name: '黒紅の戦舞装', seriesId: 'myrthi', slot: 'body', bonuses: { maxHp: 20, vit: 8, agi: 5 } },
    myrthi_bangle: { id: 'myrthi_bangle', name: '拍動のバングル', seriesId: 'myrthi', slot: 'arms', bonuses: { str: 10, agi: 4 } },
    myrthi_boots: { id: 'myrthi_boots', name: '加速の舞踏靴', seriesId: 'myrthi', slot: 'feet', bonuses: { agi: 12, dex: 4 } }
  },
  enemies: {
    shadowSlime: {
      id: 'shadowSlime', name: 'シャドウスライム', enName: 'SHADOW SLIME', element: '闇', weaknesses: ['光', '火'],
      sprite: 'assets/enemy-characters/shadow-slime/battle-idle.png',
      stats: { maxHp: 65, atk: 7, def: 3, mag: 6, spd: 6 }, exp: 10, gold: { min: 5, max: 10 },
      dropTable: [
        { itemId: 'slimeJelly', chance: .40 }, { itemId: 'manaPotion', chance: .20 },
        { itemId: 'shadowWand', chance: .10 }, { itemId: 'slimeRing', chance: .08 }, { itemId: 'darkCore', chance: .03 }
      ],
      ai: [{ id: 'shadowBolt', name: '闇の魔弾', kind: 'magic', weight: .28 }, { id: 'attack', name: '体当たり', kind: 'physical', weight: .72 }]
    },
    noelFirstEncounter: {
      id: 'noelFirstEncounter', name: 'ノエル', enName: 'NOËL — THE ETERNAL JUDGE', kind: 'boss', encounter: 1,
      title: '永遠の裁定者', element: '闇 / 裁定', sprite: 'assets/enemy-characters/noel/battle-first-encounter.png',
      dynamicScale: 100, cannotDefeat: true, exp: 0, gold: { min: 0, max: 0 }, dropTable: [],
      ai: [{ id: 'eternalJudgement', name: 'エターナル・ジャッジメント', weight: 1 }]
    },
    zenakado: {
      id: 'zenakado', name: 'ゼナカド', enName: 'ZENAKADO — THE SOLOIST', kind: 'boss', encounter: 1,
      title: '独奏卿', element: '闇', weaknesses: ['光', '火'],
      sprite: 'assets/enemy-characters/zenakado/battle-idle-v3.png',
      stats: { maxHp: 300, atk: 11, def: 8, mag: 10, mnd: 8, spd: 12 },
      exp: 150, gold: { min: 100, max: 150 },
      dropTable: [
        { itemId: 'cadenza_fragment', chance: 1.0 }, { itemId: 'zenacad_core', chance: .45 },
        { itemId: 'darkCore', chance: 1.0 }, { itemId: 'moonstone', chance: .8 }, { itemId: 'stardustShard', chance: .6 },
        { itemId: 'cadenza_staff', chance: .03 }, { itemId: 'soloist_mask', chance: .03 }, { itemId: 'soloist_coat', chance: .03 },
        { itemId: 'maestro_gloves', chance: .03 }, { itemId: 'finale_boots', chance: .03 }, { itemId: 'maestri_baton', chance: .03 }
      ],
      ai: [
        { id: 'shadowClaw', name: '影裂斬', kind: 'physical', weight: 0.45 },
        { id: 'darkBlast', name: '暗黒爆破', kind: 'magic', weight: 0.35 },
        { id: 'attack', name: '斬りつける', kind: 'physical', weight: 0.20 }
      ]
    },
    soulMage: {
      id: 'soulMage', name: 'ソルメイジ', enName: 'SOUL MAGE', element: '闇', weaknesses: ['光', '火'], resistances: [],
      sprite: 'assets/enemy-characters/soulMage/battle-idle-v1.png',
      stats: { maxHp: 60, atk: 5, def: 3, mag: 8, spd: 7 }, exp: 20, gold: { min: 8, max: 20 },
      dropTable: [
        { itemId: 'manaDrop', chance: .40 }, { itemId: 'stardustShard', chance: .25 },
        { itemId: 'magicPowder', chance: .20 }, { itemId: 'moonstone', chance: .10 }, { itemId: 'tatteredRobe', chance: .05 }, { itemId: 'soulRobe', chance: .05 }
      ],
      stealTable: [{ itemId: 'moonstone', chance: .30 }],
      ai: [{ id: 'soulBolt', name: 'ソウルボルト', kind: 'magic', weight: .60 }, { id: 'attack', name: '体当たり', kind: 'physical', weight: .40 }]
    },
    ratThief: {
      id: 'ratThief', name: '盗鼠', enName: 'RAT THIEF', element: '闇', weaknesses: ['光', '火'], resistances: [],
      sprite: 'assets/enemy-characters/ratThief/battle-idle-v1.png',
      stats: { maxHp: 45, atk: 8, def: 2, mag: 2, spd: 10 }, exp: 18, gold: { min: 5, max: 15 },
      dropTable: [
        { itemId: 'gnawedBag', chance: .40 }, { itemId: 'ratWhisker', chance: .30 },
        { itemId: 'stolenCoin', chance: .20 }, { itemId: 'ratTail', chance: .10 }, { itemId: 'ratBoots', chance: .05 }
      ],
      stealTable: [{ itemId: 'stolenCoin', chance: .50 }],
      ai: [{ id: 'ratBite', name: 'ラットバイト', kind: 'physical', weight: .65 }, { id: 'attack', name: '体当たり', kind: 'physical', weight: .35 }]
    },
    goblin: {
      id: 'goblin', name: 'ゴブリン', enName: 'GOBLIN', element: '闇', weaknesses: ['火', '光'], resistances: ['毒', '闇'],
      sprite: 'assets/enemy-characters/goblin/battle-idle-v2.png',
      stats: { maxHp: 58, atk: 9, def: 5, mag: 2, spd: 6 }, exp: 16, gold: { min: 6, max: 14 },
      dropTable: [
        { itemId: 'rustedKnife', chance: .35 }, { itemId: 'tornCloth', chance: .30 },
        { itemId: 'stolenCoin', chance: .20 }, { itemId: 'goblinMedicine', chance: .10 }, { itemId: 'goblinGloves', chance: .05 }, { itemId: 'goblinEarring', chance: .01 }
      ],
      stealTable: [{ itemId: 'stolenCoin', chance: .35 }],
      ai: [{ id: 'clubSmash', name: 'こん棒の一撃', kind: 'physical', weight: .55 }, { id: 'attack', name: '体当たり', kind: 'physical', weight: .45 }]
    },
    nightBat: {
      id: 'nightBat', name: 'ナイトバット', enName: 'NIGHT BAT', element: '闇', weaknesses: ['光', '雷'], resistances: ['闇', '毒'],
      sprite: 'assets/enemy-characters/nightBat/battle-idle-v2.png',
      stats: { maxHp: 36, atk: 6, def: 2, mag: 2, spd: 15 }, exp: 14, gold: { min: 5, max: 12 },
      dropTable: [
        { itemId: 'batFang', chance: .35 }, { itemId: 'tornWingMembrane', chance: .20 },
        { itemId: 'beastBlood', chance: .08 }, { itemId: 'nightHat', chance: .05 }, { itemId: 'obsidianFang', chance: .02 }
      ],
      stealTable: [{ itemId: 'batFang', chance: .30 }],
      ai: [{ id: 'bite', name: '噛みつき', kind: 'physical', weight: .70 }, { id: 'attack', name: '体当たり', kind: 'physical', weight: .30 }]
    },
    ghostBone: {
      id: 'ghostBone', name: 'ゴーストボーン', enName: 'GHOST BONE', element: '闇', weaknesses: ['光', '聖'], resistances: ['闇', '毒'],
      sprite: 'assets/enemy-characters/ghostBone/battle-idle-v2.png',
      stats: { maxHp: 40, atk: 4, def: 2, mag: 9, spd: 7 }, exp: 17, gold: { min: 6, max: 15 },
      dropTable: [
        { itemId: 'spiritFragment', chance: .35 }, { itemId: 'oldBone', chance: .30 },
        { itemId: 'darkSoulStone', chance: .20 }, { itemId: 'resentmentCrystal', chance: .10 }, { itemId: 'cursedNecklace', chance: .02 }
      ],
      stealTable: [{ itemId: 'darkSoulStone', chance: .25 }],
      ai: [{ id: 'spiritBolt', name: '霊弾', kind: 'magic', weight: .65 }, { id: 'attack', name: '体当たり', kind: 'physical', weight: .35 }]
    },
    voidWatcher: {
      id: 'voidWatcher', name: '虚空の監視者', enName: 'VOID WATCHER', dungeonId: 'dungeon3',
      element: '虚無', weaknesses: ['光', '聖'], resistances: ['闇', '魔'],
      spriteClass: 'void-watcher', battleScale: 1.1,
      stats: { maxHp: 350, atk: 28, def: 25, mag: 38, mnd: 18, spd: 14 }, exp: 95, gold: { min: 40, max: 70 },
      dropTable: [{ itemId: 'voidShard', chance: .45 }, { itemId: 'chaosDust', chance: .22 }, { itemId: 'phantomCore', chance: .10 }],
      ai: [{ id: 'soulBolt', name: '虚空弾', kind: 'magic', weight: .65 }, { id: 'attack', name: '虚空の一瞥', kind: 'magic', weight: .35 }]
    },
    abyssalKnight: {
      id: 'abyssalKnight', name: '深淵の騎士', enName: 'ABYSSAL KNIGHT', dungeonId: 'dungeon3',
      element: '闇', weaknesses: ['光', '雷'], resistances: ['闇', '物理'],
      spriteClass: 'abyssal-knight', battleScale: 1.3,
      stats: { maxHp: 480, atk: 45, def: 38, mag: 12, mnd: 15, spd: 12 }, exp: 110, gold: { min: 45, max: 80 },
      dropTable: [{ itemId: 'darkIron', chance: .40 }, { itemId: 'voidShard', chance: .20 }, { itemId: 'voidEssence', chance: .08 }],
      ai: [{ id: 'attack', name: '深淵の剣撃', kind: 'physical', weight: .70 }, { id: 'soulBolt', name: '虚空震撃', kind: 'physical', weight: .30 }]
    },
    chaosWitch: {
      id: 'chaosWitch', name: 'カオス・ウィッチ', enName: 'CHAOS WITCH', dungeonId: 'dungeon3',
      element: '混沌', weaknesses: ['聖', '打'], resistances: ['魔', '闇'],
      spriteClass: 'chaos-witch', battleScale: 1.0,
      stats: { maxHp: 300, atk: 18, def: 14, mag: 50, mnd: 22, spd: 16 }, exp: 130, gold: { min: 50, max: 85 },
      dropTable: [{ itemId: 'chaosDust', chance: .50 }, { itemId: 'voidShard', chance: .25 }, { itemId: 'phantomCore', chance: .12 }],
      ai: [{ id: 'soulBolt', name: '混沌魔法', kind: 'magic', weight: .60 }, { id: 'attack', name: '呪縛の指先', kind: 'magic', weight: .40 }]
    },
    voidGargoyle: {
      id: 'voidGargoyle', name: '虚空ガーゴイル', enName: 'VOID GARGOYLE', dungeonId: 'dungeon3',
      element: '闇', weaknesses: ['打', '聖'], resistances: ['物理', '魔', '闇'],
      spriteClass: 'void-gargoyle', battleScale: 1.4,
      stats: { maxHp: 520, atk: 40, def: 42, mag: 14, mnd: 16, spd: 8 }, exp: 118, gold: { min: 42, max: 75 },
      dropTable: [{ itemId: 'darkIron', chance: .38 }, { itemId: 'voidShard', chance: .18 }, { itemId: 'voidEssence', chance: .10 }],
      ai: [{ id: 'attack', name: '石翼の一撃', kind: 'physical', weight: .75 }, { id: 'soulBolt', name: '虚空咆哮', kind: 'physical', weight: .25 }]
    },
    phantomEmperor: {
      id: 'phantomEmperor', name: '幻影皇', enName: 'PHANTOM EMPEROR', dungeonId: 'dungeon3',
      element: '虚無', weaknesses: ['聖', '光'], resistances: ['物理', '闇', '魔'],
      spriteClass: 'phantom-emperor', battleScale: 1.2,
      stats: { maxHp: 360, atk: 36, def: 22, mag: 42, mnd: 24, spd: 20 }, exp: 140, gold: { min: 55, max: 90 },
      dropTable: [{ itemId: 'phantomCore', chance: .40 }, { itemId: 'darkIron', chance: .22 }, { itemId: 'voidEssence', chance: .14 }],
      ai: [{ id: 'soulBolt', name: '皇の号令', kind: 'magic', weight: .55 }, { id: 'attack', name: '幻影剣閃', kind: 'physical', weight: .45 }]
    },
    voidOrchestra: {
      id: 'voidOrchestra', name: '虚無の楽団', enName: 'VOID ORCHESTRA', dungeonId: 'dungeon3',
      kind: 'elite',
      element: '虚無', weaknesses: ['光'], resistances: ['物理', '闇', '魔', '毒'],
      spriteClass: 'void-orchestra', battleScale: 1.15,
      stats: { maxHp: 600, atk: 42, def: 30, mag: 46, mnd: 26, spd: 18 }, exp: 180, gold: { min: 70, max: 120 },
      dropTable: [{ itemId: 'voidEssence', chance: .50 }, { itemId: 'phantomCore', chance: .35 }, { itemId: 'chaosDust', chance: .30 }, { itemId: 'darkIron', chance: .20 }],
      ai: [{ id: 'soulBolt', name: '虚無の交響', kind: 'magic', weight: .60 }, { id: 'attack', name: '楽団の奔流', kind: 'physical', weight: .40 }]
    },
    silentHarmonist: {
      id: 'silentHarmonist', name: 'サイレント・ハーモニスト', enName: 'SILENT HARMONIST', dungeonId: 'dungeon2',
      kind: 'elite',
      element: '闇', weaknesses: ['光', '雷'], resistances: ['闇'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 1.1,
      stats: { maxHp: 260, atk: 28, def: 20, mag: 28, mnd: 16, spd: 16 }, exp: 85, gold: { min: 35, max: 60 },
      dropTable: [
        { itemId: 'silentNote',   chance: .50 },
        { itemId: 'echoShard',    chance: .35 },
        { itemId: 'spectralDust', chance: .25 },
        { itemId: 'silentArmor',  chance: .12 }
      ],
      ai: [{ id: 'soulBolt', name: 'サイレントノート', kind: 'magic', weight: .55 }, { id: 'attack', name: '音なき一撃', kind: 'physical', weight: .45 }]
    },
    echoWraith: {
      id: 'echoWraith', name: 'エコー・レイス', enName: 'ECHO WRAITH', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['聖', '打'], resistances: ['闇', '毒'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 1.0,
      stats: { maxHp: 140, atk: 16, def: 10, mag: 22, mnd: 10, spd: 22 }, exp: 40, gold: { min: 18, max: 35 },
      dropTable: [
        { itemId: 'echoShard',    chance: .50 },
        { itemId: 'spectralDust', chance: .25 },
        { itemId: 'manaDrop',     chance: .20 }
      ],
      ai: [{ id: 'soulBolt', name: 'エコーボルト', kind: 'magic', weight: .60 }, { id: 'attack', name: '残響拡散', kind: 'magic', weight: .40 }]
    },
    muteGargoyle: {
      id: 'muteGargoyle', name: 'ムート・ガーゴイル', enName: 'MUTE GARGOYLE', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['打', '風'], resistances: ['闇', '毒', '物理'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 1.3,
      stats: { maxHp: 280, atk: 26, def: 28, mag: 10, mnd: 14, spd: 6 }, exp: 58, gold: { min: 22, max: 42 },
      dropTable: [
        { itemId: 'stoneShard',  chance: .55 },
        { itemId: 'silentNote',  chance: .18 },
        { itemId: 'oldBone',     chance: .15 }
      ],
      ai: [{ id: 'attack', name: 'サイレントバイト', kind: 'physical', weight: .45 }, { id: 'clubSmash', name: '無音の咆哮', kind: 'physical', weight: .35 }, { id: 'attack', name: 'ストンプ', kind: 'physical', weight: .20 }]
    },
    nocturneChandelier: {
      id: 'nocturneChandelier', name: 'ノクターン・シャンデリア', enName: 'NOCTURNE CHANDELIER', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['炎', '光'], resistances: ['闇', '魔法'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 1.1,
      stats: { maxHp: 170, atk: 12, def: 12, mag: 20, mnd: 14, spd: 7 }, exp: 46, gold: { min: 18, max: 36 },
      dropTable: [
        { itemId: 'violinString', chance: .40 },
        { itemId: 'spectralDust', chance: .22 },
        { itemId: 'moonstone',    chance: .12 }
      ],
      ai: [{ id: 'shadowBolt', name: '紫炎の旋律', kind: 'magic', weight: .50 }, { id: 'soulBolt', name: '楽壇の檻', kind: 'magic', weight: .35 }, { id: 'attack', name: '沈黙の天罰', kind: 'magic', weight: .15 }]
    },
    silentKnight: {
      id: 'silentKnight', name: 'サイレント・ナイト', enName: 'SILENT KNIGHT', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['炎', '聖'], resistances: ['闇', '物理'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 1.2,
      stats: { maxHp: 200, atk: 32, def: 18, mag: 10, mnd: 10, spd: 14 }, exp: 55, gold: { min: 22, max: 45 },
      dropTable: [
        { itemId: 'silentArmor', chance: .38 },
        { itemId: 'stoneShard',  chance: .22 },
        { itemId: 'silentNote',  chance: .16 }
      ],
      ai: [{ id: 'attack', name: '無音の突き', kind: 'physical', weight: .40 }, { id: 'ratBite', name: 'サイレントスラッシュ', kind: 'physical', weight: .40 }, { id: 'clubSmash', name: '連斬', kind: 'physical', weight: .20 }]
    },
    reverbSlime: {
      id: 'reverbSlime', name: 'リバーブ・スライム', enName: 'REVERB SLIME', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['火', '斬'], resistances: ['闇'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 0.85,
      stats: { maxHp: 160, atk: 22, def: 14, mag: 18, mnd: 8, spd: 8 }, exp: 35, gold: { min: 15, max: 30 },
      dropTable: [
        { itemId: 'reverbJelly', chance: .55 },
        { itemId: 'echoShard',   chance: .20 },
        { itemId: 'slimeJelly',  chance: .15 }
      ],
      ai: [{ id: 'shadowBolt', name: 'エコースプラッシュ', kind: 'magic', weight: .45 }, { id: 'attack', name: '残響増殖', kind: 'physical', weight: .35 }, { id: 'attack', name: '静寂の粘液', kind: 'physical', weight: .20 }]
    },
    nocturneBanshee: {
      id: 'nocturneBanshee', name: 'ノクターン・バンシー', enName: 'NOCTURNE BANSHEE', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['雷', '光'], resistances: ['闇', '精神'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 1.0,
      stats: { maxHp: 150, atk: 14, def: 8, mag: 26, mnd: 10, spd: 13 }, exp: 42, gold: { min: 18, max: 35 },
      dropTable: [
        { itemId: 'spectralDust', chance: .45 },
        { itemId: 'violinString', chance: .28 },
        { itemId: 'manaDrop',     chance: .15 }
      ],
      ai: [{ id: 'soulBolt', name: 'サイレントクライ', kind: 'magic', weight: .50 }, { id: 'shadowBolt', name: 'MPドレインノート', kind: 'magic', weight: .30 }, { id: 'attack', name: '絶望の終曲', kind: 'magic', weight: .20 }]
    },
    myrthi: {
      id: 'myrthi', name: 'ミルティ', enName: 'MYRTHI', kind: 'boss', encounter: 1,
      title: '黒紅の双刃戦姫', element: '物理', weaknesses: ['魔法'],
      sprite: 'assets/enemy-characters/myrthi/battle-idle-v1.jpg', spriteClass: 'myrthi-sprite',
      stats: { maxHp: 450, atk: 38, def: 14, mag: 8, mnd: 10, spd: 26 },
      exp: 200, gold: { min: 150, max: 200 },
      dropTable: [
        { itemId: 'myrthi_fragment', chance: 1.0 },
        { itemId: 'myrthi_core', chance: .45 },
        { itemId: 'myrthi_blade', chance: .03 },
        { itemId: 'myrthi_headband', chance: .03 },
        { itemId: 'myrthi_coat', chance: .03 },
        { itemId: 'myrthi_bangle', chance: .03 },
        { itemId: 'myrthi_boots', chance: .03 },
        { itemId: 'myrthi_metro', chance: .03 }
      ],
      ai: [
        { id: 'attack', name: '双刃連撃', kind: 'physical', weight: .50 },
        { id: 'clubSmash', name: '乱舞の踏み込み', kind: 'physical', weight: .30 },
        { id: 'ratBite', name: '黒紅の一閃', kind: 'physical', weight: .20 }
      ]
    }
  }
};
