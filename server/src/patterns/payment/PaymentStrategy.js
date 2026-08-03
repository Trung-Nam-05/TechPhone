/**
 * Strategy Pattern — Payment (Creational/Behavioral hybrid)
 
 * @see docs/design-patterns/HUONG-DAN-TRINH-BAY.md — mục 2 (Strategy — Thanh toán)
 */
export class PaymentStrategy {
  /** @returns {'cod'|'vnpay'|'installment'} */
  get key() {
    throw new Error('PaymentStrategy.key must be implemented');
  }

  /** @returns {string|null} null nếu raw không khớp strategy này */
  normalize(rawValue) {
    return String(rawValue || '').trim() === this.key ? this.key : null;
  }

  /** @returns {{ ok: boolean, status?: number, message?: string }} */
  validateCheckout(_context) {
    return { ok: true };
  }

  /** Trạng thái đơn ngay sau khi tạo */
  getInitialOrderStatus() {
    return 'pending';
  }

  /** Ghi chú OrderEvent lúc checkout */
  getOrderCreatedNote() {
    return 'Order created by checkout flow.';
  }

  /** COD/VNPAY không cần tỉnh/huyện cho trả góp */
  requiresProvinceDistrict() {
    return true;
  }

  /** Subdocument installment mặc định */
  buildInstallmentPayload(_pricing, _installmentPayload) {
    return { status: 'draft' };
  }

  /** Payload bổ sung sau create (VD: paymentUrl VNPAY) */
  async buildPostCreatePayload(_order, _context) {
    return {};
  }

  /** Response khi idempotency key trùng */
  async buildIdempotentResponse(_order, _context) {
    return {};
  }

  /** Provider name trả về client (nếu có) */
  get paymentProvider() {
    return undefined;
  }
}
