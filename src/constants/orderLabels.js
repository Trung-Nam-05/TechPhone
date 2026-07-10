export const ORDER_STATUS_LABELS = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  await_pickup: 'Chờ lấy hàng',
  picked: 'Đã lấy hàng',
  shipping: 'Đang giao hàng',
  completed: 'Hoàn tất',
  delivery_failed: 'Giao thất bại',
  returned: 'Đã hoàn hàng',
  cancelled: 'Đã hủy',
};

export const PAYMENT_STATUS_LABELS = {
  pending: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán thất bại',
  refunded: 'Đã hoàn tiền',
};

export const ORDER_TRACKING_STEPS = [
  { key: 'placed', label: 'Đặt hàng' },
  { key: 'confirmed', label: 'Xác nhận' },
  { key: 'await_pickup', label: 'Chờ lấy hàng' },
  { key: 'picked', label: 'Đã lấy hàng' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'completed', label: 'Hoàn tất' },
];

const STATUS_TO_STEP_INDEX = {
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

export const ACTIVE_SHIPMENT_STATUSES = new Set(['await_pickup', 'picked', 'shipping']);

export function buildTrackingSteps(status) {
  const activeIndex = STATUS_TO_STEP_INDEX[status] ?? 0;
  return ORDER_TRACKING_STEPS.map((step, index) => ({
    ...step,
    done: activeIndex >= 0 && index < activeIndex,
    active: activeIndex >= 0 && index === activeIndex,
    error:
      (status === 'delivery_failed' && step.key === 'shipping') ||
      (status === 'returned' && step.key === 'shipping') ||
      (status === 'cancelled' && index === Math.max(activeIndex, 0)),
  }));
}

export function canCustomerCancelImmediate(status) {
  return status === 'pending';
}

export function canRequestCancel(status) {
  return ['confirmed', 'await_pickup', 'picked', 'shipping'].includes(status);
}

export function canCustomerCancel(status) {
  return canCustomerCancelImmediate(status) || canRequestCancel(status);
}

export const GHTK_STATUS_LABELS = {
  [-1]: 'Đã hủy',
  1: 'Chưa tiếp nhận',
  2: 'Đã tiếp nhận',
  3: 'Đã lấy hàng / nhập kho',
  4: 'Đang giao hàng',
  5: 'Giao thành công',
  6: 'Đã đối soát',
  9: 'Giao thất bại',
  12: 'Đang lấy hàng',
  20: 'Đang hoàn hàng',
  21: 'Đã hoàn hàng',
  45: 'Shipper báo giao thành công',
  49: 'Shipper báo giao thất bại',
  123: 'Shipper báo lấy hàng thành công',
};

export function getGhtkStatusLabel(statusId) {
  return GHTK_STATUS_LABELS[Number(statusId)] || `GHTK #${statusId}`;
}

export const PAYMENT_METHOD_LABELS = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  vnpay: 'VNPAY',
  installment: 'Trả góp',
};

export function getPaymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || '';
}

export const ORDER_STATUS_OPTIONS = Object.keys(ORDER_STATUS_LABELS);

export function getOrderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || status || '';
}

export function getPaymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || status || '';
}

export function getOrderStatusBadgeClass(status) {
  switch (status) {
    case 'completed':
      return 'order-badge order-badge-success';
    case 'cancelled':
    case 'delivery_failed':
      return 'order-badge order-badge-danger';
    case 'shipping':
    case 'picked':
    case 'await_pickup':
      return 'order-badge order-badge-info';
    case 'confirmed':
      return 'order-badge order-badge-primary';
    default:
      return 'order-badge order-badge-muted';
  }
}

export function getPaymentStatusBadgeClass(status) {
  switch (status) {
    case 'paid':
      return 'order-badge order-badge-success';
    case 'failed':
      return 'order-badge order-badge-danger';
    default:
      return 'order-badge order-badge-muted';
  }
}
