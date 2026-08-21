(() => {
  'use strict';
  const D = window.ARSENE_DATA, $ = (s, r = document) => r.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const roll = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clone = value => JSON.parse(JSON.stringify(value));
  const statLabels = { maxHp: 'HP', maxMp: 'MP', str: '力', vit: '体力', mag: '魔力', mnd: '精神', agi: '素早さ', dex: '器用さ', luk: '運' };

  class BattleGame {
    constructor() {
      this.profile = this.loadProfile(); this.sanitizeLeftHandEquipment(); this.sanitizeRightHandEquipment(); this.syncSkillUnlocks(); this.player = null; this.enemies = []; this.turn = 1; this.locked = false; this.finished = false; this.autoBattle = false; this.selectedEquipmentId = null; this.battleMode = 'slime'; this.workshopTab = 'craft'; this.craftKind = 'weapon'; this.enhanceKind = 'weapon'; this.craftWeaponType = 'sword'; this.craftDungeonFilter = 'all'; this.craftArmorFilter = 'leftHand'; this.archiveMode = 'monster'; this.battleLogHistory = []; this.battleLogExpanded = false; this.dungeonSelectId = 'dungeon1'; this.bossSeriesFilter = null;
      this.currentDungeonId = 'dungeon1';
      this.battleMusic = encodeURI('音楽系/戦闘用/零時侵蝕 (Without Lead Vocal).mp3');
      this.menuMusic = encodeURI('音楽系/拠点/Midnight Ramen Den.mp3');
      this.bossMusic = encodeURI('音楽系/戦闘用/インサイダー取引はダメですよ。ボス戦Version.mp3');
      this.otherWorldMusic = encodeURI('音楽系/戦闘用/星霞の理由 -Reason to Fade-異世界バトルBGM.mp3');
      this.audio = new ArseneAudio(this.battleMusic);
      $('#log').addEventListener('click', () => this.toggleBattleLog());
      $('#log').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggleBattleLog(); } });
      $('#battlefield').addEventListener('click', e => {
        const detailToggle = e.target.closest('[data-status-toggle]'); if (detailToggle) { e.preventDefault(); e.stopPropagation(); this.toggleStatusDetailItem(detailToggle); return; }
        if (e.target.closest('.status-detail-close') || e.target.id === 'battle-status-detail') { e.preventDefault(); this.hideStatusDetail(); return; }
        const strip = e.target.closest('.status-strip[data-status-owner]'); if (strip) { e.preventDefault(); e.stopPropagation(); this.showStatusGroup(strip.dataset.statusOwner, strip); }
      });
      $('#battlefield').addEventListener('keydown', e => { const strip = e.target.closest('.status-strip[data-status-owner]'); if (strip && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); this.showStatusGroup(strip.dataset.statusOwner, strip); } if (e.key === 'Escape') this.hideStatusDetail(); });
      document.addEventListener('click', e => { const strip = e.target.closest?.('.enemy-statuses[data-status-owner]'); if (!strip) return; e.preventDefault(); e.stopPropagation(); this.showStatusGroup(strip.dataset.statusOwner, strip); }, true);
      $('#audio-toggle').addEventListener('click', async () => { await this.audio.unlock(); const on = this.audio.toggle(); $('#audio-toggle').classList.toggle('muted', !on); $('#audio-toggle span').textContent = on ? 'SOUND ON' : 'SOUND OFF'; });
      document.addEventListener('click', e => { if (e.target.closest('[data-go-menu], #result-menu')) { e.preventDefault(); this.showMenu('home'); } });
      $('#result-menu').addEventListener('pointerup', e => { e.preventDefault(); this.showMenu('home'); });
      $('#menu-screen').addEventListener('click', async e => { const b = e.target.closest('[data-menu]'); if (!b || b.disabled) return; await this.audio.unlock(); this.audio.sfx('ui'); if (b.dataset.menu === 'battle') { this.renderMenuPanel('dungeon-select'); } else if (b.dataset.menu === 'boss') { if (this.isMyrthiUnlocked() && !this.isBossDefeated('myrthi')) { this.currentDungeonId = 'dungeon2'; this.startMyrthiBoss(); } else this.startBossEncounter(); } else { if (b.dataset.menu === 'equipment') this.equipTab = b.hasAttribute('data-open-status') ? 'status' : 'equip'; this.renderMenuPanel(b.dataset.menu); } });
      $('#menu-panel').addEventListener('click', async e => {
        const avatarReset = e.target.closest('[data-status-avatar-reset]');
        if (avatarReset) { this.profile.customStatusPortrait = null; this.saveProfile(); this.audio.sfx('ui'); this.renderMenuPanel('equipment'); window.arseneStartFlow?.toast('初期画像に戻しました'); return; }
        const enterDungeon = e.target.closest('[data-enter-dungeon]');
        if (enterDungeon) { this.currentDungeonId = enterDungeon.dataset.enterDungeon; this.currentFloorId = null; const dungeonCfg = this.getDungeon(this.currentDungeonId); await this.audio.playTrack(dungeonCfg?.music || this.battleMusic); this.startBattle(); return; }
        const dungeonTab = e.target.closest('[data-dungeon-tab]');
        if (dungeonTab) { this.dungeonSelectId = dungeonTab.dataset.dungeonTab; this.audio.sfx('ui'); this.renderMenuPanel('dungeon-select'); return; }
        // 階層のあるダンジョンは階層選択ページを挟む
        const openFloors = e.target.closest('[data-open-floors]');
        if (openFloors) { this.floorSelectDungeonId = openFloors.dataset.openFloors; this.audio.sfx('ui'); this.renderMenuPanel('floor-select'); return; }
        const enterFloor = e.target.closest('[data-enter-floor]');
        if (enterFloor) { if (enterFloor.disabled) return; const fid = enterFloor.dataset.enterFloor; this.currentDungeonId = this.floorDungeonId(fid); this.currentFloorId = fid; const cfg = this.getDungeon(this.currentDungeonId); await this.audio.playTrack(cfg?.music || this.battleMusic); this.startBattle(); return; }
        const slotPick = e.target.closest('[data-equip-slot-pick]');
        if (slotPick) { if (slotPick.disabled) return; const s = slotPick.dataset.equipSlotPick; this.equipSlot = this.equipSlot === s ? null : s; this.selectedEquipmentId = null; this.audio.sfx('ui'); this.renderMenuPanel('equipment'); return; }
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
        if (resetData) { window.arseneStartFlow?.confirmReset(); return; }
        const exportSave = e.target.closest('[data-export-save]');
        if (exportSave) { this.saveTransferMode = this.saveTransferMode === 'export' ? null : 'export'; if (this.saveTransferMode === 'export') { this.saveTransferExportCode = this.encodeSaveTransferCode(); navigator.clipboard?.writeText(this.saveTransferExportCode).then(() => window.arseneStartFlow?.toast('コードをコピーしました')).catch(() => {}); } this.renderMenuPanel('system'); return; }
        const importSaveToggle = e.target.closest('[data-import-save]');
        if (importSaveToggle) { this.saveTransferMode = this.saveTransferMode === 'import' ? null : 'import'; this.renderMenuPanel('system'); return; }
        const importSaveConfirm = e.target.closest('[data-import-save-confirm]');
        if (importSaveConfirm) { const input = $('[data-transfer-input]'), payload = this.decodeSaveTransferCode(input?.value); if (!payload) { window.arseneStartFlow?.toast('コードを読み取れませんでした'); return; } window.arseneStartFlow?.openConfirm('現在のセーブデータを上書きして読み込みますか？', () => this.applySaveTransfer(payload), true); return; }
        const food = e.target.closest('[data-eat-food]');
        if (food) { this.eatFood(); return; }
        const buyItem = e.target.closest('[data-buy-item]');
        if (buyItem) { if (!buyItem.disabled) this.buyItem(buyItem.dataset.buyItem); return; }
        const useItem = e.target.closest('[data-use-item]');
        if (useItem) { this.useMenuItem(useItem.dataset.useItem); return; }
        const craft = e.target.closest('[data-craft]');
        if (craft) { if (!craft.disabled) this.craftItem(craft.dataset.craft); return; }
        const dismantle = e.target.closest('[data-disassemble]');
        if (dismantle) { if (!dismantle.disabled) this.dismantleItem(dismantle.dataset.disassemble); return; }
        const enchant = e.target.closest('[data-enchant]');
        if (enchant) { if (!enchant.disabled) this.enchantWeapon(enchant.dataset.enchant); return; }
        const armorEnchant = e.target.closest('[data-armor-enchant]');
        if (armorEnchant) { if (!armorEnchant.disabled) this.enchantArmor(armorEnchant.dataset.armorEnchant); return; }
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
        if (openModal) { if (!this.jobUI) this.jobUI = { tab: 'job', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' }; const m = openModal.dataset.openModal; if (m === 'passive0') { this.jobUI.modal = 'passiveSelect'; this.jobUI.passiveSlotIdx = 0; } else if (m === 'passive1') { this.jobUI.modal = 'passiveSelect'; this.jobUI.passiveSlotIdx = 1; } this.renderMenuPanel('job'); return; }
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
        const confirm = e.target.closest('[data-equip-confirm]');
        if (confirm && !confirm.disabled) this.equipItem(confirm.dataset.equipConfirm);
        const leftEquip = e.target.closest('[data-equip-left]');
        if (leftEquip && !leftEquip.disabled) this.equipLeftHandWeapon(leftEquip.dataset.equipLeft);
      });
      $('#menu-panel').addEventListener('input', e => { const slider = e.target.closest('[data-volume]'); if (!slider) return; this.audio.setVolume(slider.dataset.volume, slider.value); const value = $(`[data-volume-value="${slider.dataset.volume}"]`); if (value) value.textContent = `${slider.value}%`; });
      $('#menu-panel').addEventListener('change', e => {
        const avatar = e.target.closest('[data-status-avatar-upload]');
        if (avatar?.files?.[0]) { this.setCustomStatusPortrait(avatar.files[0]); return; }
        const slider = e.target.closest('[data-volume]'); if (!slider) return; this.audio.setVolume(slider.dataset.volume, slider.value); const value = $(`[data-volume-value="${slider.dataset.volume}"]`); if (value) value.textContent = `${slider.value}%`; if (slider.dataset.volume === 'sfx') this.audio.sfx('ui');
      });
      $('#game').hidden = true; $('#game').style.display = 'none'; $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#result').hidden = true; $('#result').style.display = 'none';
    }

    freshProfile() {
      const p = D.player; return { version: 14, selectedCharacter: null, playerCharacter: null, prologueCompleted: false, openingWatched: false, level: p.level, exp: p.exp, gold: p.gold, baseStats: clone(p.baseStats), currentVitals: { hp: p.baseStats.maxHp, mp: p.baseStats.maxMp }, equipment: clone(p.equipment), inventory: clone(p.inventory), musicScores: {}, bossDefeated: { zenacad: false, myrthi: false, seripes: false }, currentJob: 'mage', jobs: { warrior: { level: 1, exp: 0 }, mage: { level: 1, exp: 0 }, martialArtist: { level: 1, exp: 0 }, priest: { level: 1, exp: 0 }, guardian: { level: 1, exp: 0 }, arcaneMaestro: { level: 1, exp: 0 }, dualBlade: { level: 1, exp: 0 } }, learnedJobSkills: [], learnedCharacterSkills: ['blueNote'], activeSkills: ['blueNote', 'quickSlash'], passiveSlots: [null, null], weaponEnchants: {}, armorEnchants: {}, bossRematchAt: {}, preferredWeaponType: null, unlockedJobs: ['mage'], initialJob: 'mage', jobGrowthGained: {}, jobRebirths: {}, jobMastered: [], growthFraction: {}, learnedPassives: [], equippedPassives: [null], ptActionSlots: [null, null], ptPassiveSlots: [null, null], weaponMastery: { sword: { level: 1, exp: 0 }, staff: { level: 1, exp: 0 }, martial: { level: 1, exp: 0 }, instrument: { level: 1, exp: 0 }, shield: { level: 1, exp: 0 } }, learnedWeaponSkills: [], seenEnemies: [], equipmentArchive: [], collectionRewards: {}, playtest: { startedAt: Date.now(), playMs: 0, battles: 0, weaponUse: { sword: 0, staff: 0, martial: 0, instrument: 0, shield: 0 }, sparkLog: [], hpGrowthCount: 0, hpGrowthTotal: 0, mpGrowthCount: 0, mpGrowthTotal: 0 }, kazuSeenOnce: [], flags: { noelFirstEncounterCleared: false, preNoelBattleWins: 0, postNoelBattleWins: 0, zenakadoDefeated: false, zenakadoScoreClaimed: false, ramenBuffActive: false, normalBattleWins: 0, temporaryBossCompleted: false, openingWatched: false, prologueCompleted: false, dungeon2BattleWins: 0, dungeon2NewSeen: false, floorWins: {}, dungeon3BattleWins: 0, dungeon3NewSeen: false, guardianUnlocked: false, shieldUnlocked: false, lastBattleResult: null, consecutiveDefeats: 0 }, discoveredMaterials: [], unlockedRecipes: [], newlyUnlockedRecipes: [] };
    }
    loadProfile() {
      try {
        const saved = JSON.parse(localStorage.getItem(D.settings.saveKey)); if (!saved) return this.freshProfile();
        const base = this.freshProfile(), jobs = clone(base.jobs); Object.keys(jobs).forEach(id => jobs[id] = { ...jobs[id], ...(saved.jobs?.[id] || {}) }); const profile = { ...base, ...saved, baseStats: { ...base.baseStats, ...saved.baseStats }, currentVitals: { ...base.currentVitals, ...saved.currentVitals }, equipment: { ...base.equipment, ...saved.equipment }, inventory: { ...base.inventory, ...saved.inventory }, musicScores: { ...base.musicScores, ...saved.musicScores }, bossDefeated: { ...base.bossDefeated, ...saved.bossDefeated }, jobs, learnedJobSkills: Array.isArray(saved.learnedJobSkills) ? saved.learnedJobSkills : [], learnedCharacterSkills: Array.isArray(saved.learnedCharacterSkills) ? saved.learnedCharacterSkills : [], activeSkills: Array.isArray(saved.activeSkills) ? saved.activeSkills.slice(0, 4) : base.activeSkills, flags: { ...base.flags, ...saved.flags }, armorEnchants: { ...(saved.armorEnchants || {}) }, bossRematchAt: { ...(saved.bossRematchAt || {}) }, preferredWeaponType: saved.preferredWeaponType || null, unlockedJobs: Array.isArray(saved.unlockedJobs) ? saved.unlockedJobs : [saved.currentJob || 'mage'], initialJob: saved.initialJob || saved.currentJob || 'mage', jobGrowthGained: { ...(saved.jobGrowthGained || {}) }, jobRebirths: { ...(saved.jobRebirths || {}) }, jobMastered: Array.isArray(saved.jobMastered) ? saved.jobMastered : [], growthFraction: { ...(saved.growthFraction || {}) }, learnedPassives: Array.isArray(saved.learnedPassives) ? saved.learnedPassives : [], equippedPassives: Array.isArray(saved.equippedPassives) ? saved.equippedPassives : [null], ptActionSlots: Array.isArray(saved.ptActionSlots) ? saved.ptActionSlots : [null, null], ptPassiveSlots: Array.isArray(saved.ptPassiveSlots) ? saved.ptPassiveSlots : [null, null], weaponMastery: { ...base.weaponMastery, ...(saved.weaponMastery || {}) }, learnedWeaponSkills: Array.isArray(saved.learnedWeaponSkills) ? saved.learnedWeaponSkills : [], equipmentArchive: Array.isArray(saved.equipmentArchive) ? saved.equipmentArchive : [], collectionRewards: { ...(saved.collectionRewards || {}) }, playtest: { ...base.playtest, ...(saved.playtest || {}), weaponUse: { ...base.playtest.weaponUse, ...(saved.playtest?.weaponUse || {}) } }, kazuSeenOnce: Array.isArray(saved.kazuSeenOnce) ? saved.kazuSeenOnce : [], discoveredMaterials: Array.isArray(saved.discoveredMaterials) ? saved.discoveredMaterials : [], unlockedRecipes: Array.isArray(saved.unlockedRecipes) ? saved.unlockedRecipes : [], newlyUnlockedRecipes: Array.isArray(saved.newlyUnlockedRecipes) ? saved.newlyUnlockedRecipes : [] };
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
        if (profile.flags.dungeon3BattleWins == null) profile.flags.dungeon3BattleWins = 0;
        if (profile.flags.dungeon3NewSeen == null) profile.flags.dungeon3NewSeen = false;
        if (!profile.jobs.arcaneMaestro) profile.jobs.arcaneMaestro = { level: 1, exp: 0 };
        if (!profile.jobs.dualBlade) profile.jobs.dualBlade = { level: 1, exp: 0 };
        if (!profile.jobs.guardian) profile.jobs.guardian = { level: 1, exp: 0 };
        if (profile.bossDefeated.myrthi == null) profile.bossDefeated.myrthi = false;
        if (profile.bossDefeated.seripes == null) profile.bossDefeated.seripes = false;
        // ストーリーJOBは撃破前には存在自体を見せない。旧セーブは撃破フラグから自動復元する。
        const d1Cleared = !!(profile.bossDefeated.zenacad || profile.flags.temporaryBossCompleted || profile.flags.magicKnightProofObtained);
        const d2Cleared = !!(profile.bossDefeated.myrthi || profile.flags.dungeon2Clear);
        const d3Cleared = !!profile.bossDefeated.seripes;
        profile.unlockedJobs = [...new Set(profile.unlockedJobs || [])].filter(id => (id !== 'magicKnight' || d1Cleared) && (id !== 'dualBlade' || d2Cleared) && (id !== 'guardian' || d3Cleared));
        if (d1Cleared && !profile.unlockedJobs.includes('magicKnight')) profile.unlockedJobs.push('magicKnight');
        if (d2Cleared && !profile.unlockedJobs.includes('dualBlade')) profile.unlockedJobs.push('dualBlade');
        if (d3Cleared && !profile.unlockedJobs.includes('guardian')) profile.unlockedJobs.push('guardian');
        if (d3Cleared) { profile.flags.guardianUnlocked = true; profile.flags.shieldUnlocked = true; }
        if (!d1Cleared && profile.currentJob === 'magicKnight') profile.currentJob = profile.initialJob || 'mage';
        if (!d2Cleared && profile.currentJob === 'dualBlade') profile.currentJob = profile.initialJob || 'mage';
        if (!d3Cleared && profile.currentJob === 'guardian') profile.currentJob = profile.initialJob || 'mage';
        if (!Array.isArray(profile.passiveSlots)) profile.passiveSlots = [null, null];
        // 旧セーブに残る廃止済みのサブコマンド設定は保存データから除去する。
        delete profile.subCommand;
        if (!Array.isArray(profile.kazuSeenOnce)) profile.kazuSeenOnce = [];
        if (profile.flags.consecutiveDefeats == null) profile.flags.consecutiveDefeats = 0;
        if (profile.flags.lastBattleResult === undefined) profile.flags.lastBattleResult = null;
        // 図鑑用：一度でも戦闘で出会った敵・入手した装備のID
        if (!Array.isArray(profile.seenEnemies)) profile.seenEnemies = [];
        if (!Array.isArray(profile.equipmentArchive)) profile.equipmentArchive = [];
        if (!profile.collectionRewards || typeof profile.collectionRewards !== 'object') profile.collectionRewards = {};
        const knownEquipment = [...Object.entries(profile.inventory || {}).filter(([id, n]) => n > 0 && D.items[id]?.category === 'equipment').map(([id]) => id), ...Object.values(profile.equipment || {}).filter(id => D.items[id]?.category === 'equipment')];
        profile.equipmentArchive = [...new Set([...profile.equipmentArchive, ...knownEquipment])];
        profile.version = 14;
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
      const portrait = $('.hideout-player-portrait'), sceneActor = $('.hideout-selected-character'), shell = $('.hideout-art-shell');
      if (portrait) { portrait.style.backgroundImage = `url("${safeImage}")`; portrait.setAttribute('aria-label', `${c.name}のステータスと装備を確認`); }
      if (shell) shell.dataset.characterId = c.id;
      if (sceneActor) {
        const hideoutImage = String(c.hideoutImage || '').replace(/["\\]/g, '\\$&');
        sceneActor.hidden = !hideoutImage;
        sceneActor.style.backgroundImage = hideoutImage ? `url("${hideoutImage}")` : '';
      }
      const name = $('#menu-character-name'); if (name) name.textContent = c.name;
      const phantom = $('#menu-phantom-id'); if (phantom) phantom.textContent = `PHANTOM // ${String(Math.max(1, (this.characterList || []).findIndex(x => x.id === c.id) + 1)).padStart(2, '0')}`;
      this.applyCharacterTheme(c.theme);
    }
    setCharacterList(list) { this.characterList = Array.isArray(list) ? list : []; this.applyCharacterPresentation(); }
    // ══ ジョブ解放 / パッシブ ══════════════════════════════════
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
      const isDualBlade = this.profile?.currentJob === 'dualBlade';
      for (const [slot, id] of Object.entries(equipment || {})) {
        if (!id) continue;
        const def = this.equipmentDefinition(id); if (!def) continue;
        const dual = isDualBlade && slot === 'leftHand' && D.weapons[id] ? (D.dualBladeOffHandRate || 0.70) : 1;
        // 強化はその装備自身の戦闘能力にだけ掛かる。弱い装備を強化しても強い装備は追い越せない。
        const rate = dual * (1 + this.enchantLevel(id) * (D.enchantTable?.powerRate ?? 0.15));
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
      const extra = (Number(skill?.criticalModifier) || 0) + this.traitCriticalBonus() + this.equipmentEffectRate('criticalRateBonus');
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
      return this.rollAttackOutcome(this.player?.stats || this.totalStats(), enemy?.stats || {}, { ...options, skill, weapon, weaponType, criticalChance: this.criticalChanceFor(skill) });
    }
    rollEnemyAttackOutcome(enemy, action = {}, options = {}) {
      return this.rollAttackOutcome(enemy?.stats || {}, this.player?.stats || {}, { ...options, skill: action, weaponType: action.weaponType || null, criticalChance: options.criticalChance || 0 });
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
    isWeaponTypeUnlocked(id) { const t = this.weaponTypeDef(id); if (!t?.unlockFlag) return true; return !!this.profile.flags[t.unlockFlag]; }
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
        if (e && typeof e[type] === 'number') sum += e[type];
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
    // パッシブはそのJOBを転生させるたびに強くなる。
    //   実効値 = rate + 転生回数 × step   （step 未指定なら rate の40%）
    //   max があればそこで頭打ち。MP割引のように青天井にできない効果へ付ける。
    // これで「後から強いJOBが出ても、育てた既存JOBが腐らない」形にする。
    passiveRate(passive, key = 'rate') {
      const e = passive?.passiveEffect; if (!e) return 0;
      const base = e[key] || 0; if (!base) return 0;
      const n = this.rebirthCount(passive.jobId || this.profile.currentJob);
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
    // 現在ジョブで習得済みのパッシブ（そのジョブの能力として常時有効）
    currentJobPassives() { const job = D.jobs[this.profile.currentJob]; if (!job) return []; const lv = this.profile.jobs?.[this.profile.currentJob]?.level || 1; return Object.entries(job.passiveUnlocks || {}).filter(([l]) => Number(l) <= lv).map(([, id]) => D.skills[id]).filter(Boolean); }
    // 他ジョブから持ち込んで装備中のパッシブ
    equippedPassiveList() { const slots = this.isPhantomThief() ? (this.profile.ptPassiveSlots || []) : (this.profile.equippedPassives || []); return slots.slice(0, this.passiveSlotCount()).map(id => D.skills[id]).filter(s => s?.type === 'PASSIVE'); }
    // 実際に効果を発揮する全パッシブ（現在ジョブ習得分＋装備分、重複除去）
    activePassives() { return [...new Map([...this.currentJobPassives(), ...this.equippedPassiveList()].map(s => [s.id, s])).values()]; }
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
      this.profile[key][idx] = skillId || null;
      this.saveProfile(); this.audio.sfx('heal'); if (this.jobUI) this.jobUI.modal = null; this.renderMenuPanel('job');
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
    jobStatBonuses(jobId = this.profile.currentJob) {
      const gained = this.profile.jobGrowthGained || {}, out = {};
      if (this.isPhantomThief(jobId)) {
        const rate = this.gb().phantomThiefInheritRate ?? 0.5;
        for (const table of Object.values(gained))
          for (const [k, v] of Object.entries(table || {})) out[k] = (out[k] || 0) + v;
        for (const k of Object.keys(out)) out[k] = Math.floor(out[k] * rate);
        return out;
      }
      for (const [k, v] of Object.entries(gained[jobId] || {})) if (v) out[k] = v;
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
    rebirthGrowthMultiplier(jobId) { return 1 + this.rebirthCount(jobId) * 0.10; }
    arcanaCount() { return this.profile.inventory.rebirthArcana || 0; }
    isJobMastered(jobId) { return (this.profile.jobMastered || []).includes(jobId); }
    markJobMastered(jobId) { this.profile.jobMastered ||= []; if (!this.profile.jobMastered.includes(jobId)) this.profile.jobMastered.push(jobId); }
    rebirthUnlocked() { return !!this.profile.flags.rebirthUnlocked; }
    canRebirth(jobId) {
      const lv = this.profile.jobs?.[jobId]?.level || 1, cap = D.jobLevelCap || 20;
      if (!this.rebirthUnlocked()) return { ok: false, reason: '転生はまだ解放されていません。' };
      if (lv < cap) return { ok: false, reason: `JOB Lv${cap}で転生可能` };
      if (this.arcanaCount() < 1) return { ok: false, reason: '《輪廻のアルカナ》が必要です' };
      return { ok: true };
    }
    // JOB Lv/EXPだけを初期化。永久成長値・パッシブ・武器学・MASTER履歴は保持する
    doRebirth(jobId) {
      const check = this.canRebirth(jobId); if (!check.ok) return check;
      this.profile.inventory.rebirthArcana = Math.max(0, this.arcanaCount() - 1);
      this.markJobMastered(jobId);
      this.profile.jobs[jobId] = { level: 1, exp: 0 };
      this.profile.jobRebirths ||= {};
      this.profile.jobRebirths[jobId] = this.rebirthCount(jobId) + 1;
      this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('job');
      return { ok: true, count: this.rebirthCount(jobId) };
    }
    // D2クリア報酬：双刃士を解放。初回のみ輪廻のアルカナ×1。
    grantMyrthiFirstReward() {
      const jobUnlocked = this.unlockJob('dualBlade');
      if (this.profile.flags.myrthiFirstClearRewardClaimed) { if (jobUnlocked) this.saveProfile(); return jobUnlocked ? { job: D.jobs.dualBlade } : null; }
      this.profile.flags.myrthiFirstClearRewardClaimed = true;
      this.profile.flags.rebirthUnlocked = true;
      this.profile.inventory.rebirthArcana = (this.profile.inventory.rebirthArcana || 0) + 1;
      this.saveProfile();
      return { item: D.items.rebirthArcana, count: 1, job: jobUnlocked ? D.jobs.dualBlade : null };
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
      } else if (this.systemTab === 'help') {
        body = this.helpSectionHTML();
      } else if (this.systemTab === 'debug') {
        body = this.debugTabHTML();
      } else {
        body = `<div class="system-actions"><button data-watch-opening>WATCH OPENING<span>オープニングを再生</span></button><button class="danger" data-reset-data>DATA RESET<span>セーブデータを消去</span></button></div>
          <section class="sound-settings save-transfer"><header><b>セーブデータの引き継ぎ</b><span>別ブラウザ・別URLでも復元できます</span></header><p class="save-transfer-note">「コードを書き出す」で表示される文字列をコピーし、別のブラウザ側の設定画面で「コードを読み込む」に貼り付けてください。</p><div class="system-actions"><button data-export-save>コードを書き出す<span>EXPORT CODE</span></button><button data-import-save>コードを読み込む<span>IMPORT CODE</span></button></div>${this.saveTransferMode === 'export' ? `<div class="save-transfer-box"><textarea readonly rows="4" data-transfer-output onclick="this.select()">${this.saveTransferExportCode || ''}</textarea><small>自動でコピーしました。コピーされない場合は上の文字列を選択してコピーしてください。</small></div>` : ''}${this.saveTransferMode === 'import' ? `<div class="save-transfer-box"><textarea rows="4" placeholder="ここにコードを貼り付け" data-transfer-input></textarea><button data-import-save-confirm>この内容で読み込む</button></div>` : ''}</section>
          <div class="hideout-feature system-info"><article><b>自動セーブ</b><span>ジョブ・武器学・装備・所持品・GOLD・解放状態をこの端末に保存中。</span></article><article><b>Ver.0.4</b><span>武器学・閃き・転生システムを実装。</span></article></div>`;
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
      return `<div class="rebirth-box"><div class="rb-head"><small>REBIRTH</small><b>転生</b>${stars}</div><div class="rb-info"><span>転生回数</span><b>${n}</b><span>次回成長</span><b>${mult}%</b><span>所持アルカナ</span><b>${this.arcanaCount()}</b></div><button class="rb-btn" data-job-rebirth="${jobId}" ${check.ok ? '' : 'disabled'}>${check.ok ? '転生する' : check.reason}<span>${check.ok ? 'REBIRTH' : 'LOCKED'}</span></button></div>`;
    }
    specialItemHTML(reward) {
      if (!reward) return '';
      const item = reward.item ? `<div class="sr-key"><small>SPECIAL ITEM GET</small><b>《${reward.item.name}》 ×${reward.count}</b><span>${reward.item.description || ''}</span></div><div class="sr-jobs"><small>REBIRTH UNLOCKED</small><div><mark>JOB Lv20から転生できるようになった</mark></div></div>` : '';
      const job = reward.job ? `<div class="sr-jobs"><small>NEW JOB UNLOCKED</small><div><mark>${reward.job.name}</mark></div><span>D2クリアにより新たなJOBが解放された</span></div>` : '';
      return `<div class="stage-reward">${item}${job}</div>`;
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
    masteryExpNeeded(level) { const t = this.gb().weaponExpTable || { base: 40, growth: 18, curve: 1.35 }; return Math.ceil(t.base + t.growth * Math.pow(Math.max(0, level - 1), t.curve)); }
    isNoGrowthJob(jobId = this.profile.currentJob) { return (this.gb().noGrowthJobs || []).includes(jobId); }
    // キャラ固有特性。characters.json は "small" 等の記号のみ保持し、実倍率は growthBalance 側で決まる
    characterTrait() { return (this.characterList || []).find(c => c.id === this.profile.selectedCharacter)?.trait || null; }
    traitScale(key) { return (this.gb().traitBonusScale || {})[key] || {}; }
    traitWeaponExpMult(type) { const b = this.characterTrait()?.bonuses?.weaponGrowthBonus?.[type]; return b ? (this.traitScale(b).weaponExp ?? 1) : 1; }
    traitSparkMult(type) { const b = this.characterTrait()?.bonuses?.techLearnBonus?.[type]; return b ? (this.traitScale(b).spark ?? 1) : 1; }
    traitMpGrowthMult() { const b = this.characterTrait()?.bonuses?.mpGrowthBonus; return b ? (this.traitScale(b).mpGrowth ?? 1) : 1; }
    traitHealMult() { const b = this.characterTrait()?.bonuses?.healBonus; return b ? (this.traitScale(b).heal ?? 1) : 1; }
    traitCriticalBonus() { const b = this.characterTrait()?.bonuses?.criticalBonus; return b ? (this.traitScale(b).critical ?? 0) : 0; }

    // 戦闘終了時：装備中カテゴリの武器学だけEXPを加算
    grantWeaponExp(baseExp) {
      if (this.isNoGrowthJob() || !(baseExp > 0)) return null;
      const type = this.equippedWeaponType(), m = this.masteryOf(type), gb = this.gb();
      const gain = Math.max(1, Math.round(baseExp * (gb.weaponExpMultiplier ?? 1) * this.traitWeaponExpMult(type)));
      const before = m.level; m.exp += gain;
      const max = gb.weaponMasteryMaxLevel ?? 999;
      while (m.level < max && m.exp >= this.masteryExpNeeded(m.level)) { m.exp -= this.masteryExpNeeded(m.level); m.level++; }
      if (m.level >= max) m.exp = 0;
      return { type, gain, before, after: m.level, leveled: m.level > before };
    }

    // 戦闘終了時：HP/MP を独立した確率判定で成長
    rollVitalGrowth() {
      if (this.isNoGrowthJob()) return null;
      const gb = this.gb(), job = this.profile.currentJob, out = { hp: 0, mp: 0 };
      const hpRate = (gb.baseHpGrowthRate ?? 0) + ((gb.jobHpGrowthBonus || {})[job] ?? 0);
      const mpRate = ((gb.baseMpGrowthRate ?? 0) + ((gb.jobMpGrowthBonus || {})[job] ?? 0)) * this.traitMpGrowthMult();
      const amt = r => Math.floor(Math.random() * ((r?.max ?? 1) - (r?.min ?? 1) + 1)) + (r?.min ?? 1);
      if (Math.random() < hpRate) out.hp = amt(gb.hpGrowthAmount);
      if (Math.random() < mpRate) out.mp = amt(gb.mpGrowthAmount);
      if (!out.hp && !out.mp) return null;
      const b = this.profile.baseStats; this.profile.currentVitals ||= { hp: b.maxHp, mp: b.maxMp };
      if (out.hp) { b.maxHp += out.hp; this.profile.currentVitals.hp += out.hp; if (this.player) { this.player.stats.maxHp += out.hp; this.player.hp += out.hp; } }
      if (out.mp) { b.maxMp += out.mp; this.profile.currentVitals.mp += out.mp; if (this.player) { this.player.stats.maxMp += out.mp; this.player.mp += out.mp; } }
      const pt = this.profile.playtest;
      if (pt) { if (out.hp) { pt.hpGrowthCount++; pt.hpGrowthTotal += out.hp; } if (out.mp) { pt.mpGrowthCount++; pt.mpGrowthTotal += out.mp; } }
      return out;
    }

    // 攻撃発動時：この攻撃から派生する未習得技を抽選
    learnedWeaponSkillIds() { return this.profile.learnedWeaponSkills ||= []; }
    hasWeaponSkill(id) { return this.learnedWeaponSkillIds().includes(id); }
    rollSpark(sourceSkillId) {
      if (this.isNoGrowthJob()) return null;
      const gb = this.gb();
      const candidates = Object.values(D.skills).filter(s => s.prerequisiteSkill === sourceSkillId && !this.hasWeaponSkill(s.id));
      for (const skill of candidates) {
        const type = skill.weaponType;
        if (type && this.equippedWeaponType() !== type) continue;
        const equippedTree = this.equippedWeapon()?.guitarSkillTree;
        if (equippedTree && skill.weaponType === 'instrument' && skill.guitarTreeId !== equippedTree) continue;
        if (skill.requiredWeaponId && this.profile.equipment?.rightHand !== skill.requiredWeaponId) continue;
        if ((this.masteryOf(type).level || 1) < (skill.requiredWeaponLevel ?? 1)) continue;
        const rate = (skill.sparkRate ?? gb.sparkBaseRate ?? 0) * this.traitSparkMult(type);
        if (Math.random() < rate) {
          this.learnedWeaponSkillIds().push(skill.id);
          const pt = this.profile.playtest;
          if (pt) { pt.sparkLog ||= []; pt.sparkLog.push({ skillId: skill.id, name: skill.name, battle: (pt.battles || 0) + 1 }); }
          this.saveProfile();
          return skill;
        }
      }
      return null;
    }
    // 装備中カテゴリの通常攻撃
    basicAttackSkill() { const map = D.basicAttackByWeaponType || {}; return D.skills[map[this.equippedWeaponType()]] || D.skills.attack; }
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
        return `<div class="mst-row${cur === t.id ? ' current' : ''}"><div class="mst-head"><span>${t.name}</span><b>Lv.${m.level}</b>${cur === t.id ? '<em>装備中</em>' : ''}</div><i class="mst-bar"><em style="width:${pct}%"></em></i><small>${m.exp} / ${need}（${pct.toFixed(2)}%）</small>${skills.length ? `<div class="mst-skills">${skills.map(s => `<mark>${s.name}</mark>`).join('')}</div>` : ''}</div>`;
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
    learnedWeaponSkills() { return this.learnedWeaponSkillIds().map(id => D.skills[id]).filter(Boolean); }
    weaponSkillMatchesEquipped(skill) { const tree = this.equippedWeapon()?.guitarSkillTree; if (tree) return skill.guitarTreeId === tree; return !skill.guitarTreeId; }
    weaponTypeList() { return D.weaponTypes || []; }
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
    personalSkills() { const sig = D.skills[D.jobs[this.profile.currentJob]?.signatureSkillId]; return sig && sig.type !== 'PASSIVE' ? [sig] : []; }
    resonanceEnabled() { return this.profile.currentJob === 'guardian' || (this.isPhantomThief() && this.isJobMastered('guardian')); }
    resonanceMultiplier(value = this.player?.resonance || 0) { return (D.guardianBalance?.resonanceTiers || []).find(t => value >= t.min)?.multiplier || 0; }
    jobLearnedActiveSkills(jobId) { const job = D.jobs[jobId]; if (!job) return []; const jlv = this.profile.jobs[jobId]?.level || 0; const list = Object.entries(job.skillUnlocks || {}).filter(([lv]) => Number(lv) <= jlv).map(([, id]) => D.skills[id]).filter(s => s && s.type !== 'PASSIVE'); const sig = D.skills[job.signatureSkillId]; if (sig && sig.type !== 'PASSIVE' && !list.some(s => s.id === sig.id)) list.unshift(sig); return list; }
    allLearnedPassives() { const ids = [...(this.profile.learnedJobSkills || []), ...(this.profile.learnedCharacterSkills || [])]; return [...new Set(ids)].map(id => D.skills[id]).filter(s => s?.type === 'PASSIVE'); }
    setPassiveSlot(idx, skillId) { this.setEquippedPassive(idx, skillId); }
    syncSkillUnlocks() { const learnedCharacter = new Set(this.profile.learnedCharacterSkills || []), learnedJob = new Set(this.profile.learnedJobSkills || []); (D.characterSkillProgression || []).forEach(entry => { if (this.profile.level >= entry.level) learnedCharacter.add(entry.skillId); }); Object.entries(this.profile.jobs || {}).forEach(([jobId, progress]) => { const job = D.jobs[jobId]; Object.entries(job?.skillUnlocks || {}).forEach(([level, skillId]) => { if (progress.level >= Number(level)) learnedJob.add(skillId); }); }); this.profile.learnedCharacterSkills = [...learnedCharacter]; this.profile.learnedJobSkills = [...learnedJob]; const allowed = new Set(['quickSlash', ...learnedCharacter, ...learnedJob]); this.profile.activeSkills = (this.profile.activeSkills || []).filter(id => allowed.has(id) && D.skills[id]?.type !== 'PASSIVE').slice(0, 4); }
    learnedActiveSkillIds() { return [...new Set(['quickSlash', ...(this.profile.learnedCharacterSkills || []), ...(this.profile.learnedJobSkills || [])])].filter(id => D.skills[id]?.type !== 'PASSIVE'); }
    characterHasSkill(id) { return (this.profile.learnedCharacterSkills || []).includes(id) || (D.characterSkillProgression || []).some(entry => entry.skillId === id && this.profile.level >= entry.level); }
    jobExpNeeded(level) { return D.jobExpTable[level] || null; }
    activeJobBonuses(jobId = this.profile.currentJob) { if ((this.gb().jobGrowthPerLevel || {})[jobId]) return {}; const job = D.jobs[jobId], level = this.profile.jobs?.[jobId]?.level || 1, bonuses = {}; for (let lv = 1; lv <= level; lv++) Object.entries(job?.growth?.[lv] || {}).forEach(([key, value]) => bonuses[key] = (bonuses[key] || 0) + value); return bonuses; }
    storedVitals(stats = this.totalStats()) { const v = this.profile.currentVitals || {}; return { hp: clamp(Number.isFinite(v.hp) ? v.hp : stats.maxHp, 0, stats.maxHp), mp: clamp(Number.isFinite(v.mp) ? v.mp : stats.maxMp, 0, stats.maxMp) }; }
    persistVitals() { if (!this.player) return; this.profile.currentVitals = { hp: clamp(this.player.hp, 0, this.player.stats.maxHp), mp: clamp(this.player.mp, 0, this.player.stats.maxMp) }; this.saveProfile(); }
    expNeeded(level = this.profile.level) { return D.expTable[level] || Math.round(220 * Math.pow(1.48, level - 3)); }
    equipmentDefinition(id) { return D.weapons[id] || D.accessories[id] || D.armors?.[id] || D.equipment?.[id] || null; }
    equipmentBonuses(equipment = this.profile.equipment) {
      const result = {}; const add = (source, rate = 1) => Object.entries(source?.bonuses || {}).forEach(([k, v]) => result[k] = (result[k] || 0) + v * rate);
      const isDualBlade = this.profile?.currentJob === 'dualBlade';
      Object.entries(equipment).forEach(([slot, id]) => { const rate = isDualBlade && slot === 'leftHand' && D.weapons[id] ? (D.dualBladeOffHandRate || 0.70) : 1; add(this.equipmentDefinition(id), rate); }); return result;
    }
    isBossDefeated(id) { return !!(this.profile.bossDefeated?.[id] || (id === 'zenacad' && this.profile.flags.zenakadoDefeated)); }
    markBossDefeated(id) { this.profile.bossDefeated ||= {}; this.profile.bossDefeated[id] = true; if (id === 'zenacad') this.profile.flags.zenakadoDefeated = true; }
    isBossSeriesUnlocked(series) { const bossId = series?.unlockCondition?.bossDefeated; return !!bossId && this.isBossDefeated(bossId); }
    unlockedBossSeries() { return Object.values(D.bossEquipmentSeries || {}).filter(series => this.isBossSeriesUnlocked(series)); }
    equippedSeriesCount(seriesId, equipment = this.profile.equipment) { return Object.values(equipment).filter(id => id && (D.items[id]?.seriesId === seriesId || this.equipmentDefinition(id)?.seriesId === seriesId)).length; }
    activeSetEffects(equipment = this.profile.equipment) { const effects = {}; this.unlockedBossSeries().forEach(series => { const count = this.equippedSeriesCount(series.id, equipment); Object.entries(series.setBonuses || {}).forEach(([needed, bonus]) => { if (count >= Number(needed)) Object.assign(effects, bonus.effect || {}); }); }); return effects; }
    totalStats(equipment = this.profile.equipment) {
      const total = clone(this.profile.baseStats), bonuses = this.equipmentBonuses(equipment), jobBonuses = this.activeJobBonuses(), jobGrowth = this.jobStatBonuses(); Object.entries(bonuses).forEach(([k, v]) => total[k] = (total[k] || 0) + v); Object.entries(jobBonuses).forEach(([k, v]) => total[k] = (total[k] || 0) + v); Object.entries(jobGrowth).forEach(([k, v]) => total[k] = (total[k] || 0) + v); const setEffects = this.activeSetEffects(equipment); for (const key of ['str', 'vit', 'mag', 'mnd', 'agi', 'dex', 'luk']) { const pct = setEffects[`${key}Percent`] || 0; if (pct) total[key] = Math.max(total[key] + 1, Math.floor(total[key] * (1 + pct / 100))); } if (setEffects.critBonusFlat) total.critBonus = (total.critBonus || 0) + setEffects.critBonusFlat; if (this.profile.flags.ramenBuffActive) total.maxHp = Math.ceil(total.maxHp * 1.03); total.critBonus ||= 0; this.applyPassiveStats(total); total.def = total.vit; /* 旧互換：def は体力と同義。装備防御力は defensePowerFor() 側で加算する */ /* 強化は基礎能力ではなく装備自身の戦闘能力を伸ばす（equipmentCombatStats で加算） */ return total;
    }
    getDungeon(id = this.currentDungeonId) { return (D.dungeons || []).find(d => d.id === id) || (D.dungeons || [])[0]; }
    isDungeonUnlocked(id) { const d = this.getDungeon(id); if (!d) return false; if (!d.unlockCondition) return true; if (d.unlockCondition === 'dungeon1Clear') return this.isBossDefeated('zenacad'); if (d.unlockCondition === 'dungeon2Clear') return this.isBossDefeated('myrthi'); return false; }
    applyDungeonBackground() { const dungeon = this.getDungeon(), floor = this.activeFloor(this.currentDungeonId); const bg = floor?.background || dungeon?.background || 'assets/bg/dungeon-battle-01.png'; const bf = $('#battlefield'); bf.dataset.dungeon = this.currentDungeonId; bf.dataset.floor = floor?.id || ''; bf.style.backgroundImage = `linear-gradient(#0207134a,#0208171f 58%,#02040b5c),url("${bg}")`; bf.style.backgroundSize = 'auto,cover'; bf.style.backgroundPosition = 'center,center bottom'; bf.style.backgroundRepeat = 'no-repeat,no-repeat'; }
    // 武道家が素手のときは拳を握る（JOB特性《無手の型》）。他JOBは従来どおり杖にフォールバック。
    isBareHanded(hand = 'rightHand') { return !D.weapons[this.profile.equipment?.[hand]]; }
    usesBareFists() { return this.jobHasTrait('bareFists') && this.isBareHanded('rightHand'); }
    jobHasTrait(key, jobId = this.profile.currentJob) { return !!D.jobs[jobId]?.traits?.[key]; }
    equippedWeapon() { return D.weapons[this.profile.equipment.rightHand] || (this.usesBareFists() ? D.weapons.bareFist : D.weapons.mageStaff); }
    // 左手が殴れるか＝双刃士のオフハンド武器、または武道家の素手。返り値は左手側の武器定義。
    offHandWeapon() {
      if (this.usesBareFists()) return D.weapons.bareFist;
      const id = this.profile.equipment?.leftHand;
      return this.jobHasTrait('offHandPower') && D.weapons[id] ? D.weapons[id] : null;
    }
    // 左手攻撃の倍率。武道家《無手の型》も双刃士《二刀の型》も同じ仕組みで、
    // JOB特性の rate を転生回数で伸ばした値を使う。
    offHandRate() { return this.jobTraitRate(this.usesBareFists() ? 'bareFists' : 'offHandPower'); }
    progressState() { const f = this.profile.flags, noelGoal = D.battleProgression?.noelEncounterWins || 3, zenakadoGoal = D.battleProgression?.zenakadoEncounterWins || 7; if (!f.noelFirstEncounterCleared) { const wins = Math.max(0, f.preNoelBattleWins || 0); return { phase: 'noel', wins, goal: noelGoal, ready: wins >= noelGoal, bossId: 'noelFirstEncounter', bossName: 'NOËL' }; } if (!f.zenakadoDefeated) { const wins = Math.max(0, f.postNoelBattleWins || 0); return { phase: 'zenakado', wins, goal: zenakadoGoal, ready: wins >= zenakadoGoal, bossId: 'zenakado', bossName: 'ZENAKADO' }; } return { phase: 'complete', wins: zenakadoGoal, goal: zenakadoGoal, ready: false, bossId: null, bossName: 'DUNGEON CLEAR' }; }

    startBattle() {
      if (this.currentDungeonId === 'dungeon3' && (this.profile.flags.dungeon3BattleWins || 0) >= (D.settings.dungeon3MidBossWins || 150) && !this.isBossDefeated('versicrell')) { this.showMenu('battle'); return; }
      this.battleMode = 'slime'; const hadRamenBuff = !!this.profile.flags.ramenBuffActive, stats = this.totalStats(), vitals = this.storedVitals(stats); if (hadRamenBuff) { this.profile.flags.ramenBuffActive = false; this.saveProfile(); } this.player = { stats, hp: D.settings.healOnBattleStart ? stats.maxHp : vitals.hp, mp: D.settings.healOnBattleStart ? stats.maxMp : vitals.mp, inventory: this.profile.inventory, buffs: {}, cooldowns: {}, resonance: 0, lastReceivedType: null };
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
      this.battleMode = phase; const hadRamenBuff = !!this.profile.flags.ramenBuffActive, stats = this.totalStats(), template = D.enemies[bossId]; if (!template) { this.showMenu('home'); return; } this.playBossMusic(bossId); if (hadRamenBuff) { this.profile.flags.ramenBuffActive = false; this.saveProfile(); }
      const vitals = this.storedVitals(stats); this.player = { stats, hp: vitals.hp, mp: vitals.mp, inventory: this.profile.inventory, buffs: {}, cooldowns: {}, resonance: 0, lastReceivedType: null };
      const bossStats = template.dynamicScale ? { maxHp: stats.maxHp * template.dynamicScale, atk: Math.max(stats.str, stats.mag) * template.dynamicScale, def: stats.def * template.dynamicScale, mag: stats.mag * template.dynamicScale, mnd: stats.mnd * template.dynamicScale, spd: stats.agi * template.dynamicScale } : { ...template.stats };
      this.enemies = [{ ...template, uid: `${template.id}-boss`, label: '', stats: bossStats, hp: bossStats.maxHp, alive: true, bindResistance: template.bindResistance ?? .35, bindTurns: 0 }];
      this.turn = 1; this.locked = false; this.finished = false; this.resetBattleLog(); this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [], masteryResults: [], jobResults: [] }; $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual(); this.applyDungeonBackground();
      this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); this.setLog(this.battleMode === 'noel' ? '忘却の最奥――永遠の裁定者ノエルが姿を現した……。' : '静寂のホールに、独奏卿ゼナカドの旋律が響く……！'); this.flashTitle('BOSS ENCOUNTER', (template.nameEn || template.name || progress.bossName).toUpperCase()); this.showMainCommands();
    }
    startMyrthiBoss() {
      this.battleMode = 'myrthi'; const hadRamenBuff = !!this.profile.flags.ramenBuffActive, stats = this.totalStats(), template = D.enemies.myrthi;
      this.playBossMusic('myrthi');
      if (hadRamenBuff) { this.profile.flags.ramenBuffActive = false; this.saveProfile(); }
      const vitals = this.storedVitals(stats); this.player = { stats, hp: vitals.hp, mp: vitals.mp, inventory: this.profile.inventory, buffs: {}, cooldowns: {}, resonance: 0, lastReceivedType: null };
      const bossStats = { ...template.stats };
      const boss = { ...template, uid: 'myrthi-boss', label: '', stats: bossStats, hp: bossStats.maxHp, alive: true, beat: 0, accelerandoActivated: false, bindResistance: template.bindResistance ?? .35, bindTurns: 0 };
      this.enemies = [boss];
      this.turn = 1; this.locked = false; this.finished = false; this.resetBattleLog(); this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [], masteryResults: [], jobResults: [] };
      $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual(); this.applyDungeonBackground();
      this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); this.setLog('沈黙の楽殿に、黒紅の旋風が舞い込む……！'); this.flashTitle('BOSS ENCOUNTER', 'MYRTHI'); this.showMainCommands();
    }
    startVersicrellBoss() {
      this.battleMode = 'versicrell'; const stats = this.totalStats(), template = D.enemies.versicrell, vitals = this.storedVitals(stats);
      this.playBossMusic('versicrell');
      this.player = { stats, hp: vitals.hp, mp: vitals.mp, inventory: this.profile.inventory, buffs: {}, cooldowns: {}, resonance: 0, lastReceivedType: null };
      const bossStats = { ...template.stats };
      this.enemies = [{ ...template, uid: 'versicrell-boss', label: '', stats: bossStats, hp: bossStats.maxHp, alive: true, form: 1, movement: null, movementActionsLeft: 0, falseCadenceUsed: false, coda: false, bindResistance: template.bindResistance ?? .40, bindTurns: 0 }];
      this.turn = 1; this.locked = false; this.finished = false; this.resetBattleLog(); this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [], masteryResults: [], jobResults: [] };
      $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual(); this.applyDungeonBackground();
      this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); this.setLog('ヴェルシクレル「……一周するまで、聴いていけば？」'); this.flashTitle('MID BOSS ENCOUNTER', 'VERSICRELL // SILVER CIRCLE'); this.showMainCommands();
    }
    startSeripesBoss() {
      this.battleMode = 'seripes'; const stats = this.totalStats(), template = D.enemies.seripes, vitals = this.storedVitals(stats);
      this.playBossMusic('seripes');
      this.player = { stats, hp: vitals.hp, mp: vitals.mp, inventory: this.profile.inventory, buffs: {}, cooldowns: {}, resonance: 0, lastReceivedType: null };
      const bossStats = { ...template.stats };
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
      else { ren.classList.add('hit'); this.audio.sfx('playerHit'); const actual = this.receivePlayerDamage(damage, magical ? 'magical' : 'physical'); this.floating(ren, actual, 'enemy-damage'); this.setLog(`RENは${actual}ダメージを受けた！`); }
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
      if (!outcome.hit) { this.triggerEvade(enemy, 'player', chosen, { source: 'myrthiAttack' }); this.floating(ren, 'EVADE', 'miss'); this.setLog(`ミルティの${chosen.name}！ RENは攻撃をかわした！ 【BEAT ${enemy.beat}/4】`); this.updateHUD(); await this.battleSleep(450); el.classList.remove('enemy-attacking'); return; }
      ren.classList.add('hit');
      this.audio.sfx('playerHit'); const actual = this.receivePlayerDamage(damage, 'physical'); this.floating(ren, actual, 'enemy-damage');
      this.setLog(`ミルティの${chosen.name}！ RENは${actual}ダメージを受けた！ 【BEAT ${enemy.beat}/4】`); this.updateHUD(); await this.battleSleep(450); el.classList.remove('enemy-attacking'); ren.classList.remove('hit');
      await this.tryCounter(enemy);
    }
    isAdvancedJobUnlocked(jobId) {
      const job = D.jobs[jobId]; if (!job?.unlockCondition) return true;
      const cond = job.unlockCondition;
      if (cond.bossDefeated && !this.isBossDefeated(cond.bossDefeated)) return false;
      if (cond.jobLevels) { for (const [reqId, reqLv] of Object.entries(cond.jobLevels)) { if ((this.profile.jobs[reqId]?.level || 1) < reqLv) return false; } }
      return true;
    }
    checkAdvancedJobUnlocks() { const ids = D.advancedJobIds || []; ids.forEach(id => { if (this.isAdvancedJobUnlocked(id)) { const job = D.jobs[id]; if (job && !this.profile.jobs[id]) this.profile.jobs[id] = { level: 1, exp: 0 }; } }); }
    makeEnemy(id, index) {
      const t = D.enemies[id];
      return { ...t, uid: `enemy-${index}`, label: String.fromCharCode(65 + index), stats: { ...t.stats }, hp: t.stats.maxHp, alive: true, bindResistance: t.bindResistance || 0, bindTurns: 0 };
    }
    rollEncounter(wins, progression) {
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
    renderEnemies() { this.noteEnemiesSeen(); $('#enemies').classList.toggle('boss-party', this.battleMode !== 'slime'); $('#enemies').innerHTML = this.enemies.map((e, i) => { const statuses = `<button type="button" class="status-strip enemy-statuses" aria-label="敵の状態と解析情報" onclick="event.preventDefault();event.stopPropagation();window.arseneGame?.openEnemyStatus(${i})"></button>`; const bossClass = e.id === 'seripes' ? ' seripes-boss' : e.id === 'versicrell' ? ` versicrell-boss form-${e.form || 1}` : ''; return e.kind === 'boss' ? `<div role="button" tabindex="0" class="enemy boss-enemy${bossClass} fighter idle" id="${e.uid}" data-enemy="${i}" aria-label="${e.name}"><div class="enemy-hud boss-hud"><span>${e.name} // ${e.title}</span><div class="enemy-hp-meter"><i style="width:100%"></i></div><small>???? / ????</small>${statuses}</div><div class="slime-shadow boss-shadow"></div><div class="noel-sprite${e.spriteClass ? ' ' + e.spriteClass : ''}"${e.sprite ? ` style="background-image:url('${e.sprite}')"` : ''}></div></div>` : `<div role="button" tabindex="0" class="enemy enemy-${e.id} fighter idle delay-${i}" id="${e.uid}" data-enemy="${i}" aria-label="${e.name}${e.label}"><div class="enemy-hud"><span>${e.name} ${e.label}</span><div class="enemy-hp-meter"><i style="width:100%"></i></div><small>???? / ????</small>${statuses}</div><div class="slime-shadow"></div><div class="slime"${e.sprite ? ` style="background-image:url('${e.sprite}')"` : ''}></div></div>`; }).join(''); }
    applyEquipmentVisual() {
      const w = this.equippedWeapon(), layer = $('#weapon-layer'); layer.className = `weapon-layer weapon-${w.weaponType} sprite-${w.weaponSprite}`; layer.dataset.weaponId = w.id; layer.dataset.weaponType = w.weaponType; layer.title = w.name; const weaponName = $('#weapon-name'); if (weaponName) weaponName.textContent = `RIGHT HAND // ${w.name}`;
      if (w.battleSprite) layer.style.backgroundImage = `url("${w.battleSprite}")`; else layer.style.removeProperty('background-image');
    }
    applySetBattleVisual() { const ren = $('#ren'), active = this.equippedSeriesCount('zenacad') >= 6; ren.classList.toggle('zenacad-six-set', active); if (active) { ren.classList.add('set-intro'); setTimeout(() => ren.classList.remove('set-intro'), 1800); } }
    updateHUD() {
      const p = this.player, expNeed = this.expNeeded(); $('#player-hp').textContent = `${p.hp} / ${p.stats.maxHp}`; $('#player-mp').textContent = `${p.mp} / ${p.stats.maxMp}`; $('#player-hp-bar').style.width = `${100 * p.hp / p.stats.maxHp}%`; $('#player-mp-bar').style.width = `${100 * p.mp / p.stats.maxMp}%`; const expBar = $('#player-exp-bar'), mType = this.equippedWeaponType(), m = this.masteryOf(mType), mNeed = this.masteryExpNeeded(m.level), expPct = Math.min(100, 100 * m.exp / mNeed); if (expBar) { expBar.style.width = `${expPct}%`; $('#player-exp-label').textContent = `${expPct.toFixed(2)}%`; } const mName = $('#player-exp-name'); if (mName) mName.textContent = `${this.weaponTypeName(mType)} Lv.${m.level}`; const jid = this.profile.currentJob, jst = this.profile.jobs?.[jid] || {}, jlv = jst.level || 1, jneed = this.jobExpNeeded(jlv), jexp = jst.exp || 0, jpct = jneed ? Math.min(100, 100 * jexp / jneed) : 100, jexpBar = $('#player-jexp-bar'), jexpName = $('#player-jexp-name'); if (jexpName) jexpName.textContent = `${D.jobs[jid]?.name || 'JOB'} Lv.${jlv}`; if (jexpBar) { jexpBar.style.width = `${jpct}%`; $('#player-jexp-label').textContent = jneed ? `${jpct.toFixed(2)}%` : 'MASTER'; } const jobLabel = $('#player-job-label'); if (jobLabel) jobLabel.textContent = `${D.jobs[jid]?.name || ''} Lv.${jlv}`; $('#turn-label').textContent = `TURN ${String(this.turn).padStart(2, '0')}`;
      const rr = $('#resonance-row'), resonance = Math.min(D.guardianBalance?.resonanceMax || 100, this.player?.resonance || 0); if (rr) { rr.hidden = !this.resonanceEnabled(); rr.classList.toggle('max', resonance >= 100); $('#resonance-bar').style.width = `${resonance}%`; $('#resonance-label').textContent = resonance >= 100 ? 'MAX' : `${resonance.toFixed(1)}%`; }
      this.renderBattleStatuses();
      this.enemies.forEach(e => { const el = document.getElementById(e.uid); if (el) $('.enemy-hp-meter i', el).style.width = `${100 * e.hp / e.stats.maxHp}%`; });
    }
    statusEffectDescription(label, detail = '') {
      if (detail && detail !== label) return detail;
      const key = String(label).replace(/\s+\d+T$|\s+\d+$|\s+×\d+$/g, '');
      const descriptions = {
        'ATK↑': '次に行う物理攻撃の威力が上昇します。', 'ATK↓': '物理攻撃の威力が10%低下しています。', 'MAG↓': '魔法攻撃の威力が10%低下しています。', '魔力装填': '次の物理攻撃へ魔力依存の追加ダメージを加えます。',
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
      const s = this.player?.stats || {}, b = this.player?.buffs || {}, wType = this.equippedWeaponType();
      const atkBase = Math.round(this.attackPowerFor(wType, s)), magical = this.weaponDamageType(wType) === 'magical';
      const songRate = typeof this.songBuffRate === 'function' ? this.songBuffRate(magical ? 'matkUp' : 'atkUp') : 0;
      const chargeRate = magical ? 0 : (b.atkCharge?.rate || 0), atkRate = songRate + chargeRate, atkNow = Math.round(atkBase * (1 + atkRate));
      const pDefBase = Math.round(this.defensePowerFor('physical', s)), mDefBase = Math.round(this.defensePowerFor('magical', s));
      let defRate = b.defUp && this.turn <= b.defUp.until ? (b.defUp.rate || 0) : 0; if (this.player.defDownUntil >= this.turn) defRate -= .20;
      const pDefNow = Math.max(0, Math.round(pDefBase * (1 + defRate)));
      const row = (name, base, now = base, suffix = '') => { const delta = now - base, changed = delta !== 0; return `<div class="battle-stat-row${changed ? delta > 0 ? ' up' : ' down' : ''}"><span>${name}</span><b>${changed ? `${base} → ${now}` : now}</b><em>${changed ? `${delta > 0 ? '+' : ''}${delta}${suffix}` : '－'}</em></div>`; };
      return `<section class="battle-stat-debug"><header><b>LIVE BATTLE STATUS</b><span>バフ込み実効値</span></header><div class="battle-vitals"><span>HP <b>${this.player.hp} / ${s.maxHp}</b></span><span>MP <b>${this.player.mp} / ${s.maxMp}</b></span></div><div class="battle-stat-grid">${row(`${this.weaponTypeName(wType)}攻撃性能`, atkBase, atkNow, atkRate ? ` / ${Math.round(atkRate * 100)}%` : '')}${row('物理防御', pDefBase, pDefNow, defRate ? ` / ${Math.round(defRate * 100)}%` : '')}${row('魔法防御', mDefBase)}${row('力 STR', s.str)}${row('魔力 MAG', s.mag, Math.round(this.effectivePlayerStat('mag')))}${row('体力 VIT', s.vit)}${row('精神 MND', s.mnd)}${row('素早さ AGI', s.agi)}${row('器用さ DEX', s.dex)}${row('運 LUK', s.luk)}</div></section>`;
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
        if (b.atkCharge) chips.push(this.statusChip('ATK↑'));
        if (b.magicCharge) chips.push(this.statusChip('魔力装填'));
        if (b.defUp && this.turn <= b.defUp.until) chips.push(this.statusChip('DEF↑', 'buff', '', b.defUp.until - this.turn + 1 <= 1));
        if (b.fortressUntil >= this.turn) chips.push(this.statusChip('FORTRESS', 'buff', '', b.fortressUntil - this.turn + 1 <= 1));
        if (this.player?.defDownUntil >= this.turn) chips.push(this.statusChip('DEF↓', 'debuff', '', this.player.defDownUntil - this.turn + 1 <= 1));
        if (b.versicrellAtkDown && this.turn <= b.versicrellAtkDown.until) chips.push(this.statusChip('ATK↓', 'debuff', '', b.versicrellAtkDown.until - this.turn + 1 <= 1));
        if (b.versicrellMagDown && this.turn <= b.versicrellMagDown.until) chips.push(this.statusChip('MAG↓', 'debuff', '', b.versicrellMagDown.until - this.turn + 1 <= 1));
        if (b.regenerate || b.nocturneUntil >= this.turn) { const remain = b.regenerate || (b.nocturneUntil - this.turn + 1); chips.push(this.statusChip(`再生 ${remain}T`, 'buff', '', remain <= 1)); }
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
        const el = document.getElementById(e.uid), strip = el?.querySelector('.enemy-statuses'); if (!strip) return;
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
    resetBattleLog() { this.battleLogHistory = []; this.battleEvents = []; this.battleLogExpanded = false; $('#log')?.classList.remove('expanded'); }
    setLog(text) { if (!text) return; this.battleLogHistory ||= []; this.battleLogHistory.push(text); if (this.battleLogHistory.length > 100) this.battleLogHistory.shift(); this.renderBattleLog(); }
    renderBattleLog() { const log = $('#log'); if (!log) return; const rows = this.battleLogExpanded ? this.battleLogHistory : this.battleLogHistory.slice(-3); log.innerHTML = `<small>COMBAT LOG // ${this.battleLogExpanded ? 'TAP TO CLOSE' : 'TAP FOR HISTORY'}</small><div class="battle-log-lines">${rows.map(t => `<p>${t}</p>`).join('')}</div>`; log.scrollTop = this.battleLogExpanded ? log.scrollHeight : 0; }
    toggleBattleLog() { this.battleLogExpanded = !this.battleLogExpanded; $('#log')?.classList.toggle('expanded', this.battleLogExpanded); this.renderBattleLog(); }
    flashTitle(main, sub = '') { const a = $('#announcer'); a.innerHTML = `<strong>${main}</strong><span>${sub}</span>`; a.classList.remove('show'); void a.offsetWidth; a.classList.add('show'); }
    battleSleep(ms) { return sleep(this.autoBattle ? Math.floor(ms / 1.5) : ms); }
    panel(html) { $('#command-panel').innerHTML = html; }
    button(label, sub, action, disabled = false) { return `<button data-action="${action}" ${disabled ? 'disabled' : ''}><i></i><strong>${label}</strong><span>${sub}</span></button>`; }
    bindActions(actions) { $('#command-panel').onclick = async e => { const b = e.target.closest('[data-action]'); if (b && !b.disabled && !this.locked) { await this.audio.unlock(); this.audio.sfx('ui'); actions[b.dataset.action]?.(); } }; }
    showMainCommands() {
      $('#phase-label').textContent = this.autoBattle ? 'AUTO' : 'COMMAND';
      const itemCount = (this.profile.inventory.potion || 0) + (this.profile.inventory.manaPotion || 0);
      const curJobId = this.profile.currentJob, mainCmd = this.jobCommand(curJobId);
      const personal = this.personalSkills().filter(s => s.id !== 'resonanceBreak');
      const basic = this.basicAttackSkill(), wType = this.equippedWeaponType();
      const artsCmd = (D.weaponArtsCommand || {})[wType] || { name: '武器技', nameEn: 'WEAPON ARTS' };
      const arts = this.learnedWeaponSkills().filter(s => s.weaponType === wType && this.weaponSkillMatchesEquipped(s));
      let html = this.button(basic.name, basic.nameEn || 'ATTACK', 'attack');
      if (arts.length) html += this.button(artsCmd.name, `${artsCmd.nameEn} ▶`, 'weaponArts');
      // 条件待ちの専用技しか無い場合もボタンは出す（中で条件を見せるため）
      if (personal.length || this.conditionalSkillsForJob().length) html += this.button('固有技', 'PERSONAL ▶', 'personal');
      if (this.resonanceEnabled()) { const r = this.player?.resonance || 0; html += this.button('RESONANCE BREAK', r >= 100 ? 'MAX // NEUTRAL' : `${r.toFixed(1)}% // NEUTRAL`, 'resonance', r <= 0); }
      // ジョブ習得スキルが残っている場合のみジョブコマンドを出す（武器技とは別枠）
      const jobSkills = this.jobLearnedActiveSkills(curJobId).filter(s => s.id !== D.jobs[curJobId]?.signatureSkillId);
      if (jobSkills.length) html += this.button(mainCmd.cmd, `${mainCmd.cmdEn} ▶`, 'mainCmd');
      html += this.button('アイテム', `ITEM ×${itemCount}`, 'item') + this.button('にげる', 'ESCAPE', 'escape');
      html += `<button class="auto-battle-btn${this.autoBattle ? ' active' : ''}" data-action="auto-toggle"><i></i><strong>${this.autoBattle ? 'AUTO ON' : 'AUTO OFF'}</strong><span>BATTLE MODE</span></button>`;
      this.panel(html);
      this.bindActions({ attack: () => this.chooseTarget(basic.id), weaponArts: () => this.showWeaponArts(), personal: () => this.showPersonalSkills(), resonance: () => this.chooseTarget('resonanceBreak'), mainCmd: () => this.showCommandSkills(curJobId), item: () => this.showBattleItems(), escape: () => this.tryEscape(), 'auto-toggle': () => { this.autoBattle = !this.autoBattle; this.showMainCommands(); } });
      if (this.autoBattle && !this.locked) setTimeout(() => this.autoPickAction(), 700);
    }
    autoPickAction() { if (!this.autoBattle || this.locked || this.finished) return; const maxHp = this.player.stats.maxHp, maxMp = this.player.stats.maxMp, hpPct = this.player.hp / maxHp; if (hpPct < 0.4 && (this.profile.inventory.potion || 0) > 0) { this.useConsumable('potion'); return; } if (this.player.mp < maxMp * 0.2 && (this.profile.inventory.manaPotion || 0) > 0) { this.useConsumable('manaPotion'); return; } const aliveEnemies = this.enemies.filter(e => e.alive); const skills = this.availableSkills().filter(s => this.player.mp >= s.mp && this.cooldownRemaining(s) === 0); const weapon = this.equippedWeapon(); const atkScore = weapon?.power || 1; let best = { type: 'attack', score: atkScore }; for (const s of skills) { let score = 0; if (s.kind === 'support') { if (s.effect?.type === 'hpRecover') score = hpPct < 0.75 ? (1 - hpPct) * 200 : 0; else if (s.effect?.type === 'mpRecover') score = this.player.mp < maxMp * 0.5 ? 45 : 0; else if (s.effect?.type === 'regenerate') score = hpPct < 0.8 ? 35 : 0; } else if (s.kind === 'hybrid') { score = (s.strScale + s.magScale) * 12; } else { const multi = s.target === 'all' ? Math.min(aliveEnemies.length, 3) * 0.7 : 1; score = (s.power || 1) * (s.hits || 1) * multi; } if (score > best.score) best = { type: 'skill', skill: s, score }; } if (best.type === 'skill') { const s = best.skill; if (s.target === 'all' || s.target === 'self') { this.executeRound(s.id, -1); } else { this.executeRound(s.id, this.enemies.findIndex(e => e.alive)); } } else { this.executeRound('attack', this.enemies.findIndex(e => e.alive)); } }
    // 所持している回復系の消費アイテムをすべて並べる。
    // 以前は回復薬と魔力回復薬を直書きしていたため、アイテムを足しても
    // 戦闘中のアイテム欄に出てこなかった。
    battleUsableItems() {
      return Object.values(D.items)
        .filter(i => i.category === 'consumable' && (i.effect?.hp || i.effect?.mp) && (this.profile.inventory[i.id] || 0) > 0);
    }
    showBattleItems() {
      const items = this.battleUsableItems();
      if (!items.length) { this.panel(this.button('もどる', 'BACK', 'back')); this.bindActions({ back: () => this.showMainCommands() }); this.setLog('使えるアイテムを持っていない。'); return; }
      const rows = items.map(i => {
        const n = this.profile.inventory[i.id] || 0;
        const full = i.effect?.hp ? this.player.hp >= this.player.stats.maxHp : this.player.mp >= this.player.stats.maxMp;
        const label = i.effect?.hp ? `HP +${i.effect.hp}` : `MP +${i.effect.mp}`;
        return this.button(i.name, `${label} // ×${n}`, i.id, full);
      }).join('');
      this.panel(rows + this.button('もどる', 'BACK', 'back'));
      const actions = { back: () => this.showMainCommands() };
      items.forEach(i => { actions[i.id] = () => this.useConsumable(i.id); });
      this.bindActions(actions);
    }
    availableSkills() { const skills = [...this.personalSkills(), ...this.jobLearnedActiveSkills(this.profile.currentJob)]; const grant = this.equippedWeapon()?.grantsSkillId; if (grant && D.skills[grant]) skills.push(D.skills[grant]); return [...new Map(skills.map(s => [s.id, s])).values()]; }
    cooldownRemaining(skill) { return Math.max(0, (this.player.cooldowns?.[skill.id] || 0) - this.turn); }
    showSkills() { this.showMainCommands(); }
    showWeaponArts() { const wt = this.equippedWeaponType(); const skills = this.learnedWeaponSkills().filter(s => s.weaponType === wt && this.weaponSkillMatchesEquipped(s)); this.panel(skills.map(s => { const c = this.skillMpCost(s); return this.button(s.name, c ? `MP ${c}` : (s.nameEn || 'ARTS'), s.id, this.player.mp < c); }).join('') + this.button('もどる', 'BACK', 'back')); const actions = { back: () => this.showMainCommands() }; skills.forEach(s => { actions[s.id] = () => { const sk = D.skills[s.id]; if (sk?.randomTarget || sk?.target === 'all' || sk?.target === 'self') this.executeRound(s.id, -1); else this.chooseTarget(s.id); }; }); this.bindActions(actions); }
    showPersonalSkills() {
      const skills = this.personalSkills();
      // 発動条件を満たしていない専用技も、条件を添えてグレーで並べる。
      // 出しっぱなしにしないと「そんな技があること自体」が player に伝わらない。
      const shownIds = new Set(skills.map(s => s.id));
      const locked = this.conditionalSkillsForJob().filter(({ skill }) => !shownIds.has(skill.id)).map(({ skill }) => skill);
      const rows = [
        ...skills.map(s => { const cd = this.cooldownRemaining(s); return this.button(s.name, cd ? `CT ${cd}` : `MP ${s.mp}`, s.id, this.player.mp < s.mp || cd > 0); }),
        ...locked.map(s => { const src = this.buffSourceName(this.profile.currentJob, s.requiresBuff); return this.button(s.name, src ? `要《${src}》発動` : '条件未達', s.id, true); })
      ];
      this.panel(rows.join('') + this.button('もどる', 'BACK', 'back'));
      const actions = { back: () => this.showMainCommands() };
      skills.forEach(s => { actions[s.id] = () => { const sk = D.skills[s.id]; if (sk?.randomTarget || sk?.target === 'all' || sk?.target === 'self') this.executeRound(s.id, -1); else this.chooseTarget(s.id); }; });
      this.bindActions(actions);
    }
    showCommandSkills(jobId) { const skills = this.jobLearnedActiveSkills(jobId).filter(s => s.id !== D.jobs[jobId]?.signatureSkillId); if (!skills.length) { this.setLog('このコマンドの習得済みスキルがありません。'); return; } this.panel(skills.map(s => { const cd = this.cooldownRemaining(s); return this.button(s.name, cd ? `CT ${cd}` : `MP ${s.mp}`, s.id, this.player.mp < s.mp || cd > 0); }).join('') + this.button('もどる', 'BACK', 'back')); const actions = { back: () => this.showMainCommands() }; skills.forEach(s => { actions[s.id] = () => { const sk = D.skills[s.id]; if (sk?.randomTarget || sk?.target === 'all' || sk?.target === 'self') this.executeRound(s.id, -1); else this.chooseTarget(s.id); }; }); this.bindActions(actions); }
    chooseTarget(skillId) { const skill = D.skills[skillId]; if (skill?.target === 'all' || skill?.target === 'self') { this.executeRound(skillId, -1); return; } $('#phase-label').textContent = 'SELECT TARGET'; this.setLog('攻撃する敵を選択'); this.enemies.forEach((e, i) => { const el = document.getElementById(e.uid); if (e.alive) { el.classList.add('targetable'); el.onclick = () => this.executeRound(skillId, i); } }); this.panel(this.button('もどる', 'BACK', 'back')); this.bindActions({ back: () => { this.clearTargets(); this.showMainCommands(); } }); }
    clearTargets() { this.enemies.forEach(e => { const el = document.getElementById(e.uid); if (el) { el.classList.remove('targetable'); el.onclick = null; } }); }

    async executeRound(skillId, targetIndex) {
      // randomTarget（ばくれつけん等）はターゲット選択を経ずに発動するため、
      // 対象存在チェックは全体攻撃と同じ「生存敵が1体でもいるか」で判定する。
      let skill = D.skills[skillId]; const aoe = skill?.target === 'all' || skill?.randomTarget, self = skill?.target === 'self';
      if (skillId === 'resonanceBreak' && (!this.resonanceEnabled() || !(this.player?.resonance > 0))) return;
      if (this.locked || !skill || this.cooldownRemaining(skill) > 0 || (!self && (aoe ? !this.enemies.some(e => e.alive) : !this.enemies[targetIndex]?.alive))) return;
      if (skillId === 'resonanceBreak') { const stored = this.player.resonance; skill = { ...skill, resonanceStored: stored, power: this.resonanceMultiplier(stored) }; this.player.resonance = 0; this.flashTitle('RESONANCE BREAK', `${stored.toFixed(1)}% // ×${skill.power}`); }
      this.locked = true; this.clearTargets(); this.panel(''); $('#phase-label').textContent = 'ACTION'; await this.beginPlayerTurn(); const setEffects = this.activeSetEffects(), freeMp = skill.kind === 'magical' && skill.mp > 0 && Math.random() < (setEffects.freeMagicMpChance || 0); if (!freeMp) this.player.mp -= this.skillMpCost(skill); else this.flashTitle('MAESTRO', 'MP COST 0'); if (skill.cooldown) this.player.cooldowns[skill.id] = this.turn + skill.cooldown; this.persistVitals(); this.updateHUD();
      const actors = [{ type: 'player', speed: this.player.stats.agi + roll(0, 4) + (skill.speedBonus || 0), act: () => this.playerActionWithSpark(skill, targetIndex) }]; this.enemies.filter(e => e.alive).forEach(e => actors.push({ type: 'enemy', enemy: e, speed: e.stats.spd + roll(0, 4), act: () => this.enemyAttack(e) })); actors.sort((a, b) => b.speed - a.speed);
      for (const actor of actors) { if (this.finished || this.player.hp <= 0) break; if (actor.type === 'enemy' && !actor.enemy.alive) continue; await actor.act(); await this.battleSleep(300); if (!this.enemies.some(e => e.alive)) { const fallen = this.enemies[0]; if (this.battleMode === 'versicrell' && fallen?.form === 1) { await this.transformVersicrell(fallen); return; } await this.victory(); return; } }
      if (this.player.hp <= 0) { await this.defeat(); return; } this.endPlayerTurn(); this.turn++; this.locked = false; this.updateHUD(); this.showMainCommands();
    }
    effectivePlayerStat(key) { const base = this.player.stats[key] || 0; return key === 'mag' && (this.player.buffs?.blueEcho || 0) > 0 ? base * 1.10 : base; }
    // 僧侶《祈祷》などのMP自然回復。ターン開始時に最大MPの一定割合を戻す。
    async regenMpFromPassives() {
      const rate = this.passiveEffectRate('mpRegen'); if (!rate) return;
      const max = this.player.stats.maxMp;
      const gain = Math.min(Math.max(1, Math.round(max * rate)), max - this.player.mp);
      if (gain <= 0) return;
      this.player.mp += gain; this.persistVitals();
      this.floating($('#ren'), `MP+${gain}`, 'heal'); this.setLog(`祈りが魔力を満たす。MPが${gain}回復！`);
      this.updateHUD(); await this.battleSleep(200);
    }
    async beginPlayerTurn() { await this.regenMpFromPassives(); if (this.characterHasSkill('blueEcho') && Math.random() < .20) { this.player.buffs.blueEcho = 2; this.flashTitle('BLUE ECHO', 'MAG +10% // 2 TURNS'); this.setLog('蒼の残響が魔力を高める！'); await this.battleSleep(260); } if ((this.player.buffs.regenerate || 0) > 0) { const heal = Math.max(1, Math.ceil(this.player.stats.maxHp * .08)), gained = Math.min(heal, this.player.stats.maxHp - this.player.hp); this.player.hp += gained; if (gained) { this.audio.sfx('heal'); this.floating($('#ren'), `+${gained}`, 'heal'); this.setLog(`リジェネレートでHPが${gained}回復！`); this.updateHUD(); await this.battleSleep(220); } } }
    endPlayerTurn() { if ((this.player.buffs.blueEcho || 0) > 0) this.player.buffs.blueEcho--; if ((this.player.buffs.regenerate || 0) > 0) this.player.buffs.regenerate--; if (this.player.buffs.defUp && this.turn > this.player.buffs.defUp.until) delete this.player.buffs.defUp; }
    damageFor(skill, enemy, outcome = null) {
      const s = this.player.stats, w = this.equippedWeapon(), balance = D.combatBalance;
      // ── 攻撃性能：装備武器の weaponType から D.weaponScaling で決まる ──
      //   剣 = 力×1.0 ／ 爪 = 力×0.5＋素早さ×0.5 ／ 杖 = 魔力×1.0  （＋装備の攻撃力）
      // 技側に weaponType があればそれを、無ければ装備武器の種別を使う。
      const wType = skill.weaponType || w.weaponType || 'sword';
      const isMagicSkill = skill.kind === 'magical' || skill.damageType === 'magical' || this.weaponDamageType(wType) === 'magical';
      let attackPower = this.attackPowerFor(wType, s);
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
      if (skill.damageType === 'magical' || skill.kind === 'magical') value *= (1 + this.passiveEffectRate('magicDamageUp'));
      if (skill.element) value *= (1 + this.passiveEffectRate('elementDamageUp'));
      if (skill.element === 'fire') value *= (1 + this.equipmentEffectRate('fireDamagePercent'));
      // 魔奏士《魔力装填》：次の物理攻撃へ魔力依存の追加ダメージ
      if (isPhysical && this.player.buffs?.magicCharge) value += this.effectivePlayerStat('mag') * (this.gb().magicChargeRate ?? 0.5);
      value += roll(balance.playerVariance.min, balance.playerVariance.max);
      // 会心抽選は命中抽選より先にrollPlayerAttackOutcome()で行う。
      // outcome未指定は外部拡張との互換用で、従来どおり会心だけを抽選する。
      if (critical) value *= balance.critical.multiplier; return { value: Math.max(1, Math.round(value)), critical };
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
      this.audio.sfx('heal');
      await this.battleSleep(1150);
      flash.remove(); cut.remove(); ren.classList.remove('sparking');
    }
    // 攻撃が実際に発動するタイミングで閃きを判定し、成功したらその場で技を差し替える
    async playerActionWithSpark(skill, targetIndex) {
      const sparked = this.rollSpark(skill.id);
      if (!sparked) { await this.playerAction(skill, targetIndex); return; }
      // 閃いたターンはMP未消費のまま発動する（executeRound は元の通常攻撃のMP0しか引いていない）
      await this.sparkPresentation(sparked);
      this.battleSparks ||= []; this.battleSparks.push(sparked);
      await this.playerAction(sparked, targetIndex);
    }
    async playerAction(skill, targetIndex) { await this.playerAttack(skill, targetIndex); await this.offHandStrike(skill, targetIndex); const setFx = this.activeSetEffects(); const repeatChance = setFx.magicRepeatChance || 0; if (skill.kind === 'magical' && this.enemies.some(e => e.alive) && Math.random() < repeatChance) { this.flashTitle('《独奏曲》', 'CADENZA // ENCORE'); this.setLog('ゼナカドの旋律が魔法を再演する！'); await this.battleSleep(360); await this.playerAttack(skill, targetIndex); } const physRepeatChance = setFx.physicalRepeatChance || 0; if (skill.kind === 'physical' && this.enemies.some(e => e.alive) && Math.random() < physRepeatChance) { this.flashTitle('DEADLY RHYTHM', 'MYRTHI // EXTRA BEAT'); this.setLog('鼓動が刻む追加連撃！'); await this.battleSleep(360); await this.playerAttack(skill, targetIndex); } }
    async playerAttack(skill, targetIndex) {
      if (skill.target === 'self') { await this.applySelfSkill(skill); return; }
      if (skill.target === 'all' && !skill.randomTarget) { await this.playerAttackAll(skill); return; }
      let target = this.enemies[targetIndex]; if (!target || !target.alive) target = this.enemies.find(e => e.alive); if (!target) return; const w = this.equippedWeapon(), staffAttack = skill.kind === 'weapon' && skill.damageType === 'magical'; this.setLog(staffAttack ? `${w.name}に魔力を集める！` : `${skill.name}！`); if (skill.kind !== 'weapon') this.flashTitle(skill.name, 'QUICK EXECUTION'); this.audio.sfx(staffAttack ? 'magic' : skill.id === 'quickSlash' ? 'quick' : 'slash');
      const ren = $('#ren'), el = document.getElementById(target.uid), hits = skill.hits || 1; ren.classList.add(staffAttack || skill.kind === 'magical' || skill.kind === 'hybrid' ? 'casting' : 'attacking'); if (staffAttack || skill.kind === 'magical' || skill.kind === 'hybrid') { if (staffAttack) this.flashTitle('MAGIC SHOT', w.name); await this.battleSleep(220); await this.magicProjectile(el); } else await this.battleSleep(220); let total = 0, criticals = 0, misses = 0; const perHit = {};
      for (let hit = 0; hit < hits; hit++) {
        // randomTarget の技はヒットごとに生存敵から対象を抽選し直す（撃破済みへ無駄撃ちしない）
        if (skill.randomTarget) { const alive = this.enemies.filter(e => e.alive && e.hp > 0); if (!alive.length) break; target = alive[Math.floor(Math.random() * alive.length)]; }
        if (!target || target.hp <= 0) break;
        const tEl = document.getElementById(target.uid);
        // 1Hitごとに「会心（必中）→通常命中」の順で独立判定する。
        const outcome = this.rollPlayerAttackOutcome(skill, target);
        if (!outcome.hit) { misses++; this.triggerEvade('player', target, skill, { hitIndex: hit, source: 'playerAttack' }); this.floating(tEl, 'EVADE', 'miss'); this.audio.sfx('quick'); await this.battleSleep(hits > 1 ? 170 : 320); continue; }
        tEl.classList.add('hit');
        const d = this.damageFor(skill, target, outcome); total += d.value; if (d.critical) criticals++;
        this.refundMpFromSpell(d.value, skill); // 魔導士《魔力還流》
        perHit[target.uid] = (perHit[target.uid] || 0) + d.value;
        target.hp = target.cannotDefeat ? Math.max(1, target.hp - d.value) : Math.max(0, target.hp - d.value);
        this.recordSeripesHit(target, skill, d.value);
        // 撃破した瞬間に見た目も倒す。ここで付けないと「HP0なのに敵が残る」状態になる。
        if (target.hp <= 0) { target.alive = false; tEl.classList.add('defeated'); }
        this.floating(tEl, d.value, d.critical ? 'critical' : 'damage'); this.audio.sfx(d.critical ? 'critical' : 'enemyHit'); this.updateHUD();
        await this.battleSleep(hits > 1 ? 190 : 420); tEl.classList.remove('hit');
      } if (misses && !total) { this.setLog(`${target.name}${target.label}に攻撃を外した！`); ren.classList.remove('attacking','casting'); return; }
      const hitNames = Object.keys(perHit).map(uid => { const e = this.enemies.find(x => x.uid === uid); return e ? `${e.name}${e.label}` : ''; }).filter(Boolean); const targetLabel = skill.randomTarget && hitNames.length > 1 ? hitNames.join('・') : `${target.name}${target.label}`; this.setLog(`${criticals ? `CRITICAL ×${criticals}! ` : ''}${targetLabel}に${total}ダメージ！${hits > 1 ? `（${hits}HIT）` : ''}`); if (skill.kind === 'physical' || skill.kind === 'weapon') { delete this.player.buffs.atkCharge; delete this.player.buffs.magicCharge; } ren.classList.remove('attacking', 'casting');
      this.applySkillDebuff(skill, target);
      if (skill.effect?.type === 'selfDefUpAfterHit') this.player.buffs.defUp = { rate: skill.effect.rate, until: this.turn + (skill.effect.turns || 1) };
      if (skill.effect?.type === 'selfDefDown') { this.player.defDownUntil = this.turn + skill.effect.turns - 1; this.setLog('捨て身斬りの反動でRENのDEFが20%低下！'); }
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
      if (defeated.length) await this.battleSleep(600);
    }
    async applySelfSkill(skill) { this.flashTitle(skill.name, skill.nameEn || 'SELF SKILL'); const effect = skill.effect || {}, ren = $('#ren'); ren.classList.add('casting'); await this.battleSleep(260); if (effect.type === 'mpRecover') { const amount = Math.max(1, Math.ceil(this.player.stats.maxMp * effect.maxMpRate)), gained = Math.min(amount, this.player.stats.maxMp - this.player.mp); this.player.mp += gained; this.audio.sfx('heal'); this.floating(ren, `MP +${gained}`, 'heal'); this.setLog(`精神集中でMPが${gained}回復！`); } if (effect.type === 'hpRecover') { const baseHeal = effect.baseHeal ?? effect.base ?? 0, spiritScaling = effect.spiritScaling ?? effect.mndScale ?? 0; const amount = Math.max(1, Math.round((baseHeal + this.player.stats.mnd * spiritScaling) * (1 + this.passiveEffectRate('healUp') + this.equipmentEffectRate('healingPowerPercent')) * this.traitHealMult())), gained = Math.min(amount, this.player.stats.maxHp - this.player.hp); this.player.hp += gained; this.audio.sfx('heal'); this.floating(ren, `+${gained}`, 'heal'); this.setLog(`ヒールでHPが${gained}回復！`); } if (effect.type === 'regenerate') { this.player.buffs.regenerate = effect.turns + 1; this.audio.sfx('heal'); this.setLog('リジェネレート！ 3ターンの間、HPが回復する。'); } if (effect.type === 'selfMagicCharge') { this.player.buffs.magicCharge = true; this.audio.sfx('magic'); this.floating(ren, 'MAGIC CHARGE', 'heal'); this.setLog('魔力装填！ 次の物理攻撃に魔力が乗る。'); } if (effect.type === 'selfAtkCharge') { this.player.buffs.atkCharge = { rate: effect.rate }; this.audio.sfx('heal'); this.floating(ren, `ATK +`+Math.round(effect.rate*100)+`%`, 'heal'); this.setLog('ちからため！ 次の物理攻撃の威力が上がる。'); } if (effect.type === 'selfDefUp') { this.player.buffs.defUp = { rate: effect.rate, until: this.turn + effect.turns }; this.audio.sfx('heal'); this.floating(ren, `DEF +${Math.round(effect.rate * 100)}%`, 'heal'); this.setLog(`雄叫びでDEFが${Math.round(effect.rate * 100)}%上昇！ ${effect.turns}ターン持続。`); } if (effect.type === 'fortress') { this.player.buffs.fortressUntil = this.turn; this.player.buffs.fortressReduction = effect.reduction ?? D.guardianBalance?.fortressReduction ?? .30; this.audio.sfx('heal'); this.floating(ren, 'FORTRESS', 'heal'); this.setLog('フォートレス！ このターンの被ダメージを30%軽減する。'); } this.persistVitals(); this.updateHUD(); await this.battleSleep(350); ren.classList.remove('casting'); }
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
      this.audio.sfx('slash');
      const ren = $('#ren'); ren.classList.add('attacking');
      await this.battleSleep(200);
      const outcome = this.rollPlayerAttackOutcome(strike, enemy, { weapon: lw, weaponType: lw.weaponType });
      if (!outcome.hit) { this.triggerEvade('player', enemy, strike, { source: 'offHandStrike' }); this.floating(el, 'EVADE', 'miss'); this.setLog(`${enemy.name}${enemy.label}は左手の追撃をかわした！`); await this.battleSleep(240); ren.classList.remove('attacking'); return; }
      const d = this.damageFor(strike, enemy, outcome);
      enemy.hp = enemy.cannotDefeat ? Math.max(1, enemy.hp - d.value) : Math.max(0, enemy.hp - d.value);
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
      this.flashTitle('COUNTER', '受けて返す'); this.setLog('RENの反撃！');
      this.audio.sfx('slash');
      const ren = $('#ren'); ren.classList.add('attacking');
      await this.battleSleep(240);
      const outcome = this.rollPlayerAttackOutcome(skill, enemy);
      if (!outcome.hit) { this.triggerEvade('player', enemy, skill, { source: 'counter' }); this.floating(el, 'EVADE', 'miss'); this.setLog(`${enemy.name}${enemy.label}は反撃をかわした！`); await this.battleSleep(260); ren.classList.remove('attacking'); return; }
      const d = this.damageFor(skill, enemy, outcome);
      enemy.hp = enemy.cannotDefeat ? Math.max(1, enemy.hp - d.value) : Math.max(0, enemy.hp - d.value);
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
    // カズのまかない代。所持GOLDの30%が基本で、僧侶《托鉢》などで割り引かれる。
    // ══ カズの売り物 ══════════════════════════════════════════
    // 価格は固定。所持金比だと「金を使い切ってから買う」が最適解になり、
    // 所持0で0円になる抜け道もできるため。周回で押し切られるのは所持上限で防ぐ。
    // 僧侶の《喜捨の徳》はまかない専用にして、ここへは効かせない。
    // 拠点回復も携行食も僧侶が最安、という二冠を作らないため。
    shopStock() { return (D.shopItems || []).map(id => D.items[id]).filter(Boolean); }
    shopMaxStack(item) { return item?.maxStack ?? 9; }
    canBuyItem(id) {
      const item = D.items[id]; if (!item?.price) return false;
      if (this.profile.gold < item.price) return false;
      return (this.profile.inventory[id] || 0) < this.shopMaxStack(item);
    }
    buyItem(id) {
      const item = D.items[id];
      if (!this.canBuyItem(id)) { this.audio.sfx('ui'); return; }
      this.profile.gold -= item.price;
      this.profile.inventory[id] = (this.profile.inventory[id] || 0) + 1;
      this.saveProfile(); this.audio.sfx('heal');
      this.renderMenuSummary(); this.renderMenuPanel('food');
    }
    mealPrice() {
      const base = this.profile.gold * (D.settings?.mealGoldRate ?? .3);
      return Math.floor(base * (1 - this.passiveEffectRate('mealDiscount')));
    }
    // 実際に支払う消費MP。戦士《練達》などの割引パッシブを反映する。
    // 割引が乗るのは武器学で覚えた武器技だけ（JOB固有技や魔法には効かない）。
    skillMpCost(skill) {
      const base = skill?.mp || 0;
      if (!base || skill.source !== 'weapon') return base;
      const cut = this.passiveEffectRate('skillMpDiscount');
      return cut ? Math.max(1, Math.round(base * (1 - cut))) : base;
    }
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
        if (!outcome.hit) { this.triggerEvade('player', target, skill, { source: 'playerAttackAll' }); this.floating(el, 'EVADE', 'miss'); await this.battleSleep(180); continue; }
        el.classList.add('hit');
        const d = this.damageFor(skill, target, outcome); target.hp = target.cannotDefeat ? Math.max(1, target.hp - d.value) : Math.max(0, target.hp - d.value);
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
    async magicProjectile(targetEl) { const field = $('#battlefield').getBoundingClientRect(), from = $('#weapon-layer').getBoundingClientRect(), to = targetEl.getBoundingClientRect(), orb = document.createElement('i'), sx = from.right - field.left, sy = from.top - field.top + from.height * .22, ex = to.left - field.left + to.width * .48, ey = to.top - field.top + to.height * .58; orb.className = 'magic-projectile'; orb.style.left = `${sx}px`; orb.style.top = `${sy}px`; orb.style.setProperty('--shot-x', `${ex - sx}px`); orb.style.setProperty('--shot-y', `${ey - sy}px`); $('#battlefield').appendChild(orb); await this.battleSleep(460); orb.remove(); }
    receivePlayerDamage(amount, type = 'physical') {
      let damage = Math.max(0, Math.round(amount));
      if (this.player.buffs?.fortressUntil === this.turn) damage = Math.max(0, Math.round(damage * (1 - (this.player.buffs.fortressReduction ?? .30))));
      const setEffects = this.activeSetEffects(), setReduction = clamp((setEffects.damageReductionPercent || 0) / 100, 0, .8);
      if (setReduction) damage = Math.max(0, Math.round(damage * (1 - setReduction)));
      const before = this.player.hp; this.player.hp = Math.max(0, before - damage); const actual = before - this.player.hp;
      if (actual > 0) { this.player.lastReceivedType = type; if (this.resonanceEnabled()) { const max = D.guardianBalance?.resonanceMax || 100, gainMult = setEffects.resonanceGainMultiplier || 1; this.player.resonance = Math.min(max, (this.player.resonance || 0) + actual * (D.guardianBalance?.resonanceGainPerDamage ?? .05) * gainMult); } }
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
      if (!outcome.hit) { this.triggerEvade(enemy, 'player', action, { source: 'seripesStrike' }); this.floating(ren, 'EVADE', 'miss'); this.setLog(`セリペスの${name}！ RENは攻撃をかわした！`); this.updateHUD(); await this.battleSleep(480); el.classList.remove('enemy-attacking'); return; }
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
      const isMagic = chosen.kind === 'magic';
      this.setLog(`${enemy.name}${enemy.label}の${chosen.name}！`); if (isMagic) { this.flashTitle(chosen.name, 'SHADOW MAGIC'); this.audio.sfx('dark'); } const el = document.getElementById(enemy.uid), ren = $('#ren'); el.classList.add('enemy-attacking'); await this.battleSleep(300);
      const balance = D.combatBalance, attackStat = isMagic ? enemy.stats.mag : enemy.stats.atk;
      const defMul = isMagic ? 1 : (this.turn <= (this.player.defDownUntil || 0) ? .8 : 1);
      const raw = this.enemyRawDamage(isMagic ? 'magical' : 'physical', attackStat, defMul), outcome = this.rollEnemyAttackOutcome(enemy, chosen), damage = Math.max(1, Math.round(raw + roll(balance.enemyVariance.min, balance.enemyVariance.max)));
      if (!outcome.hit) { this.triggerEvade(enemy, 'player', chosen, { source: 'enemyAttack' }); this.floating(ren, 'EVADE', 'miss'); this.setLog('RENは攻撃をかわした！'); } else { ren.classList.add('hit'); this.audio.sfx('playerHit'); const actual = this.receivePlayerDamage(damage, isMagic ? 'magical' : 'physical'); this.floating(ren, actual, 'enemy-damage'); this.setLog(`RENは${actual}ダメージを受けた！`); } this.updateHUD(); await this.battleSleep(420); el.classList.remove('enemy-attacking'); ren.classList.remove('hit');
      if (outcome.hit) await this.tryCounter(enemy);
    }
    async bossAttack(enemy) {
      if (enemy.id === 'myrthi') { await this.bossAttackMyrthi(enemy); return; }
      if (enemy.id === 'versicrell') { await this.bossAttackVersicrell(enemy); return; }
      if (enemy.id === 'seripes') { await this.bossAttackSeripes(enemy); return; }
      if (enemy.cannotDefeat) {
        const el = document.getElementById(enemy.uid), ren = $('#ren'); this.setLog(`${enemy.name}のエターナル・ジャッジメント！`); this.flashTitle('裁定の刻', 'ETERNAL JUDGEMENT'); this.audio.sfx('dark'); el.classList.add('enemy-attacking'); await this.battleSleep(520); ren.classList.add('hit'); const damage = Math.max(this.player.hp, Math.round(enemy.stats.mag * 1.5)); this.player.hp = 0; this.persistVitals(); this.audio.sfx('critical'); this.floating(ren, damage, 'enemy-damage'); this.setLog('圧倒的な裁定の前に、RENは膝をついた……'); this.updateHUD(); await this.battleSleep(650); el.classList.remove('enemy-attacking'); ren.classList.remove('hit'); return;
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
      if (isMagic) damage = Math.max(1, Math.round(damage * (1 - this.passiveEffectRate('magicResist') - this.equipmentEffectRate('magicDamageReductionPercent'))));
      const outcome = this.rollEnemyAttackOutcome(enemy, chosen);
      if (!outcome.hit) { this.triggerEvade(enemy, 'player', chosen, { source: 'bossAttack' }); this.floating(ren, 'EVADE', 'miss'); this.setLog(`RENは${chosen.name}をかわした！`); this.updateHUD(); await this.battleSleep(450); el.classList.remove('enemy-attacking'); return; }
      ren.classList.add('hit');
      this.audio.sfx('playerHit'); const actual = this.receivePlayerDamage(damage, isMagic ? 'magical' : 'physical'); this.floating(ren, actual, 'enemy-damage'); this.setLog(`RENは${actual}ダメージを受けた！`); this.updateHUD(); await this.battleSleep(450); el.classList.remove('enemy-attacking'); ren.classList.remove('hit');
      await this.tryCounter(enemy);
    }
    floating(el, value, type) { if (!el) return; const r = el.getBoundingClientRect(), field = $('#battlefield').getBoundingClientRect(), f = document.createElement('b'); f.className = `float-number ${type}`; f.textContent = type === 'critical' ? `CRITICAL! ${value}` : value; f.style.left = `${r.left - field.left + r.width / 2}px`; f.style.top = `${r.top - field.top + r.height * .25}px`; $('#float-layer').appendChild(f); setTimeout(() => f.remove(), 1100); }
    queueGrowthBubble(title, detail = '') { this.growthBubbleQueue = (this.growthBubbleQueue || Promise.resolve()).then(() => this.showGrowthBubble(title, detail)); return this.growthBubbleQueue; }
    async showGrowthBubble(title, detail = '') { const ren = $('#ren'), field = $('#battlefield'); if (!ren || !field) return; const rr = ren.getBoundingClientRect(), fr = field.getBoundingClientRect(), bubble = document.createElement('div'); bubble.className = 'growth-bubble'; bubble.innerHTML = `<b>${title}</b>${detail ? `<span>${detail}</span>` : ''}`; bubble.style.left = `${rr.left - fr.left + rr.width * .52}px`; bubble.style.top = `${Math.max(92, rr.top - fr.top + 12)}px`; $('#float-layer').appendChild(bubble); this.audio.sfx('heal'); await this.battleSleep(1250); bubble.remove(); }
    announceRareDrop(item) { const layer = $('#rare-drop-layer'); if (!layer) return; this.audio.sfx('rareDrop'); const b = document.createElement('div'); b.className = `rare-drop-banner rarity-${item.rarity}`; b.innerHTML = `<small>${item.rarity === 'legendary' ? 'LEGENDARY DROP' : 'EPIC DROP'}</small><b>${item.name}</b>`; layer.appendChild(b); requestAnimationFrame(() => b.classList.add('show')); setTimeout(() => { b.classList.remove('show'); setTimeout(() => b.remove(), 420); }, 2400); }
    async useConsumable(id) { const item = D.items[id], amount = item?.effect?.hp || item?.effect?.mp || 0, key = item?.effect?.hp ? 'hp' : 'mp', maxKey = key === 'hp' ? 'maxHp' : 'maxMp'; if (!item || !(this.profile.inventory[id] > 0)) { this.setLog(`${item?.name || 'アイテム'}を持っていない。`); return; } if (this.player[key] >= this.player.stats[maxKey]) { this.setLog(`${key.toUpperCase()}は満タンだ。`); return; } this.locked = true; this.panel(''); await this.beginPlayerTurn(); const heal = Math.min(amount, this.player.stats[maxKey] - this.player[key]); this.profile.inventory[id]--; this.player[key] += heal; this.persistVitals(); this.audio.sfx('heal'); this.setLog(`${item.name}を使った。${key.toUpperCase()}が${heal}回復！`); this.floating($('#ren'), `+${heal}`, 'heal'); this.updateHUD(); await this.battleSleep(650); await this.enemyOnlyTurn(); }
    async tryEscape() { this.locked = true; this.panel(''); await this.beginPlayerTurn(); const live = this.enemies.filter(e => e.alive), avg = live.reduce((s, e) => s + e.stats.spd, 0) / live.length, chance = clamp(.45 + (this.player.stats.agi - avg) * .025, .35, .9); this.setLog('逃走経路を探している……'); await this.battleSleep(600); if (Math.random() < chance) { this.finished = true; this.persistVitals(); this.audio.sfx('escape'); this.flashTitle('ESCAPED', '戦線を離脱'); await this.battleSleep(700); this.showResult('ESCAPED', '怪異との戦闘から離脱し、拠点へ帰還した。', 'RETURN TO HIDEOUT', this.battleSummaryHTML()); } else { this.setLog('逃げられない！'); await this.battleSleep(450); await this.enemyOnlyTurn(); } }
    async enemyOnlyTurn() { for (const e of this.enemies.filter(e => e.alive)) { await this.enemyAttack(e); if (this.player.hp <= 0) { await this.defeat(); return; } await this.battleSleep(300); } this.endPlayerTurn(); this.turn++; this.locked = false; this.updateHUD(); this.showMainCommands(); }

    grantEnemyReward(enemy) {
      // 特殊戦闘モード側で一部の器だけを初期化していても撃破処理を止めない。
      const rewards = (this.battleRewards ||= {});
      rewards.exp ??= 0; rewards.gold ??= 0; rewards.drops ||= {}; rewards.levels ||= [];
      rewards.masteryResults ||= []; rewards.jobResults ||= []; rewards.newRecipes ||= [];
      // 僧侶《施しの祈り》などのGOLD増加パッシブをここで反映する
      const exp = enemy.exp || 0, baseGold = roll(enemy.gold?.min ?? 0, enemy.gold?.max ?? 0);
      const gold = Math.round(baseGold * (1 + this.passiveEffectRate('goldUp'))), drops = {};
      (enemy.rolledDrops || []).forEach(([id, n]) => { drops[id] = (drops[id] || 0) + n; });
      const levels = this.applyRewards({ exp, gold, drops });
      const mastery = this.grantWeaponExp(exp), job = this.grantJobExp(exp);
      rewards.exp += exp; rewards.gold += gold;
      Object.entries(drops).forEach(([id, n]) => { rewards.drops[id] = (rewards.drops[id] || 0) + n; });
      rewards.levels.push(...levels); if (mastery) rewards.masteryResults.push(mastery); if (job) rewards.jobResults.push(job);
      if (mastery?.leveled) this.queueGrowthBubble(`${this.weaponTypeName(mastery.type)}武器学 Lv.UP!`, `Lv.${mastery.before} → ${mastery.after}`);
      if (job?.to > job?.from) this.queueGrowthBubble('JOB Lv.UP!', `${job.jobName} Lv.${job.from} → ${job.to}`);
      this.updateHUD();
      return { exp, gold };
    }
    battleSummaryHTML() {
      const r = this.battleRewards; if (!r || (!r.exp && !r.gold && !Object.keys(r.drops).length)) return '';
      return this.rewardHTML({ exp: r.exp, gold: r.gold, drops: r.drops }, r.levels);
    }
    rollDrops(enemy) {
      const drops = []; (enemy.dropTable || []).forEach(d => { if (Math.random() < d.chance) drops.push([d.itemId, 1]); }); return drops;
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
    isRecipeUnlocked(recipe) { if (!recipe.materialUnlockId) return true; return (this.profile.unlockedRecipes || []).includes(recipe.id); }
    grantJobExp(amount) { const jobId = this.profile.currentJob, job = D.jobs[jobId], progress = this.profile.jobs[jobId], from = progress.level, learnedBefore = new Set(this.profile.learnedJobSkills || []); const raw = Math.max(0, amount) / 4 + (progress.expCarry || 0), gained = Math.floor(raw); progress.expCarry = raw - gained; progress.exp += gained; while (progress.level < D.jobLevelCap) { const need = this.jobExpNeeded(progress.level); if (!need || progress.exp < need) break; progress.exp -= need; progress.level++; } if (progress.level >= D.jobLevelCap) { progress.exp = 0; progress.expCarry = 0; this.markJobMastered(jobId); } const gainedLevels = progress.level - from; const statGain = gainedLevels > 0 ? this.applyJobLevelGrowth(jobId, gainedLevels) : null; const newPassives = gainedLevels > 0 ? this.grantJobPassives(jobId, progress.level) : []; this.syncSkillUnlocks(); this.checkAdvancedJobUnlocks(); const learned = (this.profile.learnedJobSkills || []).filter(id => !learnedBefore.has(id)); this.saveProfile(); return { jobId, jobName: job.name, jobNameEn: job.nameEn, exp: gained, from, to: progress.level, learned, statGain, newPassives }; }
    jobResultHTML(result) { if (!result) return ''; return `<div class="job-result"><small>JOB EXPERIENCE</small><strong>${result.jobName}</strong><span>JEXP <b>+${result.exp}</b></span>${result.to > result.from ? `<h3>JOB LEVEL UP!　Lv.${result.from} → Lv.${result.to}</h3>` : ''}${result.learned.length ? `<div>${result.learned.map(id => `<b>NEW SKILL　${D.skills[id].name}</b>`).join('')}</div>` : ''}</div>`; }
    rewardHTML(reward, levels) {
      const drops = Object.entries(reward.drops); let html = `<div class="reward-summary"><span>EXP <b>+${reward.exp}</b></span><span>GOLD <b>+${reward.gold}</b></span></div>`;
      html += `<div class="drop-list"><h3>DROPS</h3>${drops.length ? drops.map(([id,n]) => { const i=D.items[id]; return `<p class="rarity-${i.rarity}">${i.name}<b>×${n}</b></p>`; }).join('') : '<p>ドロップなし</p>'}</div>`;
      levels.forEach(l => { const keys = ['maxHp','maxMp','mag','mnd','str','vit']; html += `<div class="level-up"><h3>LEVEL UP!</h3><strong>LV ${l.from} → ${l.to}</strong><div>${keys.map(k => `<span>${statLabels[k]} <b>${l.before[k]} → ${l.after[k]}</b></span>`).join('')}</div></div>`; }); return html;
    }
    scoreGetHTML(id) { const score = D.musicScores?.[id]; return score ? `<div class="score-get"><small>SCORE GET</small><strong>${score.title}</strong><b>（${score.subtitle}）</b><span>演奏可能になった</span><em>PRIVATE MODE ITEM</em></div>` : ''; }
    async victory() {
      this.profile.flags.consecutiveDefeats = 0; this.profile.flags.lastBattleResult = 'victory';
      this.finished = true; this.audio.sfx('victory'); this.flashTitle('VICTORY', 'ALL SHADOWS ELIMINATED'); $('#ren').classList.add('victory'); await this.battleSleep(1100);
      const reward = { exp: this.battleRewards.exp, gold: this.battleRewards.gold, drops: this.battleRewards.drops }, levels = this.battleRewards.levels;
      const masteryParts = this.battleRewards.masteryResults || [], jobParts = this.battleRewards.jobResults || [];
      const masteryResult = masteryParts.length ? { ...masteryParts[0], gain: masteryParts.reduce((s, r) => s + r.gain, 0), before: masteryParts[0].before, after: masteryParts[masteryParts.length - 1].after, leveled: masteryParts.some(r => r.leveled) } : null;
      const jobResult = jobParts.length ? { ...jobParts[0], exp: jobParts.reduce((s, r) => s + r.exp, 0), from: jobParts[0].from, to: jobParts[jobParts.length - 1].to, learned: [...new Set(jobParts.flatMap(r => r.learned || []))] } : null;
      const newRecipeHTML = (this.battleRewards.newRecipes || []).map(rid => { const r = D.recipes[rid], item = D.items[r?.resultItemId]; return r && item ? `<div class="new-recipe-unlock"><small>NEW RECIPE</small><b>${item.name}</b><span>${item.nameEn || ''}</span><em>工房で製作可能になった</em></div>` : ''; }).join('');
      // HP/MPだけはロマサガ式に戦闘終了時判定。武器学/JOB EXPは撃破ごとに加算済み。
      const vitalResult = this.rollVitalGrowth();
      this.updateHUD();
      if (vitalResult?.hp) this.queueGrowthBubble('HP UP!', `最大HP +${vitalResult.hp}`);
      if (vitalResult?.mp) this.queueGrowthBubble('MP UP!', `最大MP +${vitalResult.mp}`);
      if (this.growthBubbleQueue) await this.growthBubbleQueue;
      const pt = this.profile.playtest; if (pt) { pt.battles = (pt.battles || 0) + 1; if (masteryResult) pt.weaponUse[masteryResult.type] = (pt.weaponUse[masteryResult.type] || 0) + 1; }
      const sparks = this.battleSparks || []; this.battleSparks = [];
      this.saveProfile(); this.persistVitals(); this.updateHUD();
      const rewardBlock = `${this.rewardHTML(reward, levels)}${this.growthResultHTML(masteryResult, vitalResult, sparks)}${this.jobResultHTML(jobResult)}${newRecipeHTML}`;
      if (this.battleMode === 'slime') { if (this.floorsOf(this.currentDungeonId)) this.recordFloorWin(this.currentFloorId); if (this.currentDungeonId === 'dungeon3') { this.profile.flags.dungeon3BattleWins = (this.profile.flags.dungeon3BattleWins || 0) + 1; } else if (this.currentDungeonId === 'dungeon2') { this.profile.flags.dungeon2BattleWins = (this.profile.flags.dungeon2BattleWins || 0) + 1; } else { if (this.profile.flags.noelFirstEncounterCleared) this.profile.flags.postNoelBattleWins = (this.profile.flags.postNoelBattleWins || 0) + 1; else this.profile.flags.preNoelBattleWins = (this.profile.flags.preNoelBattleWins || 0) + 1; this.profile.flags.normalBattleWins = (this.profile.flags.normalBattleWins || 0) + 1; } this.saveProfile(); }
      if (this.battleMode === 'zenakado') { const firstClear = !this.isBossDefeated('zenacad'), firstScore = !this.profile.flags.zenakadoScoreClaimed; this.markBossDefeated('zenacad'); this.profile.flags.zenakadoDefeated = false; this.profile.flags.postNoelBattleWins = 0; this.profile.flags.temporaryBossCompleted = true; this.noteBossRematchSnapshot('zenakado'); const stageOne = this.grantStageOneReward(); if (firstScore) { this.profile.musicScores.cadenzaLoot = true; this.profile.flags.zenakadoScoreClaimed = true; } this.saveProfile(); const stolen = firstClear ? '<div class="boss-recipe-unlock"><small>PHANTOM STEAL</small><b>NEW RECIPES STOLEN</b><strong>《ZENACAD SERIES》</strong><span>工房に BOSS EQUIPMENT と JOB SYSTEM が追加された！</span></div>' : ''; this.showResult('VICTORY', '独奏卿ゼナカドを打ち倒し、禁断の楽譜と装備製法を盗み出した！', 'BOSS CLEARED', `${rewardBlock}${firstScore ? this.scoreGetHTML('cadenzaLoot') : ''}${this.stageOneRewardHTML(stageOne)}${stolen}`); return; }
      if (this.battleMode === 'myrthi') { const myrthiReward = this.grantMyrthiFirstReward(); this.markBossDefeated('myrthi'); this.profile.flags.dungeon2BattleWins = (this.profile.flags.dungeon2BattleWins || 0) + 1; this.profile.flags.dungeon2Clear = true; this.noteBossRematchSnapshot('myrthi'); this.saveProfile(); this.showResult('VICTORY', '黒紅の双刃戦姫ミルティを打ち倒した！ ミルティシリーズの製法を奪い取った！', 'BOSS CLEARED', `${rewardBlock}${this.specialItemHTML(myrthiReward)}<div class="boss-recipe-unlock"><small>PHANTOM STEAL</small><b>NEW RECIPES STOLEN</b><strong>《MYRTHI SERIES》</strong><span>工房にMYRTHI SERIESが追加された！</span></div>`); return; }
      if (this.battleMode === 'versicrell') { const firstClear = !this.isBossDefeated('versicrell'); this.markBossDefeated('versicrell'); this.saveProfile(); const note = firstClear ? '<div class="boss-recipe-unlock"><small>MID BOSS CLEARED</small><b>SILVER CIRCLE BROKEN</b><strong>D3後半ルート解放</strong><span>ヴェルシクレルの銀環を突破した。崩界の深廊をさらに進める。</span></div>' : ''; this.showResult('VICTORY', '《銀環異奏体》ヴェルシクレルを撃破した！', 'SILVER CIRCLE // COMPLETE', `${rewardBlock}${note}`); return; }
      if (this.battleMode === 'seripes') { const firstClear = !this.isBossDefeated('seripes'), unlocked = this.grantSeripesFirstReward(); this.markBossDefeated('seripes'); this.noteBossRematchSnapshot('seripes'); this.saveProfile(); const steal = firstClear ? `<div class="seripes-unlock"><small>SYSTEM // PHANTOM STEAL</small><b>NEW JOB STOLEN</b><strong>《守護士》 UNLOCKED</strong><b>NEW WEAPON MASTERY</b><strong>《盾学》 UNLOCKED</strong><b>NEW RECIPES STOLEN</b><strong>《SERIPES SERIES》</strong><span>《反奏の白盾》を獲得。工房に守護士・戦士向けボス装備が追加されました。</span></div>` : ''; this.flashTitle('REPRISE...', 'THE AEGIS SHATTERS'); this.showResult('VICTORY', '不落の反奏騎士セリペスの盾が白い光となって砕けた。受けて返す力を盗み出した！', 'THIRD MAESTRI DEFEATED', `${rewardBlock}${steal}`); return; }
      const progress = this.progressState(); if (this.battleMode === 'slime' && progress.ready) { const label = progress.phase === 'noel' ? '永遠の裁定者ノエル' : '独奏卿ゼナカド'; this.showResult('VICTORY', '闇を切り裂き、戦利品を獲得した。', 'BATTLE COMPLETE', `${rewardBlock}<div class="workshop-unlock boss-signal"><b>BOSS SIGNAL</b><strong>${label}の反応を確認！</strong><span>拠点からボス遭遇へ進めます。</span></div>`); } else { await this.showBattleClear(reward, levels, jobResult, { mastery: masteryResult, vitals: vitalResult, sparks }); }
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
      $('#log').innerHTML = `<p>${parts.join('　')}</p>`; $('#phase-label').textContent = 'CLEARED';
      this.panel(this.button('次の戦闘へ', 'NEXT BATTLE', 'next') + this.button('拠点へ戻る', 'HIDEOUT', 'hideout'));
      this.bindActions({ next: () => { $('#ren').classList.remove('victory'); this.startBattle(); }, hideout: () => this.showMenu('home') });
    }
    async defeat() {
      this.finished = true; this.audio.stopMusic(500); this.audio.sfx('defeat'); $('#ren').classList.add('down');
      if (this.battleMode === 'noel') { const stats = this.totalStats(); this.profile.flags.noelFirstEncounterCleared = true; this.profile.flags.preNoelBattleWins = Math.max(this.profile.flags.preNoelBattleWins || 0, D.battleProgression.noelEncounterWins); this.profile.flags.postNoelBattleWins = 0; this.profile.currentVitals = { hp: stats.maxHp, mp: stats.maxMp }; this.player.hp = stats.maxHp; this.player.mp = stats.maxMp; this.saveProfile(); this.flashTitle('DEFEAT', 'NOËL — THE ETERNAL JUDGE'); await this.battleSleep(1000); this.showResult('DEFEAT', '圧倒的な裁定の前に敗れた。ノエルは姿を消し、全回復して拠点へ帰還した。', 'THE NEXT KEY', '<div class="workshop-unlock"><b>PHANTOM WORKSHOP</b><strong>工房が解放された！</strong><span>敗北の記録を解析し、装備製作機能が使用可能になりました。</span></div>'); return; }
      this.player.hp = 1; this.profile.flags.lastBattleResult = 'defeat'; this.profile.flags.consecutiveDefeats = (this.profile.flags.consecutiveDefeats || 0) + 1; this.persistVitals(); if (this.battleMode === 'zenakado') { this.flashTitle('DEFEAT', 'ZENAKADO WINS'); await this.battleSleep(1000); this.showResult('DEFEAT', 'ゼナカドに敗れた。カズに救助され拠点へ帰還した。HPは1で応急処置された。', 'CHALLENGE FAILED', this.battleSummaryHTML() || '<div class="boss-result-note">報酬・ドロップなし</div>'); return; }
      if (this.battleMode === 'myrthi') { this.flashTitle('DEFEAT', 'MYRTHI WINS'); await this.battleSleep(1000); this.showResult('DEFEAT', 'ミルティに敗れた。カズに救助され拠点へ帰還した。HPは1で応急処置された。', 'CHALLENGE FAILED', this.battleSummaryHTML() || '<div class="boss-result-note">報酬・ドロップなし</div>'); return; }
      if (this.battleMode === 'versicrell') { this.flashTitle('DEFEAT', 'SILVER CIRCLE CONTINUES'); await this.battleSleep(1000); this.showResult('DEFEAT', 'ヴェルシクレルの銀環を崩せなかった。HP1で拠点へ救助された。', 'MID BOSS FAILED', this.battleSummaryHTML() || '<div class="boss-result-note">報酬・ドロップなし</div>'); return; }
      if (this.battleMode === 'seripes') { this.flashTitle('DEFEAT', 'SERIPES // REPRISE'); await this.battleSleep(1000); this.showResult('DEFEAT', 'セリペスの反奏を崩せなかった。カズに救助され、HP1で拠点へ帰還した。', 'CHALLENGE FAILED', this.battleSummaryHTML() || '<div class="boss-result-note">報酬・ドロップなし</div>'); return; }
      this.flashTitle('GAME OVER', 'MISSION FAILED'); await this.battleSleep(1000); this.showResult('GAME OVER', 'カズに救助され、HP 1で拠点へ運び込まれた。', 'RETURN TO HIDEOUT', this.battleSummaryHTML());
    }
    showResult(title, copy, kicker, html) { $('#result-title').textContent = title; $('#result-copy').textContent = copy; $('#result-kicker').textContent = kicker; $('#rewards').innerHTML = html; $('#result-menu').innerHTML = '拠点へ <span>HIDEOUT</span>'; $('#result').hidden = false; $('#result').style.display = 'grid'; }

    showMenu(panel = 'home') { if (this.player) this.persistVitals(); const result = $('#result'), game = $('#game'), menu = $('#menu-screen'); result.hidden = true; result.style.display = 'none'; game.hidden = true; game.style.display = 'none'; menu.hidden = false; menu.style.display = 'block'; this.audio.playTrack(this.menuMusic); this.renderMenuSummary(); this.renderMenuPanel(panel); window.scrollTo({ top: 0, behavior: 'instant' }); if (panel === 'home') setTimeout(() => this.showKazuDialogue(), 600); }
    renderMenuSummary() { const t = this.totalStats(), v = this.storedVitals(t), need = this.expNeeded(), workshopUnlocked = !!this.profile.flags.noelFirstEncounterCleared, buff = !!this.profile.flags.ramenBuffActive, progress = this.progressState();  $('#menu-hp').textContent = `${v.hp} / ${t.maxHp}`; $('#menu-mp').textContent = `${v.mp} / ${t.maxMp}`; $('#hideout-hp-bar').style.width = `${100 * v.hp / t.maxHp}%`; $('#hideout-mp-bar').style.width = `${100 * v.mp / t.maxMp}%`; $('#menu-gold').textContent = this.profile.gold.toLocaleString('ja-JP'); const mType = this.equippedWeaponType(), mst = this.masteryOf(mType), mNeed = this.masteryExpNeeded(mst.level), expPct = Math.min(100, 100 * mst.exp / mNeed); $('#menu-exp-text').textContent = `${expPct.toFixed(2)}%`; $('#menu-exp-bar').style.width = `${expPct}%`; const mLabel = $('#menu-exp-label'); if (mLabel) mLabel.textContent = `${this.weaponTypeName(mType)} Lv.${mst.level}`; const jid = this.profile.currentJob, jst = this.profile.jobs?.[jid] || {}, jlv = jst.level || 1, jneed = this.jobExpNeeded(jlv), jexp = jst.exp || 0, jpct = jneed ? Math.min(100, 100 * jexp / jneed) : 100; const jexpLabel = $('#menu-jexp-label'), jexpText = $('#menu-jexp-text'), jexpBar = $('#menu-jexp-bar'); if (jexpLabel) jexpLabel.textContent = `${D.jobs[jid]?.name || 'JOB'} Lv.${jlv}`; const mLv = $('#menu-level'); if (mLv) mLv.textContent = `${D.jobs[jid]?.name || 'JOB'} Lv.${jlv}`; if (jexpText) jexpText.textContent = jneed ? `${jpct.toFixed(2)}%` : 'MASTER'; if (jexpBar) jexpBar.style.width = `${jpct}%`; $('#workshop-nav').hidden = !workshopUnlocked; const bossButton = $('#menu-screen [data-menu="boss"]'); const d2p = this.dungeon2FloorProgress(), myrthiReady = this.isMyrthiUnlocked() && !this.isBossDefeated('myrthi'); if (myrthiReady) { bossButton.hidden = false; bossButton.firstChild.textContent = '黒紅の双刃を追う'; bossButton.querySelector('span').textContent = d2p.total ? `MYRTHI // ${d2p.floors} / ${d2p.total} 階 踏破` : `MYRTHI // BATTLE ${d2p.done} / ${d2p.goal}`; } else { bossButton.hidden = !progress.ready; bossButton.firstChild.textContent = progress.phase === 'noel' ? 'ノエルの反応を追う' : 'ゼナカドの旋律を追う'; bossButton.querySelector('span').textContent = `${progress.bossName} // BATTLE ${Math.min(progress.wins, progress.goal)} / ${progress.goal}`; } const buffEl = $('#hideout-buff'); buffEl.classList.toggle('active', buff); buffEl.querySelector('strong').textContent = buff ? '最大HP ＋3%' : '効果なし'; buffEl.querySelector('span').textContent = buff ? '効果：次のダンジョン1回のみ' : 'カズのまかないで次の潜入を強化'; }
    renderMenuPanel(name) {
      [...$('#menu-nav').querySelectorAll('button')].forEach(b => b.classList.toggle('active', b.dataset.menu === name)); const panel = $('#menu-panel'); panel.hidden = name === 'home'; panel.classList.toggle('panel-tall', name === 'equipment' || name === 'system'); if (name === 'home') { panel.innerHTML = ''; return; }
      if (name === 'status') { this.renderStatusPanel(panel); return; }
      if (name === 'items') { this.renderItemsPanel(panel); panel.insertAdjacentHTML('afterbegin', '<button class="panel-home" data-menu="home">拠点へ戻る</button>'); return; }
      if (name === 'dungeon-select') { this.renderDungeonSelect(panel); return; }
      if (name === 'floor-select') { this.renderFloorSelect(panel, this.floorSelectDungeonId || 'dungeon2'); return; }
      if (name === 'equipment') this.renderEquipmentPanel(panel);
      if (name === 'workshop') this.renderWorkshop(panel);
      if (name === 'food') { const active = !!this.profile.flags.ramenBuffActive, stats = this.totalStats(), vitals = this.storedVitals(stats), full = vitals.hp >= stats.maxHp && vitals.mp >= stats.maxMp, price = this.mealPrice(), canEat = !active || !full, coming = (D.foodMenu?.comingSoon || []).map(item => `<article class="food-coming-card" aria-disabled="true"><i aria-hidden="true"></i><b>${item.name}</b><span>COMING SOON</span></article>`).join('');
        // 売り物。固定価格・所持上限つき。僧侶の割引はまかない専用でここには効かない。
        const shop = this.shopStock().map(it => { const have = this.profile.inventory[it.id] || 0, max = this.shopMaxStack(it), isFull = have >= max, poor = this.profile.gold < it.price; const eff = it.effect?.hp ? `HP +${it.effect.hp}` : it.effect?.mp ? `MP +${it.effect.mp}` : ''; return `<article class="shop-card"><div class="shop-info"><b>${it.name}</b><em>${eff}</em><small>${it.description}</small></div><div class="shop-buy"><span class="shop-price">${it.price} G</span><span class="shop-have">所持 ${have} / ${max}</span><button data-buy-item="${it.id}" ${isFull || poor ? 'disabled' : ''}>${isFull ? '上限' : poor ? 'GOLD不足' : '買う'}</button></div></article>`; }).join('');
        panel.innerHTML = `<small>KAZU'S SPECIAL</small><h2>カズのまかない</h2><div class="food-panel"><div class="food-bowl" aria-hidden="true"></div><div class="food-copy"><strong>店主特製・怪盗まかない</strong><span>HP・MPを全回復。次のダンジョン1回だけ最大HPが3%上昇します。</span><em>料金：所持GOLDの30％　<b>${price.toLocaleString('ja-JP')} GOLD</b></em><button class="eat-food" data-eat-food ${canEat ? '' : 'disabled'}>${canEat ? 'まかないを食べる' : '全回復・効果発動中'}</button></div></div><section class="food-shop"><header><b>持ち帰り</b><span>TAKEOUT</span></header><p class="shop-note">ダンジョンへ持ち込める携行食。所持できる数には限りがある。</p><div class="shop-grid">${shop}</div></section><section class="food-coming"><header><b>NEXT MENU</b><span>COMING SOON</span></header><div>${coming}</div></section>`; }
      if (name === 'archive') { this.renderArchivePanel(panel); return; }
      if (name === 'job') this.renderJobPanel(panel);
      if (name === 'system') { this.renderSystemPanel(panel); return; }
      panel.insertAdjacentHTML('afterbegin', '<button class="panel-home" data-menu="home">拠点へ戻る</button>');
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
      const tabBar = `<div class="job-tabs"><button class="job-tab${ui.tab === 'job' ? ' active' : ''}" data-job-tab="job">JOB</button><button class="job-tab${ui.tab === 'abilitySet' ? ' active' : ''}" data-job-tab="abilitySet">ABILITY SET</button></div>`;
      // キャラクターLvは廃止済み。現在のJOBとそのLvを出す。
      const hdr = `<div class="job-hdr"><div class="job-hdr-l"><small>JOB & ABILITY</small><b>${this.playerName()}</b><span>武器学 ${this.weaponTypeName(this.equippedWeaponType())} Lv.${this.masteryOf(this.equippedWeaponType()).level}</span></div><div class="job-hdr-r"><small>現在のJOB</small><strong>${curJob.name} Lv.${this.profile.jobs?.[currentId]?.level || 1}</strong></div></div>`;
      let body;
      if (ui.tab === 'job') { body = ui.detailId ? this.jobDetailHtml(ui.detailId, unlocked, currentId) : this.jobListHtml(unlocked, currentId); }
      else { body = this.abilitySetHtml(currentId); }
      let modal = '';
      if (ui.modal === 'skillDetail') modal = this.skillModalHtml(ui.skillDetailId);
      if (ui.modal === 'traitDetail') modal = this.traitModalHtml(ui.traitDetailJob, ui.traitDetailKey);
      else if (ui.modal === 'passiveSelect') modal = this.passiveModalHtml(ui.passiveSlotIdx);
      panel.innerHTML = `<div class="jpanel">${hdr}${tabBar}<div class="jpanel-body">${body}</div></div>${modal}`;
    }
    jobListHtml(unlocked, currentId) {
      // 未解放JOBはLOCKEDカードも出さず、解放された瞬間に初めて一覧へ追加する。
      const base = [...(D.startingJobIds || []), 'magicKnight', 'guardian'].filter(id => this.isJobUnlocked(id));
      const adv = [...new Set([...(D.advancedJobIds || []), 'dualBlade'])].filter(id => this.isJobUnlocked(id));
      const special = ['phantomThief'].filter(id => this.isJobUnlocked(id));
      // 解放判定は profile.unlockedJobs が唯一の情報源。初期ジョブを固定しない。
      const card = id => { const j = D.jobs[id]; if (!j) return ''; const p = this.profile.jobs[id] || { level: 1 }, isAdv = adv.includes(id), avail = isAdv ? this.isAdvancedJobUnlocked(id) : this.isJobUnlocked(id), isCur = id === currentId; return `<button class="jcard${isCur ? ' cur' : ''}${avail ? '' : ' locked'}" data-job-detail="${id}"><div class="jcard-name">${j.name}</div><div class="jcard-lv">${avail ? `Lv.${p.level}` : 'LOCKED'}</div>${isCur ? '<em class="jcard-cur">●</em>' : ''}</button>`; };
      // ダンジョン名はデータから引く。名前を変えても文言が追従する。
      const d1Name = this.getDungeon('dungeon1')?.name || 'ダンジョン1';
      const notice = this.isJobUnlocked('magicKnight') ? '' : `<p class="job-lock-notice">《${d1Name}》をクリアして《魔奏士の証》を入手すると、残りの基本JOBと魔奏士が解放されます。</p>`;
      // 上位JOBは中身が無いときは節ごと出さない
      const advSec = adv.length ? `<section class="jsec"><h4>上位JOB</h4><div class="jgrid">${adv.map(card).join('')}</div></section>` : '';
      const specialSec = special.length ? `<section class="jsec"><h4>特殊JOB</h4><div class="jgrid">${special.map(card).join('')}</div></section>` : '';
      return `${notice}<section class="jsec"><h4>基本JOB</h4><div class="jgrid">${base.map(card).join('')}</div></section>${specialSec}${advSec}`;
    }
    jobDetailHtml(jobId, unlocked, currentId) {
      const j = D.jobs[jobId], p = this.profile.jobs[jobId], isAdv = (D.advancedJobIds || []).includes(jobId), avail = isAdv ? this.isAdvancedJobUnlocked(jobId) : this.isJobUnlocked(jobId), isCur = jobId === currentId, need = this.jobExpNeeded(p.level), bar = need ? Math.round(100 * p.exp / need) : 100;
      const noGrow = this.isNoGrowthJob(jobId) || !!j.noGrowth;
      const bonuses = this.activeJobBonuses(jobId), bHtml = Object.entries(bonuses).length ? Object.entries(bonuses).map(([k, v]) => `<div class="jbn-item"><span>${statLabels[k] || k}</span><b>${k === 'critBonus' ? `+${Math.round(v * 100)}%` : `+${v}`}</b></div>`).join('') : '<span class="jbn-none">なし</span>';
      // アビリティ一覧＝固有技＋パッシブ＋旧skillUnlocks＋条件つき専用技
      const abilityEntries = [];
      // 固有技は実際の習得JOB Lvで出す（Lv1固定にすると、画面は習得済でも戦闘で出ない食い違いが起きる）
      if (j.signatureSkillId && D.skills[j.signatureSkillId]) abilityEntries.push([D.skills[j.signatureSkillId].unlockJobLevel || 1, j.signatureSkillId]);
      Object.entries(j.passiveUnlocks || {}).forEach(([lv, id]) => abilityEntries.push([+lv, id]));
      Object.entries(j.skillUnlocks || {}).forEach(([lv, id]) => abilityEntries.push([+lv, id]));
      // パッシブ発動中だけ開く専用技（魔奏士のスフォルツァンド等）。
      // 技自体はどのテーブルにも載っていないので、バフ元パッシブの習得Lvに紐づけて並べる。
      this.conditionalSkillsForJob(jobId).forEach(({ skill, level }) => abilityEntries.push([level, skill.id]));
      const skillRows = abilityEntries.sort((a, b) => a[0] - b[0]).map(([lv, id]) => { const s = D.skills[id], learned = p.level >= lv, cond = s?.requiresBuff ? this.buffSourceName(jobId, s.requiresBuff) : ''; return `<button class="jar${learned ? ' learned' : ' locked'}${cond ? ' jar-cond' : ''}"${learned ? ` data-job-skill-detail="${id}"` : ''}><span class="jar-lv">Lv.${lv}</span><span class="jar-nm">${s?.name || id}</span><em class="jar-type">${s?.type === 'PASSIVE' ? 'P' : 'A'}</em><small class="jar-st">${learned ? (cond ? `《${cond}》中` : '習得済') : 'LOCK'}</small></button>`; }).join('');
      let condHtml = '';
      if (isAdv && !avail && j.unlockCondition) { const c = j.unlockCondition, bOk = c.bossDefeated ? this.isBossDefeated(c.bossDefeated) : true, bName = c.bossDefeated ? (D.enemies[c.bossDefeated]?.name || c.bossDefeated) : ''; const jcs = Object.entries(c.jobLevels || {}).map(([rid, rlv]) => { const cur = this.profile.jobs[rid]?.level || 0, ok = cur >= rlv; return `<div class="cond-row${ok ? ' ok' : ' ng'}"><b>${ok ? '✓' : '✕'} ${D.jobs[rid]?.name || rid} Lv${rlv}</b><small>現在 Lv.${cur}</small></div>`; }).join(''); condHtml = `<div class="jconds"><h4>解放条件</h4>${bName ? `<div class="cond-row${bOk ? ' ok' : ' ng'}"><b>${bOk ? '✓' : '✕'} ${bName}を撃破</b></div>` : ''}${jcs}</div>`; }
      // JOB補正は「このJOBで育てた成長」を出す。旧テーブル方式のJOBは従来どおり。
      const grown = (this.profile.jobGrowthGained || {})[jobId] || {};
      const gHtml = Object.entries(grown).filter(([, v]) => v).map(([k, v]) => `<div class="jbn-item"><span>${statLabels[k] || k}</span><b>+${v}</b></div>`).join('');
      const bonusGrid = gHtml || bHtml;
      // JOB特性：そのJOBに就いている間だけの効果（他JOBへ持ち出せない）
      const traits = this.jobTraitEntries(jobId);
      const traitHtml = traits.length ? `<div class="jbonus jtraits"><h4>JOB特性</h4><div class="jtrait-list">${traits.map(t => `<button type="button" class="jtrait-row" data-job-trait-detail="${jobId}:${t.key}"><b>${t.name}</b><span>${t.label}${t.gain > 0 ? `（転生 +${t.gain}%）` : ''}</span><em>▶</em></button>`).join('')}</div><p class="jbn-note">このJOBに就いている間だけ有効。他JOBへは持ち出せません。</p></div>` : '';
      return `<div class="jdetail"><button class="jback-btn" data-job-back>← JOB一覧</button><div class="jdetail-hdr"><div><b>${j.name}</b></div><em class="jdetail-badge">${isCur ? '現在' : !avail ? 'LOCKED' : noGrow ? 'SPECIAL' : `Lv.${p.level}`}</em></div>${avail ? `<div class="jexp-wrap"><div class="jlv-row"><b>JOB Lv.${p.level}</b><span>JEXP ${need ? `${p.exp} / ${need}` : 'MASTER'}</span></div><div class="jexp-bar"><i style="width:${bar}%"></i></div></div>${noGrow ? `<p class="jfeature">${j.featureText || j.description || ''}</p><div class="jbonus">` : `<div class="jbonus"><h4>このJOBで育てた能力</h4><div class="jbn-grid">${bonusGrid}</div>`}<p class="jbn-note">${noGrow ? '全JOBのレベルアップ成長を常に50%引き継ぎます。この一覧には引き継ぎ分は出ません。' : 'この成長は、このJOBに就いている間だけ乗ります。'}</p></div>${traitHtml}${isCur ? '<div class="jcur-badge">現在のJOB</div>' : `<button class="jchange-btn" data-job-change="${jobId}">このJOBに変更</button>`}${this.rebirthSectionHTML(jobId)}${skillRows ? `<div class="jskills"><h4>アビリティ</h4><div class="jar-list">${skillRows}</div></div>` : ''}` : `<p class="jlocked-note">${j.description}</p>${condHtml}`}</div>`;
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
      const jobPassiveRows = Object.entries(job?.passiveUnlocks || {}).map(([lv, id]) => { const s = D.skills[id], ok = jobLv >= Number(lv); return `<div class="per-row${ok ? ' learned' : ' locked'}"${ok ? ` data-job-skill-detail="${id}"` : ''}><span>Lv.${lv}</span><b>${s?.name || id}</b><em>PASSIVE</em><small>${ok ? '習得済' : `Lv.${lv}で習得`}</small></div>`; }).join('') || '<p class="modal-empty">このJOBにパッシブはありません</p>';
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
      const showNewD2 = this.isDungeonUnlocked('dungeon2') && !this.profile.flags.dungeon2NewSeen;
      const showNewD3 = this.isDungeonUnlocked('dungeon3') && !this.profile.flags.dungeon3NewSeen;
      if (showNewD2) { this.profile.flags.dungeon2NewSeen = true; this.saveProfile(); }
      if (showNewD3) { this.profile.flags.dungeon3NewSeen = true; this.saveProfile(); }
      if (!available.some(d => d.id === this.dungeonSelectId)) this.dungeonSelectId = available.at(-1)?.id || 'dungeon1';
      const d = available.find(entry => entry.id === this.dungeonSelectId) || available[0];
      if (!d) { panel.innerHTML = '<button class="panel-home" data-menu="home">拠点へ戻る</button><p>潜入可能なダンジョンがありません。</p>'; return; }
      const isNew = (d.id === 'dungeon2' && showNewD2) || (d.id === 'dungeon3' && showNewD3);
      const progress = d.id === 'dungeon1' ? (() => { const p = this.progressState(); return p.phase === 'complete' ? 'AREA BOSS CLEARED' : `BATTLE ${Math.min(p.wins, p.goal)} / ${p.goal}`; })() : d.id === 'dungeon2' ? (this.isBossDefeated('myrthi') ? 'AREA BOSS CLEARED' : (() => { const p = this.dungeon2FloorProgress(); return p.total ? `FLOOR ${p.floors} / ${p.total}　BATTLE ${p.done} / ${p.goal}` : `BATTLE ${p.done} / ${p.goal}`; })()) : (() => { const goal = D.settings.dungeon3TargetWins || 300, wins = this.profile.flags.dungeon3BattleWins || 0; return wins >= goal ? 'DEPTHS SURVEY COMPLETE' : `BATTLE ${Math.min(wins, goal)} / ${goal}`; })();
      const tabs = available.map((entry, index) => `<button data-dungeon-tab="${entry.id}" class="${entry.id === d.id ? 'active' : ''}"><small>D${index + 1}</small><b>${entry.name}</b>${((entry.id === 'dungeon2' && showNewD2) || (entry.id === 'dungeon3' && showNewD3)) ? '<i>NEW</i>' : ''}</button>`).join('');
      const floors = d.floors || [], midBoss = this.dungeonMidBossEntry(d.id), midGate = d.id === 'dungeon3' && midBoss && !midBoss.cleared;
      const floorTree = floors.length ? floors.map((floor, index) => {
        const wins = this.floorWins(floor.id), goal = floor.winsToClear ?? 33, unlocked = this.isFloorUnlocked(floor.id), cleared = this.isFloorCleared(floor.id), pct = Math.min(100, 100 * wins / goal);
        const cls = cleared ? 'cleared' : unlocked ? 'open' : 'locked';
        return `<div class="dungeon-tree-node ${cls}">${index ? '<i class="tree-line"></i>' : ''}<button data-enter-floor="${floor.id}" ${unlocked ? '' : 'disabled'}><span>${index + 1}F</span><div><small>${floor.nameEn || 'FLOOR'}</small><b>${unlocked ? floor.name : '???'}</b><em>${unlocked ? (floor.description || '') : '前の階を踏破すると解放'}</em><u><i style="width:${pct}%"></i></u><strong>${cleared ? 'CLEARED' : unlocked ? `BATTLE ${Math.min(wins, goal)} / ${goal}` : 'LOCKED'}</strong></div></button></div>`;
      }).join('') : `<div class="dungeon-tree-node ${midGate ? 'locked' : 'open'}"><button ${midGate ? 'disabled' : `data-enter-dungeon="${d.id}"`}><span>IN</span><div><small>ENTRY POINT</small><b>${midGate ? '銀環に進路を阻まれている' : '潜入開始'}</b><em>${midGate ? '中ボスを撃破するとD3後半へ進める' : (d.description || '怪異の気配を追って潜入する。')}</em><strong>${midGate ? 'MID BOSS REQUIRED' : progress}</strong></div></button></div>`;
      const midBossNode = midBoss ? `<div class="dungeon-tree-node boss ${midBoss.cleared ? 'cleared locked' : 'open'}"><i class="tree-line"></i><button ${midBoss.cleared ? 'disabled' : `data-boss-challenge="${midBoss.key}"`}><span>◉</span><div><small>MID BOSS // ${midBoss.enName}</small><b>${midBoss.name}</b><em>${midBoss.title}</em><strong>${midBoss.cleared ? 'CLEARED' : '挑戦可能'}</strong></div><figure style="background-image:url('${midBoss.sprite}')"></figure></button></div>` : '';
      const boss = this.dungeonBossEntry(d.id);
      let bossNode = '';
      if (boss) {
        const rm = boss.rematch, locked = boss.cleared && rm && !rm.ready;
        const status = !boss.cleared ? '挑戦可能' : locked ? `再戦まであと ${rm.need - rm.done} 戦` : '再戦可能';
        bossNode = `<div class="dungeon-tree-node boss ${locked ? 'locked' : 'open'}"><i class="tree-line"></i><button data-boss-challenge="${boss.key}" ${locked ? 'disabled' : ''}><span>⚠</span><div><small>BOSS // ${boss.enName}</small><b>${boss.name}</b><em>${boss.title || ''}</em><strong>${status}</strong></div><figure style="background-image:url('${boss.sprite || d.thumbnail}')"></figure></button></div>`;
      }
      panel.innerHTML = `<button class="panel-home" data-menu="home">拠点へ戻る</button><small>DUNGEON SELECT</small><h2>潜入先を選択</h2><nav class="dungeon-tabs">${tabs}</nav><section class="dungeon-route"><header style="background-image:url('${d.thumbnail}')"><div><small>${d.nameEn || d.enName || d.name}</small><h3>${d.name}</h3><span>推奨 Lv.${d.recommendedLevel}+　//　${progress}</span>${isNew ? '<mark>NEW AREA</mark>' : ''}</div></header><div class="dungeon-tree">${floorTree}${midBossNode}${bossNode}</div></section>`;
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

    // ══ 階層システム ══════════════════════════════════════════════
    // ダンジョン側に floors があれば階層制。無ければ従来どおり1枚のダンジョン。
    // 進捗は profile.flags.floorWins に階層IDごとの勝利数で持つ。
    floorsOf(dungeonId = this.currentDungeonId) { return this.getDungeon(dungeonId)?.floors || null; }
    floorWins(floorId) { return (this.profile.flags.floorWins || {})[floorId] || 0; }
    floorDef(floorId) { for (const d of D.dungeons || []) for (const f of d.floors || []) if (f.id === floorId) return f; return null; }
    isFloorCleared(floorId) { const f = this.floorDef(floorId); return !!f && this.floorWins(floorId) >= (f.winsToClear ?? 33); }
    // 1階は常に解放。以降は直前の階をクリアしていれば解放。
    isFloorUnlocked(floorId) {
      const floors = this.floorsOf(this.floorDungeonId(floorId)) || [];
      const i = floors.findIndex(f => f.id === floorId);
      if (i <= 0) return i === 0;
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
    rematchCounter(key) { if (key === 'seripes') return this.profile.flags.dungeon3BattleWins || 0; if (key === 'myrthi') return this.profile.flags.dungeon2BattleWins || 0; if (key === 'zenakado') return this.profile.flags.postNoelBattleWins || 0; return 0; }
    rematchProgress(key) { const need = D.settings?.bossRematchWins ?? 5, snap = this.profile.bossRematchAt?.[key] ?? 0, done = Math.max(0, this.rematchCounter(key) - snap); return { done: Math.min(done, need), need, ready: done >= need }; }
    noteBossRematchSnapshot(key) { this.profile.bossRematchAt ||= {}; this.profile.bossRematchAt[key] = this.rematchCounter(key); }
    dungeonBossEntry(dungeonId) {
      const make = (key, enemyId, fallbackName, enName, fallbackTitle, cleared) => { const e = D.enemies[enemyId], rm = cleared ? this.rematchProgress(key) : null; return { key, name: e?.name || fallbackName, enName, title: e?.title || fallbackTitle, sprite: e?.sprite, cleared, rematch: rm }; };
      if (dungeonId === 'dungeon3') {
        const cleared = this.isBossDefeated('seripes'), ready = (this.profile.flags.dungeon3BattleWins || 0) >= (D.settings.dungeon3TargetWins || 300);
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
      return null;
    }
    dungeonMidBossEntry(dungeonId) {
      if (dungeonId !== 'dungeon3') return null;
      const cleared = this.isBossDefeated('versicrell'), ready = (this.profile.flags.dungeon3BattleWins || 0) >= (D.settings.dungeon3MidBossWins || 150);
      if (!cleared && !ready) return null;
      const e = D.enemies.versicrell; return { key: 'versicrell', name: e.name, enName: 'VERSICRELL', title: e.title, sprite: e.sprite, cleared };
    }
    startBossByKey(key) {
      const defeatedId = key === 'zenakado' ? 'zenacad' : key;
      if (this.isBossDefeated(defeatedId) && !this.rematchProgress(key).ready) return;
      if (key === 'myrthi') { this.currentDungeonId = 'dungeon2'; this.startMyrthiBoss(); return; }
      if (key === 'versicrell') { if (this.isBossDefeated('versicrell')) return; this.currentDungeonId = 'dungeon3'; this.startVersicrellBoss(); return; }
      if (key === 'seripes') { this.currentDungeonId = 'dungeon3'; this.startSeripesBoss(); return; }
      if (key === 'zenakado') { this.currentDungeonId = 'dungeon1'; this.startBossEncounter('zenakado', 'zenakado'); return; }
      this.startBossEncounter();
    }
    changeJob(id) {
      const isAdv = (D.advancedJobIds || []).includes(id);
      if (!D.jobs[id] || id === this.profile.currentJob) return;
      if (isAdv && !this.isAdvancedJobUnlocked(id)) return;
      if (!isAdv && !this.isJobUnlocked(id)) return; const before = this.totalStats(), vitals = this.storedVitals(before); this.profile.currentJob = id; this.sanitizeLeftHandEquipment(); this.sanitizeRightHandEquipment(); const after = this.totalStats(); this.profile.currentVitals = { hp: Math.min(vitals.hp, after.maxHp), mp: Math.min(vitals.mp, after.maxMp) }; if (this.player) { this.player.stats = after; this.player.hp = Math.min(this.player.hp, after.maxHp); this.player.mp = Math.min(this.player.mp, after.maxMp); } this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('job');
    }
    toggleActiveSkill(id) {
      const learned = new Set(this.learnedActiveSkillIds()); if (!learned.has(id)) return; const active = [...(this.profile.activeSkills || [])], index = active.indexOf(id); if (index >= 0) active.splice(index, 1); else { if (active.length >= 4) return; active.push(id); } this.profile.activeSkills = active; this.saveProfile(); this.audio.sfx('ui'); this.renderMenuPanel('job');
    }
    eatFood() { const before = this.totalStats(), vitals = this.storedVitals(before), active = !!this.profile.flags.ramenBuffActive, full = vitals.hp >= before.maxHp && vitals.mp >= before.maxMp; if (active && full) return; const price = this.mealPrice(); this.profile.gold = Math.max(0, this.profile.gold - price); this.profile.flags.ramenBuffActive = true; const after = this.totalStats(); this.profile.currentVitals = { hp: after.maxHp, mp: after.maxMp }; if (this.player) { this.player.stats = after; this.player.hp = after.maxHp; this.player.mp = after.maxMp; } this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('food'); }
    useMenuItem(id) { const item = D.items[id], stats = this.totalStats(), vitals = this.storedVitals(stats), key = item?.effect?.hp ? 'hp' : item?.effect?.mp ? 'mp' : null, maxKey = key === 'hp' ? 'maxHp' : 'maxMp'; if (!key || !(this.profile.inventory[id] > 0) || vitals[key] >= stats[maxKey]) return; vitals[key] = Math.min(stats[maxKey], vitals[key] + item.effect[key]); this.profile.inventory[id]--; this.profile.currentVitals = vitals; this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('items'); }
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
        const gear = Object.entries(this.profile.inventory).filter(([id,n]) => n > 0 && D.items[id]?.category === 'equipment').map(([id,n]) => { const item = D.items[id], series = D.bossEquipmentSeries?.[item.seriesId], equipped = Object.values(this.profile.equipment).includes(id), spare = n - (equipped ? 1 : 0), can = !!series && spare > 0, output = series?.dismantle, material = D.items[output?.materialId]; return `<article class="${series ? 'boss-dismantle' : ''}"><div><b>${item.name}</b><span>${this.bonusText(id)} // 所持 ×${n}${equipped ? '（1個装備中）' : ''}</span>${series ? `<small>→ ${material?.name || output.materialId} ×${output.count}</small>` : ''}</div><button data-disassemble="${id}" ${can ? '' : 'disabled'}>${series ? (can ? '分解する' : '予備なし') : '対象外'}</button></article>`; }).join('');
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
      const tabs = seriesList.map(entry => `<button data-boss-series-tab="${entry.id}" class="${entry.id === series.id ? 'active' : ''}"><small>${entry.id.toUpperCase()}</small><b>${entry.nameJa || entry.name}</b><span>${this.equippedSeriesCount(entry.id)} / ${entry.equipment.length}</span></button>`).join('');
      return `<nav class="boss-series-tabs">${tabs}</nav><section class="boss-series-craft"><header><small>BOSS EQUIPMENT // ★★★★★</small><h3>${series.nameJa || series.name}</h3><b>${series.name}</b><span>MAIN：${primary}　／　適性：${jobs.join('・')}</span><p>${series.concept || ''}</p><em>EQUIPPED ${count} / ${series.equipment.length}</em></header><div class="boss-series-effects">${Object.entries(series.setBonuses || {}).map(([needed, bonus]) => `<div class="${count >= Number(needed) ? 'active' : ''}"><b>${needed} SET — ${bonus.name}</b><span>${bonus.description}</span></div>`).join('')}</div><div class="recipe-grid boss-recipe-grid">${recipes.map(recipe => this.recipeCardHTML(recipe)).join('')}</div></section>`;
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
      return `<article class="recipe-card rarity-${item.rarity}${isNewRecipe ? ' recipe-newly-unlocked' : ''}${craftable ? ' can-craft' : ''}"><div class="recipe-info"><div class="recipe-title"><b>${item.name}${item.stars ? `<small>${'★'.repeat(item.stars)}</small>` : ''}</b>${isNewRecipe ? '<mark class="recipe-new">NEW</mark>' : ''}${owned ? `<em>×${owned}</em>` : ''}</div><span class="recipe-bonus">${this.bonusText(recipe.resultItemId)}</span></div><details class="recipe-detail"><summary>必要素材${lacking ? `<b class="lack">${lackLabel}</b>` : '<b class="ok">そろっています</b>'}</summary><div class="recipe-materials">${materialsHtml}${goldRow}</div><p class="recipe-desc">${item.description}</p></details><button class="recipe-craft" data-craft="${recipe.id}" ${craftable ? '' : 'disabled'}>${craftLabel}</button></article>`;
    }
    craftMaterialAvailable(id) { const equipped = Object.values(this.profile.equipment || {}).filter(eid => eid === id).length; return Math.max(0, (this.profile.inventory[id] || 0) - equipped); }
    canCraft(recipe) { if (!recipe) return false; if (this.profile.gold < (recipe.gold || 0)) return false; return (recipe.materials || []).every(m => this.craftMaterialAvailable(m.itemId) >= m.count); }
    craftItem(id) {
      const recipe = D.recipes?.[id]; if (!recipe || !this.canCraft(recipe)) return;
      this.profile.gold -= (recipe.gold || 0); recipe.materials.forEach(m => { this.profile.inventory[m.itemId] = (this.profile.inventory[m.itemId] || 0) - m.count; });
      this.profile.inventory[recipe.resultItemId] = (this.profile.inventory[recipe.resultItemId] || 0) + (recipe.resultCount || 1);
      this.recordEquipmentDiscovery([recipe.resultItemId]);
      this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('workshop');
    }
    dismantleItem(id) { const item = D.items[id], series = D.bossEquipmentSeries?.[item?.seriesId], output = series?.dismantle, equipped = Object.values(this.profile.equipment).includes(id), spare = (this.profile.inventory[id] || 0) - (equipped ? 1 : 0); if (!item || !series || !output || spare <= 0) return; this.profile.inventory[id]--; this.profile.inventory[output.materialId] = (this.profile.inventory[output.materialId] || 0) + output.count; this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('workshop'); }
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
      const et = D.enchantTable, enchants = this.profile.weaponEnchants || {}, weapons = Object.values(D.weapons).filter(w => w.id && D.items[w.id]);
      if (!weapons.length) return '<p>強化可能な武器がありません。</p>';
      const cards = weapons.map(w => {
        const level = enchants[w.id] || 0, isEquipped = this.profile.equipment.rightHand === w.id;
        const invCount = this.profile.inventory[w.id] || 0, hasSpare = invCount >= 2;
        if (level >= et.maxLevel) return `<article class="enchant-card max"><b>${w.name}</b><span>+${level} MAX</span><small>最大強化達成</small></article>`;
        const nextLevel = level + 1, rate = et.successRates[level], cost = et.goldCosts[level], rateText = `${Math.round(rate * 100)}%`, canAfford = this.profile.gold >= cost;
        const canEnchant = hasSpare && canAfford;
        const spareText = isEquipped ? `所持 ×${invCount}（うち1個装備中） / 予備 ${Math.max(0, invCount - 1)}` : `所持 ×${invCount}`;
        return `<article class="enchant-card${level > 0 ? ' enhanced' : ''}"><div class="enchant-card-header"><b>${w.name}</b><strong>+${level} → +${nextLevel}</strong></div><div class="enchant-card-body"><span>成功率 <b>${rateText}</b></span><span>費用 <b>${cost} GOLD</b></span><small>${spareText}</small>${!hasSpare ? '<small class="enchant-warn">同じ武器が追加で必要</small>' : ''}${!canAfford ? '<small class="enchant-warn">GOLD不足</small>' : ''}</div><button data-enchant="${w.id}" ${canEnchant ? '' : 'disabled'}>強化する</button></article>`;
      }).join('');
      return `<div class="workshop-section-title"><b>武器強化</b><span>WEAPON ENCHANT</span></div><p class="workshop-warning">同じ武器1個を素材として強化します。+3まで成功率100%。+4以降は失敗で武器が消滅します。</p><div class="enchant-grid">${cards}</div>`;
    }
    enchantWeapon(weaponId) {
      const w = D.weapons[weaponId]; if (!w) return;
      const enchants = this.profile.weaponEnchants || {}, level = enchants[weaponId] || 0, et = D.enchantTable;
      if (level >= et.maxLevel) return;
      const isEquipped = this.profile.equipment.rightHand === weaponId, invCount = this.profile.inventory[weaponId] || 0, hasSpare = invCount >= 2, cost = et.goldCosts[level];
      if (!hasSpare || this.profile.gold < cost) return;
      this.profile.gold -= cost;
      this.profile.inventory[weaponId] = (this.profile.inventory[weaponId] || 0) - 1;
      const success = Math.random() < et.successRates[level];
      if (success) {
        this.profile.weaponEnchants[weaponId] = level + 1;
        this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('workshop');
      } else {
        delete this.profile.weaponEnchants[weaponId];
        this.profile.inventory[weaponId] = Math.max(0, (this.profile.inventory[weaponId] || 0) - 1);
        if (!(this.profile.inventory[weaponId] > 0)) { if (this.profile.equipment.rightHand === weaponId) this.profile.equipment.rightHand = 'mageStaff'; if (this.profile.equipment.leftHand === weaponId) this.profile.equipment.leftHand = null; }
        this.saveProfile(); this.audio.sfx('defeat'); this.renderMenuSummary(); this.renderMenuPanel('workshop');
        alert(`武器強化FAILED！\n${w.name}は粉砕された……`);
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
      const all = Object.values(D.items || {}).filter(item => item.category === 'equipment' && item.catalogDungeon === dunId && !item.legacy && item.source !== 'collection');
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
        <p class="ar-hint"><b>記録率 ${archivePct}%</b>　—　怪異名をタップすると詳細が開きます。</p>
        <div class="ar-list">${cards || '<p class="item-empty">このダンジョンの記録はまだありません。</p>'}</div>`;
    }
    // 選択キャラの名前。未選択時は蓮。
    playerName() { return (this.characterList || []).find(c => c.id === this.profile.selectedCharacter)?.name || '蓮'; }
    statusPortraitSource() { return this.profile.customStatusPortrait || this.selectedCharacterData()?.image || ''; }
    applyStatusPortrait() {
      const portrait = $('.st-portrait'); if (!portrait) return;
      const src = String(this.statusPortraitSource()).replace(/["\\]/g, '\\$&');
      portrait.style.backgroundImage = src ? `url("${src}")` : '';
    }
    async setCustomStatusPortrait(file) {
      if (!file?.type?.startsWith('image/')) { window.arseneStartFlow?.toast('画像ファイルを選んでください'); return; }
      if (file.size > 12 * 1024 * 1024) { window.arseneStartFlow?.toast('画像は12MB以下にしてください'); return; }
      const objectUrl = URL.createObjectURL(file);
      try {
        const image = new Image(); image.src = objectUrl; await image.decode();
        const size = Math.min(image.naturalWidth, image.naturalHeight), sx = (image.naturalWidth - size) / 2, sy = (image.naturalHeight - size) / 2;
        const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 320;
        canvas.getContext('2d').drawImage(image, sx, sy, size, size, 0, 0, 320, 320);
        this.profile.customStatusPortrait = canvas.toDataURL('image/jpeg', 0.84);
        this.saveProfile(); this.audio.sfx('ui'); this.renderMenuPanel('equipment');
        window.arseneStartFlow?.toast('ステータス写真を変更しました');
      } catch { window.arseneStartFlow?.toast('画像を読み込めませんでした'); }
      finally { URL.revokeObjectURL(objectUrl); }
    }
    renderStatusPanel(panel, withTabs = false) {
      const base = this.profile.baseStats, bonus = this.equipmentBonuses(), total = this.totalStats(), vitals = this.storedVitals(total);
      const jid = this.profile.currentJob, jst = this.profile.jobs?.[jid] || {}, jlv = jst.level || 1, jneed = this.jobExpNeeded(jlv), jexp = jst.exp || 0;
      const jpct = jneed ? Math.min(100, 100 * jexp / jneed) : 100;
      // JOB補正 = 旧テーブル方式の補正 ＋ 今のJOBで育てた成長分
      const legacyJob = this.activeJobBonuses(), growthJob = this.jobStatBonuses(), jobBonus = {};
      for (const src of [legacyJob, growthJob]) for (const [k, v] of Object.entries(src)) if (v) jobBonus[k] = (jobBonus[k] || 0) + v;
      // 基礎値 ＋ JOB ＋ 装備 が合計と一致するように並べる
      const statRows = Object.keys(statLabels).map(k => {
        const b = base[k] || 0, j = jobBonus[k] || 0, e = bonus[k] || 0;
        const parts = [`<i class="src-base">基礎 ${b}</i>`];
        if (j) parts.push(`<i class="src-job">JOB +${j}</i>`);
        if (e) parts.push(`<i class="src-eq">装備 +${e}</i>`);
        const rest = total[k] - b - j - e;
        if (rest) parts.push(`<i class="src-etc">その他 ${rest > 0 ? '+' : ''}${rest}</i>`);
        return `<div class="st-stat"><span>${statLabels[k]}</span><b>${total[k]}</b><em>${parts.join('<u>+</u>')}</em></div>`;
      }).join('');
      const jobBonusRows = Object.entries(jobBonus).filter(([, v]) => v).map(([k, v]) => `<div class="st-jb-row"><span>${statLabels[k] || k.toUpperCase()}</span><b>+${v}</b></div>`).join('');
      // ファントムシーフは全JOBの育てた成長を合算して一定割合を引き継ぐ。
      // 何がどこから来ているか分かるよう、内訳と引継率を明示する。
      const inheritRate = Math.round((this.gb().phantomThiefInheritRate ?? 0.5) * 100);
      let jobNote;
      if (this.isPhantomThief()) {
        const gained = this.profile.jobGrowthGained || {};
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
        <div class="st-head2"><label class="st-portrait st-portrait-pick" title="タップで写真を変更"><span class="st-portrait-hint">変更</span><input type="file" accept="image/*" data-status-avatar-upload></label><div class="st-id2"><strong>${this.playerName()}</strong><em>${D.jobs[jid]?.name || ''} Lv.${jlv}</em><button type="button" class="st-avatar-reset" data-status-avatar-reset>初期画像に戻す</button></div><div class="st-vit"><span class="hp">HP ${vitals.hp} / ${total.maxHp}</span><span class="mp">MP ${vitals.mp} / ${total.maxMp}</span></div></div>
        ${this.combatStatsSectionHTML(total)}
        ${this.bossSetBonusSectionHTML()}
        <div class="st-section"><h3>基礎能力</h3><div class="stat-grid">${statRows}</div></div>
        ${jobHtml}
        <div class="st-section"><h3>JOB経験値</h3><div class="st-meter jexp"><span>${D.jobs[jid]?.name || ''} Lv.${jlv}</span><i style="width:${jpct}%"></i><output>${jneed ? `${jexp} / ${jneed}` : 'MASTER'}</output></div></div>`;
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
      const owned = Object.entries(inv).filter(([, n]) => n > 0);
      const countFor = (cat, sub) => owned.filter(([id]) => { const it = D.items[id]; if (!it) return false; if (cat === 'consumable') return it.category === 'consumable'; const w = D.weapons[id]; if (cat === 'weapon') return !!w && (!sub || w.weaponType === sub); if (cat === 'armor') return it.category === 'equipment' && !w && (!sub || it.slot === sub); return false; }).length;
      const mainTabs = tabs.main.map(t => `<button data-item-tab="${t.id}" class="${this.itemTab === t.id ? 'active' : ''}"><b>${t.name}</b><span>${t.enName}</span>${countFor(t.id) ? `<i>${countFor(t.id)}</i>` : ''}</button>`).join('');
      let subTabs = '';
      if (this.itemTab === 'weapon') subTabs = `<div class="item-subtabs">${tabs.weaponSubs.map(t => `<button data-item-wsub="${t.id}" class="${this.itemWeaponSub === t.id ? 'active' : ''}">${t.name}${countFor('weapon', t.id) ? `<i>${countFor('weapon', t.id)}</i>` : ''}</button>`).join('')}</div>`;
      if (this.itemTab === 'armor') subTabs = `<div class="item-subtabs">${tabs.armorSubs.map(t => `<button data-item-asub="${t.id}" class="${this.itemArmorSub === t.id ? 'active' : ''}">${t.name}${countFor('armor', t.id) ? `<i>${countFor('armor', t.id)}</i>` : ''}</button>`).join('')}</div>`;
      const sub = this.itemTab === 'weapon' ? this.itemWeaponSub : this.itemTab === 'armor' ? this.itemArmorSub : null;
      const list = owned.filter(([id]) => { const it = D.items[id]; if (!it) return false; const w = D.weapons[id]; if (this.itemTab === 'consumable') return it.category === 'consumable'; if (this.itemTab === 'weapon') return !!w && w.weaponType === sub; return it.category === 'equipment' && !w && it.slot === sub; });
      const rows = list.map(([id, n]) => {
        const it = D.items[id], w = D.weapons[id];
        // アルカナ（arcanaStat）は回復アイテムではないが「使う」で恒久強化するので常に押せる
        if (this.itemTab === 'consumable') { const usable = it.effect?.hp || it.effect?.mp || it.arcanaStat, full = it.arcanaStat ? false : (it.effect?.hp ? vitals.hp >= stats.maxHp : it.effect?.mp ? vitals.mp >= stats.maxMp : true); return `<div class="item-row rarity-${it.rarity}"><div><b>${it.name}</b><small>${it.description}</small></div><strong>×${n}</strong>${usable ? `<button ${it.arcanaStat ? `data-use-arcana="${id}"` : `data-use-item="${id}"`} ${full ? 'disabled' : ''}>${full ? '満タン' : '使う'}</button>` : ''}</div>`; }
        const equipped = Object.values(this.profile.equipment).includes(id), slot = w ? 'rightHand' : it.slot;
        return `<div class="item-row rarity-${it.rarity}${equipped ? ' item-equipped' : ''}"><div><b>${it.name}${this.enchantSuffix(id)}${equipped ? '<mark class="eq-badge">装備中</mark>' : ''}</b><small>${this.bonusText(id)}</small></div><strong>×${n}</strong><button data-equip-item="${id}" data-equip-slot="${slot}" ${equipped ? 'disabled' : ''}>${equipped ? '装備中' : '装備'}</button></div>`;
      }).join('');
      const emptyMsg = this.itemTab === 'consumable' ? '消費アイテムなし' : this.itemTab === 'weapon' ? 'この種類の武器なし' : 'この部位の防具なし';
      panel.innerHTML = `<small>INVENTORY</small><h2>アイテム</h2><div class="inventory-vitals"><b>HP ${vitals.hp} / ${stats.maxHp}</b><b>MP ${vitals.mp} / ${stats.maxMp}</b></div><div class="item-tabs">${mainTabs}</div>${subTabs}<div class="inventory-list">${rows || `<p class="item-empty">${emptyMsg}</p>`}</div>`;
    }
    armorEnchantContent() {
      const et = D.enchantTable, enchants = this.profile.armorEnchants || {};
      const armorSlots = ['head','body','arms','feet','accessory','leftHand'];
      const armors = Object.values(D.items || {}).filter(item => item.category === 'equipment' && armorSlots.includes(item.slot));
      if (!armors.length) return '<p>強化可能な防具がありません。</p>';
      const cards = armors.map(item => {
        const id = item.id, level = enchants[id] || 0;
        const isEquipped = Object.values(this.profile.equipment).includes(id);
        const invCount = this.profile.inventory[id] || 0, hasSpare = invCount >= 2;
        if (level >= et.maxLevel) return `<article class="enchant-card max"><b>${item.name}</b><span>+${level} MAX</span><small>最大強化達成</small></article>`;
        const nextLevel = level + 1, rate = et.successRates[level], cost = et.goldCosts[level], rateText = `${Math.round(rate * 100)}%`, canAfford = this.profile.gold >= cost;
        const canEnchant = hasSpare && canAfford;
        const spareText = isEquipped ? `所持 ×${invCount}（うち1個装備中） / 予備 ${Math.max(0, invCount - 1)}` : `所持 ×${invCount}`;
        return `<article class="enchant-card${level > 0 ? ' enhanced' : ''}"><div class="enchant-card-header"><b>${item.name}</b><strong>+${level} → +${nextLevel}</strong></div><div class="enchant-card-body"><span>成功率 <b>${rateText}</b></span><span>費用 <b>${cost} GOLD</b></span><small>${spareText}</small>${!hasSpare ? '<small class="enchant-warn">同じ防具が追加で必要</small>' : ''}${!canAfford ? '<small class="enchant-warn">GOLD不足</small>' : ''}</div><button data-armor-enchant="${id}" ${canEnchant ? '' : 'disabled'}>強化する</button></article>`;
      }).join('');
      return `<div class="workshop-section-title"><b>防具強化</b><span>ARMOR ENCHANT</span></div><p class="workshop-warning">同じ防具1個を素材として強化します。+3まで成功率100%。+4以降は失敗で防具が消滅します。</p><div class="enchant-grid">${cards}</div>`;
    }
    enchantArmor(itemId) {
      const item = D.items[itemId]; if (!item) return;
      const enchants = this.profile.armorEnchants || {}, level = enchants[itemId] || 0, et = D.enchantTable;
      if (level >= et.maxLevel) return;
      const isEquipped = Object.values(this.profile.equipment).includes(itemId), invCount = this.profile.inventory[itemId] || 0, hasSpare = invCount >= 2, cost = et.goldCosts[level];
      if (!hasSpare || this.profile.gold < cost) return;
      this.profile.gold -= cost;
      this.profile.inventory[itemId] = (this.profile.inventory[itemId] || 0) - 1;
      const success = Math.random() < et.successRates[level];
      if (success) {
        this.profile.armorEnchants[itemId] = level + 1;
        this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('workshop');
      } else {
        delete this.profile.armorEnchants[itemId];
        this.profile.inventory[itemId] = Math.max(0, (this.profile.inventory[itemId] || 0) - 1);
        if (!(this.profile.inventory[itemId] > 0)) Object.keys(this.profile.equipment).forEach(slot => { if (this.profile.equipment[slot] === itemId) this.profile.equipment[slot] = null; });
        this.saveProfile(); this.audio.sfx('defeat'); this.renderMenuSummary(); this.renderMenuPanel('workshop');
        alert(`防具強化FAILED！\n${item.name}は粉砕された……`);
      }
    }
    bonusText(id) {
      const def = this.equipmentDefinition(id) || {}, enchLv = this.enchantLevel(id);
      // 戦闘能力は日本語表示。内部キーは画面へ出さない。
      const combatLabels = { attackPower: '攻撃力', defensePower: '防御力', magicAttackPower: '魔法攻撃力', magicDefensePower: '魔法防御力' };
      const effectLabels = { physicalDamagePercent: '物理ダメージ', criticalRateBonus: '会心率', fireDamagePercent: '炎属性ダメージ', healingPowerPercent: '回復量', magicDamageReductionPercent: '被魔法ダメージ' };
      const combatRows = Object.entries(combatLabels).filter(([k]) => def[k]).map(([k, label]) => `${label} +${def[k]}`);
      const effectRows = Object.entries(def.effects || {}).map(([k, v]) => { const label = effectLabels[k] || k; const sign = k === 'magicDamageReductionPercent' ? '-' : '+'; return `${label} ${sign}${Math.round(Math.abs(v) * 100)}%`; });
      const bonuses = def.bonuses || {}, rows = Object.entries(bonuses).filter(([k]) => k !== 'def');
      const enchStr = enchLv > 0 ? ` [+${enchLv}]` : '';
      const all = [...combatRows, ...rows.map(([key, value]) => key === 'critBonus' ? `会心率 ${value >= 0 ? '+' : ''}${Math.round(value * 100)}%` : `${statLabels[key] || key.toUpperCase()} ${value >= 0 ? '+' : ''}${value}`), ...effectRows];
      return all.length ? all.join(' / ') + enchStr : '補正なし' + enchStr;
    }
    equipmentPreviewHTML(id) {
      if (!id) return `<div class="equipment-empty-preview"><b>装備候補を選択</b><span>候補をタップすると、現在装備との能力差を確認できます。</span></div>`;
      const item = D.items[id], targetSlot = this.equipSlot || item.slot, currentId = this.profile.equipment[targetSlot], currentItem = D.items[currentId], nextEquipment = { ...this.profile.equipment, [targetSlot]: id }, before = this.totalStats(), after = this.totalStats(nextEquipment), active = currentId === id;
      const rows = Object.keys(statLabels).map(key => { const delta = after[key] - before[key], state = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same', change = delta ? `${delta > 0 ? '+' : ''}${delta} ${delta > 0 ? '↑' : '↓'}` : '－'; return `<div class="compare-row ${state}"><span>${statLabels[key]}</span><b>${before[key]}</b><i>→</i><strong>${after[key]}</strong><em>${change}</em></div>`; }).join('');
      return `<div class="equipment-swap"><div><small>現在装備</small><b>${currentItem?.name || 'なし'}</b><span>${currentId ? this.bonusText(currentId) : '補正なし'}</span></div><i>→</i><div><small>変更後</small><b>${item.name}</b><span>${this.bonusText(id)}</span></div></div><div class="equipment-description">${item.description}</div><div class="compare-table"><div class="compare-head"><span>能力</span><b>現在</b><i></i><strong>装備後</strong><em>変化</em></div>${rows}</div><button class="equip-confirm" data-equip-confirm="${id}" ${active ? 'disabled' : ''}>${active ? '装備中' : 'この装備に変更'}<span>${active ? 'EQUIPPED' : 'EQUIP'}</span></button>`;
    }
    musicScoreSectionHTML() { const scores = Object.values(D.musicScores || {}); return `<section class="music-score-section"><h3>楽曲 <span>MUSIC SCORE // PRIVATE MODE</span></h3><div>${scores.map(score => { const owned = !!this.profile.musicScores?.[score.id]; return `<article class="music-score-card ${owned ? 'owned' : 'locked'}"><i>♪</i><div><small>${owned ? 'PLAYABLE SCORE' : 'LOCKED SCORE'}</small><b>${owned ? score.title : '????????'}</b><strong>${owned ? `（${score.subtitle}）` : 'ゼナカド初回撃破で解放'}</strong><span>${owned ? score.description : 'まだ演奏できません。'}</span></div><em>${owned ? 'PRIVATE MODE ITEM' : 'LOCKED'}</em></article>`; }).join('')}</div></section>`; }
    bossSetBonusSectionHTML() {
      const equipped = this.unlockedBossSeries().map(series => ({ series, count: this.equippedSeriesCount(series.id) })).filter(entry => entry.count > 0);
      if (!equipped.length) return '';
      return `<div class="equipped-set-series"><header><small>SET SERIES</small><b>発動中・装備中のシリーズ</b></header>${equipped.map(({ series, count }) => `<section class="boss-set-section"><header><div><small>${series.name}</small><h3>${series.nameJa || series.name}</h3></div><strong>${count} / ${series.equipment.length}</strong></header><div>${Object.entries(series.setBonuses || {}).map(([needed, bonus]) => `<article class="${count >= Number(needed) ? 'active' : ''}"><b>${needed} SET — ${bonus.name}</b><span>${bonus.description}</span></article>`).join('')}</div></section>`).join('')}</div>`;
    }
    equipTabsHtml() {
      const t = this.equipTab || 'equip';
      // 1行に収まる短いラベルにして、内容を階層で分ける（長い1枚ページをやめる）
      const tabs = [['equip', '装備'], ['status', '能力値'], ['mastery', '武器学'], ['arts', '武器技'], ['score', '楽曲']];
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
      const all = Object.values(D.skills).filter(s => s.weaponType === type && s.prerequisiteSkill && (type !== 'instrument' || (equippedTree ? s.guitarTreeId === equippedTree : !s.guitarTreeId)))
        .sort((a, b) => (a.requiredWeaponLevel ?? 1) - (b.requiredWeaponLevel ?? 1));
      const learned = this.learnedWeaponSkillIds();
      const mst = this.masteryOf(type);
      const rows = all.map(s => {
        const has = learned.includes(s.id);
        const open = this.artsOpenId === s.id;
        // 派生元の技名は出さない。未習得の技（？？？）の名前がここから漏れてしまうため。
        const req = s.requiredWeaponLevel ?? 1;
        const meta = has
          ? `${s.mp ? `MP ${s.mp}` : 'MP 0'}${s.hits > 1 ? ` / ${s.hits}回攻撃` : ''}${s.aoe ? ' / 全体' : ''}`
          : `武器学 Lv.${req} 必要`;
        const detail = open && has
          ? `<div class="wa-detail"><p>${s.description || ''}</p><div class="wa-facts">
              <span>威力</span><b>${s.power != null ? `攻撃性能×${s.power}${s.hits > 1 ? ` を${s.hits}回` : ''}` : '—'}</b>
              <span>消費MP</span><b>${s.mp || 0}</b>
              ${s.hits > 1 ? `<span>ヒット数</span><b>${s.hits}回</b>` : ''}
              ${s.aoe ? '<span>対象</span><b>敵全体</b>' : '<span>対象</span><b>敵単体</b>'}
              ${s.element ? `<span>属性</span><b>${s.element}</b>` : ''}
            </div></div>`
          : '';
        return `<div class="wa-item ${has ? 'has' : 'lock'}${open ? ' open' : ''}">
          <button class="wa-head" ${has ? `data-arts-open="${s.id}"` : 'disabled'}>
            <b>${has ? s.name : '？？？'}</b><small>${meta}</small>${has ? `<em>${open ? '▲' : '▼'}</em>` : '<em class="wa-lock">未修得</em>'}
          </button>${detail}</div>`;
      }).join('');
      const nextHint = (() => {
        const next = all.find(s => !learned.includes(s.id));
        if (!next) return 'この武器の技はすべて習得しています。';
        return mst.level >= (next.requiredWeaponLevel ?? 1)
          ? 'この武器で戦い続けると、次の技を閃くことがあります。'
          : `次の技は武器学 Lv.${next.requiredWeaponLevel} から閃けます（現在 Lv.${mst.level}）。`;
      })();
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
      const slots = D.equipmentSlots || [], owned = Object.entries(this.profile.inventory).filter(([id, n]) => n > 0 && D.items[id]?.category === 'equipment');
      if (this.selectedEquipmentId && !(this.profile.inventory[this.selectedEquipmentId] > 0)) this.selectedEquipmentId = null;
      const isDualBlade = this.profile.currentJob === 'dualBlade', canUseLeft = ['warrior', 'dualBlade'].includes(this.profile.currentJob);
      const activeSlot = this.equipSlot && slots.some(s => s.id === this.equipSlot) ? this.equipSlot : null;
      const fists = this.usesBareFists(); // 武道家が素手なら両手を「拳」と表示する
      const slotHtml = slots.map(slot => { const id = this.profile.equipment[slot.id], item = D.items[id]; const rate = isDualBlade && slot.id === 'leftHand' && D.weapons[id] ? ' ×70%' : ''; const disabled = slot.id === 'leftHand' && !canUseLeft; const count = this.candidatesForSlot(slot.id).length; const leftRule = slot.id === 'leftHand' ? (isDualBlade ? '<small>左手専用武器のみ</small>' : this.profile.currentJob === 'warrior' ? '<small>盾のみ</small>' : '') : ''; return `<button type="button" data-equip-slot-pick="${slot.id}" class="equipment-slot ${id ? 'filled' : 'empty'} ${disabled ? 'slot-disabled' : ''} ${activeSlot === slot.id ? 'slot-active' : ''}" ${disabled ? 'disabled' : ''}><span>${slot.name}<small>${slot.enName}</small>${leftRule}</span><b>${item?.name || (fists && (slot.id === 'rightHand' || slot.id === 'leftHand') ? '拳' : 'なし')}${id ? this.enchantSuffix(id) : ''}${rate}</b>${count && !disabled ? `<i class="slot-count">${count}</i>` : ''}</button>`; }).join('');
      let workbench;
      if (!activeSlot) {
        workbench = `<div class="equip-hint"><b>装備部位を選んでください</b><span>上の部位をタップすると、そこに装備できるアイテムだけが表示されます。</span></div>`;
      } else {
        const slotDef = slots.find(s => s.id === activeSlot);
        let list = this.candidatesForSlot(activeSlot);
        const sortKey = this.equipSort || 'default';
        if (sortKey !== 'default') list = [...list].sort((a, b) => this.equipSortValue(b, sortKey) - this.equipSortValue(a, sortKey) || (D.items[a]?.name || '').localeCompare(D.items[b]?.name || ''));
        const sortOpts = [{ id: 'default', name: '標準' }, ...Object.keys(statLabels).map(k => ({ id: k, name: statLabels[k] }))];
        const sortHtml = `<div class="equip-sort"><span>並べ替え</span><div class="equip-sort-btns">${sortOpts.map(o => `<button data-equip-sort="${o.id}" class="${sortKey === o.id ? 'active' : ''}">${o.name}</button>`).join('')}</div></div>`;
        const curId = this.profile.equipment[activeSlot];
        const unequipBtn = curId ? `<button class="equip-unequip" data-unequip-slot="${activeSlot}">${slotDef?.name}を外す<span>UNEQUIP</span></button>` : '';
        const cards = list.map(id => { const item = D.items[id], active = this.profile.equipment[activeSlot] === id, selected = this.selectedEquipmentId === id; const delta = this.equipDeltaSummary(id, activeSlot); return `<button data-equip-preview="${id}" aria-pressed="${selected}" class="equipment-candidate rarity-${item.rarity} ${active ? 'equipped-now' : ''} ${selected ? 'selected' : ''}"><span class="candidate-title"><b>${item.name}${this.enchantSuffix(id)}${item.stars ? `<small>${'★'.repeat(item.stars)}</small>` : ''}</b>${active ? '<em>EQUIPPED</em>' : ''}</span><strong>${this.bonusText(id)}</strong>${delta ? `<span class="cand-delta">${delta}</span>` : ''}<small>${item.description}</small></button>`; }).join('');
        workbench = `<div class="equipment-candidates"><h3>${slotDef?.name}の装備 <span>${slotDef?.enName}</span></h3>${sortHtml}${unequipBtn}${cards || '<p class="item-empty">この部位に装備できるアイテムがありません。</p>'}</div><div id="equipment-preview" class="equipment-preview"><h3>能力比較 <span>STATUS COMPARISON</span></h3>${this.equipmentPreviewHTML(this.selectedEquipmentId)}</div>`;
      }
      panel.innerHTML = `<small>EQUIPMENT</small><h2>装備・ステータス</h2>${this.equipTabsHtml()}<div class="equipment-screen"><section class="equipment-slots-wrap"><h3>装備中 <span>CURRENT LOADOUT</span></h3><div class="equipment-slots">${slotHtml}</div></section><section class="equipment-workbench">${workbench}</section>${this.bossSetBonusSectionHTML()}</div>`;
    }
    candidatesForSlot(slotId) {
      return Object.entries(this.profile.inventory).filter(([id, n]) => {
        if (!(n > 0)) return false; const item = D.items[id]; if (!item || item.category !== 'equipment') return false;
        if (slotId === 'leftHand') return this.isLeftHandItemAllowed(id);
        if (slotId === 'rightHand' && (this.isOffHandOnlyWeapon(id) || !this.canEquipRightHand(id))) return false;
        return item.slot === slotId;
      }).map(([id]) => id);
    }
    isOffHandOnlyWeapon(id) { return !!D.weapons[id] && !!(D.weapons[id].offHandOnly || D.items[id]?.offHandOnly); }
    isShield(id) { return !!id && !D.weapons[id] && D.items[id]?.slot === 'leftHand'; }
    isLeftHandItemAllowed(id, jobId = this.profile.currentJob) { if (!id) return true; if (jobId === 'warrior') return this.isShield(id); if (jobId === 'dualBlade') return this.isOffHandOnlyWeapon(id); return false; }
    sanitizeLeftHandEquipment() { const id = this.profile?.equipment?.leftHand; if (id && !this.isLeftHandItemAllowed(id, this.profile.currentJob)) this.profile.equipment.leftHand = null; }
    sanitizeRightHandEquipment() { const id = this.profile?.equipment?.rightHand; if (!id || this.canEquipRightHand(id)) return; const preferred = this.weaponTypeDef(this.profile.preferredWeaponType)?.starterWeaponId, fallback = [preferred, 'mageStaff', 'phantomSword', 'ironClaw'].find(wid => wid && (this.profile.inventory[wid] || 0) > 0 && this.canEquipRightHand(wid)); this.profile.equipment.rightHand = fallback || 'mageStaff'; }
    equipSortValue(id, key) { const before = this.totalStats(), item = D.items[id]; if (!item) return 0; const slot = this.equipSlot || item.slot; const after = this.totalStats({ ...this.profile.equipment, [slot]: id }); return after[key] - before[key]; }
    equipDeltaSummary(id, slotId) {
      const before = this.totalStats(), after = this.totalStats({ ...this.profile.equipment, [slotId]: id });
      const parts = Object.keys(statLabels).map(k => { const d = after[k] - before[k]; return d ? `<i class="${d > 0 ? 'up' : 'down'}">${statLabels[k]} ${d > 0 ? '+' : ''}${d}</i>` : ''; }).filter(Boolean);
      return parts.length ? parts.join('') : '<i class="same">変化なし</i>';
    }
    previewEquipment(id) { const item = D.items[id]; if (!item || item.category !== 'equipment' || !(this.profile.inventory[id] > 0)) return; this.selectedEquipmentId = id; this.renderMenuPanel('equipment'); requestAnimationFrame(() => $('#equipment-preview')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })); }
    equipItem(id) { const item = D.items[id]; if (!item || item.category !== 'equipment' || !(this.profile.inventory[id] > 0)) return; const slot = (this.equipSlot && this.candidatesForSlot(this.equipSlot).includes(id)) ? this.equipSlot : item.slot; if (slot === 'leftHand' && !this.isLeftHandItemAllowed(id)) return; if (slot === 'rightHand' && (this.isOffHandOnlyWeapon(id) || !this.canEquipRightHand(id))) return; this.profile.equipment[slot] = id; this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('equipment'); }
    unequipSlot(slotId) { if (!slotId || !(slotId in this.profile.equipment)) return; this.profile.equipment[slotId] = slotId === 'rightHand' ? 'mageStaff' : null; this.selectedEquipmentId = null; this.saveProfile(); this.audio.sfx('ui'); this.renderMenuSummary(); this.renderMenuPanel('equipment'); }
    equipFromInventory(id) { const item = D.items[id]; if (!item || !(this.profile.inventory[id] > 0)) return; const slot = this.isOffHandOnlyWeapon(id) ? 'leftHand' : D.weapons[id] ? 'rightHand' : item.slot; if (!slot || (slot === 'leftHand' && !this.isLeftHandItemAllowed(id)) || (slot === 'rightHand' && !this.canEquipRightHand(id))) return; this.profile.equipment[slot] = id; this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('items'); }
    equipLeftHandWeapon(id) { if (!(this.profile.inventory[id] > 0) || !this.isLeftHandItemAllowed(id)) return; this.profile.equipment.leftHand = id; this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('equipment'); }

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
      let timer = setTimeout(() => bubble.remove(), 6000);
      bubble.addEventListener('click', () => { clearTimeout(timer); bubble.remove(); });
    }
  }
  window.BattleGame = BattleGame; // 異世界モジュールから prototype を拡張するため公開する
  addEventListener('DOMContentLoaded', () => { window.arseneGame = new BattleGame(); });
})();
