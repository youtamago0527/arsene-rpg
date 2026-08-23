(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  if (!D) return;

  D.rarityStars = {
    1: { rarity: 'common', label: 'COMMON' },
    2: { rarity: 'uncommon', label: 'CRAFT' },
    3: { rarity: 'rare', label: 'ADVANCED CRAFT' },
    4: { rarity: 'epic', label: 'MONSTER UNIQUE' },
    5: { rarity: 'legendary', label: 'BOSS EQUIPMENT' }
  };

  const rarityFor = stars => D.rarityStars[stars]?.rarity || 'common';
  const addItem = (id, data) => {
    D.items[id] = { id, category: 'equipment', stars: 2, rarity: 'uncommon', ...data };
    return D.items[id];
  };
  const addWeapon = (id, data) => {
    const item = addItem(id, { slot: 'rightHand', ...data });
    D.weapons[id] = {
      id, name: item.name, nameEn: item.nameEn, dungeonId: item.dungeonId,
      weaponType: data.weaponType, weaponSubtype: data.weaponSubtype || null, weaponSprite: data.weaponSprite || `${data.weaponType}_progression`,
      battleSprite: data.battleSprite || null,
      attackMotion: data.weaponType === 'staff' || data.weaponType === 'instrument' ? 'staffCast' : data.weaponType === 'shield' ? 'shieldBash' : 'slash',
      damageStat: data.damageStat || (data.weaponType === 'staff' ? 'mag' : data.weaponType === 'instrument' ? 'dex' : 'str'),
      power: data.power || 2.5, attackPower: data.attackPower || 0,
      magicAttackPower: data.magicAttackPower || 0, defensePower: data.defensePower || 0,
      magicDefensePower: data.magicDefensePower || 0, bonuses: data.bonuses || {}, effects: data.effects || {},
      scaling: data.scaling || null, powerKey: data.powerKey || null, damageType: data.damageType || null,
      offHandOnly: !!data.offHandOnly,
      seriesId: data.seriesId || null, source: data.source
    };
  };
  const addArmor = (id, data) => {
    const item = addItem(id, data);
    const target = data.slot === 'accessory' ? D.accessories : D.armors;
    target[id] = {
      id, name: item.name, nameEn: item.nameEn, dungeonId: item.dungeonId, slot: data.slot,
      defensePower: data.defensePower || 0, magicDefensePower: data.magicDefensePower || 0,
      attackPower: data.attackPower || 0, magicAttackPower: data.magicAttackPower || 0,
      bonuses: data.bonuses || {}, effects: data.effects || {}, seriesId: data.seriesId || null, source: data.source
    };
  };
  const addRecipe = (id, data) => {
    D.recipes[id] = { id, resultCount: 1, progressionRecipe: true, ...data };
  };

  // 旧工房品はセーブ互換のため削除せず、製作一覧から退役させる。
  // 工房製だった装備の基本能力補正も廃止し、攻撃力・防御力など装備固有値だけを残す。
  Object.values(D.recipes || {}).forEach(recipe => {
    if (recipe.seriesId || recipe.craftCategory === 'boss') return;
    recipe.legacy = true;
    const def = D.weapons[recipe.resultItemId] || D.armors?.[recipe.resultItemId] || D.accessories?.[recipe.resultItemId];
    if (def) def.bonuses = {};
    if (D.items[recipe.resultItemId]) D.items[recipe.resultItemId].legacy = true;
  });

  const weaponLines = {
    sword: {
      d1: ['forge_d1_sword', '黒鉄剣グレイヴ', 'IRON GRAVE'],
      d2: ['forge_d2_sword', '静音剣サイレン', 'SILENT SIREN'],
      d2e: ['forge_d2e_sword', '月蝕剣ノクターン', 'NOCTURNE ECLIPSE'],
      d3: ['forge_d3_sword', '虚界剣アビスレイ', 'ABYSS RAY'],
      d3e: ['forge_d3e_sword', '断界剣エクリプス', 'WORLDREND ECLIPSE']
    },
    martial: {
      d1: ['forge_d1_martial', '鉄牙拳ヴァイス', 'IRON FANG VICE'],
      d2: ['forge_d2_martial', '無響拳サイファ', 'SILENT CYPHER'],
      d2e: ['forge_d2e_martial', '羅刹爪テンペスト', 'RASETSU TEMPEST'],
      d3: ['forge_d3_martial', '虚獣拳ネメシス', 'VOID BEAST NEMESIS'],
      d3e: ['forge_d3e_martial', '崩星拳ラグナロク', 'STARBREAK RAGNAROK']
    },
    staff: {
      d1: ['forge_d1_staff', '青燐杖ルーメン', 'AZURE LUMEN'],
      d2: ['forge_d2_staff', '静謐杖エコー', 'SERENE ECHO'],
      d2e: ['forge_d2e_staff', '冥奏杖レクイエム', 'REQUIEM ROD'],
      d3: ['forge_d3_staff', '虚天杖オブリビオン', 'OBLIVION STAFF'],
      d3e: ['forge_d3e_staff', '終界杖アポカリプス', 'APOCALYPSE STAFF']
    },
    instrument: {
      d2: ['forge_d2_instrument', '沈黙の調律笛', 'HUSH TUNING PIPE'],
      d2e: ['forge_d2e_instrument', '夜想楽器ノクテュルヌ', 'NOCTURNE INSTRUMENT'],
      d3: ['forge_d3_instrument', '虚奏器ヴォイドハープ', 'VOID HARP'],
      d3e: ['forge_d3e_instrument', '終焉楽章アルマゲドン', 'ARMAGEDDON SCORE']
    }
  };
  const weaponPower = {
    d1: { stars: 2, attack: 11, magic: 12, power: 2.25 },
    d2: { stars: 2, attack: 19, magic: 20, power: 2.55 },
    d2e: { stars: 3, attack: 27, magic: 29, power: 2.85 },
    d3: { stars: 3, attack: 36, magic: 39, power: 3.05 },
    d3e: { stars: 3, attack: 41, magic: 44, power: 3.2 }
  };
  const dungeonForStage = stage => stage.startsWith('d1') ? 'dungeon1' : stage.startsWith('d2') ? 'dungeon2' : 'dungeon3';
  const weaponMaterials = {
    d1: [{ itemId: 'rustedKnife', count: 3 }, { itemId: 'manaDrop', count: 3 }, { itemId: 'batFang', count: 2 }],
    d2: [{ itemId: 'echoShard', count: 4 }, { itemId: 'reverbJelly', count: 3 }, { itemId: 'violinString', count: 2 }],
    d3: [{ itemId: 'voidShard', count: 5 }, { itemId: 'darkIron', count: 4 }, { itemId: 'chaosDust', count: 3 }]
  };
  const previousStage = { d2e: 'd1', d3e: 'd2' };
  for (const [type, stages] of Object.entries(weaponLines)) {
    for (const [stage, [id, name, nameEn]] of Object.entries(stages)) {
      const p = weaponPower[stage], dungeonId = dungeonForStage(stage), magical = type === 'staff' || type === 'instrument';
      addWeapon(id, {
        name, nameEn, dungeonId, catalogDungeon: dungeonId, weaponType: type, stars: p.stars,
        rarity: rarityFor(p.stars), source: 'workshop', attackPower: magical ? 0 : p.attack,
        magicAttackPower: magical ? p.magic : 0, power: p.power, bonuses: {},
        scaling: type === 'instrument' ? { dex: .65, mag: .35 } : null,
        powerKey: magical ? 'magicAttackPower' : 'attackPower', damageType: magical ? 'magical' : 'physical',
        description: `${dungeonId.toUpperCase().replace('UNGEON', '')}工房規格。基本能力を変えず、${magical ? '術式出力' : '武器攻撃力'}だけを高める。`
      });
      const prior = previousStage[stage] ? weaponLines[type][previousStage[stage]]?.[0] : null;
      const mats = stage === 'd1' ? weaponMaterials.d1 : stage.startsWith('d2') ? weaponMaterials.d2 : weaponMaterials.d3;
      addRecipe(`${id}_recipe`, {
        name, craftCategory: 'weapon', dungeonId, resultItemId: id,
        gold: stage === 'd1' ? 180 : stage === 'd2' ? 420 : stage === 'd2e' ? 760 : stage === 'd3' ? 980 : 1320,
        materials: [...(prior ? [{ itemId: prior, count: 1 }] : []), ...mats.map(m => ({ ...m, count: m.count + (stage.endsWith('e') ? 2 : 0) }))]
      });
    }
  }

  const armorSlots = ['leftHand', 'head', 'body', 'arms', 'feet', 'accessory'];
  const armorNames = {
    d1: ['黒鉄の小盾', '宵鉄の面頬', '夜路の外套', '影縫いの手甲', '月踏みの靴', '青燐の護符'],
    d2: ['静寂の円盾', '無響の仮面', '残響なき礼装', '沈黙の篭手', '消音の戦靴', '無音の耳飾り'],
    d2e: ['月蝕の鏡盾', '夜奏の冠', '冥奏の黒衣', '葬律の手甲', '夜想の舞踏靴', '鎮魂のペンダント'],
    d3: ['虚界障壁イージス', '虚星冠アストラ', '深淵装アビサル', '幻壊手ヴォイド', '断空靴ゼロ', '混沌核カオス'],
    d3e: ['終界盾ラストウォール', '崩天冠カタストロフ', '終焉衣アポカリプス', '滅界手ラグナ', '星葬靴エンドロール', '輪廻環ウロボロス']
  };
  const armorPower = {
    d1: { stars: 2, def: 6, mdef: 5 }, d2: { stars: 2, def: 10, mdef: 9 },
    d2e: { stars: 3, def: 14, mdef: 14 }, d3: { stars: 3, def: 19, mdef: 18 },
    d3e: { stars: 3, def: 22, mdef: 22 }
  };
  for (const [stage, names] of Object.entries(armorNames)) {
    names.forEach((name, index) => {
      const slot = armorSlots[index], id = `forge_${stage}_${slot}`, p = armorPower[stage], dungeonId = dungeonForStage(stage);
      const isShield = slot === 'leftHand', isAccessory = slot === 'accessory';
      // 部位ごとに役割を分ける。以前は全部位が同じ def/mdef で、
      // 一式そろえると防御も魔防も同時に上がるだけの「個性なし装備」だった。
      // ティアごとの予算（def+mdef）は据え置き、その配分を部位で変える。
      const budget = p.def + p.mdef;
      const r = n => Math.round(budget * n);
      // HPは戦闘ごとの抽選で自然に伸びる（15%で3〜6、100戦で約+68）ので、
      // 装備でHPを盛っても価値が薄い。逆にMPは8%で1〜3としか伸びないため、
      // 「MPを増やす装備」が魔法職の実質的な選択肢になる。
      // D1〜D2は選択肢を絞り、物理なら防御・魔法ならMPの二択で足りるようにする。
      const profile = isAccessory
        ? { defensePower: 0, magicDefensePower: 0, bonuses: { luk: Math.max(1, r(.14)) }, role: '運' }
        : isShield
          // 盾：物理に寄せる。魔法を受けたいなら頭で魔防を稼ぐ、という住み分け。
          ? { defensePower: r(.85), magicDefensePower: r(.20), bonuses: {}, role: '物理防御' }
          : slot === 'head'
            // 頭：魔防とMP。魔法職の主力枠。物理防御は持たない。
            ? { defensePower: 0, magicDefensePower: r(.65), bonuses: { maxMp: r(.55) }, role: '魔法防御とMP' }
            : slot === 'body'
              // 体：物理防御の主力。HPはおまけ程度に留める。
              ? { defensePower: r(.85), magicDefensePower: 0, bonuses: { maxHp: r(.35) }, role: '物理防御' }
              : slot === 'arms'
                // 手：素の力と器用さを伸ばす。装備の攻撃力ではなく能力値で効かせる。
                ? { defensePower: r(.20), magicDefensePower: 0, bonuses: { str: Math.max(1, r(.20)), dex: Math.max(1, r(.16)) }, role: '力と器用さ' }
                // 足：防御は薄く、素早さで避ける。
                : { defensePower: r(.20), magicDefensePower: r(.20), bonuses: { agi: Math.max(1, r(.22)) }, role: '素早さ' };
      addArmor(id, {
        name, nameEn: `${stage.toUpperCase()} ${slot.toUpperCase()}`, dungeonId, catalogDungeon: dungeonId,
        slot, stars: p.stars, rarity: rarityFor(p.stars), source: 'workshop',
        bonuses: profile.bonuses, defensePower: profile.defensePower, magicDefensePower: profile.magicDefensePower,
        ...(profile.attackPower ? { attackPower: profile.attackPower } : {}),
        description: `${dungeonId.toUpperCase().replace('UNGEON', '')}工房規格。${profile.role}に寄せた装備。`
      });
      const priorStage = previousStage[stage], prior = priorStage ? `forge_${priorStage}_${slot}` : null;
      const mats = stage === 'd1' ? weaponMaterials.d1 : stage.startsWith('d2') ? weaponMaterials.d2 : weaponMaterials.d3;
      addRecipe(`${id}_recipe`, {
        name, craftCategory: 'armor', dungeonId, resultItemId: id,
        gold: stage === 'd1' ? 130 : stage === 'd2' ? 320 : stage === 'd2e' ? 590 : stage === 'd3' ? 760 : 1080,
        materials: [...(prior ? [{ itemId: prior, count: 1 }] : []), ...mats.slice(0, 2).map(m => ({ ...m, count: Math.max(2, m.count - 1) + (stage.endsWith('e') ? 2 : 0) }))]
      });
    });
  }

  // ★4は怪異からしか得られない。通常工房レシピは生成しない。
  const d1Unique = {
    shadowSlime: ['shadowWand', 'slimeRing'], soulMage: ['soulRobe'], ratThief: ['ratBoots'],
    goblin: ['goblinGloves'], nightBat: ['nightHat'], ghostBone: ['ghostBoneReliquary']
  };
  const suffixes = {
    sword: ['怪異剣', 'MONSTER BLADE'], staff: ['秘杖', 'ARCANE RELIC'], martial: ['魔装拳', 'FIEND FIST'],
    instrument: ['禁奏器', 'FORBIDDEN SCORE'], head: ['異貌', 'FIEND VISAGE'], body: ['怪装', 'MONSTER GARB'],
    arms: ['魔骸手', 'FIEND ARMS'], feet: ['夜渡靴', 'NIGHTWALKER'], accessory: ['怪異核', 'MONSTER CORE']
  };
  const monsterGearByDungeon = { dungeon1: [], dungeon2: [], dungeon3: [] };
  const normalEnemies = Object.values(D.enemies || {}).filter(e => ['dungeon1', 'dungeon2', 'dungeon3'].includes(e.dungeonId || (() => {
    for (const d of D.dungeons || []) {
      const tiers = [...(d.encounterProgression || []), ...(d.floors || []).flatMap(f => f.encounterProgression || [])];
      if (tiers.some(t => (t.pool || []).some(p => p.id === e.id))) return d.id;
    }
    return null;
  })()) && e.kind !== 'boss' && !['zenakado', 'myrthi', 'noelFirstEncounter'].includes(e.id));
  const typeCycle = ['sword', 'staff', 'martial', 'head', 'body', 'arms', 'feet', 'accessory', 'instrument'];
  const dungeonChance = { dungeon1: .04, dungeon2: .018, dungeon3: .008 };
  const dungeonRank = { dungeon1: 1, dungeon2: 2, dungeon3: 3 };
  normalEnemies.forEach((enemy, index) => {
    const dungeonId = enemy.dungeonId || (D.dungeons || []).find(d => [...(d.encounterProgression || []), ...(d.floors || []).flatMap(f => f.encounterProgression || [])].some(t => (t.pool || []).some(p => p.id === enemy.id)))?.id;
    if (!dungeonId) return;
    const assigned = d1Unique[enemy.id] || [`monster_relic_${enemy.id}`];
    assigned.forEach((id, subIndex) => {
      let kind = typeCycle[(index + subIndex) % typeCycle.length];
      const existing = D.items[id];
      if (existing?.slot && existing.slot !== 'rightHand') kind = existing.slot;
      else if (D.weapons[id]) kind = D.weapons[id].weaponType;
      const weaponKind = ['sword', 'staff', 'martial', 'instrument'].includes(kind);
      const [prefix, enPrefix] = suffixes[kind], displayName = existing?.name || `${prefix}《${enemy.name}》`;
      const rank = dungeonRank[dungeonId], bonusValue = 2 + rank * 2;
      const bonuses = weaponKind
        ? (kind === 'staff' ? { mag: bonusValue, dex: Math.max(2, bonusValue - 2) } : kind === 'instrument' ? { dex: bonusValue, mag: Math.max(2, bonusValue - 2) } : kind === 'martial' ? { agi: bonusValue, str: Math.max(2, bonusValue - 2) } : { str: bonusValue, dex: Math.max(2, bonusValue - 2) })
        : kind === 'body' ? { vit: bonusValue, maxHp: 8 * rank } : kind === 'head' ? { mnd: bonusValue, dex: Math.max(2, bonusValue - 2) } : kind === 'arms' ? { str: bonusValue, dex: bonusValue } : kind === 'feet' ? { agi: bonusValue, dex: Math.max(2, bonusValue - 2) } : { luk: bonusValue, mnd: Math.max(2, bonusValue - 2) };
      const common = {
        name: displayName, nameEn: existing?.nameEn || `${enPrefix} // ${enemy.enName || enemy.id.toUpperCase()}`,
        dungeonId, catalogDungeon: dungeonId, stars: 4, rarity: 'epic', source: 'dropOnly', dropEnemyId: enemy.id,
        bonuses, description: `${enemy.name}の怪異性が凝固した一点物。基本能力まで引き上げる、工房では再現できない遺装。`
      };
      if (weaponKind || existing?.slot === 'rightHand') {
        addWeapon(id, { ...common, weaponType: weaponKind ? kind : 'staff', attackPower: ['sword', 'martial'].includes(kind) ? 22 + rank * 12 : 0, magicAttackPower: ['staff', 'instrument'].includes(kind) ? 23 + rank * 12 : 0, power: 2.7 + rank * .2 });
      } else {
        // ★4も部位ごとに役割を分ける。以前は頭も体も足もアクセまで
        // def/mdef を両方同じだけ持っていて、一式そろえると無条件に固くなった。
        // ランクごとの総量は据え置き、配分だけ変える。
        const ab = 17 + rank * 10, ar = n => Math.round(ab * n);
        const armorProfile =
          kind === 'head' ? { defensePower: 0, magicDefensePower: ar(.70) }
          : kind === 'body' ? { defensePower: ar(.70), magicDefensePower: 0 }
          : kind === 'arms' ? { defensePower: ar(.20), magicDefensePower: 0, attackPower: ar(.45) }
          : kind === 'feet' ? { defensePower: ar(.22), magicDefensePower: ar(.22) }
          // アクセは防御を持たない。素の能力で個性を出す枠にする。
          : { defensePower: 0, magicDefensePower: 0 };
        addArmor(id, { ...common, slot: kind, ...armorProfile });
      }
      const uniqueDrop = enemy.dropTable.find(drop => drop.itemId === id);
      if (uniqueDrop) uniqueDrop.chance = dungeonChance[dungeonId];
      else enemy.dropTable.push({ itemId: id, chance: dungeonChance[dungeonId] });
      monsterGearByDungeon[dungeonId].push(id);
    });
  });

  // 図鑑コンプリート報酬。いずれも製作不可・ドロップ不可の★4遺装。
  const collectionRewards = {
    dungeon1: ['archive_reward_d1', '宵盗の蒼章', 'AZURE THIEF CREST', { dex: 4, luk: 4 }],
    dungeon2: ['archive_reward_d2', '静夜を破る黒章', 'SILENCE BREAKER CREST', { agi: 7, str: 5 }],
    dungeon3: ['archive_reward_d3', '崩界踏破の星環', 'WORLD END STAR RING', { mag: 8, mnd: 8, luk: 5 }]
  };
  D.equipmentCollections = {};
  for (const [dungeonId, [id, name, nameEn, bonuses]] of Object.entries(collectionRewards)) {
    addArmor(id, { name, nameEn, dungeonId, catalogDungeon: dungeonId, slot: 'accessory', stars: 4, rarity: 'epic', source: 'collection', bonuses, magicDefensePower: 12 + dungeonRank[dungeonId] * 4, description: `${dungeonId.toUpperCase().replace('UNGEON', 'UNGEON ')}の怪異遺装をすべて盗み取った証。` });
    D.equipmentCollections[dungeonId] = { id: `${dungeonId}_monster_equipment`, name: `${dungeonId.toUpperCase().replace('DUNGEON', 'D')} 怪異装備蒐集`, itemIds: [...new Set(monsterGearByDungeon[dungeonId])], rewardItemId: id };
  }

  // D1ボス：器用さ主軸＋魔力。魔奏士が最大活用し、魔導士にも有効。
  Object.assign(D.bossEquipmentSeries.zenacad.setBonuses, {
    2: { id: 'prelude', name: 'PRELUDE', description: '器用さ +10%', effect: { dexPercent: 10 } },
    4: { id: 'orchestrator', name: 'ORCHESTRATOR', description: '魔力 +8% / 魔法使用時12%でMP消費なし', effect: { magPercent: 8, freeMagicMpChance: .12 } },
    6: { id: 'cadenza', name: 'CADENZA', description: '魔法使用時8%で追加発動（MP再消費なし）', effect: { magicRepeatChance: .08 } }
  });
  Object.assign(D.weapons.cadenza_staff, { magicAttackPower: 46, scaling: { dex: .7, mag: .3 }, powerKey: 'magicAttackPower', damageType: 'magical', bonuses: { dex: 9, mag: 6, maxMp: 6 } });
  Object.assign(D.armors.soloist_mask, { bonuses: { dex: 7, mag: 4, mnd: 2 } });
  Object.assign(D.armors.soloist_coat, { defensePower: 15, magicDefensePower: 20, bonuses: { maxHp: 12, maxMp: 10, dex: 5, mag: 4 } });
  Object.assign(D.armors.maestro_gloves, { bonuses: { dex: 9, mag: 5 } });
  Object.assign(D.armors.finale_boots, { bonuses: { dex: 8, agi: 6 } });
  Object.assign(D.accessories.maestri_baton, { bonuses: { dex: 7, mag: 5, maxMp: 8 } });

  // D2ボス：右《赫牙》・左《影牙》の対。双刃士のSTR/AGIと武道家の高速物理に寄せる。
  D.items.myrthi_blade.name = '黒紅双刃・赫牙'; D.items.myrthi_blade.nameEn = 'CRIMSON FANG';
  Object.assign(D.weapons.myrthi_blade, { name: '黒紅双刃・赫牙', nameEn: 'CRIMSON FANG', attackPower: 48, bonuses: { str: 9, agi: 8 } });
  addWeapon('myrthi_blade_noctis', {
    name: '黒紅双刃・影牙', nameEn: 'SHADOW FANG', dungeonId: 'dungeon2', catalogDungeon: 'dungeon2',
    slot: 'leftHand', weaponType: 'martial', weaponSubtype: 'dualBlade', offHandOnly: true, stars: 5, rarity: 'legendary', seriesId: 'myrthi', source: 'boss',
    attackPower: 45, power: 3.05, bonuses: { str: 7, agi: 10 },
    description: '赫牙と対を成す左の黒刃。双刃士が左手へ装備した時、黒紅の軌跡が完成する。'
  });
  addRecipe('myrthi_blade_noctis_recipe', { seriesId: 'myrthi', craftCategory: 'boss', dungeonId: 'dungeon2', resultItemId: 'myrthi_blade_noctis', gold: 1000, materials: [{ itemId: 'myrthi_core', count: 2 }, { itemId: 'myrthi_fragment', count: 8 }, { itemId: 'silentNote', count: 6 }] });
  D.bossEquipmentSeries.myrthi.equipment = ['myrthi_blade', 'myrthi_blade_noctis', 'myrthi_headband', 'myrthi_coat', 'myrthi_bangle', 'myrthi_boots', 'myrthi_metro'];
  D.bossEquipmentSeries.myrthi.recipes = ['myrthi_blade_recipe', 'myrthi_blade_noctis_recipe', 'myrthi_headband_recipe', 'myrthi_coat_recipe', 'myrthi_bangle_recipe', 'myrthi_boots_recipe', 'myrthi_metro_recipe'];
  D.bossEquipmentSeries.myrthi.setBonuses = {
    2: { id: 'crossBeat', name: 'CROSS BEAT', description: '素早さ +8% / 力 +5%', effect: { agiPercent: 8, strPercent: 5 } },
    4: { id: 'accelerando', name: 'ACCELERANDO', description: 'クリティカル率 +7% / 素早さ +5%', effect: { critBonusFlat: .07, agiPercent: 5 } },
    7: { id: 'twinRiot', name: 'TWIN RIOT', description: '物理攻撃後12%で追加発動', effect: { physicalRepeatChance: .12 } }
  };
  Object.assign(D.bossEquipmentSeries.myrthi, {
    primaryJob: 'dualBlade', recommendedJobs: ['dualBlade', 'martialArtist'],
    concept: '双刃士を主軸に、武道家でも4SETまで活かせる高速物理シリーズ。'
  });
  const myrthiEnemy = D.enemies.myrthi;
  if (myrthiEnemy && !myrthiEnemy.dropTable.some(d => d.itemId === 'myrthi_blade_noctis')) myrthiEnemy.dropTable.push({ itemId: 'myrthi_blade_noctis', chance: .03 });

  // D3ボス：守護士を主軸に、戦士の盾運用にも適応する反奏防衛シリーズ。
  D.items.seripes_core = { id: 'seripes_core', name: '反奏騎士の聖核', nameEn: 'SERIPES CORE', category: 'material', rarity: 'legendary', bossId: 'seripes', description: 'セリペスの不落の意志が凝縮した白銀の魔核。' };
  D.items.reprise_fragment = { id: 'reprise_fragment', name: '反奏の白片', nameEn: 'REPRISE FRAGMENT', category: 'material', rarity: 'epic', bossId: 'seripes', description: '受けた力を返す性質を残した白い装甲片。' };
  for (const id of ['seripes_core', 'reprise_fragment']) if (!D.workshop.materialIds.includes(id)) D.workshop.materialIds.push(id);

  addWeapon('seripes_aegis', {
    name: '聖盾グランド・リプライズ', nameEn: 'GRAND REPRISE AEGIS', dungeonId: 'dungeon3', catalogDungeon: 'dungeon3',
    weaponType: 'shield', stars: 5, rarity: 'legendary', seriesId: 'seripes', source: 'boss', power: 3.35,
    recommendedJobs: ['guardian'], bonuses: { vit: 8, mnd: 6, maxHp: 18 }, description: '第三奏卿の大反奏を宿す白盾。守護士が受けた衝撃を共鳴へ変える。'
  });
  Object.assign(D.weapons.seripes_aegis, { defensePower: 54, magicDefensePower: 46, damageType: 'physical', damageStat: 'vit' });
  addWeapon('seripes_blade', {
    name: '白鉄の反奏剣', nameEn: 'REPRISE IRON SWORD', dungeonId: 'dungeon3', catalogDungeon: 'dungeon3',
    weaponType: 'sword', stars: 5, rarity: 'legendary', seriesId: 'seripes', source: 'boss', power: 3.15,
    attackPower: 46, defensePower: 16, magicDefensePower: 10, recommendedJobs: ['warrior'],
    bonuses: { str: 6, vit: 7, maxHp: 12 }, effects: { physicalDamageReductionPercent: .04 },
    description: 'セリペスが白盾と共に携えた実直な騎士剣。攻めながら受けの姿勢を崩さない。'
  });
  addArmor('seripes_crown', { name: '不落騎士の白冠', nameEn: 'IMPREGNABLE CROWN', dungeonId: 'dungeon3', catalogDungeon: 'dungeon3', slot: 'head', stars: 5, rarity: 'legendary', seriesId: 'seripes', source: 'boss', recommendedJobs: ['guardian', 'warrior'], defensePower: 24, magicDefensePower: 27, bonuses: { vit: 6, mnd: 5 }, description: '砕けぬ集中を保つ、静かな白銀の冠。' });
  addArmor('seripes_plate', { name: '反奏騎士の聖鎧', nameEn: 'REPRISE PLATE', dungeonId: 'dungeon3', catalogDungeon: 'dungeon3', slot: 'body', stars: 5, rarity: 'legendary', seriesId: 'seripes', source: 'boss', recommendedJobs: ['guardian', 'warrior'], defensePower: 48, magicDefensePower: 40, bonuses: { maxHp: 38, vit: 9, mnd: 6 }, description: '衝撃を受け止め、次の反撃へ共鳴させる城塞の聖鎧。' });
  addArmor('seripes_gauntlets', { name: '受響の篭手', nameEn: 'RESONANT GAUNTLETS', dungeonId: 'dungeon3', catalogDungeon: 'dungeon3', slot: 'arms', stars: 5, rarity: 'legendary', seriesId: 'seripes', source: 'boss', recommendedJobs: ['guardian', 'warrior'], defensePower: 27, magicDefensePower: 21, bonuses: { vit: 7, str: 5 }, description: '受けた衝撃を盾と拳へ伝える白銀の篭手。' });
  addArmor('seripes_greaves', { name: '城塞の白脚', nameEn: 'BASTION GREAVES', dungeonId: 'dungeon3', catalogDungeon: 'dungeon3', slot: 'feet', stars: 5, rarity: 'legendary', seriesId: 'seripes', source: 'boss', recommendedJobs: ['guardian', 'warrior'], defensePower: 31, magicDefensePower: 25, bonuses: { vit: 6, mnd: 4 }, description: 'いかなる衝撃にも陣形を崩さない白き脚甲。' });
  addArmor('seripes_sigil', { name: '第三奏の白印', nameEn: 'THIRD MAESTRI SIGIL', dungeonId: 'dungeon3', catalogDungeon: 'dungeon3', slot: 'accessory', stars: 5, rarity: 'legendary', seriesId: 'seripes', source: 'boss', recommendedJobs: ['guardian', 'warrior'], magicDefensePower: 18, bonuses: { maxHp: 22, vit: 6, mnd: 6 }, description: '第三奏卿の反奏を刻む白い紋章。守りの音を反撃へ変える。' });

  const seripesRecipes = {
    seripes_aegis_recipe: ['seripes_aegis', 1500, [['seripes_core', 2], ['reprise_fragment', 8], ['phantomCore', 4]]],
    seripes_blade_recipe: ['seripes_blade', 1450, [['seripes_core', 2], ['reprise_fragment', 8], ['darkIron', 8]]],
    seripes_crown_recipe: ['seripes_crown', 1050, [['seripes_core', 1], ['reprise_fragment', 6], ['darkIron', 5]]],
    seripes_plate_recipe: ['seripes_plate', 1400, [['seripes_core', 2], ['reprise_fragment', 8], ['voidEssence', 5]]],
    seripes_gauntlets_recipe: ['seripes_gauntlets', 1000, [['seripes_core', 1], ['reprise_fragment', 6], ['phantomCore', 4]]],
    seripes_greaves_recipe: ['seripes_greaves', 1000, [['seripes_core', 1], ['reprise_fragment', 5], ['voidShard', 6]]],
    seripes_sigil_recipe: ['seripes_sigil', 1250, [['seripes_core', 2], ['reprise_fragment', 7], ['darkSoulStone', 6]]]
  };
  Object.entries(seripesRecipes).forEach(([id, [resultItemId, gold, mats]]) => addRecipe(id, { seriesId: 'seripes', craftCategory: 'boss', dungeonId: 'dungeon3', resultItemId, gold, materials: mats.map(([itemId, count]) => ({ itemId, count })) }));
  D.bossEquipmentSeries.seripes = {
    id: 'seripes', name: 'SERIPES SERIES', nameJa: 'セリペスシリーズ', stars: 5,
    unlockCondition: { bossDefeated: 'seripes' }, primaryJob: 'guardian', recommendedJobs: ['guardian', 'warrior'],
    concept: '守護士は白盾、戦士は反奏剣を選び、受けた一撃を反撃へ変える防衛シリーズ。',
    equipment: ['seripes_aegis', 'seripes_blade', 'seripes_crown', 'seripes_plate', 'seripes_gauntlets', 'seripes_greaves', 'seripes_sigil'], maxEquippable: 6,
    recipes: Object.keys(seripesRecipes), dismantle: { materialId: 'reprise_fragment', count: 3 },
    setBonuses: {
      2: { id: 'antiphon', name: 'ANTIPHON', description: '体力 +8% / 精神 +8%', effect: { vitPercent: 8, mndPercent: 8 } },
      4: { id: 'bastion', name: 'BASTION', description: '被ダメージ10%軽減 / RESONANCE獲得量 +50%', effect: { damageReductionPercent: 10, resonanceGainMultiplier: 1.5 } },
      6: { id: 'grandReprise', name: 'GRAND REPRISE', description: '反撃率 +15% / 反撃威力 +50%', effect: { counterRateFlat: .15, counterPowerPercent: 50 } }
    }
  };
  const seripesEnemy = D.enemies.seripes;
  if (seripesEnemy) {
    if (!seripesEnemy.dropTable.some(d => d.itemId === 'reprise_fragment')) seripesEnemy.dropTable.push({ itemId: 'reprise_fragment', chance: 1 });
    if (!seripesEnemy.dropTable.some(d => d.itemId === 'seripes_core')) seripesEnemy.dropTable.push({ itemId: 'seripes_core', chance: .45 });
  }

  Object.assign(D.bossEquipmentSeries.zenacad, { primaryJob: 'magicKnight', recommendedJobs: ['magicKnight', 'mage'], concept: '魔奏士を主軸に、魔導士も扱える器用さ・魔力型シリーズ。' });

  // すべてのボス装備を★5として統一する。
  Object.values(D.bossEquipmentSeries || {}).forEach(series => (series.equipment || []).forEach(id => {
    if (D.items[id]) Object.assign(D.items[id], { stars: 5, rarity: 'legendary', source: 'boss', catalogDungeon: D.items[id].catalogDungeon || (series.id === 'zenacad' ? 'dungeon1' : series.id === 'myrthi' ? 'dungeon2' : 'dungeon3') });
  }));

  D.equipmentBalanceTargets = {
    dungeon1: { targetMinutes: '25〜40', craftStars: [2], dropStars: [4], bossStars: [5] },
    dungeon2: { targetMinutes: '120〜180', craftStars: [2, 3], dropStars: [4], bossStars: [5] },
    dungeon3: { targetMinutes: '360〜480', craftStars: [3], dropStars: [4], bossStars: [5] }
  };
})();
