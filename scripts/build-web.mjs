import { cp, mkdir, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = process.cwd();
const output = join(root, 'dist');
const rootFiles = new Set(['index.html', 'manifest.webmanifest']);
const runtimeDirectories = ['assets', 'css', 'data', 'js', '音楽系'];
const runtimeExtensions = new Set([
  '.css', '.gif', '.html', '.jpeg', '.jpg', '.js', '.json', '.m4a',
  '.mp3', '.ogg', '.png', '.svg', '.wav', '.webmanifest', '.webp'
]);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of rootFiles) {
  await cp(join(root, file), join(output, file));
}

for (const directory of runtimeDirectories) {
  await cp(join(root, directory), join(output, directory), {
    recursive: true,
    filter: source => {
      const extension = extname(source).toLowerCase();
      return extension === '' || runtimeExtensions.has(extension);
    }
  });
}

// ルート直下の画像は制作資料であり、実行時参照は assets/ 以下へ集約する。
// iCloudの未ダウンロード資料を無条件コピーするとnative buildが失敗するため、
// アプリbundleへ含めるのは上記の明示したruntime directoriesだけに限定する。

console.log('Web assets built into dist/.');
