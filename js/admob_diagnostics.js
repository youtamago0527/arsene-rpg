/* Diagnostic build only: visible results for Google's official iOS rewarded test ad. */
(() => {
  const steps = ['initializing', 'initialized', 'consent', 'loading', 'loaded', 'showing', 'shown', 'reward', 'dismissed', 'result'];
  const rows = [];
  let panel = null;
  let output = null;
  let button = null;

  const format = (stage, detail) => {
    const extra = detail && Object.keys(detail).length ? ` ${JSON.stringify(detail)}` : '';
    return `${new Date().toLocaleTimeString('ja-JP')} ${stage}${extra}`;
  };
  const record = (stage, detail = {}) => {
    rows.push(format(stage, detail));
    if (rows.length > 35) rows.shift();
    if (output) output.textContent = rows.join('\n');
    if (panel) {
      panel.dataset.stage = stage;
      const status = panel.querySelector('[data-admob-status]');
      if (status) status.textContent = stage === 'error'
        ? `失敗: ${detail.stage || ''} / code ${detail.code ?? '不明'} / ${detail.message || '詳細なし'}`
        : stage === 'result' ? (detail.rewarded ? 'リワード受領を確認' : 'リワード未受領')
          : `進行: ${steps.includes(stage) ? stage : '待機中'}`;
    }
  };
  window.arseneAdMobDiagnostic = { record, get log() { return rows.slice(); } };

  const start = () => {
    if (!window.arseneAdMob?.diagnosticTestAds) return;
    panel = document.createElement('aside');
    panel.className = 'admob-diagnostic';
    panel.innerHTML = '<header><b>AdMob 診断ビルド</b><span>Google公式テスト広告</span><button type="button" data-admob-toggle>縮小</button></header><p data-admob-status>待機中</p><button type="button" data-admob-test>テスト広告を再生</button><small>このボタンは広告SDKのリワード通知だけを確認します。ゲーム内の報酬付与は通常の広告ボタンで確認してください。</small><pre data-admob-log></pre>';
    document.body.appendChild(panel);
    output = panel.querySelector('[data-admob-log]');
    button = panel.querySelector('[data-admob-test]');
    panel.querySelector('[data-admob-toggle]').addEventListener('click', event => {
      const collapsed = panel.classList.toggle('collapsed');
      event.currentTarget.textContent = collapsed ? '展開' : '縮小';
    });
    button.addEventListener('click', async () => {
      button.disabled = true;
      record('test-start');
      try { await window.arseneAdMob.showRewarded(); }
      catch (error) { record('error', { stage: 'test button', message: error?.message || String(error) }); }
      finally { button.disabled = false; }
    });
    record('ready', { mode: 'official-test-rewarded', nativeIOS: !!window.arseneAdMob.isNativeIOS?.() });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
