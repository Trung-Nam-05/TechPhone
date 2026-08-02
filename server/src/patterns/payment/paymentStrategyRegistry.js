import { PaymentStrategy } from './PaymentStrategy.js';
import { CodPaymentStrategy } from './CodPaymentStrategy.js';
import { InstallmentPaymentStrategy } from './InstallmentPaymentStrategy.js';
import { VnpayPaymentStrategy } from './VnpayPaymentStrategy.js';

/**
 * Registry (Factory-like) — map payment key → strategy instance.
 * Client (orders route) chỉ gọi resolvePaymentStrategy(), không if/else rải rác.
 */
const STRATEGIES = [
  new CodPaymentStrategy(),
  new VnpayPaymentStrategy(),
  new InstallmentPaymentStrategy(),
];

const STRATEGY_BY_KEY = new Map(STRATEGIES.map((strategy) => [strategy.key, strategy]));

/** @param {string} rawValue từ req.body.paymentMethod */
export function resolvePaymentStrategy(rawValue) {
  for (const strategy of STRATEGIES) {
    const normalized = strategy.normalize(rawValue);
    if (normalized) return strategy;
  }
  return null;
}

/** @param {'cod'|'vnpay'|'installment'} key */
export function getPaymentStrategy(key) {
  return STRATEGY_BY_KEY.get(key) || null;
}

export { CodPaymentStrategy, InstallmentPaymentStrategy, PaymentStrategy, VnpayPaymentStrategy };
