import { PricingError } from '../services/pricing.js';

export const INSTALLMENT_PROVIDERS = ['techfinance', 'fpaylater'];
export const INSTALLMENT_TERM_MONTHS = [3, 6, 9, 12];
export const INSTALLMENT_STATUS = ['draft', 'pending_review', 'approved', 'rejected', 'completed', 'cancelled'];

export function calculateInstallmentPlan({ total, planMonths, downPaymentRate }) {
  const normalizedTotal = Number(total || 0);
  const months = Number(planMonths);
  const rate = Number(downPaymentRate);

  if (!INSTALLMENT_TERM_MONTHS.includes(months)) {
    throw new PricingError('INSTALLMENT_PLAN_INVALID', 'Ky han tra gop khong hop le.');
  }
  if (!Number.isFinite(rate) || rate < 0 || rate > 90) {
    throw new PricingError('INSTALLMENT_DOWN_PAYMENT_INVALID', 'Ty le tra truoc phai trong khoang 0-90%.');
  }
  if (normalizedTotal <= 0) {
    throw new PricingError('INSTALLMENT_TOTAL_INVALID', 'Tong gia tri don hang khong hop le cho tra gop.');
  }

  const downPaymentAmount = Math.floor((normalizedTotal * rate) / 100);
  const financedAmount = Math.max(normalizedTotal - downPaymentAmount, 0);
  const monthlyAmount = Math.ceil(financedAmount / months);
  return {
    downPaymentAmount,
    financedAmount,
    monthlyAmount,
  };
}

export function normalizeInstallmentInput(input = {}) {
  const provider = String(input.provider || '').trim().toLowerCase();
  const planMonths = Number(input.planMonths);
  const downPaymentRate = Number(input.downPaymentRate);

  if (!provider || !INSTALLMENT_PROVIDERS.includes(provider)) {
    throw new PricingError('INSTALLMENT_PROVIDER_INVALID', 'Nha cung cap tra gop khong hop le.');
  }
  return {
    provider,
    planMonths,
    downPaymentRate,
    note: String(input.note || '').trim(),
  };
}
