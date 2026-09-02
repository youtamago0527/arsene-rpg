(function () {
  'use strict';
  const API_URL = String(window.ARSENE_WEEKLY_API_URL || 'https://ranking-api.example.invalid').replace(/\/$/, '');
  const TOKEN_KEY = 'arsene.weeklyRanking.token.v1', PENDING_KEY = 'arsene.weeklyRanking.pending.v1', RECEIPTS_KEY = 'arsene.weeklyRanking.receipts.v1';
  const isIOS = () => !!(window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === 'ios');
  const plugin = () => isIOS() && window.Capacitor?.Plugins?.ArseneGameCenter;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const state = { token: sessionStorage.getItem(TOKEN_KEY) || '', status: '', last: null };

  async function request(path, options = {}, retryAuth = true) {
    if (!state.token && path !== '/v1/auth/game-center') await authenticate();
    const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) } });
    if (response.status === 401 && retryAuth) { state.token = ''; sessionStorage.removeItem(TOKEN_KEY); await authenticate(); return request(path, options, false); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || `HTTP ${response.status}`); error.status = response.status; error.code = data.error; throw error; }
    return data;
  }

  async function authenticate() {
    const native = plugin();
    if (!native) throw new Error('Game CenterはiOSアプリ版でのみ利用できます');
    state.status = 'Game Center認証中…';
    const identity = await native.authenticate();
    const data = await request('/v1/auth/game-center', { method: 'POST', body: JSON.stringify(identity) }, false);
    state.token = data.token; sessionStorage.setItem(TOKEN_KEY, state.token); state.status = '';
    return data;
  }

  async function startRun(game) {
    if (!isIOS() || game.localScenario?.id || Object.keys(game.profile?.infiniteScoreDebug || {}).length) return;
    try {
      const attest = await plugin()?.appAttestStatus?.().catch(() => null);
      const data = await request('/v1/runs/start', { method: 'POST', body: '{}', headers: attest?.keyId ? { 'X-App-Attest': attest.keyId } : {} });
      const run = game.isRun?.(); if (run?.active) { run.weeklyRunNonce = data.runNonce; run.weeklyEligible = true; game.saveProfile(); }
    } catch (error) { state.status = `ランキング保留：${error.message}`; }
  }

  async function submitReturn(floor, runNonce) {
    if (!runNonce) return;
    const pending = read(PENDING_KEY, []), record = { floor, runNonce, queuedAt: Date.now() };
    if (!pending.some(x => x.runNonce === runNonce)) { pending.push(record); write(PENDING_KEY, pending); }
    await flushPending();
  }

  async function flushPending() {
    const pending = read(PENDING_KEY, []), keep = [];
    for (const score of pending) {
      try { const data = await request('/v1/scores', { method: 'POST', body: JSON.stringify(score) }); await plugin()?.submitScore?.({ score: data.bestFloor, leaderboardId: data.leaderboardId }).catch(() => {}); }
      catch (error) { if (![400, 409].includes(error.status)) keep.push(score); state.status = [400, 409].includes(error.status) ? `期限切れ記録を破棄：${error.message}` : `スコア送信保留：${error.message}`; }
    }
    write(PENDING_KEY, keep);
  }

  function applyReceipt(game, receipt) {
    const applied = read(RECEIPTS_KEY, []);
    game.profile.weeklyRewardReceipts ||= [];
    if (applied.includes(receipt.receiptId) || game.profile.weeklyRewardReceipts.includes(receipt.receiptId)) return false;
    const pendingKey = `arsene.weeklyRanking.receipt.${receipt.receiptId}`;
    localStorage.setItem(pendingKey, JSON.stringify(receipt));
    game.profile.inventory[receipt.itemId] = (game.profile.inventory[receipt.itemId] || 0) + Number(receipt.quantity || 0);
    game.profile.weeklyRewardReceipts.push(receipt.receiptId);
    game.profile.weeklyRewardReceipts = game.profile.weeklyRewardReceipts.slice(-500);
    game.saveProfile();
    applied.push(receipt.receiptId); write(RECEIPTS_KEY, applied.slice(-500)); localStorage.removeItem(pendingKey);
    return true;
  }

  async function claim(game, grantId) {
    const claimId = crypto.randomUUID(), data = await request('/v1/gifts/claim', { method: 'POST', body: JSON.stringify({ grantId, claimId }) });
    if (applyReceipt(game, data.receipt)) window.arseneStartFlow?.toast(`${data.receipt.label}を受け取りました`);
    return data;
  }

  const remaining = endMs => { const ms = Math.max(0, endMs - Date.now()), d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000); return `${d}日 ${h}時間 ${m}分`; };
  async function open(game) {
    if (!isIOS()) return;
    document.getElementById('weekly-ranking-modal')?.remove();
    const modal = document.createElement('div'); modal.id = 'weekly-ranking-modal'; modal.className = 'weekly-ranking-modal';
    modal.innerHTML = '<section role="dialog" aria-modal="true"><button data-weekly-close>×</button><small>INFINITE SCORE // WEEKLY</small><h2>週間ランキング</h2><p class="weekly-loading">Game Centerへ接続中…</p></section>';
    document.body.appendChild(modal);
    try {
      await flushPending();
      const [ranking, gifts] = await Promise.all([request('/v1/rankings/weekly'), request('/v1/gifts')]); state.last = ranking;
      const rows = ranking.rows.map(row => `<li${row.rank === ranking.me?.rank ? ' class="me"' : ''}><b>${row.rank}</b><span>${esc(row.displayName)}</span><strong>F${row.maxFloor}</strong></li>`).join('');
      const giftRows = gifts.gifts.map(g => `<li><span><b>${esc(g.label)}</b><small>${esc(g.itemId)} ×${g.quantity}</small></span><button data-weekly-claim="${esc(g.id)}">受け取る</button></li>`).join('');
      modal.querySelector('section').innerHTML = `<button data-weekly-close>×</button><small>INFINITE SCORE // WEEKLY</small><h2>週間ランキング</h2><div class="weekly-summary"><b>自分の順位 ${ranking.me ? `${ranking.me.rank}位 / F${ranking.me.maxFloor}` : '記録なし'}</b><span>残り ${remaining(ranking.week.endMs)}</span></div>${state.status ? `<p class="weekly-notice">${esc(state.status)}</p>` : ''}<ol>${rows || '<li class="empty">まだ記録がありません</li>'}</ol><h3>プレゼントBOX</h3><ul>${giftRows || '<li class="empty">未受領プレゼントはありません</li>'}</ul><button data-weekly-retry>再読み込み</button>`;
    } catch (error) { modal.querySelector('.weekly-loading').innerHTML = `${esc(error.message)}<br><button data-weekly-retry>再試行</button>`; }
  }

  function install(game) {
    if (!isIOS()) return;
    const nav = document.getElementById('menu-nav');
    if (nav && !nav.querySelector('[data-weekly-ranking]')) nav.insertAdjacentHTML('beforeend', '<button data-weekly-ranking><i>R</i><b>週間ランキング</b><span>WEEKLY</span><small>順位・プレゼントBOX</small></button>');
    const begin = game.isBegin; game.isBegin = function (...args) { const result = begin.apply(this, args); if (this.isRun?.()) void startRun(this); return result; };
    const returned = game.isReturnRun; game.isReturnRun = function (...args) { const run = this.isRun?.(), floor = run?.floor, nonce = run?.weeklyEligible && run?.weeklyRunNonce; const result = returned.apply(this, args); if (this.profile?.infiniteScore?.lastResult === 'return' && nonce) void submitReturn(floor, nonce); return result; };
    void flushPending();
  }

  document.addEventListener('click', event => {
    const game = window.arseneGame;
    if (event.target.closest('[data-weekly-ranking]')) { event.preventDefault(); void open(game); }
    if (event.target.closest('[data-weekly-close]') || event.target === document.getElementById('weekly-ranking-modal')) document.getElementById('weekly-ranking-modal')?.remove();
    if (event.target.closest('[data-weekly-retry]')) void open(game);
    const claimButton = event.target.closest('[data-weekly-claim]'); if (claimButton) { claimButton.disabled = true; void claim(game, claimButton.dataset.weeklyClaim).then(() => open(game)).catch(error => { claimButton.disabled = false; window.arseneStartFlow?.toast(`受領保留：${error.message}`); }); }
  });
  const boot = () => window.arseneGame?.isBegin ? install(window.arseneGame) : requestAnimationFrame(boot); boot();
  window.ARSENE_WEEKLY_RANKING = { isIOS, open, flushPending, applyReceipt };
})();
