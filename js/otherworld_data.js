// ══════════════════════════════════════════════════════════════════
// 或世盗 -ARSÈNE-  異世界 / PHANTOM THIEF データ
//
//  data.js の構造には手を入れず、ここから ARSENE_DATA へ追記する。
//  読み込み順は data.js → このファイル → debug_room.js → game.js。
//  （デバッグルームの差分はこの追記後に当たるので、ここの値も編集できる）
// ══════════════════════════════════════════════════════════════════
(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  if (!D) { console.error('[otherworld] ARSENE_DATA が見つかりません'); return; }

  // ── PHANTOM THIEF 設定 ──────────────────────────────────────
  // stealRate      : 通常JOBのレベルアップ成長を常時引き継ぐ割合
  // actionSlotCount: 戦闘へ持ち込める盗んだACTIONの数
  D.phantomThief = {
    stealRate: 0.5,          // 端数は切り捨て
    actionSlotCount: 2,
    // JOB MASTER時に盗めるACTION。将来のJOBはここへ1行足すだけでよい。
    signatureActions: {
      warrior: 'powerCharge',        // ちからため
      martialArtist: 'burstFist',    // ばくれつけん
      mage: 'meditation',            // 精神集中
      priest: 'heal',                // ヒール
      magicKnight: 'ensemble',       // アンサンブル
      arcaneMaestro: 'resonantSpell',
      dualBlade: 'battleDance'
    }
  };
  // PHANTOM THIEF は自分では育たない（JOB成長・HP/MP成長・武器学成長なし）
  D.growthBalance.noGrowthJobs = [...new Set([...(D.growthBalance.noGrowthJobs || []), 'phantomThief'])];

  // ── 曜日アルカナ ────────────────────────────────────────────
  // stat: 使用すると恒久的に +1 される基礎能力。random は6能力からランダム。
  D.arcana = {
    weekly: [
      { day: 0, id: 'arcanaChaos',  stat: 'random', name: '混沌のアルカナ', background: 'assets/bg/otherworld/sunday.png' },
      { day: 1, id: 'arcanaMight',  stat: 'str',    name: '剛力のアルカナ', background: 'assets/bg/otherworld/monday.png' },
      { day: 2, id: 'arcanaGuard',  stat: 'vit',    name: '堅牢のアルカナ', background: 'assets/bg/otherworld/tuesday.png' },
      { day: 3, id: 'arcanaMagic',  stat: 'mag',    name: '魔導のアルカナ', background: 'assets/bg/otherworld/wednesday.png' },
      { day: 4, id: 'arcanaSpirit', stat: 'mnd',    name: '精神のアルカナ', background: 'assets/bg/otherworld/thursday.png' },
      { day: 5, id: 'arcanaGale',   stat: 'agi',    name: '疾風のアルカナ', background: 'assets/bg/otherworld/friday.png' },
      { day: 6, id: 'arcanaLuck',   stat: 'luk',    name: '幸運のアルカナ', background: 'assets/bg/otherworld/saturday.png' }
    ],
    randomStats: ['str', 'vit', 'mag', 'mnd', 'agi', 'luk']
  };

  const arcanaItem = (id, name, statText) => ({
    id, name, nameEn: 'ARCANA', category: 'consumable', rarity: 'epic',
    description: '魂に刻まれた力の欠片。使用すると基礎《' + statText + '》が永久に1上昇する。',
    arcanaStat: true
  });
  Object.assign(D.items, {
    arcanaMight:  arcanaItem('arcanaMight',  '剛力のアルカナ', '力'),
    arcanaGuard:  arcanaItem('arcanaGuard',  '堅牢のアルカナ', '体力'),
    arcanaMagic:  arcanaItem('arcanaMagic',  '魔導のアルカナ', '魔力'),
    arcanaSpirit: arcanaItem('arcanaSpirit', '精神のアルカナ', '精神'),
    arcanaGale:   arcanaItem('arcanaGale',   '疾風のアルカナ', '素早さ'),
    arcanaLuck:   arcanaItem('arcanaLuck',   '幸運のアルカナ', '運'),
    arcanaChaos:  { id: 'arcanaChaos', name: '混沌のアルカナ', nameEn: 'ARCANA OF CHAOS', category: 'consumable', rarity: 'epic',
      description: '定まらぬ力の欠片。使用すると6つの基礎能力のうちひとつが永久に1上昇する。', arcanaStat: true },
    otherworldShard: { id: 'otherworldShard', name: '異界の欠片', nameEn: 'RIFT SHARD', category: 'material', rarity: 'rare',
      description: '異世界からこぼれ落ちた結晶片。向こう側の気配を帯びている。' },
    otherworldCore: { id: 'otherworldCore', name: '異界の核', nameEn: 'RIFT CORE', category: 'material', rarity: 'legendary',
      description: '異世界の中心で脈打っていた核。極めて稀にしか手に入らない。' }
  });

  // ── 異世界モンスター ────────────────────────────────────────
  // ダンジョン1の怪異が異界の干渉で歪んだ姿。見た目は色違い（spriteFilter）。
  // EXP・GOLDは一切出さない。代わりに低確率でその日のアルカナを落とす。
  const OW_SPRITE = 'assets/enemy-characters/dungeon1/sheet.png';
  const ow = (id, srcId, name, stats, filter) => ({
    id, name, enName: 'DISTORTED', dungeonId: 'otherWorld', otherWorld: true,
    element: '虚', weaknesses: ['光'], resistances: ['闇'],
    sprite: (D.enemies[srcId] || {}).sprite || OW_SPRITE,
    spriteFilter: filter, battleScale: (D.enemies[srcId] || {}).battleScale || 1,
    stats, exp: 0, gold: { min: 0, max: 0 },
    dropTable: [],            // アルカナは grantOtherWorldDrops で個別に抽選する
    ai: (D.enemies[srcId] || {}).ai || [{ id: 'attack', name: '歪んだ一撃', kind: 'physical', weight: 1 }]
  });
  Object.assign(D.enemies, {
    ow_slime:  ow('ow_slime',  'shadowSlime', '歪影スライム',     { maxHp: 240, atk: 26, def: 18, mag: 20, mnd: 18, spd: 8 },  'hue-rotate(150deg) saturate(1.5) brightness(1.1)'),
    ow_mage:   ow('ow_mage',   'soulMage',    '歪影のソルメイジ', { maxHp: 225, atk: 20, def: 16, mag: 32, mnd: 22, spd: 12 }, 'hue-rotate(255deg) saturate(1.6)'),
    ow_goblin: ow('ow_goblin', 'goblin',      '歪影ゴブリン',     { maxHp: 270, atk: 32, def: 20, mag: 6,  mnd: 16, spd: 10 }, 'hue-rotate(200deg) saturate(1.7) contrast(1.1)'),
    ow_bat:    ow('ow_bat',    'nightBat',    '歪影バット',       { maxHp: 215, atk: 27, def: 15, mag: 8,  mnd: 14, spd: 26 }, 'hue-rotate(95deg) saturate(1.8)'),
    ow_rat:    ow('ow_rat',    'ratThief',    '歪影の盗鼠',       { maxHp: 230, atk: 28, def: 16, mag: 6,  mnd: 15, spd: 22 }, 'hue-rotate(300deg) saturate(1.5)'),
    ow_bone:   ow('ow_bone',   'ghostBone',   '歪影ボーン',       { maxHp: 250, atk: 24, def: 22, mag: 28, mnd: 20, spd: 11 }, 'hue-rotate(45deg) saturate(1.6) brightness(1.15)'),
    ow_warden: {
      id: 'ow_warden', name: '異界の門番', enName: 'RIFT WARDEN', title: '境界に立つ者',
      dungeonId: 'otherWorld', otherWorld: true, isBoss: true,
      element: '虚', weaknesses: ['光'], resistances: ['闇'],
      sprite: (D.enemies.goblin || {}).sprite || OW_SPRITE,
      spriteFilter: 'hue-rotate(190deg) saturate(2) contrast(1.2) brightness(1.1)', battleScale: 1.4,
      stats: { maxHp: 900, atk: 40, def: 26, mag: 32, mnd: 24, spd: 20 }, exp: 0, gold: { min: 0, max: 0 },
      dropTable: [],
      ai: [
        { id: 'attack', name: '境界の一撃', kind: 'physical', weight: .45 },
        { id: 'clubSmash', name: '次元断層', kind: 'physical', weight: .30 },
        { id: 'shadowBolt', name: '虚無の奔流', kind: 'magic', weight: .25 }
      ]
    }
  });

  // ── 異世界ダンジョン ────────────────────────────────────────
  // 1周＝10戦闘（雑魚9＋BOSS1）。通常ダンジョンとは違い短時間で回りきる設計。
  D.otherWorld = {
    id: 'otherWorld', name: '異世界', nameEn: 'OTHER WORLD',
    description: 'レニーフォックスが繋いだ、もうひとつの世界。ここで得られるのは経験ではなくアルカナだけだ。',
    background: 'assets/bg/dungeon-battle-03.png',
    battlesPerRun: 10,              // BOSSを含めた1周の戦闘数
    interferenceMax: 2,             // 異界干渉力の最大値（1日あたりの侵入回数）
    zakoArcanaRate: 0.01,           // 雑魚1体あたりのアルカナドロップ率
    bossArcanaCount: 1,             // BOSS撃破で必ず入手するアルカナ個数
    rebirthArcanaRate: 0.005,       // BOSSからの《輪廻のアルカナ》ドロップ率
    bossId: 'ow_warden',
    // 雑魚の編成。minWins は1周の中で何戦こなしたか。
    encounterProgression: [
      { minWins: 0, count: [1, 2], pool: [{ id: 'ow_slime', weight: 4 }, { id: 'ow_bat', weight: 3 }, { id: 'ow_rat', weight: 2 }] },
      { minWins: 3, count: [1, 2], pool: [{ id: 'ow_slime', weight: 3 }, { id: 'ow_mage', weight: 3 }, { id: 'ow_rat', weight: 3 }, { id: 'ow_bone', weight: 2 }] },
      { minWins: 6, count: [2, 2], pool: [{ id: 'ow_goblin', weight: 3 }, { id: 'ow_bone', weight: 3 }, { id: 'ow_mage', weight: 2 }, { id: 'ow_bat', weight: 2 }] }
    ],
    // BOSS撃破後の宝箱。3つ表示して1つだけ開けられる。
    chestTable: [
      { weight: 45, kind: 'material', itemId: 'otherworldShard', min: 2, max: 4, label: '異世界素材' },
      { weight: 25, kind: 'gold', min: 400, max: 900, label: 'GOLD' },
      { weight: 20, kind: 'arcana', count: 1, label: '本日のアルカナ' },
      { weight: 8,  kind: 'arcana', count: 2, label: '本日のアルカナ ×2' },
      { weight: 2,  kind: 'material', itemId: 'otherworldCore', min: 1, max: 1, label: 'レア素材' }
    ]
  };
})();
