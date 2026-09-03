# iOS週間ランキング セキュリティ監査

## 実装済みの境界

- クライアントは `enabled=true` とHTTPS API URLが揃い、かつnative iOSの時だけ起動する。
- Workerは `RANKING_ENABLED=true`、`REWARDS_CONFIGURED=true`、32 bytes以上の`SESSION_SECRET`がすべて揃うまで、認証を含む全APIを503で拒否し、Cronも何もしない。
- Game Center identity verification signatureはApple配下のHTTPS証明書URLだけを許可する。redirect、userinfo、非標準port、64 KiB超の証明書を拒否し、player ID、bundle ID、timestamp、saltの署名を検証する。
- identity署名は10分間再利用禁止、identity timestampは現在時刻±5分、セッションは1時間で失効する。
- run nonceは暗号学的乱数で、player・JST週・期限へ結合される。正常RETURNだけが送信し、サーバーはnonceを原子的に一度だけ消費する。同じ送信の応答消失時だけ既存結果を返す。
- authはIP、run/score/claimはplayer単位のD1レート制限を行い、429には`Retry-After`を返す。
- claimはgrant所有者を検査し、claim IDとgrant IDの組を固定する。D1一意制約、canonical receipt、端末の永続claim intentとreceipt台帳で応答消失・再送・二重加算を防ぐ。
- request bodyはstreamで16 KiBに制限し、CORSは明示originだけを返す。応答は`no-store`と`nosniff`を付ける。秘密はWrangler secretのみで管理する。

## 受容する残余リスク

run nonceは「認証済み端末がその週にrunを開始した」ことを証明するが、申告階そのものは暗号学的に証明しない。改造クライアントは高い階を申告できるため、異常値監視とGame Center値の照合を運用で行う。完全対策にはApp Attestのkey registration、Apple attestation object検証、nonceをclientDataHashへ含むassertion検証、counter replay検査、階進行の署名付きhash chainが必要である。

`APP_ATTEST_MODE`は現在`optional`固定とし、受け取るkey IDは観測用hintであって信頼判定には使わない。上記server assertion検証と既存端末移行試験が完成するまで`required`へ変更してはならない。

## 監視シグナル

- `request_failed`、`weekly_finalized`、`weekly_finalize_skipped`の構造化ログ
- auth失敗率、429率、scoreの409率、claimの409/500率
- playerごとの短時間run開始数、週最高階の急増、Game CenterとD1の大幅乖離
- 月曜00:10 JSTまでの`weekly_finalized`不在、players/grant件数の前週比異常
- D1容量、Worker error率・CPU時間、Cron実行履歴

インシデント時はまずクライアントgateをfalseにし、次にWorkerの`RANKING_ENABLED=false`で全入口を閉じる。D1 export後に調査し、receipt照合なしでclaim状態を巻き戻さない。
