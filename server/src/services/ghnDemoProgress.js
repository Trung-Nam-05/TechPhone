import Order from '../models/Order.js';
import { isGhnDevApi } from './ghn.js';
import { applyGhnStatusUpdate } from './ghnShipment.js';

const DEMO_STAGES = [
  {
    orderStatus: 'await_pickup',
    carrierStatus: 'picked',
    envMs: 'GHN_DEMO_AWAIT_TO_PICKED_MS',
    defaultMs: 30000,
  },
  {
    orderStatus: 'picked',
    carrierStatus: 'delivering',
    envMs: 'GHN_DEMO_PICKED_TO_SHIPPING_MS',
    defaultMs: 30000,
  },
  {
    orderStatus: 'shipping',
    carrierStatus: 'delivered',
    envMs: 'GHN_DEMO_SHIPPING_TO_COMPLETE_MS',
    defaultMs: 30000,
  },
];

function readMs(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Demo staging: tu dong chuyen trang thai don tren TechPhone (timeout .env).
 * Chi chay sau khi admin da tao van don GHN — khong doi GHN portal.
 */
export async function runGhnDemoProgressTick() {
  if (process.env.GHN_DEMO_PROGRESS_ENABLED !== 'true') return;
  if (process.env.GHN_ENABLED !== 'true') return;
  if (!isGhnDevApi()) return;

  const now = Date.now();

  for (const stage of DEMO_STAGES) {
    const delayMs = readMs(stage.envMs, stage.defaultMs);
    const orders = await Order.find({
      status: stage.orderStatus,
      'shipment.provider': 'ghn',
      'shipment.labelId': { $ne: '' },
      cancelRequestStatus: { $ne: 'pending' },
      paymentMethod: { $ne: 'installment' },
    }).limit(50);

    for (const order of orders) {
      const anchor = order.updatedAt || order.createdAt;
      const elapsed = now - new Date(anchor).getTime();
      if (elapsed < delayMs) continue;

      const result = await applyGhnStatusUpdate({
        order_code: order.shipment.labelId,
        client_order_code: String(order._id),
        status: stage.carrierStatus,
        source: 'demo_progress',
      });

      if (result.statusChanged) {
        console.log(
          `[ghn-demo] Order ${order._id} ${stage.orderStatus} -> ${result.order.status} (${stage.carrierStatus})`,
        );
      }
    }
  }
}

export function startGhnDemoProgressJob() {
  if (process.env.GHN_DEMO_PROGRESS_ENABLED !== 'true') return;
  if (process.env.GHN_ENABLED !== 'true') return;
  if (!isGhnDevApi()) {
    console.log('[ghn-demo] Disabled — chi chay tren GHN DEV.');
    return;
  }

  const tickMs = readMs('GHN_DEMO_PROGRESS_MS', 5000);
  console.log(
    `[ghn-demo] Auto progress enabled (tick=${tickMs}ms, stages=${DEMO_STAGES.length})`,
  );

  runGhnDemoProgressTick().catch((err) => console.error('[ghn-demo] Initial tick failed:', err));
  setInterval(() => {
    runGhnDemoProgressTick().catch((err) => console.error('[ghn-demo] Tick failed:', err));
  }, tickMs);
}
