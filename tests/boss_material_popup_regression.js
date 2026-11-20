const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const game = fs.readFileSync(path.join(__dirname, '..', 'js/game.js'), 'utf8');
for (const boss of ['zenakado', 'myrthi', 'versicrell', 'seripes']) {
  const branch = game.match(new RegExp(`if \\(this\\.battleMode === '${boss}'\\) \\{[^\\n]*`))?.[0];
  assert.ok(branch, `${boss}の勝利処理がある`);
  assert.match(branch, new RegExp(`offerRepeatBossMaterialDrop\\(D\\.enemies\\.${boss}, firstClear\\)`), `${boss}の再戦勝利で素材確認POPを予約する`);
}
assert.match(game, /this\.battleMode === 'd5MidBoss'[\s\S]*?offerRepeatBossMaterialDrop\(e, firstClear\); return;/, 'D5中ボスの再戦勝利でも提案する');
assert.match(game, /dungeon\.midBossId === this\.battleMode[\s\S]*?offerRepeatBossMaterialDrop\(e, firstClear\); return;/, '各ダンジョン中ボスの再戦勝利でも提案する');
assert.match(game, /\['astact', 'ostina'\]\.includes\(this\.battleMode\)[\s\S]*?offerRepeatBossMaterialDrop\(e, firstClear\); return;/, 'D4・D5ボスの再戦勝利でも提案する');
assert.match(game, /offerRepeatBossMaterialDrop\(enemy, firstClear\)[\s\S]*?if \(firstClear \|\| !enemy/, '初回撃破は素材再抽選の対象外');
assert.match(game, /setTimeout\(\(\) => \{[\s\S]*?this\.showBossMaterialOffer\(\)/, '再戦リザルトが表示された後に確認POPを開く');
console.log('boss material popup regression: OK');
