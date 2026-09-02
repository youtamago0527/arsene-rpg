// ARSÈNE RPG / 無限奏廊 - INFINITE SCORE (DEBUG)
(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  if (!D) return;

  D.infiniteScore = {
    id: 'infiniteScore', name: '無限奏廊', nameEn: 'INFINITE SCORE', debugOnly: true,
    bagLimit: 30, equippedUsesBag: true, maxFloor: 9999,
    mapRows: 8, mapWidth: 3,
    stairBaseRate: 15, stairRateIncrease: 15, stairMaxRate: 100,
    // D3クリア直後では20Fが壁、D5クリア相当でようやく到達できる基準。
    // 線形+16%/Fにより 10F=2.44倍、20F=4.04倍、100F=16.84倍。
    currencyMode: 'dungeon', enemyScalePerFloor: .16, returnMinFloor: 20,
    cardRate: .45, treasureRate: .18, shopRate: .02, trapRate: .10, gearDropRate: .14, currencyMultiplier: 1,
    rareEnemyRate: .035, returnItemRate: .008, recoveryDropRate: .05, sublimationRate: .02,
    chestRates: { wood: 70, silver: 25, gold: 5 },
    rarityRates: { common: 55, rare: 27, epic: 12, legendary: 5, mythic: 1 },
    rarity: {
      common: { name: 'COMMON', min: 1.00, max: 1.10, opMin: 0, opMax: 1, color: '#b8c2cd' },
      rare: { name: 'RARE', min: 1.15, max: 1.30, opMin: 1, opMax: 2, color: '#50aaff' },
      epic: { name: 'EPIC', min: 1.35, max: 1.55, opMin: 2, opMax: 3, color: '#b56cff' },
      legendary: { name: 'LEGENDARY', min: 1.60, max: 1.85, opMin: 3, opMax: 4, color: '#ffc750' },
      mythic: { name: 'MYTHIC', min: 1.90, max: 2.20, opMin: 4, opMax: 4, color: '#ff5e88' }
    },
    opRanks: {
      attackPower: [4, 7, 10, 14], defensePower: [4, 7, 10, 14], magicAttackPower: [4, 7, 10, 14], magicDefensePower: [4, 7, 10, 14],
      str: [1, 2, 3, 5], vit: [1, 2, 3, 5], mag: [1, 2, 3, 5], mnd: [1, 2, 3, 5], agi: [1, 2, 3, 5], dex: [1, 2, 3, 5], luk: [1, 2, 3, 5],
      maxHp: [8, 14, 22, 34], maxMp: [4, 7, 11, 16], critBonus: [.02, .04, .06, .08]
    },
    opLabels: {
      attackPower: '攻撃力', defensePower: '防御力', magicAttackPower: '魔法攻撃力', magicDefensePower: '魔法防御力',
      str: '力', vit: '体力', mag: '魔力', mnd: '精神', agi: '素早さ', dex: '器用さ', luk: '運', maxHp: '最大HP', maxMp: '最大MP', critBonus: '会心率',
      expUp: '獲得経験値UP', jobExpUp: 'JOB経験値UP', masteryExpUp: '武器学経験値UP', goldUp: '獲得GOLD UP',
      materialDropUp: '素材ドロップ率UP', gearDropUp: '装備ドロップ率UP', rareDropUp: 'レアドロップ率UP',
      physicalDamagePercent: '物理与ダメージ', magicDamagePercent: '魔法与ダメージ', damageReductionPercent: '被ダメージ軽減',
      hpDrain: 'HP吸収', mpCostDown: '消費MP軽減', repeatChance: '追加発動率',
      treasureUp: '宝箱出現率UP', rareEnemyUp: 'レア敵出現率UP', returnUp: '帰還札出現率UP', stairUp: '階段発見率UP', bagPlus: 'バッグ枠追加'
    },
    eventWeights: { encounter: 34, treasure: 18, trap: 10, item: 10, gold: 10, shop: 7, workshop: 3, rare: 3, card: 8 },
    hints: {
      metal: { text: '鉄の匂いがする……', events: ['treasure', 'encounter', 'trap'] },
      herb: { text: '薬草のような香りがする……', events: ['item', 'shop', 'trap'] },
      wind: { text: '冷たい風を感じる……', events: ['encounter', 'card', 'treasure'] },
      beast: { text: '獣の気配がする……', events: ['encounter', 'rare', 'trap'] },
      sweet: { text: '甘い匂いが漂っている……', events: ['item', 'gold', 'shop'] },
      gaze: { text: '何かがこちらを見ている……', events: ['rare', 'card', 'encounter'] }
    },
    cards: [
      { id: 'heal', name: '癒奏', text: '最大HPの20%回復', weight: 16 },
      { id: 'mana', name: '魔奏', text: '最大MPの20%回復', weight: 14 },
      { id: 'treasure', name: '宝探', text: '宝箱遭遇率+10%（累積）', weight: 12 },
      { id: 'hunt', name: '狩猟', text: 'レア敵遭遇率+5%（累積）', weight: 10 },
      { id: 'stairs', name: '降奏', text: '即座に次の階へ', weight: 7 },
      { id: 'return', name: 'RETURN', text: '戦利品を持って即帰還', weight: 1 },
      { id: 'forge', name: '鍛造', text: '装備1つの強化値+1', weight: 8 },
      { id: 'gold', name: '黄金', text: 'RUN内の奏貨獲得+20%', weight: 10 },
      { id: 'quality', name: '奏命', text: '次の3戦、装備品質UP', weight: 9 },
      { id: 'merchant', name: '行商人', text: 'その場にショップが出現', weight: 7 },
      { id: 'sublime', name: '昇華', text: '任意OPを1Rank強化', weight: 2 }
    ],
    // 出現する原種も段階更新する。倍率だけでなく、見た目と行動も攻略進度に合わせる。
    enemyTiers: [
      { minFloor: 1, maxFloor: 4, pool: ['shadowSlime', 'nightBat', 'ratThief'] },
      { minFloor: 5, maxFloor: 10, pool: ['shadowSlime', 'nightBat', 'ratThief', 'goblin', 'soulMage', 'ghostBone'] },
      { minFloor: 11, maxFloor: 15, pool: ['hushMoth', 'chimeImp', 'fadingChorister', 'mutedHound', 'silentHarmonist', 'echoWraith'] },
      { minFloor: 16, maxFloor: 9999, pool: ['voidWatcher', 'abyssalKnight', 'voidGargoyle', 'chaosWitch', 'fortressGolem', 'riftAssailant'] }
    ].map(tier => ({ ...tier, pool: tier.pool.filter(id => D.enemies?.[id]) })),
    enemyPool: ['shadowSlime', 'nightBat', 'ratThief'].filter(id => D.enemies?.[id]),
    rareEnemyTiers: [{ minFloor: 16, maxFloor: 9999, pool: ['merox'] }].map(tier => ({ ...tier, pool: tier.pool.filter(id => D.enemies?.[id]) })),
    rareEnemyPool: [],
    consumablePool: ['owPotion20', 'owManaPotion20'],
    recoveryItems: [
      { itemId: 'owPotion20', weight: 34, minFloor: 1 },
      { itemId: 'owManaPotion20', weight: 30, minFloor: 1 },
      { itemId: 'owPotion40', weight: 14, minFloor: 30 },
      { itemId: 'owManaPotion40', weight: 12, minFloor: 30 },
      { itemId: 'owPotion60', weight: 5, minFloor: 60 },
      { itemId: 'owManaPotion60', weight: 5, minFloor: 60 }
    ]
  };

  Object.assign(D.items, {
    owPotion20: { id:'owPotion20', name:'異界回復薬', nameEn:'OTHERWORLD POTION', category:'consumable', rarity:'common', description:'最大HPの20%を回復する。', effect:{ hpRate:.2 }, otherWorldItem:true },
    owPotion40: { id:'owPotion40', name:'異界回復薬・中級', nameEn:'OTHERWORLD POTION II', category:'consumable', rarity:'rare', description:'最大HPの40%を回復する。', effect:{ hpRate:.4 }, otherWorldItem:true },
    owPotion60: { id:'owPotion60', name:'異界回復薬・高級', nameEn:'OTHERWORLD POTION III', category:'consumable', rarity:'epic', description:'最大HPの60%を回復する。', effect:{ hpRate:.6 }, otherWorldItem:true },
    owManaPotion20: { id:'owManaPotion20', name:'異界魔力回復薬', nameEn:'OTHERWORLD MANA POTION', category:'consumable', rarity:'common', description:'最大MPの20%を回復する。', effect:{ mpRate:.2 }, otherWorldItem:true },
    owManaPotion40: { id:'owManaPotion40', name:'異界魔力回復薬・中級', nameEn:'OTHERWORLD MANA POTION II', category:'consumable', rarity:'rare', description:'最大MPの40%を回復する。', effect:{ mpRate:.4 }, otherWorldItem:true },
    owManaPotion60: { id:'owManaPotion60', name:'異界魔力回復薬・高級', nameEn:'OTHERWORLD MANA POTION III', category:'consumable', rarity:'epic', description:'最大MPの60%を回復する。', effect:{ mpRate:.6 }, otherWorldItem:true }
  });
})();
