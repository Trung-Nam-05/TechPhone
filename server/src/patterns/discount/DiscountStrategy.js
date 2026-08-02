/**
 * Strategy Pattern — Discount
 * Thuật toán giảm giá (phần trăm / cố định) tách riêng, pricing service chỉ delegate.
 *
 * @see docs/design-patterns/HUONG-DAN-TRINH-BAY.md — mục 3 (Strategy — Giảm giá)
 */
export class DiscountStrategy {
  /** @returns {'percentage'|'fixed'} */
  get type() {
    throw new Error('DiscountStrategy.type must be implemented');
  }

  /**
   * @param {import('mongoose').Document} coupon
   * @param {number} baseAmount
   * @returns {number}
   */
  calculate(coupon, baseAmount) {
    throw new Error('DiscountStrategy.calculate must be implemented');
  }
}
