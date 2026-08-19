(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  class StartFlow {
    constructor(game) {
      this.game = game;
      this.root = $('#start-flow');
      this.metaKey = 'arsene-rpg-start-flow-v01';
      this.openingMusic = encodeURI('音楽系/OP/零時侵蝕.mp3');
      this.prologue = [];
      this.characters = [];
      this.prologueIndex = 0;
      this.openingTimer = null;
      this.returnAfterOpening = 'title';
      this.settingsReturn = 'title';
      this.confirmYes = null;
      this.transferMode = null;
      this.transferExportCode = '';
    }

    async init() {
      try {
        [this.prologue, this.characters] = await Promise.all([
          fetch('data/prologue.json').then(response => response.json()),
          fetch('data/characters.json').then(response => response.json())
        ]);
      } catch (error) {
        console.error('Start flow data could not be loaded.', error);
        this.prologue = [{ id: 'fallback', time: '00:00', text: 'その名は――\n\n或世盗。\n\nARSÈNE.', effect: 'arsene' }];
        this.characters = [{ id: 'ren', name: '雨宮 蓮', nameEn: 'AMAMIYA REN', available: true, initialJobName: '魔導士', style: 'MAGIC / TECHNICAL', description: '青い魔力を操る魔導士。', image: 'assets/playable-characters/amamiya-ren/body-no-weapon.png' }];
      }
      this.render();
      this.bind();
      const watched = this.openingWatched() || new URLSearchParams(location.search).has('skipop');
      if (watched) this.showTitle(); else this.showOpening('title');
    }

    render() {
      this.root.innerHTML = `
        <section class="flow-screen opening-screen" data-flow-screen="opening">
          <div class="flow-frame">
            <button class="op-skip" data-op-skip>OP SKIP</button>
            <div class="opening-movie" aria-hidden="true">
              <figure data-op-frame="0" style="--op-bg:url('assets/op/op-private-01-roga-ramen.webp')"><img src="assets/op/op-private-01-roga-ramen.webp" alt=""><figcaption><small>ROGA // AFTER HOURS</small><b>湯気の向こうで、夜を支える。</b></figcaption></figure>
              <figure data-op-frame="1" style="--op-bg:url('assets/op/op-private-02-ren-music-shop.webp')"><img src="assets/op/op-private-02-ren-music-shop.webp" alt=""><figcaption><small>REN // MUSIC SHOP</small><b>音の中で、まだ知らない声を待つ。</b></figcaption></figure>
              <figure data-op-frame="2" style="--op-bg:url('assets/op/op-private-03-sho-bookstore.webp')"><img src="assets/op/op-private-03-sho-bookstore.webp" alt=""><figcaption><small>SHO // BOOKSTORE</small><b>物語の隙間に、真実を探す。</b></figcaption></figure>
              <figure data-op-frame="3" style="--op-bg:url('assets/op/op-private-04-kurosaki-childcare.webp')"><img src="assets/op/op-private-04-kurosaki-childcare.webp" alt=""><figcaption><small>KUROSAKI // DAYCARE</small><b>小さな未来を、静かに守る。</b></figcaption></figure>
              <figure data-op-frame="4" style="--op-bg:url('assets/op/op-private-05-luna-student.webp')"><img src="assets/op/op-private-05-luna-student.webp" alt=""><figcaption><small>LUNA // AFTER SCHOOL</small><b>誰にも言えない夜を抱えて。</b></figcaption></figure>
              <figure data-op-frame="5" style="--op-bg:url('assets/op/op-01-luna-prison.webp')"><img src="assets/op/op-01-luna-prison.webp" alt=""><figcaption><small>THE STOLEN VOICE</small><b>その声は、境界の向こうから。</b></figcaption></figure>
              <figure data-op-frame="6" style="--op-bg:url('assets/op/op-02-ren-signal.webp')"><img src="assets/op/op-02-ren-signal.webp" alt=""><figcaption><small>SIGNAL AT 00:00</small><b>午前零時。蓮は彼女の声を聴く。</b></figcaption></figure>
              <figure data-op-frame="7" style="--op-bg:url('assets/op/op-03-phantoms-assemble.webp')"><img src="assets/op/op-03-phantoms-assemble.webp" alt=""><figcaption><small>STEAL IT BACK</small><b>奪われた未来を、盗り返す。</b></figcaption></figure>
              <figure data-op-frame="8" style="--op-bg:url('assets/op/op-04-boundary-rescue.webp')"><img src="assets/op/op-04-boundary-rescue.webp" alt=""><figcaption><small>BREAK THE BOUNDARY</small><b>夜を駆け、ルナのもとへ。</b></figcaption></figure>
              <figure data-op-frame="9" style="--op-bg:url('assets/op/op-05-dawn-reunion.webp')"><img src="assets/op/op-05-dawn-reunion.webp" alt=""><figcaption><small>OUR PARADISE</small><b>その夜明けを、もう一度。</b></figcaption></figure>
              <div class="opening-title-card"><div class="flow-emblem"></div><small>OPENING // 零時侵蝕</small><strong>或世盗&nbsp;<span class="nowrap">-ARSÈNE-</span></strong><span>PHANTOM THIEF RPG</span></div>
              <div class="opening-flash"></div><div class="opening-grain"></div><div class="opening-progress"><i></i></div>
            </div>
            <div class="opening-content">
              <div class="opening-ready"><div class="flow-emblem" aria-hidden="true"></div><small>OPENING // 零時侵蝕</small><button class="flow-button" data-op-start>TOUCH TO BEGIN</button></div>
              <div class="opening-live"><div class="flow-emblem" aria-hidden="true"></div><small>OPENING</small><strong>零時侵蝕</strong><span>MIDNIGHT EROSION</span></div>
            </div>
          </div>
        </section>
        <section class="flow-screen title-screen" data-flow-screen="title">
          <div class="flow-frame"><div class="title-content"><div class="flow-emblem" aria-hidden="true"></div><small>THE PHANTOM HOUR BEGINS</small><h1>或世盗&nbsp;<span class="nowrap">-ARSÈNE-</span></h1><p>PHANTOM THIEF RPG</p><nav class="title-menu"><button data-title-new>NEW GAME<span>新たな物語を始める</span></button><button data-title-continue>CONTINUE<span>セーブデータから再開</span></button><button data-title-settings>SETTINGS<span>音量・データ設定</span></button></nav></div><div class="flow-version">VER.0.3</div></div>
        </section>
        <section class="flow-screen prologue-screen" data-flow-screen="prologue"><div class="prologue-stage"></div><button class="prologue-skip" data-prologue-skip>SKIP</button><div class="prologue-copy"><b class="prologue-time"></b><div class="prologue-text"></div></div><span class="prologue-next">CLICK / TAP / ENTER</span><div class="prologue-progress"><i></i></div></section>
        <section class="flow-screen select-screen" data-flow-screen="select"><div class="select-wrap"><header class="select-heading"><small>CHARACTER SELECT</small><h1>今宵の主役を選べ</h1></header><div class="character-grid"></div></div></section>
        <section class="flow-screen settings-screen" data-flow-screen="settings"><div class="flow-settings"></div></section>
        <section class="flow-screen game-start-screen" data-flow-screen="game-start"><div class="flow-frame"><div class="start-card"><small>PHANTOM // 01</small><strong>AMAMIYA REN</strong><div class="flow-emblem" aria-hidden="true"></div><span>麺処 おくのほそ道</span></div></div></section>
        <div class="flow-confirm"><div class="confirm-card"><small>CONFIRM</small><h2></h2><div class="confirm-actions"><button data-confirm-no>NO</button><button data-confirm-yes>YES</button></div></div></div>
        <div class="flow-toast" role="status"></div>`;
    }

    bind() {
      this.root.addEventListener('click', async event => {
        if (event.target.closest('[data-op-start]')) { await this.startOpening(); return; }
        if (event.target.closest('[data-op-skip]')) { await this.finishOpening(); return; }
        if (event.target.closest('[data-title-new]')) { await this.beginNewGame(); return; }
        if (event.target.closest('[data-title-continue]')) { await this.continueGame(); return; }
        if (event.target.closest('[data-title-settings]')) { this.showSettings('title'); return; }
        if (event.target.closest('[data-prologue-skip]')) { event.stopPropagation(); this.showCharacterSelect(); return; }
        const select = event.target.closest('[data-select-character]');
        if (select) { this.askCharacter(select.dataset.selectCharacter); return; }
        if (event.target.closest('[data-settings-back]')) { this.leaveSettings(); return; }
        if (event.target.closest('[data-watch-opening]')) { this.watchOpening(this.settingsReturn); return; }
        if (event.target.closest('[data-reset-data]')) { this.confirmReset(); return; }
        if (event.target.closest('[data-export-save]')) { this.transferMode = this.transferMode === 'export' ? null : 'export'; if (this.transferMode === 'export') { this.transferExportCode = this.game.encodeSaveTransferCode(); navigator.clipboard?.writeText(this.transferExportCode).then(() => this.toast('コードをコピーしました')).catch(() => {}); } this.showSettings(this.settingsReturn); return; }
        if (event.target.closest('[data-import-save]')) { this.transferMode = this.transferMode === 'import' ? null : 'import'; this.showSettings(this.settingsReturn); return; }
        if (event.target.closest('[data-import-save-confirm]')) { const input = $('[data-transfer-input]', this.root), payload = this.game.decodeSaveTransferCode(input?.value); if (!payload) { this.toast('コードを読み取れませんでした'); return; } this.openConfirm('現在のセーブデータを上書きして読み込みますか？', () => this.game.applySaveTransfer(payload), true); return; }
        if (event.target.closest('[data-confirm-no]')) { this.closeConfirm(); return; }
        if (event.target.closest('[data-confirm-yes]')) { const action = this.confirmYes; this.closeConfirm(); await action?.(); return; }
        const locked = event.target.closest('.character-card.locked');
        if (locked) { this.toast('このPHANTOMはまだ選択できません。'); return; }
        if (event.target.closest('.prologue-screen.active')) this.advancePrologue();
      });
      const updateVolume = event => {
        const slider = event.target.closest('[data-flow-volume]');
        if (!slider) return;
        this.game.audio.setVolume(slider.dataset.flowVolume, slider.value);
        const output = $(`[data-flow-volume-value="${slider.dataset.flowVolume}"]`, this.root);
        if (output) output.textContent = `${slider.value}%`;
      };
      this.root.addEventListener('input', updateVolume);
      this.root.addEventListener('change', updateVolume);
      addEventListener('keydown', event => {
        if (this.root.hidden || !['Enter', ' ', 'Spacebar'].includes(event.key)) return;
        if ($('[data-flow-screen="prologue"]', this.root)?.classList.contains('active')) { event.preventDefault(); this.advancePrologue(); }
      });
    }

    setScreen(name) {
      this.root.hidden = false;
      this.root.querySelectorAll('[data-flow-screen]').forEach(screen => screen.classList.toggle('active', screen.dataset.flowScreen === name));
    }

    saveExists() { return !!localStorage.getItem(window.ARSENE_DATA.settings.saveKey); }
    readMeta() { try { return JSON.parse(localStorage.getItem(this.metaKey) || '{}'); } catch { return {}; } }
    writeMeta(values) { localStorage.setItem(this.metaKey, JSON.stringify({ ...this.readMeta(), ...values })); }
    openingWatched() { const profile = this.game.profile; return !!(profile?.openingWatched || profile?.flags?.openingWatched || this.readMeta().openingWatched); }
    markOpeningWatched() {
      this.writeMeta({ openingWatched: true });
      if (this.saveExists()) { this.game.profile.openingWatched = true; this.game.profile.flags.openingWatched = true; this.game.saveProfile(); }
    }

    showOpening(returnTo = 'title') {
      clearTimeout(this.openingTimer); clearInterval(this.openingSyncTimer);
      this.returnAfterOpening = returnTo;
      this.setScreen('opening');
      $('.opening-ready', this.root).style.display = 'grid';
      $('.opening-live', this.root).classList.remove('active');
      $('.opening-movie', this.root).classList.remove('active', 'glitch');
      this.root.querySelectorAll('[data-op-frame]').forEach(item => item.classList.remove('active'));
    }

    async startOpening() {
      $('.opening-ready', this.root).style.display = 'none';
      $('.opening-live', this.root).classList.remove('active');
      $('.opening-movie', this.root).classList.add('active');
      await this.game.audio.unlock();
      await this.game.audio.playTimedLoop(this.openingMusic, 100, 5);
      this.lastOpeningFrame = null; this.updateOpeningMovie();
      clearInterval(this.openingSyncTimer); this.openingSyncTimer = setInterval(() => this.updateOpeningMovie(), 120);
      clearTimeout(this.openingTimer); this.openingTimer = setTimeout(() => this.finishOpening(), 100000);
    }

    async finishOpening() {
      clearTimeout(this.openingTimer); clearInterval(this.openingSyncTimer);
      $('.opening-movie', this.root)?.classList.remove('active');
      this.markOpeningWatched();
      if (this.returnAfterOpening === 'game') { this.root.hidden = true; await this.game.showMenu('system'); return; }
      this.showTitle();
    }

    updateOpeningMovie() {
      const time = this.game.audio.music.currentTime || 0;
      const frame = time < 3 ? -1
        : time < 11 ? 0
        : time < 19 ? 1
        : time < 27 ? 2
        : time < 35 ? 3
        : time < 44 ? 4
        : time < 55 ? 5
        : time < 66 ? 6
        : time < 76 ? 7
        : time < 88 ? 8
        : time < 96 ? 9
        : -2;
      this.root.querySelectorAll('[data-op-frame]').forEach(item => item.classList.toggle('active', Number(item.dataset.opFrame) === frame));
      const card = $('.opening-title-card', this.root); card.classList.toggle('active', frame < 0); card.classList.toggle('ending', frame === -2);
      $('.opening-progress i', this.root).style.width = `${Math.min(100, time)}%`;
      if (frame !== this.lastOpeningFrame) { const movie = $('.opening-movie', this.root); movie.classList.remove('glitch'); void movie.offsetWidth; movie.classList.add('glitch'); this.lastOpeningFrame = frame; }
    }

    showTitle() {
      this.setScreen('title');
      const continueButton = $('[data-title-continue]', this.root);
      continueButton.disabled = !this.saveExists();
    }

    async beginNewGame() {
      await this.game.audio.unlock();
      await this.game.audio.playTimedLoop(this.openingMusic, 100, 5);
      const current = $('[data-flow-screen="title"]', this.root);
      current.classList.add('leaving');
      await sleep(520);
      current.classList.remove('leaving');
      this.prologueIndex = 0;
      this.setScreen('prologue');
      this.renderPrologue();
    }

    renderPrologue() {
      const scene = this.prologue[this.prologueIndex];
      if (!scene) { this.showCharacterSelect(); return; }
      const stage = $('.prologue-stage', this.root);
      stage.className = `prologue-stage effect-${scene.effect || 'city'}`;
      if (scene.background) stage.style.backgroundImage = `url("${scene.background}")`; else stage.style.removeProperty('background-image');
      $('.prologue-time', this.root).textContent = scene.time || '';
      $('.prologue-text', this.root).textContent = scene.text;
      $('.prologue-progress i', this.root).style.width = `${((this.prologueIndex + 1) / this.prologue.length) * 100}%`;
      $('.prologue-copy', this.root).animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 550, fill: 'both' });
    }

    advancePrologue() { this.prologueIndex += 1; if (this.prologueIndex >= this.prologue.length) this.showCharacterSelect(); else this.renderPrologue(); }
    showCharacterSelect() {
      this.setScreen('select');
      $('.character-grid', this.root).innerHTML = this.characters.map(character => character.available ? `
        <article class="character-card available"><img src="${character.image}" alt="${character.name}"><div class="card-info"><h2>${character.name}</h2><h3>${character.nameEn}</h3><dl><dt>INITIAL JOB</dt><dd>${character.initialJobName}</dd><dt>STYLE</dt><dd>${character.style}</dd></dl><p>${character.description}</p><button data-select-character="${character.id}">SELECT</button></div></article>` : `
        <article class="character-card locked" aria-disabled="true"><div class="character-silhouette"></div><strong>LOCKED</strong><span>${character.nameEn}<br>COMING SOON</span></article>`).join('');
    }

    askCharacter(id) {
      const character = this.characters.find(entry => entry.id === id && entry.available);
      if (!character) { this.toast('このPHANTOMはまだ選択できません。'); return; }
      this.openConfirm(`${character.name}でゲームを開始しますか？`, () => this.startGame(character));
    }

    async startGame(character) {
      const profile = this.game.freshProfile();
      profile.selectedCharacter = character.id;
      profile.playerCharacter = character.id;
      profile.prologueCompleted = true;
      profile.openingWatched = true;
      profile.flags.prologueCompleted = true;
      profile.flags.openingWatched = true;
      this.game.profile = profile;
      this.game.saveProfile();
      this.writeMeta({ openingWatched: true });
      this.setScreen('game-start');
      this.game.audio.stopMusic(900);
      await sleep(2800);
      this.root.hidden = true;
      await this.game.showMenu('home');
    }

    async continueGame() {
      if (!this.saveExists()) return;
      await this.game.audio.unlock();
      this.game.profile = this.game.loadProfile();
      this.game.profile.openingWatched = true;
      this.game.profile.flags.openingWatched = true;
      this.game.saveProfile();
      this.root.hidden = true;
      await this.game.showMenu('home');
    }

    showSettings(returnTo = 'title') {
      this.settingsReturn = returnTo;
      this.setScreen('settings');
      const values = this.game.audio.getVolumes();
      const row = (id, label, note, badge = '') => `<label class="volume-row"><span><b>${label}</b><small>${note}</small></span><input type="range" min="0" max="100" value="${values[id]}" data-flow-volume="${id}"><output data-flow-volume-value="${id}">${values[id]}%</output>${badge ? `<em>${badge}</em>` : ''}</label>`;
      $('.flow-settings', this.root).innerHTML = `<small>AUDIO & DATA</small><h1>SETTINGS</h1>${row('bgm', 'BGM', '音楽')}${row('sfx', 'SE', '効果音')}${row('voice', 'VOICE', 'ボイス用予約設定', 'COMING SOON')}<div class="flow-settings-actions"><button data-watch-opening>WATCH OPENING<span>零時侵蝕を再生</span></button><button class="danger" data-reset-data>DATA RESET<span>セーブデータを消去</span></button></div><section class="sound-settings save-transfer"><header><b>セーブデータの引き継ぎ</b><span>別ブラウザ・別URLでも復元できます</span></header><p class="save-transfer-note">「コードを書き出す」の文字列をコピーし、別のブラウザのこの画面で「コードを読み込む」に貼り付けてください。</p><div class="flow-settings-actions"><button data-export-save>コードを書き出す<span>EXPORT CODE</span></button><button data-import-save>コードを読み込む<span>IMPORT CODE</span></button></div>${this.transferMode === 'export' ? `<div class="save-transfer-box"><textarea readonly rows="4" data-transfer-output onclick="this.select()">${this.transferExportCode || ''}</textarea><small>自動でコピーしました。コピーされない場合は上の文字列を選択してコピーしてください。</small></div>` : ''}${this.transferMode === 'import' ? `<div class="save-transfer-box"><textarea rows="4" placeholder="ここにコードを貼り付け" data-transfer-input></textarea><button data-import-save-confirm>この内容で読み込む</button></div>` : ''}</section><button class="settings-back" data-settings-back>BACK</button>`;
    }

    leaveSettings() { if (this.settingsReturn === 'game') { this.root.hidden = true; this.game.showMenu('system'); } else this.showTitle(); }
    watchOpening(returnTo = 'game') { this.showOpening(returnTo === 'title' ? 'title' : 'game'); }
    confirmReset() {
      if (this.root.hidden) this.showSettings('game');
      this.openConfirm('すべてのゲーム進行データを消去しますか？', () => {
        localStorage.removeItem(window.ARSENE_DATA.settings.saveKey);
        localStorage.removeItem(this.metaKey);
        this.game.profile = this.game.freshProfile();
        this.showTitle();
      }, true);
    }

    openConfirm(message, action, danger = false) {
      const modal = $('.flow-confirm', this.root);
      $('.confirm-card h2', modal).textContent = message;
      $('[data-confirm-yes]', modal).classList.toggle('danger', danger);
      this.confirmYes = action;
      modal.classList.add('active');
    }
    closeConfirm() { $('.flow-confirm', this.root).classList.remove('active'); this.confirmYes = null; }
    toast(message) { const toast = $('.flow-toast', this.root); toast.textContent = message; toast.classList.add('show'); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => toast.classList.remove('show'), 1700); }
  }

  addEventListener('DOMContentLoaded', () => {
    const boot = () => { if (!window.arseneGame) { requestAnimationFrame(boot); return; } window.arseneStartFlow = new StartFlow(window.arseneGame); window.arseneStartFlow.init(); };
    boot();
  });
})();
