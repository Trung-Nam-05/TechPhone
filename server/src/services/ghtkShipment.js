import Order from '../models/Order.js';
import OrderEvent from '../models/OrderEvent.js';
import ShipmentEvent from '../models/ShipmentEvent.js';
import { shouldTransitionOrderStatus } from '../constants/orderStatus.js';
import {
  isGhtkConfigured,
  submitOrder,
  cancelShipment,
  mapGhtkStatusToOrderStatus,
  ghtkStatusLabel,
} from './ghtk.js';

/**
 * Fire-and-forget: create GHTK shipment when order is confirmed.
 */
export function enqueueGhtkShipment(orderId) {
  if (!isGhtkConfigured()) return;
  setImmediate(() => {
    ensureGhtkShipmentForOrder(orderId).catch((err) => {
      console.error(`[ghtk] enqueue failed for order ${orderId}:`, err.message);
    });
  });
}

/** Idempotent — tạo vận đơn nếu đơn confirmed nhưng chưa có labelId. */
export async function ensureGhtkShipmentForOrder(orderId, { force = false } = {}) {
  if (!isGhtkConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }

  const order = await Order.findById(orderId);
  if (!order) return { ok: false, reason: 'order_not_found' };
  if (order.paymentMethod === 'installment') {
    return { ok: false, reason: 'installment_not_supported' };
  }
  if (order.status !== 'confirmed' && !force) {
    return { ok: false, reason: 'not_confirmed' };
  }
  if (order.shipment?.labelId && !force) {
    return { ok: true, order, skipped: true };
  }

  return createGhtkShipmentForOrder(orderId, {
    force: force || Boolean(order.shipment?.submitError),
  });
}

export async function createGhtkShipmentForOrder(orderId, { force = false } = {}) {
  if (!isGhtkConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }

  const order = await Order.findById(orderId);
  if (!order) return { ok: false, reason: 'order_not_found' };

  if (order.status !== 'confirmed' && !force) {
    return { ok: false, reason: 'not_confirmed' };
  }

  if (order.shipment?.labelId && !force) {
    return { ok: true, order, skipped: true };
  }

  if (order.paymentMethod === 'installment') {
    return { ok: false, reason: 'installment_not_supported' };
  }

  try {
    const result = await submitOrder(order);
    const previousStatus = order.status;

    order.shipment = {
      provider: 'ghtk',
      labelId: result.labelId,
      partnerId: result.partnerId || String(order._id),
      ghtkStatusId: 2,
      fee: result.fee,
      submittedAt: new Date(),
      lastWebhookAt: new Date(),
      submitError: '',
    };
    order.status = 'await_pickup';
    await order.save();

    await OrderEvent.create({
      order: order._id,
      fromStatus: previousStatus,
      toStatus: 'await_pickup',
      note: `GHTK: tạo vận đơn thành công (${result.labelId || 'no label'}).`,
      actor: null,
    });
    await ShipmentEvent.create({
      order: order._id,
      provider: 'ghtk',
      ghtkStatusId: 2,
      labelId: result.labelId || '',
      note: 'GHTK submit order success',
      payload: result.raw,
    });

    console.log(`[ghtk] Order ${orderId} -> await_pickup (label: ${result.labelId})`);
    return { ok: true, order, labelId: result.labelId };
  } catch (err) {
    order.shipment = order.shipment || {};
    order.shipment.provider = 'ghtk';
    order.shipment.submitError = String(err.message || err).slice(0, 500);
    await order.save();

    await ShipmentEvent.create({
      order: order._id,
      provider: 'ghtk',
      note: `GHTK submit failed: ${err.message}`,
      payload: { error: err.message, code: err.code },
    });

    console.error(`[ghtk] submit failed for ${orderId}:`, err.message);
    return { ok: false, reason: 'submit_failed', error: err.message };
  }
}

/**
 * Apply GHTK webhook or poll payload to order.
 */
export async function applyGhtkStatusUpdate(payload) {
  const labelId = String(payload.label_id || payload.label || '').trim();
  const partnerId = String(payload.partner_id || '').trim();
  const statusId = Number(payload.status_id ?? payload.status);
  const ghtkStatusId = Number.isFinite(statusId) ? statusId : null;

  let order = null;
  if (partnerId) {
    order = await Order.findById(partnerId);
  }
  if (!order && labelId) {
    order = await Order.findOne({ 'shipment.labelId': labelId });
  }
  if (!order) {
    return { ok: false, reason: 'order_not_found' };
  }

  const nextStatus = mapGhtkStatusToOrderStatus(ghtkStatusId);
  const previousStatus = order.status;
  const previousGhtkStatusId = order.shipment?.ghtkStatusId ?? null;
  const ghtkStatusChanged = ghtkStatusId !== null && ghtkStatusId !== previousGhtkStatusId;
  const willChangeOrderStatus =
    Boolean(nextStatus) && shouldTransitionOrderStatus(previousStatus, nextStatus);

  if (!ghtkStatusChanged && !willChangeOrderStatus) {
    return { ok: true, order, statusChanged: false, skipped: true };
  }

  order.shipment = order.shipment || {};
  order.shipment.provider = 'ghtk';
  if (labelId) order.shipment.labelId = labelId;
  if (partnerId) order.shipment.partnerId = partnerId;
  if (ghtkStatusId !== null) order.shipment.ghtkStatusId = ghtkStatusId;
  if (payload.fee != null) order.shipment.fee = Number(payload.fee);
  if (payload.weight != null) order.shipment.weight = Number(payload.weight);
  order.shipment.lastWebhookAt = new Date();

  let statusChanged = false;
  if (willChangeOrderStatus) {
    order.status = nextStatus;
    statusChanged = true;
  }

  if (nextStatus === 'completed' && order.paymentMethod === 'cod' && order.paymentStatus === 'pending') {
    order.paymentStatus = 'paid';
  }

  await order.save();

  const statusNote = ghtkStatusLabel(ghtkStatusId);
  if (ghtkStatusChanged || statusChanged) {
    await ShipmentEvent.create({
      order: order._id,
      provider: 'ghtk',
      ghtkStatusId,
      labelId: labelId || order.shipment.labelId || '',
      note: statusNote,
      payload,
    });
  }

  if (statusChanged) {
    await OrderEvent.create({
      order: order._id,
      fromStatus: previousStatus,
      toStatus: order.status,
      note: payload.source === 'demo_progress'
        ? `Demo GHTK: ${statusNote} (#${ghtkStatusId}).`
        : `GHTK: ${statusNote} (#${ghtkStatusId}).`,
      actor: null,
    });
    console.log(`[ghtk] Order ${order._id} ${previousStatus} -> ${order.status} (GHTK #${ghtkStatusId})`);
  }

  return { ok: true, order, statusChanged };
}

export async function cancelGhtkShipmentForOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) return { ok: false, reason: 'order_not_found' };
  if (!order.shipment?.labelId && !order.shipment?.partnerId) {
    return { ok: false, reason: 'no_shipment' };
  }

  try {
    await cancelShipment(order);
    const previousStatus = order.status;
    order.status = 'cancelled';
    order.shipment.submitError = '';
    await order.save();
    await OrderEvent.create({
      order: order._id,
      fromStatus: previousStatus,
      toStatus: 'cancelled',
      note: 'GHTK: hủy vận đơn thành công.',
      actor: null,
    });
    await ShipmentEvent.create({
      order: order._id,
      provider: 'ghtk',
      ghtkStatusId: -1,
      labelId: order.shipment.labelId || '',
      note: 'GHTK cancel shipment',
    });
    return { ok: true, order };
  } catch (err) {
    return { ok: false, reason: 'cancel_failed', error: err.message };
  }
}
