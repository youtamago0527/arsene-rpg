import { access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const native = join(root, 'ios', 'App', 'App', 'public');
const sentinels = [
  'index.html',
  'css/battle-ui-v2.css',
  'css/ios-safe-area.css',
  'js/audio.js',
  'js/admob.js',
  'js/data.js',
  'js/game.js'
];

const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const verifyTriplet = async relative => {
  const paths = [join(root, relative), join(dist, relative), join(native, relative)];
  await Promise.all(paths.map(access));
  const hashes = await Promise.all(paths.map(hash));
  if (new Set(hashes).size !== 1) throw new Error(`stale iOS bundle: ${relative}`);
};

await Promise.all(sentinels.map(verifyTriplet));

const plist = await readFile(join(root, 'ios', 'App', 'App', 'Info.plist'), 'utf8');
if (!/<key>GADApplicationIdentifier<\/key>\s*<string>ca-app-pub-\d+~\d+<\/string>/.test(plist)) throw new Error('iOS Info.plist is missing a valid AdMob app ID.');
const swiftPackage = await readFile(join(root, 'ios', 'App', 'CapApp-SPM', 'Package.swift'), 'utf8');
if (!/CapacitorCommunityAdmob/.test(swiftPackage)) {
  throw new Error('CapacitorCommunityAdmob is missing from the native Swift package. Run cap sync ios.');
}

const audioSource = await readFile(join(root, 'js', 'audio.js'), 'utf8');
const audioPaths = [...new Set([...audioSource.matchAll(/url:\s*'([^']+)'/g)].map(match => match[1]))];
for (const relative of audioPaths) {
  await access(join(root, relative));
  await access(join(dist, relative));
  await access(join(native, relative));
}

console.log(`iOS bundle verified: ${sentinels.length} runtime files and ${audioPaths.length} audio assets match.`);
