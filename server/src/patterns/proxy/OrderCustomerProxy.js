/**
 * Proxy Pattern — Bảo vệ dữ liệu đơn hàng trả về khách
 * Client (React) chỉ nhận view an toàn; admin vẫn thấy shipment/GHN đầy đủ.
 *
 * @see docs/design-patterns/HUONG-DAN-TRINH-BAY.md — mục 5 (Proxy — Order)
 */

function toPlainOrder(order) {
  if (!order) return order;
  return typeof order.toObject === 'function' ? order.toObject() : { ...order };
}

/** Proxy view: ẩn shipment nội bộ, thêm cờ fulfillmentPending cho UI */
export function createCustomerOrderView(order) {
  const plain = toPlainOrder(order);
  const hasShipment = Boolean(plain.shipment?.labelId);

  return {
    ...plain,
    shipment: undefined,
    fulfillmentPending:
      plain.status === 'confirmed' && !hasShipment && plain.paymentMethod !== 'installment',
    hasActiveShipment: hasShipment,
  };
}

/** @param {object[]} orders */
export function createCustomerOrderListView(orders = []) {
  return orders.map((order) => createCustomerOrderView(order));
}

/** Backward-compatible aliases */
export const sanitizeOrderForCustomer = createCustomerOrderView;
export const sanitizeOrdersForCustomer = createCustomerOrderListView;
