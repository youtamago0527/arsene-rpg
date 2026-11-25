(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  const d5 = D.dungeons.find(dungeon => dungeon.id === 'dungeon5');
  const background = 'assets/bg/dungeon6/chromatic-observatory.webp';
  const art = file => 'assets/enemy-characters/dungeon6/' + file + '.webp';
  const battleMusic = '音楽系/戦闘用/D6-五光のフーガ.mp3';
  const bossMusic = '音楽系/戦闘用/D6-五光のフーガ-変奏.mp3';
  const tenfold = stats => Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, value * 10]));
  const moth = { id: 'prismMoth', name: '彩玻璃の夜蛾', sprite: art('prism-moth'),
    stats: tenfold(D.enemies.venomWeaver.stats), statRoundingUnit: D.enemies.venomWeaver.statRoundingUnit * 10,
    ai: [{ id: 'soulBolt', name: '分光鱗粉', kind: 'magic', weight: .7 }, { id: 'attack', name: '薄刃の翅', kind: 'physical', weight: .3 }] };
  const hound = { id: 'mirrorHound', name: '黒鏡の猟犬', sprite: art('mirror-hound'),
    stats: tenfold(D.enemies.repeatedHunter.stats), statRoundingUnit: D.enemies.repeatedHunter.statRoundingUnit * 10,
    ai: [{ id: 'ratBite', name: '反照の牙', kind: 'physical', weight: .6 }, { id: 'attack', name: '鏡爪', kind: 'physical', weight: .4 }] };
  const nestua = D.enemies.d5MidBoss;
  const surveyor = { id: 'astralSurveyor', name: '星環の測律機', sprite: art('astral-surveyor'), kind: 'boss', bossRank: 'midBoss', music: bossMusic,
    stats: { ...tenfold(nestua.form3.stats), maxHp: 10 * (nestua.stats.maxHp + nestua.form2.stats.maxHp + nestua.form3.stats.maxHp) },
    ai: [{ id: 'soulBolt', name: '星環照射', kind: 'magic', weight: .55 }, { id: 'attack', name: '振子撃', kind: 'physical', weight: .45 }] };
  const chromatia = Object.assign(D.futureBosses.chromatia, {
    sprite: art('chromatia'), kind: 'boss', bossRank: 'dungeonBoss', music: bossMusic, stats: tenfold(D.enemies.ostina.stats),
    ai: [{ id: 'soulBolt', name: '五光の変奏', kind: 'magic', weight: .6 }, { id: 'attack', name: '彩律の槍', kind: 'physical', weight: .4 }]
  });
  const enemies = [moth, hound, surveyor, chromatia];
  for (const enemy of enemies) Object.assign(enemy, { dungeonId: 'dungeon6', devOnly: true, futureOnly: true, exp: 0, gold: 0, dropTable: [] });
  const types = { venomWeaver: moth.id, repeatedHunter: hound.id };
  const names = ['分光回廊', '星環観測室', '五光の礼拝堂'];
  const dungeon = {
    id: 'dungeon6', name: '彩律天文堂', nameEn: 'CHROMATIC OBSERVATORY', unlockCondition: 'dungeon5Clear',
    background, thumbnail: background, music: battleMusic, bossId: chromatia.id, midBossId: surveyor.id, midBossAfterFloor: 2,
    description: '五色の光が音に変わる天文堂。硝子の大オルガンの奥で、第六奏卿が指揮を執る。',
    floors: d5.floors.map((floor, index) => ({
      id: 'd6f' + (index + 1), name: names[index], background, thumbnail: background, materials: [],
      winsToClear: floor.winsToClear, enemyScale: { ...floor.enemyScale },
      encounterProgression: floor.encounterProgression.map(tier => ({
        ...tier, pool: tier.pool.map(entry => ({ ...entry, id: types[entry.id] }))
      }))
    }))
  };
  D.futureContent.dungeon6 = { dungeon, enemies };
})();
