/* iOS AdMob bridge. Browser builds never call the native plugin. */
(function () {
  const IOS_REWARDED_AD_ID = 'ca-app-pub-2798969445522147/5643677056';
  // Diagnostic branch only. The native plugin substitutes Google's official iOS rewarded test unit.
  const DIAGNOSTIC_TEST_ADS = true;
  const events = {
    rewarded: 'onRewardedVideoAdReward',
    dismissed: 'onRewardedVideoAdDismissed',
    failedToLoad: 'onRewardedVideoAdFailedToLoad',
    failedToShow: 'onRewardedVideoAdFailedToShow'
  };
  let initialization = null;
  let requestInFlight = false;
  let canRequestAds = false;
  const report = (stage, detail = {}) => window.arseneAdMobDiagnostic?.record?.(stage, detail);
  const logFailure = (stage, detail) => {
    const message = typeof detail === 'string' ? detail : detail?.message || detail?.localizedDescription || 'unknown';
    console.warn(`AdMob rewarded ${stage}: ${message}`, {
      code: detail?.code ?? null,
      adUnitId: IOS_REWARDED_AD_ID
    });
    report('error', { stage, code: detail?.code ?? null, message });
  };

  function capacitor() { return window.Capacitor; }
  function isNativeIOS() {
    const cap = capacitor();
    return !!(cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'ios');
  }
  function plugin() {
    const cap = capacitor();
    if (!isNativeIOS() || !cap?.isPluginAvailable?.('AdMob')) return null;
    return cap.Plugins?.AdMob || null;
  }
  async function initialize() {
    const admob = plugin();
    if (!admob) {
      if (isNativeIOS()) logFailure('unavailable', 'native AdMob plugin is not registered');
      return false;
    }
    if (!initialization) initialization = (async () => {
      let sdkReady = false;
      try {
        report('initializing');
        await admob.initialize();
        sdkReady = true;
        report('initialized');
        let consent = await admob.requestConsentInfo();
        report('consent', { status: consent?.status, canRequestAds: consent?.canRequestAds });
        if (consent?.isConsentFormAvailable && consent?.status === 'REQUIRED') {
          consent = await admob.showConsentForm();
          report('consent', { status: consent?.status, canRequestAds: consent?.canRequestAds });
        }
        canRequestAds = consent?.canRequestAds === true;
        if (!canRequestAds) {
          logFailure('consent', `ads cannot be requested (status: ${consent?.status || 'unknown'})`);
          initialization = null;
        }
        return canRequestAds;
      } catch (error) {
        initialization = null;
        canRequestAds = false;
        logFailure('initialization or consent failed', error);
        if (DIAGNOSTIC_TEST_ADS && sdkReady && String(error?.code) === '4') {
          report('consent-bypass', { reason: 'UMP form missing', testAdOnly: true });
          return true;
        }
        return false;
      }
    })();
    return initialization;
  }
  async function showPrivacyOptions() {
    const admob = plugin();
    if (!admob) return false;
    await initialize();
    try {
      await admob.showPrivacyOptionsForm();
      const consent = await admob.requestConsentInfo();
      canRequestAds = consent?.canRequestAds === true;
      initialization = Promise.resolve(canRequestAds);
      return true;
    } catch (error) {
      console.warn('AdMob privacy options failed.', error);
      return false;
    }
  }
  async function showRewarded() {
    if (requestInFlight) return false;
    const admob = plugin();
    if (!admob) { logFailure('unavailable', 'native iOS AdMob bridge is unavailable'); return false; }
    requestInFlight = true;
    if (!await initialize()) { requestInFlight = false; report('result', { rewarded: false }); return false; }
    const handles = [];
    let settled = false;
    let timeout = null;
    const cleanup = async () => {
      clearTimeout(timeout);
      requestInFlight = false;
      await Promise.allSettled(handles.map(handle => handle?.remove?.()));
    };
    return new Promise(async resolve => {
      const finish = async rewarded => {
        if (settled) return;
        settled = true;
        await cleanup();
        report('result', { rewarded });
        resolve(rewarded);
      };
      timeout = setTimeout(() => { logFailure('timeout', 'no reward or dismissal callback within 120 seconds'); finish(false); }, 120000);
      try {
        handles.push(await admob.addListener(events.rewarded, reward => { report('reward', reward); finish(true); }));
        handles.push(await admob.addListener(events.dismissed, () => { report('dismissed'); finish(false); }));
        handles.push(await admob.addListener('onRewardedVideoAdShowed', () => report('shown')));
        handles.push(await admob.addListener(events.failedToLoad, error => { logFailure('load failed', error); finish(false); }));
        handles.push(await admob.addListener(events.failedToShow, error => { logFailure('show failed', error); finish(false); }));
        report('loading', { testAd: DIAGNOSTIC_TEST_ADS });
        await admob.prepareRewardVideoAd({ adId: IOS_REWARDED_AD_ID, isTesting: DIAGNOSTIC_TEST_ADS });
        report('loaded');
        if (!settled) {
          report('showing');
          admob.showRewardVideoAd().catch(error => { logFailure('show rejected', error); finish(false); });
        }
      } catch (error) {
        logFailure('load or listener registration failed', error);
        await finish(false);
      }
    });
  }

  window.arseneAdMob = { isNativeIOS, initialize, showRewarded, showPrivacyOptions, diagnosticTestAds: DIAGNOSTIC_TEST_ADS };
  window.addEventListener('load', () => { if (isNativeIOS()) initialize(); });
})();
