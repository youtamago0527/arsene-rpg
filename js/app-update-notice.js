(() => {
  const noticeButton = document.querySelector('.hideout-resources > button');
  if (!noticeButton) return;

  const feed = 'https://arsene-rpg.pages.dev/game/data/app-update-notice.json';
  const storeURL = 'https://apps.apple.com/app/id6806899939';
  const readKey = 'arsene.app-update-notice.read';
  const native = window.Capacitor?.Plugins?.ArseneAppInfo;
  const bonus = document.getElementById('login-bonus');
  const bonusFooter = bonus?.querySelector('.login-bonus-footer');
  const badge = document.createElement('span');
  badge.className = 'app-update-badge';
  badge.textContent = '!';
  badge.setAttribute('aria-label', '未読のアップデート情報');
  badge.hidden = true;
  noticeButton.append(badge);

  const entry = document.createElement('button');
  entry.type = 'button';
  entry.className = 'app-update-entry';
  entry.textContent = 'アップデート情報';
  entry.hidden = true;
  bonusFooter?.before(entry);

  const dialog = document.createElement('dialog');
  dialog.className = 'app-update-dialog';
  dialog.setAttribute('aria-labelledby', 'app-update-heading');
  dialog.innerHTML = `
    <h2 id="app-update-heading">アップデート情報</h2>
    <p data-update-version></p>
    <h3 data-update-title></h3>
    <ul data-update-changes></ul>
    <p role="status" data-update-status></p>
    <div class="app-update-actions">
      <a data-update-store href="${storeURL}" target="_blank" rel="noopener" hidden>App Storeで更新</a>
      <form method="dialog"><button type="submit" autofocus data-update-close>閉じる</button></form>
    </div>`;
  document.body.append(dialog);

  const select = name => dialog.querySelector(`[data-update-${name}]`);
  const store = select('store');
  let lastRead;
  try { lastRead = localStorage.getItem(readKey); } catch {}
  let announcement = null;
  let installedVersion = null;
  let publishedVersion = null;
  let remoteNotice = null;
  let nextCheck = 0;
  let checking;

  function versionParts(value) {
    if (typeof value !== 'string' || !/^\d{1,5}(\.\d{1,5}){0,2}$/.test(value)) return null;
    const parts = value.split('.').map(Number);
    return [parts[0], parts[1] ?? 0, parts[2] ?? 0];
  }

  function needsUpdate() {
    const latest = publishedVersion?.parts ?? announcement?.versionParts;
    return !!(latest && installedVersion && compareVersions(latest, installedVersion) > 0);
  }

  function compareVersions(left, right) {
    const firstDifference = left.findIndex((part, index) => part !== right[index]);
    return firstDifference < 0 ? 0 : left[firstDifference] - right[firstDifference];
  }

  function parseAnnouncement(data) {
    const version = versionParts(data?.version);
    if (data?.enabled !== true || !version || typeof data.id !== 'string' ||
        !/^[a-zA-Z0-9._-]{1,64}$/.test(data.id) || typeof data.title !== 'string' ||
        !data.title.trim() || data.title.length > 100 || !Array.isArray(data.changes) ||
        data.changes.length < 1 || data.changes.length > 8 ||
        !data.changes.every(text => typeof text === 'string' && text.trim() && text.length <= 200)) return null;
    return { id: data.id, version: data.version, title: data.title, changes: data.changes,
      versionParts: version };
  }

  function refreshEntry() {
    badge.hidden = !announcement || announcement.id === lastRead;
    entry.hidden = !announcement;
    const title = document.querySelector('[data-title-update]');
    if (!title) return;
    title.hidden = !needsUpdate();
    title.querySelector('[data-title-update-version]').textContent = publishedVersion?.version ?? announcement?.version ?? '';
    const link = title.querySelector('[data-title-update-store]');
    link.href = storeURL;
    link.onclick = event => openStore(event, title.querySelector('[data-title-update-status]'));
  }

  function selectAnnouncement() {
    if (!publishedVersion || (remoteNotice && compareVersions(remoteNotice.versionParts, publishedVersion.parts) === 0)) {
      announcement = remoteNotice;
      return;
    }
    const { version, parts } = publishedVersion;
    announcement = {
      id: `release-${version}`, version, versionParts: parts,
      title: 'アップデートを配信しました',
      changes: ['変更内容はApp Storeの「バージョン履歴」で確認できます。']
    };
  }

  async function checkStoreVersion() {
    if (!native?.getStoreVersion) return;
    const { version } = await native.getStoreVersion();
    const parts = versionParts(version);
    if (parts) publishedVersion = { version, parts };
  }

  async function checkRemoteNotice() {
    const response = await fetch(feed, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Update notice unavailable');
    remoteNotice = parseAnnouncement(await response.json());
  }

  function checkNotice() {
    if (checking || Date.now() < nextCheck) return checking;
    checking = (async () => {
      const [remote, storeVersion] = await Promise.allSettled([checkRemoteNotice(), checkStoreVersion()]);
      const connected = remote.status === 'fulfilled' || (storeVersion.status === 'fulfilled' && publishedVersion);
      nextCheck = Date.now() + (connected ? 5 : 1) * 60 * 1000;
      if (remote.status === 'rejected' && !remoteNotice && !publishedVersion) {
        try {
          const bundled = await fetch(new URL('data/app-update-notice.json', document.baseURI), {
            signal: AbortSignal.timeout(2000)
          });
          if (bundled.ok) remoteNotice = parseAnnouncement(await bundled.json());
        } catch {}
      }
      selectAnnouncement();
      refreshEntry();
      if (dialog.open) refreshUpdateAction();
    })().finally(() => {
      checking = null;
    });
    return checking;
  }

  function refreshUpdateAction() {
    const update = needsUpdate();
    store.hidden = !update;
    select('close').textContent = update ? 'あとで' : '閉じる';
  }

  function openNotice() {
    if (dialog.open || !announcement) return;
    lastRead = announcement.id;
    try { localStorage.setItem(readKey, lastRead); } catch {}
    refreshEntry();

    select('title').textContent = announcement.title;
    select('version').textContent = `バージョン ${announcement.version}`;
    select('status').textContent = '';
    select('changes').replaceChildren(...announcement.changes.map(change => {
      const item = document.createElement('li');
      item.textContent = change;
      return item;
    }));
    refreshUpdateAction();
    dialog.showModal();
  }

  entry.addEventListener('click', openNotice);
  noticeButton.addEventListener('click', event => {
    checkNotice();
    if (bonusFooter || !announcement) return;
    event.stopPropagation();
    openNotice();
  });
  async function openStore(event, status) {
    if (!native) return;
    event.preventDefault();
    try {
      const { opened } = await native.openAppStore();
      if (opened) return;
    } catch {}
    status.textContent = 'App Storeで「ARSÈNE REMIX」を検索してください。';
  }

  store.addEventListener('click', event => openStore(event, select('status')));

  if (native) {
    native.getVersion().then(({ version }) => {
      installedVersion = versionParts(version);
      refreshEntry();
      if (dialog.open) refreshUpdateAction();
    }).catch(() => {});
    setInterval(() => { if (!document.hidden) checkNotice(); }, 60 * 1000);
  }
  document.addEventListener('arsene:title-shown', () => {
    refreshEntry();
    checkNotice();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkNotice();
  });
  checkNotice();
})();
