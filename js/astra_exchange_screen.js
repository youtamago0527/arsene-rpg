(() => {
  'use strict';

  const cards = [
    { id: 'ad-skip-ticket', label: '広告スキップ券', en: 'AD SKIP TICKET' },
    { id: 'chaos-arcana', label: '混沌のアルカナ', en: 'CHAOS ARCANA' },
    { id: 'otherworld-ticket', label: '異世界探索券', en: 'EXPLORATION TICKET' },
    { id: 'exp-boost', label: '1日経験値2倍', en: 'EXP ×2 (1 DAY)' },
    { id: 'reincarnation-arcana', label: '輪廻のアルカナ', en: 'REINCARNATION ARCANA' },
    { id: 'protection-arcana', label: '保護のアルカナ', en: 'PROTECTION ARCANA' },
    { id: 'blessed-protection-arcana', label: '祝福された保護のアルカナ', en: 'BLESSED PROTECTION ARCANA' }
  ];
  const login = document.getElementById('login-bonus');
  const dialog = document.getElementById('astra-exchange');
  const notice = document.getElementById('login-bonus-open');
  const list = dialog.querySelector('ul');
  const balance = dialog.querySelector('output');
  const status = dialog.querySelector('[role="status"]');
  const numberFormat = new Intl.NumberFormat('ja-JP');
  let lastExchange = null;
  let returnToLogin = false;

  function positionBelowStatus() {
    const edge = Math.ceil(notice.getBoundingClientRect().bottom + 7);
    dialog.style.setProperty('--astra-top', `${edge}px`);
  }

  function render(game, message = '') {
    const state = game.exchangeShopState();
    const products = new Map(state.products.map(item => [item.id, item]));
    balance.textContent = numberFormat.format(state.balance);
    list.innerHTML = cards.map(card => {
      const product = products.get(card.id);
      const disabled = !product?.affordable || game.localScenario?.ephemeral;
      const text = product ? (product.affordable ? '交換' : 'アストラ不足') : '準備中';
      return `<li><article>
        <img src="assets/ui/astra-exchange/${card.id}.webp" alt="">
        <h3>${product?.name || card.label}</h3>
        <small lang="en">${card.en}</small>
        ${product ? `<p class="astra-price" aria-label="${product.quantity}個、${product.price}アストラ"><span>${numberFormat.format(product.price)}</span><span class="astra-quantity">×${product.quantity}</span></p>` : '<p class="astra-price">—</p>'}
        <button type="button" data-astra-product="${card.id}" aria-label="${card.label} ${text}" ${disabled ? 'disabled' : ''}>${text}</button>
      </article></li>`;
    }).join('');
    status.textContent = message;
  }

  function openExchange({ fromLogin = false } = {}) {
    const game = window.arseneGame;
    if (!game || dialog.open) return;
    render(game);
    lastExchange = null;
    returnToLogin = fromLogin;
    if (fromLogin) login.close();
    positionBelowStatus();
    dialog.showModal();
    dialog.scrollTop = 0;
  }

  login.querySelector('[data-open-astra-exchange]').addEventListener('click', () => openExchange({ fromLogin: true }));
  document.getElementById('hideout-astra-exchange').addEventListener('click', () => openExchange());
  window.addEventListener('resize', () => { if (dialog.open) positionBelowStatus(); });

  dialog.addEventListener('close', () => {
    if (returnToLogin && !document.getElementById('menu-screen').hidden) window.arseneGame?.openLoginBonus();
    returnToLogin = false;
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-astra-product]');
    const game = window.arseneGame;
    if (!game || !dialog.open || !button || button.disabled) return;
    const id = button.dataset.astraProduct;
    const now = performance.now();
    if (lastExchange?.id === id && now - lastExchange.at < 500) return;
    lastExchange = { id, at: now };
    const result = game.exchangeShopRedeem(id);
    const message = result.ok ? `${result.name} ×${result.quantity} を交換しました。` :
      result.reason === 'insufficientCoins' ? 'アストラが不足しています。' : '交換できませんでした。';
    render(game, message);
    const updated = list.querySelector(`[data-astra-product="${id}"]:enabled`);
    (updated || dialog.querySelector('form button')).focus({ preventScroll: true });
    if (result.ok) game.audio.sfx('confirm');
  });
})();
