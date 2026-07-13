import 'dotenv/config';
import { isGhnConfigured, isGhnDevApi } from '../src/services/ghn.js';

const token = process.env.GHN_API_TOKEN;
const shopId = Number(process.env.GHN_SHOP_ID);

console.log('=== GHN full check ===');
console.log('Mode:', isGhnDevApi() ? 'DEV' : 'UNKNOWN');

if (!isGhnConfigured()) {
  console.error('Thieu GHN_API_TOKEN hoac GHN_SHOP_ID');
  process.exit(1);
}

const provRes = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province', {
  headers: { token },
});
const provData = await provRes.json();
console.log('\n[1] Master data:', provRes.status, provData.message || 'ok');

const shopsRes = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shop/all', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Token: token },
  body: JSON.stringify({ offset: 0, limit: 50, client_phone: '' }),
});
const shopsData = await shopsRes.json();
const shops = shopsData?.data?.shops || [];
console.log('[2] Danh sach shop:', shopsRes.status, shopsData.message || 'ok', `(${shops.length} shop)`);
for (const s of shops) {
  const mark = s._id === shopId ? ' <-- dang dung' : '';
  console.log(`    _id=${s._id} ${s.name}${mark}`);
}
if (shops.length && !shops.some((s) => s._id === shopId)) {
  console.error(`\nLOI: GHN_SHOP_ID=${shopId} KHONG thuoc token. Dung _id=${shops[0]._id} trong .env`);
  process.exit(1);
}

const previewRes = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Token: token, ShopId: String(shopId) },
  body: JSON.stringify({
    payment_type_id: 2,
    required_note: 'KHONGCHOXEMHANG',
    to_name: 'Test',
    to_phone: '0901234567',
    to_address: '123 Nguyen Hue',
    to_ward_code: '20101',
    to_district_id: 1442,
    cod_amount: 100000,
    content: 'test',
    weight: 500,
    length: 10,
    width: 10,
    height: 10,
    service_type_id: 2,
    items: [{ name: 'Item', quantity: 1, weight: 500 }],
  }),
});
const previewData = await previewRes.json();
console.log('[3] Tao don (preview):', previewRes.status, previewData.message || previewData.code_message || 'ok');

if (previewRes.ok && previewData.code === 200) {
  console.log('\nOK — san sang tao van don GHN DEV.');
  process.exit(0);
}

console.log('\nChua tao duoc don. Kiem tra dia chi shop tren 5sao.ghn.dev');
process.exit(1);
