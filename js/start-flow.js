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
      this.chosenCharacter = null;
      this.chosenWeaponType = null;
      this.chosenJob = null;
    }

    async init() {
      try {
        [this.prologue, this.characters] = await Promise.all([
          fetch('data/prologue.json').then(response => response.json()),
          fetch('data/characters.json?v=0.3.0').then(response => response.json())
        ]);
      } catch (error) {
        console.error('Start flow data could not be loaded.', error);
        this.prologue = [{ id: 'fallback', time: '00:00', text: 'その名は――\n\n或世盗。\n\nARSÈNE.', effect: 'arsene' }];
        this.characters = [{ id: 'ren', name: '雨宮 蓮', nameEn: 'AMAMIYA REN', available: true, type: 'MAGE', description: '魔力とMPに優れた魔法型。', trait: { name: '魔導の才', description: '杖の武器学成長に小ボーナス。' }, tendency: { str: 2, vit: 3, mag: 5, mnd: 4, agi: 3, luk: 3 }, image: 'assets/playable-characters/amamiya-ren/body-no-weapon.png', portraitMode: 'cutout' }];
      }
      const protagonistOrder = ['roga', 'ren', 'sho', 'shizuma'];
      this.characters.sort((a, b) => {
        const ai = protagonistOrder.indexOf(a.id), bi = protagonistOrder.indexOf(b.id);
        return (ai < 0 ? protagonistOrder.length : ai) - (bi < 0 ? protagonistOrder.length : bi);
      });
      this.game.setCharacterList(this.characters);
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
        <section class="flow-screen select-screen" data-flow-screen="select"><div class="select-wrap"><header class="select-heading"><small>CHARACTER SELECT</small><h1>今宵の主役を選べ</h1></header><div class="character-stage"></div><div class="character-switcher"></div></div></section>
        <section class="flow-screen weapon-screen" data-flow-screen="weapon"><div class="select-wrap"><header class="select-heading"><small>PREFERRED WEAPON</small><h1>得意武器を選べ</h1></header><div class="weapon-grid"></div><div class="choice-note"><b>得意武器について</b><ul><li>得意武器は「武器レベルの成長」と「技の習得」に少しだけボーナスがあります。</li><li>選択しなかった武器も、ゲームを進めることで使用・育成できます。</li><li>得意武器は装備制限ではありません。</li></ul></div><div class="choice-actions"><button class="choice-back" data-weapon-back>戻る<span>BACK</span></button><button class="choice-next" data-weapon-next disabled>この武器で始める<span>START</span></button></div></div></section>
        <section class="flow-screen job-screen" data-flow-screen="job"><div class="select-wrap"><header class="select-heading"><small>STARTING JOB</small><h1>初期ジョブを選べ</h1></header><div class="job-grid"></div><div class="choice-actions"><button class="choice-back" data-job-back>戻る<span>BACK</span></button></div></div><div class="job-detail-modal"><div class="job-detail-card"></div></div></section>
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
        const preview = event.target.closest('[data-preview-character]');
        if (preview) { this.showCharacterSelect(preview.dataset.previewCharacter); return; }
        const select = event.target.closest('[data-select-character]');
        if (select) { this.askCharacter(select.dataset.selectCharacter); return; }
        const weaponPick = event.target.closest('[data-select-weapon]');
        if (weaponPick) { this.chosenWeaponType = weaponPick.dataset.selectWeapon; this.showWeaponSelect(); return; }
        if (event.target.closest('[data-weapon-back]')) { this.showJobSelect(); return; }
        if (event.target.closest('[data-weapon-next]')) { if (!this.chosenWeaponType) { this.toast('得意武器を選んでください。'); return; } await this.startGame(this.chosenCharacter); return; }
        const jobPick = event.target.closest('[data-select-job]');
        if (jobPick) { this.openJobDetail(jobPick.dataset.selectJob); return; }
        if (event.target.closest('[data-job-detail-close]')) { this.closeJobDetail(); return; }
        const jobConfirm = event.target.closest('[data-confirm-job]');
        if (jobConfirm) { this.chosenJob = jobConfirm.dataset.confirmJob; this.closeJobDetail(); this.showWeaponSelect(); return; }
        if (event.target.closest('[data-job-back]')) { this.showCharacterSelect(); return; }
        if (event.target.classList?.contains('job-detail-modal')) { this.closeJobDetail(); return; }
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
      this.game.audio.unlock().then(() => this.game.audio.playTimedLoop(this.openingMusic, 100, 5)).catch(error => console.warn('Opening BGM could not start.', error));
      const current = $('[data-flow-screen="title"]', this.root);
      current.classList.add('leaving');
      await sleep(520);
      current.classList.remove('leaving');
      this.prologueIndex = 0;
      this.chosenCharacter = null; this.chosenWeaponType = null; this.chosenJob = null;
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

    selectableCharacters() { return this.characters.filter(c => c.available); }
    stars(n) { const v = Math.max(0, Math.min(5, Number(n) || 0)); return `<i class="stars"><b>${'★'.repeat(v)}</b><em>${'★'.repeat(5 - v)}</em></i>`; }

    showCharacterSelect(focusId) {
      this.setScreen('select');
      const list = this.selectableCharacters();
      if (!list.length) return;
      const current = list.find(c => c.id === (focusId || this.previewCharacterId)) || list[0];
      this.previewCharacterId = current.id;
      this.game.applyCharacterTheme(current.theme);

      const tendencyKeys = [['str', '力'], ['vit', '体力'], ['mag', '魔力'], ['mnd', '精神'], ['agi', '素早さ'], ['luk', '運']];
      const tendency = tendencyKeys.map(([k, label]) => `<div class="tend-row"><span>${label}</span>${this.stars(current.tendency?.[k])}</div>`).join('');
      const trait = current.trait;
      const nl = text => (text || '').split('\n').filter(Boolean).map(line => `<p>${line}</p>`).join('');

      $('.character-stage', this.root).innerHTML = `
        <article class="character-card available" data-character="${current.id}" data-portrait="${current.portraitMode || 'scene'}">
          <div class="cc-art"><img src="${current.image}" alt="${current.name}" style="object-position:${current.imageFocus || '50% 20%'}"></div>
          <div class="card-info">
            <h2>${current.name}</h2><h3>${current.nameEn}</h3>
            <div class="cc-type"><small>TYPE</small><b>${current.type || ''}</b>${current.typeLabel ? `<span>${current.typeLabel}</span>` : ''}</div>
            <div class="cc-desc">${nl(current.description)}</div>
            ${trait ? `<div class="cc-trait"><small>CHARACTER TRAIT</small><b>${trait.name}</b>${trait.nameEn ? `<span class="cc-trait-en">${trait.nameEn}</span>` : ''}<div class="cc-trait-desc">${nl(trait.description)}</div></div>` : ''}
            <div class="cc-tendency"><small>INITIAL TENDENCY</small><div class="tend-grid">${tendency}</div></div>
            <button class="cc-select" data-select-character="${current.id}">SELECT</button>
          </div>
        </article>`;

      $('.character-switcher', this.root).innerHTML = list.map(c => `
        <button type="button" class="mini-card ${c.id === current.id ? 'active' : ''}" data-preview-character="${c.id}" aria-pressed="${c.id === current.id}" style="--mini-primary:${c.theme?.primary || '#2f9dff'};--mini-glow:${c.theme?.glow || '#147dd8'}">
          <span class="mini-art"><img src="${c.image}" alt="" style="object-position:${c.imageFocus || '50% 20%'}"></span>
          <b>${c.name}</b><small>${c.type || ''}</small>
        </button>`).join('');
    }

    askCharacter(id) {
      const character = this.characters.find(entry => entry.id === id && entry.available);
      if (!character) { this.toast('このPHANTOMはまだ選択できません。'); return; }
      this.openConfirm(`${character.name}で進みますか？`, () => { this.chosenCharacter = character; this.game.applyCharacterTheme(character.theme); this.showJobSelect(); });
    }

    // ── 得意武器選択 ──────────────────────────────────────────
    showWeaponSelect() {
      this.setScreen('weapon');
      const types = this.game.weaponTypeList().filter(t => t.starterWeaponId);
      $('.weapon-grid', this.root).innerHTML = types.map(type => {
        const w = window.ARSENE_DATA.weapons[type.starterWeaponId];
        const bonus = Object.entries(w?.bonuses || {}).map(([k, v]) => `${this.statLabel(k)} ${v >= 0 ? '+' : ''}${v}`).join(' / ') || '補正なし';
        const selected = this.chosenWeaponType === type.id;
        return `<button type="button" class="weapon-card ${selected ? 'selected' : ''}" data-select-weapon="${type.id}" aria-pressed="${selected}"><span class="wc-icon" data-weapon-icon="${type.id}" aria-hidden="true"></span><strong>${type.name}</strong><small>${type.nameEn}</small><p>${type.description}</p><div class="wc-starter"><b>初期装備</b><span>${w?.name || '—'}</span><em>${bonus}</em></div></button>`;
      }).join('');
      $('[data-weapon-next]', this.root).disabled = !this.chosenWeaponType;
    }
    statLabel(key) { return ({ maxHp: 'HP', maxMp: 'MP', str: '力', vit: '体力', mag: '魔力', mnd: '精神', agi: '素早さ', dex: '器用さ', luk: '運', critBonus: '会心' })[key] || key.toUpperCase(); }

    // ── 初期ジョブ選択 ────────────────────────────────────────
    showJobSelect() {
      this.setScreen('job');
      const jobs = this.game.startingJobList();
      $('.job-grid', this.root).innerHTML = jobs.map(job => {
        const growth = (job.growthStats || []).map(k => this.statLabel(k)).join(' ・ ');
        return `<button type="button" class="job-card" data-select-job="${job.id}"><strong>${job.name}</strong><small>${job.nameEn}</small><span class="jc-growth">${growth}</span><p>${job.description}</p><em>詳細を見る</em></button>`;
      }).join('');
      this.closeJobDetail();
    }
    openJobDetail(jobId) {
      const job = window.ARSENE_DATA.jobs[jobId]; if (!job) return;
      const skill = window.ARSENE_DATA.skills[job.signatureSkillId];
      const growth = (job.growthStats || []).map(k => `<i>${this.statLabel(k)}</i>`).join('');
      const modal = $('.job-detail-modal', this.root);
      $('.job-detail-card', modal).innerHTML = `<button type="button" class="jd-close" data-job-detail-close aria-label="閉じる">×</button><small>STARTING JOB</small><h2>${job.name}</h2><span class="jd-en">${job.nameEn}</span>
        <div class="jd-block"><b>成長しやすい能力</b><div class="jd-growth">${growth || '<i>—</i>'}</div></div>
        <div class="jd-block"><b>特徴</b><p>${job.featureText || job.description || ''}</p></div>
        ${skill ? `<div class="jd-block jd-skill"><b>固有スキル</b><strong>${skill.name}</strong><span class="jd-skill-en">${skill.nameEn || ''}</span><p>${skill.description || ''}</p>${skill.effectText ? `<em>${skill.effectText}</em>` : ''}</div>` : ''}
        <button type="button" class="jd-start" data-confirm-job="${job.id}">このジョブで進む<span>NEXT</span></button>`;
      modal.classList.add('active');
    }
    closeJobDetail() { $('.job-detail-modal', this.root)?.classList.remove('active'); }

    async startGame(character) {
      const profile = this.game.freshProfile();
      profile.selectedCharacter = character.id;
      profile.playerCharacter = character.id;
      profile.prologueCompleted = true;
      profile.openingWatched = true;
      profile.flags.prologueCompleted = true;
      profile.flags.openingWatched = true;
      this.game.applyStartingChoice(profile, this.chosenWeaponType, this.chosenJob);
      this.game.profile = profile;
      this.game.applyCharacterTheme(character.theme);
      this.game.applyCharacterPresentation();
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
      this.game.applyThemeForCharacter(this.game.profile.selectedCharacter, this.characters);
      this.game.applyCharacterPresentation();
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
