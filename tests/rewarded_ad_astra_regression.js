const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let shown, advanceCountdown, native = true, adResult = true, adRequests = 0;
const notices = [];
const context = {
  BattleGame: class {},
  window: {
    addEventListener() {},
    ARSENE_DATA: {},
    arseneAdMob: {
      isNativeIOS: () => native,
      async showRewarded() { adRequests++; return adResult; }
    },
    arseneStartFlow: { toast: message => notices.push(message) }
  },
  document: {
    addEventListener() {},
    body: { appendChild: node => { shown = node; } },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement() {
      const watch = {};
      return {
        classList: { add() {} },
        remove() {},
        querySelector: selector => selector === '[data-q-watch]' ? watch : {},
        addEventListener(_event, handler) { this.click = handler; }
      };
    }
  },
  setInterval(callback) { advanceCountdown = callback; return 1; },
  clearInterval() {}
};
vm.createContext(context);
for (const file of ['data.js', 'exchange_shop.js', 'q_offer.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, { filename: file });
}

const game = context.window.arseneGame = new context.BattleGame();
const offer = context.window.arseneQOffer;
let saved, baseGrants = 0;
game.profile = { premium: {}, inventory: {} };
game.saveProfile = () => { saved = JSON.stringify(game.profile); };
game.playNoiseSequence = (_lines, { onClose }) => { onClose(); onClose(); };
const progress = () => game.rewardedAdAstraProgress().progress;
const balance = () => game.exchangeShopState().balance;
const flush = () => new Promise(resolve => setImmediate(resolve));

async function watch({ mock = false } = {}) {
  assert.equal(offer.show('bossDrop', { onGrant: () => { baseGrants++; } }), true);
  if (mock) for (let n = 0; n < 3; n++) advanceCountdown();
  shown.click({ target: { closest: selector => selector === '[data-q-watch]' } });
  await flush();
}

(async () => {
  for (let n = 0; n < 9; n++) await watch();
  assert.equal(baseGrants, 9, '同じ広告の完了処理を二重に数えない');
  assert.equal(progress(), 9);
  assert.equal(balance(), 0);
  adResult = false;
  await watch();
  assert.equal(progress(), 9, '広告の途中終了はカウントしない');
  adResult = true;

  game.profile.premium.adSkipTickets = 1;
  const requestsBeforeSkip = adRequests;
  await watch();
  assert.equal(adRequests, requestsBeforeSkip, 'スキップ時にSDKを呼ばない');
  assert.equal(game.profile.premium.adSkipTickets, 0);
  assert.equal(progress(), 9);

  native = false;
  await watch({ mock: true });
  assert.equal(progress(), 9, 'ブラウザの模擬広告をカウントしない');
  native = true;
  offer.grant('bossDrop');
  assert.equal(progress(), 9, '直接付与をカウントしない');
  game.profile = JSON.parse(saved);

  await watch();
  assert.match(shown.innerHTML, /9\/10回.*100アストラ/);
  assert.equal(balance(), 100);
  assert.equal(progress(), 0);
  assert.ok(notices.includes('100アストラ獲得！'));
  game.profile = JSON.parse(saved);
  for (let n = 0; n < 10; n++) await watch();
  assert.equal(balance(), 200, '10回ごとに繰り返し付与する');
  assert.equal(game.rewardedAdAstraProgress().total, 20);

  assert.equal(game.exchangeShopRedeem('ad-skip-ticket').balance, 100);
  assert.equal(game.profile.premium.adSkipTickets, 1);
  await watch();
  assert.equal(game.rewardedAdAstraProgress().total, 20, '交換したスキップ券もカウント外');
  game.saveProfile = () => { throw new Error('storage is full'); };
  assert.throws(() => offer.grant('bossDrop', true), /storage is full/);
  assert.equal(game.rewardedAdAstraProgress().total, 20, '保存失敗時に進捗を元へ戻す');
  assert.equal(balance(), 100);
  console.log('rewarded ad Astra regression: OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
