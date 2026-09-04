import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const data = readFileSync(new URL('../js/data.js', import.meta.url), 'utf8');
const future = readFileSync(new URL('../js/future_data.js', import.meta.url), 'utf8');
const release = readFileSync(new URL('../js/release_content.js', import.meta.url), 'utf8');
const equipment = readFileSync(new URL('../js/equipment_progression.js', import.meta.url), 'utf8');

assert.match(game, /if \(firstClear \|\| !enemy[\s\S]*bossMaterialDropRows/, '初回撃破では素材広告を出さない');
assert.match(game, /\[450, 1000, 1800\][\s\S]*if \(!opened\) open\(\)/, '勝利演出との競合時に広告POPを再試行する');
assert.match(game, /\['myrthi', 'seripes', 'astact', 'ostina'\][\s\S]*offerRepeatBossMaterialDrop/, 'D2〜D5最終ボスの再戦を広告対象にする');
assert.match(game, /midBossId === this\.battleMode[\s\S]*offerRepeatBossMaterialDrop/, 'ダンジョン中ボスの再戦を広告対象にする');
for (const id of ['zenakado', 'versicrell', 'd5MidBoss']) {
  assert.match(game, new RegExp(`battleMode === '${id}'[\\s\\S]*offerRepeatBossMaterialDrop`), `${id}の再戦を広告対象にする`);
}
for (const id of ['zenakado', 'myrthi', 'versicrell', 'seripes']) {
  assert.match(data, new RegExp(`${id}:[\\s\\S]{0,900}dropTable`), `${id}にドロップ表がある`);
}
for (const id of ['astact', 'ostina']) {
  assert.match(future, new RegExp(`id: '${id}'`), `${id}の正式公開元データがある`);
  assert.match(release, new RegExp(`${id}: enemy\\('${id}'[\\s\\S]{0,900}category|${id}: enemy\\('${id}'[\\s\\S]{0,900}itemId`), `${id}にドロップ表がある`);
}
assert.match(equipment, /astactEnemy[\s\S]*astact_core[\s\S]*staccato_fragment/, 'アスタクト素材をドロップ表へ追加する');

console.log('boss material offer regression: PASS');
