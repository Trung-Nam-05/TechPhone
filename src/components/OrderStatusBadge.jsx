import {
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  getPaymentStatusBadgeClass,
  getPaymentStatusLabel,
} from '../constants/orderLabels';

export function OrderStatusBadge({ status }) {
  return (
    <span className={getOrderStatusBadgeClass(status)}>
      {getOrderStatusLabel(status)}
    </span>
  );
}

export function PaymentStatusBadge({ status }) {
  return (
    <span className={getPaymentStatusBadgeClass(status)}>
      {getPaymentStatusLabel(status)}
    </span>
  );
}
