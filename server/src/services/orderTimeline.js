import OrderEvent from '../models/OrderEvent.js';
import { buildTrackingSteps } from './orderStateMachine.js';

const ORDER_STATUS_SET = new Set([
  'pending',
  'confirmed',
  'await_pickup',
  'picked',
  'shipping',
  'completed',
  'delivery_failed',
  'returned',
  'cancelled',
]);

function getOrderStatusLabelServer(status) {
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

/** Chỉ hiển thị mốc đổi trạng thái đơn — không gộp log poll GHTK trùng lặp. */
export async function buildOrderTimeline(order) {
  const orderEvents = await OrderEvent.find({ order: order._id }).sort({ createdAt: 1 }).lean();

  const events = [];
  let lastStatus = null;

  for (const item of orderEvents) {
    if (!ORDER_STATUS_SET.has(item.toStatus)) continue;
    if (item.toStatus === lastStatus) continue;

    events.push({
      at: item.createdAt,
      title: getOrderStatusLabelServer(item.toStatus) || item.toStatus,
      source: 'order',
      note: item.note || '',
      status: item.toStatus,
    });
    lastStatus = item.toStatus;
  }

  return {
    order,
    steps: buildTrackingSteps(order.status),
    events,
  };
}
