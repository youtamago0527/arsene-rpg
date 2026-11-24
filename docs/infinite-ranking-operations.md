# 無限奏廊ランキングの運用

## 仕様

- iOSアプリでGame Center本人確認後、公開する表示名を登録して参加する。メールアドレスは収集しない。
- 登録後に始めたRUNの正常帰還を集計する。最高到達階を比較し、同じ階ならサーバーに先に届いた記録を上位とする。敗北・放棄・デバッグRUNは通常のアプリから送らない。オフラインで開始し、サーバーにRUNを登録できなかった探索は対象外。開始済みRUNの帰還記録は接続回復後に送信を再試行する。
- 順位表は1つ。期間は日本時間の月曜0時から翌月曜0時。毎日0時の直前までに受信した記録に基づき日次分を確定し、月曜は同じ確定順位を週間にも使う。月曜0時ちょうど以降の受信は新しい週に含める。
- 日次配分は1位1,000、2〜5位500、6〜10位300アルカナポイント。週間分の初期額は未設定で、設定すると日次分に加算される。
- 報酬はアカウントのポイント台帳に自動記録される。アプリのセーブに複製しないため端末を替えても同じアカウントなら残高・履歴を確認できる。ポイントの交換先は未実装。

## Cloudflare・iOSの有効化

全話サイトで使うCloudflareの登録API＋D1と同じ構成で、無限奏廊専用のWorkerとD1を用意する。予約のDB、登録者情報、メール処理と共有しない。初期構成はWorkers/D1 Freeの枠内でも試せる。利用が増えた場合は読み取り・書き込みの実測で判断する。[D1の料金と無料枠](https://developers.cloudflare.com/d1/platform/pricing/)

1. Cloudflareで試験用の専用D1を作り、`services/infinite-ranking/wrangler.jsonc` の仮IDを差し替える。本番は別の専用D1とWorkerを使う。
2. `SESSION_SECRET`（ランダム値32バイト以上）と、Appleの信頼チェーンを事前確認したGame Center公開鍵証明書の署名元CA PEMを `GAME_CENTER_CA_PEMS` としてWorkerに登録する。署名元の移行期間は受理する複数のPEMを連結できる。Appleの署名URLが更新されたら、Sandboxの実際のURLと証明書チェーンを照合する。[Appleの署名検証手順](https://developer.apple.com/documentation/gamekit/gklocalplayer/fetchitems%28foridentityverificationsignature%3A%29)
3. Workerディレクトリで `wrangler d1 migrations apply DB --remote` の後に `wrangler deploy`。CronはUTC 15:05（日本時間0:05）に回り、0時で締める。直近7回の未確定分も見直すため、一時停止から再開しても二重付与しない。[Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
4. XcodeとApp IDでGame Center capabilityを設定して、Sandbox検証を行う。アプリ内のランキングはD1を参照するため、App Store ConnectにGame Centerの順位表は作成しなくてよい。
5. `js/infinite_ranking_config.js` にHTTPS Worker URLを設定し、動作確認後に `enabled: true`。未設定版は入口・HELP・通信が無効。

## 週間配分と障害時

`weekly_reward_policy` に対象となる週の月曜の日付と、1位・2〜5位・6〜10位のポイントを設定する。0はその帯を付与しない。対象週の開始日以前で最も新しい設定が適用される。配分を変更する場合は未来週の日付で新しい行を入れる。既に確定した締めの報酬は変更しない。

`snapshots` が確定順位、`reward_ledger` が実際の付与記録、`settlements` が締め完了を管理する。同じ締めのスナップショット・付与・完了マークはひとつのD1バッチで確定する。7日を越える障害はまずD1をバックアップし、非公開の運用環境で対象日の `settleCutoff` を順に適用してから台帳を照合する。

Game Center認証はプレイヤー本人性を確認する。RUNのnonceは本人の開始記録に結び付け、1回の帰還だけ受理し、階数・経過時間を検査する。到達階は端末申告なので改造クライアントの完全検証はできない。実機・Sandboxでの動作確認が済むまでは公開を有効化しない。

## ローカル検証

リポジトリルートで `node --test services/infinite-ranking/ranking.test.mjs`（Node 24）と `node scripts/build-web.mjs`。Workerディレクトリで `wrangler d1 migrations apply DB --local` と `wrangler deploy --dry-run`。自動テストは署名検証の入口だけテストの関数に差し替え、認証付きAPI・SQLの同順位・締め時刻・報酬・再実行を検証する。
