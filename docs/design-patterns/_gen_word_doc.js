/**
 * Convert KICH-BAN markdown -> Word HTML (.doc) — mo duoc bang Microsoft Word tren Windows.
 * Run: node docs/design-patterns/_gen_word_doc.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(__dirname, 'KICH-BAN-TRINH-BAY-20PHUT.md');
const outDoc = path.join(__dirname, 'KICH-BAN-TRINH-BAY-20PHUT.doc');

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function classifyLine(line) {
  const t = line.trim();
  if (!t) return { type: 'blank' };
  if (t.startsWith('# ')) return { type: 'h1', text: t.slice(2) };
  if (t.startsWith('## ')) return { type: 'h2', text: t.slice(3) };
  if (t.startsWith('[MÀN HÌNH]')) return { type: 'screen', text: t };
  if (t.startsWith('[LỜI NÓI]')) return { type: 'say', text: t };
  if (t.startsWith('[CODE CHỈ]') || t.startsWith('[DEMO')) return { type: 'codeTag', text: t };
  if (t.startsWith('  •') || t.startsWith('  1.') || t.startsWith('  2.') || t.startsWith('  3.') || t.startsWith('  4.') || t.startsWith('  Tab')) {
    return { type: 'indent', text: t };
  }
  if (t.startsWith('☐')) return { type: 'check', text: t };
  if (t.includes('→') && !t.startsWith('[')) return { type: 'map', text: t };
  if (t.startsWith('Thuật ngữ') || t.startsWith('Vấn đề:') || t.startsWith('Pattern:') || t.startsWith('Luồng')) {
    return { type: 'boldish', text: t };
  }
  return { type: 'p', text: t };
}

function lineToHtml(line) {
  const c = classifyLine(line);
  switch (c.type) {
    case 'blank':
      return '<p>&nbsp;</p>';
    case 'h1':
      return `<h1>${escHtml(c.text)}</h1>`;
    case 'h2':
      return `<h2>${escHtml(c.text)}</h2>`;
    case 'screen':
      return `<p class="screen"><b>${escHtml(c.text)}</b></p>`;
    case 'say':
      return `<p class="say">${escHtml(c.text)}</p>`;
    case 'codeTag':
      return `<p class="codeTag"><b>${escHtml(c.text)}</b></p>`;
    case 'indent':
      return `<p class="indent">${escHtml(c.text)}</p>`;
    case 'check':
      return `<p class="check">${escHtml(c.text)}</p>`;
    case 'map':
      return `<p class="map"><code>${escHtml(c.text)}</code></p>`;
    case 'boldish':
      return `<p><b>${escHtml(c.text)}</b></p>`;
    default:
      return `<p>${escHtml(c.text)}</p>`;
  }
}

const md = fs.readFileSync(mdPath, 'utf8');
const body = md.split(/\r?\n/).map(lineToHtml).join('\n');

const html = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w="urn:schemas-microsoft-com:office:word"
  xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word">
<meta name="Originator" content="TechPhone">
<title>Kich ban trinh bay 20 phut - TechPhone Design Pattern</title>
<!--[if gte mso 9]><xml>
<w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml><![endif]-->
<style>
@page { size: A4; margin: 2cm; }
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.35; color: #000; }
h1 { font-size: 18pt; color: #1F4E79; margin-top: 18pt; margin-bottom: 8pt; page-break-after: avoid; }
h2 { font-size: 13pt; color: #2E74B5; margin-top: 12pt; margin-bottom: 6pt; page-break-after: avoid; }
p { margin: 0 0 6pt 0; }
p.screen { color: #0070C0; margin-left: 0; }
p.say { color: #375623; }
p.codeTag { color: #C65911; }
p.indent { margin-left: 24pt; }
p.check { margin-left: 12pt; }
p.map code { font-family: Consolas, Courier New, monospace; font-size: 10pt; background: #F2F2F2; }
</style>
</head>
<body>
${body}
</body>
</html>`;

// UTF-8 BOM giup Word nhan dien tieng Viet
fs.writeFileSync(outDoc, '\uFEFF' + html, 'utf8');
console.log('Created:', outDoc);
console.log('Mo bang: chuot phai -> Open with -> Microsoft Word');
