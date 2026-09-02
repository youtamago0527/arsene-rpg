# iOS AdMob test integration

This staging branch intentionally contains Google demo identifiers only. It must not be submitted with production monetization expectations.

- App ID: `ca-app-pub-3940256099942544~1458002511`
- Rewarded ad unit: `ca-app-pub-3940256099942544/1712485313`
- Ad format used: rewarded only (the current game has no banner, interstitial, app-open, or native-ad request path)

## Release verification

1. On a Mac, run `pnpm install --frozen-lockfile` and `pnpm cap:sync`.
2. Open `ios/App/App.xcodeproj` in Xcode and allow Swift Package Manager to resolve `CapacitorCommunityAdmob` and `GoogleMobileAds`.
3. Confirm the App target contains `GADApplicationIdentifier` in the built Info.plist and the generated bundle contains `js/admob.js`.
4. On an iOS simulator or test device, complete one rewarded ad and confirm the Q offer is granted exactly once.
5. Dismiss a rewarded ad early and test offline/no-fill; confirm neither path grants the offer or consumes a daily use.
6. Run a browser build and confirm the existing mock countdown works without any native plugin call.

Before a production submission, replace both demo identifiers through a separately reviewed release change. Never add a personal test-device identifier to source control.
