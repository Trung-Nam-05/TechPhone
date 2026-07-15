import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ShipmentEvent from '../src/models/ShipmentEvent.js';
import Order from '../src/models/Order.js';

dotenv.config();

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI');

  await mongoose.connect(uri);

  const ghtkEventFilter = {
    $or: [
      { provider: 'ghtk' },
      { provider: { $in: [null, ''] }, ghtkStatusId: { $ne: null } },
    ],
  };

  const ghtkEventCount = await ShipmentEvent.countDocuments(ghtkEventFilter);
  console.log(`[shipmentevents] GHTK-related events found: ${ghtkEventCount}`);

  if (!dryRun && ghtkEventCount > 0) {
    const result = await ShipmentEvent.deleteMany(ghtkEventFilter);
    console.log(`[shipmentevents] deleted: ${result.deletedCount}`);
  }

  const ghnEventCount = await ShipmentEvent.countDocuments({ provider: 'ghn' });
  console.log(`[shipmentevents] GHN events remaining: ${ghnEventCount}`);

  const ghtkOrderCount = await Order.countDocuments({ 'shipment.provider': 'ghtk' });
  console.log(`[orders] orders with shipment.provider=ghtk: ${ghtkOrderCount} (kept for history)`);

  const ghnOrderCount = await Order.countDocuments({ 'shipment.provider': 'ghn' });
  console.log(`[orders] orders with shipment.provider=ghn: ${ghnOrderCount}`);

  if (dryRun) {
    console.log('[dry-run] No documents deleted.');
  } else {
    console.log('[done] GHTK shipment event cleanup complete.');
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
