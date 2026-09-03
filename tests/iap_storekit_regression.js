const assert = require('node:assert/strict');
const fs = require('node:fs');

const shop = fs.readFileSync('js/phantom_shop.js', 'utf8');
const plugin = fs.readFileSync('ios/App/App/ArseneStoreKitPlugin.swift', 'utf8');
const scene = fs.readFileSync('ios/App/App/SceneDelegate.swift', 'utf8');
const project = fs.readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');

const productIds = [
  'time_complete_pass', 'ad_skip_license', 'ad_skip_tickets_10', 'auto3_license',
  'sweep_license', 'otherworld_tickets_5', 'rebirth_arcana_1',
  'protection_arcana_1', 'blessed_protection_arcana_1'
];
for (const id of productIds) assert(shop.includes(`com.arsene.remix.${id}`), `missing product id: ${id}`);

assert.match(shop, /await store\.purchase\(\{ productId: storeInfo\.productId \}\)/);
assert.match(shop, /p\.processedTransactions\[txId\]/);
assert.match(shop, /g\.saveProfile\?\.\(\);[\s\S]*await store\.finish\(\{ transactionId: txId \}\)/);
assert.match(shop, /async restorePurchases\(\)/);
assert.match(shop, /iOSアプリ限定/);
assert.doesNotMatch(shop, /purchase\(id\) \{/, 'purchase must remain asynchronous and StoreKit-gated');

for (const method of ['getProducts', 'purchase', 'restore', 'getUnfinished', 'finish']) {
  assert(plugin.includes(`CAPPluginMethod(name: "${method}"`), `native method missing: ${method}`);
}
assert.match(plugin, /case \.verified\(let transaction\)/);
assert.match(plugin, /Transaction\.unfinished/);
assert.match(plugin, /Transaction\.currentEntitlements/);
assert.match(plugin, /await transaction\.finish\(\)/);
assert.match(scene, /registerPluginInstance\(ArseneStoreKitPlugin\(\)\)/);
assert.match(project, /ArseneStoreKitPlugin\.swift in Sources/);

console.log('iap StoreKit regression: ok');
