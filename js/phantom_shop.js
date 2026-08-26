// ══════════════════════════════════════════════════════════════
// カズの隠しメニュー（拠点でカズを3回タップ）と裏ショップ
//
// 隠しメニューは拠点の上へ重ねるだけで、画面遷移はしない。
// 「買い物」は全画面の裏ショップへ、「遊び」は選曲画面を挟んで既存の音ゲーへ繋ぐ。
//
// 音ゲー側（kazu_minigame.js）の3回タップは、直接ゲームを開くのをやめて
// このメニューを開くように差し替えてある。
// ══════════════════════════════════════════════════════════════
(() => {
  'use strict';

  // 裏ショップの品揃え。購入処理はまだ繋いでいないので、
  // 押すとトーストが出るだけ（元HTMLと同じ挙動）。
  const ITEMS = [
    {
      id: 'time-complete-pass', no: '01', kicker: 'TOP RECOMMEND', name: '怪盗の時短パス COMPLETE',
      priceLabel: '¥1,500', accent: '#ffffff', featured: true,
      description: '広告スキップ・AUTO×3・一掃をまとめて永久解放。発動条件や1日の利用回数、勝敗計算と報酬量は変わりません。',
      stats: [['■ 広告スキップ', '永久'], ['■ AUTO SPEED', '×3.0 常設'], ['■ 一掃', '通常Dで常設']],
      cta: '¥1,500 で全部解放', action: '購入',
      ctaStyle: 'background:linear-gradient(90deg,#f1f5f9,#fff,#e2e8f0);color:#020617;border:1px solid #fff;box-shadow:0 0 15px #ffffff80'
    },
    {
      id: 'ad-skip-license', no: '02', kicker: 'MOST POPULAR', name: '広告スキップライセンス',
      priceLabel: '¥900', accent: '#fcd34d',
      description: '任意広告を再生せず、同じリワードを受け取れます。復活・装備保護・素材追加などの発動条件と回数制限はそのままです。',
      stats: [['■ 広告の再生時間', '0秒'], ['■ リワード内容', '変更なし'], ['■ 回数制限', '変更なし']],
      cta: '¥900 で永久解放', action: '購入',
      ctaStyle: 'background:linear-gradient(90deg,#fcd34d,#fbbf24,#fb923c);color:#020617'
    },
    {
      id: 'ad-skip-tickets', no: '03', kicker: 'LIGHT PLAN', name: '広告スキップチケット ×10',
      priceLabel: '¥160', accent: '#c084fc',
      description: '好きな任意広告を10回だけ省略できるお試し版。チケットが無くなっても、通常の広告視聴は引き続き利用できます。',
      stats: [['■ スキップ回数', '10回'], ['■ リワード内容', '変更なし'], ['■ 有効期限', 'なし']],
      cta: '¥160 で10回分購入', action: '購入',
      ctaStyle: 'background:#9333ea;color:#fff'
    },
    {
      id: 'auto3-license', no: '04', kicker: 'BATTLE SPEED', name: 'AUTO×3 常設ライセンス',
      priceLabel: '¥480', accent: '#22d3ee',
      description: '有料版限定のAUTO×3をいつでも使用できます。AUTO×2は従来どおり広告視聴で利用可能。行動順・ダメージ・敵の強さ・報酬は変化しません。',
      stats: [['■ 最大AUTO速度', '×3.0'], ['■ AUTO×2', '広告で利用可'], ['■ 戦闘性能', '変更なし']],
      cta: '¥480 で永久解放', action: '購入',
      ctaStyle: 'background:linear-gradient(90deg,#22d3ee,#38bdf8,#3b82f6);color:#020617'
    },
    {
      id: 'sweep-license', no: '05', kicker: 'LAP SUPPORT', name: '一掃 常設ライセンス',
      priceLabel: '¥480', accent: '#6ee7b7',
      description: '通常ダンジョンの一掃を広告なしで使用できます。対象範囲・勝敗計算・獲得報酬は通常の一掃と同じです。',
      stats: [['■ 通常D一掃', '常設'], ['■ ボス・異世界', '対象外'], ['■ 獲得報酬', '変更なし']],
      cta: '¥480 で永久解放', action: '購入',
      ctaStyle: 'background:linear-gradient(90deg,#6ee7b7,#2dd4bf,#22d3ee);color:#020617'
    },
    {
      id: 'otherworld-tickets', no: '06', kicker: 'OTHER WORLD', name: '異世界探索券 ×5',
      priceLabel: '¥200', accent: '#67e8f9',
      description: '本日の無料探索回数を使い切った後も、異世界へ合計5回追加で潜入できます。探索券に有効期限はなく、未使用分は保持されます。',
      stats: [['■ 追加探索回数', '5回'], ['■ 有効期限', 'なし'], ['■ 戦闘・ドロップ補正', 'なし']],
      cta: '¥200 で5回分購入', action: '購入',
      ctaStyle: 'background:linear-gradient(90deg,#67e8f9,#38bdf8,#60a5fa);color:#020617'
    },
    {
      id: 'rebirth-arcana', no: '07', kicker: 'REINCARNATION', name: '輪廻のアルカナ ×1',
      priceLabel: '¥200', accent: '#f0abfc',
      description: '《輪廻のアルカナ》を1個獲得します。規定ボスの報酬だけでなく、異世界探索でも入手可能です。購入しただけでは能力は上がらず、JOB Lv20からの転生時に消費します。',
      stats: [['■ 獲得数', '1個'], ['■ 使用条件', 'JOB Lv20'], ['■ 直接能力上昇', 'なし']],
      cta: '¥200 で1個購入', action: '購入',
      ctaStyle: 'background:linear-gradient(90deg,#f0abfc,#f472b6,#c084fc);color:#020617'
    }
  ];

  // 音ゲーの選曲。01は既存の《零時侵蝕》。
  // BPMと長さは音源をデコードして実測した値（自己相関＋オンセットのグリッド適合で170を採用）。
  // 02以降は音源がまだ無いので LOCKED 表示のみで、押しても始まらない。
  const TRACKS = [
    {
      id: 'reijishinshoku', no: '01', title: '零時侵蝕', bpm: 170, length: '4:37',
      genre: 'OPENING THEME', diff: 'HARD', level: '08', accent: '#fb7185', playable: true
    },
    {
      id: 'neon-labyrinth', no: '02', title: 'Neon Labyrinth', bpm: 172, length: '—',
      genre: 'CYBER TRANCE', diff: 'EXPERT', level: '12', accent: '#c084fc', playable: false
    },
    {
      id: 'phantom-overdrive', no: '03', title: 'PHANTOM OVERDRIVE', bpm: 200, length: '—',
      genre: 'HARDCORE', diff: 'PHANTOM', level: '15', accent: '#22d3ee', playable: false
    }
  ];

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tint = (hex, alpha) => `${hex}${alpha}`;

  class PhantomSecret {
    constructor() {
      this.popup = null;
      this.shop = null;
      this.arcade = null;
      this.toasts = null;
      this.build();
    }

    build() {
      // ── 隠しメニュー ──
      const popup = document.createElement('div');
      popup.className = 'phantom-secret';
      popup.id = 'phantom-secret';
      popup.hidden = true;
      popup.innerHTML = `
        <div class="pm-popup pm-cut" role="dialog" aria-modal="true" aria-label="カズの隠しメニュー">
          <button type="button" class="pm-popup-close" data-pm="close-popup" aria-label="閉じる">[ × ]</button>
          <div class="pm-tag pm-cut-sm">UNKNOWN FREQUENCY</div>
          <div class="pm-speech pm-cut">
            <p>「……ふん。何度も俺を呼び出すとはな。<br>……で、用件はなんやねん？」</p>
            <div class="pm-speech-sub">[ 買い物か？ それとも、遊んでほしいんか？ ]</div>
          </div>
          <div class="pm-actions">
            <button type="button" class="pm-btn pm-btn-purple pm-cut-sm" data-pm="open-shop">
              <span>🛍️ 買い物をしたい（裏ショップへ）</span><i>▶</i>
            </button>
            <button type="button" class="pm-btn pm-btn-rose pm-cut-sm" data-pm="play">
              <span>🎲 遊びに付き合え（音ゲーへ）</span><i>▶</i>
            </button>
            <button type="button" class="pm-btn-quiet" data-pm="close-popup">見なかったことにする</button>
          </div>
        </div>`;

      // ── 裏ショップ ──
      const shop = document.createElement('div');
      shop.className = 'phantom-shop';
      shop.id = 'phantom-shop';
      shop.hidden = true;
      shop.innerHTML = `
        <header class="pm-shop-head">
          <div class="pm-shop-kicker pm-cut-sm"><b></b>Underground Black Market</div>
          <div class="pm-shop-bar">
            <button type="button" class="pm-shop-back pm-cut-sm" data-pm="back">◀ 戻る</button>
            <h2 class="pm-shop-title">✦ PHANTOM SHOP ✦</h2>
            <span style="width:52px"></span>
          </div>
          <p class="pm-shop-note">すべて時短専用。戦闘力・報酬量・利用上限は変化しません</p>
        </header>
        <div class="pm-shop-list">${ITEMS.map(item => this.itemHTML(item)).join('')}</div>`;

      // ── 選曲画面 ──
      const arcade = document.createElement('div');
      arcade.className = 'phantom-arcade';
      arcade.id = 'phantom-arcade';
      arcade.hidden = true;
      arcade.innerHTML = `
        <header class="pm-arcade-head">
          <div class="pm-arcade-kicker pm-cut-sm">Entering Arcade Mode...</div>
          <div class="pm-shop-bar">
            <button type="button" class="pm-shop-back pm-cut-sm" data-pm="back">◀ BACK</button>
            <h2 class="pm-arcade-title">PHANTOM<span>BEAT</span></h2>
            <span style="width:52px"></span>
          </div>
        </header>
        <div class="pm-track-list">${TRACKS.map(t => this.trackHTML(t)).join('')}</div>
        <footer class="pm-arcade-foot">CREDITS: 01 / INSERT COIN</footer>`;

      const toasts = document.createElement('div');
      toasts.className = 'pm-toasts';

      document.body.append(popup, shop, arcade, toasts);
      this.popup = popup; this.shop = shop; this.arcade = arcade; this.toasts = toasts;

      const onClick = event => {
        const button = event.target.closest('[data-pm]');
        if (!button) return;
        event.preventDefault();
        const action = button.dataset.pm;
        if (action === 'close-popup') this.close();
        else if (action === 'open-shop') this.openShop();
        else if (action === 'back') this.backToPopup();
        else if (action === 'play') this.play();
        else if (action === 'toggle') this.toggleItem(button.closest('.pm-item'));
        else if (action === 'buy') this.toast(button.dataset.name, button.dataset.action);
        else if (action === 'track') this.playTrack(button.dataset.track);
      };
      popup.addEventListener('click', onClick);
      shop.addEventListener('click', onClick);
      arcade.addEventListener('click', onClick);

      // 隠しメニューは背景（拠点）をタップしても閉じる。
      popup.addEventListener('click', event => { if (event.target === popup) this.close(); });

      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (!this.shop.hidden || !this.arcade.hidden) this.backToPopup();
        else if (!this.popup.hidden) this.close();
      });
    }

    itemHTML(item) {
      const head = `
        <button type="button" class="pm-item-head" data-pm="toggle">
          <span style="display:flex;align-items:center;gap:12px;min-width:0">
            <span class="pm-item-id pm-cut-sm" style="color:${item.accent};background:${tint(item.accent, '1a')};border:1px solid ${tint(item.accent, '4d')}">${esc(item.no)}</span>
            <span class="pm-item-name">
              <small style="color:${item.accent}">${item.featured ? '<i></i>' : ''}${esc(item.kicker)}</small>
              <b>${esc(item.name)}</b>
            </span>
          </span>
          <span class="pm-item-right">
            <span class="pm-item-price pm-cut-sm" style="color:${item.featured ? '#020617' : item.accent};background:${item.featured ? '#fff' : tint(item.accent, '26')};border-color:${tint(item.accent, '4d')}">${esc(item.priceLabel)}</span>
            <span class="pm-item-arrow">▼</span>
          </span>
        </button>`;
      const body = `
        <div class="pm-item-body"><div style="border-color:${tint(item.accent, '33')}">
          ${item.description ? `<p>${esc(item.description)}</p>` : ''}
          ${item.stats ? `<div class="pm-item-stats">${item.stats.map(([k, v]) => `<span>${esc(k)}<b>${esc(v)}</b></span>`).join('')}</div>` : ''}
          <button type="button" class="pm-item-cta pm-cut-sm" style="${item.ctaStyle}" data-pm="buy" data-name="${esc(item.name)}" data-action="${esc(item.action)}">${esc(item.cta)}</button>
        </div></div>`;
      return item.featured
        ? `<article class="pm-item pm-item-featured pm-cut" data-id="${item.id}"><div class="pm-item-inner pm-cut">${head}${body}</div></article>`
        : `<article class="pm-item pm-cut" data-id="${item.id}">${head}${body}</article>`;
    }

    trackHTML(track) {
      const score = track.playable ? this.highScore() : null;
      return `
        <button type="button" class="pm-track pm-cut${track.playable ? '' : ' locked'}"
                data-pm="track" data-track="${track.id}" ${track.playable ? '' : 'disabled'}>
          <span class="pm-track-no" style="color:${track.accent};background:${tint(track.accent, '26')};border:1px solid ${tint(track.accent, '80')}">${esc(track.no)}</span>
          <span class="pm-track-main">
            <small>BPM ${track.bpm} / ${esc(track.genre)}${track.length !== '—' ? ` / ${track.length}` : ''}</small>
            <b>${esc(track.title)}</b>
            <span class="pm-track-diff" style="color:${track.accent};border:1px solid ${track.accent};background:${tint(track.accent, '1a')}">${esc(track.diff)} ${esc(track.level)}</span>
          </span>
          <span class="pm-track-score">${track.playable
            ? `HIGH SCORE<b style="color:${track.accent}">${score.toLocaleString()}</b>`
            : `<em>LOCKED</em><b style="color:${track.accent}">COMING SOON</b>`}</span>
        </button>`;
    }

    // 音ゲー側が保存しているハイスコアをそのまま出す。
    highScore() { return Number(window.arseneGame?.profile?.flags?.kazuRhythmHighScore || 0); }

    toggleItem(item) { if (item) item.classList.toggle('open'); }

    // ── 開閉 ──
    open() {
      if (!this.popup.hidden) return;
      this.popup.hidden = false;
      window.arseneGame?.audio?.sfx?.('ui');
    }
    close() {
      this.popup.hidden = true;
      this.shop.hidden = true;
      this.arcade.hidden = true;
    }
    openShop() {
      this.popup.hidden = true;
      this.shop.hidden = false;
      this.shop.querySelector('.pm-shop-list').scrollTop = 0;
      window.arseneGame?.audio?.sfx?.('ui');
    }
    backToPopup() {
      this.shop.hidden = true;
      this.arcade.hidden = true;
      this.popup.hidden = false;
      window.arseneGame?.audio?.sfx?.('ui');
    }

    // 「遊びに付き合え」→ 選曲画面へ。実際の起動は曲を選んでから。
    play() {
      this.popup.hidden = true;
      this.arcade.hidden = false;
      this.arcade.querySelector('.pm-track-list').scrollTop = 0;
      this.refreshScores();
      window.arseneGame?.audio?.sfx?.('ui');
    }

    // 選曲画面を開くたびにハイスコアを引き直す。
    refreshScores() {
      const el = this.arcade.querySelector('.pm-track[data-track="reijishinshoku"] .pm-track-score b');
      if (el) el.textContent = this.highScore().toLocaleString();
    }

    playTrack(id) {
      const track = TRACKS.find(t => t.id === id);
      if (!track?.playable) return;
      this.close();
      const rhythm = window.kazuRhythmGame;
      if (rhythm?.open) rhythm.open();
      else this.toast(track.title, '読み込みに失敗しました');
    }

    toast(name, action) {
      const el = document.createElement('div');
      el.className = 'pm-toast pm-cut-sm';
      el.innerHTML = `<b>✓</b><div><strong>${esc(name)}</strong><small>${esc(action)}</small></div>`;
      this.toasts.append(el);
      setTimeout(() => el.remove(), 2500);
    }
  }

  const init = () => { if (!window.phantomSecret) window.phantomSecret = new PhantomSecret(); };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();
})();
