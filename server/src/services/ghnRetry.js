import Order from '../models/Order.js';
import { isGhnConfigured } from './ghn.js';
import { ensureGhnShipmentForOrder } from './ghnShipment.js';

const MAX_RETRIES = 3;

function readMs(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export async function runGhnRetryTick() {
  if (!isGhnConfigured()) return;

  const orders = await Order.find({
    status: 'confirmed',
    'shipment.provider': 'ghn',
    'shipment.submitError': { $ne: '' },
    $or: [{ 'shipment.labelId': '' }, { 'shipment.labelId': { $exists: false } }],
    'shipment.retryCount': { $lt: MAX_RETRIES },
    paymentMethod: { $ne: 'installment' },
  }).limit(20);

  for (const order of orders) {
    try {
      order.shipment.retryCount = (order.shipment.retryCount || 0) + 1;
      await order.save();
      await ensureGhnShipmentForOrder(order._id, { force: true });
    } catch (err) {
      console.error(`[ghn-retry] failed for ${order._id}:`, err.message);
    }
  }
}

export function startGhnRetryJob() {
  if (process.env.GHN_ENABLED !== 'true') return;

  const tickMs = readMs('GHN_RETRY_MS', 300000);
  console.log(`[ghn-retry] Enabled (tick=${tickMs}ms, maxRetries=${MAX_RETRIES})`);

  runGhnRetryTick().catch((err) => console.error('[ghn-retry] Initial tick failed:', err));
  setInterval(() => {
    runGhnRetryTick().catch((err) => console.error('[ghn-retry] Tick failed:', err));
  }, tickMs);
}
