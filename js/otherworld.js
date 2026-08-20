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
  const STAT_LABEL = { str: '力', vit: '体力', mag: '魔力', mnd: '精神', agi: '素早さ', luk: '運', maxHp: 'HP', maxMp: 'MP' };

  // ════════════════════════════════════════════════════════════
  // セーブ項目の補完
  // ════════════════════════════════════════════════════════════
  const origLoad = P.loadProfile;
  P.loadProfile = function () {
    const p = origLoad.call(this);
    const f = p.flags ||= {};
    if (f.phantomThiefUnlocked == null) f.phantomThiefUnlocked = false;
    if (f.otherWorldUnlocked == null) f.otherWorldUnlocked = false;
    if (f.phantomTutorialViewed == null) f.phantomTutorialViewed = false;
    if (f.otherWorldNewSeen == null) f.otherWorldNewSeen = false;
    if (f.pendingPhantomNoise == null) f.pendingPhantomNoise = false;
    if (f.owInterferenceMax == null) f.owInterferenceMax = D().otherWorld?.interferenceMax ?? 2;
    if (f.owUsedToday == null) f.owUsedToday = 0;
    if (f.owLastDate == null) f.owLastDate = '';
    // 進行状況を持たないJOB（phantomThief / magicKnight など）を補完する
    p.jobs ||= {};
    for (const id of Object.keys(D().jobs || {})) p.jobs[id] ||= { level: 1, exp: 0 };
    p.ptStolenStats ||= {};      // PHANTOM THIEFへ永久継承した基礎能力
    p.ptStolenActions ||= [];    // 盗んだACTION（保存は無制限）
    p.ptStealDone ||= {};        // JOBごとのSTEAL済みフラグ（重複STEAL禁止）
    p.arcanaGains ||= {};        // アルカナで恒久上昇させた量（内訳表示用）
    if (!Array.isArray(p.ptActionSlots)) p.ptActionSlots = [null, null];
    return p;
  };
  const origFresh = P.freshProfile;
  P.freshProfile = function () {
    const p = origFresh.call(this);
    Object.assign(p.flags, {
      phantomThiefUnlocked: false, otherWorldUnlocked: false, phantomTutorialViewed: false,
      otherWorldNewSeen: false, pendingPhantomNoise: false,
      owInterferenceMax: D().otherWorld?.interferenceMax ?? 2, owUsedToday: 0, owLastDate: ''
    });
    p.jobs ||= {};
    for (const id of Object.keys(D().jobs || {})) p.jobs[id] ||= { level: 1, exp: 0 };
    p.ptStolenStats = {}; p.ptStolenActions = []; p.ptStealDone = {}; p.arcanaGains = {};
    p.ptActionSlots = [null, null];
    return p;
  };

  // ════════════════════════════════════════════════════════════
  // PHANTOM THIEF：JOB MASTER時の 50% STEAL
  // ════════════════════════════════════════════════════════════
  P.ptCfg = function () { return D().phantomThief || { stealRate: 0.5, actionSlotCount: 2, signatureActions: {} }; };
  P.ptStealRate = function () { return this.ptCfg().stealRate ?? 0.5; };
  P.ptActionSlotMax = function () { return this.ptCfg().actionSlotCount ?? 2; };

  // MASTERしたJOBから「育成で実際に増えた基礎能力」の50%とACTIONを1度だけ継承する。
  // 初期ステータスや装備の50%ではない点に注意。
  P.stealFromJob = function (jobId) {
    if (!jobId || jobId === 'phantomThief') return null;
    this.profile.ptStealDone ||= {};
    if (this.profile.ptStealDone[jobId]) return null;   // 重複STEAL禁止
    const gained = (this.profile.jobGrowthGained || {})[jobId] || {};
    const rate = this.ptStealRate(), stats = {};
    this.profile.ptStolenStats ||= {};
    for (const [k, v] of Object.entries(gained)) {
      const add = Math.floor((v || 0) * rate);          // 端数は切り捨てで統一
      if (!add) continue;
      stats[k] = add;
      this.profile.ptStolenStats[k] = (this.profile.ptStolenStats[k] || 0) + add;
    }
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
    const stats = Object.entries(s.stats).map(([k, v]) => `<b>${STAT_LABEL[k] || k} +${v}</b>`).join('');
    return base + `<div class="pt-steal-result"><small>PHANTOM STEAL</small>
      <strong>${esc(s.jobName)} MASTER</strong>
      <span>育てた力の50%をPHANTOM THIEFへ盗んだ！</span>
      <div class="pt-steal-stats">${stats || '<b>継承なし</b>'}</div>
      ${s.action ? `<em>ACTION《${esc(s.action.name)}》を盗んだ！</em>` : ''}</div>`;
  };

  // PHANTOM THIEF の能力補正は「継承済みの値」。他JOBは従来どおり。
  const origJobStat = P.jobStatBonuses;
  P.jobStatBonuses = function (jobId = this.profile.currentJob) {
    if (this.isPhantomThief(jobId)) return { ...(this.profile.ptStolenStats || {}) };
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
  P.owDateKey = function () { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  P.owTodayArcana = function () {
    const day = new Date().getDay();
    return (D().arcana?.weekly || []).find(a => a.day === day) || (D().arcana?.weekly || [])[0];
  };
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
    const max = this.profile.flags.owInterferenceMax ?? (this.owCfg().interferenceMax ?? 2);
    return { left: Math.max(0, max - (this.profile.flags.owUsedToday || 0)), max };
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
    let stat = def?.stat || 'str';
    if (stat === 'random') {
      const pool = D().arcana?.randomStats || ['str', 'vit', 'mag', 'mnd', 'agi', 'luk'];
      stat = pool[roll(0, pool.length - 1)];
    }
    this.profile.inventory[itemId]--;
    this.profile.baseStats[stat] = (this.profile.baseStats[stat] || 0) + 1;
    this.profile.arcanaGains ||= {};
    this.profile.arcanaGains[stat] = (this.profile.arcanaGains[stat] || 0) + 1;
    this.saveProfile(); this.audio.sfx('heal');
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

  P.playPhantomNoise = function () {
    if (document.getElementById('ow-noise')) return;
    const el = document.createElement('div');
    el.id = 'ow-noise'; el.className = 'ow-noise';
    el.innerHTML = `<div class="ow-noise-bars"></div><div class="ow-noise-body"><p id="ow-noise-line"></p><button class="ow-noise-next" id="ow-noise-next">▼</button></div>`;
    document.body.appendChild(el);
    document.body.classList.add('ow-glitch');
    this.audio?.sfx?.('dark');
    let i = 0;
    const line = el.querySelector('#ow-noise-line');
    const render = () => {
      const l = NOISE_LINES[i];
      if (!l) { close(); return; }
      line.className = l.sys ? 'ow-sys' : l.big ? 'ow-big' : 'ow-talk';
      line.innerHTML = l.sys ? esc(l.sys) : l.big ? esc(l.big)
        : `<b>${esc(l.who)}</b><span>「${esc(l.text)}」</span>`;
      el.classList.remove('flick'); void el.offsetWidth; el.classList.add('flick');
    };
    const close = () => {
      el.remove(); document.body.classList.remove('ow-glitch');
      this.renderMenuSummary?.();
    };
    el.addEventListener('click', () => { i++; if (i >= NOISE_LINES.length) close(); else { this.audio?.sfx?.('ui'); render(); } });
    render();
  };

  // ════════════════════════════════════════════════════════════
  // レニーフォックス（拠点の狐）
  // ════════════════════════════════════════════════════════════
  P.lennyUnlocked = function () { return !!this.profile?.flags?.otherWorldUnlocked; };
  P.openLenny = function () {
    if (!this.lennyUnlocked()) {
      // D1クリア前は従来どおり。工房が開いていれば工房へ、まだなら何もしない。
      if (this.profile?.flags?.noelFirstEncounterCleared) { this.audio.sfx('ui'); this.renderMenuPanel('workshop'); }
      return;
    }
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
    { h: '育てた力の50%を盗む', talk: ['現実世界でJOBを育てろ。', '戦士でも、武道家でも、魔導士でもいい。', 'そいつらが鍛え上げた力を――'], big: '異世界へ半分、盗んで持ってこい。',
      note: ['通常JOBを育成して実際に増えた基礎能力（力・体力・魔力・精神・素早さ・運）の50%を、JOB MASTER時にPHANTOM THIEFへ永久継承します。',
             '初期ステータスの50%でも、装備能力の50%でもありません。育成で増えた分の50%です。',
             '端数は切り捨て。同じJOBから二重に盗むことはできません。'],
      example: true },
    { h: 'JOB固有スキルも盗める', talk: ['盗めるのは能力だけじゃない。', 'MASTERしたJOBなら――'], big: 'そいつの技まで盗める。',
      note: ['JOB MASTERすると、そのJOBの固有ACTIONがPHANTOM THIEFのABILITY COLLECTIONへ追加されます。'], actions: true },
    { h: 'ACTIONは2枠', talk: ['盗んだ技を全部使えると思うなよ。', '一度に持っていけるのは2つまでだ。', '何を組み合わせるかは、お前次第。'], big: '脳筋ってのも立派な作戦だ。',
      note: ['盗んだACTIONは何個でも保存できますが、戦闘へ持ち込めるのは2つまでです。',
             '例：《ちからため》×《ばくれつけん》＝脳筋型 ／ 《ばくれつけん》×《ヒール》＝攻撃回復型 ／ 《魔力装填》×《精神集中》＝魔法戦士型。'] },
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
      <small>MASTER時にこの分がPHANTOM THIEFへ永久継承されます。</small></div>` : '';
    const cycleHtml = p.cycle ? `<div class="pt-cycle">
      <div class="pt-cy-box"><small>REAL WORLD</small><b>JOBを育てる</b><span>↓</span><b>JOB MASTER</b><span>↓</span><b>能力・固有技を獲得</b></div>
      <div class="pt-cy-arrow">▼ STEAL ▼</div>
      <div class="pt-cy-box steal"><b>成長能力の50%を盗む</b><b>固有ACTIONを盗む</b></div>
      <div class="pt-cy-arrow">▼</div>
      <div class="pt-cy-box other"><small>OTHER WORLD</small><b>PHANTOM THIEFとして戦う</b><span>↓</span><b>アルカナを盗む</b><span>↓</span><b>さらに強くなる</b></div>
    </div>` : '';
    panel.innerHTML = `<button class="panel-home" data-menu="home">拠点へ戻る</button>
      <small>PHANTOM THIEF TUTORIAL</small><h2>${esc(p.h)}</h2>
      <div class="pt-progress">${TUTORIAL.map((_, i) => `<i class="${i === idx ? 'on' : ''}"></i>`).join('')}</div>
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
    const isPT = this.isPhantomThief();
    const canGo = inf.left > 0;
    return void (panel.innerHTML = `<button class="panel-home" data-lenny="menu">レニーへ戻る</button>
      <small>OTHER WORLD</small><h2>異世界</h2>
      <div class="ow-power"><span>異界干渉力</span><b>${inf.left} / ${inf.max}</b>
        <i>${Array.from({ length: inf.max }, (_, k) => `<em class="${k < inf.left ? 'on' : ''}"></em>`).join('')}</i></div>
      <div class="ow-today"><small>本日の異世界（${dayNames[new Date().getDay()]}曜）</small>
        <b>${esc(item?.name || a?.name || '—')}</b>
        <span>${esc(item?.description || '')}</span></div>
      <div class="ow-info">
        <div><span>1周の戦闘数</span><b>${cfg.battlesPerRun ?? 10} 戦</b></div>
        <div><span>BOSS撃破報酬</span><b>本日のアルカナ ×${cfg.bossArcanaCount ?? 1}（確定）</b></div>
        <div><span>雑魚ドロップ</span><b>${((cfg.zakoArcanaRate ?? 0.01) * 100).toFixed(1)}%</b></div>
        <div><span>経験値・GOLD</span><b>なし</b></div>
      </div>
      ${isPT ? '' : '<p class="ow-warn">PHANTOM THIEF以外でも侵入できますが、この世界ではJOB経験値も武器学も伸びません。</p>'}
      ${canGo
        ? '<button class="ow-enter" data-lenny="enter">異世界へ侵入する</button>'
        : '<p class="ow-warn ow-stop">「今日はもうやめとけ。」<br>「今のお前じゃ、これ以上向こう側に干渉したら身体がもたねえ。」</p>'}`);
  };

  // ════════════════════════════════════════════════════════════
  // 異世界：1周（雑魚9＋BOSS1）
  // ════════════════════════════════════════════════════════════
  P.owEnter = async function () {
    const inf = this.owInterference();
    if (inf.left <= 0) return;
    this.profile.flags.owUsedToday = (this.profile.flags.owUsedToday || 0) + 1;
    this.saveProfile();
    const cfg = this.owCfg();
    this.owRun = { battle: 1, total: cfg.battlesPerRun ?? 10, arcana: 0, rebirth: 0, gold: 0, mats: {} };
    await this.audio.playTrack(this.bossMusic);
    this.startOwBattle();
  };

  P.owIsBossBattle = function () { return this.owRun && this.owRun.battle >= this.owRun.total; };

  P.startOwBattle = function () {
    const cfg = this.owCfg(), run = this.owRun;
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
    this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [] };
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
    const bg = this.owCfg().background || 'assets/bg/dungeon-battle-03.png', bf = $('#battlefield');
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
    const cfg = this.owCfg(), run = this.owRun, todayId = this.owTodayArcana()?.id;
    const got = [];
    if (this.battleMode === 'owBoss') {
      const n = cfg.bossArcanaCount ?? 1;
      if (todayId) { this.giveArcana(todayId, n); run.arcana += n; got.push(`${D().items[todayId].name} ×${n}`); }
      if (Math.random() < (cfg.rebirthArcanaRate ?? 0.005)) {
        this.giveArcana('rebirthArcana', 1); run.rebirth++;
        got.push(`${D().items.rebirthArcana?.name || '輪廻のアルカナ'} ×1`);
      }
      this.audio.stopMusic(650);
      this.owShowChests(got);
      return;
    }
    // 雑魚：1体ごとに低確率で本日のアルカナ
    let n = 0;
    for (const e of this.enemies) if (Math.random() < (cfg.zakoArcanaRate ?? 0.01)) n++;
    if (n && todayId) { this.giveArcana(todayId, n); run.arcana += n; got.push(`${D().items[todayId].name} ×${n}`); }
    this.persistVitals(); this.updateHUD();
    this.owShowStep(got);
  };

  // 雑魚戦のあいだの中継画面
  P.owShowStep = function (got) {
    const run = this.owRun;
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
  P.owShowChests = function (bossGot) {
    const picks = this.owRollChests();
    this.owChestPicks = picks;
    const html = `<div class="ow-chests">
      ${bossGot.length ? `<div class="ow-got">${bossGot.map(g => `<span>${esc(g)}</span>`).join('')}</div>` : ''}
      <p class="ow-chest-lead">「ひとつだけ盗め。」</p>
      <div class="ow-chest-row">${[0, 1, 2].map(i => `<button class="ow-chest" data-ow-chest="${i}"><i></i><span>CHEST</span></button>`).join('')}</div>
    </div>`;
    this.showResult('BOSS DEFEATED', '', '異界の門番を打ち倒した', html);
    $('#result-menu').style.display = 'none';
  };

  P.owRollChests = function () {
    const table = this.owCfg().chestTable || [];
    const total = table.reduce((s, t) => s + t.weight, 0);
    return [0, 1, 2].map(() => {
      let r = Math.random() * total;
      for (const t of table) { r -= t.weight; if (r <= 0) return t; }
      return table[0];
    });
  };

  P.owOpenChest = function (idx) {
    const t = (this.owChestPicks || [])[idx]; if (!t) return;
    const run = this.owRun, lines = [];
    if (t.kind === 'gold') {
      const g = roll(t.min, t.max); this.profile.gold += g; run.gold += g; lines.push(`GOLD +${g}`);
    } else if (t.kind === 'arcana') {
      const id = this.owTodayArcana()?.id;
      if (id) { this.giveArcana(id, t.count); run.arcana += t.count; lines.push(`${D().items[id].name} ×${t.count}`); }
    } else {
      const n = roll(t.min, t.max);
      this.profile.inventory[t.itemId] = (this.profile.inventory[t.itemId] || 0) + n;
      run.mats[t.itemId] = (run.mats[t.itemId] || 0) + n;
      lines.push(`${D().items[t.itemId]?.name || t.itemId} ×${n}`);
    }
    this.saveProfile(); this.audio.sfx('rareDrop');
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
    this.owRun = null; this.owChestPicks = null;
    this.showResult('RIFT COMPLETE', '盗みは成功した。現実へ戻ろう。', '異世界 踏破', html);
    $('#result-menu').style.display = '';
  };

  P.owRetreat = function () {
    const run = this.owRun || { arcana: 0, rebirth: 0, gold: 0, mats: {} };
    this.owRun = null;
    this.showResult('RETREAT', '異界から離脱した。干渉力は戻らない。', '撤退', `<div class="ow-summary"><div class="ow-sum-grid"><span>本日のアルカナ</span><b>${run.arcana} 個</b></div></div>`);
    $('#result-menu').style.display = '';
  };

  // 敗北時は周回を打ち切る
  const origDefeat = P.defeat;
  P.defeat = async function () {
    if (this.owRun) this.owRun = null;
    return origDefeat.call(this);
  };

  // ════════════════════════════════════════════════════════════
  // パネルの差し込み
  // ════════════════════════════════════════════════════════════
  const origRenderPanel = P.renderMenuPanel;
  P.renderMenuPanel = function (name) {
    const panel = $('#menu-panel');
    if (panel) {
      if (name === 'lenny') { panel.hidden = false; this.renderLennyPanel(panel); return; }
      if (name === 'phantom-tutorial') { panel.hidden = false; this.ptTutorialPage = 0; this.renderPhantomTutorial(panel); return; }
      if (name === 'otherworld') { panel.hidden = false; this.renderOtherWorldPanel(panel); return; }
    }
    return origRenderPanel.call(this, name);
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
    // 拠点の狐＝レニーフォックス
    if (e.target.closest('.hideout-fox')) { e.preventDefault(); g.openLenny(); return; }
    const lenny = e.target.closest('[data-lenny]');
    if (lenny) {
      e.preventDefault();
      const a = lenny.dataset.lenny;
      g.audio?.sfx?.('ui');
      if (a === 'menu') g.renderMenuPanel('lenny');
      else if (a === 'otherworld') g.renderMenuPanel('otherworld');
      else if (a === 'tutorial') { g.ptTutorialPage = 0; g.renderMenuPanel('phantom-tutorial'); }
      else if (a === 'enter') g.owEnter();
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
