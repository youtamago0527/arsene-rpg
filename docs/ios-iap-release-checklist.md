# iOS課金・審査提出チェックリスト

## 商品登録

- Non-Consumable: `time_complete_pass`, `ad_skip_license`, `auto3_license`, `sweep_license`
- Consumable: `ad_skip_tickets_10`, `otherworld_tickets_5`, `rebirth_arcana_1`, `protection_arcana_1`, `blessed_protection_arcana_1`
- Product IDにはすべて `com.arsene.remix.` を付ける。
- App Store Connectの価格、表示名、説明、販売地域、審査用スクリーンショットを9商品すべて設定する。

## 実装原則

- StoreKit 2のverified取引だけを付与する。
- 効果とtransaction IDをセーブした後だけtransactionをfinishする。
- キャンセル、保留、失敗、未検証取引では付与しない。
- 同じtransaction IDは再配送されても二重付与しない。
- 永久商品は「購入を復元」に対応し、消費商品は復元しない。
- ブラウザ版の購入ボタンは無効で、無料付与を行わない。
- 表示価格はStoreKitのlocalized `displayPrice`を正とする。

## 提出前テスト

1. Xcode StoreKit Configurationで全9商品の成功、キャンセル、保留、失敗を確認する。
2. 連打、再起動、未完了取引再配送で二重付与されないことを確認する。
3. 永久商品の復元と、消費商品が復元されないことを確認する。
4. Sandbox/TestFlightで全商品を実機確認する。
5. Paid Apps Agreement、税務情報、銀行口座をApp Store Connectで完了する。
6. 初回課金商品はアプリの新しいBuildと同じ審査提出へ含める。
