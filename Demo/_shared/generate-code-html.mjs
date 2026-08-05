/**
 * Sinh file code-truoc.html (có màu) từ các file .js trong 01-code-truoc
 * Chạy: node Demo/_shared/generate-code-html.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoRoot = path.resolve(__dirname, '..');

const folders = fs
  .readdirSync(demoRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{2}-/.test(d.name))
  .map((d) => d.name);

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

for (const folder of folders) {
  const dir = path.join(demoRoot, folder, '01-code-truoc');
  if (!fs.existsSync(dir)) continue;
  const jsFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && !f.includes('fake'));
  if (!jsFiles.length) continue;

  const mainJs = jsFiles[0];
  const code = fs.readFileSync(path.join(dir, mainJs), 'utf8');
  const title = `${folder} — Code trước`;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css" />
  <style>
    body { margin: 0; background: #1e1e1e; color: #ddd; font-family: Segoe UI, sans-serif; }
    header { padding: 16px 20px; border-bottom: 1px solid #333; }
    h1 { margin: 0 0 8px; font-size: 18px; color: #fff; }
    .hint { color: #9cdcfe; font-size: 14px; }
    pre { margin: 0; padding: 20px; font-size: 13px; line-height: 1.5; }
    code.hljs { background: #1e1e1e !important; }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <p class="hint">Bôi đen code bên dưới → Ctrl+C → dán vào Word → chọn <b>Keep Source Formatting</b> để giữ màu.</p>
  </header>
  <pre><code class="language-javascript">${escapeHtml(code)}</code></pre>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script>hljs.highlightAll();</script>
</body>
</html>
`;

  const out = path.join(dir, 'code-truoc.html');
  fs.writeFileSync(out, html, 'utf8');
  console.log('OK', out);
}

console.log('Done. Mở code-truoc.html bằng Chrome/Edge (cần mạng lần đầu để tải highlight.js).');
