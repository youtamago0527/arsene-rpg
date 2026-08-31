(() => {
  'use strict';

  // 称号成長の内訳でJOB名を引くのに使う。宣言が漏れていたため、
  // 称号成長を持つJOBの詳細を開くと ReferenceError で描画ごと落ちていた。
  const D = window.ARSENE_DATA;

  // 表記は game.js の statLabels に合わせて日本語で統一する。
  const STAT_LABELS = { str: '力', vit: '体力', mag: '魔力', mnd: '精神', agi: '素早さ', dex: '器用さ', luk: '運' };
  const BOSS_TITLES = {
    zenakado: { id: 'boss_cadenza', bossId: 'zenakado', defeatedId: 'zenacad', bossName: '独奏卿ゼナカド', origin: 'CADENZA', name: '《超越・CADENZA》', stat: 'mag', statLabel: '魔力' },
    myrthi: { id: 'boss_rhythm', bossId: 'myrthi', defeatedId: 'myrthi', bossName: '黒紅の双刃戦姫ミルティ', origin: 'RHYTHM', name: '《超越・RHYTHM》', stat: 'agi', statLabel: '素早さ' },
    seripes: { id: 'boss_reprise', bossId: 'seripes', defeatedId: 'seripes', bossName: '不落の反奏騎士セリペス', origin: 'REPRISE', name: '《超越・REPRISE》', stat: 'vit', statLabel: '体力' },
    astact: { id: 'boss_staccato', bossId: 'astact', defeatedId: 'astact', bossName: '断奏のアスタクト', origin: 'STACCATO', name: '《超越・STACCATO》', stat: 'luk', statLabel: '運' },
    ostina: { id: 'boss_ostinato', bossId: 'ostina', defeatedId: 'ostina', bossName: '月影のオスティナ', origin: 'OSTINATO', name: '《超越・OSTINATO》', stat: 'dex', statLabel: '器用さ' },
    chromatia: { id: 'boss_chromatic', bossId: 'chromatia', defeatedId: 'chromatia', bossName: '星彩のクロマティア', origin: 'CHROMATIC', name: '《超越・CHROMATIC》', stat: 'mnd', statLabel: '精神' },
    eclaim: { id: 'boss_requiem', bossId: 'eclaim', defeatedId: 'eclaim', bossName: '終奏のエクレイム', origin: 'REQUIEM', name: '《超越・REQUIEM》', stat: 'str', statLabel: '力' }
  };
  const TITLE_BY_ID = Object.fromEntries(Object.values(BOSS_TITLES).map(row => [row.id, row]));
  // 図鑑称号は取得条件と効果が確定した時に registerCollectionTitle() で追加する。
  // ボス称号とは保存先・装備枠を分離し、探索効果とJOB成長効果を混同しない。
  const COLLECTION_TITLES = {};
  // D1〜D4の図鑑（怪異図鑑）完成で得られる図鑑称号。
  // effectType/effectValue はゲーム各所の倍率計算が汎用的に参照する。
  // D5〜D7を追加するときはここへ定義を1件足すだけでよい（他コードの変更は不要）。
  [
    {
      id: 'd1_collection_gold', dungeonId: 'dungeon1', name: '《蒐集家・金脈》', nameEn: 'COLLECTOR // GOLD VEIN',
      acquireCondition: 'D1 図鑑完成', effectType: 'goldMultiplier', effectValue: 1.20,
      effectText: 'EFFECT　獲得GOLD ×1.20',
      description: 'D1の怪異図鑑を完成させた証。装備中は獲得GOLDが1.20倍になる。'
    },
    {
      id: 'd2_collection_exp', dungeonId: 'dungeon2', name: '《蒐集家・研鑽》', nameEn: 'COLLECTOR // TRAINING',
      acquireCondition: 'D2 図鑑完成', effectType: 'expMultiplier', effectValue: 1.20,
      effectText: 'EFFECT　獲得EXP ×1.20',
      description: 'D2の怪異図鑑を完成させた証。装備中は獲得EXPが1.20倍になる。'
    },
    {
      id: 'd3_collection_drop', dungeonId: 'dungeon3', name: '《蒐集家・目利き》', nameEn: 'COLLECTOR // APPRAISER',
      acquireCondition: 'D3 図鑑完成', effectType: 'dropMultiplier', effectValue: 1.10,
      effectText: 'EFFECT　DROP RATE ×1.10（元のDROP率に対する倍率補正）',
      description: 'D3の怪異図鑑を完成させた証。装備中はDROP率が元の値の1.10倍になる。'
    },
    {
      id: 'd4_collection_rare', dungeonId: 'dungeon4', name: '《蒐集家・探究》', nameEn: 'COLLECTOR // SEEKER',
      acquireCondition: 'D4 図鑑完成', effectType: 'rareEncounterMultiplier', effectValue: 1.25,
      effectText: 'EFFECT　レアモンスター遭遇率 ×1.25',
      description: 'D4の怪異図鑑を完成させた証。装備中はレアモンスターの遭遇率が1.25倍になる。'
    }
  ].forEach(definition => { COLLECTION_TITLES[definition.id] = { ...definition, category: 'collection' }; });

  const normalizeTitleProfile = profile => {
    if (!profile) return profile;
    profile.titleSystem ||= {};
    const system = profile.titleSystem;
    system.unlocked = !!system.unlocked;
    system.collectionSlotUnlocked = !!system.collectionSlotUnlocked;
    system.bossSlotUnlocked = !!system.bossSlotUnlocked;
    system.acquiredBoss = [...new Set(system.acquiredBoss || system.acquired || [])].filter(id => TITLE_BY_ID[id]);
    system.acquiredCollection = [...new Set(system.acquiredCollection || [])];
    // v0.1互換。旧フィールドはボス称号一覧として残す。
    system.acquired = [...system.acquiredBoss];
    system.equipped = { collection: null, boss: null, ...(system.equipped || {}) };
    if (!system.acquiredBoss.includes(system.equipped.boss)) system.equipped.boss = null;
    if (!system.acquiredCollection.includes(system.equipped.collection)) system.equipped.collection = null;
    system.bossProgress ||= {};
    profile.titleGrowthGained ||= {};
    return profile;
  };

  const proto = BattleGame.prototype;
  const originalLoadProfile = proto.loadProfile;
  proto.loadProfile = function (...args) { return normalizeTitleProfile(originalLoadProfile.apply(this, args)); };

  proto.bossTitleDefinition = function (bossId) {
    const key = bossId === 'zenacad' ? 'zenakado' : bossId;
    return BOSS_TITLES[key] || null;
  };
  proto.bossOverdriveProgress = function (bossId) {
    normalizeTitleProfile(this.profile);
    const def = this.bossTitleDefinition(bossId); if (!def) return null;
    return this.profile.titleSystem.bossProgress[def.bossId] ||= { od1Cleared: false, od2Unlocked: false, od2Cleared: false };
  };
  proto.acquireBossTitle = function (bossId) {
    const def = this.bossTitleDefinition(bossId); if (!def) return null;
    const system = normalizeTitleProfile(this.profile).titleSystem;
    const wasSystemUnlocked = system.unlocked, wasBossSlotUnlocked = system.bossSlotUnlocked;
    const first = !system.acquiredBoss.includes(def.id);
    if (first) system.acquiredBoss.push(def.id);
    system.acquired = [...system.acquiredBoss];
    system.unlocked = true;
    system.collectionSlotUnlocked = true;
    system.bossSlotUnlocked = true;
    return { ...def, first, systemUnlocked: !wasSystemUnlocked, bossSlotUnlocked: !wasBossSlotUnlocked };
  };
  proto.registerCollectionTitle = function (definition) {
    if (!definition?.id || !definition?.name) return null;
    COLLECTION_TITLES[definition.id] = { ...definition, category: 'collection' };
    return COLLECTION_TITLES[definition.id];
  };
  proto.acquireCollectionTitle = function (titleOrId) {
    const def = typeof titleOrId === 'string' ? COLLECTION_TITLES[titleOrId] : this.registerCollectionTitle(titleOrId);
    if (!def) return null;
    const system = normalizeTitleProfile(this.profile).titleSystem;
    const wasSystemUnlocked = system.unlocked, first = !system.acquiredCollection.includes(def.id);
    if (first) system.acquiredCollection.push(def.id);
    system.unlocked = true;
    system.collectionSlotUnlocked = true;
    this.saveProfile();
    return { ...def, first, systemUnlocked: !wasSystemUnlocked };
  };
  proto.equippedCollectionTitle = function () {
    normalizeTitleProfile(this.profile);
    return COLLECTION_TITLES[this.profile.titleSystem.equipped.collection] || null;
  };
  // 図鑑称号の効果値を汎用的に取得する。装備中の図鑑称号のeffectTypeが一致しなければ
  // fallback（効果なし＝1倍）を返すので、GOLD/EXP/DROP/レア遭遇の各計算式は
  // 称号IDを一切知らずに「今の倍率」だけを聞ける。
  proto.collectionTitleEffect = function (effectType, fallback = 1) {
    const title = this.equippedCollectionTitle();
    if (!title || title.effectType !== effectType) return fallback;
    const value = Number(title.effectValue);
    return Number.isFinite(value) ? value : fallback;
  };
  // 図鑑（怪異図鑑）が対象ダンジョンで100%になった瞬間に、対応する図鑑称号を自動付与する。
  // 何度呼ばれても安全（未登録・未100%・取得済みは何もしない）。
  // 旧セーブで既に100%だったプレイヤーも、次にそのダンジョンの戦闘へ入るか
  // 図鑑を開いた時点で自動的に取得できる（再取得の操作は不要）。
  proto.checkCollectionTitleUnlocks = function (dungeonId) {
    if (!dungeonId || typeof this.archiveCompletionPct !== 'function') return;
    const system = normalizeTitleProfile(this.profile).titleSystem;
    Object.values(COLLECTION_TITLES).forEach(title => {
      if (title.dungeonId !== dungeonId) return;
      if (system.acquiredCollection.includes(title.id)) return;
      if (this.archiveCompletionPct(dungeonId) !== 100) return;
      const acquired = this.acquireCollectionTitle(title.id);
      if (acquired?.first) this.flashTitle?.('図鑑称号 GET', title.name);
    });
  };
  proto.equippedBossTitle = function () {
    normalizeTitleProfile(this.profile);
    return TITLE_BY_ID[this.profile.titleSystem.equipped.boss] || null;
  };
  proto.applyEquippedBossTitleGrowth = function (jobId, levels) {
    const title = this.equippedBossTitle();
    if (!title || !levels || this.isNoGrowthJob(jobId) || this.isPhantomThief(jobId)) return null;
    this.profile.jobGrowthGained ||= {};
    const actual = this.profile.jobGrowthGained[jobId] ||= {};
    actual[title.stat] = (Number(actual[title.stat]) || 0) + levels;
    this.profile.titleGrowthGained ||= {};
    const detail = this.profile.titleGrowthGained[jobId] ||= {};
    detail[title.stat] = (Number(detail[title.stat]) || 0) + levels;
    this.recordPhantomGrowth(jobId);
    return { titleId: title.id, titleName: title.name, stat: title.stat, statLabel: title.statLabel, amount: levels };
  };

  const originalGrantJobExp = proto.grantJobExp;
  proto.grantJobExp = function (...args) {
    const result = originalGrantJobExp.apply(this, args);
    if (!result || result.to <= result.from) return result;
    const titleGain = this.applyEquippedBossTitleGrowth(result.jobId, result.to - result.from);
    if (!titleGain) return result;
    result.titleGain = titleGain;
    this.saveProfile();
    if (!this.quickResolving) this.queueGrowthBubble?.(`${titleGain.titleName} // TITLE`, `${titleGain.statLabel} +${titleGain.amount}`);
    return result;
  };

  const originalJobResultHTML = proto.jobResultHTML;
  proto.jobResultHTML = function (result) {
    const html = originalJobResultHTML.call(this, result);
    if (!result?.titleGain) return html;
    return `${html}<div class="title-level-gain"><b>TITLE BONUS　${result.titleGain.titleName}</b><span>${result.titleGain.statLabel} +${result.titleGain.amount}</span></div>`;
  };

  const originalDoRebirth = proto.doRebirth;
  proto.doRebirth = function (jobId) {
    normalizeTitleProfile(this.profile);
    const before = { ...(this.profile.titleGrowthGained?.[jobId] || {}) };
    const result = originalDoRebirth.call(this, jobId);
    if (!result?.ok) return result;
    const retention = result.retention ?? .20;
    const detail = this.profile.titleGrowthGained[jobId] ||= {};
    Object.entries(before).forEach(([key, value]) => { detail[key] = Math.floor((Number(value) || 0) * retention); });
    this.saveProfile();
    this.renderMenuPanel?.('job');
    return result;
  };

  proto.titlePanelHtml = function () {
    const system = normalizeTitleProfile(this.profile).titleSystem;
    const boss = TITLE_BY_ID[system.equipped.boss];
    const collection = COLLECTION_TITLES[system.equipped.collection];
    const bossCards = system.acquiredBoss.map(id => {
      const title = TITLE_BY_ID[id]; if (!title) return '';
      const equipped = id === system.equipped.boss;
      return `<article class="title-card${equipped ? ' equipped' : ''}"><div><small>BOSS TITLE // ${title.statLabel}成長</small><strong>${title.name}</strong><p>${title.bossName} OVERDRIVE II撃破の証。装備中に実際のJOB Lvが1上がるたび、そのJOBへ${title.statLabel}+1。</p></div><button data-title-${equipped ? 'unequip' : 'equip'}="${id}">${equipped ? 'EQUIPPED / 外す' : '装備する'}</button></article>`;
    }).join('');
    const collectionCards = system.acquiredCollection.map(id => {
      const title = COLLECTION_TITLES[id] || { id, name: id, description: '探索・収集を支援する図鑑称号。', effectText: '効果準備中' };
      const equipped = id === system.equipped.collection;
      return `<article class="title-card collection${equipped ? ' equipped' : ''}"><div><small>COLLECTION TITLE</small><strong>${title.name}</strong><p>${title.description || ''}</p>${title.effectText ? `<em class="title-effect">${title.effectText}</em>` : ''}</div><button data-collection-title-${equipped ? 'unequip' : 'equip'}="${id}">${equipped ? 'EQUIPPED / 外す' : '装備する'}</button></article>`;
    }).join('');
    const cards = `${collectionCards}${bossCards}` || '<p class="jbn-none">まだ称号を獲得していません。</p>';
    const collectionSlot = system.collectionSlotUnlocked ? `<div class="title-slot"><small>COLLECTION TITLE</small><b>${collection?.name || '未装備'}</b><span>${collection?.effectText || '探索・収集称号枠'}</span></div>` : '';
    const bossSlot = system.bossSlotUnlocked ? `<div class="title-slot"><small>BOSS TITLE</small><b>${boss?.name || '未装備'}</b><span>${boss ? `${boss.statLabel}+1 / JOB Lv.UP` : '超越称号枠'}</span></div>` : '';
    return `<section class="title-system"><div class="title-system-intro"><small>TITLE EQUIPMENT</small><h3>称号装備</h3><p>アルカナはキャラクターの恒久能力、ボス称号は現在JOBのLvアップ成長を強化します。称号成長も転生時20%保持・PHANTOM THIEFへ50%盗奪されます。</p></div><div class="title-slots">${collectionSlot}${bossSlot}</div><div class="title-list">${cards}</div></section>`;
  };

  const originalJobDetailHtml = proto.jobDetailHtml;
  proto.jobDetailHtml = function (jobId, ...args) {
    const html = originalJobDetailHtml.call(this, jobId, ...args);
    const titleGrowth = this.profile.titleGrowthGained?.[jobId] || {};
    const rows = Object.entries(titleGrowth).filter(([, value]) => Number(value) > 0)
      .map(([stat, value]) => `<div class="jbn-item"><span>${STAT_LABELS[stat] || stat}</span><b>+${value}</b></div>`).join('');
    if (!rows) return html;
    return `${html}<section class="title-growth-breakdown"><small>TITLE BONUS GROWTH</small><h4>称号成長の内訳</h4><div class="jbn-grid">${rows}</div><p>この値は${D.jobs[jobId]?.name || jobId}に帰属し、転生時20%保持・PHANTOM THIEFへ50%盗奪されます。</p></section>`;
  };

  document.addEventListener('click', event => {
    const equip = event.target.closest('[data-title-equip]');
    const unequip = event.target.closest('[data-title-unequip]');
    const collectionEquip = event.target.closest('[data-collection-title-equip]');
    const collectionUnequip = event.target.closest('[data-collection-title-unequip]');
    if (!equip && !unequip && !collectionEquip && !collectionUnequip) return;
    const game = window.arseneGame; if (!game) return;
    normalizeTitleProfile(game.profile);
    if (equip) {
      const id = equip.dataset.titleEquip;
      if (game.profile.titleSystem.acquiredBoss.includes(id)) game.profile.titleSystem.equipped.boss = id;
    } else if (unequip) game.profile.titleSystem.equipped.boss = null;
    if (collectionEquip) {
      const id = collectionEquip.dataset.collectionTitleEquip;
      if (game.profile.titleSystem.acquiredCollection.includes(id)) game.profile.titleSystem.equipped.collection = id;
    } else if (collectionUnequip) game.profile.titleSystem.equipped.collection = null;
    game.audio?.sfx('ui'); game.saveProfile();
    game.renderMenuPanel(game.titlePanelSource === 'equipment' ? 'equipment' : 'job');
  });

  proto.showOverdriveModal = function (bossId) {
    const def = this.bossTitleDefinition(bossId); if (!def) return false;
    const progress = this.bossOverdriveProgress(bossId);
    document.querySelector('.boss-overdrive-modal')?.remove();
    const modal = document.createElement('div');
    modal.className = 'q-offer-modal q-offer-defeat boss-overdrive-modal';
    modal.innerHTML = `<div class="q-offer-card q-revive-card boss-overdrive-copy" role="dialog" aria-label="ボス超越戦"><button class="q-offer-close" data-od-close>✕ CLOSE</button><small class="q-revive-tag"><i></i>Q'S CHALLENGE</small><h2>BOSS OVERDRIVE</h2><span class="od-boss">${def.bossName}</span><p>Q「勝ったくらいで、終わったと思った？」</p><div class="boss-overdrive-actions"><button data-od-level="0">通常再戦<span>NORMAL REMATCH</span></button><button class="danger" data-od-level="1">OVERDRIVE I　×2<span>DROP RATE ×4 / OD II UNLOCK</span></button><button class="od2" data-od-level="2" ${progress.od2Unlocked ? '' : 'disabled'}>OVERDRIVE II　×4<span>${progress.od2Unlocked ? `FIRST CLEAR TITLE // ${def.name}` : 'LOCKED // CLEAR OVERDRIVE I'}</span></button><button class="close" data-od-close>戻る<span>CANCEL</span></button></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => {
      if (event.target.closest('[data-od-close]')) { modal.remove(); return; }
      const button = event.target.closest('[data-od-level]'); if (!button || button.disabled) return;
      const level = Number(button.dataset.odLevel) || 0; modal.remove(); this.startBossByKey(bossId, level);
    });
    return true;
  };

  const originalStartBossByKey = proto.startBossByKey;
  proto.startBossByKey = function (key, overdriveLevel = null) {
    const def = this.bossTitleDefinition(key);
    if (def && overdriveLevel == null && this.isBossDefeated(def.defeatedId) && this.rematchProgress(key).ready) return this.showOverdriveModal(key);
    if (def && Number(overdriveLevel) > 0) this.pendingBossOverdrive = { key: def.bossId, level: Math.min(2, Number(overdriveLevel)) };
    else this.pendingBossOverdrive = null;
    const result = originalStartBossByKey.call(this, key);
    if (this.activeBossOverdrive?.level) setTimeout(() => this.flashTitle(`OVERDRIVE ${this.activeBossOverdrive.level === 2 ? 'II' : 'I'}`, `BOSS POWER ×${this.activeBossOverdrive.multiplier}`), 50);
    return result;
  };

  proto.applyBossOverdriveStats = function (bossId, baseStats) {
    const def = this.bossTitleDefinition(bossId), pending = this.pendingBossOverdrive;
    if (!def || !pending || pending.key !== def.bossId || !pending.level) { this.activeBossOverdrive = null; return { ...baseStats }; }
    const level = Math.min(2, Math.max(1, pending.level)), multiplier = level === 2 ? 4 : 2;
    if (level === 2 && !this.bossOverdriveProgress(def.bossId).od2Unlocked) { this.pendingBossOverdrive = null; this.activeBossOverdrive = null; return { ...baseStats }; }
    const scaled = {};
    Object.entries(baseStats || {}).forEach(([key, value]) => { scaled[key] = typeof value === 'number' ? Math.max(1, Math.round(value * multiplier)) : value; });
    this.activeBossOverdrive = { bossId: def.bossId, level, multiplier };
    this.pendingBossOverdrive = null;
    return scaled;
  };

  const originalRollDrops = proto.rollDrops;
  proto.rollDrops = function (enemy) {
    const active = this.activeBossOverdrive;
    // 敗北後に拠点へ戻った場合など、前回のOVERDRIVE情報が残っていても
    // 別の戦闘へドロップ4倍を漏らさない。
    if (!active?.level || this.battleMode !== active.bossId) return originalRollDrops.call(this, enemy);
    const bonus = this.traitDropRateBonus(), drops = [];
    (enemy.dropTable || []).forEach(drop => {
      const chance = Math.min(1, ((Number(drop.chance) || 0) + bonus) * 4);
      if (Math.random() < chance) drops.push([drop.itemId, 1]);
    });
    return drops;
  };

  proto.showBossTitlePopup = function ({ title, kicker, copy, detail, onClose }) {
    document.querySelector('.boss-title-popup')?.remove();
    const modal = document.createElement('div');
    modal.className = 'q-offer-modal q-offer-defeat boss-title-popup';
    modal.innerHTML = `<div class="q-offer-card q-revive-card boss-overdrive-copy" role="dialog" aria-label="称号獲得"><small class="q-revive-tag"><i></i>${kicker}</small><h2>${title}</h2><p>${copy}</p><div class="q-revive-details"><div><span><i></i>JOB Lv.UP BONUS</span><b>${detail}</b></div><div><span><i></i>成長の所属</span><b>現在のJOB</b></div></div><button class="q-offer-watch" data-title-close><span>確認する</span></button></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => { if (!event.target.closest('[data-title-close]')) return; modal.remove(); onClose?.(); });
  };

  proto.finishBossOverdriveVictory = async function (rewardBlock) {
    const active = this.activeBossOverdrive, def = this.bossTitleDefinition(active?.bossId); if (!active || !def) return;
    const level = active.level, progress = this.bossOverdriveProgress(def.bossId);
    let acquired = null;
    if (level === 1) { progress.od1Cleared = true; progress.od2Unlocked = true; }
    if (level === 2) { progress.od2Cleared = true; acquired = this.acquireBossTitle(def.bossId); }
    this.noteBossRematchSnapshot?.(def.bossId);
    this.saveProfile();
    this.activeBossOverdrive = null;
    const finish = () => this.showResult(`OVERDRIVE ${level === 2 ? 'II' : 'I'} CLEARED`, `${def.bossName}の超越戦を制した。`, level === 2 ? 'TITLE ACQUIRED' : 'OVERDRIVE II UNLOCKED', rewardBlock);
    if (level === 1) {
      this.showBossTitlePopup({ title: 'OVERDRIVE II UNLOCKED', kicker: "Q'S CHALLENGE", copy: 'Q「……まだ先があるよ。」', detail: `${def.name} // ${def.statLabel}+1`, onClose: finish });
      return;
    }
    const showUnlock = () => {
      if (!acquired?.first || (!acquired.systemUnlocked && !acquired.bossSlotUnlocked)) { finish(); return; }
      this.showBossTitlePopup({
        title: acquired.systemUnlocked ? 'TITLE SYSTEM UNLOCKED' : 'BOSS TITLE SLOT UNLOCKED',
        kicker: 'NEW EQUIPMENT SYSTEM',
        copy: acquired.systemUnlocked ? '図鑑称号枠とボス称号枠が解放されました。' : 'ボス称号枠が解放されました。',
        detail: 'COLLECTION ×1 / BOSS ×1',
        onClose: finish
      });
    };
    const show = () => this.showBossTitlePopup({ title: acquired?.first ? `TITLE ACQUIRED　${def.name}` : `TITLE CLEARED　${def.name}`, kicker: 'OVERDRIVE II COMPLETE', copy: `Q「その力、肩書きだけで終わらせないでよ。」`, detail: `${def.statLabel} +1`, onClose: showUnlock });
    if (typeof this.playNoiseSequence === 'function') this.playNoiseSequence([{ sys: 'NOISE...' }, { who: 'Q', text: 'その力、肩書きだけで終わらせないでよ。' }], { onClose: show });
    else show();
  };
  proto.clearBossOverdriveChallenge = function () {
    this.pendingBossOverdrive = null;
    this.activeBossOverdrive = null;
  };

  proto.isCurrentBossOverdriveBattle = function () {
    const active = this.activeBossOverdrive;
    if (!active?.level || this.battleMode !== active.bossId) return false;
    return (this.enemies || []).some(enemy => enemy?.id === active.bossId);
  };

  proto.handleBossOverdriveVictory = function (rewardBlock) {
    // 敗北後に挑戦情報が残っても、対象ボス本人の戦闘以外を
    // OVERDRIVEクリアとして処理しない。
    if (!this.isCurrentBossOverdriveBattle()) {
      this.clearBossOverdriveChallenge();
      return false;
    }
    this.finishBossOverdriveVictory(rewardBlock);
    return true;
  };

  const originalHelpUnlocked = proto.helpUnlocked;
  if (originalHelpUnlocked) proto.helpUnlocked = function (key) {
    if (key === 'titleSystem') return !!normalizeTitleProfile(this.profile).titleSystem.unlocked;
    return originalHelpUnlocked.call(this, key);
  };
  if (Array.isArray(window.ARSENE_HELP) && !window.ARSENE_HELP.some(row => row.id === 'titles')) window.ARSENE_HELP.push({
    id: 'titles', title: '称号とアルカナ', titleEn: 'TITLE & ARCANA', lockedBy: 'titleSystem', lockedText: '初めて称号を獲得すると解放されます。',
    body: [
      '称号には、探索・収集を支援する「図鑑称号」と、JOB育成を変化させる「ボス称号」があります。それぞれ1つずつ装備できます。',
      'アルカナ：キャラクター本人へ刻まれる恒久成長です。JOBを変更しても失われません。',
      'ボス称号：装備中にJOB Lvが上がると、対応能力+1を現在JOBへ刻みます。転生時20%保持、PHANTOM THIEFには既存仕様どおり50%だけ盗奪されます。',
      '称号成長は実際にJOB Lvが上がった回数だけ発動し、上限LvでEXPを得ただけでは発動しません。'
    ]
  });

  window.ArseneTitleSystem = { bossTitles: BOSS_TITLES, collectionTitles: COLLECTION_TITLES, titleById: TITLE_BY_ID, normalizeTitleProfile };
})();
