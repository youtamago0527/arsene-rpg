window.ARSENE_DATA = {
  // dungeon2BossWins：ミルティ解放に必要なダンジョン2の勝利数。4時間構想の主調整値。
  // debugPassword：拠点の狐を長押しで開くデバッグルームのパスワード
  settings: { healOnBattleStart: false, saveKey: 'arsene-rpg-save-v01', bossRematchWins: 5, dungeon2BossWins: 100, dungeon3MidBossWins: 28, dungeon3TargetWins: 60, debugPassword: '1229', mealGoldRate: 0.3, counterPowerRate: 0.7, battleMenuTestReturn: true, autoBattleSpeed: 1.5, autoBattleSpeedSteps: [1.5, 2] },
  guardianBalance: {
    shieldDefRate: 0.5, shieldMdefRate: 0.5,
    // RESONANCE は軽減後の実ダメージを参照する。転生補正は守護士のみ全量、
    // PHANTOM THIEF が ACTION として盗んだ場合は補正分だけ半量にする。
    resonanceBaseRate: 0.05, resonanceRebirthBonus: 0.01, resonanceRebirthCap: 0.15,
    phantomRebirthBonusRate: 0.50, resonanceGainPerDamage: 0.05,
    echoAttackRate: 0.05, echoResonanceBonus: 0.10,
    steadfastThreshold: 0.30, steadfastReduction: 0.10,
    guardStatusResist: 0.20, guardResonanceBonus: 0.20,
    fortressReduction: 0.30, resonanceMax: 100,
    resonanceTiers: [{ min: 100, multiplier: 2.0 }, { min: 75, multiplier: 1.75 }, { min: 50, multiplier: 1.5 }, { min: 25, multiplier: 1.25 }, { min: 1, multiplier: 1.0 }]
  },
  seripesBalance: {
    regenRate: 0.025, repriseDamageRate: 0.35, grandRepriseDamageRate: 0.55,
    phase2HpRate: 0.50, finalHpRate: 0.25, fortissimoRate: 0.20
  },
  dualBladeOffHandRate: 0.70,
  // 武器種マスタ。ここに追記すれば得意武器選択・アイテム欄のタブへ自動反映される。
  // damageStats は将来の体術ダメージ計算（力＋素早さ）用の予約情報。
  weaponTypes: [
    { id: 'sword', name: '剣', nameEn: 'SWORD', description: '力で斬り込む近接武器。素直な物理攻撃。', damageStats: ['str'], starterWeaponId: 'phantomSword' },
    { id: 'staff', name: '杖', nameEn: 'STAFF', description: '魔力を導く杖。魔法主体で戦う。', damageStats: ['mag'], starterWeaponId: 'mageStaff' },
    { id: 'martial', name: '体術', nameEn: 'MARTIAL', description: '爪や籠手を使う徒手格闘。速さで手数を稼ぐ。', damageStats: ['str', 'agi'], starterWeaponId: 'ironClaw' },
    // 楽器：魔奏士の証を入手するまでロック。器用さを火力へ変換する。
    { id: 'instrument', name: '楽器', nameEn: 'INSTRUMENT', description: '音に魔を乗せて放つ。器用さがそのまま威力になる。', damageStats: ['dex'], starterWeaponId: null, unlockFlag: 'instrumentUnlocked' },
    { id: 'shield', name: '盾', nameEn: 'SHIELD', description: '防御性能を攻撃へ転換する守護士の武器。', damageStats: ['vit', 'mnd'], starterWeaponId: 'guardianAegis', unlockFlag: 'shieldUnlocked' }
  ],
  // 武器種ごとの通常攻撃。未定義の武器種は 'attack'（剣と同じ物理攻撃）にフォールバック。
  basicAttackByWeaponType: { sword: 'attack', staff: 'staffFireball', martial: 'martialStrike', instrument: 'resonantNote', shield: 'shieldStrike' },
  // ══════════════════════════════════════════════════════════════
  // 武器種ごとの攻撃性能スケーリング。新武器種はここへ1行足すだけ。
  //   scaling      : 基礎能力をどの割合で攻撃性能へ変換するか
  //   powerKey     : 加算する装備側の戦闘能力キー
  //   damageType   : physical / magical（防御側の参照が変わる）
  // ══════════════════════════════════════════════════════════════
  // 命中率（隠しステータス／画面には出さない）。攻撃側DEXと防御側AGIで共通判定する。
  // 数値は小数（0.05 = 5%）。既存敵にDEX/AGIが無い場合は戦闘側でSPDへフォールバックする。
  accuracy: { base: 0.90, dexRate: 0.006, defenderAgiRate: 0.005, min: 0.05, max: 1.0 },
  weaponScaling: {
    sword:   { scaling: { str: 1.0 },            powerKey: 'attackPower',      damageType: 'physical', accuracyModifier:  0.00 },
    martial: { scaling: { str: 0.5, agi: 0.5 },  powerKey: 'attackPower',      damageType: 'physical', accuracyModifier:  0.05 },
    staff:   { scaling: { mag: 1.0 },            powerKey: 'magicAttackPower', damageType: 'magical',  accuracyModifier:  0.00 },
    // 楽器：器用さを魔法攻撃へ変換する。魔奏士の証で解放。
    instrument: { scaling: { dex: 1.0 },        powerKey: 'magicAttackPower', damageType: 'magical',  accuracyModifier:  0.05 },
    shield: { scaling: {}, powerKey: 'defensePower', damageType: 'physical', accuracyModifier: -0.10 }
  },
  // 防御性能：物理は 体力＋装備防御力 / 魔法は 精神＋装備魔法防御力
  // ══ 属性の弱点 ══
  // 耐性による減衰は使わない。弱点を突いた時だけ、その攻撃に倍率が乗る。
  // 敵側の弱点表記が「火」と「炎」で揺れているので、両方を同じ属性として扱う。
  elementWeakness: {
    multiplier: 1.25,
    labels: { fire: ['火', '炎'], ice: ['氷'], thunder: ['雷'], light: ['光'], dark: ['闇'], sound: ['音'] }
  },
  defenseScaling: {
    physical: { stat: 'vit', powerKey: 'defensePower' },
    magical:  { stat: 'mnd', powerKey: 'magicDefensePower' }
  },
  // 武器種ごとの技コマンド名。閃いた技はここに集約される。
  weaponArtsCommand: {
    sword: { name: '剣技', nameEn: 'SWORD ARTS' },
    staff: { name: '魔法', nameEn: 'MAGIC' },
    martial: { name: '拳技', nameEn: 'FIST ARTS' },
    instrument: { name: '楽奏', nameEn: 'SONG ARTS' },
    shield: { name: '盾技', nameEn: 'SHIELD ARTS' }
  },
  // 戦闘コマンドの画像・色はここだけで差し替え可能。
  // 武器学は weapon-<weaponType> を使い、未登録ならコード内SVGへ戻る。
  commandVisuals: {
    iconSheet: 'assets/ui/battle/command-icons-v1.png',
    // 下部の「武器技」カードは共通デザイン。装備中の武器種による違いは、
    // タップ後に開く技一覧だけへ反映する（個別カード表示は必要になった時だけ再有効化）。
    useDynamicWeaponCards: false,
    // 武器学コマンドはアイコン・名称まで焼き込んだ完成カードを武器種ごとに交換する。
    weaponCards: {
      sword: 'assets/ui/battle/lower-ui-v2/weapon-card-sword-v3.png',
      staff: 'assets/ui/battle/lower-ui-v2/weapon-card-staff-v2.png',
      martial: 'assets/ui/battle/lower-ui-v2/weapon-card-martial-v2.png',
      instrument: 'assets/ui/battle/lower-ui-v2/weapon-card-instrument-v2.png',
      shield: 'assets/ui/battle/lower-ui-v2/weapon-card-shield-v2.png',
      bow: 'assets/ui/battle/lower-ui-v2/weapon-card-bow-v2.png',
      spear: 'assets/ui/battle/lower-ui-v2/weapon-card-spear-v2.png',
      greatsword: 'assets/ui/battle/lower-ui-v2/weapon-card-greatsword-v2.png'
    },
    // 完成カードごとの見え方を個別に微調整できる。元画像の縦横比は変えず、
    // size を少し上げる場合だけ周辺をわずかにトリミングしてカードを大きく見せる。
    weaponCardPresentation: {
      sword: { size: '104% 104%', position: 'center' }
    },
    // 元画像は正方形セル3列×2行。displayTile/cropHeightだけで全アイコンの位置を一括調整できる。
    sheetLayout: { columns: 3, rows: 2, displayTile: 40, cropHeight: 27 },
    icons: {
      attack: { column: 0, row: 0 },
      'weapon-instrument': { column: 1, row: 0 },
      'weapon-sword': { src: 'assets/ui/battle/weapon-sword-v1.png', chromaKey: 'white' },
      'weapon-staff': { src: 'assets/ui/battle/weapon-magic-v1.png', chromaKey: 'white' },
      'weapon-martial': { src: 'assets/ui/battle/weapon-martial-v1.png' },
      'weapon-bow': { src: 'assets/ui/battle/weapon-bow-v1.png', chromaKey: 'white' },
      'weapon-spear': { src: 'assets/ui/battle/weapon-spear-v1.png' },
      'weapon-shield': { src: 'assets/ui/battle/guard-v1.png' },
      skill: { column: 2, row: 0 },
      guard: { src: 'assets/ui/battle/guard-v1.png' },
      item: { column: 1, row: 1 },
      escape: { column: 2, row: 1 }
    },
    tones: {
      attack: { border: '#b32643', glow: '#ff6b87', background: '#78142f' },
      weapon: { border: '#275fa5', glow: '#5eb9ff', background: '#123f7c' },
      skill: { border: '#69409b', glow: '#ca87ff', background: '#402069' },
      guard: { border: '#a9adb8', glow: '#f1f4fb', background: '#3d414a', iconFilter: 'drop-shadow(0 0 4px #dfeaff)' },
      item: { border: '#397d69', glow: '#78d6bb', background: '#123e35' },
      neutral: { border: '#655979', glow: '#c5c6ce', background: '#171421' }
    }
  },
  startingJobIds: ['warrior', 'martialArtist', 'mage', 'priest'],

  // ══════════════════════════════════════════════════════════════
  // 成長バランス設定：テストプレイ調整はすべてここを触れば済む
  // ══════════════════════════════════════════════════════════════
  growthBalance: {
    // ── 武器学 ──────────────────────────────────────────────
    // 表示上は無制限。異常データ対策だけ十分大きな安全上限を置く。
    weaponMasterySafetyMaxLevel: 1000000,
    // 必要EXP = weaponExpBase + 現在Lv × weaponExpPerLevel
    weaponExpBase: 20,
    weaponExpPerLevel: 5,
    weaponExpTable: { base: 20, perLevel: 5 },
    // 通常攻撃・武器技のACTION単位で加算。多段数では増えない。
    weaponExpPerAction: 1,
    weaponExpStrongAction: 2,
    weaponExpStrongSparkLevel: 30,
    // EXPは持ち越すが、武器学Lv.UPは1戦につき1まで。
    weaponMasteryLevelUpsPerBattle: 1,
    // 対応武器で与える最終ダメージ。上限は設けない。
    weaponMasteryDamagePerLevel: 0.005,

    // ── HP / MP 成長（戦闘終了時の確率判定）──────────────────
    baseHpGrowthRate: 0.15,
    baseMpGrowthRate: 0.08,
    hpGrowthAmount: { min: 1, max: 5 },
    mpGrowthAmount: { min: 1, max: 3 },
    // 最大HPが100増えるごとに、HP成長へ必要な敵Spark Lvも10上がる。
    // HP 0～99: 全敵 / 100～199: Spark Lv.10以上 / 200～299: Lv.20以上…
    // MPも同じ考え方（最大MPの区切りごとにSpark Lv要求が上がる）。
    vitalGrowthHpTierSize: 100,
    vitalGrowthMpTierSize: 100,
    vitalGrowthSparkPerTier: 10,
    jobHpGrowthBonus: { warrior: 0.10, martialArtist: 0.07, mage: 0.00, priest: 0.05, guardian: 0.12 },
    jobMpGrowthBonus: { warrior: 0.00, martialArtist: 0.02, mage: 0.10, priest: 0.08, guardian: 0.03 },

    // ── 閃き ────────────────────────────────────────────────
    // sparkScore = 武器学Lv + 敵Spark Lv - 技Spark Rank
    sparkRateTable: [
      { minScore: 30, rate: .15 }, { minScore: 20, rate: .12 }, { minScore: 10, rate: .08 },
      { minScore: 0, rate: .05 }, { minScore: -9, rate: .02 }, { minScore: -19, rate: .01 },
      { minScore: -29, rate: .005 }, { minScore: -Infinity, rate: 0 }
    ],
    sparkSourceMultipliers: { basic: .25, related: .5, direct: 2.0 },
    sparkInitialCastFree: true,
    // パッシブは転生1回ごとに、全JOB共通でこの値ぶん強くなる（絶対値の+2%）。
    // 旧仕様の「基本値×40%」は、基本値が小さいパッシブほど伸びず
    // 転生しても上がった気がしない、という問題があったため一律へ変更した。
    // 個別に rebirthStep / rebirthTable / max を書けばそちらが優先される。
    passiveRebirthStepFlat: 0.02,
    // JOB特性（そのJOBに就いている間だけの効果）は従来どおり基本値比で伸ばす。
    jobTraitRebirthStepRate: 0.4,
    // 転生時、直前までにそのJOBのLvアップで得た能力のうち残す割合。
    rebirthStatRetentionRate: 0.20,
    // 転生1回につき、次のLvアップで得られるJOB成長量を10%増やす。
    rebirthGrowthPerCycle: 0.10,
    // キャラクター固有特性 "small" が何倍になるか（characters.json 側は記号のみ保持）
    traitBonusScale: { small: { weaponExp: 1.2, spark: 1.5, mpGrowth: 1.3, heal: 1.3, critical: 0.03 } },

    // ── 成長しないジョブ ────────────────────────────────────
    noGrowthJobs: ['phantomThief'],

    // ── ジョブLvアップ時の基礎ステータス成長（1Lvごと）───────
    // 初期4職は合計6/Lv（Lv1→20で114ポイント）で統一。偏りでジョブ個性を作る。
    jobGrowthPerLevel: {
      // どのJOBも合計6/Lvで揃える（Lv1→20で114ポイント）。
      // 器用さを伸ばすのは魔奏士だけ。楽器のダメージと命中に直結する。
      warrior:       { str: 2, vit: 2, mag: 0, mnd: 1, agi: 1, dex: 0, luk: 0 },
      martialArtist: { str: 2, vit: 1, mag: 0, mnd: 0, agi: 2, dex: 0, luk: 1 }, // 体術は力0.5+素早さ0.5なので力を上げて伸び幅を戦士に揃える
      mage:          { str: 0, vit: 0, mag: 2, mnd: 2, agi: 1, dex: 0, luk: 1 },
      priest:        { str: 0, vit: 2, mag: 1, mnd: 2, agi: 0, dex: 0, luk: 1 },
      // 魔奏士：器用さ最優先。マジックナイトなので力と魔力も伸びる。
      magicKnight:   { str: 1, vit: 1, mag: 2, mnd: 0, agi: 0, dex: 2, luk: 0 },
      guardian:      { str: 0, vit: 3, mag: 0, mnd: 2, agi: 0, dex: 1, luk: 0 }
    },
    // パッシブ習得Lv
    jobPassiveLevels: [5, 10, 15],
    // 通常ジョブが他ジョブから持ち込めるパッシブ枠数 / PHANTOM THIEF の枠数
    passiveSlotCount: { normal: 1, phantomThief: 2 },
    actionSlotCount: { normal: 0, phantomThief: 2 },
    // JOB成長は「今就いているJOBで育てた分」だけ乗る。
    // PHANTOM THIEF だけは全JOBの合算をこの割合で引き継げる。
    phantomThiefInheritRate: 0.5,
    // jobGrowthPerLevel導入前の旧growthテーブルを使うJOBも、
    // PHANTOM THIEFの50%継承から漏らさない。既存セーブ互換用。
    phantomLegacyGrowthJobs: ['dualBlade'],
    // PHANTOM THIEF専用「盗奪進行度」。転生回数は含めず、MASTER済みJOBはLv20として扱う。
    // JOB MASTERはJOBレベル到達と重複するため、別枠の加点にはしない。
    phantomStealProgress: {
      jobLevelCap: 20,
      weaponLevelCap: 20,
      weights: { jobLevels: 0.50, passives: 0.25, weaponMastery: 0.25 }
    },
    // 魔奏士《魔力装填》の追加ダメージ係数
    magicChargeRate: 0.5
  },
  // ══════════════════════════════════════════════════════════════
  // 魔奏士バランス。パッシブの発動率・持続・重ねがけ上限はここだけ触ればよい。
  //   buffTurns  : 発動したバフが続くターン数（1＝そのターンのみ）
  //   maxStacks  : 同じバフを何回まで重ねられるか
  //   転生でスキル強化する場合は buffTurns を上げる想定。
  // ══════════════════════════════════════════════════════════════
  maestroBalance: {
    procChance: 0.50,      // 通常時の発動率
    nocturneChance: 0.30, // ノクターン専用。耐久JOBとの組み合わせを考慮
    ensembleChance: 0.75,  // アンサンブル中の発動率
    ensembleTurns: 3,      // アンサンブルの持続ターン
    buffTurns: 2,          // フォルテ／クレッシェンドの持続ターン（転生強化で3を想定）
    buffRate: 0.10,        // 1スタックあたりの上昇率
    maxStacks: 3,          // 重ねがけ上限
    nocturneTurns: 3,      // ノクターンの自然回復ターン数
    nocturneHealRate: 0.08, // 1ターンあたりの回復量（最大HP比）
    soloTurns: 2,          // ソロ（2回行動）の持続ターン
    soloChance: 0.35       // ソロだけは別の発動率。2回行動は影響が大きいので絞る
  },

  // 1面クリア目安30分：通常戦17回（1戦約50秒）＋ボス2戦＋拠点操作
  battleProgression: { noelEncounterWins: 8, zenakadoEncounterWins: 17 },
  expTable: { 1: 50, 2: 120, 3: 220 },
  jobExpTable: {
    1: 25, 2: 45, 3: 70, 4: 100, 5: 135, 6: 175, 7: 220, 8: 270, 9: 330, 10: 400,
    11: 480, 12: 570, 13: 670, 14: 780, 15: 900, 16: 1040, 17: 1190, 18: 1360, 19: 1550,
    // Lv20〜39（セリペス撃破で解放される限界突破帯）。既存カーブの平均上昇率(約1.147倍/Lv)を
    // そのまま延長した上で、Lv1〜20より少し上がりづらくなるよう全体を1.5倍にしてある。
    20: 2667, 21: 3060, 22: 3511, 23: 4028, 24: 4621, 25: 5301, 26: 6081, 27: 6977, 28: 8004, 29: 9183,
    30: 10535, 31: 12086, 32: 13865, 33: 15907, 34: 18249, 35: 20936, 36: 24018, 37: 27555, 38: 31612, 39: 36266
  },
  jobLevelCap: 20,
  // セリペス撃破で解放される限界突破後の上限。canRebirth側は従来通りjobLevelCap(20)を
  // 転生可能ラインとして参照し続けるため、Lv20〜40のどのタイミングでも転生を選べる。
  jobLevelCapExtended: 40,
  // 強化は「その装備自身の戦闘値・能力補正・特殊効果」を割合で伸ばす（+1ごとに powerRate）。
  //   弱い装備を強化しても強い装備を追い越さないのが狙い。
  //   旧 statBonus（基礎能力+5/Lv）は廃止。基礎能力はJOBとキャラだけが伸ばす。
  enchantTable: { successRates: [1.00, 1.00, 1.00, 0.97, 0.93, 0.88, 0.82, 0.75, 0.66, 0.55], goldCosts: [100, 200, 300, 500, 700, 1000, 1400, 1800, 2500, 3500], maxLevel: 10, powerRate: 0.15 },
  combatBalance: {
    playerVariance: { min: -2, max: 2 },
    // 会心率はLUK一本で伸ばす。JOB成長で「率」を配ると、率どうしが複利で
    // 噛み合って一瞬で天井へ張り付くため、レベルアップはLUKだけを上げる。
    // 装備の会心率だけが率としてこの上に乗る。
    //
    // luckRate .0022 は「LUK 400 で約94%」から逆算した値。
    // LUKはLv21以降の2倍帯と転生倍率(+10%/回)で伸び続け、
    // 武道家 Lv40・転生50 で LUK 386（＝約91%）が実測の到達点。
    // やり込み切ってようやく hardMax .95 へ届く配分になっている。
    //
    // 参考：DQ3武闘家とDQ4アリーナはどちらも Lv/256、一般キャラは 1/64 = 6.25%
    // （base .06 とほぼ同じ）。特化の天井はアリーナ25%固定、武闘家Lv99で38.6%。
    // うちはやり込みRPGなので、その先を長い時間で登らせる形にしている。
    //
    // max は旧「LUKだけで到達できる上限」。上限撤廃にともない廃止した。
    // hardMax .95 だけが天井で、100%にはしない（必ず会心は作らない）。
    critical: { base: .06, luckRate: .0022, hardMax: .95, multiplier: 1.65 },
    // 共通コマンド《防御》は物理・魔法を問わず、そのラウンドの最終被ダメージを半減する。
    guardReduction: .50,
    // 敵→プレイヤーのダメージは比率型：atk × attackScale × defenseK/(defenseK+防御)
    // 引き算型だと工房で装備を更新した瞬間にダメージが 0 か即死かの両極端に振れるため、
    // 防御が上がるほど緩やかに減衰する比率型へ統一している。
    enemyPhysical: { attackScale: .70, defenseK: 40 },
    enemyMagic: { attackScale: .78, defenseK: 40 },
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
    id: 'ren', name: '蓮', shortName: 'REN', level: 1, exp: 0, gold: 0,
    baseStats: { maxHp: 80, maxMp: 40, str: 12, vit: 10, mag: 10, mnd: 14, agi: 18, dex: 12, luk: 14 },
    growth: { maxHp: 8, maxMp: 5, str: 0, vit: 0, mag: 0, mnd: 0, agi: 0, dex: 0, luk: 0 },
    skills: ['quickSlash'], inventory: { potion: 3, manaPotion: 2, mageStaff: 1, phantomSword: 1 },
    equipment: { rightHand: 'mageStaff', leftHand: null, head: null, body: null, arms: null, feet: null, accessory: null }
  },
  characterSkillProgression: [
    { level: 1, skillId: 'blueNote' },
    { level: 3, skillId: 'blueEcho' },
    { level: 5, skillId: 'meditation' }
  ],
  jobs: {
    warrior: {
      id: 'warrior', name: '戦士', nameEn: 'WARRIOR', description: '力と耐久力で正面から怪異を打ち破る。', signatureSkillId: 'powerCharge', passiveUnlocks: { 1: 'p_adept', 5: 'p_might', 10: 'p_tough', 15: 'p_instinct' }, traits: { counterRate: { name: '反攻の構え', nameEn: 'RIPOSTE', rate: .30, rebirthStep: .05, max: .60, text: '被弾時30%で反撃', description: '受けた一撃をそのまま返す構え。攻撃を受けたとき、一定確率で自動的に反撃する。転生を重ねるほど発動率が上がる。' } }, growthStats: ['str', 'vit'], featureText: '力・体力を伸ばしやすいジョブ。物理攻撃・HP・耐久力などの脳筋系パッシブを習得できる。',
      growth: { 1: { str: 2 }, 2: { maxHp: 5 }, 3: { vit: 1 }, 4: { str: 2, vit: 1 }, 5: { maxHp: 8 }, 6: { str: 2 }, 7: { maxHp: 8, vit: 2 }, 8: { str: 3 }, 9: { vit: 2 }, 10: { str: 4, maxHp: 12 }, 11: { str: 2 }, 12: { maxHp: 10, vit: 2 }, 13: { str: 3 }, 14: { vit: 3, maxHp: 8 }, 15: { str: 4 }, 16: { maxHp: 12, vit: 3 }, 17: { str: 4 }, 18: { vit: 4 }, 19: { str: 5 }, 20: { str: 6, maxHp: 18, vit: 5 } },
      skillUnlocks: {}
    },
    mage: {
      id: 'mage', name: '魔導士', nameEn: 'MAGE', description: '魔力を操り、単体・全体魔法を使い分ける。', signatureSkillId: 'meditation', passiveUnlocks: { 5: 'p_amplify', 10: 'p_manaStore', 15: 'p_spellBoost' },
      // JOB特性：魔法で与えたダメージの一部が魔力として還る。
      traits: { spellDrainMp: { name: '魔力還流', nameEn: 'MANA REFLUX', rate: .05, rebirthStep: .01, max: .15, text: '通常攻撃で与えたダメージの5%をMP回復', description: '放った魔力の残滓を回収する術。通常攻撃で敵に与えたダメージの5%がMPとして戻る。武器技や魔法には乗らない、殴って魔力を繋ぐための特性。転生を重ねるほど回収率が上がる。' } }, growthStats: ['mag'], featureText: '魔力を伸ばしやすいジョブ。MP上昇・魔法威力などの魔法系パッシブを習得できる。',
      growth: { 1: { mag: 2 }, 2: { maxMp: 5 }, 3: { mag: 2 }, 4: { maxMp: 6 }, 5: { mag: 2 }, 6: { maxMp: 8 }, 7: { mag: 3 }, 8: { maxMp: 8 }, 9: { mag: 3 }, 10: { mag: 4, maxMp: 12 }, 11: { mag: 3 }, 12: { maxMp: 14 }, 13: { mag: 4 }, 14: { maxMp: 12 }, 15: { mag: 4 }, 16: { maxMp: 16 }, 17: { mag: 5 }, 18: { maxMp: 14 }, 19: { mag: 5 }, 20: { mag: 6, maxMp: 20 } },
      skillUnlocks: {}
    },
    martialArtist: {
      id: 'martialArtist', name: '武道家', nameEn: 'MARTIAL ARTIST', description: '速度と多段攻撃でクリティカルを狙う。', signatureSkillId: 'burstFist', passiveUnlocks: { 5: 'p_gale', 10: 'p_vitalAim', 15: 'p_fortune' },
      // JOB特性：武器を外すと両手が拳になる。体術スケール（力50%＋素早さ50%）で殴る。
      traits: { bareFists: { name: '無手の型', nameEn: 'BARE FISTS', rate: .125, rebirthStep: .015, max: .25, text: '素手なら両手が拳で2回攻撃（左手12.5%）', description: '武器を持たないほうが強い、武道家の本領。右手・左手が空のとき両手が拳になり、攻撃力は力と素早さの合計の50%になる。通常攻撃は右拳・左拳の2回攻撃になり、左拳の威力は12.5%。転生を重ねるほど左拳が強くなる。' } }, growthStats: ['agi', 'luk'], featureText: '素早さ・運を伸ばしやすいジョブ。会心率・素早い行動などに関係するパッシブを習得できる。',
      growth: { 1: { agi: 2 }, 2: { str: 2, maxHp: 4 }, 3: { agi: 2 }, 4: { str: 2 }, 5: { agi: 3 }, 6: { str: 2 }, 7: { critBonus: .02 }, 8: { agi: 3, str: 2 }, 9: { critBonus: .03 }, 10: { critBonus: .05, agi: 3 }, 11: { agi: 3 }, 12: { str: 3, critBonus: .02 }, 13: { agi: 4 }, 14: { str: 3 }, 15: { agi: 4, critBonus: .03 }, 16: { str: 4 }, 17: { agi: 4 }, 18: { str: 4, critBonus: .03 }, 19: { agi: 5 }, 20: { critBonus: .07, agi: 5, str: 4 } },
      skillUnlocks: {}
    },
    priest: {
      id: 'priest', name: '僧侶', nameEn: 'PRIEST', description: '精神力を活かして回復と光魔法を扱う。長く潜り続け、稼いで帰るのが得意。', signatureSkillId: 'heal', passiveUnlocks: { 1: 'p_tithe', 5: 'p_spirit', 10: 'p_healArt', 15: 'p_wardBarrier' }, traits: {}, growthStats: ['mnd', 'vit'], featureText: '獲得GOLDを増やし、確率再生と一戦一度のHP→MP変換で長く潜れる。弱い敵を残して待つだけでは資源を永久回復できない。',
      growth: { 1: { mnd: 2 }, 2: { maxMp: 5 }, 3: { mnd: 2 }, 4: { maxMp: 6 }, 5: { mnd: 2, maxHp: 5 }, 6: { maxMp: 8 }, 7: { mnd: 3 }, 8: { maxMp: 8 }, 9: { mnd: 3 }, 10: { mnd: 4, maxMp: 12 }, 11: { mnd: 3 }, 12: { maxMp: 14, maxHp: 5 }, 13: { mnd: 4 }, 14: { maxMp: 12 }, 15: { mnd: 4 }, 16: { maxMp: 16 }, 17: { mnd: 5 }, 18: { maxMp: 14 }, 19: { mnd: 5 }, 20: { mnd: 6, maxMp: 20, maxHp: 8 } },
      skillUnlocks: { 3: 'regenerate', 5: 'bodyToMind', 6: 'holyLight', 12: 'greatHeal', 15: 'soulPassage', 16: 'divineSmite' }
    },
    guardian: {
      id: 'guardian', name: '守護士', nameEn: 'GUARDIAN', description: '受けた痛みを共鳴へ変え、盾と反奏で格上を打ち破る基本JOB。',
      signatureSkillId: 'resonanceBreak', passiveUnlocks: { 1: 'p_resonantGuard', 5: 'p_indomitable', 10: 'p_guardStance', 15: 'p_unfallen' }, growthStats: ['vit', 'mnd'],
      featureText: '右手に盾を武器として装備可能。軽減後の実ダメージをRESONANCEへ蓄積し、無属性の反撃へ転換する。転生ごとに蓄積率+1%（最大15%）。',
      unlockCondition: { bossDefeated: 'seripes' },
      skillUnlocks: {}
    },
    // 1面クリアで解放される新ジョブ。上位職ではなく「新しい選択肢」。
    magicKnight: {
      id: 'magicKnight', name: '魔奏士', nameEn: 'MAGIC KNIGHT', description: '刃に魔力を纏わせ、物理と魔法を組み合わせて戦う。',
      signatureSkillId: 'ensemble', passiveUnlocks: { 1: 'p_solo', 5: 'p_forte', 10: 'p_crescendo', 15: 'p_nocturne' },
      // JOB特性：楽器を持ち、演奏（パッシブ）が鳴っているあいだだけ専用技が開く。
      traits: { songArts: { name: '演奏解放', nameEn: 'SONG ARTS', text: '楽器装備中、パッシブ発動で専用技が解放', description: '楽器を手にしているあいだ、演奏（パッシブ）が鳴っているターンだけ専用技が開く。《フォルテ》でスフォルツァンド、《クレッシェンド》でフォルティッシモが使えるようになる。' } },
      growthStats: ['mag', 'str'], featureText: '魔力を軸に物理も扱うハイブリッド型。武器を選ばず戦えるジョブ。',
      unlockCondition: { bossDefeated: 'zenacad' },
      skillUnlocks: {}
    },
    // 特殊ジョブ。自身では成長せず、将来的に他ジョブの成長を盗む。
    phantomThief: {
      id: 'phantomThief', name: 'ファントムシーフ', nameEn: 'PHANTOM THIEF', description: '他JOBのレベルアップ成長を常に半分引き継ぎ、MASTER時に固有技を盗む怪盗の本質。',
      signatureSkillId: null, passiveUnlocks: {}, growthStats: [],
      featureText: '自身では成長しない特殊ジョブ。通常JOBの成長能力を常に50%引き継ぎ、MASTER時に固有スキルを獲得する。',
      // 固有特性。倍率を持たない説明専用の特性なので rate は置かない。
      traits: { remix: { name: 'RE:MIX（リミックス）', nameEn: 'RE:MIX', text: '他JOBから盗んだ力を組み合わせ、自分だけの能力構成を作る', description: '他のJOBから盗んだ力を組み合わせ、自分だけの能力構成を作るPHANTOM THIEF固有の力。各JOBで育てた成長はすべて合算され、その50%がファントムシーフの能力として常に乗る。どのJOBをどれだけ育てたかが、そのまま自分の形になる。' } },
      special: true, noGrowth: true,
      unlockCondition: { story: 'phantomThiefAwakening' },
      skillUnlocks: {}
    },
    dualBlade: {
      id: 'dualBlade', name: '双刃士', nameEn: 'DUAL BLADE', description: '攻撃を当て続けるほど加速する、高STR・高AGIの二刀アタッカー。',
      signatureSkillId: 'battleDance',
      passiveUnlocks: { 1: 'p_dualWield', 5: 'p_comboDance', 10: 'p_pursuitBlade', 15: 'p_danceForm' },
      // 双刃そのもののSTR50%＋AGI50%参照は武器データ側で管理する。
      // JOB特性ではなくPASSIVEへ分離したため、PHANTOM THIEFも枠を使えば二刀を再現できる。
      traits: {},
      unlockCondition: { bossDefeated: 'myrthi' },
      // 会心率(critBonus)を直接配っていた枠はLUKへ置換した。率を配ると
      // 転生倍率と20%保持が複利で乗って天井に張り付くため、会心はLUK経由で伸ばす。
      // 旧 critBonus の値をそのまま100倍したLUKを入れてあり、伸びの形は変えていない。
      growth: { 1: { str: 3, agi: 2 }, 2: { luk: 2 }, 3: { str: 3, agi: 2 }, 4: { luk: 2 }, 5: { str: 4, agi: 3 }, 6: { luk: 3 }, 7: { str: 3, agi: 3 }, 8: { luk: 3 }, 9: { str: 4, agi: 3 }, 10: { luk: 5, str: 5, agi: 3 }, 11: { str: 4, agi: 3 }, 12: { luk: 3, str: 4 }, 13: { agi: 4, str: 3 }, 14: { luk: 3, agi: 4 }, 15: { str: 5, agi: 5 }, 16: { luk: 4 }, 17: { str: 5, agi: 4 }, 18: { luk: 4, str: 4 }, 19: { str: 6, agi: 5 }, 20: { luk: 8, str: 7, agi: 6, maxHp: 15 } },
      growthStats: ['str', 'agi'], featureText: '命中するたび《連舞》が高まり、二刀追撃と会心で一気に加速する。防御・魔防・自己回復は低い。',
      skillUnlocks: {}
    }
  },
  // 証を初めて盗んだ直後に表示するJOB案内。
  // 後続JOBはここへ1件足すだけで、ボス初回撃破の報酬導線へ同じ形式で追加できる。
  jobUnlockTutorials: {
    magicKnight: {
      proofItemId: 'magicKnightProof',
      role: '楽器をメイン武器にして、自分へ演奏バフを重ねながら専用技で戦う魔法寄りの前衛。',
      build: '楽器を装備 → 《フォルテ》や《クレッシェンド》を維持 → 解放された専用技で攻める。',
      tips: ['MAGとSTRの両方を活かせる。', 'バフが切れると専用技も使えなくなるため、演奏の残りターンを意識する。']
    },
    dualBlade: {
      proofItemId: 'dualBladeProof',
      role: '双刃を左右に持ち、命中を重ねるほど連舞で加速する高速アタッカー。',
      build: '右手・左手に双刃を装備 → 通常攻撃と体術技で連舞を貯める → MAXで《戦姫乱舞・極》を撃つ。',
      tips: ['STR・AGI・会心率を伸ばすと火力、回避、行動順が一緒に伸びる。', 'MISSで連舞が0になる。命中を確保して連撃を続けるのが大切。']
    },
    guardian: {
      proofItemId: 'guardianProof',
      role: '右手の盾で格上の攻撃を受け、RESONANCEへ変えて反撃する耐久型JOB。',
      build: '盾を右手に装備 → 《防御》や守護術で耐える → 溜まったRESONANCEを《共鳴破》へ変える。',
      tips: ['VIT・MNDと盾の防御性能が攻防の両方に関わる。', '強い敵ほど共鳴を稼げるが、無理に受け続けず防御と回復を使い分ける。']
    }
  },
  jobCommandAbilities: {
    warrior: { cmd: '剣技', cmdEn: 'SWORD ARTS' },
    mage: { cmd: '魔導', cmdEn: 'ARCANA' },
    martialArtist: { cmd: '拳技', cmdEn: 'FIST ARTS' },
    priest: { cmd: '神聖', cmdEn: 'SACRED ARTS' },
    dualBlade: { cmd: '双刃技', cmdEn: 'DUAL ARTS' },
    guardian: { cmd: '守護術', cmdEn: 'GUARD ARTS' }
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
    tabs: [{ id: 'weapon', name: '武器', enName: 'WEAPON' }, { id: 'armor', name: '防具', enName: 'ARMOR' }, { id: 'disassemble', name: '分解', enName: 'DISASSEMBLE' }, { id: 'materials', name: '素材一覧', enName: 'MATERIALS' }],
    armorTabs: [{ id: 'leftHand', name: '盾', enName: 'SHIELD' }, { id: 'head', name: '頭', enName: 'HEAD' }, { id: 'body', name: '体', enName: 'BODY' }, { id: 'arms', name: '腕', enName: 'ARMS' }, { id: 'feet', name: '足', enName: 'FEET' }, { id: 'accessory', name: 'アクセ', enName: 'ACCESSORY' }],
    materialIds: ['slimeJelly', 'darkCore', 'manaDrop', 'stardustShard', 'magicPowder', 'moonstone', 'tatteredRobe', 'gnawedBag', 'ratWhisker', 'stolenCoin', 'ratTail', 'rustedKnife', 'tornCloth', 'goblinMedicine', 'batFang', 'tornWingMembrane', 'beastBlood', 'obsidianFang', 'spiritFragment', 'oldBone', 'darkSoulStone', 'resentmentCrystal', 'zenacad_core', 'cadenza_fragment', 'reverbJelly', 'echoShard', 'stoneShard', 'violinString', 'spectralDust', 'silentNote', 'silentArmor', 'voidShard', 'darkIron', 'chaosDust', 'phantomCore', 'voidEssence', 'fortressStone', 'riftClaw', 'voidSilk', 'sanctumGear', 'astralMercury', 'gildedCore', 'myrthi_core', 'myrthi_fragment'],
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
    phantomCore:  ['phantomGauntletRecipe', 'voidRingRecipe'],
    fortressStone: ['d3GuardianAegisRecipe', 'd3WarriorBladeRecipe', 'fortressHelmRecipe', 'fortressCoatRecipe', 'fortressGlovesRecipe', 'fortressBootsRecipe', 'fortressCharmRecipe'],
    riftClaw: ['d3MartialClawRecipe', 'd3TwinRightRecipe', 'd3TwinLeftRecipe', 'riftBandRecipe', 'riftVestRecipe', 'riftGuardsRecipe', 'riftBootsRecipe', 'riftCharmRecipe'],
    voidSilk: ['d3MageStaffRecipe', 'd3PriestStaffRecipe', 'voidweaveHoodRecipe', 'voidweaveRobeRecipe', 'voidweaveGlovesRecipe', 'voidweaveBootsRecipe', 'voidweaveCharmRecipe'],
    sanctumGear: ['d3MaestroInstrumentRecipe', 'voidweaveCharmRecipe'],
    astralMercury: ['d3MaestroInstrumentRecipe'],
    gildedCore: ['d3GuardianAegisRecipe']
  },
  dungeon3RareEncounters: [
    { id: 'merox', chance: .025 },
    { id: 'gildedHoarder', chance: .035 }
  ],
  dungeons: [
    {
      id: 'dungeon1', name: '迷宮の入口', enName: 'THE LABYRINTH GATE',
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
      // ══ 階層制 ══
      // 各階33勝でクリア、3階すべて踏破（=99勝）でミルティへ挑戦できる。
      // 階層ごとに出現モンスターとドロップ素材を分けてあり、
      // 1F素材→1F装備、2F素材→2F装備…と工房が階層に追従して進む。
      // floors を持つダンジョンは階層選択画面が出る。持たなければ従来どおり直接潜入。
      floors: [
        {
          id: 'd2f1', name: '残響の回廊', nameEn: '1F ECHOING CORRIDOR', winsToClear: 50,
          background: 'assets/bg/dungeon2/d2f1-echoing-corridor.png',
          thumbnail: 'assets/bg/dungeon2/d2f1-echoing-corridor.png',
          description: '踏み込んだ音が返ってこない廊。まだ弱い残響たちが彷徨っている。',
          materials: ['reverbJelly', 'echoShard'],
          encounterProgression: [
            { minWins: 0,  count: [2, 2], pool: [{ id: 'reverbSlime', weight: 8 }, { id: 'hushMoth', weight: 3 }, { id: 'echoWraith', weight: 2 }] },
            { minWins: 12, count: [2, 2], pool: [{ id: 'reverbSlime', weight: 5 }, { id: 'hushMoth', weight: 4 }, { id: 'chimeImp', weight: 4 }, { id: 'echoWraith', weight: 3 }] },
            { minWins: 24, count: [2, 3], pool: [{ id: 'chimeImp', weight: 4 }, { id: 'echoWraith', weight: 4 }, { id: 'fadingChorister', weight: 3 }, { id: 'nocturneBanshee', weight: 2 }, { id: 'reverbSlime', weight: 2 }] },
            { minWins: 36, count: [2, 3], pool: [{ id: 'fadingChorister', weight: 4 }, { id: 'mutedHound', weight: 4 }, { id: 'nocturneBanshee', weight: 3 }, { id: 'echoWraith', weight: 2 }, { id: 'chimeImp', weight: 2 }] }
          ]
        },
        {
          id: 'd2f2', name: '沈黙の広間', nameEn: '2F HALL OF HUSH', winsToClear: 50,
          background: 'assets/bg/dungeon2/d2f2-hall-of-hush.png',
          thumbnail: 'assets/bg/dungeon2/d2f2-hall-of-hush.png',
          description: '奏者の姿だけが残された広間。音のない演奏が延々と続いている。',
          materials: ['spectralDust', 'violinString', 'silentNote'],
          encounterProgression: [
            { minWins: 0,  count: [2, 2], pool: [{ id: 'nocturneChandelier', weight: 5 }, { id: 'whisperVeil', weight: 4 }, { id: 'voidVioloncello', weight: 3 }, { id: 'mutedHound', weight: 2 }] },
            { minWins: 10, count: [2, 2], pool: [{ id: 'voidVioloncello', weight: 4 }, { id: 'whisperVeil', weight: 4 }, { id: 'silentKnight', weight: 3 }, { id: 'nocturneChandelier', weight: 3 }, { id: 'grimMetronome', weight: 2 }] },
            { minWins: 20, count: [2, 3], pool: [{ id: 'silentKnight', weight: 4 }, { id: 'pallidConductor', weight: 3 }, { id: 'grimMetronome', weight: 3 }, { id: 'voidVioloncello', weight: 3 }, { id: 'whisperVeil', weight: 2 }] },
            { minWins: 27, count: [2, 3], pool: [{ id: 'noiselessLancer', weight: 4 }, { id: 'pallidConductor', weight: 4 }, { id: 'grimMetronome', weight: 3 }, { id: 'silentKnight', weight: 3 }, { id: 'silentHarmonist', weight: 1 }] }
          ]
        },
        {
          id: 'd2f3', name: '楽殿最奥', nameEn: '3F INNERMOST HALL', winsToClear: 50,
          background: 'assets/bg/dungeon2/d2f3-innermost-hall.png',
          thumbnail: 'assets/bg/dungeon2/d2f3-innermost-hall.png',
          description: '奪われた音の全てが積み上がった最奥。ここを越えれば黒紅の双刃が待つ。',
          materials: ['silentArmor', 'stoneShard', 'moonstone'],
          encounterProgression: [
            { minWins: 0,  count: [2, 2], pool: [{ id: 'muteGargoyle', weight: 5 }, { id: 'stoneChoir', weight: 4 }, { id: 'shatteredDiva', weight: 3 }, { id: 'noiselessLancer', weight: 2 }] },
            { minWins: 10, count: [2, 3], pool: [{ id: 'stoneChoir', weight: 4 }, { id: 'requiemKnight', weight: 3 }, { id: 'shatteredDiva', weight: 3 }, { id: 'muteGargoyle', weight: 3 }, { id: 'silentHarmonist', weight: 2 }] },
            { minWins: 20, count: [2, 3], pool: [{ id: 'requiemKnight', weight: 4 }, { id: 'silenceWarden', weight: 3 }, { id: 'stoneChoir', weight: 3 }, { id: 'shatteredDiva', weight: 3 }, { id: 'silentHarmonist', weight: 2 }] },
            { minWins: 27, count: [2, 3], pool: [{ id: 'silenceWarden', weight: 4 }, { id: 'requiemKnight', weight: 4 }, { id: 'shatteredDiva', weight: 3 }, { id: 'stoneChoir', weight: 3 }, { id: 'silentHarmonist', weight: 2 }] }
          ]
        }
      ],
      // 階層システム未対応の経路から参照された場合のフォールバック
      encounterProgression: [
        { minWins: 0,  count: [1, 2], pool: [{ id: 'reverbSlime', weight: 8 }, { id: 'echoWraith', weight: 2 }, { id: 'silentHarmonist', weight: 1 }] },
        { minWins: 10, count: [1, 2], pool: [{ id: 'reverbSlime', weight: 5 }, { id: 'echoWraith', weight: 4 }, { id: 'nocturneBanshee', weight: 2 }, { id: 'silentHarmonist', weight: 1 }] },
        { minWins: 25, count: [2, 2], pool: [{ id: 'echoWraith', weight: 4 }, { id: 'nocturneBanshee', weight: 3 }, { id: 'nocturneChandelier', weight: 2 }, { id: 'reverbSlime', weight: 2 }, { id: 'silentHarmonist', weight: 1 }] },
        { minWins: 45, count: [2, 3], pool: [{ id: 'nocturneChandelier', weight: 3 }, { id: 'silentKnight', weight: 2 }, { id: 'muteGargoyle', weight: 2 }, { id: 'echoWraith', weight: 2 }, { id: 'silentHarmonist', weight: 1 }] },
        { minWins: 70, count: [2, 3], pool: [{ id: 'silentKnight', weight: 3 }, { id: 'muteGargoyle', weight: 2 }, { id: 'nocturneChandelier', weight: 2 }, { id: 'nocturneBanshee', weight: 2 }, { id: 'silentHarmonist', weight: 1 }] }
      ]
    },
    {
      id: 'dungeon3', name: '崩界の深廊', nameEn: 'DEPTHS OF THE VOID',
      background: 'assets/bg/dungeon3/d3f1-eroded-outer-wall.webp',
      thumbnail: 'assets/bg/dungeon3/d3f1-eroded-outer-wall.webp',
      music: encodeURI('音楽系/ダンジョン/ダンジョン3Mastering_Cathedral Heist.mp3'),
      description: '侵蝕された白亜の城塞。8階を進み、対策装備・JOB・クラフトを整える長期攻略ダンジョン。',
      recommendedLevel: 20,
      unlockCondition: 'dungeon2Clear',
      // 各階の必要戦闘数は短く保ち、敵の能力補正と編成で育成・クラフトを促す。
      // 4F踏破後に中ボス、8F踏破後にダンジョンボス。
      midBossAfterFloor: 4,
      floors: [
        {
          id: 'd3f1', name: '侵蝕の外壁', nameEn: '1F ERODED OUTER WALL', winsToClear: 6,
          background: 'assets/bg/dungeon3/d3f1-eroded-outer-wall.webp', thumbnail: 'assets/bg/dungeon3/d3f1-eroded-outer-wall.webp',
          description: 'D2から持ち込んだ装備で敵の防御傾向を見極める適応層。物理・魔法の得手不得手を学ぶ。',
          materials: ['voidShard', 'darkIron', 'fortressStone', 'riftClaw'],
          enemyScale: { hp: 1.00, atk: 1.00, mag: 1.00, def: 1.00, mnd: 1.00, spd: 1.00, rewards: 1.00 },
          encounterProgression: [
            { minWins: 0, count: [2, 2], pool: [{ id: 'voidWatcher', weight: 4 }, { id: 'abyssalKnight', weight: 3 }, { id: 'riftAssailant', weight: 3 }, { id: 'fortressGolem', weight: 2 }, { id: 'voidCantor', weight: 1 }] },
            { minWins: 3, count: [2, 2], pool: [{ id: 'fortressGolem', weight: 4 }, { id: 'abyssalKnight', weight: 3 }, { id: 'voidWatcher', weight: 3 }, { id: 'riftAssailant', weight: 3 }, { id: 'voidCantor', weight: 2 }] }
          ]
        },
        {
          id: 'd3f2', name: '血塗られた中庭', nameEn: '2F BLOODSTAINED COURTYARD', winsToClear: 7,
          background: 'assets/bg/dungeon3/d3f1-eroded-outer-wall.webp', thumbnail: 'assets/bg/dungeon3/d3f1-eroded-outer-wall.webp',
          description: '物理防壁と魔障壁が交差する中庭。攻撃手段を一つに絞ると消耗が増える。',
          materials: ['voidShard', 'chaosDust', 'phantomCore', 'fortressStone', 'riftClaw'],
          enemyScale: { hp: 1.14, atk: 1.08, mag: 1.08, def: 1.14, mnd: 1.14, spd: 1.04, rewards: 1.12 },
          encounterProgression: [
            { minWins: 0, count: [2, 2], pool: [{ id: 'abyssalKnight', weight: 4 }, { id: 'riftAssailant', weight: 4 }, { id: 'fortressGolem', weight: 3 }, { id: 'voidCantor', weight: 2 }, { id: 'ironChanter', weight: 2 }] },
            { minWins: 4, count: [2, 3], pool: [{ id: 'ironChanter', weight: 4 }, { id: 'fortressGolem', weight: 3 }, { id: 'abyssalKnight', weight: 3 }, { id: 'riftAssailant', weight: 3 }, { id: 'voidCantor', weight: 3 }] }
          ]
        },
        {
          id: 'd3f3', name: '封鎖された門', nameEn: '3F SEALED GATE', winsToClear: 7,
          background: 'assets/bg/dungeon3/d3f2-sealed-courtyard.webp', thumbnail: 'assets/bg/dungeon3/d3f2-sealed-courtyard.webp',
          description: '回復役と防壁役が同時に現れる関門。撃破順とMP管理を試される。',
          materials: ['voidShard', 'chaosDust', 'darkIron', 'voidSilk', 'sanctumGear'],
          enemyScale: { hp: 1.28, atk: 1.15, mag: 1.15, def: 1.24, mnd: 1.24, spd: 1.07, rewards: 1.22 },
          encounterProgression: [
            { minWins: 0, count: [2, 2], pool: [{ id: 'fortressGolem', weight: 3 }, { id: 'voidCantor', weight: 3 }, { id: 'ironChanter', weight: 3 }, { id: 'arcaneChanter', weight: 2 }, { id: 'chaosWitch', weight: 2 }] },
            { minWins: 4, count: [2, 3], pool: [{ id: 'chaosWitch', weight: 4 }, { id: 'arcaneChanter', weight: 3 }, { id: 'ironChanter', weight: 3 }, { id: 'voidCantor', weight: 3 }, { id: 'fortressGolem', weight: 2 }] }
          ]
        },
        {
          id: 'd3f4', name: '鎖の回廊', nameEn: '4F CHAINED GALLERY', winsToClear: 8,
          background: 'assets/bg/dungeon3/d3f2-sealed-courtyard.webp', thumbnail: 'assets/bg/dungeon3/d3f2-sealed-courtyard.webp',
          description: 'ヴェルシクレルへ続く前半最終層。支援役を含む三体編成への対策完成が必要。',
          materials: ['phantomCore', 'chaosDust', 'darkIron', 'voidSilk', 'sanctumGear'],
          enemyScale: { hp: 1.42, atk: 1.24, mag: 1.24, def: 1.34, mnd: 1.34, spd: 1.10, rewards: 1.34 },
          encounterProgression: [
            { minWins: 0, count: [2, 3], pool: [{ id: 'ironChanter', weight: 3 }, { id: 'arcaneChanter', weight: 3 }, { id: 'chaosWitch', weight: 3 }, { id: 'prismSentinel', weight: 2 }, { id: 'chainReaper', weight: 2 }] },
            { minWins: 4, count: [3, 3], pool: [{ id: 'chainReaper', weight: 4 }, { id: 'prismSentinel', weight: 3 }, { id: 'chaosWitch', weight: 3 }, { id: 'ironChanter', weight: 2 }, { id: 'arcaneChanter', weight: 2 }] }
          ]
        },
        {
          id: 'd3f5', name: '崩壊の礼拝堂', nameEn: '5F RUINED CHAPEL', winsToClear: 7,
          background: 'assets/bg/dungeon3/d3f3-ruined-chapel.webp', thumbnail: 'assets/bg/dungeon3/d3f3-ruined-chapel.webp',
          description: '銀環突破後、怪異の密度が急上昇する。D3装備の製作とJOB再構成を前提とする。',
          materials: ['darkIron', 'chaosDust', 'phantomCore', 'voidSilk', 'riftClaw'],
          enemyScale: { hp: 1.88, atk: 1.52, mag: 1.52, def: 1.62, mnd: 1.62, spd: 1.15, rewards: 1.68 },
          encounterProgression: [
            { minWins: 0, count: [2, 2], pool: [{ id: 'chaosWitch', weight: 4 }, { id: 'prismSentinel', weight: 3 }, { id: 'chainReaper', weight: 3 }, { id: 'voidGargoyle', weight: 3 }, { id: 'voidAlchemist', weight: 2 }] },
            { minWins: 4, count: [2, 3], pool: [{ id: 'voidAlchemist', weight: 4 }, { id: 'voidGargoyle', weight: 3 }, { id: 'chainReaper', weight: 3 }, { id: 'prismSentinel', weight: 2 }, { id: 'chaosWitch', weight: 2 }] }
          ]
        },
        {
          id: 'd3f6', name: '深紅の塔', nameEn: '6F CRIMSON TOWER', winsToClear: 8,
          background: 'assets/bg/dungeon3/d3f3-ruined-chapel.webp', thumbnail: 'assets/bg/dungeon3/d3f3-ruined-chapel.webp',
          description: '攻撃と回復の両方が鋭くなる後半層。耐久だけでなく短いターンで崩す火力が要る。',
          materials: ['voidEssence', 'chaosDust', 'phantomCore', 'riftClaw', 'sanctumGear'],
          enemyScale: { hp: 2.18, atk: 1.70, mag: 1.70, def: 1.84, mnd: 1.84, spd: 1.20, rewards: 1.94 },
          encounterProgression: [
            { minWins: 0, count: [2, 3], pool: [{ id: 'chainReaper', weight: 4 }, { id: 'voidGargoyle', weight: 3 }, { id: 'voidAlchemist', weight: 3 }, { id: 'phantomEmperor', weight: 2 }, { id: 'crimsonBehemoth', weight: 2 }] },
            { minWins: 4, count: [3, 3], pool: [{ id: 'crimsonBehemoth', weight: 4 }, { id: 'phantomEmperor', weight: 3 }, { id: 'voidAlchemist', weight: 3 }, { id: 'chainReaper', weight: 2 }, { id: 'voidGargoyle', weight: 2 }] }
          ]
        },
        {
          id: 'd3f7', name: '奈落の奏廊', nameEn: '7F ABYSSAL GALLERY', winsToClear: 8,
          background: 'assets/bg/dungeon3/d3f4-innermost-throne.webp', thumbnail: 'assets/bg/dungeon3/d3f4-innermost-throne.webp',
          description: 'セリペスの反奏が響く最終準備層。装備・パッシブ・回復資源の穴が敗北へ直結する。',
          materials: ['voidEssence', 'phantomCore', 'darkIron', 'fortressStone', 'sanctumGear'],
          enemyScale: { hp: 2.50, atk: 1.90, mag: 1.90, def: 2.08, mnd: 2.08, spd: 1.24, rewards: 2.20 },
          encounterProgression: [
            { minWins: 0, count: [2, 3], pool: [{ id: 'voidAlchemist', weight: 3 }, { id: 'phantomEmperor', weight: 3 }, { id: 'crimsonBehemoth', weight: 3 }, { id: 'voidOrchestra', weight: 2 }, { id: 'voidCantor', weight: 2 }] },
            { minWins: 4, count: [3, 3], pool: [{ id: 'voidOrchestra', weight: 4 }, { id: 'crimsonBehemoth', weight: 3 }, { id: 'phantomEmperor', weight: 3 }, { id: 'voidAlchemist', weight: 2 }, { id: 'voidCantor', weight: 2 }] }
          ]
        },
        {
          id: 'd3f8', name: '最奥の玉座間', nameEn: '8F INNERMOST THRONE', winsToClear: 9,
          background: 'assets/bg/dungeon3/d3f4-innermost-throne.webp', thumbnail: 'assets/bg/dungeon3/d3f4-innermost-throne.webp',
          description: 'D3の集大成。セリペス攻略に必要なクラフトと育成を完成させる最後の試練。',
          materials: ['voidEssence', 'phantomCore', 'darkIron', 'riftClaw', 'sanctumGear'],
          enemyScale: { hp: 2.85, atk: 2.12, mag: 2.12, def: 2.38, mnd: 2.38, spd: 1.30, rewards: 2.58 },
          encounterProgression: [
            { minWins: 0, count: [3, 3], pool: [{ id: 'phantomEmperor', weight: 3 }, { id: 'crimsonBehemoth', weight: 3 }, { id: 'voidOrchestra', weight: 3 }, { id: 'fortressGolem', weight: 2 }, { id: 'chaosWitch', weight: 2 }] },
            { minWins: 5, count: [3, 3], pool: [{ id: 'voidOrchestra', weight: 4 }, { id: 'crimsonBehemoth', weight: 4 }, { id: 'phantomEmperor', weight: 3 }, { id: 'fortressGolem', weight: 2 }, { id: 'chaosWitch', weight: 2 }] }
          ]
        }
      ],
      // 階層未選択の旧導線向けフォールバック。
      encounterProgression: [
        { minWins: 0,   count: [2, 2], pool: [{ id: 'abyssalKnight', weight: 4 }, { id: 'voidWatcher', weight: 4 }, { id: 'riftAssailant', weight: 3 }] },
        { minWins: 30,  count: [2, 3], pool: [{ id: 'abyssalKnight', weight: 3 }, { id: 'voidWatcher', weight: 3 }, { id: 'voidCantor', weight: 2 }, { id: 'riftAssailant', weight: 3 }] },
        { minWins: 90,  count: [3, 3], pool: [{ id: 'ironChanter', weight: 2 }, { id: 'arcaneChanter', weight: 2 }, { id: 'voidCantor', weight: 2 }, { id: 'chaosWitch', weight: 3 }, { id: 'riftAssailant', weight: 3 }] },
        { minWins: 170, count: [3, 3], pool: [{ id: 'voidGargoyle', weight: 3 }, { id: 'phantomEmperor', weight: 3 }, { id: 'voidCantor', weight: 2 }, { id: 'ironChanter', weight: 2 }, { id: 'arcaneChanter', weight: 2 }] },
        { minWins: 250, count: [3, 3], pool: [{ id: 'phantomEmperor', weight: 3 }, { id: 'riftAssailant', weight: 3 }, { id: 'voidCantor', weight: 2 }, { id: 'ironChanter', weight: 2 }, { id: 'arcaneChanter', weight: 2 }, { id: 'voidOrchestra', weight: 1 }] }
      ]
    }
  ],
  // カズの売り物。所持上限は maxStack（アイテム側）で縛る。
  shopItems: ['cupRamenMiso', 'cupRamenShio'],
  foodMenu: {
    buffs: {
      makanai: { id: 'makanai', name: '店主特製・怪盗まかない', priceType: 'goldRate', goldRate: .30, maxHpRate: .03, description: 'HP・MPを全回復し、潜入中は最大HPが3%上昇する。拠点帰還・敗北で消滅。' },
      sapporoMiso: { id: 'sapporoMiso', name: '札幌味噌ラーメン', price: 100, unlockBoss: 'zenacad', goldRate: .10, description: '潜入中、獲得GOLDが10%増加する。拠点帰還・敗北で消滅。' },
      // 裏メニュー効果はGOLD +20%。EXP強化は広告料理《強昆布ラーメン》へ分離する。
      taiwanMazesoba: { id: 'taiwanMazesoba', name: '台湾まぜそば', price: 150, unlockFlag: 'taiwanMazesobaUnlocked', secretMenu: true, goldRate: .20, description: '潜入中、獲得GOLDが20%増加する。拠点帰還・敗北で消滅。', unlockByMeal: { mealId: 'sapporoMiso', chance: .01 } }
    },
    comingSoon: [
      { id: 'asahikawaShoyu', name: '旭川醤油ラーメン' },
      { id: 'hakodateShio', name: '函館塩ラーメン' }
    ],
    testItems: []
  },
  musicScores: {
    cadenzaLoot: { id: 'cadenzaLoot', title: 'CADENZA', subtitle: '絶望の戦利品', artist: 'ZENAKADO', use: 'privateMode', unlockBoss: 'zenacad', description: '独奏卿ゼナカドから盗み出した禁断の楽譜。プライベートモードで演奏可能。' },
    rhythm: { id: 'rhythm', title: 'RHYTHM', subtitle: '道化師の楽園', artist: 'MYRTHI', use: 'privateMode', unlockBoss: 'myrthi', description: '黒紅の双刃戦姫ミルティから盗み出したリズムスコア。プライベートモードで演奏可能。' },
    reprise: { id: 'reprise', title: 'REPRISE', subtitle: '赤狐の怪盗', artist: 'SERIPES', use: 'privateMode', unlockBoss: 'seripes', description: '不落の反奏騎士セリペスから盗み出した反奏の楽譜。プライベートモードで演奏可能。' }
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
    // ══════════════════════════════════════════════════════════
    // D1 通常工房（24種）
    // 4系統とも 武器=素材7 / 頭手足=5〜6 / 体=8 / アクセ=8 で揃え、
    // 使用素材も6体のD1モンスターへ広く分散させている。
    // ══════════════════════════════════════════════════════════
    // ── 戦士系 ──
    kurogane_sword:  { id: 'kurogane_sword',  name: '黒鉄剣クロウ',   craftCategory: 'weapon', dungeonId: 'dungeon1', resultItemId: 'kurogane_sword',  resultCount: 1, gold: 140, materials: [{ itemId: 'rustedKnife', count: 4 }, { itemId: 'oldBone', count: 2 }, { itemId: 'stolenCoin', count: 1 }] },
    kurogane_helm:   { id: 'kurogane_helm',   name: '黒鉄の額当て',   craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'kurogane_helm',   resultCount: 1, gold: 70,  materials: [{ itemId: 'rustedKnife', count: 3 }, { itemId: 'oldBone', count: 2 }] },
    kurogane_armor:  { id: 'kurogane_armor',  name: '黒鉄の戦装',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'kurogane_armor',  resultCount: 1, gold: 190, materials: [{ itemId: 'rustedKnife', count: 3 }, { itemId: 'oldBone', count: 3 }, { itemId: 'tornCloth', count: 2 }] },
    mightGauntlet:   { id: 'mightGauntlet',   name: '剛腕の篭手',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'mightGauntlet',   resultCount: 1, gold: 80,  materials: [{ itemId: 'rustedKnife', count: 3 }, { itemId: 'gnawedBag', count: 2 }] },
    ironKnightBoots: { id: 'ironKnightBoots', name: '鉄騎のブーツ',   craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'ironKnightBoots', resultCount: 1, gold: 80,  materials: [{ itemId: 'oldBone', count: 3 }, { itemId: 'tornCloth', count: 2 }] },
    fangOfWill:      { id: 'fangOfWill',      name: '闘志の牙',       craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'fangOfWill',      resultCount: 1, gold: 210, materials: [{ itemId: 'batFang', count: 4 }, { itemId: 'goblinMedicine', count: 2 }, { itemId: 'darkSoulStone', count: 2 }] },
    // ── 武道家系 ──
    fangClaw:        { id: 'fangClaw',        name: '鋼爪ファング',   craftCategory: 'weapon', dungeonId: 'dungeon1', resultItemId: 'fangClaw',        resultCount: 1, gold: 140, materials: [{ itemId: 'batFang', count: 4 }, { itemId: 'ratWhisker', count: 2 }, { itemId: 'stolenCoin', count: 1 }] },
    galeHeadband:    { id: 'galeHeadband',    name: '疾風の鉢巻',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'galeHeadband',    resultCount: 1, gold: 70,  materials: [{ itemId: 'tornCloth', count: 3 }, { itemId: 'ratWhisker', count: 2 }] },
    fistGi:          { id: 'fistGi',          name: '拳闘の胴衣',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'fistGi',          resultCount: 1, gold: 190, materials: [{ itemId: 'tornCloth', count: 3 }, { itemId: 'gnawedBag', count: 3 }, { itemId: 'batFang', count: 2 }] },
    galeTekko:       { id: 'galeTekko',       name: '疾風の手甲',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'galeTekko',       resultCount: 1, gold: 80,  materials: [{ itemId: 'batFang', count: 3 }, { itemId: 'tornWingMembrane', count: 2 }] },
    lightGreaves:    { id: 'lightGreaves',    name: '軽身の脚甲',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'lightGreaves',    resultCount: 1, gold: 80,  materials: [{ itemId: 'ratWhisker', count: 3 }, { itemId: 'tornWingMembrane', count: 2 }] },
    tigerFang:       { id: 'tigerFang',       name: '猛虎の牙',       craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'tigerFang',       resultCount: 1, gold: 210, materials: [{ itemId: 'batFang', count: 4 }, { itemId: 'ratTail', count: 2 }, { itemId: 'beastBlood', count: 2 }] },
    // ── 魔導士系 ──
    runeFlameStaff:  { id: 'runeFlameStaff',  name: '緋炎杖ルーン',   craftCategory: 'weapon', dungeonId: 'dungeon1', resultItemId: 'runeFlameStaff',  resultCount: 1, gold: 140, materials: [{ itemId: 'manaDrop', count: 4 }, { itemId: 'magicPowder', count: 2 }, { itemId: 'stardustShard', count: 1 }] },
    arcaneHood:      { id: 'arcaneHood',      name: '魔導のフード',   craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'arcaneHood',      resultCount: 1, gold: 70,  materials: [{ itemId: 'manaDrop', count: 3 }, { itemId: 'tatteredRobe', count: 2 }] },
    wisdomRobe:      { id: 'wisdomRobe',      name: '叡智のローブ',   craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'wisdomRobe',      resultCount: 1, gold: 190, materials: [{ itemId: 'manaDrop', count: 3 }, { itemId: 'magicPowder', count: 3 }, { itemId: 'tatteredRobe', count: 2 }] },
    arcaneBangle:    { id: 'arcaneBangle',    name: '魔導の腕輪',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'arcaneBangle',    resultCount: 1, gold: 80,  materials: [{ itemId: 'magicPowder', count: 3 }, { itemId: 'stardustShard', count: 2 }] },
    stargazeShoes:   { id: 'stargazeShoes',   name: '星詠みの靴',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'stargazeShoes',   resultCount: 1, gold: 80,  materials: [{ itemId: 'stardustShard', count: 3 }, { itemId: 'slimeJelly', count: 2 }] },
    rubyMagicStone:  { id: 'rubyMagicStone',  name: '紅玉の魔石',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'rubyMagicStone',  resultCount: 1, gold: 210, materials: [{ itemId: 'magicPowder', count: 4 }, { itemId: 'moonstone', count: 2 }, { itemId: 'darkCore', count: 1 }, { itemId: 'stardustShard', count: 1 }] },
    // ── 僧侶系 ──
    celesStaff:      { id: 'celesStaff',      name: '聖杖セレス',     craftCategory: 'weapon', dungeonId: 'dungeon1', resultItemId: 'celesStaff',      resultCount: 1, gold: 140, materials: [{ itemId: 'spiritFragment', count: 4 }, { itemId: 'moonstone', count: 2 }, { itemId: 'manaDrop', count: 1 }] },
    prayerHat:       { id: 'prayerHat',       name: '白祈の帽子',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'prayerHat',       resultCount: 1, gold: 70,  materials: [{ itemId: 'spiritFragment', count: 3 }, { itemId: 'tatteredRobe', count: 2 }] },
    prayerVestment:  { id: 'prayerVestment',  name: '祈祷の法衣',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'prayerVestment',  resultCount: 1, gold: 190, materials: [{ itemId: 'spiritFragment', count: 3 }, { itemId: 'slimeJelly', count: 3 }, { itemId: 'tornCloth', count: 2 }] },
    healingBangle:   { id: 'healingBangle',   name: '癒しの腕輪',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'healingBangle',   resultCount: 1, gold: 80,  materials: [{ itemId: 'spiritFragment', count: 3 }, { itemId: 'moonstone', count: 2 }] },
    pilgrimShoes:    { id: 'pilgrimShoes',    name: '巡礼の靴',       craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'pilgrimShoes',    resultCount: 1, gold: 80,  materials: [{ itemId: 'gnawedBag', count: 3 }, { itemId: 'spiritFragment', count: 2 }] },
    silverCharm:     { id: 'silverCharm',     name: '聖銀の護符',     craftCategory: 'armor',  dungeonId: 'dungeon1', resultItemId: 'silverCharm',     resultCount: 1, gold: 210, materials: [{ itemId: 'darkSoulStone', count: 4 }, { itemId: 'resentmentCrystal', count: 2 }, { itemId: 'moonstone', count: 2 }] },

    // ══════════════════════════════════════════════════════════
    // D2 通常工房（24種）materialUnlockId の素材を初入手でレシピ解放
    // ══════════════════════════════════════════════════════════
    // 素材は階層に沿って並べてある。どのセットも同じ順序で作れるようになっている。
    //   武器・兜 → 1F素材（リバーブゼリー / エコーの欠片）
    //   腕・靴   → 2F素材（霊幻の粉塵 / 亡霊のヴァイオリン弦 / 無音の楽譜）
    //   胴・装飾 → 3F素材（静寂の装甲片 / 石像の破片 / 月光石）
    // これで「1階を踏破すると武器が新調でき、2階で腕足、3階で胴と装飾が揃う」進行になる。
    fenrirSword:    { id: 'fenrirSword',    name: '黒狼剣フェンリル', craftCategory: 'weapon', dungeonId: 'dungeon2', materialUnlockId: 'reverbJelly',  resultItemId: 'fenrirSword',    resultCount: 1, gold: 420, materials: [{ itemId: 'reverbJelly', count: 4 }, { itemId: 'echoShard', count: 3 }, { itemId: 'spectralDust', count: 2 }] },
    blackWolfHelm:  { id: 'blackWolfHelm',  name: '黒狼の兜',        craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'echoShard',    resultItemId: 'blackWolfHelm',  resultCount: 1, gold: 210, materials: [{ itemId: 'echoShard', count: 3 }, { itemId: 'reverbJelly', count: 3 }] },
    crushGauntlet:  { id: 'crushGauntlet',  name: '破砕の篭手',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'spectralDust', resultItemId: 'crushGauntlet',  resultCount: 1, gold: 240, materials: [{ itemId: 'spectralDust', count: 4 }, { itemId: 'violinString', count: 2 }] },
    kuroganeBoots:  { id: 'kuroganeBoots',  name: '黒鉄の軍靴',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'violinString', resultItemId: 'kuroganeBoots',  resultCount: 1, gold: 220, materials: [{ itemId: 'violinString', count: 4 }, { itemId: 'silentNote', count: 2 }] },
    blackWolfArmor: { id: 'blackWolfArmor', name: '黒狼の重装',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'silentArmor',  resultItemId: 'blackWolfArmor', resultCount: 1, gold: 540, materials: [{ itemId: 'silentArmor', count: 5 }, { itemId: 'stoneShard', count: 4 }, { itemId: 'silentNote', count: 2 }] },
    warDemonFang:   { id: 'warDemonFang',   name: '戦鬼の牙',        craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'stoneShard',   resultItemId: 'warDemonFang',   resultCount: 1, gold: 620, materials: [{ itemId: 'stoneShard', count: 4 }, { itemId: 'silentArmor', count: 3 }, { itemId: 'moonstone', count: 2 }] },

    yashaClaw:      { id: 'yashaClaw',      name: '夜叉爪アギト',    craftCategory: 'weapon', dungeonId: 'dungeon2', materialUnlockId: 'reverbJelly',  resultItemId: 'yashaClaw',      resultCount: 1, gold: 420, materials: [{ itemId: 'echoShard', count: 4 }, { itemId: 'reverbJelly', count: 3 }, { itemId: 'violinString', count: 2 }] },
    yashaHeadband:  { id: 'yashaHeadband',  name: '夜叉の鉢巻',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'reverbJelly',  resultItemId: 'yashaHeadband',  resultCount: 1, gold: 210, materials: [{ itemId: 'reverbJelly', count: 3 }, { itemId: 'echoShard', count: 3 }] },
    rasetsuTekko:   { id: 'rasetsuTekko',   name: '羅刹の手甲',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'violinString', resultItemId: 'rasetsuTekko',   resultCount: 1, gold: 240, materials: [{ itemId: 'violinString', count: 4 }, { itemId: 'spectralDust', count: 2 }] },
    flashGreaves:   { id: 'flashGreaves',   name: '瞬脚の具足',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'spectralDust', resultItemId: 'flashGreaves',   resultCount: 1, gold: 220, materials: [{ itemId: 'spectralDust', count: 4 }, { itemId: 'silentNote', count: 2 }] },
    shadowGi:       { id: 'shadowGi',       name: '黒影の闘衣',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'silentArmor',  resultItemId: 'shadowGi',       resultCount: 1, gold: 540, materials: [{ itemId: 'silentArmor', count: 5 }, { itemId: 'stoneShard', count: 4 }, { itemId: 'violinString', count: 2 }] },
    shuraMagatama:  { id: 'shuraMagatama',  name: '修羅の勾玉',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'stoneShard',   resultItemId: 'shuraMagatama',  resultCount: 1, gold: 620, materials: [{ itemId: 'stoneShard', count: 4 }, { itemId: 'silentArmor', count: 3 }, { itemId: 'moonstone', count: 2 }] },

    ignisStaff:     { id: 'ignisStaff',     name: '獄炎杖イグニス',  craftCategory: 'weapon', dungeonId: 'dungeon2', materialUnlockId: 'echoShard',    resultItemId: 'ignisStaff',     resultCount: 1, gold: 420, materials: [{ itemId: 'echoShard', count: 4 }, { itemId: 'reverbJelly', count: 3 }, { itemId: 'spectralDust', count: 2 }] },
    crimsonHat:     { id: 'crimsonHat',     name: '深紅の魔導帽',    craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'echoShard',    resultItemId: 'crimsonHat',     resultCount: 1, gold: 210, materials: [{ itemId: 'echoShard', count: 3 }, { itemId: 'reverbJelly', count: 3 }] },
    blazeBangle:    { id: 'blazeBangle',    name: '灼熱の腕輪',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'spectralDust', resultItemId: 'blazeBangle',    resultCount: 1, gold: 240, materials: [{ itemId: 'spectralDust', count: 4 }, { itemId: 'violinString', count: 2 }] },
    starfireShoes:  { id: 'starfireShoes',  name: '星火の魔導靴',    craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'silentNote',   resultItemId: 'starfireShoes',  resultCount: 1, gold: 220, materials: [{ itemId: 'silentNote', count: 4 }, { itemId: 'spectralDust', count: 2 }] },
    purgatoryRobe:  { id: 'purgatoryRobe',  name: '煉獄のローブ',    craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'silentArmor',  resultItemId: 'purgatoryRobe',  resultCount: 1, gold: 540, materials: [{ itemId: 'silentArmor', count: 5 }, { itemId: 'stoneShard', count: 4 }, { itemId: 'silentNote', count: 2 }] },
    infernoStone:   { id: 'infernoStone',   name: '獄炎の魔石',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'stoneShard',   resultItemId: 'infernoStone',   resultCount: 1, gold: 620, materials: [{ itemId: 'stoneShard', count: 4 }, { itemId: 'silentArmor', count: 3 }, { itemId: 'moonstone', count: 2 }] },

    luminaStaff:    { id: 'luminaStaff',    name: '月白杖ルミナ',    craftCategory: 'weapon', dungeonId: 'dungeon2', materialUnlockId: 'reverbJelly',  resultItemId: 'luminaStaff',    resultCount: 1, gold: 420, materials: [{ itemId: 'reverbJelly', count: 4 }, { itemId: 'echoShard', count: 3 }, { itemId: 'silentNote', count: 2 }] },
    // 楽器の持ち替え先。教室のリコーダーからの乗り換え用。
    silentRecorder: { id: 'silentRecorder', name: '静寂のリコーダー', craftCategory: 'weapon', dungeonId: 'dungeon2', materialUnlockId: 'violinString', resultItemId: 'silentRecorder', resultCount: 1, gold: 420, materials: [{ itemId: 'violinString', count: 4 }, { itemId: 'silentNote', count: 3 }, { itemId: 'echoShard', count: 2 }] },
    moonCrown:      { id: 'moonCrown',      name: '月白の聖冠',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'echoShard',    resultItemId: 'moonCrown',      resultCount: 1, gold: 210, materials: [{ itemId: 'echoShard', count: 3 }, { itemId: 'reverbJelly', count: 3 }] },
    mercyBangle:    { id: 'mercyBangle',    name: '慈愛の腕輪',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'silentNote',   resultItemId: 'mercyBangle',    resultCount: 1, gold: 240, materials: [{ itemId: 'silentNote', count: 4 }, { itemId: 'spectralDust', count: 2 }] },
    sacredShoes:    { id: 'sacredShoes',    name: '聖巡の靴',        craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'spectralDust', resultItemId: 'sacredShoes',    resultCount: 1, gold: 220, materials: [{ itemId: 'spectralDust', count: 4 }, { itemId: 'violinString', count: 2 }] },
    moonVestment:   { id: 'moonVestment',   name: '月祈の法衣',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'silentArmor',  resultItemId: 'moonVestment',   resultCount: 1, gold: 540, materials: [{ itemId: 'silentArmor', count: 5 }, { itemId: 'stoneShard', count: 4 }, { itemId: 'silentNote', count: 2 }] },
    moonlightCharm: { id: 'moonlightCharm', name: '月光の護符',      craftCategory: 'armor',  dungeonId: 'dungeon2', materialUnlockId: 'stoneShard',   resultItemId: 'moonlightCharm', resultCount: 1, gold: 620, materials: [{ itemId: 'stoneShard', count: 4 }, { itemId: 'silentArmor', count: 3 }, { itemId: 'moonstone', count: 2 }] },

    flameStaff: { id: 'flameStaff', name: 'フレイムスタッフ', legacy: true, craftCategory: 'weapon', dungeonId: 'dungeon1', resultItemId: 'flameStaff', resultCount: 1, gold: 120, materials: [{ itemId: 'manaDrop', count: 3 }, { itemId: 'magicPowder', count: 2 }, { itemId: 'stardustShard', count: 2 }] },
    wizardRod: { id: 'wizardRod', name: 'ウィザードロッド', legacy: true, craftCategory: 'weapon', dungeonId: 'dungeon1', resultItemId: 'wizardRod', resultCount: 1, gold: 220, materials: [{ itemId: 'manaDrop', count: 4 }, { itemId: 'moonstone', count: 2 }, { itemId: 'magicPowder', count: 3 }] },
    sunStaff: { id: 'sunStaff', name: '太陽の杖', legacy: true, craftCategory: 'weapon', dungeonId: 'dungeon1', resultItemId: 'sunStaff', resultCount: 1, gold: 400, materials: [{ itemId: 'moonstone', count: 3 }, { itemId: 'darkCore', count: 2 }, { itemId: 'manaDrop', count: 5 }] },
    roughHood: { id: 'roughHood', name: '粗削りフード', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'roughHood', resultCount: 1, gold: 40, materials: [{ itemId: 'slimeJelly', count: 2 }, { itemId: 'ratWhisker', count: 1 }] },
    shadowCap: { id: 'shadowCap', name: 'シャドウキャップ', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'shadowCap', resultCount: 1, gold: 90, materials: [{ itemId: 'manaDrop', count: 2 }, { itemId: 'stardustShard', count: 2 }] },
    arcaneHat: { id: 'arcaneHat', name: '魔導士の帽子', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'arcaneHat', resultCount: 1, gold: 160, materials: [{ itemId: 'manaDrop', count: 3 }, { itemId: 'moonstone', count: 1 }, { itemId: 'magicPowder', count: 2 }] },
    phantomMask: { id: 'phantomMask', name: '怪盗仮面', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'phantomMask', resultCount: 1, gold: 320, materials: [{ itemId: 'darkCore', count: 2 }, { itemId: 'moonstone', count: 2 }, { itemId: 'stardustShard', count: 3 }] },
    tatterCoat: { id: 'tatterCoat', name: 'ボロのコート', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'tatterCoat', resultCount: 1, gold: 40, materials: [{ itemId: 'gnawedBag', count: 2 }, { itemId: 'slimeJelly', count: 1 }] },
    leatherVest: { id: 'leatherVest', name: 'レザーベスト', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'leatherVest', resultCount: 1, gold: 90, materials: [{ itemId: 'gnawedBag', count: 3 }, { itemId: 'ratTail', count: 1 }] },
    shadowMantle: { id: 'shadowMantle', name: '影のマント', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'shadowMantle', resultCount: 1, gold: 190, materials: [{ itemId: 'gnawedBag', count: 3 }, { itemId: 'manaDrop', count: 3 }, { itemId: 'magicPowder', count: 1 }] },
    phantomSuit: { id: 'phantomSuit', name: '怪盗スーツ', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'phantomSuit', resultCount: 1, gold: 380, materials: [{ itemId: 'darkCore', count: 2 }, { itemId: 'gnawedBag', count: 4 }, { itemId: 'moonstone', count: 2 }] },
    roughGloves: { id: 'roughGloves', name: '粗削りグローブ', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'roughGloves', resultCount: 1, gold: 35, materials: [{ itemId: 'gnawedBag', count: 1 }, { itemId: 'ratWhisker', count: 2 }] },
    leatherGloves: { id: 'leatherGloves', name: 'レザーグローブ', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'leatherGloves', resultCount: 1, gold: 80, materials: [{ itemId: 'ratWhisker', count: 3 }, { itemId: 'ratTail', count: 1 }] },
    magicGloves: { id: 'magicGloves', name: '魔導グローブ', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'magicGloves', resultCount: 1, gold: 150, materials: [{ itemId: 'magicPowder', count: 3 }, { itemId: 'manaDrop', count: 2 }, { itemId: 'stardustShard', count: 1 }] },
    phantomGloves: { id: 'phantomGloves', name: '怪盗グローブ', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'phantomGloves', resultCount: 1, gold: 280, materials: [{ itemId: 'darkCore', count: 1 }, { itemId: 'ratWhisker', count: 4 }, { itemId: 'moonstone', count: 1 }] },
    roughBoots: { id: 'roughBoots', name: '粗削りブーツ', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'roughBoots', resultCount: 1, gold: 35, materials: [{ itemId: 'ratWhisker', count: 2 }, { itemId: 'gnawedBag', count: 1 }] },
    lightBoots: { id: 'lightBoots', name: '軽靴', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'lightBoots', resultCount: 1, gold: 80, materials: [{ itemId: 'ratTail', count: 2 }, { itemId: 'stolenCoin', count: 1 }] },
    swiftBoots: { id: 'swiftBoots', name: '疾走ブーツ', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'swiftBoots', resultCount: 1, gold: 150, materials: [{ itemId: 'stolenCoin', count: 2 }, { itemId: 'ratTail', count: 2 }, { itemId: 'magicPowder', count: 1 }] },
    phantomBoots: { id: 'phantomBoots', name: '怪盗ブーツ', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'phantomBoots', resultCount: 1, gold: 280, materials: [{ itemId: 'darkCore', count: 1 }, { itemId: 'stolenCoin', count: 3 }, { itemId: 'ratTail', count: 3 }] },
    silverRing: { id: 'silverRing', name: '銀の指輪', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'silverRing', resultCount: 1, gold: 80, materials: [{ itemId: 'stolenCoin', count: 3 }, { itemId: 'ratWhisker', count: 2 }] },
    manaStone: { id: 'manaStone', name: 'マナストーン', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'manaStone', resultCount: 1, gold: 110, materials: [{ itemId: 'manaDrop', count: 3 }, { itemId: 'stardustShard', count: 2 }] },
    shadowAmulet: { id: 'shadowAmulet', name: '影の護符', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'shadowAmulet', resultCount: 1, gold: 180, materials: [{ itemId: 'darkCore', count: 1 }, { itemId: 'magicPowder', count: 3 }, { itemId: 'moonstone', count: 1 }] },
    phantomBadge: { id: 'phantomBadge', name: '怪盗バッジ', legacy: true, craftCategory: 'armor', dungeonId: 'dungeon1', resultItemId: 'phantomBadge', resultCount: 1, gold: 360, materials: [{ itemId: 'darkCore', count: 2 }, { itemId: 'moonstone', count: 2 }, { itemId: 'stardustShard', count: 2 }] },
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
    d3WarriorBladeRecipe: { id: 'd3WarriorBladeRecipe', name: '城塞鉄の剣', craftCategory: 'weapon', dungeonId: 'dungeon3', materialUnlockId: 'fortressStone', resultItemId: 'd3WarriorBlade', resultCount: 1, gold: 1250, materials: [{ itemId: 'fortressStone', count: 8 }, { itemId: 'darkIron', count: 8 }, { itemId: 'voidEssence', count: 2 }] },
    d3MageStaffRecipe: { id: 'd3MageStaffRecipe', name: '虚紡の杖', craftCategory: 'weapon', dungeonId: 'dungeon3', materialUnlockId: 'voidSilk', resultItemId: 'd3MageStaff', resultCount: 1, gold: 1250, materials: [{ itemId: 'voidSilk', count: 8 }, { itemId: 'chaosDust', count: 8 }, { itemId: 'phantomCore', count: 3 }] },
    d3PriestStaffRecipe: { id: 'd3PriestStaffRecipe', name: '聖堂歯車の杖', craftCategory: 'weapon', dungeonId: 'dungeon3', materialUnlockId: 'voidSilk', resultItemId: 'd3PriestStaff', resultCount: 1, gold: 1200, materials: [{ itemId: 'voidSilk', count: 7 }, { itemId: 'sanctumGear', count: 5 }, { itemId: 'voidEssence', count: 2 }] },
    d3MartialClawRecipe: { id: 'd3MartialClawRecipe', name: '裂界の爪', craftCategory: 'weapon', dungeonId: 'dungeon3', materialUnlockId: 'riftClaw', resultItemId: 'd3MartialClaw', resultCount: 1, gold: 1200, materials: [{ itemId: 'riftClaw', count: 9 }, { itemId: 'darkIron', count: 5 }, { itemId: 'phantomCore', count: 3 }] },
    d3MaestroInstrumentRecipe: { id: 'd3MaestroInstrumentRecipe', name: '星銀の弦琴', craftCategory: 'weapon', dungeonId: 'dungeon3', materialUnlockId: 'sanctumGear', resultItemId: 'd3MaestroInstrument', resultCount: 1, gold: 1800, materials: [{ itemId: 'sanctumGear', count: 10 }, { itemId: 'voidSilk', count: 6 }, { itemId: 'astralMercury', count: 2 }] },
    d3TwinRightRecipe: { id: 'd3TwinRightRecipe', name: '裂界の双刃・右', craftCategory: 'weapon', dungeonId: 'dungeon3', materialUnlockId: 'riftClaw', resultItemId: 'd3TwinRight', resultCount: 1, gold: 1100, materials: [{ itemId: 'riftClaw', count: 7 }, { itemId: 'voidShard', count: 8 }, { itemId: 'phantomCore', count: 2 }] },
    d3TwinLeftRecipe: { id: 'd3TwinLeftRecipe', name: '裂界の双刃・左', craftCategory: 'weapon', dungeonId: 'dungeon3', materialUnlockId: 'riftClaw', resultItemId: 'd3TwinLeft', resultCount: 1, gold: 1100, materials: [{ itemId: 'riftClaw', count: 7 }, { itemId: 'chaosDust', count: 7 }, { itemId: 'phantomCore', count: 2 }] },
    d3GuardianAegisRecipe: { id: 'd3GuardianAegisRecipe', name: '城塞核の盾', craftCategory: 'weapon', dungeonId: 'dungeon3', materialUnlockId: 'fortressStone', resultItemId: 'd3GuardianAegis', resultCount: 1, gold: 1800, materials: [{ itemId: 'fortressStone', count: 12 }, { itemId: 'darkIron', count: 10 }, { itemId: 'gildedCore', count: 2 }] },
    fortressHelmRecipe: { id: 'fortressHelmRecipe', name: '城塞の兜', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'fortressStone', resultItemId: 'fortressHelm', resultCount: 1, gold: 620, materials: [{ itemId: 'fortressStone', count: 5 }, { itemId: 'darkIron', count: 4 }] },
    fortressCoatRecipe: { id: 'fortressCoatRecipe', name: '城塞の外套', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'fortressStone', resultItemId: 'fortressCoat', resultCount: 1, gold: 920, materials: [{ itemId: 'fortressStone', count: 8 }, { itemId: 'darkIron', count: 7 }, { itemId: 'voidEssence', count: 1 }] },
    fortressGlovesRecipe: { id: 'fortressGlovesRecipe', name: '城塞の手甲', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'fortressStone', resultItemId: 'fortressGloves', resultCount: 1, gold: 680, materials: [{ itemId: 'fortressStone', count: 5 }, { itemId: 'darkIron', count: 5 }] },
    fortressBootsRecipe: { id: 'fortressBootsRecipe', name: '城塞の脚甲', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'fortressStone', resultItemId: 'fortressBoots', resultCount: 1, gold: 680, materials: [{ itemId: 'fortressStone', count: 5 }, { itemId: 'darkIron', count: 5 }] },
    fortressCharmRecipe: { id: 'fortressCharmRecipe', name: '核石のお守り', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'fortressStone', resultItemId: 'fortressCharm', resultCount: 1, gold: 760, materials: [{ itemId: 'fortressStone', count: 6 }, { itemId: 'gildedCore', count: 1 }] },
    voidweaveHoodRecipe: { id: 'voidweaveHoodRecipe', name: '虚紡の帽子', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'voidSilk', resultItemId: 'voidweaveHood', resultCount: 1, gold: 620, materials: [{ itemId: 'voidSilk', count: 5 }, { itemId: 'chaosDust', count: 4 }] },
    voidweaveRobeRecipe: { id: 'voidweaveRobeRecipe', name: '虚紡のローブ', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'voidSilk', resultItemId: 'voidweaveRobe', resultCount: 1, gold: 920, materials: [{ itemId: 'voidSilk', count: 8 }, { itemId: 'chaosDust', count: 7 }, { itemId: 'voidEssence', count: 1 }] },
    voidweaveGlovesRecipe: { id: 'voidweaveGlovesRecipe', name: '虚紡の手袋', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'voidSilk', resultItemId: 'voidweaveGloves', resultCount: 1, gold: 680, materials: [{ itemId: 'voidSilk', count: 5 }, { itemId: 'sanctumGear', count: 3 }] },
    voidweaveBootsRecipe: { id: 'voidweaveBootsRecipe', name: '虚紡の靴', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'voidSilk', resultItemId: 'voidweaveBoots', resultCount: 1, gold: 680, materials: [{ itemId: 'voidSilk', count: 5 }, { itemId: 'chaosDust', count: 4 }] },
    voidweaveCharmRecipe: { id: 'voidweaveCharmRecipe', name: '聖堂歯車の護符', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'voidSilk', resultItemId: 'voidweaveCharm', resultCount: 1, gold: 760, materials: [{ itemId: 'voidSilk', count: 5 }, { itemId: 'sanctumGear', count: 4 }] },
    riftBandRecipe: { id: 'riftBandRecipe', name: '裂界の鉢巻', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'riftClaw', resultItemId: 'riftBand', resultCount: 1, gold: 620, materials: [{ itemId: 'riftClaw', count: 5 }, { itemId: 'voidShard', count: 4 }] },
    riftVestRecipe: { id: 'riftVestRecipe', name: '裂界の胴着', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'riftClaw', resultItemId: 'riftVest', resultCount: 1, gold: 920, materials: [{ itemId: 'riftClaw', count: 8 }, { itemId: 'voidShard', count: 7 }, { itemId: 'phantomCore', count: 1 }] },
    riftGuardsRecipe: { id: 'riftGuardsRecipe', name: '裂界の手甲', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'riftClaw', resultItemId: 'riftGuards', resultCount: 1, gold: 680, materials: [{ itemId: 'riftClaw', count: 5 }, { itemId: 'phantomCore', count: 2 }] },
    riftBootsRecipe: { id: 'riftBootsRecipe', name: '裂界の脚甲', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'riftClaw', resultItemId: 'riftBoots', resultCount: 1, gold: 680, materials: [{ itemId: 'riftClaw', count: 5 }, { itemId: 'voidShard', count: 4 }] },
    riftCharmRecipe: { id: 'riftCharmRecipe', name: '裂爪のお守り', craftCategory: 'armor', dungeonId: 'dungeon3', materialUnlockId: 'riftClaw', resultItemId: 'riftCharm', resultCount: 1, gold: 760, materials: [{ itemId: 'riftClaw', count: 6 }, { itemId: 'phantomCore', count: 2 }] },
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
    attack: { id: 'attack', name: 'たたかう', mp: 0, kind: 'weapon', weaponType: null, target: 'single', power: 1.0, agiScale: 0, damageType: 'physical', powerText: '攻撃性能×1.0' },

    // ══ 武器カテゴリ別の通常攻撃 ══════════════════════════════
    // 装備武器の weaponType から basicAttackByWeaponType で引かれる。
    // 剣は既存 attack をそのまま使用（力依存の物理攻撃）。
    // 3種の通常攻撃は同一の計算式（武器power × 参照ステータス）。参照する能力だけが異なる。
    //   剣 → 力 ／ 爪 → 素早さ ／ 杖 → 魔力
    martialStrike: { id: 'martialStrike', name: 'たたかう', nameEn: 'MARTIAL STRIKE', mp: 0, kind: 'weapon', weaponType: 'martial', target: 'single', agiScale: 0, damageType: 'physical', powerText: 'AGI依存', description: '拳と爪による打撃。素早さを参照する。' },
    staffFireball: { id: 'staffFireball', name: 'ファイアーボール', nameEn: 'FIREBALL', mp: 0, kind: 'weapon', weaponType: 'staff', target: 'single', power: 1.0, agiScale: 0, damageType: 'magical', element: 'fire', powerText: '魔法攻撃性能×1.0', effectText: '炎属性／MP消費なし', description: '杖に灯した炎弾を撃ち出す。杖の通常攻撃。' },
    resonantNote: { id: 'resonantNote', name: 'たたかう', nameEn: 'RESONANT NOTE', mp: 0, kind: 'weapon', weaponType: 'instrument', target: 'single', power: 1.0, agiScale: 0, damageType: 'magical', powerText: '楽器攻撃性能×1.0', description: '弦を弾き、音の刃を飛ばす。楽器の通常攻撃。' },

    // ══ ジョブパッシブ（Lv5 / 10 / 15 で習得。習得後は永久）════
    // passiveEffect の type で効果を分類し、戦闘コードは type だけを見る。
    p_might:       { id: 'p_might', name: '剛力', nameEn: 'MIGHT', type: 'PASSIVE', jobId: 'warrior', passiveEffect: { type: 'statPercent', stat: 'str', rate: .05 }, effectText: '力 +5%', description: '鍛え上げた膂力。力が上昇する。転生するたびに上げ幅が伸びる。' },
    // 戦士Lv1：武器技のMP消費を軽くする。転生で伸びるが50%で頭打ち。
    p_adept:       { id: 'p_adept', name: '練達', nameEn: 'ADEPT', type: 'PASSIVE', jobId: 'warrior', passiveEffect: { type: 'skillMpDiscount', rate: .20, rebirthStep: .06, max: .50 }, effectText: '武器技の消費MP -20%', description: '振り慣れた身体は無駄がない。武器技の消費MPが軽くなる。' },
    p_tough:       { id: 'p_tough', name: '強靭', nameEn: 'TOUGHNESS', type: 'PASSIVE', jobId: 'warrior', passiveEffect: { type: 'statPercent', stat: 'vit', rate: .05 }, effectText: '体力 +5%', description: '打たれ強い肉体。体力が5%上昇する。' },
    p_instinct:    { id: 'p_instinct', name: '闘争本能', nameEn: 'BATTLE INSTINCT', type: 'PASSIVE', jobId: 'warrior', passiveEffect: { type: 'lowHpPhysicalUp', rate: .10, rebirthStep: .03, max: .30, hpThreshold: .5 }, effectText: 'HP50%以下で物理ダメージ +10%', description: '追い詰められるほど牙を剥く。' },
    p_gale:        { id: 'p_gale', name: '疾風', nameEn: 'GALE', type: 'PASSIVE', jobId: 'martialArtist', passiveEffect: { type: 'statPercent', stat: 'agi', rate: .05 }, effectText: '素早さ +5%', description: '風のような身のこなし。素早さが5%上昇する。' },
    p_vitalAim:    { id: 'p_vitalAim', name: '急所狙い', nameEn: 'VITAL AIM', type: 'PASSIVE', jobId: 'martialArtist', passiveEffect: { type: 'criticalUp', rate: .06, rebirthStep: .02, max: .20 }, effectText: '会心率 +6%', description: '急所を見抜く眼。会心率が上昇する。' },
    p_fortune:     { id: 'p_fortune', name: '幸運', nameEn: 'FORTUNE', type: 'PASSIVE', jobId: 'martialArtist', passiveEffect: { type: 'statPercent', stat: 'luk', rate: .05 }, effectText: '運 +5%', description: '天運を引き寄せる。運が5%上昇する。' },
    p_amplify:     { id: 'p_amplify', name: '魔力増幅', nameEn: 'AMPLIFY', type: 'PASSIVE', jobId: 'mage', passiveEffect: { type: 'statPercent', stat: 'mag', rate: .05 }, effectText: '魔力 +5%', description: '魔力の流れを増幅する。魔力が5%上昇する。' },
    p_manaStore:   { id: 'p_manaStore', name: '魔力貯蔵', nameEn: 'MANA STORAGE', type: 'PASSIVE', jobId: 'mage', passiveEffect: { type: 'statPercent', stat: 'maxMp', rate: .10 }, effectText: '最大MP +10%', description: '体内に魔力を蓄える。最大MPが10%上昇する。' },
    p_spellBoost:  { id: 'p_spellBoost', name: '魔法増幅', nameEn: 'SPELL BOOST', type: 'PASSIVE', jobId: 'mage', passiveEffect: { type: 'magicDamageUp', rate: .10, rebirthStep: .03, max: .30 }, effectText: '攻撃魔法ダメージ +10%', description: '攻撃魔法の威力を高める。' },
    // 僧侶Lv1：長く潜って稼ぐ役どころ。戦闘で得るGOLDが増える。
    p_tithe:       { id: 'p_tithe', name: '施しの祈り', nameEn: 'TITHE', type: 'PASSIVE', jobId: 'priest', passiveEffect: { type: 'goldUp', rate: .60, rebirthStep: .08, max: 1.00 }, effectText: '獲得GOLD +60%', description: '僧侶で敵を倒して得るGOLDを増やす。転職だけでは利益は発生せず、実際に戦って稼ぐための能力。' },
    p_spirit:      { id: 'p_spirit', name: '祈祷', nameEn: 'PRAYER', type: 'PASSIVE', jobId: 'priest', passiveEffect: { type: 'heavyHitRegenerate', thresholdRate: .10, chance: .40, healRate: .15, turns: 3, rebirthSteps: { chance: .04, healRate: .02 }, rebirthMax: { chance: .60, healRate: .25 } }, effectText: '最大HP10%以上の実被ダメージ時、1ラウンド1回40%で3T再生', description: '大きな痛みを受けたときだけ祈りが応える。1回の実被ダメージが最大HPの10%以上なら、そのラウンドの最初の1回だけ40%で判定し、3ターンの再生を得る。発動中の再発動は効果を重ねず、残り時間だけを更新する。自傷では発動しない。' },
    p_healArt:     { id: 'p_healArt', name: '治癒術', nameEn: 'HEALING ART', type: 'PASSIVE', jobId: 'priest', passiveEffect: { type: 'healUp', rate: .25, rebirthStep: .05, max: .50 }, effectText: 'HP回復量 +25%', description: '癒やしの術を高め、ヒールと継続回復の効果を大きくする。' },
    p_wardBarrier: { id: 'p_wardBarrier', name: '魔法障壁', nameEn: 'WARD BARRIER', type: 'PASSIVE', jobId: 'priest', passiveEffect: { type: 'magicResist', rate: .10, rebirthStep: .03, max: .30 }, effectText: '被魔法ダメージ -10%', description: '魔を退ける薄い障壁を常に纏う。' },
    // ══ 守護士PASSIVE（RE:MIX可能） ════════════════════════════
    p_resonantGuard: { id: 'p_resonantGuard', name: '受響', nameEn: 'ECHO GUARD', type: 'PASSIVE', jobId: 'guardian', passiveEffect: { type: 'damageEcho', rate: .05, resonanceGainRate: .10, rebirthStep: .01, max: .15 }, effectText: '被弾後、次の攻撃ダメージ +5%／RESONANCE装備中は蓄積量 +10%', description: '痛みを一度だけ攻勢へ変える。複数回受けても重ならず、次に与える攻撃で消費する。' },
    p_indomitable: { id: 'p_indomitable', name: '不屈', nameEn: 'INDOMITABLE', type: 'PASSIVE', jobId: 'guardian', passiveEffect: { type: 'lowHpDamageReduction', rate: .10, hpThreshold: .30, rebirthStep: .02, max: .25 }, effectText: 'HP30%以下の間、被ダメージ -10%', description: '追い詰められてなお耐え抜く。HPが30%を超えると効果は止まる。' },
    p_guardStance: { id: 'p_guardStance', name: '守勢', nameEn: 'GUARD STANCE', type: 'PASSIVE', jobId: 'guardian', passiveEffect: { type: 'guardStance', rate: .20, statusResist: .20, resonanceGainRate: .20, rebirthStep: .02, max: .35 }, effectText: '防御中、状態異常耐性 +20%／RESONANCE装備中は蓄積量 +20%', description: '守りを固めたとき、状態異常にも揺らがず、受けた衝撃をより多く共鳴へ変える。' },
    p_unfallen: { id: 'p_unfallen', name: '不落', nameEn: 'UNFALLEN', type: 'PASSIVE', jobId: 'guardian', passiveEffect: { type: 'lastStand', hpFloor: 1, maxUsesPerBattle: 1 }, effectText: '戦闘中1回だけ、致死ダメージをHP1で耐える', description: '一度だけ、倒れるはずの一撃をHP1で受け止める。' },
    p_spellBlade:  { id: 'p_spellBlade', name: '魔剣適性', nameEn: 'SPELL BLADE', type: 'PASSIVE', jobId: 'magicKnight', passiveEffect: { type: 'multiStatPercent', stats: { str: .03, mag: .03 }, rebirthStatSteps: { str: .012, mag: .012 }, rebirthStatMax: { str: .09, mag: .09 } }, effectText: '力 +3% / 魔力 +3%', description: '刃と魔を同時に扱う適性。' },
    p_manaFlow:    { id: 'p_manaFlow', name: '魔力循環', nameEn: 'MANA FLOW', type: 'PASSIVE', jobId: 'magicKnight', passiveEffect: { type: 'statPercent', stat: 'maxMp', rate: .05 }, effectText: '最大MP +5%', description: '魔力を絶えず巡らせる。最大MPが5%上昇する。' },
    p_elemental:   { id: 'p_elemental', name: '属性増幅', nameEn: 'ELEMENTAL BOOST', type: 'PASSIVE', jobId: 'magicKnight', passiveEffect: { type: 'elementDamageUp', rate: .08 }, effectText: '属性攻撃ダメージ +8%', description: '属性を帯びた攻撃の威力を高める。' },

    // ══ 双刃士PASSIVE（双刃は体術武器学を共有）════════════════
    p_dualWield: { id: 'p_dualWield', name: '二刀の型', nameEn: 'DUAL WIELD', type: 'PASSIVE', jobId: 'dualBlade', passiveEffect: { type: 'dualWield', rate: .25, rebirthTable: { 0: .25, 1: .30, 2: .35, 3: .40, 4: .45, 5: .50, 6: .55, 7: .60, 8: .65, 9: .70, 10: .75, 11: .80, 12: .85, 13: .90, 14: .95, 15: 1.00 }, max: 1.00 }, effectText: '左手にも双刃を装備可能／右手命中後に左手追撃25%', description: '左右の双刃を一つの型として操る。左手は独立した命中・会心判定を行い、武器効果と体術武器学も適用される。' },
    p_comboDance: { id: 'p_comboDance', name: '連舞', nameEn: 'CHAIN DANCE', type: 'PASSIVE', jobId: 'dualBlade', passiveEffect: { type: 'comboDance', damagePerStack: .02, maxStacks: 5, maxCriticalBonus: .10, rebirthSteps: { damagePerStack: .005, maxCriticalBonus: .02 }, rebirthMax: { damagePerStack: .05, maxCriticalBonus: .20 } }, effectText: '命中ごとに連舞+1（最大5）／1段階ごと与ダメ+2%／MAXで会心+10%', description: '右手・左手・多段攻撃の各Hitで加速する。MISSすると連舞は0へ戻る。' },
    p_pursuitBlade: { id: 'p_pursuitBlade', name: '追刃', nameEn: 'PURSUIT BLADE', type: 'PASSIVE', jobId: 'dualBlade', passiveEffect: { type: 'offHandCritical', rate: .15, comboBonusOnCritical: 1, rebirthSteps: { comboBonusOnCritical: 1 }, rebirthMax: { comboBonusOnCritical: 3 } }, effectText: '左手追撃の会心率+15%／左手会心時に連舞+1追加', description: '追撃の刃を急所へ滑り込ませ、舞の速度を一気に引き上げる。' },
    p_danceForm: { id: 'p_danceForm', name: '舞踏', nameEn: 'WAR DANCE', type: 'PASSIVE', jobId: 'dualBlade', passiveEffect: { type: 'comboMaxBoost', agiRate: .20, offHandRate: .10, rebirthSteps: { agiRate: .05, offHandRate: .025 }, rebirthMax: { agiRate: .40, offHandRate: .20 } }, effectText: '連舞MAX中 AGI+20%／左手追撃倍率+10%', description: '連舞が頂点に達したときだけ完成する双刃士の戦闘舞踏。MISSすれば即座に失われる。' },

    // ══ 魔奏士 固有スキル ═════════════════════════════════════
    // アンサンブル：3ターンのあいだ魔奏士パッシブの発動率を引き上げる。
    // 発動率・持続は maestroBalance で一括調整できる。
    ensemble: { id: 'ensemble', name: 'アンサンブル', nameEn: 'ENSEMBLE', source: 'job', jobId: 'magicKnight', unlockJobLevel: 5, type: 'ACTIVE', kind: 'support', target: 'self', mp: 8, cooldown: 4, powerText: '3ターン 発動率 50%→75%', effect: { type: 'ensemble' }, effectText: '3ターン、魔奏士パッシブの発動率が75%になる／CT4', description: '旋律を重ね合わせ、乱れた魔奏を整える。パッシブが格段に発動しやすくなる。' },
    // ── 演奏中だけ解放される専用技 ──
    // requiresBuff を持つ技は、その演奏が鳴っているあいだだけコマンドに出る。
    // 物理は単体特化、魔法は全体。同じ条件技でも役割を分けている。
    // 全体は1体あたりの威力を抑える（メテオ1.5/MP18・インフェルノ1.0/MP10と釣り合わせる）。
    sforzando:  { id: 'sforzando',  name: 'スフォルツァンド', nameEn: 'SFORZANDO',  source: 'job', jobId: 'magicKnight', type: 'ACTIVE', kind: 'physical', target: 'single', mp: 5, power: 1.5, agiScale: 0, requiresBuff: 'atkUp',  damageType: 'physical', powerText: '攻撃性能×1.5', effectText: '敵単体／《フォルテ》発動中のみ使用可能', description: '強奏の勢いをそのまま刃に乗せる。フォルテが鳴っているあいだだけ放てる渾身の一撃。' },
    fortissimo: { id: 'fortissimo', name: 'フォルティッシモ', nameEn: 'FORTISSIMO', source: 'job', jobId: 'magicKnight', type: 'ACTIVE', kind: 'magical',  target: 'all',    mp: 7, power: 1.0, agiScale: 0, requiresBuff: 'matkUp', damageType: 'magical',  powerText: '魔法攻撃性能×1.0', effectText: '敵全体／《クレッシェンド》発動中のみ使用可能', description: '高まりきった旋律を戦場ぜんぶへ叩きつける。クレッシェンドが鳴っているあいだだけ放てる総奏。' },
    // ── 魔奏士パッシブ（自ターン開始時に抽選で発動）──
    p_solo:      { id: 'p_solo',      name: 'ソロ',         nameEn: 'SOLO',      type: 'PASSIVE', jobId: 'magicKnight', passiveEffect: { type: 'turnStartBuff', buff: 'doubleAct', requiresWeaponType: 'instrument', chance: .35, rebirthSteps: { chance: .03 }, rebirthMax: { chance: .55 } }, effectText: '楽器装備時のみ。自ターン開始時35%で2ターン2回行動', description: '独奏に入る。楽器を手にしているときだけ、一定確率で一度に二度動けるようになる。' },
    p_forte:     { id: 'p_forte',     name: 'フォルテ',     nameEn: 'FORTE',     type: 'PASSIVE', jobId: 'magicKnight', passiveEffect: { type: 'turnStartBuff', buff: 'atkUp',  rate: .10 }, effectText: '自ターン開始時に抽選。攻撃力+10%／専用技が解放', description: '強奏が刃に乗る。自分のターン開始時、一定確率で攻撃力が上がり、専用技が使えるようになる。' },
    p_crescendo: { id: 'p_crescendo', name: 'クレッシェンド', nameEn: 'CRESCENDO', type: 'PASSIVE', jobId: 'magicKnight', passiveEffect: { type: 'turnStartBuff', buff: 'matkUp', rate: .10 }, effectText: '自ターン開始時に抽選。魔法攻撃力+10%', description: '高まりゆく旋律が魔を押し上げる。自分のターン開始時、一定確率で魔法攻撃力が上がる。' },
    p_nocturne:  { id: 'p_nocturne',  name: 'ノクターン',   nameEn: 'NOCTURNE',  type: 'PASSIVE', jobId: 'magicKnight', passiveEffect: { type: 'turnStartBuff', buff: 'regen', chance: .30, rebirthSteps: { chance: .03 }, rebirthMax: { chance: .50 } }, effectText: '自ターン開始時30%で発動。3ターン自然回復', description: '夜想曲が傷を癒やす。自分のターン開始時、30%の確率で3ターンの継続回復を得る。' },
    magicCharge: { id: 'magicCharge', name: '魔力装填', nameEn: 'MAGIC CHARGE', source: 'job', jobId: 'magicKnight', unlockJobLevel: 1, type: 'ACTIVE', kind: 'support', target: 'self', mp: 4, cooldown: 3, powerText: '次の物理攻撃に MAG×0.5 を追加', effect: { type: 'selfMagicCharge' }, effectText: '次に使う物理攻撃・武器技へ魔力依存の追加ダメージ／CT3', description: '刃に魔力を装填する。次の物理攻撃へ魔力分のダメージを上乗せする。' },

    // ══ 閃き技（対応する攻撃の使用中に閃く）═══════════════════
    // weaponType / sparkRank / sparkFrom で派生ツリーを構成する。
    // prerequisiteSkill は旧データとの派生互換にだけ残す。requiredWeaponLevel / sparkRate は
    // 旧セーブ・調整資料向けの残置値で、現在の習得判定には使用しない。

    // ── 楽器の閃きツリー ──
    // 技名は「やられた敵側の実況」。何をされたのか分かっていない。
    recorderChoking: {
      id: 'recorderChoking', name: 'リコーダーでチョーキングぅう！？', nameEn: 'RECORDER CHOKING', source: 'weapon', type: 'ACTIVE',
      weaponType: 'instrument', prerequisiteSkill: 'resonantNote', requiredWeaponLevel: 3, sparkRate: null,
      mp: 3, kind: 'magical', damageType: 'magical', target: 'single',
      power: 1.4, agiScale: 0, criticalModifier: 0.15,
      powerText: '楽器攻撃性能×1.4', effectText: '敵単体／会心率+15%',
      description: '指穴を半分ずらして音程を歪ませる。ギター用の技法をリコーダーでやる者がいるとは誰も思わない。'
    },
    guitarGigRecorder: {
      id: 'guitarGigRecorder', name: 'ギターギグからなぜリコーダーが！？', nameEn: 'FROM THE GIG BAG', source: 'weapon', type: 'ACTIVE',
      weaponType: 'instrument', prerequisiteSkill: 'recorderChoking', requiredWeaponLevel: 7, sparkRate: null,
      mp: 5, kind: 'magical', damageType: 'magical', target: 'all',
      power: 0.8, agiScale: 0, effect: { type: 'enemyConfuse', chance: .25, turns: 2 },
      powerText: '楽器攻撃性能×0.8', effectText: '敵全体／25%で混乱（2ターン）',
      description: 'ギターケースから取り出されたのはリコーダー。何が起きたのか理解できないまま、敵の足並みが崩れる。'
    },
    whoseRecorder: {
      id: 'whoseRecorder', name: 'それって本当にお前のリコーダーなのか！？', nameEn: 'WHOSE RECORDER', source: 'weapon', type: 'ACTIVE',
      weaponType: 'instrument', prerequisiteSkill: 'guitarGigRecorder', requiredWeaponLevel: 12, sparkRate: null,
      mp: 6, kind: 'magical', damageType: 'magical', target: 'single',
      power: 1.8, agiScale: 0, effect: { type: 'enemyDefDown', rate: .25, turns: 2 },
      powerText: '楽器攻撃性能×1.8', effectText: '敵単体／精神 -25%（2ターン）',
      description: '名前欄のシールが剥がれかけている。誰のものか分からない旋律は、聴く者の心を揺さぶって守りを緩ませる。'
    },
    cleaningRodStrike: {
      id: 'cleaningRodStrike', name: 'リコーダーじゃなくて付属のマクガイバーで攻撃だと！？', nameEn: 'CLEANING ROD STRIKE', source: 'weapon', type: 'ACTIVE',
      weaponType: 'instrument', prerequisiteSkill: 'whoseRecorder', requiredWeaponLevel: 18, sparkRate: null,
      mp: 14, kind: 'physical', damageType: 'physical', target: 'single',
      power: 2.2, agiScale: 0, criticalModifier: 0.25,
      powerText: '楽器攻撃性能×2.2（物理）', effectText: '敵単体／会心率+25%／楽器なのに物理攻撃',
      description: '本体ではなく、掃除用の細長い棒で殴りかかる。音楽はどこへ行った。'
    },

    doubleSlash: {
      id: 'doubleSlash', name: '二段斬り', nameEn: 'DOUBLE SLASH', source: 'weapon', type: 'ACTIVE',
      weaponType: 'sword', prerequisiteSkill: 'attack', requiredWeaponLevel: 3, sparkRate: null,
      mp: 2, kind: 'physical', damageType: 'physical', target: 'single',
      power: 0.7, hitCount: 2, hits: 2, agiScale: 0, criticalModifier: 0, accuracyModifier: 0,
      powerText: 'STR×0.7×2回', effectText: '2連撃／合計1.4倍', description: '踏み込みから返す刃で二度斬りつける。'
    },
    doubleClaw: {
      id: 'doubleClaw', name: 'ダブルクロー', nameEn: 'DOUBLE CLAW', source: 'weapon', type: 'ACTIVE',
      weaponType: 'martial', prerequisiteSkill: 'martialStrike', requiredWeaponLevel: 3, sparkRate: null,
      mp: 3, kind: 'physical', damageType: 'physical', target: 'single',
      power: 0.65, hitCount: 2, hits: 2, agiScale: 0, criticalModifier: 0.08,
      powerText: 'AGI×0.65×2回', effectText: '2連撃／各撃で会心判定＋会心率上昇', description: '両の爪で切り裂く連撃。会心を狙いやすい。'
    },
    fireStorm: {
      id: 'fireStorm', name: 'ファイアストーム', nameEn: 'FIRE STORM', source: 'weapon', type: 'ACTIVE',
      weaponType: 'staff', prerequisiteSkill: 'staffFireball', requiredWeaponLevel: 3, sparkRate: null,
      mp: 5, kind: 'magical', damageType: 'magical', element: 'fire', target: 'all',
      power: 0.7, hitCount: 1, agiScale: 0, criticalModifier: 0, accuracyModifier: 0.10,
      powerText: 'MAG×0.7（全体）', effectText: '敵全体へ炎属性魔法', description: '渦巻く業火が戦場を包む。'
    },

    // ── 剣：二段斬り → 三段斬り → 音速剣 → 残像剣 ──────────────
    tripleSlash: {
      id: 'tripleSlash', name: '三段斬り', nameEn: 'TRIPLE SLASH', source: 'weapon', type: 'ACTIVE',
      weaponType: 'sword', prerequisiteSkill: 'doubleSlash', requiredWeaponLevel: 7, sparkRate: null,
      mp: 3, kind: 'physical', damageType: 'physical', target: 'single',
      power: 0.55, hitCount: 3, hits: 3, agiScale: 0, criticalModifier: 0, accuracyModifier: -0.05,
      powerText: 'STR×0.55×3回', effectText: '3連撃／合計1.65倍', description: '流れるような三連の斬撃。'
    },
    sonicBlade: {
      id: 'sonicBlade', name: '音速剣', nameEn: 'SONIC BLADE', source: 'weapon', type: 'ACTIVE',
      weaponType: 'sword', prerequisiteSkill: 'tripleSlash', requiredWeaponLevel: 12, sparkRate: null,
      mp: 5, kind: 'physical', damageType: 'physical', target: 'single',
      power: 1.6, hitCount: 1, agiScale: 0, criticalModifier: 0, accuracyModifier: 0.15, speedBonus: 40,
      powerText: 'STR×1.6', effectText: '強い先制補正', description: '音を置き去りにする神速の一閃。'
    },
    afterimageBlade: {
      id: 'afterimageBlade', name: '残像剣', nameEn: 'AFTERIMAGE BLADE', source: 'weapon', type: 'ACTIVE',
      weaponType: 'sword', prerequisiteSkill: 'sonicBlade', requiredWeaponLevel: 18, sparkRate: null,
      mp: 8, kind: 'physical', damageType: 'physical', target: 'all',
      power: 1.3, hitCount: 1, agiScale: 0, criticalModifier: 0, accuracyModifier: -0.10,
      powerText: '攻撃性能×1.3（全体）', effectText: '敵全体へ物理攻撃', description: '無数の残像が同時に敵を薙ぐ。剣の唯一の全体攻撃。'
    },

    // ── 体術：ダブルクロー →（急所突き／疾風拳）→ 影縫い ───────
    vitalPierce: {
      id: 'vitalPierce', name: '急所突き', nameEn: 'VITAL PIERCE', source: 'weapon', type: 'ACTIVE',
      weaponType: 'martial', prerequisiteSkill: 'doubleClaw', requiredWeaponLevel: 7, sparkRate: null,
      mp: 5, kind: 'physical', damageType: 'physical', target: 'single',
      power: 1.2, hitCount: 1, agiScale: 0, criticalModifier: 0.25, accuracyModifier: -0.05,
      powerText: 'AGI×1.2', effectText: '会心率 大幅上昇', description: '一点の急所を穿つ。会心を狙う技。'
    },
    galeFist: {
      id: 'galeFist', name: '疾風拳', nameEn: 'GALE FIST', source: 'weapon', type: 'ACTIVE',
      weaponType: 'martial', prerequisiteSkill: 'doubleClaw', requiredWeaponLevel: 12, sparkRate: null,
      mp: 8, kind: 'physical', damageType: 'physical', target: 'single',
      power: 1.4, hitCount: 1, agiScale: 0.3, criticalModifier: 0, speedBonus: 40,
      powerText: 'AGI×1.4＋AGI×0.3', effectText: '強い先制補正', description: '疾風のごとき踏み込みから放つ拳。'
    },
    shadowStitch: {
      id: 'shadowStitch', name: '影縫い', nameEn: 'SHADOW STITCH', source: 'weapon', type: 'ACTIVE',
      weaponType: 'martial', prerequisiteSkill: 'galeFist', requiredWeaponLevel: 18, sparkRate: null,
      mp: 11, kind: 'physical', damageType: 'physical', target: 'single',
      power: 1.3, hitCount: 1, agiScale: 0, criticalModifier: 0,
      effect: { type: 'enemyBind', chance: 0.65, turns: 2, resistanceGain: 0.25 },
      powerText: 'AGI×1.3', effectText: '65%で足止め（2行動）／重ね掛け不可・成功後は耐性上昇', description: '影を縫い止め、二度の行動を封じる。一度縫われた敵は次第に術を見切る。'
    },

    // ── 杖：ファイアーボール →（ファイアストーム／ファイアランス）→ インフェルノ → メテオ ──
    fireLance: {
      id: 'fireLance', name: 'ファイアランス', nameEn: 'FIRE LANCE', source: 'weapon', type: 'ACTIVE',
      weaponType: 'staff', prerequisiteSkill: 'staffFireball', requiredWeaponLevel: 7, sparkRate: null,
      mp: 6, kind: 'magical', damageType: 'magical', element: 'fire', target: 'single',
      power: 1.6, hitCount: 1, agiScale: 0, criticalModifier: 0,
      powerText: 'MAG×1.6', effectText: '単体高火力の炎魔法', description: '収束した炎が槍となって貫く。'
    },
    inferno: {
      id: 'inferno', name: 'インフェルノ', nameEn: 'INFERNO', source: 'weapon', type: 'ACTIVE',
      weaponType: 'staff', prerequisiteSkill: 'fireStorm', requiredWeaponLevel: 12, sparkRate: null,
      mp: 10, kind: 'magical', damageType: 'magical', element: 'fire', target: 'all',
      power: 1.0, hitCount: 1, agiScale: 0, criticalModifier: 0, accuracyModifier: 0.15,
      powerText: 'MAG×1.0（全体）', effectText: '敵全体を焼き尽くす炎', description: '地を舐める獄炎が全てを飲み込む。'
    },
    meteor: {
      id: 'meteor', name: 'メテオ', nameEn: 'METEOR', source: 'weapon', type: 'ACTIVE',
      weaponType: 'staff', prerequisiteSkill: 'inferno', requiredWeaponLevel: 18, sparkRate: null,
      mp: 18, kind: 'magical', damageType: 'magical', element: 'fire', target: 'all',
      power: 1.5, hitCount: 1, agiScale: 0, criticalModifier: 0, unavoidable: true,
      powerText: 'MAG×1.5（全体）', effectText: '高コストの大魔法', description: '天より降る星の礫が戦場を穿つ。'
    },

    quickSlash: { id: 'quickSlash', name: 'クイックスラッシュ', nameEn: 'QUICK SLASH', source: 'character', type: 'ACTIVE', mp: 5, kind: 'physical', target: 'single', power: 3.5, agiScale: 0.8, powerText: 'ATK×3.5＋AGI×0.8', effectText: '素早さも威力へ加算', description: '素早い踏み込みから放つ斬撃。力と素早さを参照して敵単体へダメージを与える。' },
    flame: { id: 'flame', name: 'フラム', mp: 6, kind: 'magical', target: 'all', power: 0.8, agiScale: 0, elementId: 'fire' },
    fireball: { id: 'fireball', name: 'ファイアボール', mp: 5, kind: 'magical', target: 'single', power: 1.4, agiScale: 0, elementId: 'fire' },
    blueNote: { id: 'blueNote', name: 'ブルーノート', nameEn: 'BLUE NOTE', source: 'character', unlockLevel: 1, type: 'ACTIVE', kind: 'hybrid', target: 'single', mp: 5, power: 1, strScale: 1.7, magScale: 1.7, agiScale: 0, powerText: 'ATK×1.7＋MAG×1.7', effectText: '物理攻撃力と魔力の双方を参照', description: '青い魔力を武器へ纏わせて敵を攻撃する。物理攻撃力と魔力の双方を参照してダメージを与える。' },
    blueEcho: { id: 'blueEcho', name: '蒼の残響', nameEn: 'BLUE ECHO', source: 'character', unlockLevel: 3, type: 'PASSIVE', kind: 'passive', target: 'self', mp: 0, powerText: '－', effectText: 'ターン開始時20%でMAG +10%／2ターン。重複せず残り時間を更新', description: '戦いの中で魔力の波長を捉え、自らの魔力を高める。' },
    meditation: { id: 'meditation', name: '精神集中', nameEn: 'MEDITATION', source: 'character', unlockLevel: 5, type: 'ACTIVE', kind: 'support', target: 'self', mp: 0, cooldown: 3, powerText: '次の魔法攻撃 ×2.5', effect: { type: 'selfMagCharge', rate: 1.5 }, effectText: '次に使う魔法攻撃の威力+150%／クールタイム3ターン', description: '呼吸を整え、魔力を一点へ収束させる。次に使用する魔法攻撃の威力を2.5倍にする。' },
    powerCharge: { id: 'powerCharge', name: 'ちからため', nameEn: 'POWER CHARGE', source: 'job', jobId: 'warrior', unlockJobLevel: 1, type: 'ACTIVE', kind: 'support', target: 'self', mp: 0, cooldown: 3, powerText: '次の物理攻撃 ×3.5', effect: { type: 'selfAtkCharge', rate: 2.5 }, effectText: '次に使う物理攻撃の威力+250%／クールタイム3ターン', description: '全身に力を溜める。次に使用する物理攻撃の威力を大きく高める。' },
    // 武道家の固有技。体術武器技（会心・先制・速度妨害）とは役割を分ける純粋な多段攻撃。
    burstFist: { id: 'burstFist', name: 'ばくれつけん', nameEn: 'BURST FIST', source: 'job', jobId: 'martialArtist', unlockJobLevel: 1, type: 'ACTIVE', kind: 'physical', target: 'single', randomTarget: true, mp: 6, power: 0.5, hits: 4, agiScale: 0, powerText: 'ATK×0.5×4回', effectText: '生存敵からランダムに4回連続攻撃／各撃で個別クリティカル判定', description: '目にも留まらぬ拳の連打を叩き込む。武道家だけが扱える固有技。' },
    powerStrike: { id: 'powerStrike', name: '強撃', nameEn: 'POWER STRIKE', source: 'job', jobId: 'warrior', unlockJobLevel: 3, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 4, power: 4.2, agiScale: 0, powerText: 'ATK×4.2', effectText: '通常攻撃より高威力', description: '力を込めた一撃。ATKを参照して敵単体へ物理ダメージを与える。' },
    breakEdge: { id: 'breakEdge', name: 'ブレイクエッジ', nameEn: 'BREAK EDGE', source: 'job', jobId: 'warrior', unlockJobLevel: 6, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 7, power: 3.5, agiScale: 0, effect: { type: 'enemyDefDown', rate: .20, turns: 2 }, powerText: 'ATK×3.5', effectText: '敵DEF -20%／2ターン', description: '防御を断つ斬撃。物理ダメージと同時に敵のDEFを低下させる。' },
    recklessEdge: { id: 'recklessEdge', name: '捨て身斬り', nameEn: 'RECKLESS EDGE', source: 'job', jobId: 'warrior', unlockJobLevel: 9, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 10, power: 6.0, agiScale: 0, effect: { type: 'selfDefDown', rate: .20, turns: 2 }, powerText: 'ATK×6.0', effectText: '使用後、自身のDEF -20%／2ターン', description: '守りを捨てて放つ高威力の斬撃。' },
    blueFlame: { id: 'blueFlame', name: '蒼炎弾', nameEn: 'BLUE FLAME', source: 'job', jobId: 'mage', unlockJobLevel: 3, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 6, power: 4.2, agiScale: 0, powerText: 'MAG×4.2', effectText: '敵単体へ魔法ダメージ', description: '蒼い炎を凝縮し、敵単体へ撃ち出す魔法。' },
    manaBurst: { id: 'manaBurst', name: '魔力炸裂', nameEn: 'MANA BURST', source: 'job', jobId: 'mage', unlockJobLevel: 6, type: 'ACTIVE', kind: 'magical', target: 'all', mp: 12, power: 2.8, agiScale: 0, powerText: 'MAG×2.8', effectText: '敵全体へ魔法ダメージ', description: '周囲へ魔力を炸裂させ、敵全体を攻撃する。' },
    astralRay: { id: 'astralRay', name: 'アストラルレイ', nameEn: 'ASTRAL RAY', source: 'job', jobId: 'mage', unlockJobLevel: 9, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 15, power: 6.5, agiScale: 0, powerText: 'MAG×6.5', effectText: '敵単体へ高威力魔法攻撃', description: '大量のMPを収束した星幽の光線で敵を貫く。' },
    doubleStrike: { id: 'doubleStrike', name: '連撃', nameEn: 'DOUBLE STRIKE', source: 'job', jobId: 'martialArtist', unlockJobLevel: 3, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 6, power: 2.0, hits: 2, agiScale: 0, powerText: 'ATK×2.0×2回', effectText: '2回攻撃／各攻撃で個別クリティカル判定', description: '間を置かず二撃を叩き込む。' },
    breakFist: { id: 'breakFist', name: '崩拳', nameEn: 'BREAK FIST', source: 'job', jobId: 'martialArtist', unlockJobLevel: 6, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 8, power: 3.8, ignoreDef: .40, agiScale: 0, powerText: 'ATK×3.8', effectText: '敵DEFを40%無視', description: '防御の隙間へ衝撃を通し、敵DEFの一部を無視する。' },
    shadowRush: { id: 'shadowRush', name: '無影連舞', nameEn: 'SHADOW RUSH', source: 'job', jobId: 'martialArtist', unlockJobLevel: 9, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 12, power: 2.0, hits: 3, agiScale: 0, powerText: 'ATK×2.0×3回', effectText: '3回攻撃／各攻撃で個別クリティカル判定', description: '影すら残さない三連撃。' },
    heal: { id: 'heal', name: 'ヒール', nameEn: 'HEAL', source: 'job', jobId: 'priest', unlockJobLevel: 1, type: 'ACTIVE', kind: 'support', target: 'self', mp: 6, powerText: 'MND×2.0＋30', effect: { type: 'hpRecover', baseHeal: 30, spiritScaling: 2.0 }, effectText: '精神を参照して自身のHPを大きく回復', description: '精神力を癒やしの力へ変え、自身のHPを回復する。' },
    holyLight: { id: 'holyLight', name: 'ホーリーライト', nameEn: 'HOLY LIGHT', source: 'job', jobId: 'priest', unlockJobLevel: 6, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 8, power: 4.0, agiScale: 0, elementId: 'light', powerText: 'MAG×4.0', effectText: '敵単体へ光属性魔法攻撃', description: '聖なる光を放ち、敵単体へ魔法ダメージを与える。' },
    regenerate: { id: 'regenerate', name: 'リジェネレート', nameEn: 'REGENERATE', source: 'job', jobId: 'priest', unlockJobLevel: 3, type: 'ACTIVE', kind: 'support', target: 'self', mp: 8, powerText: '各ターン35%で最大HP15%×3T', effect: { type: 'regenerate', maxHpRate: .15, triggerChance: .35, turns: 3 }, effectText: '3ターン、各ターン35%で最大HPの15%回復', description: '3ターン祈りを保ち、ターン開始ごとに35%で傷を癒やす。運良く3回すべて成功すれば最大HPの45%（回復強化込みではさらに増加）を取り戻す。' },
    bodyToMind: { id: 'bodyToMind', name: 'ボディ・トゥ・マインド', nameEn: 'BODY TO MIND', source: 'job', jobId: 'priest', unlockJobLevel: 5, type: 'ACTIVE', kind: 'support', target: 'self', mp: 0, maxUsesPerBattle: 1, powerText: '最大HP20% → 最大MP25%', effect: { type: 'hpToMp', hpCostRate: .20, mpRecoverRate: .25 }, effectText: '最大HP20%を消費し最大MP25%回復／1戦1回／HP不足時不可', description: '肉体に宿る生命力を魔力へ転換する、一戦一度の循環術。リジェネレートが連続成功すれば傷を補えるが、同じ敵を残して変換を繰り返すことはできない。' },
    warCry: { id: 'warCry', name: '雄叫び', nameEn: 'WAR CRY', source: 'job', jobId: 'warrior', unlockJobLevel: 12, type: 'ACTIVE', kind: 'support', target: 'self', mp: 0, cooldown: 4, powerText: '自身DEF +35%／3T', effect: { type: 'selfDefUp', rate: .35, turns: 3 }, effectText: '自身のDEF +35%／3ターン、CT4', description: '魂の底から放つ雄叫び。一時的に防御力を大幅に高める。' },
    titanBlow: { id: 'titanBlow', name: '天地崩拳', nameEn: 'TITAN BLOW', source: 'job', jobId: 'warrior', unlockJobLevel: 16, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 14, power: 8.0, agiScale: 0, powerText: 'ATK×8.0', effectText: '極大物理ダメージ', description: '全身の力を一点に凝縮した、天地を砕く究極の一撃。' },
    arcaneExplosion: { id: 'arcaneExplosion', name: '魔力爆発', nameEn: 'ARCANE EXPLOSION', source: 'job', jobId: 'mage', unlockJobLevel: 12, type: 'ACTIVE', kind: 'magical', target: 'all', mp: 16, power: 3.8, agiScale: 0, powerText: 'MAG×3.8', effectText: '敵全体へ高威力魔法攻撃', description: '体内に蓄えた魔力を一気に爆発させ、周囲の敵すべてを薙ぎ払う。' },
    voidNova: { id: 'voidNova', name: '虚空の星霊', nameEn: 'VOID NOVA', source: 'job', jobId: 'mage', unlockJobLevel: 16, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 20, power: 9.0, agiScale: 0, powerText: 'MAG×9.0', effectText: '敵単体へ極大魔法攻撃', description: '虚空から星霊の力を引き出した究極魔法。魔導士の到達点。' },
    swiftBarrage: { id: 'swiftBarrage', name: '迅雷四連撃', nameEn: 'SWIFT BARRAGE', source: 'job', jobId: 'martialArtist', unlockJobLevel: 12, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 12, power: 2.0, hits: 4, agiScale: 0, powerText: 'ATK×2.0×4回', effectText: '4回攻撃／各攻撃で個別クリティカル判定', description: '稲妻のような四連撃。体術の極みが生み出す怒涛の連打。' },
    shadowSeven: { id: 'shadowSeven', name: '幻影七閃', nameEn: 'SHADOW SEVEN', source: 'job', jobId: 'martialArtist', unlockJobLevel: 16, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 18, power: 2.5, hits: 5, agiScale: 0, powerText: 'ATK×2.5×5回', effectText: '5回攻撃／各攻撃で個別クリティカル判定', description: '影を七つに見せる五連閃。武道家の至高の多段技。' },
    greatHeal: { id: 'greatHeal', name: 'グレートヒール', nameEn: 'GREAT HEAL', source: 'job', jobId: 'priest', unlockJobLevel: 12, type: 'ACTIVE', kind: 'support', target: 'self', mp: 12, powerText: 'MND×5.0＋40', effect: { type: 'hpRecover', mndScale: 5, base: 40 }, effectText: 'MND参照で大量HP回復', description: '精神力のすべてを傾けた大回復術。大きく傷を癒やし、戦場への帰還を可能にする。' },
    soulPassage: { id: 'soulPassage', name: '魂送の祈り', nameEn: 'SOUL PASSAGE', source: 'job', jobId: 'priest', unlockJobLevel: 15, type: 'ACTIVE', kind: 'magical', damageType: 'magical', target: 'single', mp: 14, powerText: '即死確率 5～60%', effect: { type: 'instantDeath', baseChance: .20, statEdgeRate: .008, minChance: .05, maxChance: .60 }, effectText: '20%＋（MAG＋MND－敵MND）×0.8%／BOSS無効', description: '魂を静かに彼方へ送る祈り。魔力と精神を鍛えた僧侶ほど成功しやすいが、強い魔法防御には阻まれる。' },
    divineSmite: { id: 'divineSmite', name: '神裁の一閃', nameEn: 'DIVINE SMITE', source: 'job', jobId: 'priest', unlockJobLevel: 16, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 22, power: 7.0, agiScale: 0, elementId: 'light', powerText: 'MAG×7.0', effectText: '敵単体へ極大光属性魔法攻撃', description: '神の裁定を下す一閃。光を凝縮した究極の聖魔法。' },
    // ↓ここから5つは魔奏聖の専用技だった。魔奏聖の削除にともない、現在どのJOBからも習得できない。
    //   別JOBへ割り当て直すか、不要なら丸ごと削除してよい。
    resonantSpell: { id: 'resonantSpell', name: '共鳴魔法', nameEn: 'RESONANT SPELL', source: 'job', jobId: 'arcaneMaestro', unlockJobLevel: 3, type: 'ACTIVE', kind: 'magical', target: 'all', mp: 14, power: 3.2, agiScale: 0, powerText: 'MAG×3.2', effectText: '敵全体へ魔法攻撃', description: '魔奏士の共鳴する魔力を解き放ち、敵全体を攻撃する。' },
    celestialNote: { id: 'celestialNote', name: '天韻の一節', nameEn: 'CELESTIAL NOTE', source: 'job', jobId: 'arcaneMaestro', unlockJobLevel: 6, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 18, power: 8.0, agiScale: 0, powerText: 'MAG×8.0', effectText: '敵単体へ強力な魔法攻撃', description: '天上の旋律を一音に凝縮した、高威力の魔法弾。' },
    divineMelody: { id: 'divineMelody', name: '神癒の律動', nameEn: 'DIVINE MELODY', source: 'job', jobId: 'arcaneMaestro', unlockJobLevel: 9, type: 'ACTIVE', kind: 'support', target: 'self', mp: 16, powerText: 'MND×6.0＋50', effect: { type: 'hpRecover', mndScale: 6, base: 50 }, effectText: 'MND参照で大量HP回復', description: '神聖な旋律の加護により、大量のHPを回復する。' },
    grandOrchestra: { id: 'grandOrchestra', name: '大演奏', nameEn: 'GRAND ORCHESTRA', source: 'job', jobId: 'arcaneMaestro', unlockJobLevel: 12, type: 'ACTIVE', kind: 'magical', target: 'all', mp: 22, power: 4.5, agiScale: 0, powerText: 'MAG×4.5', effectText: '敵全体へ高威力魔法攻撃', description: '全ての魔力を交響曲として解き放つ。敵全体を薙ぎ払う大魔法。' },
    cosmicAria: { id: 'cosmicAria', name: '宇宙の詠唱', nameEn: 'COSMIC ARIA', source: 'job', jobId: 'arcaneMaestro', unlockJobLevel: 16, type: 'ACTIVE', kind: 'magical', target: 'single', mp: 28, power: 11.0, agiScale: 0, powerText: 'MAG×11.0', effectText: '敵単体へ極大魔法攻撃', description: '宇宙の律動を一点に収束させた究極魔法。魔奏士の境地。' },
    twistingEdge: { id: 'twistingEdge', name: '連刃突き', nameEn: 'TWISTING EDGE', source: 'job', jobId: 'dualBlade', unlockJobLevel: 3, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 8, power: 2.5, hits: 2, agiScale: 0, powerText: 'ATK×2.5×2回', effectText: '2回物理攻撃', description: '双刃を連続して突き込む。' },
    sunderDance: { id: 'sunderDance', name: '乱舞斬', nameEn: 'SUNDER DANCE', source: 'job', jobId: 'dualBlade', unlockJobLevel: 6, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 12, power: 2.0, hits: 3, ignoreDef: .20, agiScale: 0, powerText: 'ATK×2.0×3回', effectText: '3回攻撃 / DEF20%無視', description: '舞うように放つ三連斬。防御を部分的に無視する。' },
    crimsonRush: { id: 'crimsonRush', name: '黒紅突進', nameEn: 'CRIMSON RUSH', source: 'job', jobId: 'dualBlade', unlockJobLevel: 9, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 15, power: 7.0, ignoreDef: .30, agiScale: 0, powerText: 'ATK×7.0', effectText: 'DEF30%無視の高威力突進', description: '黒紅の軌跡を描きながら敵へ一直線に突進する。' },
    dualEdgeBarrage: { id: 'dualEdgeBarrage', name: '双刃乱打', nameEn: 'DUAL EDGE BARRAGE', source: 'job', jobId: 'dualBlade', unlockJobLevel: 12, type: 'ACTIVE', kind: 'physical', target: 'single', mp: 16, power: 1.8, hits: 5, agiScale: 0, powerText: 'ATK×1.8×5回', effectText: '5回物理攻撃', description: '双刃を猛烈に振り回す五連打。各攻撃が個別にクリティカルを狙う。' },
    battleDance: { id: 'battleDance', name: '戦姫乱舞', nameEn: 'WAR PRINCESS DANCE', source: 'job', jobId: 'dualBlade', unlockJobLevel: 1, type: 'ACTIVE', kind: 'physical', damageType: 'physical', weaponType: 'martial', requiresWeaponSubtype: 'dualBlade', target: 'single', mp: 16, power: .5, hits: 5, hitPowersDual: [.45, .45, .50, .50, .85], hitPowersSingle: [.50, .55, .85], agiScale: 0, powerText: '二刀時 0.45+0.45+0.50+0.50+0.85（計×2.75）', effectText: '各Hit独立命中・会心／片手時3Hit／連舞MAXなら最終Hit×1.5後に連舞0', description: 'ミルティから盗んだ双刃士の象徴技。二刀で真価を発揮し、連舞MAXでは《戦姫乱舞・極》へ変化する。' },

    // ── 盾学：防御性能を攻撃へ転換する守護士の武器技 ──
    shieldStrike: { id: 'shieldStrike', name: '盾撃', nameEn: 'SHIELD STRIKE', source: 'weapon', type: 'ACTIVE', weaponType: 'shield', mp: 0, kind: 'weapon', damageType: 'physical', target: 'single', power: 1.0, powerText: '盾攻撃性能×1.0', effectText: 'DEF×0.5＋MDEF×0.5を攻撃へ転換', description: '盾の防御性能を乗せて敵を打ち据える通常攻撃。' },
    shieldBash: { id: 'shieldBash', name: 'シールドバッシュ', nameEn: 'SHIELD BASH', source: 'weapon', type: 'ACTIVE', weaponType: 'shield', prerequisiteSkill: 'shieldStrike', mp: 3, kind: 'physical', damageType: 'physical', target: 'single', power: .85, effect: { type: 'enemyStun', chance: .55, bossChance: .18, overdriveChance: .08, turns: 1 }, powerText: '盾攻撃性能×0.85', effectText: '低ダメージ／一定確率で1行動スタン（BOSS・OVERDRIVEは低確率）', description: '大きく盾を叩きつけ、敵の動きを止める低難度の閃き技。BOSSにも完全耐性はなく、わずかに通る。' },
    guardImpact: { id: 'guardImpact', name: 'ガードインパクト', nameEn: 'GUARD IMPACT', source: 'weapon', type: 'ACTIVE', weaponType: 'shield', prerequisiteSkill: 'shieldBash', mp: 4, kind: 'physical', damageType: 'physical', target: 'single', power: 1.3, effect: { type: 'selfDefUpAfterHit', rate: .10, turns: 1 }, powerText: '盾攻撃性能×1.3', effectText: '攻撃後DEF +10%／1ターン', description: '衝撃を返し、次の攻撃を受け止める構えへ繋ぐ。' },
    magicRepulse: { id: 'magicRepulse', name: 'マジックリパルス', nameEn: 'MAGIC REPULSE', source: 'weapon', type: 'ACTIVE', weaponType: 'shield', prerequisiteSkill: 'guardImpact', mp: 7, kind: 'magical', damageType: 'magical', shieldFormula: 'magicRepulse', target: 'single', power: 1.0, powerText: 'MDEF×1.2＋DEF×0.3', effectText: '魔法防御寄りの盾技', description: '魔力を盾面で反転させ、魔法防御性能から衝撃を生む。' },
    fortress: { id: 'fortress', name: 'フォートレス', nameEn: 'FORTRESS', source: 'weapon', type: 'ACTIVE', weaponType: 'shield', prerequisiteSkill: 'magicRepulse', mp: 8, kind: 'support', target: 'self', effect: { type: 'fortress', reduction: .30, turns: 1 }, powerText: '被ダメージ -30%', effectText: '1ターン防御。軽減後ダメージはRESONANCEへ蓄積', description: '盾を大地へ固定し、攻撃を真正面から受け止める。' },
    revengeForce: { id: 'revengeForce', name: 'リベンジ・フォース', nameEn: 'REVENGE FORCE', source: 'weapon', type: 'ACTIVE', weaponType: 'shield', prerequisiteSkill: 'fortress', mp: 12, kind: 'physical', damageType: 'physical', shieldFormula: 'revenge', target: 'single', power: 1.65, powerText: '直前の被弾タイプに応じDEF/MDEF参照', effectText: '物理被弾ならDEF、魔法被弾ならMDEFを強く参照', description: '直前に受けた攻撃の性質を読み、最適な防御性能で打ち返す盾学奥義。' },
    resonanceBreak: { id: 'resonanceBreak', name: 'RESONANCE BREAK', nameEn: 'RESONANCE BREAK', remixName: 'RESONANCE', source: 'job', jobId: 'guardian', unlockJobLevel: 1, type: 'ACTIVE', kind: 'neutral', damageType: 'neutral', target: 'single', mp: 0, power: 1.0, ignoreDef: 1, unavoidable: true, powerText: '現在武器の攻撃性能×共鳴倍率', effectText: '全RESONANCE消費／DEF・MDEF・物理魔法耐性を無視／必中', description: '受けた痛みを共鳴へ変え、現在の武器性能から無属性の一撃を放つ。RE:MIXではACTION「RESONANCE」として装備中だけ共鳴が有効。' },    preciousSky: { id: 'preciousSky', name: 'プレシャススカイ', nameEn: 'PRECIOUS SKY', source: 'weapon', type: 'ACTIVE', weaponType: 'instrument', prerequisiteSkill: 'resonantNote', requiredWeaponLevel: 8, sparkRate: .035, guitarTreeId: 'versicrellGuitar', requiredWeaponId: 'parentGiftGuitar', mp: 12, kind: 'magical', damageType: 'magical', element: 'sound', target: 'all', power: 1.65, selfHealRate: .08, powerText: 'DEX参照×1.65（敵全体）', effectText: '敵全体へ音属性攻撃／与ダメージ後に最大HPの8%回復', description: '人として残った最初の音を、青空のような音圧へ変える。リコーダー系とは異なるギター専用武器技。' }
  },
  guitarSkillTrees: {
    versicrellGuitar: { id: 'versicrellGuitar', weaponId: 'parentGiftGuitar', name: 'SILVER CIRCLE GUITAR', skills: ['preciousSky', null, null, null] }
  },
  items: {
    potion: { id: 'potion', name: '回復薬', category: 'consumable', rarity: 'common', description: 'HPを30回復する。', effect: { hp: 30 } },
    slimeJelly: { id: 'slimeJelly', name: 'スライムゼリー', category: 'material', rarity: 'common', description: 'シャドウスライムから採れる不思議なゼリー。' },
    // カズが仕入れているカップ麺。GOLDで買えて、所持品からも戦闘中からも使える。
    // 価格は固定。所持金比にすると「金を使い切ってから買う」が最適解になり、
    // 所持0なら0円で買えてしまうため。周回対策は価格ではなく所持上限で行う。
    cupRamenMiso: { id: 'cupRamenMiso', name: 'カップラーメン味噌', nameEn: 'CUP RAMEN MISO', category: 'consumable', rarity: 'common', price: 70, maxStack: 5, purchaseLimit: 5, effect: { hp: 45 }, description: 'カズが箱で仕入れている味噌味。湯を注いで3分、HPが45回復する。' },
    cupRamenShio: { id: 'cupRamenShio', name: 'カップラーメン塩', nameEn: 'CUP RAMEN SHIO', category: 'consumable', rarity: 'common', price: 90, maxStack: 5, purchaseLimit: 5, effect: { mp: 30 }, description: 'あっさり塩味。飲み干すと頭が冴え、MPが30回復する。' },
    manaPotion: { id: 'manaPotion', name: '魔力回復薬', category: 'consumable', rarity: 'common', description: 'MPを20回復する。', effect: { mp: 20 } },
    mageStaff: { id: 'mageStaff', name: '魔導士の杖', category: 'equipment', slot: 'rightHand', rarity: 'common', description: '青い魔力を導く魔導士の基本杖。' },
    phantomSword: { id: 'phantomSword', name: '青影の剣', category: 'equipment', slot: 'rightHand', rarity: 'common', description: '青い残光を引く怪盗の細身剣。' },
    ironClaw: { id: 'ironClaw', name: '鉄の爪', category: 'equipment', slot: 'rightHand', rarity: 'common', description: '拳に装着する鋼の爪。素早い連撃に適する。' },
    guardianAegis: { id: 'guardianAegis', name: '反奏の白盾', nameEn: 'REPRISE AEGIS', category: 'equipment', slot: 'rightHand', rarity: 'rare', stars: 3, description: 'セリペスの砕けた光から再構成された白銀の盾。守護士が右手武器として扱う。' },
    guardianProof: { id: 'guardianProof', name: '守護士の証', nameEn: 'PROOF OF THE GUARDIAN', category: 'key', rarity: 'epic', description: '攻撃を受け、力へ変えて返す者の資格を示す白銀の証。' },
    dualBladeProof: { id: 'dualBladeProof', name: '双刃士の証', nameEn: 'PROOF OF THE DUAL BLADE', category: 'key', rarity: 'epic', description: '左右の刃を舞のように繋ぐ者の資格を示す黒紅の証。' },
    magicKnightProof: { id: 'magicKnightProof', name: '魔奏士の証', nameEn: 'PROOF OF THE ARCANE PLAYER', category: 'key', rarity: 'epic', description: '旋律と魔を繋ぐ古い紋章。新たな生き方を選ぶ資格を示す。' },
    arcaneMaestroProof: { id: 'arcaneMaestroProof', name: '楽奏の証', nameEn: 'PROOF OF THE ARCANE MAESTRO', category: 'key', rarity: 'epic', description: '音と魔を繋ぐ古い譜面。楽器を武器として扱う資格を示す。' },
    rebirthArcana: { id: 'rebirthArcana', name: '輪廻のアルカナ', nameEn: 'ARCANA OF REBIRTH', category: 'special', rarity: 'legendary', noSell: true, description: '極めた力を捨て、さらなる高みへ至るためのアルカナ。JOB Lv20からの転生に1個消費する。' },

    // ══ D1 通常工房装備（24種）══════════════════════════════════
    // JOB専用ではなく「相性の良いシリーズ」。誰でも装備できる。
    kurogane_sword:  { id: 'kurogane_sword',  name: '黒鉄剣クロウ',   nameEn: 'KUROGANE CLAW',     category: 'equipment', slot: 'rightHand', rarity: 'uncommon', description: '黒鉄を鍛え上げた重厚な剣。力任せの一撃に応える。' },
    kurogane_helm:   { id: 'kurogane_helm',   name: '黒鉄の額当て',   nameEn: 'KUROGANE BROW',     category: 'equipment', slot: 'head',      rarity: 'uncommon', description: '額を守る黒鉄の当て金。' },
    kurogane_armor:  { id: 'kurogane_armor',  name: '黒鉄の戦装',     nameEn: 'KUROGANE PLATE',    category: 'equipment', slot: 'body',      rarity: 'uncommon', description: '前線で怪異を受け止めるための重装。' },
    mightGauntlet:   { id: 'mightGauntlet',   name: '剛腕の篭手',     nameEn: 'MIGHT GAUNTLET',    category: 'equipment', slot: 'arms',      rarity: 'uncommon', description: '腕力を底上げする鋼の篭手。' },
    ironKnightBoots: { id: 'ironKnightBoots', name: '鉄騎のブーツ',   nameEn: 'IRON KNIGHT BOOTS', category: 'equipment', slot: 'feet',      rarity: 'uncommon', description: '踏ん張りの利く鉄板入りの靴。' },
    fangOfWill:      { id: 'fangOfWill',      name: '闘志の牙',       nameEn: 'FANG OF WILL',      category: 'equipment', slot: 'accessory', rarity: 'uncommon', description: '噛み締めるほど力が湧く獣の牙。' },
    fangClaw:        { id: 'fangClaw',        name: '鋼爪ファング',   nameEn: 'STEEL FANG',        category: 'equipment', slot: 'rightHand', rarity: 'uncommon', description: '鋭く研がれた鋼の爪。速い連撃に適する。' },
    galeHeadband:    { id: 'galeHeadband',    name: '疾風の鉢巻',     nameEn: 'GALE HEADBAND',     category: 'equipment', slot: 'head',      rarity: 'uncommon', description: '風を切って走るための鉢巻。' },
    fistGi:          { id: 'fistGi',          name: '拳闘の胴衣',     nameEn: 'FIST GI',           category: 'equipment', slot: 'body',      rarity: 'uncommon', description: '動きを妨げない軽い胴衣。' },
    galeTekko:       { id: 'galeTekko',       name: '疾風の手甲',     nameEn: 'GALE TEKKO',        category: 'equipment', slot: 'arms',      rarity: 'uncommon', description: '急所を突く精度を高める手甲。' },
    lightGreaves:    { id: 'lightGreaves',    name: '軽身の脚甲',     nameEn: 'LIGHT GREAVES',     category: 'equipment', slot: 'feet',      rarity: 'uncommon', description: '踏み込みを速くする軽量の脚甲。' },
    tigerFang:       { id: 'tigerFang',       name: '猛虎の牙',       nameEn: 'TIGER FANG',        category: 'equipment', slot: 'accessory', rarity: 'uncommon', description: '急所を見抜く猛虎の牙。' },
    runeFlameStaff:  { id: 'runeFlameStaff',  name: '緋炎杖ルーン',   nameEn: 'RUNE FLAME STAFF',  category: 'equipment', slot: 'rightHand', rarity: 'uncommon', description: '緋色の炎を宿す魔導の杖。' },
    arcaneHood:      { id: 'arcaneHood',      name: '魔導のフード',   nameEn: 'ARCANE HOOD',       category: 'equipment', slot: 'head',      rarity: 'uncommon', description: '魔力の流れを整えるフード。' },
    wisdomRobe:      { id: 'wisdomRobe',      name: '叡智のローブ',   nameEn: 'WISDOM ROBE',       category: 'equipment', slot: 'body',      rarity: 'uncommon', description: '術者の思考を澄ませるローブ。' },
    arcaneBangle:    { id: 'arcaneBangle',    name: '魔導の腕輪',     nameEn: 'ARCANE BANGLE',     category: 'equipment', slot: 'arms',      rarity: 'uncommon', description: '詠唱を支える魔力の腕輪。' },
    stargazeShoes:   { id: 'stargazeShoes',   name: '星詠みの靴',     nameEn: 'STARGAZE SHOES',    category: 'equipment', slot: 'feet',      rarity: 'uncommon', description: '星の巡りを踏むように歩く靴。' },
    rubyMagicStone:  { id: 'rubyMagicStone',  name: '紅玉の魔石',     nameEn: 'RUBY MAGIC STONE',  category: 'equipment', slot: 'accessory', rarity: 'uncommon', description: '炎の魔力を増幅する紅い魔石。' },
    celesStaff:      { id: 'celesStaff',      name: '聖杖セレス',     nameEn: 'CELES STAFF',       category: 'equipment', slot: 'rightHand', rarity: 'uncommon', description: '祈りを束ねる白木の杖。' },
    prayerHat:       { id: 'prayerHat',       name: '白祈の帽子',     nameEn: 'PRAYER HAT',        category: 'equipment', slot: 'head',      rarity: 'uncommon', description: '祈りを絶やさぬ白い帽子。' },
    prayerVestment:  { id: 'prayerVestment',  name: '祈祷の法衣',     nameEn: 'PRAYER VESTMENT',   category: 'equipment', slot: 'body',      rarity: 'uncommon', description: '身を守り、心を鎮める法衣。' },
    healingBangle:   { id: 'healingBangle',   name: '癒しの腕輪',     nameEn: 'HEALING BANGLE',    category: 'equipment', slot: 'arms',      rarity: 'uncommon', description: '癒やしの術を増幅する腕輪。' },
    pilgrimShoes:    { id: 'pilgrimShoes',    name: '巡礼の靴',       nameEn: 'PILGRIM SHOES',     category: 'equipment', slot: 'feet',      rarity: 'uncommon', description: '長い巡礼にも耐える丈夫な靴。' },
    silverCharm:     { id: 'silverCharm',     name: '聖銀の護符',     nameEn: 'SILVER CHARM',      category: 'equipment', slot: 'accessory', rarity: 'uncommon', description: '聖銀で編まれた癒やしの護符。' },

    // ══ D2 通常工房装備（24種）══════════════════════════════════
    fenrirSword:     { id: 'fenrirSword',     name: '黒狼剣フェンリル', nameEn: 'FENRIR BLADE',    category: 'equipment', slot: 'rightHand', rarity: 'rare', description: '黒狼の牙を鍛え込んだ大剣。' },
    blackWolfHelm:   { id: 'blackWolfHelm',   name: '黒狼の兜',       nameEn: 'BLACK WOLF HELM',   category: 'equipment', slot: 'head',      rarity: 'rare', description: '狼の意匠を刻んだ重厚な兜。' },
    blackWolfArmor:  { id: 'blackWolfArmor',  name: '黒狼の重装',     nameEn: 'BLACK WOLF PLATE',  category: 'equipment', slot: 'body',      rarity: 'rare', description: '静寂の楽殿を歩くための重装甲。' },
    crushGauntlet:   { id: 'crushGauntlet',   name: '破砕の篭手',     nameEn: 'CRUSH GAUNTLET',    category: 'equipment', slot: 'arms',      rarity: 'rare', description: '打撃を砕く力を宿す篭手。' },
    kuroganeBoots:   { id: 'kuroganeBoots',   name: '黒鉄の軍靴',     nameEn: 'KUROGANE WARBOOTS', category: 'equipment', slot: 'feet',      rarity: 'rare', description: '揺るがぬ足場を作る軍靴。' },
    warDemonFang:    { id: 'warDemonFang',    name: '戦鬼の牙',       nameEn: 'WAR DEMON FANG',    category: 'equipment', slot: 'accessory', rarity: 'rare', description: '戦いの鬼が遺した牙。' },
    yashaClaw:       { id: 'yashaClaw',       name: '夜叉爪アギト',   nameEn: 'YASHA CLAW',        category: 'equipment', slot: 'rightHand', rarity: 'rare', description: '夜叉の名を持つ漆黒の爪。' },
    yashaHeadband:   { id: 'yashaHeadband',   name: '夜叉の鉢巻',     nameEn: 'YASHA HEADBAND',    category: 'equipment', slot: 'head',      rarity: 'rare', description: '闘志を研ぎ澄ます黒の鉢巻。' },
    shadowGi:        { id: 'shadowGi',        name: '黒影の闘衣',     nameEn: 'SHADOW GI',         category: 'equipment', slot: 'body',      rarity: 'rare', description: '影に紛れる薄い闘衣。' },
    rasetsuTekko:    { id: 'rasetsuTekko',    name: '羅刹の手甲',     nameEn: 'RASETSU TEKKO',     category: 'equipment', slot: 'arms',      rarity: 'rare', description: '急所を抉る羅刹の手甲。' },
    flashGreaves:    { id: 'flashGreaves',    name: '瞬脚の具足',     nameEn: 'FLASH GREAVES',     category: 'equipment', slot: 'feet',      rarity: 'rare', description: '瞬きの間に間合いを詰める具足。' },
    shuraMagatama:   { id: 'shuraMagatama',   name: '修羅の勾玉',     nameEn: 'SHURA MAGATAMA',    category: 'equipment', slot: 'accessory', rarity: 'rare', description: '修羅の血が滲む勾玉。' },
    ignisStaff:      { id: 'ignisStaff',      name: '獄炎杖イグニス',  nameEn: 'IGNIS STAFF',      category: 'equipment', slot: 'rightHand', rarity: 'rare', description: '獄炎を封じた深紅の杖。' },
    crimsonHat:      { id: 'crimsonHat',      name: '深紅の魔導帽',   nameEn: 'CRIMSON HAT',       category: 'equipment', slot: 'head',      rarity: 'rare', description: '炎の魔力を束ねる深紅の帽子。' },
    purgatoryRobe:   { id: 'purgatoryRobe',   name: '煉獄のローブ',   nameEn: 'PURGATORY ROBE',    category: 'equipment', slot: 'body',      rarity: 'rare', description: '煉獄の熱を纏うローブ。' },
    blazeBangle:     { id: 'blazeBangle',     name: '灼熱の腕輪',     nameEn: 'BLAZE BANGLE',      category: 'equipment', slot: 'arms',      rarity: 'rare', description: '炎を握り込む灼熱の腕輪。' },
    starfireShoes:   { id: 'starfireShoes',   name: '星火の魔導靴',   nameEn: 'STARFIRE SHOES',    category: 'equipment', slot: 'feet',      rarity: 'rare', description: '星の火を踏んで進む魔導靴。' },
    infernoStone:    { id: 'infernoStone',    name: '獄炎の魔石',     nameEn: 'INFERNO STONE',     category: 'equipment', slot: 'accessory', rarity: 'rare', description: '獄炎の芯を宿した魔石。' },
    luminaStaff:     { id: 'luminaStaff',     name: '月白杖ルミナ',   nameEn: 'LUMINA STAFF',      category: 'equipment', slot: 'rightHand', rarity: 'rare', description: '月光を束ねた白銀の杖。' },
    classroomRecorder: { id: 'classroomRecorder', name: '教室のリコーダー', nameEn: 'CLASSROOM RECORDER', category: 'equipment', slot: 'rightHand', rarity: 'uncommon', description: 'どこの教室にもある、あのリコーダー。魔奏士が吹けば音が刃に変わる。器用さがそのまま威力になる。' },
    silentRecorder:    { id: 'silentRecorder',    name: '静寂のリコーダー', nameEn: 'SILENT RECORDER',    category: 'equipment', slot: 'rightHand', rarity: 'rare',      description: '沈黙の楽殿で拾った音の出ないリコーダー。吹くと聴こえない旋律が敵を裂く。' },
    moonCrown:       { id: 'moonCrown',       name: '月白の聖冠',     nameEn: 'MOON CROWN',        category: 'equipment', slot: 'head',      rarity: 'rare', description: '月の加護を宿す聖冠。' },
    moonVestment:    { id: 'moonVestment',    name: '月祈の法衣',     nameEn: 'MOON VESTMENT',     category: 'equipment', slot: 'body',      rarity: 'rare', description: '月へ祈りを捧げる法衣。' },
    mercyBangle:     { id: 'mercyBangle',     name: '慈愛の腕輪',     nameEn: 'MERCY BANGLE',      category: 'equipment', slot: 'arms',      rarity: 'rare', description: '慈しみの力を増幅する腕輪。' },
    sacredShoes:     { id: 'sacredShoes',     name: '聖巡の靴',       nameEn: 'SACRED SHOES',      category: 'equipment', slot: 'feet',      rarity: 'rare', description: '聖地を巡るための靴。' },
    moonlightCharm:  { id: 'moonlightCharm',  name: '月光の護符',     nameEn: 'MOONLIGHT CHARM',   category: 'equipment', slot: 'accessory', rarity: 'rare', description: '月光を編み込んだ護符。' },
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
    fortressStone: { id: 'fortressStone', name: '城塞核石', nameEn: 'FORTRESS CORE STONE', category: 'material', rarity: 'rare', dungeonId: 'dungeon3', description: '侵蝕城塞のゴーレムから剥がれた圧縮核。重装・盾・剣の製作に使う。' },
    riftClaw: { id: 'riftClaw', name: '裂界爪', nameEn: 'RIFT CLAW', category: 'material', rarity: 'rare', dungeonId: 'dungeon3', description: '空間を裂く怪異の爪。拳・双刃系の高速武器に適する。' },
    voidSilk: { id: 'voidSilk', name: '虚紡糸', nameEn: 'VOID SILK', category: 'material', rarity: 'rare', dungeonId: 'dungeon3', description: '虚空の魔力を織り込んだ糸。魔導・神聖装備の魔力導線になる。' },
    sanctumGear: { id: 'sanctumGear', name: '聖堂歯車', nameEn: 'SANCTUM GEAR', category: 'material', rarity: 'rare', dungeonId: 'dungeon3', description: '崩壊した礼拝堂の自動奏機から採れる歯車。楽器と精密装備の中核素材。' },
    astralMercury: { id: 'astralMercury', name: '星銀水', nameEn: 'ASTRAL MERCURY', category: 'material', rarity: 'epic', dungeonId: 'dungeon3', description: 'メロクスが残す液体金属。極端に軽く、硬い。' },
    gildedCore: { id: 'gildedCore', name: '強欲の金核', nameEn: 'GILDED CORE', category: 'material', rarity: 'epic', dungeonId: 'dungeon3', description: '財貨を食らう怪異の黄金核。高級装備の触媒になる。' },
    parentGiftGuitar: { id: 'parentGiftGuitar', name: '《親に買ってもらったギター》', nameEn: 'A GUITAR FROM MY PARENTS', category: 'equipment', slot: 'rightHand', rarity: 'epic', stars: 4, dungeonId: 'dungeon3', guitarSkillTree: 'versicrellGuitar', description: '昔、親に買ってもらったギター。少し変わった形をしているが、最初に触れた「音」は今でも重い。' },
    voidHelm: { id: 'voidHelm', name: '虚空の兜', nameEn: 'VOID HELM', category: 'equipment', slot: 'head', rarity: 'epic', dungeonId: 'dungeon3', description: '崩界の深廊の素材で鍛えた兜。精神と防御を高める。' },
    abyssalArmor: { id: 'abyssalArmor', name: '深淵の鎧', nameEn: 'ABYSSAL ARMOR', category: 'equipment', slot: 'body', rarity: 'epic', dungeonId: 'dungeon3', description: '深淵鉄鉱を用いた最高位の鎧。強靭な防御力を誇る。' },
    phantomGauntlet: { id: 'phantomGauntlet', name: '幻影拳甲', nameEn: 'PHANTOM GAUNTLET', category: 'equipment', slot: 'arms', rarity: 'epic', dungeonId: 'dungeon3', description: '幻影核の力が宿る拳甲。攻撃力と俊敏を高める。' },
    voidRing: { id: 'voidRing', name: '虚無の指輪', nameEn: 'VOID RING', category: 'equipment', slot: 'accessory', rarity: 'epic', dungeonId: 'dungeon3', description: '虚無の精髄を封じ、攻防とHP・MPを補う指輪。' },
    voidBlade: { id: 'voidBlade', name: '虚空の剣', nameEn: 'VOID BLADE', category: 'equipment', slot: 'rightHand', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', description: '裂界の虚無を刃へ定着させたD3工房剣。' },
    chaosRod: { id: 'chaosRod', name: '混沌の杖', nameEn: 'CHAOS ROD', category: 'equipment', slot: 'rightHand', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', description: '混沌の粉塵を魔力へ変換するD3工房杖。' },
    d3WarriorBlade: { id: 'd3WarriorBlade', name: '城塞鉄の剣', nameEn: 'FORTRESS IRON SWORD', category: 'equipment', slot: 'rightHand', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', recommendedJobs: ['warrior'], description: '侵城ゴーレムの城塞核石を深淵鉄で挟んだ、重く堅実な剣。' },
    d3MageStaff: { id: 'd3MageStaff', name: '虚紡の杖', nameEn: 'VOIDWEAVE STAFF', category: 'equipment', slot: 'rightHand', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', recommendedJobs: ['mage'], description: '白晶の監視機から採れた虚紡糸を芯へ巻いた魔導杖。' },
    d3PriestStaff: { id: 'd3PriestStaff', name: '聖堂歯車の杖', nameEn: 'SANCTUM GEAR STAFF', category: 'equipment', slot: 'rightHand', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', recommendedJobs: ['priest'], description: '虚無錬成師の聖堂歯車を組み込み、祈りを安定させる杖。' },
    d3MartialClaw: { id: 'd3MartialClaw', name: '裂界の爪', nameEn: 'RIFT CLAW', category: 'equipment', slot: 'rightHand', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', recommendedJobs: ['martialArtist'], description: '鎖葬の刈手が落とす裂界爪を研いだ、軽量の戦爪。' },
    d3MaestroInstrument: { id: 'd3MaestroInstrument', name: '星銀の弦琴', nameEn: 'ASTRAL STRINGER', category: 'equipment', slot: 'rightHand', rarity: 'epic', stars: 4, dungeonId: 'dungeon3', recommendedJobs: ['magicKnight'], description: 'メロクスの星銀水と聖堂歯車で調律した、工房製の弦楽器。' },
    d3TwinRight: { id: 'd3TwinRight', name: '裂界の双刃・右', nameEn: 'RIFT TWIN RIGHT', category: 'equipment', slot: 'rightHand', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', recommendedJobs: ['dualBlade'], description: '裂界爪を細身の刃へ鍛えた右手用の双刃。' },
    d3TwinLeft: { id: 'd3TwinLeft', name: '裂界の双刃・左', nameEn: 'RIFT TWIN LEFT', category: 'equipment', slot: 'rightHand', offHandOnly: true, rarity: 'rare', stars: 3, dungeonId: 'dungeon3', recommendedJobs: ['dualBlade'], description: '右手用と重さを合わせた、左手専用の双刃。' },
    d3GuardianAegis: { id: 'd3GuardianAegis', name: '城塞核の盾', nameEn: 'FORTRESS CORE SHIELD', category: 'equipment', slot: 'rightHand', rarity: 'epic', stars: 4, dungeonId: 'dungeon3', recommendedJobs: ['guardian'], description: '城塞核石を強欲の金核で圧着した、守護士向けの大型盾。' },
    fortressHelm: { id: 'fortressHelm', name: '城塞の兜', category: 'equipment', slot: 'head', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'heavy', recommendedJobs: ['warrior', 'guardian'], description: '侵城ゴーレムの核石を額へ重ねた兜。' },
    fortressCoat: { id: 'fortressCoat', name: '城塞の外套', category: 'equipment', slot: 'body', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'heavy', recommendedJobs: ['warrior', 'guardian'], description: '城塞核石の小片を深淵鉄の布へ縫い込んだ外套。' },
    fortressGloves: { id: 'fortressGloves', name: '城塞の手甲', category: 'equipment', slot: 'arms', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'heavy', recommendedJobs: ['warrior', 'guardian'], description: '重い武器と盾を支えるための核石入り手甲。' },
    fortressBoots: { id: 'fortressBoots', name: '城塞の脚甲', category: 'equipment', slot: 'feet', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'heavy', recommendedJobs: ['warrior', 'guardian'], description: '侵城ゴーレムの外殻を再利用した脚甲。' },
    fortressCharm: { id: 'fortressCharm', name: '核石のお守り', category: 'equipment', slot: 'accessory', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'heavy', recommendedJobs: ['warrior', 'guardian'], description: '小さな城塞核石を金具へ収めた防護のお守り。' },
    voidweaveHood: { id: 'voidweaveHood', name: '虚紡の帽子', category: 'equipment', slot: 'head', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'caster', recommendedJobs: ['mage', 'priest', 'magicKnight'], description: '白晶の監視機が残す虚紡糸で編んだ帽子。' },
    voidweaveRobe: { id: 'voidweaveRobe', name: '虚紡のローブ', category: 'equipment', slot: 'body', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'caster', recommendedJobs: ['mage', 'priest', 'magicKnight'], description: '虚紡糸を重ね、魔力を通しやすくしたローブ。' },
    voidweaveGloves: { id: 'voidweaveGloves', name: '虚紡の手袋', category: 'equipment', slot: 'arms', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'caster', recommendedJobs: ['mage', 'priest', 'magicKnight'], description: '聖堂歯車の細片を指先へ縫い込んだ手袋。' },
    voidweaveBoots: { id: 'voidweaveBoots', name: '虚紡の靴', category: 'equipment', slot: 'feet', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'caster', recommendedJobs: ['mage', 'priest', 'magicKnight'], description: '虚紡糸の魔力回路で術者の足元を守る靴。' },
    voidweaveCharm: { id: 'voidweaveCharm', name: '聖堂歯車の護符', category: 'equipment', slot: 'accessory', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'caster', recommendedJobs: ['mage', 'priest', 'magicKnight'], description: '虚無錬成師の歯車を虚紡糸で留めた術式護符。' },
    riftBand: { id: 'riftBand', name: '裂界の鉢巻', category: 'equipment', slot: 'head', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'striker', recommendedJobs: ['martialArtist', 'dualBlade'], description: '裂界爪の粉を染み込ませた丈夫な鉢巻。' },
    riftVest: { id: 'riftVest', name: '裂界の胴着', category: 'equipment', slot: 'body', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'striker', recommendedJobs: ['martialArtist', 'dualBlade'], description: '裂界爪の繊維と虚空片を編んだ軽い胴着。' },
    riftGuards: { id: 'riftGuards', name: '裂界の手甲', category: 'equipment', slot: 'arms', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'striker', recommendedJobs: ['martialArtist', 'dualBlade'], description: '鎖葬の刈手の爪を手の甲へ沿わせた防具。' },
    riftBoots: { id: 'riftBoots', name: '裂界の脚甲', category: 'equipment', slot: 'feet', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'striker', recommendedJobs: ['martialArtist', 'dualBlade'], description: '虚空片を薄く重ね、踏み込みを妨げない脚甲。' },
    riftCharm: { id: 'riftCharm', name: '裂爪のお守り', category: 'equipment', slot: 'accessory', rarity: 'rare', stars: 3, dungeonId: 'dungeon3', buildType: 'striker', recommendedJobs: ['martialArtist', 'dualBlade'], description: '小さな裂界爪と幻影核を結んだ攻撃用のお守り。' },
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
    // 武道家が素手のときだけ使う仮想武器。装備欄・所持品には出さない（D.items に載せない）。
    bareFist: { id: 'bareFist', name: '拳', nameEn: 'BARE FIST', weaponType: 'martial', weaponSprite: null, battleSprite: null, attackMotion: 'slash', damageStat: 'str', power: 1, bonuses: {}, virtual: true },
    mageStaff: { id: 'mageStaff', name: '魔導士の杖', weaponType: 'staff', weaponSprite: 'staff_01', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', magicAttackPower: 4, bonuses: {} },
    shadowWand: { id: 'shadowWand', name: 'シャドウワンド', weaponType: 'staff', weaponSprite: 'staff_shadow', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 2.45, bonuses: { mag: 4, mnd: 1 } },
    phantomSword: { id: 'phantomSword', name: '青影の剣', weaponType: 'sword', weaponSprite: 'sword_01', battleSprite: null, attackMotion: 'slash', attackPower: 5, bonuses: {} },
    ironClaw: { id: 'ironClaw', name: '鉄の爪', weaponType: 'martial', weaponSprite: 'claw_01', battleSprite: null, attackMotion: 'slash', attackPower: 4, bonuses: { agi: 2 } },
    guardianAegis: { id: 'guardianAegis', name: '反奏の白盾', weaponType: 'shield', weaponSprite: 'shield_reprise', battleSprite: null, attackMotion: 'shieldBash', damageType: 'physical', defensePower: 18, magicDefensePower: 15, bonuses: {} },
    // ── D1 通常工房武器 ──
    kurogane_sword: { id: 'kurogane_sword', name: '黒鉄剣クロウ', weaponType: 'sword', weaponSprite: 'sword_01', battleSprite: null, attackMotion: 'slash', attackPower: 10, bonuses: {} },
    fangClaw: { id: 'fangClaw', name: '鋼爪ファング', weaponType: 'martial', weaponSprite: 'claw_01', battleSprite: null, attackMotion: 'slash', attackPower: 8, bonuses: { agi: 2 }, effects: { criticalRateBonus: 0.02 } },
    runeFlameStaff: { id: 'runeFlameStaff', name: '緋炎杖ルーン', weaponType: 'staff', weaponSprite: 'staff_flame', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', magicAttackPower: 10, bonuses: { maxMp: 5 } },
    celesStaff: { id: 'celesStaff', name: '聖杖セレス', weaponType: 'staff', weaponSprite: 'staff_01', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', magicAttackPower: 6, magicDefensePower: 4, bonuses: {}, effects: { healingPowerPercent: 0.05 } },
    // ── D2 通常工房武器 ──
    fenrirSword: { id: 'fenrirSword', name: '黒狼剣フェンリル', weaponType: 'sword', weaponSprite: 'sword_01', battleSprite: null, attackMotion: 'slash', attackPower: 20, bonuses: {} },
    yashaClaw: { id: 'yashaClaw', name: '夜叉爪アギト', weaponType: 'martial', weaponSprite: 'claw_01', battleSprite: null, attackMotion: 'slash', attackPower: 17, bonuses: { agi: 3 }, effects: { criticalRateBonus: 0.03 } },
    ignisStaff: { id: 'ignisStaff', name: '獄炎杖イグニス', weaponType: 'staff', weaponSprite: 'staff_flame', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', magicAttackPower: 20, bonuses: { maxMp: 10 } },
    luminaStaff: { id: 'luminaStaff', name: '月白杖ルミナ', weaponType: 'staff', weaponSprite: 'staff_sun', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', magicAttackPower: 12, magicDefensePower: 8, bonuses: { maxMp: 8 }, effects: { healingPowerPercent: 0.07 } },
    // ── 楽器（魔奏士）──
    // ダメージは器用さ（dex）を参照する。weaponScaling.instrument を見ること。
    // 楽奏の証と一緒に配られる最初の楽器。これが無いと武器学《楽器》を使えない。
    classroomRecorder: { id: 'classroomRecorder', name: '教室のリコーダー', weaponType: 'instrument', battlePose: 'recorder', weaponSprite: 'staff_01', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', magicAttackPower: 10, bonuses: { dex: 3 } },
    silentRecorder:    { id: 'silentRecorder',    name: '静寂のリコーダー', weaponType: 'instrument', battlePose: 'recorder', weaponSprite: 'staff_sun', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', magicAttackPower: 20, magicDefensePower: 6, bonuses: { dex: 6 }, effects: { criticalRateBonus: 0.03 } },
    flameStaff: { id: 'flameStaff', name: 'フレイムスタッフ', weaponType: 'staff', weaponSprite: 'staff_flame', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 2.6, bonuses: { mag: 6 }, grantsSkillId: 'flame' },
    wizardRod: { id: 'wizardRod', name: 'ウィザードロッド', weaponType: 'staff', weaponSprite: 'staff_wizard', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 2.9, bonuses: { mag: 9 }, grantsSkillId: 'fireball' },
    sunStaff: { id: 'sunStaff', name: '太陽の杖', weaponType: 'staff', weaponSprite: 'staff_sun', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 3.2, bonuses: { mag: 14 } },
    cadenza_staff: { id: 'cadenza_staff', name: '魔杖カデンツァ', seriesId: 'zenacad', weaponType: 'staff', weaponSprite: 'staff_cadenza', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', damageStat: 'mag', power: 3.05, bonuses: { mag: 11, maxMp: 8 } },
    lunaEdge: { id: 'lunaEdge', name: '月影剣ルナエッジ', dungeonId: 'dungeon2', weaponType: 'sword', weaponSprite: 'sword_luna', battleSprite: null, attackMotion: 'slash', damageStat: 'str', power: 2.8, bonuses: { str: 14, dex: 4, critBonus: 0.05 } },
    voidBlade: { id: 'voidBlade', name: '虚空の剣', nameEn: 'VOID BLADE', dungeonId: 'dungeon3', weaponType: 'sword', weaponSprite: 'sword_void', battleSprite: null, attackMotion: 'slash', attackPower: 28, bonuses: {}, effects: { criticalRateBonus: .04 } },
    chaosRod: { id: 'chaosRod', name: '混沌の杖', nameEn: 'CHAOS ROD', dungeonId: 'dungeon3', weaponType: 'staff', weaponSprite: 'staff_chaos', battleSprite: 'assets/weapons/staff/mage-staff-01.png', attackMotion: 'staffCast', magicAttackPower: 30, bonuses: { maxMp: 10 }, effects: { magicDamagePercent: .03 } },
    d3WarriorBlade: { id: 'd3WarriorBlade', name: '城塞鉄の剣', weaponType: 'sword', weaponSprite: 'sword_void', battleSprite: null, attackMotion: 'slash', attackPower: 32, bonuses: {}, effects: { physicalDamagePercent: .06 } },
    d3MageStaff: { id: 'd3MageStaff', name: '虚紡の杖', weaponType: 'staff', weaponSprite: 'staff_chaos', battleSprite: null, attackMotion: 'staffCast', magicAttackPower: 34, bonuses: {}, effects: { magicDamagePercent: .05 } },
    d3PriestStaff: { id: 'd3PriestStaff', name: '聖堂歯車の杖', weaponType: 'staff', weaponSprite: 'staff_sun', battleSprite: null, attackMotion: 'staffCast', magicAttackPower: 25, magicDefensePower: 14, bonuses: {}, effects: { healingPowerPercent: .15 } },
    d3MartialClaw: { id: 'd3MartialClaw', name: '裂界の爪', weaponType: 'martial', weaponSprite: 'claw_01', battleSprite: null, attackMotion: 'slash', attackPower: 24, bonuses: {}, effects: { criticalRateBonus: .02 } },
    d3MaestroInstrument: { id: 'd3MaestroInstrument', name: '星銀の弦琴', weaponType: 'instrument', battlePose: 'guitar', weaponSprite: 'guitar_versicrell', battleSprite: null, attackMotion: 'soundCast', magicAttackPower: 36, bonuses: {}, effects: { criticalRateBonus: .03, magicDamagePercent: .03 } },
    d3TwinRight: { id: 'd3TwinRight', name: '裂界の双刃・右', weaponType: 'martial', weaponSubtype: 'dualBlade', weaponSprite: 'sword_void', battleSprite: null, attackMotion: 'slash', attackPower: 22, bonuses: {}, effects: { criticalRateBonus: .02 } },
    d3TwinLeft: { id: 'd3TwinLeft', name: '裂界の双刃・左', weaponType: 'martial', weaponSubtype: 'dualBlade', offHandOnly: true, weaponSprite: 'sword_void', battleSprite: null, attackMotion: 'slash', attackPower: 18, bonuses: {}, effects: { criticalRateBonus: .01 } },
    d3GuardianAegis: { id: 'd3GuardianAegis', name: '城塞核の盾', weaponType: 'shield', weaponSprite: 'shield_reprise', battleSprite: null, attackMotion: 'shieldBash', damageType: 'physical', defensePower: 42, magicDefensePower: 38, bonuses: {}, effects: { magicDamageReductionPercent: .08, physicalDamageReductionPercent: .06, resonanceGainPercent: .25 } },
    parentGiftGuitar: { id: 'parentGiftGuitar', name: '《親に買ってもらったギター》', nameEn: 'A GUITAR FROM MY PARENTS', dungeonId: 'dungeon3', weaponType: 'instrument', battlePose: 'guitar', weaponSprite: 'guitar_versicrell', battleSprite: null, attackMotion: 'soundCast', damageStat: 'dex', power: 4.0, guitarSkillTree: 'versicrellGuitar', bonuses: { dex: 10, mag: 5, critBonus: 0.04 } },
    myrthi_blade: { id: 'myrthi_blade', name: '黒紅刃ミルティア', nameEn: 'MYRTHI BLADE', seriesId: 'myrthi', dungeonId: 'dungeon2', weaponType: 'martial', weaponSubtype: 'dualBlade', weaponSprite: 'sword_myrthi', battleSprite: null, attackMotion: 'slash', attackPower: 32, bonuses: { str: 16, agi: 8, critBonus: .06 } }
  },
  accessories: {
    slimeRing: { id: 'slimeRing', name: 'スライムリング', bonuses: { vit: 2, luk: 2 } },
    // ══ D1 / D2 通常工房アクセサリ ══
    fangOfWill:     { id: 'fangOfWill',     name: '闘志の牙',   bonuses: {}, effects: { physicalDamagePercent: 0.03 } },
    tigerFang:      { id: 'tigerFang',      name: '猛虎の牙',   bonuses: {}, effects: { criticalRateBonus: 0.03 } },
    rubyMagicStone: { id: 'rubyMagicStone', name: '紅玉の魔石', bonuses: {}, effects: { fireDamagePercent: 0.05 } },
    silverCharm:    { id: 'silverCharm',    name: '聖銀の護符', bonuses: {}, effects: { healingPowerPercent: 0.05 } },
    warDemonFang:   { id: 'warDemonFang',   name: '戦鬼の牙',   bonuses: {}, effects: { physicalDamagePercent: 0.06 } },
    shuraMagatama:  { id: 'shuraMagatama',  name: '修羅の勾玉', bonuses: {}, effects: { criticalRateBonus: 0.05 } },
    infernoStone:   { id: 'infernoStone',   name: '獄炎の魔石', bonuses: {}, effects: { fireDamagePercent: 0.08 } },
    moonlightCharm: { id: 'moonlightCharm', name: '月光の護符', bonuses: {}, effects: { healingPowerPercent: 0.08, magicDamageReductionPercent: 0.03 } },
    silverRing: { id: 'silverRing', name: '銀の指輪', bonuses: { luk: 3, maxHp: 6 } },
    manaStone: { id: 'manaStone', name: 'マナストーン', bonuses: { maxMp: 8, mag: 1 } },
    shadowAmulet: { id: 'shadowAmulet', name: '影の護符', bonuses: { mnd: 4, luk: 2 } },
    phantomBadge: { id: 'phantomBadge', name: '怪盗バッジ', bonuses: { str: 1, mag: 1, agi: 2, luk: 1 } },
    goblinEarring: { id: 'goblinEarring', name: 'ゴブリンの耳飾り', bonuses: { agi: 2, luk: 2 } },
    cursedNecklace: { id: 'cursedNecklace', name: '呪われた首飾り', bonuses: { mag: 3, luk: -1 } },
    maestri_baton: { id: 'maestri_baton', name: '七奏のタクト', seriesId: 'zenacad', bonuses: { mag: 4, maxMp: 12 } },
    echoPendant: { id: 'echoPendant', name: '残響のペンダント', dungeonId: 'dungeon2', bonuses: { maxMp: 16, mag: 5 } },
    voidRing: { id: 'voidRing', name: '虚無の指輪', dungeonId: 'dungeon3', attackPower: 4, magicAttackPower: 4, defensePower: 4, magicDefensePower: 4, bonuses: { maxHp: 20, maxMp: 15 } },
    fortressCharm: { id: 'fortressCharm', name: '核石のお守り', dungeonId: 'dungeon3', defensePower: 5, magicDefensePower: 5, bonuses: { maxHp: 10 }, effects: { physicalDamageReductionPercent: .02 } },
    voidweaveCharm: { id: 'voidweaveCharm', name: '聖堂歯車の護符', dungeonId: 'dungeon3', magicAttackPower: 5, magicDefensePower: 5, bonuses: { maxMp: 8 }, effects: { magicDamagePercent: .03, healingPowerPercent: .05 } },
    riftCharm: { id: 'riftCharm', name: '裂爪のお守り', dungeonId: 'dungeon3', attackPower: 4, bonuses: {}, effects: { criticalRateBonus: .02 } },
    myrthi_metro: { id: 'myrthi_metro', name: '第二奏のメトロノーム', seriesId: 'myrthi', bonuses: { agi: 6, critBonus: .05 } }
  },
  armors: {
    roughHood: { id: 'roughHood', name: '粗削りフード', slot: 'head', bonuses: { vit: 2 } },
    // ══ D1 通常工房防具（effects は装備特殊効果。加算で累積する）══
    kurogane_helm:   { id: 'kurogane_helm',   name: '黒鉄の額当て', slot: 'head', defensePower: 6, bonuses: {} },
    kurogane_armor:  { id: 'kurogane_armor',  name: '黒鉄の戦装',   slot: 'body', defensePower: 12, bonuses: { maxHp: 15 } },
    mightGauntlet:   { id: 'mightGauntlet',   name: '剛腕の篭手',   slot: 'arms', attackPower: 4, defensePower: 2, bonuses: {} },
    ironKnightBoots: { id: 'ironKnightBoots', name: '鉄騎のブーツ', slot: 'feet', defensePower: 5, bonuses: { maxHp: 8 } },
    galeHeadband:    { id: 'galeHeadband',    name: '疾風の鉢巻',   slot: 'head', defensePower: 2, bonuses: { agi: 3, luk: 2 } },
    fistGi:          { id: 'fistGi',          name: '拳闘の胴衣',   slot: 'body', defensePower: 7, bonuses: { agi: 2 } },
    galeTekko:       { id: 'galeTekko',       name: '疾風の手甲',   slot: 'arms', attackPower: 2, defensePower: 2, bonuses: {}, effects: { criticalRateBonus: 0.02 } },
    lightGreaves:    { id: 'lightGreaves',    name: '軽身の脚甲',   slot: 'feet', defensePower: 2, bonuses: { agi: 4 } },
    arcaneHood:      { id: 'arcaneHood',      name: '魔導のフード', slot: 'head', magicAttackPower: 4, magicDefensePower: 3, bonuses: { maxMp: 4 } },
    wisdomRobe:      { id: 'wisdomRobe',      name: '叡智のローブ', slot: 'body', defensePower: 3, magicAttackPower: 5, magicDefensePower: 6, bonuses: {} },
    arcaneBangle:    { id: 'arcaneBangle',    name: '魔導の腕輪',   slot: 'arms', magicAttackPower: 4, bonuses: {} },
    stargazeShoes:   { id: 'stargazeShoes',   name: '星詠みの靴',   slot: 'feet', magicDefensePower: 2, bonuses: { agi: 2, maxMp: 3 } },
    prayerHat:       { id: 'prayerHat',       name: '白祈の帽子',   slot: 'head', magicDefensePower: 5, bonuses: { maxMp: 3 } },
    prayerVestment:  { id: 'prayerVestment',  name: '祈祷の法衣',   slot: 'body', defensePower: 5, magicDefensePower: 8, bonuses: { maxHp: 8 } },
    healingBangle:   { id: 'healingBangle',   name: '癒しの腕輪',   slot: 'arms', magicDefensePower: 3, bonuses: {}, effects: { healingPowerPercent: 0.05 } },
    pilgrimShoes:    { id: 'pilgrimShoes',    name: '巡礼の靴',     slot: 'feet', defensePower: 2, magicDefensePower: 3, bonuses: {} },
    // ══ D2 通常工房防具 ══
    blackWolfHelm:   { id: 'blackWolfHelm',   name: '黒狼の兜',     slot: 'head', attackPower: 6, defensePower: 11, bonuses: { vit: 2 } },
    blackWolfArmor:  { id: 'blackWolfArmor',  name: '黒狼の重装',   slot: 'body', attackPower: 11, defensePower: 22, bonuses: { maxHp: 30, vit: 3 } },
    crushGauntlet:   { id: 'crushGauntlet',   name: '破砕の篭手',   slot: 'arms', attackPower: 7, defensePower: 3, bonuses: {}, effects: { physicalDamagePercent: 0.02 } },
    kuroganeBoots:   { id: 'kuroganeBoots',   name: '黒鉄の軍靴',   slot: 'feet', defensePower: 8, bonuses: { vit: 3 } },
    yashaHeadband:   { id: 'yashaHeadband',   name: '夜叉の鉢巻',   slot: 'head', attackPower: 6, defensePower: 4, bonuses: { agi: 4, luk: 3 } },
    shadowGi:        { id: 'shadowGi',        name: '黒影の闘衣',   slot: 'body', attackPower: 12, defensePower: 12, bonuses: { agi: 4 } },
    rasetsuTekko:    { id: 'rasetsuTekko',    name: '羅刹の手甲',   slot: 'arms', attackPower: 4, defensePower: 3, bonuses: {}, effects: { criticalRateBonus: 0.03 } },
    flashGreaves:    { id: 'flashGreaves',    name: '瞬脚の具足',   slot: 'feet', defensePower: 4, bonuses: { agi: 6, luk: 2 } },
    crimsonHat:      { id: 'crimsonHat',      name: '深紅の魔導帽', slot: 'head', magicAttackPower: 7, magicDefensePower: 5, bonuses: { maxMp: 6 } },
    purgatoryRobe:   { id: 'purgatoryRobe',   name: '煉獄のローブ', slot: 'body', defensePower: 5, magicAttackPower: 9, magicDefensePower: 10, bonuses: { maxMp: 8 } },
    blazeBangle:     { id: 'blazeBangle',     name: '灼熱の腕輪',   slot: 'arms', magicAttackPower: 7, bonuses: {}, effects: { fireDamagePercent: 0.03 } },
    starfireShoes:   { id: 'starfireShoes',   name: '星火の魔導靴', slot: 'feet', magicAttackPower: 4, magicDefensePower: 3, bonuses: { agi: 3 } },
    moonCrown:       { id: 'moonCrown',       name: '月白の聖冠',   slot: 'head', magicAttackPower: 4, magicDefensePower: 9, bonuses: { maxMp: 5 } },
    moonVestment:    { id: 'moonVestment',    name: '月祈の法衣',   slot: 'body', magicAttackPower: 6, defensePower: 9, magicDefensePower: 14, bonuses: { maxHp: 15 } },
    mercyBangle:     { id: 'mercyBangle',     name: '慈愛の腕輪',   slot: 'arms', magicDefensePower: 5, bonuses: {}, effects: { healingPowerPercent: 0.07 } },
    sacredShoes:     { id: 'sacredShoes',     name: '聖巡の靴',     slot: 'feet', defensePower: 4, magicDefensePower: 6, bonuses: {} },
    shadowCap: { id: 'shadowCap', name: 'シャドウキャップ', slot: 'head', bonuses: { vit: 4 } },
    arcaneHat: { id: 'arcaneHat', name: '魔導士の帽子', slot: 'head', bonuses: { mag: 4, maxMp: 6 } },
    phantomMask: { id: 'phantomMask', name: '怪盗仮面', slot: 'head', bonuses: { mnd: 6, agi: 2 } },
    nightHat: { id: 'nightHat', name: 'ナイトハット', slot: 'head', bonuses: { agi: 3, mnd: 1, luk: 1 } },
    tatterCoat: { id: 'tatterCoat', name: 'ボロのコート', slot: 'body', bonuses: { vit: 2 } },
    leatherVest: { id: 'leatherVest', name: 'レザーベスト', slot: 'body', bonuses: { vit: 4 } },
    shadowMantle: { id: 'shadowMantle', name: '影のマント', slot: 'body', bonuses: { vit: 7, maxHp: 10 } },
    phantomSuit: { id: 'phantomSuit', name: '怪盗スーツ', slot: 'body', bonuses: { vit: 9, maxHp: 14 } },
    soulRobe: { id: 'soulRobe', name: 'ソルローブ', slot: 'body', bonuses: { mnd: 6, mag: 3, maxHp: 10 } },
    roughGloves: { id: 'roughGloves', name: '粗削りグローブ', slot: 'arms', bonuses: { vit: 1, dex: 1 } },
    leatherGloves: { id: 'leatherGloves', name: 'レザーグローブ', slot: 'arms', bonuses: { vit: 2, dex: 2 } },
    magicGloves: { id: 'magicGloves', name: '魔導グローブ', slot: 'arms', bonuses: { mag: 5, mnd: 2 } },
    phantomGloves: { id: 'phantomGloves', name: '怪盗グローブ', slot: 'arms', bonuses: { dex: 6, vit: 2 } },
    goblinGloves: { id: 'goblinGloves', name: 'ゴブリングローブ', slot: 'arms', bonuses: { str: 3, vit: 2 } },
    roughBoots: { id: 'roughBoots', name: '粗削りブーツ', slot: 'feet', bonuses: { vit: 1, agi: 1 } },
    lightBoots: { id: 'lightBoots', name: '軽靴', slot: 'feet', bonuses: { vit: 2, agi: 2 } },
    swiftBoots: { id: 'swiftBoots', name: '疾走ブーツ', slot: 'feet', bonuses: { agi: 7 } },
    phantomBoots: { id: 'phantomBoots', name: '怪盗ブーツ', slot: 'feet', bonuses: { vit: 5, agi: 3 } },
    ratBoots: { id: 'ratBoots', name: 'ラットブーツ', slot: 'feet', bonuses: { agi: 4, dex: 2 } },
    soloist_mask: { id: 'soloist_mask', name: '独奏卿の仮面', seriesId: 'zenacad', slot: 'head', bonuses: { mag: 4, mnd: 4 } },
    soloist_coat: { id: 'soloist_coat', name: '独奏卿の燕尾服', seriesId: 'zenacad', slot: 'body', bonuses: { maxHp: 12, maxMp: 10, mag: 3, mnd: 4 } },
    maestro_gloves: { id: 'maestro_gloves', name: '指揮者の白手袋', seriesId: 'zenacad', slot: 'arms', bonuses: { mag: 4, dex: 4 } },
    finale_boots: { id: 'finale_boots', name: '終演の革靴', seriesId: 'zenacad', slot: 'feet', bonuses: { agi: 4, dex: 4 } },
    silentHood: { id: 'silentHood', name: '静寂のフード', slot: 'head', dungeonId: 'dungeon2', bonuses: { mag: 5, mnd: 5, maxMp: 6 } },
    abyssCoat: { id: 'abyssCoat', name: '深域の外套', slot: 'body', dungeonId: 'dungeon2', bonuses: { maxHp: 20, vit: 6, mnd: 5 } },
    abyssGloves: { id: 'abyssGloves', name: '魔蝕のグローブ', slot: 'arms', dungeonId: 'dungeon2', bonuses: { str: 4, mag: 4, dex: 3 } },
    nightwalkerBoots: { id: 'nightwalkerBoots', name: '夜渡りのブーツ', slot: 'feet', dungeonId: 'dungeon2', bonuses: { agi: 7, dex: 3 } },
    voidHelm: { id: 'voidHelm', name: '虚空の兜', slot: 'head', dungeonId: 'dungeon3', defensePower: 9, magicDefensePower: 8, bonuses: { maxHp: 16 } },
    abyssalArmor: { id: 'abyssalArmor', name: '深淵の鎧', slot: 'body', dungeonId: 'dungeon3', defensePower: 23, magicDefensePower: 10, bonuses: { maxHp: 30 }, effects: { physicalDamageReductionPercent: .03 } },
    phantomGauntlet: { id: 'phantomGauntlet', name: '幻影拳甲', slot: 'arms', dungeonId: 'dungeon3', attackPower: 8, defensePower: 5, bonuses: {}, effects: { criticalRateBonus: .02 } },
    fortressHelm: { id: 'fortressHelm', name: '城塞の兜', slot: 'head', dungeonId: 'dungeon3', defensePower: 10, magicDefensePower: 5, bonuses: {} },
    fortressCoat: { id: 'fortressCoat', name: '城塞の外套', slot: 'body', dungeonId: 'dungeon3', defensePower: 22, magicDefensePower: 10, bonuses: { maxHp: 20 }, effects: { physicalDamageReductionPercent: .03 } },
    fortressGloves: { id: 'fortressGloves', name: '城塞の手甲', slot: 'arms', dungeonId: 'dungeon3', attackPower: 5, defensePower: 7, bonuses: {} },
    fortressBoots: { id: 'fortressBoots', name: '城塞の脚甲', slot: 'feet', dungeonId: 'dungeon3', defensePower: 12, magicDefensePower: 4, bonuses: {} },
    voidweaveHood: { id: 'voidweaveHood', name: '虚紡の帽子', slot: 'head', dungeonId: 'dungeon3', magicAttackPower: 8, magicDefensePower: 8, bonuses: { maxMp: 6 } },
    voidweaveRobe: { id: 'voidweaveRobe', name: '虚紡のローブ', slot: 'body', dungeonId: 'dungeon3', defensePower: 6, magicAttackPower: 10, magicDefensePower: 16, bonuses: { maxMp: 10 } },
    voidweaveGloves: { id: 'voidweaveGloves', name: '虚紡の手袋', slot: 'arms', dungeonId: 'dungeon3', magicAttackPower: 7, magicDefensePower: 6, bonuses: {}, effects: { healingPowerPercent: .04 } },
    voidweaveBoots: { id: 'voidweaveBoots', name: '虚紡の靴', slot: 'feet', dungeonId: 'dungeon3', defensePower: 5, magicDefensePower: 8, bonuses: { maxMp: 6 } },
    riftBand: { id: 'riftBand', name: '裂界の鉢巻', slot: 'head', dungeonId: 'dungeon3', attackPower: 5, defensePower: 5, bonuses: {}, effects: { criticalRateBonus: .01 } },
    riftVest: { id: 'riftVest', name: '裂界の胴着', slot: 'body', dungeonId: 'dungeon3', attackPower: 10, defensePower: 11, magicDefensePower: 4, bonuses: {} },
    riftGuards: { id: 'riftGuards', name: '裂界の手甲', slot: 'arms', dungeonId: 'dungeon3', attackPower: 7, defensePower: 4, bonuses: {}, effects: { criticalRateBonus: .02 } },
    riftBoots: { id: 'riftBoots', name: '裂界の脚甲', slot: 'feet', dungeonId: 'dungeon3', attackPower: 3, defensePower: 7, magicDefensePower: 4, bonuses: {}, effects: { criticalRateBonus: .01 } },
    myrthi_headband: { id: 'myrthi_headband', name: '律動の髪飾り', seriesId: 'myrthi', slot: 'head', bonuses: { agi: 8, critBonus: .04 } },
    myrthi_coat: { id: 'myrthi_coat', name: '黒紅の戦舞装', seriesId: 'myrthi', slot: 'body', bonuses: { maxHp: 20, vit: 8, agi: 5 } },
    myrthi_bangle: { id: 'myrthi_bangle', name: '拍動のバングル', seriesId: 'myrthi', slot: 'arms', bonuses: { str: 10, agi: 4 } },
    myrthi_boots: { id: 'myrthi_boots', name: '加速の舞踏靴', seriesId: 'myrthi', slot: 'feet', bonuses: { agi: 12, dex: 4 } }
  },
  enemies: {
    shadowSlime: {
      id: 'shadowSlime', name: 'シャドウスライム', enName: 'SHADOW SLIME', element: '闇', weaknesses: ['光', '火'],
      sprite: 'assets/enemy-characters/shadow-slime/battle-idle.png',
      stats: { maxHp: 30, atk: 7, def: 4, mag: 5, spd: 6 }, exp: 10, gold: { min: 5, max: 10 },
      dropTable: [
        { itemId: 'slimeJelly', chance: .40 },
        { itemId: 'shadowWand', chance: .10 }, { itemId: 'slimeRing', chance: .08 }, { itemId: 'darkCore', chance: .03 }
      ],
      ai: [{ id: 'shadowBolt', name: '闇の魔弾', kind: 'magic', weight: .28 }, { id: 'attack', name: '体当たり', kind: 'physical', weight: .72 }]
    },
    noelFirstEncounter: {
      id: 'noelFirstEncounter', name: 'ノエル', enName: 'NOËL — THE ETERNAL JUDGE', kind: 'boss', encounter: 1,
      music: '音楽系/ダンジョン/ダンジョン1ノエルのテーマ.mp3',
      title: '永遠の裁定者', element: '闇 / 裁定', sprite: 'assets/enemy-characters/noel/battle-first-encounter.png',
      dynamicScale: 50, cannotDefeat: true,
      // 3ターンはプレイヤーを観察し、4ターン目に強制裁定する初回敗北イベント。
      scriptedDefeat: { idleTurns: 3 },
      exp: 0, gold: { min: 0, max: 0 }, dropTable: [],
      ai: [{ id: 'eternalJudgement', name: 'エターナル・ジャッジメント', kind: 'magic', unavoidable: true, weight: 1 }]
    },
    debugOverpowerEnemy: {
      id: 'debugOverpowerEnemy', name: '強敵検証体 Ω', enName: 'DEBUG OVERPOWERED TARGET',
      title: '能力差耐久試験', kind: 'boss', dungeonId: 'dungeon3', devOnly: true, debugOnly: true, hideInArchive: true,
      element: '無', sprite: 'assets/enemy-characters/dungeon3/fortressGolem.png', spriteClass: 'fortress-golem', battleScale: 1.35,
      // HPは減らない。回復を封じる必中の圧力下で、純粋な防御・盾受け・反撃性能を測る守護士向け試験。
      infiniteHp: true, trialRules: { maxActions: 30, baselineMaxHp: 80, targetNeutralHits: 5, healingMultiplier: 0, attacksUnavoidable: true, label: '回復封印／必中' },
      stats: { maxHp: 999999, atk: 65, def: 95, mag: 60, mnd: 90, dex: 30, agi: 22, spd: 22 },
      sparkLevel: 1, exp: 0, gold: { min: 0, max: 0 }, dropTable: [],
      ai: [
        { id: 'overpowerCrush', name: '超過圧砕', kind: 'physical', unavoidable: true, weight: .55 },
        { id: 'overpowerRay', name: '超過魔砲', kind: 'magic', unavoidable: true, weight: .45 }
      ]
    },
    zenakado: {
      id: 'zenakado', name: 'ゼナカド', enName: 'ZENAKADO — THE SOLOIST', kind: 'boss', encounter: 1,
      title: '独奏卿', element: '闇', weaknesses: ['光', '火'],
      sprite: 'assets/enemy-characters/zenakado/battle-idle-v3.png',
      stats: { maxHp: 640, atk: 28, def: 16, mag: 26, mnd: 16, dex: 24, agi: 24, spd: 24 },
      exp: 150, gold: { min: 100, max: 150 },
      dropTable: [
        { itemId: 'cadenza_fragment', chance: 1.0 }, { itemId: 'zenacad_core', chance: .45 },
        { itemId: 'darkCore', chance: 1.0 }, { itemId: 'moonstone', chance: .8 }, { itemId: 'stardustShard', chance: .6 },
        { itemId: 'cadenza_staff', chance: .03 }, { itemId: 'soloist_mask', chance: .03 }, { itemId: 'soloist_coat', chance: .03 },
        { itemId: 'maestro_gloves', chance: .03 }, { itemId: 'finale_boots', chance: .03 }, { itemId: 'maestri_baton', chance: .03 }
      ],
      ai: [
        { id: 'shadowClaw', name: '影裂斬', kind: 'physical', accuracyModifier: 0, weight: 0.45 },
        { id: 'darkBlast', name: '暗黒爆破', kind: 'magic', accuracyModifier: 0.05, weight: 0.35 },
        { id: 'attack', name: '斬りつける', kind: 'physical', accuracyModifier: 0, weight: 0.20 }
      ]
    },
    soulMage: {
      id: 'soulMage', name: 'ソルメイジ', enName: 'SOUL MAGE', element: '闇', weaknesses: ['光', '火'], resistances: [],
      sprite: 'assets/enemy-characters/soulMage/battle-idle-v1.png',
      stats: { maxHp: 38, atk: 5, def: 4, mag: 11, spd: 7 }, exp: 20, gold: { min: 8, max: 20 },
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
      stats: { maxHp: 36, atk: 8, def: 4, mag: 2, spd: 10 }, exp: 18, gold: { min: 5, max: 15 },
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
      stats: { maxHp: 48, atk: 11, def: 6, mag: 2, spd: 6 }, exp: 16, gold: { min: 6, max: 14 },
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
      stats: { maxHp: 34, atk: 7, def: 3, mag: 2, spd: 15 }, exp: 14, gold: { min: 5, max: 12 },
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
      stats: { maxHp: 42, atk: 6, def: 7, mag: 12, spd: 7 }, exp: 17, gold: { min: 6, max: 15 },
      dropTable: [
        { itemId: 'spiritFragment', chance: .35 }, { itemId: 'oldBone', chance: .30 },
        { itemId: 'darkSoulStone', chance: .20 }, { itemId: 'resentmentCrystal', chance: .10 }, { itemId: 'cursedNecklace', chance: .02 }
      ],
      stealTable: [{ itemId: 'darkSoulStone', chance: .25 }],
      ai: [{ id: 'spiritBolt', name: '霊弾', kind: 'magic', weight: .65 }, { id: 'attack', name: '体当たり', kind: 'physical', weight: .35 }]
    },
    voidWatcher: {
      id: 'voidWatcher', name: '虚空の監視者', enName: 'VOID WATCHER', dungeonId: 'dungeon3',
      role: 'MAGIC TANK', roleDescription: '魔法防御型。物理攻撃が有効。', element: '虚無', weaknesses: ['斬', '打'], resistances: ['闇', '魔'],
      sprite: 'assets/enemy-characters/dungeon3/voidWatcher.png', spriteClass: 'void-watcher', battleScale: 1.1,
      stats: { maxHp: 420, atk: 24, def: 13, mag: 38, mnd: 72, spd: 13 }, exp: 95, gold: { min: 40, max: 70 },
      dropTable: [{ itemId: 'voidShard', chance: .45 }, { itemId: 'chaosDust', chance: .22 }, { itemId: 'phantomCore', chance: .10 }],
      ai: [{ id: 'soulBolt', name: '虚空弾', kind: 'magic', weight: .65 }, { id: 'attack', name: '虚空の一瞥', kind: 'magic', weight: .35 }]
    },
    abyssalKnight: {
      id: 'abyssalKnight', name: '深淵の騎士', enName: 'ABYSSAL KNIGHT', dungeonId: 'dungeon3',
      role: 'PHYSICAL TANK', roleDescription: '物理防御型。魔法攻撃が有効。', element: '闇', weaknesses: ['光', '魔'], resistances: ['闇', '物理'],
      sprite: 'assets/enemy-characters/dungeon3/abyssalKnight.png', spriteClass: 'abyssal-knight', battleScale: 1.3,
      stats: { maxHp: 520, atk: 40, def: 78, mag: 12, mnd: 14, spd: 10 }, exp: 110, gold: { min: 45, max: 80 },
      dropTable: [{ itemId: 'darkIron', chance: .40 }, { itemId: 'voidShard', chance: .20 }, { itemId: 'voidEssence', chance: .08 }],
      ai: [{ id: 'attack', name: '深淵の剣撃', kind: 'physical', weight: .70 }, { id: 'soulBolt', name: '虚空震撃', kind: 'physical', weight: .30 }]
    },
    chaosWitch: {
      id: 'chaosWitch', name: 'カオス・ウィッチ', enName: 'CHAOS WITCH', dungeonId: 'dungeon3',
      element: '混沌', weaknesses: ['聖', '打'], resistances: ['魔', '闇'],
      sprite: 'assets/enemy-characters/dungeon3/chaosWitch.png', spriteClass: 'chaos-witch', battleScale: 1.0,
      stats: { maxHp: 300, atk: 18, def: 14, mag: 50, mnd: 22, spd: 16 }, exp: 130, gold: { min: 50, max: 85 },
      dropTable: [{ itemId: 'chaosDust', chance: .50 }, { itemId: 'voidShard', chance: .25 }, { itemId: 'phantomCore', chance: .12 }],
      ai: [{ id: 'soulBolt', name: '混沌魔法', kind: 'magic', weight: .60 }, { id: 'attack', name: '呪縛の指先', kind: 'magic', weight: .40 }]
    },
    voidGargoyle: {
      id: 'voidGargoyle', name: '虚空ガーゴイル', enName: 'VOID GARGOYLE', dungeonId: 'dungeon3',
      element: '闇', weaknesses: ['打', '聖'], resistances: ['物理', '魔', '闇'],
      sprite: 'assets/enemy-characters/dungeon3/voidGargoyle.png', spriteClass: 'void-gargoyle', battleScale: 1.4,
      stats: { maxHp: 520, atk: 40, def: 42, mag: 14, mnd: 16, spd: 8 }, exp: 118, gold: { min: 42, max: 75 },
      dropTable: [{ itemId: 'darkIron', chance: .38 }, { itemId: 'voidShard', chance: .18 }, { itemId: 'voidEssence', chance: .10 }],
      ai: [{ id: 'attack', name: '石翼の一撃', kind: 'physical', weight: .75 }, { id: 'soulBolt', name: '虚空咆哮', kind: 'physical', weight: .25 }]
    },
    phantomEmperor: {
      id: 'phantomEmperor', name: '幻影皇', enName: 'PHANTOM EMPEROR', dungeonId: 'dungeon3',
      element: '虚無', weaknesses: ['聖', '光'], resistances: ['物理', '闇', '魔'],
      sprite: 'assets/enemy-characters/dungeon3/phantomEmperor.png', spriteClass: 'phantom-emperor', battleScale: 1.2,
      stats: { maxHp: 360, atk: 36, def: 22, mag: 42, mnd: 24, spd: 20 }, exp: 140, gold: { min: 55, max: 90 },
      dropTable: [{ itemId: 'phantomCore', chance: .40 }, { itemId: 'darkIron', chance: .22 }, { itemId: 'voidEssence', chance: .14 }],
      ai: [{ id: 'soulBolt', name: '皇の号令', kind: 'magic', weight: .55 }, { id: 'attack', name: '幻影剣閃', kind: 'physical', weight: .45 }]
    },
    voidOrchestra: {
      id: 'voidOrchestra', name: '虚無の楽団', enName: 'VOID ORCHESTRA', dungeonId: 'dungeon3',
      kind: 'elite',
      element: '虚無', weaknesses: ['光'], resistances: ['物理', '闇', '魔', '毒'],
      sprite: 'assets/enemy-characters/dungeon3/voidOrchestra.png', spriteClass: 'void-orchestra', battleScale: 1.15,
      stats: { maxHp: 600, atk: 42, def: 30, mag: 46, mnd: 26, spd: 18 }, exp: 180, gold: { min: 70, max: 120 },
      dropTable: [{ itemId: 'voidEssence', chance: .50 }, { itemId: 'phantomCore', chance: .35 }, { itemId: 'chaosDust', chance: .30 }, { itemId: 'darkIron', chance: .20 }],
      ai: [{ id: 'soulBolt', name: '虚無の交響', kind: 'magic', weight: .60 }, { id: 'attack', name: '楽団の奔流', kind: 'physical', weight: .40 }]
    },
    voidCantor: {
      id: 'voidCantor', name: '虚空の聖唱者', enName: 'VOID CANTOR', dungeonId: 'dungeon3', role: 'HEALER', roleDescription: '傷ついた味方を優先して回復する。',
      element: '虚無', weaknesses: ['斬', '火'], resistances: ['闇'], sprite: 'assets/enemy-characters/dungeon3/voidCantor.png', spriteClass: 'void-cantor', battleScale: 1.0,
      stats: { maxHp: 330, atk: 15, def: 20, mag: 42, mnd: 46, spd: 12 }, exp: 125, gold: { min: 52, max: 86 },
      dropTable: [{ itemId: 'chaosDust', chance: .42 }, { itemId: 'voidEssence', chance: .12 }],
      ai: [{ id: 'voidHeal', name: '虚空治癒', kind: 'heal', power: .22, weight: .58 }, { id: 'soulBolt', name: '聖唱弾', kind: 'magic', weight: .42 }]
    },
    ironChanter: {
      id: 'ironChanter', name: '鉄壁の詠唱兵', enName: 'IRON CHANTER', dungeonId: 'dungeon3', role: 'PHYSICAL BUFFER', roleDescription: '敵全体のDEFを上昇させる。',
      element: '闇', weaknesses: ['魔', '雷'], resistances: ['物理'], sprite: 'assets/enemy-characters/dungeon3/ironChanter.png', spriteClass: 'iron-chanter', battleScale: 1.05,
      stats: { maxHp: 390, atk: 26, def: 44, mag: 22, mnd: 24, spd: 9 }, exp: 120, gold: { min: 48, max: 82 },
      dropTable: [{ itemId: 'darkIron', chance: .48 }, { itemId: 'voidShard', chance: .20 }],
      ai: [{ id: 'ironChant', name: '鉄壁詠唱', kind: 'defBuff', rate: .30, turns: 3, weight: .48 }, { id: 'attack', name: '鉄杖打ち', kind: 'physical', weight: .52 }]
    },
    arcaneChanter: {
      id: 'arcaneChanter', name: '秘儀の詠唱兵', enName: 'ARCANE CHANTER', dungeonId: 'dungeon3', role: 'MAGIC BUFFER', roleDescription: '敵全体のMDEFを上昇させる。',
      element: '虚無', weaknesses: ['斬', '打'], resistances: ['魔'], sprite: 'assets/enemy-characters/dungeon3/arcaneChanter.png', spriteClass: 'arcane-chanter', battleScale: 1.0,
      stats: { maxHp: 350, atk: 18, def: 20, mag: 34, mnd: 48, spd: 11 }, exp: 122, gold: { min: 50, max: 84 },
      dropTable: [{ itemId: 'chaosDust', chance: .46 }, { itemId: 'phantomCore', chance: .12 }],
      ai: [{ id: 'arcaneChant', name: '秘儀障壁', kind: 'mdefBuff', rate: .30, turns: 3, weight: .48 }, { id: 'soulBolt', name: '秘儀弾', kind: 'magic', weight: .52 }]
    },
    riftAssailant: {
      id: 'riftAssailant', name: '裂界の強襲者', enName: 'RIFT ASSAILANT', dungeonId: 'dungeon3', role: 'ATTACKER', roleDescription: '低防御・高攻撃。優先撃破推奨。',
      element: '虚無', weaknesses: ['光', '打'], resistances: ['闇'], sprite: 'assets/enemy-characters/dungeon3/riftAssailant.png', spriteClass: 'rift-assailant', battleScale: 1.05,
      stats: { maxHp: 280, atk: 58, def: 14, mag: 44, mnd: 13, spd: 24 }, exp: 135, gold: { min: 55, max: 92 },
      dropTable: [{ itemId: 'voidShard', chance: .44 }, { itemId: 'phantomCore', chance: .15 }],
      ai: [{ id: 'riftSlash', name: '裂界斬', kind: 'physical', weight: .58 }, { id: 'riftRay', name: '裂界光', kind: 'magic', weight: .42 }]
    },
    fortressGolem: {
      id: 'fortressGolem', name: '侵城ゴーレム', enName: 'FORTRESS GOLEM', dungeonId: 'dungeon3', role: 'HEAVY TANK', roleDescription: '極端な物理防御を持つ城塞型。魔法で崩す。',
      element: '土', weaknesses: ['魔', '雷'], resistances: ['物理', '打'], sprite: 'assets/enemy-characters/dungeon3/fortressGolem.png', battleScale: 1.35,
      stats: { maxHp: 610, atk: 44, def: 92, mag: 8, mnd: 18, spd: 6 }, exp: 145, gold: { min: 62, max: 105 },
      dropTable: [{ itemId: 'fortressStone', chance: .42 }, { itemId: 'darkIron', chance: .35 }, { itemId: 'voidShard', chance: .18 }],
      ai: [{ id: 'fortressCrash', name: '城壁圧砕', kind: 'physical', weight: .72 }, { id: 'attack', name: '岩塊打ち', kind: 'physical', weight: .28 }]
    },
    prismSentinel: {
      id: 'prismSentinel', name: '白晶の監視機', enName: 'PRISM SENTINEL', dungeonId: 'dungeon3', role: 'MAGIC TANK', roleDescription: '魔法を弾く白晶装甲。物理攻撃が有効。',
      element: '光', weaknesses: ['斬', '闇'], resistances: ['魔', '光'], sprite: 'assets/enemy-characters/dungeon3/prismSentinel.png', battleScale: 1.05,
      stats: { maxHp: 460, atk: 28, def: 24, mag: 52, mnd: 88, spd: 14 }, exp: 155, gold: { min: 68, max: 112 },
      dropTable: [{ itemId: 'voidSilk', chance: .38 }, { itemId: 'chaosDust', chance: .28 }, { itemId: 'sanctumGear', chance: .10 }],
      ai: [{ id: 'prismRay', name: '白晶収束光', kind: 'magic', weight: .68 }, { id: 'attack', name: '反射衝撃', kind: 'physical', weight: .32 }]
    },
    chainReaper: {
      id: 'chainReaper', name: '鎖葬の刈手', enName: 'CHAIN REAPER', dungeonId: 'dungeon3', role: 'FAST ATTACKER', roleDescription: '高い素早さで連続して圧力をかける。',
      element: '闇', weaknesses: ['光', '火'], resistances: ['闇'], sprite: 'assets/enemy-characters/dungeon3/chainReaper.png', battleScale: 1.1,
      stats: { maxHp: 340, atk: 68, def: 18, mag: 20, mnd: 18, spd: 34, agi: 38, dex: 32 }, exp: 170, gold: { min: 72, max: 122 },
      dropTable: [{ itemId: 'riftClaw', chance: .44 }, { itemId: 'voidShard', chance: .26 }, { itemId: 'phantomCore', chance: .12 }],
      ai: [{ id: 'chainRend', name: '鎖葬裂き', kind: 'physical', weight: .76 }, { id: 'riftRay', name: '鎖界波', kind: 'magic', weight: .24 }]
    },
    voidAlchemist: {
      id: 'voidAlchemist', name: '虚無錬成師', enName: 'VOID ALCHEMIST', dungeonId: 'dungeon3', role: 'SUPPORT', roleDescription: '回復と魔法防壁で編成を立て直す。',
      element: '虚無', weaknesses: ['斬', '聖'], resistances: ['魔'], sprite: 'assets/enemy-characters/dungeon3/voidAlchemist.png', battleScale: 1.0,
      stats: { maxHp: 400, atk: 16, def: 24, mag: 58, mnd: 52, spd: 18 }, exp: 185, gold: { min: 82, max: 136 },
      dropTable: [{ itemId: 'voidSilk', chance: .42 }, { itemId: 'sanctumGear', chance: .32 }, { itemId: 'voidEssence', chance: .10 }],
      ai: [{ id: 'voidHeal', name: '虚無再錬成', kind: 'heal', power: .25, weight: .38 }, { id: 'arcaneChant', name: '錬成障壁', kind: 'mdefBuff', rate: .26, turns: 3, weight: .24 }, { id: 'soulBolt', name: '崩界薬弾', kind: 'magic', weight: .38 }]
    },
    crimsonBehemoth: {
      id: 'crimsonBehemoth', name: '深紅城獣', enName: 'CRIMSON BEHEMOTH', dungeonId: 'dungeon3', role: 'BRUISER', roleDescription: '後半層の高耐久・高火力個体。短期決戦推奨。',
      element: '火', weaknesses: ['氷', '聖'], resistances: ['火', '物理'], sprite: 'assets/enemy-characters/dungeon3/crimsonBehemoth.png', spriteClass: 'crimson-behemoth', battleScale: 1.35,
      stats: { maxHp: 720, atk: 76, def: 48, mag: 34, mnd: 34, spd: 17 }, exp: 230, gold: { min: 105, max: 168 },
      dropTable: [{ itemId: 'fortressStone', chance: .35 }, { itemId: 'riftClaw', chance: .34 }, { itemId: 'voidEssence', chance: .14 }],
      ai: [{ id: 'crimsonCharge', name: '深紅突進', kind: 'physical', weight: .72 }, { id: 'crimsonRoar', name: '灼城咆哮', kind: 'magic', weight: .28 }]
    },
    merox: {
      id: 'merox', legacyIds: ['astralMercuryCore'], name: 'メロクス', enName: 'MEROX', lineage: 'xSuffixTribe', lineageLabel: '〇〇クス族', dungeonId: 'dungeon3', kind: 'rare', role: 'EXP TREASURE', roleDescription: '莫大なEXPを宿す超硬・高速個体。すぐ逃げる。',
      element: '星', weaknesses: [], resistances: ['物理', '魔'], sprite: 'assets/enemy-characters/dungeon3/merox.png', battleScale: .88, ignoreFloorStatScale: true,
      stats: { maxHp: 18, atk: 22, def: 96, mag: 14, mnd: 92, spd: 88, agi: 92, dex: 78, luk: 6 }, exp: 1500, gold: { min: 0, max: 0 },
      dropTable: [{ itemId: 'astralMercury', chance: .40 }],
      ai: [{ id: 'rareEscape', name: '星界離脱', kind: 'flee', weight: .58 }, { id: 'meroxRam', name: '星銀突進', kind: 'physical', weight: .42 }]
    },
    gildedHoarder: {
      id: 'gildedHoarder', name: '黄金喰らい', enName: 'GILDED HOARDER', dungeonId: 'dungeon3', kind: 'rare', role: 'GOLD TREASURE / THIEF', roleDescription: '大量のGOLDを抱えるが、こちらの財貨や素材を盗んで逃げる。',
      element: '金', weaknesses: ['打', '雷'], resistances: ['闇'], sprite: 'assets/enemy-characters/dungeon3/gildedHoarder.png', battleScale: 1.0, ignoreFloorStatScale: true,
      stats: { maxHp: 120, atk: 46, def: 38, mag: 18, mnd: 34, spd: 58, agi: 62, dex: 56, luk: 30 }, exp: 190, gold: { min: 1400, max: 2400 },
      dropTable: [{ itemId: 'gildedCore', chance: .35 }, { itemId: 'stolenCoin', chance: .80 }],
      ai: [{ id: 'hoardSteal', name: '強欲のひったくり', kind: 'steal', weight: .54 }, { id: 'hoardEscape', name: '戦利離脱', kind: 'flee', weight: .26 }, { id: 'coinCrash', name: '金貨圧砕', kind: 'physical', weight: .20 }]
    },
    silentHarmonist: {
      id: 'silentHarmonist', name: 'サイレント・ハーモニスト', enName: 'SILENT HARMONIST', dungeonId: 'dungeon2',
      kind: 'elite',
      element: '闇', weaknesses: ['光', '雷'], resistances: ['闇'],
      sprite: 'assets/enemy-characters/dungeon2/silentHarmonist.png', battleScale: 1.1,
      stats: { maxHp: 210, atk: 22, def: 14, mag: 22, mnd: 16, spd: 16 }, exp: 85, gold: { min: 35, max: 60 },
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
      sprite: 'assets/enemy-characters/dungeon2/echoWraith.png', battleScale: 1.0,
      stats: { maxHp: 95, atk: 14, def: 6, mag: 16, mnd: 10, spd: 22 }, exp: 40, gold: { min: 18, max: 35 },
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
      sprite: 'assets/enemy-characters/dungeon2/muteGargoyle.png', battleScale: 1.3,
      stats: { maxHp: 220, atk: 19, def: 16, mag: 10, mnd: 14, spd: 6 }, exp: 58, gold: { min: 22, max: 42 },
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
      sprite: 'assets/enemy-characters/dungeon2/nocturneChandelier.png', battleScale: 1.1,
      stats: { maxHp: 140, atk: 13, def: 9, mag: 18, mnd: 14, spd: 7 }, exp: 46, gold: { min: 18, max: 36 },
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
      sprite: 'assets/enemy-characters/dungeon2/silentKnight.png', battleScale: 1.2,
      stats: { maxHp: 165, atk: 20, def: 14, mag: 8, mnd: 10, spd: 14 }, exp: 55, gold: { min: 22, max: 45 },
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
      sprite: 'assets/enemy-characters/dungeon2/reverbSlime.png', battleScale: 0.85,
      stats: { maxHp: 85, atk: 12, def: 8, mag: 10, mnd: 8, spd: 8 }, exp: 35, gold: { min: 15, max: 30 },
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
      sprite: 'assets/enemy-characters/dungeon2/nocturneBanshee.png', battleScale: 1.0,
      stats: { maxHp: 105, atk: 12, def: 6, mag: 20, mnd: 12, spd: 13 }, exp: 42, gold: { min: 18, max: 35 },
      dropTable: [
        { itemId: 'spectralDust', chance: .45 },
        { itemId: 'violinString', chance: .28 },
        { itemId: 'manaDrop',     chance: .15 }
      ],
      ai: [{ id: 'soulBolt', name: 'サイレントクライ', kind: 'magic', weight: .50 }, { id: 'shadowBolt', name: 'MPドレインノート', kind: 'magic', weight: .30 }, { id: 'attack', name: '絶望の終曲', kind: 'magic', weight: .20 }]
    },

    // ══════════════════════════════════════════════════════════════
    // ダンジョン2 追加モンスター（1F〜3F）
    //   sprite はIDと同名の透過PNGを参照する。画像追加だけで差し替えやすい構造にしている。
    //   ドロップは階層ごとに素材を分けてあり、工房のレシピ進行と対応している。
    //     1F → リバーブゼリー / エコーの欠片
    //     2F → 霊幻の粉塵 / 亡霊のヴァイオリン弦 / 無音の楽譜
    //     3F → 静寂の装甲片 / 石像の破片 / 月光石
    // ══════════════════════════════════════════════════════════════

    // ── 1F 残響の回廊 ──
    hushMoth: {
      id: 'hushMoth', name: 'ハッシュ・モス', enName: 'HUSH MOTH', dungeonId: 'dungeon2', floorId: 'd2f1',
      element: '闇', weaknesses: ['火', '雷'], resistances: ['闇'],
      sprite: 'assets/enemy-characters/dungeon2/hushMoth.png', battleScale: 0.8,
      stats: { maxHp: 75, atk: 10, def: 5, mag: 14, mnd: 9, spd: 18 }, exp: 32, gold: { min: 14, max: 28 },
      dropTable: [
        { itemId: 'echoShard',  chance: .48 },
        { itemId: 'manaDrop',   chance: .22 },
        { itemId: 'reverbJelly', chance: .18 }
      ],
      ai: [{ id: 'shadowBolt', name: '鱗粉のノイズ', kind: 'magic', weight: .50 }, { id: 'attack', name: '羽ばたきの断層', kind: 'physical', weight: .30 }, { id: 'attack', name: '沈黙の粉', kind: 'magic', weight: .20 }]
    },
    chimeImp: {
      id: 'chimeImp', name: 'チャイム・インプ', enName: 'CHIME IMP', dungeonId: 'dungeon2', floorId: 'd2f1',
      element: '闇', weaknesses: ['光', '斬'], resistances: ['闇'],
      sprite: 'assets/enemy-characters/dungeon2/chimeImp.png', battleScale: 0.85,
      stats: { maxHp: 90, atk: 13, def: 7, mag: 8, mnd: 8, spd: 16 }, exp: 34, gold: { min: 16, max: 30 },
      dropTable: [
        { itemId: 'reverbJelly', chance: .46 },
        { itemId: 'echoShard',   chance: .30 },
        { itemId: 'stolenCoin',  chance: .14 }
      ],
      ai: [{ id: 'attack', name: '鈴鳴りの爪', kind: 'physical', weight: .55 }, { id: 'ratBite', name: '不協和の連打', kind: 'physical', weight: .30 }, { id: 'shadowBolt', name: '高音の悲鳴', kind: 'magic', weight: .15 }]
    },
    fadingChorister: {
      id: 'fadingChorister', name: 'フェイド・クワイア', enName: 'FADING CHORISTER', dungeonId: 'dungeon2', floorId: 'd2f1',
      element: '闇', weaknesses: ['光'], resistances: ['闇', '精神'],
      sprite: 'assets/enemy-characters/dungeon2/fadingChorister.png', battleScale: 0.95,
      stats: { maxHp: 100, atk: 11, def: 6, mag: 18, mnd: 12, spd: 11 }, exp: 38, gold: { min: 17, max: 32 },
      dropTable: [
        { itemId: 'echoShard',    chance: .45 },
        { itemId: 'spectralDust', chance: .24 },
        { itemId: 'manaDrop',     chance: .18 }
      ],
      ai: [{ id: 'soulBolt', name: '消え入る聖歌', kind: 'magic', weight: .50 }, { id: 'shadowBolt', name: '虚ろな輪唱', kind: 'magic', weight: .30 }, { id: 'attack', name: '祈りの残滓', kind: 'physical', weight: .20 }]
    },
    mutedHound: {
      id: 'mutedHound', name: 'ミュート・ハウンド', enName: 'MUTED HOUND', dungeonId: 'dungeon2', floorId: 'd2f1',
      element: '闇', weaknesses: ['火'], resistances: ['闇'],
      sprite: 'assets/enemy-characters/dungeon2/mutedHound.png', battleScale: 0.9,
      stats: { maxHp: 110, atk: 16, def: 9, mag: 4, mnd: 7, spd: 20 }, exp: 40, gold: { min: 18, max: 34 },
      dropTable: [
        { itemId: 'reverbJelly', chance: .44 },
        { itemId: 'echoShard',   chance: .26 },
        { itemId: 'oldBone',     chance: .18 }
      ],
      ai: [{ id: 'attack', name: '声なき牙', kind: 'physical', weight: .55 }, { id: 'ratBite', name: '疾駆の追撃', kind: 'physical', weight: .35 }, { id: 'clubSmash', name: '押し倒し', kind: 'physical', weight: .10 }]
    },

    // ── 2F 沈黙の広間 ──
    voidVioloncello: {
      id: 'voidVioloncello', name: 'ヴォイド・チェロ', enName: 'VOID VIOLONCELLO', dungeonId: 'dungeon2', floorId: 'd2f2',
      element: '闇', weaknesses: ['雷'], resistances: ['闇', '精神'],
      sprite: 'assets/enemy-characters/dungeon2/voidVioloncello.png', battleScale: 1.05,
      stats: { maxHp: 155, atk: 14, def: 11, mag: 22, mnd: 14, spd: 8 }, exp: 50, gold: { min: 22, max: 40 },
      dropTable: [
        { itemId: 'violinString', chance: .46 },
        { itemId: 'spectralDust', chance: .30 },
        { itemId: 'silentNote',   chance: .18 }
      ],
      ai: [{ id: 'shadowBolt', name: '低弦の唸り', kind: 'magic', weight: .50 }, { id: 'soulBolt', name: '虚無のロングトーン', kind: 'magic', weight: .30 }, { id: 'attack', name: '弓の一閃', kind: 'physical', weight: .20 }]
    },
    pallidConductor: {
      id: 'pallidConductor', name: 'ペイルド・コンダクター', enName: 'PALLID CONDUCTOR', dungeonId: 'dungeon2', floorId: 'd2f2',
      element: '闇', weaknesses: ['光'], resistances: ['闇', '精神'],
      sprite: 'assets/enemy-characters/dungeon2/pallidConductor.png', battleScale: 1.05,
      stats: { maxHp: 170, atk: 16, def: 12, mag: 24, mnd: 16, spd: 14 }, exp: 56, gold: { min: 25, max: 44 },
      dropTable: [
        { itemId: 'silentNote',   chance: .48 },
        { itemId: 'spectralDust', chance: .28 },
        { itemId: 'violinString', chance: .20 }
      ],
      ai: [{ id: 'soulBolt', name: '蒼白の指揮', kind: 'magic', weight: .45 }, { id: 'shadowBolt', name: '無音のタクト', kind: 'magic', weight: .35 }, { id: 'attack', name: '譜面台の打撃', kind: 'physical', weight: .20 }]
    },
    noiselessLancer: {
      id: 'noiselessLancer', name: 'ノイズレス・ランサー', enName: 'NOISELESS LANCER', dungeonId: 'dungeon2', floorId: 'd2f2',
      element: '闇', weaknesses: ['雷', '斬'], resistances: ['闇'],
      sprite: 'assets/enemy-characters/dungeon2/noiselessLancer.png', battleScale: 1.0,
      stats: { maxHp: 175, atk: 24, def: 15, mag: 6, mnd: 10, spd: 17 }, exp: 58, gold: { min: 26, max: 46 },
      dropTable: [
        { itemId: 'silentNote',  chance: .40 },
        { itemId: 'silentArmor', chance: .26 },
        { itemId: 'stoneShard',  chance: .20 }
      ],
      ai: [{ id: 'attack', name: '無音の刺突', kind: 'physical', weight: .50 }, { id: 'ratBite', name: '三連の刺突', kind: 'physical', weight: .30 }, { id: 'clubSmash', name: '薙ぎ払い', kind: 'physical', weight: .20 }]
    },
    grimMetronome: {
      id: 'grimMetronome', name: 'グリム・メトロノーム', enName: 'GRIM METRONOME', dungeonId: 'dungeon2', floorId: 'd2f2',
      element: '闇', weaknesses: ['雷'], resistances: ['闇', '打'],
      sprite: 'assets/enemy-characters/dungeon2/grimMetronome.png', battleScale: 1.0,
      stats: { maxHp: 190, atk: 18, def: 18, mag: 12, mnd: 14, spd: 5 }, exp: 54, gold: { min: 24, max: 42 },
      dropTable: [
        { itemId: 'stoneShard',   chance: .44 },
        { itemId: 'silentNote',   chance: .28 },
        { itemId: 'spectralDust', chance: .20 }
      ],
      ai: [{ id: 'clubSmash', name: '刻の一撃', kind: 'physical', weight: .50 }, { id: 'attack', name: '重い拍', kind: 'physical', weight: .30 }, { id: 'shadowBolt', name: '狂ったテンポ', kind: 'magic', weight: .20 }]
    },
    whisperVeil: {
      id: 'whisperVeil', name: 'ウィスパー・ヴェイル', enName: 'WHISPER VEIL', dungeonId: 'dungeon2', floorId: 'd2f2',
      element: '闇', weaknesses: ['光', '火'], resistances: ['闇', '精神'],
      sprite: 'assets/enemy-characters/dungeon2/whisperVeil.png', battleScale: 0.95,
      stats: { maxHp: 150, atk: 12, def: 8, mag: 26, mnd: 16, spd: 15 }, exp: 52, gold: { min: 23, max: 41 },
      dropTable: [
        { itemId: 'spectralDust', chance: .50 },
        { itemId: 'violinString', chance: .26 },
        { itemId: 'manaDrop',     chance: .20 }
      ],
      ai: [{ id: 'soulBolt', name: '囁きの帳', kind: 'magic', weight: .55 }, { id: 'shadowBolt', name: '耳鳴りの呪詛', kind: 'magic', weight: .30 }, { id: 'attack', name: '絡みつく布', kind: 'physical', weight: .15 }]
    },

    // ── 3F 楽殿最奥 ──
    stoneChoir: {
      id: 'stoneChoir', name: 'ストーン・クワイア', enName: 'STONE CHOIR', dungeonId: 'dungeon2', floorId: 'd2f3',
      element: '闇', weaknesses: ['打'], resistances: ['闇', '斬'],
      sprite: 'assets/enemy-characters/dungeon2/stoneChoir.png', battleScale: 1.1,
      stats: { maxHp: 240, atk: 21, def: 16, mag: 16, mnd: 16, spd: 7 }, exp: 68, gold: { min: 30, max: 52 },
      dropTable: [
        { itemId: 'stoneShard',  chance: .52 },
        { itemId: 'silentArmor', chance: .28 },
        { itemId: 'silentNote',  chance: .20 }
      ],
      ai: [{ id: 'clubSmash', name: '石化の合唱', kind: 'physical', weight: .45 }, { id: 'attack', name: '重厚な唱和', kind: 'physical', weight: .35 }, { id: 'shadowBolt', name: '割れた高音', kind: 'magic', weight: .20 }]
    },
    requiemKnight: {
      id: 'requiemKnight', name: 'レクイエム・ナイト', enName: 'REQUIEM KNIGHT', dungeonId: 'dungeon2', floorId: 'd2f3',
      element: '闇', weaknesses: ['雷'], resistances: ['闇'],
      sprite: 'assets/enemy-characters/dungeon2/requiemKnight.png', battleScale: 1.1,
      stats: { maxHp: 265, atk: 26, def: 17, mag: 8, mnd: 12, spd: 16 }, exp: 74, gold: { min: 34, max: 58 },
      dropTable: [
        { itemId: 'silentArmor', chance: .48 },
        { itemId: 'stoneShard',  chance: .28 },
        { itemId: 'moonstone',   chance: .12 }
      ],
      ai: [{ id: 'attack', name: '鎮魂の斬撃', kind: 'physical', weight: .45 }, { id: 'ratBite', name: '終曲の連撃', kind: 'physical', weight: .35 }, { id: 'clubSmash', name: '断ち切る一閃', kind: 'physical', weight: .20 }]
    },
    shatteredDiva: {
      id: 'shatteredDiva', name: 'シャッタード・ディーヴァ', enName: 'SHATTERED DIVA', dungeonId: 'dungeon2', floorId: 'd2f3',
      element: '闇', weaknesses: ['光'], resistances: ['闇', '精神'],
      sprite: 'assets/enemy-characters/dungeon2/shatteredDiva.png', battleScale: 1.05,
      stats: { maxHp: 225, atk: 17, def: 12, mag: 28, mnd: 18, spd: 18 }, exp: 72, gold: { min: 32, max: 56 },
      dropTable: [
        { itemId: 'silentNote',   chance: .46 },
        { itemId: 'moonstone',    chance: .20 },
        { itemId: 'spectralDust', chance: .24 }
      ],
      ai: [{ id: 'soulBolt', name: '砕けたアリア', kind: 'magic', weight: .50 }, { id: 'shadowBolt', name: '高音の破砕', kind: 'magic', weight: .32 }, { id: 'attack', name: '爪弾き', kind: 'physical', weight: .18 }]
    },
    silenceWarden: {
      id: 'silenceWarden', name: 'サイレンス・ウォーデン', enName: 'SILENCE WARDEN', dungeonId: 'dungeon2', floorId: 'd2f3',
      element: '闇', weaknesses: ['打', '雷'], resistances: ['闇', '斬'],
      sprite: 'assets/enemy-characters/dungeon2/silenceWarden.png', battleScale: 1.15,
      stats: { maxHp: 285, atk: 24, def: 18, mag: 14, mnd: 18, spd: 9 }, exp: 80, gold: { min: 38, max: 64 },
      dropTable: [
        { itemId: 'silentArmor', chance: .52 },
        { itemId: 'stoneShard',  chance: .32 },
        { itemId: 'moonstone',   chance: .16 }
      ],
      ai: [{ id: 'clubSmash', name: '静寂の制圧', kind: 'physical', weight: .45 }, { id: 'attack', name: '番人の一撃', kind: 'physical', weight: .35 }, { id: 'soulBolt', name: '沈黙の宣告', kind: 'magic', weight: .20 }]
    },

    versicrell: {
      id: 'versicrell', name: 'ヴェルシクレル', enName: 'VERSICRELL — SILVER CIRCLE', kind: 'boss', encounter: 1, dungeonId: 'dungeon3',
      bossRank: 'midBoss',
      title: '《銀環奏士》', role: 'MID BOSS / DEFENSE RHYTHM', roleDescription: '物理・魔法防御を楽章ごとに切り替える。BREAKを見極めて攻める。',
      element: '音 / 銀環', weaknesses: ['BREAK'], resistances: ['音'],
      sprite: 'assets/enemy-characters/versicrell/versicrell-form1-v1.png', spriteClass: 'versicrell-sprite versicrell-form1',
      stats: { maxHp: 3000, atk: 90, def: 84, mag: 96, mnd: 76, dex: 108, agi: 44, spd: 44 },
      exp: 360, gold: { min: 210, max: 300 },
      dropTable: [{ itemId: 'voidEssence', chance: .50 }, { itemId: 'phantomCore', chance: .60 }, { itemId: 'parentGiftGuitar', chance: .006 }],
      music: '音楽系/ダンジョン/ヴェルシクレルのテーマ1.mp3',
      musicPhase2: '音楽系/ダンジョン/ヴェルシクレルのテーマ2.mp3',
      form2: {
        name: '《銀環異奏体》ヴェルシクレル', title: 'GUITAR AXE // FALSE CADENCE',
        sprite: 'assets/enemy-characters/versicrell/versicrell-form2-v1.png', spriteClass: 'versicrell-sprite versicrell-form2',
        stats: { maxHp: 4400, atk: 124, def: 100, mag: 116, mnd: 92, dex: 132, agi: 56, spd: 54 }
      },
      specialAttacks: {
        noiseChord: { id: 'noiseChord', name: 'ノイズコード', kind: 'magic', debuffChance: .25 },
        preciousSky: { id: 'bossPreciousSky', name: 'プレシャススカイ', kind: 'magic', unavoidable: false },
        silverClaw: { id: 'silverClaw', name: '《銀爪》', kind: 'physical', accuracyModifier: .05 },
        axeChord: { id: 'axeChord', name: 'AXE CHORD', kind: 'physical', accuracyModifier: -.03 }
      },
      ai: [{ id: 'noiseChord', name: 'ノイズコード', kind: 'magic', weight: .45 }, { id: 'attack', name: '銀環の一撃', kind: 'physical', weight: .55 }]
    },

    seripes: {
      id: 'seripes', name: 'セリペス', enName: 'SERIPES — THE REPRISE KNIGHT', kind: 'boss', encounter: 1, dungeonId: 'dungeon3',
      bossRank: 'dungeonBoss', music: null,
      title: '第三奏卿《不落の反奏騎士》', role: 'BOSS / DEFENSE & REPRISE', roleDescription: '超耐久・防御・反奏型。攻撃タイプを切り替えて攻略する。',
      element: '聖 / 反奏', weaknesses: ['無属性'], resistances: ['物理', '魔'],
      sprite: 'assets/enemy-characters/seripes/seripes-battle-cutout.png', spriteClass: 'seripes-sprite',
      stats: { maxHp: 15200, atk: 144, def: 212, mag: 136, mnd: 188, dex: 104, agi: 60, spd: 60 },
      exp: 1200, gold: { min: 780, max: 1040 }, dropTable: [{ itemId: 'voidEssence', chance: 1.0 }, { itemId: 'phantomCore', chance: .75 }, { itemId: 'darkIron', chance: .90 }],
      specialAttacks: {
        repriseBlade: { id: 'repriseBlade', name: 'リプライズ・ブレイド', kind: 'physical', accuracyModifier: 0.05 },
        repriseMirror: { id: 'repriseMirror', name: 'リプライズ・ミラー', kind: 'magic', accuracyModifier: 0.05 },
        grandReprise: { id: 'grandReprise', name: 'グランド・リプライズ', kind: 'magic', unavoidable: true },
        repriseSword: { id: 'repriseSword', name: '反奏剣', kind: 'physical', accuracyModifier: 0 }
      },
      ai: [
        { id: 'repriseSword', name: '反奏剣', kind: 'physical', weight: .38 },
        { id: 'fortisGuard', name: 'フォルティス・ガード', kind: 'selfDefBuff', rate: .30, turns: 3, weight: .16 },
        { id: 'arcanaVeil', name: 'アルカナ・ヴェール', kind: 'selfMdefBuff', rate: .30, turns: 3, weight: .16 },
        { id: 'sanctuary', name: '聖域', kind: 'selfRegen', turns: 3, weight: .12 },
        { id: 'reprise', name: 'リプライズ', kind: 'reprise', weight: .18 }
      ]
    },

    myrthi: {
      id: 'myrthi', name: 'ミルティ', enName: 'MYRTHI', kind: 'boss', encounter: 1,
      title: '黒紅の双刃戦姫', element: '物理', weaknesses: ['魔法'],
      sprite: 'assets/enemy-characters/myrthi/battle-idle-v1.jpg', spriteClass: 'myrthi-sprite',
      stats: { maxHp: 1760, atk: 100, def: 50, mag: 60, mnd: 52, dex: 60, agi: 52, spd: 52 },
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
      specialAttacks: { deadlyRhythm: { id: 'deadlyRhythm', name: 'DEADLY RHYTHM', kind: 'physical', accuracyModifier: -0.05 } },
      ai: [
        { id: 'attack', name: '双刃連撃', kind: 'physical', accuracyModifier: -0.03, weight: .50 },
        { id: 'clubSmash', name: '乱舞の踏み込み', kind: 'physical', accuracyModifier: 0.05, weight: .30 },
        { id: 'ratBite', name: '黒紅の一閃', kind: 'physical', accuracyModifier: 0.10, weight: .20 }
      ]
    }
  }
};

// ══════════════════════════════════════════════════════════════
// 武器技の閃き難度 / 敵の閃き刺激値
// 定義をここへ追加するだけで戦闘側へ反映される。JOB固有技は対象外。
// ══════════════════════════════════════════════════════════════
(() => {
  const D = window.ARSENE_DATA;
  const weaponSparkDefinitions = {
    doubleSlash: { sparkRank: 5 }, tripleSlash: { sparkRank: 12 }, sonicBlade: { sparkRank: 22 }, afterimageBlade: { sparkRank: 40 },
    doubleClaw: { sparkRank: 7 }, vitalPierce: { sparkRank: 12 }, galeFist: { sparkRank: 20 }, shadowStitch: { sparkRank: 35, sparkFrom: { galeFist: 2, vitalPierce: .5 } },
    fireStorm: { sparkRank: 8 }, fireLance: { sparkRank: 12 }, inferno: { sparkRank: 24, sparkFrom: { fireStorm: 2, fireLance: .5 } }, meteor: { sparkRank: 42 },
    recorderChoking: { sparkRank: 7 }, guitarGigRecorder: { sparkRank: 15 }, whoseRecorder: { sparkRank: 22 }, cleaningRodStrike: { sparkRank: 40 },
    preciousSky: { sparkRank: 28 },
    shieldBash: { sparkRank: 4 }, guardImpact: { sparkRank: 7 }, magicRepulse: { sparkRank: 12 }, fortress: { sparkRank: 22 }, revengeForce: { sparkRank: 36 }
  };
  D.weaponSparkDefinitions = weaponSparkDefinitions;
  Object.entries(weaponSparkDefinitions).forEach(([id, definition]) => {
    const skill = D.skills[id];
    if (!skill || skill.source !== 'weapon') return;
    const basicIds = new Set(Object.values(D.basicAttackByWeaponType || {}));
    // 通常攻撃は全技へ一律×0.25。旧 prerequisite が通常攻撃でも正規派生×2にはしない。
    const direct = skill.prerequisiteSkill && !basicIds.has(skill.prerequisiteSkill) ? { [skill.prerequisiteSkill]: 2 } : {};
    Object.assign(skill, definition, { sparkFrom: { ...direct, ...(definition.sparkFrom || {}) } });
  });

  const enemySparkLevels = {
    shadowSlime: 2, soulMage: 6, ratThief: 6, goblin: 7, nightBat: 7, ghostBone: 9,
    noelFirstEncounter: 18, zenakado: 20,
    reverbSlime: 10, echoWraith: 12, nocturneChandelier: 12, chimeImp: 12, muteGargoyle: 13,
    hushMoth: 13, silentKnight: 14, fadingChorister: 14, nocturneBanshee: 15, mutedHound: 15,
    grimMetronome: 16, voidVioloncello: 16, pallidConductor: 17, noiselessLancer: 17,
    whisperVeil: 18, stoneChoir: 18, requiemKnight: 19, shatteredDiva: 20, silenceWarden: 21,
    silentHarmonist: 22, myrthi: 30,
    voidWatcher: 20, abyssalKnight: 21, voidGargoyle: 22, chaosWitch: 23, voidCantor: 23,
    ironChanter: 24, phantomEmperor: 24, arcaneChanter: 25, fortressGolem: 25,
    riftAssailant: 26, prismSentinel: 27, chainReaper: 28, voidAlchemist: 29,
    crimsonBehemoth: 30, voidOrchestra: 30, gildedHoarder: 32, merox: 34,
    versicrell: 35, seripes: 40
  };
  D.enemySparkLevels = enemySparkLevels;
  Object.entries(enemySparkLevels).forEach(([id, level]) => { if (D.enemies[id]) D.enemies[id].sparkLevel = level; });
})();
