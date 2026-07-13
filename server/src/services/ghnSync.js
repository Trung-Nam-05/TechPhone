import Order from '../models/Order.js';
import { isGhnConfigured } from './ghn.js';
import { syncGhnOrderFromApi } from './ghnShipment.js';

const SYNC_STATUSES = ['await_pickup', 'picked', 'shipping'];

function readMs(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export async function runGhnSyncTick() {
  if (!isGhnConfigured()) return;

  const orders = await Order.find({
    status: { $in: SYNC_STATUSES },
    'shipment.labelId': { $ne: '' },
    'shipment.provider': 'ghn',
  }).limit(50);

  for (const order of orders) {
    try {
      await syncGhnOrderFromApi(order);
    } catch (err) {
      console.error(`[ghn-sync] poll failed for ${order._id}:`, err.message);
    }
  }
}

export function startGhnSyncJob() {
  if (process.env.GHN_ENABLED !== 'true') return;
  if (process.env.GHN_DEMO_PROGRESS_ENABLED === 'true') {
    console.log('[ghn-sync] Poll skipped — dung GHN_DEMO_PROGRESS cho tracking tren web.');
    return;
  }
  if (process.env.GHN_POLL_ENABLED !== 'true') {
    console.log('[ghn-sync] Poll disabled (set GHN_POLL_ENABLED=true to enable).');
    return;
  }

  const tickMs = readMs('GHN_POLL_MS', 60000);
  console.log(`[ghn-sync] Enabled DEV poll (tick=${tickMs}ms)`);

  runGhnSyncTick().catch((err) => console.error('[ghn-sync] Initial tick failed:', err));
  setInterval(() => {
    runGhnSyncTick().catch((err) => console.error('[ghn-sync] Tick failed:', err));
  }, tickMs);
}
