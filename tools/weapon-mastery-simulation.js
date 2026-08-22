/* eslint-disable no-console */
'use strict';

// 武器学倍率だけを比較しやすくする固定ビルドのモンテカルロ試験。
// 使い方: node tools/weapon-mastery-simulation.js
global.window = global;
require('../js/data.js');
const D = global.ARSENE_DATA;

const TRIALS = 3000;
const masteryLevels = [20, 50, 100, 200];
const stats = { str: 145, vit: 125, mag: 230, mnd: 130, agi: 75, dex: 165, luk: 55 };
const scenarios = {
  D1: D.enemies.ghostBone,
  D2: D.enemies.silenceWarden,
  D3: D.enemies.crimsonBehemoth
};
const builds = {
  sword: { weaponId: 'd3WarriorBlade', skillId: 'tripleSlash' },
  martial: { weaponId: 'd3MartialClaw', skillId: 'galeFist' },
  staff: { weaponId: 'd3MageStaff', skillId: 'fireLance' },
  instrument: { weaponId: 'd3MaestroInstrument', skillId: 'cleaningRodStrike' },
  shield: { weaponId: 'd3GuardianAegis', skillId: 'revengeForce' }
};

let seed = 0xA25E0E;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000);
const randInt = (min, max) => Math.floor(random() * (max - min + 1)) + min;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function equipmentPower(weapon, key) {
  return Number(weapon?.[key]) || 0;
}

function attackPower(type, weapon) {
  if (type === 'shield') {
    const physical = stats.vit + equipmentPower(weapon, 'defensePower');
    const magical = stats.mnd + equipmentPower(weapon, 'magicDefensePower');
    return physical * (D.guardianBalance?.shieldDefRate ?? .5) + magical * (D.guardianBalance?.shieldMdefRate ?? .5);
  }
  const rule = D.weaponScaling[type];
  const scaled = Object.entries(rule.scaling || {}).reduce((sum, [key, rate]) => sum + (stats[key] || 0) * rate, 0);
  return scaled + equipmentPower(weapon, rule.powerKey);
}

function critChance(skill, weapon) {
  const c = D.combatBalance.critical;
  const gear = Number(weapon?.effects?.criticalRateBonus) || 0;
  const extra = (Number(skill.criticalModifier) || 0) + gear;
  return clamp(c.base + stats.luk * c.luckRate + extra, c.base, c.max + extra);
}

function hitChance(type, skill, enemy) {
  const a = D.accuracy;
  return clamp(a.base + stats.dex * a.dexRate - (enemy.stats.agi ?? enemy.stats.spd ?? 0) * (a.defenderAgiRate ?? a.enemySpdRate) + (D.weaponScaling[type]?.accuracyModifier || 0) + (skill.accuracyModifier || 0), a.min, a.max);
}

function simulateAction(type, build, enemy, masteryLevel) {
  const weapon = D.weapons[build.weaponId], skill = D.skills[build.skillId];
  const hits = skill.hits || skill.hitCount || 1;
  let total = 0, landed = 0, criticals = 0;
  for (let i = 0; i < hits; i++) {
    const critical = random() < critChance(skill, weapon);
    if (!critical && random() >= hitChance(type, skill, enemy)) continue;
    landed++; if (critical) criticals++;
    const magical = skill.damageType === 'magical' || skill.kind === 'magical' || D.weaponScaling[type]?.damageType === 'magical';
    const defense = Number(enemy.stats[magical ? 'mnd' : 'def'] ?? enemy.stats.def) || 0;
    const effectiveDefense = defense * (critical ? .5 : 1);
    let value = attackPower(type, weapon) * (skill.power ?? 1) + stats.agi * (skill.agiScale || 0) - effectiveDefense + randInt(D.combatBalance.playerVariance.min, D.combatBalance.playerVariance.max);
    if (!magical) value *= 1 + (Number(weapon?.effects?.physicalDamagePercent) || 0);
    if (critical) value *= D.combatBalance.critical.multiplier;
    value *= 1 + masteryLevel * D.growthBalance.weaponMasteryDamagePerLevel;
    total += Math.max(1, Math.round(value));
  }
  return { total, landed, criticals, hits };
}

const output = {};
for (const [dungeon, enemy] of Object.entries(scenarios)) {
  output[dungeon] = {};
  for (const level of masteryLevels) {
    const rows = [];
    for (const [type, build] of Object.entries(builds)) {
      let total = 0, landed = 0, criticals = 0, attempted = 0;
      for (let i = 0; i < TRIALS; i++) {
        const r = simulateAction(type, build, enemy, level);
        total += r.total; landed += r.landed; criticals += r.criticals; attempted += r.hits;
      }
      rows.push({ type, skill: D.skills[build.skillId].name, averageDamage: total / TRIALS, hitRate: landed / attempted, criticalRate: criticals / attempted });
    }
    output[dungeon][level] = rows.sort((a, b) => b.averageDamage - a.averageDamage);
  }
}

console.log(JSON.stringify({ trialsPerCombination: TRIALS, stats, scenarios: Object.fromEntries(Object.entries(scenarios).map(([key, enemy]) => [key, enemy.name])), results: output }, null, 2));
