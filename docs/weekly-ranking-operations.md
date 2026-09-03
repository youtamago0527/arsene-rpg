# 無限奏廊 iOS週間ランキング 運用手順

## 構成と信頼境界

iOS Capacitorアプリだけが `ArseneGameCenter` ブリッジを利用できます。ブラウザにはランキング入口を出さず、APIもGame Center identity verification signatureの検証に成功したプレイヤーへだけ短命セッションを発行します。公開情報はGame Center表示名、順位、最高到達階だけです。

潜入開始時にAPIから一回限りのrun nonceを取得し、正常なRETURN処理が完了した時だけスコアを送ります。死亡、探索途中、ローカルデバッグシナリオ、デバッグ設定使用中、ブラウザは除外されます。同一週・同一playerは高い階だけ更新します。週はサーバー時刻による日本時間の月曜00:00から翌月曜00:00です。

run nonceは「認証後に潜入を開始した」ことまでは証明しますが、端末が申告した階そのものを完全には証明しません。改造端末対策を強化する際は、`APP_ATTEST_MODE=required` にする前にApp Attest key registration/attestation検証を追加し、nonceをchallengeにしたassertionと、階移動イベントのhash chainまたはサーバー署名run receiptを検証してください。現状の `optional` は導入境界であり、App Attest assertionのサーバー検証は未実装です。

## Cloudflareの初回設定（手動）

1. `services/weekly-ranking` で `pnpm install` を実行します。
2. `npx wrangler d1 create arsene-weekly-ranking` を実行し、返されたdatabase IDを `wrangler.jsonc` のplaceholderへ設定します。
3. staging/productionを別Worker・別D1にする場合は `env` ごとにbindingsとvarsを明示します（Wranglerの環境値は継承されません）。
4. 32byte以上のランダム値を `npx wrangler secret put SESSION_SECRET` で登録します。値をファイルやGitへ保存しません。ローカルだけはgitignored `.dev.vars` を使います。
5. `APPLE_BUNDLE_ID`、`ALLOWED_ORIGINS`、`GAME_CENTER_LEADERBOARD_ID` を実際の値へ変更します。本番CORSへ `*` を設定しません。
6. `npx wrangler d1 migrations apply arsene-weekly-ranking --remote`、`npx wrangler deploy --dry-run`、`npx wrangler deploy` の順に実行します。
7. `docs/weekly-ranking-reward-input.md` の表を確定し、`reward-rules.template.sql`から新しい番号のmigrationを作ります。仮値やtemplateを本番へ適用しません。
8. staging D1で報酬を`enabled=0`のまま投入し、締め・受領・再実行・応答消失試験を完了します。承認後の別migrationで有効化し、`REWARDS_CONFIGURED=true`にします。
9. Workerで`RANKING_ENABLED=true`を設定してstaging APIを確認します。本番では先にWorker gateを開き、ヘルス確認後にクライアントを進めます。
10. `js/weekly_ranking_config.js` の `apiUrl` を公開WorkerのHTTPS URLへ変更し、最後に `enabled: true` とします。初期状態はURLなし・無効であり、未設定のリリースには入口・認証・通信が発生しません。

CronはUTC日曜15:05（日本時間月曜00:05）です。00:00直後の遅延・再試行を許容し、直前週を締めます。Cron/管理用の公開HTTP endpointは設けていません。

## App Store Connect / Apple Developer（手動）

1. App IDでGame Center capabilityを有効化し、Xcode targetへGame Center capabilityを追加します。
2. App Store Connectでleaderboardを作り、IDを初期案 `com.arsene.remix.infinite.weekly.floor`（変更時はWorker設定も同時変更）にします。表示名とスコア形式を設定します。
3. App Attestを使う場合はApp ID/Xcode entitlementを有効化し、開発・本番環境を分離します。必須化前に既存端末のkey registration移行期間を設けます。
4. 実機Sandbox/TestFlightでGame Centerログイン、ログアウト、機内モード、署名期限切れ、正常帰還、死亡を確認します。秘密鍵は本構成では不要です。Apple秘密情報をリポジトリへ置かないでください。

## ローカル試験

```text
cd services/weekly-ranking
pnpm install
pnpm run types
npx wrangler d1 migrations apply arsene-weekly-ranking --local
pnpm test
pnpm check
npx wrangler deploy --dry-run
```

Cronは `npx wrangler dev --test-scheduled` 後、`/cdn-cgi/handler/scheduled?time=<epoch-ms>` で検証します。Game Center署名は実機でしか生成できないため、ローカルE2Eではテスト用に認証を無効化せず、署名検証関数をfixture/mockingして試験します。

## 報酬変更、再実行、障害復旧

初期migrationは報酬を一切seedしません。変更時は新しい `active_from_week` の `reward_rules` を追加し、過去週の規則を上書きしません。締めは `weekly_results` と `reward_grants` の一意制約および `INSERT OR IGNORE` により冪等です。同じ週を再実行しても二重grantは発生しません。

障害時はまずWorker logsを確認し、D1をexportしてから修復します。Cron再実行はWranglerローカルscheduled endpoint相当をstagingで確認後、Cloudflare DashboardのCron testまたは一時的な保護済み運用スクリプトから同じscheduled handlerを実行します。公開の管理endpointは追加しません。Worker version障害は `wrangler versions list` で確認して `wrangler rollback <VERSION_ID>`、D1は事前exportから復旧します。受領済みgrantを未受領へ戻す場合は、端末が既に加算済みの可能性があるため `reward_claims` とreceiptの照合なしに `claimed_at` を消さないでください。

## 本番変更・ロールバック順序

1. 現行Worker version ID、D1 schema、`weekly_scores`・`reward_grants`・`reward_claims`をexportし、件数を記録します。
2. staging専用Worker/D1へmigrationを適用し、VitestとTestFlight E2Eを通します。既存Pages projectや本番D1は操作しません。
3. 本番D1へmigrationを適用し、schemaと報酬ruleをread-only queryで照合します。gateはfalseのままです。
4. Workerをdeployし、503 `service_disabled`、CORS拒否、ログを確認します。
5. 承認済み報酬だけを有効化し、Workerの2つのgateをtrueにします。実機で認証・run開始・RETURN・順位・claim再送を確認します。
6. 最後にアプリ側URLとgateを有効にしたbuildをTestFlightへ出します。

障害時はアプリgateまたはWorker gateを即時falseにし、書き込みを止めます。コード障害は直前versionへrollbackします。migrationは原則ロールフォワードで修復し、D1 restoreが必要な場合は新DBへ復元してbindingを切替えます。切替前後のclaimをreceipt IDで照合し、重複加算を避けます。
