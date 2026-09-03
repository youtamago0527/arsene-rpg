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

  const STORE_PRODUCTS = {
    'time-complete-pass': { productId: 'com.arsene.remix.time_complete_pass', type: 'nonConsumable' },
    'ad-skip-license': { productId: 'com.arsene.remix.ad_skip_license', type: 'nonConsumable' },
    'ad-skip-tickets': { productId: 'com.arsene.remix.ad_skip_tickets_10', type: 'consumable' },
    'auto3-license': { productId: 'com.arsene.remix.auto3_license', type: 'nonConsumable' },
    'sweep-license': { productId: 'com.arsene.remix.sweep_license', type: 'nonConsumable' },
    'otherworld-tickets': { productId: 'com.arsene.remix.otherworld_tickets_5', type: 'consumable' },
    'rebirth-arcana': { productId: 'com.arsene.remix.rebirth_arcana_1', type: 'consumable' },
    'protection-arcana': { productId: 'com.arsene.remix.protection_arcana_1', type: 'consumable' },
    'blessed-protection-arcana': { productId: 'com.arsene.remix.blessed_protection_arcana_1', type: 'consumable' }
  };
  const STORE_ITEM_BY_PRODUCT = Object.fromEntries(Object.entries(STORE_PRODUCTS).map(([itemId, value]) => [value.productId, itemId]));

  // 裏ショップの品揃え。効果の付与はStoreKitの検証済み取引を受け取った後だけ行う。
  const ITEMS = [
    {
      id: 'time-complete-pass', no: '01', kicker: 'TOP RECOMMEND', name: '怪盗の時短パス COMPLETE',
      priceLabel: '¥1,500', accent: '#ffffff', featured: true,
      description: '広告スキップ・AUTO×3・一掃をまとめて永久解放。AUTOはAI操作と演出速度だけを変え、AUTO×3中は勝利後も次の戦闘へ自動で進みます。一掃は通常ダンジョンの通常戦闘だけを簡易判定します。どちらも能力を強化せず、敗北することがあります。',
      stats: [['■ 広告スキップ', '永久'], ['■ AUTO SPEED', '×3.0 常設・連戦自動継続'], ['■ 一掃', '雑魚戦のみ／敗北あり']],
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
      description: '有料版限定のAUTO×3をいつでも使用できます。AUTOは通常戦闘をAIが実際に操作し、倍率は演出の待ち時間だけを短縮します。さらにAUTO×3が有効な間は、勝利画面の「次の戦闘へ」も自動で選ばれ、連戦がノータップで進みます。ダメージ・行動順・敵・報酬は変わらず、回復アイテムを消費することも敗北することもあります。',
      stats: [['■ 最大AUTO速度', '×3.0'], ['■ 連戦', '勝利後に自動で次の戦闘へ'], ['■ AUTO×2', '広告で利用可'], ['■ AI行動', '技・回復・対象を自動選択'], ['■ 戦闘性能', '変更なし／敗北あり']],
      cta: '¥480 で永久解放', action: '購入',
      ctaStyle: 'background:linear-gradient(90deg,#22d3ee,#38bdf8,#3b82f6);color:#020617'
    },
    {
      id: 'sweep-license', no: '05', kicker: 'LAP SUPPORT', name: '一掃 常設ライセンス',
      priceLabel: '¥480', accent: '#6ee7b7',
      description: '通常ダンジョンの雑魚戦だけを広告なしで簡易決着します。現在の残HP・MP、装備/JOB込みの攻防、習得技と敵全員のHP・攻防から必要ターンと被ダメージを予測し、予測被ダメージが現在HP以上なら敗北します。戦闘力を上げる商品ではなく、回復アイテムも自動使用しません。',
      stats: [['■ 対象', '通常ダンジョンの雑魚戦'], ['■ 対象外', 'エリート・レア・全ボス・異世界'], ['■ 勝利条件', '予測被ダメージ ＜ 現在HP'], ['■ 判定効率', '手動より低い78%'], ['■ アイテム', '使用しない'], ['■ EXP/GOLD/DROP', '通常抽選'], ['■ 武器学', '推定ターン分（1〜8）']],
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
    },
    {
      id: 'protection-arcana', no: '08', kicker: 'ENCHANT PROTECTION', name: '保護のアルカナ ×1',
      priceLabel: '¥200', accent: '#60a5fa',
      description: '武器強化前に使用します。失敗時も武器とOPを残しますが、強化値は3段階低下します（最低+0）。成功・失敗を問わず1個消費し、素材武器とGOLDも消費されます。',
      stats: [['■ 失敗時', '武器維持／強化値−3'], ['■ 使用時', '抽選前に1個消費']],
      cta: '¥200 で1個購入', action: '購入',
      ctaStyle: 'background:linear-gradient(90deg,#60a5fa,#38bdf8,#818cf8);color:#020617'
    },
    {
      id: 'blessed-protection-arcana', no: '09', kicker: 'BLESSED PROTECTION', name: '祝福された保護のアルカナ ×1',
      priceLabel: '¥500', accent: '#fbbf24',
      description: '武器強化前に使用します。失敗時も武器・OP・現在の強化値を維持します。成功・失敗を問わず1個消費し、素材武器とGOLDも消費されます。',
      stats: [['■ 失敗時', '武器・強化値を維持'], ['■ 使用時', '抽選前に1個消費']],
      cta: '¥500 で1個購入', action: '購入',
      ctaStyle: 'background:linear-gradient(90deg,#fde68a,#fbbf24,#f59e0b);color:#1c1100'
    }
  ];

  // 音ゲーの選曲。01は既存の《零時侵蝕》。
  // BPMと長さは音源をデコードして実測した値（自己相関＋オンセットのグリッド適合で170を採用）。
  // 02以降は音源がまだ無いので LOCKED 表示のみで、押しても始まらない。
  const TRACKS = [
    {
      id: 'reijishinshoku', no: '01', title: '零時侵蝕', bpm: 170, length: '4:37',
      genre: 'OPENING THEME', diff: 'HARD', level: '08', accent: '#fb7185', playable: true,
      audio: '音楽系/OP/零時侵蝕.mp3', subtitle: 'ZERO HOUR INVASION'
    },
    {
      id: 'cadenza-loot', no: '02', title: '絶望の戦利品 -LOOT-', bpm: '—', length: '4:33',
      genre: 'PHANTOM SCORE', diff: 'EXPERT', level: '10', accent: '#c084fc', playable: true,
      scoreId: 'cadenzaLoot', audio: '音楽系/隠し音ゲー/絶望の戦利品-LOOT-.mp3', subtitle: 'CADENZA'
    },
    {
      id: 'rhythm-clown-paradise', no: '03', title: '道化師の楽園', bpm: '—', length: '3:19',
      genre: 'PHANTOM SCORE', diff: 'EXPERT', level: '10', accent: '#f43f5e', playable: true,
      scoreId: 'rhythm', audio: '音楽系/隠し音ゲー/道化師の楽園.mp3', subtitle: 'RHYTHM'
    },
    {
      id: 'reprise-red-fox', no: '04', title: '赤狐の怪盗', bpm: '—', length: '3:53',
      genre: 'PHANTOM SCORE', diff: 'EXPERT', level: '11', accent: '#fb7185', playable: true,
      scoreId: 'reprise', audio: '音楽系/隠し音ゲー/赤狐の怪盗.mp3', subtitle: 'REPRISE'
    },
    {
      id: 'staccato-phantom-letter', no: '05', title: 'Qの予告状 -Phantom Letter “Q”-', bpm: '—', length: '3:28',
      genre: 'PHANTOM SCORE', diff: 'PHANTOM', level: '13', accent: '#ef4444', playable: true,
      scoreId: 'staccato', audio: '音楽系/隠し音ゲー/Qの予告状-Phantom Letter Q-.mp3', subtitle: 'STACCATO'
    },
    {
      id: 'ostinato-labyrinth', no: '06', title: '月影の迷宮 -Labyrinth-', bpm: '—', length: '4:26',
      genre: 'PHANTOM SCORE', diff: 'PHANTOM', level: '12', accent: '#22d3ee', playable: true,
      scoreId: 'ostinato', audio: '音楽系/隠し音ゲー/月影の迷宮-Labyrinth-.mp3', subtitle: 'OSTINATO'
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
      this.purchaseBusy = false;
      this.storeReady = false;
      this.storeProducts = {};
      this.build();
      this.bindStoreUpdates();
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
        <div class="pm-shop-list">${ITEMS.map(item => this.itemHTML(item)).join('')}</div>
        <footer class="pm-arcade-foot"><button type="button" class="pm-btn-quiet" data-pm="restore">購入を復元</button></footer>`;

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
        else if (action === 'buy') this.purchase(button.dataset.id);
        else if (action === 'restore') this.restorePurchases();
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
      const owned = this.isPermanentOwned(item.id), amount = this.consumableAmount(item.id);
      const store = STORE_PRODUCTS[item.id], native = this.isNativeStore(), available = native && this.storeReady && !!this.storeProducts[store.productId];
      const status = owned ? '購入済み' : amount != null ? `所持 ${amount}` : '';
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
          ${status ? `<small class="pm-item-owned">${esc(status)}</small>` : ''}
          <button type="button" class="pm-item-cta pm-cut-sm" style="${item.ctaStyle}" data-pm="buy" data-id="${esc(item.id)}" ${owned || !available || this.purchaseBusy ? 'disabled' : ''}>${owned ? '✓ 購入済み' : !native ? 'iOSアプリ限定' : !this.storeReady ? 'App Store確認中…' : !available ? '現在購入できません' : esc(item.cta)}</button>
        </div></div>`;
      return item.featured
        ? `<article class="pm-item pm-item-featured pm-cut" data-id="${item.id}"><div class="pm-item-inner pm-cut">${head}${body}</div></article>`
        : `<article class="pm-item pm-cut" data-id="${item.id}">${head}${body}</article>`;
    }

    trackHTML(track) {
      const unlocked = this.isTrackUnlocked(track);
      const score = unlocked ? this.highScore(track.id) : null;
      const displayTitle = unlocked ? track.title : '？？？？？？';
      const displayGenre = unlocked ? track.genre : 'UNKNOWN SCORE';
      return `
        <button type="button" class="pm-track pm-cut${unlocked ? '' : ' locked'}"
                data-pm="track" data-track="${track.id}" ${unlocked ? '' : 'disabled'}>
          <span class="pm-track-no" style="color:${track.accent};background:${tint(track.accent, '26')};border:1px solid ${tint(track.accent, '80')}">${esc(track.no)}</span>
          <span class="pm-track-main">
            <small>${unlocked ? `BPM ${track.bpm} / ${esc(displayGenre)}${track.length !== '—' ? ` / ${track.length}` : ''}` : esc(displayGenre)}</small>
            <b>${esc(displayTitle)}</b>
            <span class="pm-track-diff" style="color:${track.accent};border:1px solid ${track.accent};background:${tint(track.accent, '1a')}">${esc(track.diff)} ${esc(track.level)}</span>
          </span>
          <span class="pm-track-score">${unlocked
            ? `HIGH SCORE<b style="color:${track.accent}">${score.toLocaleString()}</b>`
            : `<em>LOCKED</em><b style="color:${track.accent}">${track.scoreId ? 'SCORE REQUIRED' : 'COMING SOON'}</b>`}</span>
        </button>`;
    }

    isTrackUnlocked(track) {
      if (!track?.playable) return false;
      return !track.scoreId || !!window.arseneGame?.profile?.musicScores?.[track.scoreId];
    }

    // 曲ごとのハイスコア。旧セーブの零時侵蝕スコアもそのまま引き継ぐ。
    highScore(id = 'reijishinshoku') {
      const flags = window.arseneGame?.profile?.flags || {};
      return Number(flags.kazuRhythmHighScores?.[id] || (id === 'reijishinshoku' ? flags.kazuRhythmHighScore : 0) || 0);
    }

    premium() {
      const g = window.arseneGame;
      if (!g?.profile) return null;
      return g.profile.premium ||= { adSkipLicense: false, adSkipTickets: 0, auto3License: false, sweepLicense: false, otherworldTickets: 0 };
    }

    isPermanentOwned(id) {
      const p = this.premium(); if (!p) return false;
      if (id === 'time-complete-pass') return !!(p.adSkipLicense && p.auto3License && p.sweepLicense);
      if (id === 'ad-skip-license') return !!p.adSkipLicense;
      if (id === 'auto3-license') return !!p.auto3License;
      if (id === 'sweep-license') return !!p.sweepLicense;
      return false;
    }

    consumableAmount(id) {
      const g = window.arseneGame, p = this.premium(); if (!g?.profile || !p) return null;
      if (id === 'ad-skip-tickets') return Math.max(0, Number(p.adSkipTickets) || 0);
      if (id === 'otherworld-tickets') return Math.max(0, Number(p.otherworldTickets) || 0);
      if (id === 'rebirth-arcana') return Math.max(0, Number(g.profile.inventory?.rebirthArcana) || 0);
      if (id === 'protection-arcana') return Math.max(0, Number(g.profile.inventory?.protectionArcana) || 0);
      if (id === 'blessed-protection-arcana') return Math.max(0, Number(g.profile.inventory?.blessedProtectionArcana) || 0);
      return null;
    }

    refreshShopItems() {
      const list = this.shop?.querySelector('.pm-shop-list');
      if (list) list.innerHTML = ITEMS.map(item => this.itemHTML(item)).join('');
    }

    isNativeStore() {
      const cap = window.Capacitor;
      return !!(cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'ios' && cap?.Plugins?.ArseneStoreKit);
    }

    storePlugin() { return this.isNativeStore() ? window.Capacitor.Plugins.ArseneStoreKit : null; }

    bindStoreUpdates() {
      const store = this.storePlugin(); if (!store?.addListener) return;
      store.addListener('transactionUpdated', async event => {
        try {
          const delivered = await this.deliverTransaction(event?.transaction);
          if (!delivered) return;
          this.refreshShopItems();
          this.toast(ITEMS.find(item => item.id === delivered.itemId)?.name || '購入', delivered.result);
        } catch {}
      });
    }

    async loadStore() {
      const store = this.storePlugin();
      if (!store) { this.storeReady = true; this.refreshShopItems(); return; }
      try {
        const ids = Object.values(STORE_PRODUCTS).map(value => value.productId);
        const result = await store.getProducts({ productIds: ids });
        this.storeProducts = Object.fromEntries((result.products || [])
          .filter(product => STORE_PRODUCTS[STORE_ITEM_BY_PRODUCT[product.productId]]?.type === product.type)
          .map(product => [product.productId, product]));
        for (const item of ITEMS) {
          const product = this.storeProducts[STORE_PRODUCTS[item.id].productId];
          if (!product?.displayPrice) continue;
          item.priceLabel = product.displayPrice;
          item.cta = item.cta.replace(/^¥[\d,]+/, product.displayPrice);
        }
        await this.recoverUnfinished();
      } catch (error) {
        this.toast('App Store', '商品情報を取得できませんでした');
      } finally {
        this.storeReady = true;
        this.refreshShopItems();
      }
    }

    applyPurchase(itemId) {
      const g = window.arseneGame, p = this.premium(), item = ITEMS.find(entry => entry.id === itemId);
      if (!g?.profile || !p || !item) return null;
      let result = '効果を反映しました';
      if (itemId === 'time-complete-pass') {
        p.adSkipLicense = true; p.auto3License = true; p.sweepLicense = true;
        result = '広告スキップ・AUTO×3・一掃を永久解放';
      } else if (itemId === 'ad-skip-license') {
        p.adSkipLicense = true; result = '広告スキップを永久解放';
      } else if (itemId === 'ad-skip-tickets') {
        p.adSkipTickets = Math.max(0, Number(p.adSkipTickets) || 0) + 10; result = `広告スキップ券 ${p.adSkipTickets}回分`;
      } else if (itemId === 'auto3-license') {
        p.auto3License = true; result = 'AUTO×3を永久解放';
      } else if (itemId === 'sweep-license') {
        p.sweepLicense = true; result = '通常ダンジョンの一掃を永久解放';
      } else if (itemId === 'otherworld-tickets') {
        p.otherworldTickets = Math.max(0, Number(p.otherworldTickets) || 0) + 5; result = `異世界探索券 ${p.otherworldTickets}回分`;
      } else if (itemId === 'rebirth-arcana') {
        g.profile.inventory ||= {};
        g.profile.inventory.rebirthArcana = Math.max(0, Number(g.profile.inventory.rebirthArcana) || 0) + 1;
        result = `輪廻のアルカナ 所持${g.profile.inventory.rebirthArcana}個`;
      } else if (itemId === 'protection-arcana') {
        g.profile.inventory ||= {};
        g.profile.inventory.protectionArcana = Math.max(0, Number(g.profile.inventory.protectionArcana) || 0) + 1;
        result = '保護のアルカナ 所持' + g.profile.inventory.protectionArcana + '個';
      } else if (itemId === 'blessed-protection-arcana') {
        g.profile.inventory ||= {};
        g.profile.inventory.blessedProtectionArcana = Math.max(0, Number(g.profile.inventory.blessedProtectionArcana) || 0) + 1;
        result = '祝福された保護のアルカナ 所持' + g.profile.inventory.blessedProtectionArcana + '個';
      } else return null;
      return result;
    }

    async deliverTransaction(transaction, restoring = false) {
      const g = window.arseneGame, p = this.premium(), store = this.storePlugin();
      const itemId = STORE_ITEM_BY_PRODUCT[transaction?.productId], txId = String(transaction?.transactionId || '');
      if (!g?.profile || !p || !store || !itemId || !txId) throw new Error('invalid_transaction');
      p.processedTransactions ||= {};
      let result = '購入済みです';
      if (!p.processedTransactions[txId]) {
        if (restoring && STORE_PRODUCTS[itemId].type !== 'nonConsumable') return;
        result = this.applyPurchase(itemId);
        if (!result) throw new Error('delivery_failed');
        p.processedTransactions[txId] = { productId: transaction.productId, deliveredAt: Date.now() };
        g.saveProfile?.();
      }
      await store.finish({ transactionId: txId });
      return { itemId, result };
    }

    async purchase(id) {
      const item = ITEMS.find(entry => entry.id === id), storeInfo = STORE_PRODUCTS[id], store = this.storePlugin();
      if (!item || !storeInfo || !store) { this.toast('購入できません', 'iOSアプリのApp Storeから購入してください'); return; }
      if (this.purchaseBusy || this.isPermanentOwned(id)) return;
      this.purchaseBusy = true; this.refreshShopItems();
      try {
        const response = await store.purchase({ productId: storeInfo.productId });
        if (response.status === 'cancelled') { this.toast(item.name, '購入をキャンセルしました'); return; }
        if (response.status === 'pending') { this.toast(item.name, '購入承認を待っています'); return; }
        const delivered = await this.deliverTransaction(response.transaction);
        if (!delivered) throw new Error('delivery_failed');
        const result = delivered.result;
      g.saveProfile?.(); g.audio?.sfx?.('confirm');
      g.renderBattleMenu?.(); g.showMainCommands?.(); g.renderMenuSummary?.();
      if (document.querySelector('#menu-panel')?.dataset.panel === 'otherworld') g.renderOtherWorldPanel?.(document.querySelector('#menu-panel'));
      this.refreshShopItems();
      this.toast(item.name, result);
      } catch (error) {
        this.toast(item.name, '購入を完了できませんでした');
      } finally {
        this.purchaseBusy = false; this.refreshShopItems();
      }
    }

    async recoverUnfinished() {
      const store = this.storePlugin(); if (!store) return;
      const response = await store.getUnfinished();
      for (const transaction of response.transactions || []) await this.deliverTransaction(transaction);
    }

    async restorePurchases() {
      const store = this.storePlugin();
      if (!store || this.purchaseBusy) { this.toast('購入を復元', 'iOSアプリで利用できます'); return; }
      this.purchaseBusy = true; this.refreshShopItems();
      try {
        const response = await store.restore();
        let restored = 0;
        for (const transaction of response.transactions || []) {
          const delivered = await this.deliverTransaction(transaction, true);
          if (delivered) restored++;
        }
        this.refreshShopItems();
        this.toast('購入を復元', restored ? '永久ライセンスを復元しました' : '復元できる購入はありません');
      } catch (error) {
        this.toast('購入を復元', '復元に失敗しました');
      } finally {
        this.purchaseBusy = false; this.refreshShopItems();
      }
    }

    // 開いている間はmax-heightを一切掛けない(CSS側で.open時にnone/overflow:visible)。
    // JSで高さを測って数値を当てはめる方式は実機Safariで中身が切れる事例が
    // 複数確認されたため撤去した。開閉の見た目は opacity/transform だけで作り、
    // 「絶対に切れない」という正しさをJSの計測に依存させない。
    // 閉じるときだけ、フェードが見えるよう .closing を先に付けてから
    // 少し遅れて実際にopenを外す(=max-heightが0へ戻る)。
    toggleItem(item) {
      const body = item?.querySelector('.pm-item-body');
      if (!body) { item?.classList.toggle('open'); return; }
      if (item.classList.contains('open')) {
        body.classList.add('closing');
        setTimeout(() => { item.classList.remove('open'); body.classList.remove('closing'); }, 240);
      } else {
        body.classList.remove('closing');
        item.classList.add('open');
      }
    }

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
      const g = window.arseneGame;
      if (g?.profile?.flags && !g.profile.flags.phantomShopUnlocked) {
        g.profile.flags.phantomShopUnlocked = true;
        g.saveProfile?.();
      }
      this.refreshShopItems();
      this.shop.querySelector('.pm-shop-list').scrollTop = 0;
      window.arseneGame?.audio?.sfx?.('ui');
      this.loadStore();
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
      this.arcade.querySelector('.pm-track-list').innerHTML = TRACKS.map(track => this.trackHTML(track)).join('');
      this.arcade.querySelector('.pm-track-list').scrollTop = 0;
      this.refreshScores();
      window.arseneGame?.audio?.sfx?.('ui');
    }

    // 選曲画面を開くたびにハイスコアを引き直す。
    refreshScores() {
      TRACKS.forEach(track => {
        const el = this.arcade.querySelector(`.pm-track[data-track="${track.id}"] .pm-track-score b`);
        if (el && this.isTrackUnlocked(track)) el.textContent = this.highScore(track.id).toLocaleString();
      });
    }

    playTrack(id) {
      const track = TRACKS.find(t => t.id === id);
      if (!this.isTrackUnlocked(track)) return;
      this.close();
      const rhythm = window.kazuRhythmGame;
      if (rhythm?.open) rhythm.open(track);
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
