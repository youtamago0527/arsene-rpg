(() => {
  'use strict';
  // 用意された効果音ファイル。ここに載っている名前は合成音ではなくこちらを鳴らす。
  //   gain   … ファイルごとの音量差をならす
  //   offset … 先頭の無音を飛ばす秒数（MP3はエンコード時に無音が入るため）
  //   maxDur … 長いファイルを途中でフェードアウトさせる秒数
  //   rate   … 再生速度。同じ素材を流用して質感を変えるのに使う
  const SFX_FILES = {
    swordHit:    { url: '音楽系/効果音/剣で斬る2.mp3', gain: .90, offset: .050, maxDur: .9 },
    clawHit:     { url: '音楽系/効果音/爪通常.mp3',    gain: 1.10, offset: .100, maxDur: .9 },
    // ファイアボールは「飛んでいる最中」の音なので、着弾ではなく発射のタイミングで鳴らす
    fireFlight:  { url: '音楽系/効果音/杖通常.mp3',    gain: .36, offset: .010, maxDur: .60 },
    noteHit:     { url: '音楽系/効果音/楽器通常.mp3',  gain: 1.15, offset: .002, maxDur: 1.4 },
    heal:        { url: '音楽系/効果音/ヒール.mp3',    gain: .95, offset: .002, maxDur: 1.95 },
    escape:      { url: '音楽系/効果音/逃げる.mp3',    gain: .68, offset: .028, maxDur: 1.2 },
    passiveProc: { url: '音楽系/効果音/パッシブ発動音.mp3', gain: .78, offset: .018, maxDur: 1.9 }
    // クリティカルは専用の録音が無いので、下の合成音をそのまま使う
  };
  // 武器種 → 効果音名。左手の追撃など、武器種から直接鳴らしたい場所で使う
  const WEAPON_SFX = { sword: 'swordHit', martial: 'clawHit', staff: 'fireFlight', instrument: 'noteHit', shield: 'shieldHit' };

  class ArseneAudio {
    constructor(bgmPath) {
      this.ctx = null; this.master = null; this.musicSource = null; this.musicGain = null; this.muted = false; this.started = false; this.settingsKey = 'arsene-rpg-audio-v1'; this.levels = this.loadLevels(); this.musicMaxVolume = matchMedia('(max-width:760px)').matches ? .18 : .22; this.musicVolume = this.musicMaxVolume * this.levels.bgm; this.fadeToken = 0;
      this.music = new Audio(bgmPath); this.music.loop = true; this.music.preload = 'auto'; this.music.volume = this.musicVolume;
      this.audioId = `${Date.now()}-${Math.random()}`; this.audioFocus = typeof BroadcastChannel === 'function' ? new BroadcastChannel('arsene-rpg-audio-focus') : null;
      if (this.audioFocus) this.audioFocus.onmessage = e => { if (e.data?.type === 'claim' && e.data.id !== this.audioId) { this.music.pause(); this.started = false; } };
    }
    async unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = .72 * this.levels.sfx; this.master.connect(this.ctx.destination);
        this.preloadSfxFiles();
        // iOS Safari ignores HTMLMediaElement.volume. Route BGM through a
        // Web Audio gain node so the in-game slider also works on phones.
        try {
          this.musicSource = this.ctx.createMediaElementSource(this.music);
          this.musicGain = this.ctx.createGain();
          this.musicSource.connect(this.musicGain);
          this.musicGain.connect(this.ctx.destination);
          this.music.volume = 1;
          this.applyMusicVolume();
        } catch { this.musicSource = null; this.musicGain = null; this.applyMusicVolume(); }
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      if (!this.started && !this.muted) { this.audioFocus?.postMessage({ type: 'claim', id: this.audioId }); this.started = true; this.music.play().catch(() => { this.started = false; }); }
    }
    // 武器種から直接鳴らす。読み込み前や未定義の武器種は false を返すので、呼び出し側で合成音へ落とせる。
    playWeaponAttack(weaponType) { return this.playSfxFile(WEAPON_SFX[weaponType]); }
    setMusicOutput(value) { const level = Math.max(0, value); if (this.musicGain) this.musicGain.gain.value = level; else { try { this.music.volume = Math.min(1, level); } catch {} } }
    getMusicOutput() { return this.musicGain ? this.musicGain.gain.value : this.music.volume; }
    applyMusicVolume() { this.setMusicOutput(this.muted ? 0 : this.musicVolume); }
    async restartMusic() { this.fadeToken++; this.music.pause(); this.music.currentTime = 0; this.applyMusicVolume(); this.started = false; await this.unlock(); }
    async playTrack(path) { this.fadeToken++; this.music.pause(); this.music.ontimeupdate = null; this.music.loop = true; this.music.src = path; this.music.load(); this.music.currentTime = 0; this.applyMusicVolume(); this.started = false; await this.unlock(); }
    async playTimedLoop(path, loopAt = 100, fadeSeconds = 5) { await this.playTrack(path); this.music.loop = false; this.music.ontimeupdate = () => { const fadeStart = Math.max(0, loopAt - fadeSeconds), time = this.music.currentTime; if (time >= loopAt) { this.music.currentTime = 0; this.applyMusicVolume(); if (this.music.paused && !this.muted) this.music.play().catch(() => {}); return; } if (time >= fadeStart) this.setMusicOutput(this.musicVolume * Math.max(0, (loopAt - time) / fadeSeconds)); }; }
    stopMusic(fadeMs = 500) {
      if (!this.started) return; const token = ++this.fadeToken, start = performance.now(), initial = this.getMusicOutput();
      const fade = now => { if (token !== this.fadeToken) return; const p = Math.min(1, (now - start) / fadeMs); this.setMusicOutput(initial * (1 - p)); if (p < 1) requestAnimationFrame(fade); else { this.music.pause(); this.music.currentTime = 0; this.applyMusicVolume(); this.started = false; } }; requestAnimationFrame(fade);
    }
    toggle() {
      this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : .72 * this.levels.sfx;
      this.music.muted = this.muted; this.applyMusicVolume(); if (!this.muted) this.unlock(); return !this.muted;
    }
    loadLevels() { try { const saved = JSON.parse(localStorage.getItem(this.settingsKey) || '{}'); return { bgm: Number.isFinite(saved.bgm) ? Math.max(0,Math.min(1,saved.bgm)) : .42, sfx: Number.isFinite(saved.sfx) ? Math.max(0,Math.min(1,saved.sfx)) : .72, voice: Number.isFinite(saved.voice) ? Math.max(0,Math.min(1,saved.voice)) : .70 }; } catch { return { bgm:.42, sfx:.72, voice:.70 }; } }
    saveLevels() { try { localStorage.setItem(this.settingsKey, JSON.stringify(this.levels)); } catch {} }
    getVolumes() { return Object.fromEntries(Object.entries(this.levels).map(([key,value]) => [key, Math.round(value * 100)])); }
    setVolume(channel, percent) { if (!(channel in this.levels)) return; const value = Math.max(0, Math.min(100, Number(percent) || 0)) / 100; this.levels[channel] = value; this.saveLevels(); if (channel === 'bgm') { this.musicVolume = this.musicMaxVolume * value; this.applyMusicVolume(); } if (channel === 'sfx' && this.master) this.master.gain.value = this.muted ? 0 : .72 * value; }
    tone(freq, duration, type = 'sine', volume = .18, slide = 1, delay = 0) {
      if (!this.ctx || this.muted) return; const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(25, freq * slide), t + duration);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(volume, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + duration); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + duration + .02);
    }
    noise(duration = .12, volume = .12, delay = 0, highpass = 900) {
      if (!this.ctx || this.muted) return; const len = Math.ceil(this.ctx.sampleRate * duration), b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(), t = this.ctx.currentTime + delay; s.buffer = b; f.type = 'highpass'; f.frequency.value = highpass; g.gain.setValueAtTime(volume, t); g.gain.exponentialRampToValueAtTime(.0001, t + duration); s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
    }
    // 効果音ファイルを読み込んでデコードしておく。
    // 失敗しても握りつぶす。鳴らす側は合成音へフォールバックする。
    preloadSfxFiles() {
      if (!this.ctx || this.sfxBuffers) return;
      this.sfxBuffers = {};
      const urls = [...new Set(Object.values(SFX_FILES).map(f => f.url))];
      urls.forEach(url => {
        fetch(url)
          .then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))
          .then(buf => new Promise((res, rej) => {
            // Safari 系は Promise を返さない実装があるのでコールバック版で受ける
            const ret = this.ctx.decodeAudioData(buf, res, rej);
            if (ret && typeof ret.then === 'function') ret.then(res, rej);
          }))
          .then(decoded => { this.sfxBuffers[url] = decoded; })
          .catch(() => { this.sfxBuffers[url] = null; });
      });
    }
    // ファイルの効果音を鳴らす。まだ読み込めていなければ false を返す。
    playSfxFile(name) {
      const def = SFX_FILES[name]; if (!def || !this.ctx || this.muted) return false;
      const buf = this.sfxBuffers?.[def.url]; if (!buf) return false;
      const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
      src.buffer = buf; src.playbackRate.value = def.rate || 1;
      const t = this.ctx.currentTime, offset = Math.min(def.offset || 0, buf.duration);
      const rest = (buf.duration - offset) / (def.rate || 1);
      const dur = Math.min(def.maxDur ?? rest, rest);
      g.gain.setValueAtTime(def.gain ?? 1, t);
      // 途中で切る場合だけ、末尾80msでフェードして「ブツッ」と切れないようにする
      if (dur < rest - .01) {
        g.gain.setValueAtTime(def.gain ?? 1, t + Math.max(0, dur - .08));
        g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      }
      src.connect(g); g.connect(this.master);
      src.start(t, offset, dur);
      src.stop(t + dur + .02);
      return true;
    }
    // 重い打撃音用のノイズ。既存の noise() は highpass 固定・減衰も一定なので、
    // フィルタ種別・Q・掃引・減衰カーブを指定できるものを別に用意する。
    // shape: 'decay'（頭が濃い＝打撃）/ 'flat'（一定＝風切り）
    noiseX({ duration = .12, volume = .14, delay = 0, type = 'highpass', freq = 900, freqTo = null, q = 0.7, shape = 'decay', attack = .004 } = {}) {
      if (!this.ctx || this.muted) return;
      const len = Math.ceil(this.ctx.sampleRate * duration);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const p = i / len;
        // decay は指数的に落として「バチッ」と立ち上がる打撃に、flat は風切り向けに素直な減衰
        d[i] = (Math.random() * 2 - 1) * (shape === 'flat' ? (1 - p) : Math.pow(1 - p, 2.6));
      }
      const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      const t = this.ctx.currentTime + delay;
      src.buffer = buf; f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(freq, t);
      if (freqTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), t + duration);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(volume, t + attack);
      g.gain.exponentialRampToValueAtTime(.0001, t + duration);
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
    }
    sfx(name) {
      if (!this.ctx || this.muted) return;
      // 用意された効果音ファイルがあればそれを優先。未読み込み・失敗時は合成音へ。
      if (this.playSfxFile(name)) return;
      const chord = (notes, gap=.08) => notes.forEach((n,i)=>this.tone(n,.2,'sine',.1,1,i*gap));
      switch (name) {
        case 'ui': this.tone(620,.055,'square',.045,1.28); break;
        case 'slash': this.noise(.18,.16,0,1500); this.tone(780,.15,'sawtooth',.09,.18); break;
        case 'magic': this.tone(330,.34,'sine',.12,2.4); this.tone(720,.28,'triangle',.1,1.5,.08); this.noise(.22,.08,.1,1000); break;
        case 'quick': this.noise(.13,.12,0,1800); this.tone(1100,.11,'sawtooth',.07,.25); this.noise(.15,.14,.12,1700); this.tone(930,.13,'sawtooth',.08,.22,.1); break;
        case 'critical': this.tone(130,.28,'square',.22,.45); this.tone(1500,.22,'sine',.14,.6); this.noise(.25,.2,0,500); break;
        case 'enemyHit': this.tone(180,.18,'triangle',.15,.55); this.noise(.12,.09,0,350); break;
        case 'playerHit': this.tone(105,.24,'sawtooth',.18,.6); this.noise(.16,.12,0,250); break;
        case 'dark': this.tone(120,.42,'sine',.13,3.2); this.tone(62,.45,'sawtooth',.08,1.8); break;
        case 'heal': chord([440,554,659,880]); break;
        case 'passiveProc': chord([523,784,1047],.06); this.tone(1568,.34,'sine',.06,1,.12); break;
        case 'defeat': this.tone(280,.6,'triangle',.16,.18); this.noise(.45,.1,.08,180); break;
        case 'victory': chord([523,659,784,1047],.12); break;
        case 'escape': this.tone(760,.3,'sine',.12,2); break;
        case 'rareDrop': chord([659,880,1109,1319],.075); this.tone(1760,.5,'sine',.09,1,.3); break;
        // ── 武器種ごとの通常攻撃 ──────────────────────────────
        // 剣：風切り＋刃鳴り。抜けの良い高域を短く。
        // 剣：ロマサガ系の「重い一撃」を狙って層を重ねる。
        // 振り＝低い方へ落ちていく風切り。当たり＝立ち上がりの衝撃＋胴鳴り＋刃の残響。
        case 'swordSwing': {
          const r = .92 + Math.random() * .16;   // 毎回わずかに音程を散らして機械的に聞こえないようにする
          this.noiseX({ duration: .17, volume: .34, type: 'bandpass', freq: 2600 * r, freqTo: 620, q: 1.1, shape: 'flat' });
          this.tone(900 * r, .13, 'sawtooth', .09, .28);
          break;
        }
        case 'swordHit': {
          const r = .93 + Math.random() * .14;
          this.noiseX({ duration: .045, volume: .38, type: 'highpass', freq: 260, attack: .0015 });                  // 衝撃の頭
          this.noiseX({ duration: .20, volume: .60, type: 'lowpass', freq: 520, freqTo: 180, q: 1.4 });              // 胴鳴り
          this.tone(96 * r, .24, 'square', .18, .40);                                                                // 芯の重み
          this.tone(150 * r, .17, 'triangle', .11, .45, .004);
          this.noiseX({ duration: .26, volume: .22, type: 'bandpass', freq: 3400, freqTo: 1500, q: 1.6, delay: .02 });// 金属の擦れ
          this.tone(1980 * r, .30, 'triangle', .17, .84, .015);                                                     // 刃鳴り
          this.tone(2960 * r, .38, 'sine', .10, .88, .03);
          break;
        }
        // 爪：短い裂き音を3連。剣より高く、粒を細かく。
        case 'clawSwing': [0,.05,.1].forEach(d => this.noise(.08,.12,d,3000)); break;
        case 'clawHit': [0,.045,.09].forEach((d,i) => { this.noise(.07,.15,d,2600); this.tone(1500+i*260,.07,'sawtooth',.045,.4,d); }); break;
        // 杖：火球。溜めの唸り→着弾の炸裂→燃え残りのパチパチ。
        case 'fireFlight': this.noiseX({ duration: .38, volume: .17, type: 'bandpass', freq: 900, freqTo: 380, q: .9, shape: 'flat' }); this.tone(240, .34, 'sawtooth', .07, 1.6); break;
        case 'fireCast': this.tone(180,.22,'sawtooth',.05,3.2); this.noise(.20,.06,0,220); this.tone(520,.16,'triangle',.035,2.2,.05); break;
        case 'fireHit': this.tone(90,.32,'square',.20,.35); this.noise(.34,.17,0,300);
          [.06,.13,.19,.26,.33].forEach(d => this.noise(.07,.05,d,1600)); break;
        // 楽器：弦を弾いて和音が広がる感じ。倍音を薄く重ねる。
        case 'noteSwing': [784,988,1175].forEach((n,i) => { this.tone(n,.26,'triangle',.075,1,i*.055); this.tone(n*2,.18,'sine',.03,1,i*.055); }); break;
        case 'noteHit': [1319,1568,1976,2637].forEach((n,i) => { this.tone(n,.34,'triangle',.07,1,i*.045); this.tone(n*1.5,.2,'sine',.025,1,i*.045); }); break;
        // 盾：打撃の鈍い衝撃。
        case 'shieldSwing': this.noise(.16,.14,0,500); this.tone(210,.16,'square',.10,.6); break;
        case 'shieldHit': this.tone(120,.26,'square',.20,.4); this.noise(.20,.16,0,400); this.tone(680,.18,'triangle',.06,.5,.02); break;
        // クリティカル：既存の衝撃に、抜けの良い鐘と余韻を重ねる。
        case 'criticalHit': this.tone(130,.34,'square',.30,.45); this.noise(.30,.27,0,500);
          this.tone(1760,.38,'sine',.18,.85,.02); this.tone(2637,.48,'sine',.10,.9,.05); break;
      }
    }
  }
  window.ArseneAudio = ArseneAudio;
})();
