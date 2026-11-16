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

## iPhone 16 result — 2026-11-16

Mac Xcode development build installed under a separate diagnostic bundle ID,
leaving the existing game app and save untouched. On-device UMP consent update
failed before ad loading with `com.google.user_messaging_platform` code `4`:
"Failed to read publisher's account configuration; no form(s) configured for
the input app ID." The error named the production App ID
`ca-app-pub-2798969445522147~9914094555`. The production bridge stops before
`prepareRewardVideoAd` when this happens.

The diagnostic-only code-4 bypass then loaded Google's official iOS rewarded
test unit, displayed a full-screen Test mode video, and received its reward
event. A normal in-game ad button also granted the EXP/JOB EXP x2 effect for
one hour exactly once; remaining daily uses changed from two to one. This
establishes that SDK initialization, test ad load/show, native reward callback
and the game reward route work on this iPhone. It does not prove that the
production unit can serve an ad. The next account-side step is to configure
and publish a relevant privacy message for this AdMob app in Privacy &
messaging, then repeat the test without the diagnostic bypass. No App Store
Archive, upload or resubmission was performed.
