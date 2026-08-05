# Registry / Factory: Demo các bước áp dụng bằng code

## Bước 1 — Khởi tạo sẵn các strategy (không new rải trong route)

```js
const STRATEGIES = [
  new CodPaymentStrategy(),
  new VnpayPaymentStrategy(),
  new InstallmentPaymentStrategy(),
];
```

## Bước 2 — Viết hàm resolve thay cho if/else factory

```js
export function resolvePaymentStrategy(rawValue) {
  for (const strategy of STRATEGIES) {
    const normalized = strategy.normalize(rawValue);
    if (normalized) return strategy;
  }
  return null;
}

export function getPaymentStrategy(key) {
  return STRATEGIES.find((s) => s.key === key) || null;
}
```

## Bước 3 — Client chỉ gọi registry

```js
// trước
const strategy = getPaymentStrategyBeforePattern(method);

// sau
const strategy = resolvePaymentStrategy(req.body.paymentMethod);
```

## Bước 4 — Mở rộng = đăng ký thêm phần tử

```js
// Thêm MoMo sau này:
STRATEGIES.push(new MomoPaymentStrategy());
// Không sửa if/else trong orders route
```

## File thật trong project

`server/src/patterns/payment/paymentStrategyRegistry.js` (tương tự discount/command registry)
