const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const startFlow = fs.readFileSync(path.join(root, 'js', 'start-flow.js'), 'utf8');
const infoPlist = fs.readFileSync(path.join(root, 'ios', 'App', 'App', 'Info.plist'), 'utf8');

assert.doesNotMatch(startFlow, /07-noel-takes-luna|08-sora-luna-gate/, 'ルナ連れ去りシーンをOPへ再混入させない');
assert.doesNotMatch(startFlow, /この娘は、もらっていく|お姉ちゃん！|ルナを奪い返し/, '削除した連れ去り筋書きの文言を残さない');
assert.doesNotMatch(startFlow, /成人した双子/, '物語中に説明的な成人表記を追加しない');
assert.doesNotMatch(infoPlist, /WKAppBoundDomains|ITSAppUsesNonExemptEncryption.*kids/i, 'Info.plistに子供向け指定を混入させない');

console.log('App Store age/content regression checks passed.');
