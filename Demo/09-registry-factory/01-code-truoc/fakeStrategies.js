/** Stub cho demo code-trước — không dùng trong runtime production */

export class CodPaymentStrategy {
  key = 'cod';
  normalize(raw) {
    return String(raw) === 'cod' ? 'cod' : null;
  }
}

export class VnpayPaymentStrategy {
  key = 'vnpay';
  normalize(raw) {
    return String(raw) === 'vnpay' ? 'vnpay' : null;
  }
}

export class InstallmentPaymentStrategy {
  key = 'installment';
  normalize(raw) {
    return String(raw) === 'installment' ? 'installment' : null;
  }
}
