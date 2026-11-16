const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let now = 0, nextTimer = 0, sources = 0, rejectNext;
const timers = new Map(), media = [];
class Audio {
  constructor(src) { this.src = src; this.paused = true; media.push(this); }
  pause() { this.paused = true; }
  play() { this.paused = false; return rejectNext ? new Promise((_, reject) => { rejectNext = reject; }) : Promise.resolve(); }
  removeAttribute() { this.src = ''; }
}
const sandbox = {
  window: { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' } }, Audio, URL,
  document: { baseURI: 'https://example.test/', addEventListener() {} },
  localStorage: { getItem() { return null; }, setItem() {} }, matchMedia: () => ({ matches: false }),
  performance: { now: () => now }, BroadcastChannel: undefined,
  setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, at: now + ms }); return id; },
  clearTimeout(id) { timers.delete(id); },
};
vm.runInNewContext(fs.readFileSync('js/audio-runtime-20260904.js', 'utf8'), sandbox);
const audio = new sandbox.window.ArseneAudio('music.mp3');
const param = () => ({ value: 0, cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { this.value = v; } });
audio.ctx = { currentTime: 0, createMediaElementSource() { sources++; return { connect() {}, disconnect() {} }; }, createGain() { return { gain: param(), connect() {}, disconnect() {} }; } };
audio.master = { gain: param() };
function advance(ms) {
  now += ms;
  for (const [id, t] of [...timers]) if (t.at <= now && timers.has(id)) { timers.delete(id); t.fn(); }
}
(async () => {
  // WKWebView local assets may carry bytes with status 0. Do not reject
  // them before decoding; real HTTP errors and undecodable bodies still fail.
  const body = new ArrayBuffer(8);
  sandbox.fetch = () => Promise.resolve({ ok: false, status: 0, arrayBuffer: () => Promise.resolve(body) });
  let decoded = 0;
  const decodeAudio = new sandbox.window.ArseneAudio('music.mp3');
  decodeAudio.ctx = { decodeAudioData(bytes, resolve) { assert.equal(bytes, body); decoded++; resolve({ duration: 2 }); } };
  await decodeAudio.preloadSfxFiles();
  assert.equal(decoded, 10);
  assert.equal(Object.values(decodeAudio.sfxBuffers).filter(Boolean).length, 10);
  const browserAudio = new sandbox.window.ArseneAudio('music.mp3');
  browserAudio.nativeIos = false; browserAudio.ctx = decodeAudio.ctx;
  await browserAudio.preloadSfxFiles();
  assert.equal(decoded, 10, 'browser opaque responses must not be treated as usable assets');
  // Hundreds of repeated hits must not allocate hundreds of native players.
  for (let i = 0; i < 1000; i++) { audio.playSfxFile(['swordHit', 'criticalHit', 'playerHit'][i % 3]); advance(100); }
  assert(sources <= 10, `unbounded native sources: ${sources}`);
  assert.equal(media.length, sources + 3); // persistent BGM
  assert(audio.nativeSfxPlayers.size <= 6);
  advance(2000);
  assert.equal(audio.nativeSfxPlayers.size, 0);
  assert.equal(audio.nativeSfxByName.size, 0);
  assert.equal(timers.size, 0);
  assert(audio.nativeSfxPool.every(p => p.media.paused && !p.media.onended && !p.media.onerror));
  // A stolen voice's old event/timer/rejected play cannot stop its new use.
  rejectNext = true;
  audio.playSfxFile('swordHit');
  const rejectOld = rejectNext, first = [...audio.nativeSfxPlayers][0], oldEnd = first.media.onended;
  rejectNext = undefined;
  advance(50); audio.playSfxFile('swordHit');
  advance(50); audio.playSfxFile('swordHit'); // steals first voice
  assert(audio.nativeSfxPlayers.has(first));
  oldEnd(); rejectOld(new Error('old play interrupted'));
  await Promise.resolve();
  assert(audio.nativeSfxPlayers.has(first));
  advance(2000);
  audio.playSfxFile('mealHeal');
  const meal = [...audio.nativeSfxPlayers][0];
  assert.equal(meal.gain.gain.value, .24);
  meal.media.onerror();
  assert.equal(audio.nativeSfxPlayers.size, 0);
  audio.setVolume('sfx', 0);
  const count = sources;
  assert.equal(audio.playSfxFile('heal'), false);
  assert.equal(sources, count);
  assert.equal(audio.master.gain.value, 0);
  audio.setVolume('sfx', 100);
  const buffers = [];
  audio.ctx.createBufferSource = () => {
    const src = { playbackRate: { value: 1 }, connect() {}, disconnect() { this.disconnected = true; }, start(...args) { this.startArgs = args; }, stop() {} };
    buffers.push(src); return src;
  };
  audio.sfxBuffers = { 'assets/audio/sfx/sword-hit-sample-20260904.mp3': { duration: 2 } };
  for (let i = 0; i < 1000; i++) { advance(50); audio.playSfxFile('swordHit'); }
  assert.equal(sources, count, 'decoded playback should not create media sources');
  assert.equal(audio.nativeSfxPlayers.size, 2, 'decoded voices must also be bounded');
  assert.deepEqual(buffers.at(-1).startArgs, [0, .05, .78]);
  assert(buffers.slice(0, -2).every(s => s.disconnected), 'stolen decoded nodes were not disconnected');
  for (const p of [...audio.nativeSfxPlayers]) p.source.onended();
  assert.equal(audio.nativeSfxPlayers.size, 0);
  assert.equal(audio.nativeSfxByName.size, 0);
  console.log('iOS SFX pool: bounded resources, voice stealing, stale callbacks, error cleanup, mute OK');
})();
