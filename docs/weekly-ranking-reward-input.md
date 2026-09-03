# 週間ランキング報酬 入力フォーマット

本番値が確定するまで `REWARDS_CONFIGURED=false` とクライアント `enabled=false` を維持する。次の表を1行1報酬で埋める。同じ順位帯へ複数アイテムを配る場合は行を分け、`reward_key`は全行で一意にする。

| active_from_week（月曜、YYYY-MM-DD） | min_rank | max_rank | reward_key | item_id | quantity | label（画面表示） |
|---|---:|---:|---|---|---:|---|
|  |  |  |  |  |  |  |

確定時に確認する値：順位帯の隙間・重複を許すか、参加賞の最下位、同順位の扱い（現在は先着）、対象週、アイテムIDが現行inventoryで有効か、数量上限、日本語表示、問い合わせ時の名称。承認済み表から新しい番号のmigrationを作り、stagingでは`enabled=0`で投入・締め・受領試験を行う。承認後の別migrationで対象versionだけを`enabled=1`にする。適用済みmigrationや過去週ルールは編集しない。
