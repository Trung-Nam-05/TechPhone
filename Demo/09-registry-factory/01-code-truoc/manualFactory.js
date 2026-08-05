/**
 * =====================================================================
 * CODE TRƯỚC KHI ÁP DỤNG — Registry / Factory
 * =====================================================================
 * Vấn đề: vẫn if/else để new strategy ở nhiều nơi gọi
 * =====================================================================
 */

export class CodPaymentStrategy {
  key = 'cod';
  normalize(raw) { return String(raw) === 'cod' ? 'cod' : null; }
  getInitialOrderStatus() { return 'confirmed'; }
}

export class VnpayPaymentStrategy {
  key = 'vnpay';
  normalize(raw) { return String(raw) === 'vnpay' ? 'vnpay' : null; }
  getInitialOrderStatus() { return 'pending'; }
}

export class InstallmentPaymentStrategy {
  key = 'installment';
  normalize(raw) { return String(raw) === 'installment' ? 'installment' : null; }
  getInitialOrderStatus() { return 'pending'; }
}

/** Factory thủ công — mỗi chỗ gọi một kiểu if */
export function getPaymentStrategyBeforePattern(method) {
  if (method === 'cod') return new CodPaymentStrategy();
  if (method === 'vnpay') return new VnpayPaymentStrategy();
  if (method === 'installment') return new InstallmentPaymentStrategy();
  return null;
}

/** Chỗ gọi 1: checkout */
export function checkoutUseFactory(method) {
  const strategy = getPaymentStrategyBeforePattern(method);
  if (!strategy) throw new Error('Invalid payment');
  return { status: strategy.getInitialOrderStatus(), key: strategy.key };
}

/** Chỗ gọi 2: idempotent retry — COPY if/else tương tự */
export function retryPaymentUseFactory(method) {
  let strategy = null;
  if (method === 'cod') strategy = new CodPaymentStrategy();
  else if (method === 'vnpay') strategy = new VnpayPaymentStrategy();
  else if (method === 'installment') strategy = new InstallmentPaymentStrategy();
  if (!strategy) throw new Error('Invalid payment');
  return strategy;
}

/** Chỗ gọi 3: admin tool — lại if/else nữa */
export function describePaymentBeforePattern(method) {
  if (method === 'cod') return 'Thanh toán khi nhận hàng';
  if (method === 'vnpay') return 'Thanh toán VNPAY';
  if (method === 'installment') return 'Trả góp';
  return 'Không xác định';
}
