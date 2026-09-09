#!/usr/bin/env node
// ローカルでゲームを遊ぶための簡易CLI。
// `node scripts/play.mjs` または `pnpm play` でサーバー起動＋ブラウザ自動オープンを行う。
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const root = process.cwd();

const args = process.argv.slice(2);
const options = { port: 8080, open: true };
for (const arg of args) {
  if (arg === '--no-open') options.open = false;
  else if (arg.startsWith('--port=')) options.port = Number(arg.slice('--port='.length));
  else if (arg === '--help' || arg === '-h') {
    console.log(
      '使い方: node scripts/play.mjs [--port=8080] [--no-open]\n' +
      '  --port=PORT  待受ポート番号を指定 (既定: 8080)\n' +
      '  --no-open    ブラウザを自動で開かない'
    );
    process.exit(0);
  }
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4'
};

function openBrowser(url) {
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  const commandArgs = platform === 'win32' ? ['', url] : [url];
  const shell = platform === 'win32';
  spawn(command, commandArgs, { shell, stdio: 'ignore', detached: true }).unref();
}

const server = createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const filePath = normalize(join(root, relativePath));

    if (!filePath.startsWith(root + sep) && filePath !== root) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const fileStat = await stat(filePath);
    const resolvedPath = fileStat.isDirectory() ? join(filePath, 'index.html') : filePath;
    const content = await readFile(resolvedPath);
    const contentType = mimeTypes[extname(resolvedPath).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(options.port, () => {
  const url = `http://localhost:${options.port}`;
  console.log(`或世盗 -ARSÈNE- RE:MIX を起動しました: ${url}`);
  console.log('終了するには Ctrl+C を押してください。');
  if (options.open) openBrowser(url);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
