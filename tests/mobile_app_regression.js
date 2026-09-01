const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const safeArea = read('css/ios-safe-area.css');
const fixes = read('css/fixes.css');
const plist = read('ios/App/App/Info.plist');
const buildScript = read('scripts/build-web.mjs');
const capacitor = JSON.parse(read('capacitor.config.json'));

assert.match(html, /width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover/);
assert.match(html, /Capacitor\?\.isNativePlatform/);
assert.match(html, /classList\.add\('capacitor-native'\)/);
assert.match(html, /ios-safe-area\.css\?v=\d+\.\d+\.\d+/);
assert.match(html, /fixes\.css\?v=\d+\.\d+\.\d+/);

assert.match(safeArea, /--safe-top:env\(safe-area-inset-top,0px\)/);
assert.match(safeArea, /--app-viewport-height:100dvh/);
assert.match(safeArea, /html\.capacitor-native,html\.capacitor-native body/);
assert.match(safeArea, /position:fixed/);
assert.match(safeArea, /overscroll-behavior:none/);
assert.match(safeArea, /#game\.game-shell/);
assert.match(safeArea, /padding-bottom:max\(7px,var\(--safe-bottom\)\)/);

assert.match(fixes, /@media\(max-width:360px\)/);
assert.match(fixes, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);

const phoneOrientation = plist.match(/<key>UISupportedInterfaceOrientations<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1] || '';
const tabletOrientation = plist.match(/<key>UISupportedInterfaceOrientations~ipad<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1] || '';
for (const section of [phoneOrientation, tabletOrientation]) {
  assert(section.includes('UIInterfaceOrientationPortrait'), 'portrait must be supported');
  assert(!section.includes('Landscape'), 'landscape must remain disabled for the fixed game canvas');
  assert(!section.includes('PortraitUpsideDown'), 'upside-down must remain disabled');
}

assert.equal(capacitor.webDir, 'dist');
assert.equal(capacitor.server?.iosScheme, 'https');
assert(!buildScript.includes('readdir(root'), 'unreferenced root artwork must not be copied into the native bundle');

const localRefs = [...html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)]
  .map(match => match[1])
  .filter(ref => !/^(?:https?:|data:|#)/.test(ref));
for (const ref of localRefs) {
  assert(fs.existsSync(path.join(root, ref)), `missing local runtime asset: ${ref}`);
}

console.log('mobile app regression: ok');
