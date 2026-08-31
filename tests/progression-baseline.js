// ══════════════════════════════════════════════════════════════
// バランス検証で使う「現実的なプレイヤー像」の基準値
//
// HPはJOB Lvではなく戦闘ごとの抽選で伸びる（基礎15%＋JOB補正、1回あたり1〜5）。
// そのため baseStats のまま測ると、チュートリアル直後の初期値で
// D4を評価することになり、実際のプレイヤーとかけ離れた数字が出る。
//
// 実際の目安として「セリペス撃破＝守護士解放の時点でHP400」を起点に置き、
// そこから必要戦闘数を逆算して各段階を並べたもの。
// 検証スクリプトは必ず profile.baseStats.maxHp をここへ合わせてから測ること。
// ══════════════════════════════════════════════════════════════
(() => {
  'use strict';
  const BASELINE = {
    dungeon1: { label: 'D1クリア',              battles:   76, maxHp: 128, jobLevel: 8 },
    dungeon2: { label: 'D2クリア',              battles:  229, maxHp: 224, jobLevel: 14 },
    dungeon3: { label: 'D3クリア（守護士解放）', battles:  508, maxHp: 400, jobLevel: 20 },
    dungeon4: { label: 'D4進行中',              battles:  914, maxHp: 656, jobLevel: 30 },
    dungeon4Clear: { label: 'D4クリア',         battles: 1321, maxHp: 912, jobLevel: 40 }
  };

  // 指定した段階のプレイヤー像を profile へ流し込む
  function applyBaseline(game, stageId, jobId) {
    const stage = BASELINE[stageId];
    if (!game || !stage) return null;
    game.profile.baseStats.maxHp = stage.maxHp;
    game.profile.currentVitals = { hp: stage.maxHp, mp: game.profile.baseStats.maxMp };
    game.profile.playtest = { ...(game.profile.playtest || {}), battles: stage.battles };
    if (jobId) {
      game.profile.currentJob = jobId;
      game.profile.jobs[jobId] = { level: stage.jobLevel, exp: 0 };
      game.profile.jobGrowthGained = {};
      game.profile.growthFraction = {};
      game.profile.jobRebirths = {};
      // Lv21以降は成長量が2倍になるため、重み付きレベル数で与える
      const weighted = Math.max(0, Math.min(stage.jobLevel, 20) - 1) + Math.max(0, stage.jobLevel - 20) * 2;
      if ((game.gb().jobGrowthPerLevel || {})[jobId]) game.applyJobLevelGrowth(jobId, weighted);
    }
    return stage;
  }

  window.ARSENE_TEST_BASELINE = { BASELINE, applyBaseline };
})();
