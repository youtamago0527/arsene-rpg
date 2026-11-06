# Guideline 2.1(b) iOS purchase remediation

The submitted iOS build had nine yen-priced Phantom Shop buttons that called
`PhantomSecret.purchase()` and immediately changed the saved profile. No StoreKit
request or Apple payment sheet was involved. The ordinary GOLD/奏貨 shops are
separate in-game-currency mechanics and are not changed here.

This branch makes Phantom Shop fail closed outside a verified iOS StoreKit
transaction. It introduces a local Capacitor plugin that fetches App Store
products, initiates the Apple purchase sheet, returns only verified StoreKit 2
transactions, and finishes a transaction only after the JS profile grant has
been saved. JS records transaction IDs to avoid double-granting consumables.
Cancelled, pending, unverified, mismatched, unavailable and failed purchases do
not grant anything. Non-consumables have a restore button; unfinished purchases
are rechecked when the shop opens, even if the product-list request fails.
The grant and transaction ID must also be visible after reloading the saved
profile before the native `finish` call. If saving fails, the in-memory grant is
rolled back and the unfinished StoreKit transaction can be retried. A previously
persisted transaction ID is checked again after relaunch and never regranted.

## Mandatory App Store Connect check before Archive

The IDs below were recovered from an earlier iOS StoreKit implementation in
commit `151cb92`. They are candidates, not confirmation of App Store Connect's
current registered IDs. Compare each ID and type with the actual products. If
anything differs, update the map in `js/phantom_shop.js` and rerun build/sync
and tests. Missing products are deliberately disabled.

| Shop item | Current requested Product ID | Expected type |
| --- | --- | --- |
| Complete pass | `com.arsene.remix.time_complete_pass` | Non-consumable |
| Ad skip licence | `com.arsene.remix.ad_skip_license` | Non-consumable |
| Ad skip tickets x10 | `com.arsene.remix.ad_skip_tickets_10` | Consumable |
| AUTO x3 licence | `com.arsene.remix.auto3_license` | Non-consumable |
| Sweep licence | `com.arsene.remix.sweep_license` | Non-consumable |
| Otherworld tickets x5 | `com.arsene.remix.otherworld_tickets_5` | Consumable |
| Rebirth arcana | `com.arsene.remix.rebirth_arcana_1` | Consumable |
| Protection arcana | `com.arsene.remix.protection_arcana_1` | Consumable |
| Blessed protection arcana | `com.arsene.remix.blessed_protection_arcana_1` | Consumable |

Check that every product is available for sale and attached to the iOS app,
the Paid Apps Agreement and banking/tax requirements are active, and the products
are submitted with the same app version when first required. These account
states could not be read from Windows. Product prices are fetched from StoreKit
for the iOS shop display; the hard-coded yen labels are only shown while the
product is unavailable and its button is disabled.

## Mac verification required

1. On the Mac, fetch this staging branch and merge it into the current iOS
   release branch without overwriting newer changes. Run `pnpm install
   --frozen-lockfile` and `pnpm run cap:sync` on macOS. Windows `cap sync` rewrites
   `CapApp-SPM/Package.swift` with invalid backslash paths; that generated change
   was intentionally not committed.
2. Compile in Xcode. Confirm `ArseneStoreKitPlugin.swift` and
   `ArseneBridgeViewController.swift` belong to the App target. Confirm the
   SceneDelegate's root view controller registers `ArseneStoreKit`.
3. With a Sandbox Apple Account on iPhone and iPad, test every product. Observe
   Apple's purchase sheet before grant; cancel, pending, offline, unavailable,
   duplicate tap, app restart during purchase, restore and repeated restoration.
   Consumables must grant once per transaction ID; the three licences and pass
   must restore. The in-game GOLD and 奏貨 shops must still work normally.
   For interrupted purchases, reopen Phantom Shop after relaunch to trigger the
   `Transaction.unfinished` check. For Ask to Buy / pending approval, do not
   grant before approval; reopen the shop after approval to confirm delivery.
   Simulate save failure only in a test build and confirm that the transaction
   stays unfinished until storage recovers. Confirm that a second tap while a
   purchase sheet is open does not trigger another request.
4. Archive with a new build number, upload to App Store Connect, associate that
   exact build and the required IAP products with the version, and reply to the
   reviewer with the tested purchase flow. Do not resubmit an older Archive.

Windows checks completed: JS syntax, iOS purchase regression, mobile app
regression, help regression, web build, iOS bundle verification (nine runtime
files and ten audio assets), and iOS release-ad verification. Xcode compilation,
Sandbox payment, App Store Connect agreement/product settings, upload and
resubmission remain unverified.

Important limitation: the product IDs in this branch are recovered historical
values, not verified App Store Connect values. Do not submit a build with all products
unavailable. A prior profile containing free grants cannot be distinguished
from a legitimate transferred save by this client-only change; do not remove
existing entitlements without a separate migration decision.


## Mac local verification — 2026-11-05

App Store Connect was inspected on the Mac: all nine registered product IDs
and consumable/non-consumable types match the table above. Their displayed
status was Ready to Submit (審査準備完了). This confirms the ID/type mapping,
not approval, sale availability, or completion of agreements/banking/tax.
The historical-ID warning above is superseded for ID/type matching only.

`pnpm run cap:sync`, the unsigned generic iOS Xcode build, the purchase/mobile/
help JS regressions and `scripts/verify-ios-release.mjs` passed on this Mac.

A shared `StoreKitVerification` XCTest scheme invokes the actual Capacitor
native plugin with a local nine-product StoreKit configuration. iPhone 17 Pro
simulator / iOS 26.5 / Xcode 26.6 results:

| Configuration | Passed cases | Failures |
| --- | --- | --- |
| Automatic (`_disableDialogs=true`, `_askToBuyEnabled=false`) | Nine product lookups and verified purchases/finish; unavailable ID and wrong type rejection; unfinished replay through a new plugin instance; stable repeated restoration | 0 (4 passed, 2 mode-specific skips) |
| Manual (`_disableDialogs=false`, `_askToBuyEnabled=false`) | Visible Xcode purchase sheet cancelled; result cancelled with no verified flag or transaction ID | 0 (1 passed, 5 mode-specific skips) |
| Pending (`_disableDialogs=true`, `_askToBuyEnabled=true`) | Ask to Buy returns pending with no verified flag or transaction ID | 0 (1 passed, 5 mode-specific skips) |

The automatic finish test allows up to four seconds for StoreKit's unfinished
sequence to reflect completion. It asserts that every finished transaction ID
has disappeared rather than assuming immediate consistency.

Run this scheme from the Xcode IDE. First Run App, then Stop and Test (Cmd-U).
To exercise another mode, edit the settings in
`ios/App/StoreKitVerification/Products.storekit`, Run/Stop again, then Test.
The committed configuration defaults to automatic mode. On this runtime,
SKTestSession mutations fail with SKInternalErrorDomain code 3 and CLI test
runs do not reliably synchronize the local configuration; IDE Run/Stop was
required. See Apple's forum report: https://developer.apple.com/forums/thread/826971

These are local test transactions with no charge. The manual sheet explicitly
identified Xcode local testing. They do not replace physical iPhone/iPad
Sandbox tests, gameplay shop UI end-to-end validation, offline/save-failure/
duplicate-tap checks, or approval of a pending transaction followed by delivery.
The native replay test recreates the bridge plugin; it does not kill/relaunch
the app process. JS persistence/dedup behavior is covered separately by the JS
regression suite. No new Archive, upload, or App Review resubmission has been
performed as part of this verification.


## Physical iPhone and upload — 2026-11-06

Device: iPhone 16 / iOS 26.6.2. Existing Library was backed up before
installing the development build; the gameplay save was preserved.
No Xcode StoreKit configuration was injected for the gameplay test.

- All nine products loaded from Apple; the storefront switched to JPY after
  signing in with the Japan Sandbox tester.
- Ad-skip tickets x10: Apple's sheet explicitly stated test-only/no charge.
  Purchase completed and gameplay balance changed from 0 to 10.
- Terminated and relaunched the app via devicectl, continued the existing save,
  reopened the shop, and confirmed the balance remained exactly 10.
- The persisted profile contains one new premiumTransactions entry for this
  ticket purchase. Cancellation before the successful purchase had left 0.
- Restore Purchases authenticated with Apple and reported no restorable
  purchases, as expected before any non-consumable Sandbox purchase.
- Existing saved non-consumable licence flags predate this test and are not
  evidence of verified Sandbox non-consumable purchases. A positive native
  non-consumable purchase/restore test remains in progress, pending device
  password confirmation. Do not count old saved flags as test success.

Release tree matches integrated origin/feature/ios-capacitor c935b0740e026f769c484ca9918347ab2030e45a
except Capacitor's regenerated minimum-platform declaration (iOS 15 to 16).
macOS cap:sync completed, purchase/mobile/help regressions and iOS release ads
verification passed. Archive 1.0 (27) built successfully, verified bundle ID
com.arsene.remix, UIRequiresFullScreen=true, no bundled XCTest plugins.
App Store Connect previously showed maximum build 26 for version 1.0.
Build 27 upload succeeded at 18:44 JST; processing/build selection and
resubmission are not yet complete. Third-party GoogleMobileAds and
UserMessagingPlatform dSYM upload warnings were nonfatal.

Apple displays a new Paid Applications Schedule that must be accepted before
updating apps. Acceptance has been requested from the user and is pending.
The updated App Review note describes the StoreKit fix and only proven test
results; all nine IAPs remain attached to the existing submission.


### Follow-up — 2026-11-06 19:10 JST

The user accepted the updated Paid Applications Schedule in Chrome; the
Business page now shows Paid Apps Agreement active for Nov 6, 2026–Aug 31,
2027. Build 27 completed Apple processing. Export-compliance answers were
saved and it is Ready to Submit. Version 1.0's selected build was changed
from 26 to 27 and saved. The review submission has not been resubmitted.

The physical native non-consumable attempt returned cancelled (not verified);
the restore-positive assertion therefore failed. This is not proof of a
successful purchase or restoration. The test now checks purchase verification
before asserting restoration, so cancellation cannot be mistaken for a
restore defect. A retry requires completing the actual Apple Sandbox sheet
on the device. Local native non-consumable/restore tests remain passing as
previously recorded. No production runtime code changed in this follow-up.
