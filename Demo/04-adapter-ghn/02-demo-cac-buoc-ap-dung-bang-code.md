# Adapter — GHN: Demo các bước áp dụng bằng code

## Bước 1 — Tạo interface adapter chung cho carrier

```js
export class CarrierStatusAdapter {
  get provider() { throw new Error('must implement'); }
  toOrderStatus(carrierStatus) { throw new Error('must implement'); }
  toLabel(carrierStatus) { return String(carrierStatus || ''); }
}
```

## Bước 2 — Implement adapter riêng cho GHN

```js
export class GhnStatusAdapter extends CarrierStatusAdapter {
  get provider() { return 'ghn'; }

  toOrderStatus(ghnStatus) {
    const s = String(ghnStatus || '').toLowerCase().trim();
    if (['transporting', 'delivering'].includes(s)) return 'shipping';
    if (['delivered'].includes(s)) return 'completed';
    if (['ready_to_pick', 'picking'].includes(s)) return 'await_pickup';
    // ... các mã còn lại
    return null;
  }
}

export const ghnStatusAdapter = new GhnStatusAdapter();
```

## Bước 3 — Service vận chuyển chỉ gọi adapter

```js
// trước: if (ghnStatus === 'delivering') order.status = 'shipping'
// sau:
const nextStatus = ghnStatusAdapter.toOrderStatus(carrierStatus);
if (!nextStatus) return;
const check = validateSystemTransition(order.status, nextStatus);
if (check.ok) order.status = nextStatus;
```

## File thật trong project

`server/src/patterns/adapters/CarrierStatusAdapter.js`, `GhnStatusAdapter.js`, `services/ghnShipment.js`
