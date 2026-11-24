(() => {
  'use strict';
  const config = window.ARSENE_INFINITE_RANKING_CONFIG;
  if (config?.enabled !== true || !/^https:\/\//.test(config.apiUrl || '') ||
      !window.Capacitor?.isNativePlatform?.() || window.Capacitor.getPlatform?.() !== 'ios') return;

  const api = config.apiUrl.replace(/\/$/, '');
  const pendingKey = 'arsene.infiniteRanking.pending.v1';
  const accountKey = 'arsene.infiniteRanking.registered.v1';
  const debug = game => !!game.localScenario || Object.keys(game.profile?.infiniteScoreDebug || {}).length > 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);
  const format = new Intl.NumberFormat('ja-JP');
  const starts = new WeakMap();
  let activeSession, loginTask, flushTask, notice = '';
  const native = () => window.Capacitor?.Plugins?.ArseneGameCenter;
  const toast = text => window.arseneStartFlow?.toast?.(text);
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; }
  };
  const write = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  async function request(path, data, token) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const headers = {};
      if (data) headers['Content-Type'] = 'application/json';
      if (token) headers.Authorization = 'Bearer ' + token;
      const response = await fetch(api + path, {
        method: data ? 'POST' : 'GET', body: data ? JSON.stringify(data) : undefined,
        headers, signal: controller.signal
      });
      const json = await response.json();
      if (!response.ok) {
        const error = new Error(json.error || 'service_unavailable');
        error.status = response.status;
        throw error;
      }
      return json;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function account(interactive = false) {
    const plugin = native();
    if (!plugin) throw new Error('game_center_unavailable');
    const current = await plugin.currentPlayer();
    const allowedPlayer = read(accountKey, null);
    if (!interactive && (!allowedPlayer || (current.playerId && current.playerId !== allowedPlayer))) {
      throw new Error('sign_in_required');
    }
    if (activeSession && current.playerId === activeSession.nativeId && activeSession.until > Date.now()) return activeSession;
    activeSession = null;
    if (!loginTask) {
      loginTask = (async () => {
        const identity = await plugin.authenticate({ interactive });
        if (!interactive && identity.playerId !== allowedPlayer) throw new Error('sign_in_required');
        const { token, player } = await request('/v1/session', identity);
        return activeSession = { token, player, nativeId: identity.playerId, until: Date.now() + 55 * 60_000 };
      })().finally(() => { loginTask = null; });
    }
    const session = await loginTask;
    if ((await plugin.currentPlayer()).playerId !== session.nativeId) throw new Error('sign_in_required');
    return session;
  }

  async function withAccount(path, data, { interactive = false, playerId } = {}) {
    for (let once = 0; once <= 1; once++) {
      const session = await account(interactive);
      if (playerId && playerId !== session.player.id) throw new Error('wrong_account');
      try { return await request(path, data, session.token); }
      catch (error) {
        if (error.status !== 401 || once) throw error;
        if (activeSession === session) activeSession = null;
      }
    }
  }

  function flush(game) {
    if (debug(game)) return Promise.resolve();
    if (flushTask) return flushTask;
    flushTask = (async () => {
      const pending = read(pendingKey, []);
      if (!pending.length) return;
      const session = await account();
      if (!session.player.name) return;
      for (const score of pending.filter(row => row.playerId === session.player.id)) {
        try {
          await withAccount('/v1/scores', { nonce: score.nonce, floor: score.floor }, { playerId: score.playerId });
        } catch (error) {
          if (![400, 409].includes(error.status)) throw error;
          notice = '期限切れ、または登録できなかった帰還記録があります。';
        }
        write(pendingKey, read(pendingKey, []).filter(row => row.nonce !== score.nonce));
      }
    })().finally(() => { flushTask = null; });
    return flushTask;
  }

  function start(game, run) {
    if (debug(game) || !read(accountKey, null)) return;
    const pending = (async () => {
      try {
        const session = await account();
        if (!session.player.name) return null;
        const { nonce } = await withAccount('/v1/runs', { clientRunId: crypto.randomUUID() }, { playerId: session.player.id });
        const proof = { nonce, playerId: session.player.id };
        if (game.isRun() === run) { run.rankingProof = proof; game.saveProfile(); }
        return proof;
      } catch {
        notice = 'ランキングへの接続ができなかったRUNは対象外です。';
        return null;
      }
    })();
    starts.set(run, pending);
  }

  async function postReturn(game, run) {
    const proof = run.rankingProof || await starts.get(run);
    if (!proof || debug(game)) return;
    const pending = read(pendingKey, []);
    if (!pending.some(item => item.nonce === proof.nonce)) {
      write(pendingKey, [...pending, { ...proof, floor: run.floor }]);
    }
    try { await flush(game); }
    catch { notice = '帰還記録を送信待ちにしています。'; }
  }

  const time = ms => new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', weekday:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).format(ms);

  function describe(error) {
    if (error.message === 'invalid_name') return '表示名は2〜20文字で入力してください。';
    if (error.message === 'game_center_unavailable') return 'このアプリではGame Centerに接続できません。';
    if (error.message === 'sign_in_required' || error.code === 'SIGN_IN_REQUIRED') return 'Game Centerにサインインして、もう一度お試しください。';
    return 'ランキングに接続できませんでした。通信を確認して、もう一度お試しください。';
  }

  const tiers = values => '<dl class="is-rank-tiers">' + [['1位',values.first],['2〜5位',values.topFive],['6〜10位',values.topTen]]
    .map(([label, points]) => '<div><dt>' + label + '</dt><dd>' + format.format(points) + ' pt</dd></div>').join('') + '</dl>';

  function boardHtml(data, period, history) {
    const overall = period === 'overall';
    const me = overall ? data.overallMe : data.me;
    const rows = (overall ? data.overallRows : data.rows).map(row => `<li class="rank-place-${row.place}${row.isMe ? ' is-rank-me' : ''}">
      <b>${row.place}位</b><span>${escape(row.displayName)}</span><strong>F${row.floor}</strong></li>`);
    const tabs = (key, choices, selected) => choices.map(([id,label]) =>
      `<button type="button" data-rank-${key}="${id}" aria-pressed="${id===selected}">${label}</button>`).join('');
    const rewards = data.rewards.filter(row => row.kind === history).map(row =>
      `<li><span>${escape(row.date)} ・ ${row.place}位</span><strong>+${format.format(row.points)} pt</strong></li>`);
    return `<section class="rank-frame rank-summary">
      <div class="rank-player"><img src="assets/ui/rank-crest.webp" alt=""><b>${escape(data.displayName)}</b></div>
      <div><small>現在の順位</small><strong>${me ? me.place+'位':'―'}</strong></div>
      <div><small>アルカナpt</small><strong>${format.format(data.points)} pt</strong></div>
      <p>到達階層 <b>${me ? 'F'+me.floor:'―'}</b>　│　 自己ベスト <b>${data.overallMe ? 'F'+data.overallMe.floor:'―'}</b></p></section>
      <nav aria-label="順位の期間">${tabs('period',[['overall','総合ランキング'],['weekly','週間ランキング']],period)}</nav>
      <section class="rank-frame"><ol aria-label="無限奏廊の順位">${rows.join('') || '<li>まだ帰還記録がありません。</li>'}</ol></section>
      <section class="rank-frame"><h3>ランキング報酬</h3><div class="rank-prizes">
      <article><h4>日次報酬</h4><small>次の締め ${time(data.nextDailyAt)}</small>${tiers({first:1000,topFive:500,topTen:300})}</article>
      <article><h4>週間報酬</h4><small>次の締め ${time(data.nextWeeklyAt)}</small>${data.weeklyRewards ? tiers(data.weeklyRewards) : '<p>週間報酬の配分は未設定です。</p>'}</article></div></section>
      <section class="rank-frame"><div class="rank-history"><h3>アルカナポイント付与履歴</h3><nav aria-label="付与履歴の期間">${tabs('history',[['daily','日次'],['weekly','週間']],history)}</nav></div>
      <ul>${rewards.join('') || '<li>付与履歴はありません。</li>'}</ul></section>`;
  }



  async function loadBoard(game, content, render) {
    const session = await account(true);
    if (!session.player.name) {
      content.innerHTML = `<form data-is-rank-form><label>ランキングに登録する名前<input placeholder="表示名を入力" autocomplete="off" name="displayName" minlength="2" maxlength="20" required></label>
        <p>表示名・順位・到達階をランキングに表示します。</p><button type="submit">登録する</button><p data-is-rank-error role="status"></p></form>`;
      return;
    }
    write(accountKey, session.nativeId);
    await flush(game).catch(() => { notice = '帰還記録を送信待ちにしています。'; });
    const data = await withAccount('/v1/leaderboard', undefined, { interactive:true });
    render(data);
  }

  function open(game) {
    if (debug(game) || !game.isInfiniteScoreUnlocked?.()) return;
    document.getElementById('is-ranking-dialog')?.remove();
    const dialog = document.createElement('dialog');
    dialog.id = 'is-ranking-dialog';
    dialog.setAttribute('aria-labelledby', 'is-ranking-title');
    dialog.innerHTML = `<header><h2 id="is-ranking-title">無限奏廊ランキング</h2><button data-is-rank-close aria-label="閉じる">×</button></header>
      <div data-is-rank-content aria-live="polite"></div>`;
    const content = dialog.querySelector('[data-is-rank-content]');
    let board, period = 'overall', history = 'daily';
    const render = data => {
      board = data;
      if (!Array.isArray(data.overallRows)) period = 'weekly';
      content.innerHTML = boardHtml(data, period, history) + (notice ? '<p role="status">' + escape(notice) + '</p>' : '') + '<button data-is-rank-reload>更新する</button>';
      if (!Array.isArray(data.overallRows)) content.querySelector('[data-rank-period="overall"]').disabled = true;
    };
    const load = async () => {
      content.innerHTML = '<p>ランキングに接続中…</p>';
      try { await loadBoard(game, content, render); }
      catch (error) { content.innerHTML = `<p>${escape(describe(error))}</p><button data-is-rank-reload>再試行</button>`; }
    };
    dialog.addEventListener('click', event => {
      const tab = event.target.closest('[data-rank-period], [data-rank-history]');
      if (tab && board) {
        if (tab.dataset.rankPeriod) period = tab.dataset.rankPeriod;
        if (tab.dataset.rankHistory) history = tab.dataset.rankHistory;
        render(board);
        const key = tab.dataset.rankPeriod ? 'period' : 'history';
        content.querySelector('[data-rank-' + key + '][aria-pressed="true"]').focus({preventScroll:true});
        return;
      }
      if (event.target.closest('[data-is-rank-close]')) dialog.close();
      else if (event.target.closest('[data-is-rank-reload]')) void load();
    });
    dialog.addEventListener('submit', async event => {
      const form = event.target.closest('[data-is-rank-form]');
      if (!form) return;
      event.preventDefault();
      const button = form.querySelector('button'), errorLine = form.querySelector('[data-is-rank-error]');
      button.disabled = true;
      try {
        const session = await account(true);
        const { player } = await withAccount('/v1/registration', {
          displayName: new FormData(form).get('displayName')
        }, { interactive:true, playerId:session.player.id });
        if (activeSession?.player.id === player.id) activeSession.player = player;
        await load();
      } catch (error) {
        errorLine.textContent = describe(error);
        button.disabled = false;
      }
    });
    const trigger = document.activeElement;
    dialog.addEventListener('close', () => { dialog.remove(); trigger?.focus(); }, { once:true });
    document.body.appendChild(dialog);
    dialog.showModal();
    void load();
  }

  function install(game) {
    const helpUnlocked = game.helpUnlocked;
    game.helpUnlocked = function(key) {
      return key === 'infiniteRanking' ? !debug(this) && this.isInfiniteScoreUnlocked?.() : helpUnlocked.call(this, key);
    };
    window.ARSENE_HELP?.push({
      id: 'infiniteRanking', title: '無限奏廊ランキング', titleEn: 'INFINITE SCORE RANKING', lockedBy: 'infiniteRanking',
      body: [
        'Game Centerで認証し、公開する表示名を登録すると参加できます。',
        '登録後に開始し、RETURNで生還した探索の最高到達階が順位に載ります。同じ階では先に記録したプレイヤーが上位です。',
        '日本時間の毎日0時で日次報酬を確定します。月曜0時は同じ順位で週間報酬を確定し、新しい週のランキングが始まります。',
        '報酬のアルカナポイントは自動で付与され、ランキング画面で残高と履歴を確認できます。'
      ]
    });
    const render = game.renderOtherWorldPanel;
    game.renderOtherWorldPanel = function(panel) {
      render.call(this, panel);
      if (debug(this) || !this.isInfiniteScoreUnlocked?.()) return;
      const button = document.createElement('button');
      button.className = 'ow-ability-link';
      button.type = 'button';
      button.innerHTML = '<b>無限奏廊ランキング</b><span>順位・日次報酬・週間報酬</span>';
      button.addEventListener('click', () => open(this));
      panel.querySelector('.ow-mode-guide')?.before(button);
    };
    const begin = game.isBegin;
    game.isBegin = function(...args) {
      const previous = this.isRun();
      const result = begin.apply(this, args);
      const run = this.isRun();
      if (run && run !== previous) start(this, run);
      return result;
    };
    const returned = game.isReturnRun;
    game.isReturnRun = function(...args) {
      const run = this.isRun();
      const result = returned.apply(this, args);
      if (run && this.profile.infiniteScore.lastResult === 'return') {
        void postReturn(this, run).catch(() => toast('ランキング記録を保存できませんでした。'));
      }
      return result;
    };
    window.addEventListener('online', () => { void flush(game).catch(() => {}); });
  }
  const boot = () => window.arseneGame?.isBegin ? install(window.arseneGame) : requestAnimationFrame(boot);
  boot();
})();
