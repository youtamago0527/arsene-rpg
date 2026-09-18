# Web Stripe / D1 release setup

This repository keeps the native iOS shop on StoreKit. Stripe is used only when
`Capacitor.isNativePlatform()` is false. Do not add Stripe checkout links or a Stripe
SDK to the iOS project.

## 1. Stripe catalog

Create nine active, one-time Stripe Prices in JPY. Keep the Price IDs outside the
public bundle and configure these Cloudflare environment variables separately for
Preview and Production:

| Item | Variable |
| --- | --- |
| 怪盗の時短パス COMPLETE | `STRIPE_PRICE_TIME_COMPLETE_PASS` |
| 広告スキップライセンス | `STRIPE_PRICE_AD_SKIP_LICENSE` |
| 広告スキップチケット ×10 | `STRIPE_PRICE_AD_SKIP_TICKETS_10` |
| AUTO×3 常設ライセンス | `STRIPE_PRICE_AUTO3_LICENSE` |
| 一掃 常設ライセンス | `STRIPE_PRICE_SWEEP_LICENSE` |
| 異世界探索券 ×5 | `STRIPE_PRICE_OTHERWORLD_TICKETS_5` |
| 輪廻のアルカナ ×1 | `STRIPE_PRICE_REBIRTH_ARCANA_1` |
| 保護のアルカナ ×1 | `STRIPE_PRICE_PROTECTION_ARCANA_1` |
| 祝福された保護のアルカナ ×1 | `STRIPE_PRICE_BLESSED_PROTECTION_ARCANA_1` |

Set `STRIPE_CURRENCY=jpy` and set `STRIPE_LIVEMODE=false` while testing. Change it
to `true` only with live keys and live Price IDs. The catalog endpoint reads Stripe's
actual formatted Price values, so the browser does not trust hard-coded prices.

## 2. Cloudflare Pages and D1

Create one D1 database per environment and bind it to the Pages project as
`STORE_DB` (Settings > Bindings > D1 database). Apply `migrations/0001_web_store.sql`
to each database before enabling checkout. Set the non-secret variable
`STORE_ALLOWED_ORIGINS` to the exact comma-separated HTTPS origins allowed to start
checkout. Do not use `*`.

Add encrypted secrets in the Pages dashboard (or with Wrangler):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Never put either value in source, `wrangler.toml`, screenshots, or client JavaScript.
For an existing Pages project, run `pnpm exec wrangler pages download config
<PAGES_PROJECT_NAME>` first so the checked-out PC has the project's binding names;
review the downloaded file and never commit downloaded secrets.

## 3. Webhook

Create a Stripe webhook endpoint at:

`https://<production-origin>/api/store/webhook`

Subscribe to `checkout.session.completed` and
`checkout.session.async_payment_succeeded`. Copy that endpoint's signing secret to
`STRIPE_WEBHOOK_SECRET`. The endpoint verifies `Stripe-Signature` against the raw
request body and then retrieves the Checkout Session from Stripe. Delivery requires
one paid line item, the configured Price ID, quantity 1, `mode=payment`,
`status=complete`, matching live/test mode, and a paid payment status.

## 4. Migration and deployment from another PC

Install Node and pnpm, clone the same commit, authenticate Wrangler, and then run:

```sh
pnpm install --frozen-lockfile
pnpm test:web-store
pnpm run build
pnpm exec wrangler d1 migrations apply <D1_DATABASE_NAME> --remote
pnpm exec wrangler pages deploy dist --project-name <PAGES_PROJECT_NAME>
```

Pages Functions in `functions/` deploy with the project. The D1 binding and all
environment variables/secrets must already exist on that Pages project. First deploy
to Preview with test-mode Stripe keys, complete all checks below, and only then repeat
for Production/live mode.

## 5. Release checks

1. Confirm the catalog returns all nine products and matches Stripe Dashboard prices.
2. Test success and cancel; cancel and unpaid/asynchronous-pending sessions grant nothing.
3. Replay the same webhook and claim the same session twice; it must grant once.
4. Change quantity or Price ID in a Stripe test fixture; webhook validation must reject it.
5. Close the browser after paying but before redirect, reopen it, and verify recovery.
6. Copy the displayed high-entropy restore key to another browser and verify permanent
   entitlements plus not-yet-delivered purchases restore. Treat the key like a password.
7. Build/sync iOS and run `pnpm test:web-store`; native purchase must still invoke only
   `ArseneStoreKit`, and the native UI must not show the Web restore-key control.

Claim confirmation happens only after the game has saved the delivery locally. A local
delivery ledger prevents a crash between save and confirmation from applying the same
session twice. D1's unique session, PaymentIntent, and event keys make webhook retries
idempotent.
