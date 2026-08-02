import {
  ORDER_STATUS_PROGRESS,
  ORDER_STATUSES,
  TERMINAL_ORDER_STATUSES,
} from '../../constants/orderStatus.js';

/**
 * State Pattern — Registry trạng thái đơn hàng
 * Mỗi trạng thái có metadata (label, rank, terminal) và quy tắc chuyển đổi tập trung.
 *
 * @see docs/design-patterns/HUONG-DAN-TRINH-BAY.md — mục 1 (State — Đơn hàng)
 */
export const ORDER_STATE_REGISTRY = Object.fromEntries(
  ORDER_STATUSES.map((status) => [
    status,
    {
      key: status,
      rank: ORDER_STATUS_PROGRESS[status] ?? -1,
      terminal: TERMINAL_ORDER_STATUSES.has(status),
      label: getStateLabel(status),
    },
  ]),
);

/** Actor được phép kích hoạt chuyển trạng thái */
export const ORDER_TRANSITION_ACTORS = {
  SYSTEM: 'system',
  ADMIN: 'admin',
  CUSTOMER: 'customer',
};

/** Luồng tiến trình hiển thị trên website (OrderDetail stepper) */
export const CUSTOMER_TRACKING_FLOW = [
  'placed',
  'confirmed',
  'await_pickup',
  'picked',
  'shipping',
  'completed',
];

function getStateLabel(status) {
  const labels = {
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
  return labels[status] || status;
}

/** @returns {typeof ORDER_STATE_REGISTRY[string]|null} */
export function getOrderStateDefinition(status) {
  return ORDER_STATE_REGISTRY[status] || null;
}

/** Mô tả luồng chuyển đổi cho tài liệu / trình bày */
export function describeOrderStateFlow() {
  return {
    actors: ORDER_TRANSITION_ACTORS,
    states: ORDER_STATE_REGISTRY,
    trackingSteps: CUSTOMER_TRACKING_FLOW,
    rules: [
      'Hệ thống (GHN/VNPAY/demo job) chỉ được chuyển tiến (rank tăng) hoặc vào terminal.',
      'Admin có thể override terminal với lý do ≥ 10 ký tự.',
      'Khách hủy ngay khi pending; yêu cầu hủy khi confirmed → shipping.',
    ],
  };
}
