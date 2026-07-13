import Order from '../models/Order.js';
import OrderEvent from '../models/OrderEvent.js';
import ShipmentEvent from '../models/ShipmentEvent.js';
import { shouldTransitionOrderStatus } from '../constants/orderStatus.js';
import { resolveGhnAddress } from './ghnAddress.js';
import {
  isGhnConfigured,
  submitOrder,
  cancelShipment,
  mapGhnStatusToOrderStatus,
  ghnStatusLabel,
  getOrderDetail,
} from './ghn.js';

export function enqueueGhnShipment(orderId) {
  if (!isGhnConfigured()) return;
  setImmediate(() => {
    ensureGhnShipmentForOrder(orderId).catch((err) => {
      console.error(`[ghn] enqueue failed for order ${orderId}:`, err.message);
    });
  });
}

export async function ensureGhnShipmentForOrder(orderId, { force = false } = {}) {
  if (!isGhnConfigured()) {
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

  return createGhnShipmentForOrder(orderId, {
    force: force || Boolean(order.shipment?.submitError),
  });
}

export async function createGhnShipmentForOrder(orderId, { force = false } = {}) {
  if (!isGhnConfigured()) {
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
    const addressIds = await resolveGhnAddress(order.shippingInfo);
    const result = await submitOrder(order, addressIds);
    const previousStatus = order.status;

    order.shippingInfo = order.shippingInfo || {};
    order.shippingInfo.districtId = addressIds.districtId;
    order.shippingInfo.wardCode = addressIds.wardCode;

    order.shipment = {
      provider: 'ghn',
      labelId: result.orderCode,
      partnerId: String(order._id),
      carrierStatus: 'ready_to_pick',
      fee: result.totalFee,
      submittedAt: new Date(),
      lastWebhookAt: new Date(),
      submitError: '',
      retryCount: order.shipment?.retryCount || 0,
    };
    order.status = 'await_pickup';
    await order.save();

    await OrderEvent.create({
      order: order._id,
      fromStatus: previousStatus,
      toStatus: 'await_pickup',
      note: `GHN: tao van don thanh cong (${result.orderCode || 'no code'}).`,
      actor: null,
    });
    await ShipmentEvent.create({
      order: order._id,
      provider: 'ghn',
      carrierStatus: 'ready_to_pick',
      labelId: result.orderCode || '',
      note: 'GHN create order success',
      payload: result.raw,
    });

    console.log(`[ghn] Order ${orderId} -> await_pickup (code: ${result.orderCode})`);
    return { ok: true, order, labelId: result.orderCode };
  } catch (err) {
    order.shipment = order.shipment || {};
    order.shipment.provider = 'ghn';
    order.shipment.submitError = String(err.message || err).slice(0, 500);
    await order.save();

    await ShipmentEvent.create({
      order: order._id,
      provider: 'ghn',
      note: `GHN submit failed: ${err.message}`,
      payload: { error: err.message, code: err.code },
    });

    console.error(`[ghn] submit failed for ${orderId}:`, err.message);
    return { ok: false, reason: 'submit_failed', error: err.message };
  }
}

export async function applyGhnStatusUpdate(payload) {
  const orderCode = String(payload.order_code || payload.labelId || '').trim();
  const ghnStatus = String(payload.status || payload.carrierStatus || '').trim().toLowerCase();
  const partnerId = String(payload.client_order_code || payload.partner_id || '').trim();

  let order = null;
  if (partnerId) {
    order = await Order.findById(partnerId);
  }
  if (!order && orderCode) {
    order = await Order.findOne({ 'shipment.labelId': orderCode });
  }
  if (!order) {
    return { ok: false, reason: 'order_not_found' };
  }

  const nextStatus = mapGhnStatusToOrderStatus(ghnStatus);
  const previousStatus = order.status;
  const previousCarrierStatus = order.shipment?.carrierStatus ?? '';
  const statusChanged = ghnStatus && ghnStatus !== previousCarrierStatus;
  const willChangeOrderStatus =
    Boolean(nextStatus) && shouldTransitionOrderStatus(previousStatus, nextStatus);

  if (!statusChanged && !willChangeOrderStatus) {
    return { ok: true, order, statusChanged: false, skipped: true };
  }

  order.shipment = order.shipment || {};
  order.shipment.provider = 'ghn';
  if (orderCode) order.shipment.labelId = orderCode;
  if (ghnStatus) order.shipment.carrierStatus = ghnStatus;
  if (payload.total_fee != null) order.shipment.fee = Number(payload.total_fee);
  order.shipment.lastWebhookAt = new Date();

  let orderStatusChanged = false;
  if (willChangeOrderStatus) {
    order.status = nextStatus;
    orderStatusChanged = true;
  }

  if (nextStatus === 'completed' && order.paymentMethod === 'cod' && order.paymentStatus === 'pending') {
    order.paymentStatus = 'paid';
  }

  await order.save();

  const statusNote = ghnStatusLabel(ghnStatus);
  if (statusChanged || orderStatusChanged) {
    await ShipmentEvent.create({
      order: order._id,
      provider: 'ghn',
      carrierStatus: ghnStatus,
      labelId: orderCode || order.shipment.labelId || '',
      note: statusNote,
      payload,
    });
  }

  if (orderStatusChanged) {
    await OrderEvent.create({
      order: order._id,
      fromStatus: previousStatus,
      toStatus: order.status,
      note:
        payload.source === 'demo_progress'
          ? `Demo GHN: ${statusNote}.`
          : `GHN: ${statusNote}.`,
      actor: null,
    });
    console.log(`[ghn] Order ${order._id} ${previousStatus} -> ${order.status} (${ghnStatus})`);
  }

  return { ok: true, order, statusChanged: orderStatusChanged };
}

export async function syncGhnOrderFromApi(order) {
  if (!order.shipment?.labelId) return null;
  const detail = await getOrderDetail(order.shipment.labelId);
  if (!detail) return null;

  const logs = Array.isArray(detail.log) ? detail.log : [];
  for (const entry of logs) {
    if (!entry?.status) continue;
    await applyGhnStatusUpdate({
      order_code: detail.order_code || order.shipment.labelId,
      client_order_code: String(order._id),
      status: entry.status,
      source: 'poll',
      updated_date: entry.updated_date,
    });
  }

  await applyGhnStatusUpdate({
    order_code: detail.order_code || order.shipment.labelId,
    client_order_code: String(order._id),
    status: detail.status,
    total_fee: detail.total_fee,
    source: 'poll',
  });

  return detail;
}

export async function cancelGhnShipmentForOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) return { ok: false, reason: 'order_not_found' };
  if (!order.shipment?.labelId) {
    return { ok: false, reason: 'no_shipment' };
  }

  try {
    await cancelShipment(order);
    const previousStatus = order.status;
    order.status = 'cancelled';
    order.shipment.carrierStatus = 'cancel';
    order.shipment.submitError = '';
    await order.save();
    await OrderEvent.create({
      order: order._id,
      fromStatus: previousStatus,
      toStatus: 'cancelled',
      note: 'GHN: huy van don thanh cong.',
      actor: null,
    });
    await ShipmentEvent.create({
      order: order._id,
      provider: 'ghn',
      carrierStatus: 'cancel',
      labelId: order.shipment.labelId || '',
      note: 'GHN cancel shipment',
    });
    return { ok: true, order };
  } catch (err) {
    return { ok: false, reason: 'cancel_failed', error: err.message };
  }
}
