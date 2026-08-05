# State — Đơn hàng: Demo các bước áp dụng bằng code

## Bước 1 — Định nghĩa trạng thái và thứ tự tiến

```js
// orderStatus.js (ý tưởng)
export const ORDER_STATUS_PROGRESS = {
  pending: 1,
  confirmed: 2,
  await_pickup: 3,
  picked: 4,
  shipping: 5,
  completed: 6,
};
export const TERMINAL_ORDER_STATUSES = new Set(['completed', 'cancelled', 'returned', 'delivery_failed']);
```

## Bước 2 — Registry metadata theo state

```js
// orderTransitionRegistry.js
export const ORDER_STATE_REGISTRY = {
  pending: { canCustomerCancelImmediate: true },
  confirmed: { canCustomerRequestCancel: true },
  shipping: { canCustomerRequestCancel: true },
  completed: { terminal: true },
  // ...
};
```

## Bước 3 — State machine kiểm tra chuyển trạng thái

```js
export function validateSystemTransition(fromStatus, toStatus) {
  if (!toStatus || fromStatus === toStatus) return { ok: false, reason: 'NO_CHANGE' };
  if (!shouldTransitionOrderStatus(fromStatus, toStatus)) {
    return { ok: false, reason: 'INVALID_SYSTEM_TRANSITION' };
  }
  return { ok: true };
}

export function validateAdminStatusChange(fromStatus, toStatus, { override = false, reason = '' } = {}) {
  if (override) {
    if (String(reason).trim().length < 10) {
      return { ok: false, reason: 'OVERRIDE_REASON_REQUIRED' };
    }
  }
  // ... kiểm tra forward / terminal
  return { ok: true };
}
```

## Bước 4 — Thay if/else rời bằng gọi state machine

```js
// trước: if (from === 'pending' && to === 'confirmed') ...
// sau:
const check = validateSystemTransition(order.status, nextStatus);
if (!check.ok) throw new Error(check.reason);
order.status = nextStatus;
```

## File thật trong project

`server/src/services/orderStateMachine.js`, `server/src/patterns/state/orderTransitionRegistry.js`
