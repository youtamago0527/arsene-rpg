import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const plist = await readFile(join(root, 'ios', 'App', 'App', 'Info.plist'), 'utf8');
const bridge = await readFile(join(root, 'js', 'admob.js'), 'utf8');
const combined = `${plist}\n${bridge}`;
const demoPublisher = '3940256099942544';
const appId = plist.match(/<key>GADApplicationIdentifier<\/key>\s*<string>(ca-app-pub-\d+~\d+)<\/string>/)?.[1];
const rewardId = bridge.match(/const IOS_REWARDED_AD_ID = '(ca-app-pub-\d+\/\d+)'/)?.[1];

if (!appId) throw new Error('有効なAdMob iOS App IDがInfo.plistにありません。');
if (!rewardId) throw new Error('有効なAdMobリワード広告ユニットIDがjs/admob.jsにありません。');
if (combined.includes(`ca-app-pub-${demoPublisher}`)) throw new Error('Googleデモ広告IDが残っています。本番IDへ差し替えてください。');
if (!/requestConsentInfo\(\)[\s\S]*canRequestAds/.test(bridge)) throw new Error('UMP同意確認とcanRequestAdsゲートが見つかりません。');
if (!/showPrivacyOptionsForm\(\)/.test(bridge)) throw new Error('広告プライバシー設定の再表示処理が見つかりません。');

console.log(`iOS release ads verified: ${appId} / ${rewardId}`);
