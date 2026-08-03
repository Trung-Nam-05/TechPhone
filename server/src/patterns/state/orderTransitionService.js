import OrderEvent from '../../models/OrderEvent.js';
import {
  validateAdminStatusChange,
  validateSystemTransition,
} from '../../services/orderStateMachine.js';

/**
 * State Pattern — Service trung tâm cho MỌI chuyển trạng thái đơn hàng.
 * Một pattern, nhiều nơi gọi: VNPAY, GHN, admin, demo job, khách hủy.
 *
 * @see docs/design-patterns/PATTERN-MAP.md
 */
export const ORDER_TRANSITION_SOURCES = {
  CHECKOUT: 'checkout',
  VNPAY: 'vnpay',
  GHN: 'ghn',
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  DEMO_FULFILLMENT: 'demo_fulfillment',
};

export async function recordOrderEvent({
  orderId,
  fromStatus,
  toStatus,
  note = '',
  actor = null,
  session = null,
}) {
  const payload = {
    order: orderId,
    fromStatus: fromStatus ?? '',
    toStatus,
    note,
    actor,
  };
  if (session) {
    await OrderEvent.create([payload], { session });
    return;
  }
  await OrderEvent.create(payload);
}

/**
 * Chuyển trạng thái do hệ thống (GHN, VNPAY, demo job, hủy terminal).
 * @param {import('mongoose').Document} order
 */
export async function applySystemOrderTransition(
  order,
  toStatus,
  {
    note = '',
    actor = null,
    session = null,
    beforeSave = null,
    afterStatusChange = null,
  } = {},
) {
  const fromStatus = order.status;
  if (!toStatus || fromStatus === toStatus) {
    return { ok: true, changed: false, order, fromStatus, toStatus: fromStatus };
  }

  const validation = validateSystemTransition(fromStatus, toStatus);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason, order, fromStatus, toStatus };
  }

  if (typeof beforeSave === 'function') {
    beforeSave(order);
  }

  order.status = toStatus;

  if (typeof afterStatusChange === 'function') {
    afterStatusChange(order, { fromStatus, toStatus });
  }

  if (session) {
    await order.save({ session });
  } else {
    await order.save();
  }

  await recordOrderEvent({
    orderId: order._id,
    fromStatus,
    toStatus,
    note,
    actor,
    session,
  });

  return { ok: true, changed: true, order, fromStatus, toStatus };
}

/** Chuyển trạng thái do admin (kèm override). */
export async function applyAdminOrderTransition(
  order,
  toStatus,
  {
    override = false,
    reason = '',
    note = '',
    actor = null,
    session = null,
    beforeSave = null,
  } = {},
) {
  const fromStatus = order.status;
  if (!toStatus || fromStatus === toStatus) {
    return { ok: true, changed: false, order, fromStatus, toStatus: fromStatus, validation: { ok: true } };
  }

  const validation = validateAdminStatusChange(fromStatus, toStatus, { override, reason });
  if (!validation.ok) {
    return { ok: false, reason: validation.reason, validation, order, fromStatus, toStatus };
  }

  if (typeof beforeSave === 'function') {
    beforeSave(order);
  }

  order.status = toStatus;

  if (session) {
    await order.save({ session });
  } else {
    await order.save();
  }

  const eventNote = validation.override
    ? `[ADMIN OVERRIDE] ${reason}${note ? ` — ${note}` : ''}`
    : note || 'Order status updated by admin.';

  await recordOrderEvent({
    orderId: order._id,
    fromStatus,
    toStatus,
    note: eventNote,
    actor,
    session,
  });

  return { ok: true, changed: true, order, fromStatus, toStatus, validation };
}

/** Hủy đơn — luôn qua validateSystemTransition (cancelled là terminal). */
export async function applyOrderCancellation(
  order,
  { note, actor = null, session = null, beforeSave = null } = {},
) {
  return applySystemOrderTransition(order, 'cancelled', { note, actor, session, beforeSave });
}

/** VNPAY thành công: pending → confirmed + paymentStatus paid. */
export async function applyVnpayPaymentSuccess(order) {
  const alreadyPaid = order.paymentStatus === 'paid';
  if (alreadyPaid) {
    return { ok: true, changed: false, paid: true, order };
  }

  const previousStatus = order.status;

  if (previousStatus === 'pending') {
    const result = await applySystemOrderTransition(order, 'confirmed', {
      note: 'VNPAY: payment successful (auto-confirmed).',
      beforeSave: (doc) => {
        doc.paymentStatus = 'paid';
      },
    });
    return { ...result, paid: true };
  }

  order.paymentStatus = 'paid';
  await order.save();
  await recordOrderEvent({
    orderId: order._id,
    fromStatus: previousStatus,
    toStatus: previousStatus,
    note: 'VNPAY: payment successful (order already confirmed).',
  });
  return { ok: true, changed: true, paid: true, order, fromStatus: previousStatus };
}

/** VNPAY thất bại — chỉ đổi paymentStatus, giữ nguyên order.status. */
export async function applyVnpayPaymentFailure(order, responseCode) {
  if (order.paymentStatus !== 'pending') {
    return { ok: true, changed: false, order };
  }

  const previousStatus = order.status;
  order.paymentStatus = 'failed';
  await order.save();
  await recordOrderEvent({
    orderId: order._id,
    fromStatus: previousStatus,
    toStatus: previousStatus,
    note: `VNPAY: payment failed (responseCode=${responseCode || 'unknown'}).`,
  });
  return { ok: true, changed: true, order };
}

/** COD: khi GHN báo delivered → đánh dấu đã thu tiền. */
export function applyCodPaymentOnDelivery(order) {
  if (order.paymentMethod === 'cod' && order.paymentStatus === 'pending') {
    order.paymentStatus = 'paid';
  }
}
