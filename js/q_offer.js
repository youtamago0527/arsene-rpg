/* Q'S OFFER — native iOS uses AdMob rewarded ads; web keeps the mock preview. */
(function () {
  const DAILY = 2;
  const IOS_REWARDED_TEST_ID = 'ca-app-pub-3940256099942544/1712485313';
  const DAY = () => new Date().toLocaleDateString('ja-JP');
  const QD = window.ARSENE_Q_DIALOGUE || { rates: { hint: .1, secret: .01 }, offer: {}, success: [], hint: [], secret: [] };
  const defs = {
    auto2: { title: 'AUTO ×2.0', copy: '30分間、AUTOの演出速度を×2.0へ。AIが通常戦闘を操作するだけで、能力・ダメージ・報酬は変化しない。アイテム消費と敗北は通常どおり発生する。', key: 'auto2Uses', expiry: 'auto2ExpiresAt', label: 'AUTO速度アップ' },
    sweep: { title: '一掃', copy: '30分間、通常ダンジョンの雑魚戦だけ一掃を解放する。現在の残HP・MP、装備/JOB/技と敵全員の能力から勝敗を予測し、戦力不足なら敗北する。エリート・レア・全ボス・異世界には使用できない。', key: 'sweepUses', expiry: 'sweepExpiresAt', label: '雑魚戦の簡易決着' },
    exp2: { title: '強昆布ラーメン', copy: '1時間、通常ダンジョンで敵撃破EXPとJOB EXPを2倍にする。GOLD・ドロップ・武器学EXPは増加しない。', key: 'exp2Uses', expiry: 'exp2ExpiresAt', durationMs: 60 * 60 * 1000, extend: true, label: '獲得EXP ×2' },
    gold2: { title: '海老味噌ラーメン', copy: '1時間、通常ダンジョンで敵撃破GOLDを2倍にする。EXP・JOB EXP・ドロップ・武器学EXPは増加しない。', key: 'gold2Uses', expiry: 'gold2ExpiresAt', durationMs: 60 * 60 * 1000, extend: true, label: '獲得GOLD ×2' },
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
      reviveUses: 0, restoreUses: 0, exp2Uses: 0, gold2Uses: 0, otherworldBonus: 0
    });
    return s;
  }
  function save(g) { g.saveProfile?.(); }
  function premium(g) {
    if (!g?.profile) return null;
    return g.profile.premium ||= { adSkipLicense: false, adSkipTickets: 0, auto3License: false, sweepLicense: false, otherworldTickets: 0 };
  }
  function hasAdSkip(g) { const p = premium(g); return !!(p?.adSkipLicense || Number(p?.adSkipTickets) > 0); }
  function consumeAdSkip(g) {
    const p = premium(g); if (!p || p.adSkipLicense) return;
    p.adSkipTickets = Math.max(0, (Number(p.adSkipTickets) || 0) - 1); save(g);
  }
  function active(s, key) { return Number(s[key] || 0) > Date.now(); }
  function timeLabel(ms) {
    if (ms <= 0) return '未発動';
    const minutes = Math.max(1, Math.ceil(ms / 60000));
    if (minutes < 60) return `残り ${minutes}分`;
    const hours = Math.floor(minutes / 60), rest = minutes % 60;
    return `残り ${hours}時間${rest ? `${rest}分` : ''}`;
  }
  function isDaily(type) { return ['auto2', 'sweep', 'exp2', 'gold2', 'otherworld', 'revive', 'protect'].includes(type); }
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
  function nativeAdMob() {
    const capacitor = window.Capacitor;
    if (!capacitor?.isNativePlatform?.()) return null;
    return capacitor.Plugins?.AdMob || null;
  }
  let adMobInit;
  async function showNativeRewardedAd() {
    const adMob = nativeAdMob();
    if (!adMob) throw new Error('AdMob plugin is unavailable');
    adMobInit ||= adMob.initialize();
    await adMobInit;
    await adMob.prepareRewardVideoAd({
      adId: IOS_REWARDED_TEST_ID,
      isTesting: true,
      npa: true
    });
    const reward = await adMob.showRewardVideoAd();
    if (!reward || Number(reward.amount) <= 0) throw new Error('Reward was not earned');
    return reward;
  }
  const api = {
    defs,
    canUse(type = 'auto2') { return canUse(game(), type); },
    remaining,
    isActive(type) {
      const g = game(), d = defs[type];
      if (type === 'sweep' && g?.profile?.premium?.sweepLicense) return true;
      return !!(g && d?.expiry && active(state(g), d.expiry));
    },
    hasAdSkip() { return hasAdSkip(game()); },
    adSkipTickets() { return Math.max(0, Number(premium(game())?.adSkipTickets) || 0); },
    bonus(type) { const g = game(); return g ? Number(state(g)[`${type}Bonus`] || 0) : 0; },
    show(type = 'auto2', extra = {}) {
      const g = game(); if (!canUse(g, type)) return false;
      const d = { ...(defs[type] || defs.auto2), ...extra }, left = remaining(type);
      const qCopy = String(extra.copy ?? QD.offer?.[type] ?? d.copy).replace(/\n/g, '<br>'), skip = hasAdSkip(g), native = !!nativeAdMob();
      const adStatus = skip ? (premium(g).adSkipLicense ? '永久スキップ適用' : `スキップ券を使用（残り${Number(premium(g).adSkipTickets) || 0}）`) : native ? 'リワード広告を読み込みます' : 'ブラウザ用プレビュー';
      const countdown = skip || native ? 'READY' : '3', watchText = skip ? '広告をスキップして発動する' : '広告を見て発動する';
      const reviveCard = `<div class="q-offer-card q-revive-card" role="dialog" aria-label="戦闘復活"><button class="q-offer-close" data-q-close aria-label="閉じる">✕ CLOSE</button><header><small class="q-revive-tag"><i></i>DAILY REVIVE REWARD</small><h2>怪盗の再起</h2><p>Q「${qCopy}」</p></header><div class="q-revive-details"><div><span><i></i>復活時HP</span><b>最大HPの50%</b></div><div><span><i></i>復帰地点</span><b>現在の戦闘</b></div><div><span><i></i>本日の残り回数</span><b>${left} 回</b></div></div><div class="q-offer-ad"><span>${adStatus}</span><b data-q-countdown>${countdown}</b></div><button class="q-offer-watch" data-q-watch><span>▶　${watchText}</span></button><button class="q-revive-cancel" data-q-close>今回は諦める</button></div>`;
      const normalCard = `<div class="q-offer-card" role="dialog" aria-label="Q offer"><button class="q-offer-close" data-q-close aria-label="閉じる">×</button><div class="q-offer-q">Q</div><small class="q-offer-kicker">Q'S OFFER</small><h2>${d.title}</h2><p>「${qCopy}」</p><div class="q-offer-ad"><span>${adStatus}</span><b data-q-countdown>${countdown}</b></div><button class="q-offer-watch" data-q-watch>${watchText}<span>${skip ? 'SKIP ENTITLEMENT' : native ? 'REWARDED AD' : 'WEB PREVIEW'}</span></button></div>`;
      const modal = document.createElement('div'); modal.className = 'q-offer-modal'; modal.innerHTML = type === 'revive' ? reviveCard : normalCard; if (type === 'revive') modal.classList.add('q-offer-defeat'); document.body.appendChild(modal);
      let n = 3; const count = modal.querySelector('[data-q-countdown]'), watch = modal.querySelector('[data-q-watch]'); watch.disabled = !skip && !native;
      const timer = skip || native ? null : setInterval(() => { n--; if (count) count.textContent = n; if (n <= 0) { clearInterval(timer); watch.disabled = false; } }, 1000);
      modal.addEventListener('click', async e => {
        if (e.target.closest('[data-q-close]')) { clearInterval(timer); modal.remove(); d.onClose?.(); return; }
        if (e.target.closest('[data-q-watch]') && !watch.disabled) {
          clearInterval(timer);
          watch.disabled = true;
          try {
            if (native && !skip) {
              if (count) count.textContent = 'LOAD';
              await showNativeRewardedAd();
            }
            modal.remove();
            playIntervention(g, d.forceDialogueCategory, () => { const granted = api.grant(type); if (granted) { if (skip) consumeAdSkip(g); d.onGrant?.(); } });
          } catch (error) {
            console.error('Rewarded ad failed', error);
            if (count) count.textContent = 'ERROR';
            const status = modal.querySelector('.q-offer-ad span');
            if (status) status.textContent = '広告を読み込めませんでした。もう一度お試しください';
            watch.disabled = false;
          }
        }
      });
      return true;
    },
    grant(type) {
      const g = game(); if (!g) return false;
      const d = defs[type] || defs.auto2, s = state(g), daily = isDaily(type);
      if (daily && Number(s[d.key] || 0) >= DAILY) { window.arseneStartFlow?.toast?.('本日のQ’S OFFERは受け取り済みです'); return false; }
      if (daily) s[d.key] = (Number(s[d.key]) || 0) + 1;
      if (d.expiry) {
        const duration = Number(d.durationMs) || 30 * 60 * 1000;
        const start = d.extend ? Math.max(Date.now(), Number(s[d.expiry]) || 0) : Date.now();
        s[d.expiry] = start + duration;
      }
      if (type === 'otherworld') s.otherworldBonus = Number(s.otherworldBonus || 0) + 1;
      // 保護とボス素材は発生した瞬間に効果を適用する。後で消費するトークンは保持しない。
      save(g); api.indicator();
      if (type === 'auto2' || type === 'sweep') { g.renderBattleMenu?.(); g.showMainCommands?.(); }
      if (type === 'exp2' || type === 'gold2') {
        g.renderMenuSummary?.();
        const panel = document.querySelector('#menu-panel[data-panel="food"]');
        if (panel) g.renderMenuPanel?.('food');
      }
      if (type === 'otherworld') { const panel = document.querySelector('#menu-panel'); if (panel) g.renderOtherWorldPanel?.(panel); }
      return true;
    },
    indicator() {
      // 広告由来の効果は固定HUDへ出さず、戦闘MENU／設定の専用欄へ集約する。
      document.getElementById('q-offer-indicator')?.remove();
    },
    otherworldHTML() {
      const g = game(); if (!g) return '';
      const s = state(g), left = remaining('otherworld'), added = Number(s.otherworldBonus || 0), disabled = left <= 0;
      return `<section class="q-context-offer q-otherworld-offer"><div><small>Q'S OFFER // OTHER WORLD</small><b>異界干渉力 +1</b><span>${added ? `本日 +${added} 回追加済み` : '広告を見て本日の侵入回数を追加'}</span></div><button data-q-offer="otherworld" ${disabled ? 'disabled' : ''}>${disabled ? '本日分終了' : '広告で +1'}<small>残り ${left} 回</small></button></section>`;
    },
    foodHTML() {
      const g = game(); if (!g) return '';
      const s = state(g);
      const meal = (type, name, effect, excluded) => {
        const d = defs[type], left = remaining(type), ms = Math.max(0, Number(s[d.expiry] || 0) - Date.now());
        const activeNow = ms > 0, disabled = left <= 0;
        return `<article class="q-ad-meal ${activeNow ? 'active' : ''}"><div><b>${name}</b><span>${effect}</span><em>${excluded}　${timeLabel(ms)}</em></div><button data-q-offer="${type}" ${disabled ? 'disabled' : ''}>${disabled ? '本日分終了' : activeNow ? '広告を見て1時間追加' : `広告を見て${name}を食べる`}<small>本日残り ${left} 回</small></button></article>`;
      };
      return `<details class="q-food-ad-menu"><summary><span><small>KAZU × Q // SECRET REWARD MENU</small><b>広告メニュー</b></span><em>広告で発動する時短料理</em></summary><div>${meal('exp2', '強昆布ラーメン', '1時間　敵撃破EXP・JOB EXP ×2', 'GOLD・DROP・武器学は対象外')}${meal('gold2', '海老味噌ラーメン', '1時間　敵撃破GOLD ×2', 'EXP・DROP・武器学は対象外')}<article class="q-ad-meal coming"><div><b>ホタテ塩バターラーメン</b><span>COMING SOON</span></div></article><article class="q-ad-meal coming"><div><b>カニ味噌ラーメン</b><span>COMING SOON</span></div></article></div></details>`;
    },
    adEffectsHTML(compact = false) {
      const g = game(); if (!g) return '';
      const s = state(g), rows = [
        { name: '強昆布ラーメン', effect: '敵撃破EXP・JOB EXP ×2', expiry: 'exp2ExpiresAt' },
        { name: '海老味噌ラーメン', effect: '敵撃破GOLD ×2', expiry: 'gold2ExpiresAt' },
        { name: 'AUTO速度', effect: 'AUTO演出速度 ×2.0', expiry: 'auto2ExpiresAt' },
        { name: '一掃', effect: '通常Dの雑魚戦を簡易決着', expiry: 'sweepExpiresAt', permanent: !!g.profile?.premium?.sweepLicense }
      ].map(row => {
        const ms = Math.max(0, Number(s[row.expiry] || 0) - Date.now()), on = row.permanent || ms > 0;
        return `<article class="${on ? 'active' : ''}"><i></i><div><b>${row.name}</b><span>${row.effect}</span></div><em>${row.permanent ? '永久解放' : timeLabel(ms)}</em></article>`;
      }).join('');
      return `<section class="q-ad-status ${compact ? 'compact' : ''}"><div class="q-ad-status-inner"><header><small>PHANTOM REWARD STATUS</small><h3>広告効果</h3><span>広告で発動した効果と残り時間</span></header><div class="q-ad-status-rows">${rows}</div>${compact ? '' : `<p>広告料理は「カズのまかない」内の裏メニューから各1日2回まで発動できます。効果中に同じ料理を食べると残り時間へ1時間追加されます。</p>`}</div></section>`;
    },
    battleHTML() {
      const autoActive = api.isActive('auto2'), sweepActive = api.isActive('sweep'), sweepPermanent = !!game()?.profile?.premium?.sweepLicense;
      const autoLeft = remaining('auto2'), sweepLeft = remaining('sweep');
      return `${api.adEffectsHTML(true)}<section class="q-battle-offers"><small>Q'S BATTLE SUPPORT</small><div><button data-q-offer="auto2" class="${autoActive ? 'active' : ''}" ${autoLeft <= 0 ? 'disabled' : ''}><b>AUTO ×2</b><span>${autoActive ? '発動中' : autoLeft <= 0 ? '本日分終了' : `広告で解放　残り${autoLeft}`}</span></button><button data-q-offer="sweep" class="${sweepActive ? 'active' : ''}" ${sweepPermanent || sweepLeft <= 0 ? 'disabled' : ''}><b>一掃</b><span>${sweepPermanent ? '永久解放済み' : sweepActive ? '発動中' : sweepLeft <= 0 ? '本日分終了' : `広告で解放　残り${sweepLeft}`}</span></button></div><details class="q-battle-rules"><summary>AUTO・一掃の仕様を確認</summary><p><b>AUTO</b> 通常戦闘をAI操作。倍率は演出速度だけで、能力・ダメージ・報酬は変わりません。回復アイテムを使うことも、敗北することもあります。</p><p><b>一掃</b> 通常Dの雑魚戦だけ。現在の残HP・MP、装備/JOB込みの攻防、習得技、敵全員のHP・攻防から必要ターンと被ダメージを予測します。<strong>予測被ダメージが現在HP以上なら敗北</strong>。回復アイテムは使用せず、エリート・レア・全ボス・異世界には使用できません。勝利時のEXP/GOLD/DROPは通常抽選、武器学は推定ターンに応じて1〜8獲得します。</p></details></section>`;
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
