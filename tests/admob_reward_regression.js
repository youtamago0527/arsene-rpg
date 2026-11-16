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
assert.match(bridge, /requestConsentInfo\(\)[\s\S]*showConsentForm\(\)[\s\S]*canRequestAds/, '同意確認後だけ広告を要求する');
assert.match(bridge, /showPrivacyOptionsForm\(\)/, '広告プライバシー設定を再表示できる');
assert.match(offer, /showAd\.then\(rewarded => \{[\s\S]*if \(generation !== offerGeneration\) return;[\s\S]*if \(!rewarded\)[\s\S]*return;[\s\S]*api\.grant\(type\)/, '広告成功と現行generationの両方を満たした時だけ付与する');
const appPublisher = plist.match(/<key>GADApplicationIdentifier<\/key>\s*<string>ca-app-pub-(\d+)~\d+<\/string>/)?.[1];
const rewardedMatch = bridge.match(/const IOS_REWARDED_AD_ID = '(ca-app-pub-(\d+)\/\d+)'/);
assert.ok(appPublisher, '有効なiOS AdMob App IDを設定する');
assert.ok(rewardedMatch, '有効なRewarded Ad Unit IDを設定する');
assert.equal(rewardedMatch[2], appPublisher, 'App IDと広告ユニットIDのパブリッシャーを一致させる');
const rewardedId = rewardedMatch[1];

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

  let deniedPrepareCalls = 0;
  const deniedPlugin = {
    async initialize() {},
    async requestConsentInfo() { return { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false }; },
    async showConsentForm() { return { status: 'OBTAINED', canRequestAds: false }; },
    async prepareRewardVideoAd() { deniedPrepareCalls++; }
  };
  const deniedWindow = { addEventListener() {}, Capacitor:{ isNativePlatform:()=>true, getPlatform:()=> 'ios', isPluginAvailable:()=>true, Plugins:{AdMob:deniedPlugin} } };
  vm.runInNewContext(bridge, { window:deniedWindow, console, setTimeout, clearTimeout });
  assert.equal(await deniedWindow.arseneAdMob.showRewarded(), false, '広告リクエスト不可なら表示しない');
  assert.equal(deniedPrepareCalls, 0, '同意ゲート前に広告をロードしない');

  const listeners = new Map();
  let initializeCalls = 0;
  const plugin = {
    async initialize() { initializeCalls++; },
    async requestConsentInfo() { return { status: 'NOT_REQUIRED', canRequestAds: true }; },
    async showPrivacyOptionsForm() {},
    async addListener(name, callback) {
      listeners.set(name, callback);
      return { remove: async () => { if (listeners.get(name) === callback) listeners.delete(name); } };
    },
    async prepareRewardVideoAd(options) { assert.equal(options.adId, rewardedId); assert.equal(options.isTesting, true, '診断ビルドのみGoogle公式テスト広告を要求する'); },
    async showRewardVideoAd() {}
  };
  const stages = [];
  const nativeWindow = {
    addEventListener() {},
    arseneAdMobDiagnostic: { record: (stage, detail) => stages.push({ stage, detail }) },
    Capacitor: {
      isNativePlatform: () => true,
      getPlatform: () => 'ios',
      isPluginAvailable: name => name === 'AdMob',
      Plugins: { AdMob: plugin }
    }
  };
  const warnings = [];
  vm.runInNewContext(bridge, { window: nativeWindow, console: { ...console, warn: (...args) => warnings.push(args) }, setTimeout, clearTimeout });
  const first = nativeWindow.arseneAdMob.showRewarded();
  assert.equal(await nativeWindow.arseneAdMob.showRewarded(), false, '広告表示中の二重要求を拒否する');
  await new Promise(resolve => setImmediate(resolve));
  const rewardCallback = listeners.get('onRewardedVideoAdReward');
  listeners.get('onRewardedVideoAdShowed')?.();
  rewardCallback?.({ amount: 1, type: 'reward' });
  rewardCallback?.({ amount: 1, type: 'reward' });
  assert.equal(await first, true, 'Rewardedイベントで一度だけ成功する');
  assert.equal(initializeCalls, 1, 'SDK初期化を再利用する');
  for (const stage of ['initializing', 'initialized', 'consent', 'loading', 'loaded', 'showing', 'shown', 'reward', 'result']) {
    assert(stages.some(entry => entry.stage === stage), `${stage}を画面診断へ通知する`);
  }

  const dismissed = nativeWindow.arseneAdMob.showRewarded();
  await new Promise(resolve => setImmediate(resolve));
  listeners.get('onRewardedVideoAdDismissed')?.();
  assert.equal(await dismissed, false, '途中dismissでは成功しない');

  const failedLoad = nativeWindow.arseneAdMob.showRewarded();
  await new Promise(resolve => setImmediate(resolve));
  listeners.get('onRewardedVideoAdFailedToLoad')?.({ code: 3, message: 'No fill' });
  assert.equal(await failedLoad, false, 'ロード失敗では成功しない');
  assert(warnings.some(([message, detail]) => message.includes('load failed: No fill') && detail?.code === 3), 'ロード失敗のコードとメッセージを記録する');

  const failedShow = nativeWindow.arseneAdMob.showRewarded();
  await new Promise(resolve => setImmediate(resolve));
  listeners.get('onRewardedVideoAdFailedToShow')?.({ code: 0, message: 'Presentation failed' });
  assert.equal(await failedShow, false, '表示失敗では成功しない');
  assert(warnings.some(([message, detail]) => message.includes('show failed: Presentation failed') && detail?.code === 0), '表示失敗のコードとメッセージを記録する');

  let timeoutCallback = null;
  const timeoutListeners = new Map();
  const timeoutPlugin = {
    async initialize() {},
    async requestConsentInfo() { return { status: 'NOT_REQUIRED', canRequestAds: true }; },
    async addListener(name, callback) { timeoutListeners.set(name, callback); return { remove: async () => timeoutListeners.delete(name) }; },
    async prepareRewardVideoAd() {},
    async showRewardVideoAd() {}
  };
  const timeoutWindow = { addEventListener() {}, Capacitor:{ isNativePlatform:()=>true, getPlatform:()=> 'ios', isPluginAvailable:()=>true, Plugins:{AdMob:timeoutPlugin} } };
  vm.runInNewContext(bridge, { window:timeoutWindow, console, setTimeout:callback => { timeoutCallback=callback; return 1; }, clearTimeout(){} });
  const timedOut = timeoutWindow.arseneAdMob.showRewarded();
  await new Promise(resolve => setImmediate(resolve));
  timeoutCallback?.();
  assert.equal(await timedOut, false, 'タイムアウトでは成功しない');
  console.log('AdMob reward regression checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
