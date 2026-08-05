# Strategy — Thanh toán: Demo các bước áp dụng bằng code

## Bước 1 — Tạo interface / class cơ sở

```js
// PaymentStrategy.js
export class PaymentStrategy {
  get key() { throw new Error('must implement'); }
  normalize(raw) {
    return String(raw || '').trim() === this.key ? this.key : null;
  }
  validateCheckout(_ctx) { return { ok: true }; }
  getInitialOrderStatus() { return 'pending'; }
  async buildPostCreatePayload(_order, _ctx) { return {}; }
}
```

## Bước 2 — Tách từng PTTT thành strategy

```js
// CodPaymentStrategy.js
export class CodPaymentStrategy extends PaymentStrategy {
  get key() { return 'cod'; }
  getInitialOrderStatus() { return 'confirmed'; }
}

// VnpayPaymentStrategy.js
export class VnpayPaymentStrategy extends PaymentStrategy {
  get key() { return 'vnpay'; }
  getInitialOrderStatus() { return 'pending'; }
  async buildPostCreatePayload(order, ctx) {
    return { paymentUrl: createVnpayUrl(order, ctx), paymentProvider: 'vnpay' };
  }
}

// InstallmentPaymentStrategy.js
export class InstallmentPaymentStrategy extends PaymentStrategy {
  get key() { return 'installment'; }
  getInitialOrderStatus() { return 'pending'; }
  buildInstallmentPayload(pricing, payload) {
    return { ...payload, status: 'pending_review' };
  }
}
```

## Bước 3 — Đăng ký vào registry

```js
// paymentStrategyRegistry.js
const STRATEGIES = [
  new CodPaymentStrategy(),
  new VnpayPaymentStrategy(),
  new InstallmentPaymentStrategy(),
];

export function resolvePaymentStrategy(rawValue) {
  for (const strategy of STRATEGIES) {
    if (strategy.normalize(rawValue)) return strategy;
  }
  return null;
}
```

## Bước 4 — Thay if/else trong checkout bằng registry

```js
// orders route — SAU KHI ÁP DỤNG
const paymentStrategy = resolvePaymentStrategy(req.body.paymentMethod);
if (!paymentStrategy) {
  return res.status(400).json({ message: 'Invalid payment method.' });
}

const status = paymentStrategy.getInitialOrderStatus();
const order = await Order.create({ ...draft, status, paymentMethod: paymentStrategy.key });
const extra = await paymentStrategy.buildPostCreatePayload(order, { clientIp });
return res.status(201).json({ order, ...extra });
```

## File thật trong project

`server/src/patterns/payment/*`, `server/src/routes/orders.js`
