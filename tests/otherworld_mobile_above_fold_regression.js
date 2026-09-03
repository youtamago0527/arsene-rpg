const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('css/otherworld.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert.match(css, /@media\(max-width:600px\) and \(max-height:950px\)/);
assert.match(css, /#menu-panel\[data-panel="otherworld"\] \.ow-mode-stats\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,
  'mode facts must collapse to one compact row on phone screens');
assert.match(css, /#menu-panel\[data-panel="otherworld"\] \.ow-mode-card>p\{[^}]*-webkit-line-clamp:1/,
  'long descriptions must not push the entry actions below the fold');
assert.match(css, /#menu-panel\[data-panel="otherworld"\] \.ow-mode-action\{min-height:34px/,
  'both mode actions need compact but tappable controls');
assert.match(css, /env\(safe-area-inset-bottom\)/,
  'compact panel must preserve the iPhone bottom safe area');
assert.match(index, /css\/otherworld\.css\?v=0\.3\.9/);

console.log('otherworld_mobile_above_fold_regression: ok');
