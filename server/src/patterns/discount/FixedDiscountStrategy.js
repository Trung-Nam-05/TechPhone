import { DiscountStrategy } from './DiscountStrategy.js';

/** Giảm số tiền cố định (VND), không vượt quá baseAmount. */
export class FixedDiscountStrategy extends DiscountStrategy {
  get type() {
    return 'fixed';
  }

  calculate(coupon, baseAmount) {
    if (baseAmount <= 0) return 0;
    let amount = Number(coupon.discountValue || 0);
    if (coupon.maxDiscountValue !== null && coupon.maxDiscountValue !== undefined) {
      amount = Math.min(amount, Number(coupon.maxDiscountValue || 0));
    }
    amount = Math.min(amount, baseAmount);
    return Math.max(Math.floor(amount), 0);
  }
}
