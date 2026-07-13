import 'dotenv/config';

const token = process.env.GHN_API_TOKEN;
const configuredShopId = Number(process.env.GHN_SHOP_ID);

const r = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shop/all', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Token: token },
  body: JSON.stringify({ offset: 0, limit: 50, client_phone: '' }),
});
const data = await r.json();
console.log('HTTP:', r.status, data.message || '');
const shops = data?.data?.shops || [];
console.log('So shop token nay so huu:', shops.length);
for (const s of shops) {
  const mark = s._id === configuredShopId ? ' <-- SHOP TRONG .env' : '';
  console.log(`  _id=${s._id} | ${s.name} | ${s.phone} | district=${s.district_id} ward=${s.ward_code}${mark}`);
}
if (shops.length && !shops.some((s) => s._id === configuredShopId)) {
  console.log('\nShop ID trong .env KHONG thuoc token nay. Cap nhat GHN_SHOP_ID bang mot _id o tren.');
}
if (!shops.length) {
  console.log('\nToken chua co shop nao. Can tao shop tren 5sao.ghn.dev hoac goi shop/register.');
}
