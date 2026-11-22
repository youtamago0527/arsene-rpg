(() => {
  'use strict';

  const ticket = { store: 'premium', id: 'adSkipTickets', name: '広告スキップ券' };
  const chaos = { store: 'inventory', id: 'arcanaChaos', name: '混沌のアルカナ' };
  const rebirth = { store: 'inventory', id: 'rebirthArcana', name: '輪廻のアルカナ' };
  const exchangeCoin = window.ARSENE_DATA.exchangeShop.currency;
  const rewards = [ticket, chaos, ticket, chaos, ticket, exchangeCoin, rebirth];
  const proto = BattleGame.prototype;

  proto.loginBonusState = function (now = new Date()) {
    // 日付の差を使うことで、夏時間が切り替わる日も1日として数える。
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000;
    const { lastClaimDay, streak } = this.profile.loginBonus || {};
    const hasClaim = Number.isInteger(lastClaimDay);
    const claimed = hasClaim && today <= lastClaimDay;
    const completed = Number.isInteger(streak) && streak >= 1 && streak <= rewards.length ? streak : 0;
    const continuing = hasClaim && today === lastClaimDay + 1 && completed < rewards.length;
    return { today, claimed, completed: claimed || continuing ? completed : 0 };
  };

  proto.claimLoginBonus = function (now = new Date()) {
    const { today, claimed, completed } = this.loginBonusState(now);
    if (claimed || this.localScenario?.ephemeral) return null;
    const reward = rewards[completed];
    const previousBonus = this.profile.loginBonus;
    const previousStore = this.profile[reward.store];
    const store = reward === exchangeCoin ? this.exchangeShopWallet() : previousStore;
    const count = Math.max(0, Number(store?.[reward.id]) || 0);
    this.profile.loginBonus = { lastClaimDay: today, streak: completed + 1 };
    this.profile[reward.store] = { ...store, [reward.id]: count + (reward.quantity ?? 1) };
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
  const claim = dialog.querySelector('[data-login-claim]');
  const status = dialog.querySelector('[role="status"]');

  function render(game, message = '') {
    const { claimed, completed } = game.loginBonusState();
    grid.innerHTML = rewards.map((reward, index) => {
      const received = index < completed;
      const available = index === completed && !claimed;
      const state = received ? 'received' : available ? 'available' : 'upcoming';
      return `<li data-reward="${reward.id}" data-state="${state}">
        <small>${index + 1}日目</small><i class="login-bonus-icon" aria-hidden="true"></i>
        <b>${reward.name}</b><span class="login-bonus-quantity">×${reward.quantity ?? 1}</span>
        ${received ? '<span class="login-bonus-received">受取済み</span>' : ''}
      </li>`;
    }).join('');
    claim.disabled = claimed || !!game.localScenario?.ephemeral;
    claim.textContent = claimed ? '本日は受取済み' : `${completed + 1}日目の報酬を受け取る`;
    status.textContent = message;
  }

  document.getElementById('login-bonus-open').addEventListener('click', () => {
    const game = window.arseneGame;
    if (!game || dialog.open) return;
    render(game);
    dialog.showModal();
  });

  claim.addEventListener('click', () => {
    const game = window.arseneGame;
    if (!game) return;
    let reward;
    try { reward = game.claimLoginBonus(); }
    catch { render(game, '保存できませんでした。もう一度お試しください。'); return; }
    render(game, reward ? `${reward.name} ×${reward.quantity ?? 1} を受け取りました。` : '');
    if (reward) game.audio.sfx('confirm');
  });
  document.addEventListener('visibilitychange', () => {
    if (dialog.open && !document.hidden && window.arseneGame) render(window.arseneGame);
  });
})();
