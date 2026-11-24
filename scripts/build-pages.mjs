import { cp, readFile, rename, writeFile } from 'node:fs/promises';
import './build-web.mjs';

// Pages serves the portal at / and the same-origin game at /play.
await rename('dist/index.html', 'dist/play.html');
await cp('web/portal', 'dist', { recursive: true });

const manifestPath = 'dist/manifest.webmanifest';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.start_url = '/play';
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
