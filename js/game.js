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
      this.profile = this.loadProfile(); this.syncSkillUnlocks(); this.player = null; this.enemies = []; this.turn = 1; this.locked = false; this.finished = false; this.autoBattle = false; this.selectedEquipmentId = null; this.battleMode = 'slime'; this.workshopTab = 'weapon'; this.craftDungeonFilter = 'all'; this.craftArmorFilter = 'leftHand';
      this.currentDungeonId = 'dungeon1';
      this.battleMusic = encodeURI('音楽系/戦闘用/零時侵蝕 (Without Lead Vocal).mp3');
      this.menuMusic = encodeURI('音楽系/拠点/Midnight Ramen Den.mp3');
      this.bossMusic = encodeURI('音楽系/戦闘用/インサイダー取引はダメですよ。ボス戦Version.mp3');
      this.audio = new ArseneAudio(this.battleMusic);
      $('#audio-toggle').addEventListener('click', async () => { await this.audio.unlock(); const on = this.audio.toggle(); $('#audio-toggle').classList.toggle('muted', !on); $('#audio-toggle span').textContent = on ? 'SOUND ON' : 'SOUND OFF'; });
      document.addEventListener('click', e => { if (e.target.closest('[data-go-menu], #result-menu')) { e.preventDefault(); this.showMenu('home'); } });
      $('#result-menu').addEventListener('pointerup', e => { e.preventDefault(); this.showMenu('home'); });
      $('#menu-screen').addEventListener('click', async e => { const b = e.target.closest('[data-menu]'); if (!b || b.disabled) return; await this.audio.unlock(); this.audio.sfx('ui'); if (b.dataset.menu === 'battle') { this.renderMenuPanel('dungeon-select'); } else if (b.dataset.menu === 'boss') { await this.audio.playTrack(this.bossMusic); if (this.isMyrthiUnlocked() && !this.isBossDefeated('myrthi')) { this.currentDungeonId = 'dungeon2'; this.startMyrthiBoss(); } else this.startBossEncounter(); } else { if (b.dataset.menu === 'equipment') this.equipTab = b.hasAttribute('data-open-status') ? 'status' : 'equip'; this.renderMenuPanel(b.dataset.menu); } });
      $('#menu-panel').addEventListener('click', async e => {
        const enterDungeon = e.target.closest('[data-enter-dungeon]');
        if (enterDungeon) { this.currentDungeonId = enterDungeon.dataset.enterDungeon; this.currentFloorId = null; const dungeonCfg = this.getDungeon(this.currentDungeonId); await this.audio.playTrack(dungeonCfg?.music || this.battleMusic); this.startBattle(); return; }
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
        if (bossChallenge) { await this.audio.playTrack(this.bossMusic); this.startBossByKey(bossChallenge.dataset.bossChallenge); return; }
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
        const workshopTab = e.target.closest('[data-workshop-tab]');
        if (workshopTab) { this.workshopTab = workshopTab.dataset.workshopTab; this.renderMenuPanel('workshop'); return; }
        const jobTab = e.target.closest('[data-job-tab]');
        if (jobTab) { if (!this.jobUI) this.jobUI = { tab: 'job', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' }; this.jobUI.tab = jobTab.dataset.jobTab; this.jobUI.detailId = null; this.jobUI.modal = null; this.renderMenuPanel('job'); return; }
        const jobDetail = e.target.closest('[data-job-detail]');
        if (jobDetail) { if (!this.jobUI) this.jobUI = { tab: 'job', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' }; this.jobUI.detailId = jobDetail.dataset.jobDetail; this.jobUI.modal = null; this.renderMenuPanel('job'); return; }
        const jobBack = e.target.closest('[data-job-back]');
        if (jobBack) { if (this.jobUI) { this.jobUI.detailId = null; this.jobUI.modal = null; } this.renderMenuPanel('job'); return; }
        const jobSkillDetail = e.target.closest('[data-job-skill-detail]');
        if (jobSkillDetail) { if (!this.jobUI) this.jobUI = { tab: 'job', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' }; this.jobUI.modal = 'skillDetail'; this.jobUI.skillDetailId = jobSkillDetail.dataset.jobSkillDetail; this.renderMenuPanel('job'); return; }
        const openModal = e.target.closest('[data-open-modal]');
        if (openModal) { if (!this.jobUI) this.jobUI = { tab: 'job', detailId: null, modal: null, passiveSlotIdx: null, passiveFilter: 'all' }; const m = openModal.dataset.openModal; if (m === 'subCommand') { this.jobUI.modal = 'subCommand'; } else if (m === 'passive0') { this.jobUI.modal = 'passiveSelect'; this.jobUI.passiveSlotIdx = 0; } else if (m === 'passive1') { this.jobUI.modal = 'passiveSelect'; this.jobUI.passiveSlotIdx = 1; } this.renderMenuPanel('job'); return; }
        const setSubCmd = e.target.closest('[data-set-sub-command]');
        if (setSubCmd) { this.setSubCommand(setSubCmd.dataset.setSubCommand || null); return; }
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
        if (helpToggle) { const id = helpToggle.dataset.helpToggle; this.helpOpenId = this.helpOpenId === id ? null : id; this.audio.sfx('ui'); this.renderMenuPanel('system'); return; }
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
      $('#menu-panel').addEventListener('change', e => { const slider = e.target.closest('[data-volume]'); if (!slider) return; this.audio.setVolume(slider.dataset.volume, slider.value); const value = $(`[data-volume-value="${slider.dataset.volume}"]`); if (value) value.textContent = `${slider.value}%`; if (slider.dataset.volume === 'sfx') this.audio.sfx('ui'); });
      $('#game').hidden = true; $('#game').style.display = 'none'; $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#result').hidden = true; $('#result').style.display = 'none';
    }

    freshProfile() {
      const p = D.player; return { version: 11, selectedCharacter: null, playerCharacter: null, prologueCompleted: false, openingWatched: false, level: p.level, exp: p.exp, gold: p.gold, baseStats: clone(p.baseStats), currentVitals: { hp: p.baseStats.maxHp, mp: p.baseStats.maxMp }, equipment: clone(p.equipment), inventory: clone(p.inventory), musicScores: {}, bossDefeated: { zenacad: false, myrthi: false }, currentJob: 'mage', jobs: { warrior: { level: 1, exp: 0 }, mage: { level: 1, exp: 0 }, martialArtist: { level: 1, exp: 0 }, priest: { level: 1, exp: 0 }, arcaneMaestro: { level: 1, exp: 0 }, dualBlade: { level: 1, exp: 0 } }, learnedJobSkills: [], learnedCharacterSkills: ['blueNote'], activeSkills: ['blueNote', 'quickSlash'], subCommand: null, passiveSlots: [null, null], weaponEnchants: {}, armorEnchants: {}, bossRematchAt: {}, preferredWeaponType: null, unlockedJobs: ['mage'], initialJob: 'mage', jobGrowthGained: {}, jobRebirths: {}, jobMastered: [], growthFraction: {}, learnedPassives: [], equippedPassives: [null], ptActionSlots: [null, null], ptPassiveSlots: [null, null], weaponMastery: { sword: { level: 1, exp: 0 }, staff: { level: 1, exp: 0 }, martial: { level: 1, exp: 0 }, instrument: { level: 1, exp: 0 } }, learnedWeaponSkills: [], seenEnemies: [], playtest: { startedAt: Date.now(), playMs: 0, battles: 0, weaponUse: { sword: 0, staff: 0, martial: 0, instrument: 0 }, sparkLog: [], hpGrowthCount: 0, hpGrowthTotal: 0, mpGrowthCount: 0, mpGrowthTotal: 0 }, kazuSeenOnce: [], flags: { noelFirstEncounterCleared: false, preNoelBattleWins: 0, postNoelBattleWins: 0, zenakadoDefeated: false, zenakadoScoreClaimed: false, ramenBuffActive: false, normalBattleWins: 0, temporaryBossCompleted: false, openingWatched: false, prologueCompleted: false, dungeon2BattleWins: 0, dungeon2NewSeen: false, floorWins: {}, dungeon3BattleWins: 0, dungeon3NewSeen: false, lastBattleResult: null, consecutiveDefeats: 0 }, discoveredMaterials: [], unlockedRecipes: [], newlyUnlockedRecipes: [] };
    }
    loadProfile() {
      try {
        const saved = JSON.parse(localStorage.getItem(D.settings.saveKey)); if (!saved) return this.freshProfile();
        const base = this.freshProfile(), jobs = clone(base.jobs); Object.keys(jobs).forEach(id => jobs[id] = { ...jobs[id], ...(saved.jobs?.[id] || {}) }); const profile = { ...base, ...saved, baseStats: { ...base.baseStats, ...saved.baseStats }, currentVitals: { ...base.currentVitals, ...saved.currentVitals }, equipment: { ...base.equipment, ...saved.equipment }, inventory: { ...base.inventory, ...saved.inventory }, musicScores: { ...base.musicScores, ...saved.musicScores }, bossDefeated: { ...base.bossDefeated, ...saved.bossDefeated }, jobs, learnedJobSkills: Array.isArray(saved.learnedJobSkills) ? saved.learnedJobSkills : [], learnedCharacterSkills: Array.isArray(saved.learnedCharacterSkills) ? saved.learnedCharacterSkills : [], activeSkills: Array.isArray(saved.activeSkills) ? saved.activeSkills.slice(0, 4) : base.activeSkills, flags: { ...base.flags, ...saved.flags }, armorEnchants: { ...(saved.armorEnchants || {}) }, bossRematchAt: { ...(saved.bossRematchAt || {}) }, preferredWeaponType: saved.preferredWeaponType || null, unlockedJobs: Array.isArray(saved.unlockedJobs) ? saved.unlockedJobs : [saved.currentJob || 'mage'], initialJob: saved.initialJob || saved.currentJob || 'mage', jobGrowthGained: { ...(saved.jobGrowthGained || {}) }, jobRebirths: { ...(saved.jobRebirths || {}) }, jobMastered: Array.isArray(saved.jobMastered) ? saved.jobMastered : [], growthFraction: { ...(saved.growthFraction || {}) }, learnedPassives: Array.isArray(saved.learnedPassives) ? saved.learnedPassives : [], equippedPassives: Array.isArray(saved.equippedPassives) ? saved.equippedPassives : [null], ptActionSlots: Array.isArray(saved.ptActionSlots) ? saved.ptActionSlots : [null, null], ptPassiveSlots: Array.isArray(saved.ptPassiveSlots) ? saved.ptPassiveSlots : [null, null], weaponMastery: { sword: { level: 1, exp: 0 }, staff: { level: 1, exp: 0 }, martial: { level: 1, exp: 0 }, instrument: { level: 1, exp: 0 }, ...(saved.weaponMastery || {}) }, learnedWeaponSkills: Array.isArray(saved.learnedWeaponSkills) ? saved.learnedWeaponSkills : [], playtest: { startedAt: Date.now(), playMs: 0, battles: 0, weaponUse: { sword: 0, staff: 0, martial: 0, instrument: 0 }, sparkLog: [], hpGrowthCount: 0, hpGrowthTotal: 0, mpGrowthCount: 0, mpGrowthTotal: 0, ...(saved.playtest || {}) }, kazuSeenOnce: Array.isArray(saved.kazuSeenOnce) ? saved.kazuSeenOnce : [], discoveredMaterials: Array.isArray(saved.discoveredMaterials) ? saved.discoveredMaterials : [], unlockedRecipes: Array.isArray(saved.unlockedRecipes) ? saved.unlockedRecipes : [], newlyUnlockedRecipes: Array.isArray(saved.newlyUnlockedRecipes) ? saved.newlyUnlockedRecipes : [] };
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
        if (profile.bossDefeated.myrthi == null) profile.bossDefeated.myrthi = false;
        if (!Array.isArray(profile.passiveSlots)) profile.passiveSlots = [null, null];
        if (profile.subCommand === undefined) profile.subCommand = null;
        if (!Array.isArray(profile.kazuSeenOnce)) profile.kazuSeenOnce = [];
        if (profile.flags.consecutiveDefeats == null) profile.flags.consecutiveDefeats = 0;
        if (profile.flags.lastBattleResult === undefined) profile.flags.lastBattleResult = null;
        // 図鑑用：一度でも戦闘で出会った敵のID
        if (!Array.isArray(profile.seenEnemies)) profile.seenEnemies = [];
        profile.version = 12;
        return profile;
      } catch { return this.freshProfile(); }
    }
    saveProfile() { const pt = this.profile.playtest; if (pt) { const now = Date.now(); pt.playMs = (pt.playMs || 0) + Math.min(now - (this._lastSaveAt || now), 600000); this._lastSaveAt = now; } localStorage.setItem(D.settings.saveKey, JSON.stringify(this.profile)); }
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
    setCharacterList(list) { this.characterList = Array.isArray(list) ? list : []; this.applyThemeForCharacter(this.profile?.selectedCharacter); }
    // ══ ジョブ解放 / パッシブ ══════════════════════════════════
    unlockedJobIds() { return this.profile.unlockedJobs ||= [this.profile.currentJob || 'mage']; }
    isJobUnlocked(id) { return this.unlockedJobIds().includes(id); }
    unlockJob(id) { if (!D.jobs[id] || this.isJobUnlocked(id)) return false; this.unlockedJobIds().push(id); this.profile.jobs ||= {}; this.profile.jobs[id] ||= { level: 1, exp: 0 }; return true; }
    isPhantomThief(jobId = this.profile.currentJob) { return jobId === 'phantomThief'; }
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
      const rule = (D.weaponScaling || {})[weaponType] || (D.weaponScaling || {}).sword || { scaling: { str: 1 }, powerKey: 'attackPower' };
      let v = 0;
      for (const [stat, rate] of Object.entries(rule.scaling || {})) v += (s[stat] || 0) * rate;
      return v + (this.equipmentCombatStats(equipment)[rule.powerKey] || 0);
    }
    weaponDamageType(weaponType = this.equippedWeaponType()) { return ((D.weaponScaling || {})[weaponType] || {}).damageType || 'physical'; }
    // 命中率（隠しステータス）：器用さで上がり、敵の素早さで下がる
    hitChanceAgainst(enemy, stats = this.player?.stats || this.totalStats()) {
      const a = D.accuracy || { base: 0.9, dexRate: 0.006, enemySpdRate: 0.005, min: 0.55, max: 1 };
      const raw = a.base + (stats.dex || 0) * a.dexRate - (enemy?.stats?.spd || 0) * a.enemySpdRate;
      return clamp(raw, a.min, a.max);
    }
    // 楽器は魔奏士の証を入手するまで使用不可
    isWeaponTypeUnlocked(id) { const t = this.weaponTypeDef(id); if (!t?.unlockFlag) return true; return !!this.profile.flags[t.unlockFlag]; }
    unlockedWeaponTypes() { return this.weaponTypeList().filter(t => this.isWeaponTypeUnlocked(t.id)); }
    // 防御性能：物理=体力+防御力 / 魔法=精神+魔法防御力
    defensePowerFor(kind = 'physical', stats = null, equipment = this.profile.equipment) {
      const s = stats || this.player?.stats || this.totalStats(equipment);
      const rule = (D.defenseScaling || {})[kind] || { stat: 'vit', powerKey: 'defensePower' };
      return (s[rule.stat] || 0) + (this.equipmentCombatStats(equipment)[rule.powerKey] || 0);
    }
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
    applyPassiveStats(total) {
      for (const p of this.activePassives()) {
        const e = p.passiveEffect; if (!e) continue;
        if (e.type === 'statPercent') total[e.stat] = Math.round((total[e.stat] || 0) * (1 + e.rate));
        else if (e.type === 'multiStatPercent') Object.entries(e.stats || {}).forEach(([k, r]) => total[k] = Math.round((total[k] || 0) * (1 + r)));
        else if (e.type === 'criticalUp') total.critBonus = (total.critBonus || 0) + e.rate;
      }
      return total;
    }
    // 現在ジョブで習得済みのパッシブ（そのジョブの能力として常時有効）
    currentJobPassives() { const job = D.jobs[this.profile.currentJob]; if (!job) return []; const lv = this.profile.jobs?.[this.profile.currentJob]?.level || 1; return Object.entries(job.passiveUnlocks || {}).filter(([l]) => Number(l) <= lv).map(([, id]) => D.skills[id]).filter(Boolean); }
    // 他ジョブから持ち込んで装備中のパッシブ
    equippedPassiveList() { const slots = this.isPhantomThief() ? (this.profile.ptPassiveSlots || []) : (this.profile.equippedPassives || []); return slots.slice(0, this.passiveSlotCount()).map(id => D.skills[id]).filter(s => s?.type === 'PASSIVE'); }
    // 実際に効果を発揮する全パッシブ（現在ジョブ習得分＋装備分、重複除去）
    activePassives() { return [...new Map([...this.currentJobPassives(), ...this.equippedPassiveList()].map(s => [s.id, s])).values()]; }
    passiveEffectRate(type) { return this.activePassives().reduce((sum, p) => p.passiveEffect?.type === type ? sum + (p.passiveEffect.rate || 0) : sum, 0); }
    setEquippedPassive(idx, skillId) {
      const key = this.isPhantomThief() ? 'ptPassiveSlots' : 'equippedPassives';
      const max = this.passiveSlotCount();
      this.profile[key] ||= new Array(max).fill(null);
      while (this.profile[key].length < max) this.profile[key].push(null);
      if (skillId) this.profile[key] = this.profile[key].map(v => v === skillId ? null : v);
      this.profile[key][idx] = skillId || null;
      this.saveProfile(); this.audio.sfx('heal'); if (this.jobUI) this.jobUI.modal = null; this.renderMenuPanel('job');
    }
    // ジョブLvアップ時：基礎ステータスへ永久加算し、ジョブ別の獲得量も記録（将来の50%STEAL用）
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
    // 1面クリア報酬：魔装士の証＋残り初期3職と魔装士を解放
    grantStageOneReward() {
      if (this.profile.flags.magicKnightProofObtained) return null;
      this.profile.flags.magicKnightProofObtained = true;
      this.profile.inventory.magicKnightProof = (this.profile.inventory.magicKnightProof || 0) + 1;
      const newly = [];
      [...(D.startingJobIds || []), 'magicKnight'].forEach(id => { if (this.unlockJob(id)) newly.push(D.jobs[id]); });
      // 魔奏士の証：楽器の武器学を解放する
      this.profile.inventory.arcaneMaestroProof = (this.profile.inventory.arcaneMaestroProof || 0) + 1;
      this.profile.flags.instrumentUnlocked = true;
      this.saveProfile();
      return { keyItem: D.items.magicKnightProof, extraKeyItem: D.items.arcaneMaestroProof, jobs: newly, weaponType: this.weaponTypeDef('instrument') };
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
    // ミルティ初回撃破報酬：輪廻のアルカナ×1（周回では再取得しない）
    grantMyrthiFirstReward() {
      if (this.profile.flags.myrthiFirstClearRewardClaimed) return null;
      this.profile.flags.myrthiFirstClearRewardClaimed = true;
      this.profile.flags.rebirthUnlocked = true;
      this.profile.inventory.rebirthArcana = (this.profile.inventory.rebirthArcana || 0) + 1;
      this.saveProfile();
      return { item: D.items.rebirthArcana, count: 1 };
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
      return `<div class="stage-reward"><div class="sr-key"><small>SPECIAL ITEM GET</small><b>《${reward.item?.name}》 ×${reward.count}</b><span>${reward.item?.description || ''}</span></div><div class="sr-jobs"><small>REBIRTH UNLOCKED</small><div><mark>JOB Lv20から転生できるようになった</mark></div></div></div>`;
    }
    stageOneRewardHTML(reward) {
      if (!reward) return '';
      const jobs = (reward.jobs || []).map(j => `<mark>${j.name}</mark>`).join('');
      const extra = reward.extraKeyItem ? `<div class="sr-key"><small>KEY ITEM GET</small><b>《${reward.extraKeyItem.name}》</b><span>${reward.extraKeyItem.description || ''}</span></div>` : '';
      const wt = reward.weaponType ? `<div class="sr-jobs"><small>NEW WEAPON MASTERY</small><div><mark>${reward.weaponType.name}が扱えるようになった</mark></div></div>` : '';
      return `<div class="stage-reward"><div class="sr-key"><small>KEY ITEM GET</small><b>《${reward.keyItem?.name || '魔装士の証'}》</b><span>${reward.keyItem?.description || ''}</span></div>${extra}${jobs ? `<div class="sr-jobs"><small>NEW JOBS UNLOCKED</small><div>${jobs}</div></div>` : ''}${wt}</div>`;
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
    combatStatsSectionHTML(total = this.totalStats()) {
      const cs = this.equipmentCombatStats();
      const wType = this.equippedWeaponType(), wName = this.weaponTypeName(wType);
      const atk = Math.round(this.attackPowerFor(wType, total));
      const rule = (D.weaponScaling || {})[wType] || {};
      const scaleText = Object.entries(rule.scaling || {}).map(([k, v]) => `${statLabels[k] || k}×${Math.round(v * 100)}%`).join(' ＋ ');
      const rows = [
        ['攻撃力', cs.attackPower], ['防御力', cs.defensePower],
        ['魔法攻撃力', cs.magicAttackPower], ['魔法防御力', cs.magicDefensePower]
      ].map(([label, v]) => `<div class="cbt-row"><span>${label}</span><b>${v}</b></div>`).join('');
      return `<div class="st-section"><h3>戦闘能力</h3>
        <div class="cbt-grid">${rows}</div>
        <div class="cbt-total"><div><small>${wName}の攻撃性能</small><b>${atk}</b></div><em>${scaleText} ＋ 装備${rule.powerKey === 'magicAttackPower' ? '魔法攻撃力' : '攻撃力'}</em></div>
        <div class="cbt-def"><div><span>物理防御</span><b>${Math.round(this.defensePowerFor('physical', total))}</b><small>体力＋防御力</small></div><div><span>魔法防御</span><b>${Math.round(this.defensePowerFor('magical', total))}</b><small>精神＋魔法防御力</small></div></div>
      </div>`;
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
    jobLearnedActiveSkills(jobId) { const job = D.jobs[jobId]; if (!job) return []; const jlv = this.profile.jobs[jobId]?.level || 0; const list = Object.entries(job.skillUnlocks || {}).filter(([lv]) => Number(lv) <= jlv).map(([, id]) => D.skills[id]).filter(s => s && s.type !== 'PASSIVE'); const sig = D.skills[job.signatureSkillId]; if (sig && sig.type !== 'PASSIVE' && !list.some(s => s.id === sig.id)) list.unshift(sig); return list; }
    allLearnedPassives() { const ids = [...(this.profile.learnedJobSkills || []), ...(this.profile.learnedCharacterSkills || [])]; return [...new Set(ids)].map(id => D.skills[id]).filter(s => s?.type === 'PASSIVE'); }
    setSubCommand(jobId) { this.profile.subCommand = (jobId && jobId !== this.profile.currentJob) ? jobId : null; this.saveProfile(); this.audio.sfx('heal'); if (this.jobUI) this.jobUI.modal = null; this.renderMenuPanel('job'); }
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
      const total = clone(this.profile.baseStats), bonuses = this.equipmentBonuses(equipment), jobBonuses = this.activeJobBonuses(), jobGrowth = this.jobStatBonuses(); Object.entries(bonuses).forEach(([k, v]) => total[k] = (total[k] || 0) + v); Object.entries(jobBonuses).forEach(([k, v]) => total[k] = (total[k] || 0) + v); Object.entries(jobGrowth).forEach(([k, v]) => total[k] = (total[k] || 0) + v); const setEffects = this.activeSetEffects(equipment); if (setEffects.magPercent) total.mag = Math.max(total.mag + 1, Math.floor(total.mag * (1 + setEffects.magPercent / 100))); if (setEffects.critBonusFlat) total.critBonus = (total.critBonus || 0) + setEffects.critBonusFlat; if (this.profile.flags.ramenBuffActive) total.maxHp = Math.ceil(total.maxHp * 1.03); total.critBonus ||= 0; this.applyPassiveStats(total); total.def = total.vit; /* 旧互換：def は体力と同義。装備防御力は defensePowerFor() 側で加算する */ /* 強化は基礎能力ではなく装備自身の戦闘能力を伸ばす（equipmentCombatStats で加算） */ return total;
    }
    getDungeon(id = this.currentDungeonId) { return (D.dungeons || []).find(d => d.id === id) || (D.dungeons || [])[0]; }
    isDungeonUnlocked(id) { const d = this.getDungeon(id); if (!d) return false; if (!d.unlockCondition) return true; if (d.unlockCondition === 'dungeon1Clear') return this.isBossDefeated('zenacad'); if (d.unlockCondition === 'dungeon2Clear') return this.isBossDefeated('myrthi'); return false; }
    applyDungeonBackground() { const bg = this.getDungeon()?.background || 'assets/bg/dungeon-battle-01.png'; const bf = $('#battlefield'); bf.dataset.dungeon = this.currentDungeonId; bf.style.backgroundImage = `linear-gradient(#0207134a,#0208171f 58%,#02040b5c),url("${bg}")`; bf.style.backgroundSize = 'auto,cover'; bf.style.backgroundPosition = 'center,center bottom'; bf.style.backgroundRepeat = 'no-repeat,no-repeat'; }
    equippedWeapon() { return D.weapons[this.profile.equipment.rightHand] || D.weapons.mageStaff; }
    progressState() { const f = this.profile.flags, noelGoal = D.battleProgression?.noelEncounterWins || 3, zenakadoGoal = D.battleProgression?.zenakadoEncounterWins || 7; if (!f.noelFirstEncounterCleared) { const wins = Math.max(0, f.preNoelBattleWins || 0); return { phase: 'noel', wins, goal: noelGoal, ready: wins >= noelGoal, bossId: 'noelFirstEncounter', bossName: 'NOËL' }; } if (!f.zenakadoDefeated) { const wins = Math.max(0, f.postNoelBattleWins || 0); return { phase: 'zenakado', wins, goal: zenakadoGoal, ready: wins >= zenakadoGoal, bossId: 'zenakado', bossName: 'ZENAKADO' }; } return { phase: 'complete', wins: zenakadoGoal, goal: zenakadoGoal, ready: false, bossId: null, bossName: 'DUNGEON CLEAR' }; }

    startBattle() {
      this.battleMode = 'slime'; const hadRamenBuff = !!this.profile.flags.ramenBuffActive, stats = this.totalStats(), vitals = this.storedVitals(stats); if (hadRamenBuff) { this.profile.flags.ramenBuffActive = false; this.saveProfile(); } this.player = { stats, hp: D.settings.healOnBattleStart ? stats.maxHp : vitals.hp, mp: D.settings.healOnBattleStart ? stats.maxMp : vitals.mp, inventory: this.profile.inventory, buffs: {}, cooldowns: {} };
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
      this.turn = 1; this.locked = false; this.finished = false; this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [] }; $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual(); this.applyDungeonBackground();
      this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); const names = [...new Set(this.enemies.map(e => e.name))]; this.setLog(`${count}体の${names.join('と')}が現れた！`); this.flashTitle('ENCOUNTER', '怪異反応を検知'); this.showMainCommands();
    }
    startBossEncounter(forceBossId = null, forcePhase = null) {
      const progress = this.progressState();
      const bossId = forceBossId || progress.bossId, phase = forcePhase || progress.phase;
      if (!bossId || (!forceBossId && !progress.ready)) { this.showMenu('home'); return; }
      this.battleMode = phase; const hadRamenBuff = !!this.profile.flags.ramenBuffActive, stats = this.totalStats(), template = D.enemies[bossId]; if (!template) { this.showMenu('home'); return; } if (hadRamenBuff) { this.profile.flags.ramenBuffActive = false; this.saveProfile(); }
      const vitals = this.storedVitals(stats); this.player = { stats, hp: vitals.hp, mp: vitals.mp, inventory: this.profile.inventory, buffs: {}, cooldowns: {} };
      const bossStats = template.dynamicScale ? { maxHp: stats.maxHp * template.dynamicScale, atk: Math.max(stats.str, stats.mag) * template.dynamicScale, def: stats.def * template.dynamicScale, mag: stats.mag * template.dynamicScale, mnd: stats.mnd * template.dynamicScale, spd: stats.agi * template.dynamicScale } : { ...template.stats };
      this.enemies = [{ ...template, uid: `${template.id}-boss`, label: '', stats: bossStats, hp: bossStats.maxHp, alive: true }];
      this.turn = 1; this.locked = false; this.finished = false; this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [] }; $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual();
      this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); this.setLog(this.battleMode === 'noel' ? '忘却の最奥――永遠の裁定者ノエルが姿を現した……。' : '静寂のホールに、独奏卿ゼナカドの旋律が響く……！'); this.flashTitle('BOSS ENCOUNTER', (template.nameEn || template.name || progress.bossName).toUpperCase()); this.showMainCommands();
    }
    startMyrthiBoss() {
      this.battleMode = 'myrthi'; const hadRamenBuff = !!this.profile.flags.ramenBuffActive, stats = this.totalStats(), template = D.enemies.myrthi;
      if (hadRamenBuff) { this.profile.flags.ramenBuffActive = false; this.saveProfile(); }
      const vitals = this.storedVitals(stats); this.player = { stats, hp: vitals.hp, mp: vitals.mp, inventory: this.profile.inventory, buffs: {}, cooldowns: {} };
      const bossStats = { ...template.stats };
      const boss = { ...template, uid: 'myrthi-boss', label: '', stats: bossStats, hp: bossStats.maxHp, alive: true, beat: 0, accelerandoActivated: false };
      this.enemies = [boss];
      this.turn = 1; this.locked = false; this.finished = false; this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [] };
      $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual(); this.applyDungeonBackground();
      this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); this.setLog('沈黙の楽殿に、黒紅の旋風が舞い込む……！'); this.flashTitle('BOSS ENCOUNTER', 'MYRTHI'); this.showMainCommands();
    }
    async bossAttackMyrthi(enemy) {
      const el = document.getElementById(enemy.uid), ren = $('#ren');
      if (!enemy.accelerandoActivated && enemy.hp / enemy.stats.maxHp <= 0.30) {
        enemy.accelerandoActivated = true; enemy.stats.spd = Math.floor(enemy.stats.spd * 1.3); enemy.stats.atk = Math.floor(enemy.stats.atk * 1.15);
        this.flashTitle('ACCELERANDO', '《加速》'); this.setLog('いいね……もっと速くしよっか。'); await this.battleSleep(900);
      }
      if (enemy.beat >= 4) {
        enemy.beat = 0; this.flashTitle('DEADLY RHYTHM', '4HIT COMBO'); this.setLog(`ミルティのDEADLY RHYTHM！ 四連撃が迸る……！`);
        el.classList.add('enemy-attacking'); await this.battleSleep(300);
        const balance = D.combatBalance;
        for (let i = 0; i < 4; i++) {
          if (this.player.hp <= 0) break;
          ren.classList.add('hit');
          const defUpBuff = (this.player.buffs?.defUp && this.turn <= this.player.buffs.defUp.until) ? (1 + (this.player.buffs.defUp.rate || 0)) : 1;
          const raw = this.enemyRawDamage('physical', enemy.stats.atk, defUpBuff);
          const dmg = Math.max(1, Math.round(raw + roll(balance.enemyVariance.min, balance.enemyVariance.max)));
          this.player.hp = Math.max(0, this.player.hp - dmg); this.persistVitals(); this.audio.sfx('playerHit'); this.floating(ren, dmg, 'enemy-damage'); this.updateHUD(); await this.battleSleep(200); ren.classList.remove('hit');
        }
        el.classList.remove('enemy-attacking'); return;
      }
      let r = Math.random(), chosen = enemy.ai[enemy.ai.length - 1], acc = 0;
      for (const s of enemy.ai) { acc += s.weight; if (r < acc) { chosen = s; break; } }
      this.flashTitle(chosen.name, 'BOSS STRIKE'); this.audio.sfx('slash'); el.classList.add('enemy-attacking'); await this.battleSleep(400); ren.classList.add('hit');
      const balance = D.combatBalance, defUpBuff = (this.player.buffs?.defUp && this.turn <= this.player.buffs.defUp.until) ? (1 + (this.player.buffs.defUp.rate || 0)) : 1;
      const raw = this.enemyRawDamage('physical', enemy.stats.atk, defUpBuff);
      let damage = Math.max(1, Math.round(raw + roll(balance.enemyVariance.min, balance.enemyVariance.max)));
      if (enemy.accelerandoActivated && Math.random() < 0.22) { damage = Math.floor(damage * 1.5); this.flashTitle('BEAT CRIT', '乱打の一閃'); }
      enemy.beat++; this.audio.sfx('playerHit'); this.player.hp = Math.max(0, this.player.hp - damage); this.persistVitals(); this.floating(ren, damage, 'enemy-damage');
      this.setLog(`ミルティの${chosen.name}！ RENは${damage}ダメージを受けた！ 【BEAT ${enemy.beat}/4】`); this.updateHUD(); await this.battleSleep(450); el.classList.remove('enemy-attacking'); ren.classList.remove('hit');
    }
    isAdvancedJobUnlocked(jobId) {
      const job = D.jobs[jobId]; if (!job?.unlockCondition) return true;
      const cond = job.unlockCondition;
      if (cond.bossDefeated && !this.isBossDefeated(cond.bossDefeated)) return false;
      if (cond.jobLevels) { for (const [reqId, reqLv] of Object.entries(cond.jobLevels)) { if ((this.profile.jobs[reqId]?.level || 1) < reqLv) return false; } }
      return true;
    }
    checkAdvancedJobUnlocks() { const ids = ['arcaneMaestro', 'dualBlade']; ids.forEach(id => { if (this.isAdvancedJobUnlocked(id)) { const job = D.jobs[id]; if (job && !this.profile.jobs[id]) this.profile.jobs[id] = { level: 1, exp: 0 }; } }); }
    makeEnemy(id, index) {
      const t = D.enemies[id];
      return { ...t, uid: `enemy-${index}`, label: String.fromCharCode(65 + index), stats: { ...t.stats }, hp: t.stats.maxHp, alive: true };
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
    renderEnemies() { this.noteEnemiesSeen(); $('#enemies').classList.toggle('boss-party', this.battleMode !== 'slime'); $('#enemies').innerHTML = this.enemies.map((e, i) => e.kind === 'boss' ? `<button class="enemy boss-enemy fighter idle" id="${e.uid}" data-enemy="${i}" aria-label="${e.name}"><div class="enemy-hud boss-hud"><span>${e.name} // ${e.title}</span><div><i style="width:100%"></i></div><small>???? / ????</small></div><div class="slime-shadow boss-shadow"></div><div class="noel-sprite${e.spriteClass ? ' ' + e.spriteClass : ''}"${e.sprite ? ` style="background-image:url('${e.sprite}')"` : ''}></div></button>` : `<button class="enemy enemy-${e.id} fighter idle delay-${i}" id="${e.uid}" data-enemy="${i}" aria-label="${e.name}${e.label}"><div class="enemy-hud"><span>${e.name} ${e.label}</span><div><i style="width:100%"></i></div></div><div class="slime-shadow"></div><div class="slime"${e.sprite ? ` style="background-image:url('${e.sprite}')"` : ''}></div></button>`).join(''); }
    applyEquipmentVisual() {
      const w = this.equippedWeapon(), layer = $('#weapon-layer'); layer.className = `weapon-layer weapon-${w.weaponType} sprite-${w.weaponSprite}`; layer.dataset.weaponId = w.id; layer.dataset.weaponType = w.weaponType; layer.title = w.name; $('#weapon-name').textContent = `RIGHT HAND // ${w.name}`;
      if (w.battleSprite) layer.style.backgroundImage = `url("${w.battleSprite}")`; else layer.style.removeProperty('background-image');
    }
    applySetBattleVisual() { const ren = $('#ren'), active = this.equippedSeriesCount('zenacad') >= 6; ren.classList.toggle('zenacad-six-set', active); if (active) { ren.classList.add('set-intro'); setTimeout(() => ren.classList.remove('set-intro'), 1800); } }
    updateHUD() {
      const p = this.player, expNeed = this.expNeeded(); $('#player-hp').textContent = `${p.hp} / ${p.stats.maxHp}`; $('#player-mp').textContent = `${p.mp} / ${p.stats.maxMp}`; $('#player-hp-bar').style.width = `${100 * p.hp / p.stats.maxHp}%`; $('#player-mp-bar').style.width = `${100 * p.mp / p.stats.maxMp}%`; const expBar = $('#player-exp-bar'), mType = this.equippedWeaponType(), m = this.masteryOf(mType), mNeed = this.masteryExpNeeded(m.level), expPct = Math.min(100, 100 * m.exp / mNeed); if (expBar) { expBar.style.width = `${expPct}%`; $('#player-exp-label').textContent = `${expPct.toFixed(2)}%`; } const mName = $('#player-exp-name'); if (mName) mName.textContent = `${this.weaponTypeName(mType)} Lv.${m.level}`; const jid = this.profile.currentJob, jst = this.profile.jobs?.[jid] || {}, jlv = jst.level || 1, jneed = this.jobExpNeeded(jlv), jexp = jst.exp || 0, jpct = jneed ? Math.min(100, 100 * jexp / jneed) : 100, jexpBar = $('#player-jexp-bar'), jexpName = $('#player-jexp-name'); if (jexpName) jexpName.textContent = `${D.jobs[jid]?.name || 'JOB'} Lv.${jlv}`; if (jexpBar) { jexpBar.style.width = `${jpct}%`; $('#player-jexp-label').textContent = jneed ? `${jpct.toFixed(2)}%` : 'MASTER'; } const jobLabel = $('#player-job-label'); if (jobLabel) jobLabel.textContent = `${D.jobs[jid]?.name || ''} Lv.${jlv}`; $('#turn-label').textContent = `TURN ${String(this.turn).padStart(2, '0')}`;
      this.enemies.forEach(e => { const el = document.getElementById(e.uid); if (el) $('.enemy-hud i', el).style.width = `${100 * e.hp / e.stats.maxHp}%`; });
    }
    setLog(text) { $('#log').innerHTML = `<p>${text}</p>`; }
    flashTitle(main, sub = '') { const a = $('#announcer'); a.innerHTML = `<strong>${main}</strong><span>${sub}</span>`; a.classList.remove('show'); void a.offsetWidth; a.classList.add('show'); }
    battleSleep(ms) { return sleep(this.autoBattle ? Math.floor(ms / 1.5) : ms); }
    panel(html) { $('#command-panel').innerHTML = html; }
    button(label, sub, action, disabled = false) { return `<button data-action="${action}" ${disabled ? 'disabled' : ''}><i></i><strong>${label}</strong><span>${sub}</span></button>`; }
    bindActions(actions) { $('#command-panel').onclick = async e => { const b = e.target.closest('[data-action]'); if (b && !b.disabled && !this.locked) { await this.audio.unlock(); this.audio.sfx('ui'); actions[b.dataset.action]?.(); } }; }
    showMainCommands() {
      $('#phase-label').textContent = this.autoBattle ? 'AUTO' : 'COMMAND';
      const itemCount = (this.profile.inventory.potion || 0) + (this.profile.inventory.manaPotion || 0);
      const curJobId = this.profile.currentJob, mainCmd = this.jobCommand(curJobId);
      const subJobId = this.profile.subCommand, subCmd = subJobId ? this.jobCommand(subJobId) : null;
      const personal = this.personalSkills();
      const basic = this.basicAttackSkill(), wType = this.equippedWeaponType();
      const artsCmd = (D.weaponArtsCommand || {})[wType] || { name: '武器技', nameEn: 'WEAPON ARTS' };
      const arts = this.learnedWeaponSkills().filter(s => s.weaponType === wType);
      let html = this.button(basic.name, basic.nameEn || 'ATTACK', 'attack');
      if (arts.length) html += this.button(artsCmd.name, `${artsCmd.nameEn} ▶`, 'weaponArts');
      if (personal.length) html += this.button('固有技', 'PERSONAL ▶', 'personal');
      // ジョブ習得スキルが残っている場合のみジョブコマンドを出す（武器技とは別枠）
      const jobSkills = this.jobLearnedActiveSkills(curJobId).filter(s => s.id !== D.jobs[curJobId]?.signatureSkillId);
      if (jobSkills.length) html += this.button(mainCmd.cmd, `${mainCmd.cmdEn} ▶`, 'mainCmd');
      if (subCmd && this.jobLearnedActiveSkills(subJobId).length) html += this.button(subCmd.cmd, `${subCmd.cmdEn} ▶`, 'subCmd');
      html += this.button('アイテム', `ITEM ×${itemCount}`, 'item') + this.button('にげる', 'ESCAPE', 'escape');
      html += `<button class="auto-battle-btn${this.autoBattle ? ' active' : ''}" data-action="auto-toggle"><i></i><strong>${this.autoBattle ? 'AUTO ON' : 'AUTO OFF'}</strong><span>BATTLE MODE</span></button>`;
      this.panel(html);
      this.bindActions({ attack: () => this.chooseTarget(basic.id), weaponArts: () => this.showWeaponArts(), personal: () => this.showPersonalSkills(), mainCmd: () => this.showCommandSkills(curJobId), subCmd: () => subJobId && this.showCommandSkills(subJobId), item: () => this.showBattleItems(), escape: () => this.tryEscape(), 'auto-toggle': () => { this.autoBattle = !this.autoBattle; this.showMainCommands(); } });
      if (this.autoBattle && !this.locked) setTimeout(() => this.autoPickAction(), 700);
    }
    autoPickAction() { if (!this.autoBattle || this.locked || this.finished) return; const maxHp = this.player.stats.maxHp, maxMp = this.player.stats.maxMp, hpPct = this.player.hp / maxHp; if (hpPct < 0.4 && (this.profile.inventory.potion || 0) > 0) { this.useConsumable('potion'); return; } if (this.player.mp < maxMp * 0.2 && (this.profile.inventory.manaPotion || 0) > 0) { this.useConsumable('manaPotion'); return; } const aliveEnemies = this.enemies.filter(e => e.alive); const skills = this.availableSkills().filter(s => this.player.mp >= s.mp && this.cooldownRemaining(s) === 0); const weapon = this.equippedWeapon(); const atkScore = weapon?.power || 1; let best = { type: 'attack', score: atkScore }; for (const s of skills) { let score = 0; if (s.kind === 'support') { if (s.effect?.type === 'hpRecover') score = hpPct < 0.75 ? (1 - hpPct) * 200 : 0; else if (s.effect?.type === 'mpRecover') score = this.player.mp < maxMp * 0.5 ? 45 : 0; else if (s.effect?.type === 'regenerate') score = hpPct < 0.8 ? 35 : 0; } else if (s.kind === 'hybrid') { score = (s.strScale + s.magScale) * 12; } else { const multi = s.target === 'all' ? Math.min(aliveEnemies.length, 3) * 0.7 : 1; score = (s.power || 1) * (s.hits || 1) * multi; } if (score > best.score) best = { type: 'skill', skill: s, score }; } if (best.type === 'skill') { const s = best.skill; if (s.target === 'all' || s.target === 'self') { this.executeRound(s.id, -1); } else { this.executeRound(s.id, this.enemies.findIndex(e => e.alive)); } } else { this.executeRound('attack', this.enemies.findIndex(e => e.alive)); } }
    showBattleItems() { const hp = D.items.potion, mp = D.items.manaPotion; this.panel(this.button(hp.name, `HP +${hp.effect.hp} // ×${this.profile.inventory.potion || 0}`, 'potion', !(this.profile.inventory.potion > 0) || this.player.hp >= this.player.stats.maxHp) + this.button(mp.name, `MP +${mp.effect.mp} // ×${this.profile.inventory.manaPotion || 0}`, 'manaPotion', !(this.profile.inventory.manaPotion > 0) || this.player.mp >= this.player.stats.maxMp) + this.button('もどる', 'BACK', 'back')); this.bindActions({ potion: () => this.useConsumable('potion'), manaPotion: () => this.useConsumable('manaPotion'), back: () => this.showMainCommands() }); }
    availableSkills() { const skills = [...this.personalSkills(), ...this.jobLearnedActiveSkills(this.profile.currentJob)]; if (this.profile.subCommand) skills.push(...this.jobLearnedActiveSkills(this.profile.subCommand)); const grant = this.equippedWeapon()?.grantsSkillId; if (grant && D.skills[grant]) skills.push(D.skills[grant]); return [...new Map(skills.map(s => [s.id, s])).values()]; }
    cooldownRemaining(skill) { return Math.max(0, (this.player.cooldowns?.[skill.id] || 0) - this.turn); }
    showSkills() { this.showMainCommands(); }
    showWeaponArts() { const wt = this.equippedWeaponType(); const skills = this.learnedWeaponSkills().filter(s => s.weaponType === wt); this.panel(skills.map(s => this.button(s.name, s.mp ? `MP ${s.mp}` : (s.nameEn || 'ARTS'), s.id, this.player.mp < (s.mp || 0))).join('') + this.button('もどる', 'BACK', 'back')); const actions = { back: () => this.showMainCommands() }; skills.forEach(s => { actions[s.id] = () => { const sk = D.skills[s.id]; if (sk?.randomTarget || sk?.target === 'all' || sk?.target === 'self') this.executeRound(s.id, -1); else this.chooseTarget(s.id); }; }); this.bindActions(actions); }
    showPersonalSkills() { const skills = this.personalSkills(); this.panel(skills.map(s => { const cd = this.cooldownRemaining(s); return this.button(s.name, cd ? `CT ${cd}` : `MP ${s.mp}`, s.id, this.player.mp < s.mp || cd > 0); }).join('') + this.button('もどる', 'BACK', 'back')); const actions = { back: () => this.showMainCommands() }; skills.forEach(s => { actions[s.id] = () => { const sk = D.skills[s.id]; if (sk?.randomTarget || sk?.target === 'all' || sk?.target === 'self') this.executeRound(s.id, -1); else this.chooseTarget(s.id); }; }); this.bindActions(actions); }
    showCommandSkills(jobId) { const skills = this.jobLearnedActiveSkills(jobId).filter(s => s.id !== D.jobs[jobId]?.signatureSkillId); if (!skills.length) { this.setLog('このコマンドの習得済みスキルがありません。'); return; } this.panel(skills.map(s => { const cd = this.cooldownRemaining(s); return this.button(s.name, cd ? `CT ${cd}` : `MP ${s.mp}`, s.id, this.player.mp < s.mp || cd > 0); }).join('') + this.button('もどる', 'BACK', 'back')); const actions = { back: () => this.showMainCommands() }; skills.forEach(s => { actions[s.id] = () => { const sk = D.skills[s.id]; if (sk?.randomTarget || sk?.target === 'all' || sk?.target === 'self') this.executeRound(s.id, -1); else this.chooseTarget(s.id); }; }); this.bindActions(actions); }
    chooseTarget(skillId) { const skill = D.skills[skillId]; if (skill?.target === 'all' || skill?.target === 'self') { this.executeRound(skillId, -1); return; } $('#phase-label').textContent = 'SELECT TARGET'; this.setLog('攻撃する敵を選択'); this.enemies.forEach((e, i) => { const el = document.getElementById(e.uid); if (e.alive) { el.classList.add('targetable'); el.onclick = () => this.executeRound(skillId, i); } }); this.panel(this.button('もどる', 'BACK', 'back')); this.bindActions({ back: () => { this.clearTargets(); this.showMainCommands(); } }); }
    clearTargets() { this.enemies.forEach(e => { const el = document.getElementById(e.uid); if (el) { el.classList.remove('targetable'); el.onclick = null; } }); }

    async executeRound(skillId, targetIndex) {
      // randomTarget（ばくれつけん等）はターゲット選択を経ずに発動するため、
      // 対象存在チェックは全体攻撃と同じ「生存敵が1体でもいるか」で判定する。
      const skill = D.skills[skillId]; const aoe = skill?.target === 'all' || skill?.randomTarget, self = skill?.target === 'self';
      if (this.locked || !skill || this.cooldownRemaining(skill) > 0 || (!self && (aoe ? !this.enemies.some(e => e.alive) : !this.enemies[targetIndex]?.alive))) return;
      this.locked = true; this.clearTargets(); this.panel(''); $('#phase-label').textContent = 'ACTION'; await this.beginPlayerTurn(); const setEffects = this.activeSetEffects(), freeMp = skill.kind === 'magical' && skill.mp > 0 && Math.random() < (setEffects.freeMagicMpChance || 0); if (!freeMp) this.player.mp -= skill.mp; else this.flashTitle('MAESTRO', 'MP COST 0'); if (skill.cooldown) this.player.cooldowns[skill.id] = this.turn + skill.cooldown; this.persistVitals(); this.updateHUD();
      const actors = [{ type: 'player', speed: this.player.stats.agi + roll(0, 4) + (skill.speedBonus || 0), act: () => this.playerActionWithSpark(skill, targetIndex) }]; this.enemies.filter(e => e.alive).forEach(e => actors.push({ type: 'enemy', enemy: e, speed: e.stats.spd + roll(0, 4), act: () => this.enemyAttack(e) })); actors.sort((a, b) => b.speed - a.speed);
      for (const actor of actors) { if (this.finished || this.player.hp <= 0) break; if (actor.type === 'enemy' && !actor.enemy.alive) continue; await actor.act(); await this.battleSleep(300); if (!this.enemies.some(e => e.alive)) { await this.victory(); return; } }
      if (this.player.hp <= 0) { await this.defeat(); return; } this.endPlayerTurn(); this.turn++; this.locked = false; this.updateHUD(); this.showMainCommands();
    }
    effectivePlayerStat(key) { const base = this.player.stats[key] || 0; return key === 'mag' && (this.player.buffs?.blueEcho || 0) > 0 ? base * 1.10 : base; }
    async beginPlayerTurn() { if (this.characterHasSkill('blueEcho') && Math.random() < .20) { this.player.buffs.blueEcho = 2; this.flashTitle('BLUE ECHO', 'MAG +10% // 2 TURNS'); this.setLog('蒼の残響が魔力を高める！'); await this.battleSleep(260); } if ((this.player.buffs.regenerate || 0) > 0) { const heal = Math.max(1, Math.ceil(this.player.stats.maxHp * .08)), gained = Math.min(heal, this.player.stats.maxHp - this.player.hp); this.player.hp += gained; if (gained) { this.audio.sfx('heal'); this.floating($('#ren'), `+${gained}`, 'heal'); this.setLog(`リジェネレートでHPが${gained}回復！`); this.updateHUD(); await this.battleSleep(220); } } }
    endPlayerTurn() { if ((this.player.buffs.blueEcho || 0) > 0) this.player.buffs.blueEcho--; if ((this.player.buffs.regenerate || 0) > 0) this.player.buffs.regenerate--; if (this.player.buffs.defUp && this.turn > this.player.buffs.defUp.until) delete this.player.buffs.defUp; }
    damageFor(skill, enemy) {
      const s = this.player.stats, w = this.equippedWeapon(), balance = D.combatBalance;
      // ── 攻撃性能：装備武器の weaponType から D.weaponScaling で決まる ──
      //   剣 = 力×1.0 ／ 爪 = 力×0.5＋素早さ×0.5 ／ 杖 = 魔力×1.0  （＋装備の攻撃力）
      // 技側に weaponType があればそれを、無ければ装備武器の種別を使う。
      const wType = skill.weaponType || w.weaponType || 'sword';
      const isMagicSkill = skill.kind === 'magical' || skill.damageType === 'magical' || this.weaponDamageType(wType) === 'magical';
      const attackPower = this.attackPowerFor(wType, s);
      // 強化倍率はここには掛けない。attackPowerFor が読む装備側の攻撃力に既に反映済み。
      const power = (skill.power ?? skill.powerScale ?? 1);
      const defDown = this.turn <= (enemy.defDownUntil || 0) ? .15 : 0;
      const enemyDefStat = isMagicSkill ? (enemy.stats.mnd ?? enemy.stats.def) : enemy.stats.def;
      const effectiveDef = enemyDefStat * (1 - defDown) * (1 - (skill.ignoreDef || 0));
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
      // 魔装士《魔力装填》：次の物理攻撃へ魔力依存の追加ダメージ
      if (isPhysical && this.player.buffs?.magicCharge) value += this.effectivePlayerStat('mag') * (this.gb().magicChargeRate ?? 0.5);
      value += roll(balance.playerVariance.min, balance.playerVariance.max);
      const critExtra = (skill.criticalModifier || 0) + this.traitCriticalBonus() + this.equipmentEffectRate('criticalRateBonus');
      const critical = Math.random() < clamp(balance.critical.base + s.luk * balance.critical.luckRate + (s.critBonus || 0) + critExtra, balance.critical.base, balance.critical.max + (s.critBonus || 0) + critExtra);
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
    async playerAction(skill, targetIndex) { await this.playerAttack(skill, targetIndex); const setFx = this.activeSetEffects(); const repeatChance = setFx.magicRepeatChance || 0; if (skill.kind === 'magical' && this.enemies.some(e => e.alive) && Math.random() < repeatChance) { this.flashTitle('《独奏曲》', 'CADENZA // ENCORE'); this.setLog('ゼナカドの旋律が魔法を再演する！'); await this.battleSleep(360); await this.playerAttack(skill, targetIndex); } const physRepeatChance = setFx.physicalRepeatChance || 0; if (skill.kind === 'physical' && this.enemies.some(e => e.alive) && Math.random() < physRepeatChance) { this.flashTitle('DEADLY RHYTHM', 'MYRTHI // EXTRA BEAT'); this.setLog('鼓動が刻む追加連撃！'); await this.battleSleep(360); await this.playerAttack(skill, targetIndex); } }
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
        // 命中判定（隠しステータス）。外れたヒットはダメージ0で MISS 表示。
        if (Math.random() > this.hitChanceAgainst(target)) { misses++; this.floating(tEl, 'MISS', 'miss'); this.audio.sfx('quick'); await this.battleSleep(hits > 1 ? 170 : 320); continue; }
        tEl.classList.add('hit');
        const d = this.damageFor(skill, target); total += d.value; if (d.critical) criticals++;
        perHit[target.uid] = (perHit[target.uid] || 0) + d.value;
        target.hp = target.cannotDefeat ? Math.max(1, target.hp - d.value) : Math.max(0, target.hp - d.value);
        // 撃破した瞬間に見た目も倒す。ここで付けないと「HP0なのに敵が残る」状態になる。
        if (target.hp <= 0) { target.alive = false; tEl.classList.add('defeated'); }
        this.floating(tEl, d.value, d.critical ? 'critical' : 'damage'); this.audio.sfx(d.critical ? 'critical' : 'enemyHit'); this.updateHUD();
        await this.battleSleep(hits > 1 ? 190 : 420); tEl.classList.remove('hit');
      } if (misses && !total) { this.setLog(`${target.name}${target.label}に攻撃を外した！`); ren.classList.remove('attacking','casting'); return; }
      const hitNames = Object.keys(perHit).map(uid => { const e = this.enemies.find(x => x.uid === uid); return e ? `${e.name}${e.label}` : ''; }).filter(Boolean); const targetLabel = skill.randomTarget && hitNames.length > 1 ? hitNames.join('・') : `${target.name}${target.label}`; this.setLog(`${criticals ? `CRITICAL ×${criticals}! ` : ''}${targetLabel}に${total}ダメージ！${hits > 1 ? `（${hits}HIT）` : ''}`); if (skill.kind === 'physical' || skill.kind === 'weapon') { delete this.player.buffs.atkCharge; delete this.player.buffs.magicCharge; } ren.classList.remove('attacking', 'casting');
      if (skill.effect?.type === 'enemyDefDown' && target.hp > 0) { target.defDownUntil = this.turn + skill.effect.turns; this.setLog(`${target.name}${target.label}のDEFが15%低下！`); }
      if (skill.effect?.type === 'selfDefDown') { this.player.defDownUntil = this.turn + skill.effect.turns - 1; this.setLog('捨て身斬りの反動でRENのDEFが20%低下！'); }
      // このターンに攻撃した敵のうち、倒れたものをまとめて処理する（最終targetも含む）
      const defeated = [];
      for (const uid of Object.keys(perHit)) { const t = this.enemies.find(x => x.uid === uid); if (!t || t.hp > 0 || t.rolledDrops) continue; defeated.push(t); }
      for (const t of defeated) {
        t.alive = false; const tEl = document.getElementById(t.uid);
        this.audio.sfx('defeat'); tEl.classList.add('defeated');
        t.rolledDrops = this.rollDrops(t);
        t.rolledDrops.forEach(([id]) => { const item = D.items[id]; if (item) { this.floating(tEl, item.name, 'heal'); if (item.rarity === 'epic' || item.rarity === 'legendary') this.announceRareDrop(item); } });
        const earned = this.grantEnemyReward(t);
        this.setLog(`${t.name}${t.label}を撃破！ EXP+${earned.exp} GOLD+${earned.gold}`);
      }
      if (defeated.length) await this.battleSleep(600);
    }
    async applySelfSkill(skill) { this.flashTitle(skill.name, skill.nameEn || 'SELF SKILL'); const effect = skill.effect || {}, ren = $('#ren'); ren.classList.add('casting'); await this.battleSleep(260); if (effect.type === 'mpRecover') { const amount = Math.max(1, Math.ceil(this.player.stats.maxMp * effect.maxMpRate)), gained = Math.min(amount, this.player.stats.maxMp - this.player.mp); this.player.mp += gained; this.audio.sfx('heal'); this.floating(ren, `MP +${gained}`, 'heal'); this.setLog(`精神集中でMPが${gained}回復！`); } if (effect.type === 'hpRecover') { const baseHeal = effect.baseHeal ?? effect.base ?? 0, spiritScaling = effect.spiritScaling ?? effect.mndScale ?? 0; const amount = Math.max(1, Math.round((baseHeal + this.player.stats.mnd * spiritScaling) * (1 + this.passiveEffectRate('healUp') + this.equipmentEffectRate('healingPowerPercent')) * this.traitHealMult())), gained = Math.min(amount, this.player.stats.maxHp - this.player.hp); this.player.hp += gained; this.audio.sfx('heal'); this.floating(ren, `+${gained}`, 'heal'); this.setLog(`ヒールでHPが${gained}回復！`); } if (effect.type === 'regenerate') { this.player.buffs.regenerate = effect.turns + 1; this.audio.sfx('heal'); this.setLog('リジェネレート！ 3ターンの間、HPが回復する。'); } if (effect.type === 'selfMagicCharge') { this.player.buffs.magicCharge = true; this.audio.sfx('magic'); this.floating(ren, 'MAGIC CHARGE', 'heal'); this.setLog('魔力装填！ 次の物理攻撃に魔力が乗る。'); } if (effect.type === 'selfAtkCharge') { this.player.buffs.atkCharge = { rate: effect.rate }; this.audio.sfx('heal'); this.floating(ren, `ATK +`+Math.round(effect.rate*100)+`%`, 'heal'); this.setLog('ちからため！ 次の物理攻撃の威力が上がる。'); } if (effect.type === 'selfDefUp') { this.player.buffs.defUp = { rate: effect.rate, until: this.turn + effect.turns }; this.audio.sfx('heal'); this.floating(ren, `DEF +${Math.round(effect.rate * 100)}%`, 'heal'); this.setLog(`雄叫びでDEFが${Math.round(effect.rate * 100)}%上昇！ ${effect.turns}ターン持続。`); } this.persistVitals(); this.updateHUD(); await this.battleSleep(350); ren.classList.remove('casting'); }
    async playerAttackAll(skill) {
      const targets = this.enemies.filter(e => e.alive); if (!targets.length) return;
      this.setLog(`${skill.name}！`); this.flashTitle(skill.name, 'AREA MAGIC'); this.audio.sfx('magic');
      const ren = $('#ren'); ren.classList.add('casting');
      for (const target of targets) {
        const el = document.getElementById(target.uid); await this.magicProjectile(el);
        if (Math.random() > this.hitChanceAgainst(target)) { this.floating(el, 'MISS', 'miss'); await this.battleSleep(180); continue; }
        el.classList.add('hit');
        const d = this.damageFor(skill, target); target.hp = target.cannotDefeat ? Math.max(1, target.hp - d.value) : Math.max(0, target.hp - d.value);
        this.floating(el, d.value, d.critical ? 'critical' : 'damage'); this.audio.sfx(d.critical ? 'critical' : 'enemyHit'); this.updateHUD();
        await this.battleSleep(220); el.classList.remove('hit');
        if (target.hp <= 0) { target.alive = false; this.audio.sfx('defeat'); el.classList.add('defeated'); target.rolledDrops = this.rollDrops(target); target.rolledDrops.forEach(([id]) => { const item = D.items[id]; if (item) { this.floating(el, item.name, 'heal'); if (item.rarity === 'epic' || item.rarity === 'legendary') this.announceRareDrop(item); } }); this.grantEnemyReward(target); }
      }
      if (this.player.buffs?.atkCharge && skill.kind === 'physical') delete this.player.buffs.atkCharge;
      ren.classList.remove('casting'); const defeatedNames = targets.filter(t => !t.alive).map(t => `${t.name}${t.label}`);
      this.setLog(defeatedNames.length ? `${defeatedNames.join('、')}を撃破！` : `${skill.name}が敵全体を襲う！`); await this.battleSleep(400);
    }
    async magicProjectile(targetEl) { const field = $('#battlefield').getBoundingClientRect(), from = $('#weapon-layer').getBoundingClientRect(), to = targetEl.getBoundingClientRect(), orb = document.createElement('i'), sx = from.right - field.left, sy = from.top - field.top + from.height * .22, ex = to.left - field.left + to.width * .48, ey = to.top - field.top + to.height * .58; orb.className = 'magic-projectile'; orb.style.left = `${sx}px`; orb.style.top = `${sy}px`; orb.style.setProperty('--shot-x', `${ex - sx}px`); orb.style.setProperty('--shot-y', `${ey - sy}px`); $('#battlefield').appendChild(orb); await this.battleSleep(460); orb.remove(); }
    async enemyAttack(enemy) {
      if (enemy.kind === 'boss') { await this.bossAttack(enemy); return; }
      let r = Math.random(), chosen = enemy.ai[enemy.ai.length - 1], acc = 0;
      for (const s of enemy.ai) { acc += s.weight; if (r < acc) { chosen = s; break; } }
      const isMagic = chosen.kind === 'magic';
      this.setLog(`${enemy.name}${enemy.label}の${chosen.name}！`); if (isMagic) { this.flashTitle(chosen.name, 'SHADOW MAGIC'); this.audio.sfx('dark'); } const el = document.getElementById(enemy.uid), ren = $('#ren'); el.classList.add('enemy-attacking'); await this.battleSleep(300); ren.classList.add('hit');
      const balance = D.combatBalance, attackStat = isMagic ? enemy.stats.mag : enemy.stats.atk;
      const defMul = isMagic ? 1 : (this.turn <= (this.player.defDownUntil || 0) ? .8 : 1);
      const raw = this.enemyRawDamage(isMagic ? 'magical' : 'physical', attackStat, defMul), miss = Math.random() < clamp((this.player.stats.agi - enemy.stats.spd) * .008, .02, .16), damage = miss ? 0 : Math.max(1, Math.round(raw + roll(balance.enemyVariance.min, balance.enemyVariance.max)));
      if (miss) { this.floating(ren, 'MISS', 'miss'); this.setLog('RENは攻撃をかわした！'); } else { this.audio.sfx('playerHit'); this.player.hp = Math.max(0, this.player.hp - damage); this.persistVitals(); this.floating(ren, damage, 'enemy-damage'); this.setLog(`RENは${damage}ダメージを受けた！`); } this.updateHUD(); await this.battleSleep(420); el.classList.remove('enemy-attacking'); ren.classList.remove('hit');
    }
    async bossAttack(enemy) {
      if (enemy.id === 'myrthi') { await this.bossAttackMyrthi(enemy); return; }
      if (enemy.cannotDefeat) {
        const el = document.getElementById(enemy.uid), ren = $('#ren'); this.setLog(`${enemy.name}のエターナル・ジャッジメント！`); this.flashTitle('裁定の刻', 'ETERNAL JUDGEMENT'); this.audio.sfx('dark'); el.classList.add('enemy-attacking'); await this.battleSleep(520); ren.classList.add('hit'); const damage = Math.max(this.player.hp, Math.round(enemy.stats.mag * 1.5)); this.player.hp = 0; this.persistVitals(); this.audio.sfx('critical'); this.floating(ren, damage, 'enemy-damage'); this.setLog('圧倒的な裁定の前に、RENは膝をついた……'); this.updateHUD(); await this.battleSleep(650); el.classList.remove('enemy-attacking'); ren.classList.remove('hit'); return;
      }
      let r = Math.random(), chosen = enemy.ai[enemy.ai.length - 1], acc = 0;
      for (const s of enemy.ai) { acc += s.weight; if (r < acc) { chosen = s; break; } }
      const isMagic = chosen.kind === 'magic', el = document.getElementById(enemy.uid), ren = $('#ren');
      this.setLog(`${enemy.name}の${chosen.name}！`);
      if (isMagic) { this.flashTitle(chosen.name, 'BOSS MAGIC'); this.audio.sfx('dark'); } else { this.flashTitle(chosen.name, 'BOSS STRIKE'); this.audio.sfx('slash'); }
      el.classList.add('enemy-attacking'); await this.battleSleep(400); ren.classList.add('hit');
      const balance = D.combatBalance, formula = isMagic ? balance.enemyMagic : balance.enemyPhysical;
      const defUpBuff = (this.player.buffs?.defUp && this.turn <= this.player.buffs.defUp.until) ? (1 + (this.player.buffs.defUp.rate || 0)) : 1; const attackStat = isMagic ? enemy.stats.mag : enemy.stats.atk;
      const defMul = isMagic ? 1 : defUpBuff * (this.turn <= (this.player.defDownUntil || 0) ? .8 : 1);
      const raw = this.enemyRawDamage(isMagic ? 'magical' : 'physical', attackStat, defMul);
      let damage = Math.max(1, Math.round(raw + roll(balance.enemyVariance.min, balance.enemyVariance.max)));
      if (isMagic) damage = Math.max(1, Math.round(damage * (1 - this.passiveEffectRate('magicResist') - this.equipmentEffectRate('magicDamageReductionPercent'))));
      this.audio.sfx('playerHit'); this.player.hp = Math.max(0, this.player.hp - damage); this.persistVitals(); this.floating(ren, damage, 'enemy-damage'); this.setLog(`RENは${damage}ダメージを受けた！`); this.updateHUD(); await this.battleSleep(450); el.classList.remove('enemy-attacking'); ren.classList.remove('hit');
    }
    floating(el, value, type) { const r = el.getBoundingClientRect(), field = $('#battlefield').getBoundingClientRect(), f = document.createElement('b'); f.className = `float-number ${type}`; f.textContent = type === 'critical' ? `CRITICAL! ${value}` : value; f.style.left = `${r.left - field.left + r.width / 2}px`; f.style.top = `${r.top - field.top + r.height * .25}px`; $('#float-layer').appendChild(f); setTimeout(() => f.remove(), 1100); }
    announceRareDrop(item) { const layer = $('#rare-drop-layer'); if (!layer) return; this.audio.sfx('rareDrop'); const b = document.createElement('div'); b.className = `rare-drop-banner rarity-${item.rarity}`; b.innerHTML = `<small>${item.rarity === 'legendary' ? 'LEGENDARY DROP' : 'EPIC DROP'}</small><b>${item.name}</b>`; layer.appendChild(b); requestAnimationFrame(() => b.classList.add('show')); setTimeout(() => { b.classList.remove('show'); setTimeout(() => b.remove(), 420); }, 2400); }
    async useConsumable(id) { const item = D.items[id], amount = item?.effect?.hp || item?.effect?.mp || 0, key = item?.effect?.hp ? 'hp' : 'mp', maxKey = key === 'hp' ? 'maxHp' : 'maxMp'; if (!item || !(this.profile.inventory[id] > 0)) { this.setLog(`${item?.name || 'アイテム'}を持っていない。`); return; } if (this.player[key] >= this.player.stats[maxKey]) { this.setLog(`${key.toUpperCase()}は満タンだ。`); return; } this.locked = true; this.panel(''); await this.beginPlayerTurn(); const heal = Math.min(amount, this.player.stats[maxKey] - this.player[key]); this.profile.inventory[id]--; this.player[key] += heal; this.persistVitals(); this.audio.sfx('heal'); this.setLog(`${item.name}を使った。${key.toUpperCase()}が${heal}回復！`); this.floating($('#ren'), `+${heal}`, 'heal'); this.updateHUD(); await this.battleSleep(650); await this.enemyOnlyTurn(); }
    async tryEscape() { this.locked = true; this.panel(''); await this.beginPlayerTurn(); const live = this.enemies.filter(e => e.alive), avg = live.reduce((s, e) => s + e.stats.spd, 0) / live.length, chance = clamp(.45 + (this.player.stats.agi - avg) * .025, .35, .9); this.setLog('逃走経路を探している……'); await this.battleSleep(600); if (Math.random() < chance) { this.finished = true; this.persistVitals(); this.audio.stopMusic(350); this.audio.sfx('escape'); this.flashTitle('ESCAPED', '戦線を離脱'); await this.battleSleep(700); this.showResult('ESCAPED', '怪異との戦闘から離脱し、拠点へ帰還した。', 'RETURN TO HIDEOUT', this.battleSummaryHTML()); } else { this.setLog('逃げられない！'); await this.battleSleep(450); await this.enemyOnlyTurn(); } }
    async enemyOnlyTurn() { for (const e of this.enemies.filter(e => e.alive)) { await this.enemyAttack(e); if (this.player.hp <= 0) { await this.defeat(); return; } await this.battleSleep(300); } this.endPlayerTurn(); this.turn++; this.locked = false; this.updateHUD(); this.showMainCommands(); }

    grantEnemyReward(enemy) {
      const exp = enemy.exp || 0, gold = roll(enemy.gold?.min ?? 0, enemy.gold?.max ?? 0), drops = {};
      (enemy.rolledDrops || []).forEach(([id, n]) => { drops[id] = (drops[id] || 0) + n; });
      const levels = this.applyRewards({ exp, gold, drops });
      this.battleRewards.exp += exp; this.battleRewards.gold += gold;
      Object.entries(drops).forEach(([id, n]) => { this.battleRewards.drops[id] = (this.battleRewards.drops[id] || 0) + n; });
      this.battleRewards.levels.push(...levels); this.updateHUD();
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
      this.profile.exp += reward.exp; this.profile.gold += reward.gold; Object.entries(reward.drops).forEach(([id, n]) => this.profile.inventory[id] = (this.profile.inventory[id] || 0) + n); const levels = [];
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
    grantJobExp(amount) { const jobId = this.profile.currentJob, job = D.jobs[jobId], progress = this.profile.jobs[jobId], from = progress.level, learnedBefore = new Set(this.profile.learnedJobSkills || []); const gained = Math.floor(Math.max(0, amount) / 4); progress.exp += gained; while (progress.level < D.jobLevelCap) { const need = this.jobExpNeeded(progress.level); if (!need || progress.exp < need) break; progress.exp -= need; progress.level++; } if (progress.level >= D.jobLevelCap) { progress.exp = 0; this.markJobMastered(jobId); } const gainedLevels = progress.level - from; const statGain = gainedLevels > 0 ? this.applyJobLevelGrowth(jobId, gainedLevels) : null; const newPassives = gainedLevels > 0 ? this.grantJobPassives(jobId, progress.level) : []; this.syncSkillUnlocks(); this.checkAdvancedJobUnlocks(); const learned = (this.profile.learnedJobSkills || []).filter(id => !learnedBefore.has(id)); this.saveProfile(); return { jobId, jobName: job.name, jobNameEn: job.nameEn, exp: gained, from, to: progress.level, learned, statGain, newPassives }; }
    jobResultHTML(result) { if (!result) return ''; return `<div class="job-result"><small>JOB EXPERIENCE</small><strong>${result.jobName}</strong><span>JEXP <b>+${result.exp}</b></span>${result.to > result.from ? `<h3>JOB LEVEL UP!　Lv.${result.from} → Lv.${result.to}</h3>` : ''}${result.learned.length ? `<div>${result.learned.map(id => `<b>NEW SKILL　${D.skills[id].name}</b>`).join('')}</div>` : ''}</div>`; }
    rewardHTML(reward, levels) {
      const drops = Object.entries(reward.drops); let html = `<div class="reward-summary"><span>EXP <b>+${reward.exp}</b></span><span>GOLD <b>+${reward.gold}</b></span></div>`;
      html += `<div class="drop-list"><h3>DROPS</h3>${drops.length ? drops.map(([id,n]) => { const i=D.items[id]; return `<p class="rarity-${i.rarity}">${i.name}<b>×${n}</b></p>`; }).join('') : '<p>ドロップなし</p>'}</div>`;
      levels.forEach(l => { const keys = ['maxHp','maxMp','mag','mnd','str','vit']; html += `<div class="level-up"><h3>LEVEL UP!</h3><strong>LV ${l.from} → ${l.to}</strong><div>${keys.map(k => `<span>${statLabels[k]} <b>${l.before[k]} → ${l.after[k]}</b></span>`).join('')}</div></div>`; }); return html;
    }
    scoreGetHTML(id) { const score = D.musicScores?.[id]; return score ? `<div class="score-get"><small>SCORE GET</small><strong>${score.title}</strong><b>（${score.subtitle}）</b><span>演奏可能になった</span><em>PRIVATE MODE ITEM</em></div>` : ''; }
    async victory() {
      this.profile.flags.consecutiveDefeats = 0; this.profile.flags.lastBattleResult = 'victory';
      this.finished = true; this.audio.stopMusic(650); this.audio.sfx('victory'); this.flashTitle('VICTORY', 'ALL SHADOWS ELIMINATED'); $('#ren').classList.add('victory'); await this.battleSleep(1100);
      const reward = { exp: this.battleRewards.exp, gold: this.battleRewards.gold, drops: this.battleRewards.drops }, levels = this.battleRewards.levels, jobResult = this.grantJobExp(this.battleRewards.exp);
      const newRecipeHTML = (this.battleRewards.newRecipes || []).map(rid => { const r = D.recipes[rid], item = D.items[r?.resultItemId]; return r && item ? `<div class="new-recipe-unlock"><small>NEW RECIPE</small><b>${item.name}</b><span>${item.nameEn || ''}</span><em>工房で製作可能になった</em></div>` : ''; }).join('');
      // 武器学EXP・HP/MP成長は戦闘終了時に判定する（装備中カテゴリのみ加算）
      const masteryResult = this.grantWeaponExp(this.battleRewards.exp);
      const vitalResult = this.rollVitalGrowth();
      const pt = this.profile.playtest; if (pt) { pt.battles = (pt.battles || 0) + 1; if (masteryResult) pt.weaponUse[masteryResult.type] = (pt.weaponUse[masteryResult.type] || 0) + 1; }
      const sparks = this.battleSparks || []; this.battleSparks = [];
      this.saveProfile(); this.persistVitals(); this.updateHUD();
      const rewardBlock = `${this.rewardHTML(reward, levels)}${this.growthResultHTML(masteryResult, vitalResult, sparks)}${this.jobResultHTML(jobResult)}${newRecipeHTML}`;
      if (this.battleMode === 'slime') { if (this.floorsOf(this.currentDungeonId)) this.recordFloorWin(this.currentFloorId); if (this.currentDungeonId === 'dungeon3') { this.profile.flags.dungeon3BattleWins = (this.profile.flags.dungeon3BattleWins || 0) + 1; } else if (this.currentDungeonId === 'dungeon2') { this.profile.flags.dungeon2BattleWins = (this.profile.flags.dungeon2BattleWins || 0) + 1; } else { if (this.profile.flags.noelFirstEncounterCleared) this.profile.flags.postNoelBattleWins = (this.profile.flags.postNoelBattleWins || 0) + 1; else this.profile.flags.preNoelBattleWins = (this.profile.flags.preNoelBattleWins || 0) + 1; this.profile.flags.normalBattleWins = (this.profile.flags.normalBattleWins || 0) + 1; } this.saveProfile(); }
      if (this.battleMode === 'zenakado') { const firstClear = !this.isBossDefeated('zenacad'), firstScore = !this.profile.flags.zenakadoScoreClaimed; this.markBossDefeated('zenacad'); this.profile.flags.zenakadoDefeated = false; this.profile.flags.postNoelBattleWins = 0; this.profile.flags.temporaryBossCompleted = true; this.noteBossRematchSnapshot('zenakado'); const stageOne = this.grantStageOneReward(); if (firstScore) { this.profile.musicScores.cadenzaLoot = true; this.profile.flags.zenakadoScoreClaimed = true; } this.saveProfile(); const stolen = firstClear ? '<div class="boss-recipe-unlock"><small>PHANTOM STEAL</small><b>NEW RECIPES STOLEN</b><strong>《ZENACAD SERIES》</strong><span>工房に BOSS EQUIPMENT と JOB SYSTEM が追加された！</span></div>' : ''; this.showResult('VICTORY', '独奏卿ゼナカドを打ち倒し、禁断の楽譜と装備製法を盗み出した！', 'BOSS CLEARED', `${rewardBlock}${firstScore ? this.scoreGetHTML('cadenzaLoot') : ''}${this.stageOneRewardHTML(stageOne)}${stolen}`); return; }
      if (this.battleMode === 'myrthi') { const myrthiReward = this.grantMyrthiFirstReward(); this.markBossDefeated('myrthi'); this.profile.flags.dungeon2BattleWins = (this.profile.flags.dungeon2BattleWins || 0) + 1; this.profile.flags.dungeon2Clear = true; this.noteBossRematchSnapshot('myrthi'); this.saveProfile(); this.showResult('VICTORY', '黒紅の双刃戦姫ミルティを打ち倒した！ ミルティシリーズの製法を奪い取った！', 'BOSS CLEARED', `${rewardBlock}${this.specialItemHTML(myrthiReward)}<div class="boss-recipe-unlock"><small>PHANTOM STEAL</small><b>NEW RECIPES STOLEN</b><strong>《MYRTHI SERIES》</strong><span>工房にMYRTHI SERIESが追加された！</span></div>`); return; }
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
      if (name === 'food') { const active = !!this.profile.flags.ramenBuffActive, stats = this.totalStats(), vitals = this.storedVitals(stats), full = vitals.hp >= stats.maxHp && vitals.mp >= stats.maxMp, price = Math.floor(this.profile.gold * .3), canEat = !active || !full, coming = (D.foodMenu?.comingSoon || []).map(item => `<article class="food-coming-card" aria-disabled="true"><i aria-hidden="true"></i><b>${item.name}</b><span>COMING SOON</span></article>`).join(''); panel.innerHTML = `<small>KAZU'S SPECIAL</small><h2>カズのまかない</h2><div class="food-panel"><div class="food-bowl" aria-hidden="true"></div><div class="food-copy"><strong>店主特製・怪盗まかない</strong><span>HP・MPを全回復。次のダンジョン1回だけ最大HPが3%上昇します。</span><em>料金：所持GOLDの30％　<b>${price.toLocaleString('ja-JP')} GOLD</b></em><button class="eat-food" data-eat-food ${canEat ? '' : 'disabled'}>${canEat ? 'まかないを食べる' : '全回復・効果発動中'}</button></div></div><section class="food-coming"><header><b>NEXT MENU</b><span>COMING SOON</span></header><div>${coming}</div></section>`; }
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
      const hdr = `<div class="job-hdr"><div class="job-hdr-l"><small>JOB & ABILITY</small><b>雨宮 蓮</b><span>Character Lv.${this.profile.level}</span></div><div class="job-hdr-r"><small>CURRENT JOB</small><strong>${curJob.name}</strong></div></div>`;
      let body;
      if (ui.tab === 'job') { body = ui.detailId ? this.jobDetailHtml(ui.detailId, unlocked, currentId) : this.jobListHtml(unlocked, currentId); }
      else { body = this.abilitySetHtml(currentId); }
      let modal = '';
      if (ui.modal === 'skillDetail') modal = this.skillModalHtml(ui.skillDetailId);
      else if (ui.modal === 'subCommand') modal = this.subCmdModalHtml(currentId);
      else if (ui.modal === 'passiveSelect') modal = this.passiveModalHtml(ui.passiveSlotIdx);
      panel.innerHTML = `<div class="jpanel">${hdr}${tabBar}<div class="jpanel-body">${body}</div></div>${modal}`;
    }
    jobListHtml(unlocked, currentId) {
      const adv = ['arcaneMaestro', 'dualBlade'], base = [...(D.startingJobIds || []), 'magicKnight'], special = ['phantomThief'];
      // 解放判定は profile.unlockedJobs が唯一の情報源。初期ジョブを固定しない。
      const card = id => { const j = D.jobs[id]; if (!j) return ''; const p = this.profile.jobs[id] || { level: 1 }, isAdv = adv.includes(id), avail = isAdv ? this.isAdvancedJobUnlocked(id) : this.isJobUnlocked(id), isCur = id === currentId; return `<button class="jcard${isCur ? ' cur' : ''}${avail ? '' : ' locked'}" data-job-detail="${id}"><div class="jcard-name">${j.name}</div><div class="jcard-lv">${avail ? `Lv.${p.level}` : 'LOCKED'}</div>${isCur ? '<em class="jcard-cur">●</em>' : ''}</button>`; };
      const notice = this.isJobUnlocked('magicKnight') ? '' : '<p class="job-lock-notice">1面クリアで《魔装士の証》を入手すると、残りの基本JOBと魔装士が解放されます。</p>';
      return `${notice}<section class="jsec"><h4>基本JOB</h4><div class="jgrid">${base.map(card).join('')}</div></section><section class="jsec"><h4>特殊JOB</h4><div class="jgrid">${special.map(card).join('')}</div></section><section class="jsec"><h4>上位JOB</h4><div class="jgrid">${adv.map(card).join('')}</div></section>`;
    }
    jobDetailHtml(jobId, unlocked, currentId) {
      const j = D.jobs[jobId], p = this.profile.jobs[jobId], isAdv = ['arcaneMaestro', 'dualBlade'].includes(jobId), avail = isAdv ? this.isAdvancedJobUnlocked(jobId) : unlocked || jobId === 'mage', isCur = jobId === currentId, need = this.jobExpNeeded(p.level), bar = need ? Math.round(100 * p.exp / need) : 100;
      const bonuses = this.activeJobBonuses(jobId), bHtml = Object.entries(bonuses).length ? Object.entries(bonuses).map(([k, v]) => `<div class="jbn-item"><span>${statLabels[k] || k}</span><b>${k === 'critBonus' ? `+${Math.round(v * 100)}%` : `+${v}`}</b></div>`).join('') : '<span class="jbn-none">なし</span>';
      const skillRows = Object.entries(j.skillUnlocks || {}).sort(([a], [b]) => +a - +b).map(([lv, id]) => { const s = D.skills[id], learned = p.level >= +lv; return `<button class="jar${learned ? ' learned' : ' locked'}"${learned ? ` data-job-skill-detail="${id}"` : ''}><span class="jar-lv">Lv.${lv}</span><span class="jar-nm">${s?.name || id}</span><em class="jar-type">${s?.type === 'PASSIVE' ? 'P' : 'A'}</em><small class="jar-st">${learned ? '習得済' : 'LOCK'}</small></button>`; }).join('');
      let condHtml = '';
      if (isAdv && !avail && j.unlockCondition) { const c = j.unlockCondition, bOk = c.bossDefeated ? this.isBossDefeated(c.bossDefeated) : true, bName = c.bossDefeated ? (D.enemies[c.bossDefeated]?.name || c.bossDefeated) : ''; const jcs = Object.entries(c.jobLevels || {}).map(([rid, rlv]) => { const cur = this.profile.jobs[rid]?.level || 0, ok = cur >= rlv; return `<div class="cond-row${ok ? ' ok' : ' ng'}"><b>${ok ? '✓' : '✕'} ${D.jobs[rid]?.name || rid} Lv${rlv}</b><small>現在 Lv.${cur}</small></div>`; }).join(''); condHtml = `<div class="jconds"><h4>解放条件</h4>${bName ? `<div class="cond-row${bOk ? ' ok' : ' ng'}"><b>${bOk ? '✓' : '✕'} ${bName}を撃破</b></div>` : ''}${jcs}</div>`; }
      // JOB補正は「このJOBで育てた成長」を出す。旧テーブル方式のJOBは従来どおり。
      const grown = (this.profile.jobGrowthGained || {})[jobId] || {};
      const gHtml = Object.entries(grown).filter(([, v]) => v).map(([k, v]) => `<div class="jbn-item"><span>${statLabels[k] || k}</span><b>+${v}</b></div>`).join('');
      const bonusGrid = gHtml || bHtml;
      return `<div class="jdetail"><button class="jback-btn" data-job-back>← JOB一覧</button><div class="jdetail-hdr"><div><b>${j.name}</b></div><em class="jdetail-badge">${isCur ? '現在' : avail ? `Lv.${p.level}` : 'LOCKED'}</em></div>${avail ? `<div class="jexp-wrap"><div class="jlv-row"><b>JOB Lv.${p.level}</b><span>JEXP ${need ? `${p.exp} / ${need}` : 'MASTER'}</span></div><div class="jexp-bar"><i style="width:${bar}%"></i></div></div><div class="jbonus"><h4>このJOBで育てた能力</h4><div class="jbn-grid">${bonusGrid}</div><p class="jbn-note">${this.isPhantomThief() ? 'PHANTOM THIEF は全JOBの成長を半分引き継ぎます。' : 'この成長は、このJOBに就いている間だけ乗ります。'}</p></div>${isCur ? '<div class="jcur-badge">現在のJOB</div>' : `<button class="jchange-btn" data-job-change="${jobId}">このJOBに変更</button>`}${this.rebirthSectionHTML(jobId)}<div class="jskills"><h4>アビリティ</h4><div class="jar-list">${skillRows}</div></div>` : `<p class="jlocked-note">${j.description}</p>${condHtml}`}</div>`;
    }
    abilitySetHtml(currentId) {
      const mainCmd = this.jobCommand(currentId), subId = this.profile.subCommand, subCmd = subId ? this.jobCommand(subId) : null, subJob = subId ? D.jobs[subId] : null;
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
      // SUB COMMAND は既存ロジックを維持（PHANTOM THIEF用に将来再利用）
      const subHtml = isPT ? `<div class="abset-block"><button class="ab-row ab-btn" data-open-modal="subCommand"><div class="ab-lbl"><small>SUB COMMAND</small><span>他JOBの技を装備</span></div><div class="ab-val${subCmd ? ' filled' : ''}"><div>${subCmd ? `<b>${subCmd.cmd}</b><small>${subJob?.name} Lv.${this.profile.jobs[subId]?.level || 1}</small>` : '<b>────</b><small>未設定</small>'}</div><em>▶</em></div></button></div>` : '';
      return `<div class="abset">${sigHtml}<div class="abset-block"><h4 class="abset-h">JOB PASSIVE <span>Lv.${levels.join(' / Lv.')} で習得</span></h4><div class="per-list">${jobPassiveRows}</div></div>${actionHtml}<div class="abset-block"><h4 class="abset-h">EQUIP PASSIVE <span>${slotCount}枠</span></h4>${equipRows}</div>${subHtml}</div>`;
    }
    subCmdModalHtml(currentId) {
      const avail = Object.values(D.jobs).filter(j => { if (j.id === currentId) return false; const isAdv = ['arcaneMaestro', 'dualBlade'].includes(j.id); return isAdv ? this.isAdvancedJobUnlocked(j.id) : this.jobSystemUnlocked() || j.id === 'mage'; });
      const rows = avail.map(j => { const cmd = this.jobCommand(j.id), p = this.profile.jobs[j.id], hasSkills = this.jobLearnedActiveSkills(j.id).length > 0, sel = this.profile.subCommand === j.id; return `<button class="modal-row${sel ? ' sel' : ''}" data-set-sub-command="${j.id}"><div><b>${cmd.cmd}</b><small>${j.name} Lv.${p.level}${!hasSkills ? ' ── 習得技なし' : ''}</small></div><em>${sel ? '✓' : ''}</em></button>`; }).join('');
      const clear = this.profile.subCommand ? `<button class="modal-row modal-clear" data-set-sub-command="">SUB COMMANDを外す</button>` : '';
      return `<div class="jmodal-bg" data-close-modal><div class="jmodal"><div class="jmodal-hdr"><b>SUB COMMAND</b><button data-close-modal class="jmodal-close">✕</button></div><div class="jmodal-body">${rows}${clear}</div></div></div>`;
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
      panel.innerHTML = `<button class="panel-home" data-menu="home">拠点へ戻る</button><small>DUNGEON SELECT</small><h2>ダンジョン選択</h2><div class="dungeon-select-list">${available.map(d => {
        const isNew = (d.id === 'dungeon2' && showNewD2) || (d.id === 'dungeon3' && showNewD3);
        const progress = d.id === 'dungeon1' ? (() => { const p = this.progressState(); return p.phase === 'complete' ? 'AREA BOSS CLEARED' : `BATTLE ${Math.min(p.wins, p.goal)} / ${p.goal}`; })() : d.id === 'dungeon2' ? (this.isBossDefeated('myrthi') ? 'AREA BOSS CLEARED' : (() => { const p = this.dungeon2FloorProgress(); return p.total ? `FLOOR ${p.floors} / ${p.total}　BATTLE ${p.done} / ${p.goal}` : `BATTLE ${p.done} / ${p.goal}`; })()) : `BATTLE ${Math.min(this.profile.flags.dungeon3BattleWins || 0, 15)} / 15`;
        const boss = this.dungeonBossEntry(d.id);
        let bossCard = '';
        if (boss) {
          const rm = boss.rematch, locked = boss.cleared && rm && !rm.ready;
          const cls = !boss.cleared ? 'boss-ready' : locked ? 'boss-locked' : 'boss-rematch';
          const status = !boss.cleared ? '挑戦可能' : locked ? `再戦まで ${d.name}を あと ${rm.need - rm.done} 回` : '撃破済み — 再戦できます';
          const tag = !boss.cleared ? 'CHALLENGE' : locked ? `${rm.done} / ${rm.need}` : 'REMATCH';
          const tagCls = !boss.cleared ? 'boss-tag-new' : locked ? 'boss-tag-locked' : 'boss-tag-rematch';
          const bar = locked ? `<i class="boss-rematch-bar"><em style="width:${100 * rm.done / rm.need}%"></em></i>` : '';
          bossCard = `<button class="dungeon-card boss-card ${cls}" data-boss-challenge="${boss.key}" ${locked ? 'disabled' : ''}><div class="dungeon-thumb boss-thumb" style="background-image:url('${boss.sprite || d.thumbnail}')"></div><div class="dungeon-info"><small>BOSS // ${boss.enName}</small><strong>${boss.name}</strong><span>${boss.title || ''}</span><b class="dungeon-progress">${status}</b>${bar}<mark class="${tagCls}">${tag}</mark></div></button>`;
        }
        // 階層があるダンジョンは直接潜入せず、まず階層選択ページへ進む。
        const action = (d.floors || []).length ? `data-open-floors="${d.id}"` : `data-enter-dungeon="${d.id}"`;
        return `<button class="dungeon-card" ${action}><div class="dungeon-thumb" style="background-image:url('${d.thumbnail}')"></div><div class="dungeon-info"><small>${d.nameEn || d.enName || d.name}</small><strong>${d.name}</strong><span>${d.description || ''}</span><em>推奨 Lv.${d.recommendedLevel}+</em><b class="dungeon-progress">${progress}</b>${isNew ? '<mark class="dungeon-new">NEW</mark>' : ''}</div></button>${bossCard}`;
      }).join('')}</div>`;
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
    rematchCounter(key) { if (key === 'myrthi') return this.profile.flags.dungeon2BattleWins || 0; if (key === 'zenakado') return this.profile.flags.postNoelBattleWins || 0; return 0; }
    rematchProgress(key) { const need = D.settings?.bossRematchWins ?? 5, snap = this.profile.bossRematchAt?.[key] ?? 0, done = Math.max(0, this.rematchCounter(key) - snap); return { done: Math.min(done, need), need, ready: done >= need }; }
    noteBossRematchSnapshot(key) { this.profile.bossRematchAt ||= {}; this.profile.bossRematchAt[key] = this.rematchCounter(key); }
    dungeonBossEntry(dungeonId) {
      const make = (key, enemyId, fallbackName, enName, fallbackTitle, cleared) => { const e = D.enemies[enemyId], rm = cleared ? this.rematchProgress(key) : null; return { key, name: e?.name || fallbackName, enName, title: e?.title || fallbackTitle, sprite: e?.sprite, cleared, rematch: rm }; };
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
    startBossByKey(key) {
      const defeatedId = key === 'zenakado' ? 'zenacad' : key;
      if (this.isBossDefeated(defeatedId) && !this.rematchProgress(key).ready) return;
      if (key === 'myrthi') { this.currentDungeonId = 'dungeon2'; this.startMyrthiBoss(); return; }
      if (key === 'zenakado') { this.currentDungeonId = 'dungeon1'; this.startBossEncounter('zenakado', 'zenakado'); return; }
      this.startBossEncounter();
    }
    changeJob(id) {
      const isAdv = ['arcaneMaestro', 'dualBlade'].includes(id);
      if (!D.jobs[id] || id === this.profile.currentJob) return;
      if (isAdv && !this.isAdvancedJobUnlocked(id)) return;
      if (!isAdv && !this.isJobUnlocked(id)) return; const before = this.totalStats(), vitals = this.storedVitals(before); this.profile.currentJob = id; const after = this.totalStats(); this.profile.currentVitals = { hp: Math.min(vitals.hp, after.maxHp), mp: Math.min(vitals.mp, after.maxMp) }; if (this.player) { this.player.stats = after; this.player.hp = Math.min(this.player.hp, after.maxHp); this.player.mp = Math.min(this.player.mp, after.maxMp); } this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('job');
    }
    toggleActiveSkill(id) {
      const learned = new Set(this.learnedActiveSkillIds()); if (!learned.has(id)) return; const active = [...(this.profile.activeSkills || [])], index = active.indexOf(id); if (index >= 0) active.splice(index, 1); else { if (active.length >= 4) return; active.push(id); } this.profile.activeSkills = active; this.saveProfile(); this.audio.sfx('ui'); this.renderMenuPanel('job');
    }
    eatFood() { const before = this.totalStats(), vitals = this.storedVitals(before), active = !!this.profile.flags.ramenBuffActive, full = vitals.hp >= before.maxHp && vitals.mp >= before.maxMp; if (active && full) return; const price = Math.floor(this.profile.gold * .3); this.profile.gold = Math.max(0, this.profile.gold - price); this.profile.flags.ramenBuffActive = true; const after = this.totalStats(); this.profile.currentVitals = { hp: after.maxHp, mp: after.maxMp }; if (this.player) { this.player.stats = after; this.player.hp = after.maxHp; this.player.mp = after.maxMp; } this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('food'); }
    useMenuItem(id) { const item = D.items[id], stats = this.totalStats(), vitals = this.storedVitals(stats), key = item?.effect?.hp ? 'hp' : item?.effect?.mp ? 'mp' : null, maxKey = key === 'hp' ? 'maxHp' : 'maxMp'; if (!key || !(this.profile.inventory[id] > 0) || vitals[key] >= stats[maxKey]) return; vitals[key] = Math.min(stats[maxKey], vitals[key] + item.effect[key]); this.profile.inventory[id]--; this.profile.currentVitals = vitals; this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('items'); }
    workshopContent() {
      const materialRows = (D.workshop.materialIds || []).map(id => { const item = D.items[id], count = this.profile.inventory[id] || 0; if (item?.bossId && !this.isBossDefeated(item.bossId)) return ''; return `<div class="workshop-material rarity-${item.rarity}"><span><i></i><b>${item.name}</b></span><strong>×${count}</strong><small>${item.description}</small></div>`; }).join('');
      if (this.workshopTab === 'materials') return `<div class="workshop-section-title"><b>素材一覧</b><span>MATERIALS</span></div><div class="workshop-materials">${materialRows || '<p>素材を所持していません。</p>'}</div>`;
      if (this.workshopTab === 'catalog') return `<div class="workshop-section-title"><b>怪異図鑑</b><span>CATALOG</span></div><div class="workshop-catalog"><article><em>01</em><b>ダンジョン1の怪異</b><span>6種の通常怪異を確認</span></article><article class="boss-record"><em>EVENT BOSS</em><b>ノエル</b><span>初回遭遇記録 // 戦力解析不能</span></article><article class="boss-record"><em>DUNGEON BOSS</em><b>ゼナカド</b><span>静寂のホール // 独奏卿</span></article></div>`;
      if (this.workshopTab === 'enchant') return this.enchantContent();
      if (this.workshopTab === 'armorEnchant') return this.armorEnchantContent();
      if (this.workshopTab === 'bossEquipment') return this.bossEquipmentContent();
      if (this.workshopTab === 'disassemble') { const gear = Object.entries(this.profile.inventory).filter(([id,n]) => n > 0 && D.items[id]?.category === 'equipment').map(([id,n]) => { const item = D.items[id], series = D.bossEquipmentSeries?.[item.seriesId], equipped = Object.values(this.profile.equipment).includes(id), spare = n - (equipped ? 1 : 0), can = !!series && spare > 0, output = series?.dismantle, material = D.items[output?.materialId]; return `<article class="${series ? 'boss-dismantle' : ''}"><div><b>${item.name}</b><span>${this.bonusText(id)} // 所持 ×${n}${equipped ? '（1個装備中）' : ''}</span>${series ? `<small>→ ${material?.name || output.materialId} ×${output.count}</small>` : ''}</div><button data-disassemble="${id}" ${can ? '' : 'disabled'}>${series ? (can ? '分解する' : '予備なし') : '対象外'}</button></article>`; }).join(''); return `<div class="workshop-section-title"><b>装備分解</b><span>DISASSEMBLE</span></div><p class="workshop-warning">ボス装備の予備を分解し、シリーズ素材へ変換できます。装備中の最後の1個は保護されます。</p><div class="workshop-disassemble">${gear || '<p>分解可能な装備がありません。</p>'}</div>`; }
      const craftCategory = this.workshopTab === 'armor' ? 'armor' : 'weapon', categoryName = craftCategory === 'weapon' ? '武器' : '防具', categoryEn = craftCategory === 'weapon' ? 'WEAPON CRAFT' : 'ARMOR CRAFT', dungeons = D.dungeons || [], filter = this.craftDungeonFilter || 'all', armorFilter = this.craftArmorFilter || 'leftHand';
      const armorTabs = craftCategory === 'armor' ? `<div class="recipe-armor-tabs">${(D.workshop.armorTabs || []).map(tab => `<button data-craft-armor="${tab.id}" class="${armorFilter === tab.id ? 'active' : ''}"><b>${tab.name}</b><span>${tab.enName}</span></button>`).join('')}</div>` : '';
      const dungeonTabs = dungeons.length ? `<div class="recipe-dungeon-tabs"><button data-craft-dungeon="all" class="${filter === 'all' ? 'active' : ''}">すべて</button>${dungeons.map(d => `<button data-craft-dungeon="${d.id}" class="${filter === d.id ? 'active' : ''}">${d.name}</button>`).join('')}</div>` : '';
      const recipes = Object.values(D.recipes || {}).filter(r => { const item = D.items[r.resultItemId]; return !r.legacy && this.isRecipeUnlocked(r) && (r.craftCategory || 'weapon') === craftCategory && (craftCategory !== 'armor' || item?.slot === armorFilter) && (filter === 'all' || r.dungeonId === filter); });
      const recipeCards = recipes.map(r => this.recipeCardHTML(r)).join(''), selectedArmor = (D.workshop.armorTabs || []).find(tab => tab.id === armorFilter);
      return `<div class="workshop-section-title"><b>${categoryName}製作</b><span>${categoryEn}</span></div>${armorTabs}${dungeonTabs}<div class="recipe-grid">${recipeCards || `<div class="workshop-empty-category"><b>${craftCategory === 'armor' ? `${selectedArmor?.name || '防具'}レシピ` : '武器レシピ'}準備中</b><span>対応する装備データとレシピを追加すると、ここへ自動表示されます。</span></div>`}</div><div class="workshop-material-preview"><b>現在の素材</b>${materialRows}</div>`;
    }
    bossEquipmentContent() { const seriesList = this.unlockedBossSeries(); if (!seriesList.length) { this.workshopTab = 'weapon'; return this.workshopContent(); } return seriesList.map(series => { const recipes = (series.recipes || []).map(id => D.recipes[id]).filter(Boolean), count = this.equippedSeriesCount(series.id); return `<section class="boss-series-craft"><header><small>BOSS EQUIPMENT</small><h3>${series.name}</h3><span>${'★'.repeat(series.stars || 5)} // EQUIPPED ${count} / ${series.equipment.length}</span></header><div class="boss-series-effects">${Object.entries(series.setBonuses || {}).map(([needed, bonus]) => `<div class="${count >= Number(needed) ? 'active' : ''}"><b>${needed} SET — ${bonus.name}</b><span>${bonus.description}</span></div>`).join('')}</div><div class="recipe-grid">${recipes.map(recipe => this.recipeCardHTML(recipe)).join('')}</div></section>`; }).join(''); }
    recipeCardHTML(recipe) {
      const item = D.items[recipe.resultItemId]; if (!item) return '';
      const owned = this.profile.inventory[recipe.resultItemId] || 0, goldOk = this.profile.gold >= (recipe.gold || 0);
      const materialsHtml = (recipe.materials || []).map(m => { const mi = D.items[m.itemId], have = this.profile.inventory[m.itemId] || 0, ok = have >= m.count; return `<div class="recipe-material ${ok ? '' : 'insufficient'}"><span>${mi?.name || m.itemId}</span><b>${have} / ${m.count}</b></div>`; }).join('');
      const goldRow = recipe.gold ? `<div class="recipe-gold ${goldOk ? '' : 'insufficient'}"><span>GOLD</span><b>${this.profile.gold} / ${recipe.gold}</b></div>` : '';
      const craftable = this.canCraft(recipe);
      const isNewRecipe = (this.profile.newlyUnlockedRecipes || []).includes(recipe.id);
      return `<article class="recipe-card rarity-${item.rarity}${isNewRecipe ? ' recipe-newly-unlocked' : ''}"><div class="recipe-info"><div class="recipe-title"><b>${item.name}${item.stars ? `<small>${'★'.repeat(item.stars)}</small>` : ''}</b>${isNewRecipe ? '<mark class="recipe-new">NEW</mark>' : ''}${owned ? `<em>所持 ×${owned}</em>` : ''}</div>${item.nameEn ? `<strong class="recipe-name-en">${item.nameEn}</strong>` : ''}<small>${item.description}</small><span class="recipe-bonus">${this.bonusText(recipe.resultItemId)}</span></div><div class="recipe-materials">${materialsHtml}${goldRow}</div><button class="recipe-craft" data-craft="${recipe.id}" ${craftable ? '' : 'disabled'}>${craftable ? '製作する' : '素材不足'}</button></article>`;
    }
    canCraft(recipe) { if (!recipe) return false; if (this.profile.gold < (recipe.gold || 0)) return false; return (recipe.materials || []).every(m => (this.profile.inventory[m.itemId] || 0) >= m.count); }
    craftItem(id) {
      const recipe = D.recipes?.[id]; if (!recipe || !this.canCraft(recipe)) return;
      this.profile.gold -= (recipe.gold || 0); recipe.materials.forEach(m => { this.profile.inventory[m.itemId] = (this.profile.inventory[m.itemId] || 0) - m.count; });
      this.profile.inventory[recipe.resultItemId] = (this.profile.inventory[recipe.resultItemId] || 0) + (recipe.resultCount || 1);
      this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('workshop');
    }
    dismantleItem(id) { const item = D.items[id], series = D.bossEquipmentSeries?.[item?.seriesId], output = series?.dismantle, equipped = Object.values(this.profile.equipment).includes(id), spare = (this.profile.inventory[id] || 0) - (equipped ? 1 : 0); if (!item || !series || !output || spare <= 0) return; this.profile.inventory[id]--; this.profile.inventory[output.materialId] = (this.profile.inventory[output.materialId] || 0) + output.count; this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('workshop'); }
    renderWorkshop(panel) {
      if ((this.profile.newlyUnlockedRecipes || []).length) { this.profile.newlyUnlockedRecipes = []; this.saveProfile(); }
      if (!this.profile.flags.noelFirstEncounterCleared) { panel.innerHTML = '<button class="panel-home" data-menu="home">拠点へ戻る</button><small>PHANTOM WORKSHOP</small><h2>工房</h2><div class="workshop-unlock"><b>LOCKED</b><strong>まだ工房は利用できません</strong><span>通常戦を3回制し、永遠の裁定者ノエルと遭遇すると解放されます。</span></div>'; return; }
      const enchantUnlocked = (this.profile.flags.dungeon2BattleWins || 0) >= 15; const availableTabs = [...D.workshop.tabs, ...(this.unlockedBossSeries().length ? [{ id: 'bossEquipment', name: 'ボス装備', enName: 'BOSS EQUIPMENT' }] : []), ...(enchantUnlocked ? [{ id: 'enchant', name: '武器強化', enName: 'WEAPON ENCHANT' }, { id: 'armorEnchant', name: '防具強化', enName: 'ARMOR ENCHANT' }] : [])]; if (!availableTabs.some(tab => tab.id === this.workshopTab)) this.workshopTab = 'weapon'; const tabs = availableTabs.map(tab => `<button data-workshop-tab="${tab.id}" class="${this.workshopTab === tab.id ? 'active' : ''}"><b>${tab.name}</b><span>${tab.enName}</span></button>`).join('');
      panel.innerHTML = `<div class="workshop-header"><small>UNLOCKED FACILITY</small><h2>PHANTOM WORKSHOP</h2><span>ファントムワークショップ</span><div><b>GOLD ${this.profile.gold}</b><b>MATERIALS ${(D.workshop.materialIds || []).reduce((sum,id)=>sum+(this.profile.inventory[id]||0),0)}</b></div></div><div class="workshop-layout"><aside><div class="workshop-keeper"><img src="assets/ui/workshop/helper-fox-pixel.png" alt="工房のお助けキャラ"><b>さてさて……</b><span>何を作ろうかな？</span></div><nav>${tabs}</nav></aside><section class="workshop-main">${this.workshopContent()}</section></div>`;
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
    renderArchivePanel(panel) {
      const dungeons = this.archiveDungeons();
      if (!dungeons.some(d => d.id === this.archiveDungeon)) this.archiveDungeon = 'dungeon1';
      const dunId = this.archiveDungeon;
      const bossIds = new Set(['zenakado', 'myrthi', 'noelFirstEncounter']);
      const all = Object.values(D.enemies).filter(e => this.enemyDungeonId(e) === dunId || (dunId === 'dungeon1' && bossIds.has(e.id) && e.id !== 'myrthi'));
      // 雑魚 → ボスの順。ボスは末尾へ。
      const list = [...all].sort((a, b) => (bossIds.has(a.id) ? 1 : 0) - (bossIds.has(b.id) ? 1 : 0) || (a.stats?.maxHp || 0) - (b.stats?.maxHp || 0));
      const tabs = dungeons.map(d => `<button data-archive-dungeon="${d.id}" class="${d.id === dunId ? 'active' : ''}"><b>${d.label}</b></button>`).join('');
      const statRow = s => !s ? '' : `<div class="ar-stats">
        <span>HP</span><b>${s.maxHp ?? '—'}</b><span>攻撃</span><b>${s.atk ?? '—'}</b><span>防御</span><b>${s.def ?? '—'}</b>
        <span>魔力</span><b>${s.mag ?? '—'}</b><span>精神</span><b>${s.mnd ?? s.def ?? '—'}</b><span>素早さ</span><b>${s.spd ?? '—'}</b></div>`;
      const dropRow = e => {
        const t = e.dropTable || [];
        if (!t.length) return '<p class="ar-nodrop">ドロップなし</p>';
        return `<div class="ar-drops">${t.map(d => {
          const it = D.items[d.itemId] || D.weapons[d.itemId] || D.armors[d.itemId] || D.accessories[d.itemId];
          const pct = Math.round((d.chance || 0) * 1000) / 10;
          return `<div class="ar-drop"><span>${it?.name || d.itemId}</span><b>${pct}%</b><i><em style="width:${Math.min(100, pct)}%"></em></i></div>`;
        }).join('')}</div>`;
      };
      const cards = list.map(e => {
        if (this.isArchiveHidden(e)) {
          return `<article class="ar-card ar-hidden"><header><b>？？？</b><small>未確認</small></header><p class="ar-nodrop">正体が判明していません。</p></article>`;
        }
        const isBoss = bossIds.has(e.id);
        const gold = e.gold ? `${e.gold.min}〜${e.gold.max}` : '—';
        return `<article class="ar-card${isBoss ? ' ar-boss' : ''}">
          <header><b>${e.name}</b><small>${isBoss ? 'BOSS' : (e.element ? `属性 ${e.element}` : '')}</small></header>
          ${statRow(e.stats)}
          <div class="ar-meta"><span>EXP</span><b>${e.exp ?? 0}</b><span>GOLD</span><b>${gold}</b>${e.weaknesses?.length ? `<span>弱点</span><b>${e.weaknesses.join('・')}</b>` : ''}</div>
          ${dropRow(e)}
        </article>`;
      }).join('');
      const met = list.filter(e => !this.isArchiveHidden(e)).length;
      panel.innerHTML = `<button class="panel-home" data-menu="home">拠点へ戻る</button><small>PHANTOM ARCHIVE</small><h2>図鑑</h2>
        <div class="item-tabs ar-tabs">${tabs}</div>
        <p class="ar-hint">記録 ${met} / ${list.length}　—　一度戦った怪異が記録されます。数値はドロップ率です。</p>
        <div class="ar-list">${cards || '<p class="item-empty">このダンジョンの記録はまだありません。</p>'}</div>`;
    }
    // 選択キャラの名前。未選択時は蓮。
    playerName() { return (this.characterList || []).find(c => c.id === this.profile.selectedCharacter)?.name || '雨宮 蓮'; }
    renderStatusPanel(panel, withTabs = false) {
      const base = this.profile.baseStats, bonus = this.equipmentBonuses(), total = this.totalStats(), vitals = this.storedVitals(total);
      const jid = this.profile.currentJob, jst = this.profile.jobs?.[jid] || {}, jlv = jst.level || 1, jneed = this.jobExpNeeded(jlv), jexp = jst.exp || 0;
      // キャラLvは廃止済み。EXPバーは装備中の武器の武器学に置き換える。
      const mType = this.equippedWeaponType(), mst = this.masteryOf(mType), mNeed = this.masteryExpNeeded(mst.level);
      const mPct = Math.min(100, 100 * (mst.exp || 0) / mNeed), jpct = jneed ? Math.min(100, 100 * jexp / jneed) : 100;
      const slots = D.equipmentSlots || [{ id: 'rightHand', name: '右手', enName: 'MAIN' }, { id: 'leftHand', name: '左手', enName: 'OFF' }, { id: 'head', name: '頭', enName: 'HEAD' }, { id: 'body', name: '体', enName: 'BODY' }, { id: 'arms', name: '腕', enName: 'ARMS' }, { id: 'feet', name: '足', enName: 'FEET' }, { id: 'accessory', name: 'アクセ', enName: 'ACC' }];
      const eqRows = slots.map(s => { const id = this.profile.equipment[s.id], it = D.items[id]; return `<div class="st-eq-row ${id ? 'filled' : 'empty'}"><span>${s.name}</span><b>${it?.name || '—'}${id ? this.enchantSuffix(id) : ''}</b><small>${id ? this.bonusText(id) : ''}</small></div>`; }).join('');
      // JOB補正 = 旧テーブル方式の補正 ＋ 今のJOBで育てた成長分
      const legacyJob = this.activeJobBonuses(), growthJob = this.jobStatBonuses(), jobBonus = {};
      for (const src of [legacyJob, growthJob]) for (const [k, v] of Object.entries(src)) if (v) jobBonus[k] = (jobBonus[k] || 0) + v;
      // 基礎値 ＋ JOB ＋ 装備 が合計と一致するように並べる
      const statRows = Object.keys(statLabels).map(k => {
        const b = base[k] || 0, j = jobBonus[k] || 0, e = bonus[k] || 0;
        const parts = [`<i class="src-base">基礎 ${b}</i>`];
        if (j) parts.push(`<i class="src-job">JOB +${j}</i>`);
        if (e) parts.push(`<i class="src-eq">装備 +${e}</i>`);
        // パッシブ・セット効果・まかないバフなど、上記以外の加算分
        const rest = total[k] - b - j - e;
        const mismatch = rest ? `<i class="src-etc">パッシブ他 ${rest > 0 ? '+' : ''}${rest}</i>` : '';
        return `<div class="st-stat"><span>${statLabels[k]}</span><b>${total[k]}</b><em>${parts.join('<u>+</u>')}${mismatch}</em></div>`;
      }).join('');
      const jobBonusRows = Object.entries(jobBonus).filter(([, v]) => v).map(([k, v]) => `<div class="st-jb-row"><span>${statLabels[k] || k.toUpperCase()}</span><b>+${v}</b></div>`).join('');
      const ptNote = this.isPhantomThief()
        ? `<p class="st-jb-note">全JOBで育てた成長を ${Math.round((this.gb().phantomThiefInheritRate ?? 0.5) * 100)}% 引き継いでいます。</p>`
        : `<p class="st-jb-note">JOBで育てた成長は、そのJOBに就いている間だけ乗ります。</p>`;
      const jobHtml = `<div class="st-section"><h3>ジョブ補正</h3><div class="st-jb-head"><b>${D.jobs[jid]?.name || ''}</b><em>Lv.${jlv}</em></div>${jobBonusRows ? `<div class="st-jb">${jobBonusRows}</div>` : '<p class="item-empty">まだ補正はありません。</p>'}${ptNote}</div>`;
      const passives = (this.profile.passiveSlots || []).map(id => D.skills[id]).filter(Boolean);
      const passiveHtml = passives.length ? `<div class="st-section"><h3>パッシブ</h3><div class="st-passives">${passives.map(s => `<div><b>${s.name}</b><small>${s.description || ''}</small></div>`).join('')}</div></div>` : '';
      panel.innerHTML = `<small>CHARACTER DATA</small><h2>${withTabs ? '装備・ステータス' : 'ステータス'}</h2>${withTabs ? this.equipTabsHtml() : ''}
        <div class="st-head"><div class="st-portrait" aria-hidden="true"></div><div class="st-id"><strong>${this.playerName()}</strong><em>${D.jobs[jid]?.name || ''} Lv.${jlv}</em></div></div>
        <div class="st-meters"><div class="st-meter hp"><span>HP</span><i style="width:${100*vitals.hp/total.maxHp}%"></i><output>${vitals.hp} / ${total.maxHp}</output></div><div class="st-meter mp"><span>MP</span><i style="width:${100*vitals.mp/total.maxMp}%"></i><output>${vitals.mp} / ${total.maxMp}</output></div><div class="st-meter exp"><span>${this.weaponTypeName(mType)} Lv.${mst.level}</span><i style="width:${mPct}%"></i><output>${mPct.toFixed(2)}%</output></div><div class="st-meter jexp"><span>${D.jobs[jid]?.name || 'JOB'} Lv.${jlv}</span><i style="width:${jpct}%"></i><output>${jneed ? jpct.toFixed(2)+'%' : 'MASTER'}</output></div></div>
        <div class="st-section"><h3>装備</h3><div class="st-eq">${eqRows}</div></div>
        <div class="st-section"><h3>能力値</h3><div class="stat-grid">${statRows}</div></div>${this.combatStatsSectionHTML(total)}${this.masterySectionHTML()}${jobHtml}${passiveHtml}`;
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
        if (this.itemTab === 'consumable') { const recoverable = it.effect?.hp || it.effect?.mp, full = it.effect?.hp ? vitals.hp >= stats.maxHp : it.effect?.mp ? vitals.mp >= stats.maxMp : true; return `<div class="item-row rarity-${it.rarity}"><div><b>${it.name}</b><small>${it.description}</small></div><strong>×${n}</strong>${recoverable ? `<button data-use-item="${id}" ${full ? 'disabled' : ''}>${full ? '満タン' : '使う'}</button>` : ''}</div>`; }
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
      const all = [...combatRows, ...rows.map(([key, value]) => `${statLabels[key] || key.toUpperCase()} ${value >= 0 ? '+' : ''}${value}`), ...effectRows];
      return all.length ? all.join(' / ') + enchStr : '補正なし' + enchStr;
    }
    equipmentPreviewHTML(id) {
      if (!id) return `<div class="equipment-empty-preview"><b>装備候補を選択</b><span>候補をタップすると、現在装備との能力差を確認できます。</span></div>`;
      const item = D.items[id], targetSlot = this.equipSlot || item.slot, currentId = this.profile.equipment[targetSlot], currentItem = D.items[currentId], nextEquipment = { ...this.profile.equipment, [targetSlot]: id }, before = this.totalStats(), after = this.totalStats(nextEquipment), active = currentId === id;
      const rows = Object.keys(statLabels).map(key => { const delta = after[key] - before[key], state = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same', change = delta ? `${delta > 0 ? '+' : ''}${delta} ${delta > 0 ? '↑' : '↓'}` : '－'; return `<div class="compare-row ${state}"><span>${statLabels[key]}</span><b>${before[key]}</b><i>→</i><strong>${after[key]}</strong><em>${change}</em></div>`; }).join('');
      const isDualBlade = this.profile.currentJob === 'dualBlade', isWeapon = !!D.weapons[id], leftActive = this.profile.equipment.leftHand === id;
      const leftBtn = isDualBlade && isWeapon ? `<button class="equip-confirm" data-equip-left="${id}" ${leftActive ? 'disabled' : ''} style="margin-top:.4rem">${leftActive ? '左手装備中' : '左手に装備'}<span>${leftActive ? 'L-EQUIPPED' : 'L-EQUIP'}</span></button>` : '';
      return `<div class="equipment-swap"><div><small>現在装備</small><b>${currentItem?.name || 'なし'}</b><span>${currentId ? this.bonusText(currentId) : '補正なし'}</span></div><i>→</i><div><small>変更後</small><b>${item.name}</b><span>${this.bonusText(id)}</span></div></div><div class="equipment-description">${item.description}</div><div class="compare-table"><div class="compare-head"><span>能力</span><b>現在</b><i></i><strong>装備後</strong><em>変化</em></div>${rows}</div><button class="equip-confirm" data-equip-confirm="${id}" ${active ? 'disabled' : ''}>${active ? '装備中' : 'この装備に変更'}<span>${active ? 'EQUIPPED' : 'EQUIP'}</span></button>${leftBtn}`;
    }
    musicScoreSectionHTML() { const scores = Object.values(D.musicScores || {}); return `<section class="music-score-section"><h3>楽曲 <span>MUSIC SCORE // PRIVATE MODE</span></h3><div>${scores.map(score => { const owned = !!this.profile.musicScores?.[score.id]; return `<article class="music-score-card ${owned ? 'owned' : 'locked'}"><i>♪</i><div><small>${owned ? 'PLAYABLE SCORE' : 'LOCKED SCORE'}</small><b>${owned ? score.title : '????????'}</b><strong>${owned ? `（${score.subtitle}）` : 'ゼナカド初回撃破で解放'}</strong><span>${owned ? score.description : 'まだ演奏できません。'}</span></div><em>${owned ? 'PRIVATE MODE ITEM' : 'LOCKED'}</em></article>`; }).join('')}</div></section>`; }
    bossSetBonusSectionHTML() { const seriesList = this.unlockedBossSeries(); if (!seriesList.length) return ''; return seriesList.map(series => { const count = this.equippedSeriesCount(series.id); return `<section class="boss-set-section"><header><div><small>BOSS EQUIPMENT SET</small><h3>${series.name}</h3></div><strong>${count} / ${series.equipment.length} EQUIPPED</strong></header><div>${Object.entries(series.setBonuses || {}).map(([needed, bonus]) => `<article class="${count >= Number(needed) ? 'active' : ''}"><b>${needed} SET — ${bonus.name}</b><span>${bonus.description}</span></article>`).join('')}</div></section>`; }).join(''); }
    equipTabsHtml() {
      const t = this.equipTab || 'equip';
      const tabs = [['equip', '装備'], ['status', 'ステータス'], ['arts', '武器技'], ['score', '楽曲']];
      return `<div class="item-tabs eq-tabs">${tabs.map(([id, name]) => `<button data-equip-tab="${id}" class="${t === id ? 'active' : ''}"><b>${name}</b></button>`).join('')}</div>`;
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
      const all = Object.values(D.skills).filter(s => s.weaponType === type && s.prerequisiteSkill)
        .sort((a, b) => (a.requiredWeaponLevel ?? 1) - (b.requiredWeaponLevel ?? 1));
      const learned = this.learnedWeaponSkillIds();
      const mst = this.masteryOf(type);
      const rows = all.map(s => {
        const has = learned.includes(s.id);
        const open = this.artsOpenId === s.id;
        const from = s.prerequisiteSkill ? (D.skills[s.prerequisiteSkill]?.name || s.prerequisiteSkill) : null;
        const req = s.requiredWeaponLevel ?? 1;
        const meta = has
          ? `${s.mp ? `MP ${s.mp}` : 'MP 0'}${s.hits > 1 ? ` / ${s.hits}回攻撃` : ''}${s.aoe ? ' / 全体' : ''}`
          : `武器学 Lv.${req} 必要${from ? `／${from}から派生` : ''}`;
        const detail = open && has
          ? `<div class="wa-detail"><p>${s.description || ''}</p><div class="wa-facts">
              <span>威力</span><b>${s.power != null ? `攻撃性能×${s.power}${s.hits > 1 ? ` を${s.hits}回` : ''}` : '—'}</b>
              <span>消費MP</span><b>${s.mp || 0}</b>
              ${s.hits > 1 ? `<span>ヒット数</span><b>${s.hits}回</b>` : ''}
              ${s.aoe ? '<span>対象</span><b>敵全体</b>' : '<span>対象</span><b>敵単体</b>'}
              ${s.element ? `<span>属性</span><b>${s.element}</b>` : ''}
              ${from ? `<span>派生元</span><b>${from}</b>` : ''}
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
        const from = D.skills[next.prerequisiteSkill]?.name || '通常攻撃';
        return mst.level >= (next.requiredWeaponLevel ?? 1)
          ? `《${from}》を使い続けると、次の技を閃くことがあります。`
          : `次の技は武器学 Lv.${next.requiredWeaponLevel} から閃けます（現在 Lv.${mst.level}）。`;
      })();
      panel.innerHTML = `<small>WEAPON ARTS</small><h2>装備・ステータス</h2>${this.equipTabsHtml()}
        <div class="item-tabs wa-tabs">${subTabs}</div>
        <p class="wa-hint">${nextHint}</p>
        <div class="wa-list">${rows || '<p class="item-empty">この武器種の技はまだありません。</p>'}</div>`;
    }
    renderEquipmentPanel(panel) {
      if (this.equipTab === 'status') { this.renderStatusPanel(panel, true); return; }
      if (this.equipTab === 'arts') { this.renderWeaponArtsPanel(panel); return; }
      if (this.equipTab === 'score') { panel.innerHTML = `<small>MUSIC SCORE</small><h2>楽曲</h2>${this.equipTabsHtml()}<div class="score-note"><b>今後プライベートモードで使用します</b><span>入手した楽曲は、実装予定のプライベートモードで演奏できるようになります。</span></div>${this.musicScoreSectionHTML()}`; return; }
      const slots = D.equipmentSlots || [], owned = Object.entries(this.profile.inventory).filter(([id, n]) => n > 0 && D.items[id]?.category === 'equipment');
      if (this.selectedEquipmentId && !(this.profile.inventory[this.selectedEquipmentId] > 0)) this.selectedEquipmentId = null;
      const isDualBlade = this.profile.currentJob === 'dualBlade';
      const activeSlot = this.equipSlot && slots.some(s => s.id === this.equipSlot) ? this.equipSlot : null;
      const slotHtml = slots.map(slot => { const id = this.profile.equipment[slot.id], item = D.items[id]; const rate = isDualBlade && slot.id === 'leftHand' && D.weapons[id] ? ' ×70%' : ''; const disabled = slot.id === 'leftHand' && !isDualBlade; const count = this.candidatesForSlot(slot.id).length; return `<button type="button" data-equip-slot-pick="${slot.id}" class="equipment-slot ${id ? 'filled' : 'empty'} ${disabled ? 'slot-disabled' : ''} ${activeSlot === slot.id ? 'slot-active' : ''}" ${disabled ? 'disabled' : ''}><span>${slot.name}<small>${slot.enName}</small></span><b>${item?.name || 'なし'}${id ? this.enchantSuffix(id) : ''}${rate}</b>${count && !disabled ? `<i class="slot-count">${count}</i>` : ''}</button>`; }).join('');
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
      const isDualBlade = this.profile.currentJob === 'dualBlade';
      return Object.entries(this.profile.inventory).filter(([id, n]) => {
        if (!(n > 0)) return false; const item = D.items[id]; if (!item || item.category !== 'equipment') return false;
        if (slotId === 'leftHand') return isDualBlade ? (!!D.weapons[id] || item.slot === 'leftHand') : item.slot === 'leftHand';
        return item.slot === slotId;
      }).map(([id]) => id);
    }
    equipSortValue(id, key) { const before = this.totalStats(), item = D.items[id]; if (!item) return 0; const slot = this.equipSlot || item.slot; const after = this.totalStats({ ...this.profile.equipment, [slot]: id }); return after[key] - before[key]; }
    equipDeltaSummary(id, slotId) {
      const before = this.totalStats(), after = this.totalStats({ ...this.profile.equipment, [slotId]: id });
      const parts = Object.keys(statLabels).map(k => { const d = after[k] - before[k]; return d ? `<i class="${d > 0 ? 'up' : 'down'}">${statLabels[k]} ${d > 0 ? '+' : ''}${d}</i>` : ''; }).filter(Boolean);
      return parts.length ? parts.join('') : '<i class="same">変化なし</i>';
    }
    previewEquipment(id) { const item = D.items[id]; if (!item || item.category !== 'equipment' || !(this.profile.inventory[id] > 0)) return; this.selectedEquipmentId = id; this.renderMenuPanel('equipment'); requestAnimationFrame(() => $('#equipment-preview')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })); }
    equipItem(id) { const item = D.items[id]; if (!item || item.category !== 'equipment' || !(this.profile.inventory[id] > 0)) return; const slot = (this.equipSlot && this.candidatesForSlot(this.equipSlot).includes(id)) ? this.equipSlot : item.slot; this.profile.equipment[slot] = id; this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('equipment'); }
    unequipSlot(slotId) { if (!slotId || !(slotId in this.profile.equipment)) return; this.profile.equipment[slotId] = slotId === 'rightHand' ? 'mageStaff' : null; this.selectedEquipmentId = null; this.saveProfile(); this.audio.sfx('ui'); this.renderMenuSummary(); this.renderMenuPanel('equipment'); }
    equipFromInventory(id) { const item = D.items[id]; if (!item || !(this.profile.inventory[id] > 0)) return; const slot = D.weapons[id] ? 'rightHand' : item.slot; if (!slot) return; this.profile.equipment[slot] = id; this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('items'); }
    equipLeftHandWeapon(id) { if (!D.weapons[id] || !(this.profile.inventory[id] > 0) || this.profile.currentJob !== 'dualBlade') return; this.profile.equipment.leftHand = id; this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('equipment'); }

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
  addEventListener('DOMContentLoaded', () => { window.arseneGame = new BattleGame(); });
})();
