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
are rechecked when the shop opens.

## Mandatory App Store Connect check before Archive

`iosProductId(id)` currently uses the shop item slug as the App Store product ID.
Compare every ID below with the actual App Store Connect Product ID. If any ID
differs, update `iosProductId` in `js/phantom_shop.js` with an explicit mapping,
then rerun build/sync and tests. Missing products are deliberately disabled.

| Shop item | Current requested Product ID | Expected type |
| --- | --- | --- |
| Complete pass | `time-complete-pass` | Non-consumable |
| Ad skip licence | `ad-skip-license` | Non-consumable |
| Ad skip tickets x10 | `ad-skip-tickets` | Consumable |
| AUTO x3 licence | `auto3-license` | Non-consumable |
| Sweep licence | `sweep-license` | Non-consumable |
| Otherworld tickets x5 | `otherworld-tickets` | Consumable |
| Rebirth arcana | `rebirth-arcana` | Consumable |
| Protection arcana | `protection-arcana` | Consumable |
| Blessed protection arcana | `blessed-protection-arcana` | Consumable |

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
4. Archive with a new build number, upload to App Store Connect, associate that
   exact build and the required IAP products with the version, and reply to the
   reviewer with the tested purchase flow. Do not resubmit an older Archive.

Windows checks completed: JS syntax, iOS purchase regression, mobile app
regression, help regression, web build, iOS bundle verification (nine runtime
files and ten audio assets), and iOS release-ad verification. Xcode compilation,
Sandbox payment, App Store Connect agreement/product settings, upload and
resubmission remain unverified.
