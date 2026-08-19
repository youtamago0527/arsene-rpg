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
      $('#menu-screen').addEventListener('click', async e => { const b = e.target.closest('[data-menu]'); if (!b || b.disabled) return; await this.audio.unlock(); this.audio.sfx('ui'); if (b.dataset.menu === 'battle') { this.renderMenuPanel('dungeon-select'); } else if (b.dataset.menu === 'boss') { await this.audio.playTrack(this.bossMusic); const d2w = this.profile.flags.dungeon2BattleWins || 0; if (d2w >= 10 && !this.isBossDefeated('myrthi')) { this.currentDungeonId = 'dungeon2'; this.startMyrthiBoss(); } else this.startBossEncounter(); } else this.renderMenuPanel(b.dataset.menu); });
      $('#menu-panel').addEventListener('click', async e => {
        const enterDungeon = e.target.closest('[data-enter-dungeon]');
        if (enterDungeon) { this.currentDungeonId = enterDungeon.dataset.enterDungeon; const dungeonCfg = this.getDungeon(this.currentDungeonId); await this.audio.playTrack(dungeonCfg?.music || this.battleMusic); this.startBattle(); return; }
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
      const p = D.player; return { version: 11, selectedCharacter: null, playerCharacter: null, prologueCompleted: false, openingWatched: false, level: p.level, exp: p.exp, gold: p.gold, baseStats: clone(p.baseStats), currentVitals: { hp: p.baseStats.maxHp, mp: p.baseStats.maxMp }, equipment: clone(p.equipment), inventory: clone(p.inventory), musicScores: {}, bossDefeated: { zenacad: false, myrthi: false }, currentJob: 'mage', jobs: { warrior: { level: 1, exp: 0 }, mage: { level: 1, exp: 0 }, martialArtist: { level: 1, exp: 0 }, priest: { level: 1, exp: 0 }, arcaneMaestro: { level: 1, exp: 0 }, dualBlade: { level: 1, exp: 0 } }, learnedJobSkills: [], learnedCharacterSkills: ['blueNote'], activeSkills: ['blueNote', 'quickSlash'], subCommand: null, passiveSlots: [null, null], weaponEnchants: {}, armorEnchants: {}, kazuSeenOnce: [], flags: { noelFirstEncounterCleared: false, preNoelBattleWins: 0, postNoelBattleWins: 0, zenakadoDefeated: false, zenakadoScoreClaimed: false, ramenBuffActive: false, normalBattleWins: 0, temporaryBossCompleted: false, openingWatched: false, prologueCompleted: false, dungeon2BattleWins: 0, dungeon2NewSeen: false, dungeon3BattleWins: 0, dungeon3NewSeen: false, lastBattleResult: null, consecutiveDefeats: 0 }, discoveredMaterials: [], unlockedRecipes: [], newlyUnlockedRecipes: [] };
    }
    loadProfile() {
      try {
        const saved = JSON.parse(localStorage.getItem(D.settings.saveKey)); if (!saved) return this.freshProfile();
        const base = this.freshProfile(), jobs = clone(base.jobs); Object.keys(jobs).forEach(id => jobs[id] = { ...jobs[id], ...(saved.jobs?.[id] || {}) }); const profile = { ...base, ...saved, baseStats: { ...base.baseStats, ...saved.baseStats }, currentVitals: { ...base.currentVitals, ...saved.currentVitals }, equipment: { ...base.equipment, ...saved.equipment }, inventory: { ...base.inventory, ...saved.inventory }, musicScores: { ...base.musicScores, ...saved.musicScores }, bossDefeated: { ...base.bossDefeated, ...saved.bossDefeated }, jobs, learnedJobSkills: Array.isArray(saved.learnedJobSkills) ? saved.learnedJobSkills : [], learnedCharacterSkills: Array.isArray(saved.learnedCharacterSkills) ? saved.learnedCharacterSkills : [], activeSkills: Array.isArray(saved.activeSkills) ? saved.activeSkills.slice(0, 4) : base.activeSkills, flags: { ...base.flags, ...saved.flags }, armorEnchants: { ...(saved.armorEnchants || {}) }, kazuSeenOnce: Array.isArray(saved.kazuSeenOnce) ? saved.kazuSeenOnce : [], discoveredMaterials: Array.isArray(saved.discoveredMaterials) ? saved.discoveredMaterials : [], unlockedRecipes: Array.isArray(saved.unlockedRecipes) ? saved.unlockedRecipes : [], newlyUnlockedRecipes: Array.isArray(saved.newlyUnlockedRecipes) ? saved.newlyUnlockedRecipes : [] };
        if ((saved.version || 0) < 3 || !saved.currentVitals) { const bonuses = {}; Object.values(profile.equipment).forEach(id => Object.entries((D.weapons[id] || D.accessories[id] || D.armors?.[id] || D.equipment?.[id])?.bonuses || {}).forEach(([key, value]) => bonuses[key] = (bonuses[key] || 0) + value)); profile.currentVitals = { hp: profile.baseStats.maxHp + (bonuses.maxHp || 0), mp: profile.baseStats.maxMp + (bonuses.maxMp || 0) }; }
        if ((saved.version || 0) < 4) { const oldWins = Math.max(0, Number(saved.flags?.normalBattleWins) || 0), oldNoel = !!saved.flags?.noelFirstEncounterCleared; profile.flags.preNoelBattleWins = Number.isFinite(saved.flags?.preNoelBattleWins) ? saved.flags.preNoelBattleWins : (oldNoel ? D.battleProgression.noelEncounterWins : Math.min(oldWins, D.battleProgression.noelEncounterWins)); profile.flags.postNoelBattleWins = Number.isFinite(saved.flags?.postNoelBattleWins) ? saved.flags.postNoelBattleWins : (oldNoel ? oldWins : 0); profile.flags.zenakadoDefeated = false; profile.flags.zenakadoScoreClaimed = false; profile.flags.temporaryBossCompleted = false; }
        if (profile.flags.zenakadoDefeated) profile.bossDefeated.zenacad = true;
        if (!D.jobs[profile.currentJob]) profile.currentJob = 'mage';
        if (!profile.weaponEnchants) profile.weaponEnchants = {};
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
        profile.version = 11;
        return profile;
      } catch { return this.freshProfile(); }
    }
    saveProfile() { localStorage.setItem(D.settings.saveKey, JSON.stringify(this.profile)); }
    saveTransferMetaKey() { return window.arseneStartFlow?.metaKey || 'arsene-rpg-start-flow-v01'; }
    encodeSaveTransferCode() { const save = localStorage.getItem(D.settings.saveKey), meta = localStorage.getItem(this.saveTransferMetaKey()), payload = { app: 'arsene-rpg', v: 1, exportedAt: new Date().toISOString(), save: save ? JSON.parse(save) : this.profile, meta: meta ? JSON.parse(meta) : null }; return btoa(unescape(encodeURIComponent(JSON.stringify(payload)))); }
    decodeSaveTransferCode(code) { try { const payload = JSON.parse(decodeURIComponent(escape(atob(String(code || '').trim())))); if (!payload || typeof payload !== 'object' || !payload.save) return null; return payload; } catch { return null; } }
    applySaveTransfer(payload) { localStorage.setItem(D.settings.saveKey, JSON.stringify(payload.save)); if (payload.meta) localStorage.setItem(this.saveTransferMetaKey(), JSON.stringify(payload.meta)); location.reload(); }
    jobCommand(jobId) { const map = D.jobCommandAbilities || {}; const j = D.jobs[jobId]; return map[jobId] || { cmd: j?.name || jobId, cmdEn: j?.nameEn || jobId }; }
    personalSkills() { return (D.characterSkillProgression || []).filter(e => this.profile.level >= e.level && D.skills[e.skillId]?.type === 'ACTIVE').map(e => D.skills[e.skillId]).filter(Boolean); }
    jobLearnedActiveSkills(jobId) { const job = D.jobs[jobId]; if (!job) return []; const jlv = this.profile.jobs[jobId]?.level || 0; return Object.entries(job.skillUnlocks || {}).filter(([lv]) => Number(lv) <= jlv).map(([, id]) => D.skills[id]).filter(s => s && s.type !== 'PASSIVE'); }
    allLearnedPassives() { const ids = [...(this.profile.learnedJobSkills || []), ...(this.profile.learnedCharacterSkills || [])]; return [...new Set(ids)].map(id => D.skills[id]).filter(s => s?.type === 'PASSIVE'); }
    setSubCommand(jobId) { this.profile.subCommand = (jobId && jobId !== this.profile.currentJob) ? jobId : null; this.saveProfile(); this.audio.sfx('heal'); if (this.jobUI) this.jobUI.modal = null; this.renderMenuPanel('job'); }
    setPassiveSlot(idx, skillId) { if (!Array.isArray(this.profile.passiveSlots)) this.profile.passiveSlots = [null, null]; this.profile.passiveSlots[idx] = skillId || null; this.saveProfile(); this.audio.sfx('heal'); if (this.jobUI) this.jobUI.modal = null; this.renderMenuPanel('job'); }
    syncSkillUnlocks() { const learnedCharacter = new Set(this.profile.learnedCharacterSkills || []), learnedJob = new Set(this.profile.learnedJobSkills || []); (D.characterSkillProgression || []).forEach(entry => { if (this.profile.level >= entry.level) learnedCharacter.add(entry.skillId); }); Object.entries(this.profile.jobs || {}).forEach(([jobId, progress]) => { const job = D.jobs[jobId]; Object.entries(job?.skillUnlocks || {}).forEach(([level, skillId]) => { if (progress.level >= Number(level)) learnedJob.add(skillId); }); }); this.profile.learnedCharacterSkills = [...learnedCharacter]; this.profile.learnedJobSkills = [...learnedJob]; const allowed = new Set(['quickSlash', ...learnedCharacter, ...learnedJob]); this.profile.activeSkills = (this.profile.activeSkills || []).filter(id => allowed.has(id) && D.skills[id]?.type !== 'PASSIVE').slice(0, 4); }
    learnedActiveSkillIds() { return [...new Set(['quickSlash', ...(this.profile.learnedCharacterSkills || []), ...(this.profile.learnedJobSkills || [])])].filter(id => D.skills[id]?.type !== 'PASSIVE'); }
    characterHasSkill(id) { return (this.profile.learnedCharacterSkills || []).includes(id) || (D.characterSkillProgression || []).some(entry => entry.skillId === id && this.profile.level >= entry.level); }
    jobExpNeeded(level) { return D.jobExpTable[level] || null; }
    activeJobBonuses(jobId = this.profile.currentJob) { const job = D.jobs[jobId], level = this.profile.jobs?.[jobId]?.level || 1, bonuses = {}; for (let lv = 1; lv <= level; lv++) Object.entries(job?.growth?.[lv] || {}).forEach(([key, value]) => bonuses[key] = (bonuses[key] || 0) + value); return bonuses; }
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
      const total = clone(this.profile.baseStats), bonuses = this.equipmentBonuses(equipment), jobBonuses = this.activeJobBonuses(); Object.entries(bonuses).forEach(([k, v]) => total[k] = (total[k] || 0) + v); Object.entries(jobBonuses).forEach(([k, v]) => total[k] = (total[k] || 0) + v); const setEffects = this.activeSetEffects(equipment); if (setEffects.magPercent) total.mag = Math.max(total.mag + 1, Math.floor(total.mag * (1 + setEffects.magPercent / 100))); if (setEffects.critBonusFlat) total.critBonus = (total.critBonus || 0) + setEffects.critBonusFlat; if (this.profile.flags.ramenBuffActive) total.maxHp = Math.ceil(total.maxHp * 1.03); total.critBonus ||= 0; total.def = total.vit; const wId = equipment.rightHand, w = D.weapons[wId]; if (w) { const enchLv = (this.profile.weaponEnchants || {})[wId] || 0; if (enchLv > 0) { const dstat = w.damageStat || 'str'; total[dstat] = (total[dstat] || 0) + enchLv * (D.enchantTable?.statBonus || 5); } } return total;
    }
    getDungeon(id = this.currentDungeonId) { return (D.dungeons || []).find(d => d.id === id) || (D.dungeons || [])[0]; }
    isDungeonUnlocked(id) { const d = this.getDungeon(id); if (!d) return false; if (!d.unlockCondition) return true; if (d.unlockCondition === 'dungeon1Clear') return this.isBossDefeated('zenacad'); if (d.unlockCondition === 'dungeon2Clear') return (this.profile.flags.dungeon2BattleWins || 0) >= 15; return false; }
    applyDungeonBackground() { const bg = this.getDungeon()?.background || 'assets/bg/dungeon-battle-01.png'; const bf = $('#battlefield'); bf.dataset.dungeon = this.currentDungeonId; bf.style.backgroundImage = `linear-gradient(#0207134a,#0208171f 58%,#02040b5c),url("${bg}")`; bf.style.backgroundSize = 'auto,cover'; bf.style.backgroundPosition = 'center,center bottom'; bf.style.backgroundRepeat = 'no-repeat,no-repeat'; }
    equippedWeapon() { return D.weapons[this.profile.equipment.rightHand] || D.weapons.mageStaff; }
    progressState() { const f = this.profile.flags, noelGoal = D.battleProgression?.noelEncounterWins || 3, zenakadoGoal = D.battleProgression?.zenakadoEncounterWins || 7; if (!f.noelFirstEncounterCleared) { const wins = Math.max(0, f.preNoelBattleWins || 0); return { phase: 'noel', wins, goal: noelGoal, ready: wins >= noelGoal, bossId: 'noelFirstEncounter', bossName: 'NOËL' }; } if (!f.zenakadoDefeated) { const wins = Math.max(0, f.postNoelBattleWins || 0); return { phase: 'zenakado', wins, goal: zenakadoGoal, ready: wins >= zenakadoGoal, bossId: 'zenakado', bossName: 'ZENAKADO' }; } return { phase: 'complete', wins: zenakadoGoal, goal: zenakadoGoal, ready: false, bossId: null, bossName: 'DUNGEON CLEAR' }; }

    startBattle() {
      this.battleMode = 'slime'; const hadRamenBuff = !!this.profile.flags.ramenBuffActive, stats = this.totalStats(), vitals = this.storedVitals(stats); if (hadRamenBuff) { this.profile.flags.ramenBuffActive = false; this.saveProfile(); } this.player = { stats, hp: D.settings.healOnBattleStart ? stats.maxHp : vitals.hp, mp: D.settings.healOnBattleStart ? stats.maxMp : vitals.mp, inventory: this.profile.inventory, buffs: {}, cooldowns: {} };
      const dungeon = this.getDungeon(), dungeon2 = this.currentDungeonId === 'dungeon2', dungeon3 = this.currentDungeonId === 'dungeon3';
      let wins, lineup;
      if (dungeon2 || dungeon3) {
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
    startBossEncounter() {
      const progress = this.progressState(); if (!progress.ready || !progress.bossId) { this.showMenu('home'); return; }
      this.battleMode = progress.phase; const hadRamenBuff = !!this.profile.flags.ramenBuffActive, stats = this.totalStats(), template = D.enemies[progress.bossId]; if (hadRamenBuff) { this.profile.flags.ramenBuffActive = false; this.saveProfile(); }
      const vitals = this.storedVitals(stats); this.player = { stats, hp: vitals.hp, mp: vitals.mp, inventory: this.profile.inventory, buffs: {}, cooldowns: {} };
      const bossStats = template.dynamicScale ? { maxHp: stats.maxHp * template.dynamicScale, atk: Math.max(stats.str, stats.mag) * template.dynamicScale, def: stats.def * template.dynamicScale, mag: stats.mag * template.dynamicScale, mnd: stats.mnd * template.dynamicScale, spd: stats.agi * template.dynamicScale } : { ...template.stats };
      this.enemies = [{ ...template, uid: `${template.id}-boss`, label: '', stats: bossStats, hp: bossStats.maxHp, alive: true }];
      this.turn = 1; this.locked = false; this.finished = false; this.battleRewards = { exp: 0, gold: 0, drops: {}, levels: [] }; $('#menu-screen').hidden = true; $('#menu-screen').style.display = 'none'; $('#game').hidden = false; $('#game').style.display = 'grid'; $('#result').hidden = true; $('#result').style.display = 'none'; $('#ren').className = 'ren fighter idle'; this.applySetBattleVisual();
      this.renderEnemies(); this.applyEquipmentVisual(); this.updateHUD(); this.setLog(this.battleMode === 'noel' ? '忘却の最奥――永遠の裁定者ノエルが姿を現した……。' : '静寂のホールに、独奏卿ゼナカドの旋律が響く……！'); this.flashTitle('BOSS ENCOUNTER', progress.bossName); this.showMainCommands();
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
          const raw = enemy.stats.atk * balance.enemyPhysical.attackScale - this.player.stats.def * balance.enemyPhysical.defenseScale * defUpBuff;
          const dmg = Math.max(1, Math.round(raw + roll(balance.enemyVariance.min, balance.enemyVariance.max)));
          this.player.hp = Math.max(0, this.player.hp - dmg); this.persistVitals(); this.audio.sfx('playerHit'); this.floating(ren, dmg, 'enemy-damage'); this.updateHUD(); await this.battleSleep(200); ren.classList.remove('hit');
        }
        el.classList.remove('enemy-attacking'); return;
      }
      let r = Math.random(), chosen = enemy.ai[enemy.ai.length - 1], acc = 0;
      for (const s of enemy.ai) { acc += s.weight; if (r < acc) { chosen = s; break; } }
      this.flashTitle(chosen.name, 'BOSS STRIKE'); this.audio.sfx('slash'); el.classList.add('enemy-attacking'); await this.battleSleep(400); ren.classList.add('hit');
      const balance = D.combatBalance, defUpBuff = (this.player.buffs?.defUp && this.turn <= this.player.buffs.defUp.until) ? (1 + (this.player.buffs.defUp.rate || 0)) : 1;
      const raw = enemy.stats.atk * balance.enemyPhysical.attackScale - this.player.stats.def * balance.enemyPhysical.defenseScale * defUpBuff;
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
    renderEnemies() { $('#enemies').classList.toggle('boss-party', this.battleMode !== 'slime'); $('#enemies').innerHTML = this.enemies.map((e, i) => e.kind === 'boss' ? `<button class="enemy boss-enemy fighter idle" id="${e.uid}" data-enemy="${i}" aria-label="${e.name}"><div class="enemy-hud boss-hud"><span>${e.name} // ${e.title}</span><div><i style="width:100%"></i></div><small>???? / ????</small></div><div class="slime-shadow boss-shadow"></div><div class="noel-sprite${e.spriteClass ? ' ' + e.spriteClass : ''}"${e.sprite ? ` style="background-image:url('${e.sprite}')"` : ''}></div></button>` : `<button class="enemy enemy-${e.id} fighter idle delay-${i}" id="${e.uid}" data-enemy="${i}" aria-label="${e.name}${e.label}"><div class="enemy-hud"><span>${e.name} ${e.label}</span><div><i style="width:100%"></i></div></div><div class="slime-shadow"></div><div class="slime"${e.sprite ? ` style="background-image:url('${e.sprite}')"` : ''}></div></button>`).join(''); }
    applyEquipmentVisual() {
      const w = this.equippedWeapon(), layer = $('#weapon-layer'); layer.className = `weapon-layer weapon-${w.weaponType} sprite-${w.weaponSprite}`; layer.dataset.weaponId = w.id; layer.dataset.weaponType = w.weaponType; layer.title = w.name; $('#weapon-name').textContent = `RIGHT HAND // ${w.name}`;
      if (w.battleSprite) layer.style.backgroundImage = `url("${w.battleSprite}")`; else layer.style.removeProperty('background-image');
    }
    applySetBattleVisual() { const ren = $('#ren'), active = this.equippedSeriesCount('zenacad') >= 6; ren.classList.toggle('zenacad-six-set', active); if (active) { ren.classList.add('set-intro'); setTimeout(() => ren.classList.remove('set-intro'), 1800); } }
    updateHUD() {
      const p = this.player, expNeed = this.expNeeded(); $('#player-hp').textContent = `${p.hp} / ${p.stats.maxHp}`; $('#player-mp').textContent = `${p.mp} / ${p.stats.maxMp}`; $('#player-hp-bar').style.width = `${100 * p.hp / p.stats.maxHp}%`; $('#player-mp-bar').style.width = `${100 * p.mp / p.stats.maxMp}%`; const expBar = $('#player-exp-bar'); if (expBar) { expBar.style.width = `${Math.min(100, 100 * this.profile.exp / expNeed)}%`; $('#player-exp-label').textContent = `${this.profile.exp}/${expNeed}`; } const jid = this.profile.currentJob, jst = this.profile.jobs?.[jid] || {}, jlv = jst.level || 1, jneed = this.jobExpNeeded(jlv), jexp = jst.exp || 0, jexpBar = $('#player-jexp-bar'); if (jexpBar) { jexpBar.style.width = jneed ? `${Math.min(100, 100 * jexp / jneed)}%` : '100%'; $('#player-jexp-label').textContent = jneed ? `${jexp}/${jneed}` : 'MAX'; } $('#level').textContent = this.profile.level; $('#turn-label').textContent = `TURN ${String(this.turn).padStart(2, '0')}`;
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
      let html = this.button('たたかう', 'ATTACK', 'attack');
      if (personal.length) html += this.button('固有技', 'PERSONAL ▶', 'personal');
      html += this.button(mainCmd.cmd, `${mainCmd.cmdEn} ▶`, 'mainCmd');
      if (subCmd) html += this.button(subCmd.cmd, `${subCmd.cmdEn} ▶`, 'subCmd');
      html += this.button('アイテム', `ITEM ×${itemCount}`, 'item') + this.button('にげる', 'ESCAPE', 'escape');
      html += `<button class="auto-battle-btn${this.autoBattle ? ' active' : ''}" data-action="auto-toggle"><i></i><strong>${this.autoBattle ? 'AUTO ON' : 'AUTO OFF'}</strong><span>BATTLE MODE</span></button>`;
      this.panel(html);
      this.bindActions({ attack: () => this.chooseTarget('attack'), personal: () => this.showPersonalSkills(), mainCmd: () => this.showCommandSkills(curJobId), subCmd: () => subJobId && this.showCommandSkills(subJobId), item: () => this.showBattleItems(), escape: () => this.tryEscape(), 'auto-toggle': () => { this.autoBattle = !this.autoBattle; this.showMainCommands(); } });
      if (this.autoBattle && !this.locked) setTimeout(() => this.autoPickAction(), 700);
    }
    autoPickAction() { if (!this.autoBattle || this.locked || this.finished) return; const maxHp = this.player.stats.maxHp, maxMp = this.player.stats.maxMp, hpPct = this.player.hp / maxHp; if (hpPct < 0.4 && (this.profile.inventory.potion || 0) > 0) { this.useConsumable('potion'); return; } if (this.player.mp < maxMp * 0.2 && (this.profile.inventory.manaPotion || 0) > 0) { this.useConsumable('manaPotion'); return; } const aliveEnemies = this.enemies.filter(e => e.alive); const skills = this.availableSkills().filter(s => this.player.mp >= s.mp && this.cooldownRemaining(s) === 0); const weapon = this.equippedWeapon(); const atkScore = weapon?.power || 1; let best = { type: 'attack', score: atkScore }; for (const s of skills) { let score = 0; if (s.kind === 'support') { if (s.effect?.type === 'hpRecover') score = hpPct < 0.75 ? (1 - hpPct) * 200 : 0; else if (s.effect?.type === 'mpRecover') score = this.player.mp < maxMp * 0.5 ? 45 : 0; else if (s.effect?.type === 'regenerate') score = hpPct < 0.8 ? 35 : 0; } else if (s.kind === 'hybrid') { score = (s.strScale + s.magScale) * 12; } else { const multi = s.target === 'all' ? Math.min(aliveEnemies.length, 3) * 0.7 : 1; score = (s.power || 1) * (s.hits || 1) * multi; } if (score > best.score) best = { type: 'skill', skill: s, score }; } if (best.type === 'skill') { const s = best.skill; if (s.target === 'all' || s.target === 'self') { this.executeRound(s.id, -1); } else { this.executeRound(s.id, this.enemies.findIndex(e => e.alive)); } } else { this.executeRound('attack', this.enemies.findIndex(e => e.alive)); } }
    showBattleItems() { const hp = D.items.potion, mp = D.items.manaPotion; this.panel(this.button(hp.name, `HP +${hp.effect.hp} // ×${this.profile.inventory.potion || 0}`, 'potion', !(this.profile.inventory.potion > 0) || this.player.hp >= this.player.stats.maxHp) + this.button(mp.name, `MP +${mp.effect.mp} // ×${this.profile.inventory.manaPotion || 0}`, 'manaPotion', !(this.profile.inventory.manaPotion > 0) || this.player.mp >= this.player.stats.maxMp) + this.button('もどる', 'BACK', 'back')); this.bindActions({ potion: () => this.useConsumable('potion'), manaPotion: () => this.useConsumable('manaPotion'), back: () => this.showMainCommands() }); }
    availableSkills() { const skills = [...this.personalSkills(), ...this.jobLearnedActiveSkills(this.profile.currentJob)]; if (this.profile.subCommand) skills.push(...this.jobLearnedActiveSkills(this.profile.subCommand)); const grant = this.equippedWeapon()?.grantsSkillId; if (grant && D.skills[grant]) skills.push(D.skills[grant]); return [...new Map(skills.map(s => [s.id, s])).values()]; }
    cooldownRemaining(skill) { return Math.max(0, (this.player.cooldowns?.[skill.id] || 0) - this.turn); }
    showSkills() { this.showMainCommands(); }
    showPersonalSkills() { const skills = this.personalSkills(); this.panel(skills.map(s => { const cd = this.cooldownRemaining(s); return this.button(s.name, cd ? `CT ${cd}` : `MP ${s.mp}`, s.id, this.player.mp < s.mp || cd > 0); }).join('') + this.button('もどる', 'BACK', 'back')); const actions = { back: () => this.showMainCommands() }; skills.forEach(s => { actions[s.id] = () => this.chooseTarget(s.id); }); this.bindActions(actions); }
    showCommandSkills(jobId) { const skills = this.jobLearnedActiveSkills(jobId); if (!skills.length) { this.setLog('このコマンドの習得済みスキルがありません。'); return; } this.panel(skills.map(s => { const cd = this.cooldownRemaining(s); return this.button(s.name, cd ? `CT ${cd}` : `MP ${s.mp}`, s.id, this.player.mp < s.mp || cd > 0); }).join('') + this.button('もどる', 'BACK', 'back')); const actions = { back: () => this.showMainCommands() }; skills.forEach(s => { actions[s.id] = () => this.chooseTarget(s.id); }); this.bindActions(actions); }
    chooseTarget(skillId) { const skill = D.skills[skillId]; if (skill?.target === 'all' || skill?.target === 'self') { this.executeRound(skillId, -1); return; } $('#phase-label').textContent = 'SELECT TARGET'; this.setLog('攻撃する敵を選択'); this.enemies.forEach((e, i) => { const el = document.getElementById(e.uid); if (e.alive) { el.classList.add('targetable'); el.onclick = () => this.executeRound(skillId, i); } }); this.panel(this.button('もどる', 'BACK', 'back')); this.bindActions({ back: () => { this.clearTargets(); this.showMainCommands(); } }); }
    clearTargets() { this.enemies.forEach(e => { const el = document.getElementById(e.uid); if (el) { el.classList.remove('targetable'); el.onclick = null; } }); }

    async executeRound(skillId, targetIndex) {
      const skill = D.skills[skillId]; const aoe = skill?.target === 'all', self = skill?.target === 'self';
      if (this.locked || !skill || this.cooldownRemaining(skill) > 0 || (!self && (aoe ? !this.enemies.some(e => e.alive) : !this.enemies[targetIndex]?.alive))) return;
      this.locked = true; this.clearTargets(); this.panel(''); $('#phase-label').textContent = 'ACTION'; await this.beginPlayerTurn(); const setEffects = this.activeSetEffects(), freeMp = skill.kind === 'magical' && skill.mp > 0 && Math.random() < (setEffects.freeMagicMpChance || 0); if (!freeMp) this.player.mp -= skill.mp; else this.flashTitle('MAESTRO', 'MP COST 0'); if (skill.cooldown) this.player.cooldowns[skill.id] = this.turn + skill.cooldown; this.persistVitals(); this.updateHUD();
      const actors = [{ type: 'player', speed: this.player.stats.agi + roll(0, 4), act: () => this.playerAction(skill, targetIndex) }]; this.enemies.filter(e => e.alive).forEach(e => actors.push({ type: 'enemy', enemy: e, speed: e.stats.spd + roll(0, 4), act: () => this.enemyAttack(e) })); actors.sort((a, b) => b.speed - a.speed);
      for (const actor of actors) { if (this.finished || this.player.hp <= 0) break; if (actor.type === 'enemy' && !actor.enemy.alive) continue; await actor.act(); await this.battleSleep(300); if (!this.enemies.some(e => e.alive)) { await this.victory(); return; } }
      if (this.player.hp <= 0) { await this.defeat(); return; } this.endPlayerTurn(); this.turn++; this.locked = false; this.updateHUD(); this.showMainCommands();
    }
    effectivePlayerStat(key) { const base = this.player.stats[key] || 0; return key === 'mag' && (this.player.buffs?.blueEcho || 0) > 0 ? base * 1.10 : base; }
    async beginPlayerTurn() { if (this.characterHasSkill('blueEcho') && Math.random() < .20) { this.player.buffs.blueEcho = 2; this.flashTitle('BLUE ECHO', 'MAG +10% // 2 TURNS'); this.setLog('蒼の残響が魔力を高める！'); await this.battleSleep(260); } if ((this.player.buffs.regenerate || 0) > 0) { const heal = Math.max(1, Math.ceil(this.player.stats.maxHp * .08)), gained = Math.min(heal, this.player.stats.maxHp - this.player.hp); this.player.hp += gained; if (gained) { this.audio.sfx('heal'); this.floating($('#ren'), `+${gained}`, 'heal'); this.setLog(`リジェネレートでHPが${gained}回復！`); this.updateHUD(); await this.battleSleep(220); } } }
    endPlayerTurn() { if ((this.player.buffs.blueEcho || 0) > 0) this.player.buffs.blueEcho--; if ((this.player.buffs.regenerate || 0) > 0) this.player.buffs.regenerate--; if (this.player.buffs.defUp && this.turn > this.player.buffs.defUp.until) delete this.player.buffs.defUp; }
    damageFor(skill, enemy) {
      const s = this.player.stats, w = this.equippedWeapon(), balance = D.combatBalance, weaponAttack = skill.id === 'attack', statKey = weaponAttack ? w.damageStat : (skill.kind === 'magical' ? 'mag' : 'str'), stat = this.effectivePlayerStat(statKey), enchLv = weaponAttack ? ((this.profile.weaponEnchants || {})[this.profile.equipment.rightHand] || 0) : 0, basePower = weaponAttack ? w.power : skill.power, power = basePower * (1 + enchLv * 0.10), defDown = this.turn <= (enemy.defDownUntil || 0) ? .15 : 0, effectiveDef = enemy.stats.def * (1 - defDown) * (1 - (skill.ignoreDef || 0));
      let value = skill.kind === 'hybrid' ? this.effectivePlayerStat('str') * skill.strScale + this.effectivePlayerStat('mag') * skill.magScale - effectiveDef : stat * power + s.agi * (skill.agiScale || 0) - effectiveDef;
      value += roll(balance.playerVariance.min, balance.playerVariance.max);
      const critical = Math.random() < clamp(balance.critical.base + s.luk * balance.critical.luckRate + (s.critBonus || 0), balance.critical.base, balance.critical.max + (s.critBonus || 0));
      if (critical) value *= balance.critical.multiplier; return { value: Math.max(1, Math.round(value)), critical };
    }
    async playerAction(skill, targetIndex) { await this.playerAttack(skill, targetIndex); const setFx = this.activeSetEffects(); const repeatChance = setFx.magicRepeatChance || 0; if (skill.kind === 'magical' && this.enemies.some(e => e.alive) && Math.random() < repeatChance) { this.flashTitle('《独奏曲》', 'CADENZA // ENCORE'); this.setLog('ゼナカドの旋律が魔法を再演する！'); await this.battleSleep(360); await this.playerAttack(skill, targetIndex); } const physRepeatChance = setFx.physicalRepeatChance || 0; if (skill.kind === 'physical' && this.enemies.some(e => e.alive) && Math.random() < physRepeatChance) { this.flashTitle('DEADLY RHYTHM', 'MYRTHI // EXTRA BEAT'); this.setLog('鼓動が刻む追加連撃！'); await this.battleSleep(360); await this.playerAttack(skill, targetIndex); } }
    async playerAttack(skill, targetIndex) {
      if (skill.target === 'self') { await this.applySelfSkill(skill); return; }
      if (skill.target === 'all') { await this.playerAttackAll(skill); return; }
      let target = this.enemies[targetIndex]; if (!target.alive) target = this.enemies.find(e => e.alive); if (!target) return; const w = this.equippedWeapon(), staffAttack = skill.id === 'attack' && w.attackMotion === 'staffCast'; this.setLog(staffAttack ? `${w.name}に魔力を集める！` : `${skill.name}！`); if (skill.id !== 'attack') this.flashTitle(skill.name, 'QUICK EXECUTION'); this.audio.sfx(staffAttack ? 'magic' : skill.id === 'quickSlash' ? 'quick' : 'slash');
      const ren = $('#ren'), el = document.getElementById(target.uid), hits = skill.hits || 1; ren.classList.add(staffAttack || skill.kind === 'magical' || skill.kind === 'hybrid' ? 'casting' : 'attacking'); if (staffAttack || skill.kind === 'magical' || skill.kind === 'hybrid') { if (staffAttack) this.flashTitle('MAGIC SHOT', w.name); await this.battleSleep(220); await this.magicProjectile(el); } else await this.battleSleep(220); let total = 0, criticals = 0; for (let hit = 0; hit < hits && target.hp > 0; hit++) { el.classList.add('hit'); const d = this.damageFor(skill, target); total += d.value; if (d.critical) criticals++; target.hp = target.cannotDefeat ? Math.max(1, target.hp - d.value) : Math.max(0, target.hp - d.value); this.floating(el, d.value, d.critical ? 'critical' : 'damage'); this.audio.sfx(d.critical ? 'critical' : 'enemyHit'); this.updateHUD(); await this.battleSleep(hits > 1 ? 190 : 420); el.classList.remove('hit'); } this.setLog(`${criticals ? `CRITICAL ×${criticals}! ` : ''}${target.name}${target.label}に${total}ダメージ！${hits > 1 ? `（${hits}HIT）` : ''}`); ren.classList.remove('attacking', 'casting');
      if (skill.effect?.type === 'enemyDefDown' && target.hp > 0) { target.defDownUntil = this.turn + skill.effect.turns; this.setLog(`${target.name}${target.label}のDEFが15%低下！`); }
      if (skill.effect?.type === 'selfDefDown') { this.player.defDownUntil = this.turn + skill.effect.turns - 1; this.setLog('捨て身斬りの反動でRENのDEFが20%低下！'); }
      if (target.hp <= 0) { target.alive = false; this.audio.sfx('defeat'); el.classList.add('defeated'); target.rolledDrops = this.rollDrops(target); target.rolledDrops.forEach(([id]) => { const item = D.items[id]; if (item) { this.floating(el, item.name, 'heal'); if (item.rarity === 'epic' || item.rarity === 'legendary') this.announceRareDrop(item); } }); const earned = this.grantEnemyReward(target); this.setLog(`${target.name}${target.label}を撃破！ EXP+${earned.exp} GOLD+${earned.gold}`); await this.battleSleep(600); }
    }
    async applySelfSkill(skill) { this.flashTitle(skill.name, skill.nameEn || 'SELF SKILL'); const effect = skill.effect || {}, ren = $('#ren'); ren.classList.add('casting'); await this.battleSleep(260); if (effect.type === 'mpRecover') { const amount = Math.max(1, Math.ceil(this.player.stats.maxMp * effect.maxMpRate)), gained = Math.min(amount, this.player.stats.maxMp - this.player.mp); this.player.mp += gained; this.audio.sfx('heal'); this.floating(ren, `MP +${gained}`, 'heal'); this.setLog(`精神集中でMPが${gained}回復！`); } if (effect.type === 'hpRecover') { const amount = Math.max(1, Math.round(this.player.stats.mnd * effect.mndScale + effect.base)), gained = Math.min(amount, this.player.stats.maxHp - this.player.hp); this.player.hp += gained; this.audio.sfx('heal'); this.floating(ren, `+${gained}`, 'heal'); this.setLog(`ヒールでHPが${gained}回復！`); } if (effect.type === 'regenerate') { this.player.buffs.regenerate = effect.turns + 1; this.audio.sfx('heal'); this.setLog('リジェネレート！ 3ターンの間、HPが回復する。'); } if (effect.type === 'selfDefUp') { this.player.buffs.defUp = { rate: effect.rate, until: this.turn + effect.turns }; this.audio.sfx('heal'); this.floating(ren, `DEF +${Math.round(effect.rate * 100)}%`, 'heal'); this.setLog(`雄叫びでDEFが${Math.round(effect.rate * 100)}%上昇！ ${effect.turns}ターン持続。`); } this.persistVitals(); this.updateHUD(); await this.battleSleep(350); ren.classList.remove('casting'); }
    async playerAttackAll(skill) {
      const targets = this.enemies.filter(e => e.alive); if (!targets.length) return;
      this.setLog(`${skill.name}！`); this.flashTitle(skill.name, 'AREA MAGIC'); this.audio.sfx('magic');
      const ren = $('#ren'); ren.classList.add('casting');
      for (const target of targets) {
        const el = document.getElementById(target.uid); await this.magicProjectile(el); el.classList.add('hit');
        const d = this.damageFor(skill, target); target.hp = target.cannotDefeat ? Math.max(1, target.hp - d.value) : Math.max(0, target.hp - d.value);
        this.floating(el, d.value, d.critical ? 'critical' : 'damage'); this.audio.sfx(d.critical ? 'critical' : 'enemyHit'); this.updateHUD();
        await this.battleSleep(220); el.classList.remove('hit');
        if (target.hp <= 0) { target.alive = false; this.audio.sfx('defeat'); el.classList.add('defeated'); target.rolledDrops = this.rollDrops(target); target.rolledDrops.forEach(([id]) => { const item = D.items[id]; if (item) { this.floating(el, item.name, 'heal'); if (item.rarity === 'epic' || item.rarity === 'legendary') this.announceRareDrop(item); } }); this.grantEnemyReward(target); }
      }
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
      const balance = D.combatBalance, formula = isMagic ? balance.enemyMagic : balance.enemyPhysical, attackStat = isMagic ? enemy.stats.mag : enemy.stats.atk, defenseStat = isMagic ? this.player.stats.mnd : this.player.stats.def * (this.turn <= (this.player.defDownUntil || 0) ? .8 : 1);
      const raw = attackStat * formula.attackScale - defenseStat * formula.defenseScale, miss = Math.random() < clamp((this.player.stats.agi - enemy.stats.spd) * .008, .02, .16), damage = miss ? 0 : Math.max(1, Math.round(raw + roll(balance.enemyVariance.min, balance.enemyVariance.max)));
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
      const defUpBuff = (this.player.buffs?.defUp && this.turn <= this.player.buffs.defUp.until) ? (1 + (this.player.buffs.defUp.rate || 0)) : 1; const attackStat = isMagic ? enemy.stats.mag : enemy.stats.atk, defenseStat = isMagic ? this.player.stats.mnd : this.player.stats.def * defUpBuff * (this.turn <= (this.player.defDownUntil || 0) ? .8 : 1);
      const raw = attackStat * formula.attackScale - defenseStat * formula.defenseScale;
      const damage = Math.max(1, Math.round(raw + roll(balance.enemyVariance.min, balance.enemyVariance.max)));
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
          const recipeIds = unlockMap[matId] || [];
          recipeIds.forEach(rid => {
            if (!(this.profile.unlockedRecipes || []).includes(rid)) {
              this.profile.unlockedRecipes = [...(this.profile.unlockedRecipes || []), rid];
              this.profile.newlyUnlockedRecipes = [...(this.profile.newlyUnlockedRecipes || []), rid];
              this.battleRewards.newRecipes = [...(this.battleRewards.newRecipes || []), rid];
            }
          });
        }
      });
      while (this.profile.exp >= this.expNeeded()) { const beforeLevel = this.profile.level, before = clone(this.profile.baseStats); this.profile.exp -= this.expNeeded(); this.profile.level++; Object.entries(D.player.growth).forEach(([k, v]) => this.profile.baseStats[k] += v); levels.push({ from: beforeLevel, to: this.profile.level, before, after: clone(this.profile.baseStats) }); }
      this.syncSkillUnlocks();
      if (levels.length) { const stats = this.totalStats(); this.profile.currentVitals = { hp: stats.maxHp, mp: stats.maxMp }; if (this.player) { this.player.stats = stats; this.player.hp = stats.maxHp; this.player.mp = stats.maxMp; } } else this.persistVitals();
      this.saveProfile(); return levels;
    }
    isRecipeUnlocked(recipe) { if (!recipe.materialUnlockId) return true; return (this.profile.unlockedRecipes || []).includes(recipe.id); }
    grantJobExp(amount) { const jobId = this.profile.currentJob, job = D.jobs[jobId], progress = this.profile.jobs[jobId], from = progress.level, learnedBefore = new Set(this.profile.learnedJobSkills || []); const gained = Math.floor(Math.max(0, amount) / 4); progress.exp += gained; while (progress.level < D.jobLevelCap) { const need = this.jobExpNeeded(progress.level); if (!need || progress.exp < need) break; progress.exp -= need; progress.level++; } if (progress.level >= D.jobLevelCap) progress.exp = 0; this.syncSkillUnlocks(); this.checkAdvancedJobUnlocks(); const learned = (this.profile.learnedJobSkills || []).filter(id => !learnedBefore.has(id)); this.saveProfile(); return { jobId, jobName: job.name, jobNameEn: job.nameEn, exp: gained, from, to: progress.level, learned }; }
    jobResultHTML(result) { if (!result) return ''; return `<div class="job-result"><small>JOB EXPERIENCE</small><strong>${result.jobName} <em>${result.jobNameEn}</em></strong><span>JEXP <b>+${result.exp}</b></span>${result.to > result.from ? `<h3>JOB LEVEL UP!　Lv.${result.from} → Lv.${result.to}</h3>` : ''}${result.learned.length ? `<div>${result.learned.map(id => `<b>NEW SKILL　${D.skills[id].name}</b>`).join('')}</div>` : ''}</div>`; }
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
      const rewardBlock = `${this.rewardHTML(reward, levels)}${this.jobResultHTML(jobResult)}${newRecipeHTML}`;
      if (this.battleMode === 'slime') { if (this.currentDungeonId === 'dungeon3') { this.profile.flags.dungeon3BattleWins = (this.profile.flags.dungeon3BattleWins || 0) + 1; } else if (this.currentDungeonId === 'dungeon2') { this.profile.flags.dungeon2BattleWins = (this.profile.flags.dungeon2BattleWins || 0) + 1; } else { if (this.profile.flags.noelFirstEncounterCleared) this.profile.flags.postNoelBattleWins = (this.profile.flags.postNoelBattleWins || 0) + 1; else this.profile.flags.preNoelBattleWins = (this.profile.flags.preNoelBattleWins || 0) + 1; this.profile.flags.normalBattleWins = (this.profile.flags.normalBattleWins || 0) + 1; } this.saveProfile(); }
      if (this.battleMode === 'zenakado') { const firstClear = !this.isBossDefeated('zenacad'), firstScore = !this.profile.flags.zenakadoScoreClaimed; this.markBossDefeated('zenacad'); this.profile.flags.zenakadoDefeated = false; this.profile.flags.postNoelBattleWins = 0; this.profile.flags.temporaryBossCompleted = true; if (firstScore) { this.profile.musicScores.cadenzaLoot = true; this.profile.flags.zenakadoScoreClaimed = true; } this.saveProfile(); const stolen = firstClear ? '<div class="boss-recipe-unlock"><small>PHANTOM STEAL</small><b>NEW RECIPES STOLEN</b><strong>《ZENACAD SERIES》</strong><span>工房に BOSS EQUIPMENT と JOB SYSTEM が追加された！</span></div>' : ''; this.showResult('VICTORY', '独奏卿ゼナカドを打ち倒し、禁断の楽譜と装備製法を盗み出した！', 'BOSS CLEARED', `${rewardBlock}${firstScore ? this.scoreGetHTML('cadenzaLoot') : ''}${stolen}`); return; }
      if (this.battleMode === 'myrthi') { this.markBossDefeated('myrthi'); this.profile.flags.dungeon2BattleWins = (this.profile.flags.dungeon2BattleWins || 0) + 1; this.profile.flags.dungeon2Clear = true; this.saveProfile(); this.showResult('VICTORY', '黒紅の双刃戦姫ミルティを打ち倒した！ ミルティシリーズの製法を奪い取った！', 'BOSS CLEARED', `${rewardBlock}<div class="boss-recipe-unlock"><small>PHANTOM STEAL</small><b>NEW RECIPES STOLEN</b><strong>《MYRTHI SERIES》</strong><span>工房にMYRTHI SERIESが追加された！</span></div>`); return; }
      const progress = this.progressState(); if (this.battleMode === 'slime' && progress.ready) { const label = progress.phase === 'noel' ? '永遠の裁定者ノエル' : '独奏卿ゼナカド'; this.showResult('VICTORY', '闇を切り裂き、戦利品を獲得した。', 'BATTLE COMPLETE', `${rewardBlock}<div class="workshop-unlock boss-signal"><b>BOSS SIGNAL</b><strong>${label}の反応を確認！</strong><span>拠点からボス遭遇へ進めます。</span></div>`); } else { await this.showBattleClear(reward, levels, jobResult); }
    }
    async showBattleClear(reward, levels, jobResult) {
      this.locked = false;
      const drops = Object.entries(reward.drops), parts = [`EXP <b>+${reward.exp}</b>`, `GOLD <b>+${reward.gold}</b>`];
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
    renderMenuSummary() { const t = this.totalStats(), v = this.storedVitals(t), need = this.expNeeded(), workshopUnlocked = !!this.profile.flags.noelFirstEncounterCleared, buff = !!this.profile.flags.ramenBuffActive, progress = this.progressState(); $('#menu-level').textContent = `LV.${String(this.profile.level).padStart(2,'0')}`; $('#menu-hp').textContent = `${v.hp} / ${t.maxHp}`; $('#menu-mp').textContent = `${v.mp} / ${t.maxMp}`; $('#hideout-hp-bar').style.width = `${100 * v.hp / t.maxHp}%`; $('#hideout-mp-bar').style.width = `${100 * v.mp / t.maxMp}%`; $('#menu-gold').textContent = this.profile.gold.toLocaleString('ja-JP'); $('#menu-exp-text').textContent = `${this.profile.exp} / ${need}`; $('#menu-exp-bar').style.width = `${100 * this.profile.exp / need}%`; const jid = this.profile.currentJob, jst = this.profile.jobs?.[jid] || {}, jlv = jst.level || 1, jneed = this.jobExpNeeded(jlv), jexp = jst.exp || 0; const jexpText = $('#menu-jexp-text'), jexpBar = $('#menu-jexp-bar'); if (jexpText) jexpText.textContent = jneed ? `${jexp} / ${jneed}` : 'MASTER'; if (jexpBar) jexpBar.style.width = jneed ? `${Math.min(100, 100 * jexp / jneed)}%` : '100%'; $('#workshop-nav').hidden = !workshopUnlocked; const bossButton = $('#menu-screen [data-menu="boss"]'); const d2Wins = this.profile.flags.dungeon2BattleWins || 0, myrthiReady = d2Wins >= 10 && !this.isBossDefeated('myrthi'); if (myrthiReady) { bossButton.hidden = false; bossButton.firstChild.textContent = '黒紅の双刃を追う'; bossButton.querySelector('span').textContent = `MYRTHI // BATTLE ${Math.min(d2Wins, 10)} / 10`; } else { bossButton.hidden = !progress.ready; bossButton.firstChild.textContent = progress.phase === 'noel' ? 'ノエルの反応を追う' : 'ゼナカドの旋律を追う'; bossButton.querySelector('span').textContent = `${progress.bossName} // BATTLE ${Math.min(progress.wins, progress.goal)} / ${progress.goal}`; } const buffEl = $('#hideout-buff'); buffEl.classList.toggle('active', buff); buffEl.querySelector('strong').textContent = buff ? '最大HP ＋3%' : '効果なし'; buffEl.querySelector('span').textContent = buff ? '効果：次のダンジョン1回のみ' : 'カズのまかないで次の潜入を強化'; }
    renderMenuPanel(name) {
      [...$('#menu-nav').querySelectorAll('button')].forEach(b => b.classList.toggle('active', b.dataset.menu === name)); const panel = $('#menu-panel'); panel.hidden = name === 'home'; if (name === 'home') { panel.innerHTML = ''; return; }
      if (name === 'status') { const base = this.profile.baseStats, bonus = this.equipmentBonuses(), total = this.totalStats(); panel.innerHTML = `<small>CHARACTER DATA</small><h2>ステータス</h2><div class="stat-grid">${Object.keys(statLabels).map(k => `<div><span>${statLabels[k]}</span><b>${total[k]}</b><em>基本 ${base[k]}${bonus[k] ? ` / 装備 +${bonus[k]}` : ''}</em></div>`).join('')}</div>`; }
      if (name === 'items') { const stats = this.totalStats(), vitals = this.storedVitals(stats), rows = Object.entries(this.profile.inventory).filter(([,n])=>n>0).map(([id,n]) => { const i=D.items[id]; if (!i) return ''; const recoverable = i.category === 'consumable' && (i.effect?.hp || i.effect?.mp), full = i.effect?.hp ? vitals.hp >= stats.maxHp : i.effect?.mp ? vitals.mp >= stats.maxMp : true; return `<div class="item-row rarity-${i.rarity}"><div><b>${i.name}</b><small>${i.description}</small></div><strong>×${n}</strong>${recoverable ? `<button data-use-item="${id}" ${full ? 'disabled' : ''}>${full ? '満タン' : '使う'}</button>` : ''}</div>`; }).join(''); panel.innerHTML = `<small>INVENTORY</small><h2>アイテム</h2><div class="inventory-vitals"><b>HP ${vitals.hp} / ${stats.maxHp}</b><b>MP ${vitals.mp} / ${stats.maxMp}</b></div><div class="inventory-list">${rows || '<p>所持品なし</p>'}</div>`; }
      if (name === 'dungeon-select') { this.renderDungeonSelect(panel); return; }
      if (name === 'equipment') this.renderEquipmentPanel(panel);
      if (name === 'workshop') this.renderWorkshop(panel);
      if (name === 'food') { const active = !!this.profile.flags.ramenBuffActive, stats = this.totalStats(), vitals = this.storedVitals(stats), full = vitals.hp >= stats.maxHp && vitals.mp >= stats.maxMp, price = Math.floor(this.profile.gold * .3), canEat = !active || !full, coming = (D.foodMenu?.comingSoon || []).map(item => `<article class="food-coming-card" aria-disabled="true"><i aria-hidden="true"></i><b>${item.name}</b><span>COMING SOON</span></article>`).join(''); panel.innerHTML = `<small>KAZU'S SPECIAL</small><h2>カズのまかない</h2><div class="food-panel"><div class="food-bowl" aria-hidden="true"></div><div class="food-copy"><strong>店主特製・怪盗まかない</strong><span>HP・MPを全回復。次のダンジョン1回だけ最大HPが3%上昇します。</span><em>料金：所持GOLDの30％　<b>${price.toLocaleString('ja-JP')} GOLD</b></em><button class="eat-food" data-eat-food ${canEat ? '' : 'disabled'}>${canEat ? 'まかないを食べる' : '全回復・効果発動中'}</button></div></div><section class="food-coming"><header><b>NEXT MENU</b><span>COMING SOON</span></header><div>${coming}</div></section>`; }
      if (name === 'archive') { const noelSeen = this.profile.flags.noelFirstEncounterCleared, zenakadoSeen = this.profile.flags.zenakadoDefeated || (this.profile.flags.postNoelBattleWins || 0) >= D.battleProgression.zenakadoEncounterWins; panel.innerHTML = `<small>PHANTOM ARCHIVE</small><h2>図鑑</h2><div class="hideout-feature"><article><b>ダンジョン1の怪異</b><span>スライム、ソルメイジ、鼠賊、ゴブリン、ナイトバット、ゴーストボーンを確認。</span></article>${noelSeen ? '<article><b>ノエル // 永遠の裁定者</b><span>初回遭遇記録。現在の戦力では討伐不能。</span></article>' : '<article><b>未確認の裁定者</b><span>通常戦を3回制すると反応を追跡できます。</span></article>'}${zenakadoSeen ? '<article><b>ゼナカド // 独奏卿</b><span>静寂のホールを支配するダンジョン1ボス。</span></article>' : ''}</div>`; }
      if (name === 'job') this.renderJobPanel(panel);
      if (name === 'system') { const volumes = this.audio.getVolumes(), row = (id,label,sub,badge='') => `<label class="volume-row"><span><b>${label}</b><small>${sub}</small></span><input type="range" min="0" max="100" step="1" value="${volumes[id]}" data-volume="${id}" aria-label="${label}音量"><output data-volume-value="${id}">${volumes[id]}%</output>${badge ? `<em>${badge}</em>` : ''}</label>`; panel.innerHTML = `<small>AUDIO & SYSTEM</small><h2>設定</h2><section class="sound-settings"><header><b>サウンド音量</b><span>変更はこの端末へ自動保存されます</span></header>${row('bgm','BGM','戦闘・拠点・ボス戦の音楽')}${row('sfx','効果音','攻撃・被弾・決定音')}${row('voice','VOICE','戦闘ボイス用の予約設定','COMING SOON')}</section><div class="system-actions"><button data-watch-opening>WATCH OPENING<span>オープニングを再生</span></button><button class="danger" data-reset-data>DATA RESET<span>セーブデータを消去</span></button></div><section class="sound-settings save-transfer"><header><b>セーブデータの引き継ぎ</b><span>別ブラウザ・別URLでも復元できます</span></header><p class="save-transfer-note">「コードを書き出す」で表示される文字列をコピーし、別のブラウザ側の設定画面で「コードを読み込む」に貼り付けてください。</p><div class="system-actions"><button data-export-save>コードを書き出す<span>EXPORT CODE</span></button><button data-import-save>コードを読み込む<span>IMPORT CODE</span></button></div>${this.saveTransferMode === 'export' ? `<div class="save-transfer-box"><textarea readonly rows="4" data-transfer-output onclick="this.select()">${this.saveTransferExportCode || ''}</textarea><small>自動でコピーしました。コピーされない場合は上の文字列を選択してコピーしてください。</small></div>` : ''}${this.saveTransferMode === 'import' ? `<div class="save-transfer-box"><textarea rows="4" placeholder="ここにコードを貼り付け" data-transfer-input></textarea><button data-import-save-confirm>この内容で読み込む</button></div>` : ''}</section><div class="hideout-feature system-info"><article><b>自動セーブ</b><span>レベル・装備・所持品・GOLD・解放状態をこの端末に保存中。</span></article><article><b>Ver.0.3 START FLOW</b><span>タイトル・プロローグ・キャラクター選択を実装。</span></article></div>`; }
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
      const adv = ['arcaneMaestro', 'dualBlade'], base = ['warrior', 'mage', 'martialArtist', 'priest'];
      const card = id => { const j = D.jobs[id], p = this.profile.jobs[id], isAdv = adv.includes(id), avail = isAdv ? this.isAdvancedJobUnlocked(id) : unlocked || id === 'mage', isCur = id === currentId; return `<button class="jcard${isCur ? ' cur' : ''}${avail ? '' : ' locked'}" data-job-detail="${id}"><div class="jcard-name">${j.name}<small>${j.nameEn}</small></div><div class="jcard-lv">${avail ? `Lv.${p.level}` : 'LOCKED'}</div>${isCur ? '<em class="jcard-cur">●</em>' : ''}</button>`; };
      const notice = !unlocked ? '<p class="job-lock-notice">JOBシステムは独奏卿ゼナカドの撃破後に解禁。現在は魔導士のみ使用可能。</p>' : '';
      return `${notice}<section class="jsec"><h4>基本JOB <span>BASE JOB</span></h4><div class="jgrid">${base.map(card).join('')}</div></section><section class="jsec"><h4>上位JOB <span>ADVANCED JOB</span></h4><div class="jgrid">${adv.map(card).join('')}</div></section>`;
    }
    jobDetailHtml(jobId, unlocked, currentId) {
      const j = D.jobs[jobId], p = this.profile.jobs[jobId], isAdv = ['arcaneMaestro', 'dualBlade'].includes(jobId), avail = isAdv ? this.isAdvancedJobUnlocked(jobId) : unlocked || jobId === 'mage', isCur = jobId === currentId, need = this.jobExpNeeded(p.level), bar = need ? Math.round(100 * p.exp / need) : 100;
      const bonuses = this.activeJobBonuses(jobId), bHtml = Object.entries(bonuses).length ? Object.entries(bonuses).map(([k, v]) => `<div class="jbn-item"><span>${statLabels[k] || k}</span><b>${k === 'critBonus' ? `+${Math.round(v * 100)}%` : `+${v}`}</b></div>`).join('') : '<span class="jbn-none">なし</span>';
      const skillRows = Object.entries(j.skillUnlocks || {}).sort(([a], [b]) => +a - +b).map(([lv, id]) => { const s = D.skills[id], learned = p.level >= +lv; return `<button class="jar${learned ? ' learned' : ' locked'}"${learned ? ` data-job-skill-detail="${id}"` : ''}><span class="jar-lv">Lv.${lv}</span><span class="jar-nm">${s?.name || id}</span><em class="jar-type">${s?.type === 'PASSIVE' ? 'P' : 'A'}</em><small class="jar-st">${learned ? '習得済' : 'LOCK'}</small></button>`; }).join('');
      let condHtml = '';
      if (isAdv && !avail && j.unlockCondition) { const c = j.unlockCondition, bOk = c.bossDefeated ? this.isBossDefeated(c.bossDefeated) : true, bName = c.bossDefeated ? (D.enemies[c.bossDefeated]?.name || c.bossDefeated) : ''; const jcs = Object.entries(c.jobLevels || {}).map(([rid, rlv]) => { const cur = this.profile.jobs[rid]?.level || 0, ok = cur >= rlv; return `<div class="cond-row${ok ? ' ok' : ' ng'}"><b>${ok ? '✓' : '✕'} ${D.jobs[rid]?.name || rid} Lv${rlv}</b><small>現在 Lv.${cur}</small></div>`; }).join(''); condHtml = `<div class="jconds"><h4>解放条件</h4>${bName ? `<div class="cond-row${bOk ? ' ok' : ' ng'}"><b>${bOk ? '✓' : '✕'} ${bName}を撃破</b></div>` : ''}${jcs}</div>`; }
      return `<div class="jdetail"><button class="jback-btn" data-job-back>← JOB一覧</button><div class="jdetail-hdr"><div><b>${j.name}</b><small>${j.nameEn}</small></div><em class="jdetail-badge">${isCur ? 'CURRENT' : avail ? `Lv.${p.level}` : 'LOCKED'}</em></div>${avail ? `<div class="jexp-wrap"><div class="jlv-row"><b>JOB Lv.${p.level}</b><span>JEXP ${need ? `${p.exp} / ${need}` : 'MASTER'}</span></div><div class="jexp-bar"><i style="width:${bar}%"></i></div></div><div class="jbonus"><h4>JOB BONUS</h4><div class="jbn-grid">${bHtml}</div></div>${isCur ? '<div class="jcur-badge">現在のJOB</div>' : `<button class="jchange-btn" data-job-change="${jobId}">このJOBに変更<span>JOB CHANGE</span></button>`}<div class="jskills"><h4>ABILITY</h4><div class="jar-list">${skillRows}</div></div>` : `<p class="jlocked-note">${j.description}</p>${condHtml}`}</div>`;
    }
    abilitySetHtml(currentId) {
      const mainCmd = this.jobCommand(currentId), subId = this.profile.subCommand, subCmd = subId ? this.jobCommand(subId) : null, subJob = subId ? D.jobs[subId] : null;
      const ps = this.profile.passiveSlots || [null, null], p0 = ps[0] ? D.skills[ps[0]] : null, p1 = ps[1] ? D.skills[ps[1]] : null;
      const personal = (D.characterSkillProgression || []).map(e => { const s = D.skills[e.skillId], ok = this.profile.level >= e.level; return `<div class="per-row${ok ? ' learned' : ' locked'}"${ok ? ` data-job-skill-detail="${e.skillId}"` : ''}><span>Lv.${e.level}</span><b>${s?.name || e.skillId}</b><em>${s?.type === 'PASSIVE' ? 'PASSIVE' : 'ACTIVE'}</em><small>${ok ? '習得済' : 'LOCK'}</small></div>`; }).join('');
      return `<div class="abset"><div class="abset-block"><div class="ab-row"><div class="ab-lbl"><small>MAIN COMMAND</small><span>現在JOB固定・自動設定</span></div><div class="ab-val filled"><b>${mainCmd.cmd}</b><small>${mainCmd.cmdEn}</small></div></div></div><div class="abset-block"><button class="ab-row ab-btn" data-open-modal="subCommand"><div class="ab-lbl"><small>SUB COMMAND</small><span>他JOBの技を装備</span></div><div class="ab-val${subCmd ? ' filled' : ''}"><div>${subCmd ? `<b>${subCmd.cmd}</b><small>${subJob?.name} Lv.${this.profile.jobs[subId]?.level || 1}</small>` : '<b>────</b><small>未設定</small>'}</div><em>▶</em></div></button></div><div class="abset-block"><button class="ab-row ab-btn" data-open-modal="passive0"><div class="ab-lbl"><small>PASSIVE 1</small></div><div class="ab-val${p0 ? ' filled' : ''}"><div>${p0 ? `<b>${p0.name}</b><small>${p0.effectText || ''}</small>` : '<b>────</b><small>未設定</small>'}</div><em>▶</em></div></button><button class="ab-row ab-btn" data-open-modal="passive1"><div class="ab-lbl"><small>PASSIVE 2</small></div><div class="ab-val${p1 ? ' filled' : ''}"><div>${p1 ? `<b>${p1.name}</b><small>${p1.effectText || ''}</small>` : '<b>────</b><small>未設定</small>'}</div><em>▶</em></div></button></div><div class="abset-block"><h4 class="abset-h">固有技 <span>PERSONAL SKILLS</span></h4><div class="per-list">${personal}</div></div></div>`;
    }
    subCmdModalHtml(currentId) {
      const avail = Object.values(D.jobs).filter(j => { if (j.id === currentId) return false; const isAdv = ['arcaneMaestro', 'dualBlade'].includes(j.id); return isAdv ? this.isAdvancedJobUnlocked(j.id) : this.jobSystemUnlocked() || j.id === 'mage'; });
      const rows = avail.map(j => { const cmd = this.jobCommand(j.id), p = this.profile.jobs[j.id], hasSkills = this.jobLearnedActiveSkills(j.id).length > 0, sel = this.profile.subCommand === j.id; return `<button class="modal-row${sel ? ' sel' : ''}" data-set-sub-command="${j.id}"><div><b>${cmd.cmd}</b><small>${j.name} Lv.${p.level}${!hasSkills ? ' ── 習得技なし' : ''}</small></div><em>${sel ? '✓' : ''}</em></button>`; }).join('');
      const clear = this.profile.subCommand ? `<button class="modal-row modal-clear" data-set-sub-command="">SUB COMMANDを外す</button>` : '';
      return `<div class="jmodal-bg" data-close-modal><div class="jmodal"><div class="jmodal-hdr"><b>SUB COMMAND</b><button data-close-modal class="jmodal-close">✕</button></div><div class="jmodal-body">${rows}${clear}</div></div></div>`;
    }
    passiveModalHtml(slotIdx) {
      const passives = this.allLearnedPassives(), cur = (this.profile.passiveSlots || [])[slotIdx], filter = this.jobUI?.passiveFilter || 'all', other = slotIdx === 0 ? 1 : 0;
      const srcs = ['all', ...new Set(passives.map(p => p.source === 'character' ? 'character' : p.jobId).filter(Boolean))];
      const filterHtml = srcs.map(f => { const lbl = f === 'all' ? 'ALL' : f === 'character' ? '蓮' : D.jobs[f]?.name || f; return `<button class="pf-btn${filter === f ? ' active' : ''}" data-passive-filter="${f}">${lbl}</button>`; }).join('');
      const filtered = passives.filter(p => filter === 'all' || (filter === 'character' && p.source === 'character') || p.jobId === filter);
      const rows = filtered.length ? filtered.map(p => { const sel = cur === p.id, othSel = (this.profile.passiveSlots || [])[other] === p.id; return `<button class="modal-row${sel ? ' sel' : ''}${othSel ? ' dis' : ''}" data-set-passive="${slotIdx}:${p.id}" ${othSel ? 'disabled' : ''}><div><b>${p.name}</b><small>${p.effectText || ''}</small></div><em>${sel ? '✓' : ''}</em></button>`; }).join('') : '<p class="modal-empty">習得済みPASSIVEがありません</p>';
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
        const progress = d.id === 'dungeon1' ? (() => { const p = this.progressState(); return p.phase === 'complete' ? 'AREA BOSS CLEARED' : `BATTLE ${Math.min(p.wins, p.goal)} / ${p.goal}`; })() : d.id === 'dungeon2' ? (this.isBossDefeated('myrthi') ? 'AREA BOSS CLEARED' : `BATTLE ${Math.min(this.profile.flags.dungeon2BattleWins || 0, 10)} / 10`) : `BATTLE ${Math.min(this.profile.flags.dungeon3BattleWins || 0, 15)} / 15`;
        return `<button class="dungeon-card" data-enter-dungeon="${d.id}"><div class="dungeon-thumb" style="background-image:url('${d.thumbnail}')"></div><div class="dungeon-info"><small>${d.nameEn || d.enName || d.name}</small><strong>${d.name}</strong><span>${d.description || ''}</span><em>推奨 Lv.${d.recommendedLevel}+</em><b class="dungeon-progress">${progress}</b>${isNew ? '<mark class="dungeon-new">NEW</mark>' : ''}</div></button>`;
      }).join('')}</div>`;
    }
    changeJob(id) {
      const isAdv = ['arcaneMaestro', 'dualBlade'].includes(id);
      if (!D.jobs[id] || id === this.profile.currentJob) return;
      if (isAdv && !this.isAdvancedJobUnlocked(id)) return;
      if (!isAdv && !this.jobSystemUnlocked() && id !== 'mage') return; const before = this.totalStats(), vitals = this.storedVitals(before); this.profile.currentJob = id; const after = this.totalStats(); this.profile.currentVitals = { hp: Math.min(vitals.hp, after.maxHp), mp: Math.min(vitals.mp, after.maxMp) }; if (this.player) { this.player.stats = after; this.player.hp = Math.min(this.player.hp, after.maxHp); this.player.mp = Math.min(this.player.mp, after.maxMp); } this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('job');
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
      const recipes = Object.values(D.recipes || {}).filter(r => { const item = D.items[r.resultItemId]; return this.isRecipeUnlocked(r) && (r.craftCategory || 'weapon') === craftCategory && (craftCategory !== 'armor' || item?.slot === armorFilter) && (filter === 'all' || r.dungeonId === filter); });
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
        const invCount = this.profile.inventory[w.id] || 0, hasSpare = isEquipped ? invCount >= 1 : invCount >= 2;
        if (level >= et.maxLevel) return `<article class="enchant-card max"><b>${w.name}</b><span>+${level} MAX</span><small>最大強化達成</small></article>`;
        const nextLevel = level + 1, rate = et.successRates[level], cost = et.goldCosts[level], rateText = `${Math.round(rate * 100)}%`, canAfford = this.profile.gold >= cost;
        const canEnchant = hasSpare && canAfford;
        const spareText = isEquipped ? `所持 ×${invCount}（1個装備中）` : `所持 ×${invCount}`;
        return `<article class="enchant-card${level > 0 ? ' enhanced' : ''}"><div class="enchant-card-header"><b>${w.name}</b><strong>+${level} → +${nextLevel}</strong></div><div class="enchant-card-body"><span>成功率 <b>${rateText}</b></span><span>費用 <b>${cost} GOLD</b></span><small>${spareText}</small>${!hasSpare ? '<small class="enchant-warn">同じ武器が追加で必要</small>' : ''}${!canAfford ? '<small class="enchant-warn">GOLD不足</small>' : ''}</div><button data-enchant="${w.id}" ${canEnchant ? '' : 'disabled'}>強化する</button></article>`;
      }).join('');
      return `<div class="workshop-section-title"><b>武器強化</b><span>WEAPON ENCHANT</span></div><p class="workshop-warning">同じ武器1個を素材として強化します。+3まで成功率100%。+4以降は失敗で武器が消滅します。</p><div class="enchant-grid">${cards}</div>`;
    }
    enchantWeapon(weaponId) {
      const w = D.weapons[weaponId]; if (!w) return;
      const enchants = this.profile.weaponEnchants || {}, level = enchants[weaponId] || 0, et = D.enchantTable;
      if (level >= et.maxLevel) return;
      const isEquipped = this.profile.equipment.rightHand === weaponId, invCount = this.profile.inventory[weaponId] || 0, hasSpare = isEquipped ? invCount >= 1 : invCount >= 2, cost = et.goldCosts[level];
      if (!hasSpare || this.profile.gold < cost) return;
      this.profile.gold -= cost;
      this.profile.inventory[weaponId] = (this.profile.inventory[weaponId] || 0) - 1;
      const success = Math.random() < et.successRates[level];
      if (success) {
        this.profile.weaponEnchants[weaponId] = level + 1;
        this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('workshop');
      } else {
        delete this.profile.weaponEnchants[weaponId];
        if (isEquipped) this.profile.equipment.rightHand = 'mageStaff'; else this.profile.inventory[weaponId] = Math.max(0, (this.profile.inventory[weaponId] || 0) - 1);
        this.saveProfile(); this.audio.sfx('defeat'); this.renderMenuSummary(); this.renderMenuPanel('workshop');
        alert(`武器強化FAILED！\n${w.name}は粉砕された……`);
      }
    }
    armorEnchantContent() {
      const et = D.enchantTable, enchants = this.profile.armorEnchants || {};
      const armorSlots = ['head','body','arms','feet','accessory','leftHand'];
      const armors = Object.values(D.items || {}).filter(item => item.category === 'equipment' && armorSlots.includes(item.slot));
      if (!armors.length) return '<p>強化可能な防具がありません。</p>';
      const cards = armors.map(item => {
        const id = item.id, level = enchants[id] || 0;
        const isEquipped = Object.values(this.profile.equipment).includes(id);
        const invCount = this.profile.inventory[id] || 0, hasSpare = isEquipped ? invCount >= 1 : invCount >= 2;
        if (level >= et.maxLevel) return `<article class="enchant-card max"><b>${item.name}</b><span>+${level} MAX</span><small>最大強化達成</small></article>`;
        const nextLevel = level + 1, rate = et.successRates[level], cost = et.goldCosts[level], rateText = `${Math.round(rate * 100)}%`, canAfford = this.profile.gold >= cost;
        const canEnchant = hasSpare && canAfford;
        const spareText = isEquipped ? `所持 ×${invCount}（1個装備中）` : `所持 ×${invCount}`;
        return `<article class="enchant-card${level > 0 ? ' enhanced' : ''}"><div class="enchant-card-header"><b>${item.name}</b><strong>+${level} → +${nextLevel}</strong></div><div class="enchant-card-body"><span>成功率 <b>${rateText}</b></span><span>費用 <b>${cost} GOLD</b></span><small>${spareText}</small>${!hasSpare ? '<small class="enchant-warn">同じ防具が追加で必要</small>' : ''}${!canAfford ? '<small class="enchant-warn">GOLD不足</small>' : ''}</div><button data-armor-enchant="${id}" ${canEnchant ? '' : 'disabled'}>強化する</button></article>`;
      }).join('');
      return `<div class="workshop-section-title"><b>防具強化</b><span>ARMOR ENCHANT</span></div><p class="workshop-warning">同じ防具1個を素材として強化します。+3まで成功率100%。+4以降は失敗で防具が消滅します。</p><div class="enchant-grid">${cards}</div>`;
    }
    enchantArmor(itemId) {
      const item = D.items[itemId]; if (!item) return;
      const enchants = this.profile.armorEnchants || {}, level = enchants[itemId] || 0, et = D.enchantTable;
      if (level >= et.maxLevel) return;
      const isEquipped = Object.values(this.profile.equipment).includes(itemId), invCount = this.profile.inventory[itemId] || 0, hasSpare = isEquipped ? invCount >= 1 : invCount >= 2, cost = et.goldCosts[level];
      if (!hasSpare || this.profile.gold < cost) return;
      this.profile.gold -= cost;
      this.profile.inventory[itemId] = (this.profile.inventory[itemId] || 0) - 1;
      const success = Math.random() < et.successRates[level];
      if (success) {
        this.profile.armorEnchants[itemId] = level + 1;
        this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('workshop');
      } else {
        delete this.profile.armorEnchants[itemId];
        if (isEquipped) { const slot = item.slot; if (this.profile.equipment[slot] === itemId) this.profile.equipment[slot] = null; }
        else this.profile.inventory[itemId] = Math.max(0, (this.profile.inventory[itemId] || 0) - 1);
        this.saveProfile(); this.audio.sfx('defeat'); this.renderMenuSummary(); this.renderMenuPanel('workshop');
        alert(`防具強化FAILED！\n${item.name}は粉砕された……`);
      }
    }
    bonusText(id) {
      const bonuses = this.equipmentDefinition(id)?.bonuses || {}, rows = Object.entries(bonuses), w = D.weapons[id], enchLv = w ? ((this.profile.weaponEnchants || {})[id] || 0) : 0;
      const enchStr = enchLv > 0 ? ` [+${enchLv}]` : '';
      return rows.length ? rows.map(([key, value]) => `${statLabels[key] || key.toUpperCase()} ${value >= 0 ? '+' : ''}${value}`).join(' / ') + enchStr : '補正なし' + enchStr;
    }
    equipmentPreviewHTML(id) {
      if (!id) return `<div class="equipment-empty-preview"><b>装備候補を選択</b><span>候補をタップすると、現在装備との能力差を確認できます。</span></div>`;
      const item = D.items[id], currentId = this.profile.equipment[item.slot], currentItem = D.items[currentId], nextEquipment = { ...this.profile.equipment, [item.slot]: id }, before = this.totalStats(), after = this.totalStats(nextEquipment), active = currentId === id;
      const rows = Object.keys(statLabels).map(key => { const delta = after[key] - before[key], state = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same', change = delta ? `${delta > 0 ? '+' : ''}${delta} ${delta > 0 ? '↑' : '↓'}` : '－'; return `<div class="compare-row ${state}"><span>${statLabels[key]}</span><b>${before[key]}</b><i>→</i><strong>${after[key]}</strong><em>${change}</em></div>`; }).join('');
      const isDualBlade = this.profile.currentJob === 'dualBlade', isWeapon = !!D.weapons[id], leftActive = this.profile.equipment.leftHand === id;
      const leftBtn = isDualBlade && isWeapon ? `<button class="equip-confirm" data-equip-left="${id}" ${leftActive ? 'disabled' : ''} style="margin-top:.4rem">${leftActive ? '左手装備中' : '左手に装備'}<span>${leftActive ? 'L-EQUIPPED' : 'L-EQUIP'}</span></button>` : '';
      return `<div class="equipment-swap"><div><small>現在装備</small><b>${currentItem?.name || 'なし'}</b><span>${currentId ? this.bonusText(currentId) : '補正なし'}</span></div><i>→</i><div><small>変更後</small><b>${item.name}</b><span>${this.bonusText(id)}</span></div></div><div class="equipment-description">${item.description}</div><div class="compare-table"><div class="compare-head"><span>能力</span><b>現在</b><i></i><strong>装備後</strong><em>変化</em></div>${rows}</div><button class="equip-confirm" data-equip-confirm="${id}" ${active ? 'disabled' : ''}>${active ? '装備中' : 'この装備に変更'}<span>${active ? 'EQUIPPED' : 'EQUIP'}</span></button>${leftBtn}`;
    }
    musicScoreSectionHTML() { const scores = Object.values(D.musicScores || {}); return `<section class="music-score-section"><h3>楽曲 <span>MUSIC SCORE // PRIVATE MODE</span></h3><div>${scores.map(score => { const owned = !!this.profile.musicScores?.[score.id]; return `<article class="music-score-card ${owned ? 'owned' : 'locked'}"><i>♪</i><div><small>${owned ? 'PLAYABLE SCORE' : 'LOCKED SCORE'}</small><b>${owned ? score.title : '????????'}</b><strong>${owned ? `（${score.subtitle}）` : 'ゼナカド初回撃破で解放'}</strong><span>${owned ? score.description : 'まだ演奏できません。'}</span></div><em>${owned ? 'PRIVATE MODE ITEM' : 'LOCKED'}</em></article>`; }).join('')}</div></section>`; }
    bossSetBonusSectionHTML() { const seriesList = this.unlockedBossSeries(); if (!seriesList.length) return ''; return seriesList.map(series => { const count = this.equippedSeriesCount(series.id); return `<section class="boss-set-section"><header><div><small>BOSS EQUIPMENT SET</small><h3>${series.name}</h3></div><strong>${count} / ${series.equipment.length} EQUIPPED</strong></header><div>${Object.entries(series.setBonuses || {}).map(([needed, bonus]) => `<article class="${count >= Number(needed) ? 'active' : ''}"><b>${needed} SET — ${bonus.name}</b><span>${bonus.description}</span></article>`).join('')}</div></section>`; }).join(''); }
    renderEquipmentPanel(panel) {
      const slots = D.equipmentSlots || [], owned = Object.entries(this.profile.inventory).filter(([id, n]) => n > 0 && D.items[id]?.category === 'equipment');
      if (this.selectedEquipmentId && !(this.profile.inventory[this.selectedEquipmentId] > 0)) this.selectedEquipmentId = null;
      const isDualBlade = this.profile.currentJob === 'dualBlade';
      const slotHtml = slots.map(slot => { const id = this.profile.equipment[slot.id], item = D.items[id]; const rate = isDualBlade && slot.id === 'leftHand' && D.weapons[id] ? ' ×70%' : ''; return `<div class="equipment-slot ${id ? 'filled' : 'empty'} ${slot.id === 'leftHand' && !isDualBlade ? 'slot-disabled' : ''}"><span>${slot.name}<small>${slot.enName}</small></span><b>${item?.name || 'なし'}${rate}</b></div>`; }).join('');
      const candidateHtml = owned.map(([id]) => { const item = D.items[id], active = this.profile.equipment[item.slot] === id, selected = this.selectedEquipmentId === id, slot = slots.find(s => s.id === item.slot); return `<button data-equip-preview="${id}" aria-pressed="${selected}" class="equipment-candidate rarity-${item.rarity} ${active ? 'equipped-now' : ''} ${selected ? 'selected' : ''}"><span class="candidate-title"><b>${item.name}${item.stars ? `<small>${'★'.repeat(item.stars)}</small>` : ''}</b>${active ? '<em>EQUIPPED</em>' : ''}</span><strong>${this.bonusText(id)}</strong><small>${slot?.name || item.slot} // ${item.description}</small></button>`; }).join('');
      panel.innerHTML = `<small>EQUIPMENT</small><h2>装備</h2><div class="equipment-screen"><section class="equipment-slots-wrap"><h3>装備中 <span>CURRENT LOADOUT</span></h3><div class="equipment-slots">${slotHtml}</div></section><section class="equipment-workbench"><div class="equipment-candidates"><h3>装備一覧 <span>OWNED EQUIPMENT</span></h3>${candidateHtml || '<p>装備品を所持していません。</p>'}</div><div id="equipment-preview" class="equipment-preview"><h3>能力比較 <span>STATUS COMPARISON</span></h3>${this.equipmentPreviewHTML(this.selectedEquipmentId)}</div></section>${this.bossSetBonusSectionHTML()}${this.musicScoreSectionHTML()}</div>`;
    }
    previewEquipment(id) { const item = D.items[id]; if (!item || item.category !== 'equipment' || !(this.profile.inventory[id] > 0)) return; this.selectedEquipmentId = id; this.renderMenuPanel('equipment'); requestAnimationFrame(() => $('#equipment-preview')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })); }
    equipItem(id) { const item = D.items[id]; if (!item || item.category !== 'equipment' || !(this.profile.inventory[id] > 0)) return; this.profile.equipment[item.slot] = id; this.saveProfile(); this.audio.sfx('heal'); this.renderMenuSummary(); this.renderMenuPanel('equipment'); }
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
        case 'myrthi_available': return (f.dungeon2BattleWins || 0) >= 9 && !this.isBossDefeated('myrthi');
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
