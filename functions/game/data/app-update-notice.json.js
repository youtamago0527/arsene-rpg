const appID = 6806899939;
const lookupURL = `https://itunes.apple.com/lookup?id=${appID}&country=jp&lang=ja_jp`;
const cors = { 'Access-Control-Allow-Origin': '*' };
const defaultChange = '変更内容はApp Storeの「バージョン履歴」で確認できます。';

export async function onRequestGet() {
  try {
    const response = await fetch(lookupURL, {
      signal: AbortSignal.timeout(4500),
      cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 300, '400-599': 0 } },
    });
    if (!response.ok) throw new Error('Store lookup failed');
    const { results } = await response.json();
    const app = results?.find(result => result.trackId === appID);
    const version = app?.version;
    if (typeof version !== 'string' || !/^\d{1,5}(\.\d{1,5}){0,2}$/.test(version)) {
      throw new Error('Store version unavailable');
    }
    const changes = (app.releaseNotes ?? '').split(/\r?\n/)
      .map(line => line.trim().replace(/^[・•-]\s*/, ''))
      .filter(Boolean)
      .slice(0, 8)
      .map(line => line.length > 200 ? `${line.slice(0, 199)}…` : line);
    return Response.json({
      enabled: true,
      id: `release-${version}`,
      version,
      title: 'アップデートを配信しました',
      changes: changes.length ? changes : [defaultChange],
    }, { headers: { ...cors, 'Cache-Control': 'public, max-age=60, s-maxage=300' } });
  } catch {
    return Response.json({ error: 'Store release unavailable' }, {
      status: 503,
      headers: { ...cors, 'Cache-Control': 'no-store' },
    });
  }
}
