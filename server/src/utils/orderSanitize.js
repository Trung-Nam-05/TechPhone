/** Ẩn shipment nội bộ khỏi API khách; admin vẫn thấy full order. */

function toPlainOrder(order) {
  if (!order) return order;
  return typeof order.toObject === 'function' ? order.toObject() : { ...order };
}

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

export const sanitizeOrderForCustomer = createCustomerOrderView;
export const sanitizeOrdersForCustomer = createCustomerOrderListView;
