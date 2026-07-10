export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'await_pickup',
  'picked',
  'shipping',
  'completed',
  'delivery_failed',
  'returned',
  'cancelled',
];

export const ORDER_STATUS_SET = new Set(ORDER_STATUSES);

/** Forward progression for GHTK sync (lower → higher). */
export const ORDER_STATUS_PROGRESS = {
  pending: 0,
  confirmed: 1,
  await_pickup: 2,
  picked: 3,
  shipping: 4,
  delivery_failed: 5,
  returned: 5,
  completed: 6,
  cancelled: 6,
};

export const TERMINAL_ORDER_STATUSES = new Set([
  'completed',
  'delivery_failed',
  'returned',
  'cancelled',
]);

export function shouldTransitionOrderStatus(fromStatus, toStatus) {
  if (!toStatus || fromStatus === toStatus) return false;
  if (TERMINAL_ORDER_STATUSES.has(toStatus)) return true;
  const fromRank = ORDER_STATUS_PROGRESS[fromStatus] ?? -1;
  const toRank = ORDER_STATUS_PROGRESS[toStatus] ?? -1;
  return toRank > fromRank;
}
