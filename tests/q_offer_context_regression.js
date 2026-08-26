const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const game = read('js/game.js');
const offer = read('js/q_offer.js');
const otherworld = read('js/otherworld.js');
const titles = read('js/title_system.js');

assert(!/sound-settings[\s\S]{0,500}normalHTML/.test(game), '設定のサウンド画面からQオファー入口を除去する');
assert(!/data-debug-open[\s\S]{0,500}debugHTML/.test(game), '設定のDEBUG画面からQオファー入口を除去する');
assert.match(offer, /normalHTML\(\)\s*\{\s*return '';\s*\}/, '旧設定用入口は空HTMLにする');

assert.match(otherworld, /arseneQOffer\?\.otherworldHTML/, '異世界画面に異界干渉オファーを表示する');
assert.match(otherworld, /arseneQOffer\?\.bonus\?\.\('otherworld'\)/, '異界干渉回数へ広告ボーナスを加算する');
assert.match(game, /arseneQOffer\?\.battleHTML/, '戦闘MENUへAUTO×2・一掃を表示する');
assert.match(offer, /q-battle-offers[\s\S]*AUTO ×2[\s\S]*一掃/, '戦闘MENU用の2操作を同じブロックへ置く');

assert.match(game, /showGameOverOrRevive[\s\S]{0,500}showReviveOfferIfAvailable/, '復活オファーはGAME OVER経路から呼ぶ');
assert.equal((game.match(/show\('revive'/g) || []).length, 1, '復活オファーの直接呼び出しは死亡時の1箇所だけ');

assert.match(game, /offerDestroyedEquipmentRestore[\s\S]*show\?\.\('protect'/, '装備復元オファーは破壊後の専用処理から呼ぶ');
assert(!offer.includes('consumeEnhancementProtection'), '保護トークンをステータスへ保持しない');
assert(!/rows\.push\(`保護/.test(offer), '保護をライブ表示しない');
assert.match(game, /delete this\.profile\.weaponEnchants\[itemId\]/, '武器復元時は強化値を+0へ戻す');
assert.match(game, /delete this\.profile\.armorEnchants\[itemId\]/, '防具復元時は強化値を+0へ戻す');
assert.match(offer, /delete s\.enhancementProtection[\s\S]*delete s\.bossDropBonus/, '旧セーブの常設保護・ボス表示データも除去する');

assert.match(game, /offerRepeatBossMaterialDrop\(enemy, firstClear\)/, 'ボス素材オファーは再戦判定を受け取る');
assert.match(game, /if \(firstClear \|\| !enemy/, '初回撃破ではボス素材オファーを出さない');
assert.match(game, /category === 'material'/, '追加抽選対象をボス素材だけに限定する');
assert(!/rows\.push\(`BOSS/.test(offer), 'ボス追加抽選をライブ表示しない');

assert.match(game, /tabs\.push\(\['title', '称号'\]\)/, '装備画面から称号装備へ移動できる');
assert.match(game, /titlePanelSource = 'equipment'/, '称号操作後も装備画面へ戻す');
assert.match(titles, /titlePanelSource === 'equipment' \? 'equipment' : 'job'/, '称号変更後の戻り先を維持する');

assert.match(game, /this\.battleMode !== 'slime'/, '一掃は通常ダンジョン戦だけで有効にする');
assert(!/rows\.push\(`保護|rows\.push\(`BOSS/.test(offer), '文脈限定効果を常設インジケータへ出さない');

console.log('Q offer context regression: OK');
