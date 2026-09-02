const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

const bridge = readFileSync('js/admob.js', 'utf8');
const offer = readFileSync('js/q_offer.js', 'utf8');
const plist = readFileSync('ios/App/App/Info.plist', 'utf8');

assert.match(bridge, /isNativePlatform\?\.\(\)[\s\S]*getPlatform\?\.\(\) === 'ios'/, 'native iOSだけでAdMobを利用する');
assert.match(bridge, /isPluginAvailable\?\.\('AdMob'\)/, '未登録プラグインを呼ばない');
assert.match(bridge, /onRewardedVideoAdReward[\s\S]*finish\(true\)/, 'Rewardedイベントだけを成功扱いする');
assert.match(bridge, /onRewardedVideoAdDismissed[\s\S]*finish\(false\)/, '途中dismissでは報酬を付与しない');
assert.match(bridge, /requestInFlight[\s\S]*if \(requestInFlight\) return false/, '広告要求の多重起動を防ぐ');
assert.match(offer, /showAd\.then\(rewarded => \{[\s\S]*if \(generation !== offerGeneration\) return;[\s\S]*if \(!rewarded\)[\s\S]*return;[\s\S]*api\.grant\(type\)/, '広告成功と現行generationの両方を満たした時だけ付与する');
assert.match(plist, /<key>GADApplicationIdentifier<\/key>\s*<string>ca-app-pub-3940256099942544~1458002511<\/string>/, '公式iOSテストApp IDを設定する');
assert.doesNotMatch(`${bridge}\n${plist}`, /ca-app-pub-(?!3940256099942544)[0-9]+[~/][0-9]+/, 'Google公式テスト以外の広告IDを含めない');

(async () => {
  let browserPluginRead = false;
  const browserWindow = {
    addEventListener() {},
    Capacitor: {
      isNativePlatform: () => false,
      getPlatform: () => 'web',
      isPluginAvailable: () => { throw new Error('browser must not inspect native plugins'); },
      get Plugins() { browserPluginRead = true; throw new Error('browser must not read native plugins'); }
    }
  };
  vm.runInNewContext(bridge, { window: browserWindow, console, setTimeout, clearTimeout });
  assert.equal(await browserWindow.arseneAdMob.initialize(), false, 'ブラウザでは初期化しない');
  assert.equal(await browserWindow.arseneAdMob.showRewarded(), false, 'ブラウザでは広告を表示しない');
  assert.equal(browserPluginRead, false, 'ブラウザでプラグインを参照しない');

  const listeners = new Map();
  let initializeCalls = 0;
  const plugin = {
    async initialize() { initializeCalls++; },
    async addListener(name, callback) {
      listeners.set(name, callback);
      return { remove: async () => { if (listeners.get(name) === callback) listeners.delete(name); } };
    },
    async prepareRewardVideoAd(options) { assert.equal(options.adId, 'ca-app-pub-3940256099942544/1712485313'); },
    async showRewardVideoAd() {}
  };
  const nativeWindow = {
    addEventListener() {},
    Capacitor: {
      isNativePlatform: () => true,
      getPlatform: () => 'ios',
      isPluginAvailable: name => name === 'AdMob',
      Plugins: { AdMob: plugin }
    }
  };
  vm.runInNewContext(bridge, { window: nativeWindow, console, setTimeout, clearTimeout });
  const first = nativeWindow.arseneAdMob.showRewarded();
  assert.equal(await nativeWindow.arseneAdMob.showRewarded(), false, '広告表示中の二重要求を拒否する');
  await new Promise(resolve => setImmediate(resolve));
  listeners.get('onRewardedVideoAdReward')?.({ amount: 1, type: 'reward' });
  assert.equal(await first, true, 'Rewardedイベントで一度だけ成功する');
  assert.equal(initializeCalls, 1, 'SDK初期化を再利用する');

  const dismissed = nativeWindow.arseneAdMob.showRewarded();
  await new Promise(resolve => setImmediate(resolve));
  listeners.get('onRewardedVideoAdDismissed')?.();
  assert.equal(await dismissed, false, '途中dismissでは成功しない');
  console.log('AdMob reward regression checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
