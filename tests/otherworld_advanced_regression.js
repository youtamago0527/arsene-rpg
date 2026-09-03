const assert = require('node:assert/strict');
const fs = require('node:fs');

const data = fs.readFileSync('js/otherworld_data.js', 'utf8');
const logic = fs.readFileSync('js/otherworld.js', 'utf8');

assert.match(data, /id:\s*'otherWorldAdvanced'[\s\S]*?unlockBossId:\s*'astact'/, '上級はD4ボス撃破で解放する');
assert.match(data, /const advancedStats = stats =>[\s\S]*?value \* 8/, '上級能力値は初級の8倍＝中級の4倍');
assert.match(data, /bossArcanaCount:\s*4,\s*zakoArcanaCount:\s*4/, '上級はボス・雑魚ともアルカナ4個');
assert.match(data, /ow_high_slime:[\s\S]*?spriteFilter:[^\n]*|ow\('ow_high_slime'[\s\S]*?'hue-rotate/, '上級怪異は色違い表示を持つ');
assert.match(logic, /owDungeonUnlocked/, '上級の解放判定を表示と侵入処理で共有する');
assert.match(logic, /this\.giveArcana\(todayId, zakoArcanaCount\)/, '上級雑魚戦で本日のアルカナを配る');

console.log('otherworld advanced regression: ok');
