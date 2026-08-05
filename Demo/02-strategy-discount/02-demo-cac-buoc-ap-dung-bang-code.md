# Strategy — Giảm giá: Demo các bước áp dụng bằng code

## Bước 1 — Tạo abstract DiscountStrategy

```js
export class DiscountStrategy {
  get type() { throw new Error('must implement'); }
  calculate(coupon, baseAmount) { throw new Error('must implement'); }
}
```

## Bước 2 — Viết từng thuật toán giảm giá

```js
export class PercentageDiscountStrategy extends DiscountStrategy {
  get type() { return 'percentage'; }
  calculate(coupon, baseAmount) {
    let amount = (baseAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscountValue != null) amount = Math.min(amount, coupon.maxDiscountValue);
    return Math.max(0, Math.min(amount, baseAmount));
  }
}

export class FixedDiscountStrategy extends DiscountStrategy {
  get type() { return 'fixed'; }
  calculate(coupon, baseAmount) {
    return Math.max(0, Math.min(coupon.discountValue, baseAmount));
  }
}
```

## Bước 3 — Registry chọn strategy theo discountType

```js
const STRATEGIES = [new PercentageDiscountStrategy(), new FixedDiscountStrategy()];
const STRATEGY_BY_TYPE = new Map(STRATEGIES.map((s) => [s.type, s]));

export function calculateDiscountAmount(coupon, baseAmount) {
  const strategy = STRATEGY_BY_TYPE.get(coupon.discountType) || STRATEGY_BY_TYPE.get('fixed');
  return strategy.calculate(coupon, baseAmount);
}
```

## Bước 4 — Pricing gọi registry, bỏ if/else

```js
// trước: if (coupon.discountType === 'percentage') ...
// sau:
const discount = calculateDiscountAmount(coupon, baseAmount);
```

## File thật trong project

`server/src/patterns/discount/*`, `server/src/services/pricing.js`
