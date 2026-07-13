/**
 * Diagnose GHN v2 auth — does not print token.
 * Run: node server/scripts/diagnoseGhnAuth.js
 */
import 'dotenv/config';

const token = process.env.GHN_API_TOKEN;
const shopId = process.env.GHN_SHOP_ID;
const previewUrl = 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/preview';
const createUrl = 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create';

const body = {
  payment_type_id: 2,
  required_note: 'KHONGCHOXEMHANG',
  to_name: 'Test',
  to_phone: '0901234567',
  to_address: '123 Nguyen Hue',
  to_ward_code: '20308',
  to_district_id: 1450,
  cod_amount: 100000,
  content: 'test',
  weight: 500,
  length: 10,
  width: 10,
  height: 10,
  service_type_id: 2,
  items: [{ name: 'Item', quantity: 1, weight: 500 }],
};

const variants = [
  { label: 'Token+ShopId', headers: { Token: token, ShopId: String(shopId) } },
  { label: 'token+ShopId', headers: { token, ShopId: String(shopId) } },
  { label: 'token+shop_id', headers: { token, shop_id: String(shopId) } },
  { label: 'Token+shop_id', headers: { Token: token, shop_id: String(shopId) } },
  { label: 'token only', headers: { token } },
];

for (const v of variants) {
  for (const [kind, url] of [['preview', previewUrl], ['create', createUrl]]) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...v.headers },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    console.log(`${kind} ${v.label}: HTTP ${r.status} — ${data.message || data.code_message || 'ok'}`);
  }
}
