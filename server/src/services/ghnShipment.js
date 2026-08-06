import Order from '../models/Order.js';
import ShipmentEvent from '../models/ShipmentEvent.js';
import {
  isGhnConfigured,
  submitOrder,
  cancelShipment,
  mapGhnStatusToOrderStatus,
  ghnStatusLabel,
  getOrderDetail,
} from './ghn.js';
import { resolveGhnAddress } from './ghnAddress.js';
import {
  applyCodPaymentOnDelivery,
  applyOrderCancellation,
  applySystemOrderTransition,
} from '../patterns/state/orderTransitionService.js';
import { validateSystemTransition } from './orderStateMachine.js';

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
  const canCreate =
    order.status === 'confirmed' ||
    (force && order.status === 'await_pickup' && !order.shipment?.labelId);
  if (!canCreate) {
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

    const transition = await applySystemOrderTransition(order, 'await_pickup', {
      note: `GHN: tao van don thanh cong (${result.orderCode || 'no code'}).`,
      beforeSave: (doc) => {
        doc.shippingInfo = doc.shippingInfo || {};
        doc.shippingInfo.districtId = addressIds.districtId;
        doc.shippingInfo.wardCode = addressIds.wardCode;
        if (addressIds.provinceId) doc.shippingInfo.provinceId = addressIds.provinceId;
        if (addressIds.provinceName) doc.shippingInfo.province = addressIds.provinceName;
        if (addressIds.districtName) doc.shippingInfo.district = addressIds.districtName;
        if (addressIds.wardName) doc.shippingInfo.ward = addressIds.wardName;
        doc.shipment = {
          provider: 'ghn',
          labelId: result.orderCode,
          partnerId: String(doc._id),
          carrierStatus: 'ready_to_pick',
          fee: result.totalFee,
          submittedAt: new Date(),
          lastWebhookAt: new Date(),
          submitError: '',
          retryCount: doc.shipment?.retryCount || 0,
        };
      },
    });

    if (!transition.ok) {
      return { ok: false, reason: transition.reason || 'invalid_transition' };
    }

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
    Boolean(nextStatus) && validateSystemTransition(previousStatus, nextStatus).ok;

  if (!statusChanged && !willChangeOrderStatus) {
    return { ok: true, order, statusChanged: false, skipped: true };
  }

  order.shipment = order.shipment || {};
  order.shipment.provider = 'ghn';
  if (orderCode) order.shipment.labelId = orderCode;
  if (ghnStatus) order.shipment.carrierStatus = ghnStatus;
  if (payload.total_fee != null) order.shipment.fee = Number(payload.total_fee);
  order.shipment.lastWebhookAt = new Date();

  const statusNote = ghnStatusLabel(ghnStatus);
  let orderStatusChanged = false;

  if (willChangeOrderStatus) {
    const eventNote =
      payload.source === 'demo_progress'
        ? `Demo giao hang: ${statusNote}.`
        : payload.source === 'poll'
          ? `GHN poll: ${statusNote}.`
          : `GHN: ${statusNote}.`;

    const transition = await applySystemOrderTransition(order, nextStatus, {
      note: eventNote,
      afterStatusChange: applyCodPaymentOnDelivery,
    });

    if (!transition.ok) {
      await order.save();
      return { ok: true, order, statusChanged: false, skipped: true };
    }

    orderStatusChanged = transition.changed;

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
      console.log(`[ghn] Order ${order._id} ${previousStatus} -> ${order.status} (${ghnStatus})`);
    }

    return { ok: true, order, statusChanged: orderStatusChanged };
  }

  await order.save();

  if (statusChanged) {
    await ShipmentEvent.create({
      order: order._id,
      provider: 'ghn',
      carrierStatus: ghnStatus,
      labelId: orderCode || order.shipment.labelId || '',
      note: statusNote,
      payload,
    });
  }

  return { ok: true, order, statusChanged: false };
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
    const transition = await applyOrderCancellation(order, {
      note: 'GHN: huy van don thanh cong.',
      beforeSave: (doc) => {
        doc.shipment = doc.shipment || {};
        doc.shipment.carrierStatus = 'cancel';
        doc.shipment.submitError = '';
      },
    });

    if (!transition.ok) {
      return { ok: false, reason: transition.reason || 'invalid_transition' };
    }

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
