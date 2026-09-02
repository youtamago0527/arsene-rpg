const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const infinite = fs.readFileSync(path.join(root, 'js', 'infinite_score.js'), 'utf8');
const startFlow = fs.readFileSync(path.join(root, 'js', 'start-flow.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'infinite-forge.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(infinite, /\['enhance','強化'\],\['merge','同型合成'\],\['transfer','OP移植'\],\['delete','OP削除'\]/, '工房の4機能をタブ表示する');
assert.match(css, /PROCESS PREVIEW \/\/ 加工内容/, '選択装備に対する処理結果を事前表示する');
assert.match(infinite, /バッグ \$\{used\} \/ \$\{limit\}/, '30枠バッグの使用数を表示する');
assert.match(infinite, /帰還時消滅/, '奏貨が帰還時に消えることを明示する');
assert.match(infinite, /EQUIPPED/, '装備中の装備をカードで識別する');
assert.match(infinite, /残り奏貨/, '操作後の奏貨残額を事前表示する');
assert.match(infinite, /isForgeMerge=function\(uid,materialUid=null\)/, '選択した同型素材を既存合成処理へ渡す');
assert.match(infinite, /isForgeTransfer=function\(sourceUid,targetUid=null,opIndex=0\)/, '選択した移植元・移植先・OPを既存処理へ渡す');
assert.match(infinite, /isForgeDelete=function\(uid,index=0\)/, '選択した削除OPを既存処理へ渡す');
assert.match(startFlow, /infinite-forge-ready/, '工房単体のローカル確認導線を用意する');
assert.match(infinite, /flags\.infiniteScoreWarningSeen = true/, '工房単体確認ではセリペス警告会話をスキップする');
assert.match(css, /\.is-forge-detail-layout\{grid-template-columns:minmax\(132px,36%\) minmax\(0,64%\);align-items:stretch\}/, '参考コード同様に装備と加工予測を横並びにする');
assert.match(css, /overflow-x:auto/, '装備カードを横スクロール可能にする');
assert.match(css, /\.is-forge-gear-icon,\.is-forge-gear-card\.selected \.is-forge-gear-icon,\.is-forge-gear-card>b\+small\{display:none!important\}/, '選択・装備状態を問わず仮アイコンと内部スロット名を表示しない');
assert.match(css, /\.is-forge-gear-card\.selected \.is-forge-card-stats\{display:flex!important\}/, '選択中カードの能力欄も通常カードと同じ並びにする');
assert.match(css, /\.is-forge-gear-card\.selected \.is-forge-card-op\{display:block!important\}/, '選択中カードのOP欄も通常カードと同じ並びにする');
assert.match(css, /\.is-forge-detail-layout\{grid-template-columns:[^}]+;align-items:stretch\}/, '左右の詳細パネルを同じ高さに揃える');
assert.match(css, /\.is-forge-selected\{box-sizing:border-box;height:100%/, '選択装備パネルを右側の加工内容と同じ高さまで伸ばす');
assert.match(css, /env\(safe-area-inset-bottom/, 'iPhoneのセーフエリアを確保する');
assert.match(html, /css\/infinite-forge\.css/, '工房専用スタイルを読み込む');

console.log('infinite forge UI regression: ok');
