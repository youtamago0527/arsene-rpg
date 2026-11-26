const assert=require('node:assert/strict');
const fs=require('node:fs');
const support=fs.readFileSync('js/infinite_support.js','utf8');
const offer=fs.readFileSync('js/q_offer.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert.match(support,/arseneAdMob\?\.isNativeIOS/,'支援はiOSアプリ版だけに表示する');
assert.match(support,/arseneQOffer\.show/,'既存の共通広告・スキップ基盤を利用する');
assert.match(support,/bagExpansionUsed/,'RUN単位のバッグ拡張利用状態を保存する');
assert.match(support,/Math\.max\(base,33\)/,'緊急拡張は最大33枠にする');
assert.match(support,/shopCounter/,'ショップ遭遇単位のIDを保存する');
assert.match(support,/rerollUsed/,'同一ショップで再抽選を一度に制限する');
assert.match(support,/Array\.from\(\{length:shopDrawCount\},\(\)=>this\.isGenerateGear\(\)\)/,'通常装備生成テーブルで再抽選する');
assert.doesNotMatch(offer,/infiniteInsurance/);
assert.doesNotMatch(support,/isGrantInsurance|isShowInsuranceResult/);
assert.match(offer,/infiniteReroll[\s\S]*infiniteBag/);
assert.match(index,/q_offer\.js[^\n]+[\s\S]*infinite_support\.js/,'共通広告基盤の後に支援処理を読み込む');
assert.doesNotMatch(support,/adSkipLicense\s*=/,'専用課金や既存購入権を上書きしない');
console.log('infinite support regression: ok');
