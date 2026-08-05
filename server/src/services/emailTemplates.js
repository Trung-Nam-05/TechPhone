import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates', 'email');

export async function loadEmailTemplate(name) {
  const filePath = path.join(templateDir, `${name}.html`);
  return fs.readFile(filePath, 'utf8');
}

export function renderEmailTemplate(html, variables = {}) {
  return html.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = variables[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

export async function renderNamedEmailTemplate(name, variables = {}) {
  const html = await loadEmailTemplate(name);
  return renderEmailTemplate(html, variables);
}

export function getDefaultFlashSaleVariables(overrides = {}) {
  const clientOrigin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
  const year = new Date().getFullYear();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN');

  return {
    preheaderText: 'Flash Sale TechPhone — giảm đến 10%, trả góp 0%, giao nhanh toàn quốc',
    customerName: 'bạn',
    discountPercent: '10',
    promoCode: 'SALE10',
    expiresAt,
    shopUrl: `${clientOrigin}/products`,
    product1Url: `${clientOrigin}/product/1`,
    product2Url: `${clientOrigin}/product/2`,
    product3Url: `${clientOrigin}/product/4`,
    viewInBrowserUrl: `${clientOrigin}/products`,
    unsubscribeUrl: `${clientOrigin}/account/security`,
    year: String(year),
    ...overrides,
  };
}
