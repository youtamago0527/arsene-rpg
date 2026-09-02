const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const safe = fs.readFileSync(path.join(root, 'css/ios-safe-area.css'), 'utf8');
const score = fs.readFileSync(path.join(root, 'css/infinite-score.css'), 'utf8');
const infinite = fs.readFileSync(path.join(root, 'js/infinite_score.js'), 'utf8');

assert(index.includes("classList.add('standalone-app')"), 'home-screen standalone detection is missing');
assert(index.includes('ios-safe-area.css?v=0.2.8'), 'safe-area cache bust was not updated');
assert(!safe.includes('.is-explore-commands{bottom:calc(8.2%'), 'duplicate Infinite command offset remains');
assert(!safe.includes('.is-explore-log{bottom:calc(1.1%'), 'relative Infinite log is still displaced');
assert(safe.includes('html.standalone-app .hideout-screen'), 'standalone safe-area shell is missing');
assert(safe.includes(':not([data-panel="infinite-score-workshop"])'), 'Infinite subviews are not covered by a shared safe-area rule');
assert(safe.includes('padding-top:calc(var(--safe-top) + 10px)!important'), 'Infinite subview top safe area is missing');
assert(safe.includes('padding-bottom:calc(var(--safe-bottom) + 16px)!important'), 'Infinite subview bottom safe area is missing');
assert(safe.includes('top:max(8px,var(--safe-top))!important'), 'sticky Infinite back buttons can enter the top safe area');
assert(safe.includes('[data-panel="infinite-score-workshop"]{box-sizing:border-box!important;padding:0!important}'), 'forge outer panel can receive duplicate safe-area padding');
assert(score.includes('writing-mode:horizontal-tb'), 'equipped bag text direction is not locked');
assert(score.includes('word-break:keep-all'), 'equipped bag labels can still collapse vertically');
assert(infinite.includes('stealProgress=this.phantomStealProgress()'), 'exploration HUD does not use shared steal progress');
assert(infinite.includes('<small>STEAL PROGRESS</small>'), 'exploration HUD steal progress label is missing');
assert(!infinite.includes('${job} Lv.${jobLevel}'), 'phantom thief level is still shown in exploration HUD');

console.log('infinite safe layout regression: ok');
