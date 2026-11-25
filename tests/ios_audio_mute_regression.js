const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Media {
  constructor(src) { this.src = src; this.paused = true; this.muted = false; }
  get volume() { return 1; } // Models an iOS media element ignoring volume writes.
  set volume(value) {}
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}
const settings = new Map();
const frames = [];
const window = { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
  navigator: { audioSession: { type: 'auto' } } };
vm.runInNewContext(fs.readFileSync('js/audio-runtime-20260904.js', 'utf8'), {
  window, document: { baseURI: 'https://localhost/', addEventListener() {} }, matchMedia: () => ({ matches: true }),
  localStorage: { getItem: key => settings.get(key), setItem: (key, v) => settings.set(key, v) },
  URL, Audio: Media, performance: { now: () => 0 }, requestAnimationFrame: cb => frames.push(cb)
});
(async () => {
  const audio = new window.ArseneAudio('music.mp3');
  const failures = [];
  function check(value, name) { if (!value) failures.push(name); }
  audio.setVolume('bgm', 0);
  check(audio.music.muted, 'BGM off must mute the element even without a gain node');
  audio.setVolume('bgm', 80);
  audio.musicGain = { gain: { value: 0 } };
  const fade = audio.fadeMusicTo(audio.musicVolume, 200);
  audio.setVolume('bgm', 0);
  frames.shift()(200);
  await fade;
  check(audio.musicGain.gain.value === 0, 'queued fade must respect BGM off');
  audio.toggle();
  const next = new window.ArseneAudio('music.mp3');
  check(next.muted && next.music.muted, 'global mute must survive relaunch');
  check(window.navigator.audioSession.type === 'ambient', 'native web view requests ambient audio');
  assert.deepEqual(failures, []);
  console.log('iOS audio mute regression: ok');
})().catch(error => { console.error(error); process.exitCode = 1; });