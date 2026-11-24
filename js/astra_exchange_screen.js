(() => {
  'use strict';

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
    balance.textContent = numberFormat.format(state.balance);
    list.innerHTML = state.products.filter(product => product.en).map(product => {
      const disabled = !product.affordable || game.localScenario?.ephemeral;
      const text = product.affordable ? '交換' : 'アストラ不足';
      return `<li><article>
        <img src="assets/ui/astra-exchange/${product.id}.webp" alt="">
        <h3>${product.name}</h3>
        <small lang="en">${product.en}</small>
        <p class="astra-price" aria-label="${product.quantity}個、${product.price}アストラ"><span>${numberFormat.format(product.price)}</span><span class="astra-quantity">×${product.quantity}</span></p>
        <button type="button" data-astra-product="${product.id}" aria-label="${product.name} ${text}" ${disabled ? 'disabled' : ''}>${text}</button>
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

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-open-astra-exchange]');
    if (button) openExchange({ fromLogin: login.contains(button) });
  });
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
