# iOS 広告・審査提出チェックリスト

## 現在の状態

現在のiOSコードには本番IDが設定されています。AdMob管理画面での広告ユニット状態や配信可否は、コードだけでは判断できません。

- App ID: `ca-app-pub-2798969445522147~9914094555`
- Rewarded ad unit: `ca-app-pub-2798969445522147/5643677056`
- 広告形式: リワードのみ
- ランキング機能: 今回のリリースには含めない

## 実機テスト

1. 最新の `feature/ios-capacitor` を取得し、`pnpm install --frozen-lockfile`、`pnpm cap:sync` を実行する。
2. 広告を最後まで視聴した時だけ効果が1回付与されることを確認する。
3. 途中で閉じる、オフライン、ロード失敗では、効果も利用回数も消費されないことを確認する。
4. 同時に2回押しても広告が重複しないことを確認する。
5. 初回の同意画面を確認し、同意できない場合は広告を要求しないことを確認する。
6. タイトルと拠点の「設定 → データ」から広告プライバシー設定を開けることを確認する。

## 本番ID確認

AdMob管理画面のiOS App IDとRewarded Ad Unit IDを照合する。コード上の設定先は `ios/App/App/Info.plist` の `GADApplicationIdentifier` と `js/admob.js` の `IOS_REWARDED_AD_ID`。

`pnpm verify:ios-release` でデモIDが1つも残っていないことを確認する。本番広告の実機確認はAdMobへテスト端末登録した端末だけで行い、端末IDをソースへ保存しない。

## 表示失敗の調査

実機のWeb Inspector / Xcodeコンソールで `AdMob rewarded` とネイティブSDKの `Rewarded ad failed to load` / `failed to present` を確認する。JSは初期化・同意・ロード・表示・タイムアウトの失敗段階と、プラグインから届いた `code` / `message` を記録する。広告が出なかった事実だけでは、コード不具合、同意未完了、広告在庫不足、AdMob側の配信制限を区別できない。エラーコードと発生時刻を記録してから切り分ける。

## AdMob / App Store Connect

- AdMob「プライバシーとメッセージ」で対象地域向けUMPメッセージを公開する。
- パーソナライズ広告・IDFAを使う場合だけ、ATT説明文とIDFAメッセージを整備する。方針が未決定なら審査提出前に決める。
- App Store Connectの「Appのプライバシー」は、Google Mobile Ads SDKを含む実際の収集内容に合わせる。
- App Store ConnectへプライバシーポリシーURLを登録し、アプリ内からも確認できる導線を用意する。
- 広告付きであること、リワード内容、広告が失敗しても進行不能にならないことを審査メモへ書く。

## Archive前

1. `pnpm cap:sync`
2. `pnpm verify:ios-bundle`
3. `pnpm verify:ios-release`
4. XcodeでVersion / Build番号、Signing、Release構成を確認する。
5. 実機で起動、固定画面、安全領域、広告、購入・戦闘・帰還、セーブ復元を最終確認する。
6. Product → Archive → Validate App → Distribute App。

GoogleMobileAds / UserMessagingPlatformのdSYM警告だけでアップロードが完了した場合、提出自体は可能。ただしクラッシュ解析のシンボルが不足することがあるため、提出したArchiveは削除しない。
