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

  // ★3＝各Dungeonの工房装備。名前はDungeonが進むほど格を上げる。
  //   D1 普通 → D2 ファンタジー → D3 聖堂/反奏 → D4 和風/紅葉
  // 各Dungeonは「導入品」と「仕上げ品(e)」の2段だが、どちらも★3。
  // 比較表の基準になるのは各Dungeonの仕上げ品のほう。
  const weaponLines = {
    sword: {
      d1:  ['forge_d1_sword',  '鉄の剣',       'IRON SWORD'],
      d2:  ['forge_d2_sword',  '鋼の剣',       'STEEL SWORD'],
      d2e: ['forge_d2e_sword', '銀装剣',       'SILVERCLAD BLADE'],
      d3:  ['forge_d3_sword',  '聖堂騎士の剣', 'CATHEDRAL BLADE'],
      d3e: ['forge_d3e_sword', '反奏の長剣',   'REPRISE LONGSWORD'],
      d4:  ['forge_d4_sword',  '打刀',         'UCHIGATANA']
    },
    martial: {
      d1:  ['forge_d1_martial',  '鉄爪',       'IRON CLAW'],
      d2:  ['forge_d2_martial',  '鋼爪',       'STEEL CLAW'],
      d2e: ['forge_d2e_martial', '銀爪',       'SILVER CLAW'],
      d3:  ['forge_d3_martial',  '破戒の爪',   'APOSTATE CLAW'],
      d3e: ['forge_d3e_martial', '鉄鎖の爪',   'IRONCHAIN CLAW'],
      d4:  ['forge_d4_martial',  '鉄甲',       'TEKKO GAUNTLET']
    },
    staff: {
      d1:  ['forge_d1_staff',  '樫の杖',       'OAK STAFF'],
      d2:  ['forge_d2_staff',  '魔銀の杖',     'MITHRIL STAFF'],
      d2e: ['forge_d2e_staff', '蒼星の杖',     'AZURE STAR STAFF'],
      d3:  ['forge_d3_staff',  '司祭の杖',     'PRIEST STAFF'],
      d3e: ['forge_d3e_staff', '聖堂の錫杖',   'CATHEDRAL CROSIER'],
      d4:  ['forge_d4_staff',  '紅木の杖',     'CRIMSONWOOD STAFF']
    },
    instrument: {
      d2:  ['forge_d2_instrument',  '調べの横笛',   'TUNING FLUTE'],
      d2e: ['forge_d2e_instrument', '双月の竪琴',   'TWIN MOON LYRE'],
      d3:  ['forge_d3_instrument',  '聖堂の聖歌琴', 'CATHEDRAL PSALTERY'],
      d3e: ['forge_d3e_instrument', '祈響の弦',     'PRAYER RESONATOR'],
      d4:  ['forge_d4_instrument',  '紅葉の琵琶',   'CRIMSON BIWA']
    }
  };
  // ★3の基準値（剣ATK）。Dungeonが進むごとに同レアリティ同士で
  //   D1=12 → D2=18(×1.5) → D3=36(×2.0) → D4=108(×3.0)
  // 各Dungeonの「仕上げ品(e)」がその段の基準。導入品はその手前に置く。
  const weaponPower = {
    d1:  { stars: 3, attack: 12,  power: 2.25 },
    d2:  { stars: 3, attack: 15,  power: 2.55 },
    d2e: { stars: 3, attack: 18,  power: 2.70 },
    d3:  { stars: 3, attack: 29,  power: 3.05 },
    d3e: { stars: 3, attack: 36,  power: 3.20 },
    d4:  { stars: 3, attack: 108, power: 3.60 }
  };
  // 武器種ごとの基礎攻撃力の比。爪は手数・追撃・連舞・会心・AGIが乗るため
  // 単発を明確に低くする（§11：剣の65〜75%）。杖/楽器は魔法攻撃力として使う。
  const weaponAttackRate = { sword: 1.00, martial: 0.70, staff: 1.08, instrument: 1.08 };
  const dungeonForStage = stage => stage.startsWith('d1') ? 'dungeon1' : stage.startsWith('d2') ? 'dungeon2' : stage.startsWith('d4') ? 'dungeon4' : 'dungeon3';
  const weaponMaterials = {
    d1: [{ itemId: 'rustedKnife', count: 3 }, { itemId: 'manaDrop', count: 3 }, { itemId: 'batFang', count: 2 }],
    d2: [{ itemId: 'echoShard', count: 4 }, { itemId: 'reverbJelly', count: 3 }, { itemId: 'violinString', count: 2 }],
    d3: [{ itemId: 'voidShard', count: 5 }, { itemId: 'darkIron', count: 4 }, { itemId: 'chaosDust', count: 3 }],
    // D4は「そのDungeonで通常DROPする素材」だけで作れること（§84）。
    // 瞬鋼片・月刃鉱はD4雑魚が55%前後で落とす通常素材。
    d4: [{ itemId: 'flashSteel', count: 6 }, { itemId: 'moonEdgeOre', count: 5 }]
  };
  const previousStage = { d2e: 'd2', d3e: 'd3' };
  const stageMaterials = stage => stage.startsWith('d1') ? weaponMaterials.d1
    : stage.startsWith('d2') ? weaponMaterials.d2
    : stage.startsWith('d4') ? weaponMaterials.d4 : weaponMaterials.d3;
  const stageGold = { d1: 180, d2: 420, d2e: 760, d3: 980, d3e: 1320, d4: 3200 };
  const armorGold = { d1: 130, d2: 320, d2e: 590, d3: 760, d3e: 1080, d4: 2600 };
  for (const [type, stages] of Object.entries(weaponLines)) {
    for (const [stage, [id, name, nameEn]] of Object.entries(stages)) {
      const p = weaponPower[stage], dungeonId = dungeonForStage(stage), magical = type === 'staff' || type === 'instrument';
      const rated = Math.round(p.attack * (weaponAttackRate[type] ?? 1));
      addWeapon(id, {
        name, nameEn, dungeonId, catalogDungeon: dungeonId, weaponType: type, stars: p.stars,
        rarity: rarityFor(p.stars), source: 'workshop', attackPower: magical ? 0 : rated,
        magicAttackPower: magical ? rated : 0, power: p.power, bonuses: {},
        scaling: type === 'instrument' ? { dex: .65, mag: .35 } : null,
        powerKey: magical ? 'magicAttackPower' : 'attackPower', damageType: magical ? 'magical' : 'physical',
        description: `${dungeonId.toUpperCase().replace('UNGEON', '')}工房規格。基本能力は変えず、${magical ? '術式出力' : '武器攻撃力'}を高める。`
      });
      const prior = previousStage[stage] ? weaponLines[type][previousStage[stage]]?.[0] : null;
      const mats = stageMaterials(stage);
      addRecipe(`${id}_recipe`, {
        name, craftCategory: 'weapon', dungeonId, resultItemId: id,
        gold: stageGold[stage] ?? 980,
        materials: [...(prior ? [{ itemId: prior, count: 1 }] : []), ...mats.map(m => ({ ...m, count: m.count + (stage.endsWith('e') ? 2 : 0) }))]
      });
    }
  }

  const armorSlots = ['leftHand', 'head', 'body', 'arms', 'feet', 'accessory'];
  // 並びは armorSlots と同じ [左手(盾), 頭, 体, 腕, 足, アクセ]
  const armorNames = {
    d1:  ['木盾',       '革の帽子',     '冒険者の服',   '革の手袋',   '革のブーツ',   '古びた護符'],
    d2:  ['鋼の盾',     '鋼の兜',       '強化革鎧',     '魔銀の腕輪', '軽業の靴',     '魔除けの首飾り'],
    d2e: ['双月盾',     '紅影の頭巾',   '双月の軽装',   '連撃の籠手', '風走りの靴',   '双星の護符'],
    d3:  ['聖堂盾',     '聖堂騎士の兜', '聖堂装束',     '鉄鎖の籠手', '巡礼者の靴',   '聖印'],
    d3e: ['反奏の大盾', '不落の兜',     '反奏の法衣',   '受響の籠手', '聖域の脚甲',   '反響石'],
    d4:  ['和鉄の盾',   '鉢金',         '紅染めの胴衣', '武者籠手',   '草履',         '紅葉守']
  };
  const armorPower = {
    d1:  { stars: 3, def: 6,  mdef: 5 },
    d2:  { stars: 3, def: 9,  mdef: 8 },
    d2e: { stars: 3, def: 12, mdef: 11 },
    d3:  { stars: 3, def: 19, mdef: 18 },
    d3e: { stars: 3, def: 24, mdef: 22 },
    d4:  { stars: 3, def: 72, mdef: 66 }
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
      // ★3工房品は基礎能力（STR/MAG/HP/MP等）を一切上げない。
      // 役割差は攻撃力・魔法攻撃力・防御力・魔法防御力だけで作り、
      // 基礎能力補正はDROP限定の★4とボス★5から解禁する。
      const profile = isAccessory
        ? { defensePower: 0, magicDefensePower: 0, bonuses: {}, role: '補助枠' }
        : isShield
          // 盾：物理に寄せる。魔法を受けたいなら頭で魔防を稼ぐ、という住み分け。
          ? { defensePower: r(.85), magicDefensePower: r(.20), bonuses: {}, role: '物理防御' }
          : slot === 'head'
            // 頭：魔防。魔法職の主力枠。物理防御は持たない。
            ? { defensePower: 0, magicDefensePower: r(.65), bonuses: {}, role: '魔法防御' }
            : slot === 'body'
              // 体：物理防御の主力。HPはおまけ程度に留める。
              ? { defensePower: r(.85), magicDefensePower: 0, bonuses: {}, role: '物理防御' }
              : slot === 'arms'
                // 手：素の力と器用さを伸ばす。装備の攻撃力ではなく能力値で効かせる。
                ? { defensePower: r(.20), magicDefensePower: 0, bonuses: {}, role: '軽量防御' }
                // 足：防御は薄く、素早さで避ける。
                : { defensePower: r(.20), magicDefensePower: r(.20), bonuses: {}, role: '均衡防御' };
      addArmor(id, {
        name, nameEn: `${stage.toUpperCase()} ${slot.toUpperCase()}`, dungeonId, catalogDungeon: dungeonId,
        slot, stars: p.stars, rarity: rarityFor(p.stars), source: 'workshop',
        bonuses: profile.bonuses, defensePower: profile.defensePower, magicDefensePower: profile.magicDefensePower,
        ...(profile.attackPower ? { attackPower: profile.attackPower } : {}),
        description: `${dungeonId.toUpperCase().replace('UNGEON', '')}工房規格。${profile.role}に寄せた装備。`
      });
      const priorStage = previousStage[stage], prior = priorStage ? `forge_${priorStage}_${slot}` : null;
      const mats = stageMaterials(stage);
      addRecipe(`${id}_recipe`, {
        name, craftCategory: 'armor', dungeonId, resultItemId: id,
        gold: armorGold[stage] ?? 760,
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
    arms: ['魔骸手', 'FIEND ARMS'], feet: ['夜渡靴', 'NIGHTWALKER'], accessory: ['怪異核', 'MONSTER CORE'],
    // 左手枠。盾は全JOBが左手へ、守護士・ファントムシーフは右手へも構えられる。
    // 双牙は offHandOnly の双刃で、《二刀の型》を持つ双刃士だけが左手に持てる。
    shield: ['怪盾', 'MONSTER AEGIS'], dualBlade: ['双牙', 'FIEND TWINFANG']
  };
  const monsterGearByDungeon = { dungeon1: [], dungeon2: [], dungeon3: [], dungeon4: [] };
  const normalEnemies = Object.values(D.enemies || {}).filter(e => ['dungeon1', 'dungeon2', 'dungeon3', 'dungeon4'].includes(e.dungeonId || (() => {
    for (const d of D.dungeons || []) {
      const tiers = [...(d.encounterProgression || []), ...(d.floors || []).flatMap(f => f.encounterProgression || [])];
      if (tiers.some(t => (t.pool || []).some(p => p.id === e.id))) return d.id;
    }
    return null;
  })()) && e.kind !== 'boss' && !['zenakado', 'myrthi', 'noelFirstEncounter', 'astact', 'd4MidBoss'].includes(e.id));
  const typeCycle = ['sword', 'staff', 'martial', 'head', 'body', 'arms', 'feet', 'accessory', 'instrument', 'shield', 'dualBlade'];
  // ★4の基礎DROP率（§4）。図鑑称号などの倍率は rollDrops() 側でこの値へ乗算される。
  // 旧値は約1%。さらにDROP特性の+2%が加算され、D1の一部敵は候補が2個あったため
  // 1戦で★4を引く確率が約6%まで膨らんでいた。★3製作を先に体験できる水準へ落とす。
  const dungeonChance = { dungeon1: .0040, dungeon2: .0035, dungeon3: .0030, dungeon4: .0025 };
  const dungeonRank = { dungeon1: 1, dungeon2: 2, dungeon3: 3, dungeon4: 4 };
  // ★4の基礎性能。★3の仕上げ品 +5(×1.75) をさらに1.10倍した値＝★3の1.93倍。
  // 「★3を+5まで鍛えた人が、拾った瞬間に乗り換えたくなる」水準（§65）。
  const star4Attack = { dungeon1: 23, dungeon2: 35, dungeon3: 69, dungeon4: 208 };
  const star4ArmorBudget = { dungeon1: 21, dungeon2: 32, dungeon3: 63, dungeon4: 190 };
  normalEnemies.forEach((enemy, index) => {
    const dungeonId = enemy.dungeonId || (D.dungeons || []).find(d => [...(d.encounterProgression || []), ...(d.floors || []).flatMap(f => f.encounterProgression || [])].some(t => (t.pool || []).some(p => p.id === enemy.id)))?.id;
    if (!dungeonId) return;
    const assigned = d1Unique[enemy.id] || [`monster_relic_${enemy.id}`];
    assigned.forEach((id, subIndex) => {
      let kind = typeCycle[(index + subIndex) % typeCycle.length];
      const existing = D.items[id];
      if (existing?.slot && existing.slot !== 'rightHand') kind = existing.slot;
      else if (D.weapons[id]) kind = D.weapons[id].weaponType;
      const weaponKind = ['sword', 'staff', 'martial', 'instrument', 'dualBlade'].includes(kind);
      const [prefix, enPrefix] = suffixes[kind], displayName = existing?.name || `${prefix}《${enemy.name}》`;
      const rank = dungeonRank[dungeonId], bonusValue = 2 + rank * 2;
      // ★4から初めて基礎能力が付く。各武器系統/JOBに用途を持たせつつ、
      // 行動順・回避へ同時に効くAGIは他能力の半分以下に抑える。LUKは装備補正に使わない。
      const accessoryProfiles = [
        { str: bonusValue, dex: Math.max(2, bonusValue - 2) },
        { mag: bonusValue, maxMp: 4 * rank },
        { dex: bonusValue, mnd: Math.max(2, bonusValue - 2) }
      ];
      let bonuses = weaponKind
        ? (kind === 'staff' ? { mag: bonusValue, mnd: Math.max(2, bonusValue - 2) }
          : kind === 'instrument' ? { dex: bonusValue, mag: Math.max(2, bonusValue - 2) }
          : kind === 'martial' ? { str: bonusValue, agi: Math.max(1, Math.floor(bonusValue * .4)) }
          : kind === 'dualBlade' ? { str: bonusValue, dex: Math.max(2, bonusValue - 2), agi: Math.max(1, Math.floor(bonusValue * .3)) }
          : { str: bonusValue, dex: Math.max(2, bonusValue - 2) })
        : kind === 'shield' ? { vit: bonusValue, mnd: Math.max(2, bonusValue - 2) }
        : kind === 'body' ? { vit: bonusValue, mnd: Math.max(2, bonusValue - 2) }
        : kind === 'head' ? { mag: bonusValue, mnd: Math.max(2, bonusValue - 2) }
        : kind === 'arms' ? { str: bonusValue, dex: bonusValue }
        : kind === 'feet' ? { dex: bonusValue, agi: Math.max(1, Math.floor(bonusValue * .4)) }
        : accessoryProfiles[(index + subIndex) % accessoryProfiles.length];
      // D1は7通常JOBがそれぞれ最初の目標装備を持てるよう、既存固有品を明示配分する。
      const d1BonusProfiles = {
        shadowWand: { mag: 4, mnd: 2 },                         // 魔導士
        slimeRing: { vit: 4, mnd: 2 },                         // 守護士
        soulRobe: { mag: 4, mnd: 3, maxMp: 6 },                // 僧侶
        ratBoots: { dex: 4, agi: 2 },                          // 武道家
        goblinGloves: { str: 4, vit: 2 },                      // 戦士
        nightHat: { dex: 4, mag: 3 },                          // 魔奏士
        ghostBoneReliquary: { str: 4, dex: 3, agi: 1 }         // 双刃士
      };
      if (d1BonusProfiles[id]) bonuses = d1BonusProfiles[id];
      const accessoryOverrides = {
        // アクセは不足能力を埋める調整枠。攻撃系2種を用意し、LUK/AGIは付けない。
        monster_relic_nocturneBanshee: { mag: 6, maxMp: 8 },
        monster_relic_requiemKnight: { str: 6, dex: 4 }
      };
      if (accessoryOverrides[id]) bonuses = accessoryOverrides[id];
      const common = {
        name: displayName, nameEn: existing?.nameEn || `${enPrefix} // ${enemy.enName || enemy.id.toUpperCase()}`,
        dungeonId, catalogDungeon: dungeonId, stars: 4, rarity: 'epic', source: 'dropOnly', dropEnemyId: enemy.id,
        bonuses, description: `${enemy.name}の怪異性が凝固した一点物。基本能力まで引き上げる、工房では再現できない遺装。`
      };
      if (weaponKind || existing?.slot === 'rightHand') {
        const base = star4Attack[dungeonId] || 23;
        // 双牙は体術武器として扱い、左手専用の双刃にする。
        const isTwin = kind === 'dualBlade', wt = isTwin ? 'martial' : (weaponKind ? kind : 'staff');
        const rated = Math.round(base * (weaponAttackRate[wt] ?? 1) * (isTwin ? .92 : 1));
        addWeapon(id, {
          ...common, weaponType: wt,
          // 双刃は左右を区別しない。slot は rightHand のままにして、
          // 左手へは isLeftHandItemAllowed() が双刃かどうかで判定する。
          ...(isTwin ? { weaponSubtype: 'dualBlade' } : {}),
          attackPower: ['sword', 'martial'].includes(wt) ? rated : 0,
          magicAttackPower: ['staff', 'instrument'].includes(wt) ? rated : 0, power: 2.7 + rank * .2
        });
      } else {
        // ★4も部位ごとに役割を分ける。以前は頭も体も足もアクセまで
        // def/mdef を両方同じだけ持っていて、一式そろえると無条件に固くなった。
        // ランクごとの総量は据え置き、配分だけ変える。
        const ab = star4ArmorBudget[dungeonId] || (17 + rank * 10), ar = n => Math.round(ab * n);
        const armorProfile = id === 'soulRobe'
          ? { defensePower: 0, magicDefensePower: ar(.70) }
          :
          // 盾は物理に寄せる。★3工房の盾と同じ役割分担にそろえる。
          kind === 'shield' ? { defensePower: ar(.85), magicDefensePower: ar(.20) }
          : kind === 'head' ? { defensePower: 0, magicDefensePower: ar(.70) }
          : kind === 'body' ? { defensePower: ar(.70), magicDefensePower: 0 }
          : kind === 'arms' ? { defensePower: ar(.20), magicDefensePower: 0, attackPower: ar(.45) }
          : kind === 'feet' ? { defensePower: ar(.22), magicDefensePower: ar(.22) }
          // アクセは防御を持たない。素の能力で個性を出す枠にする。
          : { defensePower: 0, magicDefensePower: 0 };
        addArmor(id, { ...common, slot: kind === 'shield' ? 'leftHand' : kind, ...armorProfile });
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
    6: { id: 'cadenza', name: 'CADENZA', description: '魔法使用時8%で追加発動／弱化版《ソロ》15%（魔奏士は本家へ+12%）', effect: { magicRepeatChance: .08, soloChance: .15, soloChanceBonus: .12 } }
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
    weaponType: 'martial', weaponSubtype: 'dualBlade', stars: 5, rarity: 'legendary', seriesId: 'myrthi', source: 'boss',
    attackPower: 45, power: 3.05, bonuses: { str: 7, agi: 10 },
    description: '赫牙と対を成す左の黒刃。双刃士が左手へ装備した時、黒紅の軌跡が完成する。'
  });
  addRecipe('myrthi_blade_noctis_recipe', { seriesId: 'myrthi', craftCategory: 'boss', dungeonId: 'dungeon2', resultItemId: 'myrthi_blade_noctis', gold: 1000, materials: [{ itemId: 'myrthi_core', count: 2 }, { itemId: 'myrthi_fragment', count: 8 }, { itemId: 'silentNote', count: 6 }] });
  D.bossEquipmentSeries.myrthi.equipment = ['myrthi_blade', 'myrthi_blade_noctis', 'myrthi_headband', 'myrthi_coat', 'myrthi_bangle', 'myrthi_boots', 'myrthi_metro'];
  D.bossEquipmentSeries.myrthi.recipes = ['myrthi_blade_recipe', 'myrthi_blade_noctis_recipe', 'myrthi_headband_recipe', 'myrthi_coat_recipe', 'myrthi_bangle_recipe', 'myrthi_boots_recipe', 'myrthi_metro_recipe'];
  D.bossEquipmentSeries.myrthi.setBonuses = {
    2: { id: 'crossBeat', name: 'CROSS BEAT', description: '素早さ +8% / 力 +5%', effect: { agiPercent: 8, strPercent: 5 } },
    4: { id: 'accelerando', name: 'ACCELERANDO', description: 'クリティカル率 +7% / 素早さ +5%', effect: { critBonusFlat: .07, agiPercent: 5 } },
    // 7部位目の《影牙》は双刃士しか左手に持てないため、閾値を7にすると
    // 他JOBはFULL SETへ到達できず弱化版《連舞》が一生発動しない。
    // 実際に着られる最大数（右手＋防具5＝6）を閾値にする。
    6: { id: 'twinRiot', name: 'TWIN RIOT', description: '物理攻撃後12%で追加発動／弱化版《連舞》1段+1%（双刃士は本家へ上乗せ）', effect: { physicalRepeatChance: .12, comboDancePerStack: .01 } }
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
    name: '聖剣グランド・リプライズ', nameEn: 'GRAND REPRISE BLADE', dungeonId: 'dungeon3', catalogDungeon: 'dungeon3',
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
      // 致死をHP1で耐える能力は既存の《不落》(lastStand) をそのまま借りる（§36）。
      // 守護士は素で《不落》を持ちセットを着ても何も増えないため、本家適性として
      // 「耐えた瞬間にRESONANCEが最大になる」を与える（§38の例示に沿う）。
      // HPは1のままなので耐久はほぼ増えず、必中の《RESONANCE BREAK》を
      // 最大倍率で撃てるかどうかの一回勝負になる。回数は1戦闘1回のまま（§37）。
      6: { id: 'grandReprise', name: 'GRAND REPRISE', description: '反撃率 +15% / 反撃威力 +50% ／ 戦闘中1回、致死ダメージをHP1で耐える（守護士は耐えた瞬間にRESONANCE最大）', effect: { counterRateFlat: .15, counterPowerPercent: 50, lastStand: true }, jobEffects: { guardian: { lastStandResonanceFull: true } } }
    }
  };
  const seripesEnemy = D.enemies.seripes;
  if (seripesEnemy) {
    if (!seripesEnemy.dropTable.some(d => d.itemId === 'reprise_fragment')) seripesEnemy.dropTable.push({ itemId: 'reprise_fragment', chance: 1 });
    if (!seripesEnemy.dropTable.some(d => d.itemId === 'seripes_core')) seripesEnemy.dropTable.push({ itemId: 'seripes_core', chance: .45 });
  }

  Object.assign(D.bossEquipmentSeries.zenacad, { primaryJob: 'magicKnight', recommendedJobs: ['magicKnight', 'mage'], concept: '魔奏士を主軸に、魔導士も扱える器用さ・魔力型シリーズ。' });

  // ══ D4ボス：アスタクト / STACCATO ══════════════════════════
  // 見切り・カウンター・DEX/AGI がテーマ（§29/§39）。
  // 新しい「回避率」ステータスは作らず、AGI/DEX を伸ばして
  // 既存の命中/回避判定の上で avoid させる。
  D.items.astact_core = { id: 'astact_core', name: '瞬断の奏核', nameEn: 'STACCATO CORE', category: 'material', rarity: 'legendary', bossId: 'astact', description: 'アスタクトの断ち切る一瞬が固着した奏核。' };
  D.items.staccato_fragment = { id: 'staccato_fragment', name: '断奏の刃片', nameEn: 'STACCATO SHARD', category: 'material', rarity: 'epic', bossId: 'astact', description: '斬撃の残響だけが残った、薄く鋭い刃の欠片。' };
  for (const id of ['astact_core', 'staccato_fragment']) if (!D.workshop.materialIds.includes(id)) D.workshop.materialIds.push(id);

  const A4 = { dungeonId: 'dungeon4', catalogDungeon: 'dungeon4', stars: 5, rarity: 'legendary', seriesId: 'astact', source: 'boss' };
  addWeapon('astact_katana', { ...A4, name: '暮月一閃', nameEn: 'STACCATO EDGE', weaponType: 'sword', power: 3.75,
    attackPower: 401, bonuses: { agi: 16, dex: 14, str: 10 },
    description: '振り抜いた音だけが遅れて届く打刀。速さそのものを刃にした第四奏卿の得物。' });
  addWeapon('astact_tekko', { ...A4, name: '瞬影鉄甲', nameEn: 'AFTERIMAGE TEKKO', weaponType: 'martial', power: 3.60,
    attackPower: 281, bonuses: { agi: 18, dex: 12, str: 8 },
    description: '拳が像を置き去りにする鉄甲。武道家・双刃士の手数へ噛み合う。' });
  addArmor('astact_hachigane', { ...A4, name: '宵紅の鉢金', nameEn: 'STACCATO HACHIGANE', slot: 'head', defensePower: 0, magicDefensePower: 172, bonuses: { dex: 12, mnd: 8, maxMp: 22 }, description: '一瞬先を読むための静けさを保つ鉢金。' });
  addArmor('astact_haori', { ...A4, name: '散華の羽織', nameEn: 'SCATTER HAORI', slot: 'body', defensePower: 220, magicDefensePower: 0, bonuses: { agi: 14, maxHp: 60, dex: 8 }, description: '斬られた紅葉が舞うだけで、身は既にそこに無い。' });
  addArmor('astact_kote', { ...A4, name: '月影の籠手', nameEn: 'MOONSHADOW KOTE', slot: 'arms', defensePower: 52, magicDefensePower: 0, attackPower: 118, bonuses: { dex: 14, str: 10 }, description: '返す刃の軌道を整える籠手。' });
  addArmor('astact_tabi', { ...A4, name: '紅葉踏み', nameEn: 'CRIMSON TREAD', slot: 'feet', defensePower: 58, magicDefensePower: 58, bonuses: { agi: 20, dex: 10 }, description: '落葉を鳴らさずに間合いを詰める足袋。' });
  addArmor('astact_magatama', { ...A4, name: '暮月の勾玉', nameEn: 'DUSKMOON MAGATAMA', slot: 'accessory', defensePower: 0, magicDefensePower: 0, bonuses: { agi: 12, dex: 12, luk: 2 }, description: '欠けた月の形に削られた勾玉。見切りの呼吸を整える。' });

  const astactRecipes = {
    astact_katana_recipe:   ['astact_katana',   4200, [['astact_core', 2], ['staccato_fragment', 10], ['moonEdgeOre', 12]]],
    astact_tekko_recipe:    ['astact_tekko',    4000, [['astact_core', 2], ['staccato_fragment', 10], ['flashSteel', 12]]],
    astact_hachigane_recipe:['astact_hachigane',3000, [['astact_core', 1], ['staccato_fragment', 7],  ['moonEdgeOre', 8]]],
    astact_haori_recipe:    ['astact_haori',    3800, [['astact_core', 2], ['staccato_fragment', 9],  ['flashSteel', 10]]],
    astact_kote_recipe:     ['astact_kote',     3200, [['astact_core', 1], ['staccato_fragment', 8],  ['flashSteel', 8]]],
    astact_tabi_recipe:     ['astact_tabi',     3000, [['astact_core', 1], ['staccato_fragment', 7],  ['moonEdgeOre', 7]]],
    astact_magatama_recipe: ['astact_magatama', 3400, [['astact_core', 2], ['staccato_fragment', 8],  ['moonEdgeOre', 9]]]
  };
  Object.entries(astactRecipes).forEach(([id, [resultItemId, gold, mats]]) => addRecipe(id, { seriesId: 'astact', craftCategory: 'boss', dungeonId: 'dungeon4', resultItemId, gold, materials: mats.map(([itemId, count]) => ({ itemId, count })) }));

  D.bossEquipmentSeries.astact = {
    id: 'astact', name: 'STACCATO SERIES', nameJa: 'アスタクトシリーズ', stars: 5,
    unlockCondition: { bossDefeated: 'astact' },
    equipment: ['astact_katana', 'astact_tekko', 'astact_hachigane', 'astact_haori', 'astact_kote', 'astact_tabi', 'astact_magatama'],
    recipes: Object.keys(astactRecipes),
    dismantle: { materialId: 'staccato_fragment', count: 3 },
    primaryJob: null, recommendedJobs: ['dualBlade', 'martialArtist', 'warrior'],
    concept: '見切りと反撃。AGI/DEXを伸ばして既存の命中判定の上で避け、外させた隙を斬り返す。',
    setBonuses: {
      2: { id: 'sight', name: 'SIGHT', description: '器用さ +5%', effect: { dexPercent: 5 } },
      4: { id: 'afterimage', name: 'AFTERIMAGE', description: '素早さ +5%', effect: { agiPercent: 5 } },
      // 暮月一閃(剣)と瞬影鉄甲(爪)はどちらも右手なので、実際に着られるのは
      // 右手＋防具5の6部位が上限。閾値7では永久に発動しなかった。
      6: { id: 'staccato', name: 'STACCATO', description: '回避に成功したとき25%で反撃', effect: { evadeCounterChance: .25 } }
    }
  };
  const astactEnemy = D.enemies.astact;
  if (astactEnemy) for (const id of ['astact_core', 'staccato_fragment']) if (!astactEnemy.dropTable.some(d => d.itemId === id)) astactEnemy.dropTable.push({ itemId: id, chance: 1 });

  // ══ ★5の正規化 ════════════════════════════════════════════
  // ★5 = そのDungeonの★3 × 3.71（★3+5 ×1.10 ×1.75 ×1.10 の帰結）。
  // 手書きの旧値のままだとD1〜D3の★5が新しい★3/★4に追い抜かれるため、
  // シリーズ単位で「最大の攻撃力」を目標値へ合わせ、同じ倍率を
  // そのシリーズの全装備の攻撃・防御へ掛けて相対関係を保つ。
  // ★3 × 3.90。★4+6（★3×3.67）をわずかに上回る位置に置き、
  // 「+6まで鍛えても★5がまだ上、でも集めるのは大変」という拮抗を作る。
  const star5Attack = { dungeon1: 47, dungeon2: 70, dungeon3: 140, dungeon4: 421 };
  // ★5防具の予算（def+mdef）。そのDungeonの★3仕上げ品 × 3.90。
  // ゼナカド・ミルティの防具は元々 bonuses しか持たず防御力が0で、
  // D3/D4の★5と比較すらできなかったため、ここで部位別に配分する。
  const star5ArmorBudget = { dungeon1: 43, dungeon2: 90, dungeon3: 179, dungeon4: 538 };
  // 配分は★3工房と同じ役割分担（盾＝物理、頭＝魔防、体＝物理、腕・足＝薄め、アクセ＝0）。
  const star5SlotSplit = {
    leftHand: [.85, .20], head: [0, .65], body: [.85, 0],
    arms: [.20, 0], feet: [.20, .20], accessory: [0, 0]
  };
  const seriesDungeon = { zenacad: 'dungeon1', myrthi: 'dungeon2', seripes: 'dungeon3', astact: 'dungeon4' };
  const powerKeys = ['attackPower', 'magicAttackPower', 'defensePower', 'magicDefensePower'];
  const gearOf = id => D.weapons[id] || D.armors?.[id] || D.accessories?.[id] || D.equipment?.[id];
  for (const [seriesId, dungeonId] of Object.entries(seriesDungeon)) {
    const series = D.bossEquipmentSeries[seriesId]; if (!series) continue;
    const gears = (series.equipment || []).map(gearOf).filter(Boolean);
    // 基準は「そのシリーズで最も攻撃力の高い武器」。剣なら等倍、爪なら0.70で読み替える。
    let best = 0;
    for (const gear of gears) {
      const raw = Math.max(gear.attackPower || 0, gear.magicAttackPower || 0);
      if (!raw) continue;
      const rate = weaponAttackRate[gear.weaponType] ?? 1;
      best = Math.max(best, raw / rate);
    }
    if (best) {
      const factor = (star5Attack[dungeonId] || best) / best;
      if (Math.abs(factor - 1) >= 0.01)
        for (const gear of gears) for (const key of powerKeys) if (gear[key]) gear[key] = Math.max(1, Math.round(gear[key] * factor));
    }
    // 防具は部位ごとに予算を配り直す。武器（weaponType持ち）には触れない。
    const budget = star5ArmorBudget[dungeonId];
    if (!budget) continue;
    for (const gear of gears) {
      if (gear.weaponType) continue;
      const split = star5SlotSplit[gear.slot]; if (!split) continue;
      gear.defensePower = Math.round(budget * split[0]);
      gear.magicDefensePower = Math.round(budget * split[1]);
    }
  }

  // すべてのボス装備を★5として統一する。
  Object.values(D.bossEquipmentSeries || {}).forEach(series => (series.equipment || []).forEach(id => {
    if (D.items[id]) Object.assign(D.items[id], { stars: 5, rarity: 'legendary', source: 'boss', catalogDungeon: D.items[id].catalogDungeon || seriesDungeon[series.id] || 'dungeon3' });
  }));

  // ★5現物は素材製作とは別枠の大当たり。各装備3%の独立抽選では一度に複数落ち、
  // シリーズ収集も★4より早くなっていたため、全ボス共通で1個あたり0.1%へ正規化する。
  Object.values(D.enemies || {}).forEach(enemy => (enemy.dropTable || []).forEach(drop => {
    const item = D.items[drop.itemId];
    if (item?.category === 'equipment' && item.source !== 'secretGuitar' && (item.source === 'boss' || Number(item.stars) === 5)) drop.chance = .001;
  }));

  D.equipmentBalanceTargets = {
    dungeon1: { targetMinutes: '25〜40', craftStars: [3], dropStars: [4], bossStars: [5] },
    dungeon2: { targetMinutes: '120〜180', craftStars: [3], dropStars: [4], bossStars: [5] },
    dungeon3: { targetMinutes: '360〜480', craftStars: [3], dropStars: [4], bossStars: [5] },
    dungeon4: { targetMinutes: '600〜900', craftStars: [3], dropStars: [4], bossStars: [5] }
  };
})();
