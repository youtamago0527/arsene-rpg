(() => {
  'use strict';
  const D = window.ARSENE_DATA, $ = (s, r = document) => r.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const roll = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clone = value => JSON.parse(JSON.stringify(value));
  const statLabels = { maxHp: 'HP', maxMp: 'MP', str: '力', vit: '体力', mag: '魔力', mnd: '精神', agi: '素早さ', dex: '器用さ', luk: '運', critBonus: '会心率' };
  // 会心率は仕様として非公式な値なので、ステータス画面の一覧には出さない。
  const statusHiddenStats = ['critBonus'];
  const statusStatKeys = Object.keys(statLabels).filter(k => !statusHiddenStats.includes(k));

  class BattleGame {
    constructor() {
      this.profile = this.loadProfile(); this.sanitizeLeftHandEquipment(); this.sanitizeRightHandEquipment(); this.syncSkillUnlocks(); this.player = null; this.enemies = []; this.turn = 1; this.locked = false; this.finished = false; this.autoBattle = false; this.autoBattleSpeedIndex = -1; this.autoToggleBusy = false; this.autoPickTimer = null; this.simpleBattle = false; this.selectedEquipmentId = null; this.battleMode = 'slime'; this.workshopTab = 'craft'; this.craftKind = 'weapon'; this.enhanceKind = 'weapon'; this.craftWeaponType = 'sword'; this.enhanceWeaponType = 'sword'; this.craftDungeonFilter = 'all'; this.craftArmorFilter = 'leftHand'; this.enhanceArmorFilter = 'leftHand'; this.archiveMode = 'monster'; this.battleLogHistory = []; this.battleLogExpanded = false; this.lastBattleAction = null; this.dungeonSelectId = 'dungeon1'; this.bossSeriesFilter = null;
      // 旧セーブ・新規プロファイルの両方で楽器学を必ず初期化する。
      this.profile.weaponMastery.instrument ||= { level: 1, exp: 0 };
      this.currentDungeonId = 'dungeon1';
      this.battleMusic = encodeURI('音楽系/戦闘用/零時侵蝕 (Without Lead Vocal).mp3');
      this.menuMusic = encodeURI('音楽系/拠点/Midnight Ramen Den.mp3');
      this.bossMusic = encodeURI('音楽系/戦闘用/インサイダー取引はダメですよ。ボス戦Version.mp3');
      this.otherWorldMusic = encodeURI('音楽系/戦闘用/星霞の理由 -Reason to Fade-異世界バトルBGM.mp3');
      this.audio = new ArseneAudio(this.battleMusic);
      this.battleAudioRestore = { bgm: .42, sfx: .72, voice: .70 };
      const goldAmount = $('#menu-gold');
      if (goldAmount) { const fitGold = () => { const digits = (goldAmount.textContent.match(/\d/g) || []).length; goldAmount.dataset.amountSize = digits >= 9 ? 'tiny' : digits >= 7 ? 'compact' : 'large'; }; this.goldAmountObserver = new MutationObserver(fitGold); this.goldAmountObserver.observe(goldAmount, { childList: true, characterData: true, subtree: true }); fitGold(); }
      $('#log').addEventListener('click', () => this.toggleBattleLog());
      $('#log').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggleBattleLog(); } });
      // iOS/スマホでAUTOを素早く2回押した時、ブラウザのダブルタップ拡大を発生させない。
      // ピンチズームはページ全体で維持し、戦闘コマンド上のダブルタップだけを操作として扱う。
      $('#command-panel')?.addEventListener('dblclick', e => e.preventDefault());
      $('#battlefield').addEventListener('click', e => {
        const detailToggle = e.target.closest('[data-status-toggle]'); if (detailToggle) { e.preventDefault(); e.stopPropagation(); this.toggleStatusDetailItem(detailToggle); return; }
        if (e.target.closest('.status-detail-close') || e.target.id === 'battle-status-detail') { e.preventDefault(); this.hideStatusDetail(); return; }
        const strip = e.target.closest('.status-strip[data-status-owner]'); if (strip) { e.preventDefault(); e.stopPropagation(); this.showStatusGroup(strip.dataset.statusOwner, strip); }
      });
      $('#battlefield').addEventListener('keydown', e => { const strip = e.target.closest('.status-strip[data-status-owner]'); if (strip && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); this.showStatusGroup(strip.dataset.statusOwner, strip); } if (e.key === 'Escape') this.hideStatusDetail(); });
      document.addEventListener('click', e => { const strip = e.target.closest?.('.enemy-statuses[data-status-owner]'); if (!strip) return; e.preventDefault(); e.stopPropagation(); this.showStatusGroup(strip.dataset.statusOwner, strip); }, true);
      $('#audio-toggle').addEventListener('click', async () => { await this.audio.unlock(); const on = this.audio.toggle(); $('#audio-toggle').classList.toggle('muted', !on); $('#audio-toggle span').textContent = on ? 'SOUND ON' : 'SOUND OFF'; });
      $('#battle-menu-button')?.addEventListener('click', async () => { const pop = $('#battle-menu-popover'), open = !!pop?.hidden; if (!pop) return; await this.audio.unlock(); if (open) this.renderBattleMenu(); pop.hidden = !open; $('#battle-menu-button').setAttribute('aria-expanded', String(open)); });
      $('#battle-menu-popover')?.addEventListener('click', e => {
        const close = e.target.closest('[data-battle-menu-close]');
        if (close) { $('#battle-menu-popover').hidden = true; $('#battle-menu-button').setAttribute('aria-expanded', 'false'); return; }
        const toggle = e.target.closest('[data-battle-audio-toggle]');
        if (!toggle) return;
        const channel = toggle.dataset.battleAudioToggle, current = this.audio.levels[channel] || 0;
        if (current > 0) { this.battleAudioRestore[channel] = current; this.audio.setVolume(channel, 0); }
        else this.audio.setVolume(channel, Math.round(100 * (this.battleAudioRestore[channel] || { bgm: .42, sfx: .72, voice: .70 }[channel])));
        this.renderBattleMenu();
      });
      $('#battle-menu-popover')?.addEventListener('input', e => {
        const slider = e.target.closest('[data-battle-volume]'); if (!slider) return;
        const channel = slider.dataset.battleVolume, percent = Number(slider.value) || 0;
        this.audio.setVolume(channel, percent); if (percent > 0) this.battleAudioRestore[channel] = percent / 100;
        const value = $(`[data-battle-volume-value="${channel}"]`, $('#battle-menu-popover')); if (value) value.textContent = `${percent}%`;
        const toggle = $(`[data-battle-audio-toggle="${channel}"]`, $('#battle-menu-popover')); if (toggle) { toggle.textContent = percent > 0 ? 'ON' : 'OFF'; toggle.classList.toggle('off', percent <= 0); toggle.setAttribute('aria-pressed', String(percent > 0)); }
      });
      $('#battle-menu-popover')?.addEventListener('change', e => { const slider = e.target.closest('[data-battle-volume]'); if (slider?.dataset.battleVolume === 'sfx' && Number(slider.value) > 0) this.audio.sfx('ui'); });
      document.addEventListener('click', e => { const resultAction = e.target.closest('[data-result-action]'); if (resultAction) { e.preventDefault(); this.handleResultAction(resultAction.dataset.resultAction, resultAction.dataset.target); return; } if (e.target.closest('[data-go-menu], #result-menu')) { e.preventDefault(); if (e.target.closest('#result-menu') && this.resultContinue) { const next = this.resultContinue; this.resultContinue = null; next(); } else this.showMenu('home'); } });
      $('#result-menu').addEventListener('pointerup', e => { e.preventDefault(); });
      $('#menu-screen').addEventListener('click', async e => { const b = e.target.closest('[data-menu]'); if (!b || b.disabled) return; await this.audio.unlock(); this.audio.sfx('ui'); if (b.dataset.menu === 'battle') { this.renderMenuPanel('dungeon-select'); } else if (b.dataset.menu === 'boss') { this.restoreNormalDungeonJob(); if (this.isMyrthiUnlocked() && !this.isBossDefeated('myrthi')) { this.currentDungeonId = 'dungeon2'; this.startMyrthiBoss(); } else this.startBossEncounter(); } else { if (b.dataset.menu === 'equipment') this.equipTab = b.hasAttribute('data-open-status') ? 'status' : 'equip'; this.renderMenuPanel(b.dataset.menu); } });
      $('#menu-panel').addEventListener('click', async e => {
        const avatarOpen = e.target.closest('[data-battle-avatar-open]');
        if (avatarOpen) { this.battlePortraitEditorOpen = true; this.audio.sfx('ui'); this.renderMenuPanel('equipment'); return; }
        const avatarClose = e.target.closest('[data-battle-avatar-close]');
        if (avatarClose || (e.target.matches?.('.battle-avatar-editor') && !e.target.closest('.battle-avatar-card'))) { this.battlePortraitEditorOpen = false; this.audio.sfx('ui'); this.renderMenuPanel('equipment'); return; }
        const avatarReset = e.target.closest('[data-battle-avatar-reset]');
        if (avatarReset) { this.profile.customBattlePortrait = null; this.profile.customBattlePortraitMeta = null; this.profile.customStatusPortrait = null; this.saveProfile(); this.applyEquipmentVisual(); this.audio.sfx('ui'); this.battlePortraitEditorOpen = true; this.renderMenuPanel('equipment'); window.arseneStartFlow?.toast('戦闘画像をデフォルトに戻しました'); return; }
        const enterDungeon = e.target.closest('[data-enter-dungeon]');
        if (enterDungeon) { this.restoreNormalDungeonJob(); this.currentDungeonId = enterDungeon.dataset.enterDungeon; this.currentFloorId = null; const dungeonCfg = this.getDungeon(this.currentDungeonId); await this.audio.playTrack(dungeonCfg?.music || this.battleMusic); this.startBattle(); return; }
        const dungeonTab = e.target.closest('[data-dungeon-tab]');
        if (dungeonTab) { this.dungeonSelectId = dungeonTab.dataset.dungeonTab; this.audio.sfx('ui'); this.renderMenuPanel('dungeon-select'); return; }
        // 階層のあるダンジョンは階層選択ページを挟む
        const openFloors = e.target.closest('[data-open-floors]');
        if (openFloors) { this.floorSelectDungeonId = openFloors.dataset.openFloors; this.audio.sfx('ui'); this.renderMenuPanel('floor-select'); return; }
        const enterFloor = e.target.closest('[data-enter-floor]');
        if (enterFloor) { if (enterFloor.disabled) return; this.restoreNormalDungeonJob(); const fid = enterFloor.dataset.enterFloor; this.currentDungeonId = this.floorDungeonId(fid); this.currentFloorId = fid; const cfg = this.getDungeon(this.currentDungeonId); await this.audio.playTrack(cfg?.music || this.battleMusic); this.startBattle(); return; }
        const slotPick = e.target.closest('[data-equip-slot-pick]');
        if (slotPick) { if (slotPick.disabled) return; const s = slotPick.dataset.equipSlotPick; this.equipSlot = this.equipSlot === s ? null : s; this.selectedEquipmentId = null; this.audio.sfx('ui'); this.renderMenuPanel('equipment'); return; }
        const slotClose = e.target.closest('[data-equip-slot-close]');
        if (slotClose) { this.equipSlot = null; this.equipWeaponType = null; this.selectedEquipmentId = null; this.audio.sfx('ui'); this.renderMenuPanel('equipment'); return; }
        const equipWeaponTab = e.target.closest('[data-equip-weapon-tab]');
        if (equipWeaponTab) { this.equipWeaponType = equipWeaponTab.dataset.equipWeaponTab; this.selectedEquipmentId = null; this.audio.sfx('ui'); this.renderMenuPanel('equipment'); return; }
        const equipSort = e.target.closest('[data-equip-sort]');
        if (equipSort) { this.equipSort = equipSort.dataset.equipSort; this.audio.sfx('ui'); this.renderMenuPanel('equipment'); return; }
        const unequip = e.target.closest('[data-unequip-slot]');
        if (unequip) { this.unequipSlot(unequip.dataset.unequipSlot); return; }
        const equipTab = e.target.closest('[data-equip-tab]');
        if (equipTab) { this.equipTab = equipTab.dataset.equipTab; this.audio.sfx('ui'); this.renderMenuPanel('equipment'); return; }
        const arcDun = e.target.closest('[data-archive-dungeon]');
        if (arcDun) { this.archiveDungeon = arcDun.dataset.archiveDungeon; this.audio.sfx('ui'); this.renderMenuPanel('archive'); return; }
        const archiveMode = e.target.closest('[data-archive-mode]');
        if (archiveMode) { this.archiveMode = archiveMode.dataset.archiveMode; this.audio.sfx('ui'); this.renderMenuPanel('archive'); return; }
        const collectionReward = e.target.closest('[data-claim-equipment-collection]');
        if (collectionReward) { this.claimEquipmentCollection(collectionReward.dataset.claimEquipmentCollection); return; }
        const artsType = e.target.closest('[data-arts-type]');
        if (artsType) { this.artsType = artsType.dataset.artsType; this.artsOpenId = null; this.audio.sfx('ui'); this.renderMenuPanel('equipment'); return; }
        const artsOpen = e.target.closest('[data-arts-open]');
        if (artsOpen) { const id = artsOpen.dataset.artsOpen; this.artsOpenId = this.artsOpenId === id ? null : id; this.audio.sfx('ui'); this.renderMenuPanel('equipment'); return; }
        const itemTab = e.target.closest('[data-item-tab]');
        if (itemTab) { this.itemTab = itemTab.dataset.itemTab; this.pickFirstStockedSub(); this.audio.sfx('ui'); this.renderMenuPanel('items'); return; }
        const itemWSub = e.target.closest('[data-item-wsub]');
        if (itemWSub) { this.itemWeaponSub = itemWSub.dataset.itemWsub; this.audio.sfx('ui'); this.renderMenuPanel('items'); return; }
        const itemASub = e.target.closest('[data-item-asub]');
        if (itemASub) { this.itemArmorSub = itemASub.dataset.itemAsub; this.audio.sfx('ui'); this.renderMenuPanel('items'); return; }
        const equipFromItem = e.target.closest('[data-equip-item]');
        if (equipFromItem) { if (!equipFromItem.disabled) this.equipFromInventory(equipFromItem.dataset.equipItem); return; }
        const bossChallenge = e.target.closest('[data-boss-challenge]');
        if (bossChallenge) { this.startBossByKey(bossChallenge.dataset.bossChallenge); return; }
        const watchOpening = e.target.closest('[data-watch-opening]');
        if (watchOpening) { window.arseneStartFlow?.watchOpening(); return; }
        const resetData = e.target.closest('[data-reset-data]');
        if (resetData) { if (window.confirm('すべてのゲーム進行データを消去しますか？')) { localStorage.removeItem(D.settings.saveKey); localStorage.removeItem(this.saveTransferMetaKey()); location.reload(); } return; }
        const exportSave = e.target.closest('[data-export-save]');
        if (exportSave) { this.saveTransferMode = this.saveTransferMode === 'export' ? null : 'export'; if (this.saveTransferMode === 'export') { this.saveTransferExportCode = this.encodeSaveTransferCode(); navigator.clipboard?.writeText(this.saveTransferExportCode).then(() => window.arseneStartFlow?.toast('コードをコピーしました')).catch(() => {}); } this.renderMenuPanel('system'); return; }
        const importSaveToggle = e.target.closest('[data-import-save]');
        if (importSaveToggle) { this.saveTransferMode = this.saveTransferMode === 'import' ? null : 'import'; this.renderMenuPanel('system'); return; }
        const importSaveConfirm = e.target.closest('[data-import-save-confirm]');
        if (importSaveConfirm) { const input = $('[data-transfer-input]'), payload = this.decodeSaveTransferCode(input?.value); if (!payload) { window.arseneStartFlow?.toast('コードを読み取れませんでした'); return; } if (window.confirm('現在のセーブデータを上書きして読み込みますか？')) this.applySaveTransfer(payload); return; }
        const food = e.target.closest('[data-eat-food]');
        if (food) { this.eatFood(food.dataset.eatFood || 'makanai'); return; }
        const buyItem = e.target.closest('[data-buy-item]');
        if (buyItem) { if (!buyItem.disabled) this.buyItem(buyItem.dataset.buyItem); return; }
        const buyTestItem = e.target.closest('[data-buy-kazu-test]');
        if (buyTestItem) { if (!buyTestItem.disabled) this.buyKazuTestItem(buyTestItem.dataset.buyKazuTest); return; }
        const useItem = e.target.closest('[data-use-item]');
        if (useItem) { this.useMenuItem(useItem.dataset.useItem); return; }
        const craft = e.target.closest('[data-craft]');
        if (craft) { if (!craft.disabled) this.craftItem(craft.dataset.craft, craft.getBoundingClientRect().top); return; }
        const dismantle = e.target.closest('[data-disassemble]');
        if (dismantle) { if (!dismantle.disabled) this.dismantleItem(dismantle.dataset.disassemble, dismantle.getBoundingClientRect().top); return; }
        const enchant = e.target.closest('[data-enchant]');
        if (enchant) { if (!enchant.disabled) this.enchantWeapon(enchant.dataset.enchant, enchant.getBoundingClientRect().top); return; }
        const armorEnchant = e.target.closest('[data-armor-enchant]');
        if (armorEnchant) { if (!armorEnchant.disabled) this.enchantArmor(armorEnchant.dataset.armorEnchant, armorEnchant.getBoundingClientRect().top); return; }
        const craftDungeon = e.target.closest('[data-craft-dungeon]');
        if (craftDungeon) { this.craftDungeonFilter = craftDungeon.dataset.craftDungeon; this.renderMenuPanel('workshop'); return; }
        const craftArmor = e.target.closest('[data-craft-armor]');
        if (craftArmor) { this.craftArmorFilter = craftArmor.dataset.craftArmor; this.renderMenuPanel('workshop'); return; }
        const craftKind = e.target.closest('[data-craft-kind]');
        if (craftKind) { this.craftKind = craftKind.dataset.craftKind; this.craftDungeonFilter = 'all'; this.renderMenuPanel('workshop'); return; }
        const bossSeries = e.target.closest('[data-boss-series-tab]');
        if (bossSeries) { this.bossSeriesFilter = bossSeries.dataset.bossSeriesTab; this.audio.sfx('ui'); this.renderMenuPanel('workshop'); return; }
        const enhanceKind = e.target.closest('[data-enhance-kind]');
        if (enhanceKind) { this.enhanceKind = enhanceKind.dataset.enhanceKind; this.renderMenuPanel('workshop'); return; }
        const enhanceWeaponType = e.target.closest('[data-enhance-weapon-type]');
        if (enhanceWeaponType) { this.enhanceWeaponType = enhanceWeaponType.dataset.enhanceWeaponType; this.renderMenuPanel('workshop'); return; }
        const enhanceArmor = e.target.closest('[data-enhance-armor]');
        if (enhanceArmor) { this.enhanceArmorFilter = enhanceArmor.dataset.enhanceArmor; this.renderMenuPanel('workshop'); return; }
        const craftWeaponType = e.target.closest('[data-craft-weapon-type]');
        if (craftWeaponType) { this.craftWeaponType = craftWeaponType.dataset.craftWeaponType; this.craftDungeonFilter = 'all'; this.renderMenuPanel('workshop'); return; }
        const workshopTab = e.target.closest('[data-workshop-tab]');
        if (workshopTab) { this.workshopTab = workshopTab.dataset.workshopTab; this.renderMenuPanel('workshop'); return; }
        const jobTab = e.target.closest('[data-job-tab]');
        if (jobTab) { if (!this.jobUI) this.jobUI = { tab: 'job', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' }; this.jobUI.tab = jobTab.dataset.jobTab; this.jobUI.detailId = null; this.jobUI.modal = null; this.renderMenuPanel('job'); return; }
        const jobDetail = e.target.closest('[data-job-detail]');
        if (jobDetail) { if (!this.jobUI) this.jobUI = { tab: 'job', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' }; this.jobUI.detailId = jobDetail.dataset.jobDetail; this.jobUI.modal = null; this.renderMenuPanel('job'); return; }
        const jobBack = e.target.closest('[data-job-back]');
        if (jobBack) { if (this.jobUI) { this.jobUI.detailId = null; this.jobUI.modal = null; } this.renderMenuPanel('job'); return; }
        const jobTraitDetail = e.target.closest('[data-job-trait-detail]');
        if (jobTraitDetail) { if (!this.jobUI) this.jobUI = { tab: 'job', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' }; const [tj, tk] = jobTraitDetail.dataset.jobTraitDetail.split(':'); this.jobUI.modal = 'traitDetail'; this.jobUI.traitDetailJob = tj; this.jobUI.traitDetailKey = tk; this.renderMenuPanel('job'); return; }
        const jobSkillDetail = e.target.closest('[data-job-skill-detail]');
        if (jobSkillDetail) { if (!this.jobUI) this.jobUI = { tab: 'job', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' }; this.jobUI.modal = 'skillDetail'; this.jobUI.skillDetailId = jobSkillDetail.dataset.jobSkillDetail; this.renderMenuPanel('job'); return; }
        const openModal = e.target.closest('[data-open-modal]');
        if (openModal) { if (!this.jobUI) this.jobUI = { tab: 'job', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' }; const m = openModal.dataset.openModal; if (m === 'passive0') { this.jobUI.modal = 'passiveSelect'; this.jobUI.passiveSlotIdx = 0; } else if (m === 'passive1') { this.jobUI.modal = 'passiveSelect'; this.jobUI.passiveSlotIdx = 1; } else if (/^ptAction[01]$/.test(m)) { this.jobUI.modal = 'actionSelect'; this.jobUI.actionSlotIdx = Number(m.slice(-1)); } this.renderMenuPanel('job'); return; }
        const systemTab = e.target.closest('[data-system-tab]');
        if (systemTab) { this.systemTab = systemTab.dataset.systemTab; this.debugPwError = false; this.audio.sfx('ui'); this.renderMenuPanel('system'); return; }
        // ── デバッグタブ ──
        if (e.target.closest('[data-debug-enter]')) {
          const input = $('[data-debug-pw]');
          const ok = window.arseneDebugRoom?.unlock(input?.value || '');
          this.debugPwError = !ok;
          this.audio.sfx(ok ? 'ui' : 'playerHit');
          this.renderMenuPanel('system');
          if (ok) window.arseneDebugRoom.open();
          return;
        }
        if (e.target.closest('[data-debug-open]')) { this.audio.sfx('ui'); window.arseneDebugRoom?.open(); return; }
        if (e.target.closest('[data-debug-lock]')) { window.arseneDebugRoom?.lock(); this.audio.sfx('ui'); this.renderMenuPanel('system'); return; }
        const helpToggle = e.target.closest('[data-help-toggle]');
        if (helpToggle) {
          // 再描画でスクロールが先頭に戻ってしまうので、押した項目の画面上の位置を保つ。
          // スクロールしているのは #menu-panel とは限らないので、実際のスクロール親を探す。
          const id = helpToggle.dataset.helpToggle;
          const keepTop = helpToggle.getBoundingClientRect().top;
          this.helpOpenId = this.helpOpenId === id ? null : id; this.audio.sfx('ui'); this.renderMenuPanel('system');
          // 再描画でスクロール要素ごと作り直されるので、探すのは描画後の新しいDOMから
          const after = document.querySelector(`[data-help-toggle="${id}"]`);
          const scroller = after && this.scrollParentOf(after);
          if (scroller) scroller.scrollTop += after.getBoundingClientRect().top - keepTop;
          return;
        }
        const jobRebirth = e.target.closest('[data-job-rebirth]');
        if (jobRebirth) { if (!jobRebirth.disabled) { const r = this.doRebirth(jobRebirth.dataset.jobRebirth); if (!r.ok) window.arseneStartFlow?.toast(r.reason); } return; }
        const setPassive = e.target.closest('[data-set-passive]');
        if (setPassive) { const parts = setPassive.dataset.setPassive.split(':'); this.setPassiveSlot(Number(parts[0]), parts[1] || null); return; }
        const setAction = e.target.closest('[data-set-action]');
        if (setAction) { const parts = setAction.dataset.setAction.split(':'); this.setPhantomAction(Number(parts[0]), parts[1] || null); return; }
        const passiveFilter = e.target.closest('[data-passive-filter]');
        if (passiveFilter) { if (!this.jobUI) this.jobUI = { tab: 'job', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' }; this.jobUI.passiveFilter = passiveFilter.dataset.passiveFilter; this.renderMenuPanel('job'); return; }
        const innerModal = e.target.closest('.jmodal');
        if (innerModal && !e.target.closest('button[data-close-modal]')) return;
        const closeModal = e.target.closest('[data-close-modal]');
        if (closeModal) { if (this.jobUI) this.jobUI.modal = null; this.renderMenuPanel('job'); return; }
        const jobChange = e.target.closest('[data-job-change]');
        if (jobChange) { this.changeJob(jobChange.dataset.jobChange); return; }
        const skillToggle = e.target.closest('[data-skill-toggle]');
        if (skillToggle) { this.toggleActiveSkill(skillToggle.dataset.skillToggle); return; }
        const preview = e.target.closest('[data-equip-preview]');
        if (preview) { this.previewEquipment(preview.dataset.equipPreview); return; }
        const previewClose = e.target.closest('[data-equip-preview-close]');
        if (previewClose) { this.selectedEquipmentId = null; this.audio.sfx('ui'); this.renderMenuPanel('equipment'); return; }
        const confirm = e.target.closest('[data-equip-confirm]');
        if (confirm && !confirm.disabled) this.equipItem(confirm.dataset.equipConfirm);
        const leftEquip = e.target.closest('[data-equip-left]');
        if (leftEquip && !leftEquip.disabled) this.equipLeftHandWeapon(leftEquip.dataset.equipLeft);
      });
      $('#menu-panel').addEventListener('input', e => { const slider = e.target.closest('[data-volume]'); if (!slider) return; this.audio.setVolume(slider.dataset.volume, slider.value); const value = $(`[data-volume-value="${slider.dataset.volume}"]`); if (value) value.textContent = `${slider.value}%`; });
      $('#menu-panel').addEventListener('change', e => {
        const avatar = e.target.closest('[data-battle-avatar-upload]');
        if (avatar?.files?.[0]) { this.setCustomBattlePortrait(avatar.files[0]); return; }
        const slider = e.target.closest('[data-volume]'); if (!slider) return; this.audio.setVolume(slider.dataset.volume, slider.value); const value = $(`[data-volume-value="${slider.dataset.volume}"]`); if (value) value.textContent = `${slider.value}%`; if (slider.dataset.volume === 'sfx') this.audio.sfx('ui');
      });
      $('#game').hidden = true; $('#game').style.display = 'none'; $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#result').hidden = true; $('#result').style.display = 'none';
    }

    freshProfile() {
      const p = D.player; return { version: 19, selectedCharacter: null, playerCharacter: null, prologueCompleted: false, openingWatched: false, level: p.level, exp: p.exp, gold: p.gold, baseStats: clone(p.baseStats), currentVitals: { hp: p.baseStats.maxHp, mp: p.baseStats.maxMp }, equipment: clone(p.equipment), inventory: clone(p.inventory), shopPurchases: {}, premium: { adSkipLicense: false, adSkipTickets: 0, auto3License: false, sweepLicense: false, otherworldTickets: 0 }, musicScores: {}, bossDefeated: { zenacad: false, myrthi: false, versicrell: false, seripes: false }, currentJob: 'mage', lastNormalJob: 'mage', otherWorldReturnJob: null, jobs: { warrior: { level: 1, exp: 0 }, mage: { level: 1, exp: 0 }, martialArtist: { level: 1, exp: 0 }, priest: { level: 1, exp: 0 }, guardian: { level: 1, exp: 0 }, arcaneMaestro: { level: 1, exp: 0 }, dualBlade: { level: 1, exp: 0 } }, learnedJobSkills: [], learnedCharacterSkills: ['blueNote'], activeSkills: ['blueNote', 'quickSlash'], passiveSlots: [null, null], weaponEnchants: {}, armorEnchants: {}, bossRematchAt: {}, preferredWeaponType: null, unlockedJobs: ['mage'], initialJob: 'mage', jobGrowthGained: {}, phantomGrowthRecords: {}, jobRebirths: {}, jobMastered: [], growthFraction: {}, learnedPassives: [], passiveEnhancements: {}, passiveEnhancedAtRebirth: {}, equippedPassives: [null], ptActionSlots: [null, null], ptPassiveSlots: [null, null], weaponMastery: { sword: { level: 1, exp: 0 }, staff: { level: 1, exp: 0 }, martial: { level: 1, exp: 0 }, shield: { level: 1, exp: 0 } }, learnedWeaponSkills: [], seenEnemies: [], equipmentArchive: [], collectionRewards: {}, playtest: { startedAt: Date.now(), playMs: 0, battles: 0, weaponUse: { sword: 0, staff: 0, martial: 0, instrument: 0, shield: 0 }, sparkLog: [], hpGrowthCount: 0, hpGrowthTotal: 0, mpGrowthCount: 0, mpGrowthTotal: 0 }, kazuSeenOnce: [], flags: { noelFirstEncounterCleared: false, preNoelBattleWins: 0, postNoelBattleWins: 0, zenakadoDefeated: false, zenakadoScoreClaimed: false, ramenBuffActive: false, taiwanMazesobaUnlocked: false, taiwanMazesobaNew: false, foodSecretMenuUnlocked: false, normalBattleWins: 0, temporaryBossCompleted: false, openingWatched: false, prologueCompleted: false, dungeon2BattleWins: 0, dungeon2NewSeen: false, floorWins: {}, dungeon3BattleWins: 0, dungeon3NewSeen: false, guardianUnlocked: false, shieldUnlocked: false, lastBattleResult: null, consecutiveDefeats: 0, owRestoreJobPending: false }, discoveredMaterials: [], unlockedRecipes: [], newlyUnlockedRecipes: [] };
    }
    loadProfile() {
      try {
        const saved = JSON.parse(localStorage.getItem(D.settings.saveKey)); if (!saved) return this.freshProfile();
        const base = this.freshProfile(), jobs = clone(base.jobs); Object.keys(jobs).forEach(id => jobs[id] = { ...jobs[id], ...(saved.jobs?.[id] || {}) }); const profile = { ...base, ...saved, baseStats: { ...base.baseStats, ...saved.baseStats }, currentVitals: { ...base.currentVitals, ...saved.currentVitals }, equipment: { ...base.equipment, ...saved.equipment }, inventory: { ...base.inventory, ...saved.inventory }, shopPurchases: { ...(saved.shopPurchases || {}) }, premium: { ...base.premium, ...(saved.premium || {}) }, musicScores: { ...base.musicScores, ...saved.musicScores }, bossDefeated: { ...base.bossDefeated, ...saved.bossDefeated }, jobs, learnedJobSkills: Array.isArray(saved.learnedJobSkills) ? saved.learnedJobSkills : [], learnedCharacterSkills: Array.isArray(saved.learnedCharacterSkills) ? saved.learnedCharacterSkills : [], activeSkills: Array.isArray(saved.activeSkills) ? saved.activeSkills.slice(0, 4) : base.activeSkills, flags: { ...base.flags, ...saved.flags }, armorEnchants: { ...(saved.armorEnchants || {}) }, bossRematchAt: { ...(saved.bossRematchAt || {}) }, preferredWeaponType: saved.preferredWeaponType || null, unlockedJobs: Array.isArray(saved.unlockedJobs) ? saved.unlockedJobs : [saved.currentJob || 'mage'], initialJob: saved.initialJob || saved.currentJob || 'mage', lastNormalJob: saved.lastNormalJob || (saved.currentJob !== 'phantomThief' ? saved.currentJob : null) || saved.initialJob || 'mage', otherWorldReturnJob: saved.otherWorldReturnJob || null, jobGrowthGained: { ...(saved.jobGrowthGained || {}) }, phantomGrowthRecords: clone(saved.phantomGrowthRecords || {}), jobRebirths: { ...(saved.jobRebirths || {}) }, jobMastered: Array.isArray(saved.jobMastered) ? saved.jobMastered : [], growthFraction: { ...(saved.growthFraction || {}) }, learnedPassives: Array.isArray(saved.learnedPassives) ? saved.learnedPassives : [], passiveEnhancements: { ...(saved.passiveEnhancements || {}) }, passiveEnhancedAtRebirth: { ...(saved.passiveEnhancedAtRebirth || {}) }, equippedPassives: Array.isArray(saved.equippedPassives) ? saved.equippedPassives : [null], ptActionSlots: Array.isArray(saved.ptActionSlots) ? saved.ptActionSlots : [null, null], ptPassiveSlots: Array.isArray(saved.ptPassiveSlots) ? saved.ptPassiveSlots : [null, null], weaponMastery: { ...base.weaponMastery, ...(saved.weaponMastery || {}) }, learnedWeaponSkills: Array.isArray(saved.learnedWeaponSkills) ? saved.learnedWeaponSkills : [], equipmentArchive: Array.isArray(saved.equipmentArchive) ? saved.equipmentArchive : [], collectionRewards: { ...(saved.collectionRewards || {}) }, playtest: { ...base.playtest, ...(saved.playtest || {}), weaponUse: { ...base.playtest.weaponUse, ...(saved.playtest?.weaponUse || {}) } }, kazuSeenOnce: Array.isArray(saved.kazuSeenOnce) ? saved.kazuSeenOnce : [], discoveredMaterials: Array.isArray(saved.discoveredMaterials) ? saved.discoveredMaterials : [], unlockedRecipes: Array.isArray(saved.unlockedRecipes) ? saved.unlockedRecipes : [], newlyUnlockedRecipes: Array.isArray(saved.newlyUnlockedRecipes) ? saved.newlyUnlockedRecipes : [] };
        // 旧版で異なるIDで保存された塩ラーメンを、現在の戦闘用アイテムIDへ統合する。
        // これで既に購入済みの分が「持っていない」扱いになることを防ぐ。
        const legacyConsumableIds = {
          ramenShio: 'cupRamenShio', shioRamen: 'cupRamenShio', saltRamen: 'cupRamenShio', ramenSalt: 'cupRamenShio', saltCupRamen: 'cupRamenShio', cupRamenSalt: 'cupRamenShio', hakodateShio: 'cupRamenShio', hakodateSalt: 'cupRamenShio',
          ramenMiso: 'cupRamenMiso', misoRamen: 'cupRamenMiso', misoCupRamen: 'cupRamenMiso', cupMisoRamen: 'cupRamenMiso', sapporoMisoRamen: 'cupRamenMiso'
        };
        Object.entries(legacyConsumableIds).forEach(([legacyId, currentId]) => {
          const amount = Math.max(0, Number(profile.inventory[legacyId]) || 0);
          if (amount > 0) { profile.inventory[currentId] = (profile.inventory[currentId] || 0) + amount; delete profile.inventory[legacyId]; }
        });
        // 旧セーブには購入履歴がないため、現在所持している店売り品を購入済み数として引き継ぐ。
        // 更新後は消費しても shopPurchases は減らず、購入上限は復活しない。
        (D.shopItems || []).forEach(id => {
          const item = D.items[id], limit = Math.max(0, Number(item?.purchaseLimit) || 0);
          if (!limit) return;
          const savedCount = Number(saved.shopPurchases?.[id]);
          profile.shopPurchases[id] = Number.isFinite(savedCount)
            ? Math.min(limit, Math.max(0, Math.floor(savedCount)))
            : Math.min(limit, Math.max(0, Math.floor(Number(profile.inventory[id]) || 0)));
        });
        if ((saved.version || 0) < 3 || !saved.currentVitals) { const bonuses = {}; Object.values(profile.equipment).forEach(id => Object.entries((D.weapons[id] || D.accessories[id] || D.armors?.[id] || D.equipment?.[id])?.bonuses || {}).forEach(([key, value]) => bonuses[key] = (bonuses[key] || 0) + value)); profile.currentVitals = { hp: profile.baseStats.maxHp + (bonuses.maxHp || 0), mp: profile.baseStats.maxMp + (bonuses.maxMp || 0) }; }
        if ((saved.version || 0) < 4) { const oldWins = Math.max(0, Number(saved.flags?.normalBattleWins) || 0), oldNoel = !!saved.flags?.noelFirstEncounterCleared; profile.flags.preNoelBattleWins = Number.isFinite(saved.flags?.preNoelBattleWins) ? saved.flags.preNoelBattleWins : (oldNoel ? D.battleProgression.noelEncounterWins : Math.min(oldWins, D.battleProgression.noelEncounterWins)); profile.flags.postNoelBattleWins = Number.isFinite(saved.flags?.postNoelBattleWins) ? saved.flags.postNoelBattleWins : (oldNoel ? oldWins : 0); profile.flags.zenakadoDefeated = false; profile.flags.zenakadoScoreClaimed = false; profile.flags.temporaryBossCompleted = false; }
        if (profile.flags.zenakadoDefeated) profile.bossDefeated.zenacad = true;
        if (!D.jobs[profile.currentJob]) profile.currentJob = 'mage';
        if (!profile.weaponEnchants) profile.weaponEnchants = {};
        // v12：JOB成長を baseStats へ焼き込む方式をやめ、JOBごとの取得分として持つ方式へ移行。
        // 旧セーブは全JOB分が baseStats に足し込まれているので、記録済みの取得分を引き戻す。
        if ((saved.version || 0) < 12 && saved.jobGrowthGained) {
          for (const table of Object.values(saved.jobGrowthGained)) {
            for (const [k, v] of Object.entries(table || {})) {
              if (typeof profile.baseStats[k] === 'number') profile.baseStats[k] = Math.max(1, profile.baseStats[k] - v);
            }
          }
        }
        // 階層ごとの勝利数。旧セーブには無いので必ず補う。
        if (!profile.flags) profile.flags = {};
        if (!profile.flags.floorWins) profile.flags.floorWins = {};
        // 旧セーブの「まかない中」は従来どおり怪盗まかないとして読み込む。
        if (profile.flags.ramenBuffActive && !profile.flags.ramenBuffType) profile.flags.ramenBuffType = 'makanai';
        if (!profile.flags.ramenBuffActive) profile.flags.ramenBuffType = null;
        if (profile.flags.dungeon3BattleWins == null) profile.flags.dungeon3BattleWins = 0;
        if (profile.flags.dungeon3NewSeen == null) profile.flags.dungeon3NewSeen = false;
        // v15：D3を8階＋中ボス制へ再構成。旧来の合計勝利数を到達可能な階まで安全に引き継ぐ。
        if ((saved.version || 0) < 15) {
          const d3 = D.dungeons?.find(dungeon => dungeon.id === 'dungeon3');
          const floors = d3?.floors || [];
          const hasFloorProgress = floors.some(floor => profile.flags.floorWins[floor.id] != null);
          if (!hasFloorProgress && floors.length) {
            let remaining = Math.max(0, Number(profile.flags.dungeon3BattleWins) || 0);
            const finalCleared = !!profile.bossDefeated.seripes;
            const midCleared = finalCleared || !!profile.bossDefeated.versicrell;
            const preMidCount = d3.midBossAfterFloor || 2;
            floors.forEach((floor, index) => {
              if (index >= preMidCount && !midCleared) return;
              const wins = finalCleared ? floor.winsToClear : Math.min(remaining, floor.winsToClear);
              profile.flags.floorWins[floor.id] = wins;
              remaining = Math.max(0, remaining - wins);
            });
          }
        }
        // 魔奏聖は廃止。既存セーブに残っていれば取り除く。
        delete profile.jobs.arcaneMaestro;
        profile.unlockedJobs = (profile.unlockedJobs || []).filter(id => id !== 'arcaneMaestro');
        if (profile.currentJob === 'arcaneMaestro') profile.currentJob = profile.initialJob || 'mage';
        if (!profile.jobs.dualBlade) profile.jobs.dualBlade = { level: 1, exp: 0 };
        if (!profile.jobs.guardian) profile.jobs.guardian = { level: 1, exp: 0 };
        if (profile.bossDefeated.myrthi == null) profile.bossDefeated.myrthi = false;
        if (profile.bossDefeated.versicrell == null) profile.bossDefeated.versicrell = false;
        if (profile.bossDefeated.seripes == null) profile.bossDefeated.seripes = false;
        for (const id of ['d4MidBoss', 'astact', 'd5MidBoss', 'ostina']) if (profile.bossDefeated[id] == null) profile.bossDefeated[id] = false;
        for (const id of ['ronin', 'hunter']) if (!profile.jobs[id]) profile.jobs[id] = { level: 1, exp: 0 };
        if (!profile.weaponMastery.bow) profile.weaponMastery.bow = { level: 1, exp: 0 };
        profile.playtest.weaponUse.bow ||= 0;
        for (const id of ['dungeon4', 'dungeon5']) {
          profile.flags[`${id}BattleWins`] ||= 0;
          profile.flags[`${id}NewSeen`] ||= false;
        }
        // ストーリーJOBは撃破前には存在自体を見せない。旧セーブは撃破フラグから自動復元する。
        const d1Cleared = !!(profile.bossDefeated.zenacad || profile.flags.temporaryBossCompleted || profile.flags.magicKnightProofObtained);
        const d2Cleared = !!(profile.bossDefeated.myrthi || profile.flags.dungeon2Clear);
        const d3Cleared = !!profile.bossDefeated.seripes;
        const d4Cleared = !!profile.bossDefeated.astact;
        const d5Cleared = !!profile.bossDefeated.ostina;
        // v17：旧セーブですでにボスを倒している場合も、新しい証と楽曲だけを安全に補完する。
        // 所持数は1を下限にするため、再読込で重複配布されない。
        if (d2Cleared) {
          profile.inventory.dualBladeProof = Math.max(1, profile.inventory.dualBladeProof || 0);
          profile.musicScores.rhythm = true;
          profile.flags.myrthiFirstClearRewardClaimed = true;
        }
        if (d3Cleared) {
          profile.inventory.guardianProof = Math.max(1, profile.inventory.guardianProof || 0);
          profile.musicScores.reprise = true;
          profile.flags.seripesFirstClearRewardClaimed = true;
        }
        if (d4Cleared) {
          profile.inventory.roninProof = Math.max(1, profile.inventory.roninProof || 0);
          profile.musicScores.staccato = true;
          profile.flags.dungeon4Clear = true;
          profile.flags.astactFirstClearRewardClaimed = true;
        }
        if (d5Cleared) {
          profile.inventory.hunterProof = Math.max(1, profile.inventory.hunterProof || 0);
          profile.musicScores.ostinato = true;
          profile.flags.dungeon5Clear = true;
          profile.flags.ostinaFirstClearRewardClaimed = true;
        }
        profile.unlockedJobs = [...new Set(profile.unlockedJobs || [])].filter(id => (id !== 'magicKnight' || d1Cleared) && (id !== 'dualBlade' || d2Cleared) && (id !== 'guardian' || d3Cleared));
        if (d1Cleared && !profile.unlockedJobs.includes('magicKnight')) profile.unlockedJobs.push('magicKnight');
        if (d2Cleared && !profile.unlockedJobs.includes('dualBlade')) profile.unlockedJobs.push('dualBlade');
        // 解放条件（unlockCondition）をすでに満たしているJOBは、どの経路で来たセーブでも
        // 解放済みとして扱う。個別のフラグ移行に頼ると取りこぼしが出るため、条件から導く。
        for (const [id, job] of Object.entries(D.jobs || {})) {
          if (job.devOnly || job.futureOnly || !job.unlockCondition) continue;
          const cond = job.unlockCondition;
          if (cond.bossDefeated && !profile.bossDefeated[cond.bossDefeated]) continue;
          if (cond.jobLevels && Object.entries(cond.jobLevels).some(([rid, rlv]) => (profile.jobs[rid]?.level || 1) < rlv)) continue;
          if (!profile.unlockedJobs.includes(id)) profile.unlockedJobs.push(id);
        }
        // 解放リストへ入れただけでレベル情報が無いと、JOB詳細を開いた瞬間に落ちる。
        // 一覧には出るのにタップしても開かない、という状態になるので必ず補う。
        profile.unlockedJobs.forEach(id => { if (D.jobs[id] && !profile.jobs[id]) profile.jobs[id] = { level: 1, exp: 0 }; });
        if (d3Cleared && !profile.unlockedJobs.includes('guardian')) profile.unlockedJobs.push('guardian');
        if (d4Cleared && !profile.unlockedJobs.includes('ronin')) profile.unlockedJobs.push('ronin');
        if (d5Cleared && !profile.unlockedJobs.includes('hunter')) profile.unlockedJobs.push('hunter');
        if (d3Cleared) { profile.flags.guardianUnlocked = true; profile.flags.shieldUnlocked = true; }
        // D4〜D7予約JOBはDEBUG/検証専用。正式解放フラグへ接続するまでは
        // インポート済みセーブにIDが混ざっていても通常プレイヤーへ露出させない。
        const futureJobs = new Set((D.futureJobIds || []).filter(id => D.jobs[id]?.devOnly || D.jobs[id]?.futureOnly));
        profile.unlockedJobs = profile.unlockedJobs.filter(id => !futureJobs.has(id));
        if (futureJobs.has(profile.currentJob)) profile.currentJob = profile.initialJob && !futureJobs.has(profile.initialJob) ? profile.initialJob : 'mage';
        // DEV TOOLSで予約データを試したセーブを通常画面へ戻しても、名称や技が漏れないようにする。
        profile.jobMastered = (profile.jobMastered || []).filter(id => !futureJobs.has(id));
        for (const key of ['learnedJobSkills', 'learnedWeaponSkills', 'learnedPassives', 'activeSkills', 'equippedPassives', 'ptActionSlots', 'ptPassiveSlots']) {
          if (!Array.isArray(profile[key])) continue;
          const slots = key === 'equippedPassives' || key.endsWith('Slots');
          const values = profile[key].map(id => (D.skills[id]?.devOnly || D.skills[id]?.futureOnly) ? null : id);
          profile[key] = slots ? values : values.filter(id => id != null);
        }
        Object.entries(profile.equipment || {}).forEach(([slot, id]) => {
          if (D.items[id]?.devOnly || D.items[id]?.futureOnly || D.weapons[id]?.devOnly || D.weapons[id]?.futureOnly) profile.equipment[slot] = slot === 'rightHand' ? 'mageStaff' : null;
        });
        if (!d1Cleared && profile.currentJob === 'magicKnight') profile.currentJob = profile.initialJob || 'mage';
        if (!d2Cleared && profile.currentJob === 'dualBlade') profile.currentJob = profile.initialJob || 'mage';
        if (!d3Cleared && profile.currentJob === 'guardian') profile.currentJob = profile.initialJob || 'mage';
        if (!d4Cleared && profile.currentJob === 'ronin') profile.currentJob = profile.initialJob || 'mage';
        if (!d5Cleared && profile.currentJob === 'hunter') profile.currentJob = profile.initialJob || 'mage';
        if (!Array.isArray(profile.passiveSlots)) profile.passiveSlots = [null, null];
        // 旧セーブに残る廃止済みのサブコマンド設定は保存データから除去する。
        delete profile.subCommand;
        if (!Array.isArray(profile.kazuSeenOnce)) profile.kazuSeenOnce = [];
        if (profile.flags.consecutiveDefeats == null) profile.flags.consecutiveDefeats = 0;
        if (profile.flags.lastBattleResult === undefined) profile.flags.lastBattleResult = null;
        // 図鑑用：一度でも戦闘で出会った敵・入手した装備のID
        if (!Array.isArray(profile.seenEnemies)) profile.seenEnemies = [];
        // D3希少怪異の正式命名に伴う図鑑ID移行。旧セーブの遭遇記録を失わない。
        if (profile.seenEnemies.includes('astralMercuryCore')) profile.seenEnemies = [...new Set(profile.seenEnemies.map(id => id === 'astralMercuryCore' ? 'merox' : id))];
        if (!Array.isArray(profile.equipmentArchive)) profile.equipmentArchive = [];
        if (!profile.collectionRewards || typeof profile.collectionRewards !== 'object') profile.collectionRewards = {};
        const knownEquipment = [...Object.entries(profile.inventory || {}).filter(([id, n]) => n > 0 && D.items[id]?.category === 'equipment' && !D.items[id]?.devOnly && !D.items[id]?.futureOnly).map(([id]) => id), ...Object.values(profile.equipment || {}).filter(id => D.items[id]?.category === 'equipment' && !D.items[id]?.devOnly && !D.items[id]?.futureOnly)];
        profile.equipmentArchive = [...new Set([...profile.equipmentArchive, ...knownEquipment])];
        // v18：旧版ですでに転生強化されていたPASSIVEは、現状の強さをそのまま移行する。
        // 次の転生からは「再び習得Lvへ到達した時」にだけ1段階強化される。
        if (!saved.passiveEnhancements || !saved.passiveEnhancedAtRebirth) {
          for (const skill of Object.values(D.skills || {})) {
            if (skill?.type !== 'PASSIVE' || !skill.jobId) continue;
            const count = Number(profile.jobRebirths?.[skill.jobId]) || 0;
            profile.passiveEnhancements[skill.id] = count;
            profile.passiveEnhancedAtRebirth[skill.id] = count;
          }
        }
        // 旧セーブでMASTER済みのJOBは、現在記録されている成長を盗奪済み最高値として保護する。
        if (!saved.phantomGrowthRecords) {
          for (const id of profile.jobMastered || []) profile.phantomGrowthRecords[id] = { ...(profile.jobGrowthGained?.[id] || {}) };
        }
        // v16：武器学を行動EXP＋無制限Lv、閃きをRank/敵Spark Lv方式へ移行。
        // 旧Lv/EXP/習得技はそのまま保持し、破壊的な再計算は行わない。
        profile.version = 19;
        return profile;
      } catch { return this.freshProfile(); }
    }
    saveProfile() { if (this.localScenario?.ephemeral) return; const pt = this.profile.playtest; if (pt) { const now = Date.now(); pt.playMs = (pt.playMs || 0) + Math.min(now - (this._lastSaveAt || now), 600000); this._lastSaveAt = now; } localStorage.setItem(D.settings.saveKey, JSON.stringify(this.profile)); }

    prepareLocalVersicrellScenario() {
      // localhost専用の確認データ。通常セーブを複製してメモリ上だけで動かす。
      this.localScenario = { id: 'versicrell-ready', ephemeral: true };
      this.profile = clone(this.profile);
      this.profile.selectedCharacter ||= 'ren';
      this.profile.playerCharacter ||= this.profile.selectedCharacter;
      this.profile.flags ||= {};
      this.profile.bossDefeated ||= {};
      this.profile.inventory ||= {};
      this.profile.jobs ||= {};
      Object.assign(this.profile.flags, {
        noelFirstEncounterCleared: true,
        zenakadoDefeated: true,
        dungeon2Clear: true,
        dungeon3BattleWins: D.settings.dungeon3MidBossWins || 150
      });
      Object.assign(this.profile.bossDefeated, { zenacad: true, myrthi: true, versicrell: false });
      Object.assign(this.profile.baseStats, {
        maxHp: 1200, maxMp: 480,
        str: 145, vit: 125, mag: 230, mnd: 130, agi: 75, dex: 165, luk: 55
      });
      Object.assign(this.profile.inventory, { potion: 20, manaPotion: 20 });
      this.profile.currentVitals = { hp: this.profile.baseStats.maxHp, mp: this.profile.baseStats.maxMp };
      this.profile.currentJob = 'mage';
      this.profile.jobs.mage = { ...(this.profile.jobs.mage || {}), level: 16, exp: 0 };
      this.profile.learnedJobSkills = [...new Set([...(this.profile.learnedJobSkills || []), 'blueFlame', 'manaBurst', 'astralRay'])];
      this.profile.activeSkills = ['blueNote', 'blueFlame', 'manaBurst', 'astralRay'];
      this.currentDungeonId = 'dungeon3';
      this.currentFloorId = null;
      this.sanitizeLeftHandEquipment();
      this.sanitizeRightHandEquipment();
      this.syncSkillUnlocks();
    }

    prepareLocalD3RouteScenario(stage = 'route') {
      this.prepareLocalVersicrellScenario();
      this.localScenario.id = `d3-${stage}`;
      const floors = this.floorsOf('dungeon3') || [];
      this.profile.flags.floorWins ||= {};
      floors.forEach(floor => { this.profile.flags.floorWins[floor.id] = 0; });
      if (stage === 'mid-ready' || stage === 'final-ready') {
        const gate = this.getDungeon('dungeon3')?.midBossAfterFloor || 2;
        floors.slice(0, gate).forEach(floor => { this.profile.flags.floorWins[floor.id] = floor.winsToClear; });
      }
      if (stage === 'final-ready') {
        floors.forEach(floor => { this.profile.flags.floorWins[floor.id] = floor.winsToClear; });
        this.profile.bossDefeated.versicrell = true;
      }
      this.dungeonSelectId = 'dungeon3';
      this.currentDungeonId = 'dungeon3';
      this.currentFloorId = null;
    }
    prepareLocalD4Scenario() {
      // D3クリア直後からD4の全導線を安全に確認するlocalhost専用データ。
      this.prepareLocalD3RouteScenario('final-ready');
      this.localScenario.id = 'd4-ready';
      this.profile.bossDefeated.seripes = true;
      this.profile.bossDefeated.d4MidBoss = false;
      this.profile.bossDefeated.astact = false;
      this.profile.flags.dungeon3Clear = true;
      this.profile.flags.dungeon4Clear = false;
      this.profile.flags.dungeon4BattleWins = 0;
      const floors = this.floorsOf('dungeon4') || [];
      this.profile.flags.floorWins ||= {};
      floors.forEach(floor => { this.profile.flags.floorWins[floor.id] = 0; });
      this.dungeonSelectId = 'dungeon4';
      this.currentDungeonId = 'dungeon4';
      this.currentFloorId = null;
    }
    saveTransferMetaKey() { return window.arseneStartFlow?.metaKey || 'arsene-rpg-start-flow-v01'; }
    encodeSaveTransferCode() { const save = localStorage.getItem(D.settings.saveKey), meta = localStorage.getItem(this.saveTransferMetaKey()), payload = { app: 'arsene-rpg', v: 1, exportedAt: new Date().toISOString(), save: save ? JSON.parse(save) : this.profile, meta: meta ? JSON.parse(meta) : null }; return btoa(unescape(encodeURIComponent(JSON.stringify(payload)))); }
    decodeSaveTransferCode(code) { try { const payload = JSON.parse(decodeURIComponent(escape(atob(String(code || '').trim())))); if (!payload || typeof payload !== 'object' || !payload.save) return null; return payload; } catch { return null; } }
    applySaveTransfer(payload) { localStorage.setItem(D.settings.saveKey, JSON.stringify(payload.save)); if (payload.meta) localStorage.setItem(this.saveTransferMetaKey(), JSON.stringify(payload.meta)); location.reload(); }
    jobCommand(jobId) { const map = D.jobCommandAbilities || {}; const j = D.jobs[jobId]; return map[jobId] || { cmd: j?.name || jobId, cmdEn: j?.nameEn || jobId }; }
    // ── キャラクターテーマ ────────────────────────────────────
    // characters.json の theme をCSSカスタムプロパティへ流し込む。
    // UI側は --character-* を参照するだけで、キャラ別の条件分岐を持たない。
    static get DEFAULT_THEME() { return { id: 'blue', primary: '#2f9dff', secondary: '#0b3f76', border: '#299ef1', glow: '#147dd8', textAccent: '#5fc6ff', surface: '#06142b', glowSoftness: '1' }; }
    applyCharacterTheme(theme) {
      const t = { ...BattleGame.DEFAULT_THEME, ...(theme || {}) };
      const root = document.documentElement;
      root.style.setProperty('--character-primary', t.primary);
      root.style.setProperty('--character-secondary', t.secondary);
      root.style.setProperty('--character-border', t.border);
      root.style.setProperty('--character-glow', t.glow);
      root.style.setProperty('--character-text-accent', t.textAccent);
      root.style.setProperty('--character-surface', t.surface);
      root.style.setProperty('--character-glow-softness', t.glowSoftness || '1');
      root.dataset.characterTheme = t.id || 'blue';
      this.currentTheme = t;
      return t;
    }
    // セーブ済みキャラクターのテーマを復元する（拠点・戦闘など全画面で有効）
    applyThemeForCharacter(charId, characters = this.characterList) {
      const list = characters || [];
      const entry = list.find(c => c.id === charId);
      return this.applyCharacterTheme(entry?.theme);
    }
    selectedCharacterData() {
      const list = this.characterList || [];
      return list.find(c => c.id === (this.profile?.selectedCharacter || 'ren')) || list.find(c => c.id === 'ren') || list[0] || null;
    }
    applyCharacterPresentation() {
      const c = this.selectedCharacterData(); if (!c) return;
      const safeImage = String(c.hideoutPortrait || c.image || '').replace(/["\\]/g, '\\$&');
      const portrait = $('.hideout-player-portrait'), sceneActor = $('.hideout-selected-character'), shell = $('.hideout-art-shell'), fullArt = $('.hideout-full-art'), topArt = $('.hideout-top-art');
      if (portrait) { portrait.style.backgroundImage = `url("${safeImage}")`; portrait.setAttribute('aria-label', `${this.playerName()}のステータスと装備を確認`); }
      if (shell) {
        // 上下分割素材はソラで確立した同一レイアウトを共有する。
        // 実際の選択キャラIDは別属性へ保持し、表示データやテーマ判定には影響させない。
        shell.dataset.characterId = c.hideoutTopArt ? 'sora' : c.id;
        shell.dataset.selectedCharacterId = c.id;
      }
      if (fullArt && c.hideoutArt) {
        fullArt.src = c.hideoutArt;
        fullArt.alt = `${this.playerName()}の拠点`;
      } else if (fullArt) {
        fullArt.src = 'assets/ui/hideout/ren-ui-v1.png';
        fullArt.alt = '或世盗の拠点・麺処おくのほそ道';
      }
      if (topArt) {
        if (c.hideoutTopArt) {
          topArt.src = c.hideoutTopArt;
          topArt.alt = `${this.playerName()}の拠点上部UI`;
          topArt.hidden = false;
        } else {
          topArt.removeAttribute('src');
          topArt.alt = '';
          topArt.hidden = true;
        }
      }
      if (sceneActor) {
        const hideoutImage = String(c.hideoutImage || '').replace(/["\\]/g, '\\$&');
        sceneActor.hidden = !hideoutImage;
        sceneActor.style.backgroundImage = hideoutImage ? `url("${hideoutImage}")` : '';
      }
      const name = $('#menu-character-name'); if (name) name.textContent = this.playerName();
      const phantom = $('#menu-phantom-id'); if (phantom) phantom.textContent = `PHANTOM // ${String(Math.max(1, (this.characterList || []).findIndex(x => x.id === c.id) + 1)).padStart(2, '0')}`;
      this.applyCharacterTheme(c.theme);
    }
    setCharacterList(list) { this.characterList = Array.isArray(list) ? list : []; this.applyCharacterPresentation(); }
    // ══ ジョブ解放 / パッシブ ══════════════════════════════════
    isPlayerContentVisible(def) { return !!def && !def.devOnly && !def.futureOnly; }
    unlockedJobIds() { return this.profile.unlockedJobs ||= [this.profile.currentJob || 'mage']; }
    isJobUnlocked(id) { return this.unlockedJobIds().includes(id); }
    unlockJob(id) { if (!D.jobs[id] || this.isJobUnlocked(id)) return false; this.unlockedJobIds().push(id); this.profile.jobs ||= {}; this.profile.jobs[id] ||= { level: 1, exp: 0 }; return true; }
    // 実際にスクロールしている祖先要素を返す（無ければページ本体）
    scrollParentOf(el) {
      for (let n = el?.parentElement; n; n = n.parentElement) {
        const ov = getComputedStyle(n).overflowY;
        if ((ov === 'auto' || ov === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n;
      }
      return document.scrollingElement;
    }
    renderWorkshopKeepingAnchor(attribute, itemId, viewportTop) {
      const before = [...document.querySelectorAll(`[${attribute}]`)].find(el => el.getAttribute(attribute) === itemId);
      const beforeScroller = before && this.scrollParentOf(before);
      const savedScrollTop = beforeScroller?.scrollTop;
      this.renderMenuPanel('workshop');
      const restore = () => {
        const after = [...document.querySelectorAll(`[${attribute}]`)].find(el => el.getAttribute(attribute) === itemId);
        // 分解などで対象のカードごと消えることがある。その場合もスクロール量だけは戻す。
        const scroller = (after && this.scrollParentOf(after)) || this.scrollParentOf($('#menu-panel'));
        if (!scroller) return;
        if (Number.isFinite(savedScrollTop)) scroller.scrollTop = savedScrollTop;
        if (after && Number.isFinite(viewportTop)) scroller.scrollTop += after.getBoundingClientRect().top - viewportTop;
      };
      // 画像・details・グリッドの再レイアウト後にも同じ位置へ戻す。
      requestAnimationFrame(() => { restore(); requestAnimationFrame(restore); });
    }
    isPhantomThief(jobId = this.profile.currentJob) { return jobId === 'phantomThief'; }
    phantomStealProgress() {
      const cfg = this.gb().phantomStealProgress || {}, jobCap = cfg.jobLevelCap || D.jobLevelCap || 20, weaponCap = cfg.weaponLevelCap || 20;
      const noGrowth = new Set(this.gb().noGrowthJobs || []);
      const jobIds = [...new Set(this.unlockedJobIds())].filter(id => D.jobs[id] && !noGrowth.has(id));
      let jobLevels = 0, mastered = 0;
      for (const id of jobIds) {
        const isMastered = this.isJobMastered(id) || (this.profile.jobs?.[id]?.level || 1) >= jobCap;
        if (isMastered) mastered++;
        jobLevels += isMastered ? jobCap : Math.min(jobCap, Math.max(0, this.profile.jobs?.[id]?.level || 1));
      }
      const jobMax = jobIds.length * jobCap;

      const passiveIds = [...new Set(jobIds.flatMap(id => Object.entries(D.jobs[id]?.passiveUnlocks || {})
        .filter(([level, skillId]) => Number(level) <= jobCap && D.skills[skillId]?.type === 'PASSIVE')
        .map(([, skillId]) => skillId)))];
      const learned = new Set(this.learnedPassiveIds());
      const passiveCount = passiveIds.filter(id => learned.has(id)).length;

      const weaponTypes = this.unlockedWeaponTypes();
      const weaponLevels = weaponTypes.reduce((sum, type) => sum + Math.min(weaponCap, Math.max(0, this.profile.weaponMastery?.[type.id]?.level || 1)), 0);
      const weaponMax = weaponTypes.length * weaponCap;
      const parts = {
        jobLevels: { current: jobLevels, max: jobMax, ratio: jobMax ? jobLevels / jobMax : 1 },
        passives: { current: passiveCount, max: passiveIds.length, ratio: passiveIds.length ? passiveCount / passiveIds.length : 1 },
        weaponMastery: { current: weaponLevels, max: weaponMax, ratio: weaponMax ? weaponLevels / weaponMax : 1 }
      };
      const weights = cfg.weights || { jobLevels: .5, passives: .25, weaponMastery: .25 };
      const active = Object.keys(parts).filter(key => parts[key].max > 0 && (weights[key] || 0) > 0);
      const weightTotal = active.reduce((sum, key) => sum + weights[key], 0) || 1;
      const percent = Math.min(100, Math.max(0, 100 * active.reduce((sum, key) => sum + parts[key].ratio * weights[key], 0) / weightTotal));
      return { percent, mastered, jobCount: jobIds.length, ...parts };
    }
    phantomStealProgressHTML() {
      const p = this.phantomStealProgress();
      const row = (label, part, note = '') => `<div class="pt-progress-row"><div><b>${label}</b><span>${part.current} / ${part.max}${note}</span></div><i><em style="width:${Math.min(100, part.ratio * 100)}%"></em></i></div>`;
      return `<div class="pt-progress"><div class="pt-progress-head"><span>STEAL PROGRESS</span><strong>${p.percent.toFixed(2)}%</strong></div><div class="jexp-bar"><i style="width:${p.percent}%"></i></div>${row('JOB育成', p.jobLevels, `　MASTER ${p.mastered}/${p.jobCount}`)}${row('盗得パッシブ', p.passives)}${row('武器学', p.weaponMastery)}<p>転生回数は含みません。MASTER済みJOBはLv.20として集計し、MASTER数を重複加点しません。</p></div>`;
    }
    // 通常ジョブ=他職パッシブ1枠 / PHANTOM THIEF=2枠
    passiveSlotCount() { const c = this.gb().passiveSlotCount || {}; return this.isPhantomThief() ? (c.phantomThief ?? 2) : (c.normal ?? 1); }
    actionSlotCount() { const c = this.gb().actionSlotCount || {}; return this.isPhantomThief() ? (c.phantomThief ?? 2) : (c.normal ?? 0); }
    learnedPassiveIds() { return this.profile.learnedPassives ||= []; }
    // ══ 装備の戦闘能力（攻撃力/防御力/魔法攻撃力/魔法防御力）════
    // 基礎能力（力・体力・魔力・精神…）とは別枠で集計する。
    // 旧データの bonuses.def も防御力として拾い、二重加算は起こさない。
    static get COMBAT_KEYS() { return ['attackPower', 'defensePower', 'magicAttackPower', 'magicDefensePower']; }
    equipmentCombatStats(equipment = this.profile.equipment) {
      const out = { attackPower: 0, defensePower: 0, magicAttackPower: 0, magicDefensePower: 0 };
      for (const [slot, id] of Object.entries(equipment || {})) {
        if (!id) continue;
        const def = this.equipmentDefinition(id); if (!def) continue;
        // 左手武器の攻撃性能は左手追撃でだけ使用する。右手火力へ二重加算しない。
        if (slot === 'leftHand' && D.weapons[id]) continue;
        // 強化はその装備自身の戦闘値へ掛かる。能力補正と特殊効果は各集計側で同率を掛ける。
        const rate = 1 + this.enchantLevel(id) * (D.enchantTable?.powerRate ?? 0.15);
        for (const k of BattleGame.COMBAT_KEYS) if (typeof def[k] === 'number') out[k] += def[k] * rate;
        if (typeof def.bonuses?.def === 'number') out.defensePower += def.bonuses.def * rate;
      }
      return out;
    }
    // 装備中の武器種に応じた攻撃性能（データ駆動。戦闘側に武器別分岐を書かない）
    attackPowerFor(weaponType = this.equippedWeaponType(), stats = null, equipment = this.profile.equipment) {
      const s = stats || this.player?.stats || this.totalStats(equipment);
      if (weaponType === 'shield') {
        const b = D.guardianBalance || {};
        return this.defensePowerFor('physical', s, equipment) * (b.shieldDefRate ?? .5) + this.defensePowerFor('magical', s, equipment) * (b.shieldMdefRate ?? .5);
      }
      const weapon = D.weapons[equipment?.rightHand], baseRule = (D.weaponScaling || {})[weaponType] || (D.weaponScaling || {}).sword || { scaling: { str: 1 }, powerKey: 'attackPower' };
      const rule = weapon?.scaling ? { ...baseRule, scaling: weapon.scaling, powerKey: weapon.powerKey || baseRule.powerKey, damageType: weapon.damageType || baseRule.damageType } : baseRule;
      let v = 0;
      for (const [stat, rate] of Object.entries(rule.scaling || {})) v += (s[stat] || 0) * rate;
      return v + (this.equipmentCombatStats(equipment)[rule.powerKey] || 0);
    }
    weaponDamageType(weaponType = this.equippedWeaponType()) { const w = this.equippedWeapon(); return w?.damageType || ((D.weaponScaling || {})[weaponType] || {}).damageType || 'physical'; }
    // ══ 命中・回避・会心の共通判定 ═════════════════════════════
    // 攻撃側DEX vs 防御側AGI。敵の旧データはDEX/AGIが無ければSPDへフォールバックする。
    combatDex(stats = {}) { return Number(stats.dex ?? stats.spd ?? 0) || 0; }
    combatAgi(stats = {}) { return Number(stats.agi ?? stats.spd ?? 0) || 0; }
    weaponAccuracyModifier(weaponType, weapon = null) {
      const rule = (D.weaponScaling || {})[weaponType] || {};
      return Number(weapon?.accuracyModifier ?? rule.accuracyModifier ?? 0) || 0;
    }
    hitChanceBetween(attackerStats, defenderStats, options = {}) {
      const a = D.accuracy || { base: .9, dexRate: .006, defenderAgiRate: .005, min: .05, max: 1 };
      const weaponModifier = this.weaponAccuracyModifier(options.weaponType, options.weapon);
      const skillModifier = Number(options.skill?.accuracyModifier ?? 0) || 0;
      const otherModifier = Number(options.otherModifier ?? attackerStats?.accuracyModifier ?? 0) || 0;
      const agiRate = a.defenderAgiRate ?? a.enemySpdRate ?? .005;
      const raw = a.base + this.combatDex(attackerStats) * a.dexRate - this.combatAgi(defenderStats) * agiRate + weaponModifier + skillModifier + otherModifier;
      return clamp(raw, a.min ?? .05, a.max ?? 1);
    }
    criticalChanceFor(skill, stats = this.player?.stats || this.totalStats()) {
      if (skill?.kind === 'neutral' || skill?.damageType === 'neutral') return 0;
      const c = D.combatBalance?.critical || { base: .06, luckRate: .008, max: .28 };
      const comboCrit = this.comboDanceStacks() >= this.comboDanceMax() ? (this.activePassiveByType('comboDance')?.passiveEffect?.maxCriticalBonus || 0) : 0;
      const extra = (Number(skill?.criticalModifier) || 0) + this.traitCriticalBonus() + this.equipmentEffectRate('criticalRateBonus') + comboCrit;
      const statBonus = Number(stats?.critBonus) || 0;
      return clamp(c.base + (Number(stats?.luk) || 0) * c.luckRate + statBonus + extra, c.base, c.max + statBonus + extra);
    }
    rollAttackOutcome(attackerStats, defenderStats, options = {}) {
      const skill = options.skill || {};
      if (skill.unavoidable || options.unavoidable) return { hit: true, critical: false, unavoidable: true, hitChance: 1, criticalChance: 0 };
      const criticalChance = Math.max(0, Number(options.criticalChance) || 0);
      const critical = criticalChance > 0 && Math.random() < criticalChance;
      if (critical) return { hit: true, critical: true, unavoidable: false, hitChance: 1, criticalChance };
      const hitChance = this.hitChanceBetween(attackerStats, defenderStats, options);
      return { hit: Math.random() < hitChance, critical: false, unavoidable: false, hitChance, criticalChance };
    }
    rollPlayerAttackOutcome(skill, enemy, options = {}) {
      const weapon = options.weapon || this.equippedWeapon();
      const weaponType = options.weaponType || skill?.weaponType || weapon?.weaponType || this.equippedWeaponType();
      const stats = this.playerCombatStats(), offHandCrit = options.offHand ? (this.activePassiveByType('offHandCritical')?.passiveEffect?.rate || 0) : 0;
      return this.rollAttackOutcome(stats, enemy?.stats || {}, { ...options, skill, weapon, weaponType, criticalChance: this.criticalChanceFor(skill, stats) + offHandCrit });
    }
    rollEnemyAttackOutcome(enemy, action = {}, options = {}) {
      return this.rollAttackOutcome(enemy?.stats || {}, this.playerCombatStats(), { ...options, skill: action, weaponType: action.weaponType || null, criticalChance: options.criticalChance || 0 });
    }
    // 旧呼び出し互換。新規処理はrollPlayerAttackOutcomeで会心→命中の順に判定する。
    hitChanceAgainst(enemy, stats = this.player?.stats || this.totalStats(), skill = {}, weapon = this.equippedWeapon()) {
      return this.hitChanceBetween(stats, enemy?.stats || {}, { skill, weapon, weaponType: skill.weaponType || weapon?.weaponType || this.equippedWeaponType() });
    }
    emitBattleEvent(type, detail = {}) {
      const event = { type, turn: this.turn || 0, timestamp: Date.now(), ...detail };
      this.battleEvents ||= []; this.battleEvents.push(event); if (this.battleEvents.length > 100) this.battleEvents.shift();
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent(`arsene:${type}`, { detail: event }));
      const hook = type === 'evade' ? this.onEvade : null; if (typeof hook === 'function') hook.call(this, event);
      return event;
    }
    onEvade(_event) { /* D4以降の回避時カウンター・回復・ゲージ処理用フック */ }
    triggerEvade(attacker, defender, skill, context = {}) { return this.emitBattleEvent('evade', { attacker, defender, skillId: skill?.id || null, ...context }); }
    // 楽器は魔奏士の証を入手するまで使用不可
    isWeaponTypeUnlocked(id) { const raw = (D.weaponTypes || []).find(t => t.id === id); if (!this.isPlayerContentVisible(raw)) return false; if (!raw.unlockFlag) return true; return !!this.profile.flags[raw.unlockFlag]; }
    unlockedWeaponTypes() { return this.weaponTypeList().filter(t => this.isWeaponTypeUnlocked(t.id)); }
    // 防御性能：物理=体力+防御力 / 魔法=精神+魔法防御力
    defensePowerFor(kind = 'physical', stats = null, equipment = this.profile.equipment) {
      const s = stats || this.player?.stats || this.totalStats(equipment);
      const rule = (D.defenseScaling || {})[kind] || { stat: 'vit', powerKey: 'defensePower' };
      return (s[rule.stat] || 0) + (this.equipmentCombatStats(equipment)[rule.powerKey] || 0);
    }
    canEquipRightHand(id, jobId = this.profile.currentJob) { const w = D.weapons[id]; return !!w && (w.weaponType !== 'shield' || jobId === 'guardian'); }
    // ══ 敵→プレイヤーのダメージ ════════════════════════════════
    // 比率型：atk × attackScale × K/(K+防御)。
    // 引き算型だと装備更新のたびにダメージが 0 か即死かの両極端に振れるため、
    // 防御が上がるほど緩やかに減衰する比率型に統一する。
    // defenseK が無いデータでは従来の引き算型へフォールバックする。
    enemyRawDamage(kind, attackStat, defUpBuff = 1) {
      const balance = D.combatBalance, formula = kind === 'magical' ? balance.enemyMagic : balance.enemyPhysical;
      // 数値以外が混ざるとダメージがNaNになり「HPが減らない＝無敵」になる。必ず数値へ落とす。
      const atk = Number(attackStat) || 0;
      const def = Math.max(0, (Number(this.defensePowerFor(kind, this.player.stats)) || 0) * (Number(defUpBuff) || 1));
      const scale = Number(formula?.attackScale) || 0;
      const k = Number(formula?.defenseK) || 0;
      const raw = k ? atk * scale * (k / (k + def)) : atk * scale - def * (Number(formula?.defenseScale) || 0);
      return Number.isFinite(raw) ? raw : 0;
    }
    // ══ 装備の特殊効果（%系）════════════════════════════════════
    // equipmentDefinition().effects の値を全スロット分合算する。
    // 装備名でのハードコードはせず、データ側の effects だけを見る。
    equipmentEffectRate(type, equipment = this.profile.equipment) {
      let sum = 0;
      for (const id of Object.values(equipment || {})) {
        if (!id) continue;
        const e = this.equipmentDefinition(id)?.effects;
        const rate = 1 + this.enchantLevel(id) * (D.enchantTable?.powerRate ?? 0.15);
        if (e && typeof e[type] === 'number') sum += e[type] * rate;
      }
      return sum;
    }
    // 装備＋JOBパッシブを合算した最終効果値
    totalEffectRate(type, passiveType = null) {
      return this.equipmentEffectRate(type) + (passiveType ? this.passiveEffectRate(passiveType) : 0);
    }
    // 装備候補：習得済みパッシブのうち、現在ジョブが常時持っているものは除く
    selectablePassives() {
      const own = new Set(this.currentJobPassives().map(s => s.id));
      const learned = this.learnedPassiveIds().map(id => D.skills[id]).filter(s => s?.type === 'PASSIVE' && !own.has(s.id));
      const legacy = this.allLearnedPassives().filter(s => !own.has(s.id));
      return [...new Map([...learned, ...legacy].map(s => [s.id, s])).values()];
    }
    // パッシブのステータス系効果を totalStats へ反映する
    // ══ パッシブの転生成長 ════════════════════════════════════
    // パッシブは転生後、もう一度そのパッシブの習得Lvへ到達した時に強くなる。
    //   実効値 = rate + 強化段階 × step   （step 未指定なら rate の40%）
    //   max があればそこで頭打ち。MP割引のように青天井にできない効果へ付ける。
    // これで「後から強いJOBが出ても、育てた既存JOBが腐らない」形にする。
    passiveRate(passive, key = 'rate') {
      const e = passive?.passiveEffect; if (!e) return 0;
      const base = e[key] || 0; if (!base) return 0;
      const n = this.passiveEnhancementRank(passive.id);
      if (key === 'rate' && e.rebirthTable) {
        const keys = Object.keys(e.rebirthTable).map(Number).filter(level => level <= n).sort((a, b) => b - a);
        return keys.length ? Number(e.rebirthTable[keys[0]]) : base;
      }
      if (!n) return base;
      const step = e.rebirthStep != null ? e.rebirthStep : base * (this.gb().passiveRebirthStepRate ?? 0.4);
      const grown = base + n * step;
      return e.max != null ? Math.min(e.max, grown) : grown;
    }
    // 表示用：効果テキストの数値を、転生で伸びた現在値に差し替える。
    // 「力 +5%」→ 転生2回なら「力 +9%（転生+4%）」のように出す。
    passiveCurrentText(passive) {
      const e = passive?.passiveEffect; if (!e?.rate) return passive?.effectText || '';
      const base = e.rate, cur = this.passiveRate(passive), text = passive.effectText || '';
      const basePct = Math.round(base * 100), curPct = Math.round(cur * 100);
      // 「HP50%以下で〜 +10%」のように%が複数ある文があるので、
      // 符号つきの数値（+10% / -20%）だけを差し替える。無ければ末尾の%を使う。
      const signed = new RegExp(`([+\\-])${basePct}%`);
      let label;
      if (signed.test(text)) label = text.replace(signed, (_, s) => `${s}${curPct}%`);
      else label = text.replace(new RegExp(`${basePct}%(?![\\s\\S]*\\d%)`), `${curPct}%`);
      const gain = curPct - basePct;
      return gain > 0 ? `${label}（転生 +${gain}%）` : label;
    }
    applyPassiveStats(total) {
      for (const p of this.activePassives()) {
        const e = p.passiveEffect; if (!e) continue;
        if (e.type === 'statPercent') total[e.stat] = Math.round((total[e.stat] || 0) * (1 + this.passiveRate(p)));
        else if (e.type === 'multiStatPercent') Object.entries(e.stats || {}).forEach(([k, r]) => total[k] = Math.round((total[k] || 0) * (1 + r)));
        else if (e.type === 'criticalUp') total.critBonus = (total.critBonus || 0) + this.passiveRate(p);
      }
      return total;
    }
    // 転生後も、一度習得したJOBアビリティは再ロックしない。
    // 現在Lvに加え、永久習得配列とMASTER履歴を参照することで旧セーブも救済する。
    jobAbilityLearned(jobId, skillId, unlockLevel = 1) {
      const level = this.profile.jobs?.[jobId]?.level || 1;
      if (level >= Number(unlockLevel || 1) || this.isJobMastered(jobId)) return true;
      return (this.profile.learnedPassives || []).includes(skillId) || (this.profile.learnedJobSkills || []).includes(skillId);
    }
    // 現在ジョブで永久習得済みのパッシブ（転生後もそのジョブの能力として常時有効）
    currentJobPassives() { const jobId = this.profile.currentJob, job = D.jobs[jobId]; if (!job) return []; return Object.entries(job.passiveUnlocks || {}).filter(([l, id]) => this.jobAbilityLearned(jobId, id, l)).map(([, id]) => D.skills[id]).filter(Boolean); }
    // 他ジョブから持ち込んで装備中のパッシブ
    equippedPassiveList() { const slots = this.isPhantomThief() ? (this.profile.ptPassiveSlots || []) : (this.profile.equippedPassives || []); return slots.slice(0, this.passiveSlotCount()).map(id => D.skills[id]).filter(s => s?.type === 'PASSIVE'); }
    // 実際に効果を発揮する全パッシブ（現在ジョブ習得分＋装備分、重複除去）
    activePassives() { return [...new Map([...this.currentJobPassives(), ...this.equippedPassiveList()].map(s => [s.id, s])).values()]; }
    activePassiveByType(type) { return this.activePassives().find(p => p.passiveEffect?.type === type) || null; }
    hasPassiveType(type) { return !!this.activePassiveByType(type); }
    comboDanceMax() { return Number(this.activePassiveByType('comboDance')?.passiveEffect?.maxStacks) || 5; }
    comboDanceStacks() { return Math.max(0, Math.min(this.comboDanceMax(), Number(this.player?.comboDance || 0))); }
    comboDanceHit(extra = 0) { if (!this.player || !this.hasPassiveType('comboDance')) return; this.player.comboDance = Math.min(this.comboDanceMax(), this.comboDanceStacks() + 1 + extra); this.updateHUD(); }
    comboDanceMiss() { if (!this.player || !this.hasPassiveType('comboDance') || !this.comboDanceStacks()) return; this.player.comboDance = 0; this.floating($('#ren'), '連舞 BREAK', 'miss'); this.updateHUD(); }
    comboDanceDamageRate() { const e = this.activePassiveByType('comboDance')?.passiveEffect; return e ? this.comboDanceStacks() * (e.damagePerStack || 0) : 0; }
    comboMaxBoost() { return this.comboDanceStacks() >= this.comboDanceMax() ? this.activePassiveByType('comboMaxBoost')?.passiveEffect || null : null; }
    playerCombatStats() { const stats = { ...(this.player?.stats || this.totalStats()) }, boost = this.comboMaxBoost(); if (boost?.agiRate) stats.agi = Math.round((stats.agi || 0) * (1 + boost.agiRate)); return stats; }
    dualWieldRate() { const p = this.activePassiveByType('dualWield'); return p ? this.passiveRate(p) : 0; }
    // ══ JOB特性 ═══════════════════════════════════════════════
    // パッシブと違い「そのJOBに就いていること自体」で得る効果。
    // 他JOBへ持ち出せない＝PHANTOM THIEFも盗めない。
    // 僧侶のまかない割引のように、技術ではなく立場に由来するものを置く。
    jobTraitRate(type, jobId = this.profile.currentJob) {
      const t = D.jobs[jobId]?.traits?.[type]; if (!t) return 0;
      const base = typeof t === 'number' ? t : (t.rate || 0);
      if (!base) return 0;
      const n = this.rebirthCount(jobId); if (!n) return base;
      const step = t.rebirthStep != null ? t.rebirthStep : base * (this.gb().passiveRebirthStepRate ?? 0.4);
      const grown = base + n * step;
      return t.max != null ? Math.min(t.max, grown) : grown;
    }
    jobTraitList(jobId = this.profile.currentJob) {
      return this.jobTraitEntries(jobId).map(e => e.gain > 0 ? `${e.label}（転生 +${e.gain}%）` : e.label);
    }
    // JOB特性を名前つきで返す。タップで説明を出すために id と description も持たせる。
    jobTraitEntries(jobId = this.profile.currentJob) {
      const traits = D.jobs[jobId]?.traits || {};
      return Object.entries(traits).map(([type, t]) => {
        const base = typeof t === 'number' ? t : (t.rate || 0), cur = this.jobTraitRate(type, jobId);
        const text = (typeof t === 'object' && t.text) ? t.text : type;
        // 転生で伸びた現在値をテキストの中の「30%」などに反映して見せる
        const label = base ? text.replace(new RegExp(`${Math.round(base * 100)}%`), `${Math.round(cur * 100)}%`) : text;
        return {
          key: type, label,
          name: (typeof t === 'object' && t.name) || type,
          nameEn: (typeof t === 'object' && t.nameEn) || '',
          description: (typeof t === 'object' && t.description) || '',
          base, cur, gain: Math.round((cur - base) * 100)
        };
      });
    }
    // パッシブ発動中だけ使える専用技（requiresBuff を持つ技）を、そのJOB分だけ拾う。
    // バフを供給するパッシブの習得Lvを一緒に返し、ジョブ画面の並びに使う。
    conditionalSkillsForJob(jobId = this.profile.currentJob) {
      const job = D.jobs[jobId]; if (!job) return [];
      return Object.values(D.skills)
        .filter(s => s.requiresBuff && s.jobId === jobId)
        .map(skill => {
          const entry = Object.entries(job.passiveUnlocks || {})
            .find(([, pid]) => D.skills[pid]?.passiveEffect?.buff === skill.requiresBuff);
          return { skill, level: entry ? Number(entry[0]) : (skill.unlockJobLevel || 1) };
        });
    }
    // そのバフを鳴らすパッシブ名（《フォルテ》など）。表示用。
    buffSourceName(jobId, buff) {
      const job = D.jobs[jobId]; if (!job) return '';
      const entry = Object.entries(job.passiveUnlocks || {}).find(([, pid]) => D.skills[pid]?.passiveEffect?.buff === buff);
      return entry ? (D.skills[entry[1]]?.name || '') : '';
    }
    passiveEffectRate(type) { return this.activePassives().reduce((sum, p) => p.passiveEffect?.type === type ? sum + this.passiveRate(p) : sum, 0) + this.jobTraitRate(type); }
    setEquippedPassive(idx, skillId) {
      const key = this.isPhantomThief() ? 'ptPassiveSlots' : 'equippedPassives';
      const max = this.passiveSlotCount();
      this.profile[key] ||= new Array(max).fill(null);
      while (this.profile[key].length < max) this.profile[key].push(null);
      if (skillId) this.profile[key] = this.profile[key].map(v => v === skillId ? null : v);
      this.profile[key][idx] = skillId || null; this.sanitizeLeftHandEquipment();
      this.saveProfile(); this.audio.sfx('confirm'); if (this.jobUI) this.jobUI.modal = null; this.renderMenuPanel('job');
    }
    // ジョブLvアップ時：ジョブ別の獲得量を記録（PHANTOM THIEFへ常時50%反映するためにも使用）
    applyJobLevelGrowth(jobId, levels = 1) {
      if (this.isNoGrowthJob(jobId) || D.jobs[jobId]?.noGrowth) return null;
      const table = (this.gb().jobGrowthPerLevel || {})[jobId]; if (!table) return null;
      const gained = {};
      this.profile.jobGrowthGained ||= {}; const track = this.profile.jobGrowthGained[jobId] ||= {};
      // 転生倍率は「これから得る成長」にのみ掛かる。小数は growthFraction へ繰り越す。
      const mult = this.rebirthGrowthMultiplier(jobId);
      this.profile.growthFraction ||= {}; const frac = this.profile.growthFraction[jobId] ||= {};
      for (const [k, v] of Object.entries(table)) {
        if (!v) continue;
        const raw = v * levels * mult + (frac[k] || 0);
        const total = Math.floor(raw);
        frac[k] = raw - total;
        if (!total) continue;
        // baseStats へは書き込まない。JOBごとの取得分として記録し、
        // 現在のJOBのぶんだけを totalStats() で加算する。
        track[k] = (track[k] || 0) + total; gained[k] = total;
      }
      return Object.keys(gained).length ? gained : null;
    }
    // ══ JOBによる能力補正 ══════════════════════════════════════
    // 通常JOB      … 今就いているJOBで育てた分だけ乗る（転職すると乗り換わる）
    // PHANTOM THIEF … 全JOBで育てた分を合算し、各能力50%だけ引き継ぐ
    phantomGrowthSources() {
      const gained = this.profile.jobGrowthGained || {}, records = this.profile.phantomGrowthRecords || {}, sources = {};
      const futureJobs = new Set(D.futureJobIds || []);
      for (const id of new Set([...Object.keys(gained), ...Object.keys(records)])) {
        if (futureJobs.has(id)) continue;
        sources[id] = {};
        for (const key of new Set([...Object.keys(gained[id] || {}), ...Object.keys(records[id] || {})]))
          sources[id][key] = Math.max(Number(gained[id]?.[key]) || 0, Number(records[id]?.[key]) || 0);
      }
      // 双刃士など旧growthテーブル方式のJOBはjobGrowthGainedへ記録されない。
      // 現在JOB Lvまでの実補正を継承元へ足し、旧セーブでも50%を確実に反映する。
      // 「記録が空のときだけ差し替える」形だと、称号成長で jobGrowthGained が
      // 1でも埋まった時点で旧テーブルぶんが丸ごと無視されてしまう。
      // totalStats() と同じく、記録ぶんへ現在Lvの旧テーブル補正を足す。
      for (const id of this.gb().phantomLegacyGrowthJobs || []) {
        const legacy = this.activeJobBonuses(id);
        if (!Object.values(legacy).some(v => v)) continue;
        const table = sources[id] ||= {};
        for (const [key, value] of Object.entries(legacy)) table[key] = (Number(table[key]) || 0) + value;
      }
      return sources;
    }
    jobStatBonuses(jobId = this.profile.currentJob) {
      const gained = this.profile.jobGrowthGained || {}, out = {};
      if (this.isPhantomThief(jobId)) {
        const rate = this.gb().phantomThiefInheritRate ?? 0.5;
        for (const table of Object.values(this.phantomGrowthSources()))
          for (const [k, v] of Object.entries(table || {})) out[k] = (out[k] || 0) + v;
        for (const k of Object.keys(out)) out[k] = k === 'critBonus'
          ? Number((out[k] * rate).toFixed(4))
          : Math.floor(out[k] * rate);
        return out;
      }
      for (const [k, v] of Object.entries(gained[jobId] || {})) if (v) out[k] = v;
      return out;
    }
    passiveEnhancementRank(skillId) { return Math.max(0, Number(this.profile.passiveEnhancements?.[skillId]) || 0); }
    // 転生後に再び習得Lvへ到達したパッシブを、その転生回数ぶんだけ強化する。
    reinforceJobPassives(jobId, level) {
      const job = D.jobs[jobId]; if (!job) return [];
      this.profile.passiveEnhancements ||= {}; this.profile.passiveEnhancedAtRebirth ||= {};
      const rebirths = this.rebirthCount(jobId), out = [];
      Object.entries(job.passiveUnlocks || {}).forEach(([lv, id]) => {
        if (Number(lv) > level || !D.skills[id]) return;
        const last = Math.max(0, Number(this.profile.passiveEnhancedAtRebirth[id]) || 0);
        if (rebirths <= last) return;
        const gain = rebirths - last;
        this.profile.passiveEnhancements[id] = this.passiveEnhancementRank(id) + gain;
        this.profile.passiveEnhancedAtRebirth[id] = rebirths;
        if (D.skills[id].passiveEffect?.rate || D.skills[id].passiveEffect?.rebirthTable) out.push({ skill: D.skills[id], rank: this.passiveEnhancementRank(id) });
      });
      return out;
    }
    // ジョブLvアップ時：到達Lvのパッシブを永久習得
    grantJobPassives(jobId, level) {
      const job = D.jobs[jobId]; if (!job) return [];
      const learned = this.learnedPassiveIds(), out = [];
      Object.entries(job.passiveUnlocks || {}).forEach(([lv, id]) => { if (Number(lv) <= level && !learned.includes(id) && D.skills[id]) { learned.push(id); out.push(D.skills[id]); } });
      return out;
    }
    // 1面クリア報酬：魔奏士の証＋残り初期3職と魔奏士を解放
    grantStageOneReward() {
      if (this.profile.flags.magicKnightProofObtained) return null;
      this.profile.flags.magicKnightProofObtained = true;
      this.profile.inventory.magicKnightProof = (this.profile.inventory.magicKnightProof || 0) + 1;
      const newly = [];
      [...(D.startingJobIds || []), 'magicKnight'].forEach(id => { if (this.unlockJob(id)) newly.push(D.jobs[id]); });
      // 楽奏の証：楽器の武器学を解放する
      this.profile.inventory.arcaneMaestroProof = (this.profile.inventory.arcaneMaestroProof || 0) + 1;
      this.profile.flags.instrumentUnlocked = true;
      // 武器学を解放しても楽器を1本も持っていなければ使えないので、最初の1本を一緒に渡す
      const starter = D.items.classroomRecorder;
      if (starter) this.profile.inventory.classroomRecorder = (this.profile.inventory.classroomRecorder || 0) + 1;
      this.saveProfile();
      // 2つまとめて入手する。どちらが何を解放したのかを添えて返す。
      return {
        keyItems: [
          { ...D.items.magicKnightProof, unlockNote: '新たなJOBが解放された' },
          { ...D.items.arcaneMaestroProof, unlockNote: '武器学《楽器》が解放された' }
        ],
        jobs: newly, weaponType: this.weaponTypeDef('instrument'),
        weapon: starter ? { ...starter, gear: D.weapons.classroomRecorder } : null
      };
    }
    // ══ 転生（輪廻のアルカナ）══════════════════════════════════
    rebirthCount(jobId) { return (this.profile.jobRebirths || {})[jobId] || 0; }
    // 転生1回につき成長+10%。過去に得た永久成長値へは遡って掛からない（複利禁止）。
    rebirthGrowthMultiplier(jobId) { return 1 + this.rebirthCount(jobId) * (this.gb().rebirthGrowthPerCycle ?? 0.10); }
    arcanaCount() { return this.profile.inventory.rebirthArcana || 0; }
    isJobMastered(jobId) { return (this.profile.jobMastered || []).includes(jobId); }
    markJobMastered(jobId) { this.profile.jobMastered ||= []; if (!this.profile.jobMastered.includes(jobId)) this.profile.jobMastered.push(jobId); }
    recordPhantomGrowth(jobId) {
      this.profile.phantomGrowthRecords ||= {};
      const record = this.profile.phantomGrowthRecords[jobId] ||= {}, growth = this.profile.jobGrowthGained?.[jobId] || {};
      for (const [key, value] of Object.entries(growth)) record[key] = Math.max(Number(record[key]) || 0, Number(value) || 0);
    }
    rebirthUnlocked() { return !!this.profile.flags.rebirthUnlocked; }
    canRebirth(jobId) {
      const lv = this.profile.jobs?.[jobId]?.level || 1, cap = D.jobLevelCap || 20;
      if (!this.rebirthUnlocked()) return { ok: false, reason: '転生はまだ解放されていません。' };
      if (lv < cap) return { ok: false, reason: `JOB Lv${cap}で転生可能` };
      if (this.arcanaCount() < 1) return { ok: false, reason: '《輪廻のアルカナ》が必要です' };
      return { ok: true };
    }
    // JOB Lv/EXPを初期化し、Lvアップで得た能力の20%だけを次の周回へ残す。
    // 習得済みスキル・パッシブ・武器学・MASTER履歴は保持する。
    doRebirth(jobId) {
      const check = this.canRebirth(jobId); if (!check.ok) return check;
      this.profile.inventory.rebirthArcana = Math.max(0, this.arcanaCount() - 1);
      this.markJobMastered(jobId);
      // 転生で通常JOBの保持能力を20%へ圧縮する前に、PHANTOM THIEFが盗んだ最高値を保存する。
      this.recordPhantomGrowth(jobId);
      const retention = Math.max(0, Math.min(1, this.gb().rebirthStatRetentionRate ?? .20));
      // 双刃士のような旧growthテーブル方式のJOBは、補正がJOB Lvから毎回導かれる。
      // Lvを1へ戻すとその補正が丸ごと消え、20%保持が一切効かなかった。
      // Lvリセット前の実補正を jobGrowthGained へ畳み込み、
      // 他JOBと同じく20%だけ残るようにする（totalStats()は両方を足すので二重にはならない）。
      const legacyBonuses = this.activeJobBonuses(jobId);
      if (Object.values(legacyBonuses).some(v => v)) {
        this.profile.jobGrowthGained ||= {};
        const table = this.profile.jobGrowthGained[jobId] ||= {};
        for (const [key, value] of Object.entries(legacyBonuses)) table[key] = (Number(table[key]) || 0) + value;
        this.recordPhantomGrowth(jobId);
      }
      const growth = this.profile.jobGrowthGained?.[jobId] || {};
      for (const [key, value] of Object.entries(growth)) growth[key] = key === 'critBonus'
        ? Number((Number(value || 0) * retention).toFixed(4))
        : Math.floor(Number(value || 0) * retention);
      if (this.profile.growthFraction) this.profile.growthFraction[jobId] = {};
      this.profile.jobs[jobId] = { level: 1, exp: 0 };
      this.profile.jobRebirths ||= {};
      this.profile.jobRebirths[jobId] = this.rebirthCount(jobId) + 1;
      // Lv1習得PASSIVEは、転生直後のLv1到達時点で強化される。
      const reinforcedPassives = this.reinforceJobPassives(jobId, 1);
      this.saveProfile(); this.audio.sfx('confirm'); this.renderMenuSummary(); this.renderMenuPanel('job');
      return { ok: true, count: this.rebirthCount(jobId), retention, reinforcedPassives };
    }
    // D2クリア報酬：双刃士を解放。初回のみ輪廻のアルカナ×1。
    grantMyrthiFirstReward() {
      const jobUnlocked = this.unlockJob('dualBlade');
      if (this.profile.flags.myrthiFirstClearRewardClaimed) { if (jobUnlocked) this.saveProfile(); return jobUnlocked ? { job: D.jobs.dualBlade } : null; }
      this.profile.flags.myrthiFirstClearRewardClaimed = true;
      this.profile.flags.rebirthUnlocked = true;
      this.profile.inventory.dualBladeProof = (this.profile.inventory.dualBladeProof || 0) + 1;
      this.profile.inventory.rebirthArcana = (this.profile.inventory.rebirthArcana || 0) + 1;
      this.saveProfile();
      return { item: D.items.dualBladeProof, count: 1, extraItem: D.items.rebirthArcana, extraCount: 1, job: jobUnlocked ? D.jobs.dualBlade : null };
    }
    grantSeripesFirstReward() {
      const first = !this.profile.flags.seripesFirstClearRewardClaimed, jobUnlocked = this.unlockJob('guardian');
      this.profile.flags.guardianUnlocked = true; this.profile.flags.shieldUnlocked = true;
      if (first) { this.profile.flags.seripesFirstClearRewardClaimed = true; this.profile.inventory.guardianProof = (this.profile.inventory.guardianProof || 0) + 1; this.profile.inventory.guardianAegis = (this.profile.inventory.guardianAegis || 0) + 1; this.recordEquipmentDiscovery(['guardianAegis']); }
      this.saveProfile(); return { first, jobUnlocked, job: D.jobs.guardian, weaponType: this.weaponTypeDef('shield'), weapon: D.items.guardianAegis };
    }
    // ══ 設定画面（タブ式）══════════════════════════════════════
    // 1枚に全部を縦積みせず、タブで切り替える。項目追加時はタブを足すだけ。
    renderSystemPanel(panel) {
      const tabs = [
        { id: 'sound', name: 'サウンド', enName: 'SOUND' },
        { id: 'ad-effects', name: '広告効果', enName: 'REWARD' },
        { id: 'help', name: 'HELP', enName: 'GUIDE' },
        { id: 'data', name: 'データ', enName: 'DATA' },
        // デバッグ：パスワードを入れるとデータ編集ルームへ入れる
        { id: 'debug', name: 'デバッグ', enName: 'DEBUG' }
      ];
      if (!tabs.some(t => t.id === this.systemTab)) this.systemTab = 'sound';
      const tabHtml = tabs.map(t => `<button data-system-tab="${t.id}" class="${this.systemTab === t.id ? 'active' : ''}"><b>${t.name}</b><span>${t.enName}</span></button>`).join('');
      let body = '';
      if (this.systemTab === 'sound') {
        const v = this.audio.getVolumes();
        const row = (id, label, note, badge = '') => `<label class="volume-row"><span><b>${label}</b><small>${note}</small></span><input type="range" min="0" max="100" step="1" value="${v[id]}" data-volume="${id}" aria-label="${label}音量"><output data-volume-value="${id}">${v[id]}%</output>${badge ? `<em>${badge}</em>` : ''}</label>`;
        body = `<section class="sound-settings"><header><b>サウンド音量</b><span>変更はこの端末へ自動保存されます</span></header>${row('bgm', 'BGM', '戦闘・拠点・ボス戦の音楽')}${row('sfx', '効果音', '攻撃・被弾・決定音')}${row('voice', 'VOICE', '戦闘ボイス用の予約設定', 'COMING SOON')}</section>`;
      } else if (this.systemTab === 'ad-effects') {
        body = window.arseneQOffer?.adEffectsHTML?.(false) || `<section class="sound-settings"><header><b>広告効果</b><span>現在発動中の効果はありません</span></header></section>`;
      } else if (this.systemTab === 'help') {
        body = this.helpSectionHTML();
      } else if (this.systemTab === 'debug') {
        body = this.debugTabHTML();
      } else {
        body = `<div class="system-actions"><button data-watch-opening>WATCH OPENING<span>オープニングを再生</span></button><button class="danger" data-reset-data>DATA RESET<span>セーブデータを消去</span></button></div>
          <section class="sound-settings save-transfer"><header><b>セーブデータの引き継ぎ</b><span>別ブラウザ・別URLでも復元できます</span></header><p class="save-transfer-note">「コードを書き出す」で表示される文字列をコピーし、別のブラウザ側の設定画面で「コードを読み込む」に貼り付けてください。</p><div class="system-actions"><button data-export-save>コードを書き出す<span>EXPORT CODE</span></button><button data-import-save>コードを読み込む<span>IMPORT CODE</span></button></div>${this.saveTransferMode === 'export' ? `<div class="save-transfer-box"><textarea readonly rows="4" data-transfer-output onclick="this.select()">${this.saveTransferExportCode || ''}</textarea><small>自動でコピーしました。コピーされない場合は上の文字列を選択してコピーしてください。</small></div>` : ''}${this.saveTransferMode === 'import' ? `<div class="save-transfer-box"><textarea rows="4" placeholder="ここにコードを貼り付け" data-transfer-input></textarea><button data-import-save-confirm>この内容で読み込む</button></div>` : ''}</section>
          <div class="hideout-feature system-info"><article><b>自動セーブ</b><span>ジョブ・武器学・装備・所持品・GOLD・解放状態をこの端末に保存中。</span></article><article><b>EARLY ACCESS Ver.0.1</b><span>DUNGEON 1–5 AVAILABLE</span></article></div>`;
      }
      panel.innerHTML = `<button class="panel-home" data-menu="home">拠点へ戻る</button><small>AUDIO & SYSTEM</small><h2>設定</h2><div class="item-tabs sys-tabs">${tabHtml}</div><div class="sys-body">${body}</div>`;
    }
    // デバッグタブ：パスワードを通すとデータ編集ルームを開ける。
    // 実処理は debug_room.js 側。読み込まれていない場合は案内だけ出す。
    debugTabHTML() {
      if (!window.arseneDebugRoom) return `<section class="sound-settings"><header><b>デバッグ</b><span>この環境では利用できません</span></header><p class="save-transfer-note">debug_room.js が読み込まれていません。</p></section>`;
      const unlocked = window.arseneDebugRoom.isUnlocked();
      const err = this.debugPwError ? `<p class="debug-pw-err">パスワードが違います</p>` : '';
      return `<section class="sound-settings"><header><b>デバッグルーム</b><span>モンスター・装備・技・バランス値をこの場で調整できます</span></header>
        ${unlocked
          ? `<p class="save-transfer-note">認証済みです。</p><div class="system-actions"><button data-debug-open>デバッグルームを開く<span>OPEN DEBUG ROOM</span></button><button data-debug-lock>ロックする<span>LOCK</span></button></div>`
          : `<p class="save-transfer-note">パスワードを入力してください。</p><div class="debug-pw-row"><input type="password" inputmode="numeric" autocomplete="off" data-debug-pw placeholder="パスワード"><button data-debug-enter>入る</button></div>${err}`}
        <p class="save-transfer-note">変更はこの端末に保存され、次回起動時にも適用されます。「書き出し」で差分を取り出せます。</p></section>`;
    }
    // ══ HELP / 遊び方 ══════════════════════════════════════════
    // 文章は js/help_data.js（window.ARSENE_HELP）側で管理する。
    helpUnlocked(key) {
      if (key === 'rebirth') return this.rebirthUnlocked();
      if (key === 'phantomThief') return this.isJobUnlocked('phantomThief');
      if (key === 'otherWorld') return !!this.profile.flags.otherWorldUnlocked;
      return true;
    }
    helpSectionHTML() {
      const list = window.ARSENE_HELP || []; if (!list.length) return '';
      const open = this.helpOpenId;
      const rows = list.map(e => {
        const locked = e.lockedBy && !this.helpUnlocked(e.lockedBy);
        const isOpen = open === e.id;
        let body;
        if (locked) body = `<p class="help-locked">${e.lockedText || '???'}</p>`;
        else {
          const parts = []; let bullets = [];
          (e.body || []).forEach(line => {
            if (line.startsWith('- ')) { bullets.push(`<li>${line.slice(2)}</li>`); return; }
            if (bullets.length) { parts.push(`<ul>${bullets.join('')}</ul>`); bullets = []; }
            parts.push(`<p>${line}</p>`);
          });
          if (bullets.length) parts.push(`<ul>${bullets.join('')}</ul>`);
          body = parts.join('');
        }
        return `<div class="help-item${isOpen ? ' open' : ''}"><button class="help-head" data-help-toggle="${e.id}"><span>${locked ? '🔒 ' : ''}${e.title}</span><small>${e.titleEn || ''}</small><em>${isOpen ? '−' : '＋'}</em></button>${isOpen ? `<div class="help-body">${body}</div>` : ''}</div>`;
      }).join('');
      return `<section class="sound-settings help-section"><header><b>HELP / 遊び方</b><span>項目をタップで開閉</span></header><div class="help-list">${rows}</div></section>`;
    }
    rebirthSectionHTML(jobId) {
      if (!this.rebirthUnlocked() || D.jobs[jobId]?.noGrowth) return '';
      const n = this.rebirthCount(jobId), check = this.canRebirth(jobId);
      const stars = n > 0 ? `<em class="rb-stars">${'★'.repeat(Math.min(n, 10))}${n > 10 ? ` ×${n}` : ''}</em>` : '';
      const mult = Math.round(this.rebirthGrowthMultiplier(jobId) * 100);
      return `<div class="rebirth-box"><div class="rb-head"><small>REBIRTH</small><b>転生</b>${stars}</div><div class="rb-info"><span>転生回数</span><b>${n}</b><span>次回成長</span><b>${mult}%</b><span>所持アルカナ</span><b>${this.arcanaCount()}</b></div><p class="rb-note">Lvアップで得た能力の20%を残してLv.1から再育成。習得済みPASSIVEは残り、再び習得Lvへ到達すると効果が少し強化されます。</p><button class="rb-btn" data-job-rebirth="${jobId}" ${check.ok ? '' : 'disabled'}>${check.ok ? '転生する' : check.reason}<span>${check.ok ? 'REBIRTH' : 'LOCKED'}</span></button></div>`;
    }
    specialItemHTML(reward) {
      if (!reward) return '';
      const item = reward.item ? `<div class="sr-key"><small>SPECIAL ITEM GET</small><b>《${reward.item.name}》 ×${reward.count}</b><span>${reward.item.description || ''}</span></div>` : '';
      const extra = reward.extraItem ? `<div class="sr-key"><small>SPECIAL ITEM GET</small><b>《${reward.extraItem.name}》 ×${reward.extraCount || 1}</b><span>${reward.extraItem.description || ''}</span></div>` : '';
      const rebirth = reward.extraItem?.id === 'rebirthArcana' ? `<div class="sr-jobs"><small>REBIRTH UNLOCKED</small><div><mark>JOB Lv20から転生できるようになった</mark></div></div>` : '';
      const job = reward.job ? `<div class="sr-jobs"><small>NEW JOB UNLOCKED</small><div><mark>${reward.job.name}</mark></div><span>D2クリアにより新たなJOBが解放された</span></div>` : '';
      return `<div class="stage-reward">${item}${extra}${rebirth}${job}</div>`;
    }
    stageOneRewardHTML(reward) {
      if (!reward) return '';
      // 鍵アイテムは複数まとめて入手するので、見出しは1つにして個数を出す。
      // それぞれが何を解放したのかも並べて分かるようにする。
      const keys = (reward.keyItems || [reward.keyItem, reward.extraKeyItem]).filter(Boolean);
      const keyRows = keys.map(k => `<div class="sr-key-row"><b>《${k.name}》</b><span>${k.description || ''}</span>${k.unlockNote ? `<em>${k.unlockNote}</em>` : ''}</div>`).join('');
      const keyBlock = keys.length ? `<div class="sr-key"><small>KEY ITEM GET${keys.length > 1 ? ` ×${keys.length}` : ''}</small>${keyRows}</div>` : '';
      const jobs = (reward.jobs || []).map(j => `<mark>${j.name}</mark>`).join('');
      const wt = reward.weaponType ? `<div class="sr-jobs"><small>NEW WEAPON MASTERY</small><div><mark>${reward.weaponType.name}が扱えるようになった</mark></div></div>` : '';
      // 武器学だけ解放しても武器が無ければ使えないので、一緒に渡した1本を明示する
      const w = reward.weapon;
      const stat = w?.gear ? `魔法攻撃力 +${w.gear.magicAttackPower || 0}${w.gear.bonuses?.dex ? ` / 器用さ +${w.gear.bonuses.dex}` : ''}` : '';
      const wpn = w ? `<div class="sr-weapon"><small>NEW WEAPON GET</small><b>《${w.name}》</b><span>${w.description || ''}</span>${stat ? `<i>${stat}</i>` : ''}<em>装備すると《楽器》の武器学が伸びる</em></div>` : '';
      return `<div class="stage-reward">${keyBlock}${wpn}${jobs ? `<div class="sr-jobs"><small>NEW JOBS UNLOCKED</small><div>${jobs}</div></div>` : ''}${wt}</div>`;
    }

    // ══ 武器学 / 成長 / 閃き ═══════════════════════════════════
    gb() { return D.growthBalance || {}; }
    equippedWeaponType() { return this.equippedWeapon()?.weaponType || 'sword'; }
    masteryOf(type = this.equippedWeaponType()) { this.profile.weaponMastery ||= {}; return (this.profile.weaponMastery[type] ||= { level: 1, exp: 0 }); }
    masteryExpNeeded(level) { const gb = this.gb(), base = gb.weaponExpBase ?? gb.weaponExpTable?.base ?? 20, perLevel = gb.weaponExpPerLevel ?? gb.weaponExpTable?.perLevel ?? 5; return Math.max(1, Math.ceil(base + Math.max(1, Number(level) || 1) * perLevel)); }
    weaponMasteryMultiplier(type = this.equippedWeaponType()) { return 1 + Math.max(0, this.masteryOf(type).level || 0) * (this.gb().weaponMasteryDamagePerLevel ?? .005); }
    isNoGrowthJob(jobId = this.profile.currentJob) { return (this.gb().noGrowthJobs || []).includes(jobId); }
    // キャラ固有特性。characters.json は "small" 等の記号のみ保持し、実倍率は growthBalance 側で決まる
    characterTrait() { return (this.characterList || []).find(c => c.id === this.profile.selectedCharacter)?.trait || null; }
    traitScale(key) { return (this.gb().traitBonusScale || {})[key] || {}; }
    traitWeaponExpMult(type) { const b = this.characterTrait()?.bonuses?.weaponGrowthBonus?.[type]; return b ? (this.traitScale(b).weaponExp ?? 1) : 1; }
    traitSparkMult(type) { const b = this.characterTrait()?.bonuses?.techLearnBonus?.[type]; return b ? (this.traitScale(b).spark ?? 1) : 1; }
    traitMpGrowthMult() { const b = this.characterTrait()?.bonuses?.mpGrowthBonus; return b ? (this.traitScale(b).mpGrowth ?? 1) : 1; }
    traitHealMult() { const b = this.characterTrait()?.bonuses?.healBonus; return b ? (this.traitScale(b).heal ?? 1) : 1; }
    traitCriticalBonus() { const b = this.characterTrait()?.bonuses?.criticalBonus; return b ? (this.traitScale(b).critical ?? 0) : 0; }
    // キャラ固有のドロップ補正は「確率に加算」。敵データ側のドロップ率を壊さず、後から調整できる。
    traitDropRateBonus() { return Math.max(0, Number(this.characterTrait()?.bonuses?.dropRateBonus) || 0); }

    // ACTION単位：通常攻撃・武器技を実際に使った時だけ対応武器学へ加算する。
    grantWeaponExp(baseExp, type = this.equippedWeaponType()) {
      if (this.isNoGrowthJob() || !(baseExp > 0)) return null;
      const m = this.masteryOf(type), gb = this.gb(), rewards = (this.battleRewards ||= {});
      rewards.masteryLevelUps ||= {};
      const gain = Math.max(1, Math.round(baseExp * this.traitWeaponExpMult(type)));
      const before = m.level; m.exp += gain;
      const max = gb.weaponMasterySafetyMaxLevel ?? 1000000, battleCap = gb.weaponMasteryLevelUpsPerBattle ?? 1;
      while (m.level < max && (rewards.masteryLevelUps[type] || 0) < battleCap && m.exp >= this.masteryExpNeeded(m.level)) { m.exp -= this.masteryExpNeeded(m.level); m.level++; rewards.masteryLevelUps[type] = (rewards.masteryLevelUps[type] || 0) + 1; }
      if (m.level >= max) m.exp = 0;
      this.saveProfile();
      return { type, gain, before, after: m.level, leveled: m.level > before };
    }
    isWeaponMasteryAction(skill) { const basics = Object.values(D.basicAttackByWeaponType || {}); return !!skill && (skill.source === 'weapon' || skill.kind === 'weapon' || basics.includes(skill.id)); }
    sparkEnemyFor(targetIndex = -1) { const selected = targetIndex >= 0 ? this.enemies[targetIndex] : null; if (selected?.alive) return selected; return this.enemies.filter(e => e.alive).sort((a, b) => (b.sparkLevel || 1) - (a.sparkLevel || 1))[0] || null; }
    grantWeaponActionExp(skill, targetIndex = -1) {
      if (!this.isWeaponMasteryAction(skill)) return null;
      const enemy = this.sparkEnemyFor(targetIndex), gb = this.gb();
      const strong = enemy && (enemy.kind === 'boss' || enemy.kind === 'elite' || enemy.kind === 'rare' || (enemy.sparkLevel || 1) >= (gb.weaponExpStrongSparkLevel ?? 30));
      const result = this.grantWeaponExp(strong ? (gb.weaponExpStrongAction ?? 2) : (gb.weaponExpPerAction ?? 1), skill.weaponType || this.equippedWeaponType());
      if (!result) return null;
      const rewards = (this.battleRewards ||= {}); rewards.masteryResults ||= []; rewards.masteryResults.push(result);
      if (result.leveled) this.queueGrowthBubble(`${this.weaponTypeName(result.type)}武器学 Lv.UP!`, `Lv.${result.before} → ${result.after}`);
      this.updateHUD();
      return result;
    }

    // 戦闘終了時：HP/MP を独立した確率判定で成長
    rollVitalGrowth() {
      if (this.isNoGrowthJob()) return null;
      const gb = this.gb(), job = this.profile.currentJob, out = { hp: 0, mp: 0 };
      const strongest = Math.max(0, ...(this.enemies || []).map(enemy => enemy.sparkLevel || 0));
      const currentMaxHp = this.profile.baseStats?.maxHp || this.player?.stats?.maxHp || 0;
      const hpTier = Math.floor(Math.max(0, currentMaxHp) / (gb.vitalGrowthHpTierSize ?? 100));
      const requiredSparkLevel = hpTier * (gb.vitalGrowthSparkPerTier ?? 10);
      const hpEligible = strongest >= requiredSparkLevel;
      const hpRate = (gb.baseHpGrowthRate ?? 0) + ((gb.jobHpGrowthBonus || {})[job] ?? 0);
      const mpRate = ((gb.baseMpGrowthRate ?? 0) + ((gb.jobMpGrowthBonus || {})[job] ?? 0)) * this.traitMpGrowthMult();
      const amt = r => Math.floor(Math.random() * ((r?.max ?? 1) - (r?.min ?? 1) + 1)) + (r?.min ?? 1);
      if (hpEligible && Math.random() < hpRate) out.hp = amt(gb.hpGrowthAmount);
      if (Math.random() < mpRate) out.mp = amt(gb.mpGrowthAmount);
      if (!out.hp && !out.mp) return null;
      const b = this.profile.baseStats; this.profile.currentVitals ||= { hp: b.maxHp, mp: b.maxMp };
      if (out.hp) { b.maxHp += out.hp; this.profile.currentVitals.hp += out.hp; if (this.player) { this.player.stats.maxHp += out.hp; this.player.hp += out.hp; } }
      if (out.mp) { b.maxMp += out.mp; this.profile.currentVitals.mp += out.mp; if (this.player) { this.player.stats.maxMp += out.mp; this.player.mp += out.mp; } }
      const pt = this.profile.playtest;
      if (pt) { if (out.hp) { pt.hpGrowthCount++; pt.hpGrowthTotal += out.hp; } if (out.mp) { pt.mpGrowthCount++; pt.mpGrowthTotal += out.mp; } }
      return out;
    }

    // 攻撃発動時：武器・敵・技ごとの難度と派生倍率から未習得技を抽選。
    learnedWeaponSkillIds() { return this.profile.learnedWeaponSkills ||= []; }
    hasWeaponSkill(id) { return this.learnedWeaponSkillIds().includes(id); }
    sparkBaseRateForScore(score) { const table = this.gb().sparkRateTable || []; return (table.find(row => score >= row.minScore) || { rate: 0 }).rate || 0; }
    sparkSourceMultiplier(skill, sourceSkillId) {
      const cfg = this.gb().sparkSourceMultipliers || { basic: .25, related: .5, direct: 2 };
      const explicit = skill.sparkFrom?.[sourceSkillId];
      if (explicit != null) return explicit;
      if (skill.sparkExclusive) return 0;
      if (Object.values(D.basicAttackByWeaponType || {}).includes(sourceSkillId)) return cfg.basic ?? .25;
      return D.skills[sourceSkillId]?.source === 'weapon' ? (cfg.related ?? .5) : 0;
    }
    sparkRateBonus(type, skill) {
      return (this.passiveEffectRate?.('sparkRateBonus') || 0) + (this.equipmentEffectRate?.('sparkRateBonus') || 0);
    }
    rollSpark(sourceSkillId, enemy = null) {
      const source = D.skills[sourceSkillId];
      if (this.isNoGrowthJob() || !this.isWeaponMasteryAction(source)) return null;
      const gb = this.gb(), type = source.weaponType || this.equippedWeaponType(), masteryLevel = this.masteryOf(type).level || 1, enemySparkLevel = Math.max(1, enemy?.sparkLevel || 1);
      const candidates = Object.values(D.skills).filter(s => this.isPlayerContentVisible(s) && s.source === 'weapon' && s.weaponType === type && s.sparkRank != null && !this.hasWeaponSkill(s.id)).sort(() => Math.random() - .5);
      for (const skill of candidates) {
        if (type && this.equippedWeaponType() !== type) continue;
        const equippedTree = this.equippedWeapon()?.guitarSkillTree;
        if (skill.weaponType === 'instrument' && (equippedTree ? skill.guitarTreeId !== equippedTree : !!skill.guitarTreeId)) continue;
        if (skill.requiredWeaponId && this.profile.equipment?.rightHand !== skill.requiredWeaponId) continue;
        const sourceMultiplier = this.sparkSourceMultiplier(skill, sourceSkillId); if (!(sourceMultiplier > 0)) continue;
        const score = masteryLevel + enemySparkLevel - skill.sparkRank;
        const baseRate = this.sparkBaseRateForScore(score);
        const rate = Math.min(1, baseRate * sourceMultiplier * this.traitSparkMult(type) + this.sparkRateBonus(type, skill));
        if (Math.random() < rate) {
          this.learnedWeaponSkillIds().push(skill.id);
          const pt = this.profile.playtest;
          if (pt) { pt.sparkLog ||= []; pt.sparkLog.push({ skillId: skill.id, name: skill.name, battle: (pt.battles || 0) + 1, sourceSkillId, sparkRank: skill.sparkRank, enemySparkLevel, score, rate }); }
          this.saveProfile();
          return skill;
        }
      }
      return null;
    }
    // 装備中カテゴリの通常攻撃
    basicAttackSkill() { const weapon = this.equippedWeapon(), subtypeId = (D.basicAttackByWeaponSubtype || {})[weapon?.weaponSubtype], map = D.basicAttackByWeaponType || {}; return D.skills[subtypeId || map[this.equippedWeaponType()]] || D.skills.attack; }
    weaponTypeName(id) { return (D.weaponTypes || []).find(t => t.id === id)?.name || id; }
    // ステータス画面：装備由来の戦闘能力と、現在武器での攻撃性能
    // ステータスの主役。装備の素の合計ではなく、いま実際に効いている値を出す。
    //   攻撃力     = 武器種のスケーリング（力や魔力など）＋装備の攻撃力
    //   防御力     = 体力＋装備の防御力
    //   魔法防御力 = 精神＋装備の魔法防御力
    combatStatsSectionHTML(total = this.totalStats()) {
      const wType = this.equippedWeaponType();
      const rule = (D.weaponScaling || {})[wType] || {};
      const scaleText = Object.entries(rule.scaling || {}).map(([k, v]) => `${statLabels[k] || k}×${Math.round(v * 100)}%`).join('＋');
      const magicWeapon = rule.powerKey === 'magicAttackPower';
      const rows = [
        ['攻撃力', Math.round(this.attackPowerFor(wType, total)), `${scaleText}＋装備の${magicWeapon ? '魔法攻撃力' : '攻撃力'}`],
        ['防御力', Math.round(this.defensePowerFor('physical', total)), '体力＋装備の防御力'],
        ['魔法防御力', Math.round(this.defensePowerFor('magical', total)), '精神＋装備の魔法防御力']
      ].map(([label, v, note]) => `<div class="cbt3-cell"><span>${label}</span><b>${v}</b><small>${note}</small></div>`).join('');
      return `<div class="st-section st-primary"><h3>戦闘能力</h3><div class="cbt3">${rows}</div></div>`;
    }
    // ステータス画面：3武器学の一覧と習得済み武器技
    masterySectionHTML() {
      const cur = this.equippedWeaponType();
      const rows = this.unlockedWeaponTypes().map(t => {
        const m = this.masteryOf(t.id), need = this.masteryExpNeeded(m.level), pct = Math.min(100, 100 * m.exp / need);
        const skills = this.learnedWeaponSkills().filter(s => s.weaponType === t.id);
        return `<div class="mst-row${cur === t.id ? ' current' : ''}"><div class="mst-head"><span>${t.name}</span><b>Lv.${m.level}</b>${cur === t.id ? '<em>装備中</em>' : ''}</div><i class="mst-bar"><em style="width:${pct}%"></em></i><small>次のLvまで ${pct.toFixed(2)}% ／ 対応武器ダメージ ×${this.weaponMasteryMultiplier(t.id).toFixed(3)}</small>${skills.length ? `<div class="mst-skills">${skills.map(s => `<mark>${s.name}</mark>`).join('')}</div>` : ''}</div>`;
      }).join('');
      return `<div class="st-section"><h3>武器学</h3><div class="mst-list">${rows}</div></div>`;
    }
    // テストプレイ用の集計。コンソールから arseneGame.playtestReport() で確認できる。
    playtestReport() {
      const pt = this.profile.playtest || {}, m = this.profile.weaponMastery || {};
      const jid = this.profile.currentJob, jst = this.profile.jobs?.[jid] || {};
      const report = {
        総プレイ時間: `${Math.floor((pt.playMs || (Date.now() - (pt.startedAt || Date.now()))) / 60000)}分`,
        総戦闘回数: pt.battles || 0,
        剣: `Lv${m.sword?.level ?? 1} / EXP ${m.sword?.exp ?? 0}`,
        杖: `Lv${m.staff?.level ?? 1} / EXP ${m.staff?.exp ?? 0}`,
        体術: `Lv${m.martial?.level ?? 1} / EXP ${m.martial?.exp ?? 0}`,
        使用回数: pt.weaponUse || {},
        閃き履歴: (pt.sparkLog || []).map(s => `${s.name}（${s.battle}戦目）`),
        HP成長: `${pt.hpGrowthCount || 0}回 / 累計+${pt.hpGrowthTotal || 0}`,
        MP成長: `${pt.mpGrowthCount || 0}回 / 累計+${pt.mpGrowthTotal || 0}`,
        現在ジョブ: `${D.jobs[jid]?.name || jid} Lv.${jst.level || 1}`,
        習得武器技: this.learnedWeaponSkills().map(s => s.name)
      };
      console.table ? console.table(report) : console.log(report);
      return report;
    }
    // 戦闘結果画面の成長表示
    growthResultHTML(mastery, vitals, sparks = []) {
      if (!mastery && !vitals && !sparks.length) return '';
      const rows = [];
      if (mastery) {
        const name = this.weaponTypeName(mastery.type);
        rows.push(`<div class="growth-row"><span>${name} 熟練度</span><b>+${mastery.gain}</b></div>`);
        if (mastery.leveled) rows.push(`<div class="growth-row levelup"><span>${name} 武器学</span><b>Lv${mastery.before} → Lv${mastery.after}</b></div>`);
      }
      if (vitals?.hp) rows.push(`<div class="growth-row status"><span>最大HP</span><b>+${vitals.hp}</b></div>`);
      if (vitals?.mp) rows.push(`<div class="growth-row status"><span>最大MP</span><b>+${vitals.mp}</b></div>`);
      const sparkHtml = sparks.map(s => `<div class="growth-spark"><small>NEW TECH</small><b>${s.name}</b><span>${s.nameEn || ''}</span></div>`).join('');
      return `<div class="growth-result"><header><small>GROWTH</small><b>成長</b></header>${rows.join('')}${sparkHtml}</div>`;
    }
    learnedWeaponSkills() { return this.learnedWeaponSkillIds().map(id => D.skills[id]).filter(skill => this.isPlayerContentVisible(skill)); }
    weaponSkillMatchesEquipped(skill) {
      const weapon = this.equippedWeapon(), tree = weapon?.guitarSkillTree;
      if (tree && skill.guitarTreeId !== tree) return false;
      if (!tree && skill.guitarTreeId) return false;
      const requiredSubtype = skill.requiresWeaponSubtype || skill.weaponSubtype;
      return !requiredSubtype || weapon?.weaponSubtype === requiredSubtype;
    }
    weaponTypeList() { return (D.weaponTypes || []).filter(type => this.isPlayerContentVisible(type)); }
    weaponTypeDef(id) { return this.weaponTypeList().find(t => t.id === id) || null; }
    startingJobList() { return (D.startingJobIds || []).map(id => D.jobs[id]).filter(Boolean); }
    // 得意武器と初期ジョブを新規プロフィールへ反映する（初期装備の付与を含む）
    applyStartingChoice(profile, weaponTypeId, jobId) {
      const type = this.weaponTypeDef(weaponTypeId), job = D.jobs[jobId];
      // キャラクター固有の初期ステータス（characters.json の baseStats）を反映する。
      // 未設定のキャラは共通初期値のまま。既存セーブには影響しない。
      const charBase = (this.characterList || []).find(c => c.id === profile.selectedCharacter)?.baseStats;
      if (charBase) { Object.assign(profile.baseStats, charBase); profile.currentVitals = { hp: profile.baseStats.maxHp, mp: profile.baseStats.maxMp }; }
      if (type) {
        profile.preferredWeaponType = type.id;
        const wid = type.starterWeaponId;
        if (wid && D.items[wid]) { profile.inventory[wid] = Math.max(1, profile.inventory[wid] || 0); profile.equipment.rightHand = wid; }
      }
      if (job) { profile.currentJob = job.id; profile.initialJob = job.id; profile.jobs ||= {}; profile.jobs[job.id] ||= { level: 1, exp: 0 }; profile.unlockedJobs = [job.id]; }
      return profile;
    }
    // 固有技＝現在ジョブの固有スキル（戦士→ちからため、武道家→ばくれつけん等）
    personalSkills() {
      if (this.isPhantomThief()) return [...new Set(this.profile.ptActionSlots || [])].map(id => D.skills[id]).filter(s => this.isPlayerContentVisible(s) && s.type !== 'PASSIVE');
      const jobId = this.profile.currentJob, sig = D.skills[D.jobs[jobId]?.signatureSkillId];
      return this.isPlayerContentVisible(sig) && sig.type !== 'PASSIVE' && this.jobAbilityLearned(jobId, sig.id, sig.unlockJobLevel || 1) ? [sig] : [];
    }
    resonanceEnabled() { return this.profile.currentJob === 'guardian' || (this.isPhantomThief() && this.isJobMastered('guardian')); }
    resonanceMultiplier(value = this.player?.resonance || 0) { return (D.guardianBalance?.resonanceTiers || []).find(t => value >= t.min)?.multiplier || 0; }
    jobLearnedActiveSkills(jobId) { const job = D.jobs[jobId]; if (!this.isPlayerContentVisible(job)) return []; const list = Object.entries(job.skillUnlocks || {}).filter(([lv, id]) => this.jobAbilityLearned(jobId, id, lv)).map(([, id]) => D.skills[id]).filter(s => this.isPlayerContentVisible(s) && s.type !== 'PASSIVE'); const sig = D.skills[job.signatureSkillId]; if (this.isPlayerContentVisible(sig) && sig.type !== 'PASSIVE' && this.jobAbilityLearned(jobId, sig.id, sig.unlockJobLevel || 1) && !list.some(s => s.id === sig.id)) list.unshift(sig); return list; }
    masteredActions() { return (this.profile.jobMastered || []).map(id => D.skills[D.jobs[id]?.signatureSkillId]).filter(s => this.isPlayerContentVisible(s) && s.type !== 'PASSIVE'); }
    setPhantomAction(idx, skillId) { const max = this.actionSlotCount(); this.profile.ptActionSlots ||= new Array(max).fill(null); while (this.profile.ptActionSlots.length < max) this.profile.ptActionSlots.push(null); if (skillId) this.profile.ptActionSlots = this.profile.ptActionSlots.map(v => v === skillId ? null : v); this.profile.ptActionSlots[idx] = skillId || null; this.saveProfile(); this.audio.sfx('confirm'); if (this.jobUI) this.jobUI.modal = null; this.renderMenuPanel('job'); }
    skillEquipmentReady(skill) { const required = skill?.requiresWeaponSubtype; return !required || this.equippedWeapon()?.weaponSubtype === required; }
    allLearnedPassives() { const ids = [...(this.profile.learnedJobSkills || []), ...(this.profile.learnedCharacterSkills || [])]; return [...new Set(ids)].map(id => D.skills[id]).filter(s => this.isPlayerContentVisible(s) && s.type === 'PASSIVE'); }
    setPassiveSlot(idx, skillId) { this.setEquippedPassive(idx, skillId); }
    syncSkillUnlocks() { const learnedCharacter = new Set(this.profile.learnedCharacterSkills || []), learnedJob = new Set(this.profile.learnedJobSkills || []); (D.characterSkillProgression || []).forEach(entry => { if (this.profile.level >= entry.level) learnedCharacter.add(entry.skillId); }); Object.entries(this.profile.jobs || {}).forEach(([jobId, progress]) => { const job = D.jobs[jobId]; Object.entries(job?.skillUnlocks || {}).forEach(([level, skillId]) => { if (progress.level >= Number(level)) learnedJob.add(skillId); }); }); this.profile.learnedCharacterSkills = [...learnedCharacter]; this.profile.learnedJobSkills = [...learnedJob]; const allowed = new Set(['quickSlash', ...learnedCharacter, ...learnedJob]); this.profile.activeSkills = (this.profile.activeSkills || []).filter(id => allowed.has(id) && D.skills[id]?.type !== 'PASSIVE').slice(0, 4); }
    learnedActiveSkillIds() { return [...new Set(['quickSlash', ...(this.profile.learnedCharacterSkills || []), ...(this.profile.learnedJobSkills || [])])].filter(id => D.skills[id]?.type !== 'PASSIVE'); }
    characterHasSkill(id) { return (this.profile.learnedCharacterSkills || []).includes(id) || (D.characterSkillProgression || []).some(entry => entry.skillId === id && this.profile.level >= entry.level); }
    jobExpNeeded(level) { return D.jobExpTable[level] || null; }
    activeJobBonuses(jobId = this.profile.currentJob) { if ((this.gb().jobGrowthPerLevel || {})[jobId]) return {}; const job = D.jobs[jobId], level = this.profile.jobs?.[jobId]?.level || 1, bonuses = {}; for (let lv = 1; lv <= level; lv++) Object.entries(job?.growth?.[lv] || {}).forEach(([key, value]) => bonuses[key] = (bonuses[key] || 0) + value); return bonuses; }
    storedVitals(stats = this.totalStats()) { const v = this.profile.currentVitals || {}; return { hp: clamp(Number.isFinite(v.hp) ? v.hp : stats.maxHp, 0, stats.maxHp), mp: clamp(Number.isFinite(v.mp) ? v.mp : stats.maxMp, 0, stats.maxMp) }; }
    freshBattlePlayer(stats, hp, mp) { return { stats, hp, mp, inventory: this.profile.inventory, buffs: {}, cooldowns: {}, skillUses: {}, resonance: 0, lastReceivedType: null }; }
    persistVitals() { if (!this.player) return; this.profile.currentVitals = { hp: clamp(this.player.hp, 0, this.player.stats.maxHp), mp: clamp(this.player.mp, 0, this.player.stats.maxMp) }; this.saveProfile(); }
    expNeeded(level = this.profile.level) { return D.expTable[level] || Math.round(220 * Math.pow(1.48, level - 3)); }
    equipmentDefinition(id) { return D.weapons[id] || D.accessories[id] || D.armors?.[id] || D.equipment?.[id] || null; }
    equipmentBonuses(equipment = this.profile.equipment) {
      const result = {}; const add = (source, rate = 1) => Object.entries(source?.bonuses || {}).forEach(([k, v]) => {
        // 能力値とHP/MPは整数、会心率など1未満の率だけ小数のまま保持する。
        const scaled = Math.abs(v) < 1 ? v * rate : Math.round(v * rate);
        result[k] = (result[k] || 0) + scaled;
      });
      Object.entries(equipment).forEach(([, id]) => {
        const rate = 1 + this.enchantLevel(id) * (D.enchantTable?.powerRate ?? 0.15);
        add(this.equipmentDefinition(id), rate);
      }); return result;
    }
    isBossDefeated(id) { return !!(this.profile.bossDefeated?.[id] || (id === 'zenacad' && this.profile.flags.zenakadoDefeated)); }
    markBossDefeated(id) { this.profile.bossDefeated ||= {}; this.profile.bossDefeated[id] = true; if (id === 'zenacad') this.profile.flags.zenakadoDefeated = true; }
    isBossSeriesUnlocked(series) { if (!this.isPlayerContentVisible(series)) return false; const bossId = series?.unlockCondition?.bossDefeated; return !!bossId && this.isBossDefeated(bossId); }
    unlockedBossSeries() { return Object.values(D.bossEquipmentSeries || {}).filter(series => this.isBossSeriesUnlocked(series)); }
    equippedSeriesCount(seriesId, equipment = this.profile.equipment) { return Object.values(equipment).filter(id => id && (D.items[id]?.seriesId === seriesId || this.equipmentDefinition(id)?.seriesId === seriesId)).length; }
    activeSetEffects(equipment = this.profile.equipment) { const effects = {}; this.unlockedBossSeries().forEach(series => { const count = this.equippedSeriesCount(series.id, equipment); Object.entries(series.setBonuses || {}).forEach(([needed, bonus]) => { if (count >= Number(needed)) Object.assign(effects, bonus.effect || {}); }); }); return effects; }
    totalStats(equipment = this.profile.equipment) {
      const total = clone(this.profile.baseStats), bonuses = this.equipmentBonuses(equipment), jobBonuses = this.activeJobBonuses(), jobGrowth = this.jobStatBonuses(); Object.entries(bonuses).forEach(([k, v]) => total[k] = (total[k] || 0) + v); Object.entries(jobBonuses).forEach(([k, v]) => total[k] = (total[k] || 0) + v); Object.entries(jobGrowth).forEach(([k, v]) => total[k] = (total[k] || 0) + v); const setEffects = this.activeSetEffects(equipment); for (const key of ['str', 'vit', 'mag', 'mnd', 'agi', 'dex', 'luk']) { const pct = setEffects[`${key}Percent`] || 0; if (pct) total[key] = Math.max(total[key] + 1, Math.floor(total[key] * (1 + pct / 100))); } if (setEffects.critBonusFlat) total.critBonus = (total.critBonus || 0) + setEffects.critBonusFlat; if (this.activeMealBuffType() === 'makanai') total.maxHp = Math.ceil(total.maxHp * (1 + (D.foodMenu?.buffs?.makanai?.maxHpRate || .03))); total.critBonus ||= 0; this.applyPassiveStats(total); total.def = total.vit; /* 旧互換：def は体力と同義。装備防御力は defensePowerFor() 側で加算する */ /* 強化済みの能力補正は equipmentBonuses()、戦闘値は equipmentCombatStats() で加算する */ return total;
    }
    getDungeon(id = this.currentDungeonId) { return (D.dungeons || []).find(d => d.id === id) || (D.dungeons || [])[0]; }
    isDungeonUnlocked(id) { const d = this.getDungeon(id); if (!d) return false; if (!d.unlockCondition) return true; const previousBoss = { dungeon1Clear: 'zenacad', dungeon2Clear: 'myrthi', dungeon3Clear: 'seripes', dungeon4Clear: 'astact', dungeon5Clear: 'ostina' }[d.unlockCondition]; return previousBoss ? this.isBossDefeated(previousBoss) : false; }
    applyDungeonBackground() { const dungeon = this.getDungeon(), floor = this.activeFloor(this.currentDungeonId); const bg = floor?.background || dungeon?.background || 'assets/bg/dungeon-battle-01.png'; const bf = $('#battlefield'); bf.dataset.dungeon = this.currentDungeonId; bf.dataset.floor = floor?.id || ''; bf.style.backgroundImage = `linear-gradient(#0207134a,#0208171f 58%,#02040b5c),url("${bg}")`; bf.style.backgroundSize = 'auto,cover'; bf.style.backgroundPosition = 'center,center bottom'; bf.style.backgroundRepeat = 'no-repeat,no-repeat'; }
    // 武道家が素手のときは拳を握る（JOB特性《無手の型》）。他JOBは従来どおり杖にフォールバック。
    isBareHanded(hand = 'rightHand') { return !D.weapons[this.profile.equipment?.[hand]]; }
    usesBareFists() { return this.jobHasTrait('bareFists') && this.isBareHanded('rightHand'); }
    jobHasTrait(key, jobId = this.profile.currentJob) { return !!D.jobs[jobId]?.traits?.[key]; }
    isDualBladeWeapon(value) { const w = typeof value === 'string' ? D.weapons[value] : value; return w?.weaponSubtype === 'dualBlade'; }
    dualWieldEnabled() { return this.hasPassiveType('dualWield') && this.isDualBladeWeapon(this.profile.equipment?.rightHand); }
    equippedWeapon() { return D.weapons[this.profile.equipment.rightHand] || (this.usesBareFists() ? D.weapons.bareFist : D.weapons.mageStaff); }
    // 左手が殴れるか＝双刃士のオフハンド武器、または武道家の素手。返り値は左手側の武器定義。
    offHandWeapon() {
      if (this.usesBareFists()) return D.weapons.bareFist;
      const id = this.profile.equipment?.leftHand;
      return this.dualWieldEnabled() && this.isDualBladeWeapon(id) ? D.weapons[id] : null;
    }
    // 左手攻撃の倍率。武道家《無手の型》も双刃士《二刀の型》も同じ仕組みで、
    // JOB特性の rate を転生回数で伸ばした値を使う。
    offHandRate() { if (this.usesBareFists()) return this.jobTraitRate('bareFists'); const boost = this.comboMaxBoost(); return this.dualWieldRate() + (boost?.offHandRate || 0); }
    progressState() { const f = this.profile.flags, noelGoal = D.battleProgression?.noelEncounterWins || 3, zenakadoGoal = D.battleProgression?.zenakadoEncounterWins || 7; if (!f.noelFirstEncounterCleared) { const wins = Math.max(0, f.preNoelBattleWins || 0); return { phase: 'noel', wins, goal: noelGoal, ready: wins >= noelGoal, bossId: 'noelFirstEncounter', bossName: 'NOËL' }; } if (!f.zenakadoDefeated) { const wins = Math.max(0, f.postNoelBattleWins || 0); return { phase: 'zenakado', wins, goal: zenakadoGoal, ready: wins >= zenakadoGoal, bossId: 'zenakado', bossName: 'ZENAKADO' }; } return { phase: 'complete', wins: zenakadoGoal, goal: zenakadoGoal, ready: false, bossId: null, bossName: 'DUNGEON CLEAR' }; }

    startBattle() {
      this.closeBattleMenu(); this.cancelAutoPick(); this.battleMode = 'slime'; const stats = this.totalStats(), vitals = this.storedVitals(stats); this.player = this.freshBattlePlayer(stats, D.settings.healOnBattleStart ? stats.maxHp : vitals.hp, D.settings.healOnBattleStart ? stats.maxMp : vitals.mp);
      const dungeon = this.getDungeon(), dungeon2 = this.currentDungeonId === 'dungeon2', dungeon3 = this.currentDungeonId === 'dungeon3';
      let wins, lineup;
      const floor = this.activeFloor(this.currentDungeonId);
      if (floor) {
        // 階層制：難易度はその階の勝利数で決まる。他の階の周回は影響しない。
        this.currentFloorId = floor.id;
        lineup = this.rollEncounter(this.floorWins(floor.id), floor.encounterProgression);
      } else if (dungeon2 || dungeon3) {
        wins = dungeon3 ? (this.profile.flags.dungeon3BattleWins || 0) : (this.profile.flags.dungeon2BattleWins || 0);
        lineup = this.rollEncounter(wins, dungeon?.encounterProgression);
      } else {
        const progress = this.progressState(), difficultyWins = progress.phase === 'noel' ? progress.wins : progress.wins + (D.battleProgression?.noelEncounterWins || 3);
        lineup = this.rollEncounter(difficultyWins, dungeon?.encounterProgression);
      }
      this.enemies = lineup.map((id, i) => this.makeEnemy(id, i)); const count = this.enemies.length;
      this.turn = 1; this.locked = false; this.finished = false; this.resetBattleLog(); this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [], masteryResults: [], jobResults: [] }; $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual(); this.applyDungeonBackground();
      this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); const names = [...new Set(this.enemies.map(e => e.name))]; this.setLog(`${count}体の${names.join('と')}が現れた！`); this.flashTitle('ENCOUNTER', '怪異反応を検知'); this.showMainCommands();
    }
    // ボスのBGM。敵データに music があればそれを、無ければ共通のボス戦BGMを使う。
    // 曲を足すときは data.js の敵に music を書くだけで済む。
    bossMusicFor(bossId) {
      const track = D.enemies[bossId]?.music;
      return track ? encodeURI(track) : this.bossMusic;
    }
    // ボス戦の開始点はメニュー・再戦・ダンジョン内と複数あるので、
    // 曲の切り替えは各 start 関数の中でまとめて行う。
    playBossMusic(bossId) { this.audio.playTrack(this.bossMusicFor(bossId)); }
    startBossEncounter(forceBossId = null, forcePhase = null) {
      const progress = this.progressState();
      const bossId = forceBossId || progress.bossId, phase = forcePhase || progress.phase;
      if (!bossId || (!forceBossId && !progress.ready)) { this.showMenu('home'); return; }
      this.battleMode = phase; const stats = this.totalStats(), template = D.enemies[bossId]; if (!template) { this.showMenu('home'); return; } this.playBossMusic(bossId);
      const vitals = this.storedVitals(stats); this.player = this.freshBattlePlayer(stats, vitals.hp, vitals.mp);
      const baseBossStats = template.dynamicScale ? { maxHp: stats.maxHp * template.dynamicScale, atk: Math.max(stats.str, stats.mag) * template.dynamicScale, def: stats.def * template.dynamicScale, mag: stats.mag * template.dynamicScale, mnd: stats.mnd * template.dynamicScale, spd: stats.agi * template.dynamicScale } : { ...template.stats };
      const bossStats = this.applyBossOverdriveStats ? this.applyBossOverdriveStats(bossId, baseBossStats) : baseBossStats;
      this.enemies = [{ ...template, uid: `${template.id}-boss`, label: '', stats: bossStats, hp: bossStats.maxHp, alive: true, bindResistance: template.bindResistance ?? .35, bindTurns: 0 }];
      this.turn = 1; this.locked = false; this.finished = false; this.resetBattleLog(); this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [], masteryResults: [], jobResults: [] }; $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual(); this.applyDungeonBackground();
      const bossArrival = this.battleMode === 'noel'
        ? '忘却の最奥――永遠の裁定者ノエルが姿を現した……。'
        : `${template.title ? `${template.title} ` : ''}${template.name}が立ちはだかった……！`;
      this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); this.setLog(bossArrival); this.flashTitle('BOSS ENCOUNTER', (template.nameEn || template.name || progress.bossName).toUpperCase()); this.showMainCommands();
    }
    startDebugGuardianTrial() {
      const template = D.enemies.debugOverpowerEnemy;
      if (!template || this.profile.currentJob !== 'guardian' || this.equippedWeaponType() !== 'shield') return false;
      this.debugBattleSnapshot = { profile: clone(this.profile), dungeonId: this.currentDungeonId, floorId: this.currentFloorId };
      this.battleMode = 'debugOverpower'; this.currentDungeonId = 'dungeon3'; this.currentFloorId = 'd3f8';
      const stats = this.totalStats();
      this.player = this.freshBattlePlayer(stats, stats.maxHp, stats.maxMp);
      const bossStats = { ...template.stats };
      this.enemies = [{ ...template, uid: `${template.id}-boss`, label: '', stats: bossStats, hp: bossStats.maxHp, alive: true, bindResistance: .9, bindTurns: 0, debugDamageTaken: 0 }];
      this.turn = 1; this.locked = false; this.finished = false; this.resetBattleLog(); this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [], masteryResults: [], jobResults: [] };
      $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle';
      this.audio.playTrack(this.bossMusic); this.applySetBattleVisual(); this.applyDungeonBackground(); this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD();
      this.setLog('DEBUG：HP無限・回復封印・必中の守護士試験。敗北までの生存ターンと総与ダメージを測定する。'); this.flashTitle('GUARDIAN TRIAL', 'HEAL SEAL // SURE HIT'); this.showMainCommands();
      return true;
    }
    restoreDebugBattle() {
      const snapshot = this.debugBattleSnapshot; if (!snapshot) return;
      this.profile = clone(snapshot.profile); this.currentDungeonId = snapshot.dungeonId; this.currentFloorId = snapshot.floorId; this.debugBattleSnapshot = null; this.player = null; this.saveProfile();
    }
    startMyrthiBoss() {
      this.battleMode = 'myrthi'; const stats = this.totalStats(), template = D.enemies.myrthi;
      this.playBossMusic('myrthi');
      const vitals = this.storedVitals(stats); this.player = this.freshBattlePlayer(stats, vitals.hp, vitals.mp);
      const bossStats = this.applyBossOverdriveStats ? this.applyBossOverdriveStats('myrthi', { ...template.stats }) : { ...template.stats };
      const boss = { ...template, uid: 'myrthi-boss', label: '', stats: bossStats, hp: bossStats.maxHp, alive: true, beat: 0, accelerandoActivated: false, bindResistance: template.bindResistance ?? .35, bindTurns: 0 };
      this.enemies = [boss];
      this.turn = 1; this.locked = false; this.finished = false; this.resetBattleLog(); this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [], masteryResults: [], jobResults: [] };
      $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual(); this.applyDungeonBackground();
      this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); this.setLog('沈黙の楽殿に、黒紅の旋風が舞い込む……！'); this.flashTitle('BOSS ENCOUNTER', 'MYRTHI'); this.showMainCommands();
    }
    startVersicrellBoss() {
      this.battleMode = 'versicrell'; const stats = this.totalStats(), template = D.enemies.versicrell, vitals = this.storedVitals(stats);
      this.playBossMusic('versicrell');
      this.player = this.freshBattlePlayer(stats, vitals.hp, vitals.mp);
      const bossStats = { ...template.stats };
      this.enemies = [{ ...template, uid: 'versicrell-boss', label: '', stats: bossStats, hp: bossStats.maxHp, alive: true, form: 1, movement: null, movementActionsLeft: 0, falseCadenceUsed: false, coda: false, bindResistance: template.bindResistance ?? .40, bindTurns: 0 }];
      this.turn = 1; this.locked = false; this.finished = false; this.resetBattleLog(); this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [], masteryResults: [], jobResults: [] };
      $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual(); this.applyDungeonBackground();
      this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); this.setLog('ヴェルシクレル「……一周するまで、聴いていけば？」'); this.flashTitle('MID BOSS ENCOUNTER', 'VERSICRELL // SILVER CIRCLE'); this.showMainCommands();
    }
    startSeripesBoss() {
      this.battleMode = 'seripes'; const stats = this.totalStats(), template = D.enemies.seripes, vitals = this.storedVitals(stats);
      this.playBossMusic('seripes');
      this.player = this.freshBattlePlayer(stats, vitals.hp, vitals.mp);
      const bossStats = this.applyBossOverdriveStats ? this.applyBossOverdriveStats('seripes', { ...template.stats }) : { ...template.stats };
      this.enemies = [{ ...template, uid: 'seripes-boss', label: '', stats: bossStats, hp: bossStats.maxHp, alive: true, phase2: false, finalPhase: false, repriseStance: null, pendingReprise: null, recentDamageTypes: [], bindResistance: template.bindResistance ?? .45, bindTurns: 0 }];
      this.turn = 1; this.locked = false; this.finished = false; this.resetBattleLog(); this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [], masteryResults: [], jobResults: [] };
      $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual(); this.applyDungeonBackground();
      this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); this.setLog('白銀の盾が道を塞ぐ。第三奏卿――不落の反奏騎士セリペス。'); this.flashTitle('BOSS ENCOUNTER', 'SERIPES // REPRISE'); this.showMainCommands();
    }
    async transformVersicrell(enemy) {
      this.audio.stopMusic(260);
      this.flashTitle('BATTLE COMPLETE...', 'ERROR'); await this.battleSleep(700);
      const lines = [
        { sys: 'ERROR' }, { sys: 'SILVER CIRCLE IS STILL PLAYING.' },
        { who: 'ヴェルシクレル', text: '……なるほど。' },
        { who: 'ヴェルシクレル', text: 'この姿じゃ、まだ力が出せないか。' },
        { who: 'ヴェルシクレル', text: 'なら――' }, { big: '「形なんて、いらない。」' }, { big: 'DA CAPO.' }
      ];
      if (typeof this.playNoiseSequence === 'function') await this.playNoiseSequence(lines);
      else await this.battleSleep(1200);
      const form = D.enemies.versicrell.form2;
      Object.assign(enemy, { name: form.name, title: form.title, sprite: form.sprite, spriteClass: form.spriteClass, stats: { ...form.stats }, hp: form.stats.maxHp, alive: true, form: 2, movement: null, movementActionsLeft: 0, falseCadenceUsed: false, coda: false, rolledDrops: null });
      this.renderEnemies(); this.updateHUD(); this.audio.playTrack(encodeURI(D.enemies.versicrell.musicPhase2));
      this.flashTitle('SECOND FORM', 'GUITAR AXE // SILVER CIRCLE'); this.setLog('銀環が暴走し、異形の奏者がギターを逆さに構えた！'); await this.battleSleep(900);
      this.turn++; this.locked = false; this.showMainCommands();
    }
    async applyVersicrellMovement(enemy, mode) {
      enemy.movement = mode; enemy.defBuffUntil = 0; enemy.mdefBuffUntil = 0; enemy.defBuffRate = 0; enemy.mdefBuffRate = 0;
      if (mode === 'first') { enemy.defBuffUntil = 99999; enemy.defBuffRate = .50; enemy.movementActionsLeft = 3; this.flashTitle('FIRST MOVEMENT', '《銀環奏・剛》 DEF +50%'); this.setLog('銀環が肉体を包み、物理防御を高めた！'); }
      if (mode === 'second') { enemy.mdefBuffUntil = 99999; enemy.mdefBuffRate = .50; enemy.movementActionsLeft = 3; this.flashTitle('SECOND MOVEMENT', '《銀環奏・魔》 MDEF +50%'); this.setLog('銀環が魔力へ同調し、魔法防御を高めた！'); }
      if (mode === 'double') { enemy.defBuffUntil = enemy.mdefBuffUntil = 99999; enemy.defBuffRate = enemy.mdefBuffRate = .30; enemy.movementActionsLeft = 2; this.flashTitle('DOUBLE CIRCLE', 'DEF +30% // MDEF +30%'); this.setLog('二重銀環が物理と魔法の双方を拒む！'); }
      if (mode === 'break') { enemy.movementActionsLeft = 1; this.flashTitle('BREAK', 'MAXIMUM ATTACK CHANCE'); this.setLog('ヴェルシクレル「……息継ぎ。」'); }
      this.updateHUD(); await this.battleSleep(650);
    }
    async versicrellStrike(enemy, action, multiplier = 1, cssClass = '') {
      const el = document.getElementById(enemy.uid), ren = $('#ren'), magical = action.kind === 'magic';
      this.flashTitle(action.name, magical ? 'DISTORTED SOUND' : 'GUITAR AXE'); this.setLog(`${enemy.name}の${action.name}！`); this.audio.sfx(magical ? 'dark' : 'slash');
      if (cssClass) el?.classList.add(cssClass); el?.classList.add('enemy-attacking'); await this.battleSleep(cssClass === 'guitar-axe-windup' ? 620 : 360);
      const raw = this.enemyRawDamage(magical ? 'magical' : 'physical', magical ? enemy.stats.mag : enemy.stats.atk, 1), outcome = this.rollEnemyAttackOutcome(enemy, action);
      const damage = Math.max(1, Math.round(raw * multiplier + roll(D.combatBalance.enemyVariance.min, D.combatBalance.enemyVariance.max)));
      if (!outcome.hit) { this.triggerEvade(enemy, 'player', action, { source: 'versicrell' }); this.floating(ren, 'EVADE', 'miss'); this.setLog(`${action.name}をかわした！`); }
      else { ren.classList.add('hit'); this.audio.sfx('playerHit'); const actual = this.receivePlayerDamage(damage, magical ? 'magical' : 'physical'); this.floating(ren, actual, 'enemy-damage'); this.setLog(`${this.playerName()}は${actual}ダメージを受けた！`); }
      this.updateHUD(); await this.battleSleep(430); el?.classList.remove('enemy-attacking'); if (cssClass) el?.classList.remove(cssClass); ren.classList.remove('hit');
      if (action.id === 'noiseChord' && outcome.hit && Math.random() < (action.debuffChance || .25)) { const magicDown = Math.random() < .5; this.player.buffs[magicDown ? 'versicrellMagDown' : 'versicrellAtkDown'] = { rate: .10, until: this.turn + 2 }; this.floating(ren, magicDown ? 'MAG -10%' : 'ATK -10%', 'miss'); }
    }
    async bossAttackVersicrell(enemy) {
      if (enemy.form === 2 && !enemy.coda && enemy.hp / enemy.stats.maxHp <= .25) { enemy.coda = true; enemy.movement = 'coda'; enemy.defBuffUntil = enemy.mdefBuffUntil = 0; enemy.stats.atk = Math.round(enemy.stats.atk * 1.25); enemy.stats.mag = Math.round(enemy.stats.mag * 1.25); enemy.stats.spd = Math.round(enemy.stats.spd * 1.18); this.flashTitle('CODA', 'NO MORE DEFENSE'); this.setLog('銀環が砕け、ヴェルシクレルは守りを捨てた！'); await this.battleSleep(700); }
      if (enemy.coda) { const action = Math.random() < .52 ? enemy.specialAttacks.silverClaw : enemy.specialAttacks.axeChord; await this.versicrellStrike(enemy, action, 1.28, action.id === 'axeChord' ? 'guitar-axe-windup' : 'silver-claw'); if (this.player.hp > 0 && Math.random() < .28) await this.versicrellStrike(enemy, enemy.specialAttacks.preciousSky, .85); return; }
      if (!enemy.movement) { await this.applyVersicrellMovement(enemy, 'first'); return; }
      if (enemy.movementActionsLeft <= 0) {
        if (enemy.movement === 'first') { await this.applyVersicrellMovement(enemy, 'second'); return; }
        if (enemy.movement === 'second' && enemy.form === 2 && !enemy.falseCadenceUsed) { enemy.falseCadenceUsed = true; this.flashTitle('FALSE CADENCE', 'BREAK CANCELLED'); await this.battleSleep(500); await this.applyVersicrellMovement(enemy, 'double'); return; }
        if (enemy.movement === 'second' || enemy.movement === 'double') { await this.applyVersicrellMovement(enemy, 'break'); return; }
        if (enemy.movement === 'break') { this.flashTitle('DA CAPO', 'RETURN TO FIRST MOVEMENT'); await this.battleSleep(350); await this.applyVersicrellMovement(enemy, 'first'); return; }
      }
      if (enemy.movement === 'break') { enemy.movementActionsLeft--; this.setLog('防御の銀環が消えている。今が最大の攻撃機会だ！'); await this.battleSleep(500); return; }
      if (Math.random() < .10) { enemy.movementActionsLeft++; this.flashTitle('REPEAT', 'CURRENT MOVEMENT +1T'); this.setLog('銀環が同じ小節を繰り返した！'); await this.battleSleep(500); return; }
      enemy.movementActionsLeft--;
      const r = Math.random();
      if (r < .25) await this.versicrellStrike(enemy, enemy.specialAttacks.preciousSky, enemy.form === 2 ? 1.15 : 1.0);
      else if (enemy.form === 2 && r < .62) await this.versicrellStrike(enemy, enemy.specialAttacks.axeChord, 1.15, 'guitar-axe-windup');
      else await this.versicrellStrike(enemy, enemy.form === 2 ? enemy.specialAttacks.silverClaw : enemy.specialAttacks.noiseChord, enemy.form === 2 ? 1.12 : .95, enemy.form === 2 ? 'silver-claw' : '');
    }
    async bossAttackMyrthi(enemy) {
      const el = document.getElementById(enemy.uid), ren = $('#ren');
      if (!enemy.accelerandoActivated && enemy.hp / enemy.stats.maxHp <= 0.30) {
        enemy.accelerandoActivated = true; enemy.stats.spd = Math.floor(enemy.stats.spd * 1.3); enemy.stats.atk = Math.floor(enemy.stats.atk * 1.15);
        this.flashTitle('ACCELERANDO', '《加速》'); this.setLog('いいね……もっと速くしよっか。'); await this.battleSleep(900);
      }
      if (enemy.beat >= 4) {
        enemy.beat = 0; this.flashTitle('DEADLY RHYTHM', '4HIT COMBO'); this.setLog(`ミルティのDEADLY RHYTHM！ 四連撃が迸る……！`);
        el.classList.add('enemy-attacking'); await this.battleSleep(300); let anyHit = false;
        const balance = D.combatBalance;
        for (let i = 0; i < 4; i++) {
          if (this.player.hp <= 0) break;
          const action = enemy.specialAttacks?.deadlyRhythm || { id: 'deadlyRhythm', name: 'DEADLY RHYTHM', kind: 'physical' };
          const outcome = this.rollEnemyAttackOutcome(enemy, action);
          if (!outcome.hit) { this.triggerEvade(enemy, 'player', action, { hitIndex: i, source: 'myrthiDeadlyRhythm' }); this.floating(ren, 'EVADE', 'miss'); await this.battleSleep(200); continue; }
          anyHit = true;
          ren.classList.add('hit');
          const defUpBuff = (this.player.buffs?.defUp && this.turn <= this.player.buffs.defUp.until) ? (1 + (this.player.buffs.defUp.rate || 0)) : 1;
          const raw = this.enemyRawDamage('physical', enemy.stats.atk, defUpBuff);
          const dmg = Math.max(1, Math.round(raw + roll(balance.enemyVariance.min, balance.enemyVariance.max)));
          const actual = this.receivePlayerDamage(dmg, 'physical'); this.audio.sfx('playerHit'); this.floating(ren, actual, 'enemy-damage'); this.updateHUD(); await this.battleSleep(200); ren.classList.remove('hit');
        }
        el.classList.remove('enemy-attacking'); if (anyHit) await this.tryCounter(enemy); return;
      }
      let r = Math.random(), chosen = enemy.ai[enemy.ai.length - 1], acc = 0;
      for (const s of enemy.ai) { acc += s.weight; if (r < acc) { chosen = s; break; } }
      this.flashTitle(chosen.name, 'BOSS STRIKE'); this.audio.sfx('slash'); el.classList.add('enemy-attacking'); await this.battleSleep(400);
      const balance = D.combatBalance, defUpBuff = (this.player.buffs?.defUp && this.turn <= this.player.buffs.defUp.until) ? (1 + (this.player.buffs.defUp.rate || 0)) : 1;
      const raw = this.enemyRawDamage('physical', enemy.stats.atk, defUpBuff);
      let damage = Math.max(1, Math.round(raw + roll(balance.enemyVariance.min, balance.enemyVariance.max)));
      const outcome = this.rollEnemyAttackOutcome(enemy, chosen, { criticalChance: enemy.accelerandoActivated ? .22 : 0 });
      if (outcome.critical) { damage = Math.floor(damage * 1.5); this.flashTitle('BEAT CRIT', '乱打の一閃'); }
      enemy.beat++;
      if (!outcome.hit) { this.triggerEvade(enemy, 'player', chosen, { source: 'myrthiAttack' }); this.floating(ren, 'EVADE', 'miss'); this.setLog(`ミルティの${chosen.name}！ ${this.playerName()}は攻撃をかわした！ 【BEAT ${enemy.beat}/4】`); this.updateHUD(); await this.battleSleep(450); el.classList.remove('enemy-attacking'); return; }
      ren.classList.add('hit');
      this.audio.sfx('playerHit'); const actual = this.receivePlayerDamage(damage, 'physical'); this.floating(ren, actual, 'enemy-damage');
      this.setLog(`ミルティの${chosen.name}！ ${this.playerName()}は${actual}ダメージを受けた！ 【BEAT ${enemy.beat}/4】`); this.updateHUD(); await this.battleSleep(450); el.classList.remove('enemy-attacking'); ren.classList.remove('hit');
      await this.tryCounter(enemy);
    }
    makeEnemy(id, index) {
      const t = D.enemies[id], floor = this.activeFloor(this.currentDungeonId), scale = t.ignoreFloorStatScale ? {} : (floor?.enemyScale || {});
      const rateFor = key => scale[key] ?? (key === 'maxHp' ? scale.hp : 1) ?? 1;
      const stats = Object.fromEntries(Object.entries(t.stats || {}).map(([key, value]) => [key, Math.max(1, Math.round(value * rateFor(key))) ]));
      const rewardRate = scale.rewards || 1;
      const gold = t.gold && typeof t.gold === 'object' ? { min: Math.round(t.gold.min * rewardRate), max: Math.round(t.gold.max * rewardRate) } : t.gold;
      return { ...t, uid: `enemy-${index}`, label: String.fromCharCode(65 + index), floorId: floor?.id || t.floorId, floorScale: scale, stats, hp: stats.maxHp, exp: Math.round((t.exp || 0) * rewardRate), gold, alive: true, bindResistance: t.bindResistance || 0, bindTurns: 0 };
    }
    rollEncounter(wins, progression) {
      if (this.currentDungeonId === 'dungeon3') {
        let rareRoll = Math.random();
        for (const rare of D.dungeon3RareEncounters || []) {
          rareRoll -= rare.chance || 0;
          if (rareRoll <= 0) return [rare.id];
        }
      }
      const tiers = progression || D.encounterProgression || [], tier = [...tiers].reverse().find(entry => wins >= entry.minWins);
      if (!tier) { const encounters = D.normalEncounters || [['shadowSlime', 'shadowSlime']]; return [...encounters[Math.min(wins, encounters.length - 1)]]; }
      const count = roll(tier.count[0], tier.count[1]), totalWeight = tier.pool.reduce((sum, entry) => sum + entry.weight, 0), lineup = [];
      for (let i = 0; i < count; i++) { let cursor = Math.random() * totalWeight, selected = tier.pool[tier.pool.length - 1].id; for (const entry of tier.pool) { cursor -= entry.weight; if (cursor <= 0) { selected = entry.id; break; } } lineup.push(selected); }
      return lineup;
    }
    // 図鑑用：戦闘に出た敵を「遭遇済み」として記録する。
    // ボス戦も通常戦もここを通るので、1か所で拾える。
    noteEnemiesSeen() {
      const seen = this.profile.seenEnemies ||= [];
      let added = false;
      for (const e of this.enemies || []) if (e.id && !seen.includes(e.id)) { seen.push(e.id); added = true; }
      if (added) this.saveProfile();
    }
    /* Remote pre-redesign battle renderer (superseded by the live mobile HUD below).
    renderEnemies() {
      this.noteEnemiesSeen();
      const enemyLayer = $('#enemies');
      enemyLayer.classList.toggle('boss-party', this.battleMode !== 'slime');
      const enemyHudRow = $('#enemy-hud-row'), enemyCount = Math.min(4, Math.max(1, this.enemies.length));
      enemyLayer.dataset.count = String(enemyCount);
      enemyHudRow.dataset.count = String(enemyCount);
      enemyHudRow.innerHTML = this.enemies.map((e, i) => {
        const statuses = '<div class="status-strip enemy-statuses" aria-hidden="true"></div>';
        const hpMeter = `<button type="button" class="enemy-hp-meter" aria-label="${e.name}のHPとステータスを確認" onclick="event.preventDefault();event.stopPropagation();window.arseneGame?.openEnemyStatus(${i})"><i style="width:100%"></i></button>`;
        const rareTag = e.kind === 'rare' ? '<em class="enemy-rare-tag">RARE</em>' : '';
        const name = e.kind === 'boss' ? `${e.name} // ${e.title}` : `${rareTag}${e.name} ${e.label}`;
        return `<div id="${e.uid}-hud" class="enemy-hud${e.kind === 'boss' ? ' boss-hud' : ''}"><span>${name}</span>${hpMeter}<small>???? / ????</small>${statuses}</div>`;
      }).join('');
      enemyLayer.innerHTML = this.enemies.map((e, i) => {
        const bossClass = e.id === 'seripes' ? ' seripes-boss' : e.id === 'versicrell' ? ` versicrell-boss form-${e.form || 1}` : '';
        const scale = Math.max(.65, Math.min(1.5, Number(e.battleScale) || 1));
        const art = e.sprite
          ? `<img class="${e.kind === 'boss' ? `noel-sprite monster-image boss-monster-image${e.spriteClass ? ` ${e.spriteClass}` : ''}` : 'slime monster-image'}" src="${e.sprite}" alt="" draggable="false">`
          : `<div class="${e.kind === 'boss' ? `noel-sprite${e.spriteClass ? ` ${e.spriteClass}` : ''}` : 'slime'}"></div>`;
        return `<div role="button" tabindex="0" class="enemy${e.kind === 'boss' ? ` boss-enemy${bossClass}` : ` enemy-${e.id} delay-${i}`} fighter idle" id="${e.uid}" data-enemy="${i}" style="--monster-scale:${scale}" aria-label="${e.name}を通常攻撃"><div class="enemy-visual"><div class="slime-shadow${e.kind === 'boss' ? ' boss-shadow' : ''}"></div>${art}</div></div>`;
      }).join('');
      this.enemies.forEach((e, i) => this.bindEnemyTap(e, i));
    }
    bindEnemyTap(enemy, index) {
      const el = document.getElementById(enemy.uid);
      if (!el || !enemy.alive) return;
      el.onclick = () => this.attackEnemyFromField(index);
      el.onkeydown = event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.attackEnemyFromField(index);
      };
    }
    attackEnemyFromField(index) {
      if (this.locked || this.finished || this.autoBattle || !this.enemies[index]?.alive) return;
      this.executeRound(this.basicAttackSkill().id, index);
    */
    renderEnemies() {
      this.noteEnemiesSeen();
      const enemyLayer = $('#enemies'), hasBoss = this.enemies.some(e => e.kind === 'boss');
      enemyLayer.classList.toggle('boss-party', this.battleMode !== 'slime');
      $('#game')?.classList.toggle('has-boss-enemy', hasBoss);
      enemyLayer.dataset.count = String(Math.min(3, Math.max(1, this.enemies.length)));
      enemyLayer.innerHTML = this.enemies.map((e, i) => {
        const statuses = '<button type="button" class="status-strip enemy-statuses" aria-label="敵の状態と解析情報"></button>';
        const bossClass = e.id === 'seripes' ? ' seripes-boss' : e.id === 'versicrell' ? ` versicrell-boss form-${e.form || 1}` : '';
        const displayName = String(e.name || '').trim(), accessibleName = `${displayName}${e.label || ''}`;
        const nameChars = [...displayName], nameLength = nameChars.length;
        const splitThreshold = e.kind === 'boss' ? 13 : 8;
        const splitName = nameLength >= splitThreshold;
        let nameLines = [displayName];
        if (splitName) {
          const midpoint = Math.ceil(nameLength / 2);
          let cut = -1;
          // 固有名は「・」、異名付きボスは閉じ括弧、日本語名は「の」を優先して自然に改行する。
          for (const marker of ['・', '》']) {
            const markerIndex = nameChars.indexOf(marker);
            if (markerIndex > 1 && markerIndex < nameLength - 2) { cut = markerIndex + 1; break; }
          }
          if (cut < 0) {
            const candidates = nameChars
              .map((character, index) => character === 'の' && index > 1 && index < nameLength - 2 ? index + 1 : -1)
              .filter(index => index > 0)
              .sort((a, b) => Math.abs(a - midpoint) - Math.abs(b - midpoint));
            cut = candidates[0] || midpoint;
          }
          nameLines = [nameChars.slice(0, cut).join(''), nameChars.slice(cut).join('')];
        }
        const longestLine = Math.max(...nameLines.map(line => [...line].length));
        const nameClass = [
          nameLength >= 7 ? 'medium-name' : '',
          nameLength >= 10 ? 'long-name' : '',
          splitName ? 'split-name' : '',
          longestLine >= 8 ? 'dense-name' : ''
        ].filter(Boolean).join(' ');
        const displayNameHtml = splitName ? `${nameLines[0]}<small>${nameLines[1]}</small>` : displayName;
        // Use a real image element for supplied enemy art.  Background sprites
        // were easy to hide behind the legacy slime styles, leaving some D3
        // enemies as an apparently empty silhouette.
        const artClass = e.kind === 'boss' ? `enemy-art-image boss-art${e.spriteClass ? ' ' + e.spriteClass : ''}` : `enemy-art-image${e.spriteClass ? ' ' + e.spriteClass : ''}`;
        // 主ボス素材は縦横比と余白量が異なるため、同じCSSサイズだけでは
        // キャラクター本体の見かけの大きさが揃わない。足元を基準に、主要4体を
        // 同じ「画面を占める強敵感」へ補正する（名札・HPの寸法には影響させない）。
        const bossArtScale = e.kind === 'boss' ? ({
          zenakado: 1.54,
          myrthi: 1.33,
          seripes: 1.28,
          astact: 1.34
        }[e.id] || Math.max(1, Math.min(1.5, Number(e.battleScale) || 1))) : 1;
        const visual = e.sprite
          ? `<div class="slime-shadow${e.kind === 'boss' ? ' boss-shadow' : ''}"></div><img class="${artClass}" src="${e.sprite}" alt="" aria-hidden="true" decoding="async">`
          : (e.kind === 'boss'
            ? `<div class="slime-shadow boss-shadow"></div><div class="noel-sprite${e.spriteClass ? ' ' + e.spriteClass : ''}"></div>`
            : `<div class="slime-shadow"></div><div class="slime"></div>`);
        return `<div role="button" tabindex="0" class="enemy ${e.kind === 'boss' ? `boss-enemy enemy-${e.id}${bossClass}` : `enemy-${e.id}`} fighter idle delay-${i}" id="${e.uid}" data-enemy="${i}" data-enemy-id="${e.id}" data-kind="${e.kind || 'normal'}" data-size="${e.kind === 'boss' ? 'boss' : e.kind === 'rare' ? 'large' : 'normal'}" style="--boss-art-scale:${bossArtScale}" aria-label="${accessibleName}を攻撃"><div class="enemy-nameplate"><b class="enemy-slot-label" aria-hidden="true">${String.fromCharCode(65 + i)}</b><span class="${nameClass}">${displayNameHtml}</span>${statuses}</div><div class="enemy-visual">${visual}</div><div class="enemy-hud${e.kind === 'boss' ? ' boss-hud' : ''}"><label>HP</label><div class="enemy-hp-meter"><i style="width:100%"></i></div><small>${e.hp.toLocaleString('ja-JP')} / ${e.stats.maxHp.toLocaleString('ja-JP')}</small></div></div>`;
      }).join('');
      this.enemies.forEach((enemy, index) => this.bindEnemyTap(enemy, index));
    }
    bindEnemyTap(enemy, index) {
      const el = document.getElementById(enemy.uid); if (!el || !enemy.alive) return;
      const plate = $('.enemy-nameplate', el);
      const attack = event => { event?.preventDefault(); this.attackEnemyFromField(index); };
      const inspect = event => { event?.preventDefault(); event?.stopPropagation(); this.openEnemyStatus(index); };
      el.onclick = attack;
      el.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') attack(event); };
      if (plate) {
        plate.setAttribute('role', 'button'); plate.setAttribute('tabindex', '0'); plate.setAttribute('aria-label', `${enemy.name}${enemy.label || ''}の状態を確認`);
        plate.onclick = inspect;
        plate.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') inspect(event); };
      }
    }
    attackEnemyFromField(index) {
      if (this.locked || this.finished || this.autoBattle || !this.enemies[index]?.alive) return;
      this.executeRound(this.basicAttackSkill().id, index);
    }
    chromaKeyImage(url, key = 'black') {
      this.battleSpriteChromaCache ||= new Map();
      const cacheKey = `${key}:${url}`;
      if (this.battleSpriteChromaCache.has(cacheKey)) return this.battleSpriteChromaCache.get(cacheKey);
      const task = new Promise(resolve => {
        const image = new Image();
        image.onload = () => {
          try {
            const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
            const frame = context.getImageData(0, 0, canvas.width, canvas.height), pixels = frame.data, width = canvas.width, height = canvas.height, total = width * height;
            const seen = new Uint8Array(total), queue = new Int32Array(total); let head = 0, tail = 0;
            const matches = index => {
              const i = index * 4, r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
              if (key === 'checkerLight') return Math.min(r, g, b) >= 225 && Math.max(r, g, b) - Math.min(r, g, b) <= 14;
              return key === 'white' ? Math.min(r, g, b) >= 238 : Math.max(r, g, b) <= 18;
            };
            const add = index => { if (index < 0 || index >= total || seen[index] || !matches(index)) return; seen[index] = 1; queue[tail++] = index; };
            for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
            for (let y = 1; y < height - 1; y++) { add(y * width); add(y * width + width - 1); }
            while (head < tail) { const index = queue[head++], x = index % width; pixels[index * 4 + 3] = 0; if (x) add(index - 1); if (x < width - 1) add(index + 1); add(index - width); add(index + width); }
            context.putImageData(frame, 0, 0);
            canvas.toBlob(blob => resolve(blob ? URL.createObjectURL(blob) : url), 'image/png');
          } catch { resolve(url); }
        };
        image.onerror = () => resolve(url); image.src = url;
      });
      this.battleSpriteChromaCache.set(cacheKey, task); return task;
    }
    applyEquipmentVisual() {
      const w = this.equippedWeapon(), layer = $('#weapon-layer'); layer.className = `weapon-layer weapon-${w.weaponType} sprite-${w.weaponSprite}`; layer.dataset.weaponId = w.id; layer.dataset.weaponType = w.weaponType; layer.title = w.name; const weaponName = $('#weapon-name'); if (weaponName) weaponName.textContent = `RIGHT HAND // ${w.name}`;
      if (w.battleSprite) layer.style.backgroundImage = `url("${w.battleSprite}")`; else layer.style.removeProperty('background-image');
      const character = this.selectedCharacterData(), sprites = character?.battleSpritesByWeaponType || {};
      const fallbackSprite = sprites.default || character?.battleSprite || character?.image || '';
      const spriteKey = w.battlePose || w.weaponSubtype || w.weaponType;
      // 通常キャラクターは武器を問わず固定立ち絵を使う。
      // 将来、キャラ側で明示した場合だけ武器別差し替えを再開できる。
      const spriteEntry = character?.useWeaponSpecificBattleSprites
        ? (sprites[spriteKey] || sprites[w.weaponType] || fallbackSprite)
        : fallbackSprite;
      const customSprite = this.profile?.customBattlePortrait;
      const spriteConfig = customSprite ? {
        src: customSprite,
        backgroundSize: 'contain',
        backgroundPosition: 'center bottom',
        left: '0',
        bottom: '0',
        width: '100%',
        height: '100%',
        blendMode: 'normal'
      } : (typeof spriteEntry === 'string' ? { src: spriteEntry } : (spriteEntry || {}));
      const characterSprite = spriteConfig.src || (typeof fallbackSprite === 'string' ? fallbackSprite : fallbackSprite?.src) || character?.battleSprite || character?.image || '';
      const absoluteSprite = characterSprite ? new URL(characterSprite, document.baseURI).href : '';
      const ren = $('#ren'), gameRoot = $('#game'), characterId = character?.id || 'ren', safeSprite = String(absoluteSprite).replace(/["\\]/g, '\\$&');
      if (gameRoot) gameRoot.dataset.characterId = characterId;
      if (ren) {
        ren.dataset.characterId = characterId;
        ren.dataset.weaponType = w.weaponType || 'unknown';
        ren.dataset.customPortrait = customSprite ? 'true' : 'false';
        ren.dataset.spriteSource = absoluteSprite;
        if (safeSprite) ren.style.setProperty('--battle-character-image', `url("${safeSprite}")`);
        else ren.style.removeProperty('--battle-character-image');
        const visualProps = {
          '--battle-character-size': spriteConfig.backgroundSize,
          '--battle-character-position': spriteConfig.backgroundPosition,
          '--battle-character-left': spriteConfig.left,
          '--battle-character-bottom': spriteConfig.bottom,
          '--battle-character-width': spriteConfig.width,
          '--battle-character-height': spriteConfig.height,
          '--battle-character-blend': spriteConfig.blendMode
        };
        Object.entries(visualProps).forEach(([name, value]) => value ? ren.style.setProperty(name, value) : ren.style.removeProperty(name));
        const attackFrames = character?.battleAttackFrames || {};
        const attackFrameProps = {
          '--battle-attack-ready': attackFrames.ready,
          '--battle-attack-lift': attackFrames.lift,
          '--battle-attack-release': attackFrames.release
        };
        Object.entries(attackFrameProps).forEach(([name, value]) => {
          if (value) {
            const absoluteFrame = new URL(value, document.baseURI).href;
            ren.style.setProperty(name, `url("${String(absoluteFrame).replace(/["\\]/g, '\\$&')}")`);
            const preload = new Image(); preload.src = absoluteFrame;
          } else ren.style.removeProperty(name);
        });
        ren.dataset.attackScope = attackFrames.scope || '';
        if (spriteConfig.chromaKey && absoluteSprite) this.chromaKeyImage(absoluteSprite, spriteConfig.chromaKey).then(prepared => {
          if (ren.dataset.spriteSource === absoluteSprite) ren.style.setProperty('--battle-character-image', `url("${String(prepared).replace(/["\\]/g, '\\$&')}")`);
        });
      }
    }
    applySetBattleVisual() { const ren = $('#ren'), active = this.equippedSeriesCount('zenacad') >= 6; ren.classList.toggle('zenacad-six-set', active); if (active) { ren.classList.add('set-intro'); setTimeout(() => ren.classList.remove('set-intro'), 1800); } }
    updateHUD() {
      const playerNameLabel = $('#player-name-label'); if (playerNameLabel) playerNameLabel.textContent = this.playerName();
      const battleGold = $('#battle-gold'); if (battleGold) { const amount = Math.max(0, this.profile.gold || 0), digits = String(amount).length; battleGold.textContent = amount.toLocaleString('ja-JP'); battleGold.dataset.amountSize = digits >= 9 ? 'tiny' : digits >= 7 ? 'compact' : 'normal'; }
      const p = this.player, expNeed = this.expNeeded(); $('#player-hp').textContent = `${p.hp} / ${p.stats.maxHp}`; $('#player-mp').textContent = `${p.mp} / ${p.stats.maxMp}`; $('#player-hp-bar').style.width = `${100 * p.hp / p.stats.maxHp}%`; $('#player-mp-bar').style.width = `${100 * p.mp / p.stats.maxMp}%`; const expBar = $('#player-exp-bar'), mType = this.equippedWeaponType(), m = this.masteryOf(mType), mNeed = this.masteryExpNeeded(m.level), expPct = Math.min(100, 100 * m.exp / mNeed); if (expBar) { expBar.style.width = `${expPct}%`; $('#player-exp-label').textContent = `${expPct.toFixed(2)}%`; } const mName = $('#player-exp-name'); if (mName) mName.textContent = `${this.weaponTypeName(mType)} Lv.${m.level}`; const jid = this.profile.currentJob, jst = this.profile.jobs?.[jid] || {}, jlv = jst.level || 1, jneed = this.jobExpNeeded(jlv), jexp = jst.exp || 0, jpct = jneed ? Math.min(100, 100 * jexp / jneed) : 100, jexpBar = $('#player-jexp-bar'), jexpName = $('#player-jexp-name'); if (jexpName) jexpName.textContent = `${D.jobs[jid]?.name || 'JOB'} Lv.${jlv}`; if (jexpBar) { jexpBar.style.width = `${jpct}%`; $('#player-jexp-label').textContent = jneed ? `${jpct.toFixed(2)}%` : 'MASTER'; } const jobLabel = $('#player-job-label'); if (jobLabel) jobLabel.textContent = `${D.jobs[jid]?.name || ''} Lv.${jlv}`; $('#turn-label').textContent = String(this.turn).padStart(2, '0');
      const rr = $('#resonance-row'), resonance = Math.min(D.guardianBalance?.resonanceMax || 100, this.player?.resonance || 0); if (rr) { rr.hidden = !this.resonanceEnabled(); rr.classList.toggle('max', resonance >= 100); $('#resonance-bar').style.width = `${resonance}%`; $('#resonance-label').textContent = resonance >= 100 ? 'MAX' : `${resonance.toFixed(1)}%`; }
      const checkpointLabel = $('#checkpoint-label'), checkpoint = this.battleMode === 'slime' ? this.checkpointState() : null; if (checkpointLabel) { checkpointLabel.hidden = !checkpoint; checkpointLabel.textContent = checkpoint ? `次のセーフゾーンまであと${checkpoint.remaining}戦` : ''; }
      this.renderBattleStatuses();
      /* Remote detached enemy HUD update (superseded by the per-enemy foot HUD).
      this.enemies.forEach(e => { const hud = document.getElementById(`${e.uid}-hud`), bar = hud?.querySelector('.enemy-hp-meter i'); if (bar) bar.style.width = `${100 * e.hp / e.stats.maxHp}%`; hud?.classList.toggle('defeated', !e.alive); });
      */
      this.enemies.forEach(e => { const el = document.getElementById(e.uid); if (el) { $('.enemy-hp-meter i', el).style.width = `${100 * e.hp / e.stats.maxHp}%`; const hp = $('.enemy-hud small', el); if (hp) hp.textContent = `${Math.max(0, e.hp).toLocaleString('ja-JP')} / ${e.stats.maxHp.toLocaleString('ja-JP')}`; } });
      const wave = $('#wave-label'); if (wave) wave.textContent = 'WAVE 1 / 1'; this.updateBattleAssistButtons();
    }
    statusEffectDescription(label, detail = '') {
      if (detail && detail !== label) return detail;
      const key = String(label).replace(/\s+\d+T$|\s+\d+$|\s+×\d+$/g, '');
      const descriptions = {
        'ATK↑': '次に行う物理攻撃の威力が上昇します。', 'ATK↓': '物理攻撃の威力が10%低下しています。', 'MAG↓': '魔法攻撃の威力が10%低下しています。', '魔力装填': '次の物理攻撃へ魔力依存の追加ダメージを加えます。',
        '防御': '行動を1回使い、このラウンドに受ける物理・魔法の最終ダメージを50%軽減します。',
        'DEF↑': '物理防御力が上昇しています。', 'FORTRESS': 'このターンに受けるダメージを軽減します。', 'DEF↓': '物理防御力が低下しています。',
        '再生': 'ターン開始時にHPを回復します。', '総奏': '魔奏士パッシブの発動率が上昇しています。', '2回行動': '一度のコマンドで続けてもう一手行動します。',
        'FORTE': '物理攻撃力が上昇しています。重なるほど効果が強くなります。', 'CRESC.': '魔法攻撃力が上昇しています。重なるほど効果が強くなります。',
        '足止め': '影を縫われ、表示回数ぶん行動できません。', '混乱': '一定確率で行動に失敗します。', 'MDEF↑': '魔法防御力が上昇しています。',
        '反奏': '次に受けた攻撃を記録し、同系統の反撃として返します。'
      };
      return descriptions[key] || `${label}の効果が発動中です。`;
    }
    statusChip(label, tone = 'buff', detail = '', expiring = false) { const esc = value => String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); const copy = this.statusEffectDescription(label, detail); return `<span class="status-chip ${tone}${expiring ? ' expiring' : ''}" data-status-name="${esc(label)}" data-status-detail="${esc(copy)}" data-status-expiring="${expiring ? 'true' : 'false'}">${label}</span>`; }
    playerBattleStatsHTML() {
      const s = this.player?.stats || {}, live = this.playerCombatStats(), b = this.player?.buffs || {}, wType = this.equippedWeaponType();
      const atkBase = Math.round(this.attackPowerFor(wType, s)), magical = this.weaponDamageType(wType) === 'magical';
      const songRate = typeof this.songBuffRate === 'function' ? this.songBuffRate(magical ? 'matkUp' : 'atkUp') : 0;
      const chargeRate = magical ? 0 : (b.atkCharge?.rate || 0), atkRate = songRate + chargeRate, atkNow = Math.round(atkBase * (1 + atkRate));
      const pDefBase = Math.round(this.defensePowerFor('physical', s)), mDefBase = Math.round(this.defensePowerFor('magical', s));
      let defRate = b.defUp && this.turn <= b.defUp.until ? (b.defUp.rate || 0) : 0; if (this.player.defDownUntil >= this.turn) defRate -= .20;
      const pDefNow = Math.max(0, Math.round(pDefBase * (1 + defRate)));
      const row = (name, base, now = base, suffix = '') => { const delta = now - base, changed = delta !== 0; return `<div class="battle-stat-row${changed ? delta > 0 ? ' up' : ' down' : ''}"><span>${name}</span><b>${changed ? `${base} → ${now}` : now}</b><em>${changed ? `${delta > 0 ? '+' : ''}${delta}${suffix}` : '－'}</em></div>`; };
      return `<section class="battle-stat-debug"><header><b>LIVE BATTLE STATUS</b><span>バフ込み実効値</span></header><div class="battle-vitals"><span>HP <b>${this.player.hp} / ${s.maxHp}</b></span><span>MP <b>${this.player.mp} / ${s.maxMp}</b></span></div><div class="battle-stat-grid">${row(`${this.weaponTypeName(wType)}攻撃性能`, atkBase, atkNow, atkRate ? ` / ${Math.round(atkRate * 100)}%` : '')}${row('物理防御', pDefBase, pDefNow, defRate ? ` / ${Math.round(defRate * 100)}%` : '')}${row('魔法防御', mDefBase)}${row('力 STR', s.str)}${row('魔力 MAG', s.mag, Math.round(this.effectivePlayerStat('mag')))}${row('体力 VIT', s.vit)}${row('精神 MND', s.mnd)}${row('素早さ AGI', s.agi, live.agi)}${row('器用さ DEX', s.dex)}${row('運 LUK', s.luk)}</div></section>`;
    }
    canInspectEnemyStats(enemy) { return !!enemy?.statsVisible || (this.profile.enemyStatInsights || []).includes(enemy?.id); }
    enemyBattleStatsHTML(enemy) { const visible = this.canInspectEnemyStats(enemy), value = key => visible ? (enemy?.stats?.[key] ?? '－') : '???', hp = visible ? `${enemy.hp} / ${enemy.stats.maxHp}` : '??? / ???'; return `<section class="battle-stat-debug enemy-analysis${visible ? ' revealed' : ' locked'}"><header><b>ENEMY ANALYSIS</b><span>${visible ? '解析完了' : 'ANALYSIS LOCKED'}</span></header><div class="battle-vitals"><span>HP <b>${hp}</b></span><span>属性 <b>${visible ? (enemy.element || '－') : '???'}</b></span></div><div class="battle-stat-grid"><div class="battle-stat-row"><span>攻撃 ATK</span><b>${value('atk')}</b><em>－</em></div><div class="battle-stat-row"><span>防御 DEF</span><b>${value('def')}</b><em>－</em></div><div class="battle-stat-row"><span>魔力 MAG</span><b>${value('mag')}</b><em>－</em></div><div class="battle-stat-row"><span>精神 MND</span><b>${value('mnd')}</b><em>－</em></div><div class="battle-stat-row"><span>速度 SPD</span><b>${value('spd')}</b><em>－</em></div><div class="battle-stat-row"><span>弱点</span><b>${visible ? ((enemy.weaknesses || []).join(' / ') || '－') : '???'}</b><em>－</em></div></div>${visible ? '' : '<p class="analysis-note">称号・解析スキルなどの獲得で開示される予定です。</p>'}</section>`; }
    openEnemyStatus(index) { const enemy = this.enemies[index], strip = enemy ? document.getElementById(enemy.uid)?.querySelector('.enemy-statuses') : null; if (enemy && strip) this.showStatusGroup(`${enemy.name}${enemy.label || ''}`, strip); }
    showStatusGroup(owner, strip) {
      const panel = $('#battle-status-detail'), list = $('#battle-status-copy'); if (!panel || !list) return;
      const chips = [...strip.querySelectorAll('.status-chip')], isPlayer = strip.id === 'player-statuses', enemy = !isPlayer ? this.enemies.find(e => e.uid === strip.dataset.enemyUid) : null;
      $('#battle-status-name').textContent = `${owner}の状態`;
      const effects = chips.length ? chips.map(chip => `<details class="status-detail-item${chip.dataset.statusExpiring === 'true' ? ' expiring' : ''}"><summary><span class="status-chip ${[...chip.classList].includes('debuff') ? 'debuff' : [...chip.classList].includes('passive') ? 'passive' : 'buff'}">${chip.dataset.statusName}</span><em></em></summary><p>${chip.dataset.statusDetail}</p></details>`).join('') : '<p class="status-detail-empty">現在、有効なバフ・デバフはありません。</p>';
      list.innerHTML = `${isPlayer ? this.playerBattleStatsHTML() : this.enemyBattleStatsHTML(enemy)}<section class="status-effect-section"><h4>ACTIVE EFFECTS</h4>${effects}</section>`;
      const close = panel.querySelector('.status-detail-close'); if (close) close.onclick = e => { e.preventDefault(); e.stopPropagation(); this.hideStatusDetail(); };
      panel.hidden = false; requestAnimationFrame(() => panel.classList.add('show'));
    }
    toggleStatusDetailItem(button) { const row = button.closest('.status-detail-item'), copy = row?.querySelector('p'), icon = button.querySelector('em'); if (!row || !copy) return; const open = row.classList.toggle('open'); copy.hidden = !open; if (icon) icon.textContent = open ? '−' : '＋'; }
    hideStatusDetail() { const panel = $('#battle-status-detail'); if (!panel || panel.hidden) return; panel.classList.remove('show'); setTimeout(() => { panel.hidden = true; }, 160); }
    renderBattleStatuses() {
      const playerStrip = $('#player-statuses');
      if (playerStrip) {
        const chips = this.activePassives().slice(0, 4).map(p => this.statusChip(p.name, 'passive', p.effectText));
        const b = this.player?.buffs || {};
        const combo = this.comboDanceStacks(), comboMax = this.comboDanceMax();
        if (combo > 0) {
          const maxed = combo >= comboMax, damage = Math.round(this.comboDanceDamageRate() * 100);
          chips.push(this.statusChip(`連舞 ${combo}/${comboMax}`, 'buff', `与ダメージ+${damage}%${maxed ? '、会心率+10%、《舞踏》装備中はAGI+20%・左手追撃倍率+10%' : ''}。MISSすると0へ戻ります。`));
        }
        if (b.atkCharge) chips.push(this.statusChip('ATK↑'));
        if (b.magicCharge) chips.push(this.statusChip('魔力装填'));
        if (b.defUp && this.turn <= b.defUp.until) chips.push(this.statusChip('DEF↑', 'buff', '', b.defUp.until - this.turn + 1 <= 1));
        if (b.guardUntil === this.turn) chips.push(this.statusChip('防御', 'buff', '', true));
        if (b.fortressUntil >= this.turn) chips.push(this.statusChip('FORTRESS', 'buff', '', b.fortressUntil - this.turn + 1 <= 1));
        if (this.player?.defDownUntil >= this.turn) chips.push(this.statusChip('DEF↓', 'debuff', '', this.player.defDownUntil - this.turn + 1 <= 1));
        if (b.versicrellAtkDown && this.turn <= b.versicrellAtkDown.until) chips.push(this.statusChip('ATK↓', 'debuff', '', b.versicrellAtkDown.until - this.turn + 1 <= 1));
        if (b.versicrellMagDown && this.turn <= b.versicrellMagDown.until) chips.push(this.statusChip('MAG↓', 'debuff', '', b.versicrellMagDown.until - this.turn + 1 <= 1));
        if (b.regenerate || b.nocturneUntil >= this.turn) { const remain = b.regenerate || (b.nocturneUntil - this.turn + 1), regenDetail = b.regenerate ? `ターン開始時に${Math.round((b.regenerateChance ?? 1) * 100)}%で最大HPの${Math.round((b.regenerateRate || .08) * 100)}%を回復します。` : ''; chips.push(this.statusChip(`再生 ${remain}T`, 'buff', regenDetail, remain <= 1)); }
        if (b.ensembleUntil >= this.turn) chips.push(this.statusChip('総奏', 'buff', '', b.ensembleUntil - this.turn + 1 <= 1));
        if (b.doubleActUntil >= this.turn) chips.push(this.statusChip('2回行動', 'buff', '', b.doubleActUntil - this.turn + 1 <= 1));
        const song = b.songBuffs || {}, liveStacks = key => (song[key] || []).filter(until => this.turn <= until).length;
        const songExpiring = key => { const live = (song[key] || []).filter(until => this.turn <= until); return live.length > 0 && Math.max(...live) - this.turn + 1 <= 1; };
        const forte = liveStacks('atkUp'), crescendo = liveStacks('matkUp');
        if (forte) chips.push(this.statusChip(`FORTE ×${forte}`, 'buff', '', songExpiring('atkUp')));
        if (crescendo) chips.push(this.statusChip(`CRESC. ×${crescendo}`, 'buff', '', songExpiring('matkUp')));
        playerStrip.innerHTML = chips.join(''); playerStrip.dataset.statusOwner = this.playerName(); playerStrip.tabIndex = 0; playerStrip.setAttribute('role', 'button'); playerStrip.title = 'タップでステータスと状態を確認'; playerStrip.onclick = e => { e.preventDefault(); e.stopPropagation(); this.showStatusGroup(this.playerName(), playerStrip); };
      }
      this.enemies.forEach(e => {
        const strip = document.getElementById(e.uid)?.querySelector('.enemy-statuses'); if (!strip) return;
        const chips = [];
        if ((e.bindTurns || 0) > 0) chips.push(this.statusChip(`足止め ${e.bindTurns}`, 'debuff', '', e.bindTurns <= 1));
        if (this.turn <= (e.confuseUntil || 0)) chips.push(this.statusChip('混乱', 'debuff', '', e.confuseUntil - this.turn + 1 <= 1));
        if (this.turn <= (e.defDownUntil || 0)) chips.push(this.statusChip('DEF↓', 'debuff', '', e.defDownUntil - this.turn + 1 <= 1));
        if (this.turn <= (e.defBuffUntil || 0)) chips.push(this.statusChip('DEF↑', 'buff', '', e.defBuffUntil - this.turn + 1 <= 1));
        if (this.turn <= (e.mdefBuffUntil || 0)) chips.push(this.statusChip('MDEF↑', 'buff', '', e.mdefBuffUntil - this.turn + 1 <= 1));
        if (this.turn <= (e.regenUntil || 0)) chips.push(this.statusChip('再生', 'buff', '', e.regenUntil - this.turn + 1 <= 1));
        if (e.repriseStance) chips.push(this.statusChip('反奏'));
        strip.innerHTML = chips.join(''); strip.dataset.statusOwner = `${e.name}${e.label || ''}`; strip.dataset.enemyUid = e.uid; strip.tabIndex = 0; strip.setAttribute('role', 'button'); strip.title = 'タップで敵の状態と解析情報を確認'; strip.onclick = event => { event.preventDefault(); event.stopPropagation(); this.showStatusGroup(strip.dataset.statusOwner, strip); };
      });
    }
    resetBattleLog() { this.clearQuickResultPopup(); this.battleLogHistory = []; this.battleEvents = []; this.battleLogExpanded = false; this.lastBattleAction = null; $('#log')?.classList.remove('expanded'); }
    setLog(text) { if (!text) return; this.battleLogHistory ||= []; this.battleLogHistory.push(text); if (this.battleLogHistory.length > 100) this.battleLogHistory.shift(); this.renderBattleLog(); }
    renderBattleLog() { const log = $('#log'); if (!log) return; const rows = this.battleLogExpanded ? this.battleLogHistory : this.battleLogHistory.slice(-5); log.innerHTML = `<small>COMBAT LOG // ${this.battleLogExpanded ? 'TAP TO CLOSE' : 'TAP FOR HISTORY'}</small><div class="battle-log-lines">${rows.map(t => `<p>${t}</p>`).join('')}</div>`; log.scrollTop = this.battleLogExpanded ? log.scrollHeight : 0; }
    toggleBattleLog() { this.battleLogExpanded = !this.battleLogExpanded; $('#log')?.classList.toggle('expanded', this.battleLogExpanded); this.renderBattleLog(); }
    clearQuickResultPopup() { $('#quick-result-popup')?.remove(); }
    showQuickResultPopup() {
      const report = this.battleRewards?.quickReport, field = $('#battlefield'); if (!report || !field) return;
      this.clearQuickResultPopup(); const popup = document.createElement('div'); popup.id = 'quick-result-popup'; popup.className = 'quick-result-popup';
      popup.innerHTML = `${report}<button type="button" aria-label="クイックバトルログを閉じる">閉じる <span>CLOSE</span></button>`;
      popup.querySelector('button').addEventListener('click', () => this.clearQuickResultPopup()); field.appendChild(popup);
    }
    flashTitle(main, sub = '') { const a = $('#announcer'); a.innerHTML = `<strong>${main}</strong><span>${sub}</span>`; a.classList.remove('show'); void a.offsetWidth; a.classList.add('show'); }
    autoBattleSpeedSteps() {
      const configured = Array.isArray(D.settings.autoBattleSpeedSteps) ? D.settings.autoBattleSpeedSteps : [D.settings.autoBattleSpeed || 1.5];
      // ×1.5は標準、×2はQオファー、×3は裏ショップの買い切り解放。
      const premiumAuto3 = !!this.profile?.premium?.auto3License;
      const offerMax = premiumAuto3 ? 3 : window.arseneQOffer?.isActive?.('auto2') ? 2 : 1.5;
      const candidates = premiumAuto3 ? [...configured, 3] : configured;
      const steps = [...new Set(candidates.map(Number))].filter(speed => Number.isFinite(speed) && speed >= 1 && speed <= offerMax).sort((a, b) => a - b);
      return steps.length ? steps : [1.5];
    }
    autoBattleSpeedMultiplier() {
      const steps = this.autoBattleSpeedSteps(), index = clamp(Number(this.autoBattleSpeedIndex) || 0, 0, steps.length - 1);
      return steps[index];
    }
    battleSleep(ms) { const speed = this.simpleBattle ? 2.5 : this.autoBattle ? this.autoBattleSpeedMultiplier() : 1; return sleep(Math.max(40, Math.floor(ms / speed))); }
    updateBattleAssistButtons() {
      const simple = $('[data-action="simpleBattle"]'), auto = $('[data-action="autoBattle"]'), indicator = $('#auto-speed-indicator');
      if (simple) { simple.classList.toggle('active', this.simpleBattle); simple.setAttribute('aria-pressed', String(this.simpleBattle)); }
      if (auto) { auto.classList.toggle('active', this.autoBattle); auto.setAttribute('aria-pressed', String(this.autoBattle)); }
      if (indicator) {
        const speed = this.autoBattleSpeedMultiplier();
        indicator.classList.toggle('active', this.autoBattle);
        indicator.querySelector('strong').textContent = `×${Number.isInteger(speed) ? speed : speed.toFixed(1)}`;
        indicator.setAttribute('aria-label', `オート戦闘速度 ${speed}倍`);
      }
    }
    keepAutoControlVisible() {
      if (!this.autoBattle) { this.panel(''); return; }
      this.showMainCommands();
      $('#command-panel')?.classList.add('turn-locked');
    }
    closeBattleMenu() {
      const pop = $('#battle-menu-popover'), button = $('#battle-menu-button');
      if (pop) pop.hidden = true;
      button?.setAttribute('aria-expanded', 'false');
    }
    renderBattleMenu() {
      const pop = $('#battle-menu-popover'); if (!pop) return;
      const volumes = this.audio.getVolumes(), labels = { bgm: 'BGM', sfx: 'SE', voice: 'VOICE' };
      const rows = ['bgm', 'sfx', 'voice'].map(channel => {
        const value = volumes[channel], on = value > 0;
        return `<div class="battle-audio-row"><span>${labels[channel]}</span><input type="range" min="0" max="100" value="${value}" data-battle-volume="${channel}" aria-label="${labels[channel]}音量"><output data-battle-volume-value="${channel}">${value}%</output><button type="button" class="${on ? '' : 'off'}" data-battle-audio-toggle="${channel}" aria-pressed="${on}">${on ? 'ON' : 'OFF'}</button></div>`;
      }).join('');
      const testReturn = D.settings.battleMenuTestReturn ? '<button type="button" class="test-return" data-go-menu>拠点へ戻る<small>TEST ONLY</small></button>' : '';
      const support = window.arseneQOffer?.battleHTML?.() || '';
      pop.innerHTML = `<div class="battle-menu-header"><small>BATTLE MENU</small><button type="button" data-battle-menu-close aria-label="設定を閉じる">×</button></div>${support}${rows}<div class="battle-menu-actions"><button type="button" data-battle-menu-close>戦闘へ戻る</button>${testReturn}</div>`;
    }
    panel(html, layout = 'sub') {
      const panel = $('#command-panel'), drawer = $('#command-drawer');
      if (layout === 'list' && drawer) {
        const gameRect = $('#game').getBoundingClientRect(), cardRect = $('.player-card').getBoundingClientRect();
        drawer.hidden = false;
        drawer.style.top = `${Math.max(78, Math.round(cardRect.top - gameRect.top))}px`;
        drawer.dataset.layout = 'list';
        drawer.innerHTML = html;
        drawer.dataset.count = String(drawer.children.length);
        panel.inert = true;
        panel.classList.add('drawer-open');
        this.commandActionRoot = drawer;
        this.prepareCommandIconImages(drawer);
        return;
      }
      if (drawer) { drawer.hidden = true; drawer.innerHTML = ''; drawer.style.removeProperty('top'); }
      panel.inert = false;
      panel.classList.remove('drawer-open');
      panel.dataset.layout = layout;
      panel.innerHTML = html;
      panel.dataset.count = String(panel.children.length);
      this.commandActionRoot = panel;
      this.prepareCommandIconImages(panel);
    }
    commandIconSvg(iconKey) {
      const icons = {
        attack: '<path d="M10 38 34 14l4-4 2 2-4 4-24 24H8v-4Z"/><path d="m29 13 6 6M8 31l-4 4m5-11-6 2m14-11-3-7"/><path class="icon-fill" d="m35 7 6 6-5 5-6-6Z"/>',
        'weapon-sword': '<path d="m8 9 13 13M5 6l6 1-5 5-1-6Zm15 15-5 10m-3 1 7 4"/><path d="m40 8-14 14m17-17-2 8-6-6 8-2ZM27 21l7 10m3 1-7 5"/><circle class="icon-fill" cx="24" cy="23" r="2.5"/>',
        'weapon-staff': '<path d="M19 42 30 15M27 18l7 3 4-6-3-7-7-1-5 5 4 6Z"/><path d="M28 8c-7 1-11 5-10 11m16-1c4 5 3 10-2 14"/><path class="icon-fill" d="m31 10 3 3-2 4-4-1-1-4Z"/><circle cx="16" cy="23" r="3"/><path d="m12 37 8 3"/>',
        'weapon-martial': '<path d="M8 24v-7c0-2 3-2 3 0v5-8c0-3 4-3 4 0v7-9c0-3 4-3 4 0v9-7c0-3 4-3 4 0v9l4-5c2-3 6 0 4 3l-8 13c-2 3-5 5-9 4-5-1-8-6-6-14Z"/><path d="M27 34c4 1 8-1 11-4M30 28l9-1M28 40l6 3"/><path class="icon-fill" d="M10 25h15l-2 9c-2 4-9 5-12 1Z"/>',
        'weapon-instrument': '<path d="M29 8v24c0 5-8 7-11 3-3-4 2-8 8-7V13l14-3v18c0 5-8 7-11 3-3-4 2-8 8-7V7Z"/><path d="M7 14c5-4 9-4 14 0M6 22c5-3 9-3 14 0"/><circle class="icon-fill" cx="13" cy="18" r="2"/>',
        'weapon-shield': '<path d="m24 5 15 6v11c0 10-6 17-15 21C15 39 9 32 9 22V11Z"/><path d="m24 12 8 4v7c0 5-3 9-8 12-5-3-8-7-8-12v-7Z"/><path class="icon-fill" d="m24 16 5 7-5 7-5-7Z"/><path d="M5 17h4M39 17h4M6 30l4-2m32 2-4-2"/>',
        'weapon-bow': '<path d="M12 5c13 9 13 29 0 38M12 5c8 8 8 30 0 38M5 24h35m-7-6 7 6-7 6"/><circle class="icon-fill" cx="12" cy="24" r="2"/>',
        'weapon-spear': '<path d="M8 40 34 14M29 9l13-5-5 13-8-8Z"/><path d="m12 32 4 4M7 27l9-9M18 41l9-9"/><path class="icon-fill" d="m35 8 3-1-1 3Z"/>',
        'weapon-greatsword': '<path d="m11 39 5-8L33 7l8-3-3 9-17 23-8 5Z"/><path d="m11 28 10 8m-13-3 8 7"/><path class="icon-fill" d="m32 9 5-2-2 5-16 21-3-3Z"/>',
        'weapon-dagger': '<path d="M7 38 20 25m-9 5 7 7M20 25l4-12 4 4-8 8Zm34 13L28 25m9 5-7 7M28 25l-4-12-4 4 8 8Z"/><circle class="icon-fill" cx="24" cy="25" r="2"/>',
        'weapon-gun': '<path d="M6 17h25l9 7-8 5h-8l-3 12h-8l2-13H6Z"/><path d="M13 17V9h13l5 8M9 22h17"/><path class="icon-fill" d="m34 20 9-5-5 8 6 2-9 2Z"/>',
        'weapon-generic': '<path d="M8 38 36 10m4-4-1 8-5-5 6-3ZM40 38 12 10M8 6l1 8 5-5-6-3Z"/><path class="icon-fill" d="m24 18 6 6-6 6-6-6Z"/>',
        skill: '<path d="M24 4c2 10 6 14 16 16-10 2-14 6-16 16-2-10-6-14-16-16 10-2 14-6 16-16Z"/><path d="M8 8c9 5 23 5 32 0M7 34c11 7 23 7 34 0"/><circle class="icon-fill" cx="24" cy="20" r="4"/>',
        guard: '<path d="m24 4 16 6v12c0 11-6 18-16 22C14 40 8 33 8 22V10Z"/><path d="m24 11 9 4v8c0 6-3 10-9 13-6-3-9-7-9-13v-8Z"/><path d="m18 24 5 5 8-11"/><path class="icon-fill" d="m24 8 3 2-3 2-3-2Z"/>',
        item: '<path d="M18 6h12M20 6v9l-9 18c-2 5 1 9 7 9h12c6 0 9-4 7-9l-9-18V6"/><path d="M14 29h20M17 34c5-4 10 4 16-1"/><circle class="icon-fill" cx="22" cy="25" r="2"/><circle cx="28" cy="20" r="1.5"/>',
        escape: '<circle cx="30" cy="9" r="4"/><path d="m25 16-7 9 7 5 5 11m-5-25 8 6 7-1M18 25l-7 8m-6-19h13M3 21h12M6 29h7"/><path class="icon-fill" d="m25 17 6 4-5 7-6-4Z"/>'
        ,simple: '<path d="M5 12h17v24H5Z"/><path d="m26 10 15 14-15 14V10Z"/><path d="m10 18 7 6-7 6m17-9 5 3-5 3"/><path class="icon-fill" d="m29 16 9 8-9 8Z"/>'
        ,auto: '<path d="M39 18A16 16 0 0 0 10 14"/><path d="m10 8-1 8 8-1M9 30a16 16 0 0 0 29 4"/><path d="m38 40 1-8-8 1"/><path class="icon-fill" d="m24 14 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>'
      };
      const body = icons[iconKey] || (iconKey?.startsWith('weapon-') ? icons['weapon-generic'] : '');
      return body ? `<svg viewBox="0 0 48 48" focusable="false" aria-hidden="true"><g>${body}</g></svg>` : '';
    }
    commandIconMarkup(iconKey) {
      const visual = D.commandVisuals?.icons?.[iconKey], sheet = D.commandVisuals?.iconSheet;
      if (visual?.src) {
        const url = new URL(visual.src, document.baseURI).href.replace(/["\\]/g, '\\$&');
        return `<i class="command-icon-image" data-icon="${iconKey}" data-icon-src="${url}"${visual.chromaKey ? ` data-chroma-key="${visual.chromaKey}"` : ''} style="--command-icon-image:url(&quot;${url}&quot;)"></i>`;
      }
      if (visual && sheet) {
        const url = new URL(sheet, document.baseURI).href.replace(/["\\]/g, '\\$&');
        const layout = D.commandVisuals?.sheetLayout || {}, columns = Math.max(1, Number(layout.columns) || 3), rows = Math.max(1, Number(layout.rows) || 2), tile = Math.max(24, Number(layout.displayTile) || 40), cropHeight = Math.max(18, Math.min(tile, Number(layout.cropHeight) || 27));
        const column = Math.max(0, Math.min(columns - 1, Number(visual.column) || 0)), row = Math.max(0, Math.min(rows - 1, Number(visual.row) || 0));
        const x = `${-(column * tile)}px`, y = `${-(row * tile)}px`;
        return `<i class="command-icon-art" data-icon="${iconKey}" style="--command-icon-image:url(&quot;${url}&quot;);--command-icon-x:${x};--command-icon-y:${y};--command-icon-width:${tile}px;--command-icon-height:${cropHeight}px;--command-icon-sheet-width:${tile * columns}px;--command-icon-sheet-height:${tile * rows}px"></i>`;
      }
      const svg = this.commandIconSvg(iconKey);
      return `<i${svg ? ` class="command-icon-svg" data-icon="${iconKey}"` : ''}>${svg}</i>`;
    }
    prepareCommandIconImages(root) {
      root?.querySelectorAll('.command-icon-image[data-chroma-key]').forEach(icon => {
        const source = icon.dataset.iconSrc, key = icon.dataset.chromaKey; if (!source || !key) return;
        this.chromaKeyImage(source, key).then(prepared => { if (icon.isConnected && icon.dataset.iconSrc === source) icon.style.setProperty('--command-icon-image', `url("${String(prepared).replace(/["\\]/g, '\\$&')}")`); });
      });
    }
    button(label, sub, action, disabled = false, iconKey = '', detail = '') {
      const copy = `${label} ${sub}`;
      const tone = action === 'attack' || /^target\d+$/.test(action) ? 'attack'
        : action === 'weaponArts' ? 'weapon'
          : action === 'guard' || /防御|守護|GUARD|FORTRESS/i.test(copy) ? 'guard'
            : ['skills', 'mainCmd', 'personal', 'resonance'].includes(action) || D.skills?.[action] ? 'skill'
              : action === 'item' || D.items?.[action] ? 'item'
                : action === 'simpleBattle' ? 'simple' : action === 'autoBattle' ? 'auto' : 'neutral';
      const toneVisual = D.commandVisuals?.tones?.[tone] || {};
      const weaponType = iconKey?.startsWith('weapon-') ? iconKey.slice(7) : '';
      const useDynamicWeaponCards = !!D.commandVisuals?.useDynamicWeaponCards;
      const weaponCard = useDynamicWeaponCards && weaponType && D.commandVisuals?.weaponCards?.[weaponType];
      const weaponCardPresentation = useDynamicWeaponCards && weaponType && D.commandVisuals?.weaponCardPresentation?.[weaponType];
      const weaponCardUrl = weaponCard ? new URL(weaponCard, document.baseURI).href.replace(/["\\]/g, '\\$&') : '';
      const toneStyle = [
        toneVisual.border && `--command-tone-border:${toneVisual.border}`,
        toneVisual.glow && `--command-tone-glow:${toneVisual.glow}`,
        toneVisual.background && `--command-tone-bg:${toneVisual.background}`,
        toneVisual.iconFilter && `--command-icon-filter:${toneVisual.iconFilter}`,
        weaponCardUrl && `--weapon-card-image:url(&quot;${weaponCardUrl}&quot;)`,
        weaponCardPresentation?.size && `--weapon-card-size:${weaponCardPresentation.size}`,
        weaponCardPresentation?.position && `--weapon-card-position:${weaponCardPresentation.position}`
      ].filter(Boolean).join(';');
      return `<button data-action="${action}" data-tone="${tone}"${toneStyle ? ` style="${toneStyle}"` : ''} ${disabled ? 'disabled' : ''}>${this.commandIconMarkup(iconKey)}<strong>${label}</strong><span>${sub}</span>${detail ? `<em>${detail}</em>` : ''}</button>`;
    }
    skillListDetail(skill) {
      const parts = [skill?.powerText, skill?.effectText].filter(Boolean);
      return parts.join(' ／ ') || skill?.description || '効果詳細なし';
    }
    bindActions(actions) {
      const root = this.commandActionRoot || $('#command-panel');
      root.onclick = async e => {
        const b = e.target.closest('[data-action]');
        // AUTOだけは敵演出・ダメージ表示中でも停止できる。次の自動行動を予約しないため、
        // ピンチ時にOFFを押しても追加の一手が走らない。
        const canInterrupt = b?.dataset.action === 'autoBattle';
        if (b && !b.disabled && (!this.locked || canInterrupt)) { await this.audio.unlock(); this.audio.sfx('ui'); actions[b.dataset.action]?.(); }
      };
    }
    cancelAutoPick() {
      if (this.autoPickTimer) clearTimeout(this.autoPickTimer);
      this.autoPickTimer = null;
    }
    pauseAutoBattle() {
      // 戦闘結果中は自動入力だけ止め、倍率設定は次の戦闘へ持ち越す。
      this.autoToggleBusy = false;
      this.cancelAutoPick();
      $('#command-panel')?.classList.remove('turn-locked');
    }
    endAutoBattle() {
      // 敗北・拠点帰還など、連戦を終了する時だけAUTO設定も解除する。
      this.autoBattle = false;
      this.autoBattleSpeedIndex = -1;
      this.pauseAutoBattle();
    }
    scheduleAutoPick() {
      this.cancelAutoPick();
      if (!this.autoBattle || this.locked || this.finished) return;
      this.autoPickTimer = setTimeout(() => {
        this.autoPickTimer = null;
        this.autoPickAction();
      }, Math.max(180, Math.round(700 / this.autoBattleSpeedMultiplier())));
    }
    toggleAutoBattle() {
      // OFF → 設定された倍率を順番に進む → OFF。将来は設定配列へ3を足すだけで×3を追加できる。
      // 演出中でも切替できるが、連打で複数の予約タイマーが走らないよう短時間だけ受け付けを絞る。
      if (this.autoToggleBusy || this.finished) return;
      this.autoToggleBusy = true;
      const steps = this.autoBattleSpeedSteps();
      if (!this.autoBattle) {
        this.autoBattle = true;
        this.autoBattleSpeedIndex = 0;
      } else if (this.autoBattleSpeedIndex < steps.length - 1) {
        this.autoBattleSpeedIndex += 1;
      } else {
        this.autoBattle = false;
        this.autoBattleSpeedIndex = -1;
      }
      this.cancelAutoPick();
      this.showMainCommands();
      setTimeout(() => { this.autoToggleBusy = false; }, 180);
    }
    showMainCommands() {
      $('#phase-label').textContent = this.autoBattle ? 'AUTO' : 'TURN';
      const basic = this.basicAttackSkill(), wType = this.equippedWeaponType();
      const artsCmd = (D.weaponArtsCommand || {})[wType] || { name: '武器技', nameEn: 'WEAPON ARTS' };
      const arts = this.learnedWeaponSkills().filter(s => s.weaponType === wType && this.weaponSkillMatchesEquipped(s));
      /* Remote pre-redesign command layout (superseded by the 4x2 mobile command grid).
      let html = `<div class="battle-quick-controls"><button class="quick-battle-btn" data-action="quick"><i></i><strong>簡易戦闘</strong><span>QUICK</span></button><button class="auto-battle-btn${this.autoBattle ? ' active' : ''}" data-action="auto-toggle"><i></i><strong>AUTO ×1.5</strong><span>${this.autoBattle ? 'ON' : 'OFF'}</span></button></div>`;
      html += this.button(basic.name, basic.nameEn || 'ATTACK', 'attack');
      if (arts.length) html += this.button(artsCmd.name, `${artsCmd.nameEn} ▶`, 'weaponArts');
      // 条件待ちの専用技しか無い場合もボタンは出す（中で条件を見せるため）
      if (personal.length || this.conditionalSkillsForJob().length) html += this.button('固有技', 'PERSONAL ▶', 'personal');
      if (this.resonanceEnabled()) { const r = this.player?.resonance || 0; html += this.button('RESONANCE BREAK', r >= 100 ? 'MAX // NEUTRAL' : `${r.toFixed(1)}% // NEUTRAL`, 'resonance', r <= 0); }
      // ジョブ習得スキルが残っている場合のみジョブコマンドを出す（武器技とは別枠）
      const jobSkills = this.jobLearnedActiveSkills(curJobId).filter(s => s.id !== D.jobs[curJobId]?.signatureSkillId);
      if (jobSkills.length) html += this.button(mainCmd.cmd, `${mainCmd.cmdEn} ▶`, 'mainCmd');
      html += this.button('アイテム', `ITEM ×${itemCount}`, 'item') + this.button('にげる', 'ESCAPE', 'escape');
      this.panel(html);
      this.bindActions({ attack: () => this.chooseTarget(basic.id), weaponArts: () => this.showWeaponArts(), personal: () => this.showPersonalSkills(), resonance: () => this.chooseTarget('resonanceBreak'), mainCmd: () => this.showCommandSkills(curJobId), item: () => this.showBattleItems(), escape: () => this.tryEscape(), quick: () => this.quickResolveBattle(), 'auto-toggle': () => { this.autoBattle = !this.autoBattle; this.showMainCommands(); } });
      */
      const skills = this.combatSkillList();
      const html = this.button('たたかう', `${basic.name} // ATTACK`, 'attack', false, 'attack')
        + this.button(artsCmd.name, arts.length ? `${artsCmd.nameEn} ▶` : '未習得', 'weaponArts', !arts.length, `weapon-${wType}`)
        + this.button('スキル', skills.length ? 'SKILL ▶' : '未習得', 'skills', !skills.length, 'skill')
        + this.button('防御', 'GUARD // 50%', 'guard', false, 'guard')
        + this.button('アイテム', 'ITEM', 'item', false, 'item')
        + this.button('再行動', 'REPEAT', 'repeat', false, 'repeat')
        + this.button('一掃', !this.isQuickBattleModeEligible() ? 'BOSS不可' : this.hasQuickBattleStrongEnemy() ? '強敵不可' : window.arseneQOffer?.isActive?.('sweep') ? 'SWEEP' : 'LOCKED', 'quick', !this.canQuickResolveBattle() || !window.arseneQOffer?.isActive?.('sweep'), 'simple')
        + this.button('AUTO', this.autoBattle ? `AUTO // ×${this.autoBattleSpeedMultiplier()}` : 'AUTO // OFF', 'autoBattle', false, 'auto');
      this.panel(html, 'main');
      // AUTOを演出中にOFFへ切り替えた場合、旧パネルのturn-lockedがDOMに残ることがある。
      // 現在の戦闘ロック状態と必ず同期し、ターン終了後に通常コマンドを再び操作可能にする。
      $('#command-panel')?.classList.toggle('turn-locked', !!this.locked);
      this.bindActions({ attack: () => this.chooseTarget(basic.id), weaponArts: () => this.showWeaponArts(), skills: () => this.showCombinedSkills(), guard: () => this.guardAction(), item: () => this.showBattleItems(), repeat: () => this.repeatLastBattleAction(), quick: () => this.quickResolveBattle(), autoBattle: () => this.toggleAutoBattle() }); this.updateBattleAssistButtons();
      this.scheduleAutoPick();
    }
    autoPickAction() { if (!this.autoBattle || this.locked || this.finished) return; const basic = this.basicAttackSkill(); const maxHp = this.player.stats.maxHp, maxMp = this.player.stats.maxMp, hpPct = this.player.hp / maxHp; if (hpPct < 0.4 && (this.profile.inventory.potion || 0) > 0) { this.useConsumable('potion'); return; } if (this.player.mp < maxMp * 0.2 && (this.profile.inventory.manaPotion || 0) > 0) { this.useConsumable('manaPotion'); return; } const aliveEnemies = this.enemies.filter(e => e.alive); const skills = this.availableSkills().filter(s => this.canPaySkillCosts(s) && this.cooldownRemaining(s) === 0); const weapon = this.equippedWeapon(); const atkScore = weapon?.power || 1; let best = { type: 'attack', score: atkScore }; for (const s of skills) { let score = 0; if (s.kind === 'support') { if (s.effect?.type === 'hpRecover') score = hpPct < 0.75 ? (1 - hpPct) * 200 : 0; else if (s.effect?.type === 'mpRecover') score = this.player.mp < maxMp * 0.5 ? 45 : 0; else if (s.effect?.type === 'regenerate') score = hpPct < 0.8 && !(this.player.buffs.regenerate > 0) ? 38 : 0; else if (s.effect?.type === 'hpToMp') score = this.player.mp < maxMp * .45 && hpPct > .55 ? 48 : 0; } else if (s.kind === 'hybrid') { score = (s.strScale + s.magScale) * 12; } else { const multi = s.target === 'all' ? Math.min(aliveEnemies.length, 3) * 0.7 : 1; score = (s.power || 1) * (s.hits || 1) * multi; } if (score > best.score) best = { type: 'skill', skill: s, score }; } if (best.type === 'skill') { const s = best.skill; if (s.target === 'all' || s.target === 'self') { this.executeRound(s.id, -1); } else { this.executeRound(s.id, this.enemies.findIndex(e => e.alive)); } } else { this.executeRound('attack', this.enemies.findIndex(e => e.alive)); } }
    isQuickBattleModeEligible() { return this.battleMode === 'slime'; }
    hasQuickBattleStrongEnemy() {
      return this.enemies.some(enemy => enemy.alive && (['boss', 'elite', 'rare'].includes(enemy.kind) || enemy.cannotDefeat || enemy.infiniteHp));
    }
    canQuickResolveBattle() { return this.isQuickBattleModeEligible() && !this.hasQuickBattleStrongEnemy(); }
    async quickResolveBattle() {
      if (this.locked || this.finished) return;
      if (!this.isQuickBattleModeEligible()) { window.arseneStartFlow?.toast?.('一掃は通常ダンジョンの通常戦闘専用です'); return; }
      if (this.hasQuickBattleStrongEnemy()) { window.arseneStartFlow?.toast?.('エリート・レア・ボスは一掃できません'); return; }
      if (!window.arseneQOffer?.isActive?.('sweep')) { window.arseneStartFlow?.toast?.('戦闘MENUから「一掃」を解放できます'); return; }
      this.locked = true; this.quickResolving = true; this.autoBattle = false; this.autoBattleSpeedIndex = -1; this.cancelAutoPick(); this.panel(''); $('#phase-label').textContent = 'QUICK';
      const enemies = this.enemies.filter(enemy => enemy.alive), stats = this.playerCombatStats(), pDef = this.defensePowerFor('physical', stats), mDef = this.defensePowerFor('magical', stats);
      const basic = this.basicAttackSkill(), learned = [basic, ...this.availableSkills()].filter((skill, index, list) => skill && list.findIndex(s => s.id === skill.id) === index);
      const offensive = learned.filter(skill => skill.kind !== 'support'), attackValue = skill => {
        const magical = skill.damageType === 'magical' || skill.kind === 'magical', base = magical ? this.attackPowerFor(this.equippedWeaponType(), stats) : this.attackPowerFor(this.equippedWeaponType(), stats);
        const hits = Math.max(1, skill.hits || 1), power = Math.max(.65, skill.power || (skill.kind === 'hybrid' ? (skill.strScale || 0) + (skill.magScale || 0) : 1));
        const targets = skill.target === 'all' ? Math.min(2.2, 1 + Math.max(0, enemies.length - 1) * .55) : 1;
        return Math.max(1, base * power * hits * targets);
      };
      // 簡易戦闘は手動操作より弱い。商品説明にも表示する共通効率78%で技・対象選択のロスを表す。
      const quickEfficiency = .78, best = offensive.sort((a, b) => attackValue(b) - attackValue(a))[0] || basic, bestPower = attackValue(best) * quickEfficiency, basicPower = attackValue(basic) * quickEfficiency;
      const usableMpTurns = best.mp > 0 ? Math.floor(this.player.mp / this.skillMpCost(best)) : 99;
      const enemyDurability = enemies.reduce((sum, enemy) => sum + enemy.hp * (1 + ((enemy.stats.def || 0) + (enemy.stats.mnd || 0)) / 180), 0);
      const initialTurns = Math.max(1, Math.ceil(enemyDurability / Math.max(1, bestPower))), skillTurns = Math.min(initialTurns, usableMpTurns), remainingDurability = Math.max(0, enemyDurability - bestPower * skillTurns);
      const turns = Math.max(1, skillTurns + Math.ceil(remainingDurability / Math.max(1, basicPower)));
      const incomingPerTurn = enemies.reduce((sum, enemy) => { const physical = Math.max(1, (enemy.stats.atk || 0) - pDef * .58), magical = Math.max(1, (enemy.stats.mag || 0) - mDef * .58); return sum + Math.max(physical, magical); }, 0);
      const hasHeal = learned.some(skill => ['hpRecover', 'regenerate'].includes(skill.effect?.type)), supportReduction = hasHeal ? .84 : 1;
      const estimatedDamage = Math.max(0, Math.round(incomingPerTurn * turns * .64 * supportReduction));
      const mpCost = Math.min(this.player.mp, skillTurns * this.skillMpCost(best));
      const won = estimatedDamage < this.player.hp;
      const lines = [`内部判定：${turns}ターン`, best.id === basic.id ? `${basic.name}を軸に最短経路を選択` : `${best.name}を優先して敵陣を突破`, won && estimatedDamage === 0 ? '敵の攻撃を受ける前に制圧' : `予測損耗 HP -${Math.min(this.player.hp - 1, estimatedDamage)} / MP -${mpCost}`];
      this.battleRewards.quickReport = `<section class="quick-result-log"><small>QUICK BATTLE LOG</small>${lines.map(line => `<p>${line}</p>`).join('')}</section>`;
      this.setLog(`簡易戦闘を実行――${lines.at(-1)}`); this.flashTitle('QUICK BATTLE', won ? 'RESOLVED' : 'FAILED');
      this.player.mp = Math.max(0, this.player.mp - mpCost);
      if (!won) { this.player.hp = 0; this.persistVitals(); this.updateHUD(); await this.battleSleep(120); await this.defeat(); this.quickResolving = false; return; }
      this.player.hp = Math.max(1, this.player.hp - estimatedDamage); this.turn = turns;
      const masteryGain = Math.max(1, Math.min(8, turns)), mastery = this.grantWeaponExp(masteryGain, this.equippedWeaponType()); if (mastery) this.battleRewards.masteryResults.push(mastery);
      enemies.forEach(enemy => { enemy.hp = 0; enemy.alive = false; enemy.rolledDrops = this.rollDrops(enemy); document.getElementById(enemy.uid)?.classList.add('defeated'); this.grantEnemyReward(enemy); });
      this.persistVitals(); this.updateHUD(); await this.battleSleep(120); await this.victory(); this.quickResolving = false;
    }
    // 所持している回復系の消費アイテムをすべて並べる。
    // 以前は回復薬と魔力回復薬を直書きしていたため、アイテムを足しても
    // 戦闘中のアイテム欄に出てこなかった。
    battleUsableItems() {
      return Object.values(D.items)
        .filter(i => this.isPlayerContentVisible(i) && i.category === 'consumable' && (i.effect?.hp || i.effect?.mp) && (this.profile.inventory[i.id] || 0) > 0);
    }
    showBattleItems() {
      const items = this.battleUsableItems();
      if (!items.length) { this.panel(this.button('もどる', 'BACK', 'back')); this.bindActions({ back: () => this.showMainCommands() }); this.setLog('使えるアイテムを持っていない。'); return; }
      const rows = items.map(i => {
        const n = this.profile.inventory[i.id] || 0;
        const full = i.effect?.hp ? this.player.hp >= this.player.stats.maxHp : this.player.mp >= this.player.stats.maxMp;
        const label = i.effect?.hp ? `HP +${i.effect.hp}` : `MP +${i.effect.mp}`;
        return this.button(i.name, `${label} // ×${n}`, i.id, full, 'item', i.description || `${label}回復する。`);
      }).join('');
      this.panel(this.button('閉じる', 'BACK', 'back') + rows, 'list');
      const actions = { back: () => this.showMainCommands() };
      items.forEach(i => { actions[i.id] = () => this.useConsumable(i.id); });
      this.bindActions(actions);
    }
    availableSkills() { const skills = [...this.personalSkills(), ...this.jobLearnedActiveSkills(this.profile.currentJob)]; const grant = this.equippedWeapon()?.grantsSkillId; if (grant && D.skills[grant]) skills.push(D.skills[grant]); return [...new Map(skills.map(s => [s.id, s])).values()]; }
    skillBuffReady(skill) { if (!skill?.requiresBuff) return true; const song = this.player?.buffs?.songBuffs?.[skill.requiresBuff] || []; return song.some(until => this.turn <= until) || !!this.player?.buffs?.[skill.requiresBuff]; }
    combatSkillList() {
      const jobLv = this.profile.jobs?.[this.profile.currentJob]?.level || 1;
      const conditional = this.conditionalSkillsForJob().filter(({ level }) => jobLv >= level).map(({ skill }) => skill);
      return [...new Map([...this.availableSkills(), ...conditional].filter(s => s?.id !== 'attack').map(s => [s.id, s])).values()];
    }
    cooldownRemaining(skill) { return Math.max(0, (this.player.cooldowns?.[skill.id] || 0) - this.turn); }
    showSkills() { this.showCombinedSkills(); }
    showCombinedSkills() {
      const skills = this.combatSkillList();
      if (!skills.length) { this.setLog('習得済みのスキルがありません。'); this.showMainCommands(); return; }
      const rows = skills.map(s => {
        const cd = this.cooldownRemaining(s), equipmentReady = this.skillEquipmentReady(s), buffReady = this.skillBuffReady(s);
        const resonanceReady = s.id !== 'resonanceBreak' || (this.resonanceEnabled() && (this.player?.resonance || 0) > 0);
        let sub = this.skillCostLabel(s);
        if (!equipmentReady) sub = '対応武器が必要';
        else if (!buffReady) { const src = this.buffSourceName(this.profile.currentJob, s.requiresBuff); sub = src ? `要《${src}》発動` : '発動条件未達'; }
        else if (cd) sub = `CT ${cd}`;
        else if (s.id === 'resonanceBreak') sub = `${(this.player?.resonance || 0).toFixed(1)}% // NEUTRAL`;
        return this.button(s.name, sub, s.id, !this.canPaySkillCosts(s) || cd > 0 || !equipmentReady || !buffReady || !resonanceReady, 'skill', this.skillListDetail(s));
      });
      this.panel(this.button('閉じる', 'BACK', 'back') + rows.join(''), 'list');
      const actions = { back: () => this.showMainCommands() };
      skills.forEach(s => { actions[s.id] = () => { if (s.randomTarget || s.target === 'all' || s.target === 'self') this.executeRound(s.id, -1); else this.chooseTarget(s.id); }; });
      this.bindActions(actions);
    }
    showWeaponArts() {
      const wt = this.equippedWeaponType();
      const skills = this.learnedWeaponSkills().filter(s => s.weaponType === wt && this.weaponSkillMatchesEquipped(s));
      const rows = skills.map(s => this.button(s.name, this.skillCostLabel(s), s.id, !this.canPaySkillCosts(s), `weapon-${wt}`, this.skillListDetail(s))).join('');
      this.panel(this.button('閉じる', 'BACK', 'back') + rows, 'list');
      const actions = { back: () => this.showMainCommands() };
      skills.forEach(s => { actions[s.id] = () => { const sk = D.skills[s.id]; if (sk?.randomTarget || sk?.target === 'all' || sk?.target === 'self') this.executeRound(s.id, -1); else this.chooseTarget(s.id); }; });
      this.bindActions(actions);
    }
    showPersonalSkills() {
      const skills = this.personalSkills();
      // 発動条件を満たしていない専用技も、条件を添えてグレーで並べる。
      // 出しっぱなしにしないと「そんな技があること自体」が player に伝わらない。
      const shownIds = new Set(skills.map(s => s.id));
      const locked = this.conditionalSkillsForJob().filter(({ skill }) => !shownIds.has(skill.id)).map(({ skill }) => skill);
      const rows = [
        ...skills.map(s => { const cd = this.cooldownRemaining(s), ready = this.skillEquipmentReady(s); return this.button(s.name, !ready ? '双刃装備が必要' : cd ? `CT ${cd}` : this.skillCostLabel(s), s.id, !this.canPaySkillCosts(s) || cd > 0 || !ready, 'skill', this.skillListDetail(s)); }),
        ...locked.map(s => { const src = this.buffSourceName(this.profile.currentJob, s.requiresBuff); return this.button(s.name, src ? `要《${src}》発動` : '条件未達', s.id, true, 'skill', this.skillListDetail(s)); })
      ];
      this.panel(this.button('閉じる', 'BACK', 'back') + rows.join(''), 'list');
      const actions = { back: () => this.showMainCommands() };
      skills.forEach(s => { actions[s.id] = () => { const sk = D.skills[s.id]; if (sk?.randomTarget || sk?.target === 'all' || sk?.target === 'self') this.executeRound(s.id, -1); else this.chooseTarget(s.id); }; });
      this.bindActions(actions);
    }
    /* Remote pre-redesign skill/target UI (superseded by the scrollable drawer below).
    showCommandSkills(jobId) { const skills = this.jobLearnedActiveSkills(jobId).filter(s => s.id !== D.jobs[jobId]?.signatureSkillId); if (!skills.length) { this.setLog('このコマンドの習得済みスキルがありません。'); return; } this.panel(skills.map(s => { const cd = this.cooldownRemaining(s); return this.button(s.name, cd ? `CT ${cd}` : this.skillCostLabel(s), s.id, !this.canPaySkillCosts(s) || cd > 0); }).join('') + this.button('もどる', 'BACK', 'back')); const actions = { back: () => this.showMainCommands() }; skills.forEach(s => { actions[s.id] = () => { const sk = D.skills[s.id]; if (sk?.randomTarget || sk?.target === 'all' || sk?.target === 'self') this.executeRound(s.id, -1); else this.chooseTarget(s.id); }; }); this.bindActions(actions); }
    chooseTarget(skillId) { const skill = D.skills[skillId]; if (skill?.target === 'all' || skill?.target === 'self') { this.executeRound(skillId, -1); return; } $('#phase-label').textContent = 'SELECT TARGET'; this.setLog('攻撃する敵を選択'); this.enemies.forEach((e, i) => { const el = document.getElementById(e.uid); if (e.alive) { el.classList.add('targetable'); el.onclick = () => this.executeRound(skillId, i); } }); this.panel(this.button('もどる', 'BACK', 'back')); this.bindActions({ back: () => { this.clearTargets(); this.showMainCommands(); } }); }
    clearTargets() { this.enemies.forEach((e, i) => { const el = document.getElementById(e.uid); if (el) { el.classList.remove('targetable'); this.bindEnemyTap(e, i); } }); }
    */
    showCommandSkills(jobId) {
      const skills = this.jobLearnedActiveSkills(jobId).filter(s => s.id !== D.jobs[jobId]?.signatureSkillId);
      if (!skills.length) { this.setLog('このコマンドの習得済みスキルがありません。'); return; }
      const rows = skills.map(s => { const cd = this.cooldownRemaining(s); return this.button(s.name, cd ? `CT ${cd}` : this.skillCostLabel(s), s.id, !this.canPaySkillCosts(s) || cd > 0, 'skill', this.skillListDetail(s)); }).join('');
      this.panel(this.button('閉じる', 'BACK', 'back') + rows, 'list');
      const actions = { back: () => this.showMainCommands() };
      skills.forEach(s => { actions[s.id] = () => { const sk = D.skills[s.id]; if (sk?.randomTarget || sk?.target === 'all' || sk?.target === 'self') this.executeRound(s.id, -1); else this.chooseTarget(s.id); }; });
      this.bindActions(actions);
    }
    chooseTarget(skillId) {
      const skill = D.skills[skillId];
      if (skill?.target === 'all' || skill?.target === 'self') { this.executeRound(skillId, -1); return; }
      $('#phase-label').textContent = 'SELECT TARGET';
      this.setLog('敵本体、または下部のA・B・Cをタップして攻撃対象を選択。名前タップで状態確認');
      this.enemies.forEach((e, i) => {
        const el = document.getElementById(e.uid);
        if (!e.alive || !el) return;
        const plate = $('.enemy-nameplate', el);
        const selectTarget = event => { event?.preventDefault(); event?.stopPropagation(); this.executeRound(skillId, i); };
        el.classList.add('targetable');
        el.onclick = selectTarget;
        el.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') selectTarget(event); };
        if (plate) {
          const inspect = event => { event?.preventDefault(); event?.stopPropagation(); this.openEnemyStatus(i); };
          plate.setAttribute('role', 'button'); plate.setAttribute('tabindex', '0'); plate.setAttribute('aria-label', `${e.name}${e.label || ''}の状態を確認`);
          plate.onclick = inspect;
          plate.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') inspect(event); };
        }
      });
      const targetButtons = Array.from({ length: 3 }, (_, i) => {
        const enemy = this.enemies[i];
        const letter = enemy?.label || String.fromCharCode(65 + i);
        const name = enemy?.alive ? enemy.name : enemy ? '戦闘不能' : '対象なし';
        return this.button(letter, name, `target${i}`, !enemy?.alive);
      }).join('');
      this.panel(this.button('もどる', 'BACK', 'back') + targetButtons, 'targets');
      const targetActions = { back: () => { this.clearTargets(); this.showMainCommands(); } };
      this.enemies.slice(0, 3).forEach((enemy, i) => { if (enemy.alive) targetActions[`target${i}`] = () => this.executeRound(skillId, i); });
      this.bindActions(targetActions);
    }
    clearTargets() {
      this.enemies.forEach((e, i) => {
        const el = document.getElementById(e.uid);
        if (!el) return;
        const plate = $('.enemy-nameplate', el);
        el.classList.remove('targetable');
        el.onclick = null; el.onkeydown = null;
        if (plate) {
          plate.classList.remove('targetable-nameplate');
          plate.onclick = null; plate.onkeydown = null;
        }
        this.bindEnemyTap(e, i);
      });
    }

    async executeRound(skillId, targetIndex) {
      // randomTarget（ばくれつけん等）はターゲット選択を経ずに発動するため、
      // 対象存在チェックは全体攻撃と同じ「生存敵が1体でもいるか」で判定する。
      let skill = D.skills[skillId]; const aoe = skill?.target === 'all' || skill?.randomTarget, self = skill?.target === 'self';
      if (skillId === 'resonanceBreak' && (!this.resonanceEnabled() || !(this.player?.resonance > 0))) return;
      if (this.locked || !skill || this.cooldownRemaining(skill) > 0 || !this.canPaySkillCosts(skill) || !this.skillEquipmentReady(skill) || (!self && (aoe ? !this.enemies.some(e => e.alive) : !this.enemies[targetIndex]?.alive))) return;
      this.lastBattleAction = { type: 'skill', skillId, targetIndex };
      if (skillId === 'resonanceBreak') { const stored = this.player.resonance; skill = { ...skill, resonanceStored: stored, power: this.resonanceMultiplier(stored) }; this.player.resonance = 0; this.flashTitle('RESONANCE BREAK', `${stored.toFixed(1)}% // ×${skill.power}`); }
      this.locked = true; this.clearTargets(); this.keepAutoControlVisible(); $('#phase-label').textContent = 'ACTION'; await this.beginPlayerTurn(); const setEffects = this.activeSetEffects(), freeMp = skill.kind === 'magical' && skill.mp > 0 && Math.random() < (setEffects.freeMagicMpChance || 0); if (!freeMp) this.player.mp -= this.skillMpCost(skill); else this.flashTitle('MAESTRO', 'MP COST 0'); if (skill.cooldown) this.player.cooldowns[skill.id] = this.turn + skill.cooldown; this.persistVitals(); this.updateHUD();
      const actors = [{ type: 'player', speed: this.playerCombatStats().agi + roll(0, 4) + (skill.speedBonus || 0), act: () => this.playerActionWithSpark(skill, targetIndex) }]; this.enemies.filter(e => e.alive).forEach(e => actors.push({ type: 'enemy', enemy: e, speed: e.stats.spd + roll(0, 4), act: () => this.enemyAttack(e) })); actors.sort((a, b) => b.speed - a.speed);
      for (const actor of actors) { if (this.finished || this.player.hp <= 0) break; if (actor.type === 'enemy' && !actor.enemy.alive) continue; await actor.act(); await this.battleSleep(300); if (!this.enemies.some(e => e.alive)) { const fallen = this.enemies[0]; if (this.battleMode === 'versicrell' && fallen?.form === 1) { await this.transformVersicrell(fallen); return; } if (this.enemies.every(e => e.escaped)) { await this.enemyEncounterEscaped(); return; } await this.victory(); return; } }
      if (this.player.hp <= 0) { await this.defeat(); return; } this.endPlayerTurn(); this.turn++; this.locked = false; this.updateHUD(); this.showMainCommands();
    }
    effectivePlayerStat(key) { const base = this.player.stats[key] || 0; return key === 'mag' && (this.player.buffs?.blueEcho || 0) > 0 ? base * 1.10 : base; }
    async beginPlayerTurn() { if (this.characterHasSkill('blueEcho') && Math.random() < .20) { this.player.buffs.blueEcho = 2; this.audio.sfx('passiveProc'); this.flashTitle('BLUE ECHO', 'MAG +10% // 2 TURNS'); this.setLog('蒼の残響が魔力を高める！'); await this.battleSleep(260); } if ((this.player.buffs.regenerate || 0) > 0) { const chance = this.player.buffs.regenerateChance ?? 1; if (Math.random() < chance) { const rate = this.player.buffs.regenerateRate || .08, boost = 1 + this.passiveEffectRate('healUp') + this.equipmentEffectRate('healingPowerPercent'), heal = Math.max(1, Math.ceil(this.player.stats.maxHp * rate * boost * this.traitHealMult())), gained = Math.min(heal, this.player.stats.maxHp - this.player.hp); this.player.hp += gained; if (gained) { this.floating($('#ren'), `+${gained}`, 'heal'); this.setLog(`リジェネレートでHPが${gained}回復！`); this.updateHUD(); await this.battleSleep(220); } } else { this.floating($('#ren'), 'REGEN MISS', 'miss'); this.setLog('リジェネレートの祈りは、このターン実を結ばなかった。'); await this.battleSleep(140); } } }
    endPlayerTurn() { if ((this.player.buffs.blueEcho || 0) > 0) this.player.buffs.blueEcho--; if ((this.player.buffs.regenerate || 0) > 0) { this.player.buffs.regenerate--; if (this.player.buffs.regenerate <= 0) { delete this.player.buffs.regenerate; delete this.player.buffs.regenerateRate; delete this.player.buffs.regenerateChance; } } if (this.player.buffs.defUp && this.turn > this.player.buffs.defUp.until) delete this.player.buffs.defUp; if (this.player.buffs.guardUntil === this.turn) { delete this.player.buffs.guardUntil; delete this.player.buffs.guardReduction; } }
    damageFor(skill, enemy, outcome = null) {
      const s = this.playerCombatStats(), w = skill.weaponOverrideId ? D.weapons[skill.weaponOverrideId] : this.equippedWeapon(), balance = D.combatBalance;
      // ── 攻撃性能：装備武器の weaponType から D.weaponScaling で決まる ──
      //   剣 = 力×1.0 ／ 爪 = 力×0.5＋素早さ×0.5 ／ 杖 = 魔力×1.0  （＋装備の攻撃力）
      // 技側に weaponType があればそれを、無ければ装備武器の種別を使う。
      const wType = skill.weaponType || w.weaponType || 'sword';
      const isMagicSkill = skill.kind === 'magical' || skill.damageType === 'magical' || this.weaponDamageType(wType) === 'magical';
      const attackEquipment = skill.weaponOverrideId ? { ...this.profile.equipment, rightHand: skill.weaponOverrideId, leftHand: null } : this.profile.equipment;
      let attackPower = this.attackPowerFor(wType, s, attackEquipment);
      const circleDown = this.player.buffs?.[isMagicSkill ? 'versicrellMagDown' : 'versicrellAtkDown'];
      if (circleDown && this.turn <= circleDown.until) attackPower *= (1 - circleDown.rate);
      if (skill.shieldFormula === 'magicRepulse') attackPower = this.defensePowerFor('magical', s) * 1.2 + this.defensePowerFor('physical', s) * .3;
      if (skill.shieldFormula === 'revenge') attackPower = this.player.lastReceivedType === 'magical' ? this.defensePowerFor('magical', s) * 1.35 + this.defensePowerFor('physical', s) * .25 : this.defensePowerFor('physical', s) * 1.35 + this.defensePowerFor('magical', s) * .25;
      // 強化倍率はここには掛けない。attackPowerFor が読む装備側の攻撃力に既に反映済み。
      const power = (skill.power ?? skill.powerScale ?? 1);
      // 防御低下は技側の rate を尊重する。魔法攻撃のときは精神が下がる。
      const defDown = this.turn <= (enemy.defDownUntil || 0) ? (enemy.defDownRate || .15) : 0;
      const neutral = skill.damageType === 'neutral' || skill.kind === 'neutral';
      // 会心は必中。さらに物理ならDEF、魔法ならMDEFを50%貫通してから最終倍率を掛ける。
      // 多段技は呼び出し側が1Hitずつoutcomeを渡すため、各Hitが独立して貫通する。
      const critical = neutral ? false : (outcome ? !!outcome.critical : Math.random() < this.criticalChanceFor(skill, s));
      const enemyDefStat = isMagicSkill ? (enemy.stats.mnd ?? enemy.stats.def) : enemy.stats.def;
      const buffRate = isMagicSkill ? (this.turn <= (enemy.mdefBuffUntil || 0) ? (enemy.mdefBuffRate || 0) : 0) : (this.turn <= (enemy.defBuffUntil || 0) ? (enemy.defBuffRate || 0) : 0);
      const fortissimo = this.turn <= (enemy.fortissimoUntil || 0) ? (enemy.fortissimoRate || 0) : 0;
      const criticalPierce = critical ? .50 : 0;
      const effectiveDef = neutral ? 0 : enemyDefStat * (1 + buffRate + fortissimo) * (1 - defDown) * (1 - (skill.ignoreDef || 0)) * (1 - criticalPierce);
      let value = skill.kind === 'hybrid' ? (s.str || 0) * skill.strScale + (s.mag || 0) * skill.magScale - effectiveDef : attackPower * power + (s.agi || 0) * (skill.agiScale || 0) - effectiveDef;
      // ちからためは物理攻撃にのみ乗る（杖の通常攻撃は damageType:'magical' なので対象外）
      const isPhysical = skill.kind === 'physical' || (skill.kind === 'weapon' && skill.damageType !== 'magical');
      const charge = isPhysical ? (this.player.buffs?.atkCharge?.rate || 0) : 0;
      if (charge) value *= (1 + charge);
      // パッシブ：闘争本能（HP50%以下で物理+10%）／魔法増幅／属性増幅
      if (isPhysical && this.player.hp / s.maxHp <= 0.5) value *= (1 + this.passiveEffectRate('lowHpPhysicalUp'));
      if (isPhysical) value *= (1 + this.equipmentEffectRate('physicalDamagePercent'));
      if (skill.damageType === 'magical' || skill.kind === 'magical') value *= (1 + this.passiveEffectRate('magicDamageUp') + this.equipmentEffectRate('magicDamagePercent'));
      if (skill.element) value *= (1 + this.passiveEffectRate('elementDamageUp'));
      if (skill.element === 'fire') value *= (1 + this.equipmentEffectRate('fireDamagePercent'));
      // 属性は弱点を突いた時だけ倍率が乗る。耐性による減衰は行わない。
      const weakRate = this.elementWeaknessRate(skill, enemy);
      const weak = weakRate > 1;
      if (weak) value *= weakRate;
      // 双刃士《連舞》：命中したHitから段階が上がり、各段階ごとに与ダメージ+2%。
      if (isPhysical) value *= (1 + this.comboDanceDamageRate());
      // 魔奏士《魔力装填》：次の物理攻撃へ魔力依存の追加ダメージ
      if (isPhysical && this.player.buffs?.magicCharge) value += this.effectivePlayerStat('mag') * (this.gb().magicChargeRate ?? 0.5);
      value += roll(balance.playerVariance.min, balance.playerVariance.max);
      // 会心抽選は命中抽選より先にrollPlayerAttackOutcome()で行う。
      // outcome未指定は外部拡張との互換用で、従来どおり会心だけを抽選する。
      if (critical) value *= balance.critical.multiplier;
      // 武器学は基礎能力へ混ぜず、対応武器で与える最終ダメージだけを伸ばす。
      value *= this.weaponMasteryMultiplier(wType);
      return { value: Math.max(1, Math.round(value)), critical, weak };
    }
    // 閃き演出：画面フラッシュ＋効果音＋カットインを見せてから技を発動する
    async sparkPresentation(skill) {
      const ren = $('#ren');
      const flash = document.createElement('div'); flash.className = 'spark-flash';
      const cut = document.createElement('div'); cut.className = 'spark-cutin';
      cut.innerHTML = `<small>閃いた！</small><b>${skill.name}</b><span>${skill.nameEn || ''}</span>`;
      document.getElementById('battlefield')?.append(flash, cut);
      ren.classList.add('sparking');
      this.audio.sfx('critical'); this.setLog(`💡 閃いた！ 《${skill.name}》`);
      await this.battleSleep(260);
      this.audio.sfx('rareDrop');
      await this.battleSleep(1150);
      flash.remove(); cut.remove(); ren.classList.remove('sparking');
    }
    // 攻撃が実際に発動するタイミングで閃きを判定し、成功したらその場で技を差し替える
    async playerActionWithSpark(skill, targetIndex) {
      // 多段数に関係なく、このACTIONで武器学EXPは1回だけ得る。
      this.grantWeaponActionExp(skill, targetIndex);
      const sparked = this.rollSpark(skill.id, this.sparkEnemyFor(targetIndex));
      if (!sparked) { await this.playerAction(skill, targetIndex); return; }
      // 元の行動を新技へ差し替えて即発動。新技ぶんのMPは追加消費しない。
      // 元行動が武器技なら、その選択時に支払ったMPだけは従来どおり消費済み。
      await this.sparkPresentation(sparked);
      this.battleSparks ||= []; this.battleSparks.push(sparked);
      await this.playerAction(sparked, targetIndex);
    }
    instantDeathChance(skill, enemy) {
      const effect = skill?.effect || {};
      if (!enemy || enemy.kind === 'boss' || enemy.instantDeathImmune || enemy.cannotDefeat || enemy.infiniteHp) return { chance: 0, immune: true };
      const stats = this.playerCombatStats(), mdefBuff = this.turn <= (enemy.mdefBuffUntil || 0) ? (enemy.mdefBuffRate || 0) : 0;
      const enemyMnd = (enemy.stats?.mnd ?? enemy.stats?.def ?? 0) * (1 + mdefBuff);
      const chance = clamp((effect.baseChance ?? .20) + ((stats.mag || 0) + (stats.mnd || 0) - enemyMnd) * (effect.statEdgeRate ?? .008), effect.minChance ?? .05, effect.maxChance ?? .60);
      return { chance, immune: false, enemyMnd };
    }
    async resolveInstantDeath(skill, target) {
      const ren = $('#ren'), el = document.getElementById(target.uid), result = this.instantDeathChance(skill, target);
      this.setLog(`${skill.name}――${target.name}${target.label}の魂へ祈りを届かせる。`); this.flashTitle(skill.name, skill.nameEn || 'INSTANT JUDGEMENT');
      ren.classList.add('casting'); this.audio.sfx('dark'); await this.battleSleep(260); await this.magicProjectile(el, skill); await this.battleSleep(220);
      if (result.immune) { this.floating(el, 'IMMUNE', 'miss'); this.setLog(`${target.name}${target.label}には即死が効かない！`); ren.classList.remove('casting'); return { anyHit: false, instantDeath: false, chance: 0 }; }
      if (Math.random() >= result.chance) { this.floating(el, 'RESIST', 'miss'); this.setLog(`${target.name}${target.label}は魂送の祈りに抗った！（成功率 ${Math.round(result.chance * 100)}%）`); ren.classList.remove('casting'); return { anyHit: false, instantDeath: false, chance: result.chance }; }
      const defeatedHp = target.hp; target.hp = 0; target.alive = false; target.rolledDrops = this.rollDrops(target); el?.classList.add('hit', 'defeated'); this.audio.sfx('critical'); this.floating(el, 'SOUL LOST', 'critical'); this.updateHUD(); await this.battleSleep(520); el?.classList.remove('hit'); ren.classList.remove('casting');
      target.rolledDrops.forEach(([id]) => { const item = D.items[id]; if (item) { this.floating(el, item.name, 'heal'); if (item.rarity === 'epic' || item.rarity === 'legendary') this.announceRareDrop(item); } });
      const earned = this.grantEnemyReward(target); this.setLog(`${target.name}${target.label}を葬送した！ EXP+${earned.exp} GOLD+${earned.gold}`); await this.battleSleep(380);
      return { anyHit: true, instantDeath: true, total: defeatedHp, chance: result.chance };
    }
    async playerAction(skill, targetIndex) { const result = await this.playerAttack(skill, targetIndex); if (result?.anyHit) await this.offHandStrike(skill, targetIndex); const setFx = this.activeSetEffects(); const repeatChance = setFx.magicRepeatChance || 0; if (skill.kind === 'magical' && this.enemies.some(e => e.alive) && Math.random() < repeatChance) { this.flashTitle('《独奏曲》', 'CADENZA // ENCORE'); this.setLog('ゼナカドの旋律が魔法を再演する！'); await this.battleSleep(360); await this.playerAttack(skill, targetIndex); } const physRepeatChance = setFx.physicalRepeatChance || 0; if (skill.kind === 'physical' && this.enemies.some(e => e.alive) && Math.random() < physRepeatChance) { this.flashTitle('DEADLY RHYTHM', 'MYRTHI // EXTRA BEAT'); this.setLog('鼓動が刻む追加連撃！'); await this.battleSleep(360); await this.playerAttack(skill, targetIndex); } }
    async playerAttack(skill, targetIndex) {
      if (skill.target === 'self') { await this.applySelfSkill(skill); return { anyHit: false }; }
      if (skill.target === 'all' && !skill.randomTarget) { await this.playerAttackAll(skill); return; }
      let target = this.enemies[targetIndex]; if (!target || !target.alive) target = this.enemies.find(e => e.alive); if (!target) return { anyHit: false }; if (skill.effect?.type === 'instantDeath') return this.resolveInstantDeath(skill, target); const w = this.equippedWeapon(), staffAttack = skill.kind === 'weapon' && skill.damageType === 'magical'; const extremeDance = skill.id === 'battleDance' && this.comboDanceStacks() >= this.comboDanceMax(); const dualDance = skill.id === 'battleDance' && !!this.offHandWeapon(); const dancePowers = skill.id === 'battleDance' ? (dualDance ? skill.hitPowersDual : skill.hitPowersSingle) : null; const actionName = extremeDance ? '戦姫乱舞・極' : skill.name; this.setLog(staffAttack ? `${w.name}に魔力を集める！` : `${actionName}！`); if (skill.kind !== 'weapon') this.flashTitle(actionName, extremeDance ? 'CHAIN DANCE // MAX' : 'QUICK EXECUTION'); this.attackSwingFx ? this.attackSwingFx(skill) : this.audio.sfx(staffAttack ? 'magic' : skill.id === 'quickSlash' ? 'quick' : 'slash');
      const ren = $('#ren'), el = document.getElementById(target.uid), hits = dancePowers?.length || skill.hits || 1; ren.classList.add(staffAttack || skill.kind === 'magical' || skill.kind === 'hybrid' ? 'casting' : 'attacking'); if (staffAttack || skill.kind === 'magical' || skill.kind === 'hybrid') { if (staffAttack) this.flashTitle('MAGIC SHOT', w.name); await this.battleSleep(220); await this.magicProjectile(el, skill); } else await this.battleSleep(220); let total = 0, criticals = 0, misses = 0; const perHit = {};
      for (let hit = 0; hit < hits; hit++) {
        // randomTarget の技はヒットごとに生存敵から対象を抽選し直す（撃破済みへ無駄撃ちしない）
        if (skill.randomTarget) { const alive = this.enemies.filter(e => e.alive && e.hp > 0); if (!alive.length) break; target = alive[Math.floor(Math.random() * alive.length)]; }
        if (!target || target.hp <= 0) break;
        const tEl = document.getElementById(target.uid);
        // 1Hitごとに「会心（必中）→通常命中」の順で独立判定する。
        const hitSkill = dancePowers ? { ...skill, power: dancePowers[hit] * (extremeDance && hit === hits - 1 ? 1.5 : 1) } : skill;
        const outcome = this.rollPlayerAttackOutcome(hitSkill, target);
        if (!outcome.hit) { misses++; this.comboDanceMiss(); this.triggerEvade('player', target, hitSkill, { hitIndex: hit, source: 'playerAttack' }); this.floating(tEl, 'EVADE', 'miss'); this.audio.sfx('quick'); await this.battleSleep(hits > 1 ? 170 : 320); continue; }
        this.comboDanceHit();
        tEl.classList.add('hit');
        const d = this.damageFor(hitSkill, target, outcome); total += d.value; if (d.critical) criticals++;
        this.refundMpFromSpell(d.value, skill); // 魔導士《魔力還流》
        perHit[target.uid] = (perHit[target.uid] || 0) + d.value;
        if (target.infiniteHp) target.debugDamageTaken = (target.debugDamageTaken || 0) + d.value;
        target.hp = target.infiniteHp ? target.stats.maxHp : target.cannotDefeat ? Math.max(1, target.hp - d.value) : Math.max(0, target.hp - d.value);
        this.recordSeripesHit(target, skill, d.value);
        // 撃破した瞬間に見た目も倒す。ここで付けないと「HP0なのに敵が残る」状態になる。
        if (target.hp <= 0) { target.alive = false; tEl.classList.add('defeated'); }
        this.floating(tEl, d.value, d.critical ? 'critical' : d.weak ? 'weak' : 'damage'); if (d.weak && !d.critical) this.floating(tEl, 'WEAK!', 'weak-label'); this.attackImpactFx ? this.attackImpactFx(skill, tEl, d.critical) : this.audio.sfx(d.critical ? 'critical' : 'enemyHit'); this.updateHUD();
        await this.battleSleep(hits > 1 ? 190 : 420); tEl.classList.remove('hit');
      } if (misses && !total) { this.setLog(`${target.name}${target.label}に攻撃を外した！`); ren.classList.remove('attacking','casting'); if (extremeDance) this.player.comboDance = 0; return { anyHit: false }; }
      const hitNames = Object.keys(perHit).map(uid => { const e = this.enemies.find(x => x.uid === uid); return e ? `${e.name}${e.label}` : ''; }).filter(Boolean); const targetLabel = skill.randomTarget && hitNames.length > 1 ? hitNames.join('・') : `${target.name}${target.label}`; this.setLog(`${criticals ? `CRITICAL ×${criticals}! ` : ''}${targetLabel}に${total}ダメージ！${hits > 1 ? `（${hits}HIT）` : ''}`); if (skill.kind === 'physical' || skill.kind === 'weapon') { delete this.player.buffs.atkCharge; delete this.player.buffs.magicCharge; } ren.classList.remove('attacking', 'casting');
      this.applySkillDebuff(skill, target);
      if (skill.effect?.type === 'selfDefUpAfterHit') this.player.buffs.defUp = { rate: skill.effect.rate, until: this.turn + (skill.effect.turns || 1) };
      if (skill.effect?.type === 'selfDefDown') { this.player.defDownUntil = this.turn + skill.effect.turns - 1; this.setLog(`捨て身斬りの反動で${this.playerName()}のDEFが20%低下！`); }
      // このターンに攻撃した敵のうち、倒れたものをまとめて処理する（最終targetも含む）
      const defeated = [];
      for (const uid of Object.keys(perHit)) { const t = this.enemies.find(x => x.uid === uid); if (!t || t.hp > 0 || t.rolledDrops) continue; defeated.push(t); }
      for (const t of defeated) {
        t.alive = false; const tEl = document.getElementById(t.uid);
        this.audio.sfx('defeat'); tEl.classList.add('defeated');
        if (this.battleMode === 'versicrell' && t.form === 1) { t.rolledDrops = []; this.setLog('BATTLE COMPLETE...'); continue; }
        t.rolledDrops = this.rollDrops(t);
        t.rolledDrops.forEach(([id]) => { const item = D.items[id]; if (item) { this.floating(tEl, item.name, 'heal'); if (item.rarity === 'epic' || item.rarity === 'legendary') this.announceRareDrop(item); } });
        const earned = this.grantEnemyReward(t);
        this.setLog(`${t.name}${t.label}を撃破！ EXP+${earned.exp} GOLD+${earned.gold}`);
      }
      if (extremeDance) { this.player.comboDance = 0; this.floating($('#ren'), '連舞 0', 'miss'); this.updateHUD(); }
      if (defeated.length) await this.battleSleep(600);
      return { anyHit: total > 0, total, criticals, misses };
    }
    async applySelfSkill(skill) {
      this.flashTitle(skill.name, skill.nameEn || 'SELF SKILL');
      const effect = skill.effect || {}, ren = $('#ren'); ren.classList.add('casting'); await this.battleSleep(260);
      if (effect.type === 'mpRecover') {
        const amount = Math.max(1, Math.ceil(this.player.stats.maxMp * effect.maxMpRate)), gained = Math.min(amount, this.player.stats.maxMp - this.player.mp);
        this.player.mp += gained; this.audio.sfx('heal'); this.floating(ren, `MP +${gained}`, 'heal'); this.setLog(`精神集中でMPが${gained}回復！`);
      }
      if (effect.type === 'hpRecover') {
        const baseHeal = effect.baseHeal ?? effect.base ?? 0, spiritScaling = effect.spiritScaling ?? effect.mndScale ?? 0;
        const amount = Math.max(1, Math.round((baseHeal + this.player.stats.mnd * spiritScaling) * (1 + this.passiveEffectRate('healUp') + this.equipmentEffectRate('healingPowerPercent')) * this.traitHealMult())), gained = Math.min(amount, this.player.stats.maxHp - this.player.hp);
        this.player.hp += gained; this.audio.sfx('heal'); this.floating(ren, `+${gained}`, 'heal'); this.setLog(`ヒールでHPが${gained}回復！`);
      }
      if (effect.type === 'regenerate') {
        this.player.buffs.regenerate = Math.max(this.player.buffs.regenerate || 0, effect.turns + 1); this.player.buffs.regenerateRate = Math.max(this.player.buffs.regenerateRate || 0, effect.maxHpRate ?? .08); this.player.buffs.regenerateChance = Math.max(this.player.buffs.regenerateChance || 0, effect.triggerChance ?? 1);
        this.audio.sfx('heal'); this.setLog(`リジェネレート！ ${effect.turns || 3}ターン、各ターン${Math.round((effect.triggerChance ?? 1) * 100)}%でHPを回復する。`);
      }
      if (effect.type === 'hpToMp') {
        const hpCost = this.skillHpCost(skill), room = this.player.stats.maxMp - this.player.mp;
        if (this.player.hp <= hpCost || room <= 0) this.setLog('生命力を魔力へ変換できない。');
        else { const gained = Math.min(Math.max(1, Math.ceil(this.player.stats.maxMp * (effect.mpRecoverRate || 0))), room); this.player.hp -= hpCost; this.player.mp += gained; this.recordSkillUse(skill); this.audio.sfx('dark'); this.floating(ren, `HP -${hpCost}`, 'debuff'); await this.battleSleep(180); this.audio.sfx('heal'); this.floating(ren, `MP +${gained}`, 'heal'); this.setLog(`生命力${hpCost}を魔力へ転換。MPが${gained}回復！（この戦闘では使用済）`); }
      }
      if (effect.type === 'selfMagicCharge') { this.player.buffs.magicCharge = true; this.audio.sfx('magic'); this.floating(ren, 'MAGIC CHARGE', 'heal'); this.setLog('魔力装填！ 次の物理攻撃に魔力が乗る。'); }
      if (effect.type === 'selfAtkCharge') { this.player.buffs.atkCharge = { rate: effect.rate }; this.audio.sfx('buff'); this.floating(ren, `ATK +${Math.round(effect.rate * 100)}%`, 'heal'); this.setLog('ちからため！ 次の物理攻撃の威力が上がる。'); }
      if (effect.type === 'selfDefUp') { this.player.buffs.defUp = { rate: effect.rate, until: this.turn + effect.turns }; this.audio.sfx('buff'); this.floating(ren, `DEF +${Math.round(effect.rate * 100)}%`, 'heal'); this.setLog(`雄叫びでDEFが${Math.round(effect.rate * 100)}%上昇！ ${effect.turns}ターン持続。`); }
      if (effect.type === 'fortress') { this.player.buffs.fortressUntil = this.turn; this.player.buffs.fortressReduction = effect.reduction ?? D.guardianBalance?.fortressReduction ?? .30; this.audio.sfx('buff'); this.floating(ren, 'FORTRESS', 'heal'); this.setLog('フォートレス！ このターンの被ダメージを30%軽減する。'); }
      this.persistVitals(); this.updateHUD(); await this.battleSleep(350); ren.classList.remove('casting');
    }
    // ══ 左手の追撃 ═══════════════════════════════════════════
    // 双刃士《二刀の型》＝左手武器で追撃。武道家《無手の型》＝左の拳で追撃。
    // 威力は攻撃性能（力＋武器攻撃）に offHandRate を掛けた分だけ。
    // 通常攻撃にのみ乗せる。技にも乗せると倍率が二重に効いて壊れるため。
    async offHandStrike(skill, targetIndex) {
      const lw = this.offHandWeapon(); if (!lw) return;
      if (skill?.kind !== 'weapon') return;
      const rate = this.offHandRate(); if (!rate) return;
      let enemy = this.enemies[targetIndex];
      if (!enemy?.alive) enemy = this.enemies.find(e => e.alive);
      if (!enemy || this.finished || this.player.hp <= 0) return;
      const el = document.getElementById(enemy.uid); if (!el) return;
      const strike = { id: 'offHandStrike', kind: 'weapon', weaponType: lw.weaponType, damageType: lw.damageType || 'physical', power: rate, agiScale: 0 };
      this.flashTitle(this.usesBareFists() ? '左の拳' : '左手の追撃', lw.name);
      if (!this.audio.playWeaponAttack(lw.weaponType)) this.audio.sfx('slash');
      const ren = $('#ren'); ren.classList.add('attacking');
      await this.battleSleep(200);
      strike.weaponOverrideId = this.profile.equipment.leftHand;
      const outcome = this.rollPlayerAttackOutcome(strike, enemy, { weapon: lw, weaponType: lw.weaponType, offHand: true });
      if (!outcome.hit) { this.comboDanceMiss(); this.triggerEvade('player', enemy, strike, { source: 'offHandStrike' }); this.floating(el, 'EVADE', 'miss'); this.setLog(`${enemy.name}${enemy.label}は左手の追撃をかわした！`); await this.battleSleep(240); ren.classList.remove('attacking'); return; }
      const pursuitExtra = outcome.critical ? (this.activePassiveByType('offHandCritical')?.passiveEffect?.comboBonusOnCritical || 0) : 0;
      this.comboDanceHit(pursuitExtra);
      const d = this.damageFor(strike, enemy, outcome);
      if (enemy.infiniteHp) enemy.debugDamageTaken = (enemy.debugDamageTaken || 0) + d.value;
      enemy.hp = enemy.infiniteHp ? enemy.stats.maxHp : enemy.cannotDefeat ? Math.max(1, enemy.hp - d.value) : Math.max(0, enemy.hp - d.value);
      el.classList.add('hit');
      this.floating(el, d.value, d.critical ? 'critical' : 'damage');
      this.audio.sfx(d.critical ? 'critical' : 'enemyHit');
      this.setLog(`左手の${lw.name}で追撃！ ${enemy.name}${enemy.label}に${d.value}ダメージ！`);
      this.updateHUD();
      await this.battleSleep(240);
      el.classList.remove('hit'); ren.classList.remove('attacking');
      if (enemy.hp <= 0 && enemy.alive) {
        enemy.alive = false; this.audio.sfx('defeat'); el.classList.add('defeated');
        if (this.battleMode === 'versicrell' && enemy.form === 1) { enemy.rolledDrops = []; this.setLog('BATTLE COMPLETE...'); await this.battleSleep(300); return; }
        enemy.rolledDrops = this.rollDrops(enemy);
        enemy.rolledDrops.forEach(([id]) => { const item = D.items[id]; if (item) { this.floating(el, item.name, 'heal'); if (item.rarity === 'epic' || item.rarity === 'legendary') this.announceRareDrop(item); } });
        this.grantEnemyReward(enemy);
        this.setLog(`${enemy.name}${enemy.label}を左手の追撃で撃破！`);
        await this.battleSleep(300);
      }
    }
    // ══ 魔力還流 ═════════════════════════════════════════════
    // 魔導士のJOB特性。通常攻撃で与えたダメージの一定割合をMPとして取り戻す。
    // 通常攻撃だけが kind==='weapon'。武器技（閃き）は physical/magical なので乗らない。
    refundMpFromSpell(damage, skill) {
      const rate = this.jobTraitRate('spellDrainMp'); if (!rate || !damage) return;
      if (skill?.kind !== 'weapon') return;
      // 端数は繰り越す。切り捨てると 1% は 100ダメージ未満で常に 0 になり、
      // 序盤〜中盤はまったく還ってこない特性になってしまう。
      this.player.mpRefundCarry = (this.player.mpRefundCarry || 0) + damage * rate;
      const whole = Math.floor(this.player.mpRefundCarry);
      if (whole <= 0) return;
      const room = this.player.stats.maxMp - this.player.mp;
      if (room <= 0) return;                 // 満タンのときは繰越を消費しない
      const gain = Math.min(whole, room);
      this.player.mpRefundCarry -= gain;     // 実際に得た分だけ減らす（余りは次に繰り越す）
      this.player.mp += gain; this.persistVitals(); this.updateHUD();
      this.floating($('#ren'), `MP +${gain}`, 'heal');
    }
    recordSeripesHit(enemy, skill, damage) {
      if (enemy?.id !== 'seripes' || !(damage > 0)) return;
      const type = (skill.damageType === 'magical' || skill.kind === 'magical') ? 'magical' : skill.damageType === 'neutral' ? 'neutral' : 'physical';
      enemy.recentDamageTypes ||= []; enemy.recentDamageTypes.push(type); if (enemy.recentDamageTypes.length > 5) enemy.recentDamageTypes.shift();
      if (enemy.repriseStance && !enemy.pendingReprise) { enemy.pendingReprise = { type, damage, grand: enemy.repriseStance === 'grand' }; enemy.repriseStance = null; this.flashTitle(type === 'magical' ? 'MAGIC RECORDED' : type === 'neutral' ? 'NEUTRAL RECORDED' : 'PHYSICAL RECORDED', 'REPRISE...'); }
    }
    // ══ カウンター ═══════════════════════════════════════════
    // 戦士のJOB特性。被弾したときに一定確率で自動的に反撃する。
    // 反撃は装備武器の通常攻撃で、威力は counterPowerRate 倍。
    async tryCounter(enemy) {
      if (!enemy?.alive || this.finished || this.player.hp <= 0) return;
      const setEffects = this.activeSetEffects();
      const rate = this.passiveEffectRate('counterRate') + (setEffects.counterRateFlat || 0); // JOB特性＋パッシブ＋セット効果
      if (!rate || Math.random() >= rate) return;
      const basic = this.basicAttackSkill();
      const skill = { ...basic, power: (basic.power ?? 1) * (D.settings?.counterPowerRate ?? 0.7) * (1 + (setEffects.counterPowerPercent || 0) / 100) };
      const el = document.getElementById(enemy.uid); if (!el) return;
      this.flashTitle('COUNTER', '受けて返す'); this.setLog(`${this.playerName()}の反撃！`);
      this.audio.sfx('slash');
      const ren = $('#ren'); ren.classList.add('attacking');
      await this.battleSleep(240);
      const outcome = this.rollPlayerAttackOutcome(skill, enemy);
      if (!outcome.hit) { this.triggerEvade('player', enemy, skill, { source: 'counter' }); this.floating(el, 'EVADE', 'miss'); this.setLog(`${enemy.name}${enemy.label}は反撃をかわした！`); await this.battleSleep(260); ren.classList.remove('attacking'); return; }
      const d = this.damageFor(skill, enemy, outcome);
      if (enemy.infiniteHp) enemy.debugDamageTaken = (enemy.debugDamageTaken || 0) + d.value;
      enemy.hp = enemy.infiniteHp ? enemy.stats.maxHp : enemy.cannotDefeat ? Math.max(1, enemy.hp - d.value) : Math.max(0, enemy.hp - d.value);
      el.classList.add('hit');
      this.floating(el, d.value, d.critical ? 'critical' : 'damage');
      this.audio.sfx(d.critical ? 'critical' : 'enemyHit');
      this.setLog(`${enemy.name}${enemy.label}に${d.value}ダメージ！`);
      this.updateHUD();
      await this.battleSleep(260);
      el.classList.remove('hit'); ren.classList.remove('attacking');
      if (enemy.hp <= 0 && enemy.alive) {
        enemy.alive = false; this.audio.sfx('defeat'); el.classList.add('defeated');
        if (this.battleMode === 'versicrell' && enemy.form === 1) { enemy.rolledDrops = []; this.setLog('BATTLE COMPLETE...'); await this.battleSleep(300); return; }
        enemy.rolledDrops = this.rollDrops(enemy);
        enemy.rolledDrops.forEach(([id]) => { const item = D.items[id]; if (item) { this.floating(el, item.name, 'heal'); if (item.rarity === 'epic' || item.rarity === 'legendary') this.announceRareDrop(item); } });
        this.grantEnemyReward(enemy);
        this.setLog(`${enemy.name}${enemy.label}を反撃で撃破！`);
        await this.battleSleep(300);
      }
    }
    // カズのまかない代。全JOB共通で所持GOLDの30%。
    // ══ カズの売り物 ══════════════════════════════════════════
    // 価格は固定。所持金比だと「金を使い切ってから買う」が最適解になり、
    // 所持0で0円になる抜け道もできるため。周回で押し切られるのは累計購入上限で防ぐ。
    // 僧侶は料金操作ではなく、戦闘報酬GOLDと継戦回復を強みとする。
    shopStock() { return (D.shopItems || []).map(id => D.items[id]).filter(Boolean); }
    shopMaxStack(item) { return item?.maxStack ?? 9; }
    shopPurchaseLimit(item) { const n = Number(item?.purchaseLimit); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : Infinity; }
    shopPurchaseCount(id) { return Math.max(0, Math.floor(Number(this.profile.shopPurchases?.[id]) || 0)); }
    canBuyItem(id) {
      const item = D.items[id]; if (!item?.price) return false;
      if (this.profile.gold < item.price) return false;
      if (this.shopPurchaseCount(id) >= this.shopPurchaseLimit(item)) return false;
      return (this.profile.inventory[id] || 0) < this.shopMaxStack(item);
    }
    buyItem(id) {
      const item = D.items[id];
      if (!this.canBuyItem(id)) { this.audio.sfx('ui'); return; }
      this.profile.gold -= item.price;
      this.profile.inventory[id] = (this.profile.inventory[id] || 0) + 1;
      if (Number.isFinite(this.shopPurchaseLimit(item))) {
        this.profile.shopPurchases ||= {};
        this.profile.shopPurchases[id] = this.shopPurchaseCount(id) + 1;
      }
      this.saveProfile(); this.audio.sfx('confirm');
      this.renderMenuSummary(); this.renderMenuPanel('food');
    }
    // まかないのテスト枠。料理バフや通常の携行食上限とは分離して扱う。
    buyKazuTestItem(id) {
      const listing = (D.foodMenu?.testItems || []).find(entry => entry.id === id);
      const item = D.items[id];
      if (!listing || !item || this.profile.gold < listing.price) { this.audio.sfx('ui'); return; }
      this.profile.gold -= listing.price;
      this.profile.inventory[id] = (this.profile.inventory[id] || 0) + 1;
      this.saveProfile(); this.audio.sfx('confirm');
      this.renderMenuSummary(); this.renderMenuPanel('food');
      this.renderKazuBubble('転生の試し用や。好きなだけ鍛え直して、力の伸びを見ていき。');
    }
    mealPrice() {
      const base = this.profile.gold * (D.settings?.mealGoldRate ?? .3);
      return Math.floor(base);
    }
    activeMealBuffType() { return this.profile?.flags?.ramenBuffActive ? (this.profile.flags.ramenBuffType || 'makanai') : null; }
    activeMealBuff() { const id = this.activeMealBuffType(); return id ? D.foodMenu?.buffs?.[id] || null : null; }
    mealGoldBonusRate() { return this.activeMealBuff()?.goldRate || 0; }
    mealExpBonusRate() { return this.activeMealBuff()?.expRate || 0; }
    rewardExpMultiplier() {
      const mode = String(this.battleMode || '');
      const normalDungeon = mode !== 'infiniteScore' && !mode.startsWith('ow');
      const adBoost = normalDungeon && window.arseneQOffer?.isActive?.('exp2') ? 2 : 1;
      return (1 + this.mealExpBonusRate()) * adBoost;
    }
    rewardGoldMultiplier() {
      const mode = String(this.battleMode || '');
      const normalDungeon = mode !== 'infiniteScore' && !mode.startsWith('ow');
      return normalDungeon && window.arseneQOffer?.isActive?.('gold2') ? 2 : 1;
    }
    mealEffectLabel(meal = this.activeMealBuff()) { if (!meal) return 'カズのまかないで潜入を強化'; if (meal.maxHpRate) return `最大HP ＋${Math.round(meal.maxHpRate * 100)}%`; if (meal.goldRate) return `GOLD ＋${Math.round(meal.goldRate * 100)}%`; if (meal.expRate) return `EXP ＋${Math.round(meal.expRate * 100)}%`; return meal.description || '効果あり'; }
    clearMealBuff() { if (!this.profile?.flags) return; this.profile.flags.ramenBuffActive = false; this.profile.flags.ramenBuffType = null; }
    isMealUnlocked(id) { const meal = D.foodMenu?.buffs?.[id]; return !!meal && (!meal.unlockBoss || this.isBossDefeated(meal.unlockBoss)) && (!meal.unlockFlag || !!this.profile?.flags?.[meal.unlockFlag]); }
    mealPriceFor(id) { const meal = D.foodMenu?.buffs?.[id]; return meal?.priceType === 'goldRate' ? this.mealPrice() : (meal?.price || 0); }
    // 実際に支払う消費MP。戦士《練達》などの割引パッシブを反映する。
    // 割引が乗るのは武器学で覚えた武器技だけ（JOB固有技や魔法には効かない）。
    skillMpCost(skill) {
      const base = skill?.mp || 0;
      if (!base || skill.source !== 'weapon') return base;
      const cut = this.passiveEffectRate('skillMpDiscount');
      return cut ? Math.max(1, Math.round(base * (1 - cut))) : base;
    }
    skillHpCost(skill) { return skill?.effect?.type === 'hpToMp' ? Math.max(1, Math.ceil(this.player.stats.maxHp * (skill.effect.hpCostRate || 0))) : 0; }
    skillUseCount(skill) { return this.player?.skillUses?.[skill?.id] || 0; }
    skillUseLimit(skill) { return Math.max(0, Number(skill?.maxUsesPerBattle) || 0); }
    recordSkillUse(skill) { const limit = this.skillUseLimit(skill); if (!limit) return; this.player.skillUses ||= {}; this.player.skillUses[skill.id] = this.skillUseCount(skill) + 1; }
    canPaySkillCosts(skill) { const limit = this.skillUseLimit(skill); if (limit && this.skillUseCount(skill) >= limit) return false; if (skill?.effect?.type === 'hpToMp' && this.player.mp >= this.player.stats.maxMp) return false; return this.player.mp >= this.skillMpCost(skill) && this.player.hp > this.skillHpCost(skill); }
    skillCostLabel(skill) { const limit = this.skillUseLimit(skill); if (limit && this.skillUseCount(skill) >= limit) return '戦闘中1回／使用済み'; const hp = this.skillHpCost(skill); if (hp) return `HP ${Math.round((skill.effect.hpCostRate || 0) * 100)}%${limit === 1 ? '／戦闘中1回' : ''}`; const mp = this.skillMpCost(skill); return mp ? `MP ${mp}` : (skill.nameEn || 'SKILL'); }
    // 技が持つ敵への弱体・状態異常をまとめて適用する。
    // 単体攻撃も全体攻撃もここを通すので、片方だけ効かない事故が起きない。
    applySkillDebuff(skill, target) {
      const e = skill?.effect; if (!e || !target || target.hp <= 0) return;
      if (e.type === 'enemyDefDown') {
        const r = e.rate || .15;
        target.defDownUntil = this.turn + (e.turns || 2); target.defDownRate = r;
        this.setLog(`${target.name}${target.label}の${skill.damageType === 'magical' ? '精神' : 'DEF'}が${Math.round(r * 100)}%低下！`);
      }
      // 混乱：一定ターン、行動が乱れて攻撃をしそこねることがある
      if (e.type === 'enemyConfuse' && Math.random() < (e.chance ?? 1)) {
        target.confuseUntil = this.turn + (e.turns || 2);
        this.setLog(`${target.name}${target.label}は混乱した！`);
      }
      if (e.type === 'enemyBind') {
        const el = document.getElementById(target.uid);
        if ((target.bindTurns || 0) > 0) {
          this.floating(el, 'NO STACK', 'miss'); this.setLog(`${target.name}${target.label}はすでに影を縫われている。重ね掛けはできない！`); return;
        }
        const resistance = clamp(target.bindResistance || 0, 0, .9), chance = clamp((e.chance ?? .65) * (1 - resistance), .05, .95);
        if (Math.random() < chance) {
          target.bindTurns = e.turns || 2;
          target.bindResistance = clamp(resistance + (e.resistanceGain ?? .25), 0, .9);
          this.floating(el, `足止め ${target.bindTurns}`, 'debuff'); this.setLog(`${target.name}${target.label}の影を縫い止めた！ 次の${target.bindTurns}行動を封じる。`);
        } else {
          target.bindResistance = clamp(resistance + .08, 0, .9);
          this.floating(el, 'RESIST', 'miss'); this.setLog(`${target.name}${target.label}は影縫いに抵抗した！`);
        }
        this.updateHUD();
      }
    }
    async playerAttackAll(skill) {
      const targets = this.enemies.filter(e => e.alive); if (!targets.length) return;
      this.setLog(`${skill.name}！`); this.flashTitle(skill.name, 'AREA MAGIC'); this.audio.sfx('magic');
      const ren = $('#ren'); ren.classList.add('casting');
      for (const target of targets) {
        const el = document.getElementById(target.uid); await this.magicProjectile(el);
        const outcome = this.rollPlayerAttackOutcome(skill, target);
        if (!outcome.hit) { this.comboDanceMiss(); this.triggerEvade('player', target, skill, { source: 'playerAttackAll' }); this.floating(el, 'EVADE', 'miss'); await this.battleSleep(180); continue; }
        this.comboDanceHit();
        el.classList.add('hit');
        const d = this.damageFor(skill, target, outcome); if (target.infiniteHp) target.debugDamageTaken = (target.debugDamageTaken || 0) + d.value; target.hp = target.infiniteHp ? target.stats.maxHp : target.cannotDefeat ? Math.max(1, target.hp - d.value) : Math.max(0, target.hp - d.value);
        this.refundMpFromSpell(d.value, skill); // 魔導士《魔力還流》
        this.recordSeripesHit(target, skill, d.value);
        this.floating(el, d.value, d.critical ? 'critical' : 'damage'); this.audio.sfx(d.critical ? 'critical' : 'enemyHit'); this.updateHUD();
        await this.battleSleep(220); el.classList.remove('hit');
        // 全体攻撃でも状態異常・弱体は個別に判定する（単体攻撃と同じ規則）
        if (target.hp > 0) this.applySkillDebuff(skill, target);
        if (target.hp <= 0) { target.alive = false; this.audio.sfx('defeat'); el.classList.add('defeated'); if (this.battleMode === 'versicrell' && target.form === 1) target.rolledDrops = []; else { target.rolledDrops = this.rollDrops(target); target.rolledDrops.forEach(([id]) => { const item = D.items[id]; if (item) { this.floating(el, item.name, 'heal'); if (item.rarity === 'epic' || item.rarity === 'legendary') this.announceRareDrop(item); } }); this.grantEnemyReward(target); } }
      }
      if (this.player.buffs?.atkCharge && skill.kind === 'physical') delete this.player.buffs.atkCharge;
      if (skill.selfHealRate) {
        const amount = Math.max(1, Math.round(this.player.stats.maxHp * skill.selfHealRate));
        const gained = Math.min(amount, this.player.stats.maxHp - this.player.hp);
        if (gained > 0) { this.player.hp += gained; this.persistVitals(); this.audio.sfx('heal'); this.floating(ren, `+${gained}`, 'heal'); }
      }
      ren.classList.remove('casting'); const defeatedNames = targets.filter(t => !t.alive).map(t => `${t.name}${t.label}`);
      this.setLog(defeatedNames.length ? `${defeatedNames.join('、')}を撃破！` : `${skill.name}が敵全体を襲う！`); await this.battleSleep(400);
    }
    async magicProjectile(targetEl) { const field = $('#battlefield').getBoundingClientRect(), weapon = $('#weapon-layer'), sprite = $('#ren .ren-sprite'), weaponRect = weapon?.getBoundingClientRect(), from = weaponRect && weaponRect.width > 0 && weaponRect.height > 0 ? weaponRect : sprite.getBoundingClientRect(), to = targetEl.getBoundingClientRect(), orb = document.createElement('i'), sx = from.right - field.left, sy = from.top - field.top + from.height * .22, ex = to.left - field.left + to.width * .48, ey = to.top - field.top + to.height * .58; orb.className = 'magic-projectile'; orb.style.left = `${sx}px`; orb.style.top = `${sy}px`; orb.style.setProperty('--shot-x', `${ex - sx}px`); orb.style.setProperty('--shot-y', `${ey - sy}px`); $('#battlefield').appendChild(orb); await this.battleSleep(460); orb.remove(); }
    receivePlayerDamage(amount, type = 'physical') {
      let damage = Math.max(0, Math.round(amount));
      if (this.player.buffs?.fortressUntil === this.turn) damage = Math.max(0, Math.round(damage * (1 - (this.player.buffs.fortressReduction ?? .30))));
      const setEffects = this.activeSetEffects(), setReduction = clamp((setEffects.damageReductionPercent || 0) / 100, 0, .8);
      if (setReduction) damage = Math.max(0, Math.round(damage * (1 - setReduction)));
      const passiveReduction = type === 'magical' ? this.passiveEffectRate('magicResist') : 0;
      const gearReduction = this.equipmentEffectRate(type === 'magical' ? 'magicDamageReductionPercent' : 'physicalDamageReductionPercent');
      if (passiveReduction || gearReduction) damage = Math.max(0, Math.round(damage * (1 - clamp(passiveReduction + gearReduction, 0, .8))));
      // 共通《防御》はDEFの置換ではなく最終軽減。物理・魔法のどちらにも同じ効果を持つ。
      if (this.player.buffs?.guardUntil === this.turn) damage = Math.max(0, Math.round(damage * (1 - (this.player.buffs.guardReduction ?? D.combatBalance?.guardReduction ?? .50))));
      const before = this.player.hp; this.player.hp = Math.max(0, before - damage); const actual = before - this.player.hp;
      if (actual > 0) {
        this.player.lastReceivedType = type;
        if (this.resonanceEnabled()) { const max = D.guardianBalance?.resonanceMax || 100, gainMult = (setEffects.resonanceGainMultiplier || 1) * (1 + this.equipmentEffectRate('resonanceGainPercent')); this.player.resonance = Math.min(max, (this.player.resonance || 0) + actual * (D.guardianBalance?.resonanceGainPerDamage ?? .05) * gainMult); }
        // 《祈祷》は敵から受けた一度の大きな実ダメージだけを参照する。
        // Body-to-Mind はHPを直接消費するため、この経路を通らず発動条件を満たさない。
        const prayer = this.activePassives().find(p => p.passiveEffect?.type === 'heavyHitRegenerate'), effect = prayer?.passiveEffect;
        const isHeavyHit = effect && actual >= Math.ceil(this.player.stats.maxHp * (effect.thresholdRate || 0));
        // 集団・多段攻撃で抽選回数が膨らまないよう、条件を満たした最初の1回だけ判定する。
        if (isHeavyHit && this.player.prayerCheckedTurn !== this.turn) {
          this.player.prayerCheckedTurn = this.turn;
          if (Math.random() < (effect.chance || 0)) {
            const turns = Math.max(1, Number(effect.turns) || 1), rate = Math.max(0, Number(effect.healRate) || 0);
            this.player.buffs.regenerate = Math.max(this.player.buffs.regenerate || 0, turns + 1);
            this.player.buffs.regenerateRate = Math.max(this.player.buffs.regenerateRate || 0, rate);
            this.player.buffs.regenerateChance = Math.max(this.player.buffs.regenerateChance || 0, 1);
            this.floating($('#ren'), 'PRAYER', 'heal'); this.setLog(`《${prayer.name}》発動！ 痛みが${turns}ターンの再生へ変わる。`);
          }
        }
      }
      this.persistVitals(); return actual;
    }
    async enemySupportAction(enemy, chosen) {
      const el = document.getElementById(enemy.uid); el?.classList.add('support-casting'); this.flashTitle(chosen.name, enemy.role || 'SUPPORT'); this.audio.sfx('heal'); await this.battleSleep(420);
      if (chosen.kind === 'heal') { const allies = this.enemies.filter(e => e.alive), target = [...allies].sort((a,b) => a.hp / a.stats.maxHp - b.hp / b.stats.maxHp)[0], amount = Math.max(1, Math.round(target.stats.maxHp * (chosen.power || .2))), gained = Math.min(amount, target.stats.maxHp - target.hp); target.hp += gained; this.floating(document.getElementById(target.uid), `+${gained}`, 'heal'); this.setLog(`${enemy.name}の${chosen.name}！ ${target.name}のHPが${gained}回復。`); }
      if (chosen.kind === 'defBuff' || chosen.kind === 'mdefBuff') { const magical = chosen.kind === 'mdefBuff'; this.enemies.filter(e => e.alive).forEach(e => { e[magical ? 'mdefBuffUntil' : 'defBuffUntil'] = this.turn + (chosen.turns || 3); e[magical ? 'mdefBuffRate' : 'defBuffRate'] = chosen.rate || .25; }); this.setLog(`${enemy.name}の${chosen.name}！ 敵全体の${magical ? 'MDEF' : 'DEF'}が上昇。`); }
      this.updateHUD(); await this.battleSleep(360); el?.classList.remove('support-casting');
    }
    async seripesAura(enemy, mode = 'guard') { const el = document.getElementById(enemy.uid); if (!el) return; el.classList.remove('aura-guard','aura-heal','aura-reprise'); el.classList.add('seripes-aura', `aura-${mode}`); await this.battleSleep(560); setTimeout(() => el.classList.remove('seripes-aura', `aura-${mode}`), 900); }
    async seripesStrike(enemy, name, type = 'physical', power = 1, recorded = 0, grand = false) {
      const el = document.getElementById(enemy.uid), ren = $('#ren'), magical = type === 'magical'; this.flashTitle(name, grand ? 'GRAND REPRISE' : 'BOSS ACTION'); this.audio.sfx(magical ? 'dark' : 'slash'); el.classList.add('enemy-attacking'); await this.battleSleep(380);
      const key = grand ? 'grandReprise' : name.includes('ミラー') ? 'repriseMirror' : name.includes('ブレイド') ? 'repriseBlade' : 'repriseSword';
      const action = enemy.specialAttacks?.[key] || { id: key, name, kind: magical ? 'magic' : 'physical', unavoidable: grand };
      const outcome = this.rollEnemyAttackOutcome(enemy, action);
      if (!outcome.hit) { this.triggerEvade(enemy, 'player', action, { source: 'seripesStrike' }); this.floating(ren, 'EVADE', 'miss'); this.setLog(`セリペスの${name}！ ${this.playerName()}は攻撃をかわした！`); this.updateHUD(); await this.battleSleep(480); el.classList.remove('enemy-attacking'); return; }
      ren.classList.add('hit');
      const defUp = (!magical && this.player.buffs?.defUp && this.turn <= this.player.buffs.defUp.until) ? 1 + (this.player.buffs.defUp.rate || 0) : 1;
      const base = this.enemyRawDamage(magical ? 'magical' : 'physical', (magical ? enemy.stats.mag : enemy.stats.atk) * power, defUp);
      const reflected = recorded * (grand ? (D.seripesBalance?.grandRepriseDamageRate ?? .48) : (D.seripesBalance?.repriseDamageRate ?? .32));
      const actual = this.receivePlayerDamage(Math.max(1, base + reflected + roll(-1, 2)), magical ? 'magical' : 'physical'); this.audio.sfx('playerHit'); this.floating(ren, actual, 'enemy-damage'); this.setLog(`セリペスの${name}！ ${actual}ダメージ。`); this.updateHUD(); await this.battleSleep(480); el.classList.remove('enemy-attacking'); ren.classList.remove('hit'); await this.tryCounter(enemy);
    }
    async bossAttackSeripes(enemy) {
      const hpRate = enemy.hp / enemy.stats.maxHp, b = D.seripesBalance || {};
      if (!enemy.phase2 && hpRate <= (b.phase2HpRate ?? .5)) { enemy.phase2 = true; this.flashTitle('REPRISE...', 'PHASE 2'); this.setLog('「受けた音は、必ず還る。さあ――次は私の番だ。」'); await this.seripesAura(enemy, 'reprise'); await this.battleSleep(650); }
      if (!enemy.finalPhase && hpRate <= (b.finalHpRate ?? .25)) { enemy.finalPhase = true; this.flashTitle('FINAL PHASE', 'GRAND REPRISE'); this.setLog('「守るとは、終わりではない。次の音を始めるために――受けることだ。」'); await this.seripesAura(enemy, 'reprise'); await this.battleSleep(650); }
      if (this.turn <= (enemy.regenUntil || 0)) { const heal = Math.min(Math.round(enemy.stats.maxHp * (b.regenRate ?? .035)), enemy.stats.maxHp - enemy.hp); if (heal > 0) { enemy.hp += heal; this.floating(document.getElementById(enemy.uid), `+${heal}`, 'heal'); this.setLog(`《聖域》がセリペスのHPを${heal}回復。`); this.updateHUD(); await this.battleSleep(260); } }
      if (enemy.pendingReprise) { const p = enemy.pendingReprise; enemy.pendingReprise = null; const magical = p.type === 'magical'; await this.seripesAura(enemy, 'reprise'); await this.seripesStrike(enemy, magical ? 'リプライズ・ミラー' : 'リプライズ・ブレイド', magical ? 'magical' : 'physical', p.grand ? 1.25 : 1, p.damage, p.grand); return; }
      if (enemy.finalPhase && !enemy.repriseStance && this.turn % 4 === 0) { enemy.repriseStance = 'grand'; this.flashTitle('GRAND REPRISE', '次の一撃を記録'); this.setLog('セリペスは大反奏の構えを取った。弱い一撃を記録させれば反撃を抑えられる！'); await this.seripesAura(enemy, 'reprise'); return; }
      const recent = enemy.recentDamageTypes || [], phys = recent.filter(t => t === 'physical').length, mag = recent.filter(t => t === 'magical').length;
      let chosen;
      if (phys >= 3 && this.turn > (enemy.defBuffUntil || 0)) chosen = enemy.ai.find(a => a.id === 'fortisGuard');
      else if (mag >= 3 && this.turn > (enemy.mdefBuffUntil || 0)) chosen = enemy.ai.find(a => a.id === 'arcanaVeil');
      else if (enemy.phase2 && Math.random() < .18) chosen = { id: 'fortissimo', name: 'フォルティッシモ', kind: 'fortissimo', rate: b.fortissimoRate ?? .15, turns: 3 };
      else { let r = Math.random(), acc = 0; chosen = enemy.ai[enemy.ai.length - 1]; for (const a of enemy.ai) { acc += a.weight; if (r < acc) { chosen = a; break; } } }
      if (chosen.kind === 'selfDefBuff' || chosen.kind === 'selfMdefBuff' || chosen.kind === 'fortissimo') { const m = chosen.kind === 'selfMdefBuff'; if (chosen.kind === 'fortissimo') { enemy.fortissimoUntil = this.turn + chosen.turns; enemy.fortissimoRate = chosen.rate; } else { enemy[m ? 'mdefBuffUntil' : 'defBuffUntil'] = this.turn + chosen.turns; enemy[m ? 'mdefBuffRate' : 'defBuffRate'] = chosen.rate; } this.flashTitle(chosen.name, 'WHITE AEGIS'); this.setLog(`セリペスの${chosen.name}！ 防壁が白銀に輝く。`); await this.seripesAura(enemy, 'guard'); return; }
      if (chosen.kind === 'selfRegen') { enemy.regenUntil = this.turn + (chosen.turns || 3); this.flashTitle('聖域', 'SANCTUARY'); this.setLog('セリペスを白い聖域が包む。3ターン自然回復。'); await this.seripesAura(enemy, 'heal'); return; }
      if (chosen.kind === 'reprise') { enemy.repriseStance = 'normal'; this.flashTitle('REPRISE...', '次の攻撃タイプを記録'); this.setLog('セリペスは反奏の構えを取った。'); await this.seripesAura(enemy, 'reprise'); return; }
      await this.seripesStrike(enemy, '反奏剣', 'physical', .9);
    }
    async enemyAttack(enemy) {
      if ((enemy.bindTurns || 0) > 0) {
        const el = document.getElementById(enemy.uid); enemy.bindTurns--;
        this.setLog(`${enemy.name}${enemy.label}は影を縫われて動けない！`); this.floating(el, `足止め ${enemy.bindTurns}`, 'debuff'); this.updateHUD(); await this.battleSleep(420); return;
      }
      // 混乱中は半々で行動を空振りする
      if (this.turn <= (enemy.confuseUntil || 0) && Math.random() < 0.5) {
        const el = document.getElementById(enemy.uid);
        this.setLog(`${enemy.name}${enemy.label}は混乱していて動けない！`);
        this.floating(el, '混乱', 'miss');
        await this.battleSleep(360);
        return;
      }
      if (enemy.kind === 'boss') { await this.bossAttack(enemy); return; }
      let r = Math.random(), chosen = enemy.ai[enemy.ai.length - 1], acc = 0;
      for (const s of enemy.ai) { acc += s.weight; if (r < acc) { chosen = s; break; } }
      // 回復・強化を空撃ちしない。条件を満たさない場合は同AI内の攻撃へ切り替える。
      const fallback = enemy.ai.find(s => !['heal','defBuff','mdefBuff'].includes(s.kind)) || enemy.ai[enemy.ai.length - 1];
      if (chosen.kind === 'heal' && !this.enemies.some(e => e.alive && e.hp / e.stats.maxHp < .78)) chosen = fallback;
      if (chosen.kind === 'defBuff' && this.enemies.some(e => e.alive && this.turn <= (e.defBuffUntil || 0))) chosen = fallback;
      if (chosen.kind === 'mdefBuff' && this.enemies.some(e => e.alive && this.turn <= (e.mdefBuffUntil || 0))) chosen = fallback;
      if (['heal','defBuff','mdefBuff'].includes(chosen.kind)) { await this.enemySupportAction(enemy, chosen); return; }
      if (chosen.kind === 'flee') { await this.enemyFlee(enemy, chosen); return; }
      if (chosen.kind === 'steal') { await this.enemySteal(enemy, chosen); return; }
      const isMagic = chosen.kind === 'magic';
      this.setLog(`${enemy.name}${enemy.label}の${chosen.name}！`); if (isMagic) { this.flashTitle(chosen.name, 'SHADOW MAGIC'); this.audio.sfx('dark'); } const el = document.getElementById(enemy.uid), ren = $('#ren'); el.classList.add('enemy-attacking'); await this.battleSleep(300);
      const balance = D.combatBalance, attackStat = isMagic ? enemy.stats.mag : enemy.stats.atk;
      const defMul = isMagic ? 1 : (this.turn <= (this.player.defDownUntil || 0) ? .8 : 1);
      const raw = this.enemyRawDamage(isMagic ? 'magical' : 'physical', attackStat, defMul), outcome = this.rollEnemyAttackOutcome(enemy, chosen), damage = Math.max(1, Math.round(raw + roll(balance.enemyVariance.min, balance.enemyVariance.max)));
      if (!outcome.hit) { this.triggerEvade(enemy, 'player', chosen, { source: 'enemyAttack' }); this.floating(ren, 'EVADE', 'miss'); this.setLog(`${this.playerName()}は攻撃をかわした！`); } else { ren.classList.add('hit'); this.audio.sfx('playerHit'); const actual = this.receivePlayerDamage(damage, isMagic ? 'magical' : 'physical'); this.floating(ren, actual, 'enemy-damage'); this.setLog(`${this.playerName()}は${actual}ダメージを受けた！`); } this.updateHUD(); await this.battleSleep(420); el.classList.remove('enemy-attacking'); ren.classList.remove('hit');
      if (outcome.hit) await this.tryCounter(enemy);
    }
    async bossAttack(enemy) {
      if (enemy.id === 'myrthi') { await this.bossAttackMyrthi(enemy); return; }
      if (enemy.id === 'versicrell') { await this.bossAttackVersicrell(enemy); return; }
      if (enemy.id === 'seripes') { await this.bossAttackSeripes(enemy); return; }
      if (enemy.cannotDefeat) {
        const el = document.getElementById(enemy.uid), ren = $('#ren'), script = enemy.scriptedDefeat || {};
        const idleTurns = Math.max(0, Number(script.idleTurns) || 0);
        if (this.turn <= idleTurns) {
          this.flashTitle('OBSERVING...', `VERDICT IN ${idleTurns + 1 - this.turn}`); this.floating(el, '……', 'miss');
          this.setLog(`ノエルは何もせず、こちらの力を見定めている……（${this.turn} / ${idleTurns}）`);
          await this.battleSleep(720); return;
        }
        this.setLog(`${enemy.name}のエターナル・ジャッジメント！`); this.flashTitle('裁定の刻', 'ETERNAL JUDGEMENT'); this.audio.sfx('dark'); el.classList.add('enemy-attacking'); await this.battleSleep(520); ren.classList.add('hit');
        const damage = this.player.hp; this.player.hp = 0; this.persistVitals();
        this.audio.sfx('critical'); this.floating(ren, damage, 'enemy-damage'); this.setLog(`4ターン目の絶対裁定――${this.playerName()}は膝をついた……`);
        this.updateHUD(); await this.battleSleep(650); el.classList.remove('enemy-attacking'); ren.classList.remove('hit'); return;
      }
      let r = Math.random(), chosen = enemy.ai[enemy.ai.length - 1], acc = 0;
      for (const s of enemy.ai) { acc += s.weight; if (r < acc) { chosen = s; break; } }
      const isMagic = chosen.kind === 'magic', el = document.getElementById(enemy.uid), ren = $('#ren');
      this.setLog(`${enemy.name}の${chosen.name}！`);
      if (isMagic) { this.flashTitle(chosen.name, 'BOSS MAGIC'); this.audio.sfx('dark'); } else { this.flashTitle(chosen.name, 'BOSS STRIKE'); this.audio.sfx('slash'); }
      el.classList.add('enemy-attacking'); await this.battleSleep(400);
      const balance = D.combatBalance, formula = isMagic ? balance.enemyMagic : balance.enemyPhysical;
      const defUpBuff = (this.player.buffs?.defUp && this.turn <= this.player.buffs.defUp.until) ? (1 + (this.player.buffs.defUp.rate || 0)) : 1; const attackStat = isMagic ? enemy.stats.mag : enemy.stats.atk;
      const defMul = isMagic ? 1 : defUpBuff * (this.turn <= (this.player.defDownUntil || 0) ? .8 : 1);
      const raw = this.enemyRawDamage(isMagic ? 'magical' : 'physical', attackStat, defMul);
      let damage = Math.max(1, Math.round(raw + roll(balance.enemyVariance.min, balance.enemyVariance.max)));
      const outcome = this.rollEnemyAttackOutcome(enemy, chosen);
      if (!outcome.hit) { this.triggerEvade(enemy, 'player', chosen, { source: 'bossAttack' }); this.floating(ren, 'EVADE', 'miss'); this.setLog(`${this.playerName()}は${chosen.name}をかわした！`); this.updateHUD(); await this.battleSleep(450); el.classList.remove('enemy-attacking'); return; }
      ren.classList.add('hit');
      this.audio.sfx('playerHit'); const actual = this.receivePlayerDamage(damage, isMagic ? 'magical' : 'physical'); this.floating(ren, actual, 'enemy-damage'); this.setLog(`${this.playerName()}は${actual}ダメージを受けた！`); this.updateHUD(); await this.battleSleep(450); el.classList.remove('enemy-attacking'); ren.classList.remove('hit');
      await this.tryCounter(enemy);
    }
    // 使った攻撃の属性が敵の弱点に含まれていれば倍率を返す。含まれなければ1。
    // 敵側の表記ゆれ（火／炎）は data.js の labels で吸収する。
    elementWeaknessRate(skill, enemy) {
      const element = skill?.element || skill?.elementId;
      const config = D.elementWeakness;
      if (!element || !config || !enemy?.weaknesses?.length) return 1;
      const labels = config.labels?.[element];
      if (!labels) return 1;
      return enemy.weaknesses.some(tag => labels.includes(tag)) ? (config.multiplier ?? 1.25) : 1;
    }
    floating(el, value, type) { if (!el) return; const r = el.getBoundingClientRect(), field = $('#battlefield').getBoundingClientRect(), f = document.createElement('b'); f.className = `float-number ${type}`; f.textContent = type === 'critical' ? `CRITICAL! ${value}` : value; f.style.left = `${r.left - field.left + r.width / 2}px`; f.style.top = `${r.top - field.top + r.height * .25}px`; $('#float-layer').appendChild(f); setTimeout(() => f.remove(), 1100); }
    queueGrowthBubble(title, detail = '') { this.growthBubbleQueue = (this.growthBubbleQueue || Promise.resolve()).then(() => this.showGrowthBubble(title, detail)); return this.growthBubbleQueue; }
    async showGrowthBubble(title, detail = '') { const ren = $('#ren'), field = $('#battlefield'); if (!ren || !field) return; const rr = ren.getBoundingClientRect(), fr = field.getBoundingClientRect(), bubble = document.createElement('div'); bubble.className = 'growth-bubble'; bubble.innerHTML = `<b>${title}</b>${detail ? `<span>${detail}</span>` : ''}`; bubble.style.left = `${rr.left - fr.left + rr.width * .52}px`; bubble.style.top = `${Math.max(92, rr.top - fr.top + 12)}px`; $('#float-layer').appendChild(bubble); this.audio.sfx('confirm'); await this.battleSleep(1250); bubble.remove(); }
    announceRareDrop(item) { const layer = $('#rare-drop-layer'); if (!layer) return; this.audio.sfx('rareDrop'); const b = document.createElement('div'); b.className = `rare-drop-banner rarity-${item.rarity}`; b.innerHTML = `<small>${item.rarity === 'legendary' ? 'LEGENDARY DROP' : 'EPIC DROP'}</small><b>${item.name}</b>`; layer.appendChild(b); requestAnimationFrame(() => b.classList.add('show')); setTimeout(() => { b.classList.remove('show'); setTimeout(() => b.remove(), 420); }, 2400); }
    async useConsumable(id) { const item = D.items[id], amount = item?.effect?.hp || item?.effect?.mp || 0, key = item?.effect?.hp ? 'hp' : 'mp', maxKey = key === 'hp' ? 'maxHp' : 'maxMp'; if (!item || !(this.profile.inventory[id] > 0)) { this.setLog(`${item?.name || 'アイテム'}を持っていない。`); return; } if (this.player[key] >= this.player.stats[maxKey]) { this.setLog(`${key.toUpperCase()}は満タンだ。`); return; } this.lastBattleAction = { type: 'item', itemId: id }; this.locked = true; this.keepAutoControlVisible(); await this.beginPlayerTurn(); const heal = Math.min(amount, this.player.stats[maxKey] - this.player[key]); this.profile.inventory[id]--; this.player[key] += heal; this.persistVitals(); this.audio.sfx('heal'); this.setLog(`${item.name}を使った。${key.toUpperCase()}が${heal}回復！`); this.floating($('#ren'), `+${heal}`, 'heal'); this.updateHUD(); await this.battleSleep(650); await this.enemyOnlyTurn(); }
    async guardAction() {
      if (this.locked || this.finished) return;
      this.lastBattleAction = { type: 'guard' };
      this.locked = true; this.clearTargets(); this.keepAutoControlVisible(); $('#phase-label').textContent = 'GUARD';
      await this.beginPlayerTurn();
      const reduction = D.combatBalance?.guardReduction ?? .50;
      this.player.buffs.guardUntil = this.turn; this.player.buffs.guardReduction = reduction;
      this.audio.sfx('ui'); this.flashTitle('GUARD', `DAMAGE -${Math.round(reduction * 100)}%`);
      this.floating($('#ren'), 'GUARD', 'heal'); this.setLog(`防御態勢！ このラウンドに受けるダメージを${Math.round(reduction * 100)}%軽減する。`);
      this.updateHUD(); await this.battleSleep(420); await this.enemyOnlyTurn();
    }
    repeatLastBattleAction() {
      if (this.locked || this.finished) return;
      const last = this.lastBattleAction;
      if (!last) { this.setLog('まだ再行動できる履歴がない。'); return; }
      if (last.type === 'guard') { this.guardAction(); return; }
      if (last.type === 'item') { this.useConsumable(last.itemId); return; }
      const skill = D.skills[last.skillId];
      if (!skill || this.cooldownRemaining(skill) > 0 || !this.canPaySkillCosts(skill) || !this.skillEquipmentReady(skill)) { this.setLog('直前の行動は現在の状態では再実行できない。'); return; }
      const noTarget = skill.target === 'all' || skill.target === 'self' || skill.randomTarget;
      const targetIndex = noTarget ? -1 : (this.enemies[last.targetIndex]?.alive ? last.targetIndex : this.enemies.findIndex(enemy => enemy.alive));
      if (!noTarget && targetIndex < 0) { this.setLog('再行動の対象がいない。'); return; }
      this.executeRound(last.skillId, targetIndex);
    }
    async tryEscape() { if (this.battleMode === 'debugOverpower') { const damage = this.enemies[0]?.debugDamageTaken || 0, turns = this.turn; this.finished = true; this.restoreDebugBattle(); this.audio.sfx('escape'); this.showResult('TEST ABORTED', '強敵検証を中断し、開始前のセーブ状態へ戻した。', 'GUARDIAN TRIAL', `<div class="boss-result-note">生存 ${turns} ACTION　/　総与ダメージ ${Math.round(damage).toLocaleString('ja-JP')}</div>`); return; } this.locked = true; this.keepAutoControlVisible(); await this.beginPlayerTurn(); const live = this.enemies.filter(e => e.alive), avg = live.reduce((s, e) => s + e.stats.spd, 0) / live.length, chance = clamp(.45 + (this.player.stats.agi - avg) * .025, .35, .9); this.setLog('逃走経路を探している……'); await this.battleSleep(600); if (Math.random() < chance) { this.finished = true; this.persistVitals(); this.audio.sfx('escape'); this.flashTitle('ESCAPED', '戦線を離脱'); await this.battleSleep(700); this.showResult('ESCAPED', '怪異との戦闘から離脱し、拠点へ帰還した。', 'RETURN TO HIDEOUT', this.battleSummaryHTML()); } else { this.setLog('逃げられない！'); await this.battleSleep(450); await this.enemyOnlyTurn(); } }
    async enemyOnlyTurn() { for (const e of this.enemies.filter(e => e.alive)) { await this.enemyAttack(e); if (this.player.hp <= 0) { await this.defeat(); return; } if (!this.enemies.some(x => x.alive)) { if (this.enemies.every(x => x.escaped)) await this.enemyEncounterEscaped(); else await this.victory(); return; } await this.battleSleep(300); } this.endPlayerTurn(); this.turn++; this.locked = false; this.updateHUD(); this.showMainCommands(); }

    async enemyFlee(enemy, action) {
      const el = document.getElementById(enemy.uid); enemy.alive = false; enemy.escaped = true;
      this.flashTitle(action.name, 'RARE ENEMY ESCAPED'); this.audio.sfx('escape'); this.setLog(`${enemy.name}${enemy.label}は戦利品を抱えて逃げ出した！`);
      this.floating(el, 'ESCAPE', 'miss'); el?.classList.add('enemy-escaped'); await this.battleSleep(620); this.updateHUD();
    }
    async enemySteal(enemy, action) {
      const el = document.getElementById(enemy.uid), materials = Object.entries(this.profile.inventory || {}).filter(([id, count]) => count > 0 && D.items[id]?.category === 'material');
      const canGold = this.profile.gold > 0, stealMaterial = materials.length && (!canGold || Math.random() < .42);
      this.flashTitle(action.name, 'GOLD / MATERIAL AT RISK'); this.audio.sfx('dark'); el?.classList.add('enemy-attacking'); await this.battleSleep(260);
      if (stealMaterial) {
        const [id] = materials[Math.floor(Math.random() * materials.length)]; this.profile.inventory[id]--; enemy.stolenItems ||= {}; enemy.stolenItems[id] = (enemy.stolenItems[id] || 0) + 1;
        this.setLog(`${enemy.name}は${D.items[id].name}を盗んだ！ 倒せば取り返せる。`); this.floating($('#ren'), `${D.items[id].name} -1`, 'debuff');
      } else if (canGold) {
        const floorNo = Math.max(1, (this.floorsOf('dungeon3') || []).findIndex(f => f.id === this.currentFloorId) + 1), amount = Math.max(1, Math.min(Math.round(this.profile.gold * .12), 180 + floorNo * 170));
        this.profile.gold -= amount; enemy.stolenGold = (enemy.stolenGold || 0) + amount;
        this.setLog(`${enemy.name}は${amount.toLocaleString('ja-JP')} GOLDを盗んだ！ 倒せば取り返せる。`); this.floating($('#ren'), `GOLD -${amount}`, 'debuff');
      } else {
        this.setLog(`${enemy.name}は盗める物を見つけられなかった！`); this.floating(el, 'MISS', 'miss');
      }
      enemy.hasStolen = true; this.saveProfile(); el?.classList.remove('enemy-attacking'); this.updateHUD(); await this.battleSleep(440);
    }
    async enemyEncounterEscaped() {
      this.finished = true; this.pauseAutoBattle(); this.locked = false; $('#phase-label').textContent = 'ESCAPED';
      $('#log').innerHTML = '<p>希少怪異は逃走した。この遭遇は階層踏破数に加算されない。</p>';
      this.panel(this.button('次の戦闘へ', 'NEXT BATTLE', 'next') + this.button('拠点へ戻る', 'HIDEOUT', 'hideout'));
      this.bindActions({ next: () => this.startBattle(), hideout: () => this.showMenu('home') });
    }

    grantEnemyReward(enemy) {
      // 特殊戦闘モード側で一部の器だけを初期化していても撃破処理を止めない。
      const rewards = (this.battleRewards ||= {});
      rewards.exp ??= 0; rewards.gold ??= 0; rewards.drops ||= {}; rewards.levels ||= [];
      rewards.masteryResults ||= []; rewards.jobResults ||= []; rewards.newRecipes ||= [];
      // 僧侶《施しの祈り》などのGOLD増加パッシブをここで反映する
      const baseExp = enemy.exp || 0, exp = Math.round(baseExp * this.rewardExpMultiplier()), baseGold = roll(enemy.gold?.min ?? 0, enemy.gold?.max ?? 0);
      const recoveredGold = enemy.stolenGold || 0, gold = Math.round(baseGold * (1 + this.passiveEffectRate('goldUp') + this.mealGoldBonusRate()) * this.rewardGoldMultiplier()) + recoveredGold, drops = {};
      (enemy.rolledDrops || []).forEach(([id, n]) => { drops[id] = (drops[id] || 0) + n; });
      Object.entries(enemy.stolenItems || {}).forEach(([id, n]) => { drops[id] = (drops[id] || 0) + n; });
      if (recoveredGold || Object.keys(enemy.stolenItems || {}).length) this.setLog(`${enemy.name}を撃破！ 盗まれた戦利品を取り返した。`);
      const levels = this.applyRewards({ exp, gold, drops });
      // 武器学EXPは撃破EXP比例ではなく、武器ACTIONの実行時に付与済み。
      const job = this.grantJobExp(exp);
      rewards.exp += exp; rewards.gold += gold;
      Object.entries(drops).forEach(([id, n]) => { rewards.drops[id] = (rewards.drops[id] || 0) + n; });
      rewards.levels.push(...levels); if (job) rewards.jobResults.push(job);
      if (job?.to > job?.from && !this.quickResolving) this.queueGrowthBubble('JOB Lv.UP!', `${job.jobName} Lv.${job.from} → ${job.to}`);
      this.updateHUD();
      return { exp, gold };
    }
    battleSummaryHTML() {
      const r = this.battleRewards, notices = `${r?.quickReport || ''}${r?.checkpointNotice || ''}`; if (!r || (!r.exp && !r.gold && !Object.keys(r.drops).length)) return notices;
      return `${notices}${this.rewardHTML({ exp: r.exp, gold: r.gold, drops: r.drops }, r.levels)}`;
    }
    rollDrops(enemy) {
      const drops = [], bonus = this.traitDropRateBonus();
      (enemy.dropTable || []).forEach(d => { if (Math.random() < Math.min(1, (Number(d.chance) || 0) + bonus)) drops.push([d.itemId, 1]); }); return drops;
    }
    applyRewards(reward) {
      this.profile.exp += reward.exp; this.profile.gold += reward.gold; Object.entries(reward.drops).forEach(([id, n]) => this.profile.inventory[id] = (this.profile.inventory[id] || 0) + n); this.recordEquipmentDiscovery(Object.keys(reward.drops)); const levels = [];
      // Material discovery → recipe unlock
      const unlockMap = D.materialUnlockMap || {};
      Object.keys(reward.drops).forEach(matId => {
        if (!(this.profile.discoveredMaterials || []).includes(matId)) {
          this.profile.discoveredMaterials = [...(this.profile.discoveredMaterials || []), matId];
          // materialUnlockMap（旧レシピ用）に加え、レシピ側の materialUnlockId も直接見る。
          // こうしないと map に書き忘れたレシピが永久に解放されない。
          const byField = Object.values(D.recipes || {}).filter(r => r.materialUnlockId === matId).map(r => r.id);
          const recipeIds = [...new Set([...(unlockMap[matId] || []), ...byField])];
          recipeIds.forEach(rid => {
            if (!(this.profile.unlockedRecipes || []).includes(rid)) {
              this.profile.unlockedRecipes = [...(this.profile.unlockedRecipes || []), rid];
              this.profile.newlyUnlockedRecipes = [...(this.profile.newlyUnlockedRecipes || []), rid];
              this.battleRewards.newRecipes = [...(this.battleRewards.newRecipes || []), rid];
            }
          });
        }
      });
      // キャラクターLvは廃止。強さは武器学・ジョブLv・HP/MP成長で表現する。
      // profile.exp / profile.level はセーブ互換のため残すが、レベルアップ処理は行わない。
      this.syncSkillUnlocks();
      if (levels.length) { const stats = this.totalStats(); this.profile.currentVitals = { hp: stats.maxHp, mp: stats.maxMp }; if (this.player) { this.player.stats = stats; this.player.hp = stats.maxHp; this.player.mp = stats.maxMp; } } else this.persistVitals();
      this.saveProfile(); return levels;
    }
    isRecipeUnlocked(recipe) { if (!this.isPlayerContentVisible(recipe)) return false; if (!recipe.materialUnlockId) return true; return (this.profile.unlockedRecipes || []).includes(recipe.id); }
    grantJobExp(amount) { const jobId = this.profile.currentJob, job = D.jobs[jobId], progress = this.profile.jobs[jobId], from = progress.level, learnedBefore = new Set(this.profile.learnedJobSkills || []); const raw = Math.max(0, amount) / 4 + (progress.expCarry || 0), gained = Math.floor(raw); progress.expCarry = raw - gained; progress.exp += gained; while (progress.level < D.jobLevelCap) { const need = this.jobExpNeeded(progress.level); if (!need || progress.exp < need) break; progress.exp -= need; progress.level++; } if (progress.level >= D.jobLevelCap) { progress.exp = 0; progress.expCarry = 0; this.markJobMastered(jobId); } const gainedLevels = progress.level - from; const statGain = gainedLevels > 0 ? this.applyJobLevelGrowth(jobId, gainedLevels) : null; if (progress.level >= D.jobLevelCap) this.recordPhantomGrowth(jobId); const newPassives = gainedLevels > 0 ? this.grantJobPassives(jobId, progress.level) : []; const reinforcedPassives = gainedLevels > 0 ? this.reinforceJobPassives(jobId, progress.level) : []; this.syncSkillUnlocks(); const learned = (this.profile.learnedJobSkills || []).filter(id => !learnedBefore.has(id)); this.saveProfile(); return { jobId, jobName: job.name, jobNameEn: job.nameEn, exp: gained, from, to: progress.level, learned, statGain, newPassives, reinforcedPassives }; }
    jobResultHTML(result) { if (!result) return ''; return `<div class="job-result"><small>JOB EXPERIENCE</small><strong>${result.jobName}</strong><span>JEXP <b>+${result.exp}</b></span>${result.to > result.from ? `<h3>JOB LEVEL UP!　Lv.${result.from} → Lv.${result.to}</h3>` : ''}${result.learned.length ? `<div>${result.learned.map(id => `<b>NEW SKILL　${D.skills[id].name}</b>`).join('')}</div>` : ''}${result.reinforcedPassives?.length ? `<div>${result.reinforcedPassives.map(row => `<b>PASSIVE UP　${row.skill.name}　段階${row.rank}</b>`).join('')}</div>` : ''}</div>`; }
    rewardHTML(reward, levels) {
      const drops = Object.entries(reward.drops); let html = `<div class="reward-summary"><span>EXP <b>+${reward.exp}</b></span><span>GOLD <b>+${reward.gold}</b></span></div>`;
      html += `<div class="drop-list"><h3>DROPS</h3>${drops.length ? drops.map(([id,n]) => { const i=D.items[id]; return `<p class="rarity-${i.rarity}">${i.name}<b>×${n}</b></p>`; }).join('') : '<p>ドロップなし</p>'}</div>`;
      levels.forEach(l => { const keys = ['maxHp','maxMp','mag','mnd','str','vit']; html += `<div class="level-up"><h3>LEVEL UP!</h3><strong>LV ${l.from} → ${l.to}</strong><div>${keys.map(k => `<span>${statLabels[k]} <b>${l.before[k]} → ${l.after[k]}</b></span>`).join('')}</div></div>`; }); return html;
    }
    scoreGetHTML(id) { const score = D.musicScores?.[id]; return score ? `<div class="score-get"><small>SCORE GET</small><strong>${score.title}</strong><b>（${score.subtitle}）</b><span>演奏可能になった</span><em>PRIVATE MODE ITEM</em></div>` : ''; }
    bossKeyRewardHTML(items = [], unlocks = []) {
      const entries = items.filter(Boolean);
      if (!entries.length && !unlocks.length) return '';
      const rows = entries.map(item => `<article><small>KEY ITEM</small><b>《${item.name}》</b><span>${item.unlockNote || item.description || ''}</span></article>`).join('');
      const unlockRows = unlocks.filter(Boolean).map(text => `<em>${text}</em>`).join('');
      return `<section class="boss-key-reward"><small>KEY ITEM GET ×${entries.length}</small><div>${rows}</div>${unlockRows ? `<footer>${unlockRows}</footer>` : ''}</section>`;
    }
    bossSeriesUnlockHTML(seriesId, extra = '') {
      const series = D.bossEquipmentSeries?.[seriesId];
      if (!series) return '';
      return `<div class="boss-recipe-unlock"><small>PHANTOM STEAL SUCCESS</small><b>NEW BOSS EQUIPMENT</b><strong>《${series.nameJa || series.name}》</strong><span>盗奪した力を製法へ変換した。工房の BOSS EQUIPMENT に${series.equipment?.length || 0}種の装備が出現！${extra}</span></div>`;
    }
    jobUnlockTutorialHTML(jobId) {
      const job = D.jobs?.[jobId], guide = D.jobUnlockTutorials?.[jobId];
      if (!job || !guide) return '';
      const proof = D.items?.[guide.proofItemId];
      return `<section class="job-unlock-tutorial"><header><small>JOB TUTORIAL</small><b>${job.name}</b><span>${job.nameEn || jobId}</span></header><p>${guide.role}</p><div><small>おすすめ運用</small><strong>${guide.build}</strong></div><ul>${(guide.tips || []).map(tip => `<li>${tip}</li>`).join('')}</ul>${proof ? `<footer>《${proof.name}》の力が解放された</footer>` : ''}</section>`;
    }
    showBossRewardSequence(victory, stages = []) {
      const queue = stages.filter(stage => stage?.html);
      const showStage = index => {
        const stage = queue[index];
        this.showResult(stage.title, stage.copy, stage.kicker, stage.html);
        if (index < queue.length - 1) {
          this.resultContinue = () => showStage(index + 1);
          $('#result-menu').innerHTML = '次へ <span>NEXT</span>';
        }
      };
      this.showResult(victory.title, victory.copy, victory.kicker, victory.html);
      if (queue.length) {
        this.resultContinue = () => showStage(0);
        $('#result-menu').innerHTML = '次へ <span>NEXT</span>';
      }
    }
    bossMaterialDropRows(enemy) {
      return (enemy?.dropTable || []).filter(row => D.items?.[row.itemId]?.category === 'material');
    }
    offerRepeatBossMaterialDrop(enemy, firstClear) {
      if (firstClear || !enemy || !window.arseneQOffer?.canUse?.('bossDrop')) return false;
      const rows = this.bossMaterialDropRows(enemy); if (!rows.length) return false;
      setTimeout(() => window.arseneQOffer.show('bossDrop', {
        title: `${enemy.name} 素材追跡`,
        copy: '広告を見て、このボスの素材だけをもう一度追加抽選する。装備品は対象外。',
        onGrant: () => {
          const drops = {};
          rows.forEach(row => { if (Math.random() < clamp(Number(row.chance) || 0, 0, 1)) drops[row.itemId] = (drops[row.itemId] || 0) + 1; });
          const entries = Object.entries(drops);
          if (!entries.length) { window.arseneStartFlow?.toast?.('追加抽選：素材は見つからなかった'); return; }
          this.applyRewards({ exp: 0, gold: 0, drops });
          entries.forEach(([id, n]) => { this.battleRewards.drops[id] = (this.battleRewards.drops[id] || 0) + n; });
          const names = entries.map(([id, n]) => `${D.items[id]?.name || id} ×${n}`).join(' / ');
          document.querySelector('#rewards')?.insertAdjacentHTML('beforeend', `<div class="boss-result-note"><b>Q'S OFFER // BOSS MATERIAL</b><br>${names}</div>`);
          window.arseneStartFlow?.toast?.(`追加素材：${names}`);
        }
      }), 450);
      return true;
    }
    async victory() {
      const quick = !!this.quickResolving;
      this.profile.flags.consecutiveDefeats = 0; this.profile.flags.lastBattleResult = 'victory';
      this.finished = true; this.pauseAutoBattle(); this.audio.sfx('victory'); this.flashTitle('VICTORY', 'ALL SHADOWS ELIMINATED'); $('#ren').classList.add('victory'); await this.battleSleep(quick ? 120 : 1100);
      const reward = { exp: this.battleRewards.exp, gold: this.battleRewards.gold, drops: this.battleRewards.drops }, levels = this.battleRewards.levels;
      const masteryParts = this.battleRewards.masteryResults || [], jobParts = this.battleRewards.jobResults || [];
      const masteryResult = masteryParts.length ? { ...masteryParts[0], gain: masteryParts.reduce((s, r) => s + r.gain, 0), before: masteryParts[0].before, after: masteryParts[masteryParts.length - 1].after, leveled: masteryParts.some(r => r.leveled) } : null;
      const jobResult = jobParts.length ? { ...jobParts[0], exp: jobParts.reduce((s, r) => s + r.exp, 0), from: jobParts[0].from, to: jobParts[jobParts.length - 1].to, learned: [...new Set(jobParts.flatMap(r => r.learned || []))] } : null;
      if (jobResult) {
        const titleParts = jobParts.map(r => r.titleGain).filter(Boolean);
        if (titleParts.length) jobResult.titleGain = { ...titleParts[0], amount: titleParts.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) };
      }
      const newRecipeHTML = (this.battleRewards.newRecipes || []).map(rid => { const r = D.recipes[rid], item = D.items[r?.resultItemId]; return r && item ? `<div class="new-recipe-unlock"><small>NEW RECIPE</small><b>${item.name}</b><span>${item.nameEn || ''}</span><em>工房で製作可能になった</em></div>` : ''; }).join('');
      // HP/MPは戦闘終了時判定。武器学EXPは行動時、JOB EXPは撃破時に加算済み。
      const vitalResult = this.rollVitalGrowth();
      this.updateHUD();
      if (vitalResult?.hp && !quick) this.queueGrowthBubble('HP UP!', `最大HP +${vitalResult.hp}`);
      if (vitalResult?.mp && !quick) this.queueGrowthBubble('MP UP!', `最大MP +${vitalResult.mp}`);
      if (this.growthBubbleQueue && !quick) await this.growthBubbleQueue;
      const pt = this.profile.playtest; if (pt) { pt.battles = (pt.battles || 0) + 1; if (masteryResult) pt.weaponUse[masteryResult.type] = (pt.weaponUse[masteryResult.type] || 0) + 1; }
      const sparks = this.battleSparks || []; this.battleSparks = [];
      this.saveProfile(); this.persistVitals(); this.updateHUD();
      const rewardBlock = `${this.battleRewards.quickReport || ''}${this.rewardHTML(reward, levels)}${this.growthResultHTML(masteryResult, vitalResult, sparks)}${this.jobResultHTML(jobResult)}${newRecipeHTML}`;
      if (this.activeBossOverdrive?.level && this.handleBossOverdriveVictory?.(rewardBlock)) return;
      // 初回クリア演出を邪魔せず、通常の再戦勝利時だけボス素材の追加抽選を提案する。
      if (['myrthi', 'seripes', 'astact', 'ostina'].includes(this.battleMode) && this.isBossDefeated(this.battleMode)) {
        this.offerRepeatBossMaterialDrop(D.enemies[this.battleMode], false);
      }
      let milestone = null;
      if (this.battleMode === 'slime') {
        const firstClear = !this.isDungeonFirstClearComplete(this.currentDungeonId), floor = this.activeFloor(this.currentDungeonId), beforeWins = floor ? this.floorWins(floor.id) : this.progressState().wins;
        if (floor) this.recordFloorWin(floor.id);
        if (this.currentDungeonId !== 'dungeon1') { const key = `${this.currentDungeonId}BattleWins`; this.profile.flags[key] = (this.profile.flags[key] || 0) + 1; } else { if (this.profile.flags.noelFirstEncounterCleared) this.profile.flags.postNoelBattleWins = (this.profile.flags.postNoelBattleWins || 0) + 1; else this.profile.flags.preNoelBattleWins = (this.profile.flags.preNoelBattleWins || 0) + 1; this.profile.flags.normalBattleWins = (this.profile.flags.normalBattleWins || 0) + 1; }
        if (firstClear && floor && beforeWins < (floor.winsToClear ?? 33) && this.isFloorCleared(floor.id)) {
          const midBoss = this.dungeonMidBossEntry(this.currentDungeonId), boss = this.dungeonBossEntry(this.currentDungeonId), floors = this.floorsOf(this.currentDungeonId) || [], index = floors.findIndex(f => f.id === floor.id), next = floors.slice(index + 1).find(f => this.isFloorUnlocked(f.id));
          if (midBoss && !midBoss.cleared) milestone = { type: 'boss', key: midBoss.key, name: midBoss.name, title: midBoss.title };
          else if (boss && !boss.cleared) milestone = { type: 'boss', key: boss.key, name: boss.name, title: boss.title };
          else if (next) milestone = { type: 'floor', currentFloorId: floor.id, nextFloorId: next.id, nextFloorName: next.name };
        } else if (firstClear && !floor) {
          const after = this.progressState();
          if (beforeWins < after.goal && after.ready) milestone = { type: 'boss', key: after.phase === 'noel' ? 'noel' : 'zenakado', name: after.bossName, title: 'BOSS ENCOUNTER' };
        }
        this.saveProfile();
      }
      if (this.battleMode === 'zenakado') { const firstClear = !this.isBossDefeated('zenacad'), firstScore = !this.profile.flags.zenakadoScoreClaimed; this.markBossDefeated('zenacad'); this.profile.flags.zenakadoDefeated = false; this.profile.flags.postNoelBattleWins = 0; this.profile.flags.temporaryBossCompleted = true; this.noteBossRematchSnapshot('zenakado'); const stageOne = this.grantStageOneReward(); if (firstScore) { this.profile.musicScores.cadenzaLoot = true; this.profile.flags.zenakadoScoreClaimed = true; } this.saveProfile(); const keyItems = stageOne ? [...(stageOne.keyItems || []), stageOne.weapon].filter(Boolean) : []; const unlocks = stageOne ? [...(stageOne.jobs || []).map(job => `NEW JOB　${job.name}`), stageOne.weaponType ? `NEW WEAPON MASTERY　${stageOne.weaponType.name}` : ''].filter(Boolean) : []; this.showBossRewardSequence({ title: 'VICTORY', copy: '独奏卿ゼナカドを打ち倒した。', kicker: 'BOSS CLEARED', html: rewardBlock }, [firstScore && { title: 'SCORE GET', copy: '盗んだ旋律は、プライベートモードで演奏できる。', kicker: 'PHANTOM SCORE', html: this.scoreGetHTML('cadenzaLoot') }, firstClear && { title: 'KEY ITEM GET', copy: 'ゼナカドから奪った3つの力が、新たな可能性を開く。', kicker: 'STOLEN REWARDS', html: this.bossKeyRewardHTML(keyItems, unlocks) }, firstClear && { title: 'JOB TUTORIAL', copy: '解放されたJOBの戦い方を確認する。', kicker: 'MAGIC KNIGHT', html: this.jobUnlockTutorialHTML('magicKnight') }, firstClear && { title: 'PHANTOM STEAL', copy: '奪った力を解析し、工房の製法へ変換した。', kicker: 'NEW RECIPES STOLEN', html: this.bossSeriesUnlockHTML('zenacad', ' JOB SYSTEM も解放された。') }]); this.offerRepeatBossMaterialDrop(D.enemies.zenakado, firstClear); return; }
      if (this.battleMode === 'myrthi') { const firstClear = !this.isBossDefeated('myrthi'), firstScore = !this.profile.musicScores?.rhythm, myrthiReward = this.grantMyrthiFirstReward(); this.markBossDefeated('myrthi'); this.profile.flags.dungeon2BattleWins = (this.profile.flags.dungeon2BattleWins || 0) + 1; this.profile.flags.dungeon2Clear = true; this.profile.musicScores ||= {}; if (firstScore) this.profile.musicScores.rhythm = true; this.noteBossRematchSnapshot('myrthi'); this.saveProfile(); const keyItems = myrthiReward ? [myrthiReward.item, myrthiReward.extraItem].filter(Boolean) : []; const unlocks = myrthiReward?.job ? [`NEW JOB　${myrthiReward.job.name}`, 'REBIRTH UNLOCKED'] : []; this.showBossRewardSequence({ title: 'VICTORY', copy: '黒紅の双刃戦姫ミルティを打ち倒した。', kicker: 'BOSS CLEARED', html: rewardBlock }, [firstScore && { title: 'SCORE GET', copy: '盗んだ旋律は、プライベートモードで演奏できる。', kicker: 'PHANTOM SCORE', html: this.scoreGetHTML('rhythm') }, firstClear && { title: 'KEY ITEM GET', copy: '双刃士の力と、輪廻への鍵を盗み出した。', kicker: 'STOLEN REWARDS', html: this.bossKeyRewardHTML(keyItems, unlocks) }, firstClear && { title: 'JOB TUTORIAL', copy: '解放されたJOBの戦い方を確認する。', kicker: 'DUAL BLADE', html: this.jobUnlockTutorialHTML('dualBlade') }, firstClear && { title: 'PHANTOM STEAL', copy: '奪った戦姫の力を、工房の製法へ変換した。', kicker: 'NEW RECIPES STOLEN', html: this.bossSeriesUnlockHTML('myrthi') }]); return; }
      if (this.battleMode === 'versicrell') { const firstClear = !this.isBossDefeated('versicrell'); this.markBossDefeated('versicrell'); this.saveProfile(); const note = firstClear ? '<div class="boss-recipe-unlock"><small>MID BOSS CLEARED</small><b>SILVER CIRCLE BROKEN</b><strong>D3後半ルート解放</strong><span>ヴェルシクレルの銀環を突破した。崩界の深廊をさらに進める。</span></div>' : ''; this.showResult('VICTORY', '《銀環異奏体》ヴェルシクレルを撃破した！', 'SILVER CIRCLE // COMPLETE', `${rewardBlock}${note}`); this.offerRepeatBossMaterialDrop(D.enemies.versicrell, firstClear); return; }
      if (this.battleMode === 'seripes') { const firstClear = !this.isBossDefeated('seripes'), firstScore = !this.profile.musicScores?.reprise, unlocked = this.grantSeripesFirstReward(); this.markBossDefeated('seripes'); this.profile.musicScores ||= {}; if (firstScore) this.profile.musicScores.reprise = true; this.noteBossRematchSnapshot('seripes'); this.saveProfile(); const keyItems = firstClear ? [D.items.guardianProof, D.items.guardianAegis] : []; const unlocks = firstClear ? ['NEW JOB　守護士', 'NEW WEAPON MASTERY　盾学'] : []; this.flashTitle('REPRISE...', 'THE AEGIS SHATTERS'); this.showBossRewardSequence({ title: 'VICTORY', copy: '不落の反奏騎士セリペスの盾が白い光となって砕けた。', kicker: 'THIRD MAESTRI DEFEATED', html: rewardBlock }, [firstScore && { title: 'SCORE GET', copy: '盗んだ旋律は、プライベートモードで演奏できる。', kicker: 'PHANTOM SCORE', html: this.scoreGetHTML('reprise') }, firstClear && { title: 'KEY ITEM GET', copy: '守護士の証と反奏の白盾を盗み出した。', kicker: 'STOLEN REWARDS', html: this.bossKeyRewardHTML(keyItems, unlocks) }, firstClear && { title: 'JOB TUTORIAL', copy: '解放されたJOBの戦い方を確認する。', kicker: 'GUARDIAN', html: this.jobUnlockTutorialHTML('guardian') }, firstClear && { title: 'PHANTOM STEAL', copy: '奪った守護者の力を、工房の製法へ変換した。', kicker: 'NEW RECIPES STOLEN', html: this.bossSeriesUnlockHTML('seripes', ' 守護士・戦士向けの装備が製作可能。') }]); return; }
      if (['d4MidBoss', 'd5MidBoss'].includes(this.battleMode)) { const e = D.enemies[this.battleMode], firstClear = !this.isBossDefeated(this.battleMode); this.markBossDefeated(this.battleMode); this.saveProfile(); const note = firstClear ? `<div class="boss-recipe-unlock"><small>MID BOSS CLEARED</small><b>ROUTE OPEN</b><strong>${e.name} 撃破</strong><span>封鎖された後半ルートが解放された。</span></div>` : ''; this.showResult('VICTORY', `${e.name}を撃破した！`, 'MID BOSS // COMPLETE', `${rewardBlock}${note}`); this.offerRepeatBossMaterialDrop(e, firstClear); return; }
      if (['astact', 'ostina'].includes(this.battleMode)) { const bossId = this.battleMode, isD4 = bossId === 'astact', dungeonId = isD4 ? 'dungeon4' : 'dungeon5', jobId = isD4 ? 'ronin' : 'hunter', proofId = isD4 ? 'roninProof' : 'hunterProof', scoreId = isD4 ? 'staccato' : 'ostinato', firstClear = !this.isBossDefeated(bossId), firstScore = !this.profile.musicScores?.[scoreId]; this.markBossDefeated(bossId); this.profile.flags[`${dungeonId}Clear`] = true; this.profile.musicScores ||= {}; if (firstScore) this.profile.musicScores[scoreId] = true; if (firstClear) { this.profile.inventory[proofId] = Math.max(1, this.profile.inventory[proofId] || 0); this.profile.unlockedJobs = [...new Set([...(this.profile.unlockedJobs || []), jobId])]; this.profile.jobs[jobId] ||= { level: 1, exp: 0 }; if (!isD4) { this.profile.weaponMastery.bow ||= { level: 1, exp: 0 }; this.profile.inventory.d5HunterBow = Math.max(1, this.profile.inventory.d5HunterBow || 0); } } this.noteBossRematchSnapshot(bossId); this.saveProfile(); const e = D.enemies[bossId], keyItems = firstClear ? [D.items[proofId], !isD4 && D.items.d5HunterBow].filter(Boolean) : [], unlocks = firstClear ? [`NEW JOB　${D.jobs[jobId]?.name || jobId}`, !isD4 ? 'NEW WEAPON MASTERY　弓学' : '刀技は剣武器学を共有'] : []; this.showBossRewardSequence({ title: 'VICTORY', copy: `${e.title || ''}${e.name}を打ち倒した。`, kicker: isD4 ? 'FOURTH MAESTRI DEFEATED' : 'FIFTH MAESTRI DEFEATED', html: rewardBlock }, [firstScore && { title: 'SCORE GET', copy: '盗んだ旋律は、プライベートモードで演奏できる。', kicker: 'PHANTOM SCORE', html: this.scoreGetHTML(scoreId) }, firstClear && { title: 'KEY ITEM GET', copy: '新たなJOBへ至る証を盗み出した。', kicker: 'STOLEN REWARDS', html: this.bossKeyRewardHTML(keyItems, unlocks) }, firstClear && { title: 'JOB TUTORIAL', copy: '解放されたJOBの戦い方を確認する。', kicker: (D.jobs[jobId]?.nameEn || jobId).toUpperCase(), html: this.jobUnlockTutorialHTML(jobId) }]); return; }
      if (milestone) this.showStagedMilestone(rewardBlock, milestone);
      else await this.showBattleClear(reward, levels, jobResult, { mastery: masteryResult, vitals: vitalResult, sparks });
    }
    async showBattleClear(reward, levels, jobResult, growth = null) {
      this.locked = false;
      const drops = Object.entries(reward.drops), parts = [`EXP <b>+${reward.exp}</b>`, `GOLD <b>+${reward.gold}</b>`];
      if (growth?.mastery) { const n = this.weaponTypeName(growth.mastery.type); parts.push(`${n}熟練度 <b>+${growth.mastery.gain}</b>${growth.mastery.leveled ? ` / ${n}武器学 Lv.${growth.mastery.before}→<b>Lv.${growth.mastery.after}</b>` : ''}`); }
      if (growth?.vitals?.hp) parts.push(`最大HP <b>+${growth.vitals.hp}</b>`);
      if (growth?.vitals?.mp) parts.push(`最大MP <b>+${growth.vitals.mp}</b>`);
      (growth?.sparks || []).forEach(s => parts.push(`NEW TECH <b>${s.name}</b>`));
      if (drops.length) parts.push(drops.map(([id, n]) => `${D.items[id]?.name || id} ×${n}`).join(' / '));
      if (levels.length) parts.push(`LEVEL UP! → LV.${levels[levels.length - 1].to}`);
      if (jobResult) parts.push(`JEXP <b>+${jobResult.exp}</b>${jobResult.to > jobResult.from ? ` / ${jobResult.jobName} Lv.${jobResult.to}` : ''}`);
      $('#log').innerHTML = `<p>${parts.join('　')}</p>`; $('#phase-label').textContent = 'CLEARED'; this.showQuickResultPopup();
      const boss = this.resultBossRematchEntry();
      const bossButton = boss ? this.button('ボス戦へ', `BOSS // ${boss.name}`, 'bossBattle') : '';
      this.panel(this.button('次の戦闘へ', 'NEXT BATTLE', 'next') + bossButton + this.button('拠点へ戻る', 'HIDEOUT', 'hideout'));
      this.bindActions({ next: () => { $('#ren').classList.remove('victory'); this.startBattle(); }, bossBattle: () => this.startBossByKey(boss.key), hideout: () => this.showMenu('home') });
    }
    async defeat() {
      this.finished = true; this.endAutoBattle(); this.audio.stopMusic(500); this.audio.sfx('defeat'); $('#ren').classList.add('down');
      if (this.battleMode === 'debugOverpower') { const damage = this.enemies[0]?.debugDamageTaken || 0, turns = this.turn, resonance = this.player?.resonance || 0; this.restoreDebugBattle(); this.flashTitle('TEST COMPLETE', 'GUARDIAN ENDURANCE'); await this.battleSleep(700); this.showResult('TEST COMPLETE', 'HP無限の強敵検証体に敗北。開始前のセーブ状態へ戻した。', 'DEBUG RESULT', `<div class="boss-result-note"><b>生存 ${turns} ACTION</b><br>総与ダメージ ${Math.round(damage).toLocaleString('ja-JP')}<br>最終RESONANCE ${resonance.toFixed(1)}%</div>`); return; }
      // まかない系は敗北した時点で失効。デバッグ検証は上でセーブを巻き戻すため対象外。
      if (this.activeMealBuffType()) this.clearMealBuff();
      if (this.battleMode === 'noel') { const stats = this.totalStats(); this.profile.flags.noelFirstEncounterCleared = true; this.profile.flags.preNoelBattleWins = Math.max(this.profile.flags.preNoelBattleWins || 0, D.battleProgression.noelEncounterWins); this.profile.flags.postNoelBattleWins = 0; this.profile.currentVitals = { hp: stats.maxHp, mp: stats.maxMp }; this.player.hp = stats.maxHp; this.player.mp = stats.maxMp; this.saveProfile(); this.flashTitle('DEFEAT', 'NOËL — THE ETERNAL JUDGE'); await this.battleSleep(1000); this.showResult('DEFEAT', '圧倒的な裁定の前に敗れた。ノエルは姿を消し、全回復して拠点へ帰還した。', 'THE NEXT KEY', '<div class="workshop-unlock"><b>PHANTOM WORKSHOP</b><strong>工房が解放された！</strong><span>敗北の記録を解析し、装備製作機能が使用可能になりました。</span></div>'); return; }
      const rollback = this.rollbackToCheckpoint();
      if (rollback) { this.battleRewards.checkpointNotice = `<div class="checkpoint-loss"><small>SAFE ZONE ROLLBACK</small><b>${rollback.before + 1}戦目で敗北 → ${rollback.nextBattle}戦目から再開</b><span>直前のセーフゾーン（${rollback.after}戦突破）まで進行度が戻りました。</span></div>`; this.saveProfile(); }
      this.player.hp = 1; this.profile.flags.lastBattleResult = 'defeat'; this.profile.flags.consecutiveDefeats = (this.profile.flags.consecutiveDefeats || 0) + 1; this.persistVitals(); if (this.battleMode === 'zenakado') { this.flashTitle('DEFEAT', 'ZENAKADO WINS'); this.showDefeatWithRevive('ゼナカドに敗れた。', 'CHALLENGE FAILED'); return; }
      if (this.battleMode === 'myrthi') { this.flashTitle('DEFEAT', 'MYRTHI WINS'); this.showDefeatWithRevive('ミルティに敗れた。', 'CHALLENGE FAILED'); return; }
      if (this.battleMode === 'versicrell') { this.flashTitle('DEFEAT', 'SILVER CIRCLE CONTINUES'); this.showDefeatWithRevive('ヴェルシクレルの銀環を崩せなかった。', 'MID BOSS FAILED'); return; }
      if (this.battleMode === 'seripes') { this.flashTitle('DEFEAT', 'SERIPES // REPRISE'); this.showDefeatWithRevive('セリペスの反奏を崩せなかった。', 'CHALLENGE FAILED'); return; }
      this.flashTitle('GAME OVER', 'MISSION FAILED'); this.showGameOverOrRevive('戦闘不能になった。カズに救助され、HP1で拠点へ運び込まれた。', 'RETURN TO HIDEOUT', this.battleSummaryHTML() || '');
    }
    showDefeatWithRevive(copy, kicker = 'CHALLENGE FAILED') { this.showGameOverOrRevive(copy, kicker, this.battleSummaryHTML() || '<div class="boss-result-note">報酬・ドロップなし</div>'); }
    showGameOverOrRevive(copy, kicker, html) { const showGameOver = () => { this.clearBossOverdriveChallenge?.(); this.showResult('GAME OVER', copy, kicker, html); }; if (!this.showReviveOfferIfAvailable(showGameOver)) showGameOver(); }
    showReviveOfferIfAvailable(onDecline) { const offer = window.arseneQOffer; if (!offer?.canUse?.('revive')) return false; return offer.show('revive', { onGrant: () => this.reviveAfterAdNoise(), onClose: onDecline }); }
    reviveAfterAdNoise() { return this.reviveAfterDefeat(); }
    reviveAfterDefeat() { const maxHp = this.player?.stats?.maxHp || this.totalStats().maxHp; this.finished = false; this.locked = false; this.player.hp = Math.max(1, Math.ceil(maxHp * .5)); this.persistVitals(); const result = $('#result'); result.hidden = true; result.style.display = 'none'; $('#ren').classList.remove('down'); $('#ren').classList.add('idle'); const dungeon = this.getDungeon(this.currentDungeonId); this.audio.playTrack(dungeon?.music || this.battleMusic); this.updateHUD(); this.setLog(`${this.playerName()}はHP50%で立ち上がった！`); this.flashTitle('REVIVE', 'PHANTOM RISES AGAIN'); this.showMainCommands(); }
    showResult(title, copy, kicker, html) { this.pauseAutoBattle(); this.locked = false; this.resultContinue = null; $('#result-title').textContent = title; $('#result-copy').textContent = copy; $('#result-kicker').textContent = kicker; $('#rewards').innerHTML = html; const resultMenu = $('#result-menu'); resultMenu.hidden = false; resultMenu.style.display = ''; resultMenu.innerHTML = '拠点へ <span>HIDEOUT</span>'; $('#result').hidden = false; $('#result').style.display = 'grid'; }
    showStagedMilestone(rewardBlock, milestone) { this.showResult('VICTORY', '闇を切り裂き、戦利品を獲得した。', 'BATTLE COMPLETE', rewardBlock); this.resultContinue = () => this.showMilestonePopup(milestone); $('#result-menu').innerHTML = '次へ <span>NEXT</span>'; }
    showMilestonePopup(milestone) {
      if (milestone.type === 'floor') this.showResult('ROUTE OPEN', '次の階層に行けるようになりました', 'SAFE ZONE REACHED', `<div class="milestone-popup"><small>NEXT FLOOR UNLOCKED</small><strong>${milestone.nextFloorName}</strong><span>ここまでの進行度はセーフゾーンに記録されました。</span></div><div class="result-actions"><button data-result-action="next-floor" data-target="${milestone.nextFloorId}">進む<small>NEXT FLOOR</small></button><button data-result-action="continue-floor" data-target="${milestone.currentFloorId}">そのまま戦闘<small>KEEP FIGHTING</small></button><button data-result-action="hideout">拠点へ戻る<small>HIDEOUT</small></button></div>`);
      else this.showResult('BOSS APPEARS', 'ボスが出現しました', 'WARNING // BOSS SIGNAL', `<div class="milestone-popup boss-arrival-popup"><small>BOSS ENCOUNTER</small><strong>${milestone.name}</strong><span>${milestone.title || ''}</span></div><div class="result-actions"><button class="danger" data-result-action="boss-now" data-target="${milestone.key}">すぐに戦闘<small>ENGAGE</small></button><button data-result-action="hideout">拠点へ戻る<small>HIDEOUT</small></button></div>`);
      $('#result-menu').hidden = true;
    }
    handleResultAction(action, target) { if (action === 'hideout') { this.showMenu('home'); return; } if (action === 'boss-now') { this.startBossByKey(target); return; } if (action === 'next-floor' || action === 'continue-floor') { this.currentDungeonId = this.floorDungeonId(target) || this.currentDungeonId; this.currentFloorId = target; $('#ren').classList.remove('victory'); this.startBattle(); } }

    showMenu(panel = 'home') { if (this.player) this.persistVitals(); if (panel === 'home' && this.profile.flags?.owRestoreJobPending) this.restoreNormalDungeonJob(true); this.closeBattleMenu(); this.endAutoBattle(); if (panel === 'home' && this.activeMealBuffType()) { this.clearMealBuff(); this.saveProfile(); } const result = $('#result'), game = $('#game'), menu = $('#menu-screen'); result.hidden = true; result.style.display = 'none'; game.hidden = true; game.style.display = 'none'; menu.hidden = false; menu.style.display = 'block'; this.audio.playTrack(this.menuMusic); this.renderMenuSummary(); this.renderHideoutRouteStatus(); this.renderMenuPanel(panel); window.scrollTo({ top: 0, behavior: 'instant' }); if (panel === 'home') setTimeout(() => this.showKazuDialogue(), 600); }
    hideoutRouteStatus() {
      const available = (D.dungeons || []).filter(dungeon => this.isDungeonUnlocked(dungeon.id));
      const dungeon = available[available.length - 1] || this.getDungeon('dungeon1');
      const dungeonNo = String(dungeon?.id || 'dungeon1').replace('dungeon', 'D');
      const floors = this.floorsOf(dungeon?.id) || [];
      let current;
      if (floors.length) {
        const floor = this.activeFloor(dungeon.id) || floors[0];
        const floorIndex = Math.max(0, floors.findIndex(entry => entry.id === floor.id));
        const wins = this.floorWins(floor.id), goal = floor.winsToClear ?? 33;
        current = `${dungeonNo}・${floorIndex + 1}F　${Math.min(wins, goal)} / ${goal}`;
      } else {
        const progress = this.progressState();
        current = `${dungeonNo}　BATTLE ${Math.min(progress.wins, progress.goal)} / ${progress.goal}`;
      }

      let targetId = 'noelFirstEncounter', defeatedId = null;
      if (dungeon?.id === 'dungeon1') {
        const progress = this.progressState();
        targetId = progress.phase === 'noel' ? 'noelFirstEncounter' : 'zenakado';
        defeatedId = targetId === 'zenakado' ? 'zenacad' : null;
      } else if (dungeon?.id === 'dungeon2') {
        targetId = 'myrthi'; defeatedId = 'myrthi';
      } else if (dungeon?.id === 'dungeon3') {
        targetId = this.isBossDefeated('versicrell') ? 'seripes' : 'versicrell';
        defeatedId = targetId;
      }
      const encountered = this.hasMetEnemy(targetId)
        || (defeatedId && this.isBossDefeated(defeatedId))
        || (targetId === 'noelFirstEncounter' && !!this.profile.flags.noelFirstEncounterCleared);
      return { current, target: encountered ? (D.enemies[targetId]?.name || targetId) : '？？？' };
    }
    renderHideoutRouteStatus() {
      const status = this.hideoutRouteStatus(), current = $('#hideout-route-current'), target = $('#hideout-next-target');
      if (current) current.textContent = status.current;
      if (target) target.textContent = status.target;
    }
    renderMenuSummary() { const t = this.totalStats(), v = this.storedVitals(t), need = this.expNeeded(), workshopUnlocked = !!this.profile.flags.noelFirstEncounterCleared, progress = this.progressState();  $('#menu-hp').textContent = `${v.hp} / ${t.maxHp}`; $('#menu-mp').textContent = `${v.mp} / ${t.maxMp}`; $('#hideout-hp-bar').style.width = `${100 * v.hp / t.maxHp}%`; $('#hideout-mp-bar').style.width = `${100 * v.mp / t.maxMp}%`; $('#menu-gold').textContent = this.profile.gold.toLocaleString('ja-JP'); const mType = this.equippedWeaponType(), mst = this.masteryOf(mType), mNeed = this.masteryExpNeeded(mst.level), expPct = Math.min(100, 100 * mst.exp / mNeed); $('#menu-exp-text').textContent = `${expPct.toFixed(2)}%`; $('#menu-exp-bar').style.width = `${expPct}%`; const mLabel = $('#menu-exp-label'); if (mLabel) mLabel.textContent = `${this.weaponTypeName(mType)} Lv.${mst.level}`; const jid = this.profile.currentJob, jst = this.profile.jobs?.[jid] || {}, jlv = jst.level || 1, jneed = this.jobExpNeeded(jlv), jexp = jst.exp || 0, jpct = jneed ? Math.min(100, 100 * jexp / jneed) : 100; const jexpLabel = $('#menu-jexp-label'), jexpText = $('#menu-jexp-text'), jexpBar = $('#menu-jexp-bar'); if (jexpLabel) jexpLabel.textContent = `${D.jobs[jid]?.name || 'JOB'} Lv.${jlv}`; const mLv = $('#menu-level'); if (mLv) mLv.textContent = `${D.jobs[jid]?.name || 'JOB'} Lv.${jlv}`; if (jexpText) jexpText.textContent = jneed ? `${jpct.toFixed(2)}%` : 'MASTER'; if (jexpBar) jexpBar.style.width = `${jpct}%`; $('#workshop-nav').hidden = !workshopUnlocked; const bossButton = $('#menu-screen [data-menu="boss"]'), bossTitle = bossButton?.querySelector('b'); const d2p = this.dungeon2FloorProgress(), myrthiReady = this.isMyrthiUnlocked() && !this.isBossDefeated('myrthi'); if (myrthiReady) { bossButton.hidden = false; if (bossTitle) bossTitle.textContent = '黒紅の双刃を追う'; bossButton.querySelector('span').textContent = d2p.total ? `MYRTHI // ${d2p.floors} / ${d2p.total} 階 踏破` : `MYRTHI // BATTLE ${d2p.done} / ${d2p.goal}`; } else { bossButton.hidden = !progress.ready; if (bossTitle) bossTitle.textContent = progress.phase === 'noel' ? 'ノエルの反応を追う' : 'ゼナカドの旋律を追う'; bossButton.querySelector('span').textContent = `${progress.bossName} // BATTLE ${Math.min(progress.wins, progress.goal)} / ${progress.goal}`; } const buffEl = $('#hideout-buff'), meal = this.activeMealBuff(); buffEl.classList.toggle('active', !!meal); buffEl.querySelector('strong').textContent = this.mealEffectLabel(meal); buffEl.querySelector('span').textContent = meal ? `効果：${meal.name}／帰還・敗北まで有効` : 'カズのまかないで潜入を強化'; }
    renderMenuPanel(name) {
      [...$('#menu-nav').querySelectorAll('button')].forEach(b => b.classList.toggle('active', b.dataset.menu === name)); const panel = $('#menu-panel'); panel.hidden = name === 'home'; panel.dataset.panel = name; panel.classList.toggle('panel-tall', name !== 'home'); panel.scrollTop = 0; if (name === 'home') { panel.innerHTML = ''; return; }
      if (name === 'status') { this.renderStatusPanel(panel); return; }
      if (name === 'items') { this.renderItemsPanel(panel); panel.insertAdjacentHTML('afterbegin', '<button class="panel-home" data-menu="home">拠点へ戻る</button>'); return; }
      if (name === 'dungeon-select') { this.renderDungeonSelect(panel); return; }
      if (name === 'floor-select') { this.renderFloorSelect(panel, this.floorSelectDungeonId || 'dungeon2'); return; }
      if (name === 'equipment') this.renderEquipmentPanel(panel);
      if (name === 'workshop') this.renderWorkshop(panel);
      if (name === 'food') { const activeMeal = this.activeMealBuff(), makanai = D.foodMenu?.buffs?.makanai, sapporo = D.foodMenu?.buffs?.sapporoMiso, taiwan = D.foodMenu?.buffs?.taiwanMazesoba, price = this.mealPriceFor('makanai'), activeNote = activeMeal ? `<p class="meal-active-note">現在の効果：<b>${activeMeal.name}</b><span>別の麺を食べると、現在の効果は上書きになります。</span></p>` : '', adFoodOffer = window.arseneQOffer?.foodHTML?.() || '', sapporoUnlocked = this.isMealUnlocked('sapporoMiso'), sapporoPoor = this.profile.gold < this.mealPriceFor('sapporoMiso'), sapporoCard = sapporoUnlocked ? `<section class="food-special"><header><b>NEW MENU</b><span>ZENACAD CLEAR</span></header><div><strong>${sapporo.name}</strong><em>次の潜入中、獲得GOLD +10%</em><small>${sapporo.description}</small><button class="eat-food" data-eat-food="sapporoMiso" ${sapporoPoor ? 'disabled' : ''}>${sapporoPoor ? 'GOLD不足' : `${sapporo.price} GOLD で食べる`}</button></div></section>` : '', taiwanUnlocked = this.isMealUnlocked('taiwanMazesoba'), taiwanPoor = this.profile.gold < this.mealPriceFor('taiwanMazesoba'), taiwanNew = !!this.profile.flags.taiwanMazesobaNew, taiwanCard = taiwanUnlocked ? `<section class="food-special ${taiwanNew ? 'food-spark-new' : ''}"><header><b>${taiwanNew ? 'KAZU’S SPARK' : 'SPECIAL MENU'}</b><span>${taiwanNew ? 'NEW RECIPE' : 'GOLD BOOST'}</span></header><div><strong>${taiwan.name}</strong><em>次の潜入中、獲得GOLD +20%</em><small>${taiwan.description}</small><button class="eat-food" data-eat-food="taiwanMazesoba" ${taiwanPoor ? 'disabled' : ''}>${taiwanPoor ? 'GOLD不足' : `${taiwan.price} GOLD で食べる`}</button></div></section>` : '', coming = (D.foodMenu?.comingSoon || []).map(item => `<article class="food-coming-card" aria-disabled="true"><i aria-hidden="true"></i><b>${item.name}</b><span>COMING SOON</span></article>`).join('');
        // 売り物。所持数とは別に、セーブへ累計購入数を保持する。食べても在庫は復活しない。
        const shop = this.shopStock().map(it => { const have = this.profile.inventory[it.id] || 0, max = this.shopMaxStack(it), bought = this.shopPurchaseCount(it.id), limit = this.shopPurchaseLimit(it), soldOut = bought >= limit, isFull = have >= max, poor = this.profile.gold < it.price; const eff = it.effect?.hp ? `HP +${it.effect.hp}` : it.effect?.mp ? `MP +${it.effect.mp}` : ''; return `<article class="shop-card${soldOut ? ' sold-out' : ''}"><div class="shop-info"><b>${it.name}</b><em>${eff}</em><small>${it.description}</small></div><div class="shop-buy"><span class="shop-price">${it.price} G</span><span class="shop-have">所持 ${have} / ${max}</span><span class="shop-have">購入 ${bought} / ${Number.isFinite(limit) ? limit : '∞'}</span><button data-buy-item="${it.id}" ${soldOut || isFull || poor ? 'disabled' : ''}>${soldOut ? '売り切れ' : isFull ? '所持上限' : poor ? 'GOLD不足' : '買う'}</button></div></article>`; }).join('');
        panel.innerHTML = `<small>KAZU'S SPECIAL</small><h2>カズのまかない</h2>${activeNote}<div class="food-panel"><div class="food-bowl" aria-hidden="true"></div><div class="food-copy"><strong>${makanai.name}</strong><span>${makanai.description}</span><em>料金：所持GOLDの30％　<b>${price.toLocaleString('ja-JP')} GOLD</b></em><button class="eat-food" data-eat-food="makanai">まかないを食べる</button></div></div>${sapporoCard}${taiwanCard}<section class="food-shop"><header><b>持ち帰り</b><span>TAKEOUT</span></header><p class="shop-note">各商品は累計5個まで。使っても購入枠は戻らず、5個購入すると売り切れになります。</p><div class="shop-grid">${shop}</div></section><section class="food-coming"><header><b>NEXT MENU</b><span>COMING SOON</span></header><div>${coming}</div></section>`;
        if (adFoodOffer) (panel.querySelector('.meal-active-note') || panel.querySelector('h2'))?.insertAdjacentHTML('afterend', adFoodOffer);
        const rebirthTests = (D.foodMenu?.testItems || []).map(entry => {
          const item = D.items[entry.id], have = this.profile.inventory[entry.id] || 0, poor = this.profile.gold < entry.price;
          if (!item) return '';
          return `<article class="shop-card"><div class="shop-info"><b>${item.name}</b><em>${entry.label || 'TEST ITEM'}</em><small>${entry.description || item.description}</small></div><div class="shop-buy"><span class="shop-price">${entry.price} G</span><span class="shop-have">所持 ${have}</span><button data-buy-kazu-test="${entry.id}" ${poor ? 'disabled' : ''}>${poor ? 'GOLD不足' : '買う'}</button></div></article>`;
        }).join('');
        if (rebirthTests) {
          const testSection = document.createElement('section');
          testSection.className = 'food-shop food-test-stock';
          testSection.innerHTML = `<header><b>試練の品</b><span>TEST STOCK</span></header><p class="shop-note">転生の能力確認用。料理バフとは別枠で所持品へ追加されます。</p><div class="shop-grid">${rebirthTests}</div>`;
          panel.querySelector('.food-coming')?.before(testSection);
        }
        // ひらめいた料理は通常メニューから分離し、その場で裏メニューを開く。
        if (this.profile.flags.foodSecretMenuUnlocked && taiwanUnlocked) {
          const card = panel.querySelector('[data-eat-food="taiwanMazesoba"]')?.closest('.food-special');
          if (card) {
            const secret = document.createElement('section');
            secret.className = `food-secret-menu${taiwanNew ? ' newly-opened' : ''}`;
            secret.innerHTML = '<header><b>裏メニュー</b><span>SECRET MENU OPEN</span></header>';
            card.querySelector('header b').textContent = taiwanNew ? 'KAZU’S SPARK' : 'SECRET RECIPE';
            card.querySelector('header span').textContent = taiwanNew ? 'NEW RECIPE' : 'GOLD BOOST';
            card.querySelector('em').textContent = '次の潜入中、獲得GOLD +20%';
            secret.append(card);
            panel.querySelector('.food-shop').before(secret);
          }
        }
      }
      if (name === 'archive') { this.renderArchivePanel(panel); return; }
      if (name === 'job') this.renderJobPanel(panel);
      if (name === 'system') { this.renderSystemPanel(panel); return; }
      panel.insertAdjacentHTML('afterbegin', '<button class="panel-home" data-menu="home">拠点へ戻る</button>');
      if (name === 'food') {
        const home = panel.querySelector('.panel-home'), adMenu = panel.querySelector('.q-food-ad-menu');
        if (home && adMenu) home.after(adMenu);
      }
    }
    jobSystemUnlocked() { return this.isBossDefeated('zenacad'); }
    jobBonusText(jobId) { const bonuses = this.activeJobBonuses(jobId), labels = { ...statLabels, critBonus: 'CRITICAL' }; return Object.entries(bonuses).map(([key, value]) => `${labels[key] || key} +${key === 'critBonus' ? `${Math.round(value * 100)}%` : value}`).join(' / ') || '補正なし'; }
    skillTargetText(skill) { return skill.target === 'all' ? '敵全体' : skill.target === 'self' ? '自分' : '敵単体'; }
    skillDetailHTML(id, learnedIds, activeIds) {
      const skill = D.skills[id]; if (!skill) return ''; const learned = learnedIds.has(id), active = activeIds.has(id), passive = skill.type === 'PASSIVE';
      return `<article class="job-skill ${learned ? '' : 'locked'} ${active ? 'active' : ''}"><header><div><small>${skill.nameEn || skill.id}</small><b>${skill.name}</b></div><em>${passive ? 'PASSIVE // AUTO' : active ? 'SET' : learned ? 'LEARNED' : 'LOCKED'}</em></header><dl><div><dt>種類</dt><dd>${skill.type || 'ACTIVE'}</dd></div><div><dt>消費MP</dt><dd>${skill.mp || 0}</dd></div><div><dt>威力</dt><dd>${skill.powerText || '－'}</dd></div><div><dt>対象</dt><dd>${this.skillTargetText(skill)}</dd></div></dl><p><strong>効果</strong>${skill.effectText || '追加効果なし'}</p><p>${skill.description || ''}</p>${learned && !passive ? `<button data-skill-toggle="${id}" class="${active ? 'remove' : ''}">${active ? 'ACTIVEから外す' : 'ACTIVEへセット'}</button>` : ''}</article>`;
    }
    renderJobPanel(panel) {
      this.syncSkillUnlocks();
      if (!this.jobUI) this.jobUI = { tab: 'job', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' };
      const ui = this.jobUI, unlocked = this.jobSystemUnlocked(), currentId = this.profile.currentJob, curJob = D.jobs[currentId];
      const titleTab = this.profile.titleSystem?.unlocked ? `<button class="job-tab${ui.tab === 'title' ? ' active' : ''}" data-job-tab="title">TITLE</button>` : '';
      const tabBar = `<div class="job-tabs"><button class="job-tab${ui.tab === 'job' ? ' active' : ''}" data-job-tab="job">JOB</button><button class="job-tab${ui.tab === 'abilitySet' ? ' active' : ''}" data-job-tab="abilitySet">ABILITY SET</button>${titleTab}</div>`;
      // キャラクターLvは廃止済み。現在のJOBとそのLvを出す。
      const hdr = `<div class="job-hdr"><div class="job-hdr-l"><small>JOB & ABILITY</small><b>${this.playerName()}</b><span>武器学 ${this.weaponTypeName(this.equippedWeaponType())} Lv.${this.masteryOf(this.equippedWeaponType()).level}</span></div><div class="job-hdr-r"><small>現在のJOB</small><strong>${curJob.name} Lv.${this.profile.jobs?.[currentId]?.level || 1}</strong></div></div>`;
      let body;
      // 描画中に例外が出ると本文が空のままになり、「タップしても何も起きない」ように見える。
      // 握りつぶさず、画面へ理由を出して一覧へ戻れるようにする。
      const safeBody = (build, label) => {
        try { return build(); }
        catch (error) {
          console.error(`[JOB] ${label} の描画に失敗`, error);
          // 原因を追えるように、メッセージと発生箇所をそのまま出す。
          const where = String(error?.stack || '').split('\n').slice(1, 3)
            .map(line => line.trim().replace(/^at\s+/, '').replace(/https?:\/\/[^/]+\//, ''))
            .join(' / ');
          return `<div class="jdetail"><button class="jback-btn" data-job-back>← JOB一覧</button>
            <div class="job-render-error">
              <b>${label}の表示でエラーが発生しました</b>
              <p>${String(error?.message || error)}</p>
              ${where ? `<em>${where}</em>` : ''}
            </div></div>`;
        }
      };
      if (ui.tab === 'job') { body = ui.detailId ? safeBody(() => this.jobDetailHtml(ui.detailId, unlocked, currentId), `JOB詳細（${D.jobs[ui.detailId]?.name || ui.detailId}）`) : safeBody(() => this.jobListHtml(unlocked, currentId), 'JOB一覧'); }
      else if (ui.tab === 'title' && this.titlePanelHtml) { this.titlePanelSource = 'job'; body = this.titlePanelHtml(); }
      else { body = this.abilitySetHtml(currentId); }
      let modal = '';
      if (ui.modal === 'skillDetail') modal = this.skillModalHtml(ui.skillDetailId);
      if (ui.modal === 'traitDetail') modal = this.traitModalHtml(ui.traitDetailJob, ui.traitDetailKey);
      else if (ui.modal === 'passiveSelect') modal = this.passiveModalHtml(ui.passiveSlotIdx);
      else if (ui.modal === 'actionSelect') modal = this.actionModalHtml(ui.actionSlotIdx);
      panel.innerHTML = `<div class="jpanel">${hdr}${tabBar}<div class="jpanel-body">${body}</div></div>${modal}`;
    }
    jobListHtml(unlocked, currentId) {
      // 未解放JOBはLOCKEDカードも出さず、解放された瞬間に初めて一覧へ追加する。
      // 上位JOBという区分は廃止。解放済みのJOBはすべて同じ並びに出す。
      const base = [...(D.startingJobIds || []), 'magicKnight', 'guardian', 'dualBlade'].filter(id => this.isJobUnlocked(id));
      const special = ['phantomThief'].filter(id => this.isJobUnlocked(id));
      // 解放判定は profile.unlockedJobs が唯一の情報源。初期ジョブを固定しない。
      const card = id => { const j = D.jobs[id]; if (!j) return ''; const p = this.profile.jobs[id] || { level: 1 }, avail = this.isJobUnlocked(id), isCur = id === currentId; return `<button class="jcard${isCur ? ' cur' : ''}${avail ? '' : ' locked'}" data-job-detail="${id}"><div class="jcard-name">${j.name}</div><div class="jcard-lv">${avail ? `Lv.${p.level}` : 'LOCKED'}</div></button>`; };
      // ダンジョン名はデータから引く。名前を変えても文言が追従する。
      const d1Name = this.getDungeon('dungeon1')?.name || 'ダンジョン1';
      const notice = this.isJobUnlocked('magicKnight') ? '' : `<p class="job-lock-notice">《${d1Name}》をクリアして《魔奏士の証》を入手すると、残りの基本JOBと魔奏士が解放されます。</p>`;
      const specialSec = special.length ? `<section class="jsec"><h4>特殊JOB</h4><div class="jgrid">${special.map(card).join('')}</div></section>` : '';
      return `${notice}<section class="jsec"><h4>基本JOB</h4><div class="jgrid">${base.map(card).join('')}</div></section>${specialSec}`;
    }
    jobDetailHtml(jobId, unlocked, currentId) {
      const j = D.jobs[jobId], p = this.profile.jobs[jobId] || { level: 1, exp: 0 }, avail = this.isJobUnlocked(jobId), isCur = jobId === currentId, need = this.jobExpNeeded(p.level), bar = need ? Math.round(100 * p.exp / need) : 100;
      const noGrow = this.isNoGrowthJob(jobId) || !!j.noGrowth;
      const bonuses = this.activeJobBonuses(jobId);
      // アビリティ一覧＝固有技＋パッシブ＋旧skillUnlocks＋条件つき専用技
      const abilityEntries = [];
      // 固有技は実際の習得JOB Lvで出す（Lv1固定にすると、画面は習得済でも戦闘で出ない食い違いが起きる）
      if (j.signatureSkillId && D.skills[j.signatureSkillId]) abilityEntries.push([D.skills[j.signatureSkillId].unlockJobLevel || 1, j.signatureSkillId]);
      Object.entries(j.passiveUnlocks || {}).forEach(([lv, id]) => abilityEntries.push([+lv, id]));
      Object.entries(j.skillUnlocks || {}).forEach(([lv, id]) => abilityEntries.push([+lv, id]));
      // パッシブ発動中だけ開く専用技（魔奏士のスフォルツァンド等）。
      // 技自体はどのテーブルにも載っていないので、バフ元パッシブの習得Lvに紐づけて並べる。
      this.conditionalSkillsForJob(jobId).forEach(({ skill, level }) => abilityEntries.push([level, skill.id]));
      const skillRows = abilityEntries.sort((a, b) => a[0] - b[0]).map(([lv, id]) => { const s = D.skills[id], learned = this.jobAbilityLearned(jobId, id, lv), cond = s?.requiresBuff ? this.buffSourceName(jobId, s.requiresBuff) : ''; return `<button class="jar${learned ? ' learned' : ' locked'}${cond ? ' jar-cond' : ''}"${learned ? ` data-job-skill-detail="${id}"` : ''}><span class="jar-lv">Lv.${lv}</span><span class="jar-nm">${s?.name || id}</span><em class="jar-type">${s?.type === 'PASSIVE' ? 'P' : 'A'}</em><small class="jar-st">${learned ? (cond ? `《${cond}》中` : '習得済') : 'LOCK'}</small></button>`; }).join('');
      let condHtml = '';
      if (!avail && j.unlockCondition) { const c = j.unlockCondition, bOk = c.bossDefeated ? this.isBossDefeated(c.bossDefeated) : true, bName = c.bossDefeated ? (D.enemies[c.bossDefeated]?.name || c.bossDefeated) : ''; const jcs = Object.entries(c.jobLevels || {}).map(([rid, rlv]) => { const cur = this.profile.jobs[rid]?.level || 0, ok = cur >= rlv; return `<div class="cond-row${ok ? ' ok' : ' ng'}"><b>${ok ? '✓' : '✕'} ${D.jobs[rid]?.name || rid} Lv${rlv}</b><small>現在 Lv.${cur}</small></div>`; }).join(''); condHtml = `<div class="jconds"><h4>解放条件</h4>${bName ? `<div class="cond-row${bOk ? ' ok' : ' ng'}"><b>${bOk ? '✓' : '✕'} ${bName}を撃破</b></div>` : ''}${jcs}</div>`; }
      // ファントムシーフは自分では育たないので、代わりに「他JOBから盗んだ能力」を出す。
      const isPT = this.isPhantomThief(jobId);
      let stealHtml = '';
      if (isPT) {
        const stolen = this.jobStatBonuses(jobId);
        const rate = Math.round((this.gb().phantomThiefInheritRate ?? 0.5) * 100);
        const grid = Object.entries(stolen).filter(([, v]) => v)
          .map(([k, v]) => `<div class="jbn-item"><span>${statLabels[k] || k}</span><b>${k === 'critBonus' ? `+${Math.round(v * 100)}%` : `+${v}`}</b></div>`).join('')
          || '<span class="jbn-none">まだ盗めていません</span>';
        // どのJOBから来ているかの内訳。JOBごとに育てた合計を出す（引継ぎは全JOB合算後に一括で計算される）
        const gainedAll = this.phantomGrowthSources();
        const srcRows = Object.entries(gainedAll).map(([id, table]) => {
          const sum = Object.values(table || {}).reduce((a, b) => a + (b || 0), 0);
          return sum ? `<div class="jsteal-row"><span>${D.jobs[id]?.name || id}</span><b>+${sum}</b></div>` : '';
        }).filter(Boolean).join('');
        stealHtml = `<div class="jbonus"><h4>他のJOBから盗んだ能力</h4><div class="jbn-grid">${grid}</div>${srcRows ? `<div class="jsteal"><small>盗奪元（各JOBで育てた合計）</small><div class="jsteal-list">${srcRows}</div></div>` : ''}<p class="jbn-note">全JOBで育てた成長を合算し、その${rate}%を常に引き継いでいます。JOBを育てるほどこの数値が伸びます。</p></div>`;
      }
      // JOB補正は「このJOBで育てた成長」を出す。
      // 双刃士のような旧growthテーブル方式のJOBは activeJobBonuses() 側に、
      // jobGrowthPerLevel 方式のJOBと称号成長は jobGrowthGained 側に入る。
      // totalStats() は両方を足しているので、表示も両方を足す。
      // 以前は「gHtml || bHtml」で片方しか出しておらず、称号成長で
      // jobGrowthGained が埋まった双刃士は、旧テーブルぶんの
      // STR/AGIが表示から丸ごと消えて「+1」だけになっていた。
      const grown = { ...bonuses };
      for (const [k, v] of Object.entries((this.profile.jobGrowthGained || {})[jobId] || {})) grown[k] = (grown[k] || 0) + v;
      const bonusGrid = Object.entries(grown).filter(([, v]) => v)
        .map(([k, v]) => `<div class="jbn-item"><span>${statLabels[k] || k}</span><b>${k === 'critBonus' ? `+${Math.round(v * 100)}%` : `+${v}`}</b></div>`).join('')
        || '<span class="jbn-none">なし</span>';
      // JOB特性：そのJOBに就いている間だけの効果（他JOBへ持ち出せない）
      const traits = this.jobTraitEntries(jobId);
      const traitHtml = traits.length ? `<div class="jbonus jtraits"><h4>JOB特性</h4><div class="jtrait-list">${traits.map(t => `<button type="button" class="jtrait-row" data-job-trait-detail="${jobId}:${t.key}"><b>${t.name}</b><span>${t.label}${t.gain > 0 ? `（転生 +${t.gain}%）` : ''}</span><em>▶</em></button>`).join('')}</div><p class="jbn-note">このJOBに就いている間だけ有効。他JOBへは持ち出せません。</p></div>` : '';
      return `<div class="jdetail"><button class="jback-btn" data-job-back>← JOB一覧</button><div class="jdetail-hdr"><div><b>${j.name}</b></div><em class="jdetail-badge">${isCur ? '現在' : !avail ? 'LOCKED' : noGrow ? 'SPECIAL' : `Lv.${p.level}`}</em></div>${avail ? `<div class="jexp-wrap"><div class="jlv-row"><b>JOB Lv.${p.level}</b><span>JEXP ${need ? `${p.exp} / ${need}` : 'MASTER'}</span></div><div class="jexp-bar"><i style="width:${bar}%"></i></div></div>${noGrow ? `<p class="jfeature">${j.featureText || j.description || ''}</p>${stealHtml}` : `<div class="jbonus"><h4>このJOBで育てた能力</h4><div class="jbn-grid">${bonusGrid}</div><p class="jbn-note">この成長は、このJOBに就いている間だけ乗ります。</p></div>`}${traitHtml}${isCur ? '<div class="jcur-badge">現在のJOB</div>' : `<button class="jchange-btn" data-job-change="${jobId}">このJOBに変更</button>`}${this.rebirthSectionHTML(jobId)}${skillRows ? `<div class="jskills"><h4>アビリティ</h4><div class="jar-list">${skillRows}</div></div>` : ''}` : `<p class="jlocked-note">${j.description}</p>${condHtml}`}</div>`;
    }
    abilitySetHtml(currentId) {
      const ps = this.profile.passiveSlots || [null, null], p0 = ps[0] ? D.skills[ps[0]] : null, p1 = ps[1] ? D.skills[ps[1]] : null;
      const personal = (D.characterSkillProgression || []).map(e => { const s = D.skills[e.skillId], ok = this.profile.level >= e.level; return `<div class="per-row${ok ? ' learned' : ' locked'}"${ok ? ` data-job-skill-detail="${e.skillId}"` : ''}><span>Lv.${e.level}</span><b>${s?.name || e.skillId}</b><em>${s?.type === 'PASSIVE' ? 'PASSIVE' : 'ACTIVE'}</em><small>${ok ? '習得済' : 'LOCK'}</small></div>`; }).join('');
      const job = D.jobs[currentId], isPT = this.isPhantomThief(currentId);
      const sig = D.skills[job?.signatureSkillId];
      const jobLv = this.profile.jobs?.[currentId]?.level || 1;
      // JOB SKILL：現在ジョブの固有スキル
      const sigHtml = sig ? `<div class="abset-block"><h4 class="abset-h">JOB SKILL <span>SIGNATURE</span></h4><div class="ab-row ab-static" data-job-skill-detail="${sig.id}"><div class="ab-val filled"><div><b>${sig.name}</b><small>${sig.effectText || sig.description || ''}</small></div></div></div></div>` : '';
      // JOB PASSIVE：現在ジョブでLv5/10/15到達により習得済みのもの
      const levels = this.gb().jobPassiveLevels || [5, 10, 15];
      const jobPassiveRows = Object.entries(job?.passiveUnlocks || {}).map(([lv, id]) => { const s = D.skills[id], ok = this.jobAbilityLearned(currentId, id, lv); return `<div class="per-row${ok ? ' learned' : ' locked'}"${ok ? ` data-job-skill-detail="${id}"` : ''}><span>Lv.${lv}</span><b>${s?.name || id}</b><em>PASSIVE</em><small>${ok ? '習得済' : `Lv.${lv}で習得`}</small></div>`; }).join('') || '<p class="modal-empty">このJOBにパッシブはありません</p>';
      // EQUIP PASSIVE：他ジョブで習得したパッシブを装備する枠（通常1／PT2）
      const slotCount = this.passiveSlotCount();
      const slots = isPT ? (this.profile.ptPassiveSlots || []) : (this.profile.equippedPassives || []);
      const equipRows = Array.from({ length: slotCount }, (_, i) => { const s = slots[i] ? D.skills[slots[i]] : null; return `<button class="ab-row ab-btn" data-open-modal="passive${i}"><div class="ab-lbl"><small>EQUIP PASSIVE ${slotCount > 1 ? i + 1 : ''}</small><span>他JOBで習得したパッシブ</span></div><div class="ab-val${s ? ' filled' : ''}"><div>${s ? `<b>${s.name}</b><small>${s.effectText || ''}</small>` : '<b>────</b><small>未設定</small>'}</div><em>▶</em></div></button>`; }).join('');
      // ACTION ABILITY：PHANTOM THIEF専用。通常ジョブでは非表示だがロジックは保持。
      const actionCount = this.actionSlotCount();
      const actionHtml = actionCount ? `<div class="abset-block"><h4 class="abset-h">ACTION ABILITY <span>PHANTOM THIEF</span></h4>${Array.from({ length: actionCount }, (_, i) => { const id = (this.profile.ptActionSlots || [])[i], s = id ? D.skills[id] : null; return `<button class="ab-row ab-btn" data-open-modal="ptAction${i}"><div class="ab-lbl"><small>ACTION ${i + 1}</small><span>MASTERしたJOBの固有スキル</span></div><div class="ab-val${s ? ' filled' : ''}"><div>${s ? `<b>${s.name}</b><small>${s.effectText || ''}</small>` : '<b>────</b><small>未設定</small>'}</div><em>▶</em></div></button>`; }).join('')}</div>` : '';
      return `<div class="abset">${sigHtml}<div class="abset-block"><h4 class="abset-h">JOB PASSIVE <span>Lv.${levels.join(' / Lv.')} で習得</span></h4><div class="per-list">${jobPassiveRows}</div></div>${actionHtml}<div class="abset-block"><h4 class="abset-h">EQUIP PASSIVE <span>${slotCount}枠</span></h4>${equipRows}</div></div>`;
    }
    passiveModalHtml(slotIdx) {
      const isPT = this.isPhantomThief(); const slots = isPT ? (this.profile.ptPassiveSlots || []) : (this.profile.equippedPassives || []); const passives = this.selectablePassives(), cur = slots[slotIdx], filter = this.jobUI?.passiveFilter || 'all', other = slotIdx === 0 ? 1 : 0;
      const srcs = ['all', ...new Set(passives.map(p => p.source === 'character' ? 'character' : p.jobId).filter(Boolean))];
      const filterHtml = srcs.map(f => { const lbl = f === 'all' ? 'ALL' : f === 'character' ? '蓮' : D.jobs[f]?.name || f; return `<button class="pf-btn${filter === f ? ' active' : ''}" data-passive-filter="${f}">${lbl}</button>`; }).join('');
      const filtered = passives.filter(p => filter === 'all' || (filter === 'character' && p.source === 'character') || p.jobId === filter);
      const rows = filtered.length ? filtered.map(p => { const sel = cur === p.id, othSel = slots[other] === p.id; return `<button class="modal-row${sel ? ' sel' : ''}${othSel ? ' dis' : ''}" data-set-passive="${slotIdx}:${p.id}" ${othSel ? 'disabled' : ''}><div><b>${p.name}</b><small>${p.effectText || ''}</small></div><em>${sel ? '✓' : ''}</em></button>`; }).join('') : '<p class="modal-empty">習得済みPASSIVEがありません</p>';
      const clear = cur ? `<button class="modal-row modal-clear" data-set-passive="${slotIdx}:">PASSIVE ${slotIdx + 1}を外す</button>` : '';
      return `<div class="jmodal-bg" data-close-modal><div class="jmodal"><div class="jmodal-hdr"><b>PASSIVE ${slotIdx + 1}</b><button data-close-modal class="jmodal-close">✕</button></div><div class="pf-tabs">${filterHtml}</div><div class="jmodal-body">${rows}${clear}</div></div></div>`;
    }
    actionModalHtml(slotIdx) {
      const slots = this.profile.ptActionSlots || [], cur = slots[slotIdx], other = slots[slotIdx === 0 ? 1 : 0];
      const actions = this.masteredActions(), rows = actions.length ? actions.map(s => { const selected = cur === s.id, used = other === s.id; return `<button class="modal-row${selected ? ' sel' : ''}${used ? ' dis' : ''}" data-set-action="${slotIdx}:${s.id}" ${used ? 'disabled' : ''}><div><b>${s.name}</b><small>${D.jobs[s.jobId]?.name || ''} MASTER／${s.effectText || ''}</small></div><em>${selected ? '✓' : ''}</em></button>`; }).join('') : '<p class="modal-empty">MASTERしたJOB固有技がありません</p>';
      const clear = cur ? `<button class="modal-row modal-clear" data-set-action="${slotIdx}:">ACTION ${slotIdx + 1}を外す</button>` : '';
      return `<div class="jmodal-bg" data-close-modal><div class="jmodal"><div class="jmodal-hdr"><b>ACTION ${slotIdx + 1}</b><button data-close-modal class="jmodal-close">✕</button></div><div class="jmodal-body">${rows}${clear}</div></div></div>`;
    }
    // JOB特性の説明モーダル。JOB特性の行をタップすると出る。
    traitModalHtml(jobId, key) {
      const t = this.jobTraitEntries(jobId).find(e => e.key === key); if (!t) return '';
      const job = D.jobs[jobId];
      const reb = this.rebirthCount(jobId);
      const raw = D.jobs[jobId]?.traits?.[key] || {};
      const growth = t.base ? `<dl class="sk-stats"><div><dt>現在値</dt><dd>${Math.round(t.cur * 100)}%</dd></div><div><dt>基本値</dt><dd>${Math.round(t.base * 100)}%</dd></div>${raw.rebirthStep ? `<div><dt>転生ごと</dt><dd>+${Math.round(raw.rebirthStep * 100)}%</dd></div>` : ''}${raw.max ? `<div><dt>上限</dt><dd>${Math.round(raw.max * 100)}%</dd></div>` : ''}<div><dt>転生回数</dt><dd>${reb}回</dd></div></dl>` : '';
      return `<div class="jmodal-bg" data-close-modal><div class="jmodal skill-modal"><div class="jmodal-hdr"><b>${t.name}</b><button data-close-modal class="jmodal-close">✕</button></div><div class="jmodal-body"><div class="sk-meta"><em class="sk-type">JOB特性</em><span>${job?.name || jobId}</span>${t.nameEn ? `<span>${t.nameEn}</span>` : ''}</div>${growth}<p class="sk-effect">${t.label}</p><p class="sk-desc">${t.description || ''}</p><p class="jbn-note">このJOBに就いている間だけ有効。他JOBへは持ち出せません。</p></div></div></div>`;
    }
    skillModalHtml(skillId) {
      const s = D.skills[skillId]; if (!s) return '';
      const src = s.source === 'character' ? '蓮の固有技' : (D.jobs[s.jobId]?.name || '');
      const lv = s.unlockLevel ? `Character Lv.${s.unlockLevel}習得` : s.unlockJobLevel ? `JOB Lv.${s.unlockJobLevel}習得` : '';
      return `<div class="jmodal-bg" data-close-modal><div class="jmodal skill-modal"><div class="jmodal-hdr"><b>${s.name}</b><button data-close-modal class="jmodal-close">✕</button></div><div class="jmodal-body"><div class="sk-meta"><em class="sk-type">${s.type || 'ACTIVE'}</em>${src ? `<span>${src}</span>` : ''}${lv ? `<span>${lv}</span>` : ''}</div><dl class="sk-stats"><div><dt>消費MP</dt><dd>${s.mp || 0}</dd></div><div><dt>威力</dt><dd>${s.powerText || '－'}</dd></div><div><dt>対象</dt><dd>${({ single: '敵単体', all: '敵全体', self: '自分' })[s.target] || s.target || '－'}</dd></div>${s.hits > 1 ? `<div><dt>HIT</dt><dd>${s.hits}回</dd></div>` : ''}${s.cooldown ? `<div><dt>CT</dt><dd>${s.cooldown}T</dd></div>` : ''}</dl><p class="sk-effect">${s.effectText || ''}</p><p class="sk-desc">${s.description || ''}</p></div></div></div>`;
    }
    renderDungeonSelect(panel) {
      panel.hidden = false;
      const available = (D.dungeons || []).filter(d => this.isDungeonUnlocked(d.id));
      const newDungeonIds = ['dungeon2', 'dungeon3', 'dungeon4', 'dungeon5'].filter(id => this.isDungeonUnlocked(id) && !this.profile.flags[`${id}NewSeen`]);
      newDungeonIds.forEach(id => { this.profile.flags[`${id}NewSeen`] = true; });
      if (newDungeonIds.length) this.saveProfile();
      if (!available.some(d => d.id === this.dungeonSelectId)) this.dungeonSelectId = available.at(-1)?.id || 'dungeon1';
      const d = available.find(entry => entry.id === this.dungeonSelectId) || available[0];
      if (!d) { panel.innerHTML = '<button class="panel-home" data-menu="home">拠点へ戻る</button><p>潜入可能なダンジョンがありません。</p>'; return; }
      const isNew = newDungeonIds.includes(d.id);
      const progress = this.isDungeonFirstClearComplete(d.id) ? 'AREA BOSS CLEARED' : d.id === 'dungeon1' ? (() => { const p = this.progressState(); return `BATTLE ${Math.min(p.wins, p.goal)} / ${p.goal}`; })() : (() => { const p = this.dungeonFloorProgress(d.id); return `FLOOR ${p.floors} / ${p.total}　BATTLE ${p.done} / ${p.goal}`; })();
      const tabs = available.map((entry, index) => `<button data-dungeon-tab="${entry.id}" class="${entry.id === d.id ? 'active' : ''}"><small>D${index + 1}</small><b>${entry.name}</b>${newDungeonIds.includes(entry.id) ? '<i>NEW</i>' : ''}</button>`).join('');
      const floors = d.floors || [], midBoss = this.dungeonMidBossEntry(d.id), midGate = !!(d.midBossId && midBoss && !midBoss.cleared);
      const floorNodes = floors.length ? floors.map((floor, index) => {
        const wins = this.floorWins(floor.id), goal = floor.winsToClear ?? 33, unlocked = this.isFloorUnlocked(floor.id), cleared = this.isFloorCleared(floor.id), pct = Math.min(100, 100 * wins / goal);
        const cls = cleared ? 'cleared' : unlocked ? 'open' : 'locked';
        const danger = floor.enemyScale?.hp > 1 ? `<mark>ENEMY ×${floor.enemyScale.hp.toFixed(2)}</mark>` : '';
        const safe = unlocked && !cleared ? this.checkpointState(d.id, floor.id) : null;
        return `<div class="dungeon-tree-node ${cls}">${index ? '<i class="tree-line"></i>' : ''}<button data-enter-floor="${floor.id}" ${unlocked ? '' : 'disabled'}><span>${index + 1}F</span><div><small>${floor.nameEn || 'FLOOR'} ${unlocked ? danger : ''}</small><b>${unlocked ? floor.name : '???'}</b><em>${unlocked ? (floor.description || '') : (d.midBossId && index >= (d.midBossAfterFloor || 99) && !this.isBossDefeated(d.midBossId) ? '中ボスを撃破すると解放' : '前の階を踏破すると解放')}</em><u><i style="width:${pct}%"></i></u><strong>${cleared ? 'CLEARED' : unlocked ? `BATTLE ${Math.min(wins, goal)} / ${goal}` : 'LOCKED'}</strong>${safe ? `<small class="floor-safe">次のセーフゾーンまであと${safe.remaining}戦</small>` : ''}</div></button></div>`;
      }) : [];
      const dungeonSafe = !floors.length ? this.checkpointState(d.id, null) : null;
      const floorTree = floors.length ? '' : `<div class="dungeon-tree-node ${midGate ? 'locked' : 'open'}"><button ${midGate ? 'disabled' : `data-enter-dungeon="${d.id}"`}><span>IN</span><div><small>ENTRY POINT</small><b>${midGate ? '銀環に進路を阻まれている' : '潜入開始'}</b><em>${midGate ? '中ボスを撃破するとD3後半へ進める' : (d.description || '怪異の気配を追って潜入する。')}</em><strong>${midGate ? 'MID BOSS REQUIRED' : progress}</strong>${dungeonSafe ? `<small class="floor-safe">次のセーフゾーンまであと${dungeonSafe.remaining}戦</small>` : ''}</div></button></div>`;
      const midBossNode = midBoss ? `<div class="dungeon-tree-node boss ${midBoss.cleared ? 'cleared locked' : 'open'}"><i class="tree-line"></i><button ${midBoss.cleared ? 'disabled' : `data-boss-challenge="${midBoss.key}"`}><span>◉</span><div><small>MID BOSS // ${midBoss.enName}</small><b>${midBoss.name}</b><em>${midBoss.title}</em><strong>${midBoss.cleared ? 'CLEARED' : '挑戦可能'}</strong></div><figure style="background-image:url('${midBoss.sprite}')"></figure></button></div>` : '';
      const boss = this.dungeonBossEntry(d.id);
      let bossNode = '';
      if (boss) {
        const rm = boss.rematch, locked = boss.cleared && rm && !rm.ready;
        const status = !boss.cleared ? '挑戦可能' : locked ? `再戦まであと ${rm.need - rm.done} 戦` : '再戦可能';
        bossNode = `<div class="dungeon-tree-node boss ${locked ? 'locked' : 'open'}"><i class="tree-line"></i><button data-boss-challenge="${boss.key}" ${locked ? 'disabled' : ''}><span>⚠</span><div><small>BOSS // ${boss.enName}</small><b>${boss.name}</b><em>${boss.title || ''}</em><strong>${status}</strong></div><figure style="background-image:url('${boss.sprite || d.thumbnail}')"></figure></button></div>`;
      }
      const midAt = Math.max(0, Math.min(floorNodes.length, d.midBossAfterFloor || floorNodes.length));
      const routeNodes = floors.length ? `${floorNodes.slice(0, midAt).join('')}${midBossNode}${floorNodes.slice(midAt).join('')}${bossNode}` : `${floorTree}${midBossNode}${bossNode}`;
      panel.innerHTML = `<button class="panel-home" data-menu="home">拠点へ戻る</button><small>DUNGEON SELECT</small><h2>潜入先を選択</h2><nav class="dungeon-tabs">${tabs}</nav><section class="dungeon-route"><header style="background-image:url('${d.thumbnail}')"><div><small>${d.nameEn || d.enName || d.name}</small><h3>${d.name}</h3><span>推奨 Lv.${d.recommendedLevel}+　//　${progress}</span>${isNew ? '<mark>NEW AREA</mark>' : ''}</div></header><div class="dungeon-tree">${routeNodes}</div></section>`;
    }
    // ══ 階層選択ページ ══
    // 「1枚を下へ長くスクロール」ではなく、ダンジョン選択とは別ページとして開く。
    renderFloorSelect(panel, dungeonId) {
      const d = this.getDungeon(dungeonId), floors = d.floors || [];
      const cards = floors.map(f => {
        const wins = this.floorWins(f.id), goal = f.winsToClear ?? 33;
        const unlocked = this.isFloorUnlocked(f.id), cleared = this.isFloorCleared(f.id);
        const mats = (f.materials || []).map(id => D.items[id]?.name || id).join('・');
        const cls = cleared ? 'floor-cleared' : unlocked ? 'floor-open' : 'floor-locked';
        const tag = cleared ? 'CLEARED' : unlocked ? 'OPEN' : 'LOCKED';
        const pct = Math.min(100, 100 * wins / goal);
        const body = unlocked
          ? `<span>${f.description || ''}</span><em>主な素材：${mats || '—'}</em>`
          : `<span>前の階を踏破すると解放されます。</span><em>—</em>`;
        return `<button class="dungeon-card floor-card ${cls}" data-enter-floor="${f.id}" ${unlocked ? '' : 'disabled'}>
          <div class="dungeon-thumb floor-thumb" style="background-image:url('${f.thumbnail || f.background || d.thumbnail}')"></div>
          <div class="dungeon-info"><small>${f.nameEn || ''}</small><strong>${unlocked ? f.name : '???'}</strong>${body}
          <b class="dungeon-progress">BATTLE ${Math.min(wins, goal)} / ${goal}</b>
          <i class="floor-bar"><em style="width:${pct}%"></em></i><mark class="floor-tag-${cls}">${tag}</mark></div></button>`;
      }).join('');
      const done = floors.filter(f => this.isFloorCleared(f.id)).length;
      panel.innerHTML = `<button class="panel-home" data-menu="battle">ダンジョン選択へ</button><small>FLOOR SELECT</small><h2>${d.name}</h2>
        <p class="floor-lead">踏破 ${done} / ${floors.length} 階${this.allFloorsCleared(dungeonId) ? '　—　最奥への道が開いた' : ''}</p>
        <div class="dungeon-select-list">${cards}</div>`;
    }
    // ミルティ解放条件。階層制のダンジョンは「全階踏破」が条件。
    // 階層を持たない古いセーブ／設定では従来どおり総勝利数で判定する。
    dungeon2BossGoal() { const fs = this.floorsOf('dungeon2'); return fs ? fs.reduce((n, f) => n + (f.winsToClear ?? 33), 0) : (D.settings?.dungeon2BossWins ?? 100); }
    isMyrthiUnlocked() {
      if (this.floorsOf('dungeon2')) return this.allFloorsCleared('dungeon2');
      return (this.profile.flags.dungeon2BattleWins || 0) >= this.dungeon2BossGoal();
    }
    // 全階の勝利数合計（進捗表示用）
    dungeon2FloorProgress() {
      const fs = this.floorsOf('dungeon2') || [];
      return { done: fs.reduce((n, f) => n + Math.min(this.floorWins(f.id), f.winsToClear ?? 33), 0), goal: this.dungeon2BossGoal(), floors: fs.filter(f => this.isFloorCleared(f.id)).length, total: fs.length };
    }

    dungeonFloorProgress(dungeonId) {
      const fs = this.floorsOf(dungeonId) || [];
      const goal = fs.reduce((sum, floor) => sum + (floor.winsToClear ?? 33), 0);
      const done = fs.reduce((sum, floor) => sum + Math.min(this.floorWins(floor.id), floor.winsToClear ?? 33), 0);
      return { done, goal, floors: fs.filter(floor => this.isFloorCleared(floor.id)).length, total: fs.length };
    }

    // ══ 階層システム ══════════════════════════════════════════════
    // ダンジョン側に floors があれば階層制。無ければ従来どおり1枚のダンジョン。
    // 進捗は profile.flags.floorWins に階層IDごとの勝利数で持つ。
    floorsOf(dungeonId = this.currentDungeonId) { return this.getDungeon(dungeonId)?.floors || null; }
    floorWins(floorId) { return (this.profile.flags.floorWins || {})[floorId] || 0; }
    floorDef(floorId) { for (const d of D.dungeons || []) for (const f of d.floors || []) if (f.id === floorId) return f; return null; }
    isFloorCleared(floorId) { const f = this.floorDef(floorId); return !!f && this.floorWins(floorId) >= (f.winsToClear ?? 33); }
    // 1階は常に解放。以降は直前の階をクリアしていれば解放。
    isFloorUnlocked(floorId) {
      const dungeonId = this.floorDungeonId(floorId), dungeon = this.getDungeon(dungeonId), floors = this.floorsOf(dungeonId) || [];
      const i = floors.findIndex(f => f.id === floorId);
      if (i <= 0) return i === 0;
      if (dungeon?.midBossId && i >= (dungeon.midBossAfterFloor || floors.length) && !this.isBossDefeated(dungeon.midBossId)) return false;
      return this.isFloorCleared(floors[i - 1].id);
    }
    floorDungeonId(floorId) { for (const d of D.dungeons || []) if ((d.floors || []).some(f => f.id === floorId)) return d.id; return null; }
    allFloorsCleared(dungeonId) { const fs = this.floorsOf(dungeonId); return !fs || fs.every(f => this.isFloorCleared(f.id)); }
    // 現在潜入中の階層定義。未選択なら未クリアの最も浅い階を返す。
    activeFloor(dungeonId = this.currentDungeonId) {
      const fs = this.floorsOf(dungeonId); if (!fs) return null;
      const chosen = fs.find(f => f.id === this.currentFloorId);
      if (chosen && this.isFloorUnlocked(chosen.id)) return chosen;
      return fs.find(f => this.isFloorUnlocked(f.id) && !this.isFloorCleared(f.id)) || fs.filter(f => this.isFloorUnlocked(f.id)).pop() || fs[0];
    }
    recordFloorWin(floorId) { if (!floorId) return; this.profile.flags.floorWins ||= {}; this.profile.flags.floorWins[floorId] = this.floorWins(floorId) + 1; }
    isDungeonFirstClearComplete(dungeonId = this.currentDungeonId) { const dungeon = this.getDungeon(dungeonId), bossId = dungeon?.bossId || ({ dungeon1: 'zenacad', dungeon2: 'myrthi', dungeon3: 'seripes' })[dungeonId]; return bossId ? this.isBossDefeated(bossId) : false; }
    checkpointState(dungeonId = this.currentDungeonId, floorId = this.currentFloorId) {
      if (this.isDungeonFirstClearComplete(dungeonId)) return null;
      let wins, goal;
      const floor = floorId ? this.floorDef(floorId) : this.activeFloor(dungeonId);
      if (floor) { wins = this.floorWins(floor.id); goal = floor.winsToClear ?? 33; }
      else if (dungeonId === 'dungeon1') { const progress = this.progressState(); if (progress.phase === 'complete') return null; wins = progress.wins; goal = progress.goal; }
      else return null;
      if (wins >= goal) return null;
      const nextSafe = Math.min(goal, (Math.floor(wins / 5) + 1) * 5);
      return { wins, goal, saved: Math.floor(wins / 5) * 5, nextSafe, remaining: Math.max(1, nextSafe - wins), floorId: floor?.id || null };
    }
    rollbackToCheckpoint() {
      if (this.battleMode !== 'slime') return null;
      const state = this.checkpointState(); if (!state) return null;
      const before = state.wins, after = Math.floor(before / 5) * 5;
      if (state.floorId) { this.profile.flags.floorWins ||= {}; this.profile.flags.floorWins[state.floorId] = after; }
      else { const progress = this.progressState(), key = progress.phase === 'noel' ? 'preNoelBattleWins' : 'postNoelBattleWins'; this.profile.flags[key] = after; }
      return before === after ? null : { before, after, lost: before - after, nextBattle: after + 1 };
    }
    rematchCounter(key) { if (key === 'zenakado') return this.profile.flags.postNoelBattleWins || 0; const enemyId = key === 'zenakado' ? 'zenacad' : key, dungeonId = D.enemies[enemyId]?.dungeonId || (key === 'myrthi' ? 'dungeon2' : key === 'seripes' ? 'dungeon3' : null); return dungeonId ? (this.profile.flags[`${dungeonId}BattleWins`] || 0) : 0; }
    rematchProgress(key) { const need = D.settings?.bossRematchWins ?? 5, snap = this.profile.bossRematchAt?.[key] ?? 0, done = Math.max(0, this.rematchCounter(key) - snap); return { done: Math.min(done, need), need, ready: done >= need }; }
    noteBossRematchSnapshot(key) { this.profile.bossRematchAt ||= {}; this.profile.bossRematchAt[key] = this.rematchCounter(key); }
    dungeonBossEntry(dungeonId) {
      const make = (key, enemyId, fallbackName, enName, fallbackTitle, cleared) => { const e = D.enemies[enemyId], rm = cleared ? this.rematchProgress(key) : null; return { key, name: e?.name || fallbackName, enName, title: e?.title || fallbackTitle, sprite: e?.sprite, cleared, rematch: rm }; };
      if (dungeonId === 'dungeon3') {
        const cleared = this.isBossDefeated('seripes'), ready = this.allFloorsCleared('dungeon3');
        if (!this.isBossDefeated('versicrell') || (!cleared && !ready)) return null;
        return make('seripes', 'seripes', 'セリペス', 'SERIPES', '第三奏卿《不落の反奏騎士》', cleared);
      }
      if (dungeonId === 'dungeon2') {
        const cleared = this.isBossDefeated('myrthi');
        if (!cleared && !this.isMyrthiUnlocked()) return null;
        return make('myrthi', 'myrthi', 'ミルティ', 'MYRTHI', '黒紅の双刃戦姫', cleared);
      }
      if (dungeonId === 'dungeon1') {
        if (!this.isBossDefeated('zenacad')) return null;
        return make('zenakado', 'zenakado', 'ゼナカド', 'ZENAKADO', '独奏卿', true);
      }
      const dungeon = this.getDungeon(dungeonId), bossId = dungeon?.bossId;
      if (bossId && D.enemies[bossId]) {
        const cleared = this.isBossDefeated(bossId), ready = this.allFloorsCleared(dungeonId);
        if (!cleared && (!ready || (dungeon.midBossId && !this.isBossDefeated(dungeon.midBossId)))) return null;
        const e = D.enemies[bossId];
        return make(bossId, bossId, e.name, e.enName || bossId.toUpperCase(), e.title || 'AREA BOSS', cleared);
      }
      return null;
    }
    // 初回踏破済みの周回中だけ、勝利リザルトから再戦可能な最終ボスへ直接進める。
    // 初回は milestone の BOSS APPEARS 演出を必ず通すため、ここでは出さない。
    resultBossRematchEntry() {
      if (this.battleMode !== 'slime' || !this.isDungeonFirstClearComplete(this.currentDungeonId)) return null;
      const boss = this.dungeonBossEntry(this.currentDungeonId);
      return boss?.cleared && boss.rematch?.ready ? boss : null;
    }
    dungeonMidBossEntry(dungeonId) {
      const dungeon = this.getDungeon(dungeonId), enemyId = dungeon?.midBossId || (dungeonId === 'dungeon3' ? 'versicrell' : null);
      if (!enemyId || !D.enemies[enemyId]) return null;
      const floors = this.floorsOf(dungeonId) || [], gate = dungeon?.midBossAfterFloor || Math.ceil(floors.length / 2);
      const cleared = this.isBossDefeated(enemyId), ready = floors.slice(0, gate).every(floor => this.isFloorCleared(floor.id));
      if (!cleared && !ready) return null;
      const e = D.enemies[enemyId]; return { key: enemyId, name: e.name, enName: e.enName || enemyId.toUpperCase(), title: e.title, sprite: e.sprite, cleared };
    }
    startBossByKey(key) {
      const defeatedId = key === 'zenakado' ? 'zenacad' : key;
      if (this.isBossDefeated(defeatedId) && !this.rematchProgress(key).ready) return;
      this.restoreNormalDungeonJob();
      if (key === 'myrthi') { this.currentDungeonId = 'dungeon2'; this.startMyrthiBoss(); return; }
      if (key === 'versicrell') { if (this.isBossDefeated('versicrell')) return; this.currentDungeonId = 'dungeon3'; this.startVersicrellBoss(); return; }
      if (key === 'seripes') { this.currentDungeonId = 'dungeon3'; this.startSeripesBoss(); return; }
      if (key === 'zenakado') { this.currentDungeonId = 'dungeon1'; this.startBossEncounter('zenakado', 'zenakado'); return; }
      const enemy = D.enemies[key];
      if (enemy?.dungeonId) { this.currentDungeonId = enemy.dungeonId; this.startBossEncounter(key, key); return; }
      this.startBossEncounter();
    }
    switchJobState(id, render = false) {
      if (!D.jobs[id] || id === this.profile.currentJob) return false;
      if (!this.isJobUnlocked(id)) return false;
      const before = this.totalStats(), vitals = this.storedVitals(before); this.profile.currentJob = id;
      if (id !== 'phantomThief') this.profile.lastNormalJob = id;
      this.sanitizeLeftHandEquipment(); this.sanitizeRightHandEquipment(); const after = this.totalStats();
      this.profile.currentVitals = { hp: Math.min(vitals.hp, after.maxHp), mp: Math.min(vitals.mp, after.maxMp) };
      if (this.player) { this.player.stats = after; this.player.hp = Math.min(this.player.hp, after.maxHp); this.player.mp = Math.min(this.player.mp, after.maxMp); }
      this.saveProfile();
      if (render) { this.audio.sfx('confirm'); this.renderMenuSummary(); this.renderMenuPanel('job'); }
      return true;
    }
    changeJob(id) { return this.switchJobState(id, true); }
    restoreNormalDungeonJob(force = false) {
      if (this.profile.currentJob !== 'phantomThief' && !force) return false;
      const target = [this.profile.otherWorldReturnJob, this.profile.lastNormalJob, this.profile.initialJob, 'mage']
        .find(id => id && id !== 'phantomThief' && D.jobs[id] && this.isJobUnlocked(id));
      if (!target) return false;
      const changed = this.switchJobState(target, false);
      this.profile.otherWorldReturnJob = null;
      this.profile.flags ||= {}; this.profile.flags.owRestoreJobPending = false;
      this.saveProfile();
      return changed;
    }
    toggleActiveSkill(id) {
      const learned = new Set(this.learnedActiveSkillIds()); if (!learned.has(id)) return; const active = [...(this.profile.activeSkills || [])], index = active.indexOf(id); if (index >= 0) active.splice(index, 1); else { if (active.length >= 4) return; active.push(id); } this.profile.activeSkills = active; this.saveProfile(); this.audio.sfx('ui'); this.renderMenuPanel('job');
    }
    eatFood(id = 'makanai', confirmed = false) {
      const meal = D.foodMenu?.buffs?.[id];
      if (!meal || !this.isMealUnlocked(id)) return;
      const active = this.activeMealBuff(), price = this.mealPriceFor(id);
      if (this.profile.gold < price) { this.audio.sfx('ui'); return; }
      if (active && !confirmed) {
        window.arseneStartFlow?.openConfirm(`いまの《${active.name}》の効果は上書きになります。\n${meal.name}を食べまっか？`, () => this.eatFood(id, true));
        return;
      }
      this.profile.gold -= price;
      this.profile.flags.ramenBuffActive = true;
      this.profile.flags.ramenBuffType = id;
      if (id === 'makanai') {
        const after = this.totalStats();
        this.profile.currentVitals = { hp: after.maxHp, mp: after.maxMp };
        if (this.player) { this.player.stats = after; this.player.hp = after.maxHp; this.player.mp = after.maxMp; }
      }
      // 料理の閃きは食後に一度だけ抽選する。未発見の料理は、成功するまで通常UIに出さない。
      const spark = Object.values(D.foodMenu?.buffs || {}).find(candidate => {
        const rule = candidate.unlockByMeal;
        return rule?.mealId === id && !this.profile.flags?.[candidate.unlockFlag] && Math.random() < Number(rule.chance || 0);
      });
      if (spark?.unlockFlag) {
        this.profile.flags[spark.unlockFlag] = true;
        this.profile.flags.taiwanMazesobaNew = true;
        if (spark.secretMenu) this.profile.flags.foodSecretMenuUnlocked = true;
      }
      if (id === 'taiwanMazesoba') this.profile.flags.taiwanMazesobaNew = false;
      this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('food');
      const line = spark
        ? `……ん？ 札幌味噌の後味から、${spark.name}が閃いたわ！ そんなことあるかいな。裏メニュー、開けとくで！`
        : id === 'sapporoMiso'
          ? 'これで戦いも楽になるやろ。装備のために、しっかり稼いでおいでや。'
          : id === 'taiwanMazesoba'
            ? '裏メニューやさかい、ちょいと景気よう盗んでき。GOLDもよう増えるで。'
            : '腹、満たしとき。装備のためにも踏ん張りや、ほんま。';
      setTimeout(() => this.renderKazuBubble(line), 0);
    }
    useMenuItem() {
      // 回復アイテムは戦闘内のアイテムコマンド専用。拠点回復による低階層周回を防ぐ。
      this.audio.sfx('ui');
    }
    // ══ 工房ナビゲーション ════════════════════════════════════
    // 第1階層＝製作／強化／分解／素材（4つなので横スクロールが起きない）
    // 第2階層＝製作なら武器・防具・ボス装備、強化なら武器・防具
    // 第3階層＝武器は武器学ごと、防具は部位ごと
    workshopSections() {
      const enhanceUnlocked = (this.profile.flags.dungeon2BattleWins || 0) >= 15;
      return [
        { id: 'craft', name: '製作', enName: 'CRAFT' },
        ...(enhanceUnlocked ? [{ id: 'enhance', name: '強化', enName: 'ENHANCE' }] : []),
        { id: 'disassemble', name: '分解', enName: 'DISASSEMBLE' },
        { id: 'materials', name: '素材', enName: 'MATERIALS' }
      ];
    }
    craftKinds() {
      return [
        { id: 'weapon', name: '武器', enName: 'WEAPON' },
        { id: 'armor', name: '防具', enName: 'ARMOR' },
        ...(this.unlockedBossSeries().length ? [{ id: 'boss', name: 'ボス装備', enName: 'BOSS' }] : [])
      ];
    }
    // 武器学のうち、レシピが存在してロックされていないものだけ出す
    craftWeaponTypes() {
      const recipes = Object.values(D.recipes || {}).filter(r => !r.legacy && (r.craftCategory || 'weapon') === 'weapon' && this.isRecipeUnlocked(r));
      const has = new Set(recipes.map(r => D.weapons[r.resultItemId]?.weaponType).filter(Boolean));
      return (D.weaponTypes || []).filter(t => has.has(t.id) && this.isWeaponTypeUnlocked(t.id));
    }
    workshopContent() {
      const tab = this.workshopTab;
      if (tab === 'materials') {
        const materialRows = (D.workshop.materialIds || []).map(id => { const item = D.items[id], count = this.profile.inventory[id] || 0; if (item?.bossId && !this.isBossDefeated(item.bossId)) return ''; return `<div class="workshop-material rarity-${item.rarity}"><span><i></i><b>${item.name}</b></span><strong>×${count}</strong><small>${item.description}</small></div>`; }).join('');
        return `<div class="workshop-section-title"><b>素材一覧</b><span>MATERIALS</span></div><div class="workshop-materials">${materialRows || '<p>素材を所持していません。</p>'}</div>`;
      }
      if (tab === 'disassemble') {
        const gear = Object.entries(this.profile.inventory).filter(([id,n]) => n > 0 && this.isPlayerContentVisible(D.items[id]) && D.items[id]?.category === 'equipment').map(([id,n]) => { const item = D.items[id], series = D.bossEquipmentSeries?.[item.seriesId], equipped = Object.values(this.profile.equipment).includes(id), spare = n - (equipped ? 1 : 0), can = !!series && spare > 0, output = series?.dismantle, material = D.items[output?.materialId]; return `<article class="${series ? 'boss-dismantle' : ''}"><div><b>${item.name}</b><span>${this.bonusText(id)} // 所持 ×${n}${equipped ? '（1個装備中）' : ''}</span>${series ? `<small>→ ${material?.name || output.materialId} ×${output.count}</small>` : ''}</div><button data-disassemble="${id}" ${can ? '' : 'disabled'}>${series ? (can ? '分解する' : '予備なし') : '対象外'}</button></article>`; }).join('');
        return `<div class="workshop-section-title"><b>装備分解</b><span>DISASSEMBLE</span></div><p class="workshop-warning">ボス装備の予備を分解し、シリーズ素材へ変換できます。装備中の最後の1個は保護されます。</p><div class="workshop-disassemble">${gear || '<p>分解可能な装備がありません。</p>'}</div>`;
      }
      if (tab === 'enhance') {
        const kind = this.enhanceKind === 'armor' ? 'armor' : 'weapon';
        const sub = [{ id: 'weapon', name: '武器強化', enName: 'WEAPON' }, { id: 'armor', name: '防具強化', enName: 'ARMOR' }]
          .map(k => `<button data-enhance-kind="${k.id}" class="${kind === k.id ? 'active' : ''}"><b>${k.name}</b><span>${k.enName}</span></button>`).join('');
        return `<div class="ws-sub">${sub}</div>${kind === 'armor' ? this.armorEnchantContent() : this.enchantContent()}`;
      }
      // ── 製作 ──
      const kinds = this.craftKinds();
      if (!kinds.some(k => k.id === this.craftKind)) this.craftKind = 'weapon';
      const kind = this.craftKind;
      const subHtml = `<div class="ws-sub">${kinds.map(k => `<button data-craft-kind="${k.id}" class="${kind === k.id ? 'active' : ''}"><b>${k.name}</b><span>${k.enName}</span></button>`).join('')}</div>`;
      if (kind === 'boss') return subHtml + this.bossEquipmentContent();

      // 第3階層：武器は武器学、防具は部位
      let groups, current, groupAttr, matches, title, titleEn;
      if (kind === 'armor') {
        groups = (D.workshop.armorTabs || []).map(t => ({ id: t.id, name: t.name, enName: t.enName }));
        if (!groups.some(g => g.id === this.craftArmorFilter)) this.craftArmorFilter = groups[0]?.id;
        current = this.craftArmorFilter; groupAttr = 'data-craft-armor';
        matches = r => r.craftCategory === 'armor' && D.items[r.resultItemId]?.slot === current;
        title = '防具製作'; titleEn = 'ARMOR CRAFT';
      } else {
        groups = this.craftWeaponTypes().map(t => ({ id: t.id, name: t.name, enName: t.nameEn || t.enName || '' }));
        if (!groups.some(g => g.id === this.craftWeaponType)) this.craftWeaponType = groups[0]?.id;
        current = this.craftWeaponType; groupAttr = 'data-craft-weapon-type';
        matches = r => (r.craftCategory || 'weapon') === 'weapon' && D.weapons[r.resultItemId]?.weaponType === current;
        title = '武器製作'; titleEn = 'WEAPON CRAFT';
      }
      const groupHtml = groups.length ? `<div class="ws-group">${groups.map(gp => {
        const n = Object.values(D.recipes || {}).filter(r => !r.legacy && this.isRecipeUnlocked(r) && (kind === 'armor' ? (r.craftCategory === 'armor' && D.items[r.resultItemId]?.slot === gp.id) : ((r.craftCategory || 'weapon') === 'weapon' && D.weapons[r.resultItemId]?.weaponType === gp.id))).length;
        return `<button ${groupAttr}="${gp.id}" class="${current === gp.id ? 'active' : ''}"><b>${gp.name}</b><span>${gp.enName}</span>${n ? `<i>${n}</i>` : ''}</button>`;
      }).join('')}</div>` : '';

      let recipes = Object.values(D.recipes || {}).filter(r => !r.legacy && this.isRecipeUnlocked(r) && matches(r));
      // 件数が多いときだけダンジョン絞り込みを出す。少ないときは余計な行を増やさない。
      const dungeons = D.dungeons || [], filter = this.craftDungeonFilter || 'all';
      const showDungeon = recipes.length > 6 && dungeons.length > 1;
      const dungeonHtml = showDungeon ? `<div class="recipe-dungeon-tabs"><button data-craft-dungeon="all" class="${filter === 'all' ? 'active' : ''}">すべて</button>${dungeons.map(d => `<button data-craft-dungeon="${d.id}" class="${filter === d.id ? 'active' : ''}">${d.name}</button>`).join('')}</div>` : '';
      if (showDungeon && filter !== 'all') recipes = recipes.filter(r => r.dungeonId === filter);

      const cards = recipes.map(r => this.recipeCardHTML(r)).join('');
      const groupName = groups.find(gp => gp.id === current)?.name || '';
      const empty = `<div class="workshop-empty-category"><b>${groupName}レシピ準備中</b><span>対応する装備データとレシピを追加すると、ここへ自動表示されます。</span></div>`;
      return `${subHtml}<div class="workshop-section-title"><b>${title}</b><span>${titleEn}</span></div>${groupHtml}${dungeonHtml}<div class="recipe-grid">${cards || empty}</div>`;
    }
    bossEquipmentContent() {
      const seriesList = this.unlockedBossSeries(); if (!seriesList.length) { this.craftKind = 'weapon'; return ''; }
      if (!seriesList.some(series => series.id === this.bossSeriesFilter)) this.bossSeriesFilter = seriesList.at(-1).id;
      const series = seriesList.find(entry => entry.id === this.bossSeriesFilter) || seriesList[0], recipes = (series.recipes || []).map(id => D.recipes[id]).filter(Boolean), count = this.equippedSeriesCount(series.id);
      const jobs = (series.recommendedJobs || []).map(id => D.jobs[id]?.name || id), primary = D.jobs[series.primaryJob]?.name || jobs[0] || '—';
      const tabs = seriesList.map(entry => `<button data-boss-series-tab="${entry.id}" class="${entry.id === series.id ? 'active' : ''}"><small>${entry.id.toUpperCase()}</small><b>${entry.nameJa || entry.name}</b><span>${this.equippedSeriesCount(entry.id)} / ${entry.maxEquippable || entry.equipment.length}</span></button>`).join('');
      return `<nav class="boss-series-tabs">${tabs}</nav><section class="boss-series-craft"><header><small>BOSS EQUIPMENT // ★★★★★</small><h3>${series.nameJa || series.name}</h3><b>${series.name}</b><span>MAIN：${primary}　／　適性：${jobs.join('・')}</span><p>${series.concept || ''}</p><em>EQUIPPED ${count} / ${series.maxEquippable || series.equipment.length}</em></header><div class="boss-series-effects">${Object.entries(series.setBonuses || {}).map(([needed, bonus]) => `<div class="${count >= Number(needed) ? 'active' : ''}"><b>${needed} SET — ${bonus.name}</b><span>${bonus.description}</span></div>`).join('')}</div><div class="recipe-grid boss-recipe-grid">${recipes.map(recipe => this.recipeCardHTML(recipe)).join('')}</div></section>`;
    }
    recipeCardHTML(recipe) {
      const item = D.items[recipe.resultItemId]; if (!item) return '';
      const owned = this.profile.inventory[recipe.resultItemId] || 0, goldOk = this.profile.gold >= (recipe.gold || 0);
      const materialsHtml = (recipe.materials || []).map(m => { const mi = D.items[m.itemId], have = this.craftMaterialAvailable(m.itemId), ok = have >= m.count; return `<div class="recipe-material ${ok ? '' : 'insufficient'}"><span>${mi?.name || m.itemId}</span><b>${have} / ${m.count}</b></div>`; }).join('');
      const goldRow = recipe.gold ? `<div class="recipe-gold ${goldOk ? '' : 'insufficient'}"><span>GOLD</span><b>${this.profile.gold} / ${recipe.gold}</b></div>` : '';
      const craftable = this.canCraft(recipe);
      const isNewRecipe = (this.profile.newlyUnlockedRecipes || []).includes(recipe.id);
      // 不足表示は素材優先。素材がそろっていてGOLDだけ足りない場合は「ゴールド不足」と出す。
      const lackingMaterials = (recipe.materials || []).filter(m => this.craftMaterialAvailable(m.itemId) < m.count).length;
      const lacking = lackingMaterials + (goldOk ? 0 : 1);
      const lackLabel = lackingMaterials ? `あと${lackingMaterials}種` : 'GOLD不足';
      const craftLabel = craftable ? '製作する' : (lackingMaterials ? '素材不足' : 'ゴールド不足');
      const jobs = (item.recommendedJobs || []).map(id => D.jobs?.[id]?.name || id);
      const jobFit = jobs.length ? `<span class="recipe-job-fit">適性：${jobs.join('・')}</span>` : '';
      return `<article class="recipe-card rarity-${item.rarity}${isNewRecipe ? ' recipe-newly-unlocked' : ''}${craftable ? ' can-craft' : ''}"><div class="recipe-info"><div class="recipe-title"><b>${item.name}${item.stars ? `<small>${'★'.repeat(item.stars)}</small>` : ''}</b>${isNewRecipe ? '<mark class="recipe-new">NEW</mark>' : ''}${owned ? `<em>×${owned}</em>` : ''}</div>${jobFit}<span class="recipe-bonus">${this.bonusText(recipe.resultItemId)}</span>${this.craftComparisonHTML(recipe.resultItemId)}</div><details class="recipe-detail"><summary>必要素材${lacking ? `<b class="lack">${lackLabel}</b>` : '<b class="ok">そろっています</b>'}</summary><div class="recipe-materials">${materialsHtml}${goldRow}</div><p class="recipe-desc">${item.description}</p></details><button class="recipe-craft" data-craft="${recipe.id}" ${craftable ? '' : 'disabled'}>${craftLabel}</button></article>`;
    }
    craftMaterialAvailable(id) { const equipped = Object.values(this.profile.equipment || {}).filter(eid => eid === id).length; return Math.max(0, (this.profile.inventory[id] || 0) - equipped); }
    canCraft(recipe) { if (!recipe) return false; if (this.profile.gold < (recipe.gold || 0)) return false; return (recipe.materials || []).every(m => this.craftMaterialAvailable(m.itemId) >= m.count); }
    craftItem(id, anchorTop = null) {
      const recipe = D.recipes?.[id]; if (!recipe || !this.canCraft(recipe)) return;
      this.profile.gold -= (recipe.gold || 0); recipe.materials.forEach(m => { this.profile.inventory[m.itemId] = (this.profile.inventory[m.itemId] || 0) - m.count; });
      this.profile.inventory[recipe.resultItemId] = (this.profile.inventory[recipe.resultItemId] || 0) + (recipe.resultCount || 1);
      this.recordEquipmentDiscovery([recipe.resultItemId]);
      this.saveProfile(); this.audio.sfx('confirm'); this.renderMenuSummary(); this.renderWorkshopKeepingAnchor('data-craft', recipe.id, anchorTop);
    }
    dismantleItem(id, anchorTop = null) { const item = D.items[id], series = D.bossEquipmentSeries?.[item?.seriesId], output = series?.dismantle, equipped = Object.values(this.profile.equipment).includes(id), spare = (this.profile.inventory[id] || 0) - (equipped ? 1 : 0); if (!item || !series || !output || spare <= 0) return; this.profile.inventory[id]--; this.profile.inventory[output.materialId] = (this.profile.inventory[output.materialId] || 0) + output.count; this.saveProfile(); this.audio.sfx('confirm'); this.renderMenuSummary(); this.renderWorkshopKeepingAnchor('data-disassemble', id, anchorTop); }
    renderWorkshop(panel) {
      if ((this.profile.newlyUnlockedRecipes || []).length) { this.profile.newlyUnlockedRecipes = []; this.saveProfile(); }
      if (!this.profile.flags.noelFirstEncounterCleared) { panel.innerHTML = '<button class="panel-home" data-menu="home">拠点へ戻る</button><small>PHANTOM WORKSHOP</small><h2>工房</h2><div class="workshop-unlock"><b>LOCKED</b><strong>まだ工房は利用できません</strong><span>通常戦を3回制し、永遠の裁定者ノエルと遭遇すると解放されます。</span></div>'; return; }
      const sections = this.workshopSections();
      if (!sections.some(sec => sec.id === this.workshopTab)) this.workshopTab = 'craft';
      // 第1階層は4項目まで。横スクロールが起きないので、見切れて気づかれない項目が出ない。
      const tabs = sections.map(sec => `<button data-workshop-tab="${sec.id}" class="${this.workshopTab === sec.id ? 'active' : ''}"><b>${sec.name}</b><span>${sec.enName}</span></button>`).join('');
      const materialTotal = (D.workshop.materialIds || []).reduce((sum, id) => sum + (this.profile.inventory[id] || 0), 0);
      panel.innerHTML = `<div class="ws-bar"><img class="ws-fox" src="assets/ui/workshop/helper-fox-pixel.png" alt=""><div class="ws-bar-title"><b>工房</b><small>PHANTOM WORKSHOP</small></div><div class="ws-bar-res"><span><i>G</i>${this.profile.gold.toLocaleString('ja-JP')}</span><span><i>M</i>${materialTotal}</span></div></div><div class="ws-tabs-wrap"><nav class="ws-tabs">${tabs}</nav></div><section class="workshop-main">${this.workshopContent()}</section>`;
      // 選択中のタブが見切れていたら見える位置へ寄せる／右端まで来たらフェードを消す
      const wrap = panel.querySelector('.ws-tabs-wrap'), strip = panel.querySelector('.ws-tabs');
      if (wrap && strip) {
        panel.querySelector('.ws-tabs button.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        const sync = () => wrap.classList.toggle('at-end', strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2);
        strip.addEventListener('scroll', sync, { passive: true }); sync();
      }
    }
    enchantContent() {
      const et = D.enchantTable, enchants = this.profile.weaponEnchants || {}, weapons = Object.values(D.weapons).filter(w => this.isPlayerContentVisible(w) && w.id && this.isPlayerContentVisible(D.items[w.id]) && (this.profile.inventory[w.id] || 0) > 0);
      if (!weapons.length) return '<p>強化可能な武器がありません。</p>';
      const cardFor = w => {
        const level = enchants[w.id] || 0, isEquipped = this.profile.equipment.rightHand === w.id;
        const invCount = this.profile.inventory[w.id] || 0, hasSpare = invCount >= 2;
        if (level >= et.maxLevel) return `<article class="enchant-card max"><b>${w.name}</b><span>+${level} MAX</span><small>最大強化達成</small></article>`;
        const nextLevel = level + 1, rate = et.successRates[level], cost = et.goldCosts[level], rateText = `${Math.round(rate * 100)}%`, canAfford = this.profile.gold >= cost;
        const canEnchant = hasSpare && canAfford;
        const spareText = isEquipped ? `所持 ×${invCount}（うち1個装備中） / 予備 ${Math.max(0, invCount - 1)}` : `所持 ×${invCount}`;
        return `<article class="enchant-card${level > 0 ? ' enhanced' : ''}"><div class="enchant-card-header"><b>${w.name}</b><strong>+${level} → +${nextLevel}</strong></div>${this.enchantGainHTML(w, level)}<div class="enchant-card-body"><span>成功率 <b>${rateText}</b></span><span>費用 <b>${cost} GOLD</b></span><small class="enchant-owned-count">${spareText}</small>${!hasSpare ? '<small class="enchant-warn">同じ武器が追加で必要</small>' : ''}${!canAfford ? '<small class="enchant-warn">GOLD不足</small>' : ''}</div><button data-enchant="${w.id}" ${canEnchant ? '' : 'disabled'}>強化する</button></article>`;
      };
      const groups = (D.weaponTypes || []).map(type => ({ ...type, items: weapons.filter(w => w.weaponType === type.id) })).filter(group => group.items.length);
      if (!groups.some(group => group.id === this.enhanceWeaponType)) this.enhanceWeaponType = groups[0]?.id;
      const groupHtml = `<div class="ws-group">${groups.map(group => `<button data-enhance-weapon-type="${group.id}" class="${this.enhanceWeaponType === group.id ? 'active' : ''}"><b>${group.name}</b><span>${group.nameEn}</span><i>${group.items.length}</i></button>`).join('')}</div>`;
      const selected = groups.find(group => group.id === this.enhanceWeaponType);
      return `<div class="workshop-section-title"><b>武器強化</b><span>WEAPON ENCHANT</span></div>${groupHtml}<p class="workshop-warning">同じ武器1個を素材として強化します。+3まで成功率100%。+4以降は失敗で武器が消滅します。</p><div class="enchant-grid">${(selected?.items || []).map(cardFor).join('')}</div>`;
    }
    enchantGainHTML(item, level = 0) {
      const powerRate = D.enchantTable?.powerRate ?? .15, currentRate = 1 + level * powerRate, nextRate = currentRate + powerRate;
      const values = {
        '攻撃': Number(item?.attackPower || 0),
        '魔攻': Number(item?.magicAttackPower || 0),
        '防御': Number(item?.defensePower || 0) + Number(item?.bonuses?.def || 0),
        '魔防': Number(item?.magicDefensePower || 0)
      };
      const format = value => { const rounded = Math.round(value * 10) / 10; return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1); };
      const statNames = { maxHp: 'HP', maxMp: 'MP', str: 'STR', vit: 'VIT', mag: 'MAG', mnd: 'MND', agi: 'AGI', dex: 'DEX', luk: 'LUK', critBonus: '会心' };
      const effectNames = { physicalDamagePercent: '物理与ダメ', magicDamagePercent: '魔法与ダメ', criticalRateBonus: '会心率', fireDamagePercent: '炎与ダメ', healingPowerPercent: '回復量', magicDamageReductionPercent: '魔法軽減', physicalDamageReductionPercent: '物理軽減', resonanceGainPercent: '共鳴量' };
      const entries = [...Object.entries(values).filter(([, base]) => base !== 0).map(([label, base]) => [label, base, false]), ...Object.entries(item?.bonuses || {}).filter(([key, base]) => key !== 'def' && Number(base)).map(([key, base]) => [statNames[key] || key.toUpperCase(), Number(base), key === 'critBonus']), ...Object.entries(item?.effects || {}).filter(([, base]) => Number(base)).map(([key, base]) => [effectNames[key] || key, Number(base), true])];
      const rows = entries.map(([label, base, percent]) => {
        const current = base * currentRate, next = base * nextRate, gain = next - current;
        return `<div><span>${label}</span><b>${format(percent ? current * 100 : current)}${percent ? '%' : ''}<i>→</i>${format(percent ? next * 100 : next)}${percent ? '%' : ''}</b><em>+${format(percent ? gain * 100 : gain)}${percent ? '%' : ''}</em></div>`;
      }).join('');
      return `<section class="enchant-next-stats"><small>NEXT +1</small>${rows || '<p>直接戦闘値の上昇なし</p>'}</section>`;
    }
    offerDestroyedEquipmentRestore({ itemId, itemName, kind, equippedSlots = [], anchorTop = null }) {
      const isWeapon = kind === 'weapon';
      const restore = () => {
        this.profile.inventory[itemId] = (this.profile.inventory[itemId] || 0) + 1;
        if (isWeapon) delete this.profile.weaponEnchants[itemId];
        else delete this.profile.armorEnchants[itemId];
        equippedSlots.forEach(slot => { this.profile.equipment[slot] = itemId; });
        this.saveProfile(); this.audio.sfx('confirm'); this.renderMenuSummary();
        this.renderWorkshopKeepingAnchor(isWeapon ? 'data-enchant' : 'data-armor-enchant', itemId, anchorTop);
        window.arseneStartFlow?.toast?.(`${itemName}を強化値+0で復元した`);
      };
      const shown = window.arseneQOffer?.show?.('protect', {
        title: '保護のアルカナ',
        copy: `粉砕された${itemName}を、強化値+0で復元する。`,
        onGrant: restore,
        onClose: () => window.arseneStartFlow?.toast?.(`${itemName}は失われたままです`)
      });
      if (!shown) alert(`${isWeapon ? '武器' : '防具'}強化FAILED！\n${itemName}は粉砕された……`);
    }
    enchantWeapon(weaponId, anchorTop = null) {
      const w = D.weapons[weaponId]; if (!w) return;
      const enchants = this.profile.weaponEnchants || {}, level = enchants[weaponId] || 0, et = D.enchantTable;
      if (level >= et.maxLevel) return;
      const equippedSlots = Object.keys(this.profile.equipment).filter(slot => this.profile.equipment[slot] === weaponId);
      const isEquipped = equippedSlots.length > 0, invCount = this.profile.inventory[weaponId] || 0, hasSpare = invCount >= 2, cost = et.goldCosts[level];
      if (!hasSpare || this.profile.gold < cost) return;
      this.profile.gold -= cost;
      this.profile.inventory[weaponId] = (this.profile.inventory[weaponId] || 0) - 1;
      const success = Math.random() < et.successRates[level];
      if (success) {
        this.profile.weaponEnchants[weaponId] = level + 1;
        this.saveProfile(); this.audio.sfx('confirm'); this.renderMenuSummary(); this.renderWorkshopKeepingAnchor('data-enchant', weaponId, anchorTop);
      } else {
        delete this.profile.weaponEnchants[weaponId];
        this.profile.inventory[weaponId] = Math.max(0, (this.profile.inventory[weaponId] || 0) - 1);
        if (!(this.profile.inventory[weaponId] > 0)) { if (this.profile.equipment.rightHand === weaponId) this.profile.equipment.rightHand = 'mageStaff'; if (this.profile.equipment.leftHand === weaponId) this.profile.equipment.leftHand = null; }
        this.saveProfile(); this.audio.sfx('defeat'); this.renderMenuSummary(); this.renderWorkshopKeepingAnchor('data-enchant', weaponId, anchorTop);
        this.offerDestroyedEquipmentRestore({ itemId: weaponId, itemName: w.name, kind: 'weapon', equippedSlots, anchorTop });
      }
    }
    // ══ 図鑑（モンスター）══════════════════════════════════════
    // ダンジョンごとにタブ分け。工房で素材を集めるときに見るので
    // ドロップ率を必ず出す。ステータスも併記する。
    // ノエルのように正体不明の相手は ??? のまま伏せる。
    archiveDungeons() {
      return [
        { id: 'dungeon1', label: 'D1' },
        { id: 'dungeon2', label: 'D2' },
        { id: 'dungeon3', label: 'D3' }
      ];
    }
    // その敵がどのダンジョンのものか。dungeonId が無い旧データは出現表から逆引きする。
    enemyDungeonId(e) {
      if (e.dungeonId) return e.dungeonId;
      for (const d of D.dungeons || []) {
        const tiers = [...(d.encounterProgression || []), ...(d.floors || []).flatMap(f => f.encounterProgression || [])];
        if (tiers.some(t => (t.pool || []).some(p => p.id === e.id))) return d.id;
      }
      return null;
    }
    // 図鑑で伏せる相手
    //   ・ノエルのように正体が明かされていない相手は、遭遇しても伏せたまま
    //   ・まだ一度も戦闘で出会っていない敵も伏せる
    hasMetEnemy(id) { return (this.profile.seenEnemies || []).includes(id); }
    isArchiveHidden(e) { return e.id === 'noelFirstEncounter' || e.hideInArchive || !this.hasMetEnemy(e.id); }
    recordEquipmentDiscovery(ids = []) {
      const archive = new Set(this.profile.equipmentArchive || []);
      ids.forEach(id => { if (D.items[id]?.category === 'equipment') archive.add(id); });
      this.profile.equipmentArchive = [...archive];
    }
    archiveModeTabsHTML() {
      return `<div class="archive-mode-tabs"><button data-archive-mode="monster" class="${this.archiveMode === 'monster' ? 'active' : ''}"><b>怪異図鑑</b><span>MONSTER</span></button><button data-archive-mode="equipment" class="${this.archiveMode === 'equipment' ? 'active' : ''}"><b>装備図鑑</b><span>EQUIPMENT</span></button></div>`;
    }
    collectionState(dungeonId) {
      const def = D.equipmentCollections?.[dungeonId], found = new Set(this.profile.equipmentArchive || []);
      const collected = (def?.itemIds || []).filter(id => found.has(id));
      return { def, collected, complete: !!def && collected.length === def.itemIds.length, claimed: !!this.profile.collectionRewards?.[dungeonId] };
    }
    claimEquipmentCollection(dungeonId) {
      const state = this.collectionState(dungeonId); if (!state.complete || state.claimed) return;
      const rewardId = state.def.rewardItemId; this.profile.inventory[rewardId] = (this.profile.inventory[rewardId] || 0) + 1;
      this.profile.collectionRewards ||= {}; this.profile.collectionRewards[dungeonId] = true; this.recordEquipmentDiscovery([rewardId]);
      this.saveProfile(); this.audio.sfx('victory'); this.renderMenuPanel('archive');
    }
    renderEquipmentArchive(panel, dungeons, dunId, tabs) {
      const found = new Set(this.profile.equipmentArchive || []), collection = this.collectionState(dunId), reward = D.items[collection.def?.rewardItemId];
      const all = Object.values(D.items || {}).filter(item => this.isPlayerContentVisible(item) && item.category === 'equipment' && item.catalogDungeon === dunId && !item.legacy && item.source !== 'collection');
      const order = { workshop: 1, dropOnly: 2, boss: 3 };
      all.sort((a, b) => (a.stars || 0) - (b.stars || 0) || (order[a.source] || 9) - (order[b.source] || 9) || a.name.localeCompare(b.name, 'ja'));
      const sourceLabel = item => item.source === 'boss' ? 'BOSS' : item.source === 'dropOnly' ? 'DROP ONLY' : 'WORKSHOP';
      const cards = all.map(item => {
        const known = found.has(item.id), stars = '★'.repeat(item.stars || 1), def = this.equipmentDefinition(item.id);
        return `<article class="equipment-archive-card rarity-${item.rarity} ${known ? 'collected' : 'unknown'}"><header><small>${known ? sourceLabel(item) : 'UNKNOWN'}</small><b>${known ? item.name : '？？？？？？'}</b><em>${known ? stars : '？'}</em></header>${known ? `<strong>${this.bonusText(item.id)}</strong><p>${item.description}</p><span>${def?.weaponType ? this.weaponTypeName(def.weaponType) : (D.equipmentSlots || []).find(s => s.id === item.slot)?.name || '装備'}</span>` : '<p>未収集の装備です。怪異討伐または工房製作で記録されます。</p>'}</article>`;
      }).join('');
      const current = collection.collected.length, total = collection.def?.itemIds?.length || 0, pct = total ? Math.round(current / total * 100) : 0;
      const collectionHtml = collection.def ? `<section class="equipment-collection ${collection.complete ? 'complete' : ''}"><header><div><small>MONSTER EQUIPMENT COLLECTION</small><b>${collection.def.name}</b></div><strong>${pct}%</strong></header><p>このダンジョンの★4怪異装備をすべて入手すると報酬を獲得できます。</p><div><span>COMPLETE REWARD</span><b>${reward?.name || '？？？'}　★★★★</b><button data-claim-equipment-collection="${dunId}" ${collection.complete && !collection.claimed ? '' : 'disabled'}>${collection.claimed ? '受取済み' : collection.complete ? '報酬を受け取る' : '未達成'}</button></div></section>` : '';
      panel.innerHTML = `<button class="panel-home" data-menu="home">拠点へ戻る</button><small>PHANTOM ARCHIVE</small><h2>図鑑</h2>${this.archiveModeTabsHTML()}<div class="item-tabs ar-tabs">${tabs}</div>${collectionHtml}<p class="ar-hint">装備記録 ${all.filter(item => found.has(item.id)).length} / ${all.length}　—　未収集装備は「？」で表示されます。</p><div class="equipment-archive-list">${cards || '<p class="item-empty">このダンジョンの装備記録はありません。</p>'}</div>`;
    }
    renderArchivePanel(panel) {
      const dungeons = this.archiveDungeons();
      if (!dungeons.some(d => d.id === this.archiveDungeon)) this.archiveDungeon = 'dungeon1';
      const dunId = this.archiveDungeon;
      const bossIds = new Set(['zenakado', 'myrthi', 'seripes', 'noelFirstEncounter']);
      // ボスは出現表からの逆引きに頼らず、所属ダンジョンを一意に固定する。
      // 後続ボスがD1にも重複表示されるのを防ぐ。
      const bossDungeon = { zenakado: 'dungeon1', noelFirstEncounter: 'dungeon1', myrthi: 'dungeon2', seripes: 'dungeon3' };
      const all = Object.values(D.enemies).filter(e => e.id !== 'noelFirstEncounter' && (bossDungeon[e.id] || this.enemyDungeonId(e)) === dunId);
      // 雑魚 → ボスの順。ボスは末尾へ。
      const list = [...all].sort((a, b) => (bossIds.has(a.id) ? 1 : 0) - (bossIds.has(b.id) ? 1 : 0) || (a.stats?.maxHp || 0) - (b.stats?.maxHp || 0));
      const tabs = dungeons.map(d => `<button data-archive-dungeon="${d.id}" class="${d.id === dunId ? 'active' : ''}"><b>${d.label}</b></button>`).join('');
      if (this.archiveMode === 'equipment') { this.renderEquipmentArchive(panel, dungeons, dunId, tabs); return; }
      const statRow = s => !s ? '' : `<div class="ar-stats">
        <span>HP</span><b>${s.maxHp ?? '—'}</b><span>攻撃</span><b>${s.atk ?? '—'}</b><span>防御</span><b>${s.def ?? '—'}</b>
        <span>魔力</span><b>${s.mag ?? '—'}</b><span>精神</span><b>${s.mnd ?? s.def ?? '—'}</b><span>素早さ</span><b>${s.spd ?? '—'}</b></div>`;
      const dropRow = e => {
        const t = e.dropTable || [];
        if (!t.length) return '<p class="ar-nodrop">ドロップなし</p>';
        return `<div class="ar-drops">${t.map(d => {
          const it = D.items[d.itemId] || D.weapons[d.itemId] || D.armors[d.itemId] || D.accessories[d.itemId];
          const pct = Math.round((d.chance || 0) * 1000) / 10;
          return `<div class="ar-drop"><span>${it?.name || d.itemId}</span><b>${pct}%</b></div>`;
        }).join('')}</div>`;
      };
      const cards = list.map(e => {
        if (this.isArchiveHidden(e)) {
          return `<details class="ar-card ar-tree ar-hidden"><summary><i aria-hidden="true"></i><b>？？？</b><small>未確認</small><em aria-hidden="true">＋</em></summary><div class="ar-detail"><p class="ar-nodrop">正体が判明していません。</p></div></details>`;
        }
        const isBoss = bossIds.has(e.id);
        const gold = e.gold ? `${e.gold.min}〜${e.gold.max}` : '—';
        return `<details class="ar-card ar-tree${isBoss ? ' ar-boss' : ''}">
          <summary><i aria-hidden="true"></i><b>${e.name}</b><small>${isBoss ? 'BOSS' : (e.role || (e.element ? `属性 ${e.element}` : ''))}</small><em aria-hidden="true">＋</em></summary>
          <div class="ar-detail">${statRow(e.stats)}
            ${e.roleDescription ? `<p class="ar-role"><b>${e.role}</b>${e.roleDescription}</p>` : ''}
            <div class="ar-meta"><span>EXP</span><b>${e.exp ?? 0}</b><span>GOLD</span><b>${gold}</b>${e.weaknesses?.length ? `<span>弱点</span><b>${e.weaknesses.join('・')}</b>` : ''}${e.resistances?.length ? `<span>耐性</span><b>${e.resistances.join('・')}</b>` : ''}</div>
            ${(e.ai || []).length ? `<div class="ar-skills"><span>使用スキル</span><b>${e.ai.map(a => a.name).join(' / ')}</b></div>` : ''}
            ${dropRow(e)}
          </div>
        </details>`;
      }).join('');
      const met = list.filter(e => !this.isArchiveHidden(e)).length, archivePct = list.length ? Math.round(met / list.length * 100) : 0;
      panel.innerHTML = `<button class="panel-home" data-menu="home">拠点へ戻る</button><small>PHANTOM ARCHIVE</small><h2>図鑑</h2>${this.archiveModeTabsHTML()}
        <div class="item-tabs ar-tabs">${tabs}</div>
        <section class="archive-monster-fixed">
          <p class="ar-hint"><b>記録率 ${archivePct}%</b>　—　怪異名をタップすると詳細が開きます。</p>
          <div class="ar-list">${cards || '<p class="item-empty">このダンジョンの記録はまだありません。</p>'}</div>
        </section>`;
    }
    // 選択キャラの表示名。新規ゲーム時に設定した名前を全画面で共通利用する。
    playerName() { return String(this.profile?.customPlayerName || '').trim() || (this.characterList || []).find(c => c.id === this.profile.selectedCharacter)?.name || '蓮'; }
    escapeMarkup(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
    defaultBattlePortraitSource() {
      const character = this.selectedCharacterData(), sprites = character?.battleSpritesByWeaponType || {}, weaponType = this.equippedWeaponType();
      const entry = sprites[weaponType] || sprites.default || character?.battleSprite || character?.image || '';
      return typeof entry === 'string' ? entry : (entry?.src || character?.image || '');
    }
    statusPortraitSource() { return this.profile.customBattlePortrait || this.selectedCharacterData()?.image || ''; }
    applyStatusPortrait() {
      const portrait = $('.st-portrait'); if (!portrait) return;
      const src = String(this.statusPortraitSource()).replace(/["\\]/g, '\\$&');
      portrait.style.backgroundImage = src ? `url("${src}")` : '';
    }
    blobAsDataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); }); }
    canvasBlob(canvas, quality, type = 'image/webp') { return new Promise(resolve => canvas.toBlob(resolve, type, quality)); }
    async compressBattlePortrait(file) {
      const objectUrl = URL.createObjectURL(file);
      try {
        const image = new Image(); image.src = objectUrl; await image.decode();
        const maxWidth = 720, maxHeight = 960, scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
        let canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d', { alpha: true }); context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'; context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let blob = null;
        for (const quality of [.84, .74, .64, .52]) { blob = await this.canvasBlob(canvas, quality); if (blob && blob.size <= 520 * 1024) break; }
        if (blob?.size > 520 * 1024) {
          const reduced = document.createElement('canvas'), reduceScale = Math.min(1, 560 / canvas.width, 800 / canvas.height);
          reduced.width = Math.max(1, Math.round(canvas.width * reduceScale)); reduced.height = Math.max(1, Math.round(canvas.height * reduceScale));
          const reducedContext = reduced.getContext('2d', { alpha: true }); reducedContext.imageSmoothingEnabled = true; reducedContext.imageSmoothingQuality = 'high'; reducedContext.drawImage(canvas, 0, 0, reduced.width, reduced.height);
          canvas = reduced; blob = await this.canvasBlob(canvas, .66);
        }
        // 古いWebViewでWebPエンコードを利用できない場合も、JPEGへ縮小して保存できるようにする。
        if (!blob) blob = await this.canvasBlob(canvas, .78, 'image/jpeg');
        if (!blob) throw new Error('encode-failed');
        return { dataUrl: await this.blobAsDataUrl(blob), width: canvas.width, height: canvas.height, bytes: blob.size };
      } finally { URL.revokeObjectURL(objectUrl); }
    }
    async setCustomBattlePortrait(file) {
      if (!file?.type?.startsWith('image/')) { window.arseneStartFlow?.toast('画像ファイルを選んでください'); return; }
      if (file.size > 20 * 1024 * 1024) { window.arseneStartFlow?.toast('画像は20MB以下にしてください'); return; }
      const previousPortrait = this.profile.customBattlePortrait, previousMeta = this.profile.customBattlePortraitMeta;
      try {
        const packed = await this.compressBattlePortrait(file);
        this.profile.customBattlePortrait = packed.dataUrl;
        this.profile.customBattlePortraitMeta = { width: packed.width, height: packed.height, bytes: packed.bytes };
        this.battlePortraitEditorOpen = true; this.saveProfile(); this.applyEquipmentVisual(); this.audio.sfx('ui'); this.renderMenuPanel('equipment');
        window.arseneStartFlow?.toast(`戦闘画像を変更しました（${Math.ceil(packed.bytes / 1024)}KB）`);
      } catch { this.profile.customBattlePortrait = previousPortrait; this.profile.customBattlePortraitMeta = previousMeta; window.arseneStartFlow?.toast('画像を保存できませんでした。別の画像をお試しください'); }
    }
    battlePortraitEditorHTML() {
      if (!this.battlePortraitEditorOpen) return '';
      const source = this.profile.customBattlePortrait || this.defaultBattlePortraitSource();
      const safeSource = this.escapeMarkup(source), meta = this.profile.customBattlePortraitMeta;
      const info = meta ? `${meta.width} × ${meta.height}px / 約${Math.ceil((meta.bytes || 0) / 1024)}KB` : '現在はデフォルト画像を使用中';
      return `<div class="battle-avatar-editor" role="dialog" aria-modal="true" aria-label="戦闘キャラクター画像の変更">
        <section class="battle-avatar-card">
          <header><div><small>BATTLE PORTRAIT</small><h3>戦闘キャラクター画像</h3></div><button type="button" data-battle-avatar-close aria-label="閉じる">×</button></header>
          <div class="battle-avatar-preview" style="background-image:url(&quot;${safeSource}&quot;)"></div>
          <div class="battle-avatar-guide"><b>おすすめ画像：768 × 1024px（縦3:4）</b><p>頭上に約10%の余白を取り、頭から腰～太ももまで入った半身画像がきれいに表示されます。透過PNG / WebPがおすすめです。</p><em>選択画像は端末内で最大720 × 960pxへ縮小し、WebPへ自動圧縮します。元画像は送信されません。</em><output>${info}</output></div>
          <div class="battle-avatar-actions"><label>画像を選ぶ<input type="file" accept="image/png,image/jpeg,image/webp" data-battle-avatar-upload></label><button type="button" data-battle-avatar-reset ${this.profile.customBattlePortrait ? '' : 'disabled'}>デフォルトに戻す</button></div>
        </section>
      </div>`;
    }
    renderStatusPanel(panel, withTabs = false) {
      const base = this.profile.baseStats, bonus = this.equipmentBonuses(), total = this.totalStats(), vitals = this.storedVitals(total);
      const jid = this.profile.currentJob, jst = this.profile.jobs?.[jid] || {}, jlv = jst.level || 1, jneed = this.jobExpNeeded(jlv), jexp = jst.exp || 0;
      const jpct = jneed ? Math.min(100, 100 * jexp / jneed) : 100;
      // JOB補正 = 旧テーブル方式の補正 ＋ 今のJOBで育てた成長分
      const legacyJob = this.activeJobBonuses(), growthJob = this.jobStatBonuses(), jobBonus = {};
      for (const src of [legacyJob, growthJob]) for (const [k, v] of Object.entries(src)) if (v) jobBonus[k] = (jobBonus[k] || 0) + v;
      // 基礎値 ＋ JOB ＋ 装備 が合計と一致するように並べる
      const statRows = statusStatKeys.map(k => {
        const b = base[k] || 0, j = jobBonus[k] || 0, e = bonus[k] || 0;
        const parts = [`<i class="src-base">基礎 ${b}</i>`];
        if (j) parts.push(`<i class="src-job">JOB +${j}</i>`);
        if (e) parts.push(`<i class="src-eq">装備 +${e}</i>`);
        const rest = total[k] - b - j - e;
        if (rest) parts.push(`<i class="src-etc">その他 ${rest > 0 ? '+' : ''}${rest}</i>`);
        return `<div class="st-stat"><span>${statLabels[k]}</span><b>${total[k]}</b><em>${parts.join('<u>+</u>')}</em></div>`;
      }).join('');
      const jobBonusRows = Object.entries(jobBonus).filter(([k, v]) => v && !statusHiddenStats.includes(k)).map(([k, v]) => `<div class="st-jb-row"><span>${statLabels[k] || k.toUpperCase()}</span><b>+${v}</b></div>`).join('');
      // ファントムシーフは全JOBの育てた成長を合算して一定割合を引き継ぐ。
      // 何がどこから来ているか分かるよう、内訳と引継率を明示する。
      const inheritRate = Math.round((this.gb().phantomThiefInheritRate ?? 0.5) * 100);
      let jobNote;
      if (this.isPhantomThief()) {
        const gained = this.phantomGrowthSources();
        const srcRows = Object.entries(gained).map(([id, table]) => {
          const sum = Object.values(table || {}).reduce((a, b) => a + (b || 0), 0);
          return sum ? `<div class="st-pt-row"><span>${D.jobs[id]?.name || id}</span><b>合計 +${sum}</b></div>` : '';
        }).filter(Boolean).join('');
        jobNote = `<div class="st-pt"><p>全JOBで育てた成長をすべて合算し、その <b>${inheritRate}%</b> をファントムシーフが引き継いでいます。</p>${srcRows ? `<div class="st-pt-list">${srcRows}</div>` : '<p class="item-empty">まだ引き継げる成長がありません。</p>'}</div>`;
      } else {
        jobNote = `<p class="st-jb-note">JOBで育てた成長は、そのJOBに就いている間だけ乗ります。ファントムシーフは全JOB分を合算して ${inheritRate}% 引き継ぎます。</p>`;
      }
      const jobHtml = `<div class="st-section"><h3>ジョブ補正</h3><div class="st-jb-head"><b>${D.jobs[jid]?.name || ''}</b><em>Lv.${jlv}</em></div>${jobBonusRows ? `<div class="st-jb">${jobBonusRows}</div>` : '<p class="item-empty">まだ補正はありません。</p>'}${jobNote}</div>`;
      // 主役は戦闘能力。基礎能力・ジョブ補正はその下に置く。
      panel.innerHTML = `<small>CHARACTER DATA</small><h2>${withTabs ? '装備・ステータス' : 'ステータス'}</h2>${withTabs ? this.equipTabsHtml() : ''}
        <div class="st-head2"><button type="button" class="st-portrait st-portrait-pick" data-battle-avatar-open title="戦闘キャラクター画像を変更"><span class="st-portrait-hint">戦闘画像</span></button><div class="st-id2"><strong>${this.escapeMarkup(this.playerName())}</strong><em>${D.jobs[jid]?.name || ''} Lv.${jlv}</em><span class="st-avatar-caption">タップで戦闘画像を変更</span></div><div class="st-vit"><span class="hp">HP ${vitals.hp} / ${total.maxHp}</span><span class="mp">MP ${vitals.mp} / ${total.maxMp}</span></div></div>
        ${this.combatStatsSectionHTML(total)}
        ${this.bossSetBonusSectionHTML()}
        <div class="st-section"><h3>基礎能力</h3><div class="stat-grid">${statRows}</div></div>
        ${jobHtml}
        <div class="st-section"><h3>JOB経験値</h3><div class="st-meter jexp"><span>${D.jobs[jid]?.name || ''} Lv.${jlv}</span><i style="width:${jpct}%"></i><output>${jneed ? `${jexp} / ${jneed}` : 'MASTER'}</output></div></div>${this.battlePortraitEditorHTML()}`;
      this.applyStatusPortrait();
    }
    // ══ 武器学タブ ══════════════════════════════════════════════
    renderMasteryPanel(panel) {
      panel.innerHTML = `<small>WEAPON MASTERY</small><h2>装備・ステータス</h2>${this.equipTabsHtml()}${this.masterySectionHTML()}`;
    }
    enchantLevel(id) { return (D.weapons[id] ? (this.profile.weaponEnchants || {})[id] : (this.profile.armorEnchants || {})[id]) || 0; }
    enchantSuffix(id) { const lv = this.enchantLevel(id); return lv > 0 ? `<em class="ench-lv">+${lv}</em>` : ''; }
    itemTabs() {
      const weaponTypes = [...new Set(Object.values(D.weapons).map(w => w.weaponType).filter(Boolean))].filter(t => this.isWeaponTypeUnlocked(t));
      const typeNames = { sword: '剣', staff: '杖', martial: '体術', dagger: '短剣', axe: '斧', spear: '槍', bow: '弓' };
      (D.weaponTypes || []).forEach(t => { if (t.name) typeNames[t.id] = t.name; });
      return {
        main: [{ id: 'consumable', name: '消費', enName: 'CONSUMABLE' }, { id: 'weapon', name: '武器', enName: 'WEAPON' }, { id: 'armor', name: '防具', enName: 'ARMOR' }],
        weaponSubs: weaponTypes.map(t => ({ id: t, name: typeNames[t] || t.toUpperCase(), enName: t.toUpperCase() })),
        armorSubs: (D.workshop?.armorTabs || []).map(t => ({ id: t.id, name: t.name, enName: t.enName }))
      };
    }
    pickFirstStockedSub() {
      const tabs = this.itemTabs(), inv = this.profile.inventory;
      const has = (cat, sub) => Object.entries(inv).some(([id, n]) => { if (!(n > 0)) return false; const it = D.items[id], w = D.weapons[id]; if (!it) return false; return cat === 'weapon' ? !!w && w.weaponType === sub : it.category === 'equipment' && !w && it.slot === sub; });
      if (this.itemTab === 'weapon') { const t = tabs.weaponSubs.find(t => has('weapon', t.id)); if (t) this.itemWeaponSub = t.id; }
      if (this.itemTab === 'armor') { const t = tabs.armorSubs.find(t => has('armor', t.id)); if (t) this.itemArmorSub = t.id; }
    }
    renderItemsPanel(panel) {
      const stats = this.totalStats(), vitals = this.storedVitals(stats), inv = this.profile.inventory, tabs = this.itemTabs();
      if (!this.itemTab) this.itemTab = 'consumable';
      if (!this.itemWeaponSub) this.itemWeaponSub = tabs.weaponSubs[0]?.id || 'sword';
      if (!this.itemArmorSub) this.itemArmorSub = tabs.armorSubs[0]?.id || 'head';
      const owned = Object.entries(inv).filter(([id, n]) => n > 0 && this.isPlayerContentVisible(D.items[id]));
      const countFor = (cat, sub) => owned.filter(([id]) => { const it = D.items[id]; if (!it) return false; if (cat === 'consumable') return it.category === 'consumable'; const w = D.weapons[id]; if (cat === 'weapon') return !!w && (!sub || w.weaponType === sub); if (cat === 'armor') return it.category === 'equipment' && !w && (!sub || it.slot === sub); return false; }).length;
      const mainTabs = tabs.main.map(t => `<button data-item-tab="${t.id}" class="${this.itemTab === t.id ? 'active' : ''}"><b>${t.name}</b><span>${t.enName}</span>${countFor(t.id) ? `<i>${countFor(t.id)}</i>` : ''}</button>`).join('');
      let subTabs = '';
      if (this.itemTab === 'weapon') subTabs = `<div class="item-subtabs">${tabs.weaponSubs.map(t => `<button data-item-wsub="${t.id}" class="${this.itemWeaponSub === t.id ? 'active' : ''}">${t.name}${countFor('weapon', t.id) ? `<i>${countFor('weapon', t.id)}</i>` : ''}</button>`).join('')}</div>`;
      if (this.itemTab === 'armor') subTabs = `<div class="item-subtabs">${tabs.armorSubs.map(t => `<button data-item-asub="${t.id}" class="${this.itemArmorSub === t.id ? 'active' : ''}">${t.name}${countFor('armor', t.id) ? `<i>${countFor('armor', t.id)}</i>` : ''}</button>`).join('')}</div>`;
      const sub = this.itemTab === 'weapon' ? this.itemWeaponSub : this.itemTab === 'armor' ? this.itemArmorSub : null;
      const list = owned.filter(([id]) => { const it = D.items[id]; if (!it) return false; const w = D.weapons[id]; if (this.itemTab === 'consumable') return it.category === 'consumable'; if (this.itemTab === 'weapon') return !!w && w.weaponType === sub; return it.category === 'equipment' && !w && it.slot === sub; });
      const rows = list.map(([id, n]) => {
        const it = D.items[id], w = D.weapons[id];
        // アルカナは恒久強化用なので拠点で使用可。HP/MP回復アイテムは戦闘内だけで使える。
        if (this.itemTab === 'consumable') { const recover = it.effect?.hp || it.effect?.mp; return `<div class="item-row rarity-${it.rarity}"><div><b>${it.name}</b><small>${it.description}</small></div><strong>×${n}</strong>${it.arcanaStat ? `<button data-use-arcana="${id}">使う</button>` : recover ? '<button disabled>戦闘中のみ</button>' : ''}</div>`; }
        const equipped = Object.values(this.profile.equipment).includes(id), slot = w ? 'rightHand' : it.slot;
        return `<div class="item-row rarity-${it.rarity}${equipped ? ' item-equipped' : ''}"><div><b>${it.name}${this.enchantSuffix(id)}${equipped ? '<mark class="eq-badge">装備中</mark>' : ''}</b><small>${this.bonusText(id)}</small></div><strong>×${n}</strong><button data-equip-item="${id}" data-equip-slot="${slot}" ${equipped ? 'disabled' : ''}>${equipped ? '装備中' : '装備'}</button></div>`;
      }).join('');
      const emptyMsg = this.itemTab === 'consumable' ? '消費アイテムなし' : this.itemTab === 'weapon' ? 'この種類の武器なし' : 'この部位の防具なし';
      const useNote = this.itemTab === 'consumable' ? '<p class="inventory-use-note">拠点では回復アイテムを使用できません。戦闘中の「アイテム」から使用してください。</p>' : '';
      panel.innerHTML = `<small>INVENTORY</small><h2>アイテム</h2><div class="inventory-screen"><div class="inventory-vitals"><b>HP ${vitals.hp} / ${stats.maxHp}</b><b>MP ${vitals.mp} / ${stats.maxMp}</b></div><div class="item-tabs">${mainTabs}</div><div class="inventory-subtab-area">${subTabs}</div><div class="inventory-list">${useNote}${rows || `<p class="item-empty">${emptyMsg}</p>`}</div></div>`;
    }
    armorEnchantContent() {
      const et = D.enchantTable, enchants = this.profile.armorEnchants || {};
      const armorSlots = ['head','body','arms','feet','accessory','leftHand'];
      const armors = Object.values(D.items || {}).filter(item => this.isPlayerContentVisible(item) && item.category === 'equipment' && armorSlots.includes(item.slot) && (this.profile.inventory[item.id] || 0) > 0);
      if (!armors.length) return '<p>強化可能な防具がありません。</p>';
      const cardFor = item => {
        const id = item.id, level = enchants[id] || 0;
        const isEquipped = Object.values(this.profile.equipment).includes(id);
        const invCount = this.profile.inventory[id] || 0, hasSpare = invCount >= 2;
        if (level >= et.maxLevel) return `<article class="enchant-card max"><b>${item.name}</b><span>+${level} MAX</span><small>最大強化達成</small></article>`;
        const nextLevel = level + 1, rate = et.successRates[level], cost = et.goldCosts[level], rateText = `${Math.round(rate * 100)}%`, canAfford = this.profile.gold >= cost;
        const canEnchant = hasSpare && canAfford;
        const spareText = isEquipped ? `所持 ×${invCount}（うち1個装備中） / 予備 ${Math.max(0, invCount - 1)}` : `所持 ×${invCount}`;
        const stats = this.equipmentDefinition(id) || item;
        return `<article class="enchant-card${level > 0 ? ' enhanced' : ''}"><div class="enchant-card-header"><b>${item.name}</b><strong>+${level} → +${nextLevel}</strong></div>${this.enchantGainHTML(stats, level)}<div class="enchant-card-body"><span>成功率 <b>${rateText}</b></span><span>費用 <b>${cost} GOLD</b></span><small class="enchant-owned-count">${spareText}</small>${!hasSpare ? '<small class="enchant-warn">同じ防具が追加で必要</small>' : ''}${!canAfford ? '<small class="enchant-warn">GOLD不足</small>' : ''}</div><button data-armor-enchant="${id}" ${canEnchant ? '' : 'disabled'}>強化する</button></article>`;
      };
      const groups = (D.workshop?.armorTabs || []).map(type => ({ ...type, items: armors.filter(item => item.slot === type.id) })).filter(group => group.items.length);
      if (!groups.some(group => group.id === this.enhanceArmorFilter)) this.enhanceArmorFilter = groups[0]?.id;
      const groupHtml = `<div class="ws-group">${groups.map(group => `<button data-enhance-armor="${group.id}" class="${this.enhanceArmorFilter === group.id ? 'active' : ''}"><b>${group.name}</b><span>${group.enName}</span><i>${group.items.length}</i></button>`).join('')}</div>`;
      const selected = groups.find(group => group.id === this.enhanceArmorFilter);
      return `<div class="workshop-section-title"><b>防具強化</b><span>ARMOR ENCHANT</span></div>${groupHtml}<p class="workshop-warning">同じ防具1個を素材として強化します。+3まで成功率100%。+4以降は失敗で防具が消滅します。</p><div class="enchant-grid">${(selected?.items || []).map(cardFor).join('')}</div>`;
    }
    enchantArmor(itemId, anchorTop = null) {
      const item = D.items[itemId]; if (!item) return;
      const enchants = this.profile.armorEnchants || {}, level = enchants[itemId] || 0, et = D.enchantTable;
      if (level >= et.maxLevel) return;
      const equippedSlots = Object.keys(this.profile.equipment).filter(slot => this.profile.equipment[slot] === itemId);
      const isEquipped = equippedSlots.length > 0, invCount = this.profile.inventory[itemId] || 0, hasSpare = invCount >= 2, cost = et.goldCosts[level];
      if (!hasSpare || this.profile.gold < cost) return;
      this.profile.gold -= cost;
      this.profile.inventory[itemId] = (this.profile.inventory[itemId] || 0) - 1;
      const success = Math.random() < et.successRates[level];
      if (success) {
        this.profile.armorEnchants[itemId] = level + 1;
        this.saveProfile(); this.audio.sfx('confirm'); this.renderMenuSummary(); this.renderWorkshopKeepingAnchor('data-armor-enchant', itemId, anchorTop);
      } else {
        delete this.profile.armorEnchants[itemId];
        this.profile.inventory[itemId] = Math.max(0, (this.profile.inventory[itemId] || 0) - 1);
        if (!(this.profile.inventory[itemId] > 0)) Object.keys(this.profile.equipment).forEach(slot => { if (this.profile.equipment[slot] === itemId) this.profile.equipment[slot] = null; });
        this.saveProfile(); this.audio.sfx('defeat'); this.renderMenuSummary(); this.renderWorkshopKeepingAnchor('data-armor-enchant', itemId, anchorTop);
        this.offerDestroyedEquipmentRestore({ itemId, itemName: item.name, kind: 'armor', equippedSlots, anchorTop });
      }
    }
    bonusText(id) {
      const def = this.equipmentDefinition(id) || {}, enchLv = this.enchantLevel(id);
      const rate = 1 + enchLv * (D.enchantTable?.powerRate ?? .15);
      const format = value => { const rounded = Math.round(value * 10) / 10; return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1); };
      // 戦闘能力は日本語表示。内部キーは画面へ出さない。
      const combatLabels = { attackPower: '攻撃力', defensePower: '防御力', magicAttackPower: '魔法攻撃力', magicDefensePower: '魔法防御力' };
      const effectLabels = { physicalDamagePercent: '物理ダメージ', magicDamagePercent: '魔法ダメージ', criticalRateBonus: '会心率', fireDamagePercent: '炎属性ダメージ', healingPowerPercent: '回復量', magicDamageReductionPercent: '被魔法ダメージ', physicalDamageReductionPercent: '被物理ダメージ', resonanceGainPercent: '共鳴獲得量' };
      const combatRows = Object.entries(combatLabels).filter(([k]) => def[k]).map(([k, label]) => `${label} +${format(def[k] * rate)}`);
      if (def.bonuses?.def) combatRows.push(`防御力 +${format(def.bonuses.def * rate)}`);
      const effectRows = Object.entries(def.effects || {}).map(([k, v]) => { const label = effectLabels[k] || k; const sign = k.endsWith('DamageReductionPercent') ? '-' : '+'; return `${label} ${sign}${format(Math.abs(v) * rate * 100)}%`; });
      const bonuses = def.bonuses || {}, rows = Object.entries(bonuses).filter(([k]) => k !== 'def');
      const enchStr = enchLv > 0 ? ` [+${enchLv}]` : '';
      const all = [...combatRows, ...rows.map(([key, value]) => key === 'critBonus' ? `会心率 ${value >= 0 ? '+' : ''}${format(value * rate * 100)}%` : `${statLabels[key] || key.toUpperCase()} ${value >= 0 ? '+' : ''}${format(value * rate)}`), ...effectRows];
      return all.length ? all.join(' / ') + enchStr : '補正なし' + enchStr;
    }
    equipmentCombatComparison(equipment = this.profile.equipment) {
      const stats = this.totalStats(equipment);
      const weaponType = D.weapons[equipment?.rightHand]?.weaponType || this.equippedWeaponType();
      return { attack: Math.round(this.attackPowerFor(weaponType, stats, equipment)), defense: Math.round(this.defensePowerFor('physical', stats, equipment)), magicDefense: Math.round(this.defensePowerFor('magical', stats, equipment)) };
    }
    combatComparisonHTML(nextEquipment, compact = false) {
      const before = this.equipmentCombatComparison(), after = this.equipmentCombatComparison(nextEquipment);
      const rows = [['攻撃力', 'ATK', 'attack'], ['防御力', 'DEF', 'defense'], ['魔法防御', 'MDEF', 'magicDefense']];
      return `<div class="combat-compare-strip${compact ? ' compact' : ''}">${rows.map(([label, short, key]) => { const delta = after[key] - before[key], state = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same'; return `<div class="${state}"><span>${compact ? short : label}</span>${compact ? '' : `<b>${before[key]}<i>→</i>${after[key]}</b>`}<em>${delta ? `${delta > 0 ? '+' : ''}${delta}` : '±0'}</em></div>`; }).join('')}</div>`;
    }
    craftComparisonHTML(id) {
      const item = D.items[id]; if (!item) return '';
      const slot = item.slot || (D.weapons[id] ? 'rightHand' : null); if (!slot) return '';
      return this.combatComparisonHTML({ ...this.profile.equipment, [slot]: id }, true);
    }
    equipmentPreviewHTML(id) {
      if (!id) return `<div class="equipment-empty-preview"><b>装備候補を選択</b><span>候補をタップすると、現在装備との能力差を確認できます。</span></div>`;
      const item = D.items[id], targetSlot = this.equipSlot || item.slot, currentId = this.profile.equipment[targetSlot], currentItem = D.items[currentId], nextEquipment = { ...this.profile.equipment, [targetSlot]: id }, before = this.totalStats(), after = this.totalStats(nextEquipment), active = currentId === id;
      const rows = Object.keys(statLabels).map(key => { const delta = after[key] - before[key], state = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same', change = delta ? `${delta > 0 ? '+' : ''}${delta} ${delta > 0 ? '↑' : '↓'}` : '－'; return `<div class="compare-row ${state}"><span>${statLabels[key]}</span><b>${before[key]}</b><i>→</i><strong>${after[key]}</strong><em>${change}</em></div>`; }).join('');
      return `<div class="equipment-swap"><div><small>現在装備</small><b>${currentItem?.name || 'なし'}</b><span>${currentId ? this.bonusText(currentId) : '補正なし'}</span></div><i>→</i><div><small>変更後</small><b>${item.name}</b><span>${this.bonusText(id)}</span></div></div><div class="equipment-description">${item.description}</div>${this.combatComparisonHTML(nextEquipment)}<div class="compare-table"><div class="compare-head"><span>基礎能力</span><b>現在</b><i></i><strong>装備後</strong><em>変化</em></div>${rows}</div><button class="equip-confirm" data-equip-confirm="${id}" ${active ? 'disabled' : ''}>${active ? '装備中' : 'この装備に変更'}<span>${active ? 'EQUIPPED' : 'EQUIP'}</span></button>`;
    }
    musicScoreSectionHTML() { const scores = Object.values(D.musicScores || {}).filter(score => this.isPlayerContentVisible(score)); return `<section class="music-score-section"><h3>楽曲 <span>MUSIC SCORE // PRIVATE MODE</span></h3><div>${scores.map(score => { const owned = !!this.profile.musicScores?.[score.id]; return `<article class="music-score-card ${owned ? 'owned' : 'locked'}"><i>♪</i><div><small>${owned ? 'PLAYABLE SCORE' : 'LOCKED SCORE'}</small><b>${owned ? score.title : '？？？'}</b><strong>${owned ? `（${score.subtitle}）` : '未入手の楽曲'}</strong><span>${owned ? score.description : '入手すると楽曲名と詳細が開示されます。'}</span></div><em>${owned ? 'PRIVATE MODE ITEM' : 'LOCKED'}</em></article>`; }).join('')}</div></section>`; }
    bossSetBonusSectionHTML() {
      const equipped = this.unlockedBossSeries().map(series => ({ series, count: this.equippedSeriesCount(series.id) })).filter(entry => entry.count > 0);
      if (!equipped.length) return '';
      return `<div class="equipped-set-series"><header><small>SET SERIES</small><b>発動中・装備中のシリーズ</b></header>${equipped.map(({ series, count }) => `<section class="boss-set-section"><header><div><small>${series.name}</small><h3>${series.nameJa || series.name}</h3></div><strong>${count} / ${series.maxEquippable || series.equipment.length}</strong></header><div>${Object.entries(series.setBonuses || {}).map(([needed, bonus]) => `<article class="${count >= Number(needed) ? 'active' : ''}"><b>${needed} SET — ${bonus.name}</b><span>${bonus.description}</span></article>`).join('')}</div></section>`).join('')}</div>`;
    }
    equipTabsHtml() {
      const t = this.equipTab || 'equip';
      // 1行に収まる短いラベルにして、内容を階層で分ける（長い1枚ページをやめる）
      const tabs = [['equip', '装備'], ['status', '能力値'], ['mastery', '武器学'], ['arts', '武器技'], ['score', '楽曲']];
      if (this.profile.titleSystem?.unlocked) tabs.push(['title', '称号']);
      return `<div class="eq-tabs2">${tabs.map(([id, name]) => `<button data-equip-tab="${id}" class="${t === id ? 'active' : ''}">${name}</button>`).join('')}</div>`;
    }
    // ══ 武器技タブ ══════════════════════════════════════════════
    // 武器学ごとに分け、閃いて習得済みの技を並べる。タップで効果を開く。
    renderWeaponArtsPanel(panel) {
      const types = this.unlockedWeaponTypes();
      if (!types.some(t => t.id === this.artsType)) this.artsType = this.equippedWeaponType() || types[0]?.id;
      const type = this.artsType;
      const subTabs = types.map(t => {
        const m = this.masteryOf(t.id);
        return `<button data-arts-type="${t.id}" class="${t.id === type ? 'active' : ''}"><b>${t.name}</b><span>Lv.${m.level}</span></button>`;
      }).join('');
      // その武器種の技を「習得済み → 未習得」の順で並べる
      // 通常攻撃は技ではないので除き、閃きで覚える技だけを並べる
      const equippedTree = type === this.equippedWeaponType() ? this.equippedWeapon()?.guitarSkillTree : null;
      const all = Object.values(D.skills).filter(s => this.isPlayerContentVisible(s) && s.source === 'weapon' && s.weaponType === type && s.sparkRank != null && (type !== 'instrument' || (equippedTree ? s.guitarTreeId === equippedTree : !s.guitarTreeId)))
        .sort((a, b) => (a.sparkRank ?? 1) - (b.sparkRank ?? 1));
      const learned = this.learnedWeaponSkillIds();
      const mst = this.masteryOf(type);
      const rows = all.map(s => {
        const has = learned.includes(s.id);
        const open = this.artsOpenId === s.id;
        // 派生元の技名は出さない。未習得の技（？？？）の名前がここから漏れてしまうため。
        const meta = has
          ? `${s.mp ? `MP ${s.mp}` : 'MP 0'}${s.hits > 1 ? ` / ${s.hits}回攻撃` : ''}${s.target === 'all' ? ' / 全体' : ''}`
          : '強敵・派生技から閃く可能性あり';
        const detail = open && has
          ? `<div class="wa-detail"><p>${s.description || ''}</p><div class="wa-facts">
              <span>威力</span><b>${s.power != null ? `攻撃性能×${s.power}${s.hits > 1 ? ` を${s.hits}回` : ''}` : '—'}</b>
              <span>消費MP</span><b>${s.mp || 0}</b>
              ${s.hits > 1 ? `<span>ヒット数</span><b>${s.hits}回</b>` : ''}
              ${s.target === 'all' ? '<span>対象</span><b>敵全体</b>' : `<span>対象</span><b>${s.target === 'self' ? '自分' : '敵単体'}</b>`}
              ${s.element ? `<span>属性</span><b>${s.element}</b>` : ''}
              <span>閃き難度</span><b>RANK ${s.sparkRank}</b>
            </div></div>`
          : '';
        return `<div class="wa-item ${has ? 'has' : 'lock'}${open ? ' open' : ''}">
          <button class="wa-head" ${has ? `data-arts-open="${s.id}"` : 'disabled'}>
            <b>${has ? s.name : '？？？'}</b><small>${meta}</small>${has ? `<em>${open ? '▲' : '▼'}</em>` : '<em class="wa-lock">未修得</em>'}
          </button>${detail}</div>`;
      }).join('');
      const nextHint = all.every(s => learned.includes(s.id))
        ? 'この武器の技はすべて習得しています。'
        : `武器学Lv.${mst.level}。強敵へ挑むほど上位技を閃きやすく、正しい派生技なら確率が大きく上がります。`;
      panel.innerHTML = `<small>WEAPON ARTS</small><h2>装備・ステータス</h2>${this.equipTabsHtml()}
        <div class="item-tabs wa-tabs">${subTabs}</div>
        <p class="wa-hint">${nextHint}</p>
        <div class="wa-list">${rows || '<p class="item-empty">この武器種の技はまだありません。</p>'}</div>`;
    }
    renderEquipmentPanel(panel) {
      if (this.equipTab === 'status') { this.renderStatusPanel(panel, true); return; }
      if (this.equipTab === 'mastery') { this.renderMasteryPanel(panel); return; }
      if (this.equipTab === 'arts') { this.renderWeaponArtsPanel(panel); return; }
      if (this.equipTab === 'score') { panel.innerHTML = `<small>MUSIC SCORE</small><h2>楽曲</h2>${this.equipTabsHtml()}<div class="score-note"><b>今後プライベートモードで使用します</b><span>入手した楽曲は、実装予定のプライベートモードで演奏できるようになります。</span></div>${this.musicScoreSectionHTML()}`; return; }
      if (this.equipTab === 'title' && this.titlePanelHtml) { this.titlePanelSource = 'equipment'; panel.innerHTML = `<small>BOSS TITLE</small><h2>称号装備</h2>${this.equipTabsHtml()}${this.titlePanelHtml()}`; return; }
      const slots = D.equipmentSlots || [], owned = Object.entries(this.profile.inventory).filter(([id, n]) => n > 0 && this.isPlayerContentVisible(D.items[id]) && D.items[id]?.category === 'equipment');
      if (this.selectedEquipmentId && !(this.profile.inventory[this.selectedEquipmentId] > 0)) this.selectedEquipmentId = null;
      const isDualBlade = this.dualWieldEnabled(), canUseLeft = this.profile.currentJob === 'warrior' || this.hasPassiveType('dualWield');
      const activeSlot = this.equipSlot && slots.some(s => s.id === this.equipSlot) ? this.equipSlot : null;
      const fists = this.usesBareFists(); // 武道家が素手なら両手を「拳」と表示する
      const slotHtml = slots.map(slot => { const id = this.profile.equipment[slot.id], item = D.items[id]; const rate = isDualBlade && slot.id === 'leftHand' && D.weapons[id] ? ` ×${Math.round(this.offHandRate() * 100)}%` : ''; const disabled = slot.id === 'leftHand' && !canUseLeft; const count = this.candidatesForSlot(slot.id).length; const leftRule = slot.id === 'leftHand' ? (this.hasPassiveType('dualWield') ? '<small>双刃のみ</small>' : this.profile.currentJob === 'warrior' ? '<small>盾のみ</small>' : '') : ''; return `<button type="button" data-equip-slot-pick="${slot.id}" class="equipment-slot ${id ? 'filled' : 'empty'} ${disabled ? 'slot-disabled' : ''} ${activeSlot === slot.id ? 'slot-active' : ''}" ${disabled ? 'disabled' : ''}><span>${slot.name}<small>${slot.enName}</small>${leftRule}</span><b>${item?.name || (fists && (slot.id === 'rightHand' || slot.id === 'leftHand') ? '拳' : 'なし')}${id ? this.enchantSuffix(id) : ''}${rate}</b>${count && !disabled ? `<i class="slot-count">${count}</i>` : ''}</button>`; }).join('');
      let workbench;
      if (!activeSlot) {
        workbench = `<div class="equip-hint"><b>装備部位を選んでください</b><span>上の部位をタップすると、そこに装備できるアイテムだけが表示されます。</span></div>`;
      } else {
        const slotDef = slots.find(s => s.id === activeSlot);
        let list = this.candidatesForSlot(activeSlot);
        // 武器が増えても一覧が縦に伸びないよう、武器学（武器種）ごとに切り替える。
        const weaponTypes = this.unlockedWeaponTypes().filter(type => list.some(id => D.weapons[id]?.weaponType === type.id));
        if (weaponTypes.length) {
          if (!weaponTypes.some(type => type.id === this.equipWeaponType)) this.equipWeaponType = weaponTypes[0].id;
          list = list.filter(id => D.weapons[id]?.weaponType === this.equipWeaponType);
        } else this.equipWeaponType = null;
        const sortKey = this.equipSort || 'default';
        if (sortKey !== 'default') list = [...list].sort((a, b) => this.equipSortValue(b, sortKey) - this.equipSortValue(a, sortKey) || (D.items[a]?.name || '').localeCompare(D.items[b]?.name || ''));
        const sortOpts = [{ id: 'default', name: '標準' }, ...Object.keys(statLabels).map(k => ({ id: k, name: statLabels[k] }))];
        const sortHtml = `<div class="equip-sort"><span>並べ替え</span><div class="equip-sort-btns">${sortOpts.map(o => `<button data-equip-sort="${o.id}" class="${sortKey === o.id ? 'active' : ''}">${o.name}</button>`).join('')}</div></div>`;
        const weaponTabs = weaponTypes.length ? `<div class="equip-weapon-tabs" role="tablist" aria-label="武器学で絞り込み">${weaponTypes.map(type => { const mastery = this.masteryOf(type.id); return `<button type="button" role="tab" data-equip-weapon-tab="${type.id}" class="${this.equipWeaponType === type.id ? 'active' : ''}"><b>${type.name}</b><small>武器学 Lv.${mastery.level}</small></button>`; }).join('')}</div>` : '';
        const curId = this.profile.equipment[activeSlot];
        const unequipBtn = curId ? `<button class="equip-unequip" data-unequip-slot="${activeSlot}">${slotDef?.name}を外す<span>UNEQUIP</span></button>` : '';
        const cards = list.map(id => { const item = D.items[id], active = this.profile.equipment[activeSlot] === id, selected = this.selectedEquipmentId === id; const delta = this.equipDeltaSummary(id, activeSlot); return `<button data-equip-preview="${id}" aria-pressed="${selected}" class="equipment-candidate rarity-${item.rarity} ${active ? 'equipped-now' : ''} ${selected ? 'selected' : ''}"><span class="candidate-title"><b>${item.name}${this.enchantSuffix(id)}${item.stars ? `<small>${'★'.repeat(item.stars)}</small>` : ''}</b>${active ? '<em>EQUIPPED</em>' : ''}</span><strong>${this.bonusText(id)}</strong>${delta ? `<span class="cand-delta">${delta}</span>` : ''}<small>${item.description}</small></button>`; }).join('');
        const preview = this.selectedEquipmentId ? `<section class="equipment-preview-overlay" role="dialog" aria-modal="true" aria-label="装備比較"><header><div><small>STATUS COMPARISON</small><b>能力比較</b></div><button type="button" data-equip-preview-close aria-label="候補一覧へ戻る">×</button></header>${this.equipmentPreviewHTML(this.selectedEquipmentId)}</section>` : '';
        workbench = `<section class="equipment-selector-overlay" role="dialog" aria-modal="true" aria-label="${slotDef?.name || '装備'}を選択"><header><div><small>SELECT EQUIPMENT</small><b>${slotDef?.name}の装備 <span>${slotDef?.enName}</span></b></div><button type="button" data-equip-slot-close aria-label="装備部位一覧へ戻る">×</button></header>${weaponTabs}${sortHtml}${unequipBtn}<div class="equipment-candidate-list">${cards || '<p class="item-empty">この部位に装備できるアイテムがありません。</p>'}</div>${preview}</section>`;
      }
      panel.innerHTML = `<small>EQUIPMENT</small><h2>装備・ステータス</h2>${this.equipTabsHtml()}<div class="equipment-screen"><section class="equipment-slots-wrap"><h3>装備中 <span>CURRENT LOADOUT</span></h3><div class="equipment-slots">${slotHtml}</div></section>${!activeSlot ? `<section class="equipment-workbench">${workbench}</section>` : ''}${this.bossSetBonusSectionHTML()}</div>${activeSlot ? workbench : ''}`;
    }
    candidatesForSlot(slotId) {
      return Object.entries(this.profile.inventory).filter(([id, n]) => {
        if (!(n > 0)) return false; const item = D.items[id]; if (!this.isPlayerContentVisible(item) || item.category !== 'equipment') return false;
        if (slotId === 'leftHand') return this.isLeftHandItemAllowed(id);
        if (slotId === 'rightHand' && (this.isOffHandOnlyWeapon(id) || !this.canEquipRightHand(id))) return false;
        return item.slot === slotId;
      }).map(([id]) => id);
    }
    isOffHandOnlyWeapon(id) { return !!D.weapons[id] && !!(D.weapons[id].offHandOnly || D.items[id]?.offHandOnly); }
    isShield(id) { return !!id && !D.weapons[id] && D.items[id]?.slot === 'leftHand'; }
    isLeftHandItemAllowed(id, jobId = this.profile.currentJob) { if (!id) return true; if (jobId === 'warrior') return this.isShield(id); if (this.hasPassiveType('dualWield')) return this.isDualBladeWeapon(this.profile.equipment?.rightHand) && this.isDualBladeWeapon(id) && this.isOffHandOnlyWeapon(id); return false; }
    sanitizeLeftHandEquipment() { const id = this.profile?.equipment?.leftHand; if (id && !this.isLeftHandItemAllowed(id, this.profile.currentJob)) this.profile.equipment.leftHand = null; }
    sanitizeRightHandEquipment() { const id = this.profile?.equipment?.rightHand; if (!id || this.canEquipRightHand(id)) return; const preferred = this.weaponTypeDef(this.profile.preferredWeaponType)?.starterWeaponId, fallback = [preferred, 'mageStaff', 'phantomSword', 'ironClaw'].find(wid => wid && (this.profile.inventory[wid] || 0) > 0 && this.canEquipRightHand(wid)); this.profile.equipment.rightHand = fallback || 'mageStaff'; }
    equipSortValue(id, key) { const before = this.totalStats(), item = D.items[id]; if (!item) return 0; const slot = this.equipSlot || item.slot; const after = this.totalStats({ ...this.profile.equipment, [slot]: id }); return after[key] - before[key]; }
    equipDeltaSummary(id, slotId) {
      const before = this.totalStats(), after = this.totalStats({ ...this.profile.equipment, [slotId]: id });
      const parts = Object.keys(statLabels).map(k => { const d = after[k] - before[k]; return d ? `<i class="${d > 0 ? 'up' : 'down'}">${statLabels[k]} ${d > 0 ? '+' : ''}${d}</i>` : ''; }).filter(Boolean);
      return parts.length ? parts.join('') : '<i class="same">変化なし</i>';
    }
    previewEquipment(id) { const item = D.items[id]; if (!this.isPlayerContentVisible(item) || item.category !== 'equipment' || !(this.profile.inventory[id] > 0)) return; this.selectedEquipmentId = id; this.renderMenuPanel('equipment'); }
    equipItem(id) { const item = D.items[id]; if (!this.isPlayerContentVisible(item) || item.category !== 'equipment' || !(this.profile.inventory[id] > 0)) return; const slot = (this.equipSlot && this.candidatesForSlot(this.equipSlot).includes(id)) ? this.equipSlot : item.slot; if (slot === 'leftHand' && !this.isLeftHandItemAllowed(id)) return; if (slot === 'rightHand' && (this.isOffHandOnlyWeapon(id) || !this.canEquipRightHand(id))) return; this.profile.equipment[slot] = id; if (slot === 'rightHand') this.sanitizeLeftHandEquipment(); this.equipSlot = null; this.equipWeaponType = null; this.selectedEquipmentId = null; this.saveProfile(); this.audio.sfx('confirm'); this.renderMenuSummary(); this.renderMenuPanel('equipment'); }
    unequipSlot(slotId) { if (!slotId || !(slotId in this.profile.equipment)) return; this.profile.equipment[slotId] = slotId === 'rightHand' ? 'mageStaff' : null; this.equipSlot = null; this.equipWeaponType = null; this.selectedEquipmentId = null; this.saveProfile(); this.audio.sfx('ui'); this.renderMenuSummary(); this.renderMenuPanel('equipment'); }
    equipFromInventory(id) { const item = D.items[id]; if (!this.isPlayerContentVisible(item) || !(this.profile.inventory[id] > 0)) return; const slot = this.isOffHandOnlyWeapon(id) ? 'leftHand' : D.weapons[id] ? 'rightHand' : item.slot; if (!slot || (slot === 'leftHand' && !this.isLeftHandItemAllowed(id)) || (slot === 'rightHand' && !this.canEquipRightHand(id))) return; this.profile.equipment[slot] = id; if (slot === 'rightHand') this.sanitizeLeftHandEquipment(); this.saveProfile(); this.audio.sfx('confirm'); this.renderMenuSummary(); this.renderMenuPanel('items'); }
    equipLeftHandWeapon(id) { if (!(this.profile.inventory[id] > 0) || !this.isLeftHandItemAllowed(id)) return; this.profile.equipment.leftHand = id; this.saveProfile(); this.audio.sfx('confirm'); this.renderMenuSummary(); this.renderMenuPanel('equipment'); }

    kazuDialogueCondition(key) {
      const f = this.profile.flags, workshopUnlocked = !!f.noelFirstEncounterCleared;
      switch (key) {
        case 'always': return true;
        case 'new_game': return (f.preNoelBattleWins || 0) === 0 && (f.postNoelBattleWins || 0) === 0;
        case 'after_first_battle': return (f.preNoelBattleWins || 0) >= 1 && (f.preNoelBattleWins || 0) <= 3 && !f.noelFirstEncounterCleared;
        case 'low_hp': { const t = this.totalStats(), v = this.storedVitals(t); return v.hp <= Math.ceil(t.maxHp * 0.30); }
        case 'just_defeated': return f.lastBattleResult === 'defeat';
        case 'consecutive_defeats': return (f.consecutiveDefeats || 0) >= 2;
        case 'workshop_just_unlocked': return workshopUnlocked;
        case 'workshop_unlocked': return workshopUnlocked;
        case 'weapon_fusion_unlocked': return workshopUnlocked && !!f.zenakadoDefeated;
        case 'boss1_available': return (f.preNoelBattleWins || 0) >= (D.battleProgression?.noelEncounterWins || 3) && !f.noelFirstEncounterCleared;
        case 'boss1_cleared': return !!f.noelFirstEncounterCleared;
        case 'zenakado_available': return f.noelFirstEncounterCleared && !f.zenakadoDefeated && (f.postNoelBattleWins || 0) >= (D.battleProgression?.zenakadoEncounterWins || 7);
        case 'zenakado_cleared': return !!f.zenakadoDefeated;
        case 'zenakado_cleared_first': return !!f.zenakadoDefeated;
        case 'dungeon2_available': return this.isDungeonUnlocked('dungeon2');
        case 'dungeon2_first_return': return this.isDungeonUnlocked('dungeon2') && (f.dungeon2BattleWins || 0) >= 1;
        case 'myrthi_available': return this.isMyrthiUnlocked() && !this.isBossDefeated('myrthi');
        case 'myrthi_cleared': return this.isBossDefeated('myrthi');
        case 'myrthi_cleared_first': return this.isBossDefeated('myrthi');
        case 'job_unlocked': return this.jobSystemUnlocked();
        case 'job_mastered': return Object.values(this.profile.jobs || {}).some(j => j.level >= 20);
        case 'has_materials_no_workshop': return !workshopUnlocked && (this.profile.discoveredMaterials || []).length > 0;
        case 'reni_chat': return workshopUnlocked;
        case 'workshop_used': return (this.profile.unlockedRecipes || []).length > 0;
        case 'ramen_chat': return true;
        case 'meta_chat': return true;
        default: return false;
      }
    }

    showKazuDialogue() {
      const data = window.KAZU_DIALOGUES; if (!data || !Array.isArray(data)) return;
      if (!this.kazuHistory) this.kazuHistory = [];
      const seen = new Set(this.profile.kazuSeenOnce || []);
      const eligible = data.filter(entry => {
        if (entry.once && seen.has(entry.id)) return false;
        return this.kazuDialogueCondition(entry.condition);
      });
      if (!eligible.length) return;
      const maxPriority = Math.max(...eligible.map(e => e.priority));
      const topTier = eligible.filter(e => e.priority === maxPriority);
      const casual = eligible.filter(e => e.priority < 20);
      let pool = maxPriority < 20 && casual.length ? casual : topTier;
      let chosen = pool[Math.floor(Math.random() * pool.length)];
      const recentIds = new Set(this.kazuHistory);
      const freshPool = pool.filter(e => !recentIds.has(e.id));
      if (freshPool.length) chosen = freshPool[Math.floor(Math.random() * freshPool.length)];
      const dialogues = chosen.dialogues.filter(t => !this.kazuHistory.includes(t));
      const text = (dialogues.length ? dialogues : chosen.dialogues)[Math.floor(Math.random() * (dialogues.length || chosen.dialogues.length))];
      this.kazuHistory = [text, ...this.kazuHistory].slice(0, 5);
      if (chosen.once) { this.profile.kazuSeenOnce = [...seen, chosen.id]; this.saveProfile(); }
      this.renderKazuBubble(text);
    }

    renderKazuBubble(text) {
      const shell = document.querySelector('.hideout-art-shell') || document.querySelector('.hideout-scene'); if (!shell) return;
      const old = document.getElementById('kazu-bubble'); if (old) old.remove();
      const bubble = document.createElement('div');
      bubble.id = 'kazu-bubble'; bubble.className = 'kazu-bubble'; bubble.textContent = text;
      shell.appendChild(bubble);
      shell.classList.add('kazu-speaking');
      const close = () => { bubble.remove(); shell.classList.remove('kazu-speaking'); };
      let timer = setTimeout(close, 6000);
      bubble.addEventListener('click', () => { clearTimeout(timer); close(); });
    }
  }
  window.BattleGame = BattleGame; // 異世界モジュールから prototype を拡張するため公開する
  addEventListener('DOMContentLoaded', () => { window.arseneGame = new BattleGame(); });
})();
