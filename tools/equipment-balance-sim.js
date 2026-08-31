/* 装備進行の簡易バランス検証。実ゲームデータを読み、docsへ結果を保存する。 */
'use strict';
const fs = require('fs');
const path = require('path');
global.window = global;
require('../js/data.js');
require('../js/equipment_progression.js');
const D = global.ARSENE_DATA;

const jobs = [
  ['warrior', '戦士', 'sword'], ['martialArtist', '武道家', 'martial'], ['mage', '魔導士', 'staff'],
  ['priest', '僧侶', 'staff'], ['arcaneMaestro', '魔奏士', 'instrument'], ['dualBlade', '双刃士', 'sword']
];
const tiers = [
  { id: 'dungeon1', label: 'D1 ★2', stage: 'd1', level: 5, assumedBattles: 12 },
  { id: 'dungeon2', label: 'D2 進化★3', stage: 'd2e', level: 12, assumedBattles: 150 },
  { id: 'dungeon3', label: 'D3 進化★3', stage: 'd3e', level: 20, assumedBattles: 300 }
];
const armorSlots = ['leftHand', 'head', 'body', 'arms', 'feet', 'accessory'];

function jobStats(jobId, level) {
  const stats = { ...D.player.baseStats };
  const growth = D.jobs[jobId]?.growth || {};
  for (let lv = 1; lv <= level; lv++) for (const [key, value] of Object.entries(growth[lv] || {})) stats[key] = (stats[key] || 0) + value;
  return stats;
}
function weaponId(type, stage) {
  if (type === 'instrument' && stage === 'd1') return 'forge_d1_staff';
  return `forge_${stage}_${type}`;
}
function loadout(jobId, type, tier) {
  const right = weaponId(type, tier.stage), equipment = { rightHand: right };
  armorSlots.forEach(slot => equipment[slot] = `forge_${tier.stage}_${slot}`);
  if (jobId === 'dualBlade' && tier.id !== 'dungeon1') equipment.leftHand = right;
  return equipment;
}
function definition(id) { return D.weapons[id] || D.armors[id] || D.accessories[id]; }
function combat(equipment) {
  const out = { attackPower: 0, magicAttackPower: 0, defensePower: 0, magicDefensePower: 0 };
  Object.entries(equipment).forEach(([slot, id]) => {
    const def = definition(id); if (!def) return;
    const rate = slot === 'leftHand' && D.weapons[id] ? D.dualBladeOffHandRate : 1;
    Object.keys(out).forEach(key => out[key] += (def[key] || 0) * rate);
  });
  return out;
}
function enemiesFor(dungeonId) { return Object.values(D.enemies).filter(e => e.kind !== 'boss' && e.dungeonId === dungeonId); }
function median(values) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)] || 1; }
function simulate(jobId, type, tier) {
  const stats = jobStats(jobId, tier.level), eq = loadout(jobId, type, tier), weapon = D.weapons[eq.rightHand], c = combat(eq);
  const rule = weapon.scaling ? { scaling: weapon.scaling, powerKey: weapon.powerKey || 'attackPower', damageType: weapon.damageType || 'physical' } : D.weaponScaling[weapon.weaponType];
  const attack = Object.entries(rule.scaling).reduce((sum, [key, rate]) => sum + (stats[key] || 0) * rate, 0) + c[rule.powerKey];
  const pool = enemiesFor(tier.id), enemyHp = median(pool.map(e => e.stats.maxHp)), enemyDef = median(pool.map(e => rule.damageType === 'magical' ? (e.stats.mnd || e.stats.def) : e.stats.def));
  const normalDamage = Math.max(1, Math.round(attack - enemyDef)), turns = Math.max(1, Math.ceil(enemyHp / normalDamage));
  const enemyAtk = median(pool.map(e => Math.max(e.stats.atk || 0, e.stats.mag || 0))), incoming = enemyAtk * .74 * 40 / (40 + stats.vit + c.defensePower);
  const survivalHits = Math.max(1, Math.floor(stats.maxHp / Math.max(1, incoming)));
  return { attack: Math.round(attack), normalDamage, turns, survivalHits, physicalDefense: Math.round(stats.vit + c.defensePower), magicDefense: Math.round(stats.mnd + c.magicDefensePower) };
}

const rows = [];
for (const [jobId, jobName, type] of jobs) for (const tier of tiers) rows.push({ jobId, jobName, type, tier, ...simulate(jobId, type, tier) });
const lines = [
  '# 装備進行バランステスト', '', `実行日時: ${new Date().toISOString()}`, '',
  '## 前提', '',
  '- 実ゲームのJOB成長・武器スケーリング・敵中央値を使用した決定論的シミュレーション。',
  '- 工房品だけを装備し、★4ドロップ・★5ボスセット・強化・パッシブ・会心は除外。',
  '- D1は★2、D2とD3は進化★3。魔奏士は楽器がD2解放のため、D1のみ杖で代用。',
  '- 双刃士はD2以降、左手武器を70%換算で加算。', '',
  '## JOB別結果', '',
  '| JOB | 段階 | 攻撃性能 | 通常攻撃推定 | 中央敵撃破ターン | 物防 | 魔防 | 推定耐久回数 |',
  '|---|---:|---:|---:|---:|---:|---:|---:|'
];
rows.forEach(r => lines.push(`| ${r.jobName} | ${r.tier.label} | ${r.attack} | ${r.normalDamage} | ${r.turns} | ${r.physicalDefense} | ${r.magicDefense} | ${r.survivalHits} |`));
lines.push('', '## 優劣の読み取り', '',
  '- 戦士：剣の安定火力と物理防御が強み。工房品にSTR補正が無いため、JOB成長の価値が明確。',
  '- 武道家：STR＋AGI参照でD2以降の伸びが良い。★4のAGI装備やミルティ装備と高い相乗効果。',
  '- 魔導士：杖の魔法攻撃力を最も素直に活かす。D1工房だけでも安定し、ゼナカド装備ではMAG側が補助される。',
  '- 僧侶：単発火力は控えめだが、魔法防御・回復・MP再生で長期周回が有利。',
  '- 魔奏士：D1では楽器が無く準備期間。D2からDEX参照の楽器で本領を発揮し、ゼナカド6SETが最終候補。',
  '- 双刃士：D2解放後に左右武器で最大火力。ただし装備を2本要求するため完成が遅く、ミルティ7SETが完成形。', '',
  '## クリア時間目標', '',
  '| ダンジョン | 目標 | 現構成の根拠 | 判定 |',
  '|---|---:|---|---|',
  '| D1 | 30分前後 | 約12戦＋ノエル／ゼナカド導線。★4率4%。 | 維持 |',
  '| D2 | 2〜3時間 | 3階×50勝＝150戦。★4率1.8%。 | 維持 |',
  '| D3 | 6〜8時間 | 装備収集想定300戦、★4率0.8%。現時点では最終ボス未実装。 | 暫定維持 |', '',
  '## 要再確認', '',
  '- 実機では消費MPと回復薬消費を含むため、D2・D3の連戦継続時間を継続測定する。',
  '- D3最終ボス実装時に、300戦相当の進行条件と★5シリーズを確定する。',
  '- ★4コンプリート率は実ドロップログを1000戦以上集計して再調整する。', ''
);
const output = lines.join('\n');
const outPath = path.resolve(__dirname, '../docs/equipment-balance-report.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, 'utf8');
console.log(output);
