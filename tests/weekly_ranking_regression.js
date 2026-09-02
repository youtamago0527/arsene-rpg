const assert = require('assert');
const fs = require('fs');

const client = fs.readFileSync('js/weekly_ranking.js', 'utf8');
const config = fs.readFileSync('js/weekly_ranking_config.js', 'utf8');
const infinite = fs.readFileSync('js/infinite_score.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const migration = fs.readFileSync('services/weekly-ranking/migrations/0001_initial.sql', 'utf8');

assert.match(client, /isNativePlatform.*getPlatform.*ios/s, 'ランキングはnative iOSだけで有効にする');
assert.match(config, /enabled:\s*false/, '本番設定完了まではランキングを安全側で無効化する');
assert.match(client, /CONFIG\.enabled === true.*https:/s, '有効化とHTTPS API URLの両方を要求する');
assert.match(client, /lastResult === 'return'.*submitReturn/s, '正常帰還後だけ送信する');
assert.match(client, /weeklyRunNonce/, 'サーバー発行run nonceを接続する');
assert.match(client, /PENDING_KEY.*flushPending/s, '圏外時の送信保留を持つ');
assert.match(client, /RECEIPTS_KEY.*includes\(receipt\.receiptId\)/s, 'receipt単位で二重加算を防ぐ');
assert.match(client, /weeklyRewardReceipts\.push\(receipt\.receiptId\)[\s\S]*game\.saveProfile\(\)/, '所持品加算とreceipt適用記録を同じsaveへ保存する');
assert.match(migration, /PRIMARY KEY \(week_id, player_id\)/, '週・playerのスコアを一意にする');
assert.match(migration, /UNIQUE\(week_id, player_id, reward_key\)/, '報酬grantを冪等にする');
assert.match(infinite, /lastResult:'defeat'/, '死亡状態との区別を維持する');
assert(html.includes('js/weekly_ranking.js'), 'ランキングクライアントをbundleへ含める');
assert(html.indexOf('weekly_ranking_config.js') < html.indexOf('weekly_ranking.js'), '設定をクライアントより先に読み込む');
console.log('weekly ranking regression: OK');
