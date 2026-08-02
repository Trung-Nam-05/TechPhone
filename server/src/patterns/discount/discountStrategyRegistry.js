import { DiscountStrategy } from './DiscountStrategy.js';
import { FixedDiscountStrategy } from './FixedDiscountStrategy.js';
import { PercentageDiscountStrategy } from './PercentageDiscountStrategy.js';

const STRATEGIES = [new PercentageDiscountStrategy(), new FixedDiscountStrategy()];
const STRATEGY_BY_TYPE = new Map(STRATEGIES.map((strategy) => [strategy.type, strategy]));

/** @param {'percentage'|'fixed'} discountType */
export function getDiscountStrategy(discountType) {
  return STRATEGY_BY_TYPE.get(discountType) || STRATEGY_BY_TYPE.get('fixed');
}

/** @param {import('mongoose').Document} coupon */
export function calculateDiscountAmount(coupon, baseAmount) {
  const strategy = getDiscountStrategy(coupon.discountType);
  return strategy.calculate(coupon, baseAmount);
}

export { DiscountStrategy, FixedDiscountStrategy, PercentageDiscountStrategy };
