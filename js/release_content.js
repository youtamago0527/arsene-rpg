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
    ronin: { proofItemId: 'roninProof', role: '刀で一瞬を見切り、会心と反撃で主導権を奪うJOB。', build: 'DEX・AGIを伸ばし、刀技と回避反撃を組み合わせる。', tips: ['刀は剣武器学を共有する', '長期戦より好機への集中火力が得意'] },
    hunter: { proofItemId: 'hunterProof', role: '弓で弱った敵を追い込み、反復攻撃で仕留める後列JOB。', build: 'DEXを中心に、命中・会心・追撃を整える。', tips: ['弓武器学はD5で解放される', '毒や継続損耗と短期決着を使い分ける'] }
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
    flashHound: enemy('flashHound', '瞬きの猟犬', 'dungeon4', D.enemies.riftAssailant.sprite, { maxHp: 470, atk: 82, def: 54, mag: 38, mnd: 46, dex: 78, agi: 82, spd: 82 }, 180, { min: 90, max: 135 }, [{ itemId: 'flashSteel', chance: .55 }], [{ id: 'attack', name: '閃牙', kind: 'physical', weight: .7 }, { id: 'ratBite', name: '二連閃', kind: 'physical', weight: .3 }]),
    moonEdgeKnight: enemy('moonEdgeKnight', '月刃の騎士', 'dungeon4', D.enemies.abyssalKnight.sprite, { maxHp: 610, atk: 90, def: 72, mag: 44, mnd: 58, dex: 68, agi: 58, spd: 58 }, 210, { min: 110, max: 155 }, [{ itemId: 'moonEdgeOre', chance: .48 }, { itemId: 'flashSteel', chance: .24 }], [{ id: 'clubSmash', name: '月断ち', kind: 'physical', weight: .65 }, { id: 'attack', name: '構え斬り', kind: 'physical', weight: .35 }]),
    d4MidBoss: enemy('d4MidBoss', '断刻の門番', 'dungeon4', D.enemies.versicrell.sprite, { maxHp: 6800, atk: 132, def: 118, mag: 92, mnd: 106, dex: 116, agi: 92, spd: 92 }, 760, { min: 420, max: 560 }, [{ itemId: 'flashSteel', chance: 1 }, { itemId: 'moonEdgeOre', chance: .8 }], [{ id: 'attack', name: '断刻斬', kind: 'physical', weight: .55 }, { id: 'soulBolt', name: '時喰い', kind: 'magic', weight: .45 }], { kind: 'boss', bossRank: 'midBoss', title: '《断刻の門番》', role: 'MID BOSS / SPEED CHECK' }),
    astact: enemy('astact', 'アスタクト', 'dungeon4', D.enemies.myrthi.sprite, { maxHp: 13200, atk: 168, def: 132, mag: 104, mnd: 118, dex: 162, agi: 154, spd: 154 }, 1700, { min: 1150, max: 1450 }, [{ itemId: 'moonEdgeOre', chance: 1 }, { itemId: 'flashSteel', chance: 1 }], [{ id: 'attack', name: 'STACCATO', kind: 'physical', weight: .48 }, { id: 'ratBite', name: '瞬断連刃', kind: 'physical', weight: .32 }, { id: 'soulBolt', name: '残響断ち', kind: 'magic', weight: .20 }], { kind: 'boss', bossRank: 'dungeonBoss', title: '第四奏卿《瞬断の奏刃》', role: 'BOSS / SPEED & COUNTER', battleScale: 1.18 }),
    venomWeaver: enemy('venomWeaver', '毒糸の織り手', 'dungeon5', D.enemies.voidAlchemist.sprite, { maxHp: 760, atk: 92, def: 82, mag: 118, mnd: 92, dex: 112, agi: 92, spd: 92 }, 275, { min: 145, max: 205 }, [{ itemId: 'hunterThread', chance: .55 }], [{ id: 'soulBolt', name: '毒奏', kind: 'magic', weight: .65 }, { id: 'attack', name: '糸刃', kind: 'physical', weight: .35 }]),
    repeatedHunter: enemy('repeatedHunter', '反復の狩影', 'dungeon5', D.enemies.chainReaper.sprite, { maxHp: 920, atk: 122, def: 88, mag: 88, mnd: 84, dex: 132, agi: 106, spd: 106 }, 310, { min: 165, max: 235 }, [{ itemId: 'venomCore', chance: .42 }, { itemId: 'hunterThread', chance: .28 }], [{ id: 'attack', name: '追い矢', kind: 'physical', weight: .55 }, { id: 'ratBite', name: '反復射', kind: 'physical', weight: .45 }]),
    d5MidBoss: enemy('d5MidBoss', '毒律の追跡者', 'dungeon5', D.enemies.crimsonBehemoth.sprite, { maxHp: 9800, atk: 154, def: 142, mag: 146, mnd: 132, dex: 148, agi: 104, spd: 104 }, 1100, { min: 680, max: 880 }, [{ itemId: 'hunterThread', chance: 1 }, { itemId: 'venomCore', chance: .8 }], [{ id: 'attack', name: '追猟', kind: 'physical', weight: .5 }, { id: 'soulBolt', name: '毒律', kind: 'magic', weight: .5 }], { kind: 'boss', bossRank: 'midBoss', title: '《毒律の追跡者》', role: 'MID BOSS / ATTRITION' }),
    ostina: enemy('ostina', 'オスティナ', 'dungeon5', D.enemies.shatteredDiva.sprite, { maxHp: 19800, atk: 178, def: 154, mag: 182, mnd: 158, dex: 184, agi: 126, spd: 126 }, 2400, { min: 1650, max: 2100 }, [{ itemId: 'venomCore', chance: 1 }, { itemId: 'hunterThread', chance: 1 }], [{ id: 'soulBolt', name: 'OSTINATO', kind: 'magic', weight: .48 }, { id: 'attack', name: '狩律射', kind: 'physical', weight: .32 }, { id: 'shadowBolt', name: '反復毒奏', kind: 'magic', weight: .20 }], { kind: 'boss', bossRank: 'dungeonBoss', title: '第五奏卿《反復の狩律》', role: 'BOSS / DOT & DEBUFF', battleScale: 1.2 })
  });

  const floor = (id, name, nameEn, wins, bg, materials, scale, pool) => ({
    id, name, nameEn, winsToClear: wins, background: bg, thumbnail: bg, materials,
    description: '装備・JOB・回復資源を組み替えながら進むEarly Access攻略層。', enemyScale: scale,
    encounterProgression: [{ minWins: 0, count: [2, 3], pool }]
  });
  const d3bg = ['assets/bg/dungeon3/d3f3-ruined-chapel.webp', 'assets/bg/dungeon3/d3f4-innermost-throne.webp'];
  D.dungeons.push({
    id: 'dungeon4', name: '断月の楼閣', nameEn: 'STACCATO MOON KEEP', background: d3bg[0], thumbnail: d3bg[0], recommendedLevel: 28,
    description: '瞬断の奏刃が支配する月楼。命中・速度・耐久の穴を装備更新で埋めて進む。', unlockCondition: 'dungeon3Clear', bossId: 'astact', midBossId: 'd4MidBoss', midBossAfterFloor: 2,
    floors: [
      floor('d4f1', '残月の回廊', '1F WANING GALLERY', 6, d3bg[0], ['flashSteel'], { hp: 1, atk: 1, mag: 1, def: 1, mnd: 1, spd: 1, rewards: 1 }, [{ id: 'flashHound', weight: 5 }, { id: 'moonEdgeKnight', weight: 3 }]),
      floor('d4f2', '瞬鋼の武廊', '2F FLASH STEEL HALL', 7, d3bg[0], ['flashSteel', 'moonEdgeOre'], { hp: 1.12, atk: 1.08, mag: 1.05, def: 1.08, mnd: 1.08, spd: 1.06, rewards: 1.12 }, [{ id: 'flashHound', weight: 4 }, { id: 'moonEdgeKnight', weight: 5 }]),
      floor('d4f3', '断刻の天守', '3F SEVERED KEEP', 8, d3bg[1], ['flashSteel', 'moonEdgeOre'], { hp: 1.24, atk: 1.14, mag: 1.10, def: 1.14, mnd: 1.14, spd: 1.10, rewards: 1.24 }, [{ id: 'flashHound', weight: 3 }, { id: 'moonEdgeKnight', weight: 6 }])
    ]
  });
  D.dungeons.push({
    id: 'dungeon5', name: '反復の狩庭', nameEn: 'OSTINATO HUNTING GROUND', background: d3bg[1], thumbnail: d3bg[1], recommendedLevel: 34,
    description: '毒と追撃が繰り返される狩庭。防御・回復と短期決着の両方が必要になる。', unlockCondition: 'dungeon4Clear', bossId: 'ostina', midBossId: 'd5MidBoss', midBossAfterFloor: 2,
    floors: [
      floor('d5f1', '毒糸の林廊', '1F VENOM THREAD', 6, d3bg[0], ['hunterThread'], { hp: 1, atk: 1, mag: 1, def: 1, mnd: 1, spd: 1, rewards: 1 }, [{ id: 'venomWeaver', weight: 5 }, { id: 'repeatedHunter', weight: 3 }]),
      floor('d5f2', '追跡の広間', '2F TRACKING HALL', 7, d3bg[1], ['hunterThread', 'venomCore'], { hp: 1.14, atk: 1.10, mag: 1.10, def: 1.10, mnd: 1.10, spd: 1.06, rewards: 1.15 }, [{ id: 'venomWeaver', weight: 4 }, { id: 'repeatedHunter', weight: 5 }]),
      floor('d5f3', '終わらぬ狩場', '3F ENDLESS HUNT', 8, d3bg[1], ['hunterThread', 'venomCore'], { hp: 1.28, atk: 1.16, mag: 1.16, def: 1.16, mnd: 1.16, spd: 1.10, rewards: 1.30 }, [{ id: 'venomWeaver', weight: 3 }, { id: 'repeatedHunter', weight: 6 }])
    ]
  });
})();
