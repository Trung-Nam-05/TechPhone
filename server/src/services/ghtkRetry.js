import Order from '../models/Order.js';
import { createGhtkShipmentForOrder, ensureGhtkShipmentForOrder } from './ghtkShipment.js';
import { isGhtkConfigured } from './ghtk.js';

const MAX_RETRIES = 3;

function readMs(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export async function runGhtkRetryTick() {
  if (!isGhtkConfigured()) return;

  const orders = await Order.find({
    status: 'confirmed',
    'shipment.submitError': { $ne: '' },
    $or: [{ 'shipment.labelId': { $in: [null, ''] } }, { 'shipment.labelId': { $exists: false } }],
  }).limit(20);

  for (const order of orders) {
    const retryCount = Number(order.shipment?.retryCount || 0);
    if (retryCount >= MAX_RETRIES) continue;

    try {
      const result = await ensureGhtkShipmentForOrder(String(order._id), {
        force: retryCount > 0,
      });
      if (result.ok && !result.skipped) {
        await Order.findByIdAndUpdate(order._id, {
          $set: { 'shipment.retryCount': retryCount + 1, 'shipment.submitError': '' },
        });
        console.log(`[ghtk-retry] Order ${order._id} submitted on retry ${retryCount + 1}`);
      } else if (!result.ok) {
        await Order.findByIdAndUpdate(order._id, {
          $set: { 'shipment.retryCount': retryCount + 1 },
        });
      }
    } catch (err) {
      console.error(`[ghtk-retry] failed for ${order._id}:`, err.message);
    }
  }
}

export function startGhtkRetryJob() {
  if (process.env.GHTK_ENABLED !== 'true') return;

  const tickMs = readMs('GHTK_RETRY_MS', 300000);
  console.log(`[ghtk-retry] Enabled (tick=${tickMs}ms, maxRetries=${MAX_RETRIES})`);

  runGhtkRetryTick().catch((err) => console.error('[ghtk-retry] Initial tick failed:', err));
  setInterval(() => {
    runGhtkRetryTick().catch((err) => console.error('[ghtk-retry] Tick failed:', err));
  }, tickMs);
}
