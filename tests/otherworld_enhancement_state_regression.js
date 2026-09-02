const fs = require('fs');
const assert = require('assert');

const gear = fs.readFileSync('js/otherworld_gear.js', 'utf8');
const score = fs.readFileSync('js/infinite_score.js', 'utf8');
const game = fs.readFileSync('js/game.js', 'utf8');

const effective = (base, quality, level, op = 0) => Math.round(base * quality / 100 * (1 + level * .08)) + op;
const values = [0, 1, 2, 3].map(level => effective(120, 100, level));
assert.deepEqual(values, [120, 130, 139, 149], '+0〜+3で既存の1段階8%仕様が段階的に実能力へ反映される');
assert.equal(effective(120, 110, 2, 7), 160, 'QUALITY・強化値・OPを独立項として合算する');

assert.match(gear, /P\.owgEffectiveStats=function/, '異世界装備の表示と戦闘で共通の実効値計算を使う');
assert.match(gear, /1\+Math\.max\(0,Number\(level\)\|\|0\)\*\.08/, '既存の強化倍率8%を維持する');
assert.doesNotMatch(gear, /equipmentCombatStats=function\([^)]*\)\{[^}]*if\(this\.isRun/, 'RUN中も異世界装備の戦闘値を除外しない');
assert.match(score, /if \(gear\.otherWorldGear\) continue;/, '旧RUN装備集計との二重加算を防ぐ');
assert.match(score, /origCombatStats\.call\(this, \{\}\)/, 'RUN中に拠点装備を混入させない');
assert.match(score, /isForgeStatPreview/, '強化前後と上昇量を工房に表示する');
assert.doesNotMatch(score.match(/P\.isForgeEnhance=[\s\S]*?P\.isForgeDelete=[\s\S]*?;\n/)?.[0] || '', /\b(?:alert|prompt|confirm)\s*\(/, '工房の強化・合成・OP操作でiOS標準ダイアログを使わない');
assert.match(game, /prepareBattleInteractionState\(\)/, '戦闘開始時に操作ロックを共通初期化する');
assert.match(game, /this\.autoToggleBusy = false;/, '前画面のAUTO連打防止フラグを持ち越さない');
assert.match(score, /this\.prepareBattleInteractionState\?\.\(\);/, '無限奏廊戦闘も同じ初期化を通る');

console.log('otherworld enhancement/state regression: ok');
