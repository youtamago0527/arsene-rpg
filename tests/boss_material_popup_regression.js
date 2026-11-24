const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const game = fs.readFileSync(path.join(__dirname, '..', 'js/game.js'), 'utf8');
for (const boss of ['zenakado', 'myrthi', 'versicrell', 'seripes']) {
  const branch = game.match(new RegExp(`if \\(this\\.battleMode === '${boss}'\\) \\{[^\\n]*`))?.[0];
  assert.ok(branch, `${boss}の勝利処理がある`);
  assert.match(branch, new RegExp(`offerRepeatBossMaterialDrop\\(D\\.enemies\\.${boss}, firstClear\\)`), `${boss}の再戦勝利で素材確認POPを予約する`);
}
assert.match(game, /this\.battleMode === 'd5MidBoss'[\s\S]*?offerRepeatBossMaterialDrop\(e, firstClear\); return;/, 'D5中ボスの再戦勝利でも提案する');
assert.match(game, /dungeon\.midBossId === this\.battleMode[\s\S]*?offerRepeatBossMaterialDrop\(e, firstClear\); return;/, '各ダンジョン中ボスの再戦勝利でも提案する');
assert.match(game, /\['astact', 'ostina'\]\.includes\(this\.battleMode\)[\s\S]*?offerRepeatBossMaterialDrop\(e, firstClear\); return;/, 'D4・D5ボスの再戦勝利でも提案する');
assert.match(game, /offerRepeatBossMaterialDrop\(enemy, firstClear(?:, [^)]*)?\)[\s\S]*?if \(firstClear \|\| !enemy/, '初回撃破は素材再抽選の対象外');
assert.match(game, /setTimeout\(\(\) => \{[\s\S]*?this\.showBossMaterialOffer\(\)/, '再戦リザルトが表示された後に確認POPを開く');
assert.doesNotMatch(
  game.match(/renderBossResultActions\(\) \{[\s\S]*?showBossMaterialOffer\(\) \{/)[0],
  /data-result-action="boss-overdrive"/,
  'OVERDRIVEは戦闘前の選択だけにする'
);
const context = { window: {}, document: { querySelector: () => null }, addEventListener() {} };
vm.createContext(context);
for (const file of ['js/data.js', 'js/game.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
const battle = Object.create(context.window.BattleGame.prototype);
const enemy = { name: 'ボス', dropTable: [
  { itemId: 'zenacad_core', chance: .5 },
  { itemId: 'maestri_baton', chance: .5 }
] };
let offer, granted, displayed;
context.window.arseneQOffer = { show(type, options) { assert.equal(type, 'bossDrop'); offer = options; return true; } };
battle.bossMaterialOffer = { enemy, rows: battle.bossMaterialDropRows(enemy), claimed: false };
battle.battleRewards = { drops: {} };
battle.traitDropRateBonus = () => 0;
battle.collectionTitleEffect = () => 1;
battle.renderBossResultActions = () => {};
battle.applyRewards = reward => { granted = reward; };
battle.showBossDoubleUpResult = entries => { displayed = entries; };
assert.equal(battle.bossMaterialOffer.rows.length, 2, '追加抽選に装備も含む');
assert.equal(battle.showBossMaterialOffer(), true);
offer.onGrant();
assert.equal(battle.bossMaterialOffer.claimed, true, '広告報酬後に再視聴ボタンを無効化する');
assert.equal(battle.showBossMaterialOffer(), false, '同じ撃破結果で2回受け取れない');
assert.equal(granted.drops.zenacad_core, 1, '素材を2倍確率の追加抽選で得る');
assert.equal(granted.drops.maestri_baton, 1, '装備を2倍確率の追加抽選で得る');
assert.equal(displayed.length, 2, '追加で得た素材と装備を結果に表示する');
const rebirth = { itemId: 'rebirthArcana', chance: .03, count: 2 };
context.window.arseneQOffer.canUse = () => true;
for (const [roll, wins] of [[.0599, true], [.06, false]]) {
  vm.runInContext(`Math.random = () => ${roll}`, context);
  assert.equal(battle.offerRepeatBossMaterialDrop(enemy, true, rebirth), false);
  assert.equal(battle.offerRepeatBossMaterialDrop({ name: 'ボス', dropTable: [] }, false, rebirth), true);
  assert.equal(battle.showBossMaterialOffer(), true);
  granted = null;
  offer.onGrant();
  assert.equal(granted?.drops.rebirthArcana, wins ? 2 : undefined, '広告では6%で輪廻を追加抽選');
  const total = battle.battleRewards.drops.rebirthArcana;
  offer.onGrant();
  assert.equal(battle.battleRewards.drops.rebirthArcana, total, '同じ広告では重複付与しない');
}
const resultNodes = Object.fromEntries(['#result-title', '#result-copy', '#result-kicker', '#rewards', '#result-menu', '#result'].map(id => [id, { style: {} }]));
context.document.querySelector = id => resultNodes[id] || null;
battle.cleanupBattleTransientUI = () => {};
battle.pauseAutoBattle = () => {};
battle.bossMaterialOffer = { enemy, claimed: false };
battle.showResult('RIFT CLEARED', '', '異界の奥へ進む', '');
assert.equal(battle.bossMaterialOffer, null, '異世界など別の結果画面へボス広告が漏れない');
const stagedOffer = { enemy, claimed: false };
battle.bossMaterialOffer = stagedOffer;
battle.showResult('SCORE GET', '', 'PHANTOM SCORE', '', { preserveBossOffer: true });
assert.equal(battle.bossMaterialOffer, stagedOffer, '同じボス戦の段階表示では提案を維持する');
console.log('boss material popup regression: OK');
