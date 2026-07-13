/**
 * Hủy tất cả vận đơn GHTK thật còn active trong DB.
 * Chạy: node server/scripts/cancelAllGhtkShipments.js
 * Xem trước: node server/scripts/cancelAllGhtkShipments.js --dry-run
 */
import 'dotenv/config';
import { connectDatabase } from '../src/config/db.js';
import Order from '../src/models/Order.js';
import { cancelGhtkShipmentForOrder } from '../src/services/ghtkShipment.js';
import { isGhtkMockEnabled } from '../src/services/ghtk.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  if (isGhtkMockEnabled()) {
    console.error('GHTK_MOCK_ENABLED=true — script nay can goi API that de huy. Tat mock tam thoi.');
    process.exit(1);
  }

  await connectDatabase();

  const orders = await Order.find({
    'shipment.provider': 'ghtk',
    'shipment.labelId': { $exists: true, $ne: '', $not: /^MOCK-/ },
    status: { $ne: 'cancelled' },
  }).sort({ createdAt: -1 });

  console.log(`Tim thay ${orders.length} van don GHTK can huy.`);

  if (dryRun) {
    for (const order of orders) {
      console.log(`  - ${order._id} | label=${order.shipment.labelId} | status=${order.status}`);
    }
    console.log('Dry-run — khong goi API. Bo --dry-run de huy that.');
    process.exit(0);
  }

  let ok = 0;
  let fail = 0;

  for (const order of orders) {
    const label = order.shipment.labelId;
    process.stdout.write(`Huy ${label} (${order._id})... `);
    const result = await cancelGhtkShipmentForOrder(order._id);
    if (result.ok) {
      ok += 1;
      console.log('OK');
    } else {
      fail += 1;
      console.log(`LOI: ${result.error || result.reason}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nXong: ${ok} thanh cong, ${fail} that bai.`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
