// ══════════════════════════════════════════════════════════════
// カズの隠しメニュー（拠点でカズを3回タップ）と裏ショップ
//
// 隠しメニューは拠点の上へ重ねるだけで、画面遷移はしない。
// 「買い物」は全画面の裏ショップへ、「遊び」は既存の音ゲーへ繋ぐ。
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
      id: 'makanai-boost', no: '01', kicker: 'TOP RECOMMEND', name: 'まかないブースト',
      priceLabel: '広告(白)', accent: '#ffffff', featured: true,
      description: '短い広告（白統一）視聴で即座に本日の特大リワードと限定バフを獲得します。',
      stats: [['■ スタミナ', '全回復'], ['■ 獲得GOLD', '+50%']],
      cta: '広告を見て発動する', action: '広告視聴',
      ctaStyle: 'background:linear-gradient(90deg,#f1f5f9,#fff,#e2e8f0);color:#020617;border:1px solid #fff;box-shadow:0 0 15px #ffffff80'
    },
    {
      id: 'vip-pass', no: '02', kicker: 'VIP PASS', name: '怪盗の極意 (VIP)',
      priceLabel: '¥600', accent: '#fcd34d',
      cta: '¥600 で購入する', action: '購入',
      ctaStyle: 'background:linear-gradient(90deg,#fcd34d,#fbbf24,#fb923c);color:#020617'
    },
    {
      id: 'dimension-keys', no: '03', kicker: 'LIMITED', name: '異次元の鍵セット',
      priceLabel: '¥480', accent: '#c084fc',
      cta: '¥480 で購入する', action: '購入',
      ctaStyle: 'background:#9333ea;color:#fff'
    },
    {
      id: 'smuggled-gadget', no: '04', kicker: 'BLACK MARKET', name: '密輸品ガジェット',
      priceLabel: '???', accent: '#fb7185',
      cta: '不穏な取引を実行', action: '調達',
      ctaStyle: 'background:linear-gradient(90deg,#fb7185,#ef4444,#e11d48);color:#020617'
    },
    {
      id: 'phantom-reserve', no: '05', kicker: 'RESERVE', name: 'ファントムリザーブ',
      priceLabel: '広告(白)', accent: '#6ee7b7',
      cta: '広告を見て物資受領', action: '広告視聴',
      ctaStyle: 'background:linear-gradient(90deg,#6ee7b7,#2dd4bf,#22d3ee);color:#020617'
    },
    {
      id: 'shadow-exchange', no: '06', kicker: 'EXCHANGE', name: 'シャドウエクスチェンジ',
      priceLabel: '変換', accent: '#67e8f9',
      cta: '変換レートを確認', action: '変換',
      ctaStyle: 'background:linear-gradient(90deg,#67e8f9,#38bdf8,#60a5fa);color:#020617'
    },
    {
      id: 'soul-link', no: '07', kicker: 'NETWORK', name: 'ソウルリンク端末',
      priceLabel: '広告(白)', accent: '#f0abfc',
      cta: '広告を見て回線同期', action: '広告視聴',
      ctaStyle: 'background:linear-gradient(90deg,#f0abfc,#f472b6,#c084fc);color:#020617'
    }
  ];

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tint = (hex, alpha) => `${hex}${alpha}`;

  class PhantomSecret {
    constructor() {
      this.popup = null;
      this.shop = null;
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
              <span>🎲 遊びに付き合え（隠し勝負）</span><i>▶</i>
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
          <p class="pm-shop-note">コマンドをタップして詳細を展開・裏取引</p>
        </header>
        <div class="pm-shop-list">${ITEMS.map(item => this.itemHTML(item)).join('')}</div>`;

      const toasts = document.createElement('div');
      toasts.className = 'pm-toasts';

      document.body.append(popup, shop, toasts);
      this.popup = popup; this.shop = shop; this.toasts = toasts;

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
      };
      popup.addEventListener('click', onClick);
      shop.addEventListener('click', onClick);

      // 隠しメニューは背景（拠点）をタップしても閉じる。
      popup.addEventListener('click', event => { if (event.target === popup) this.close(); });

      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (!this.shop.hidden) this.backToPopup();
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
    }
    openShop() {
      this.popup.hidden = true;
      this.shop.hidden = false;
      this.shop.querySelector('.pm-shop-list').scrollTop = 0;
      window.arseneGame?.audio?.sfx?.('ui');
    }
    backToPopup() {
      this.shop.hidden = true;
      this.popup.hidden = false;
      window.arseneGame?.audio?.sfx?.('ui');
    }

    // 「遊びに付き合え」→ 既に用意してある音ゲーをそのまま開く。
    play() {
      this.close();
      const rhythm = window.kazuRhythmGame;
      if (rhythm?.open) rhythm.open();
      else this.toast('音ゲー', '読み込みに失敗しました');
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
