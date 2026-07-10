import {
  ORDER_STATUS_PROGRESS,
  TERMINAL_ORDER_STATUSES,
  shouldTransitionOrderStatus,
} from '../constants/orderStatus.js';

export const ADMIN_OVERRIDE_STATUSES = new Set([
  'cancelled',
  'completed',
  'delivery_failed',
  'returned',
  'confirmed',
  'await_pickup',
  'picked',
  'shipping',
]);

const IMMEDIATE_CANCEL_STATUSES = new Set(['pending']);
const REQUEST_CANCEL_STATUSES = new Set(['confirmed', 'await_pickup', 'picked', 'shipping']);
const NO_CANCEL_STATUSES = new Set(['completed', 'cancelled', 'returned', 'delivery_failed']);

export function canCustomerCancelImmediate(status) {
  return IMMEDIATE_CANCEL_STATUSES.has(status);
}

export function canCustomerRequestCancel(status) {
  return REQUEST_CANCEL_STATUSES.has(status);
}

export function canCustomerCancelAtAll(status) {
  return canCustomerCancelImmediate(status) || canCustomerRequestCancel(status);
}

export function validateCustomerRequestCancel(order) {
  if (NO_CANCEL_STATUSES.has(order.status)) {
    return { ok: false, reason: 'ORDER_NOT_CANCELLABLE' };
  }
  if (!canCustomerRequestCancel(order.status)) {
    return { ok: false, reason: 'ORDER_NOT_CANCELLABLE' };
  }
  if (order.cancelRequestStatus === 'pending') {
    return { ok: false, reason: 'CANCEL_ALREADY_PENDING' };
  }
  return { ok: true };
}

/** System-driven transitions (GHTK, VNPAY automation). */
export function validateSystemTransition(fromStatus, toStatus) {
  if (!toStatus || fromStatus === toStatus) {
    return { ok: false, reason: 'NO_CHANGE' };
  }
  if (!shouldTransitionOrderStatus(fromStatus, toStatus)) {
    return { ok: false, reason: 'INVALID_SYSTEM_TRANSITION' };
  }
  return { ok: true };
}

/**
 * Admin override: any forward step OR terminal override with mandatory reason.
 */
export function validateAdminStatusChange(fromStatus, toStatus, { override = false, reason = '' } = {}) {
  if (!toStatus || fromStatus === toStatus) {
    return { ok: false, reason: 'NO_CHANGE' };
  }

  if (override) {
    const trimmed = String(reason || '').trim();
    if (trimmed.length < 10) {
      return { ok: false, reason: 'OVERRIDE_REASON_REQUIRED' };
    }
    if (!ADMIN_OVERRIDE_STATUSES.has(toStatus)) {
      return { ok: false, reason: 'INVALID_OVERRIDE_TARGET' };
    }
    if (TERMINAL_ORDER_STATUSES.has(fromStatus) && fromStatus !== toStatus) {
      const fromRank = ORDER_STATUS_PROGRESS[fromStatus] ?? 99;
      const toRank = ORDER_STATUS_PROGRESS[toStatus] ?? -1;
      if (toRank < fromRank && toStatus !== 'cancelled') {
        return { ok: false, reason: 'CANNOT_REVERT_TERMINAL' };
      }
    }
    return { ok: true, override: true };
  }

  if (!shouldTransitionOrderStatus(fromStatus, toStatus)) {
    return { ok: false, reason: 'INVALID_ADMIN_TRANSITION' };
  }
  return { ok: true, override: false };
}

export const TRACKING_STEP_KEYS = [
  'placed',
  'confirmed',
  'await_pickup',
  'picked',
  'shipping',
  'completed',
];

const STATUS_TO_STEP = {
  pending: 0,
  confirmed: 1,
  await_pickup: 2,
  picked: 3,
  shipping: 4,
  completed: 5,
  delivery_failed: 4,
  returned: 4,
  cancelled: -1,
};

export function buildTrackingSteps(currentStatus) {
  const activeIndex = STATUS_TO_STEP[currentStatus] ?? 0;
  const labels = {
    placed: 'Đặt hàng',
    confirmed: 'Xác nhận',
    await_pickup: 'Chờ lấy hàng',
    picked: 'Đã lấy hàng',
    shipping: 'Đang giao',
    completed: 'Hoàn tất',
  };

  return TRACKING_STEP_KEYS.map((key, index) => ({
    key,
    label: labels[key],
    done: activeIndex >= 0 && index < activeIndex,
    active: activeIndex >= 0 && index === activeIndex,
    error:
      (currentStatus === 'delivery_failed' && key === 'shipping') ||
      (currentStatus === 'returned' && key === 'shipping') ||
      (currentStatus === 'cancelled' && index === activeIndex),
  }));
}

export const ACTIVE_SHIPMENT_STATUSES = new Set(['await_pickup', 'picked', 'shipping']);
