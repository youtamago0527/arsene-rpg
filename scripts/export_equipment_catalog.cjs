/* ARSÈNE RPG: current equipment catalog exporter.
 * Run from the RPG root with: node scripts/export_equipment_catalog.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

global.window = global;
require('../js/data.js');
require('../js/equipment_progression.js');

const D = global.ARSENE_DATA;
const csv = value => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const compact = value => {
  if (!value || !Object.keys(value).length) return '';
  return JSON.stringify(value);
};
const definitionOf = id => D.weapons?.[id] || D.armors?.[id] || D.accessories?.[id] || {};
const statusOf = item => item.futureOnly || item.reserved ? '予約' : item.devOnly ? 'DEV' : item.legacy ? '旧装備' : '現行';

const headers = [
  'ID', '名称', '★', 'レアリティ', '状態', 'ダンジョン', '入手区分', '部位', '武器種',
  'ATK', 'MAG_ATK', 'DEF', 'MDEF', '基礎能力補正', '特殊効果', 'シリーズ', '推奨JOB', '説明'
];

const rows = Object.values(D.items || {})
  .filter(item => item?.category === 'equipment')
  .map(item => {
    const def = definitionOf(item.id);
    return {
      item,
      values: [
        item.id,
        item.name,
        item.stars || '',
        item.rarity || '',
        statusOf(item),
        item.catalogDungeon || item.dungeonId || def.dungeonId || '',
        item.source || def.source || '',
        item.slot || def.slot || '',
        def.weaponType || '',
        def.attackPower || 0,
        def.magicAttackPower || 0,
        def.defensePower || 0,
        def.magicDefensePower || 0,
        compact(def.bonuses),
        compact(def.effects),
        item.seriesId || def.seriesId || '',
        (item.recommendedJobs || def.recommendedJobs || []).join('|'),
        item.description || ''
      ]
    };
  })
  .sort((a, b) => {
    const av = a.values, bv = b.values;
    return String(av[5]).localeCompare(String(bv[5]), 'ja')
      || Number(av[2] || 0) - Number(bv[2] || 0)
      || String(av[7]).localeCompare(String(bv[7]), 'ja')
      || String(av[1]).localeCompare(String(bv[1]), 'ja');
  });

const output = [headers, ...rows.map(row => row.values)].map(row => row.map(csv).join(',')).join('\r\n') + '\r\n';
const target = path.resolve(__dirname, '../docs/equipment-data-current-v01.csv');
fs.writeFileSync(target, output, 'utf8');

const counts = {};
for (const { values } of rows) {
  const key = `${values[4]} / ★${values[2] || '未設定'}`;
  counts[key] = (counts[key] || 0) + 1;
}
console.log(`Exported ${rows.length} equipment rows to ${target}`);
console.log(counts);
