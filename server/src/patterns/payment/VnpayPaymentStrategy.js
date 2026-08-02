import { buildVnpayPaymentUrl, isVnpayConfigured } from '../../services/vnpay.js';
import { PaymentStrategy } from './PaymentStrategy.js';

/** Strategy: Thanh toán online qua cổng VNPAY — đơn ở trạng thái pending cho đến khi IPN xác nhận. */
export class VnpayPaymentStrategy extends PaymentStrategy {
  get key() {
    return 'vnpay';
  }

  validateCheckout() {
    if (!isVnpayConfigured()) {
      return {
        ok: false,
        status: 503,
        message:
          'VNPAY is not configured. Set VNPAY_TMN_CODE and VNPAY_HASH_SECRET (and API_PUBLIC_URL for callbacks).',
      };
    }
    return { ok: true };
  }

  getOrderCreatedNote() {
    return 'Order created; awaiting VNPAY payment.';
  }

  get paymentProvider() {
    return 'vnpay';
  }

  async buildPaymentUrl(order, clientIp) {
    return buildVnpayPaymentUrl({
      amountVnd: order.total,
      orderId: String(order._id),
      orderInfo: `TechPhone ${String(order._id).slice(-8)}`,
      ipAddr: clientIp,
    });
  }

  async buildPostCreatePayload(order, { clientIp }) {
    try {
      const paymentUrl = await this.buildPaymentUrl(order, clientIp);
      return { paymentUrl, paymentProvider: this.paymentProvider };
    } catch (error) {
      console.error(error);
      return { paymentUrlError: true };
    }
  }

  async buildIdempotentResponse(order, { clientIp }) {
    if (order.paymentStatus !== 'pending') return {};
    try {
      const paymentUrl = await this.buildPaymentUrl(order, clientIp);
      return { paymentUrl, paymentProvider: this.paymentProvider };
    } catch (error) {
      console.error(error);
      return {};
    }
  }
}
