/**
 * Strategy Pattern (frontend) — map UI payment option → backend paymentMethod.
 */

export const PRIMARY_PAYMENT_KEYS = ['cod', 'vnpay'];

export const PAYMENT_UI_STRATEGIES = [
  { key: 'cod', label: 'Thanh toán khi nhận hàng', icon: '💵', orderPaymentMethod: 'cod', primary: true },
  { key: 'vnpay', label: 'Thẻ ATM / Ví (VNPAY)', icon: '💳', orderPaymentMethod: 'vnpay', primary: true },
  {
    key: 'bank',
    label: 'Chuyển khoản ngân hàng (QR Code)',
    icon: '🏦',
    orderPaymentMethod: 'cod',
    comingSoon: true,
  },
  {
    key: 'international',
    label: 'Thẻ Quốc tế Visa/Master/JCB/AMEX',
    icon: '💳',
    orderPaymentMethod: 'cod',
    comingSoon: true,
  },
  { key: 'zalopay', label: 'Ví ZaloPay', icon: '🟦', orderPaymentMethod: 'cod', comingSoon: true },
  { key: 'momo', label: 'Ví điện tử MoMo', icon: '🟪', orderPaymentMethod: 'cod', comingSoon: true },
  { key: 'installment', label: 'Trả góp', icon: '💰', orderPaymentMethod: 'installment', comingSoon: true },
];

export function resolvePaymentUiStrategy(selectedKey) {
  return PAYMENT_UI_STRATEGIES.find((item) => item.key === selectedKey) || PAYMENT_UI_STRATEGIES[0];
}

export function getPrimaryPaymentOptions() {
  return PAYMENT_UI_STRATEGIES.filter((item) => item.primary);
}

export function getSecondaryPaymentOptions() {
  return PAYMENT_UI_STRATEGIES.filter((item) => !item.primary);
}

export function getBackendPaymentMethod(selectedKey) {
  return resolvePaymentUiStrategy(selectedKey).orderPaymentMethod;
}
