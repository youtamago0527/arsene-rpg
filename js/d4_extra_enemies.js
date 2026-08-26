// ══════════════════════════════════════════════════════════════
// D4「断月の楼閣」への雑魚追加
//
// 既存のD4（release_content.js）には手を触れない。
// 敵を定義して、各階の抽選プールへ後から差し込むだけ。
// ボス・中ボスは追加しない。
//
// 素材も新設せず、既存の flashSteel / moonEdgeOre をそのまま落とす。
// 新素材を足すとレシピが無いまま溜まるだけなので、工房の経済に触れない。
//
// 能力値は既存D4の水準（HP430〜610 / 攻撃58〜96 / 防御48〜72）へ合わせてある。
// 役割の振り分けだけは残してあり、物理一辺倒でも魔法一辺倒でも
// どこかで止まるようにしている：
//   鏡断の衛士       … 物理防御が高い。魔法か手数で崩す
//   断律の詠み手     … 精神が高い。魔法が通りにくいので物理で落とす
//   刹那の処刑人     … 単発が重い。防御と回復の使いどころ
//   葬送のメトロノーム … 回復と魔法障壁。撃破順を強制する
//   断律の蒐集者     … 低確率・逃走型。倒せば報酬が跳ねる
// ══════════════════════════════════════════════════════════════
(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  if (!D) return;

  const d4 = (D.dungeons || []).find(dungeon => dungeon.id === 'dungeon4');
  if (!d4 || !d4.floors) return;

  const d4art = name => `assets/enemy-characters/dungeon4/${name}.png`;

  const ENEMIES = {
    severKite: {
      name: '断刃のカイト', enName: 'SEVER KITE', role: 'FAST ATTACKER',
      roleDescription: '速い。数を減らす前に手数で削られる。',
      element: '断律', weaknesses: ['打', '光'], resistances: ['斬'],
      sprite: d4art('severKite'), battleScale: 1.0, sparkLevel: 27,
      stats: { maxHp: 450, atk: 88, def: 48, mag: 28, mnd: 44, dex: 84, agi: 92, spd: 92 },
      exp: 190, gold: { min: 95, max: 140 },
      drops: [['flashSteel', .46], ['moonEdgeOre', .14]],
      ai: [{ id: 'ratBite', name: '断刃の連撃', kind: 'physical', weight: .70 }, { id: 'attack', name: '風切り', kind: 'physical', weight: .30 }]
    },
    mirrorGuard: {
      name: '鏡断の衛士', enName: 'MIRROR GUARD', role: 'HEAVY TANK',
      roleDescription: '物理防御が高い。魔法か手数で崩す。',
      element: '鏡', weaknesses: ['魔', '雷'], resistances: ['物理', '斬', '打'],
      sprite: d4art('mirrorGuard'), battleScale: 1.25, sparkLevel: 28,
      stats: { maxHp: 720, atk: 76, def: 104, mag: 22, mnd: 46, dex: 52, agi: 34, spd: 34 },
      exp: 240, gold: { min: 120, max: 175 },
      drops: [['moonEdgeOre', .44], ['flashSteel', .26]],
      ai: [{ id: 'clubSmash', name: '鏡面圧砕', kind: 'physical', weight: .68 }, { id: 'attack', name: '盾殴り', kind: 'physical', weight: .32 }]
    },
    staccatoChanter: {
      name: '断律の詠み手', enName: 'STACCATO CHANTER', role: 'MAGIC TANK',
      roleDescription: '精神が高く魔法が通りにくい。物理で落とす。',
      element: '音', weaknesses: ['斬'], resistances: ['魔', '音'],
      sprite: d4art('staccatoChanter'), battleScale: 1.05, sparkLevel: 29,
      stats: { maxHp: 520, atk: 44, def: 60, mag: 96, mnd: 98, dex: 74, agi: 54, spd: 54 },
      exp: 215, gold: { min: 110, max: 160 },
      drops: [['moonEdgeOre', .42], ['flashSteel', .18]],
      ai: [{ id: 'soulBolt', name: '断律詠唱', kind: 'magic', weight: .66 }, { id: 'shadowBolt', name: '刻む高音', kind: 'magic', weight: .34 }]
    },
    graveMetronome: {
      name: '葬送のメトロノーム', enName: 'GRAVE METRONOME', role: 'SUPPORT',
      roleDescription: '回復と魔法障壁で戦線を保つ。先に落とさないと決着しない。',
      element: '闇', weaknesses: ['打'], resistances: ['闇'],
      sprite: d4art('graveMetronome'), battleScale: 1.0, sparkLevel: 30,
      stats: { maxHp: 560, atk: 52, def: 72, mag: 78, mnd: 86, dex: 68, agi: 52, spd: 52 },
      exp: 225, gold: { min: 115, max: 165 },
      drops: [['moonEdgeOre', .40], ['flashSteel', .22]],
      ai: [
        { id: 'voidHeal', name: '拍の巻き戻し', kind: 'heal', power: .22, weight: .34 },
        { id: 'arcaneChant', name: '節理の障壁', kind: 'mdefBuff', rate: .26, turns: 3, weight: .24 },
        { id: 'soulBolt', name: '葬送の刻', kind: 'magic', weight: .42 }
      ]
    },
    afterimageStalker: {
      name: '残像の追跡者', enName: 'AFTERIMAGE STALKER', role: 'FAST ATTACKER',
      roleDescription: '素早さと器用さが高い。長引かせるほど不利。',
      element: '断律', weaknesses: ['光', '火'], resistances: ['闇'],
      sprite: d4art('afterimageStalker'), battleScale: 1.05, sparkLevel: 31,
      stats: { maxHp: 430, atk: 94, def: 44, mag: 32, mnd: 40, dex: 88, agi: 98, spd: 98 },
      exp: 195, gold: { min: 100, max: 145 },
      drops: [['flashSteel', .48], ['moonEdgeOre', .16]],
      ai: [{ id: 'ratBite', name: '残像斬り', kind: 'physical', weight: .72 }, { id: 'attack', name: '追影', kind: 'physical', weight: .28 }]
    },
    severedChoir: {
      name: '断たれた聖歌隊', enName: 'SEVERED CHOIR', role: 'CASTER',
      roleDescription: '高HPと魔力を併せ持つ。放置すると押し込まれる。',
      element: '聖', weaknesses: ['闇'], resistances: ['光', '音'],
      sprite: d4art('severedChoir'), battleScale: 1.12, sparkLevel: 32,
      stats: { maxHp: 800, atk: 58, def: 78, mag: 90, mnd: 74, dex: 66, agi: 46, spd: 46 },
      exp: 260, gold: { min: 130, max: 190 },
      drops: [['moonEdgeOre', .46], ['flashSteel', .24]],
      ai: [{ id: 'soulBolt', name: '断たれた聖歌', kind: 'magic', weight: .60 }, { id: 'attack', name: '聖句の打擲', kind: 'physical', weight: .40 }]
    },
    instantExecutioner: {
      name: '刹那の処刑人', enName: 'INSTANT EXECUTIONER', role: 'BURST',
      roleDescription: '一撃が重い。防御と回復を挟まないと事故で落ちる。',
      element: '断律', weaknesses: ['氷', '聖'], resistances: ['斬'],
      sprite: d4art('instantExecutioner'), battleScale: 1.1, sparkLevel: 33,
      stats: { maxHp: 590, atk: 116, def: 68, mag: 36, mnd: 50, dex: 72, agi: 62, spd: 62 },
      exp: 245, gold: { min: 125, max: 180 },
      drops: [['flashSteel', .40], ['moonEdgeOre', .30]],
      ai: [{ id: 'clubSmash', name: '処刑の一閃', kind: 'physical', weight: .76 }, { id: 'attack', name: '刃鳴らし', kind: 'physical', weight: .24 }]
    },
    edgeColossus: {
      name: '刃界の巨兵', enName: 'EDGE COLOSSUS', role: 'BRUISER',
      roleDescription: 'HP・攻撃・防御すべてが高い。D4後半の壁。',
      element: '鋼', weaknesses: ['魔', '雷'], resistances: ['物理', '打'],
      sprite: d4art('edgeColossus'), battleScale: 1.3, sparkLevel: 34,
      stats: { maxHp: 950, atk: 102, def: 98, mag: 42, mnd: 60, dex: 58, agi: 32, spd: 32 },
      exp: 300, gold: { min: 150, max: 215 },
      drops: [['moonEdgeOre', .50], ['flashSteel', .34]],
      ai: [{ id: 'clubSmash', name: '刃界の踏み潰し', kind: 'physical', weight: .66 }, { id: 'soulBolt', name: '鋼の咆哮', kind: 'magic', weight: .34 }]
    },
    severanceHoarder: {
      name: '断律の蒐集者', enName: 'SEVERANCE HOARDER', kind: 'elite',
      role: 'TREASURE', roleDescription: '低確率で現れる逃走型。倒せば素材とGOLDが跳ね上がる。',
      element: '断律', weaknesses: ['斬', '打', '魔'], resistances: [],
      sprite: d4art('severanceHoarder'), battleScale: 1.0, sparkLevel: 36,
      stats: { maxHp: 340, atk: 60, def: 82, mag: 40, mnd: 70, dex: 96, agi: 116, spd: 116 },
      exp: 700, gold: { min: 600, max: 900 },
      drops: [['flashSteel', .90], ['moonEdgeOre', .90]],
      ai: [{ id: 'flee', name: '断ち逃げ', kind: 'flee', weight: .55 }, { id: 'attack', name: '牽制', kind: 'physical', weight: .45 }]
    }
  };

  Object.entries(ENEMIES).forEach(([id, e]) => {
    D.enemies[id] = {
      id, dungeonId: 'dungeon4', ...e,
      dropTable: e.drops.map(([itemId, chance]) => ({ itemId, chance }))
    };
    delete D.enemies[id].drops;
    if (D.enemySparkLevels) D.enemySparkLevels[id] = e.sparkLevel;
  });

  // 各階の抽選プールへ差し込む。既存の敵はそのまま残し、重みだけ足す形。
  // 浅い階は軽い個体、深い階は重い個体が増える。
  const ADD = {
    d4f1: [['severKite', 3], ['staccatoChanter', 2], ['afterimageStalker', 2]],
    d4f2: [['afterimageStalker', 3], ['mirrorGuard', 3], ['graveMetronome', 3], ['severKite', 2], ['staccatoChanter', 2], ['severanceHoarder', 1]],
    d4f3: [['instantExecutioner', 3], ['edgeColossus', 2], ['severedChoir', 3], ['graveMetronome', 2], ['afterimageStalker', 3], ['severanceHoarder', 1]]
  };
  for (const floor of d4.floors) {
    const additions = ADD[floor.id];
    if (!additions) continue;
    for (const tier of floor.encounterProgression || []) {
      for (const [id, weight] of additions) {
        if (tier.pool.some(entry => entry.id === id)) continue;
        tier.pool.push({ id, weight });
      }
    }
    // 3体編成も出るようにして、支援役を含む面倒な組み合わせを成立させる。
    for (const tier of floor.encounterProgression || []) {
      if (Array.isArray(tier.count)) tier.count = [2, 3];
    }
  }
})();
