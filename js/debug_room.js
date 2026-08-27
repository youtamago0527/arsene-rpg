// ══════════════════════════════════════════════════════════════════
// 或世盗 -ARSÈNE-  デバッグルーム（データ編集専用）
//
//  入り方 : 拠点 → 設定 → デバッグタブ → パスワード入力
//  用途   : モンスター・武器・防具・武器技・JOB・武器学・ダンジョン・
//           各種バランス値の 確認 / 調整 / 追加 / 削除。
//           UIの見た目調整は対象外（データだけを扱う）。
//  保存   : 変更は localStorage に「差分」として貯まり、次回起動時に
//           window.ARSENE_DATA へ自動適用される。
//           「書き出し」で差分JSONをコピーでき、それを data.js へ
//           正式に取り込めば全端末へ反映できる。
//
//  ★重要★ このファイルは data.js より後、game.js より前に読み込むこと。
//          （ゲーム起動前に差分を当てる必要があるため）
//
//  タブを増やしたいときは CATEGORIES に1行足すだけでよい。
//    key    : ARSENE_DATA のトップレベルキー（差分の保存単位）
//    list   : true = { id: {...} } のレコード集合（追加・削除できる）
//             false = 単一の設定オブジェクト（値の調整のみ）
//    path   : list:false のとき、key の中の入れ子を指定できる
//    filter : list:true のとき、表示するレコードを絞り込む
// ══════════════════════════════════════════════════════════════════
(() => {
  'use strict';

  const STORE_KEY = 'arsene-debug-overrides-v1';
  const UNLOCK_KEY = 'arsene-debug-unlocked-v1';

  const isPassive = s => s.kind === 'passive' || /^p_/.test(s.id || '');
  const isJobSkill = s => s.source === 'job' || !!s.jobId;

  // ── 項目名の日本語表示 ────────────────────────────────────────
  // ここに無いキーは英字のまま出る。増やしたいときは1行足すだけ。
  const LABELS = {
    id: 'ID', name: '名前', nameEn: '英語名', description: '説明', enName: '英語名',
    stats: '能力', maxHp: '最大HP', maxMp: '最大MP', atk: '攻撃', def: '防御',
    mag: '魔力', mnd: '精神', spd: '素早さ', str: '力', vit: '体力', agi: '素早さ',
    dex: '器用さ', luk: '運', exp: '経験値', gold: 'GOLD', min: '最小', max: '最大',
    dropTable: 'ドロップ', itemId: 'アイテム', chance: '確率(0〜1)', count: '個数',
    ai: '行動パターン', weight: '出現比率', kind: '種別',
    element: '属性', weaknesses: '弱点', resistances: '耐性',
    sprite: '画像パス', battleScale: '表示倍率', dungeonId: 'ダンジョン', floorId: '階層',
    power: '威力', mp: '消費MP', hits: 'ヒット数', target: '対象', aoe: '全体攻撃',
    damageType: 'ダメージ種別', weaponType: '武器種', randomTarget: 'ランダム対象',
    prerequisiteSkill: '旧派生元（並び順互換）', sparkRank: '閃き難度', sparkFrom: '派生元ごとの倍率', sparkExclusive: '指定派生限定', sparkLevel: '敵の閃き刺激値',
    powerText: '威力表示', effectText: '効果表示', source: '入手元', jobId: 'JOB', type: 'タイプ',
    slot: '装備部位', rarity: 'レア度', category: '分類',
    attackPower: '攻撃力', defensePower: '防御力', magicAttackPower: '魔法攻撃力', magicDefensePower: '魔法防御力',
    bonuses: '能力ボーナス', effects: '特殊効果', criticalRateBonus: '会心率+',
    physicalDamagePercent: '物理ダメージ+%', fireDamagePercent: '炎ダメージ+%',
    magicDamageReductionPercent: '被魔法ダメージ-%', healBonusPercent: '回復量+%',
    materials: '必要素材', resultItemId: '完成品', resultCount: '個数',
    craftCategory: '分類', materialUnlockId: '解放素材',
    floors: '階層', winsToClear: 'クリアに必要な勝利数', encounterProgression: '出現テーブル',
    minWins: 'この勝利数から', pool: '出現する敵', unlockCondition: '解放条件',
    recommendedLevel: '推奨Lv', background: '背景', thumbnail: 'サムネイル', music: 'BGM',
    successRates: '成功率(+1から順に)', goldCosts: '費用(+1から順に)', maxLevel: '最大強化', powerRate: '1段階あたりの上昇率',
    attackScale: '攻撃倍率', defenseK: '防御の効きにくさK', base: '基準値', growth: '伸び', curve: 'カーブ',
    critical: '会心', luckRate: '運の寄与', multiplier: '倍率', variance: 'ばらつき',
    playerVariance: '味方ダメージのばらつき', enemyVariance: '敵ダメージのばらつき',
    enemyPhysical: '敵の物理', enemyMagic: '敵の魔法',
    dexRate: '器用さの寄与', enemySpdRate: '敵素早さの寄与',
    scaling: '参照能力', powerKey: '加算する装備能力',
    weaponExpTable: '武器学の必要EXP', weaponExpBase: '必要EXP基礎値', weaponExpPerLevel: 'Lvごとの必要EXP増加', weaponMasteryDamagePerLevel: '1Lvごとの最終ダメージ倍率',
    baseHpGrowthRate: 'HP成長率', baseMpGrowthRate: 'MP成長率',
    hpGrowthAmount: 'HP上昇量', mpGrowthAmount: 'MP上昇量',
    jobHpGrowthBonus: 'JOB別HP成長+', jobMpGrowthBonus: 'JOB別MP成長+',
    jobGrowthPerLevel: 'JOB Lvあたりの成長', sparkRateTable: 'Spark Score別の基本閃き率',
    dungeon2BossWins: 'D2ボス解放に必要な勝利数', bossRematchWins: 'ボス再戦に必要な周回数',
    debugPassword: 'デバッグPW', healOnBattleStart: '戦闘開始時に全回復',
    noelEncounterWins: 'ノエル出現の勝利数', zenakadoEncounterWins: 'ゼナカド出現の勝利数',
    starterWeaponId: '初期武器', unlockFlag: '解放フラグ', damageStats: '参照能力',
    devOnly: '開発専用', futureOnly: '将来予約', contentState: '実装状態', balanceState: '数値状態',
    releaseFlag: '正式解放フラグ', releaseFlags: 'D4〜D7正式解放', roadmap: '後半ロードマップ', d3ToD4Transition: 'D3→D4転生導線',
    bossId: 'ボスID', origin: '音楽用語', title: '異名', battleTheme: '戦闘テーマ', mechanics: '固有ギミック', designNote: '設計メモ',
    scoreId: 'SCORE ID', proofItemId: 'JOBの証', unlockJobId: '解放JOB', unlockWeaponMastery: '解放武器学',
    attackScaling: '攻撃参照', simulationAssumptions: 'Monte Carlo前提', activeDebuffs: '維持DEBUFF数', maintainDots: '維持DOT', maintainSignatureBuff: 'MASTER効果維持', chooseCurrentWeakness: '弱点属性を選択', hpCostEnabled: 'HP消費を有効化',
    dotRules: 'DOT共通ルール', ignoresDefense: '防御無視', canCritical: '会心発生', timing: '発生タイミング',
    bossDefault: 'ボス標準対応', bossResistanceAllowed: 'ボス耐性を許可', note: '注記',
    magicElements: '魔法属性', ids: '属性ID', multipliers: '属性倍率',
    strongResist: '強耐性', resist: '耐性', normal: '通常', weak: '弱点', greatWeak: '大弱点', specialMin: '特殊最小', specialMax: '特殊最大',
    subtitle: '楽曲名', artist: '関連ボス', use: '使用先', unlockBoss: '解放ボス'
  };
  const labelOf = k => LABELS[k] || k;

  // 参照先が決まっている項目は、打ち間違い防止のため選択式にする
  function optionsFor(key) {
    const D = window.ARSENE_DATA || {};
    const ids = o => Object.keys(o || {});
    switch (key) {
      case 'itemId': case 'resultItemId': case 'materialUnlockId': case 'starterWeaponId':
        return [...ids(D.items), ...ids(D.weapons), ...ids(D.armors), ...ids(D.accessories)];
      case 'prerequisiteSkill': return ids(D.skills);
      case 'jobId': return ids(D.jobs);
      case 'weaponType': return (D.weaponTypes || []).map(t => t.id);
      case 'slot': return (D.equipmentSlots || []).map(s => s.id || s);
      case 'dungeonId': return (D.dungeons || []).map(d => d.id);
      case 'damageType': return ['physical', 'magical'];
      case 'target': return ['single', 'all', 'self', 'ally'];
      case 'rarity': return ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      case 'craftCategory': return ['weapon', 'armor'];
      default: return null;
    }
  }
  // 敵IDを選ぶ欄（出現テーブルの pool 内の id）
  const enemyIds = () => Object.keys((window.ARSENE_DATA || {}).enemies || {});

  // ── 入力欄に出さない項目 ──────────────────────────────────────
  // 書き換えるとゲームが壊れる／画像が消えるもの。
  //   ・レコードのID       … 変えるとリネームではなく複製になり参照が切れる
  //   ・画像や音のパス      … 存在しないパスにすると表示・再生が壊れる
  //   ・コード分岐用の文字列 … 想定外の値にすると技や解放条件が動かなくなる
  // どうしても触りたいときは「JSONで編集」に切り替えれば出てくる。
  const HIDDEN_KEYS = new Set([
    'sprite', 'battleSprite', 'weaponSprite', 'image', 'thumbnail', 'background', 'music',
    'attackMotion', 'portraitMode', 'imageFocus', 'battleScale', 'theme',
    'saveKey', 'debugPassword',
    'unlockFlag', 'unlockCondition',
    'kind', 'source', 'type', 'powerKey', 'craftCategory'
  ]);
  // path 単位で隠すもの（トップレベルのIDと階層IDのみ。pool内のIDは選択式なので出す）
  const isHiddenPath = (path, key) => {
    if (HIDDEN_KEYS.has(key)) return true;
    if (key === 'id') return !/\.pool\.\d+\.id$/.test(path); // 出現テーブルの敵IDだけは編集可
    if (key === 'type' || key === 'effect') return false;
    if (/^effect\.type$/.test(path)) return true;
    return false;
  };

  const CATEGORIES = [
    { g: '敵', key: 'enemies', label: 'モンスター', list: true, hint: 'stats / exp / gold / dropTable / ai' },

    { g: '装備', key: 'weapons', label: '武器', list: true, hint: 'weaponType / attackPower / magicAttackPower / effects' },
    { g: '装備', key: 'armors', label: '防具', list: true, hint: 'slot / defensePower / magicDefensePower / effects' },
    { g: '装備', key: 'accessories', label: 'アクセサリ', list: true, hint: 'bonuses / effects' },
    { g: '装備', key: 'items', label: 'アイテム・素材', list: true, hint: '消費・素材・キーアイテム' },
    { g: '装備', key: 'recipes', label: '工房レシピ', list: true, hint: 'materials / gold / materialUnlockId' },
    { g: '装備', key: 'enchantTable', label: '強化', list: false, hint: '成功率 / 費用 / powerRate（+1あたりの上昇率）' },

    { g: '技', key: 'skills', label: '通常攻撃', list: true, hint: '武器種ごとの「たたかう」', filter: s => s.kind === 'weapon' && !s.prerequisiteSkill },
    { g: '技', key: 'skills', label: '武器技（閃き）', list: true, hint: 'sparkRank / sparkFrom / sparkExclusive', filter: s => s.source === 'weapon' && s.sparkRank != null },
    { g: '技', key: 'skills', label: 'JOB固有技', list: true, hint: 'jobId / power / mp / effect', filter: s => isJobSkill(s) && !isPassive(s) },
    { g: '技', key: 'skills', label: 'パッシブ', list: true, hint: '常時効果', filter: isPassive },
    { g: '技', key: 'skills', label: 'その他の技', list: true, hint: '上記に入らないもの', filter: s => !s.prerequisiteSkill && !isJobSkill(s) && !isPassive(s) && s.kind !== 'weapon' },

    { g: 'JOB', key: 'jobs', label: 'JOB定義', list: true, hint: '名前 / 解放条件 / 習得パッシブ' },
    { g: 'JOB', key: 'growthBalance', label: 'JOB成長値', list: false, path: 'jobGrowthPerLevel', hint: 'JOB Lvごとの基礎能力上昇（1レベルあたり）' },
    { g: 'JOB', key: 'jobExpTable', label: 'JOB必要EXP', list: false, hint: 'Lvごとの必要JEXP' },
    { g: 'JOB', key: 'jobCommandAbilities', label: 'JOBコマンド', list: false, hint: 'JOBごとのコマンド表示' },

    { g: '武器学', key: 'weaponTypes', label: '武器種', list: true, hint: 'id / name / 初期武器 / 解放フラグ', arrayIdKey: 'id' },
    { g: '武器学', key: 'weaponScaling', label: '武器倍率', list: false, hint: '武器種→どの能力を攻撃力に変換するか' },
    { g: '武器学', key: 'growthBalance', label: '武器学の伸び', list: false, path: 'weaponExpTable', hint: 'base / perLevel（必要EXP = base + Lv×perLevel）' },
    { g: '武器学', key: 'basicAttackByWeaponType', label: '武器種→通常攻撃', list: false, hint: '武器種ごとの通常攻撃ID' },
    { g: '武器学', key: 'weaponArtsCommand', label: '技コマンド名', list: false, hint: '剣技・拳技・魔法などの表示名' },

    { g: 'ダンジョン', key: 'dungeons', label: 'ダンジョン・階層', list: true, hint: 'floors / winsToClear / encounterProgression', arrayIdKey: 'id' },
    { g: 'ダンジョン', key: 'battleProgression', label: 'D1の進行', list: false, hint: 'ノエル / ゼナカドの出現勝利数' },
    { g: 'ダンジョン', key: 'settings', label: '解放条件など', list: false, hint: 'ボス再戦回数 / D2ボス解放 / デバッグPW' },

    // 通常プレイヤーUIには一切接続しない、D4〜D7の先行予約データ。
    // future_data.js が登録した内容だけをここから確認・調整できる。
    { g: '将来予約（DEV）', key: 'futureBosses', label: 'D4〜D7 七奏卿', list: true, hint: 'ボス能力 / 戦闘テーマ / 固有ギミック（正式ダンジョン未実装）' },
    { g: '将来予約（DEV）', key: 'futureBossRewards', label: '撃破報酬予約', list: true, hint: 'SCORE / JOBの証 / 解放JOB / 武器学' },
    { g: '将来予約（DEV）', key: 'musicScores', label: '予約SCORE', list: true, hint: 'D4〜D7のPRIVATE MODE用SCORE', filter: score => score.devOnly === true && score.contentState === 'reserved' },
    { g: '将来予約（DEV）', key: 'futureContent', label: '正式解放フラグ', list: false, path: 'releaseFlags', hint: '予約データの正式公開状態。通常ゲームへの接続は将来実装時に行う' },
    { g: '将来予約（DEV）', key: 'futureContent', label: '後半ロードマップ', list: false, path: 'roadmap', hint: 'D4〜D7 / 七奏卿 / JOB / 武器 / 武器学の対応' },
    { g: '将来予約（DEV）', key: 'futureContent', label: 'D3→D4転生導線', list: false, path: 'd3ToD4Transition', hint: 'D4正式実装時に接続する輪廻のアルカナ×2とセリペス台詞' },
    { g: '将来予約（DEV）', key: 'futureContent', label: 'DOT共通ルール', list: false, path: 'dotRules', hint: 'D5以降で使用するDOTの共通予約仕様' },
    { g: '将来予約（DEV）', key: 'futureContent', label: '五属性・倍率', list: false, path: 'magicElements', hint: '炎 / 氷 / 雷 / 光 / 闇と耐性・弱点倍率' },

    { g: 'バランス', key: 'combatBalance', label: '戦闘計算', list: false, hint: '会心率 / 敵ダメージ式 / ばらつき' },
    { g: 'バランス', key: 'guardianBalance', label: '守護士・RESONANCE', list: false, hint: '共鳴の基礎率 / 転生補正 / 上限 / パッシブ補正' },
    { g: 'バランス', key: 'growthBalance', label: '成長全体', list: false, hint: 'HP/MP成長率 / 閃き率 / 特性倍率' },
    { g: 'バランス', key: 'accuracy', label: '命中率', list: false, hint: '器用さ→命中（隠しステータス）' },
    { g: 'バランス', key: 'defenseScaling', label: '防御の参照', list: false, hint: '物理=体力+防御力 / 魔法=精神+魔法防御力' }
  ];

  // ── 差分ストア ────────────────────────────────────────────────
  const loadOverrides = () => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; }
  };
  const saveOverrides = o => localStorage.setItem(STORE_KEY, JSON.stringify(o));

  // 差分を ARSENE_DATA へ適用する。
  //   { enemies: { shadowSlime: {...} } }        … 上書き（レコード丸ごと差し替え）
  //   { enemies: { __deleted: ['ghostBone'] } }  … 削除
  //   { combatBalance: {...} }                   … 単一オブジェクトへマージ
  function applyOverrides(data, ov) {
    for (const [key, patch] of Object.entries(ov || {})) {
      const target = data[key];
      if (target == null) continue;
      const isRecordSet = Array.isArray(target) || CATEGORIES.some(c => c.key === key && c.list);
      if (!isRecordSet) { Object.assign(target, patch); continue; }
      if (Array.isArray(target)) {
        for (const [id, rec] of Object.entries(patch)) {
          if (id === '__deleted') continue;
          const i = target.findIndex(x => x.id === id);
          if (i >= 0) target[i] = rec; else target.push(rec);
        }
        (patch.__deleted || []).forEach(id => {
          const i = target.findIndex(x => x.id === id);
          if (i >= 0) target.splice(i, 1);
        });
      } else {
        for (const [id, rec] of Object.entries(patch)) {
          if (id === '__deleted') continue;
          target[id] = rec;
        }
        (patch.__deleted || []).forEach(id => { delete target[id]; });
      }
    }
  }

  // ★起動時に差分を適用（game.js が読む前に済ませる）
  const bootOverrides = loadOverrides();
  if (window.ARSENE_DATA && Object.keys(bootOverrides).length) {
    try { applyOverrides(window.ARSENE_DATA, bootOverrides); console.log('[debug] 差分を適用しました', bootOverrides); }
    catch (e) { console.warn('[debug] 差分の適用に失敗', e); }
  }

  // ── 見た目（デバッグ用なので最小限） ──────────────────────────
  const CSS = `
  #dbg-root{position:fixed;inset:0;z-index:99999;display:none;background:#05070c;color:#cfe0f2;font:13px/1.6 system-ui,sans-serif}
  #dbg-root.open{display:grid;grid-template-rows:auto 1fr auto}
  #dbg-root *{box-sizing:border-box}
  .dbg-bar{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#0a1120;border-bottom:1px solid #1d3a5c}
  .dbg-bar b{font-size:14px;letter-spacing:.1em;color:#5fc6ff}
  .dbg-bar small{color:#6a7f96}
  .dbg-bar .sp{flex:1}
  .dbg-bar button{padding:6px 12px;background:#122744;color:#cfe0f2;border:1px solid #2f6ea8;border-radius:4px;cursor:pointer;font-size:12px}
  .dbg-bar button:hover{background:#1a3a63}
  .dbg-bar button.danger{border-color:#a8422f;color:#ff9d86}
  .dbg-body{display:grid;grid-template-columns:168px 240px 1fr;min-height:0}
  @media(max-width:820px){.dbg-body{grid-template-columns:1fr;grid-template-rows:auto auto 1fr}.dbg-cat,.dbg-list{max-height:22vh}.dbg-edit{min-height:44vh}}
  .dbg-col{min-height:0;overflow:auto;border-right:1px solid #142238;padding:8px}
  .dbg-col h4{margin:10px 0 5px;font-size:10px;letter-spacing:.14em;color:#5d7a99}
  .dbg-col h4:first-child{margin-top:0}
  .dbg-cat button,.dbg-list button{display:block;width:100%;text-align:left;padding:6px 8px;margin-bottom:3px;background:#0b1526;color:#a8c0d8;border:1px solid #16283f;border-radius:3px;cursor:pointer;font-size:12px}
  .dbg-cat button.on,.dbg-list button.on{background:#153252;color:#9fd8ff;border-color:#2f6ea8}
  .dbg-list button.edited{border-color:#c8a04a;color:#ffdc94}
  .dbg-list button.edited:after{content:' ●';color:#c8a04a}
  .dbg-search{width:100%;padding:6px 8px;margin-bottom:6px;background:#080e1a;color:#cfe0f2;border:1px solid #1d3a5c;border-radius:3px;font-size:12px}
  .dbg-edit{display:flex;flex-direction:column;gap:8px;padding:10px;min-height:0}
  .dbg-edit>textarea{flex:1;min-height:200px;width:100%;padding:10px;background:#060b14;color:#bfe3ff;border:1px solid #1d3a5c;border-radius:4px;font:12px/1.5 ui-monospace,Consolas,monospace;resize:none;white-space:pre;overflow:auto}
  .dbg-edit>textarea.bad{border-color:#c0392b}
  /* 入力欄モード */
  #dbg-form{flex:1;min-height:0;overflow:auto;padding:2px 4px 4px 0}
  .dbg-idline{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #16283f;font-size:11px;color:#67809a}
  .dbg-idline code{color:#9fd8ff;font-size:12px}
  .dbg-f{display:grid;grid-template-columns:150px 1fr;align-items:center;gap:8px;margin-bottom:5px}
  .dbg-f>span{font-size:12px;color:#9db6cf;text-align:right}
  .dbg-f>span small{display:block;font-size:9px;color:#5d7a99}
  .dbg-f input[type=text],.dbg-f input[type=number],.dbg-f select,.dbg-f textarea{width:100%;padding:5px 7px;background:#060b14;color:#dbe9f7;border:1px solid #1d3a5c;border-radius:3px;font-size:13px}
  .dbg-f input[type=number]{font-variant-numeric:tabular-nums}
  .dbg-f input[type=checkbox]{width:18px;height:18px;justify-self:start}
  .dbg-f-wide{grid-template-columns:150px 1fr}
  .dbg-f textarea{resize:vertical;font-family:inherit}
  .dbg-group{margin:8px 0;padding:8px 10px;border:1px solid #16283f;border-radius:4px}
  .dbg-group>legend{padding:0 6px;font-size:11px;letter-spacing:.08em;color:#5fc6ff}
  .dbg-group>legend small{margin-left:6px;color:#5d7a99}
  .dbg-row{position:relative;display:grid;grid-template-columns:20px 1fr 26px;align-items:start;gap:6px;margin-bottom:6px;padding:6px;background:#080f1c;border:1px solid #142238;border-radius:3px}
  .dbg-row>b{font-size:10px;color:#5d7a99;padding-top:6px}
  .dbg-row-del{width:24px;height:24px;background:#2a1216;color:#ff9d86;border:1px solid #6b2a2a;border-radius:3px;cursor:pointer;font-size:14px;line-height:1}
  .dbg-row-add{width:100%;padding:6px;background:#0d1c30;color:#8fc4f0;border:1px dashed #2f6ea8;border-radius:3px;cursor:pointer;font-size:12px}
  @media(max-width:560px){.dbg-f,.dbg-f-wide{grid-template-columns:1fr}.dbg-f>span{text-align:left}}
  .dbg-actions{display:flex;flex-wrap:wrap;gap:8px}
  .dbg-actions button{padding:7px 14px;background:#122744;color:#cfe0f2;border:1px solid #2f6ea8;border-radius:4px;cursor:pointer;font-size:12px}
  .dbg-actions button.primary{background:#1c4b7d;border-color:#3f8fd0}
  .dbg-actions button.danger{border-color:#a8422f;color:#ff9d86}
  .dbg-msg{min-height:20px;font-size:12px;color:#8fd6a8}
  .dbg-msg.err{color:#ff9d86}
  .dbg-hint{font-size:11px;color:#67809a}
  .dbg-foot{padding:8px 12px;background:#0a1120;border-top:1px solid #1d3a5c;font-size:11px;color:#67809a}
  .dbg-spark{position:absolute;inset:46px 8px 36px;z-index:4;display:grid;grid-template-rows:auto 1fr;background:#050a12;border:1px solid #4c3b9d;box-shadow:0 0 30px #251c66cc}
  .dbg-spark[hidden]{display:none}
  .dbg-spark-head{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#100d29;border-bottom:1px solid #4c3b9d}
  .dbg-spark-head b{color:#b8a7ff;letter-spacing:.12em}.dbg-spark-head span{color:#7388a4;font-size:11px}.dbg-spark-head button{margin-left:auto;padding:5px 12px;background:#20194b;color:#ddd6ff;border:1px solid #6553bd;border-radius:4px}
  .dbg-spark-body{overflow:auto;padding:12px}.dbg-spark-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
  .dbg-spark-grid label{display:grid;gap:4px;color:#8da2bd;font-size:11px}.dbg-spark-grid select,.dbg-spark-grid input{width:100%;padding:8px;background:#070d18;color:#dbe9f7;border:1px solid #263f60;border-radius:4px}
  .dbg-spark-result{margin-top:12px;padding:12px;background:#080f20;border:1px solid #3d6b99;border-radius:5px}.dbg-spark-result h3{margin:0 0 9px;color:#69d8ff;font-size:16px}.dbg-spark-result-grid{display:grid;grid-template-columns:1fr auto;gap:5px 12px}.dbg-spark-result-grid span{color:#8fa5bd}.dbg-spark-result-grid b{color:#eef8ff;text-align:right}.dbg-spark-rate{display:block;margin-top:10px;padding:9px;text-align:center;background:#15104a;color:#d8ceff;font-size:18px;border:1px solid #6754c6}.dbg-spark-formula{margin:8px 0 0;color:#7089a5;font:11px/1.6 ui-monospace,Consolas,monospace}
  .dbg-weapon-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:720px;margin:auto}
  .dbg-weapon-grid button{display:grid;gap:3px;min-height:82px;padding:12px;text-align:left;background:#091526;color:#dbeeff;border:1px solid #2b5f91;border-radius:5px;cursor:pointer}
  .dbg-weapon-grid button:hover{background:#102b49;border-color:#62b9ff}.dbg-weapon-grid button.active{border-color:#bfa65b;box-shadow:0 0 14px #967a3577}
  .dbg-weapon-grid button b{color:#7ed2ff;font-size:15px}.dbg-weapon-grid button span{color:#a9bfd3}.dbg-weapon-grid button small{color:#647d97}
  .dbg-weapon-all{display:block;width:min(100%,720px);margin:12px auto 0;padding:10px;background:#20194b;color:#ddd6ff;border:1px solid #6553bd;border-radius:5px;cursor:pointer}
  .dbg-weapon-note{max-width:720px;margin:12px auto;color:#7189a1;font-size:11px}
  @media(max-width:560px){.dbg-spark{inset:46px 4px 36px}.dbg-spark-grid{grid-template-columns:1fr}}
  @media(max-width:560px){.dbg-weapon-grid{grid-template-columns:1fr}.dbg-weapon-grid button{min-height:66px}}
  `;

  let state = { cat: 0, id: null, raw: false, draft: null };

  // ══ フォーム描画 ════════════════════════════════════════════
  // レコードの形からそのまま入力欄を組み立てる。
  //   数値 → number入力 ／ 真偽 → チェック ／ 参照ID → 選択式
  //   配列(数値・文字) → カンマ区切りの1行入力
  //   配列(オブジェクト) → 行ごとの枠＋「行を追加 / 削除」
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isPlainObj = v => v && typeof v === 'object' && !Array.isArray(v);

  function fieldHTML(path, key, value) {
    const label = labelOf(key);
    const p = esc(path);
    if (typeof value === 'boolean')
      return `<label class="dbg-f"><span>${esc(label)}</span><input type="checkbox" data-path="${p}" data-t="bool" ${value ? 'checked' : ''}></label>`;
    if (typeof value === 'number' || (value === null && /Rate|Power|count|chance|weight|Lv|Level|min|max|exp|gold|mp|hits|power/i.test(key)))
      return `<label class="dbg-f"><span>${esc(label)}</span><input type="number" step="any" data-path="${p}" data-t="num" value="${value ?? ''}" placeholder="${value === null ? '未設定' : ''}"></label>`;
    const opts = optionsFor(key) || (key === 'id' && /\.pool\.\d+\.id$/.test(path) ? enemyIds() : null);
    if (opts) {
      const cur = value ?? '';
      const list = opts.includes(cur) || cur === '' ? opts : [cur, ...opts];
      return `<label class="dbg-f"><span>${esc(label)}</span><select data-path="${p}" data-t="str">${
        list.map(o => `<option value="${esc(o)}" ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')
      }<option value="" ${cur === '' ? 'selected' : ''}>（なし）</option></select></label>`;
    }
    const long = typeof value === 'string' && value.length > 40;
    if (long) return `<label class="dbg-f dbg-f-wide"><span>${esc(label)}</span><textarea rows="2" data-path="${p}" data-t="str">${esc(value)}</textarea></label>`;
    return `<label class="dbg-f"><span>${esc(label)}</span><input type="text" data-path="${p}" data-t="str" value="${esc(value ?? '')}"></label>`;
  }

  function nodeHTML(path, key, value, depth) {
    if (isHiddenPath(path, key)) return '';
    if (Array.isArray(value)) {
      if (!value.length || !isPlainObj(value[0])) {
        // 数値・文字の配列はカンマ区切りで扱う
        return `<label class="dbg-f dbg-f-wide"><span>${esc(labelOf(key))}<small>カンマ区切り</small></span>
          <input type="text" data-path="${esc(path)}" data-t="csv" value="${esc(value.join(', '))}"></label>`;
      }
      const rows = value.map((v, i) => `<div class="dbg-row"><b>${i + 1}</b>
        <div class="dbg-row-body">${Object.entries(v).map(([k2, v2]) => nodeHTML(`${path}.${i}.${k2}`, k2, v2, depth + 1)).join('')}</div>
        <button class="dbg-row-del" data-del-row="${esc(path)}.${i}" title="この行を削除">×</button></div>`).join('');
      return `<fieldset class="dbg-group"><legend>${esc(labelOf(key))}<small>${value.length}件</small></legend>
        ${rows}<button class="dbg-row-add" data-add-row="${esc(path)}">＋ 行を追加</button></fieldset>`;
    }
    if (isPlainObj(value)) {
      const inner = Object.entries(value).map(([k2, v2]) => nodeHTML(`${path}.${k2}`, k2, v2, depth + 1)).join('');
      if (!inner.trim()) return ''; // 中身が全部非表示なら枠ごと出さない
      return `<fieldset class="dbg-group"><legend>${esc(labelOf(key))}</legend>${inner}</fieldset>`;
    }
    return fieldHTML(path, key, value);
  }

  function formHTML(rec) {
    if (!isPlainObj(rec)) return '<p class="dbg-hint">この項目はJSON編集のみ対応です。</p>';
    const body = Object.entries(rec).map(([k, v]) => nodeHTML(k, k, v, 0)).join('');
    const head = rec.id ? `<div class="dbg-idline">ID <code>${esc(rec.id)}</code><small>IDや画像パスなど、変えると壊れる項目は出していません</small></div>` : '';
    return head + (body.trim() || '<p class="dbg-hint">編集できる項目がありません。</p>');
  }

  // ── パス操作 ──
  const getPath = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function setPath(o, path, val) {
    const ks = path.split('.'); const last = ks.pop();
    let cur = o;
    for (const k of ks) { if (cur[k] == null) cur[k] = /^\d+$/.test(k) ? [] : {}; cur = cur[k]; }
    cur[last] = val;
  }
  function delPath(o, path) {
    const ks = path.split('.'); const last = ks.pop();
    const parent = ks.length ? getPath(o, ks.join('.')) : o;
    if (Array.isArray(parent)) parent.splice(+last, 1); else delete parent[last];
  }

  // フォームの入力値をレコードへ反映して返す
  function collectForm() {
    const rec = JSON.parse(JSON.stringify(state.draft));
    document.querySelectorAll('#dbg-form [data-path]').forEach(el => {
      const path = el.dataset.path, t = el.dataset.t;
      let v;
      if (t === 'bool') v = el.checked;
      else if (t === 'num') v = el.value === '' ? null : Number(el.value);
      else if (t === 'csv') {
        const parts = el.value.split(',').map(s => s.trim()).filter(s => s !== '');
        v = parts.map(s => (s !== '' && !isNaN(s) ? Number(s) : s));
      } else v = el.value === '' ? null : el.value;
      setPath(rec, path, v);
    });
    return rec;
  }

  function css() {
    if (document.getElementById('dbg-css')) return;
    const s = document.createElement('style'); s.id = 'dbg-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── データ取得ヘルパ ──────────────────────────────────────────
  const D = () => window.ARSENE_DATA || {};
  const cur = () => CATEGORIES[state.cat] || CATEGORIES[0];

  // ── Spark率計算機 ──────────────────────────────────────────
  // 現在の武器学・キャラ特性・装備補正まで含め、実戦と同じ式を表示する。
  function sparkBaseRate(score) {
    return ((D().growthBalance?.sparkRateTable || []).find(row => score >= row.minScore) || { rate: 0 }).rate || 0;
  }
  function sparkMultiplier(skill, sourceId) {
    const game = window.arseneGame;
    if (game?.sparkSourceMultiplier) return game.sparkSourceMultiplier(skill, sourceId);
    const cfg = D().growthBalance?.sparkSourceMultipliers || { basic: .25, related: .5, direct: 2 };
    if (skill.sparkFrom?.[sourceId] != null) return skill.sparkFrom[sourceId];
    if (skill.sparkExclusive) return 0;
    if (Object.values(D().basicAttackByWeaponType || {}).includes(sourceId)) return cfg.basic ?? .25;
    return D().skills?.[sourceId]?.source === 'weapon' ? (cfg.related ?? .5) : 0;
  }
  function refreshSparkSources(reset = false) {
    const skillId = document.getElementById('dbg-spark-skill')?.value, skill = D().skills?.[skillId];
    const select = document.getElementById('dbg-spark-source'); if (!select || !skill) return;
    const basicId = D().basicAttackByWeaponType?.[skill.weaponType];
    const sources = [basicId, ...Object.values(D().skills || {}).filter(s => s.source === 'weapon' && s.weaponType === skill.weaponType && s.id !== skill.id).map(s => s.id)].filter((id, i, a) => id && a.indexOf(id) === i);
    const directId = Object.entries(skill.sparkFrom || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    const keep = !reset && sources.includes(select.value) ? select.value : (directId || basicId || sources[0]);
    select.innerHTML = sources.map(id => `<option value="${esc(id)}" ${id === keep ? 'selected' : ''}>${esc(D().skills?.[id]?.name || id)}</option>`).join('');
    const level = document.getElementById('dbg-spark-mastery'), current = window.arseneGame?.profile?.weaponMastery?.[skill.weaponType]?.level;
    if (level && reset) level.value = current || 1;
  }
  function updateSparkCalculator(resetSource = false) {
    refreshSparkSources(resetSource);
    const skill = D().skills?.[document.getElementById('dbg-spark-skill')?.value];
    const enemy = D().enemies?.[document.getElementById('dbg-spark-enemy')?.value];
    const sourceId = document.getElementById('dbg-spark-source')?.value;
    const mastery = Math.max(1, Number(document.getElementById('dbg-spark-mastery')?.value) || 1);
    const out = document.getElementById('dbg-spark-result'); if (!skill || !enemy || !out) return;
    const enemyLevel = enemy.sparkLevel || 1;
    const score = mastery + enemyLevel - (skill.sparkRank || 0), base = sparkBaseRate(score), mult = sparkMultiplier(skill, sourceId);
    const game = window.arseneGame, trait = game?.traitSparkMult?.(skill.weaponType) || 1, bonus = game?.sparkRateBonus?.(skill.weaponType, skill) || 0;
    const finalRate = Math.min(1, Math.max(0, base * mult * trait + bonus));
    out.innerHTML = `<h3>${esc(skill.name)}　Spark Rank ${skill.sparkRank}</h3><div class="dbg-spark-result-grid"><span>敵</span><b>${esc(enemy.name)} / Spark Lv.${enemyLevel}</b><span>武器学</span><b>${esc(skill.weaponType)} Lv.${mastery}</b><span>使用技</span><b>${esc(D().skills?.[sourceId]?.name || sourceId)}</b><span>基本閃き率</span><b>${(base * 100).toFixed(2)}%</b><span>派生補正</span><b>×${mult.toFixed(2)}</b><span>キャラ特性</span><b>×${trait.toFixed(2)}</b><span>装備・パッシブ加算</span><b>+${(bonus * 100).toFixed(2)}%</b></div><strong class="dbg-spark-rate">現在の閃き率 ${(finalRate * 100).toFixed(2)}%</strong><p class="dbg-spark-formula">Score = ${mastery} + ${enemyLevel} - ${skill.sparkRank} = ${score}<br>Final = ${(base * 100).toFixed(2)}% × ${mult.toFixed(2)} × ${trait.toFixed(2)} + ${(bonus * 100).toFixed(2)}%</p>`;
  }
  function openSparkCalculator() {
    const panel = document.getElementById('dbg-spark-panel'); if (!panel) return;
    const skills = Object.values(D().skills || {}).filter(s => s.source === 'weapon' && s.sparkRank != null).sort((a, b) => a.weaponType.localeCompare(b.weaponType) || a.sparkRank - b.sparkRank);
    const currentEnemy = window.arseneGame?.enemies?.find(e => e.alive)?.id;
    document.getElementById('dbg-spark-skill').innerHTML = skills.map(s => `<option value="${esc(s.id)}">${esc(s.name)} [${esc(s.weaponType)} R${s.sparkRank}]</option>`).join('');
    document.getElementById('dbg-spark-enemy').innerHTML = Object.values(D().enemies || {}).sort((a, b) => (a.sparkLevel || 0) - (b.sparkLevel || 0)).map(e => `<option value="${esc(e.id)}" ${e.id === currentEnemy ? 'selected' : ''}>${esc(e.name)} [Spark Lv.${e.sparkLevel || 1}]</option>`).join('');
    panel.hidden = false; updateSparkCalculator(true);
  }
  // list:false のとき実際に編集する対象（path があればその入れ子）
  function singleTarget(def) {
    const root = D()[def.key];
    return def.path ? (root || {})[def.path] : root;
  }
  function records(def) {
    const src = D()[def.key];
    if (!src) return {};
    if (!def.list) return { [def.path || def.key]: singleTarget(def) };
    const all = Array.isArray(src) ? Object.fromEntries(src.map(x => [x.id, x])) : src;
    if (!def.filter) return all;
    return Object.fromEntries(Object.entries(all).filter(([, v]) => { try { return def.filter(v); } catch (e) { return false; } }));
  }
  const recordName = (def, id) => {
    const r = records(def)[id];
    return r && r.name ? `${id}　${r.name}` : id;
  };

  // ── 描画 ──────────────────────────────────────────────────────
  function render() {
    const root = document.getElementById('dbg-root'); if (!root) return;
    const ov = loadOverrides(), def = cur(), recs = records(def), ids = Object.keys(recs);
    if (!state.id || !recs[state.id]) state.id = ids[0] || null;
    const q = (document.getElementById('dbg-q')?.value || '').trim().toLowerCase();
    const shown = ids.filter(id => !q || id.toLowerCase().includes(q) || (recs[id]?.name || '').toLowerCase().includes(q));
    const edited = new Set(Object.keys(ov[def.key] || {}).filter(k => k !== '__deleted'));

    // カテゴリ（グループ見出し付き）
    let html = '', lastG = null;
    CATEGORIES.forEach((c, i) => {
      if (c.g !== lastG) { html += `<h4>${c.g}</h4>`; lastG = c.g; }
      html += `<button data-cat="${i}" class="${i === state.cat ? 'on' : ''}">${c.label}</button>`;
    });
    root.querySelector('.dbg-cat').innerHTML = html;

    root.querySelector('.dbg-list').innerHTML = `<h4>項目 ${shown.length}/${ids.length}</h4>` +
      (def.list ? `<input id="dbg-q" class="dbg-search" placeholder="ID・名前で検索" value="${q.replace(/"/g, '&quot;')}">` : '') +
      shown.map(id => `<button data-id="${id}" class="${id === state.id ? 'on' : ''} ${def.list && edited.has(id) ? 'edited' : ''}">${recordName(def, id)}</button>`).join('');

    // 選択中レコードの下書き。フォームはこの下書きを描画する。
    const rec = state.id != null ? recs[state.id] : undefined;
    if (!state.draft || state.draftKey !== `${state.cat}:${state.id}`) {
      state.draft = rec === undefined ? null : JSON.parse(JSON.stringify(rec));
      state.draftKey = `${state.cat}:${state.id}`;
    }
    const ta = root.querySelector('#dbg-json'), form = root.querySelector('#dbg-form');
    ta.hidden = !state.raw; form.hidden = state.raw;
    root.querySelector('#dbg-mode').textContent = state.raw ? '入力欄で編集' : 'JSONで編集';
    if (state.raw) { ta.value = state.draft ? JSON.stringify(state.draft, null, 2) : ''; ta.classList.remove('bad'); }
    else form.innerHTML = state.draft ? formHTML(state.draft) : '<p class="dbg-hint">項目を選んでください。</p>';
    root.querySelector('.dbg-hint').textContent = `${def.g} / ${def.label} — ${def.hint}`;
    root.querySelector('#dbg-del').style.display = def.list ? '' : 'none';
    root.querySelector('#dbg-new').style.display = def.list ? '' : 'none';
    const n = Object.values(ov).reduce((a, p) => a + Object.keys(p).filter(k => k !== '__deleted').length + (p.__deleted || []).length, 0);
    root.querySelector('.dbg-foot').textContent =
      `未書き出しの変更 ${n} 件　／　変更は端末に保存され次回起動時にも適用されます。data.js へ正式に取り込むには「書き出し」でJSONをコピーしてください。`;
  }

  // フォームだけ描き直す（カテゴリ一覧などは触らない）
  function renderForm() {
    const form = document.getElementById('dbg-form');
    if (form) form.innerHTML = state.draft ? formHTML(state.draft) : '';
  }
  function readRawSafe() {
    const ta = document.getElementById('dbg-json');
    try { return JSON.parse(ta.value); } catch (e) { msg('JSONが壊れているので入力欄へは戻せません', true); return state.draft; }
  }

  function msg(text, isErr) {
    const el = document.querySelector('#dbg-root .dbg-msg'); if (!el) return;
    el.textContent = text; el.classList.toggle('err', !!isErr);
    clearTimeout(msg._t); msg._t = setTimeout(() => { el.textContent = ''; }, 5000);
  }

  // ── 操作 ──────────────────────────────────────────────────────
  function saveCurrent() {
    let parsed;
    if (state.raw) {
      const ta = document.getElementById('dbg-json');
      try { parsed = JSON.parse(ta.value); }
      catch (e) { ta.classList.add('bad'); msg('JSONが壊れています：' + e.message, true); return; }
    } else {
      if (!state.draft) { msg('編集する項目を選んでください', true); return; }
      parsed = collectForm();
    }
    const def = cur(), ov = loadOverrides();
    if (def.list) {
      const id = parsed.id || state.id;
      if (!id) { msg('id が必要です', true); return; }
      ov[def.key] ||= {};
      ov[def.key][id] = parsed;
      if (ov[def.key].__deleted) ov[def.key].__deleted = ov[def.key].__deleted.filter(x => x !== id);
      state.id = id;
      saveOverrides(ov); applyOverrides(D(), { [def.key]: { [id]: parsed } });
    } else if (def.path) {
      // 入れ子を書き換え、トップレベルごと差分として保存する
      const root = D()[def.key]; root[def.path] = parsed;
      ov[def.key] = { ...(ov[def.key] || {}), [def.path]: parsed };
      saveOverrides(ov);
    } else {
      Object.assign(D()[def.key], parsed);
      ov[def.key] = { ...(ov[def.key] || {}), ...parsed };
      saveOverrides(ov);
    }
    render();
    msg('保存しました。戦闘に入り直すと反映されます。');
  }

  function newRecord() {
    const def = cur(); if (!def.list) return;
    const base = records(def)[state.id];
    if (!base) { msg('複製元がありません', true); return; }
    const id = prompt('新しいID（半角英数）', (base.id || 'new') + '_copy');
    if (!id) return;
    const src = D()[def.key];
    const exists = Array.isArray(src) ? src.some(x => x.id === id) : !!src[id];
    if (exists) { msg('そのIDは既にあります', true); return; }
    const copy = JSON.parse(JSON.stringify(base)); copy.id = id;
    if (copy.name) copy.name += '（複製）';
    const ov = loadOverrides(); ov[def.key] ||= {}; ov[def.key][id] = copy;
    saveOverrides(ov); applyOverrides(D(), { [def.key]: { [id]: copy } });
    state.id = id; render();
    msg(`${id} を追加しました。中身を編集して保存してください。`);
  }

  function deleteRecord() {
    const def = cur(); if (!def.list || !state.id) return;
    if (!confirm(`${recordName(def, state.id)} を削除しますか？\n出現テーブルやレシピから参照されていると戦闘でエラーになります。`)) return;
    const ov = loadOverrides(); ov[def.key] ||= {};
    delete ov[def.key][state.id];
    ov[def.key].__deleted = [...new Set([...(ov[def.key].__deleted || []), state.id])];
    saveOverrides(ov);
    const src = D()[def.key];
    if (Array.isArray(src)) { const i = src.findIndex(x => x.id === state.id); if (i >= 0) src.splice(i, 1); }
    else delete src[state.id];
    state.id = null; render(); msg('削除しました。');
  }

  function revertCurrent() {
    const def = cur(), ov = loadOverrides();
    if (!ov[def.key]) { msg('このタブに変更はありません'); return; }
    if (def.list) {
      if (!ov[def.key][state.id]) { msg('この項目に変更はありません'); return; }
      delete ov[def.key][state.id];
    } else delete ov[def.key];
    if (!Object.keys(ov[def.key] || {}).length) delete ov[def.key];
    saveOverrides(ov); render();
    msg('変更を取り消しました。ページを再読み込みすると元の値に戻ります。');
  }

  function exportAll() {
    const text = JSON.stringify(loadOverrides(), null, 2);
    const ta = document.getElementById('dbg-json');
    ta.value = text; state.id = null;
    navigator.clipboard?.writeText(text).then(
      () => msg('差分JSONをクリップボードにコピーしました。これを渡してもらえれば data.js に取り込みます。'),
      () => msg('コピーできなかったので、上のテキストを選択して手動でコピーしてください。', true)
    );
  }

  function resetAll() {
    if (!confirm('端末に保存した変更をすべて破棄しますか？\ndata.js の元の値に戻ります。')) return;
    localStorage.removeItem(STORE_KEY);
    msg('破棄しました。ページを再読み込みしてください。');
  }

  const DEBUG_WEAPONS = [
    { id: 'mageStaff', label: '杖', pose: 'STAFF' },
    { id: 'ironClaw', label: '体術', pose: 'MARTIAL' },
    { id: 'classroomRecorder', label: 'リコーダー', pose: 'RECORDER' },
    { id: 'parentGiftGuitar', label: 'ギター', pose: 'GUITAR' }
  ];

  function grantDebugWeapon(id, equip = true) {
    const game = window.arseneGame, item = D().items?.[id], weapon = D().weapons?.[id];
    if (!game?.profile || !item || !weapon) { msg(`武器データが見つかりません: ${id}`, true); return false; }
    const profile = game.profile;
    profile.inventory ||= {}; profile.flags ||= {}; profile.weaponMastery ||= {}; profile.learnedWeaponSkills ||= []; profile.equipmentArchive ||= [];
    profile.inventory[id] = Math.max(1, profile.inventory[id] || 0);
    if (weapon.weaponType === 'instrument') profile.flags.instrumentUnlocked = true;
    profile.weaponMastery[weapon.weaponType] ||= { level: 1, exp: 0 };
    for (const skill of Object.values(D().skills || {})) {
      if (skill.source !== 'weapon' || skill.weaponType !== weapon.weaponType || skill.devOnly || skill.futureOnly) continue;
      if (!profile.learnedWeaponSkills.includes(skill.id)) profile.learnedWeaponSkills.push(skill.id);
    }
    if (!profile.equipmentArchive.includes(id)) profile.equipmentArchive.push(id);
    if (equip) {
      profile.equipment.rightHand = id;
      game.sanitizeLeftHandEquipment?.();
    }
    game.saveProfile?.(); game.renderMenuSummary?.();
    return true;
  }

  function renderDebugWeapons() {
    const panel = document.getElementById('dbg-weapon-panel'), grid = document.getElementById('dbg-weapon-grid'), game = window.arseneGame;
    if (!panel || !grid) return;
    grid.innerHTML = DEBUG_WEAPONS.map(entry => {
      const item = D().items?.[entry.id], active = game?.profile?.equipment?.rightHand === entry.id;
      return `<button type="button" data-dbg-weapon="${entry.id}" class="${active ? 'active' : ''}"><b>${entry.label}</b><span>${esc(item?.name || entry.id)}</span><small>${entry.pose} // 取得して右手へ装備</small></button>`;
    }).join('');
    panel.hidden = false;
  }

  // ── 組み立て ──────────────────────────────────────────────────
  function build() {
    if (document.getElementById('dbg-root')) return;
    css();
    const root = document.createElement('div');
    root.id = 'dbg-root';
    root.innerHTML = `
      <div class="dbg-bar">
        <b>DEBUG ROOM</b><small>データ編集専用</small><span class="sp"></span>
        <button id="dbg-job-balance">JOB検証</button>
        <button id="dbg-infinite-score">無限奏廊</button>
        <button id="dbg-guardian-trial">守護士 強敵戦</button>
        <button id="dbg-weapon-open">武器表示確認</button>
        <button id="dbg-spark-open">SPARK計算</button>
        <button id="dbg-export">書き出し</button>
        <button id="dbg-reset" class="danger">全変更を破棄</button>
        <button id="dbg-close">閉じる</button>
      </div>
      <div class="dbg-body">
        <div class="dbg-col dbg-cat"></div>
        <div class="dbg-col dbg-list"></div>
        <div class="dbg-col dbg-edit">
          <div class="dbg-hint"></div>
          <div id="dbg-form"></div>
          <textarea id="dbg-json" spellcheck="false" hidden></textarea>
          <div class="dbg-actions">
            <button id="dbg-save" class="primary">保存</button>
            <button id="dbg-mode">JSONで編集</button>
            <button id="dbg-new">複製して追加</button>
            <button id="dbg-revert">元に戻す</button>
            <button id="dbg-del" class="danger">削除</button>
          </div>
          <div class="dbg-msg"></div>
        </div>
      </div>
      <section class="dbg-spark" id="dbg-spark-panel" hidden>
        <header class="dbg-spark-head"><b>SPARK RATE CALCULATOR</b><span>現在データで閃き率を確認</span><button id="dbg-spark-close">閉じる</button></header>
        <div class="dbg-spark-body"><div class="dbg-spark-grid">
          <label>閃き候補<select id="dbg-spark-skill"></select></label>
          <label>対象の敵<select id="dbg-spark-enemy"></select></label>
          <label>使用する技<select id="dbg-spark-source"></select></label>
          <label>武器学Lv<input id="dbg-spark-mastery" type="number" min="1" max="1000000" value="1"></label>
        </div><div class="dbg-spark-result" id="dbg-spark-result"></div></div>
      </section>
      <section class="dbg-spark dbg-weapon-panel" id="dbg-weapon-panel" hidden>
        <header class="dbg-spark-head"><b>WEAPON VISUAL CHECK</b><span>確認用武器・武器技を解放して装備</span><button id="dbg-weapon-close">閉じる</button></header>
        <div class="dbg-spark-body"><div class="dbg-weapon-grid" id="dbg-weapon-grid"></div><button type="button" class="dbg-weapon-all" id="dbg-weapon-all">全4種を所持品へ追加</button><p class="dbg-weapon-note">個別ボタンは取得と同時に右手へ装備します。通常プレイヤーの解放条件は変更しません。</p></div>
      </section>
      <div class="dbg-foot"></div>`;
    document.body.appendChild(root);

    root.addEventListener('click', e => {
      const cat = e.target.closest('[data-cat]');
      if (cat) { state.cat = +cat.dataset.cat; state.id = null; render(); return; }
      const id = e.target.closest('[data-id]');
      if (id) { state.id = id.dataset.id; render(); return; }
      const addRow = e.target.closest('[data-add-row]');
      if (addRow) {
        state.draft = collectForm();
        const arr = getPath(state.draft, addRow.dataset.addRow) || [];
        const tpl = arr.length ? JSON.parse(JSON.stringify(arr[arr.length - 1])) : {};
        // 追加行は数値0・真偽false・文字は空にする。
        // ただし参照ID（アイテムや敵）は未選択だと扱いに困るので、選択肢の先頭を入れておく。
        for (const k of Object.keys(tpl)) {
          if (typeof tpl[k] === 'number') { tpl[k] = 0; continue; }
          if (typeof tpl[k] === 'boolean') { tpl[k] = false; continue; }
          const opts = optionsFor(k) || (k === 'id' ? enemyIds() : null);
          tpl[k] = opts && opts.length ? opts[0] : '';
        }
        arr.push(tpl); setPath(state.draft, addRow.dataset.addRow, arr);
        renderForm(); return;
      }
      const delRow = e.target.closest('[data-del-row]');
      if (delRow) {
        state.draft = collectForm();
        delPath(state.draft, delRow.dataset.delRow);
        renderForm(); return;
      }
      const debugWeapon = e.target.closest('[data-dbg-weapon]');
      if (debugWeapon) {
        if (grantDebugWeapon(debugWeapon.dataset.dbgWeapon, true)) { renderDebugWeapons(); msg(`${D().items?.[debugWeapon.dataset.dbgWeapon]?.name || debugWeapon.dataset.dbgWeapon}を取得・装備しました。`); }
        return;
      }
      if (e.target.id === 'dbg-mode') {
        state.draft = state.raw ? readRawSafe() : collectForm();
        state.raw = !state.raw; render(); return;
      }
      if (e.target.id === 'dbg-save') return saveCurrent();
      if (e.target.id === 'dbg-new') return newRecord();
      if (e.target.id === 'dbg-del') return deleteRecord();
      if (e.target.id === 'dbg-revert') return revertCurrent();
      if (e.target.id === 'dbg-export') return exportAll();
      if (e.target.id === 'dbg-reset') return resetAll();
      if (e.target.id === 'dbg-job-balance') return window.ARSENE_JOB_BALANCE?.show();
      if (e.target.id === 'dbg-infinite-score') {
        const game = window.arseneGame;
        if (!game?.isDebugAllowed?.()) { msg('DEBUG認証後に使用できます。', true); return; }
        close(); game.showMenu?.('otherworld'); game.renderMenuPanel?.(game.isRun?.() ? 'infinite-score' : 'infinite-score-warning'); return;
      }
      if (e.target.id === 'dbg-guardian-trial') {
        const game = window.arseneGame;
        if (!game || game.profile?.currentJob !== 'guardian' || game.equippedWeaponType?.() !== 'shield') { msg('守護士へ変更し、右手に盾を装備してから開始してください。', true); return; }
        if (game.startDebugGuardianTrial?.()) close();
        return;
      }
      if (e.target.id === 'dbg-weapon-open') return renderDebugWeapons();
      if (e.target.id === 'dbg-weapon-close') { document.getElementById('dbg-weapon-panel').hidden = true; return; }
      if (e.target.id === 'dbg-weapon-all') {
        DEBUG_WEAPONS.forEach(entry => grantDebugWeapon(entry.id, false));
        renderDebugWeapons(); msg('杖・体術・リコーダー・ギターを所持品へ追加し、対応武器技を解放しました。'); return;
      }
      if (e.target.id === 'dbg-spark-open') return openSparkCalculator();
      if (e.target.id === 'dbg-spark-close') { document.getElementById('dbg-spark-panel').hidden = true; return; }
      if (e.target.id === 'dbg-close') return close();
    });
    root.addEventListener('input', e => {
      if (e.target.id === 'dbg-q') { render(); return; }
      if (/^dbg-spark-/.test(e.target.id)) updateSparkCalculator(e.target.id === 'dbg-spark-skill');
    });
  }

  function open() { build(); document.getElementById('dbg-root').classList.add('open'); render(); }
  function close() { document.getElementById('dbg-root')?.classList.remove('open'); }

  // 認証はゲーム側（設定 → デバッグタブ）から行う。
  // 解除状態はタブを閉じるまで（sessionStorage）保持する。
  const isUnlocked = () => sessionStorage.getItem(UNLOCK_KEY) === '1';
  function unlock(input) {
    const pw = String(D().settings?.debugPassword ?? '1229');
    if (String(input) !== pw) return false;
    sessionStorage.setItem(UNLOCK_KEY, '1');
    return true;
  }
  function lock() { sessionStorage.removeItem(UNLOCK_KEY); close(); }

  function requestOpen() {
    build();
    if (isUnlocked()) { open(); return true; }
    return false;
  }

  window.arseneDebugRoom = { open: requestOpen, unlock, lock, isUnlocked, overrides: loadOverrides, reset: resetAll };
})();
