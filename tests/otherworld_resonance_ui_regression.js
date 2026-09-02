const assert = require('node:assert/strict');
const fs = require('node:fs');
const gear = fs.readFileSync('js/otherworld_gear.js', 'utf8');
const infinite = fs.readFileSync('js/infinite_score.js', 'utf8');
const css = fs.readFileSync('css/menu.css', 'utf8');

assert.match(gear, /owgResonanceSectionHTML/, '装備欄に異世界共鳴UIを提供する');
assert.match(gear, /\[2,4,6\]\.map/, '2・4・6 SETを表示する');
assert.match(gear, /oldBossSetBonusSectionHTML[\s\S]*owgResonanceSectionHTML/, 'ボスセットUIに異世界共鳴UIを併設する');
assert.match(gear, /infiniteScore\?\.active/, '終了済みランの未帰還装備を通常装備欄へ混入させない');
assert.match(infinite, /isRenderEquipment[\s\S]*owgResonanceSectionHTML/, '無限奏廊内の装備欄にも異世界共鳴UIを表示する');
assert.match(css, /conic-gradient\(#ff2a6d,#ffcc00,#00ffcc,#05d9e8,#7000ff,#ff2a6d\)/, '異世界共鳴の外周を虹色にする');
assert.match(css, /@keyframes ow-rainbow-rotate/, '虹色外周を回転させる');

console.log('otherworld resonance UI regression: ok');
