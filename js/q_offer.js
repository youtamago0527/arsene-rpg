/* Q'S OFFER — provider-neutral reward offers. No ad SDK or forced navigation. */
(function () {
  const DAILY = 2;
  const DAY = () => new Date().toLocaleDateString('ja-JP');
  const QD = window.ARSENE_Q_DIALOGUE || { rates: { hint: .1, secret: .01 }, offer: {}, success: [], hint: [], secret: [] };
  const defs = {
    auto2: { title: 'AUTO ×2.0', copy: '30分間、AUTO速度を×2.0へ。', key: 'auto2Uses', expiry: 'auto2ExpiresAt', label: 'AUTO速度アップ' },
    sweep: { title: '一掃', copy: '30分間、通常ダンジョンの一掃を解放する。', key: 'sweepUses', expiry: 'sweepExpiresAt', label: '一掃解放' },
    otherworld: { title: '異世界 +1', copy: '本日の異世界入場回数を1回追加。', key: 'otherworldUses', label: '異世界入場' },
    revive: { title: '怪盗の再起', copy: '戦闘不能から復活し、HP50%で現在の戦闘を続行する。', key: 'reviveUses', label: '戦闘復活' },
    protect: { title: '保護のアルカナ', copy: '破壊された装備を、強化値+0で復元する。', key: 'restoreUses', label: '破壊装備の復元' },
    bossDrop: { title: 'ボス素材の追跡', copy: '撃破したボス素材の追加抽選を行う。', key: 'bossDrop', label: 'ボス素材追加抽選' }
  };
  function game() { return window.arseneGame; }
  function state(g) {
    g.profile.rewardState ||= {};
    const s = g.profile.rewardState;
    // 旧版で常設表示していた残数は、今後は保持も表示もしない。
    delete s.enhancementProtection;
    delete s.bossDropBonus;
    if (s.dateKey !== DAY()) Object.assign(s, {
      dateKey: DAY(), auto2Uses: 0, sweepUses: 0, otherworldUses: 0,
      reviveUses: 0, restoreUses: 0, otherworldBonus: 0
    });
    return s;
  }
  function save(g) { g.saveProfile?.(); }
  function active(s, key) { return Number(s[key] || 0) > Date.now(); }
  function isDaily(type) { return ['auto2', 'sweep', 'otherworld', 'revive', 'protect'].includes(type); }
  function canUse(g, type) {
    if (!g) return false;
    const d = defs[type] || defs.auto2, s = state(g);
    return !isDaily(type) || Number(s[d.key] || 0) < DAILY;
  }
  function remaining(type) {
    const g = game(); if (!g) return 0;
    const d = defs[type] || defs.auto2;
    return isDaily(type) ? Math.max(0, DAILY - Number(state(g)[d.key] || 0)) : Infinity;
  }
  function chooseDialogue(g, forcedCategory) {
    const s = state(g), secretRate = Number(s.qSecretRate ?? QD.rates?.secret ?? .01), hintRate = Number(s.qHintRate ?? QD.rates?.hint ?? .10);
    let category = forcedCategory;
    if (!category) { const roll = Math.random(); category = roll < secretRate ? 'secret' : roll < secretRate + hintRate ? 'hint' : 'success'; }
    const pool = QD[category]?.length ? QD[category] : QD.success;
    if (!pool?.length) return { category: 'success', id: 'Q_SUCCESS_FALLBACK', text: '――はい。これでいいよ。' };
    let choices = pool.filter(row => row.id !== s.lastQDialogueId); if (!choices.length) choices = pool;
    const picked = choices[Math.floor(Math.random() * choices.length)]; s.lastQDialogueId = picked.id; s.qOfferCount = Number(s.qOfferCount || 0) + 1; save(g);
    if (g.profile?.debugUnlocked) console.info(`Q Dialogue: category=${category.toUpperCase()} id=${picked.id}`);
    return { ...picked, category };
  }
  function playIntervention(g, forcedCategory, onComplete) {
    const picked = chooseDialogue(g, forcedCategory), done = () => onComplete?.(picked);
    if (typeof g.playNoiseSequence !== 'function') { done(); return; }
    g.playNoiseSequence([{ sys: 'NOISE...' }, { who: 'Q', text: picked.text }], { onClose: done });
  }
  const api = {
    defs,
    canUse(type = 'auto2') { return canUse(game(), type); },
    remaining,
    isActive(type) { const g = game(), d = defs[type]; return !!(g && d?.expiry && active(state(g), d.expiry)); },
    bonus(type) { const g = game(); return g ? Number(state(g)[`${type}Bonus`] || 0) : 0; },
    show(type = 'auto2', extra = {}) {
      const g = game(); if (!canUse(g, type)) return false;
      const d = { ...(defs[type] || defs.auto2), ...extra }, left = remaining(type);
      const qCopy = String(extra.copy ?? QD.offer?.[type] ?? d.copy).replace(/\n/g, '<br>');
      const reviveCard = `<div class="q-offer-card q-revive-card" role="dialog" aria-label="戦闘復活"><button class="q-offer-close" data-q-close aria-label="閉じる">✕ CLOSE</button><header><small class="q-revive-tag"><i></i>DAILY REVIVE REWARD</small><h2>怪盗の再起</h2><p>Q「${qCopy}」</p></header><div class="q-revive-details"><div><span><i></i>復活時HP</span><b>最大HPの50%</b></div><div><span><i></i>復帰地点</span><b>現在の戦闘</b></div><div><span><i></i>本日の残り回数</span><b>${left} 回</b></div></div><div class="q-offer-ad"><span>広告を再生しています</span><b data-q-countdown>3</b></div><button class="q-offer-watch" data-q-watch><span>▶　広告を見て発動する</span></button><button class="q-revive-cancel" data-q-close>今回は諦める</button></div>`;
      const normalCard = `<div class="q-offer-card" role="dialog" aria-label="Q offer"><button class="q-offer-close" data-q-close aria-label="閉じる">×</button><div class="q-offer-q">Q</div><small class="q-offer-kicker">Q'S OFFER</small><h2>${d.title}</h2><p>「${qCopy}」</p><div class="q-offer-ad"><span>広告を再生しています</span><b data-q-countdown>3</b></div><button class="q-offer-watch" data-q-watch>広告を見て発動する<span>WATCH MOCK AD</span></button></div>`;
      const modal = document.createElement('div'); modal.className = 'q-offer-modal'; modal.innerHTML = type === 'revive' ? reviveCard : normalCard; if (type === 'revive') modal.classList.add('q-offer-defeat'); document.body.appendChild(modal);
      let n = 3; const count = modal.querySelector('[data-q-countdown]'), watch = modal.querySelector('[data-q-watch]'); watch.disabled = true;
      const timer = setInterval(() => { n--; if (count) count.textContent = n; if (n <= 0) { clearInterval(timer); watch.disabled = false; } }, 1000);
      modal.addEventListener('click', e => {
        if (e.target.closest('[data-q-close]')) { clearInterval(timer); modal.remove(); d.onClose?.(); return; }
        if (e.target.closest('[data-q-watch]') && !watch.disabled) {
          clearInterval(timer); modal.remove(); playIntervention(g, d.forceDialogueCategory, () => { const granted = api.grant(type); if (granted) d.onGrant?.(); });
        }
      });
      return true;
    },
    grant(type) {
      const g = game(); if (!g) return false;
      const d = defs[type] || defs.auto2, s = state(g), daily = isDaily(type);
      if (daily && Number(s[d.key] || 0) >= DAILY) { window.arseneStartFlow?.toast?.('本日のQ’S OFFERは受け取り済みです'); return false; }
      if (daily) s[d.key] = (Number(s[d.key]) || 0) + 1;
      if (d.expiry) s[d.expiry] = Math.max(Number(s[d.expiry]) || 0, Date.now() + 30 * 60 * 1000);
      if (type === 'otherworld') s.otherworldBonus = Number(s.otherworldBonus || 0) + 1;
      // 保護とボス素材は発生した瞬間に効果を適用する。後で消費するトークンは保持しない。
      save(g); api.indicator();
      if (type === 'auto2' || type === 'sweep') { g.renderBattleMenu?.(); g.showMainCommands?.(); }
      if (type === 'otherworld') { const panel = document.querySelector('#menu-panel'); if (panel) g.renderOtherWorldPanel?.(panel); }
      return true;
    },
    indicator() {
      const g = game(); if (!g) return;
      const s = state(g); let el = document.getElementById('q-offer-indicator');
      if (!el) { el = document.createElement('div'); el.id = 'q-offer-indicator'; document.body.appendChild(el); }
      const rows = [];
      if (active(s, 'auto2ExpiresAt')) rows.push('AUTO ×2');
      if (active(s, 'sweepExpiresAt')) rows.push('一掃');
      el.textContent = rows.join('　'); el.hidden = !rows.length;
    },
    otherworldHTML() {
      const g = game(); if (!g) return '';
      const s = state(g), left = remaining('otherworld'), added = Number(s.otherworldBonus || 0), disabled = left <= 0;
      return `<section class="q-context-offer q-otherworld-offer"><div><small>Q'S OFFER // OTHER WORLD</small><b>異界干渉力 +1</b><span>${added ? `本日 +${added} 回追加済み` : '広告を見て本日の侵入回数を追加'}</span></div><button data-q-offer="otherworld" ${disabled ? 'disabled' : ''}>${disabled ? '本日分終了' : '広告で +1'}<small>残り ${left} 回</small></button></section>`;
    },
    battleHTML() {
      const autoActive = api.isActive('auto2'), sweepActive = api.isActive('sweep');
      const autoLeft = remaining('auto2'), sweepLeft = remaining('sweep');
      return `<section class="q-battle-offers"><small>Q'S BATTLE SUPPORT</small><div><button data-q-offer="auto2" class="${autoActive ? 'active' : ''}" ${autoLeft <= 0 ? 'disabled' : ''}><b>AUTO ×2</b><span>${autoActive ? '発動中' : autoLeft <= 0 ? '本日分終了' : `広告で解放　残り${autoLeft}`}</span></button><button data-q-offer="sweep" class="${sweepActive ? 'active' : ''}" ${sweepLeft <= 0 ? 'disabled' : ''}><b>一掃</b><span>${sweepActive ? '発動中' : sweepLeft <= 0 ? '本日分終了' : `広告で解放　残り${sweepLeft}`}</span></button></div></section>`;
    },
    testDialogue(category = 'success') { const g = game(); if (!g) return false; playIntervention(g, category); return true; },
    // 文脈限定の「復活・装備復元・ボス素材」はデバッグ入口からも直接起動させない。
    debugHTML() { return `<section class="q-offer-debug"><header><b>Q'S OFFER // DEBUG</b><span>Mock provider・日次上限2回</span></header><div class="q-offer-debug-grid">${['auto2', 'sweep', 'otherworld'].map(k => { const d = defs[k]; return `<button data-q-debug="${k}">${d.title}<small>${d.label}</small></button>`; }).join('')}</div><header><b>DIALOGUE TEST</b><span>強制カテゴリ</span></header><div class="q-offer-debug-grid">${['success', 'hint', 'secret'].map(k => `<button data-q-dialogue="${k}">${k.toUpperCase()}<small>NOISE + Q</small></button>`).join('')}</div></section>`; },
    // 旧セーブ・旧呼び出し互換。設定画面にはQオファーを表示しない。
    normalHTML() { return ''; }
  };
  window.arseneQOffer = api;
  document.addEventListener('click', e => { const b = e.target.closest('[data-q-debug],[data-q-offer],[data-q-dialogue]'); if (!b || b.disabled) return; if (b.dataset.qDialogue) api.testDialogue(b.dataset.qDialogue); else api.show(b.dataset.qDebug || b.dataset.qOffer); });
  window.addEventListener('load', () => api.indicator());
})();
