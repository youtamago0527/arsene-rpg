(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  if (!D) return;

  const DEFAULT_ROLE_TAGS = {
    warrior: ['PHYSICAL_DPS', 'SHIELD', 'COUNTER', 'VERSATILE'],
    mage: ['MAGIC_DPS', 'AOE', 'MP_CONTROL'],
    martialArtist: ['PHYSICAL_DPS', 'MULTI_HIT', 'EVASION', 'CRITICAL'],
    priest: ['HEAL', 'MAGIC_DEFENSE', 'FARM', 'SUSTAIN'],
    magicKnight: ['HYBRID_DPS', 'DOUBLE_ACTION', 'BUFF', 'INSTRUMENT'],
    guardian: ['TANK', 'SHIELD', 'RESONANCE', 'DAMAGE_REDUCTION'],
    dualBlade: ['PHYSICAL_DPS', 'MULTI_HIT', 'DUAL_WIELD', 'AGILITY'],
    phantomThief: ['COPY', 'GROWTH_INHERIT', 'BUILD_CUSTOMIZE'],
    ronin: ['PHYSICAL_DPS', 'EVASION', 'COUNTER', 'KATANA'],
    hunter: ['PHYSICAL_DPS', 'RANGED', 'DEX', 'DOT', 'DEBUFF'],
    runeLancer: ['HYBRID_DPS', 'ELEMENT', 'WEAKNESS', 'SUSTAIN'],
    darkKnight: ['PHYSICAL_DPS', 'HP_COST', 'PIERCE', 'GREATSWORD']
  };
  const roleTagsOf = job => job?.roleTags || DEFAULT_ROLE_TAGS[job?.id] || [];

  const activeJobIds = () => [...new Set([
    ...(D.startingJobIds || []),
    ...(D.advancedJobIds || []),
    ...(D.futureJobIds || []),
    'magicKnight', 'guardian', 'dualBlade', 'phantomThief'
  ])].filter(id => D.jobs?.[id]);
  const jobSkills = id => Object.values(D.skills || {}).filter(s => s.jobId === id && s.type !== 'PASSIVE');
  const regularJobSkills = (id, job) => jobSkills(id).filter(skill => skill.id !== job?.signatureSkillId);
  const refs = job => [
    ...(job.signatureSkillId ? [job.signatureSkillId] : []),
    ...Object.values(job.passiveUnlocks || {}),
    ...Object.values(job.skillUnlocks || {})
  ];
  const duplicateMap = (entries, valueOf) => {
    const map = new Map();
    for (const entry of entries) {
      const value = valueOf(entry);
      if (value == null || value === '') continue;
      const key = String(value).trim().toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry.id);
    }
    return [...map.entries()].filter(([, ids]) => ids.length > 1).map(([value, ids]) => ({ value, ids }));
  };

  function auditJob(id) {
    const job = D.jobs?.[id], issues = [];
    if (!job) return { id, name: id, status: 'ERROR', issues: ['JOB定義が存在しない'] };
    const special = !!job.special || !!job.noGrowth;
    const growth = D.growthBalance?.jobGrowthPerLevel?.[id] || job.growth;
    const command = D.jobCommandAbilities?.[id];
    if (!job.name) issues.push('日本語名なし');
    if (!job.nameEn) issues.push('英語名なし');
    if (!job.description) issues.push('説明なし');
    if (!special && !growth) issues.push('成長設定なし');
    if (!command) issues.push('JOBコマンドなし');
    if (!special && !job.signatureSkillId) issues.push('MASTER固有技なし');
    if (!special && !Object.keys(job.passiveUnlocks || {}).length) issues.push('パッシブ未設定');
    if (!special && !Object.keys(job.skillUnlocks || {}).length && regularJobSkills(id, job).length) issues.push('JOB技データがskillUnlocksへ未接続');
    for (const skillId of refs(job)) {
      const skill = D.skills?.[skillId];
      if (!skill) issues.push(`参照切れスキル: ${skillId}`);
      else if (skill.jobId && skill.jobId !== id) issues.push(`所属不一致: ${skillId} → ${skill.jobId}`);
    }
    const growthSum = D.growthBalance?.jobGrowthPerLevel?.[id]
      ? Object.values(D.growthBalance.jobGrowthPerLevel[id]).reduce((a, b) => a + (Number(b) || 0), 0)
      : null;
    if (growthSum != null && growthSum !== 6) issues.push(`Lv成長合計が基準6ではない: ${growthSum}`);
    return { id, name: job.name || id, status: issues.length ? 'CHECK' : 'OK', issues };
  }

  function duplicateIssues() {
    const jobs = activeJobIds().map(id => ({ id, ...D.jobs[id] })), out = [];
    for (const [label, key] of [['日本語名', 'name'], ['英語名', 'nameEn'], ['固有技', 'signatureSkillId']]) {
      for (const d of duplicateMap(jobs, x => x[key])) out.push(`${label}重複「${d.value}」: ${d.ids.join(' / ')}`);
    }
    const passiveOwners = new Map();
    for (const j of jobs) for (const id of Object.values(j.passiveUnlocks || {})) {
      if (!passiveOwners.has(id)) passiveOwners.set(id, []);
      passiveOwners.get(id).push(j.id);
    }
    for (const [id, owners] of passiveOwners) if (owners.length > 1) out.push(`パッシブ重複「${id}」: ${owners.join(' / ')}`);
    return out;
  }

  function auditCandidate(candidate = {}) {
    const issues = [], jobs = activeJobIds().map(id => ({ id, ...D.jobs[id] }));
    if (!candidate.id) issues.push('内部IDが未入力');
    else if (D.jobs?.[candidate.id]) issues.push(`内部ID「${candidate.id}」は使用済み`);
    for (const [label, key] of [['日本語名', 'name'], ['英語名', 'nameEn'], ['固有技', 'signatureSkillId']]) {
      if (!candidate[key]) issues.push(`${label}が未入力`);
      const hit = jobs.find(j => candidate[key] && String(j[key] || '').toLowerCase() === String(candidate[key]).toLowerCase());
      if (hit) issues.push(`${label}が${hit.name}（${hit.id}）と重複`);
    }
    const tags = new Set(candidate.roleTags || []);
    if (!tags.size) issues.push('roleTagsが未入力');
    for (const j of jobs) {
      const jt = new Set(roleTagsOf(j)), overlap = [...tags].filter(t => jt.has(t));
      if (tags.size && jt.size && overlap.length === tags.size) issues.push(`役割が${j.name}と完全重複: ${overlap.join(' / ')}`);
    }
    return { ok: !issues.length, candidate: candidate.id || '(未入力)', issues };
  }

  const template = () => ({
    id: '', name: '', nameEn: '', description: '', category: 'unlock', roleTags: [],
    unlockCondition: {}, weaponTypes: [], equipmentRules: { rightHand: '', leftHand: '', shield: false },
    growthPerLevel: { str: 0, vit: 0, mag: 0, mnd: 0, agi: 0, dex: 0, luk: 0 },
    growthStats: [], trait: { id: '', name: '', effect: '', rebirthStep: 0, max: 0 },
    passiveUnlocks: { 1: '', 5: '', 10: '', 15: '' }, signatureSkillId: '',
    skillUnlocks: { 3: '', 6: '', 9: '', 12: '', 16: '' },
    command: { cmd: '', cmdEn: '' }, battleLoop: '', strengths: [], weaknesses: [], synergies: [],
    balanceTargets: { dpsRank: null, damageTakenRank: null, goldRank: null }
  });

  function report() {
    const jobs = activeJobIds().map(auditJob), duplicates = duplicateIssues();
    console.table(jobs.map(j => ({ id: j.id, JOB: j.name, 役割: roleTagsOf(D.jobs[j.id]).join(' / '), 状態: j.status, 確認事項: j.issues.join(' / ') || 'なし' })));
    if (duplicates.length) console.warn('[JOB AUDIT] 重複', duplicates);
    return { jobs, duplicates, template: template() };
  }

  window.ARSENE_JOB_AUDIT = { report, auditJob, auditCandidate, duplicateIssues, template, activeJobIds, roleTagsOf };
  const initial = report();
  if (initial.jobs.some(j => j.status !== 'OK') || initial.duplicates.length) console.warn('[JOB AUDIT] 未完成または要確認のJOBがあります。');
})();
