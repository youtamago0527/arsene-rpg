// ══════════════════════════════════════════════════════════════════════════
// D4「断律の刹那廊」専用コンテンツ
//
// game.js の共通戦闘・セーブ・進行ロジックへは手を入れず、
// ここでデータ（ダンジョン／敵／素材／装備／レシピ）と
// D4ボス専用の行動パターンだけを定義する。
//
// game.js 側に足したのは次の汎用フックのみで、D1〜D3の挙動は変えていない：
//   BattleGame.bossAttackHandlers  … ボスの行動ルーチン差し替え
//   BattleGame.bossStartHandlers   … ボス戦の開始処理
//   BattleGame.bossVictoryHandlers … ボス撃破後のリザルト処理
//   dungeon.bossKey / midBossKey / winsFlag … 進行・解放・勝利数の参照先
//
// 読み込み順は equipment_progression.js より後。
// 向こうの「工房品の bonuses を剥がす」ループを踏まないよう、
// D4の装備・レシピはすべてこのファイルで後から追加する。
// D5〜D7の予約データ（future_data.js）には一切触れていない。
// ══════════════════════════════════════════════════════════════════════════
(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  if (!D) return;

  const DUNGEON = 'dungeon4';

  // ════════════════════════════════════════════════════════════
  // 1. 素材
  // ════════════════════════════════════════════════════════════
  const materials = {
    severanceShard:   ['断律の刃片', 'SEVERANCE SHARD',   'uncommon', '一瞬だけ形を保つ、断ち切られた刃の欠片。触れていると指先の感覚が遅れて届く。'],
    instantSteel:     ['刹那鋼',     'INSTANT STEEL',     'uncommon', '打たれた瞬間の熱をそのまま閉じ込めた鋼。冷めることがない。'],
    afterimageSilk:   ['残像絹',     'AFTERIMAGE SILK',   'rare',     '動きの軌跡だけが糸になったもの。畳んでも一拍遅れて広がる。'],
    zanshinCore:      ['残心核',     'ZANSHIN CORE',      'rare',     '斬り終えたあとの静止が結晶になった核。次の一手を待ち続けている。'],
    severedEcho:      ['断たれた残響', 'SEVERED ECHO',     'rare',     '鳴り終える前に断ち切られた音。永遠に立ち上がりだけを繰り返す。'],
    edgeOfTheInstant: ['刹那の切先', 'EDGE OF THE INSTANT', 'epic',   '第四奏域の最奥にだけ落ちている切先。見えた時にはもう斬られている。'],
    presto_gear:      ['急奏の歯車', 'PRESTO GEAR',       'epic',     'プレストの内部で拍を刻み続けていた歯車。今も勝手に回っている。'],
    astact_core:      ['瞬断の奏核', 'ASTACT CORE',       'legendary', 'アスタクトの中心にあった、断ち切る意志そのものの核。'],
    staccato_fragment:['断律片',     'STACCATO FRAGMENT', 'epic',     '奏刃の装甲片。受けた力を「返す」のではなく「断つ」性質を残している。']
  };
  Object.entries(materials).forEach(([id, [name, nameEn, rarity, description]]) => {
    D.items[id] = { id, name, nameEn, category: 'material', rarity, dungeonId: DUNGEON, description };
    if (!D.workshop.materialIds.includes(id)) D.workshop.materialIds.push(id);
  });

  // ════════════════════════════════════════════════════════════
  // 2. 通常敵
  //
  // D4 1F（補正1.00）は D3 8F（補正2.85）の実効値をわずかに上回る位置に置く。
  // D3を抜けた直後の装備でも雑魚戦が成立し、6Fまでで約1.48倍まで伸びる。
  //
  // 役割は意図的にばらしてある。物理一辺倒でも魔法一辺倒でも、
  // どこかの階で必ず止まるようにするため：
  //   鏡断の衛士   … 物理防御225。魔法でしか割れない
  //   断律の詠み手 … 精神168。魔法が通りにくい
  //   刹那の処刑人 … 単発高火力。防御コマンドと回復が要る
  //   葬送のメトロノーム … 回復と魔法障壁。撃破順を強制する
  // ════════════════════════════════════════════════════════════
  const sprite = name => `assets/enemy-characters/dungeon3/${name}.png`;
  const enemies = {
    severKite: {
      name: '断刃のカイト', enName: 'SEVER KITE', role: 'FAST ATTACKER',
      roleDescription: '極端に速い。数を減らす前に手数で削られる。',
      element: '断律', weaknesses: ['打', '光'], resistances: ['斬'],
      sprite: sprite('chainReaper'), battleScale: 1.0, sparkLevel: 42,
      stats: { maxHp: 1250, atk: 126, def: 70, mag: 40, mnd: 60, spd: 42, agi: 46, dex: 44 },
      exp: 300, gold: { min: 150, max: 240 },
      drops: [['severanceShard', .46], ['instantSteel', .24], ['afterimageSilk', .10]],
      ai: [{ id: 'chainRend', name: '断刃の連撃', kind: 'physical', weight: .70 }, { id: 'riftRay', name: '風切り', kind: 'magic', weight: .30 }]
    },
    mirrorGuard: {
      name: '鏡断の衛士', enName: 'MIRROR GUARD', role: 'HEAVY TANK',
      roleDescription: '物理防御が極端に高い。魔法か貫通でしか崩せない。',
      element: '鏡', weaknesses: ['魔', '雷'], resistances: ['物理', '斬', '打'],
      sprite: sprite('fortressGolem'), battleScale: 1.3, sparkLevel: 43,
      stats: { maxHp: 1900, atk: 112, def: 225, mag: 30, mnd: 60, spd: 16 },
      exp: 330, gold: { min: 170, max: 265 },
      drops: [['instantSteel', .48], ['severanceShard', .30], ['zanshinCore', .12]],
      ai: [{ id: 'fortressCrash', name: '鏡面圧砕', kind: 'physical', weight: .70 }, { id: 'attack', name: '盾殴り', kind: 'physical', weight: .30 }]
    },
    staccatoChanter: {
      name: '断律の詠み手', enName: 'STACCATO CHANTER', role: 'MAGIC TANK',
      roleDescription: '精神が極端に高く、魔法がほとんど通らない。物理で落とす。',
      element: '音', weaknesses: ['斬'], resistances: ['魔', '音'],
      sprite: sprite('arcaneChanter'), battleScale: 1.05, sparkLevel: 44,
      stats: { maxHp: 1400, atk: 60, def: 90, mag: 140, mnd: 168, spd: 26 },
      exp: 345, gold: { min: 175, max: 275 },
      drops: [['severedEcho', .40], ['afterimageSilk', .28], ['severanceShard', .22]],
      ai: [{ id: 'soulBolt', name: '断律詠唱', kind: 'magic', weight: .68 }, { id: 'shadowBolt', name: '刻む高音', kind: 'magic', weight: .32 }]
    },
    graveMetronome: {
      name: '葬送のメトロノーム', enName: 'GRAVE METRONOME', role: 'SUPPORT',
      roleDescription: '回復と魔法障壁で戦線を保つ。先に落とさないと決着しない。',
      element: '闇', weaknesses: ['打'], resistances: ['闇'],
      sprite: sprite('voidAlchemist'), battleScale: 1.0, sparkLevel: 45,
      stats: { maxHp: 1500, atk: 70, def: 110, mag: 104, mnd: 150, spd: 24 },
      exp: 360, gold: { min: 185, max: 290 },
      drops: [['zanshinCore', .40], ['severedEcho', .30], ['instantSteel', .20]],
      ai: [
        { id: 'voidHeal', name: '拍の巻き戻し', kind: 'heal', power: .24, weight: .36 },
        { id: 'arcaneChant', name: '節理の障壁', kind: 'mdefBuff', rate: .28, turns: 3, weight: .24 },
        { id: 'soulBolt', name: '葬送の刻', kind: 'magic', weight: .40 }
      ]
    },
    afterimageStalker: {
      name: '残像の追跡者', enName: 'AFTERIMAGE STALKER', role: 'FAST ATTACKER',
      roleDescription: '素早さと器用さが高い。長引かせるほど不利。',
      element: '断律', weaknesses: ['光', '火'], resistances: ['闇'],
      sprite: sprite('riftAssailant'), battleScale: 1.05, sparkLevel: 46,
      stats: { maxHp: 1150, atk: 134, def: 62, mag: 45, mnd: 55, spd: 48, agi: 52, dex: 48 },
      exp: 355, gold: { min: 180, max: 285 },
      drops: [['afterimageSilk', .46], ['severanceShard', .26], ['zanshinCore', .12]],
      ai: [{ id: 'chainRend', name: '残像斬り', kind: 'physical', weight: .74 }, { id: 'riftRay', name: '追影', kind: 'magic', weight: .26 }]
    },
    severedChoir: {
      name: '断たれた聖歌隊', enName: 'SEVERED CHOIR', role: 'CASTER',
      roleDescription: '高HPと魔力を併せ持つ。長期戦ではMPが先に尽きる。',
      element: '聖', weaknesses: ['闇'], resistances: ['光', '音'],
      sprite: sprite('voidOrchestra'), battleScale: 1.15, sparkLevel: 47,
      stats: { maxHp: 2200, atk: 82, def: 120, mag: 128, mnd: 120, spd: 20 },
      exp: 400, gold: { min: 200, max: 320 },
      drops: [['severedEcho', .44], ['zanshinCore', .26], ['afterimageSilk', .22]],
      ai: [{ id: 'soulBolt', name: '断たれた聖歌', kind: 'magic', weight: .62 }, { id: 'attack', name: '聖句の打擲', kind: 'physical', weight: .38 }]
    },
    instantExecutioner: {
      name: '刹那の処刑人', enName: 'INSTANT EXECUTIONER', role: 'BURST',
      roleDescription: '一撃が極端に重い。防御と回復を挟まないと事故で落ちる。',
      element: '断律', weaknesses: ['氷', '聖'], resistances: ['斬'],
      sprite: sprite('chaosWitch'), battleScale: 1.1, sparkLevel: 48,
      stats: { maxHp: 1600, atk: 156, def: 105, mag: 50, mnd: 70, spd: 30 },
      exp: 420, gold: { min: 215, max: 340 },
      drops: [['edgeOfTheInstant', .22], ['instantSteel', .38], ['zanshinCore', .24]],
      ai: [{ id: 'crimsonCharge', name: '処刑の一閃', kind: 'physical', weight: .78 }, { id: 'attack', name: '刃鳴らし', kind: 'physical', weight: .22 }]
    },
    edgeColossus: {
      name: '刃界の巨兵', enName: 'EDGE COLOSSUS', role: 'BRUISER',
      roleDescription: 'HP・攻撃・防御すべてが高い。D4後半の壁。',
      element: '鋼', weaknesses: ['魔', '雷'], resistances: ['物理', '打'],
      sprite: sprite('crimsonBehemoth'), battleScale: 1.35, sparkLevel: 50,
      stats: { maxHp: 2400, atk: 136, def: 190, mag: 60, mnd: 90, spd: 14 },
      exp: 460, gold: { min: 235, max: 375 },
      drops: [['edgeOfTheInstant', .26], ['instantSteel', .42], ['severedEcho', .24]],
      ai: [{ id: 'fortressCrash', name: '刃界の踏み潰し', kind: 'physical', weight: .68 }, { id: 'crimsonRoar', name: '鋼の咆哮', kind: 'magic', weight: .32 }]
    },
    severanceHoarder: {
      name: '断律の蒐集者', enName: 'SEVERANCE HOARDER', kind: 'elite',
      role: 'TREASURE', roleDescription: '低確率で現れる逃走型。倒せば素材とGOLDが跳ね上がる。',
      element: '断律', weaknesses: ['斬', '打', '魔'], resistances: [],
      sprite: sprite('gildedHoarder'), battleScale: 1.0, sparkLevel: 52,
      stats: { maxHp: 900, atk: 96, def: 130, mag: 60, mnd: 130, spd: 56, agi: 60, dex: 52 },
      exp: 900, gold: { min: 900, max: 1500 },
      drops: [['edgeOfTheInstant', .85], ['zanshinCore', .70], ['severedEcho', .70], ['afterimageSilk', .70]],
      ai: [{ id: 'flee', name: '断ち逃げ', kind: 'flee', weight: .55 }, { id: 'attack', name: '牽制', kind: 'physical', weight: .45 }]
    }
  };
  Object.entries(enemies).forEach(([id, e]) => {
    D.enemies[id] = {
      id, dungeonId: DUNGEON, ...e,
      dropTable: e.drops.map(([itemId, chance]) => ({ itemId, chance }))
    };
    delete D.enemies[id].drops;
  });

  // ════════════════════════════════════════════════════════════
  // 3. 中ボス「プレスト」／ 最終ボス「アスタクト」
  //
  // future_data.js のアスタクトは Monte Carlo 用の暫定値なので、
  // 実戦用の数値はここで別に定義する（予約データ側は書き換えない）。
  // ════════════════════════════════════════════════════════════
  D.enemies.presto = {
    id: 'presto', name: 'プレスト', enName: 'PRESTO', kind: 'boss', encounter: 1, dungeonId: DUNGEON,
    bossRank: 'midBoss', title: '《先駆の急奏体》', role: 'MID BOSS / ACCELERATION',
    roleDescription: '拍を溜めて三連撃へ繋ぐ。溜めきる前に大きく削れば拍を乱せる。',
    element: '断律', weaknesses: ['BREAK'], resistances: ['斬'],
    sprite: sprite('prismSentinel'), battleScale: 1.15, sparkLevel: 54,
    stats: { maxHp: 8200, atk: 168, def: 118, mag: 96, mnd: 104, dex: 120, agi: 62, spd: 96 },
    exp: 2400, gold: { min: 1100, max: 1600 },
    dropTable: [
      { itemId: 'presto_gear', chance: 1.0 },
      { itemId: 'edgeOfTheInstant', chance: .70 },
      { itemId: 'zanshinCore', chance: .90 }
    ],
    specialAttacks: {
      prestissimo: { id: 'prestissimo', name: 'プレスティッシモ', kind: 'physical', accuracyModifier: 0 },
      cutAway:     { id: 'cutAway',     name: '断ち払い',         kind: 'physical', accuracyModifier: .04 },
      offbeat:     { id: 'offbeat',     name: 'オフビート',       kind: 'magic',    accuracyModifier: .02 }
    },
    ai: []
  };

  D.enemies.astact = {
    id: 'astact', name: 'アスタクト', enName: 'ASTACT', kind: 'boss', encounter: 1, dungeonId: DUNGEON,
    bossRank: 'dungeonBoss', title: '第四奏卿《瞬断の奏刃》', role: 'BOSS / STANCE & COUNTER',
    roleDescription: '構えを切り替えて戦う。抜刀中は硬く、解いた瞬間に最大の一撃が来る。',
    element: '断律 / 刃', weaknesses: ['抜刀中以外'], resistances: ['斬'],
    sprite: sprite('phantomEmperor'), battleScale: 1.25, sparkLevel: 58,
    stats: { maxHp: 16000, atk: 170, def: 138, mag: 150, mnd: 134, dex: 150, agi: 92, spd: 120 },
    exp: 9000, gold: { min: 4200, max: 5600 },
    dropTable: [
      { itemId: 'staccato_fragment', chance: 1.0 },
      { itemId: 'astact_core', chance: .45 },
      { itemId: 'edgeOfTheInstant', chance: 1.0 },
      { itemId: 'severedEcho', chance: .80 }
    ],
    specialAttacks: {
      severance:   { id: 'severance',   name: '瞬断',       kind: 'physical', accuracyModifier: .03 },
      quickDraw:   { id: 'quickDraw',   name: '居合一閃',   kind: 'physical', accuracyModifier: .06 },
      zanshinCut:  { id: 'zanshinCut',  name: '残心の返し', kind: 'physical', accuracyModifier: .05 },
      moonReversal:{ id: 'moonReversal',name: '月返し',     kind: 'magic',    accuracyModifier: .02 },
      finalInstant:{ id: 'finalInstant',name: '終奏《刹那》', kind: 'physical', unavoidable: true }
    },
    ai: []
  };

  // ════════════════════════════════════════════════════════════
  // 4. ダンジョン定義
  //
  // bossKey / midBossKey / winsFlag は game.js の汎用フックが読む。
  // 背景と敵スプライトはD3のものを流用した仮素材。
  // ════════════════════════════════════════════════════════════
  const bg = n => `assets/bg/dungeon3/d3f${n}-${['eroded-outer-wall', 'sealed-courtyard', 'ruined-chapel', 'innermost-throne'][n - 1]}.webp`;
  const floor = (id, name, nameEn, winsToClear, bgNo, description, materialIds, scale, pools) => ({
    id, name, nameEn, winsToClear,
    background: bg(bgNo), thumbnail: bg(bgNo), description, materials: materialIds,
    enemyScale: scale, encounterProgression: pools
  });
  const sc = (n, rewards) => ({ hp: n, atk: n, mag: n, def: n, mnd: n, spd: Math.min(n, 1 + (n - 1) * .45), rewards });
  const P = (...pairs) => pairs.map(([id, weight]) => ({ id, weight }));

  D.dungeons.push({
    id: DUNGEON, name: '断律の刹那廊', nameEn: 'GALLERY OF THE SEVERED INSTANT',
    background: bg(4), thumbnail: bg(4),
    description: '第四奏卿アスタクトが刻む、斬り終えた一瞬だけが並ぶ回廊。速度と一撃の重さが同時に上がり、受け方を決めないまま進むと崩れる。',
    recommendedLevel: 40,
    unlockCondition: 'dungeon3Clear',
    bossKey: 'astact', midBossKey: 'presto', winsFlag: 'dungeon4BattleWins',
    midBossAfterFloor: 3,
    floors: [
      floor('d4f1', '刹那の入廊', '1F THRESHOLD OF THE INSTANT', 8, 1,
        'D3装備のまま踏み込める適応層。速い敵と硬い敵が同居し、攻撃手段を一つに絞れないことを最初に教える。',
        ['severanceShard', 'instantSteel'], sc(1.00, 1.00), [
        { minWins: 0, count: [2, 2], pool: P(['severKite', 4], ['mirrorGuard', 3], ['staccatoChanter', 3], ['graveMetronome', 1]) },
        { minWins: 4, count: [2, 2], pool: P(['severKite', 4], ['mirrorGuard', 3], ['staccatoChanter', 3], ['graveMetronome', 2], ['afterimageStalker', 2]) }
      ]),
      floor('d4f2', '反響の断面', '2F SEVERED SECTION', 9, 1,
        '支援役が混ざり始める層。撃破順を誤ると回復に追いつかれる。',
        ['severanceShard', 'instantSteel', 'afterimageSilk'], sc(1.09, 1.15), [
        { minWins: 0, count: [2, 2], pool: P(['graveMetronome', 4], ['afterimageStalker', 3], ['mirrorGuard', 3], ['severKite', 3], ['staccatoChanter', 2]) },
        { minWins: 5, count: [2, 3], pool: P(['afterimageStalker', 4], ['graveMetronome', 3], ['staccatoChanter', 3], ['mirrorGuard', 3], ['severedChoir', 2]) }
      ]),
      floor('d4f3', '奏刃の前廊', '3F BLADE ANTECHAMBER', 9, 2,
        'プレストへ続く前半最終層。単発高火力が現れ、防御と回復の使いどころが問われる。',
        ['afterimageSilk', 'zanshinCore', 'instantSteel'], sc(1.19, 1.32), [
        { minWins: 0, count: [2, 3], pool: P(['instantExecutioner', 3], ['severedChoir', 3], ['afterimageStalker', 3], ['graveMetronome', 3], ['mirrorGuard', 2]) },
        { minWins: 5, count: [3, 3], pool: P(['instantExecutioner', 4], ['severedChoir', 3], ['afterimageStalker', 3], ['graveMetronome', 2], ['severanceHoarder', 1]) }
      ]),
      floor('d4f4', '静止の広間', '4F HALL OF STILLNESS', 10, 2,
        'プレスト撃破後に開く後半層。敵の総量が跳ね上がり、D4装備の製作を前提にした密度になる。',
        ['zanshinCore', 'severedEcho', 'afterimageSilk'], sc(1.32, 1.60), [
        { minWins: 0, count: [2, 3], pool: P(['severedChoir', 4], ['instantExecutioner', 3], ['edgeColossus', 2], ['staccatoChanter', 3], ['graveMetronome', 2]) },
        { minWins: 5, count: [2, 3], pool: P(['edgeColossus', 3], ['instantExecutioner', 3], ['severedChoir', 3], ['afterimageStalker', 3], ['graveMetronome', 2], ['severanceHoarder', 1]) }
      ]),
      floor('d4f5', '断律の螺旋', '5F SEVERANCE SPIRAL', 10, 3,
        '速度と耐久が同時に伸びる層。短いターンで崩す火力と、崩れない受けの両方が要る。',
        ['severedEcho', 'zanshinCore', 'edgeOfTheInstant'], sc(1.38, 1.85), [
        { minWins: 0, count: [2, 3], pool: P(['edgeColossus', 3], ['instantExecutioner', 3], ['afterimageStalker', 3], ['severedChoir', 3], ['staccatoChanter', 2]) },
        { minWins: 5, count: [3, 3], pool: P(['edgeColossus', 4], ['instantExecutioner', 4], ['severedChoir', 3], ['graveMetronome', 2], ['severanceHoarder', 1]) }
      ]),
      floor('d4f6', '奏刃の間', '6F THE BLADE CHAMBER', 11, 4,
        'D4の最終準備層。アスタクト攻略に必要な装備・強化・編成をここで完成させる。',
        ['edgeOfTheInstant', 'severedEcho', 'zanshinCore'], sc(1.48, 2.15), [
        { minWins: 0, count: [3, 3], pool: P(['edgeColossus', 4], ['instantExecutioner', 3], ['severedChoir', 3], ['afterimageStalker', 3], ['mirrorGuard', 2]) },
        { minWins: 6, count: [3, 3], pool: P(['edgeColossus', 4], ['instantExecutioner', 4], ['afterimageStalker', 3], ['severedChoir', 3], ['staccatoChanter', 2], ['severanceHoarder', 1]) }
      ])
    ],
    // 階層未選択の経路から参照された場合のフォールバック
    encounterProgression: [
      { minWins: 0, count: [2, 2], pool: P(['severKite', 4], ['mirrorGuard', 3], ['staccatoChanter', 3]) },
      { minWins: 20, count: [2, 3], pool: P(['afterimageStalker', 3], ['severedChoir', 3], ['instantExecutioner', 3], ['graveMetronome', 2]) },
      { minWins: 40, count: [3, 3], pool: P(['edgeColossus', 3], ['instantExecutioner', 3], ['severedChoir', 3], ['afterimageStalker', 2]) }
    ]
  });

  // ════════════════════════════════════════════════════════════
  // 5. 装備生成ヘルパー（equipment_progression.js と同じ形で追加する）
  // ════════════════════════════════════════════════════════════
  const addItem = (id, data) => (D.items[id] = { id, category: 'equipment', ...data });
  const addWeapon = (id, data) => {
    const item = addItem(id, { slot: data.slot || 'rightHand', ...data });
    D.weapons[id] = {
      id, name: item.name, nameEn: item.nameEn, dungeonId: DUNGEON,
      weaponType: data.weaponType, weaponSubtype: data.weaponSubtype || null,
      weaponSprite: data.weaponSprite || `${data.weaponType}_progression`, battleSprite: null,
      attackMotion: data.weaponType === 'staff' || data.weaponType === 'instrument' ? 'staffCast' : data.weaponType === 'shield' ? 'shieldBash' : 'slash',
      damageStat: data.damageStat || (data.weaponType === 'staff' ? 'mag' : data.weaponType === 'instrument' ? 'dex' : data.weaponType === 'shield' ? 'vit' : 'str'),
      power: data.power || 2.5, attackPower: data.attackPower || 0, magicAttackPower: data.magicAttackPower || 0,
      defensePower: data.defensePower || 0, magicDefensePower: data.magicDefensePower || 0,
      bonuses: data.bonuses || {}, effects: data.effects || {},
      scaling: data.scaling || null, powerKey: data.powerKey || null, damageType: data.damageType || null,
      offHandOnly: !!data.offHandOnly, seriesId: data.seriesId || null, source: data.source
    };
  };
  const addArmor = (id, data) => {
    const item = addItem(id, data);
    (data.slot === 'accessory' ? D.accessories : D.armors)[id] = {
      id, name: item.name, nameEn: item.nameEn, dungeonId: DUNGEON, slot: data.slot,
      defensePower: data.defensePower || 0, magicDefensePower: data.magicDefensePower || 0,
      attackPower: data.attackPower || 0, magicAttackPower: data.magicAttackPower || 0,
      bonuses: data.bonuses || {}, effects: data.effects || {}, seriesId: data.seriesId || null, source: data.source
    };
  };
  const addRecipe = (id, data) => (D.recipes[id] = { id, resultCount: 1, progressionRecipe: true, dungeonId: DUNGEON, ...data });
  const mats = list => list.map(([itemId, count]) => ({ itemId, count }));

  // ════════════════════════════════════════════════════════════
  // 6. D4 工房装備（★3）
  //
  // D3工房品（★3 / 攻41・魔44 / 防22・魔防22）の上位。
  // 5武器種すべてに d4 / d4e を用意して、特定JOBだけ更新先が無い状態を避ける。
  // 盾学（守護士）は equipment_progression 側に工房ラインが無かったので、
  // ここで初めて通しの盾ラインが入る。
  // ════════════════════════════════════════════════════════════
  const weaponLines = {
    sword:      { d4: ['forge_d4_sword', '刹那剣セヴァランス', 'SEVERANCE EDGE'], d4e: ['forge_d4e_sword', '断界剣インスタント', 'INSTANT WORLDCUT'] },
    martial:    { d4: ['forge_d4_martial', '瞬爪ザンシン', 'ZANSHIN CLAW'], d4e: ['forge_d4e_martial', '残像拳アフターイメージ', 'AFTERIMAGE FIST'] },
    staff:      { d4: ['forge_d4_staff', '断律杖スタッカート', 'STACCATO ROD'], d4e: ['forge_d4e_staff', '刹那杖モーメント', 'MOMENT STAFF'] },
    instrument: { d4: ['forge_d4_instrument', '断奏器セヴァード', 'SEVERED SCORE'], d4e: ['forge_d4e_instrument', '瞬奏器インスタンス', 'INSTANCE HARP'] },
    shield:     { d4: ['forge_d4_shield', '見切りの盾パリィ', 'PARRY BULWARK'], d4e: ['forge_d4e_shield', '残心盾スティルネス', 'STILLNESS AEGIS'] }
  };
  const weaponPower = {
    d4:  { stars: 3, attack: 50, magic: 54, power: 3.35, def: 62, mdef: 52 },
    d4e: { stars: 3, attack: 58, magic: 62, power: 3.50, def: 72, mdef: 62 }
  };
  const craftMaterials = {
    d4:  [['severanceShard', 6], ['instantSteel', 5], ['afterimageSilk', 3]],
    d4e: [['zanshinCore', 6], ['severedEcho', 5], ['edgeOfTheInstant', 2]]
  };
  for (const [type, stages] of Object.entries(weaponLines)) {
    for (const [stage, [id, name, nameEn]] of Object.entries(stages)) {
      const p = weaponPower[stage], magical = type === 'staff' || type === 'instrument', isShield = type === 'shield';
      addWeapon(id, {
        name, nameEn, dungeonId: DUNGEON, catalogDungeon: DUNGEON, weaponType: type,
        stars: p.stars, rarity: 'rare', source: 'workshop',
        attackPower: magical || isShield ? 0 : p.attack,
        magicAttackPower: magical ? p.magic : 0,
        defensePower: isShield ? p.def : 0, magicDefensePower: isShield ? p.mdef : 0,
        power: p.power, bonuses: {},
        scaling: type === 'instrument' ? { dex: .65, mag: .35 } : null,
        powerKey: magical ? 'magicAttackPower' : 'attackPower',
        damageType: magical ? 'magical' : 'physical',
        description: `D4工房規格。基本能力は変えず、${isShield ? '受けの厚み' : magical ? '術式出力' : '武器攻撃力'}だけを引き上げる。`
      });
      // d4e は d4 を素材に食う。工房を一段ずつ通してから最終装備へ行かせる。
      const prior = stage === 'd4e' ? weaponLines[type].d4[0] : null;
      addRecipe(`${id}_recipe`, {
        name, craftCategory: 'weapon', resultItemId: id,
        gold: stage === 'd4' ? 1700 : 2600,
        materials: mats([...(prior ? [[prior, 1]] : []), ...craftMaterials[stage]])
      });
    }
  }

  const armorSlots = ['leftHand', 'head', 'body', 'arms', 'feet', 'accessory'];
  const armorNames = {
    d4:  ['断律の小盾', '刹那の面', '残像の外套', '見切りの手甲', '瞬歩の靴', '断律の護符'],
    d4e: ['静止の大盾', '残心の兜', '断界の法衣', '奏刃の篭手', '刹那踏みの脚甲', '瞬断の環']
  };
  const armorPower = { d4: { stars: 3, def: 27, mdef: 26 }, d4e: { stars: 3, def: 32, mdef: 31 } };
  for (const [stage, names] of Object.entries(armorNames)) {
    names.forEach((name, index) => {
      const slot = armorSlots[index], id = `forge_${stage}_${slot}`, p = armorPower[stage];
      const budget = p.def + p.mdef, r = n => Math.round(budget * n);
      // equipment_progression と同じ「部位で役割を分ける」配分を踏襲する。
      const profile = slot === 'accessory'
        ? { defensePower: 0, magicDefensePower: 0, bonuses: { luk: Math.max(1, r(.14)) }, role: '運' }
        : slot === 'leftHand' ? { defensePower: r(.85), magicDefensePower: r(.20), bonuses: {}, role: '物理防御' }
        : slot === 'head' ? { defensePower: 0, magicDefensePower: r(.65), bonuses: { maxMp: r(.55) }, role: '魔法防御とMP' }
        : slot === 'body' ? { defensePower: r(.85), magicDefensePower: 0, bonuses: { maxHp: r(.35) }, role: '物理防御' }
        : slot === 'arms' ? { defensePower: r(.20), magicDefensePower: 0, bonuses: { str: Math.max(1, r(.20)), dex: Math.max(1, r(.16)) }, role: '力と器用さ' }
        : { defensePower: r(.20), magicDefensePower: r(.20), bonuses: { agi: Math.max(1, r(.22)) }, role: '素早さ' };
      addArmor(id, {
        name, nameEn: `${stage.toUpperCase()} ${slot.toUpperCase()}`, dungeonId: DUNGEON, catalogDungeon: DUNGEON,
        slot, stars: p.stars, rarity: 'rare', source: 'workshop',
        bonuses: profile.bonuses, defensePower: profile.defensePower, magicDefensePower: profile.magicDefensePower,
        description: `D4工房規格。${profile.role}に寄せた装備。`
      });
      const prior = stage === 'd4e' ? `forge_d4_${slot}` : null;
      addRecipe(`${id}_recipe`, {
        name, craftCategory: 'armor', resultItemId: id,
        gold: stage === 'd4' ? 1300 : 2000,
        materials: mats([...(prior ? [[prior, 1]] : []), ...craftMaterials[stage].slice(0, 2)])
      });
    });
  }

  // ════════════════════════════════════════════════════════════
  // 7. 怪異遺装（★4・ドロップ専用）
  //    equipment_progression の D1〜D3 と同じ枠組みをD4へ延長する。
  // ════════════════════════════════════════════════════════════
  const relicPlan = {
    severKite:          ['sword',      '断刃《カイト》',       'SEVER BLADE'],
    mirrorGuard:        ['body',       '鏡断装《衛士》',       'MIRROR GARB'],
    staccatoChanter:    ['staff',      '断律杖《詠み手》',     'CHANTER RELIC'],
    graveMetronome:     ['accessory',  '葬送核《メトロノーム》', 'GRAVE CORE'],
    afterimageStalker:  ['feet',       '残像靴《追跡者》',     'AFTERIMAGE WALKER'],
    severedChoir:       ['instrument', '断奏器《聖歌隊》',     'SEVERED CHOIR SCORE'],
    instantExecutioner: ['martial',    '刹那拳《処刑人》',     'EXECUTIONER FIST'],
    edgeColossus:       ['arms',       '刃界手《巨兵》',       'EDGE COLOSSUS ARMS'],
    severanceHoarder:   ['head',       '断律面《蒐集者》',     'HOARDER VISAGE']
  };
  const relicIds = [];
  Object.entries(relicPlan).forEach(([enemyId, [kind, name, nameEn]]) => {
    const id = `monster_relic_${enemyId}`, enemy = D.enemies[enemyId];
    const weaponKind = ['sword', 'staff', 'martial', 'instrument'].includes(kind);
    const bonusValue = 10; // D1〜D3と同じ 2 + rank*2、D4は rank 4
    const bonuses = weaponKind
      ? (kind === 'staff' ? { mag: bonusValue, dex: 8 } : kind === 'instrument' ? { dex: bonusValue, mag: 8 } : kind === 'martial' ? { agi: bonusValue, str: 8 } : { str: bonusValue, dex: 8 })
      : kind === 'body' ? { vit: bonusValue, maxHp: 32 } : kind === 'head' ? { mnd: bonusValue, dex: 8 }
      : kind === 'arms' ? { str: bonusValue, dex: bonusValue } : kind === 'feet' ? { agi: bonusValue, dex: 8 }
      : { luk: bonusValue, mnd: 8 };
    const common = {
      name, nameEn, dungeonId: DUNGEON, catalogDungeon: DUNGEON, stars: 4, rarity: 'epic',
      source: 'dropOnly', dropEnemyId: enemyId, bonuses,
      description: `${enemy.name}の断律が凝固した一点物。工房では再現できない、基本能力まで押し上げる遺装。`
    };
    if (weaponKind) {
      addWeapon(id, {
        ...common, weaponType: kind,
        attackPower: ['sword', 'martial'].includes(kind) ? 70 : 0,
        magicAttackPower: ['staff', 'instrument'].includes(kind) ? 71 : 0,
        power: 3.5, powerKey: ['staff', 'instrument'].includes(kind) ? 'magicAttackPower' : 'attackPower',
        damageType: ['staff', 'instrument'].includes(kind) ? 'magical' : 'physical',
        scaling: kind === 'instrument' ? { dex: .65, mag: .35 } : null
      });
    } else {
      const ab = 57, ar = n => Math.round(ab * n);
      const profile = kind === 'head' ? { defensePower: 0, magicDefensePower: ar(.70) }
        : kind === 'body' ? { defensePower: ar(.70), magicDefensePower: 0 }
        : kind === 'arms' ? { defensePower: ar(.20), magicDefensePower: 0, attackPower: ar(.45) }
        : kind === 'feet' ? { defensePower: ar(.22), magicDefensePower: ar(.22) }
        : { defensePower: 0, magicDefensePower: 0 };
      addArmor(id, { ...common, slot: kind, ...profile });
    }
    enemy.dropTable.push({ itemId: id, chance: .006 });
    relicIds.push(id);
  });

  // 図鑑コンプリート報酬（製作・ドロップ不可）
  addArmor('archive_reward_d4', {
    name: '刹那踏破の断環', nameEn: 'SEVERED INSTANT RING', dungeonId: DUNGEON, catalogDungeon: DUNGEON,
    slot: 'accessory', stars: 4, rarity: 'epic', source: 'collection',
    bonuses: { agi: 9, dex: 9, luk: 6 }, magicDefensePower: 28,
    description: 'D4の怪異遺装をすべて盗み取った証。断ち切られた一瞬が環になって残っている。'
  });
  D.equipmentCollections[DUNGEON] = { id: 'dungeon4_monster_equipment', name: 'D4 怪異装備蒐集', itemIds: relicIds, rewardItemId: 'archive_reward_d4' };

  // ════════════════════════════════════════════════════════════
  // 8. ASTACT SERIES（★5 ボス装備）
  //
  // セリペスシリーズが「受け・反撃」なので、こちらは「速度・見切り・反撃」。
  // 武器を剣／拳／杖の3種そろえ、特定JOBだけがシリーズを組めない状態を避ける。
  // 4SETに被ダメージ軽減を置き、火力JOBでも守りを取る動機を作る。
  // ════════════════════════════════════════════════════════════
  const seriesWeapons = {
    astact_blade: ['sword',   '奏刃・断律', 'ASTACT EDGE',   68, { str: 8, agi: 9, dex: 6 }, '第四奏卿の刃。振り抜いた軌跡が一拍遅れて空間に残る。'],
    astact_claw:  ['martial', '瞬断爪',     'INSTANT CLAW',  66, { agi: 11, str: 7, dex: 6 }, '斬るのではなく、間合いそのものを断つ爪。'],
    astact_rod:   ['staff',   '断律杖・刹那', 'INSTANT ROD', 70, { mag: 9, dex: 8, agi: 6 }, '詠唱の途中を切り落として発動へ繋ぐ、断律の術杖。']
  };
  Object.entries(seriesWeapons).forEach(([id, [type, name, nameEn, power, bonuses, description]]) => {
    const magical = type === 'staff';
    addWeapon(id, {
      name, nameEn, dungeonId: DUNGEON, catalogDungeon: DUNGEON, weaponType: type,
      stars: 5, rarity: 'legendary', seriesId: 'astact', source: 'boss', power: 3.6,
      attackPower: magical ? 0 : power, magicAttackPower: magical ? power : 0,
      powerKey: magical ? 'magicAttackPower' : 'attackPower', damageType: magical ? 'magical' : 'physical',
      bonuses, description
    });
  });
  const seriesArmor = {
    astact_men:      ['head',      '奏刃の面',     'ASTACT MEN',        30, 34, { dex: 8, mnd: 6, maxMp: 14 }, '視界を捨てて間合いだけを見るための面。'],
    astact_haori:    ['body',      '断律の羽織',   'SEVERANCE HAORI',   52, 46, { maxHp: 42, agi: 8, vit: 7 }, '斬られた瞬間だけ実体を失う羽織。'],
    astact_kote:     ['arms',      '瞬断の篭手',   'INSTANT KOTE',      30, 24, { str: 7, dex: 9 }, '抜く速さのためだけに削り込まれた篭手。'],
    astact_suneate:  ['feet',      '刹那の脛当',   'INSTANT SUNEATE',   34, 28, { agi: 11, dex: 6 }, '踏み込みの一歩を丸ごと省略する脛当。'],
    astact_sigil:    ['accessory', '第四奏の断印', 'FOURTH MAESTRI SIGIL', 0, 22, { agi: 8, dex: 8, luk: 6 }, '第四奏卿の断律を刻む印。切り返しの一拍を早める。']
  };
  Object.entries(seriesArmor).forEach(([id, [slot, name, nameEn, def, mdef, bonuses, description]]) => {
    addArmor(id, {
      name, nameEn, dungeonId: DUNGEON, catalogDungeon: DUNGEON, slot,
      stars: 5, rarity: 'legendary', seriesId: 'astact', source: 'boss',
      recommendedJobs: ['martialArtist', 'dualBlade', 'warrior', 'mage'],
      defensePower: def, magicDefensePower: mdef, bonuses, description
    });
  });

  const seriesRecipes = {
    astact_blade_recipe:    ['astact_blade',   2600, [['astact_core', 2], ['staccato_fragment', 8], ['edgeOfTheInstant', 5]]],
    astact_claw_recipe:     ['astact_claw',    2600, [['astact_core', 2], ['staccato_fragment', 8], ['zanshinCore', 8]]],
    astact_rod_recipe:      ['astact_rod',     2600, [['astact_core', 2], ['staccato_fragment', 8], ['severedEcho', 8]]],
    astact_men_recipe:      ['astact_men',     1800, [['astact_core', 1], ['staccato_fragment', 6], ['severedEcho', 6]]],
    astact_haori_recipe:    ['astact_haori',   2400, [['astact_core', 2], ['staccato_fragment', 8], ['afterimageSilk', 8]]],
    astact_kote_recipe:     ['astact_kote',    1750, [['astact_core', 1], ['staccato_fragment', 6], ['instantSteel', 8]]],
    astact_suneate_recipe:  ['astact_suneate', 1750, [['astact_core', 1], ['staccato_fragment', 6], ['afterimageSilk', 6]]],
    astact_sigil_recipe:    ['astact_sigil',   2100, [['astact_core', 2], ['staccato_fragment', 7], ['presto_gear', 3]]]
  };
  Object.entries(seriesRecipes).forEach(([id, [resultItemId, gold, m]]) =>
    addRecipe(id, { seriesId: 'astact', craftCategory: 'boss', resultItemId, gold, materials: mats(m), progressionRecipe: false }));

  D.bossEquipmentSeries.astact = {
    id: 'astact', name: 'ASTACT SERIES', nameJa: 'アスタクトシリーズ', stars: 5,
    unlockCondition: { bossDefeated: 'astact' },
    primaryJob: 'martialArtist', recommendedJobs: ['martialArtist', 'dualBlade', 'warrior', 'mage'],
    concept: '剣・拳・杖の3武器から選び、速度と見切りで戦う断律シリーズ。4SETの軽減で受けにも回れる。',
    equipment: [...Object.keys(seriesWeapons), ...Object.keys(seriesArmor)], maxEquippable: 6,
    recipes: Object.keys(seriesRecipes),
    dismantle: { materialId: 'staccato_fragment', count: 3 },
    setBonuses: {
      2: { id: 'staccato',  name: 'STACCATO',  description: '素早さ +10% / 器用さ +8%', effect: { agiPercent: 10, dexPercent: 8 } },
      4: { id: 'zanshin',   name: 'ZANSHIN',   description: '被ダメージ8%軽減 / 反撃率 +10%', effect: { damageReductionPercent: 8, counterRateFlat: .10 } },
      6: { id: 'severance', name: 'SEVERANCE', description: 'クリティカル率 +8% / 反撃威力 +40%', effect: { critBonusFlat: .08, counterPowerPercent: 40 } }
    }
  };

  // ════════════════════════════════════════════════════════════
  // 9. 素材からのレシピ解放
  // ════════════════════════════════════════════════════════════
  Object.assign(D.materialUnlockMap, {
    severanceShard:   ['forge_d4_sword_recipe', 'forge_d4_martial_recipe', 'forge_d4_leftHand_recipe'],
    instantSteel:     ['forge_d4_shield_recipe', 'forge_d4_body_recipe', 'forge_d4_arms_recipe'],
    afterimageSilk:   ['forge_d4_staff_recipe', 'forge_d4_instrument_recipe', 'forge_d4_feet_recipe', 'forge_d4_head_recipe'],
    zanshinCore:      ['forge_d4e_sword_recipe', 'forge_d4e_martial_recipe', 'forge_d4e_shield_recipe', 'forge_d4_accessory_recipe'],
    severedEcho:      ['forge_d4e_staff_recipe', 'forge_d4e_instrument_recipe', 'forge_d4e_head_recipe', 'forge_d4e_body_recipe'],
    edgeOfTheInstant: ['forge_d4e_leftHand_recipe', 'forge_d4e_arms_recipe', 'forge_d4e_feet_recipe', 'forge_d4e_accessory_recipe']
  });
  // 解放対象になったレシピへ materialUnlockId を立てる（isRecipeUnlocked が見る）
  Object.entries(D.materialUnlockMap).forEach(([matId, recipeIds]) => recipeIds.forEach(rid => {
    if (D.recipes[rid] && D.recipes[rid].dungeonId === DUNGEON) D.recipes[rid].materialUnlockId = matId;
  }));

  // ════════════════════════════════════════════════════════════
  // 10. SCORE「STACCATO」をプレイヤー向けへ開放する
  //     （future_data.js の予約定義から DEV フラグだけ外す。D5〜D7は据え置き）
  // ════════════════════════════════════════════════════════════
  const staccato = D.musicScores?.staccato;
  if (staccato) {
    delete staccato.devOnly; delete staccato.futureOnly;
    delete staccato.contentState; delete staccato.balanceState; delete staccato.releaseFlag;
  }

  // ════════════════════════════════════════════════════════════
  // 11. ボス行動ルーチン
  //
  // 命中・回避の計算式には触れていない。
  // 判定は既存の rollEnemyAttackOutcome / receivePlayerDamage をそのまま呼ぶ。
  // 「硬さ」は既存の defBuffUntil / mdefBuffUntil を使って表現する。
  // ════════════════════════════════════════════════════════════
  const BattleGame = window.BattleGame;
  if (!BattleGame) return;

  const $ = sel => document.querySelector(sel);

  // 直前の自ターンからどれだけHPを削られたかを見る。
  // プレイヤーの行動内容を戦闘側から読み取らずに「反応」を作るための共通処理。
  function takenSinceLastAct(enemy) {
    const before = enemy.d4LastHp == null ? enemy.hp : enemy.d4LastHp;
    enemy.d4LastHp = enemy.hp;
    return Math.max(0, before - enemy.hp);
  }

  // ボス共通の一撃。seripesStrike と同じ経路をたどる。
  async function d4Strike(enemy, actionKey, label, kicker, type, power, hits = 1) {
    const el = document.getElementById(enemy.uid), ren = $('#ren'), magical = type === 'magical';
    this.flashTitle(label, kicker); this.audio.sfx(magical ? 'dark' : 'slash');
    el?.classList.add('enemy-attacking');
    await this.battleSleep(360);
    const action = enemy.specialAttacks?.[actionKey] || { id: actionKey, name: label, kind: magical ? 'magic' : 'physical' };
    let landed = 0;
    for (let i = 0; i < hits; i++) {
      if (this.finished || this.player.hp <= 0) break;
      const outcome = this.rollEnemyAttackOutcome(enemy, action);
      if (!outcome.hit) {
        this.triggerEvade(enemy, 'player', action, { source: 'd4Strike' });
        this.floating(ren, 'EVADE', 'miss');
        this.setLog(`${enemy.name}の${label}！ ${this.playerName()}はかわした！`);
      } else {
        ren.classList.add('hit');
        const defUp = (!magical && this.player.buffs?.defUp && this.turn <= this.player.buffs.defUp.until) ? 1 + (this.player.buffs.defUp.rate || 0) : 1;
        const raw = this.enemyRawDamage(magical ? 'magical' : 'physical', (magical ? enemy.stats.mag : enemy.stats.atk) * power, defUp);
        const actual = this.receivePlayerDamage(Math.max(1, Math.round(raw)), magical ? 'magical' : 'physical');
        this.audio.sfx('playerHit'); this.floating(ren, actual, 'enemy-damage');
        this.setLog(`${enemy.name}の${label}！ ${actual}ダメージ。`);
        landed++;
      }
      this.updateHUD();
      await this.battleSleep(hits > 1 ? 300 : 460);
      ren.classList.remove('hit');
    }
    el?.classList.remove('enemy-attacking');
    if (landed) await this.tryCounter(enemy);
  }

  // ── 中ボス：プレスト ──────────────────────────────
  // 毎ターン「拍」を1溜め、3でプレスティッシモ（3連撃）を撃って0へ戻す。
  // 直前のターンに最大HPの7%以上を削られていれば拍が1つ乱れて減る。
  // 「殴り続ければ大技を止められる」という、火力側の明確な答えを用意する。
  BattleGame.bossAttackHandlers = BattleGame.bossAttackHandlers || {};
  BattleGame.bossAttackHandlers.presto = async function (enemy) {
    const taken = takenSinceLastAct(enemy), burst = enemy.stats.maxHp * .07;
    enemy.beat = enemy.beat || 0;

    if (taken >= burst && enemy.beat > 0) {
      enemy.beat--;
      this.flashTitle('OFF BEAT', `拍 ${enemy.beat} / 3`);
      this.setLog(`強打がプレストの拍を乱した！ 連奏カウントが${enemy.beat}へ落ちる。`);
      this.floating(document.getElementById(enemy.uid), '拍 -1', 'debuff');
      await this.battleSleep(420);
    }

    if (enemy.hp / enemy.stats.maxHp <= .45 && !enemy.accelerated) {
      enemy.accelerated = true;
      enemy.stats.atk = Math.round(enemy.stats.atk * 1.18);
      this.flashTitle('ACCELERANDO', 'PHASE 2');
      this.setLog('プレスト「まだ遅い。もっと詰めよう。」拍が一段速くなった。');
      await this.battleSleep(620);
    }

    if (enemy.beat >= 3) {
      enemy.beat = 0;
      await d4Strike.call(this, enemy, 'prestissimo', 'プレスティッシモ', 'BEAT 3 // TRIPLE', 'physical', .92, 3);
      enemy.d4LastHp = enemy.hp;
      return;
    }

    enemy.beat++;
    this.floating(document.getElementById(enemy.uid), `拍 ${enemy.beat} / 3`, 'buff');

    // 溜めている間は素の攻撃で圧をかける。魔法混じりにして防具の片寄りを咎める。
    if (enemy.accelerated && Math.random() < .30) {
      await d4Strike.call(this, enemy, 'offbeat', 'オフビート', 'MID BOSS ACTION', 'magical', 1.05);
    } else {
      await d4Strike.call(this, enemy, 'cutAway', '断ち払い', 'MID BOSS ACTION', 'physical', .95);
    }
    enemy.d4LastHp = enemy.hp;
  };

  // ── 最終ボス：アスタクト ──────────────────────────
  // 3つの構えを回す。
  //   抜刀（DRAW）    … その1ターン、防御・魔法防御が跳ね上がる（＝硬い）。次ターンに居合一閃。
  //   残心（ZANSHIN） … 直前に大きく削られていれば返し斬り。攻めっぱなしを咎める。
  //   瞬断（SEVERANCE）… 通常の3連撃。
  // 55%で加速（抜刀周期が4→3ターン）、22%で終奏《刹那》の予兆→必中の大技。
  // 抜刀ターンに殴るのは損なので、そこが防御・回復・バフの置き場所になる。
  BattleGame.bossAttackHandlers.astact = async function (enemy) {
    const hpRate = enemy.hp / enemy.stats.maxHp;
    const taken = takenSinceLastAct(enemy), heavy = enemy.stats.maxHp * .06;

    if (!enemy.phase2 && hpRate <= .55) {
      enemy.phase2 = true;
      this.flashTitle('ACCELERANDO', 'PHASE 2');
      this.setLog('アスタクト「――そう。そこで止まらないでほしい。」抜刀が速くなった。');
      await this.battleSleep(680);
    }
    if (!enemy.finalPhase && hpRate <= .22) {
      enemy.finalPhase = true;
      this.flashTitle('FINAL PHASE', 'THE LAST INSTANT');
      this.setLog('アスタクト「では、終わりの一拍を。」終奏の気配が回廊に満ちる。');
      await this.battleSleep(680);
    }

    // ── 予告した大技の解放 ──
    if (enemy.pending === 'quickDraw') {
      enemy.pending = null; enemy.defBuffUntil = 0; enemy.mdefBuffUntil = 0;
      await d4Strike.call(this, enemy, 'quickDraw', '居合一閃', 'DRAW // RELEASE', 'physical', 2.05);
      enemy.d4LastHp = enemy.hp;
      return;
    }
    if (enemy.pending === 'finalInstant') {
      enemy.pending = null;
      await d4Strike.call(this, enemy, 'finalInstant', '終奏《刹那》', 'THE LAST INSTANT', 'physical', 2.45);
      enemy.d4LastHp = enemy.hp;
      return;
    }

    // ── 終奏の予兆（最終フェーズのみ・4ターンごと） ──
    if (enemy.finalPhase && this.turn % 4 === 0) {
      enemy.pending = 'finalInstant';
      this.flashTitle('終奏の構え', 'UNAVOIDABLE // NEXT TURN');
      this.setLog('アスタクトが刀を鞘へ収めた。次のターン、必中の終奏《刹那》が来る――受けきる用意を。');
      await this.battleSleep(700);
      enemy.d4LastHp = enemy.hp;
      return;
    }

    // ── 残心：直前に大きく削られていれば返す ──
    if (taken >= heavy && this.turn > (enemy.zanshinReadyAt || 0)) {
      enemy.zanshinReadyAt = this.turn + 1;
      this.flashTitle('残心', 'ZANSHIN // RIPOSTE');
      this.setLog('踏み込んだ分だけ、返ってくる。');
      await d4Strike.call(this, enemy, 'zanshinCut', '残心の返し', 'RIPOSTE', 'physical', 1.35);
      enemy.d4LastHp = enemy.hp;
      return;
    }

    // ── 抜刀：構えている間は硬い。攻撃を通しても意味が薄い1ターン ──
    const drawCycle = enemy.phase2 ? 3 : 4;
    if (this.turn % drawCycle === 0) {
      enemy.pending = 'quickDraw';
      enemy.defBuffUntil = this.turn + 1; enemy.defBuffRate = .70;
      enemy.mdefBuffUntil = this.turn + 1; enemy.mdefBuffRate = .70;
      this.flashTitle('抜刀', 'DRAW STANCE // GUARD UP');
      this.setLog('アスタクトが抜刀の構えを取った。刃筋が通らない――次のターンの居合一閃に備えろ。');
      this.floating(document.getElementById(enemy.uid), '構え', 'buff');
      await this.battleSleep(700);
      enemy.d4LastHp = enemy.hp;
      return;
    }

    // ── 通常行動 ──
    if (Math.random() < (enemy.phase2 ? .32 : .22)) {
      await d4Strike.call(this, enemy, 'moonReversal', '月返し', 'BOSS MAGIC', 'magical', 1.25);
    } else {
      await d4Strike.call(this, enemy, 'severance', '瞬断', 'SEVERANCE', 'physical', .72, 3);
    }
    enemy.d4LastHp = enemy.hp;
  };

  // ════════════════════════════════════════════════════════════
  // 12. ボス戦の開始処理
  // ════════════════════════════════════════════════════════════
  function startD4Boss(bossId, mode, kicker, subtitle, log) {
    this.battleMode = mode;
    const stats = this.totalStats(), template = D.enemies[bossId], vitals = this.storedVitals(stats);
    this.playBossMusic(bossId);
    this.player = this.freshBattlePlayer(stats, vitals.hp, vitals.mp);
    const bossStats = { ...template.stats };
    this.enemies = [{
      ...template, uid: `${bossId}-boss`, label: '', stats: bossStats, hp: bossStats.maxHp, alive: true,
      beat: 0, pending: null, phase2: false, finalPhase: false, accelerated: false,
      zanshinReadyAt: 0, d4LastHp: bossStats.maxHp,
      bindResistance: template.bindResistance ?? .45, bindTurns: 0
    }];
    this.turn = 1; this.locked = false; this.finished = false; this.resetBattleLog();
    this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [], masteryResults: [], jobResults: [] };
    $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none';
    $('#game').hidden = false; $('#game').style.display = 'grid';
    $('#result').hidden = true; $('#result').style.display = 'none';
    $('#ren').className = 'ren fighter idle';
    this.applySetBattleVisual(); this.applyDungeonBackground(); this.renderEnemies();
    this.applyEquipmentVisual(); this.updateHUD();
    this.setLog(log); this.flashTitle(kicker, subtitle); this.showMainCommands();
  }

  BattleGame.bossStartHandlers = BattleGame.bossStartHandlers || {};
  BattleGame.bossStartHandlers.presto = function () {
    if (this.isBossDefeated('presto')) return;
    this.currentDungeonId = DUNGEON;
    startD4Boss.call(this, 'presto', 'presto', 'MID BOSS ENCOUNTER', 'PRESTO // ACCELERATION',
      'プレスト「遅い。もっと詰めて。」拍が刻まれ始めた。');
  };
  BattleGame.bossStartHandlers.astact = function () {
    this.currentDungeonId = DUNGEON;
    startD4Boss.call(this, 'astact', 'astact', 'BOSS ENCOUNTER', 'ASTACT // THE SEVERED INSTANT',
      '回廊の奥、刀を提げた影が一度だけ振り返る。第四奏卿――瞬断の奏刃アスタクト。');
  };

  // ════════════════════════════════════════════════════════════
  // 13. 撃破後リザルト
  // ════════════════════════════════════════════════════════════
  BattleGame.bossVictoryHandlers = BattleGame.bossVictoryHandlers || {};
  BattleGame.bossVictoryHandlers.presto = function (rewardBlock) {
    const firstClear = !this.isBossDefeated('presto');
    this.markBossDefeated('presto');
    this.saveProfile();
    const note = firstClear
      ? '<div class="boss-recipe-unlock"><small>MID BOSS CLEARED</small><b>BEAT BROKEN</b><strong>D4後半ルート解放</strong><span>プレストの拍を断ち切った。断律の刹那廊をさらに奥へ進める。</span></div>'
      : '';
    this.showResult('VICTORY', '《先駆の急奏体》プレストを撃破した！', 'PRESTO // SILENCED', `${rewardBlock}${note}`);
  };
  BattleGame.bossVictoryHandlers.astact = function (rewardBlock) {
    const firstClear = !this.isBossDefeated('astact');
    const firstScore = !this.profile.musicScores?.staccato;
    this.markBossDefeated('astact');
    this.profile.musicScores ||= {};
    if (firstScore) this.profile.musicScores.staccato = true;
    this.noteBossRematchSnapshot('astact');
    this.saveProfile();
    this.flashTitle('SEVERED.', 'THE INSTANT ENDS');
    this.showBossRewardSequence(
      { title: 'VICTORY', copy: '瞬断の奏刃アスタクトの刀が、鞘へ収まる前に止まった。', kicker: 'FOURTH MAESTRI DEFEATED', html: rewardBlock },
      [
        firstScore && { title: 'SCORE GET', copy: '盗んだ旋律は、プライベートモードで演奏できる。', kicker: 'PHANTOM SCORE', html: this.scoreGetHTML('staccato') },
        firstClear && { title: 'PHANTOM STEAL', copy: '奪った断律を、工房の製法へ変換した。', kicker: 'NEW RECIPES STOLEN', html: this.bossSeriesUnlockHTML('astact', ' 剣・拳・杖から選べる★5シリーズが製作可能。') }
      ]
    );
  };
})();
