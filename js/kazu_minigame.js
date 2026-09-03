(() => {
  'use strict';

  const DEFAULT_TRACK = { id: 'reijishinshoku', title: '零時侵蝕', subtitle: 'ZERO HOUR INVASION', audio: '音楽系/OP/零時侵蝕.mp3' };
  const PLAY_LENGTH = 100;
  const APPROACH = 1.72;
  const WINDOWS = { perfect: .05, great: .095, good: .165, miss: .205 };
  const COLORS = ['#3ba9ff', '#a46bff', '#f3f7ff', '#ff557c', '#ffd15a'];
  const KEY_LABELS = ['A', 'S', 'D', 'F', 'G'];

  class KazuRhythmGame {
    constructor() {
      this.game = null;
      this.root = null;
      this.canvas = null;
      this.ctx = null;
      this.chart = [];
      this.playing = false;
      this.preparing = false;
      this.songStarted = false;
      this.raf = 0;
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.counts = { perfect: 0, great: 0, good: 0, miss: 0 };
      this.tapCount = 0;
      this.tapTimer = 0;
      this.judgeTimer = 0;
      this.track = DEFAULT_TRACK;
      this.resizeHandler = () => this.resize();
      this.keyHandler = e => this.onKey(e);
      this.build();
      this.bindSecret();
    }

    build() {
      const root = document.createElement('section');
      root.className = 'kazu-rhythm';
      root.hidden = true;
      root.setAttribute('aria-label', '零時侵蝕 リズムゲーム');
      root.innerHTML = `
        <div class="kazu-rhythm-shell">
          <header class="kazu-rhythm-head">
            <div class="kazu-rhythm-title"><small>SECRET SCORE // KAZU</small><strong>零時侵蝕</strong></div>
            <div class="kazu-rhythm-combo"><strong>0</strong><small>COMBO</small></div>
            <div class="kazu-rhythm-score"><small>SCORE</small><strong>0000000</strong></div>
          </header>
          <button type="button" class="kazu-rhythm-close" aria-label="音ゲームを終了">×</button>
          <div class="kazu-rhythm-stage"><canvas class="kazu-rhythm-canvas"></canvas><div class="kazu-rhythm-judge"></div></div>
          <div class="kazu-rhythm-keys" aria-label="リズムボタン">${COLORS.map((color, lane) => `<button type="button" class="kazu-rhythm-key" style="--lane:${color}" data-lane="${lane}" aria-label="レーン${lane + 1}"><span>${KEY_LABELS[lane]}</span></button>`).join('')}</div>
          <div class="kazu-rhythm-cover"></div>
        </div>`;
      document.body.append(root);
      this.root = root;
      this.canvas = root.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.cover = root.querySelector('.kazu-rhythm-cover');
      this.judgeEl = root.querySelector('.kazu-rhythm-judge');
      this.comboEl = root.querySelector('.kazu-rhythm-combo');
      this.scoreEl = root.querySelector('.kazu-rhythm-score strong');
      const closeButton = root.querySelector('.kazu-rhythm-close');
      closeButton.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); this.close(); });
      closeButton.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); this.close(); });
      closeButton.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') this.close(); });
      root.addEventListener('contextmenu', e => e.preventDefault());
      root.addEventListener('dragstart', e => e.preventDefault());
      root.addEventListener('pointerdown', e => {
        const key = e.target.closest('[data-lane]');
        if (!key) return;
        e.preventDefault();
        this.hit(Number(key.dataset.lane));
        key.classList.add('hit');
        setTimeout(() => key.classList.remove('hit'), 75);
      });
    }

    bindSecret() {
      const hotspot = document.querySelector('.hideout-kazu-hotspot');
      if (!hotspot) return;
      const blockNative = e => e.preventDefault();
      hotspot.addEventListener('contextmenu', blockNative);
      hotspot.addEventListener('dragstart', blockNative);
      hotspot.addEventListener('click', e => {
        if (typeof e.button === 'number' && e.button !== 0) return;
        // 音ゲーや隠しメニューが開いている間のタップは数えない。
        // 音ゲーのGAME STARTボタンがちょうどカズの真上に来るので、
        // 突き抜けたクリックでタップ数が狂うのを防ぐ。
        if (!this.root?.hidden) return;
        if (window.phantomSecret && !(window.phantomSecret.popup?.hidden && window.phantomSecret.shop?.hidden && window.phantomSecret.arcade?.hidden)) return;
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(this.tapTimer);
        this.tapCount += 1;
        if (this.tapCount >= 3) {
          this.tapCount = 0;
          // 3回タップの飛び先はカズの隠しメニュー。音ゲーはそのメニューの
          // 「遊びに付き合え」から開く。メニューが無い時だけ直接開く。
          const secret = window.phantomSecret;
          if (secret?.open) secret.open();
          else this.open();
          return;
        }
        this.tapTimer = setTimeout(() => { this.tapCount = 0; }, 1800);
      });
    }

    open(track = DEFAULT_TRACK) {
      this.game = window.arseneGame;
      if (!this.game || !this.root.hidden) return;
      this.track = { ...DEFAULT_TRACK, ...(track || {}) };
      this.root.setAttribute('aria-label', `${this.track.title} リズムゲーム`);
      this.root.querySelector('.kazu-rhythm-title strong').textContent = this.track.title;
      this.root.hidden = false;
      document.body.style.overflow = 'hidden';
      this.showIntro();
      addEventListener('resize', this.resizeHandler);
      addEventListener('keydown', this.keyHandler);
      this.resize();
      this.game.audio?.sfx('rareDrop');
    }

    showIntro() {
      const flags = this.game?.profile?.flags || {};
      const best = Number(flags.kazuRhythmHighScores?.[this.track.id] || (this.track.id === 'reijishinshoku' ? flags.kazuRhythmHighScore : 0) || 0);
      this.cover.hidden = false;
      this.setCover(`<div class="kazu-rhythm-card"><small>SECRET MUSIC GAME // RANDOM</small><h2>${this.track.title}<em>${this.track.subtitle || ''}</em></h2><p>表拍・裏拍・2個同時押しを盗め。<br>レーン配置はプレイごとに変化します。${best ? `<br><b>HIGH SCORE ${String(best).padStart(7, '0')}</b>` : ''}</p><button type="button" data-rhythm-action="start">GAME START</button><button type="button" class="secondary" data-rhythm-action="exit">拠点へ戻る</button></div>`);
    }

    setCover(html) {
      this.cover.innerHTML = html;
      this.cover.querySelectorAll('[data-rhythm-action]').forEach(button => {
        const activate = event => {
          event.preventDefault();
          event.stopPropagation();
          if (button.dataset.rhythmAction === 'start') this.prepare();
          else this.close();
        };
        button.addEventListener('pointerdown', activate);
        button.addEventListener('click', activate);
        button.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') activate(event); });
      });
    }

    async prepare() {
      if (this.playing || this.preparing) return;
      this.preparing = true;
      this.cover.hidden = false;
      this.setCover('<div class="kazu-rhythm-card"><small>ANALYZING SCORE</small><h2>譜面生成中</h2><i class="kazu-rhythm-loading"></i><p>OP曲のリズムを読み込んでいます……</p></div>');
      try {
        await this.game.audio.unlock();
        this.chart = await this.analyzeSong();
      } catch (error) {
        console.warn('[Kazu Rhythm] analysis fallback', error);
        this.chart = this.fallbackChart();
      }
      this.root.dataset.noteCount = String(this.chart.length);
      this.root.dataset.offbeatCount = String(this.chart.filter(note => note.offbeat).length);
      this.root.dataset.chordCount = String(this.chart.filter(note => note.chord).length / 2);
      this.root.dataset.randomSignature = this.chart.slice(0, 48).map(note => `${note.lane}${note.chord ? 'c' : ''}`).join('-');
      if (this.root.hidden) { this.preparing = false; return; }
      this.resetPlayState();
      try {
        await this.game.audio.playTrack(encodeURI(this.track.audio));
        this.game.audio.music.loop = false;
        this.game.audio.music.ontimeupdate = null;
        this.game.audio.music.addEventListener('ended', this.songEnded = () => this.finish(), { once: true });
        this.songStarted = true;
      } catch (error) {
        console.error('[Kazu Rhythm] playback failed', error);
        this.setCover('<div class="kazu-rhythm-card"><small>AUDIO ERROR</small><h2>再生できません</h2><p>画面を一度タップしてから、もう一度お試しください。</p><button type="button" data-rhythm-action="start">RETRY</button><button type="button" class="secondary" data-rhythm-action="exit">拠点へ戻る</button></div>');
        this.preparing = false;
        return;
      }
      this.setCover('<div class="kazu-rhythm-card"><small>PHANTOM BEAT READY</small><h2>3</h2><p>5つの光を盗め。</p></div>');
      const startAt = performance.now();
      const countdown = () => {
        if (this.root.hidden || this.playing) return;
        const remain = 3 - Math.floor((performance.now() - startAt) / 600);
        const h2 = this.cover.querySelector('h2');
        if (remain > 0) { if (h2) h2.textContent = remain; requestAnimationFrame(countdown); }
        else { this.cover.hidden = true; this.game.audio.music.currentTime = 0; this.game.audio.music.play().catch(() => {}); this.preparing = false; this.playing = true; this.raf = requestAnimationFrame(t => this.frame(t)); }
      };
      this.game.audio.music.pause();
      countdown();
    }

    resetPlayState() {
      cancelAnimationFrame(this.raf);
      this.playing = false;
      this.preparing = false;
      this.songStarted = false;
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.counts = { perfect: 0, great: 0, good: 0, miss: 0 };
      this.chart.forEach(note => { note.judged = false; note.result = ''; });
      this.updateHud();
      this.resize();
    }

    async analyzeSong() {
      const response = await fetch(encodeURI(this.track.audio));
      if (!response.ok) throw new Error(`audio ${response.status}`);
      const raw = await response.arrayBuffer();
      const context = this.game.audio.ctx;
      if (!context) throw new Error('AudioContext unavailable');
      const buffer = await context.decodeAudioData(raw.slice(0));
      const data = buffer.getChannelData(0);
      const rate = buffer.sampleRate;
      const hop = 2048;
      const endSample = Math.min(data.length, Math.floor(PLAY_LENGTH * rate));
      const energy = [];
      for (let start = 0; start < endSample; start += hop) {
        let sum = 0;
        const end = Math.min(start + hop, endSample);
        for (let i = start; i < end; i += 2) sum += data[i] * data[i];
        energy.push(Math.sqrt(sum / Math.max(1, (end - start) / 2)));
      }
      const flux = energy.map((value, i) => i ? Math.max(0, value - energy[i - 1]) : 0);
      const candidates = [];
      let last = -1;
      for (let i = 8; i < flux.length - 2; i++) {
        const time = i * hop / rate;
        if (time < 1.2 || time > PLAY_LENGTH - .5 || time - last < .19) continue;
        let local = 0;
        for (let j = i - 7; j <= i + 7; j++) local += flux[j];
        local /= 15;
        if (flux[i] > local * 1.62 + .0012 && flux[i] >= flux[i - 1] && flux[i] > flux[i + 1]) {
          candidates.push({ time, strength: flux[i] });
          last = time;
        }
      }
      if (candidates.length < 85) return this.fallbackChart();
      const sorted = [...candidates].sort((a, b) => b.strength - a.strength);
      const cutoff = sorted[Math.min(sorted.length - 1, 279)]?.strength || 0;
      const selected = candidates.filter((note, index) => note.strength >= cutoff || index % 3 === 0).slice(0, 300);
      return this.assignLanes(selected.map(note => note.time));
    }

    fallbackChart() {
      const beat = 60 / 128;
      const times = [];
      for (let bar = 0, t = 1.875; t < PLAY_LENGTH - .5; bar++, t += beat) {
        times.push(t);
        if (bar % 4 === 3) times.push(t + beat / 2);
        if (bar % 16 === 14) times.push(t + beat * .75);
      }
      return this.assignLanes(times);
    }

    assignLanes(times) {
      // 曲から拾った表拍を土台に、毎プレイ異なる裏拍と2個押しを構成する。
      // 同時押しは最大2レーンまでに限定し、スマホで処理できない密集を避ける。
      const source = [...new Set(times.map(time => Math.round(time * 1000) / 1000))].sort((a, b) => a - b);
      const events = source.map(time => ({ time, offbeat: false }));
      for (let i = 0; i < source.length - 1; i++) {
        const gap = source[i + 1] - source[i];
        if (gap >= .34 && gap <= .95 && Math.random() < .34) {
          const offbeat = source[i] + gap * .5;
          if (offbeat < PLAY_LENGTH - .4) events.push({ time: offbeat, offbeat: true });
        }
      }
      events.sort((a, b) => a.time - b.time);
      const notes = [];
      let previousLane = -1;
      let previousTime = -10;
      for (const event of events.slice(0, 360)) {
        const { time } = event;
        let lane = Math.floor(Math.random() * 5);
        if (lane === previousLane && time - previousTime < .42) lane = (lane + 1 + Math.floor(Math.random() * 3)) % 5;
        notes.push({ time, lane, judged: false, result: '', offbeat: event.offbeat });
        if (time - previousTime > .25 && Math.random() < .16 && notes.length < 400) {
          const choices = [0, 1, 2, 3, 4].filter(value => value !== lane);
          const chordLane = choices[Math.floor(Math.random() * choices.length)];
          notes.push({ time, lane: chordLane, judged: false, result: '', chord: true, offbeat: event.offbeat });
          notes[notes.length - 2].chord = true;
        }
        previousLane = lane;
        previousTime = time;
      }
      return notes.sort((a, b) => a.time - b.time || a.lane - b.lane);
    }

    hit(lane) {
      if (!this.playing || !this.game?.audio?.music) return;
      const time = this.game.audio.music.currentTime;
      let target = null;
      let delta = Infinity;
      for (const note of this.chart) {
        if (note.judged || note.lane !== lane) continue;
        const distance = Math.abs(note.time - time);
        if (distance < delta) { target = note; delta = distance; }
        if (note.time > time + WINDOWS.good) break;
      }
      if (!target || delta > WINDOWS.good) return;
      if (delta <= WINDOWS.perfect) this.judge(target, 'perfect');
      else if (delta <= WINDOWS.great) this.judge(target, 'great');
      else this.judge(target, 'good');
    }

    judge(note, result) {
      note.judged = true;
      note.result = result;
      this.counts[result] += 1;
      if (result === 'miss') this.combo = 0;
      else {
        this.combo += 1;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const base = result === 'perfect' ? 1000 : result === 'great' ? 700 : 400;
        this.score += base + Math.min(500, this.combo * 5);
      }
      this.showJudge(result);
      this.updateHud();
    }

    showJudge(result) {
      clearTimeout(this.judgeTimer);
      this.judgeEl.className = `kazu-rhythm-judge ${result}`;
      this.judgeEl.textContent = result.toUpperCase();
      void this.judgeEl.offsetWidth;
      this.judgeEl.classList.add('show');
      this.judgeTimer = setTimeout(() => this.judgeEl.classList.remove('show'), 310);
    }

    updateHud() {
      this.scoreEl.textContent = String(this.score).padStart(7, '0');
      this.comboEl.querySelector('strong').textContent = this.combo;
      this.comboEl.classList.toggle('on', this.combo > 1);
    }

    frame() {
      if (!this.playing) return;
      const time = this.game.audio.music.currentTime;
      for (const note of this.chart) {
        if (!note.judged && time - note.time > WINDOWS.miss) this.judge(note, 'miss');
        if (note.time > time + APPROACH) break;
      }
      this.draw(time);
      if (time >= PLAY_LENGTH || this.game.audio.music.ended) this.finish();
      else this.raf = requestAnimationFrame(() => this.frame());
    }

    resize() {
      if (!this.canvas || this.root.hidden) return;
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(2, devicePixelRatio || 1);
      this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
      this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.draw(this.game?.audio?.music?.currentTime || 0);
    }

    draw(time) {
      const ctx = this.ctx;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (!w || !h) return;
      const laneW = w / 5;
      const hitY = h - 28;
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#071126'); bg.addColorStop(.65, '#02050e'); bg.addColorStop(1, '#0b0618');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      for (let lane = 0; lane < 5; lane++) {
        ctx.fillStyle = lane % 2 ? '#ffffff05' : '#3c8cff08';
        ctx.fillRect(lane * laneW, 0, laneW, h);
        ctx.strokeStyle = '#5a89c326'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(lane * laneW, 0); ctx.lineTo(lane * laneW, h); ctx.stroke();
      }
      ctx.shadowBlur = 15; ctx.shadowColor = '#68cbff'; ctx.strokeStyle = '#d9f4ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, hitY); ctx.lineTo(w, hitY); ctx.stroke(); ctx.shadowBlur = 0;
      for (const note of this.chart) {
        if (note.judged) continue;
        const until = note.time - time;
        if (until > APPROACH || until < -.25) continue;
        const progress = 1 - until / APPROACH;
        const y = 65 + progress * (hitY - 65);
        const x = (note.lane + .5) * laneW;
        const radius = Math.max(10, Math.min(18, laneW * .23));
        ctx.save();
        ctx.shadowBlur = 18; ctx.shadowColor = COLORS[note.lane];
        const gradient = ctx.createRadialGradient(x - radius * .3, y - radius * .3, 1, x, y, radius);
        gradient.addColorStop(0, '#fff'); gradient.addColorStop(.28, COLORS[note.lane]); gradient.addColorStop(1, '#071020');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#eaf8ff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
        if (note.chord) {
          ctx.strokeStyle = '#ffd86f'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, radius + 4, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }

    finish() {
      if (!this.playing) return;
      this.playing = false;
      cancelAnimationFrame(this.raf);
      this.game.audio.music.pause();
      const total = this.chart.length || 1;
      const weighted = this.counts.perfect + this.counts.great * .7 + this.counts.good * .4;
      const accuracy = Math.round(weighted / total * 1000) / 10;
      const flags = this.game.profile.flags || (this.game.profile.flags = {});
      flags.kazuRhythmPlayed = Number(flags.kazuRhythmPlayed || 0) + 1;
      flags.kazuRhythmHighScores ||= {};
      flags.kazuRhythmHighScores[this.track.id] = Math.max(Number(flags.kazuRhythmHighScores[this.track.id] || 0), this.score);
      if (this.track.id === 'reijishinshoku') flags.kazuRhythmHighScore = flags.kazuRhythmHighScores[this.track.id];
      flags.kazuRhythmMaxCombo = Math.max(Number(flags.kazuRhythmMaxCombo || 0), this.maxCombo);
      this.game.saveProfile();
      this.cover.hidden = false;
      this.setCover(`<div class="kazu-rhythm-card"><small>PERFORMANCE COMPLETE</small><h2>RESULT<em>${accuracy >= 95 ? 'PHANTOM PERFECT' : accuracy >= 80 ? 'BRILLIANT STEAL' : 'KEEP THE BEAT'}</em></h2><div class="kazu-rhythm-results"><div><small>SCORE</small><strong>${String(this.score).padStart(7, '0')}</strong></div><div><small>ACCURACY</small><strong>${accuracy.toFixed(1)}%</strong></div><div><small>MAX COMBO</small><strong>${this.maxCombo}</strong></div><div><small>PERFECT</small><strong>${this.counts.perfect}</strong></div></div><button type="button" data-rhythm-action="start">REPLAY</button><button type="button" class="secondary" data-rhythm-action="exit">拠点へ戻る</button></div>`);
    }

    // pointerdown で閉じると、その直後の click が下の拠点へ抜けてしまい、
    // 装備画面などが勝手に開く。閉じた直後の1クリックだけ捨てる。
    swallowNextClick() {
      const kill = event => { event.preventDefault(); event.stopPropagation(); };
      addEventListener('click', kill, { capture: true, once: true });
      setTimeout(() => removeEventListener('click', kill, { capture: true }), 700);
    }

    async close() {
      this.swallowNextClick();
      clearTimeout(this.judgeTimer);
      cancelAnimationFrame(this.raf);
      this.playing = false;
      this.preparing = false;
      if (this.songEnded && this.game?.audio?.music) this.game.audio.music.removeEventListener('ended', this.songEnded);
      this.root.hidden = true;
      document.body.style.overflow = '';
      removeEventListener('resize', this.resizeHandler);
      removeEventListener('keydown', this.keyHandler);
      if (this.songStarted && this.game?.audio) {
        this.songStarted = false;
        await this.game.audio.playTrack(this.game.menuMusic);
      }
    }

    onKey(event) {
      if (this.root.hidden || event.repeat) return;
      const lane = KEY_LABELS.indexOf(event.key.toUpperCase());
      if (lane < 0) return;
      event.preventDefault();
      this.hit(lane);
      const key = this.root.querySelector(`[data-lane="${lane}"]`);
      key?.classList.add('hit');
      setTimeout(() => key?.classList.remove('hit'), 75);
    }
  }

  const init = () => { if (!window.kazuRhythmGame) window.kazuRhythmGame = new KazuRhythmGame(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
