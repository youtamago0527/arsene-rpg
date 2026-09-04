const fs = require('fs');
const assert = require('assert');

const game = fs.readFileSync('js/game.js', 'utf8');
const kazu = fs.readFileSync('js/kazu_minigame.js', 'utf8');
const css = fs.readFileSync('css/game.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert.match(css, /\.capacitor-native body,\.capacitor-native body \*[^}]*-webkit-user-select:none!important[^}]*-webkit-touch-callout:none!important/, 'every native game descendant must suppress iOS selection/callout');
assert.match(css, /\.standalone-app body,\.standalone-app body \*[^}]*user-select:none!important[^}]*-webkit-touch-callout:none!important/, 'every home-screen app descendant must suppress iOS selection/callout');
assert.match(css, /input,textarea,\[contenteditable="true"\][^}]*user-select:text!important/, 'editable controls must remain selectable');
assert.match(game, /matches\('\.capacitor-native,\.standalone-app'\)[\s\S]*?addEventListener\('contextmenu'[\s\S]*?addEventListener\('selectstart'/, 'native/PWA must block long-press menus and selection');
assert.match(game, /closest\('input,textarea,\[contenteditable="true"\]'\)/, 'editable controls must be exempt from event blocking');
assert.match(kazu, /hotspot\.addEventListener\('click',[\s\S]*?this\.tapCount \+= 1;[\s\S]*?this\.tapCount >= 3/, 'Kazu three-tap click flow must remain intact');
assert.doesNotMatch(game.match(/matches\('\.capacitor-native,\.standalone-app'\)[\s\S]*?\n    }/)?.[0] || '', /addEventListener\('click'/, 'long-press guard must not intercept taps/clicks');
assert.ok(index.includes('css/game.css?v=0.5.8'));
assert.ok(index.includes('js/game.js?v=4.13.16'));

console.log('native long press regression: ok');
