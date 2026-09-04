const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const audio = fs.readFileSync(path.join(root, 'js', 'audio-runtime-20260904.js'), 'utf8');
const fx = fs.readFileSync(path.join(root, 'js', 'battle_fx.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const formal = {
  swordHit: 'sword-hit-sample-20260904.mp3', clawHit: 'claw-hit-sample-20260904.mp3', fireFlight: 'staff-fire-sample-20260904.mp3',
  noteHit: 'instrument-hit-sample-20260904.mp3', heal: 'heal-sample-20260904.mp3',
  playerHit: 'enemy-strike-sample-20260904.mp3', evade: 'evade-sample-20260904.mp3',
  criticalHit: 'critical-sample-20260904.mp3'
};
for (const [key, file] of Object.entries(formal)) {
  if (!audio.includes(`${key}:`) || !audio.includes(file)) throw new Error(`${key} formal asset is not registered`);
  if (!fs.existsSync(path.join(root, 'assets', 'audio', 'sfx', file))) throw new Error(`${key} formal asset file is missing: ${file}`);
}
for (const legacy of ['会心の一撃1.mp3', '回避.mp3', '打撃6.mp3', 'critical-hit-v2.mp3', 'enemy-hit-v2.mp3', 'evade-v2.mp3', '剣で斬る2.mp3', '爪通常.mp3', '杖通常.mp3', '楽器通常.mp3', 'ヒール.mp3', '逃げる.mp3', 'パッシブ発動音.mp3']) {
  if (fs.existsSync(path.join(root, '音楽系', '効果音', legacy))) throw new Error(`legacy SFX remains: ${legacy}`);
}
if (fs.existsSync(path.join(root, 'js', 'audio.js'))) throw new Error('legacy audio runtime remains');
if (!index.includes('js/audio-runtime-20260904.js?v=1.0.4')) throw new Error('fresh audio runtime is not loaded');
if (!audio.includes("getPlatform?.() === 'ios'")) throw new Error('native iOS SFX route is missing');
if (!audio.includes('new Audio(audioAssetUrl(def.url))')) throw new Error('native iOS must play cache-busted formal SFX files directly');
if (!audio.includes('createMediaElementSource(media)') || !audio.includes('gain.connect(this.master)')) throw new Error('native iOS sampled SFX must use Web Audio gain');
if (/media\.volume\s*=\s*Math\.min\([^\n]*levels\.sfx/.test(audio)) throw new Error('native iOS must not depend on ignored HTMLMediaElement.volume');
if (!audio.includes('this.levels.sfx <= 0')) throw new Error('0% SFX hard-stop is missing');
if (!audio.includes('cooldownMs: 420') || !audio.includes('maxNativeSfxPlayers = 10')) throw new Error('AUTO SFX burst protection is missing');
if (!audio.includes("playerHit:   { url: 'assets/audio/sfx/enemy-strike-sample-20260904.mp3'")) throw new Error('enemy attack must use the supplied 打撃6 sample');
if ([...audio.matchAll(/url:\s*'([^']+)'/g)].some(match => /[^\x00-\x7F]/.test(match[1]))) throw new Error('sampled SFX paths must remain ASCII-only for WKWebView');
if (!fx.includes("staff: null")) throw new Error('staff swing can double-play its projectile sound');
if (!fx.includes("this.audio?.sfx?.('fireFlight')")) throw new Error('staff projectile does not use the formal flight sound');
if (!fx.includes("shield: 'playerHit'")) throw new Error('shield impact does not share the enemy impact sound');
if (/sfxReady\s*\?*\.then\(\(\)\s*=>\s*\{?\s*if\s*\(!this\.playSfxFile/.test(audio)) throw new Error('stale delayed SFX replay remains');
if (!audio.includes('未準備の初回だけは同名の合成音を即時再生')) throw new Error('immediate first-play fallback is missing');

const listeners = {}, createdAudio = [];
class MockAudio {
  constructor(src) { this.src = src; this.volume = 1; this.paused = true; this.currentTime = 0; createdAudio.push(this); }
  pause() { this.paused = true; }
  play() { this.paused = false; return Promise.resolve(); }
  addEventListener() {}
  removeAttribute(name) { if (name === 'src') this.src = ''; }
}
const sandbox = {
  window: {}, Audio: MockAudio, URL, localStorage: { getItem: () => null, setItem() {} },
  matchMedia: () => ({ matches: false }), document: { baseURI: 'https://example.test/', addEventListener: (name, fn) => { listeners[name] = fn; } },
  BroadcastChannel: undefined, performance: { now: () => 0 }, requestAnimationFrame() {}, fetch: () => Promise.reject(new Error('not used')),
  setTimeout: () => 0,
  console
};
vm.runInNewContext(audio, sandbox);
const player = new sandbox.window.ArseneAudio('battle.mp3');
player.ctx = { state: 'running' }; player.master = {}; player.muted = false;
let synthesized = 0, sampled = 0;
player.tone = () => { synthesized++; }; player.noise = () => { synthesized++; }; player.noiseX = () => { synthesized++; };
player.playSfxFile = () => false;
player.sfx('criticalHit');
if (!synthesized) throw new Error('first undecoded play did not fall back at event time');
player.playSfxFile = () => { sampled++; return true; };
const before = synthesized; player.sfx('criticalHit');
if (sampled !== 1 || synthesized !== before) throw new Error('decoded replay did not use the formal sample exclusively');

// WKWebView ignores HTMLMediaElement.volume, so native sampled SE must share
// the Web Audio master used by synthesized SE. This verifies true mute and
// proportional slider output without depending on the media element volume.
const nodes = [];
player.nativeIos = true;
player.ctx = {
  state: 'running', currentTime: 0,
  createMediaElementSource() { return { connect(node) { nodes.push(['source', node]); }, disconnect() {} }; },
  createGain() { return { gain: { value: 0, cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { this.value = v; } }, connect(node) { nodes.push(['gain', node]); }, disconnect() {} }; }
};
player.master = { gain: { value: .72 } };
player.playSfxFile = sandbox.window.ArseneAudio.prototype.playSfxFile.bind(player);
player.setVolume('sfx', 0);
if (player.master.gain.value !== 0) throw new Error('0% SFX does not fully mute the shared master');
player.setVolume('sfx', 25);
if (Math.abs(player.master.gain.value - .18) > 1e-9) throw new Error('SFX slider is not proportional');
if (!player.playSfxFile('heal')) throw new Error('native formal SFX did not start through Web Audio');
if (createdAudio.at(-1).volume !== 1 || !nodes.some(([kind, node]) => kind === 'gain' && node === player.master)) {
  throw new Error('native sampled SFX bypasses the shared master gain');
}

console.log('battle sfx routing regression: ok');
