const assert = require('node:assert/strict');
const fs = require('node:fs');
const forge = fs.readFileSync('js/infinite_gear_forge.js', 'utf8');
const infinite = fs.readFileSync('js/infinite_score.js', 'utf8');
const start = fs.readFileSync('js/start-flow.js', 'utf8');
const css = fs.readFileSync('css/infinite-gear-v2.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(forge, /\['merge','装備合成・強化'\],\['transfer','OP移植'\]/);
assert.doesNotMatch(forge, /OP削除|調律する|製作する/);
for (const label of ['移植元', '移すOP', '移植先', '上書きするOP', '強化後', '完全に消滅', 'ロック中', '装備中']) {
  assert(forge.includes(label), label + ' is missing');
}
assert.match(forge, /owgMetaHtml\(item\)/);
assert.match(forge, /owgBaseText\(item\)/);
assert.match(forge, /G\.opText\(op\)/);
assert.match(forge, /root\.scrollTop=scroll/);
assert.match(css, /\.is-forge-v2-grid/);
assert.match(css, /\.owg-infinity-badge/);
assert.match(html, /css\/infinite-gear-v2\.css/);
assert.match(html, /js\/infinite_gear_forge\.js/);
assert.match(start, /infinite-forge-ready/);
assert.match(infinite, /flags\.infiniteScoreWarningSeen = true/);
console.log('infinite forge V2 UI regression: ok');
