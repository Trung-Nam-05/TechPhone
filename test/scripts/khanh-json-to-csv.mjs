import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function esc(v) {
  if (v == null || v === '') return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const j = JSON.parse(fs.readFileSync(path.join(root, 'json', 'Khanh.json'), 'utf8'));
let n = 1;
const hdr =
  'No.,Testcase ID,Test Objective,Step Action,Test Data,Expected Result,Actual Result,Status,Screenshot';
const rows = j.map((r) =>
  [n++, r.testId, r.testObjective, r.stepAction, r.testData || '', r.expectedResult || '', '', '', '']
    .map(esc)
    .join(','),
);
fs.writeFileSync(path.join(root, 'Khanh_TestCases.csv'), [hdr, ...rows].join('\r\n'), 'utf8');
console.log('Wrote Khanh_TestCases.csv', rows.length);
