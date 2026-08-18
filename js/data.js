window.ARSENE_DATA = {
  settings: { healOnBattleStart: false, saveKey: 'arsene-rpg-save-v01' },
  battleProgression: { noelEncounterWins: 3, zenakadoEncounterWins: 7 },
  expTable: { 1: 50, 2: 120, 3: 220 },
  jobExpTable: { 1: 25, 2: 45, 3: 70, 4: 100, 5: 135, 6: 175, 7: 220, 8: 270, 9: 330 },
  jobLevelCap: 10,
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
      id: 'warrior', name: '戦士', nameEn: 'WARRIOR', description: '力と耐久力で正面から怪異を打ち破る。',
      growth: { 1: { str: 1 }, 2: { maxHp: 2 }, 4: { vit: 1 }, 5: { str: 1 }, 7: { maxHp: 3 }, 8: { str: 1 }, 10: { str: 2 } },
      skillUnlocks: { 3: 'powerStrike', 6: 'breakEdge', 9: 'recklessEdge' }
    },
    mage: {
      id: 'mage', name: '魔導士', nameEn: 'MAGE', description: '魔力を操り、単体・全体魔法を使い分ける。',
      growth: { 1: { mag: 1 }, 2: { maxMp: 2 }, 4: { mag: 1 }, 5: { maxMp: 3 }, 7: { mag: 1 }, 8: { maxMp: 3 }, 10: { mag: 2 } },
      skillUnlocks: { 3: 'blueFlame', 6: 'manaBurst', 9: 'astralRay' }
    },
    martialArtist: {
      id: 'martialArtist', name: '武道家', nameEn: 'MARTIAL ARTIST', description: '速度と多段攻撃でクリティカルを狙う。',
      growth: { 1: { agi: 1 }, 2: { maxHp: 2 }, 4: { str: 1 }, 5: { agi: 1 }, 7: { critBonus: .01 }, 8: { agi: 1 }, 10: { critBonus: .02 } },
      skillUnlocks: { 3: 'doubleStrike', 6: 'breakFist', 9: 'shadowRush' }
    },
    priest: {
      id: 'priest', name: '僧侶', nameEn: 'PRIEST', description: '精神力を活かして回復と光魔法を扱う。',
      growth: { 1: { mnd: 1 }, 2: { maxMp: 2 }, 4: { mnd: 1 }, 5: { maxHp: 2 }, 7: { maxMp: 3 }, 8: { mnd: 1 }, 10: { mnd: 2 } },
      skillUnlocks: { 3: 'heal', 6: 'holyLight', 9: 'regenerate' }
    }
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
    materialIds: ['slimeJelly', 'darkCore', 'manaDrop', 'stardustShard', 'magicPowder', 'moonstone', 'tatteredRobe', 'gnawedBag', 'ratWhisker', 'stolenCoin', 'ratTail', 'rustedKnife', 'tornCloth', 'goblinMedicine', 'batFang', 'tornWingMembrane', 'beastBlood', 'obsidianFang', 'spiritFragment', 'oldBone', 'darkSoulStone', 'resentmentCrystal', 'zenacad_core', 'cadenza_fragment'],
    bossBlueprints: [{ id: 'noelJudgementStaff', bossId: 'noelFirstEncounter', name: 'ノエルの審判杖', slot: 'rightHand', status: 'awaitingSecondEncounter' }]
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
      description: 'かつて七奏卿の一人が築いた、音なき楽園。音を奪われた者たちの残響が、今もこの殿堂に漂っている。',
      recommendedLevel: 10,
      unlockCondition: 'dungeon1Clear',
      encounterProgression: [
        { minWins: 0, count: [1, 2], pool: [{ id: 'reverbSlime', weight: 3 }, { id: 'echoWraith', weight: 1 }] },
        { minWins: 2, count: [2, 2], pool: [{ id: 'reverbSlime', weight: 2 }, { id: 'echoWraith', weight: 2 }, { id: 'nocturneBanshee', weight: 1 }] },
        { minWins: 4, count: [2, 3], pool: [{ id: 'echoWraith', weight: 2 }, { id: 'silentHarmonist', weight: 2 }, { id: 'nocturneBanshee', weight: 2 }, { id: 'reverbSlime', weight: 1 }] },
        { minWins: 7, count: [2, 3], pool: [{ id: 'silentHarmonist', weight: 2 }, { id: 'nocturneChandelier', weight: 1 }, { id: 'silentKnight', weight: 1 }, { id: 'muteGargoyle', weight: 1 }, { id: 'echoWraith', weight: 2 }] },
        { minWins: 10, count: [2, 3], pool: [{ id: 'silentKnight', weight: 2 }, { id: 'muteGargoyle', weight: 1 }, { id: 'nocturneChandelier', weight: 2 }, { id: 'nocturneBanshee', weight: 2 }, { id: 'silentHarmonist', weight: 1 }] }
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
    cadenza_staff_recipe: { id: 'cadenza_staff_recipe', seriesId: 'zenacad', craftCategory: 'boss', resultItemId: 'cadenza_staff', resultCount: 1, gold: 850, materials: [{ itemId: 'zenacad_core', count: 2 }, { itemId: 'cadenza_fragment', count: 8 }, { itemId: 'manaDrop', count: 6 }] },
    soloist_mask_recipe: { id: 'soloist_mask_recipe', seriesId: 'zenacad', craftCategory: 'boss', resultItemId: 'soloist_mask', resultCount: 1, gold: 620, materials: [{ itemId: 'zenacad_core', count: 1 }, { itemId: 'cadenza_fragment', count: 6 }, { itemId: 'moonstone', count: 3 }] },
    soloist_coat_recipe: { id: 'soloist_coat_recipe', seriesId: 'zenacad', craftCategory: 'boss', resultItemId: 'soloist_coat', resultCount: 1, gold: 780, materials: [{ itemId: 'zenacad_core', count: 2 }, { itemId: 'cadenza_fragment', count: 7 }, { itemId: 'tatteredRobe', count: 5 }] },
    maestro_gloves_recipe: { id: 'maestro_gloves_recipe', seriesId: 'zenacad', craftCategory: 'boss', resultItemId: 'maestro_gloves', resultCount: 1, gold: 560, materials: [{ itemId: 'zenacad_core', count: 1 }, { itemId: 'cadenza_fragment', count: 5 }, { itemId: 'magicPowder', count: 5 }] },
    finale_boots_recipe: { id: 'finale_boots_recipe', seriesId: 'zenacad', craftCategory: 'boss', resultItemId: 'finale_boots', resultCount: 1, gold: 560, materials: [{ itemId: 'zenacad_core', count: 1 }, { itemId: 'cadenza_fragment', count: 5 }, { itemId: 'stolenCoin', count: 6 }] },
    maestri_baton_recipe: { id: 'maestri_baton_recipe', seriesId: 'zenacad', craftCategory: 'boss', resultItemId: 'maestri_baton', resultCount: 1, gold: 700, materials: [{ itemId: 'zenacad_core', count: 2 }, { itemId: 'cadenza_fragment', count: 6 }, { itemId: 'stardustShard', count: 5 }] }
  },
  skills: {
    attack: { id: 'attack', name: 'たたかう', mp: 0, kind: 'weapon', target: 'single', power: 2, agiScale: 0 },
    quickSlash: { id: 'quickSlash', name: 'クイックスラッシュ', nameEn: 'QUICK SLASH', source: 'character', type: 'ACTIVE', mp: 5, kind: 'physical', target: 'single', power: 2.5, agiScale: 0.5, powerText: 'ATK×2.5＋AGI×0.5', effectText: '素早さも威力へ加算', description: '素早い踏み込みから放つ斬撃。力と素早さを参照して敵単体へダメージを与える。' },
    flame: { id: 'flame', name: 'フラム', mp: 6, kind: 'magical', target: 'all', power: 0.8, agiScale: 0, elementId: 'fire' },
    fireball: { id: 'fireball', name: 'ファイアボール', mp: 5, kind: 'magical', target: 'single', power: 1.4, agiScale: 0, elementId: 'fire' },
    blueNote: { id: 'blueNote', name: 'ブルーノート', nameEn: 'BLUE NOTE', source: 'character', unlockLevel: 1, type: 'ACTIVE', kind: 'hybrid', target: 'single', mp: 5, power: 1, strScale: 1.15, magScale: 1.15, agiScale: 0, powerText: 'ATK×1.15＋MAG×1.15', effectText: '物理攻撃力と魔力の双方を参照', description: '青い魔力を武器へ纏わせて敵を攻撃する。物理攻撃力と魔力の双方を参照してダメージを与える。' },
    blueEcho: { id: 'blueEcho', name: '蒼の残響', nameEn: 'BLUE ECHO', source: 'character', unlockLevel: 3, type: 'PASSIVE', kind: 'passive', target: 'self', mp: 0, powerText: '－', effectText: 'ターン開始時20%でMAG +10%／2ターン。重複せず残り時間を更新', description: '戦いの中で魔力の波長を捉え、自らの魔力を高める。' },
    meditation: { id: 'meditation', name: '精神集中', nameEn: 'MEDITATION', source: 'character', unlockLevel: 5, type: 'ACTIVE', kind: 'support', target: 'self', mp: 0, cooldown: 3, powerText: '最大MPの10%', effect: { type: 'mpRecover', maxMpRate: .10 }, effectText: '最大MPの10%回復／クールタイム3ターン', description: '呼吸を整え、乱れた魔力を収束させる。自身のMPを回復する。' },
    powerStrike: { id: 'powerStrike', name: '強撃', nameEn: 'POWER STRIKE', source: 'job', jobId: 'warrior', unlockJobLevel: 3, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 4, power: 3, agiScale: 0, powerText: 'ATK×3.0', effectText: '通常攻撃より高威力', description: '力を込めた一撃。ATKを参照して敵単体へ物理ダメージを与える。' },
    breakEdge: { id: 'breakEdge', name: 'ブレイクエッジ', nameEn: 'BREAK EDGE', source: 'job', jobId: 'warrior', unlockJobLevel: 6, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 7, power: 2.2, agiScale: 0, effect: { type: 'enemyDefDown', rate: .15, turns: 2 }, powerText: 'ATK×2.2', effectText: '敵DEF -15%／2ターン', description: '防御を断つ斬撃。物理ダメージと同時に敵のDEFを低下させる。' },
    recklessEdge: { id: 'recklessEdge', name: '捨て身斬り', nameEn: 'RECKLESS EDGE', source: 'job', jobId: 'warrior', unlockJobLevel: 9, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 10, power: 3.8, agiScale: 0, effect: { type: 'selfDefDown', rate: .20, turns: 2 }, powerText: 'ATK×3.8', effectText: '使用後、自身のDEF -20%／2ターン', description: '守りを捨てて放つ高威力の斬撃。' },
    blueFlame: { id: 'blueFlame', name: '蒼炎弾', nameEn: 'BLUE FLAME', source: 'job', jobId: 'mage', unlockJobLevel: 3, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 6, power: 1.8, agiScale: 0, powerText: 'MAG×1.8', effectText: '敵単体へ魔法ダメージ', description: '蒼い炎を凝縮し、敵単体へ撃ち出す魔法。' },
    manaBurst: { id: 'manaBurst', name: '魔力炸裂', nameEn: 'MANA BURST', source: 'job', jobId: 'mage', unlockJobLevel: 6, type: 'ACTIVE', kind: 'magical', target: 'all', mp: 12, power: 1.15, agiScale: 0, powerText: 'MAG×1.15', effectText: '敵全体へ魔法ダメージ', description: '周囲へ魔力を炸裂させ、敵全体を攻撃する。' },
    astralRay: { id: 'astralRay', name: 'アストラルレイ', nameEn: 'ASTRAL RAY', source: 'job', jobId: 'mage', unlockJobLevel: 9, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 15, power: 3, agiScale: 0, powerText: 'MAG×3.0', effectText: '敵単体へ高威力魔法攻撃', description: '大量のMPを収束した星幽の光線で敵を貫く。' },
    doubleStrike: { id: 'doubleStrike', name: '連撃', nameEn: 'DOUBLE STRIKE', source: 'job', jobId: 'martialArtist', unlockJobLevel: 3, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 6, power: 1.25, hits: 2, agiScale: 0, powerText: 'ATK×1.25×2回', effectText: '2回攻撃／各攻撃で個別クリティカル判定', description: '間を置かず二撃を叩き込む。' },
    breakFist: { id: 'breakFist', name: '崩拳', nameEn: 'BREAK FIST', source: 'job', jobId: 'martialArtist', unlockJobLevel: 6, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 8, power: 2.2, ignoreDef: .35, agiScale: 0, powerText: 'ATK×2.2', effectText: '敵DEFを35%無視', description: '防御の隙間へ衝撃を通し、敵DEFの一部を無視する。' },
    shadowRush: { id: 'shadowRush', name: '無影連舞', nameEn: 'SHADOW RUSH', source: 'job', jobId: 'martialArtist', unlockJobLevel: 9, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 12, power: 1, hits: 3, agiScale: 0, powerText: 'ATK×1.0×3回', effectText: '3回攻撃／各攻撃で個別クリティカル判定', description: '影すら残さない三連撃。' },
    heal: { id: 'heal', name: 'ヒール', nameEn: 'HEAL', source: 'job', jobId: 'priest', unlockJobLevel: 3, type: 'ACTIVE', kind: 'support', target: 'self', mp: 6, powerText: 'MND×2.0＋10', effect: { type: 'hpRecover', mndScale: 2, base: 10 }, effectText: 'MND参照で自身のHP回復', description: '精神力を癒やしの力へ変え、自身のHPを回復する。' },
    holyLight: { id: 'holyLight', name: 'ホーリーライト', nameEn: 'HOLY LIGHT', source: 'job', jobId: 'priest', unlockJobLevel: 6, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 8, power: 2.1, agiScale: 0, elementId: 'light', powerText: 'MAG×2.1', effectText: '敵単体へ光属性魔法攻撃', description: '聖なる光を放ち、敵単体へ魔法ダメージを与える。' },
    regenerate: { id: 'regenerate', name: 'リジェネレート', nameEn: 'REGENERATE', source: 'job', jobId: 'priest', unlockJobLevel: 9, type: 'ACTIVE', kind: 'support', target: 'self', mp: 10, powerText: '最大HPの8%×3回', effect: { type: 'regenerate', maxHpRate: .08, turns: 3 }, effectText: '3ターン、ターン開始時にHP回復', description: '継続する癒やしの力を自身へ付与する。' }
  },
  items: {
    potion: { id: 'potion', name: '回復薬', category: 'consumable', rarity: 'common', description: 'HPを30回復する。', effect: { hp: 30 } },
    slimeJelly: { id: 'slimeJelly', name: 'スライムゼリー', category: 'material', rarity: 'common', description: 'シャドウスライムから採れる不思議なゼリー。' },
    manaPotion: { id: 'manaPotion', name: '魔力回復薬', category: 'consumable', rarity: 'common', description: 'MPを20回復する。', effect: { mp: 20 } },
    mageStaff: { id: 'mageStaff', name: '魔導士の杖', category: 'equipment', slot: 'rightHand', rarity: 'common', description: '青い魔力を導く魔導士の基本杖。' },
    phantomSword: { id: 'phantomSword', name: '青影の剣', category: 'equipment', slot: 'rightHand', rarity: 'common', description: '青い残光を引く怪盗の細身剣。' },
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
    zenacad_core: { id: 'zenacad_core', name: '独奏卿の魔核', nameEn: 'ZENACAD CORE', category: 'material', rarity: 'legendary', bossId: 'zenacad', description: '独奏卿の魔力と旋律が凝縮した魔核。ゼナカドシリーズの中核素材。' },
    cadenza_fragment: { id: 'cadenza_fragment', name: '魔奏の欠片', nameEn: 'CADENZA FRAGMENT', category: 'material', rarity: 'epic', bossId: 'zenacad', description: '魔力へ変換された音の欠片。ボス装備の製作・再構成に使う。' },
    cadenza_staff: { id: 'cadenza_staff', name: '魔杖カデンツァ', nameEn: 'CADENZA', category: 'equipment', slot: 'rightHand', rarity: 'legendary', stars: 5, seriesId: 'zenacad', description: '独奏卿ゼナカドが振るった魔導指揮杖。杖が描く軌跡に魔力が追従し、ひとりの術者を楽団へと変える。' },
    soloist_mask: { id: 'soloist_mask', name: '独奏卿の仮面', nameEn: 'SOLOIST MASK', category: 'equipment', slot: 'head', rarity: 'legendary', stars: 5, seriesId: 'zenacad', description: 'ゼナカドが身につけていた、片眼を覆う妖艶な仮面。' },
    soloist_coat: { id: 'soloist_coat', name: '独奏卿の燕尾服', nameEn: 'SOLOIST COAT', category: 'equipment', slot: 'body', rarity: 'legendary', stars: 5, seriesId: 'zenacad', description: '黒・紫・金で仕立てられた独奏卿の燕尾服。魔力と精神を守る。' },
    maestro_gloves: { id: 'maestro_gloves', name: '指揮者の白手袋', nameEn: 'MAESTRO GLOVES', category: 'equipment', slot: 'arms', rarity: 'legendary', stars: 5, seriesId: 'zenacad', description: '精緻な魔法制御を可能にする、指揮者の白手袋。' },
    finale_boots: { id: 'finale_boots', name: '終演の革靴', nameEn: 'FINALE BOOTS', category: 'equipment', slot: 'feet', rarity: 'legendary', stars: 5, seriesId: 'zenacad', description: '終演まで歩みを止めない、高速連続行動のための革靴。' },
    maestri_baton: { id: 'maestri_baton', name: '七奏のタクト', nameEn: 'MAESTRI BATON', category: 'equipment', slot: 'accessory', rarity: 'legendary', stars: 5, seriesId: 'zenacad', description: '七つの音を束ねる者の証。正体不明の旋律が微かに脈打つ。' }
  },
  weapons: {
    mageStaff: { id: 'mageStaff', name: '魔導士の杖', weaponType: 'staff', weaponSprite: 'staff_01', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 2.2, bonuses: {} },
    shadowWand: { id: 'shadowWand', name: 'シャドウワンド', weaponType: 'staff', weaponSprite: 'staff_shadow', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 2.45, bonuses: { mag: 4, mnd: 1 } },
    phantomSword: { id: 'phantomSword', name: '青影の剣', weaponType: 'sword', weaponSprite: 'sword_01', battleSprite: null, attackMotion: 'slash', damageStat: 'str', power: 2, bonuses: { str: 2 } },
    flameStaff: { id: 'flameStaff', name: 'フレイムスタッフ', weaponType: 'staff', weaponSprite: 'staff_flame', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 2.6, bonuses: { mag: 6 }, grantsSkillId: 'flame' },
    wizardRod: { id: 'wizardRod', name: 'ウィザードロッド', weaponType: 'staff', weaponSprite: 'staff_wizard', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 2.9, bonuses: { mag: 9 }, grantsSkillId: 'fireball' },
    sunStaff: { id: 'sunStaff', name: '太陽の杖', weaponType: 'staff', weaponSprite: 'staff_sun', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 3.2, bonuses: { mag: 14 } },
    cadenza_staff: { id: 'cadenza_staff', name: '魔杖カデンツァ', seriesId: 'zenacad', weaponType: 'staff', weaponSprite: 'staff_cadenza', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 3.05, bonuses: { mag: 11, maxMp: 8 } }
  },
  accessories: {
    slimeRing: { id: 'slimeRing', name: 'スライムリング', bonuses: { vit: 2, luk: 2 } },
    silverRing: { id: 'silverRing', name: '銀の指輪', bonuses: { luk: 3, maxHp: 6 } },
    manaStone: { id: 'manaStone', name: 'マナストーン', bonuses: { maxMp: 8, mag: 1 } },
    shadowAmulet: { id: 'shadowAmulet', name: '影の護符', bonuses: { vit: 2, mnd: 2, luk: 1 } },
    phantomBadge: { id: 'phantomBadge', name: '怪盗バッジ', bonuses: { str: 1, mag: 1, agi: 2, luk: 1 } },
    goblinEarring: { id: 'goblinEarring', name: 'ゴブリンの耳飾り', bonuses: { agi: 2, luk: 2 } },
    cursedNecklace: { id: 'cursedNecklace', name: '呪われた首飾り', bonuses: { mag: 3, luk: -1 } },
    maestri_baton: { id: 'maestri_baton', name: '七奏のタクト', seriesId: 'zenacad', bonuses: { mag: 4, maxMp: 12 } }
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
    finale_boots: { id: 'finale_boots', name: '終演の革靴', seriesId: 'zenacad', slot: 'feet', bonuses: { agi: 4, dex: 4 } }
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
    silentHarmonist: {
      id: 'silentHarmonist', name: 'サイレント・ハーモニスト', enName: 'SILENT HARMONIST', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['光', '雷'], resistances: ['闇'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 1.1,
      stats: { maxHp: 90, atk: 14, def: 8, mag: 16, mnd: 10, spd: 10 }, exp: 30, gold: { min: 18, max: 32 },
      dropTable: [{ itemId: 'silentNote', chance: .40 }, { itemId: 'echoShard', chance: .20 }, { itemId: 'magicPowder', chance: .15 }],
      ai: [{ id: 'soulBolt', name: 'サイレントノート', kind: 'magic', weight: .55 }, { id: 'attack', name: '音なき一撃', kind: 'physical', weight: .45 }]
    },
    echoWraith: {
      id: 'echoWraith', name: 'エコー・レイス', enName: 'ECHO WRAITH', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['聖', '打'], resistances: ['闇', '毒'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 1.0,
      stats: { maxHp: 70, atk: 12, def: 7, mag: 13, mnd: 8, spd: 12 }, exp: 26, gold: { min: 14, max: 26 },
      dropTable: [{ itemId: 'echoShard', chance: .45 }, { itemId: 'spectralDust', chance: .20 }, { itemId: 'manaDrop', chance: .20 }],
      ai: [{ id: 'soulBolt', name: 'エコーボルト', kind: 'magic', weight: .60 }, { id: 'attack', name: '残響拡散', kind: 'magic', weight: .40 }]
    },
    muteGargoyle: {
      id: 'muteGargoyle', name: 'ムート・ガーゴイル', enName: 'MUTE GARGOYLE', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['打', '風'], resistances: ['闇', '毒', '物理'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 1.3,
      stats: { maxHp: 120, atk: 18, def: 15, mag: 8, mnd: 12, spd: 7 }, exp: 38, gold: { min: 20, max: 38 },
      dropTable: [{ itemId: 'stoneShard', chance: .50 }, { itemId: 'silentNote', chance: .15 }, { itemId: 'oldBone', chance: .20 }],
      ai: [{ id: 'attack', name: 'サイレントバイト', kind: 'physical', weight: .50 }, { id: 'clubSmash', name: '無音の咆哮', kind: 'physical', weight: .35 }, { id: 'attack', name: 'スタンプレス', kind: 'physical', weight: .15 }]
    },
    nocturneChandelier: {
      id: 'nocturneChandelier', name: 'ノクターン・シャンデリア', enName: 'NOCTURNE CHANDELIER', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['炎', '光'], resistances: ['闇', '魔法'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 1.1,
      stats: { maxHp: 80, atk: 9, def: 10, mag: 14, mnd: 12, spd: 5 }, exp: 32, gold: { min: 16, max: 30 },
      dropTable: [{ itemId: 'violinString', chance: .35 }, { itemId: 'spectralDust', chance: .25 }, { itemId: 'moonstone', chance: .15 }],
      ai: [{ id: 'shadowBolt', name: '紫炎の旋律', kind: 'magic', weight: .50 }, { id: 'soulBolt', name: '楽壇の檻', kind: 'magic', weight: .35 }, { id: 'attack', name: '沈黙の天罰', kind: 'magic', weight: .15 }]
    },
    silentKnight: {
      id: 'silentKnight', name: 'サイレント・ナイト', enName: 'SILENT KNIGHT', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['炎', '聖'], resistances: ['闇', '物理'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 1.2,
      stats: { maxHp: 110, atk: 20, def: 13, mag: 9, mnd: 10, spd: 11 }, exp: 40, gold: { min: 22, max: 40 },
      dropTable: [{ itemId: 'silentArmor', chance: .35 }, { itemId: 'stoneShard', chance: .25 }, { itemId: 'silentNote', chance: .15 }],
      ai: [{ id: 'attack', name: '無音の突き', kind: 'physical', weight: .40 }, { id: 'ratBite', name: 'サイレントスラッシュ', kind: 'physical', weight: .40 }, { id: 'attack', name: '恐怖の強制', kind: 'physical', weight: .20 }]
    },
    reverbSlime: {
      id: 'reverbSlime', name: 'リバーブ・スライム', enName: 'REVERB SLIME', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['火', '斬'], resistances: ['闇'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 0.85,
      stats: { maxHp: 55, atk: 10, def: 5, mag: 12, mnd: 6, spd: 6 }, exp: 22, gold: { min: 10, max: 20 },
      dropTable: [{ itemId: 'reverbJelly', chance: .55 }, { itemId: 'echoShard', chance: .20 }, { itemId: 'slimeJelly', chance: .15 }],
      ai: [{ id: 'shadowBolt', name: 'エコースプラッシュ', kind: 'magic', weight: .45 }, { id: 'attack', name: '残響増殖', kind: 'physical', weight: .35 }, { id: 'attack', name: '静寂の粘液', kind: 'physical', weight: .20 }]
    },
    nocturneBanshee: {
      id: 'nocturneBanshee', name: 'ノクターン・バンシー', enName: 'NOCTURNE BANSHEE', dungeonId: 'dungeon2',
      element: '闇', weaknesses: ['雷', '光'], resistances: ['闇', '精神'],
      sprite: 'assets/enemy-characters/dungeon2/sheet.png', battleScale: 1.0,
      stats: { maxHp: 80, atk: 11, def: 7, mag: 16, mnd: 8, spd: 10 }, exp: 28, gold: { min: 14, max: 28 },
      dropTable: [{ itemId: 'spectralDust', chance: .40 }, { itemId: 'violinString', chance: .25 }, { itemId: 'manaDrop', chance: .20 }],
      ai: [{ id: 'soulBolt', name: 'サイレントクライ', kind: 'magic', weight: .50 }, { id: 'shadowBolt', name: 'MPドレインノート', kind: 'magic', weight: .30 }, { id: 'attack', name: '絶望の終曲', kind: 'magic', weight: .20 }]
    }
  }
};
