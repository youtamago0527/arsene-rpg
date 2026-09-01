(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  if (!D || D.__releaseD4D5Applied) return;
  D.__releaseD4D5Applied = true;

  const publish = value => {
    if (!value || typeof value !== 'object') return value;
    delete value.devOnly; delete value.futureOnly;
    value.contentState = 'released'; value.balanceState = 'earlyAccess';
    return value;
  };
  D.futureContent.releaseFlags.d4Released = true;
  D.futureContent.releaseFlags.d5Released = true;
  ['ronin', 'hunter'].forEach(id => publish(D.jobs[id]));
  ['bow'].forEach(id => publish((D.weaponTypes || []).find(type => type.id === id)));
  Object.values(D.skills || {}).filter(skill => ['ronin', 'hunter'].includes(skill.jobId) || skill.weaponType === 'bow' || skill.weaponSubtype === 'katana' || ['astact', 'ostina'].includes(skill.bossId)).forEach(publish);
  ['astact', 'ostina'].forEach(id => publish(D.futureBosses[id]));
  ['astact', 'ostina'].forEach(id => publish(D.futureBossRewards[id]));
  ['staccato', 'ostinato'].forEach(id => publish(D.musicScores?.[id]));
  D.jobUnlockTutorials ||= {};
  Object.assign(D.jobUnlockTutorials, {
    ronin: { proofItemId: 'roninProof', role: '刀で一瞬を見切り、会心と反撃で主導権を奪うJOB。', build: '器用さ・素早さを伸ばし、刀技と回避反撃を組み合わせる。', tips: ['刀は剣武器学を共有する', '長期戦より好機への集中火力が得意'] },
    hunter: { proofItemId: 'hunterProof', role: '弓で弱った敵を追い込み、反復攻撃で仕留める後列JOB。', build: '器用さを中心に、命中・会心・追撃を整える。', tips: ['弓武器学はD5で解放される', '毒や継続損耗と短期決着を使い分ける'] }
  });

  Object.assign(D.items, {
    flashSteel: { id: 'flashSteel', name: '瞬鋼片', category: 'material', rarity: 'rare', description: '断続する残光を帯びたD4の鋼片。' },
    moonEdgeOre: { id: 'moonEdgeOre', name: '月刃鉱', category: 'material', rarity: 'rare', description: '刃のような月光を宿す鉱石。' },
    hunterThread: { id: 'hunterThread', name: '狩律糸', category: 'material', rarity: 'rare', description: '反復する魔力を編み込んだD5の糸。' },
    venomCore: { id: 'venomCore', name: '毒奏核', category: 'material', rarity: 'epic', description: '毒と炎の拍を閉じ込めた魔核。' },
    roninProof: { id: 'roninProof', name: '浪士の証', nameEn: 'PROOF OF THE RONIN', category: 'key', rarity: 'epic', description: '一瞬を見切り、返す者の証。' },
    hunterProof: { id: 'hunterProof', name: '狩人の証', nameEn: 'PROOF OF THE HUNTER', category: 'key', rarity: 'epic', description: '弱りを見逃さず、仕留める者の証。' },
    d4MoonKatana: { id: 'd4MoonKatana', name: '月鋼の刀', category: 'equipment', slot: 'rightHand', rarity: 'rare', stars: 2, catalogDungeon: 'dungeon4', description: '月刃鉱を打った、扱いやすい工房刀。' },
    d4FlashCoat: { id: 'd4FlashCoat', name: '瞬歩の外套', category: 'equipment', slot: 'body', rarity: 'rare', stars: 2, catalogDungeon: 'dungeon4', description: '短い踏み込みを妨げない軽装。' },
    d4SightCharm: { id: 'd4SightCharm', name: '見切りの緒', category: 'equipment', slot: 'accessory', rarity: 'rare', stars: 2, catalogDungeon: 'dungeon4', description: '敵の初動を読むための組紐。' },
    d5HunterBow: { id: 'd5HunterBow', name: '狩律の弓', category: 'equipment', slot: 'rightHand', rarity: 'rare', stars: 2, catalogDungeon: 'dungeon5', description: '狩律糸を張ったD5の工房弓。' },
    d5VenomVest: { id: 'd5VenomVest', name: '毒避けの狩装', category: 'equipment', slot: 'body', rarity: 'rare', stars: 2, catalogDungeon: 'dungeon5', description: '毒奏核を封じた狩人用の軽装。' },
    d5TrackerCharm: { id: 'd5TrackerCharm', name: '追跡者の標', category: 'equipment', slot: 'accessory', rarity: 'rare', stars: 2, catalogDungeon: 'dungeon5', description: '獲物の気配を捉える小さな標。' }
  });
  Object.assign(D.weapons, {
    d4MoonKatana: { id: 'd4MoonKatana', name: '月鋼の刀', dungeonId: 'dungeon4', weaponType: 'sword', weaponSubtype: 'katana', twoHanded: true, attackMotion: 'slash', attackPower: 42, bonuses: { agi: 7, dex: 5 }, effects: { criticalRateBonus: .05 } },
    d5HunterBow: { id: 'd5HunterBow', name: '狩律の弓', dungeonId: 'dungeon5', weaponType: 'bow', attackMotion: 'shoot', attackPower: 48, bonuses: { dex: 10, agi: 4 }, effects: { criticalRateBonus: .04 } }
  });
  Object.assign(D.armors, {
    d4FlashCoat: { id: 'd4FlashCoat', name: '瞬歩の外套', slot: 'body', defensePower: 38, magicDefensePower: 30, bonuses: { agi: 8, maxHp: 35 } },
    d5VenomVest: { id: 'd5VenomVest', name: '毒避けの狩装', slot: 'body', defensePower: 45, magicDefensePower: 42, bonuses: { dex: 8, maxHp: 45 } }
  });
  Object.assign(D.accessories, {
    d4SightCharm: { id: 'd4SightCharm', name: '見切りの緒', bonuses: { agi: 6, dex: 4 }, effects: { criticalRateBonus: .03 } },
    d5TrackerCharm: { id: 'd5TrackerCharm', name: '追跡者の標', bonuses: { dex: 8, luk: 3 }, effects: { criticalRateBonus: .03 } }
  });
  Object.assign(D.recipes, {
    d4MoonKatana: { id: 'd4MoonKatana', name: '月鋼の刀', craftCategory: 'weapon', dungeonId: 'dungeon4', materialUnlockId: 'flashSteel', resultItemId: 'd4MoonKatana', resultCount: 1, gold: 1400, materials: [{ itemId: 'flashSteel', count: 6 }, { itemId: 'moonEdgeOre', count: 4 }] },
    d4FlashCoat: { id: 'd4FlashCoat', name: '瞬歩の外套', craftCategory: 'armor', dungeonId: 'dungeon4', materialUnlockId: 'flashSteel', resultItemId: 'd4FlashCoat', resultCount: 1, gold: 1200, materials: [{ itemId: 'flashSteel', count: 5 }, { itemId: 'moonEdgeOre', count: 3 }] },
    d4SightCharm: { id: 'd4SightCharm', name: '見切りの緒', craftCategory: 'armor', dungeonId: 'dungeon4', materialUnlockId: 'moonEdgeOre', resultItemId: 'd4SightCharm', resultCount: 1, gold: 1000, materials: [{ itemId: 'moonEdgeOre', count: 5 }, { itemId: 'flashSteel', count: 2 }] },
    d5HunterBow: { id: 'd5HunterBow', name: '狩律の弓', craftCategory: 'weapon', dungeonId: 'dungeon5', materialUnlockId: 'hunterThread', resultItemId: 'd5HunterBow', resultCount: 1, gold: 2100, materials: [{ itemId: 'hunterThread', count: 6 }, { itemId: 'venomCore', count: 4 }] },
    d5VenomVest: { id: 'd5VenomVest', name: '毒避けの狩装', craftCategory: 'armor', dungeonId: 'dungeon5', materialUnlockId: 'hunterThread', resultItemId: 'd5VenomVest', resultCount: 1, gold: 1800, materials: [{ itemId: 'hunterThread', count: 5 }, { itemId: 'venomCore', count: 3 }] },
    d5TrackerCharm: { id: 'd5TrackerCharm', name: '追跡者の標', craftCategory: 'armor', dungeonId: 'dungeon5', materialUnlockId: 'venomCore', resultItemId: 'd5TrackerCharm', resultCount: 1, gold: 1600, materials: [{ itemId: 'venomCore', count: 5 }, { itemId: 'hunterThread', count: 2 }] }
  });

  const enemy = (id, name, dungeonId, sprite, stats, exp, gold, drops, ai, extra = {}) => ({
    id, name, enName: id.replace(/[A-Z]/g, m => ` ${m}`).toUpperCase(), dungeonId, sprite, stats, exp, gold, dropTable: drops, ai, ...extra
  });
  Object.assign(D.enemies, {
    // D4は他ダンジョンのボスに比べ見劣りするとの報告を受け、雑魚・ボスとも一律+20%で底上げ。
    flashHound: enemy('flashHound', '瞬きの猟犬', 'dungeon4', 'assets/enemy-characters/dungeon4/flashHound.png', { maxHp: 564, atk: 98, def: 65, mag: 46, mnd: 55, dex: 94, agi: 98, spd: 98 }, 180, { min: 90, max: 135 }, [{ itemId: 'flashSteel', chance: .55 }], [{ id: 'attack', name: '閃牙', kind: 'physical', weight: .7 }, { id: 'ratBite', name: '二連閃', kind: 'physical', weight: .3 }]),
    moonEdgeKnight: enemy('moonEdgeKnight', '月刃の騎士', 'dungeon4', 'assets/enemy-characters/dungeon4/moonEdgeKnight.png', { maxHp: 732, atk: 108, def: 86, mag: 53, mnd: 70, dex: 82, agi: 70, spd: 70 }, 210, { min: 110, max: 155 }, [{ itemId: 'moonEdgeOre', chance: .48 }, { itemId: 'flashSteel', chance: .24 }], [{ id: 'clubSmash', name: '月断ち', kind: 'physical', weight: .65 }, { id: 'attack', name: '構え斬り', kind: 'physical', weight: .35 }]),
    mapleOni: enemy('mapleOni', '紅葉鎧鬼', 'dungeon4', 'assets/enemy-characters/dungeon4/mapleOni.png', { maxHp: 672, atk: 115, def: 79, mag: 38, mnd: 50, dex: 74, agi: 58, spd: 58 }, 225, { min: 115, max: 165 }, [{ itemId: 'flashSteel', chance: .42 }, { itemId: 'moonEdgeOre', chance: .16 }], [{ id: 'attack', name: '紅刃斬', kind: 'physical', weight: .7 }, { id: 'clubSmash', name: '鎧打ち', kind: 'physical', weight: .3 }]),
    lanternMask: enemy('lanternMask', '三面灯籠', 'dungeon4', 'assets/enemy-characters/dungeon4/lanternMask.png', { maxHp: 516, atk: 70, def: 58, mag: 122, mnd: 91, dex: 89, agi: 82, spd: 82 }, 220, { min: 105, max: 150 }, [{ itemId: 'moonEdgeOre', chance: .38 }, { itemId: 'flashSteel', chance: .12 }], [{ id: 'soulBolt', name: '鬼火廻り', kind: 'magic', weight: .7 }, { id: 'attack', name: '灯突き', kind: 'physical', weight: .3 }]),
    toriiFox: enemy('toriiFox', '鳥居石狐', 'dungeon4', 'assets/enemy-characters/dungeon4/toriiFox.png', { maxHp: 600, atk: 94, def: 70, mag: 70, mnd: 82, dex: 110, agi: 106, spd: 106 }, 235, { min: 120, max: 175 }, [{ itemId: 'flashSteel', chance: .34 }, { itemId: 'moonEdgeOre', chance: .22 }], [{ id: 'ratBite', name: '石狐連爪', kind: 'physical', weight: .6 }, { id: 'soulBolt', name: '狐火', kind: 'magic', weight: .4 }]),
    d4MidBoss: enemy('d4MidBoss', '断刻の門番', 'dungeon4', 'assets/enemy-characters/dungeon4/d4MidBoss.png', { maxHp: 16320, atk: 316, def: 284, mag: 220, mnd: 254, dex: 278, agi: 110, spd: 110 }, 760, { min: 420, max: 560 }, [{ itemId: 'flashSteel', chance: 1 }, { itemId: 'moonEdgeOre', chance: .8 }], [{ id: 'attack', name: '断刻斬', kind: 'physical', weight: .55 }, { id: 'soulBolt', name: '時喰い', kind: 'magic', weight: .45 }], { kind: 'boss', bossRank: 'midBoss', title: '《断刻の門番》', role: 'MID BOSS / SPEED CHECK' }),
    astact: enemy('astact', 'アスタクト', 'dungeon4', 'assets/enemy-characters/dungeon4/astact.png', { maxHp: 31680, atk: 404, def: 316, mag: 250, mnd: 284, dex: 388, agi: 185, spd: 185 }, 1700, { min: 1150, max: 1450 }, [{ itemId: 'moonEdgeOre', chance: 1 }, { itemId: 'flashSteel', chance: 1 }], [{ id: 'attack', name: 'STACCATO', kind: 'physical', weight: .48 }, { id: 'ratBite', name: '瞬断連刃', kind: 'physical', weight: .32 }, { id: 'soulBolt', name: '残響断ち', kind: 'magic', weight: .20 }], { kind: 'boss', bossRank: 'dungeonBoss', title: '第四奏卿《瞬断の奏刃》', role: 'BOSS / SPEED & COUNTER', battleScale: 1.18, music: '音楽系/戦闘用/アスタクトのテーマ.mp3' }),
    venomWeaver: enemy('venomWeaver', '毒糸の織り手', 'dungeon5', 'assets/enemy-characters/dungeon5/venomWeaver.png', { maxHp: 760, atk: 92, def: 82, mag: 118, mnd: 92, dex: 112, agi: 92, spd: 92 }, 275, { min: 145, max: 205 }, [{ itemId: 'hunterThread', chance: .55 }], [{ id: 'soulBolt', name: '毒奏', kind: 'magic', weight: .65 }, { id: 'attack', name: '糸刃', kind: 'physical', weight: .35 }], { battleScale: 1.05 }),
    repeatedHunter: enemy('repeatedHunter', '反復の狩影', 'dungeon5', 'assets/enemy-characters/dungeon5/repeatedHunter.png', { maxHp: 920, atk: 122, def: 88, mag: 88, mnd: 84, dex: 132, agi: 106, spd: 106 }, 310, { min: 165, max: 235 }, [{ itemId: 'venomCore', chance: .42 }, { itemId: 'hunterThread', chance: .28 }], [{ id: 'attack', name: '追い矢', kind: 'physical', weight: .55 }, { id: 'ratBite', name: '反復射', kind: 'physical', weight: .45 }], { battleScale: 1.08 }),
    venomMantis: enemy('venomMantis', '毒刃の鎌蟲', 'dungeon5', 'assets/enemy-characters/dungeon5/venomMantis.png', { maxHp: 980, atk: 138, def: 86, mag: 62, mnd: 76, dex: 138, agi: 118, spd: 118 }, 330, { min: 175, max: 245 }, [{ itemId: 'hunterThread', chance: .44 }, { itemId: 'venomCore', chance: .18 }], [{ id: 'attack', name: '毒鎌', kind: 'physical', weight: .62 }, { id: 'ratBite', name: '交差狩り', kind: 'physical', weight: .38 }], { battleScale: 1.08 }),
    echoJackal: enemy('echoJackal', '反響の魔狼', 'dungeon5', 'assets/enemy-characters/dungeon5/echoJackal.png', { maxHp: 860, atk: 126, def: 74, mag: 80, mnd: 72, dex: 120, agi: 142, spd: 142 }, 325, { min: 170, max: 240 }, [{ itemId: 'hunterThread', chance: .38 }, { itemId: 'venomCore', chance: .22 }], [{ id: 'ratBite', name: '反響牙', kind: 'physical', weight: .60 }, { id: 'attack', name: '追跡爪', kind: 'physical', weight: .40 }], { battleScale: 1.02 }),
    thornMarionette: enemy('thornMarionette', '荊糸の傀儡', 'dungeon5', 'assets/enemy-characters/dungeon5/thornMarionette.png', { maxHp: 1080, atk: 116, def: 104, mag: 112, mnd: 102, dex: 126, agi: 88, spd: 88 }, 350, { min: 185, max: 260 }, [{ itemId: 'hunterThread', chance: .50 }, { itemId: 'venomCore', chance: .20 }], [{ id: 'soulBolt', name: '荊糸葬', kind: 'magic', weight: .55 }, { id: 'attack', name: '傀儡斬', kind: 'physical', weight: .45 }], { battleScale: 1.1 }),
    plagueBulwark: enemy('plagueBulwark', '瘴壁の番獣', 'dungeon5', 'assets/enemy-characters/dungeon5/plagueBulwark.png', { maxHp: 1420, atk: 118, def: 148, mag: 88, mnd: 132, dex: 92, agi: 64, spd: 64 }, 380, { min: 200, max: 285 }, [{ itemId: 'venomCore', chance: .45 }, { itemId: 'hunterThread', chance: .28 }], [{ id: 'clubSmash', name: '瘴壁砕き', kind: 'physical', weight: .58 }, { id: 'soulBolt', name: '毒障気', kind: 'magic', weight: .42 }], { battleScale: 1.25 }),
    hushMothQueen: enemy('hushMothQueen', '黙毒の蛾后', 'dungeon5', 'assets/enemy-characters/dungeon5/hushMothQueen.png', { maxHp: 900, atk: 72, def: 76, mag: 154, mnd: 126, dex: 132, agi: 124, spd: 124 }, 370, { min: 195, max: 275 }, [{ itemId: 'venomCore', chance: .48 }, { itemId: 'hunterThread', chance: .20 }], [{ id: 'soulBolt', name: '黙毒燐粉', kind: 'magic', weight: .72 }, { id: 'attack', name: '翅刃', kind: 'physical', weight: .28 }], { battleScale: 1.12 }),
    rotBloom: enemy('rotBloom', '腐奏の花葬樹', 'dungeon5', 'assets/enemy-characters/dungeon5/rotBloom.png', { maxHp: 1280, atk: 94, def: 122, mag: 142, mnd: 138, dex: 82, agi: 58, spd: 58 }, 395, { min: 210, max: 300 }, [{ itemId: 'venomCore', chance: .52 }, { itemId: 'hunterThread', chance: .24 }], [{ id: 'soulBolt', name: '腐奏花粉', kind: 'magic', weight: .68 }, { id: 'clubSmash', name: '根葬', kind: 'physical', weight: .32 }], { battleScale: 1.22 }),
    pursuitGaunt: enemy('pursuitGaunt', '執追の処刑手', 'dungeon5', 'assets/enemy-characters/dungeon5/pursuitGaunt.png', { maxHp: 1160, atk: 158, def: 112, mag: 74, mnd: 90, dex: 148, agi: 112, spd: 112 }, 420, { min: 225, max: 315 }, [{ itemId: 'hunterThread', chance: .40 }, { itemId: 'venomCore', chance: .36 }], [{ id: 'clubSmash', name: '執追断', kind: 'physical', weight: .62 }, { id: 'ratBite', name: '再刑連刃', kind: 'physical', weight: .38 }], { battleScale: 1.16 }),
    loopStag: enemy('loopStag', '輪唱の幽角獣', 'dungeon5', 'assets/enemy-characters/dungeon5/loopStag.png', { maxHp: 1340, atk: 136, def: 126, mag: 128, mnd: 122, dex: 118, agi: 106, spd: 106 }, 440, { min: 235, max: 330 }, [{ itemId: 'venomCore', chance: .50 }, { itemId: 'hunterThread', chance: .30 }], [{ id: 'soulBolt', name: '輪唱衝', kind: 'magic', weight: .52 }, { id: 'clubSmash', name: '幽角突進', kind: 'physical', weight: .48 }], { battleScale: 1.28 }),
    d5MidBoss: enemy('d5MidBoss', '毒律の追跡者', 'dungeon5', 'assets/enemy-characters/dungeon5/d5MidBoss.png', { maxHp: 33000, atk: 560, def: 500, mag: 580, mnd: 520, dex: 420, agi: 104, spd: 104 }, 1100, { min: 680, max: 880 }, [{ itemId: 'hunterThread', chance: 1 }, { itemId: 'venomCore', chance: .8 }], [{ id: 'attack', name: '追猟', kind: 'physical', weight: .5 }, { id: 'soulBolt', name: '毒律', kind: 'magic', weight: .5 }], { kind: 'boss', bossRank: 'midBoss', title: '《毒律の追跡者》', role: 'MID BOSS / ATTRITION', battleScale: 1.35 }),
    ostina: enemy('ostina', 'オスティナ', 'dungeon5', 'assets/enemy-characters/dungeon5/ostina.png', { maxHp: 63360, atk: 700, def: 620, mag: 730, mnd: 640, dex: 500, agi: 126, spd: 126 }, 2400, { min: 1650, max: 2100 }, [{ itemId: 'venomCore', chance: 1 }, { itemId: 'hunterThread', chance: 1 }], [{ id: 'soulBolt', name: 'OSTINATO', kind: 'magic', weight: .48 }, { id: 'attack', name: '狩律射', kind: 'physical', weight: .32 }, { id: 'shadowBolt', name: '反復毒奏', kind: 'magic', weight: .20 }], { kind: 'boss', bossRank: 'dungeonBoss', title: '第五奏卿《反復の狩律》', role: 'BOSS / DOT & DEBUFF', battleScale: 1.2 })
  });

  // 防御を突破できるか試す希少種。階層補正を受けず、D5でも同じ硬さを保つ。
  Object.assign(D.enemies, {
    golux: enemy('golux', 'ゴルクス', 'dungeon4', 'assets/enemy-characters/dungeon4/golux.png', { maxHp: 30, atk: 155, def: 900, mag: 75, mnd: 820, dex: 175, agi: 210, spd: 195, luk: 30 }, 450, { min: 5000, max: 9000 }, [{ itemId: 'moonEdgeOre', chance: .80 }], [{ id: 'rareEscape', name: '黄金離脱', kind: 'flee', weight: .66 }, { id: 'meroxRam', name: '黄金突進', kind: 'physical', weight: .34 }], { kind: 'rare', sparkLevel: 44, title: '黄金希少種《財宝の奔流》', role: 'GOLD TREASURE / EXTREME DEFENSE', roleDescription: '大量のGを体内に凝縮した超硬質の財宝種。短い猶予で逃走する。', battleScale: .94, ignoreFloorStatScale: true }),
    strayMerukuru: enemy('strayMerukuru', 'はぐれメロクス', 'dungeon5', 'assets/enemy-characters/dungeon5/strayMeroxOriginalStyle-v2.png', { maxHp: 34, atk: 205, def: 1450, mag: 110, mnd: 1320, dex: 220, agi: 285, spd: 270, luk: 12 }, 18000, 0, [{ itemId: 'venomCore', chance: .80 }, { itemId: 'hunterThread', chance: 1 }], [{ id: 'rareEscape', name: '黒銀離脱', kind: 'flee', weight: .72 }, { id: 'meroxRam', name: '残像水銀突進', kind: 'physical', weight: .28 }], { kind: 'rare', sparkLevel: 50, title: '変異希少種《黒銀の残影》', role: 'EXP TREASURE / MAXIMUM DEFENSE', roleDescription: 'メロクスの変異個体。さらに硬く素早く、ほとんどの攻撃を弾く。', battleScale: .96, ignoreFloorStatScale: true })
  });
  D.dungeon4RareEncounters = [{ id: 'merox', chance: .012 }, { id: 'golux', chance: .010 }];
  D.dungeon5RareEncounters = [{ id: 'merox', chance: .012 }, { id: 'strayMerukuru', chance: .010 }];

  const floor = (id, name, nameEn, wins, bg, materials, scale, pool) => ({
    id, name, nameEn, winsToClear: wins, background: bg, thumbnail: bg, materials,
    description: '装備・JOB・回復資源を組み替えながら進むEarly Access攻略層。', enemyScale: scale,
    encounterProgression: [{ minWins: 0, count: [2, 3], pool }]
  });
  const d3bg = ['assets/bg/dungeon3/d3f3-ruined-chapel.webp', 'assets/bg/dungeon3/d3f4-innermost-throne.webp'];
  const d4bg = [
    'assets/bg/dungeon4/d4f1-crimson-path.png',
    'assets/bg/dungeon4/d4f2-crimson-ruins.png',
    'assets/bg/dungeon4/d4f3-crimson-throne.png'
  ];
  D.dungeons.push({
    id: 'dungeon4', name: '断月の楼閣', nameEn: 'STACCATO MOON KEEP', background: d4bg[0], thumbnail: d4bg[0], recommendedLevel: 28,
    music: '音楽系/戦闘用/D4通常戦闘.mp3',
    description: '瞬断の奏刃が支配する月楼。命中・速度・耐久の穴を装備更新で埋めて進む。', unlockCondition: 'dungeon3Clear', bossId: 'astact', midBossId: 'd4MidBoss', midBossAfterFloor: 4,
    floors: [
      floor('d4f1', '残月の回廊', '1F WANING GALLERY', 6, d4bg[0], ['flashSteel'], { hp: 1, atk: 1, mag: 1, def: 1, mnd: 1, spd: 1, rewards: 1 }, [{ id: 'flashHound', weight: 4 }, { id: 'severKite', weight: 3 }, { id: 'lanternMask', weight: 2 }, { id: 'toriiFox', weight: 2 }]),
      floor('d4f2', '紅葉の渡廊', '2F MAPLE PASSAGE', 7, d4bg[0], ['flashSteel'], { hp: 1.08, atk: 1.05, mag: 1.04, def: 1.06, mnd: 1.06, spd: 1.04, rewards: 1.08 }, [{ id: 'flashHound', weight: 3 }, { id: 'mapleOni', weight: 4 }, { id: 'staccatoChanter', weight: 3 }, { id: 'afterimageStalker', weight: 2 }]),
      floor('d4f3', '瞬鋼の武廊', '3F FLASH STEEL HALL', 7, d4bg[1], ['flashSteel', 'moonEdgeOre'], { hp: 1.16, atk: 1.10, mag: 1.08, def: 1.12, mnd: 1.12, spd: 1.08, rewards: 1.16 }, [{ id: 'moonEdgeKnight', weight: 4 }, { id: 'mirrorGuard', weight: 3 }, { id: 'graveMetronome', weight: 3 }, { id: 'toriiFox', weight: 2 }]),
      floor('d4f4', '鏡断の間', '4F MIRROR SEVER', 8, d4bg[1], ['flashSteel', 'moonEdgeOre'], { hp: 1.26, atk: 1.16, mag: 1.12, def: 1.18, mnd: 1.18, spd: 1.12, rewards: 1.27 }, [{ id: 'mirrorGuard', weight: 4 }, { id: 'afterimageStalker', weight: 4 }, { id: 'severanceHoarder', weight: 2 }, { id: 'staccatoChanter', weight: 3 }]),
      floor('d4f5', '断刻の石段', '5F SEVERED STEPS', 7, d4bg[2], ['flashSteel', 'moonEdgeOre'], { hp: 1.38, atk: 1.22, mag: 1.18, def: 1.24, mnd: 1.24, spd: 1.16, rewards: 1.38 }, [{ id: 'instantExecutioner', weight: 3 }, { id: 'severedChoir', weight: 3 }, { id: 'graveMetronome', weight: 3 }, { id: 'moonEdgeKnight', weight: 2 }]),
      floor('d4f6', '刃界の櫓', '6F EDGE TURRET', 8, d4bg[2], ['flashSteel', 'moonEdgeOre'], { hp: 1.52, atk: 1.30, mag: 1.24, def: 1.32, mnd: 1.30, spd: 1.21, rewards: 1.52 }, [{ id: 'edgeColossus', weight: 4 }, { id: 'instantExecutioner', weight: 3 }, { id: 'severedChoir', weight: 3 }, { id: 'severKite', weight: 2 }]),
      floor('d4f7', '無音の月楼', '7F SILENT MOON KEEP', 8, d4bg[1], ['flashSteel', 'moonEdgeOre'], { hp: 1.68, atk: 1.38, mag: 1.30, def: 1.40, mnd: 1.38, spd: 1.26, rewards: 1.68 }, [{ id: 'severanceHoarder', weight: 3 }, { id: 'edgeColossus', weight: 3 }, { id: 'afterimageStalker', weight: 4 }, { id: 'mapleOni', weight: 2 }]),
      floor('d4f8', '断月の天守', '8F STACCATO CITADEL', 9, d4bg[2], ['flashSteel', 'moonEdgeOre'], { hp: 1.86, atk: 1.46, mag: 1.36, def: 1.50, mnd: 1.46, spd: 1.32, rewards: 1.88 }, [{ id: 'instantExecutioner', weight: 4 }, { id: 'edgeColossus', weight: 4 }, { id: 'severedChoir', weight: 3 }, { id: 'severanceHoarder', weight: 3 }, { id: 'graveMetronome', weight: 2 }])
    ]
  });
  D.dungeons.push({
    id: 'dungeon5', name: '反復の狩庭', nameEn: 'OSTINATO HUNTING GROUND', background: d3bg[1], thumbnail: d3bg[1], recommendedLevel: 34,
    description: '毒と追撃が繰り返される狩庭。防御・回復と短期決着の両方が必要になる。', unlockCondition: 'dungeon4Clear', bossId: 'ostina', midBossId: 'd5MidBoss', midBossAfterFloor: 4,
    floors: [
      floor('d5f1', '毒糸の林廊', '1F VENOM THREAD', 6, d3bg[0], ['hunterThread'], { hp: 1, atk: 1, mag: 1, def: 1, mnd: 1, spd: 1, rewards: 1 }, [{ id: 'venomWeaver', weight: 4 }, { id: 'echoJackal', weight: 3 }, { id: 'venomMantis', weight: 2 }]),
      floor('d5f2', '反響する獣道', '2F ECHOING TRAIL', 7, d3bg[0], ['hunterThread'], { hp: 1.09, atk: 1.06, mag: 1.05, def: 1.06, mnd: 1.06, spd: 1.05, rewards: 1.09 }, [{ id: 'echoJackal', weight: 4 }, { id: 'repeatedHunter', weight: 3 }, { id: 'thornMarionette', weight: 2 }]),
      floor('d5f3', '追跡の広間', '3F TRACKING HALL', 7, d3bg[1], ['hunterThread', 'venomCore'], { hp: 1.18, atk: 1.12, mag: 1.10, def: 1.12, mnd: 1.12, spd: 1.09, rewards: 1.18 }, [{ id: 'repeatedHunter', weight: 4 }, { id: 'venomMantis', weight: 3 }, { id: 'plagueBulwark', weight: 2 }, { id: 'venomWeaver', weight: 2 }]),
      floor('d5f4', '黙毒の孵化殿', '4F SILENT HATCHERY', 8, d3bg[1], ['hunterThread', 'venomCore'], { hp: 1.29, atk: 1.18, mag: 1.17, def: 1.18, mnd: 1.20, spd: 1.13, rewards: 1.30 }, [{ id: 'hushMothQueen', weight: 4 }, { id: 'thornMarionette', weight: 3 }, { id: 'rotBloom', weight: 2 }, { id: 'venomWeaver', weight: 2 }]),
      floor('d5f5', '腐奏の庭園', '5F ROTTEN ARIA', 7, d3bg[0], ['hunterThread', 'venomCore'], { hp: 1.41, atk: 1.24, mag: 1.24, def: 1.24, mnd: 1.27, spd: 1.17, rewards: 1.42 }, [{ id: 'rotBloom', weight: 4 }, { id: 'hushMothQueen', weight: 3 }, { id: 'plagueBulwark', weight: 3 }, { id: 'echoJackal', weight: 2 }]),
      floor('d5f6', '執追の刑場', '6F RELENTLESS GALLOWS', 8, d3bg[1], ['hunterThread', 'venomCore'], { hp: 1.55, atk: 1.32, mag: 1.30, def: 1.32, mnd: 1.34, spd: 1.22, rewards: 1.56 }, [{ id: 'pursuitGaunt', weight: 4 }, { id: 'plagueBulwark', weight: 3 }, { id: 'repeatedHunter', weight: 3 }, { id: 'venomMantis', weight: 2 }]),
      floor('d5f7', '輪唱の月狩場', '7F ROUND HUNT', 8, d3bg[1], ['hunterThread', 'venomCore'], { hp: 1.70, atk: 1.40, mag: 1.38, def: 1.40, mnd: 1.42, spd: 1.27, rewards: 1.72 }, [{ id: 'loopStag', weight: 4 }, { id: 'pursuitGaunt', weight: 3 }, { id: 'hushMothQueen', weight: 3 }, { id: 'thornMarionette', weight: 2 }]),
      floor('d5f8', '終わらぬ狩場', '8F ENDLESS HUNT', 9, d3bg[1], ['hunterThread', 'venomCore'], { hp: 1.88, atk: 1.48, mag: 1.46, def: 1.50, mnd: 1.52, spd: 1.33, rewards: 1.90 }, [{ id: 'loopStag', weight: 4 }, { id: 'pursuitGaunt', weight: 4 }, { id: 'rotBloom', weight: 3 }, { id: 'plagueBulwark', weight: 3 }, { id: 'repeatedHunter', weight: 2 }])
    ]
  });
})();
