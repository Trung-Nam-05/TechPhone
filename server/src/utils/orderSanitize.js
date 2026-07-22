/**
 * Strip carrier/shipment details from orders returned to customers.
 * Admin retains full shipment object for GHN tracking.
 */
export function sanitizeOrderForCustomer(order) {
  if (!order) return order;

  const plain = typeof order.toObject === 'function' ? order.toObject() : { ...order };
  const hasShipment = Boolean(plain.shipment?.labelId);

  return {
    ...plain,
    shipment: undefined,
    fulfillmentPending:
      plain.status === 'confirmed' && !hasShipment && plain.paymentMethod !== 'installment',
    hasActiveShipment: hasShipment,
  };
}

export function sanitizeOrdersForCustomer(orders = []) {
  return orders.map((order) => sanitizeOrderForCustomer(order));
}
