const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

class BattleGame {
  constructor() {
    this.profile = {
      currentJob: 'warrior',
      jobs: { warrior: { level: 1, exp: 0 }, phantomThief: { level: 1, exp: 0 } },
      jobGrowthGained: {}, phantomGrowthRecords: {}, inventory: {}
    };
  }
  loadProfile() { return this.profile; }
  isNoGrowthJob(jobId) { return jobId === 'phantomThief'; }
  isPhantomThief(jobId = this.profile.currentJob) { return jobId === 'phantomThief'; }
  recordPhantomGrowth(jobId) {
    const source = this.profile.jobGrowthGained[jobId] || {};
    const record = this.profile.phantomGrowthRecords[jobId] ||= {};
    for (const [stat, value] of Object.entries(source)) record[stat] = Math.max(record[stat] || 0, value || 0);
  }
  phantomGrowthSources() {
    const out = {};
    for (const jobId of new Set([...Object.keys(this.profile.jobGrowthGained), ...Object.keys(this.profile.phantomGrowthRecords)])) {
      out[jobId] = {};
      for (const stat of new Set([...Object.keys(this.profile.jobGrowthGained[jobId] || {}), ...Object.keys(this.profile.phantomGrowthRecords[jobId] || {})])) {
        out[jobId][stat] = Math.max(this.profile.jobGrowthGained[jobId]?.[stat] || 0, this.profile.phantomGrowthRecords[jobId]?.[stat] || 0);
      }
    }
    return out;
  }
  jobStatBonuses(jobId = this.profile.currentJob) {
    if (this.isPhantomThief(jobId)) {
      const out = {};
      for (const table of Object.values(this.phantomGrowthSources())) for (const [stat, value] of Object.entries(table)) out[stat] = (out[stat] || 0) + value;
      for (const stat of Object.keys(out)) out[stat] = Math.floor(out[stat] * .5);
      return out;
    }
    return { ...(this.profile.jobGrowthGained[jobId] || {}) };
  }
  grantJobExp(levels) {
    const jobId = this.profile.currentJob;
    const from = this.profile.jobs[jobId].level;
    if (this.isPhantomThief(jobId)) return { jobId, from, to: from, exp: 0 };
    const to = Math.min(20, from + levels);
    const gained = to - from;
    this.profile.jobs[jobId].level = to;
    const growth = this.profile.jobGrowthGained[jobId] ||= {};
    growth.mag = (growth.mag || 0) + gained * 2;
    return { jobId, from, to, exp: levels };
  }
  doRebirth(jobId) {
    this.recordPhantomGrowth(jobId);
    for (const stat of Object.keys(this.profile.jobGrowthGained[jobId] || {})) this.profile.jobGrowthGained[jobId][stat] = Math.floor(this.profile.jobGrowthGained[jobId][stat] * .2);
    this.profile.jobs[jobId] = { level: 1, exp: 0 };
    return { ok: true, retention: .2 };
  }
  jobResultHTML() { return '<div>result</div>'; }
  jobDetailHtml() { return '<div>job</div>'; }
  startBossByKey() { return true; }
  rollDrops() { return [['normal-drop', 1]]; }
  saveProfile() {}
  renderMenuPanel() {}
  rematchProgress() { return { ready: true }; }
  isBossDefeated() { return true; }
  noteBossRematchSnapshot() {}
}

global.BattleGame = BattleGame;
global.window = { BattleGame };
global.document = { addEventListener() {}, querySelector() { return null; }, createElement() { return {}; }, body: { appendChild() {} } };
global.D = { jobs: { warrior: { name: '戦士' }, phantomThief: { name: 'ファントムシーフ' } } };

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'title_system.js'), 'utf8');
vm.runInThisContext(source, { filename: 'title_system.js' });

const game = new BattleGame();
game.profile.titleSystem = { unlocked: true, collectionSlotUnlocked: true, bossSlotUnlocked: true, acquired: ['boss_cadenza'], equipped: { collection: null, boss: 'boss_cadenza' }, bossProgress: {} };
game.profile.titleGrowthGained = {};

const levelResult = game.grantJobExp(10);
assert.equal(levelResult.titleGain.amount, 10, '10回の実LvUPで称号成長も10回発動する');
assert.equal(game.profile.jobGrowthGained.warrior.mag, 30, '通常成長20と称号成長10が同じJOBへ蓄積される');
assert.equal(game.profile.titleGrowthGained.warrior.mag, 10, '称号由来の内訳を別途確認できる');
assert.equal(game.jobStatBonuses('phantomThief').mag, 15, 'PHANTOM THIEFは称号込みJOB能力の50%を盗奪する');

const rebirth = game.doRebirth('warrior');
assert.equal(rebirth.ok, true);
assert.equal(game.profile.jobGrowthGained.warrior.mag, 6, '転生で称号込みJOB能力を20%保持する');
assert.equal(game.profile.titleGrowthGained.warrior.mag, 2, '称号成長の表示内訳も20%保持する');
assert.equal(game.jobStatBonuses('phantomThief').mag, 15, '転生前に盗奪した最高JOB能力の50%を維持する');

game.profile.currentJob = 'phantomThief';
const phantomBefore = game.profile.titleGrowthGained.warrior.mag;
const phantomResult = game.grantJobExp(10);
assert.equal(phantomResult.to, phantomResult.from, 'PHANTOM THIEF自身は既存仕様どおりLvUPしない');
assert.equal(game.profile.titleGrowthGained.warrior.mag, phantomBefore, 'PHANTOM THIEFへ称号成長を直接付与しない');

game.pendingBossOverdrive = { key: 'zenakado', level: 1 };
assert.deepEqual(game.applyBossOverdriveStats('zenakado', { maxHp: 100, atk: 20, kind: 'boss' }), { maxHp: 200, atk: 40, kind: 'boss' });
game.battleMode = 'slime';
assert.deepEqual(game.rollDrops({ dropTable: [{ itemId: 'overdrive-drop', chance: 1 }] }), [['normal-drop', 1]], '敗北後もOVERDRIVE倍率を別の通常戦へ持ち越さない');
assert.equal(game.handleBossOverdriveVictory('<div>normal reward</div>'), false, '敗北後の雑魚勝利をOVERDRIVE撃破として扱わない');
assert.equal(game.activeBossOverdrive, null, '別戦闘へ残ったOVERDRIVE挑戦状態を破棄する');
game.bossOverdriveProgress('zenakado').od2Unlocked = true;
game.pendingBossOverdrive = { key: 'zenakado', level: 2 };
assert.deepEqual(game.applyBossOverdriveStats('zenakado', { maxHp: 100, atk: 20 }), { maxHp: 400, atk: 80 });

assert.deepEqual(
  Object.fromEntries(Object.entries(window.ArseneTitleSystem.bossTitles).map(([boss, title]) => [boss, title.stat])),
  { zenakado: 'mag', myrthi: 'agi', seripes: 'vit', astact: 'luk', ostina: 'dex', chromatia: 'mnd', eclaim: 'str' },
  '七奏卿と7能力の対応を固定する'
);

const collectionGame = new BattleGame();
collectionGame.registerCollectionTitle({ id: 'collector_test', name: '《蒐集家》', effectText: 'DROP率UP' });
const collectionUnlock = collectionGame.acquireCollectionTitle('collector_test');
assert.equal(collectionUnlock.first, true);
assert.equal(collectionGame.profile.titleSystem.collectionSlotUnlocked, true, '図鑑称号を先に得た場合は図鑑枠を解放する');
assert.equal(collectionGame.profile.titleSystem.bossSlotUnlocked, false, '図鑑称号だけではボス枠を表示しない');

const bossUnlockGame = new BattleGame();
const bossUnlock = bossUnlockGame.acquireBossTitle('zenakado');
assert.equal(bossUnlock.first, true);
assert.equal(bossUnlockGame.profile.titleSystem.collectionSlotUnlocked, true, 'ボス称号を先に得た場合は図鑑枠も解放する');
assert.equal(bossUnlockGame.profile.titleSystem.bossSlotUnlocked, true, 'ボス称号枠を解放する');

console.log('title_system_regression: PASS');
