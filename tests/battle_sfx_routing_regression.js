const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const audio = fs.readFileSync(path.join(root, 'js', 'audio.js'), 'utf8');
const fx = fs.readFileSync(path.join(root, 'js', 'battle_fx.js'), 'utf8');

const formal = {
  swordHit: '剣で斬る2.mp3', clawHit: '爪通常.mp3', fireFlight: '杖通常.mp3',
  noteHit: '楽器通常.mp3', heal: 'ヒール.mp3'
};
for (const [key, file] of Object.entries(formal)) {
  if (!audio.includes(`${key}:`) || !audio.includes(file)) throw new Error(`${key} formal asset is not registered`);
  if (!fs.existsSync(path.join(root, '音楽系', '効果音', file))) throw new Error(`${key} formal asset file is missing: ${file}`);
}
for (const legacy of ['会心の一撃1.mp3', '回避.mp3', '打撃6.mp3', 'critical-hit-v2.mp3', 'enemy-hit-v2.mp3', 'evade-v2.mp3']) {
  if (fs.existsSync(path.join(root, '音楽系', '効果音', legacy))) throw new Error(`legacy SFX remains: ${legacy}`);
}
for (const synthesized of ['critical', 'criticalHit', 'playerHit', 'evade']) {
  if (new RegExp(`\\b${synthesized}\\s*:`).test(audio.split('const SFX_FILES = {')[1].split('};')[0])) throw new Error(`${synthesized} must not route to a legacy sampled file`);
}
if (!fx.includes("staff: null")) throw new Error('staff swing can double-play its projectile sound');
if (!fx.includes("this.audio?.sfx?.('fireFlight')")) throw new Error('staff projectile does not use the formal flight sound');
if (!fx.includes("shield: 'playerHit'")) throw new Error('shield impact does not share the enemy impact sound');
if (/sfxReady\s*\?*\.then\(\(\)\s*=>\s*\{?\s*if\s*\(!this\.playSfxFile/.test(audio)) throw new Error('stale delayed SFX replay remains');
if (!audio.includes('未準備の初回だけは同名の合成音を即時再生')) throw new Error('immediate first-play fallback is missing');

const listeners = {};
class MockAudio { constructor(src) { this.src = src; this.volume = 1; this.paused = true; } pause() {} play() { return Promise.resolve(); } }
const sandbox = {
  window: {}, Audio: MockAudio, URL, localStorage: { getItem: () => null, setItem() {} },
  matchMedia: () => ({ matches: false }), document: { baseURI: 'https://example.test/', addEventListener: (name, fn) => { listeners[name] = fn; } },
  BroadcastChannel: undefined, performance: { now: () => 0 }, requestAnimationFrame() {}, fetch: () => Promise.reject(new Error('not used')),
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

console.log('battle sfx routing regression: ok');
