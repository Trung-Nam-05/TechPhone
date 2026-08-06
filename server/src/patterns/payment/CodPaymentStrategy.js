import { PaymentStrategy } from './PaymentStrategy.js';

/** Strategy: Thanh toán khi nhận hàng — đơn được auto xác nhận ngay. */
export class CodPaymentStrategy extends PaymentStrategy {
  get key() {
    return 'cod';
  }

  normalize(rawValue) {
    const raw = String(rawValue || 'cod').trim();
    if (raw === 'cod' || raw === '') return 'cod';
    return null;
  }

  getInitialOrderStatus() {
    return 'confirmed';
  }

  getOrderCreatedNote() {
    return 'Đơn COD — thanh toán khi nhận hàng. Shop sẽ xác nhận và đóng gói.';
  }
}
