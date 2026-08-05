export function isPendingVnpayOrder(order) {
  return (
    order?.paymentMethod === 'vnpay' &&
    order?.status === 'pending' &&
    ['pending', 'failed'].includes(order?.paymentStatus)
  );
}

export function canRetryVnpayPayment(order) {
  return isPendingVnpayOrder(order);
}

export function canCancelVnpayPending(order) {
  return isPendingVnpayOrder(order);
}

export function findPendingVnpayOrders(orders = []) {
  return orders.filter(isPendingVnpayOrder);
}
