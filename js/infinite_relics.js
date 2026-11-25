(() => {
  const P = window.BattleGame.prototype;
  const rarity = {
    common: 'コモン', rare: 'レア', epic: 'エピック',
    legendary: 'レジェンド', mythic: 'ミシック'
  };
  const ranks = Object.keys(rarity);
  const modes = { list: 'アイコン', catalog: '名前付き' };
  const symbols = { list: '▦', catalog: '▤' };
  const sorts = { catalog: '掲載順', rarity: 'レアリティ順', name: '名前順' };
  const pageSize = 24;

  const artwork = [
    ['hourglass', 'agi', '時の砂時計', 'mythic', '夜空を閉じ込めたような紫の砂が落ちる、古い砂時計。'],
    ['signet', 'str', '緋色の印章指輪', 'mythic', '赤い石を抱く金の指輪。内側には持ち主の紋章が刻まれている。'],
    ['feather', 'agi', '紫苑の羽根', 'epic', '紫の光沢を帯び、軸の先まで細い金細工が施された羽根。'],
    ['tome', 'mag', '蒼印の古書', 'legendary', '開いたページに、青く輝く円形の印が描かれている。'],
    ['compass', 'dex', '時空の羅針盤', 'legendary', '星を模した針と、細かな方位の目盛りを備えた羅針盤。'],
    ['lantern', 'mnd', '月影のランタン', 'epic', '鉄の格子に守られた青紫の結晶が、揺らめく光を放つ。'],
    ['fox-mask', 'dex', '宵狐の面', 'epic', '白磁に朱の模様を描いた狐面。両脇には赤い房飾りが揺れる。'],
    ['frost-flower', 'mag', '氷晶花', 'rare', '透き通る四枚の花弁に、細かな霜の模様が浮かぶ。'],
    ['skull', 'str', '銀彫の髑髏', 'common', '磨き込まれた銀の髑髏。額には古い草花の意匠が残る。'],
    ['shard', 'maxMp', '蒼星の欠晶', 'rare', '角度を変えるたびに、青と紫の光が走る結晶片。'],
    ['wheat', 'maxHp', '黄金の穂束', 'legendary', '金色の麦穂を紫の紐で結んだ、小さな飾り束。'],
    ['chalice', 'maxMp', '紫晶の杯', 'epic', '紫の結晶を削り出し、繊細な金の台座に据えた杯。'],
    ['lock', 'vit', '誓約の錠', 'mythic', '青い宝石と金の装飾で飾られた、心臓の形をした錠前。'],
    ['orb', 'mag', '深蒼の宝珠', 'rare', '銀の台座に載った宝珠。深い青の奥に小さな光が瞬く。'],
    ['gear', 'dex', '奏律の歯車', 'legendary', '大小の歯車を重ねた機構。その中心に青い石がはめ込まれている。'],
    ['mirror', 'mnd', '月映しの鏡', 'epic', '金縁の手鏡。曇った鏡面に、淡く青い筋が浮かぶ。'],
    ['knight', 'vit', '白騎士の駒', 'common', '白い石を彫り出した馬の駒。たてがみに金の文様が走る。'],
    ['astrolabe', 'dex', '三日月の測天儀', 'rare', '銀の環の内側に、三日月と八芒星を配した測天儀。'],
    ['twin-rings', 'str', '双環の誓い', 'epic', '青い石をあしらった二つの金の指輪が、互いに絡み合う。'],
    ['phial', 'maxHp', '潮光の小瓶', 'common', '蓋を閉じたままでも、水色の光が透ける小瓶。'],
    ['globe', 'mnd', '群青の天球儀', 'rare', '群青の球を囲む金の環に、星座の軌跡が刻まれている。'],
    ['scales', 'vit', '星衡の天秤', 'legendary', '星をかたどった飾りの下で、二つの皿が釣り合う天秤。'],
    ['crown', 'mnd', '落陽の王冠', 'mythic', '夕日の色を思わせる赤い石が連なる金の王冠。'],
    ['key', 'agi', '紫苑の古鍵', 'epic', '紫の宝石が付いた古鍵。どの扉に合うのかは分かっていない。'],
    ['bell', 'mnd', '紫宵の鐘', 'epic', '紫水晶を鐘の形に削り、金の枠にはめ込んだ飾り。'],
    ['ember', 'mag', '檻の残り火', 'mythic', '細い金格子の奥で、小さな赤い炎が揺らめいている。'],
    ['quill', 'mag', '蒼鳴の筆', 'rare', '蒼い羽軸に金の細工を巻き付けた筆。'],
    ['raven', 'agi', '夜烏のカメオ', 'common', '黒い鳥の横顔を浮き彫りにした小さな留め具。'],
    ['lute', 'maxMp', '星紡ぎのリュート', 'legendary', '星の意匠をちりばめた金色の弦楽器。'],
    ['hairpin', 'dex', '真珠薔薇の簪', 'common', '真珠を一輪の薔薇に見立てた細身の簪。'],
    ['obsidian', 'vit', '黒曜の円盤', 'epic', '黒曜石の鏡面を、一筋の金の縁が囲っている。'],
    ['shell', 'maxHp', '潮騒の巻貝', 'rare', '青い光が螺旋の殻を照らす巻貝。'],
    ['claw', 'str', '金竜の爪飾り', 'legendary', '鉤爪をかたどった金細工。青い石が台座にはまっている。'],
    ['telescope', 'dex', '遠星の望遠鏡', 'common', '真鍮を磨き込んだ、小さな折りたたみ望遠鏡。'],
    ['crest', 'agi', '雷紋の徽章', 'rare', '丸い七宝の中心に稲妻を象った徽章。'],
    ['diadem', 'mag', '霜月の冠', 'epic', '霜をまとった三日月型の冠。']
  ].map(([id, stat, name, rank, description], index) => ({ id, stat, name, rank, description, index }));

  const tiers = {
    normal: ['phial', 'shard', 'skull', 'knight', 'frost-flower', 'lantern', 'feather', 'hairpin', 'key'],
    upper: ['wheat', 'chalice', 'claw', 'lock', 'tome', 'mirror', 'hourglass', 'compass', 'crown']
  };
  const stats = ['maxHp', 'maxMp', 'str', 'vit', 'mag', 'mnd', 'agi', 'dex', 'luk'];
  const labels = ['最大HP', '最大MP', '力', '体力', '魔力', '精神', '素早さ', '器用さ', '運'];
  const relics = Object.entries(tiers).flatMap(([grade, ids]) => ids.map((id, n) => {
    const art = artwork.find(item => item.id === id);
    return { ...art, grade, stat: stats[n], label: labels[n] };
  }));
  const supportRelics = [
    ['shell', '勝利後の最大HP割合回復'],
    ['lute', '勝利後の最大MP割合回復'],
    ['obsidian', '敵の最大HP・攻撃・防御'],
    ['gear', '獲得奏貨'],
    ['astrolabe', 'インフィニティ装備の抽選率']
  ];
  for (const [id, label] of supportRelics) {
    relics.push({ ...artwork.find(item => item.id === id), grade: 'support', label });
  }
  const availableRanks = ranks.filter(rank => relics.some(item => item.rank === rank));

  // Percentage curves from pie3636's Tower of Hero simulator (getPara).
  // Mithril Sword/Armour's magnitude is used for the normal tier; Claymore for the upper tier.
  const earlyClaymore = [0,30,65,100,140,185,230,280,330,385,460,535,610,690,770,850,935,1030,1130];
  function percent(item, level) {
    if (item.grade === 'support') return Math.min(level, 50);
    if (item.grade === 'normal') return 2 * Math.min(level, 20) + Math.max(0, Math.min(level, 50) - 20);
    if (level < earlyClaymore.length) return earlyClaymore[level];
    let value = 20 * level + 2.5 * level * (level - 1);
    for (const [threshold, factor] of [[25000,.88],[50000,.82],[100000,.76],[500000,.70],[1e6,.60],[1e7,.60],[1e8,.60]]) {
      if (value > threshold) value = threshold + (value - threshold) * factor;
    }
    return Math.floor(value / 5) * 5;
  }
  function levelOf(levels, id) {
    const value = levels?.[id];
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  }

  P.isMigrateRelicLevels = function (profile) {
    if (profile.infiniteRelicLevels) return;
    const levels = {};
    for (const list of [profile.infiniteRelicIds, profile.infiniteScore?.relicIds]) {
      for (const id of new Set(Array.isArray(list) ? list : [])) {
        const old = artwork.find(item => item.id === id);
        if (!old) continue;
        const retained = relics.find(item => item.id === id);
        const target = retained?.id ?? tiers.normal[stats.indexOf(old.stat)];
        levels[target] = (levels[target] || 0) + 1;
      }
    }
    profile.infiniteRelicLevels = levels;
  };

  P.isRollStairRelic = function (count) {
    if (count <= 0 || count % 5 || (count % 20 && this.isRand() >= .30)) return null;
    const levels = this.profile.infiniteRelicLevels ||= {};
    const pool = relics.filter(item => item.grade === 'upper' ? count >= 40 : levelOf(levels,item.id) < 50);
    if (!pool.length) {
      this.profile.deferredRelicDraws = (this.profile.deferredRelicDraws || 0) + 1;
      return 'この深さの遺物はすべて最大Lvです。抽選を保存しました。40回降下で受け取れます。';
    }
    const draw = () => {
      const item = pool[Math.floor(this.isRand() * pool.length)];
      const level = levelOf(levels,item.id) + 1;
      levels[item.id] = level;
      return `${item.name} Lv.${level}（${item.label} ${item.id === 'obsidian' ? '−' : '＋'}${percent(item,level)}%）`;
    };
    const rewards = [draw()];
    if (count >= 40 && this.profile.deferredRelicDraws > 0) {
      for (let i = 0; i < this.profile.deferredRelicDraws; i++) rewards.push(draw());
      this.profile.deferredRelicDraws = 0;
    }
    return rewards.join(" ／ ");
  };

  P.isSupportRelicRate = function (id) {
    return Math.min(50, levelOf(this.profile.infiniteRelicLevels, id));
  };

  P.isWeakenRelicEnemy = function (stats) {
    const rate = this.isSupportRelicRate('obsidian');
    if (!rate) return;
    for (const key of ['maxHp', 'atk', 'def']) {
      if (stats[key] > 0) stats[key] = Math.max(1, Math.round(stats[key] * (100 - rate) / 100));
    }
  };

  P.isRecoverRelicVitals = function (run, player) {
    const gains = [];
    for (const [id, key, maxKey] of [['shell', 'hp', 'maxHp'], ['lute', 'mp', 'maxMp']]) {
      const rate = this.isSupportRelicRate(id);
      if (!rate) continue;
      const max = player.stats[maxKey];
      const gain = Math.min(max - player[key], Math.ceil(max * rate / 100));
      if (gain <= 0) continue;
      run[key] = player[key] += gain;
      gains.push(key.toUpperCase() + ' +' + gain);
    }
    return gains.join(' ／ ');
  };

  P.isEarnRelicCoins = function (run, base) {
    const rate = this.isSupportRelicRate('gear');
    if (!rate) return base;
    const bonus = base * rate + (run.relicCoinRemainder || 0);
    run.relicCoinRemainder = bonus % 100;
    return base + Math.floor(bonus / 100);
  };

  P.isApplyRelicStats = function (total) {
    const rates = {};
    for (const item of relics) {
      if (item.grade === 'support') continue;
      const level = levelOf(this.profile.infiniteRelicLevels, item.id);
      if (level) rates[item.stat] = (rates[item.stat] || 0) + percent(item,level);
    }
    for (const [stat, rate] of Object.entries(rates)) total[stat] = Math.round(total[stat] * (1 + rate / 100));
  };


  const pressed = value => ` aria-pressed="${value}"`;
  const badge = rank => `<span class="ir-badge" data-rank="${rank}">${rarity[rank]}</span>`;
  function art({ index }) {
    const tile = index % 12;
    return `<span class="ir-art" data-atlas="${1 + Math.floor(index / 12)}" style="--tile-x:${tile % 4 * 100 / 3}%;--tile-y:${Math.floor(tile / 4) * 50}%" aria-hidden="true"></span>`;
  }
  function gems(rank) {
    return `<span class="ir-gems" data-rank="${rank}" aria-hidden="true">${'◆'.repeat(ranks.indexOf(rank) + 1)}</span>`;
  }
  function detail(item, level) {
    const sign = item.id === 'obsidian' ? '−' : '＋';
    const tier = item.grade === 'upper' ? '上位版・40回降下から' : item.grade === 'support' ? '補助遺物' : '通常版';
    const next = item.grade !== 'upper' && level >= 50 ? '最大Lv' : '次のLvで ' + sign + percent(item, level + 1) + '%';
    const effect = level ? 'Lv.' + level + ' ／ ' + item.label + ' ' + sign + percent(item, level) + '%' : '未入手 ／ ' + item.label;
    return `<header><h3>${item.name}</h3>${badge(item.rank)}</header>
      <div class="ir-portrait" data-rank="${item.rank}">${art(item)}</div>
      <div class="ir-detail-rank">${gems(item.rank)}</div>
      <p class="ir-description">${item.description}</p><p class="ir-effect"><b>${effect}</b><br>${next}<br>${tier}</p>`;
  }

  P.isRenderRelics = function (panel) {
    const state = this.isRelicUi ??= { mode: 'list', rank: 'all', sort: 'catalog', page: 0, selected: relics[0].id };
    const levels = this.profile.infiniteRelicLevels || {};
    const owned = new Set(relics.filter(item => levelOf(levels, item.id)).map(item => item.id));
    const status = id => owned.has(id) ? 'Lv.' + levelOf(levels, id) : '未入手';
    const entries = relics.filter(item => state.rank === 'all' || item.rank === state.rank);
    const sort = state.sort;
    if (sort === 'rarity') entries.sort((a, b) => ranks.indexOf(b.rank) - ranks.indexOf(a.rank));
    if (sort === 'name') entries.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    const pages = Math.ceil(entries.length / pageSize);
    state.page = Math.min(state.page, pages - 1);
    const visible = entries.slice(state.page * pageSize, (state.page + 1) * pageSize);
    const current = visible.find(item => item.id === state.selected) || visible[0];
    state.selected = current.id;
    panel.dataset.panel = 'infinite-score-relics';
    panel.innerHTML = `<main class="ir-screen" aria-labelledby="ir-title">
      <header class="ir-hero">
        <button type="button" class="ir-close" data-ir-action="close" aria-label="遺物リストを閉じる">×</button>
        <h2 id="ir-title">遺物リスト</h2>
        <p lang="en">RELIC LIST</p>
      </header>
      <div class="ir-body">
        <nav class="ir-tabs" aria-label="遺物の表示方法">${Object.entries(modes).map(([mode, label]) =>
          `<button type="button" data-ir-mode="${mode}"${pressed(state.mode === mode)}><span aria-hidden="true">${symbols[mode]}</span>${label}</button>`).join('')}</nav>
        <div class="ir-filters" role="group" aria-label="レアリティで絞り込む">${['all', ...availableRanks].map(rank =>
          `<button type="button" data-ir-filter="${rank}" data-rank="${rank}"${pressed(state.rank === rank)}>${rarity[rank] || 'すべて'}</button>`).join('')}</div>
        <div class="ir-bar">
          <span>所持 <b>${owned.size}</b> <small>/ ${relics.length}</small></span>
          <select data-ir-sort aria-label="遺物の並べ順">${Object.entries(sorts).map(([key, label]) =>
            `<option value="${key}" ${sort === key ? 'selected' : ''}>${label}</option>`).join('')}</select>
        </div>
        <div class="ir-columns">
          <section class="ir-collection" aria-label="遺物一覧">
            <div class="ir-grid ${state.mode === 'catalog' ? 'ir-catalog' : ''}">${visible.map(item =>
              `<button type="button" data-ir-item="${item.id}" data-held="${owned.has(item.id) ? 'owned' : ''}" data-rank="${item.rank}" aria-label="${item.name}、${rarity[item.rank]}、${status(item.id)}"${pressed(item === current)}>
                ${art(item)}${state.mode === 'catalog' ? `<small>${item.name}</small>` : gems(item.rank)}</button>`).join('')}</div>
            ${pages > 1 ? `<nav class="ir-pages" aria-label="遺物リストのページ">
              <button type="button" data-ir-page="-1" aria-label="前のページ" ${state.page === 0 ? 'disabled' : ''}>‹</button>
              <span>${state.page + 1} / ${pages}</span>
              <button type="button" data-ir-page="1" aria-label="次のページ" ${state.page + 1 >= pages ? 'disabled' : ''}>›</button>
            </nav>` : ''}
          </section>
          <article class="ir-detail" aria-label="遺物の詳細" aria-live="polite">${detail(current, levelOf(levels, current.id))}</article>
        </div>
      </div>
    </main>`;
    const root = panel.firstElementChild;
    const refresh = selector => {
      this.isRenderRelics(panel);
      (panel.querySelector(selector) || panel.querySelector('[aria-pressed="true"]'))?.focus({ preventScroll: true });
    };
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      const { irAction, irMode, irFilter, irItem, irPage } = button.dataset;
      if (irAction === 'close') {
        this.renderMenuPanel(this.isRelicFromHome ? 'otherworld' : 'infinite-score');
        panel.querySelector(this.isRelicFromHome ? '[data-is-relic-open]' : '[data-is-action="explore-menu"]')?.focus({ preventScroll: true });
      } else if (irItem) {
        if (irItem === state.selected) return;
        const item = relics.find(relic => relic.id === irItem);
        state.selected = irItem;
        root.querySelector('[data-ir-item][aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-pressed', 'true');
        const currentDetail = root.querySelector('.ir-detail');
        currentDetail.innerHTML = detail(item, levelOf(levels, item.id));
      } else if (irPage) {
        state.page += Number(irPage);
        refresh('[data-ir-page]:not(:disabled)');
      } else if (irMode || irFilter) {
        if (irMode) state.mode = irMode;
        if (irFilter) state.rank = irFilter;
        state.page = 0;
        refresh(irMode ? `[data-ir-mode="${irMode}"]` : `[data-ir-filter="${irFilter}"]`);
      }
    });
    root.addEventListener('change', event => {
      if (!event.target.matches('[data-ir-sort]')) return;
      state.sort = event.target.value;
      state.page = 0;
      refresh('[data-ir-sort]');
    });
  };

  document.addEventListener('click', event => {
    const open = event.target.closest('[data-is-relic-open]');
    const game = window.arseneGame;
    if (!open || !game) return;
    const fromHome = !!open.closest('[data-infinite-entry]');
    if (fromHome ? !game.isDebugAllowed() : !open.closest('#menu-panel[data-panel="infinite-score"]') || !game.isRun()) return;
    game.isRelicFromHome = fromHome;
    game.isExploreMenuOpen = false;
    game.renderMenuPanel('infinite-score-relics');
    document.querySelector('[data-ir-action="close"]')?.focus({ preventScroll: true });
  });
})();
