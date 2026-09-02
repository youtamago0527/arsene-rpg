const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'menu.css'), 'utf8');

function expect(pattern, message) {
  if (!pattern.test(css)) throw new Error(message);
}

expect(
  /\.equipment-preview-overlay\s*\{[^}]*overflow-y:\s*auto/s,
  'The full-screen equipment preview must scroll instead of clipping its contents.'
);
expect(
  /\.equipment-candidate\s*>\s*strong,[\s\S]*?overflow-wrap:\s*anywhere/s,
  'Equipment bonus summaries must wrap on narrow screens.'
);
expect(
  /@media\s*\(max-width:\s*480px\)[\s\S]*?\.equipment-preview-overlay\s*>\s*\.compare-table\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s,
  'The active full-screen preview must use the compact mobile comparison grid.'
);
expect(
  /\.equipment-preview-overlay\s*>\s*\.equip-confirm\s*\{[^}]*position:\s*sticky/s,
  'The equip action must remain reachable while the preview scrolls.'
);

console.log('equipment_mobile_layout_regression: ok');
