/**
 * Parse TestReport CSV → JSON (handles quoted fields with commas).
 * Groups (theo nhóm chức năng F1…F10):
 *   Khánh  = TC_F1.* … TC_F3.*  (f123)
 *   Hùng   = TC_F4.* … TC_F6.*  (f456)
 *   Phú    = TC_F7.* … TC_F10.* (f78910)
 *
 * Nếu tồn tại `test/Khanh_TestCases.csv` (cùng header với TestReport), các case F1–F3
 * lấy từ file đó; không thì lấy từ CSV chính như trước.
 * Tương tự `test/Hung_TestCases.csv` cho F4–F6.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const csvPath = path.join(root, 'TestReport (1).csv');
const khanhCsvPath = path.join(root, 'Khanh_TestCases.csv');
const hungCsvPath = path.join(root, 'Hung_TestCases.csv');
const outDir = path.join(root, 'json');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      current += c;
    } else if (c === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current);
  return result.map((s) => {
    let t = s.trim();
    if (t.startsWith('"') && t.endsWith('"')) {
      t = t.slice(1, -1).replace(/""/g, '"');
    }
    return t;
  });
}

/** Parse một file TestReport-style CSV → mảng record (merge dòng tiếp nối). */
function parseRecords(csvFilePath) {
  const raw = fs.readFileSync(csvFilePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);

  const records = [];
  let current = null;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    while (cols.length < 9) cols.push('');

    const no = cols[0]?.trim();
    const testId = cols[1]?.trim();
    const objective = cols[2]?.trim();
    const stepAction = cols[3]?.trim();
    const testData = cols[4]?.trim();
    const expected = cols[5]?.trim();
    const actual = cols[6]?.trim();
    const status = cols[7]?.trim();
    const screenshot = cols[8]?.trim();

    if (testId && /^TC_F\d+/i.test(testId)) {
      if (current) records.push(current);
      current = {
        rowNo: no || null,
        testId,
        testObjective: objective || null,
        stepAction: stepAction || '',
        testData: testData || null,
        expectedResult: expected || null,
        actualResult: actual || null,
        status: status || null,
        screenshot: screenshot || null,
      };
    } else if (current && (stepAction || testData)) {
      if (stepAction) {
        current.stepAction = current.stepAction
          ? `${current.stepAction}\n${stepAction}`
          : stepAction;
      }
      if (testData) {
        current.testData = current.testData
          ? `${current.testData} | ${testData}`
          : testData;
      }
    }
  }
  if (current) records.push(current);
  return records;
}

function groupFromTestId(testId) {
  const m = /^TC_F(\d+)\./i.exec(String(testId || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n >= 1 && n <= 3) return 'khanh';
  if (n >= 4 && n <= 6) return 'hung';
  if (n >= 7 && n <= 10) return 'phu';
  return null;
}

function main() {
  const records = parseRecords(csvPath);
  let khanh = [];
  let hung = [];
  const phu = [];

  if (fs.existsSync(khanhCsvPath)) {
    khanh = parseRecords(khanhCsvPath).filter((r) => groupFromTestId(r.testId) === 'khanh');
  }
  if (fs.existsSync(hungCsvPath)) {
    hung = parseRecords(hungCsvPath).filter((r) => groupFromTestId(r.testId) === 'hung');
  }

  for (const r of records) {
    const g = groupFromTestId(r.testId);
    if (g === 'khanh') {
      if (!fs.existsSync(khanhCsvPath)) khanh.push(r);
    } else if (g === 'hung') {
      if (!fs.existsSync(hungCsvPath)) hung.push(r);
    } else if (g === 'phu') phu.push(r);
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'Khanh.json'), JSON.stringify(khanh, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'Hung.json'), JSON.stringify(hung, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'Phu.json'), JSON.stringify(phu, null, 2), 'utf8');

  const khanhSrc = fs.existsSync(khanhCsvPath) ? 'Khanh_TestCases.csv' : 'TestReport (1).csv';
  const hungSrc = fs.existsSync(hungCsvPath) ? 'Hung_TestCases.csv' : 'TestReport (1).csv';
  console.log(
    `Wrote: Khanh=${khanh.length} (from ${khanhSrc}), Hung=${hung.length} (from ${hungSrc}), Phu=${phu.length}, main rows=${records.length}`,
  );
}

main();
