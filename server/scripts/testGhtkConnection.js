import 'dotenv/config';
import { isGhtkStagingApi, isGhtkProductionApi } from '../src/services/ghtk.js';

const apiUrl = String(process.env.GHTK_API_URL || 'https://services-staging.ghtklab.com').replace(/\/$/, '');
const token = process.env.GHTK_API_TOKEN;
const partner = process.env.GHTK_PARTNER_CODE;

console.log('=== GHTK connection test ===');
console.log('API URL:', apiUrl);
console.log('Partner:', partner || '(chua set)');
console.log('Mode:', isGhtkStagingApi() ? 'STAGING' : isGhtkProductionApi() ? 'PRODUCTION' : 'UNKNOWN');

if (!token || !partner) {
  console.error('\nThieu GHTK_API_TOKEN hoac GHTK_PARTNER_CODE trong .env');
  process.exit(1);
}

const response = await fetch(`${apiUrl}/services/authenticated`, {
  headers: { Token: token, 'X-Client-Source': partner },
});
const text = await response.text();
let data = null;
try {
  data = text ? JSON.parse(text) : null;
} catch {
  data = { message: text };
}

console.log('HTTP:', response.status);
console.log('Response:', data?.message || text || '(empty)');

if (response.ok) {
  console.log('\nOK — ket noi GHTK thanh cong. Co the dat don test.');
  process.exit(0);
}

if (isGhtkStagingApi() && (response.status === 401 || response.status === 403)) {
  console.log('\n--- Token production KHONG dung duoc tren STAGING ---');
  console.log('1. Dang ky / dang nhap: https://khachhang-staging.ghtklab.com');
  console.log('2. Lay token tai: /web/thong-tin-shop/tai-khoan');
  console.log('3. Cap nhat GHTK_API_TOKEN va GHTK_PARTNER_CODE (ma shop staging) trong .env');
  console.log('4. Chay lai: npm run ghtk:test');
}

process.exit(1);
