const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const safeArea = read('css/ios-safe-area.css');
const fixes = read('css/fixes.css');
const plist = read('ios/App/App/Info.plist');
const appDelegate = read('ios/App/App/AppDelegate.swift');
const buildScript = read('scripts/build-web.mjs');
const packageJson = JSON.parse(read('package.json'));
const bundleVerifier = read('scripts/verify-ios-bundle.mjs');
const audio = read('js/audio-runtime-20260904.js');
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
assert.match(safeArea, /min-height:var\(--battle-console-stable-height,0px\)/);
assert.match(read('js/game.js'), /--battle-console-stable-height/);

assert.match(fixes, /@media\(max-width:360px\)/);
assert.match(fixes, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);

const phoneOrientation = plist.match(/<key>UISupportedInterfaceOrientations<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1] || '';
const tabletOrientation = plist.match(/<key>UISupportedInterfaceOrientations~ipad<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1] || '';
for (const section of [phoneOrientation, tabletOrientation]) {
  for (const orientation of ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationPortraitUpsideDown', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight']) {
    assert(section.includes(orientation), `App Store orientation declaration is missing: ${orientation}`);
  }
}
assert.match(appDelegate, /supportedInterfaceOrientationsFor[\s\S]*return \.portrait/, 'runtime UI must remain portrait-only');

assert.equal(capacitor.webDir, 'dist');
assert.equal(capacitor.server?.iosScheme, 'https');
assert(!buildScript.includes('readdir(root'), 'unreferenced root artwork must not be copied into the native bundle');
assert.match(packageJson.scripts['cap:sync'], /verify-ios-bundle\.mjs/);
assert.match(bundleVerifier, /stale iOS bundle/);
assert.match(bundleVerifier, /css\/battle-ui-v2\.css/);
assert.match(bundleVerifier, /js\/audio-runtime-20260904\.js/);
assert.match(bundleVerifier, /forbiddenNativeAssets/);
assert.match(audio, /AUDIO_ASSET_VERSION/);
assert.match(audio, /searchParams\.set\('av'/);
assert.match(audio, /visibilitychange/);
assert.doesNotMatch(audio, /await this\.preloadSfxFiles\(\)/, 'user gesture must not wait for SFX downloads before resuming audio');
assert.match(audio, /if \(!this\.ctx\) this\.unlock\(\)/, 'SFX calls must recover an uninitialized iOS AudioContext');
assert.match(audio, /未準備の初回だけは同名の合成音を即時再生/, 'sample decode delay must fall back to synthesized SFX immediately');
assert.doesNotMatch(audio, /sfxReady\s*\?*\.then\(\(\)\s*=>\s*\{?\s*if\s*\(!this\.playSfxFile/, 'an old combat SFX must not replay after its animation');

const localRefs = [...html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)]
  .map(match => match[1])
  .filter(ref => !/^(?:https?:|data:|#)/.test(ref));
for (const ref of localRefs) {
  assert(fs.existsSync(path.join(root, ref)), `missing local runtime asset: ${ref}`);
}

console.log('mobile app regression: ok');
