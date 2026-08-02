/**
 * Strategy Pattern (frontend) — map UI payment option → backend paymentMethod.
 * Checkout page dùng registry này thay vì hard-code if/else.
 *
 * @see docs/design-patterns/HUONG-DAN-TRINH-BAY.md — mục 2
 */
export const PAYMENT_UI_STRATEGIES = [
  { key: 'cod', label: 'Thanh toán khi nhận hàng', icon: '💵', orderPaymentMethod: 'cod' },
  { key: 'bank', label: 'Chuyển khoản ngân hàng (QR Code)', icon: '🏦', orderPaymentMethod: 'cod', demoNote: 'Demo: xử lý như COD' },
  { key: 'vnpay', label: 'Thẻ ATM / Ví (VNPAY)', icon: '💳', orderPaymentMethod: 'vnpay' },
  { key: 'international', label: 'Thẻ Quốc tế Visa/Master/JCB/AMEX', icon: '💳', orderPaymentMethod: 'cod', demoNote: 'Coming soon — hiện xử lý như COD' },
  { key: 'zalopay', label: 'Ví ZaloPay', icon: '🟦', orderPaymentMethod: 'cod', demoNote: 'Coming soon — hiện xử lý như COD' },
  { key: 'momo', label: 'Ví điện tử MoMo', icon: '🟪', orderPaymentMethod: 'cod', demoNote: 'Coming soon — hiện xử lý như COD' },
  { key: 'installment', label: 'Trả góp', icon: '💰', orderPaymentMethod: 'installment' },
];

export function resolvePaymentUiStrategy(selectedKey) {
  return PAYMENT_UI_STRATEGIES.find((item) => item.key === selectedKey) || PAYMENT_UI_STRATEGIES[0];
}

export function getBackendPaymentMethod(selectedKey) {
  return resolvePaymentUiStrategy(selectedKey).orderPaymentMethod;
}
