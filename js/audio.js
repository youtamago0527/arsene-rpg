(() => {
  'use strict';
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
    sfx(name) {
      if (!this.ctx || this.muted) return;
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
        case 'defeat': this.tone(280,.6,'triangle',.16,.18); this.noise(.45,.1,.08,180); break;
        case 'victory': chord([523,659,784,1047],.12); break;
        case 'escape': this.tone(760,.3,'sine',.12,2); break;
        case 'rareDrop': chord([659,880,1109,1319],.075); this.tone(1760,.5,'sine',.09,1,.3); break;
      }
    }
  }
  window.ArseneAudio = ArseneAudio;
})();
