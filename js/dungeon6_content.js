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
  const surveyor = { id: 'astralSurveyor', name: '星環の測律機', sprite: art('astral-surveyor'),
    stats: tenfold(D.enemies.repeatedHunter.stats), statRoundingUnit: D.enemies.repeatedHunter.statRoundingUnit * 10,
    ai: [{ id: 'soulBolt', name: '星環照射', kind: 'magic', weight: .55 }, { id: 'attack', name: '振子撃', kind: 'physical', weight: .45 }] };
  const chromatia = Object.assign(D.futureBosses.chromatia, {
    kind: 'boss', bossRank: 'dungeonBoss', music: bossMusic, ignoreFloorStatScale: true, stats: tenfold(D.enemies.ostina.stats),
    ai: [{ id: 'soulBolt', name: '五光の変奏', kind: 'magic', weight: .6 }, { id: 'attack', name: '彩律の矢', kind: 'physical', weight: .4 }]
  });
  const enemies = [moth, hound, surveyor, chromatia];
  for (const enemy of enemies) Object.assign(enemy, { dungeonId: 'dungeon6', devOnly: true, futureOnly: true, exp: 0, gold: 0, dropTable: [] });
  const rooms = [
    ['火', '氷', moth, hound], ['水', '雷', hound, moth],
    ['風', '火', moth, surveyor], ['土', '音', surveyor, hound],
    ['雷', '氷', hound, surveyor], ['光', '闇', surveyor, moth]
  ];
  const dungeon = {
    id: 'dungeon6', name: '彩律天文堂', nameEn: 'CHROMATIC OBSERVATORY', unlockCondition: 'dungeon5Clear',
    background, thumbnail: background, music: battleMusic, bossId: chromatia.id,
    midBossGates: [{ afterFloor: 2, enemyId: 'd6MidBoss1' }, { afterFloor: 4, enemyId: 'd6MidBoss2' }],
    description: '各回廊は10連勝で踏破。途中帰還・敗北でその回廊の連勝はリセットされる。踏破した回廊は記録される。',
    floors: rooms.map(([element, weakness, main, secondary], index) => ({
      id: 'd6f' + (index + 1), name: element + 'の回廊', element, weaknesses: [weakness], background, thumbnail: background, materials: [],
      description: '敵の属性：' + element + ' ／ 弱点：' + weakness + '。10連勝で踏破。途中セーブなし。',
      consecutiveOnly: true, winsToClear: 10, enemyScale: { ...d5.floors[Math.floor(index / 2)].enemyScale },
      encounterProgression: [{ minWins: 0, count: [2, 3], pool: [{ id: main.id, weight: 6 }, { id: secondary.id, weight: 4 }] }]
    }))
  };
  D.futureContent.dungeon6 = { dungeon, enemies };
})();
