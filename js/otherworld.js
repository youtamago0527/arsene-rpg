// ══════════════════════════════════════════════════════════════════
// 或世盗 -ARSÈNE-  レニーフォックス / PHANTOM THIEF / 異世界
//
//  game.js の BattleGame を後から拡張する。game.js より後に読み込むこと。
//  既存の戦闘・セーブ・JOB処理には手を入れず、必要な箇所だけ包んで差し込む。
// ══════════════════════════════════════════════════════════════════
(() => {
  'use strict';
  const BG = window.BattleGame;
  if (!BG) { console.error('[otherworld] BattleGame が見つかりません'); return; }
  const P = BG.prototype;
  const D = () => window.ARSENE_DATA;
  const $ = s => document.querySelector(s);
  const roll = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STAT_LABEL = { str: '力', vit: '体力', mag: '魔力', mnd: '精神', agi: '素早さ', dex: '器用さ', luk: '運', maxHp: 'HP', maxMp: 'MP' };

  // ════════════════════════════════════════════════════════════
  // セーブ項目の補完
  // ════════════════════════════════════════════════════════════
  const origLoad = P.loadProfile;
  P.loadProfile = function () {
    const p = origLoad.call(this);
    const f = p.flags ||= {};
    const hadOtherWorldUnlock = !!f.otherWorldUnlocked;
    if (f.phantomThiefUnlocked == null) f.phantomThiefUnlocked = false;
    if (f.otherWorldUnlocked == null) f.otherWorldUnlocked = false;
    if (f.phantomTutorialViewed == null) f.phantomTutorialViewed = false;
    if (f.phantomMascotGuided == null) f.phantomMascotGuided = !!f.phantomTutorialViewed;
    if (f.otherWorldNewSeen == null) f.otherWorldNewSeen = false;
    if (f.pendingPhantomNoise == null) f.pendingPhantomNoise = false;
    if (f.owInterferenceMax == null) f.owInterferenceMax = D().otherWorld?.interferenceMax ?? 2;
    if (f.owUsedToday == null) f.owUsedToday = 0;
    if (f.owLastDate == null) f.owLastDate = '';
    if (f.owEntryInProgress === undefined) f.owEntryInProgress = null;
    if (f.owBattleCheckpoint === undefined) f.owBattleCheckpoint = null;
    if (f.owResumePending == null) f.owResumePending = false;
    if (f.owInterferenceRefundNotice == null) f.owInterferenceRefundNotice = false;
    if (f.owRestoreJobPending == null) f.owRestoreJobPending = false;
    p.lastNormalJob ||= p.currentJob !== 'phantomThief' ? p.currentJob : (p.initialJob || 'mage');
    if (p.otherWorldReturnJob === undefined) p.otherWorldReturnJob = null;
    // 異世界実装前にゼナカドを撃破した旧セーブを自動移行する。
    if (p.bossDefeated?.zenacad || f.magicKnightProofObtained || f.zenakadoScoreClaimed) {
      f.phantomThiefUnlocked = true;
      f.otherWorldUnlocked = true;
      p.unlockedJobs = Array.isArray(p.unlockedJobs) ? p.unlockedJobs : [];
      if (!p.unlockedJobs.includes('phantomThief')) p.unlockedJobs.push('phantomThief');
      if (!hadOtherWorldUnlock && !f.phantomMascotGuided) f.pendingPhantomNoise = true;
    }
    // 進行状況を持たないJOB（phantomThief / magicKnight など）を補完する
    p.jobs ||= {};
    for (const id of Object.keys(D().jobs || {})) p.jobs[id] ||= { level: 1, exp: 0 };
    p.ptStolenStats ||= {};      // PHANTOM THIEFへ永久継承した基礎能力
    p.ptStolenActions ||= [];    // 盗んだACTION（保存は無制限）
    p.ptStealDone ||= {};        // JOBごとのSTEAL済みフラグ（重複STEAL禁止）
    p.arcanaGains ||= {};        // アルカナで恒久上昇させた量（内訳表示用）
    if (!Array.isArray(p.ptActionSlots)) p.ptActionSlots = [null, null];
    // 潜入中フラグが残っている＝正常な踏破・撤退・敗北処理を通らず終了した。
    // 有効なチェックポイントがあれば消費を戻さず再開待ちにする。壊れている場合だけ返還する。
    if (f.owEntryInProgress) {
      const now = new Date(), today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      const sameDay = f.owEntryInProgress.date === today && f.owLastDate === today;
      const cp = f.owBattleCheckpoint;
      const resumable = sameDay && cp?.version === 1 && cp.date === today && cp.run?.dungeonId;
      if (resumable) {
        f.owResumePending = true;
      } else {
        if (f.owEntryInProgress?.usedPremiumTicket) {
          p.premium ||= {};
          p.premium.otherworldTickets = Math.max(0, Number(p.premium.otherworldTickets) || 0) + 1;
          f.owInterferenceRefundNotice = true;
        } else if (sameDay && (f.owUsedToday || 0) > 0) {
          f.owUsedToday--;
          f.owInterferenceRefundNotice = true;
        }
        f.owEntryInProgress = null;
        f.owBattleCheckpoint = null;
        f.owResumePending = false;
      }
      try { localStorage.setItem(D().settings.saveKey, JSON.stringify(p)); } catch { /* 次回saveProfileで保存 */ }
    }
    return p;
  };
  const origFresh = P.freshProfile;
  P.freshProfile = function () {
    const p = origFresh.call(this);
    Object.assign(p.flags, {
      phantomThiefUnlocked: false, otherWorldUnlocked: false, phantomTutorialViewed: false, phantomMascotGuided: false,
      otherWorldNewSeen: false, pendingPhantomNoise: false,
      owInterferenceMax: D().otherWorld?.interferenceMax ?? 2, owUsedToday: 0, owLastDate: '',
      owEntryInProgress: null, owBattleCheckpoint: null, owResumePending: false, owInterferenceRefundNotice: false,
      owRestoreJobPending: false
    });
    p.jobs ||= {};
    for (const id of Object.keys(D().jobs || {})) p.jobs[id] ||= { level: 1, exp: 0 };
    p.ptStolenStats = {}; p.ptStolenActions = []; p.ptStealDone = {}; p.arcanaGains = {};
    p.ptActionSlots = [null, null];
    return p;
  };

  // ════════════════════════════════════════════════════════════
  // PHANTOM THIEF：能力は常時50%継承、JOB MASTER時は固有ACTIONをSTEAL
  // ════════════════════════════════════════════════════════════
  P.ptCfg = function () { return D().phantomThief || { stealRate: 0.5, actionSlotCount: 2, signatureActions: {} }; };
  P.ptStealRate = function () {
    const character = (this.characterList || []).find(c => c.id === this.profile?.selectedCharacter);
    const personalRate = Number(character?.trait?.bonuses?.phantomStealRate);
    return Number.isFinite(personalRate) ? personalRate : (this.ptCfg().stealRate ?? 0.5);
  };
  P.ptActionSlotMax = function () { return this.ptCfg().actionSlotCount ?? 2; };

  // PHANTOM THIEFはJEXPを持たないため、同じ欄を「盗奪進行度」として使う。
  // MASTER数はJOB Lv20と同じ到達を指すので表示内訳だけに使い、二重加点しない。
  P.applyPhantomStealProgressHud = function () {
    if (!this.isPhantomThief() || typeof this.phantomStealProgress !== 'function') return;
    const p = this.phantomStealProgress(), pct = p.percent.toFixed(2);
    const hint = `JOB ${p.jobLevels.current}/${p.jobLevels.max}（MASTER ${p.mastered}/${p.jobCount}）・PASSIVE ${p.passives.current}/${p.passives.max}・武器学 ${p.weaponMastery.current}/${p.weaponMastery.max}`;
    const set = (name, bar, out, label) => {
      const n = $(name), b = $(bar), o = $(out);
      if (n) { n.textContent = label; n.title = hint; }
      if (b) { b.style.width = `${p.percent}%`; b.parentElement?.setAttribute('aria-label', `盗奪進行度 ${pct}%。${hint}`); }
      if (o) { o.textContent = `${pct}%`; o.title = hint; }
    };
    set('#menu-jexp-label', '#menu-jexp-bar', '#menu-jexp-text', 'STEAL PROGRESS');
    set('#player-jexp-name', '#player-jexp-bar', '#player-jexp-label', 'STEAL PROGRESS');
    const menuJob = $('#menu-level'), battleJob = $('#player-job-label');
    if (menuJob) menuJob.textContent = D().jobs.phantomThief?.name || 'ファントムシーフ';
    if (battleJob) battleJob.textContent = D().jobs.phantomThief?.name || 'ファントムシーフ';
  };

  const origRenderMenuSummary = P.renderMenuSummary;
  P.renderMenuSummary = function () { const r = origRenderMenuSummary.call(this); this.applyPhantomStealProgressHud(); return r; };
  const origUpdateHUD = P.updateHUD;
  P.updateHUD = function () { const r = origUpdateHUD.call(this); this.applyPhantomStealProgressHud(); if (this.owRun) this.owSaveCheckpoint?.('battle'); return r; };

  const origJobDetailHtml = P.jobDetailHtml;
  P.jobDetailHtml = function (jobId, unlocked, currentId) {
    let html = origJobDetailHtml.call(this, jobId, unlocked, currentId);
    if (jobId === 'phantomThief' && this.isJobUnlocked(jobId)) {
      html = html.replace(/<div class="jexp-wrap"><div class="jlv-row">[\s\S]*?<\/div><div class="jexp-bar">[\s\S]*?<\/div><\/div>/, this.phantomStealProgressHTML());
    }
    return html;
  };

  const origRenderStatusPanel = P.renderStatusPanel;
  P.renderStatusPanel = function (panel, withTabs = false) {
    const r = origRenderStatusPanel.call(this, panel, withTabs);
    if (this.isPhantomThief()) {
      const section = [...panel.querySelectorAll('.st-section')].find(el => el.querySelector('h3')?.textContent === 'JOB経験値');
      if (section) { section.querySelector('h3').textContent = '盗奪進行度'; section.insertAdjacentHTML('beforeend', this.phantomStealProgressHTML()); section.querySelector('.st-meter')?.remove(); }
      const level = panel.querySelector('.st-id2 em'); if (level) level.textContent = D().jobs.phantomThief?.name || 'ファントムシーフ';
      const jobHead = panel.querySelector('.st-jb-head em'); if (jobHead) jobHead.textContent = 'SPECIAL';
    }
    return r;
  };

  // MASTERしたJOBから固有ACTIONだけを1度取得する。
  // 能力値は game.js の jobStatBonuses がレベルアップ成長の50%を常時反映する。
  P.stealFromJob = function (jobId) {
    if (!jobId || jobId === 'phantomThief') return null;
    this.profile.ptStealDone ||= {};
    if (this.profile.ptStealDone[jobId]) return null;   // 重複STEAL禁止
    const stats = {};
    const actionId = (this.ptCfg().signatureActions || {})[jobId];
    let action = null;
    if (actionId && D().skills[actionId]) {
      this.profile.ptStolenActions ||= [];
      if (!this.profile.ptStolenActions.includes(actionId)) { this.profile.ptStolenActions.push(actionId); action = D().skills[actionId]; }
    }
    this.profile.ptStealDone[jobId] = true;
    this.saveProfile();
    return { jobId, jobName: D().jobs[jobId]?.name || jobId, stats, action };
  };

  // MASTER登録時にSTEAL予約だけ立てる。
  // grantJobExp は markJobMastered → applyJobLevelGrowth の順で動くため、
  // ここで即STEALすると最後のLvアップ分を取りこぼす。実処理は成長後に行う。
  const origMark = P.markJobMastered;
  P.markJobMastered = function (jobId) {
    const before = (this.profile.jobMastered || []).includes(jobId);
    origMark.call(this, jobId);
    if (!before) this.pendingStealJob = jobId;
  };

  const origGrantJobExp = P.grantJobExp;
  P.grantJobExp = function (amount) {
    // PHANTOM THIEF は自分では育たないのでJEXPも入らない
    if (this.isPhantomThief()) return { jobId: this.profile.currentJob, jobName: D().jobs[this.profile.currentJob]?.name || '', exp: 0, from: this.profile.jobs[this.profile.currentJob]?.level || 1, to: this.profile.jobs[this.profile.currentJob]?.level || 1, learned: [], statGain: null, newPassives: [] };
    const r = origGrantJobExp.call(this, amount);
    if (this.pendingStealJob) {
      const jid = this.pendingStealJob; this.pendingStealJob = null;
      const steal = this.stealFromJob(jid);
      if (steal) { r.steal = steal; this.lastSteal = steal; }
    }
    return r;
  };

  // STEAL結果を戦闘結果画面へ表示する
  const origJobResultHTML = P.jobResultHTML;
  P.jobResultHTML = function (result) {
    const base = origJobResultHTML.call(this, result);
    const s = result?.steal; if (!s) return base;
    return base + `<div class="pt-steal-result"><small>PHANTOM STEAL</small>
      <strong>${esc(s.jobName)} MASTER</strong>
      <span>JOB固有技の解析が完了した！</span>
      ${s.action ? `<em>ACTION《${esc(s.action.name)}》を盗んだ！</em>` : '<em>取得できる固有ACTIONはなかった。</em>'}</div>`;
  };

  // PHANTOM THIEFも game.js 側の「全JOB成長の50%」を常時参照する。
  const origJobStat = P.jobStatBonuses;
  P.jobStatBonuses = function (jobId = this.profile.currentJob) {
    return origJobStat.call(this, jobId);
  };

  // 自分では育たない：JOB成長・HP/MP成長・武器学成長を止める。
  // 武器学Lvと習得済み武器技はプロフィール直持ちなので、そのまま使える。
  const origNoGrowth = P.isNoGrowthJob;
  P.isNoGrowthJob = function (jobId = this.profile.currentJob) {
    return origNoGrowth.call(this, jobId) || !!D().jobs[jobId]?.noGrowth;
  };

  // 盗んだACTIONは戦闘コマンドにも出す
  P.ptEquippedActions = function () {
    if (!this.isPhantomThief()) return [];
    return (this.profile.ptActionSlots || []).slice(0, this.ptActionSlotMax())
      .map(id => D().skills[id]).filter(Boolean);
  };
  P.setPtActionSlot = function (idx, id) {
    this.profile.ptActionSlots ||= [null, null];
    const other = idx === 0 ? 1 : 0;
    if (id && this.profile.ptActionSlots[other] === id) this.profile.ptActionSlots[other] = null;
    this.profile.ptActionSlots[idx] = id || null;
    this.saveProfile();
  };

  // ════════════════════════════════════════════════════════════
  // 曜日と異界干渉力
  // ════════════════════════════════════════════════════════════
  P.owCfg = function () { return D().otherWorld || {}; };
  // 選択した曜日ダンジョンの設定を共通設定へ重ねる。旧セーブのdungeonIdも共通設定へ安全に戻す。
  P.owRunCfg = function (dungeonId = this.owRun?.dungeonId) {
    const base = this.owCfg();
    const selected = (base.dungeons || []).find(d => d.id === dungeonId);
    return selected ? { ...base, ...selected, dungeons: base.dungeons } : base;
  };
  P.owDateKey = function () { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  P.owTodayArcana = function () {
    const day = new Date().getDay();
    return (D().arcana?.weekly || []).find(a => a.day === day) || (D().arcana?.weekly || [])[0];
  };
  P.owTodayBackground = function () { return this.owTodayArcana()?.background || this.owCfg().background || 'assets/bg/dungeon-battle-02.png'; };
  // 日付が変わっていれば干渉力を回復させる
  P.owRefreshDaily = function () {
    const key = this.owDateKey();
    if (this.profile.flags.owLastDate !== key) {
      this.profile.flags.owLastDate = key;
      this.profile.flags.owUsedToday = 0;
      this.saveProfile();
    }
  };
  P.owInterference = function () {
    this.owRefreshDaily();
    const baseMax = this.profile.flags.owInterferenceMax ?? (this.owCfg().interferenceMax ?? 2);
    const dailyMax = baseMax + Number(window.arseneQOffer?.bonus?.('otherworld') || 0);
    const dailyLeft = Math.max(0, dailyMax - (this.profile.flags.owUsedToday || 0));
    const tickets = Math.max(0, Number(this.profile.premium?.otherworldTickets) || 0);
    return { left: dailyLeft + tickets, max: dailyMax + tickets, dailyLeft, dailyMax, tickets };
  };
  P.owSettleEntry = function (outcome = 'complete') {
    const f = this.profile.flags;
    f.owEntryInProgress = null;
    f.owBattleCheckpoint = null;
    f.owResumePending = false;
    f.owLastEntryOutcome = outcome;
    f.owRestoreJobPending = true;
    this.saveProfile();
  };
  P.owSaveCheckpoint = function (stage = 'battle') {
    const f = this.profile.flags;
    if (!f.owEntryInProgress || !this.owRun) return;
    const alive = (this.enemies || []).some(e => e.alive);
    const terminal = this.player?.hp <= 0 ? 'defeat' : (this.enemies?.length && !alive ? 'victory' : null);
    // 通常はコマンド選択可能なターン境界だけ保存。撃破・敗北だけは即時保存する。
    if (stage === 'battle' && this.locked && !terminal) return;
    const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
    f.owBattleCheckpoint = {
      version: 1, date: this.owDateKey(), savedAt: Date.now(), stage, terminal,
      run: copy(this.owRun), battleMode: this.battleMode || 'ow', turn: this.turn || 1,
      player: this.player ? copy({ hp: this.player.hp, mp: this.player.mp, buffs: this.player.buffs || {}, cooldowns: this.player.cooldowns || {}, resonance: this.player.resonance || 0, lastReceivedType: this.player.lastReceivedType || null, defDownUntil: this.player.defDownUntil || 0 }) : null,
      enemies: copy(this.enemies || []), battleLogHistory: copy(this.battleLogHistory || []), chestPicks: copy(this.owChestPicks || null)
    };
    f.owResumePending = true;
    this.saveProfile();
  };
  P.owCheckpointValid = function (cp = this.profile.flags.owBattleCheckpoint) {
    if (!cp || cp.version !== 1 || cp.date !== this.owDateKey() || !cp.run?.dungeonId) return false;
    if (cp.stage === 'transition') return true;
    return !!cp.player && Array.isArray(cp.enemies) && cp.enemies.length > 0;
  };
  P.owRefundBrokenCheckpoint = function () {
    const f = this.profile.flags, marker = f.owEntryInProgress;
    if (marker?.usedPremiumTicket) {
      this.profile.premium ||= {};
      this.profile.premium.otherworldTickets = Math.max(0, Number(this.profile.premium.otherworldTickets) || 0) + 1;
    } else if (marker?.date === this.owDateKey() && (f.owUsedToday || 0) > 0) f.owUsedToday--;
    f.owEntryInProgress = null; f.owBattleCheckpoint = null; f.owResumePending = false; f.owInterferenceRefundNotice = true;
    this.owRun = null; this.saveProfile(); this.showMenu('home');
  };
  P.showOwResumePrompt = function () {
    if (!this.profile.flags.owResumePending || document.getElementById('ow-resume-modal')) return;
    const cp = this.profile.flags.owBattleCheckpoint;
    const el = document.createElement('div');
    el.id = 'ow-resume-modal'; el.className = 'pt-modal';
    el.innerHTML = `<div class="pt-modal-box ow-resume-box"><header><b>RIFT INTERRUPTED</b></header><div class="ow-resume-body"><strong>異世界の中断戦闘があります</strong><span>${cp?.stage === 'transition' ? '潜入開始前' : `RIFT ${cp?.run?.battle || 1} / ${cp?.run?.total || 10}　TURN ${cp?.turn || 1}`}</span><p>干渉力は消費済みです。保存された状態から再開できます。</p><button data-ow-resume>戦闘を再開</button><button class="danger" data-ow-abandon>撤退扱いで終了</button><small>撤退した場合、干渉力は返還されません。</small></div></div>`;
    document.body.appendChild(el);
  };
  P.owResumeFromCheckpoint = async function () {
    const cp = this.profile.flags.owBattleCheckpoint;
    if (!this.owCheckpointValid(cp)) { document.getElementById('ow-resume-modal')?.remove(); this.owRefundBrokenCheckpoint(); return; }
    document.getElementById('ow-resume-modal')?.remove();
    this.profile.flags.owResumePending = false;
    this.owRun = JSON.parse(JSON.stringify(cp.run));
    await this.audio.playTrack(this.otherWorldMusic || this.bossMusic);
    if (cp.stage === 'transition') { this.saveProfile(); await this.playOwTransition(); this.startOwBattle(); return; }
    const stats = this.totalStats(), ps = cp.player;
    this.player = { stats, hp: Math.max(0, Math.min(stats.maxHp, ps.hp)), mp: Math.max(0, Math.min(stats.maxMp, ps.mp)), inventory: this.profile.inventory, buffs: ps.buffs || {}, cooldowns: ps.cooldowns || {}, resonance: ps.resonance || 0, lastReceivedType: ps.lastReceivedType || null, defDownUntil: ps.defDownUntil || 0 };
    this.enemies = cp.enemies.map(e => ({ ...e, stats: { ...(e.stats || {}) } }));
    this.battleMode = cp.battleMode || (this.owIsBossBattle() ? 'owBoss' : 'ow');
    this.turn = cp.turn || 1; this.locked = false; this.finished = false;
    this.battleLogHistory = cp.battleLogHistory || []; this.battleLogExpanded = false;
    this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [], masteryResults: [], jobResults: [], newRecipes: [] };
    if (cp.stage === 'step') { this.owShowStep([]); return; }
    if (cp.stage === 'chests') { this.owChestPicks = cp.chestPicks || []; this.owShowChests([], this.owChestPicks); return; }
    $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none';
    $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none';
    $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual(); this.applyOwBackground();
    this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); this.renderBattleLog();
    this.flashTitle('RIFT RESUME', `TURN ${this.turn}`);
    if (cp.terminal === 'victory') { setTimeout(() => this.victory(), 300); return; }
    if (cp.terminal === 'defeat') { setTimeout(() => this.defeat(), 300); return; }
    this.showMainCommands();
  };
  P.owAbandonCheckpoint = function () {
    document.getElementById('ow-resume-modal')?.remove();
    this.owSettleEntry('abandon'); this.owRun = null;
    window.arseneStartFlow?.toast?.('異世界から撤退しました。干渉力は戻りません。');
  };
  P.showOwRefundNotice = function () {
    document.getElementById('ow-refund-toast')?.remove();
    const el = document.createElement('div');
    el.id = 'ow-refund-toast'; el.className = 'arcana-toast';
    el.innerHTML = '<small>RIFT RECOVERY</small><b>異界干渉力 +1</b><span>中断された潜入分を返還しました</span>';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3000);
  };

  // ════════════════════════════════════════════════════════════
  // アルカナ
  // ════════════════════════════════════════════════════════════
  P.giveArcana = function (id, n = 1) {
    this.profile.inventory[id] = (this.profile.inventory[id] || 0) + n;
    this.saveProfile();
  };
  // 使用すると基礎能力が恒久的に+1。JOB変更や装備変更では失われない。
  P.useArcana = function (itemId) {
    const item = D().items[itemId];
    if (!item?.arcanaStat || !(this.profile.inventory[itemId] > 0)) return null;
    const def = (D().arcana?.weekly || []).find(a => a.id === itemId);
    // 曜日表を優先しつつ、そこから外れたアルカナはアイテム側の指定を使う。
    // 旧仕様は weekly に無いと無条件で力になっており、曜日報酬から外した
    // 幸運のアルカナが力を上げてしまっていた。
    let stat = def?.stat || (typeof item.arcanaStat === 'string' ? item.arcanaStat : 'str');
    if (stat === 'random') {
      const pool = D().arcana?.randomStats || ['str', 'vit', 'mag', 'mnd', 'agi', 'dex', 'luk'];
      stat = pool[roll(0, pool.length - 1)];
    }
    this.profile.inventory[itemId]--;
    this.profile.baseStats[stat] = (this.profile.baseStats[stat] || 0) + 1;
    this.profile.arcanaGains ||= {};
    this.profile.arcanaGains[stat] = (this.profile.arcanaGains[stat] || 0) + 1;
    this.saveProfile(); this.audio.sfx('confirm');
    return { stat, label: STAT_LABEL[stat] || stat, name: item.name };
  };

  // ════════════════════════════════════════════════════════════
  // D1クリア → NOISE演出 → PHANTOM THIEF / 異世界 解放
  // ════════════════════════════════════════════════════════════
  const origStageOne = P.grantStageOneReward;
  P.grantStageOneReward = function () {
    const r = origStageOne.call(this);
    if (!r) return r;                                  // 初回以外は何もしない
    this.profile.flags.phantomThiefUnlocked = true;
    this.profile.flags.otherWorldUnlocked = true;
    this.profile.flags.phantomMascotGuided = false;
    this.profile.flags.pendingPhantomNoise = true;     // 拠点へ戻った時にNOISEを流す
    this.unlockJob('phantomThief');
    this.saveProfile();
    return r;
  };

  // 拠点へ戻ったタイミングでNOISE演出を再生する
  const origShowMenu = P.showMenu;
  P.showMenu = function (panel = 'home') {
    origShowMenu.call(this, panel);
    if (this.profile?.flags?.pendingPhantomNoise) {
      this.profile.flags.pendingPhantomNoise = false;
      this.saveProfile();
      setTimeout(() => this.playPhantomNoise(), 500);
    } else if (panel === 'home' && this.profile?.flags?.otherWorldUnlocked && !this.profile.flags.phantomMascotGuided) {
      setTimeout(() => this.startLennyGuide(), 250);
    }
  };

  const NOISE_LINES = [
    { sys: 'NOISE...' },
    { sys: 'UNKNOWN SIGNAL DETECTED' },
    { who: 'レニーフォックス', text: '……聞こえるか？' },
    { who: 'レニーフォックス', text: 'どうやら最初の力を盗むことには成功したみたいだな。' },
    { who: 'レニーフォックス', text: 'なら、そろそろ教えてやる。' },
    { who: 'レニーフォックス', text: 'お前が手に入れたその力――' },
    { big: 'PHANTOM THIEF' },
    { who: 'レニーフォックス', text: 'そいつは普通のJOBとは、ちょっとばかり勝手が違う。' },
    { sys: '特殊JOB《PHANTOM THIEF》が解放されました。' },
    { sys: '《異世界》が解放されました。' }
  ];

  // 汎用NOISEシーケンス。異世界解放だけでなく、ボス変身などからも同じ演出を再利用する。
  P.playNoiseSequence = function (lines, options = {}) {
    if (document.getElementById('ow-noise')) return Promise.resolve(false);
    return new Promise(resolve => {
    const el = document.createElement('div');
    el.id = 'ow-noise'; el.className = 'ow-noise';
    el.innerHTML = `<div class="ow-noise-bars"></div><div class="ow-noise-body"><p id="ow-noise-line"></p><button class="ow-noise-next" id="ow-noise-next">▼</button></div>`;
    document.body.appendChild(el);
    document.body.classList.add('ow-glitch');
    this.audio?.sfx?.('dark');
    let i = 0;
    const line = el.querySelector('#ow-noise-line');
    const render = () => {
      const l = lines[i];
      if (!l) { close(); return; }
      line.className = l.sys ? 'ow-sys' : l.big ? 'ow-big' : 'ow-talk';
      line.innerHTML = l.sys ? esc(l.sys) : l.big ? esc(l.big)
        : `<b>${esc(l.who)}</b><span>「${esc(l.text)}」</span>`;
      el.classList.remove('flick'); void el.offsetWidth; el.classList.add('flick');
    };
    const close = () => {
      el.remove(); document.body.classList.remove('ow-glitch');
      this.renderMenuSummary?.();
      options.onClose?.();
      resolve(true);
    };
    el.addEventListener('click', () => { i++; if (i >= lines.length) close(); else { this.audio?.sfx?.('ui'); render(); } });
    render();
    });
  };

  P.playPhantomNoise = function () {
    return this.playNoiseSequence(NOISE_LINES, { onClose: () => this.startLennyGuide() });
  };

  // ════════════════════════════════════════════════════════════
  // レニーフォックス（拠点の狐）
  // ════════════════════════════════════════════════════════════
  P.startLennyGuide = function () {
    if (!this.profile?.flags?.otherWorldUnlocked || this.profile.flags.phantomMascotGuided) return;
    document.body.classList.add('ow-lenny-guide');
    const shell = document.querySelector('.hideout-art-shell');
    if (shell && !document.getElementById('ow-lenny-guide-label')) {
      const label = document.createElement('div');
      label.id = 'ow-lenny-guide-label'; label.className = 'ow-lenny-guide-label';
      label.textContent = 'レニーフォックスが呼んでいる――';
      shell.appendChild(label);
    }
  };
  P.finishLennyGuide = function () {
    document.body.classList.remove('ow-lenny-guide');
    document.getElementById('ow-lenny-guide-label')?.remove();
    if (!this.profile?.flags?.phantomMascotGuided) {
      this.profile.flags.phantomMascotGuided = true;
      this.saveProfile();
    }
  };
  P.lennyUnlocked = function () { return !!this.profile?.flags?.otherWorldUnlocked; };
  P.openLenny = function () {
    // レニーフォックスは異世界専用。未解放時は工房などへ転送しない。
    if (!this.lennyUnlocked()) return;
    this.finishLennyGuide();
    this.audio.sfx('ui');
    if (!this.profile.flags.phantomTutorialViewed) { this.renderMenuPanel('phantom-tutorial'); return; }
    this.renderMenuPanel('lenny');
  };

  P.renderLennyPanel = function (panel) {
    const isNew = !this.profile.flags.otherWorldNewSeen;
    const inf = this.owInterference();
    panel.innerHTML = `<button class="panel-home" data-menu="home">拠点へ戻る</button>
      <small>LENNY FOX</small><h2>レニーフォックス</h2>
      <p class="lenny-lead">「よう。何の用だ？」</p>
      <div class="lenny-menu">
        <button data-menu="workshop"><b>工房</b><span>装備の製作・強化・分解</span></button>
        <button data-lenny="otherworld"><b>異世界</b><span>異界干渉力 ${inf.left} / ${inf.max}</span>${isNew ? '<mark>NEW</mark>' : ''}</button>
        <button data-lenny="tutorial"><b>PHANTOM THIEFについて</b><span>仕様をもう一度確認する</span></button>
        <button data-menu="home"><b>閉じる</b><span>拠点へ戻る</span></button>
      </div>`;
  };

  // ════════════════════════════════════════════════════════════
  // PHANTOM THIEF チュートリアル
  // ════════════════════════════════════════════════════════════
  const TUTORIAL = [
    { h: 'PHANTOM THIEFは成長しない', talk: ['まず覚えとけ。', 'PHANTOM THIEFは、普通のJOBみたいには成長しない。', 'こいつ自身を鍛えて、力や魔力を上げることはできない。', 'じゃあどうやって強くなるのかって？', '簡単だ。'], big: '他のJOBから盗むんだよ。',
      note: ['PHANTOM THIEF中はJOBによる基礎ステータス成長がありません。', 'HP / MPの通常成長も発生しません。'] },
    { h: '育てた力の50%が届く', talk: ['現実世界でJOBを育てろ。', '戦士でも、武道家でも、魔導士でもいい。', 'レベルが上がるたび、その成長は――'], big: '異世界へ半分、流れ込んでくる。',
      note: ['通常JOBのレベルアップで実際に増えた基礎能力（力・体力・魔力・精神・素早さ・運）の50%が、その時点からPHANTOM THIEFへ常時反映されます。',
             '初期ステータスの50%でも、装備能力の50%でもありません。育成で増えた分の50%です。',
             '端数は切り捨て。JOB MASTERを待つ必要はありません。'],
      example: true },
    { h: 'MASTERで固有技を盗む', talk: ['能力はレベルアップのたびに届く。', 'だが、技はそう簡単には盗めない。', 'そのJOBを極めたとき――'], big: '最後に固有技をいただく。',
      note: ['JOB MASTER時にのみ、そのJOBの固有ACTIONがPHANTOM THIEFのABILITY COLLECTIONへ追加されます。', 'MASTER時に能力値をまとめて受け取る処理はありません。'], actions: true },
    { h: 'ACTIONは2枠', talk: ['盗んだ技を全部使えると思うなよ。', '一度に持っていけるのは2つまでだ。', '何を組み合わせるかは、お前次第。'], big: '脳筋ってのも立派な作戦だ。',
      note: ['盗んだACTIONは何個でも保存できますが、戦闘へ持ち込めるのは2つまでです。',
             '例：《ちからため》×《ばくれつけん》＝脳筋型 ／ 《ばくれつけん》×《ヒール》＝攻撃回復型 ／ 《魔力装填》×《精神集中》＝魔法戦士型。'] },
    { h: 'PASSIVEも2枠', talk: ['技だけ盗んで終わりじゃない。', '他のJOBで身につけた戦い方も、こっちへ持ってこられる。', '選べるのは――'], big: 'PASSIVEも2つまでだ。',
      note: ['他JOBで永久習得したPASSIVEから2つを選び、PHANTOM THIEF専用枠へ装備できます。',
             'ACTION2枠とは別枠です。同じPASSIVEを2枠へ重複装備することはできません。'] },
    { h: '武器学は盗む必要がない', talk: ['ただし武器学は別だ。', '剣の振り方。爪での戦い方。杖の扱い方。', 'そいつはJOBから借りた力じゃない。'], big: 'お前自身が磨いた技術だ。',
      note: ['PHANTOM THIEFへJOBチェンジしても武器学Lvはそのまま維持され、習得済みの武器技もそのまま使えます。',
             'ただしPHANTOM THIEF中は武器学が伸びません。新しい技を閃きたいときは通常JOBへ戻ってください。'] },
    { h: '成長サイクル', cycle: true, talk: ['つまりだ。', '強くなりたきゃ、ひとつのJOBにしがみつくな。', '戦士を極めろ。魔導士を極めろ。', '武道家も、僧侶も――使えるものは全部使え。'], big: '全部盗め。',
      note: ['それがPHANTOM THIEFだ。'] }
  ];

  P.renderPhantomTutorial = function (panel) {
    const idx = Math.max(0, Math.min(TUTORIAL.length - 1, this.ptTutorialPage || 0));
    const p = TUTORIAL[idx], last = idx === TUTORIAL.length - 1;
    const actionsHtml = p.actions ? `<div class="pt-actions">${Object.entries(this.ptCfg().signatureActions || {}).map(([jid, sid]) => {
      const j = D().jobs[jid], s = D().skills[sid];
      return j && s ? `<div><span>${esc(j.name)} MASTER</span><b>《${esc(s.name)}》</b></div>` : '';
    }).join('')}</div>` : '';
    const exampleHtml = p.example ? `<div class="pt-example"><b>例：戦士をLv1→20まで育てて</b>
      <div class="pt-ex-grid"><span>力 +38</span><em>→</em><b>力 +19</b><span>体力 +38</span><em>→</em><b>体力 +19</b><span>精神 +19</span><em>→</em><b>精神 +9</b><span>素早さ +19</span><em>→</em><b>素早さ +9</b></div>
      <small>各レベルアップの時点から、増えた能力の50%がPHANTOM THIEFへ反映されます。</small></div>` : '';
    const cycleHtml = p.cycle ? `<div class="pt-cycle">
      <div class="pt-cy-box"><small>REAL WORLD</small><b>JOBを育てる</b><span>↓</span><b>LEVEL UPごとに能力供給</b><span>↓</span><b>JOB MASTERで固有技解放</b></div>
      <div class="pt-cy-arrow">▼ STEAL ▼</div>
      <div class="pt-cy-box steal"><b>成長能力の50%を常時引き継ぐ</b><b>MASTER時に固有ACTIONを盗む</b></div>
      <div class="pt-cy-arrow">▼</div>
      <div class="pt-cy-box other"><small>OTHER WORLD</small><b>PHANTOM THIEFとして戦う</b><span>↓</span><b>アルカナを盗む</b><span>↓</span><b>さらに強くなる</b></div>
    </div>` : '';
    panel.innerHTML = `<button class="panel-home" data-menu="home">拠点へ戻る</button>
      <small>PHANTOM THIEF TUTORIAL</small><h2>${esc(p.h)}</h2>
      <div class="pt-dots">${TUTORIAL.map((_, i) => `<i class="${i === idx ? 'on' : ''}"></i>`).join('')}</div>
      <div class="pt-talk">${p.talk.map(t => `<p>「${esc(t)}」</p>`).join('')}</div>
      <p class="pt-big">「${esc(p.big)}」</p>
      ${cycleHtml}${exampleHtml}${actionsHtml}
      <div class="pt-note">${p.note.map(n => `<p>${esc(n)}</p>`).join('')}</div>
      <div class="pt-nav">
        ${idx > 0 ? '<button data-pt-page="prev">← もどる</button>' : '<span></span>'}
        ${last ? '<button class="primary" data-pt-page="done">説明を終える</button>' : '<button class="primary" data-pt-page="next">つぎへ →</button>'}
      </div>`;
  };

  // 説明終了後の導線
  P.renderPhantomTutorialEnd = function (panel) {
    panel.innerHTML = `<button class="panel-home" data-menu="home">拠点へ戻る</button>
      <small>PHANTOM THIEF TUTORIAL COMPLETE</small><h2>説明おわり</h2>
      <div class="pt-talk"><p>「説明はこのくらいでいいだろ。」</p><p>「で――」</p></div>
      <p class="pt-big">「早速、盗みに行ってみるか？」</p>
      <div class="lenny-menu">
        <button data-lenny="otherworld"><b>異世界へ</b><span>今日の異世界に潜る</span></button>
        <button data-lenny="menu"><b>あとにする</b><span>レニーのメニューへ</span></button>
      </div>`;
  };

  // ════════════════════════════════════════════════════════════
  // 異世界メニュー
  // ════════════════════════════════════════════════════════════
  P.renderOtherWorldPanel = function (panel) {
    this.profile.flags.otherWorldNewSeen = true; this.saveProfile();
    const cfg = this.owCfg(), inf = this.owInterference(), a = this.owTodayArcana();
    const item = D().items[a?.id];
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const canGo = inf.left > 0;
    return void (panel.innerHTML = `<button class="panel-home" data-lenny="menu">レニーへ戻る</button>
      <small>OTHER WORLD / SELECT MODE</small><h2>異世界侵入先</h2>
      <div class="ow-power"><span>異界干渉力</span><b>${inf.left} / ${inf.max}</b>
        <i>${Array.from({ length: inf.max }, (_, k) => `<em class="${k < inf.left ? 'on' : ''}"></em>`).join('')}</i></div>
      ${window.arseneQOffer?.otherworldHTML?.() || ''}
      <p class="ow-rule">異世界へ侵入できるのは <b>PHANTOM THIEF</b> のみ。</p>
      <button class="ow-ability-link" data-lenny="abilities"><b>アビリティ設定</b><span>突入前にPHANTOM THIEFのACTION / PASSIVEを設定する</span></button>
      <div class="ow-mode-guide"><b>侵入先を選択</b><span>目的とルールの異なる2つの異世界</span></div>
      <div class="ow-mode-list">
        <article class="ow-mode-card daily${canGo ? '' : ' unavailable'}">
          <div class="ow-mode-badges"><em>曜日バトル</em><span>DAILY RIFT</span></div>
          <h3>${dayNames[new Date().getDay()]}曜の異世界</h3>
          <strong>${esc(item?.name || a?.name || '—')}</strong>
          <p>${esc(item?.description || '')}</p>
          <div class="ow-mode-stats">
            <span><small>1周</small><b>${cfg.battlesPerRun ?? 10} 戦</b></span>
            <span><small>難易度</small><b>初級 / 中級</b></span>
            <span><small>中級報酬</small><b>ITEM ×2</b></span>
            <span><small>EXP / GOLD</small><b>なし</b></span>
          </div>
          ${canGo
            ? '<button class="ow-mode-action" data-lenny="select"><b>曜日バトルへ</b><span>本日の侵入先を選ぶ</span></button>'
            : '<div class="ow-mode-action disabled"><b>本日の挑戦終了</b><span>異界干渉力を使い切りました</span></div>'}
        </article>
        <div data-infinite-entry></div>
      </div>
      ${canGo ? '' : '<p class="ow-warn ow-stop">「今日はもうやめとけ。」<br>「今のお前じゃ、これ以上向こう側に干渉したら身体がもたねえ。」</p>'}`);
  };

  P.owDungeonChoices = function () {
    const cfg = this.owCfg();
    const todayBackground = this.owTodayBackground();
    if (Array.isArray(cfg.dungeons) && cfg.dungeons.length) return cfg.dungeons.map(d => ({ ...d, background: d.background || todayBackground }));
    return [{ id: cfg.id || 'otherWorld', name: '境界の裂け目', nameEn: 'BOUNDARY RIFT', description: cfg.description, background: todayBackground, available: true }];
  };

  P.renderOwDungeonSelect = function (panel) {
    const inf = this.owInterference(), arcana = this.owTodayArcana();
    const cards = this.owDungeonChoices().map(d => {
      const cfg = this.owRunCfg(d.id), reward = cfg.bossArcanaCount ?? 1, mult = cfg.itemRewardMultiplier ?? 1;
      return `<button class="ow-dungeon-card active" data-lenny="enter" data-ow-dungeon="${esc(d.id)}">
      <i class="ow-dungeon-thumb" style="background-image:url('${esc(d.background || this.owTodayBackground())}')"></i><div><small>${esc(d.nameEn || 'OTHER WORLD')}</small><strong>${esc(d.name)}</strong>
      <span>${esc(d.description || '')}</span><em>${cfg.battlesPerRun ?? 10} BATTLES ／ ${esc(arcana?.name || '本日のアルカナ')} ×${reward}確定${mult > 1 ? ` ／ ITEM ×${mult}` : ''}</em></div></button>`;
    }).join('');
    panel.innerHTML = `<button class="panel-home" data-menu="lenny">レニーへ戻る</button>
      <small>RIFT DESTINATION</small><h2>異世界ダンジョン選択</h2>
      <div class="ow-power"><span>異界干渉力</span><b>${inf.left} / ${inf.max}</b></div>
      <div class="ow-dungeon-list">${cards}
        <div class="ow-dungeon-card locked"><strong>UNOBSERVED RIFT</strong><span>COMING SOON</span></div>
        <div class="ow-dungeon-card locked"><strong>UNOBSERVED RIFT</strong><span>COMING SOON</span></div>
      </div>`;
  };

  P.openOwAbilitySettings = function () {
    this.jobUI ||= { tab: 'abilitySet', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' };
    this.jobUI.tab = 'abilitySet';
    this.jobUI.detailId = null;
    this.jobUI.modal = null;
    // 異世界の突入確認から来た印。JOB画面の戻り先を拠点ではなく異世界へ向ける。
    this.owAbilityReturn = true;
    this.renderMenuPanel('job');
  };
  // 異世界からJOB画面へ来たときの上部ナビ。戻るだけでなく、そのまま先へ進めるようにする。
  P.owJobNavHTML = function () {
    // 突入先が決まっていればそのまま突入、まだなら侵入先の選択へ進む
    const label = !this.pendingOwDungeonId ? '侵入先を選ぶ'
      : this.isPhantomThief() ? 'このまま異世界へ突入' : 'PHANTOM THIEFになって突入';
    return `<div class="ow-jobnav"><button class="ow-jobnav-back" data-lenny="ability-back">← 異世界へ戻る</button><button class="ow-jobnav-go" data-lenny="ability-dive">${label}</button></div>`;
  };

  P.owSelectDungeon = function (dungeonId = null) {
    if (this.isPhantomThief()) { this.profile.otherWorldReturnJob ||= this.profile.lastNormalJob || this.profile.initialJob || 'mage'; this.saveProfile(); this.owEnter(dungeonId); return; }
    this.pendingOwDungeonId = dungeonId || this.owDungeonChoices()[0]?.id || null;
    this.renderMenuPanel('otherworld-job-confirm');
  };

  P.renderOwJobConfirm = function (panel) {
    const current = D().jobs[this.profile.currentJob];
    const phantom = D().jobs.phantomThief;
    panel.innerHTML = `<button class="panel-home" data-lenny="cancel-job-change">ダンジョン選択へ戻る</button>
      <small>JOB CHANGE REQUIRED</small><h2>異世界侵入確認</h2>
      <div class="ow-job-confirm">
        <p>異世界へ侵入できるのは<br><b>PHANTOM THIEF</b> のみ。</p>
        <div class="ow-job-swap"><span>${esc(current?.name || this.profile.currentJob)}</span><i>▶</i><b>${esc(phantom?.name || 'PHANTOM THIEF')}</b></div>
        <p class="ow-job-note">ジョブを切り替えて、このダンジョンへ突入しますか？</p>
        <button class="ow-ability-link" data-lenny="abilities"><b>アビリティ設定</b><span>PHANTOM THIEFのACTION / PASSIVEを設定してから突入できます</span></button>
        <div class="ow-confirm-actions"><button class="yes" data-lenny="confirm-job-change">YES ／ 切り替えて突入</button><button data-lenny="cancel-job-change">NO ／ 戻る</button></div>
      </div>`;
  };

  P.confirmOwJobChange = function () {
    const dungeonId = this.pendingOwDungeonId;
    if (!this.isJobUnlocked('phantomThief')) { this.renderMenuPanel('otherworld-select'); return; }
    if (!this.isPhantomThief()) {
      this.profile.otherWorldReturnJob = this.profile.currentJob;
      this.profile.lastNormalJob = this.profile.currentJob;
      this.profile.flags.owRestoreJobPending = false;
    }
    this.switchJobState('phantomThief', false);
    this.pendingOwDungeonId = null;
    this.owEnter(dungeonId);
  };

  // ════════════════════════════════════════════════════════════
  // 異世界：1周（雑魚9＋BOSS1）
  // ════════════════════════════════════════════════════════════
  P.playOwTransition = function () {
    document.getElementById('ow-dive')?.remove();
    const el = document.createElement('div');
    el.id = 'ow-dive'; el.className = 'ow-dive';
    el.innerHTML = '<i class="ow-dive-rings"></i><i class="ow-dive-core"></i><b class="ow-dive-label">RIFT // DIVE</b>';
    document.body.appendChild(el);
    this.audio?.sfx?.('dark');
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 380 : 1550;
    return new Promise(resolve => setTimeout(() => { el.remove(); resolve(); }, duration));
  };

  P.owEnter = async function (dungeonId = null) {
    // 異世界はPHANTOM THIEF専用。別経路から呼ばれても必ず確認へ戻す。
    if (!this.isPhantomThief()) { this.owSelectDungeon(dungeonId); return; }
    const inf = this.owInterference();
    if (inf.left <= 0) return;
    const selected = this.owDungeonChoices().find(d => d.id === dungeonId) || this.owDungeonChoices()[0];
    const cfg = this.owRunCfg(selected?.id);
    const usedPremiumTicket = inf.dailyLeft <= 0;
    if (usedPremiumTicket) {
      this.profile.premium ||= {};
      this.profile.premium.otherworldTickets = Math.max(0, Number(this.profile.premium.otherworldTickets) || 0) - 1;
    } else {
      this.profile.flags.owUsedToday = (this.profile.flags.owUsedToday || 0) + 1;
    }
    this.profile.flags.owEntryInProgress = { date: this.owDateKey(), dungeonId: selected?.id || cfg.id, startedAt: Date.now(), usedPremiumTicket };
    this.profile.flags.owInterferenceRefundNotice = false;
    this.saveProfile();
    this.owRun = {
      dungeonId: selected?.id || cfg.id, difficulty: cfg.difficulty || 'beginner',
      background: selected?.background || this.owTodayBackground(), battle: 1, total: cfg.battlesPerRun ?? 10,
      arcana: 0, rebirth: 0, gold: 0, mats: {}
    };
    this.owSaveCheckpoint('transition');
    await this.audio.playTrack(this.otherWorldMusic || this.bossMusic);
    await this.playOwTransition();
    this.startOwBattle();
  };

  P.owIsBossBattle = function () { return this.owRun && this.owRun.battle >= this.owRun.total; };

  P.startOwBattle = function () {
    const run = this.owRun, cfg = this.owRunCfg(run?.dungeonId);
    const stats = this.totalStats(), vitals = this.storedVitals(stats);
    this.player = { stats, hp: vitals.hp, mp: vitals.mp, inventory: this.profile.inventory, buffs: {}, cooldowns: {} };
    if (this.owIsBossBattle()) {
      this.battleMode = 'owBoss';
      const t = D().enemies[cfg.bossId];
      this.enemies = [{ ...t, uid: 'ow-boss', label: '', kind: 'boss', stats: { ...t.stats }, hp: t.stats.maxHp, alive: true }];
    } else {
      this.battleMode = 'ow';
      const lineup = this.rollEncounter(run.battle - 1, cfg.encounterProgression);
      this.enemies = lineup.map((id, i) => this.makeEnemy(id, i));
    }
    this.turn = 1; this.locked = false; this.finished = false;
    // 敵撃破時は通常戦と同じ共通報酬処理を通るため、EXP/GOLDが0でも
    // すべての結果配列を用意する。jobResults欠落は勝利直前のpushで停止する原因になる。
    this.resetBattleLog();
    this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [], masteryResults: [], jobResults: [], newRecipes: [] };
    $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none';
    $('#game').hidden = false; $('#game').style.display = 'grid';
    $('#result').hidden = true; $('#result').style.display = 'none';
    $('#ren').className = 'ren fighter idle';
    this.applySetBattleVisual(); this.applyOwBackground();
    this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD();
    const names = [...new Set(this.enemies.map(e => e.name))];
    this.setLog(`${this.enemies.length}体の${names.join('と')}が現れた！`);
    this.flashTitle(this.owIsBossBattle() ? 'RIFT WARDEN' : `RIFT ${run.battle} / ${run.total}`, '異界の反応');
    this.showMainCommands();
  };

  P.applyOwBackground = function () {
    const bg = this.owRun?.background || this.owTodayBackground(), bf = $('#battlefield');
    bf.dataset.dungeon = 'otherWorld';
    bf.style.backgroundImage = `linear-gradient(#1a032b55,#05001033 58%,#02040b66),url("${bg}")`;
    bf.style.backgroundSize = 'auto,cover';
    bf.style.backgroundPosition = 'center,center bottom';
    bf.style.backgroundRepeat = 'no-repeat,no-repeat';
  };

  // 異世界の勝利処理。EXP・GOLDは出さず、アルカナだけを配る。
  const origVictory = P.victory;
  P.victory = async function () {
    if (!this.owRun) return origVictory.call(this);
    this.profile.flags.consecutiveDefeats = 0;
    this.profile.flags.lastBattleResult = 'victory';
    this.finished = true; this.audio.sfx('victory');
    this.flashTitle('CLEAR', '異界の歪みを払った');
    $('#ren').classList.add('victory');
    await this.battleSleep(900);
    const run = this.owRun, cfg = this.owRunCfg(run?.dungeonId), todayId = this.owTodayArcana()?.id;
    const got = [];
    if (this.battleMode === 'owBoss') {
      const n = cfg.bossArcanaCount ?? 1;
      if (todayId) { this.giveArcana(todayId, n); run.arcana += n; got.push(`${D().items[todayId].name} ×${n}`); }
      if (Math.random() < (cfg.rebirthArcanaRate ?? 0.005)) {
        this.giveArcana('rebirthArcana', 1); run.rebirth++;
        got.push(`${D().items.rebirthArcana?.name || '輪廻のアルカナ'} ×1`);
      }
      this.owShowChests(got);
      return;
    }
    // 雑魚：1体ごとに低確率で本日のアルカナ
    let n = 0;
    const dropCount = Math.max(1, Number(cfg.arcanaDropCount) || 1);
    for (const e of this.enemies) if (Math.random() < (cfg.zakoArcanaRate ?? 0.01)) n += dropCount;
    if (n && todayId) { this.giveArcana(todayId, n); run.arcana += n; got.push(`${D().items[todayId].name} ×${n}`); }
    this.persistVitals(); this.updateHUD();
    this.owShowStep(got);
  };

  // 雑魚戦のあいだの中継画面
  P.owShowStep = function (got) {
    const run = this.owRun;
    this.owSaveCheckpoint('step');
    const html = `<div class="ow-step">
      <small>RIFT PROGRESS</small><b>${run.battle} / ${run.total}</b>
      <i class="ow-step-bar"><em style="width:${100 * run.battle / run.total}%"></em></i>
      ${got.length ? `<div class="ow-got">${got.map(g => `<span>${esc(g)}</span>`).join('')}</div>` : '<p class="ow-none">アルカナの反応はなかった。</p>'}
      <div class="ow-step-btns">
        <button class="primary" data-lenny="next">次の戦闘へ</button>
        <button data-lenny="retreat">撤退する</button>
      </div></div>`;
    this.showResult(run.battle + 1 > run.total - 1 && run.battle + 1 === run.total ? 'NEXT: BOSS' : 'RIFT CLEARED', '', '異界の奥へ進む', html);
    $('#result-menu').style.display = 'none';
  };

  P.owNextBattle = function () {
    if (!this.owRun) return;
    this.owRun.battle++;
    $('#result').hidden = true; $('#result').style.display = 'none';
    $('#result-menu').style.display = '';
    this.startOwBattle();
  };

  // ── 宝箱3択 ──
  P.owShowChests = function (bossGot, restoredPicks = null) {
    const picks = restoredPicks || this.owRollChests();
    this.owChestPicks = picks;
    this.owSaveCheckpoint('chests');
    const html = `<div class="ow-chests">
      ${bossGot.length ? `<div class="ow-got">${bossGot.map(g => `<span>${esc(g)}</span>`).join('')}</div>` : ''}
      <p class="ow-chest-lead">「ひとつだけ盗め。」</p>
      <div class="ow-chest-row">${[0, 1, 2].map(i => `<button class="ow-chest" data-ow-chest="${i}"><i></i><span>CHEST</span></button>`).join('')}</div>
    </div>`;
    this.showResult('BOSS DEFEATED', '', '異界の門番を打ち倒した', html);
    $('#result-menu').style.display = 'none';
  };

  P.owRollChests = function () {
    const table = this.owRunCfg().chestTable || [];
    const total = table.reduce((s, t) => s + t.weight, 0);
    return [0, 1, 2].map(() => {
      let r = Math.random() * total;
      for (const t of table) { r -= t.weight; if (r <= 0) return t; }
      return table[0];
    });
  };

  P.owOpenChest = function (idx) {
    const t = (this.owChestPicks || [])[idx]; if (!t) return;
    const run = this.owRun, cfg = this.owRunCfg(run?.dungeonId), lines = [];
    const itemMultiplier = Math.max(1, Number(cfg.itemRewardMultiplier) || 1);
    if (t.kind === 'gold') {
      const g = roll(t.min, t.max); this.profile.gold += g; run.gold += g; lines.push(`GOLD +${g}`);
    } else if (t.kind === 'arcana') {
      const id = this.owTodayArcana()?.id;
      const n = Math.max(1, Number(t.count) || 1) * itemMultiplier;
      if (id) { this.giveArcana(id, n); run.arcana += n; lines.push(`${D().items[id].name} ×${n}`); }
    } else {
      const n = roll(t.min, t.max) * itemMultiplier;
      this.profile.inventory[t.itemId] = (this.profile.inventory[t.itemId] || 0) + n;
      run.mats[t.itemId] = (run.mats[t.itemId] || 0) + n;
      lines.push(`${D().items[t.itemId]?.name || t.itemId} ×${n}`);
    }
    this.saveProfile(); this.owSettleEntry('complete'); this.audio.sfx('rareDrop');
    // 選ばれなかった箱は消える
    document.querySelectorAll('[data-ow-chest]').forEach((b, i) => {
      b.classList.add(i === idx ? 'opened' : 'gone'); b.disabled = true;
    });
    setTimeout(() => this.owFinishRun(lines), 700);
  };

  P.owFinishRun = function (chestLines) {
    const run = this.owRun || { arcana: 0, rebirth: 0, gold: 0, mats: {} };
    const matLines = Object.entries(run.mats).map(([id, n]) => `${D().items[id]?.name || id} ×${n}`);
    const html = `<div class="ow-summary">
      ${chestLines?.length ? `<div class="ow-got big">${chestLines.map(l => `<span>${esc(l)}</span>`).join('')}</div>` : ''}
      <div class="ow-sum-grid">
        <span>本日のアルカナ</span><b>${run.arcana} 個</b>
        <span>輪廻のアルカナ</span><b>${run.rebirth} 個</b>
        <span>GOLD</span><b>${run.gold}</b>
        <span>素材</span><b>${matLines.length ? esc(matLines.join(' / ')) : 'なし'}</b>
      </div>
      <p class="ow-none">異世界では経験値・武器学は得られません。</p></div>`;
    this.owSettleEntry('complete');
    this.owRun = null; this.owChestPicks = null;
    this.showResult('RIFT COMPLETE', '盗みは成功した。現実へ戻ろう。', '異世界 踏破', html);
    $('#result-menu').style.display = '';
  };

  P.owRetreat = function () {
    const run = this.owRun || { arcana: 0, rebirth: 0, gold: 0, mats: {} };
    this.owSettleEntry('retreat');
    this.owRun = null;
    this.showResult('RETREAT', '異界から離脱した。干渉力は戻らない。', '撤退', `<div class="ow-summary"><div class="ow-sum-grid"><span>本日のアルカナ</span><b>${run.arcana} 個</b></div></div>`);
    $('#result-menu').style.display = '';
  };

  // 異世界での死亡は、広告復活を断念してGAME OVERが確定した時だけ周回終了。
  // 死亡直後にowRunを消すと、復活後のBGMと次戦闘が通常ダンジョンへ戻ってしまう。
  const origGameOverOrRevive = P.showGameOverOrRevive;
  P.showGameOverOrRevive = function (copy, kicker, html) {
    if (!this.owRun) return origGameOverOrRevive.call(this, copy, kicker, html);
    const showGameOver = () => {
      this.owSettleEntry('defeat');
      this.owRun = null; this.owChestPicks = null;
      this.clearBossOverdriveChallenge?.();
      this.showResult('GAME OVER', copy, kicker, html);
    };
    if (!this.showReviveOfferIfAvailable(showGameOver)) showGameOver();
  };

  const origDefeat = P.defeat;
  P.defeat = async function () {
    return origDefeat.call(this);
  };

  // ════════════════════════════════════════════════════════════
  // パネルの差し込み
  // ════════════════════════════════════════════════════════════
  const origRenderPanel = P.renderMenuPanel;
  P.renderMenuPanel = function (name) {
    const panel = $('#menu-panel');
    if (panel) {
      // 異世界の案内画面も他の拠点ページと同じ固定キャンバスを使用する。
      // 内容量で枠が伸び縮みせず、中身だけをスクロールする。
      const prepareOtherWorldPanel = () => { panel.hidden = false; panel.dataset.panel = name; panel.classList.add('panel-tall'); panel.scrollTop = 0; };
      if (name === 'lenny') { prepareOtherWorldPanel(); this.renderLennyPanel(panel); return; }
      if (name === 'phantom-tutorial') { prepareOtherWorldPanel(); this.ptTutorialPage = 0; this.renderPhantomTutorial(panel); return; }
      if (name === 'otherworld') { prepareOtherWorldPanel(); this.owAbilityFrom = name; this.renderOtherWorldPanel(panel); return; }
      if (name === 'otherworld-select') { prepareOtherWorldPanel(); this.owAbilityFrom = name; this.renderOwDungeonSelect(panel); return; }
      if (name === 'otherworld-job-confirm') { prepareOtherWorldPanel(); this.owAbilityFrom = name; this.renderOwJobConfirm(panel); return; }
    }
    // JOB以外の画面へ移ったら異世界フローの印は落とす（拠点メニューを普通に触りに行った場合）
    if (name !== 'job') this.owAbilityReturn = false;
    const result = origRenderPanel.call(this, name);
    if (name === 'job' && this.owAbilityReturn && panel) {
      panel.querySelector('.panel-home')?.remove();
      panel.insertAdjacentHTML('afterbegin', this.owJobNavHTML());
    }
    if (name === 'home' && this.profile.flags.owResumePending) setTimeout(() => this.showOwResumePrompt(), 350);
    if (name === 'home' && this.profile.flags.owInterferenceRefundNotice) {
      this.profile.flags.owInterferenceRefundNotice = false;
      this.saveProfile();
      setTimeout(() => this.showOwRefundNotice(), 350);
    }
    return result;
  };

  // 色違い表示：spriteFilter を持つ敵にフィルタを掛ける
  const origRenderEnemies = P.renderEnemies;
  P.renderEnemies = function () {
    origRenderEnemies.call(this);
    for (const e of this.enemies || []) {
      if (!e.spriteFilter) continue;
      const el = document.getElementById(e.uid);
      const art = el?.querySelector('.slime, .noel-sprite');
      if (art) art.style.filter = e.spriteFilter;
    }
  };

  // ════════════════════════════════════════════════════════════
  // 操作
  // ════════════════════════════════════════════════════════════
  document.addEventListener('click', e => {
    const g = window.arseneGame; if (!g) return;
    const resume = e.target.closest('[data-ow-resume]');
    if (resume) { e.preventDefault(); resume.disabled = true; g.owResumeFromCheckpoint(); return; }
    const abandon = e.target.closest('[data-ow-abandon]');
    if (abandon) { e.preventDefault(); g.owAbandonCheckpoint(); return; }
    // 拠点の狐＝レニーフォックス
    if (e.target.closest('.hideout-fox')) { e.preventDefault(); g.openLenny(); return; }
    const lenny = e.target.closest('[data-lenny]');
    if (lenny) {
      e.preventDefault();
      const a = lenny.dataset.lenny;
      g.audio?.sfx?.('ui');
      if (a === 'menu') g.renderMenuPanel('lenny');
      else if (a === 'otherworld') g.renderMenuPanel('otherworld');
      else if (a === 'select') g.renderMenuPanel('otherworld-select');
      else if (a === 'tutorial') { g.ptTutorialPage = 0; g.renderMenuPanel('phantom-tutorial'); }
      else if (a === 'abilities') g.openOwAbilitySettings();
      else if (a === 'ability-back') { g.owAbilityReturn = false; g.renderMenuPanel(g.owAbilityFrom || 'otherworld'); }
      else if (a === 'ability-dive') {
        g.owAbilityReturn = false;
        if (!g.pendingOwDungeonId) g.renderMenuPanel('otherworld-select');
        else if (g.isPhantomThief()) g.owEnter(g.pendingOwDungeonId);
        else g.confirmOwJobChange();
      }
      else if (a === 'enter') g.owSelectDungeon(lenny.dataset.owDungeon || null);
      else if (a === 'confirm-job-change') g.confirmOwJobChange();
      else if (a === 'cancel-job-change') { g.pendingOwDungeonId = null; g.renderMenuPanel('otherworld-select'); }
      else if (a === 'next') g.owNextBattle();
      else if (a === 'retreat') g.owRetreat();
      return;
    }
    const page = e.target.closest('[data-pt-page]');
    if (page) {
      e.preventDefault(); g.audio?.sfx?.('ui');
      const a = page.dataset.ptPage, panel = $('#menu-panel');
      if (a === 'next') { g.ptTutorialPage = (g.ptTutorialPage || 0) + 1; g.renderPhantomTutorial(panel); }
      else if (a === 'prev') { g.ptTutorialPage = Math.max(0, (g.ptTutorialPage || 0) - 1); g.renderPhantomTutorial(panel); }
      else { g.profile.flags.phantomTutorialViewed = true; g.saveProfile(); g.renderPhantomTutorialEnd(panel); }
      return;
    }
    // アルカナを使う
    const useArc = e.target.closest('[data-use-arcana]');
    if (useArc) {
      e.preventDefault(); e.stopPropagation();
      const r = g.useArcana(useArc.dataset.useArcana);
      g.renderMenuPanel('items'); g.renderMenuSummary();
      if (r) g.showArcanaToast(r);
      return;
    }
    const chest = e.target.closest('[data-ow-chest]');
    if (chest) { e.preventDefault(); if (!chest.disabled) g.owOpenChest(+chest.dataset.owChest); return; }
    // 盗んだACTIONのセット
    const ptSlot = e.target.closest('[data-open-modal]');
    if (ptSlot && /^ptAction[01]$/.test(ptSlot.dataset.openModal)) {
      e.preventDefault(); e.stopPropagation();
      g.openPtActionModal(+ptSlot.dataset.openModal.slice(-1));
    }
  }, true);

  P.showArcanaToast = function (r) {
    const el = document.createElement('div');
    el.className = 'arcana-toast';
    el.innerHTML = `<small>ARCANA</small><b>${esc(r.name)}</b><span>基礎《${esc(r.label)}》が永久に +1 された！</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2400);
  };

  // PHANTOM THIEF の固有コマンドは「盗んだACTION」。
  // 通常JOBは signatureSkillId のまま（既存挙動を変えない）。
  const origPersonal = P.personalSkills;
  P.personalSkills = function () {
    if (this.isPhantomThief()) return this.ptEquippedActions();
    return origPersonal.call(this);
  };

  // 盗んだACTIONを選ぶ簡易モーダル
  P.openPtActionModal = function (idx) {
    document.getElementById('pt-action-modal')?.remove();
    const owned = (this.profile.ptStolenActions || []).map(id => D().skills[id]).filter(Boolean);
    const cur = (this.profile.ptActionSlots || [])[idx];
    const el = document.createElement('div');
    el.id = 'pt-action-modal'; el.className = 'pt-modal';
    el.innerHTML = `<div class="pt-modal-box">
      <header><b>ACTION ${idx + 1}</b><button data-pt-close>×</button></header>
      ${owned.length ? `<div class="pt-modal-list">
        <button data-pt-pick="" class="${!cur ? 'on' : ''}"><b>設定しない</b><small>スロットを空にする</small></button>
        ${owned.map(s => `<button data-pt-pick="${esc(s.id)}" class="${cur === s.id ? 'on' : ''}"><b>${esc(s.name)}</b><small>${esc(s.effectText || s.description || '')}</small></button>`).join('')}
      </div>` : '<p class="pt-modal-empty">まだACTIONを盗んでいません。<br>JOBをMASTERすると盗めます。</p>'}
    </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', ev => {
      if (ev.target.closest('[data-pt-close]') || ev.target === el) { el.remove(); return; }
      const pick = ev.target.closest('[data-pt-pick]');
      if (pick) {
        this.setPtActionSlot(idx, pick.dataset.ptPick || null);
        this.audio?.sfx?.('ui'); el.remove(); this.renderMenuPanel('job');
      }
    });
  };
})();
