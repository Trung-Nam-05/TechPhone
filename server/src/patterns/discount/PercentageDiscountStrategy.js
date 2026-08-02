import { DiscountStrategy } from './DiscountStrategy.js';

/** Giảm theo % trên baseAmount, có thể bị cap bởi maxDiscountValue. */
export class PercentageDiscountStrategy extends DiscountStrategy {
  get type() {
    return 'percentage';
  }

  calculate(coupon, baseAmount) {
    if (baseAmount <= 0) return 0;
    let amount = (baseAmount * Number(coupon.discountValue || 0)) / 100;
    if (coupon.maxDiscountValue !== null && coupon.maxDiscountValue !== undefined) {
      amount = Math.min(amount, Number(coupon.maxDiscountValue || 0));
    }
    amount = Math.min(amount, baseAmount);
    return Math.max(Math.floor(amount), 0);
  }
}
