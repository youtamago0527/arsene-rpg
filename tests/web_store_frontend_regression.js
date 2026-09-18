const assert = require('node:assert/strict');
const fs = require('node:fs');

const shop = fs.readFileSync('js/phantom_shop.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
assert.match(shop, /if \(this\.isWebStore\(\)\) return this\.purchaseWeb\(id\)/);
assert.match(shop, /store\.purchase\(\{ productId: storeInfo\.productId \}\)/, 'native purchases must stay on StoreKit');
assert.match(shop, /return !window\.Capacitor\?\.isNativePlatform\?\.\(\)/, 'Capacitor native must never select Stripe');
assert.match(shop, /checkout\.stripe\.com/);
assert.doesNotMatch(index, /stripe\.com|js\.stripe/, 'no direct Stripe browser SDK may enter the shared/iOS index');
assert.match(shop, /webProcessedDeliveries/);
assert.match(shop, /claim-confirm/);
assert.match(shop, /handleCheckoutReturn\(\); await shop\.loadWebStore\(\)/, 'unclaimed purchases must recover on every startup');
assert.match(shop, /this\.isWebStore\(\) \? '<button[^']+restore-key/,
  'the restore-key control must not render on native iOS');
assert.match(shop, /href="\/legal\/"[^>]*>特定商取引法に基づく表記/,
  'the browser shop must link directly to the commerce disclosure');
assert.match(fs.readFileSync('scripts/build-web.mjs', 'utf8'), /'legal'/,
  'the legal disclosure must ship in the browser build');
console.log('Web store frontend/native separation regression checks passed.');
