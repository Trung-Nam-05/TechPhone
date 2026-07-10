import Order from '../models/Order.js';
import { applyGhtkStatusUpdate } from './ghtkShipment.js';

const DEMO_STAGES = [
  {
    orderStatus: 'await_pickup',
    ghtkStatusId: 3,
    envMs: 'GHTK_DEMO_AWAIT_TO_PICKED_MS',
    defaultMs: 120000,
  },
  {
    orderStatus: 'picked',
    ghtkStatusId: 4,
    envMs: 'GHTK_DEMO_PICKED_TO_SHIPPING_MS',
    defaultMs: 120000,
  },
  {
    orderStatus: 'shipping',
    ghtkStatusId: 5,
    envMs: 'GHTK_DEMO_SHIPPING_TO_COMPLETE_MS',
    defaultMs: 180000,
  },
];

function readMs(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Mô phỏng tiến trình GHTK khi không có lấy/giao hàng thật (môi trường demo/đồ án).
 * await_pickup → picked → shipping → completed
 */
export async function runGhtkDemoProgressTick() {
  if (process.env.GHTK_DEMO_PROGRESS_ENABLED !== 'true') return;

  const now = Date.now();

  for (const stage of DEMO_STAGES) {
    const delayMs = readMs(stage.envMs, stage.defaultMs);
    const orders = await Order.find({
      status: stage.orderStatus,
      'shipment.provider': 'ghtk',
      'shipment.labelId': { $ne: '' },
      cancelRequestStatus: { $ne: 'pending' },
      paymentMethod: { $ne: 'installment' },
    }).limit(50);

    for (const order of orders) {
      const anchor = order.updatedAt || order.createdAt;
      const elapsed = now - new Date(anchor).getTime();
      if (elapsed < delayMs) continue;

      const result = await applyGhtkStatusUpdate({
        label_id: order.shipment.labelId,
        partner_id: String(order._id),
        status_id: stage.ghtkStatusId,
        action_time: new Date().toISOString(),
        source: 'demo_progress',
      });

      if (result.statusChanged) {
        console.log(
          `[ghtk-demo] Order ${order._id} ${stage.orderStatus} -> ${result.order.status} (GHTK #${stage.ghtkStatusId})`,
        );
      }
    }
  }
}

export function startGhtkDemoProgressJob() {
  if (process.env.GHTK_DEMO_PROGRESS_ENABLED !== 'true') return;

  const tickMs = readMs('GHTK_DEMO_PROGRESS_MS', 30000);
  console.log(
    `[ghtk-demo] Progress simulation enabled (tick=${tickMs}ms, stages=${DEMO_STAGES.length})`,
  );

  runGhtkDemoProgressTick().catch((err) => console.error('[ghtk-demo] Initial tick failed:', err));
  setInterval(() => {
    runGhtkDemoProgressTick().catch((err) => console.error('[ghtk-demo] Tick failed:', err));
  }, tickMs);
}
