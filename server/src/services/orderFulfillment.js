import Order from '../models/Order.js';
import OrderEvent from '../models/OrderEvent.js';

const DEMO_PAYMENT_METHODS = ['cod', 'vnpay'];

function readMs(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function transitionOrder(order, nextStatus, note) {
  const previousStatus = order.status;
  if (previousStatus === nextStatus) return false;

  order.status = nextStatus;
  await order.save();
  await OrderEvent.create({
    order: order._id,
    fromStatus: previousStatus,
    toStatus: nextStatus,
    note,
    actor: null,
  });
  return true;
}

export async function runFulfillmentDemoTick() {
  const now = Date.now();
  const confirmToShippingMs = readMs('FULFILLMENT_CONFIRM_TO_SHIPPING_MS', 30 * 1000);
  const shippingToCompleteMs = readMs('FULFILLMENT_SHIPPING_TO_COMPLETE_MS', 30 * 1000);

  const confirmedOrders = await Order.find({
    status: 'confirmed',
    paymentMethod: { $in: DEMO_PAYMENT_METHODS },
    cancelRequestStatus: { $ne: 'pending' },
  }).limit(100);

  for (const order of confirmedOrders) {
    const elapsed = now - new Date(order.updatedAt).getTime();
    if (elapsed >= confirmToShippingMs) {
      const changed = await transitionOrder(
        order,
        'shipping',
        'Demo fulfillment: auto chuyen sang dang giao hang.',
      );
      if (changed) {
        console.log(`[fulfillment-demo] Order ${order._id} -> shipping`);
      }
    }
  }

  const shippingOrders = await Order.find({
    status: 'shipping',
    paymentMethod: { $in: DEMO_PAYMENT_METHODS },
    cancelRequestStatus: { $ne: 'pending' },
  }).limit(100);

  for (const order of shippingOrders) {
    const elapsed = now - new Date(order.updatedAt).getTime();
    if (elapsed >= shippingToCompleteMs) {
      const changed = await transitionOrder(
        order,
        'completed',
        'Demo fulfillment: auto hoan tat don hang.',
      );
      if (changed) {
        console.log(`[fulfillment-demo] Order ${order._id} -> completed`);
      }
    }
  }
}

export function startFulfillmentDemoJob() {
  if (process.env.FULFILLMENT_DEMO_ENABLED !== 'true') {
    return;
  }

  const tickMs = readMs('FULFILLMENT_TICK_MS', 60 * 1000);
  console.log(
    `[fulfillment-demo] Enabled (tick=${tickMs}ms, confirm→shipping=${readMs('FULFILLMENT_CONFIRM_TO_SHIPPING_MS', 3600000)}ms, shipping→complete=${readMs('FULFILLMENT_SHIPPING_TO_COMPLETE_MS', 86400000)}ms)`,
  );

  runFulfillmentDemoTick().catch((error) => {
    console.error('[fulfillment-demo] Initial tick failed:', error);
  });

  setInterval(() => {
    runFulfillmentDemoTick().catch((error) => {
      console.error('[fulfillment-demo] Tick failed:', error);
    });
  }, tickMs);
}
