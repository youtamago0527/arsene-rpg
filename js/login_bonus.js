(() => {
  'use strict';

  const currency = window.ARSENE_DATA.exchangeShop.currency;
  const amounts = [100, 200, 300, 400, 500, 600, 1000];
  const numberFormat = new Intl.NumberFormat('ja-JP');
  const proto = BattleGame.prototype;

  proto.loginBonusState = function (now = new Date()) {
    // 日付の差を使うことで、夏時間が切り替わる日も1日として数える。
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000;
    const { lastClaimDay, streak } = this.profile.loginBonus || {};
    const hasClaim = Number.isInteger(lastClaimDay);
    const claimed = hasClaim && today <= lastClaimDay;
    const completed = Number.isInteger(streak) && streak >= 1 && streak <= amounts.length ? streak : 0;
    const continuing = hasClaim && today === lastClaimDay + 1 && completed < amounts.length;
    return { today, claimed, completed: claimed || continuing ? completed : 0 };
  };

  proto.claimLoginBonus = function (now = new Date()) {
    const { today, claimed, completed } = this.loginBonusState(now);
    if (claimed || this.localScenario?.ephemeral) return null;
    const reward = { ...currency, quantity: amounts[completed] };
    const previousBonus = this.profile.loginBonus;
    const previousStore = this.profile[reward.store];
    const wallet = this.exchangeShopWallet();
    this.profile.loginBonus = { lastClaimDay: today, streak: completed + 1 };
    this.profile[reward.store] = { ...wallet, [reward.id]: wallet[reward.id] + reward.quantity };
    try {
      this.saveProfile();
    } catch (error) {
      this.profile.loginBonus = previousBonus;
      this.profile[reward.store] = previousStore;
      throw error;
    }
    return reward;
  };

  const dialog = document.getElementById('login-bonus');
  const grid = dialog.querySelector('ol');
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  dialog.querySelector('[data-login-total]').textContent = numberFormat.format(total);
  const claim = dialog.querySelector('[data-login-claim]');
  const status = dialog.querySelector('[role="status"]');

  function render(game, message = '') {
    const { claimed, completed } = game.loginBonusState();
    grid.innerHTML = amounts.map((amount, index) => {
      const received = index < completed;
      const available = index === completed && !claimed;
      const state = received ? 'received' : available ? 'available' : 'upcoming';
      return `<li data-reward="${currency.id}" data-state="${state}">
        <small>${index + 1}日目</small><i class="login-bonus-icon" aria-hidden="true"></i>
        <b>${currency.name}</b><span class="login-bonus-quantity">${received ? '受取済み' : `×${numberFormat.format(amount)}`}</span>
      </li>`;
    }).join('');
    claim.disabled = claimed || !!game.localScenario?.ephemeral;
    claim.textContent = claimed ? '本日は受取済み' : `${completed + 1}日目の報酬を受け取る`;
    status.textContent = message;
  }

  proto.openLoginBonus = function ({ automatic = false } = {}) {
    if (dialog.open || document.querySelector('dialog[open]')) return false;
    const { today, claimed } = this.loginBonusState();
    if (automatic && (claimed || this.loginBonusShownDay === today || this.localScenario?.ephemeral)) return false;
    render(this);
    dialog.showModal();
    dialog.scrollTop = 0;
    this.loginBonusShownDay = today;
    return true;
  };

  document.getElementById('login-bonus-open').addEventListener('click', () => window.arseneGame?.openLoginBonus());

  claim.addEventListener('click', () => {
    const game = window.arseneGame;
    if (!game) return;
    let reward;
    try { reward = game.claimLoginBonus(); }
    catch { render(game, '保存できませんでした。もう一度お試しください。'); return; }
    render(game, reward ? `${reward.name} ×${numberFormat.format(reward.quantity)} を受け取りました。` : '');
    if (reward) game.audio.sfx('confirm');
  });
  document.addEventListener('visibilitychange', () => {
    const game = window.arseneGame;
    if (document.hidden || !game) return;
    if (dialog.open) render(game);
    else if (!document.getElementById('menu-screen').hidden && document.getElementById('menu-panel').hidden &&
      document.getElementById('start-flow').hidden && !window.arseneQOffer?.isOpen?.()) game.openLoginBonus({ automatic: true });
  });
})();
