import { calculateInstallmentPlan, normalizeInstallmentInput } from '../../utils/installment.js';
import { PaymentStrategy } from './PaymentStrategy.js';

/** Strategy: Trả góp — đơn pending review, không tạo vận đơn GHN cho đến khi duyệt. */
export class InstallmentPaymentStrategy extends PaymentStrategy {
  get key() {
    return 'installment';
  }

  requiresProvinceDistrict() {
    return false;
  }

  getOrderCreatedNote() {
    return 'Order created with installment request pending review.';
  }

  buildInstallmentPayload(pricing, installmentPayload) {
    const normalized = normalizeInstallmentInput(installmentPayload || {});
    const plan = calculateInstallmentPlan({
      total: pricing.total,
      planMonths: normalized.planMonths,
      downPaymentRate: normalized.downPaymentRate,
    });
    return {
      provider: normalized.provider,
      planMonths: normalized.planMonths,
      downPaymentRate: normalized.downPaymentRate,
      downPaymentAmount: plan.downPaymentAmount,
      financedAmount: plan.financedAmount,
      monthlyAmount: plan.monthlyAmount,
      status: 'pending_review',
      note: normalized.note,
      requestedAt: new Date(),
    };
  }
}
