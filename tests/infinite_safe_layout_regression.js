const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const safe = fs.readFileSync(path.join(root, 'css/ios-safe-area.css'), 'utf8');
const score = fs.readFileSync(path.join(root, 'css/infinite-score.css'), 'utf8');

assert(index.includes("classList.add('standalone-app')"), 'home-screen standalone detection is missing');
assert(index.includes('ios-safe-area.css?v=0.2.7'), 'safe-area cache bust was not updated');
assert(!safe.includes('.is-explore-commands{bottom:calc(8.2%'), 'duplicate Infinite command offset remains');
assert(!safe.includes('.is-explore-log{bottom:calc(1.1%'), 'relative Infinite log is still displaced');
assert(safe.includes('html.standalone-app .hideout-screen'), 'standalone safe-area shell is missing');
assert(score.includes('writing-mode:horizontal-tb'), 'equipped bag text direction is not locked');
assert(score.includes('word-break:keep-all'), 'equipped bag labels can still collapse vertically');

console.log('infinite safe layout regression: ok');
