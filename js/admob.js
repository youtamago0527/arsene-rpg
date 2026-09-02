/* iOS AdMob bridge. Browser builds never call the native plugin. */
(function () {
  const IOS_REWARDED_TEST_ID = 'ca-app-pub-3940256099942544/1712485313';
  const events = {
    rewarded: 'onRewardedVideoAdReward',
    dismissed: 'onRewardedVideoAdDismissed',
    failedToLoad: 'onRewardedVideoAdFailedToLoad',
    failedToShow: 'onRewardedVideoAdFailedToShow'
  };
  let initialization = null;
  let requestInFlight = false;

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
    if (!admob) return false;
    if (!initialization) initialization = admob.initialize().then(() => true).catch(error => {
      initialization = null;
      console.warn('AdMob initialization failed.', error);
      return false;
    });
    return initialization;
  }
  async function showRewarded() {
    if (requestInFlight) return false;
    const admob = plugin();
    if (!admob) return false;
    requestInFlight = true;
    if (!await initialize()) { requestInFlight = false; return false; }
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
        resolve(rewarded);
      };
      timeout = setTimeout(() => finish(false), 120000);
      try {
        handles.push(await admob.addListener(events.rewarded, () => finish(true)));
        handles.push(await admob.addListener(events.dismissed, () => finish(false)));
        handles.push(await admob.addListener(events.failedToLoad, () => finish(false)));
        handles.push(await admob.addListener(events.failedToShow, () => finish(false)));
        await admob.prepareRewardVideoAd({ adId: IOS_REWARDED_TEST_ID });
        if (!settled) admob.showRewardVideoAd().catch(() => finish(false));
      } catch (error) {
        console.warn('Rewarded ad failed.', error);
        await finish(false);
      }
    });
  }

  window.arseneAdMob = { isNativeIOS, initialize, showRewarded, rewardedTestId: IOS_REWARDED_TEST_ID };
  window.addEventListener('load', () => { if (isNativeIOS()) initialize(); });
})();
