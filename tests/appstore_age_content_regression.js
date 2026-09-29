const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const startFlow = fs.readFileSync(path.join(root, 'js', 'start-flow.js'), 'utf8');
const infoPlist = fs.readFileSync(path.join(root, 'ios', 'App', 'App', 'Info.plist'), 'utf8');

assert.match(startFlow, /成人した双子の姉妹ルナとソラ/, 'ルナとソラが成人であることをOP内で明示する');
assert.doesNotMatch(startFlow, /この娘は、もらっていく/, '連れ去り対象を年少者に見せる「この娘」表現を残さない');
assert.doesNotMatch(startFlow, /お姉ちゃん！/, '年少者同士と誤認されやすい呼称を連れ去り場面に残さない');
assert.doesNotMatch(infoPlist, /WKAppBoundDomains|ITSAppUsesNonExemptEncryption.*kids/i, 'Info.plistに子供向け指定を混入させない');

console.log('App Store age/content regression checks passed.');
