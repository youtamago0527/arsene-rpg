import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const offer = readFileSync(new URL('../js/q_offer.js', import.meta.url), 'utf8');
const title = readFileSync(new URL('../js/title_system.js', import.meta.url), 'utf8');

assert.match(offer, /overdrive:\s*\{[^}]*BOSS OVERDRIVE/, 'OVERDRIVE用の広告オファーが定義されている');
assert.match(title, /if \(!level\) \{ modal\.remove\(\); this\.startBossByKey\(bossId, 0\); return; \}/, '通常再戦は広告なしで開始する');
assert.match(title, /offer\.show\('overdrive',[\s\S]*onGrant: \(\) => this\.startBossByKey\(bossId, level\)/, 'OVERDRIVEは広告報酬後だけ開始する');
assert.doesNotMatch(title, /modal\.remove\(\); this\.startBossByKey\(bossId, level\);/, 'OVERDRIVE選択直後に戦闘を開始しない');

console.log('overdrive rewarded gate regression: PASS');
