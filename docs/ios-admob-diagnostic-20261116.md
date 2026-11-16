# iOS AdMob diagnostic build (do not submit)

Branch: `staging/ios-admob-test-build-20261116`.
The production App ID in `ios/App/App/Info.plist` and production rewarded unit ID
constant in `js/admob.js` are unchanged. This branch alone passes `isTesting: true`
to the installed AdMob plugin, which substitutes Google's official iOS rewarded
test unit `ca-app-pub-3940256099942544/1712485313`. The diagnostic panel is
also confined to this branch. `verify:ios-release` deliberately fails here.

On the Mac, fetch this branch in a separate worktree and run `pnpm install
--frozen-lockfile`, `pnpm run cap:sync`, and an Xcode development build. Install
directly onto a connected iPhone. Do not Archive for App Store distribution or
submit this branch to App Review. Preserve the user's existing save before
installing the development build.

Open the app and tap **テスト広告を再生** in the diagnostic panel. The panel reports:
SDK initialization, UMP consent status/canRequestAds, ad loading, loaded,
showing, shown, reward, dismissal and final result. Failures show stage, code
and message on screen; collect the same details from Xcode console. Next,
collapse the panel and use a normal in-game ad button to confirm that the
gameplay reward is delivered once only after a test ad reward callback.

This branch patches the AdMob plugin to expose the underlying UMP error code
and message. If UMP returns code 4 (no configured consent form), the error is
shown and the diagnostic branch alone continues to the official test ad.
Production keeps its consent gate and cannot use this bypass.

If the official test unit fails to load or show, investigate native SDK,
consent, device/network and plugin integration first. If the test unit works
but the production unit does not, inspect the AdMob app/ad unit status, policy
center, payment/identity state and traffic restrictions in the AdMob console.
The diagnostic build itself cannot establish those account states.
