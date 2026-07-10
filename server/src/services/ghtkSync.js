import Order from '../models/Order.js';
import { isGhtkConfigured, getOrderStatus } from './ghtk.js';
import { applyGhtkStatusUpdate } from './ghtkShipment.js';

const SYNC_STATUSES = ['await_pickup', 'picked', 'shipping'];

function readMs(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export async function runGhtkSyncTick() {
  if (!isGhtkConfigured()) return;

  const orders = await Order.find({
    status: { $in: SYNC_STATUSES },
    'shipment.labelId': { $ne: '' },
    'shipment.provider': 'ghtk',
  }).limit(50);

  for (const order of orders) {
    try {
      const ghtkOrder = await getOrderStatus(order);
      if (!ghtkOrder) continue;
      await applyGhtkStatusUpdate({
        label_id: ghtkOrder.label_id || order.shipment.labelId,
        partner_id: ghtkOrder.partner_id || String(order._id),
        status_id: Number(ghtkOrder.status),
        fee: ghtkOrder.ship_money != null ? Number(ghtkOrder.ship_money) : undefined,
        weight: ghtkOrder.weight != null ? Number(ghtkOrder.weight) / 1000 : undefined,
        action_time: ghtkOrder.modified || new Date().toISOString(),
        source: 'poll',
      });
    } catch (err) {
      console.error(`[ghtk-sync] poll failed for ${order._id}:`, err.message);
    }
  }
}

export function startGhtkSyncJob() {
  if (process.env.GHTK_ENABLED !== 'true') return;
  if (process.env.GHTK_POLL_ENABLED !== 'true') {
    console.log('[ghtk-sync] Poll disabled (set GHTK_POLL_ENABLED=true to enable).');
    return;
  }

  const tickMs = readMs('GHTK_POLL_MS', 120000);
  console.log(`[ghtk-sync] Enabled (tick=${tickMs}ms)`);

  runGhtkSyncTick().catch((err) => console.error('[ghtk-sync] Initial tick failed:', err));
  setInterval(() => {
    runGhtkSyncTick().catch((err) => console.error('[ghtk-sync] Tick failed:', err));
  }, tickMs);
}
