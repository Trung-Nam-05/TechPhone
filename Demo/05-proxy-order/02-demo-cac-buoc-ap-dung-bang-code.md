# Proxy — Order: Demo các bước áp dụng bằng code

## Bước 1 — Viết hàm tạo view an toàn cho khách

```js
export function createCustomerOrderView(order) {
  const plain = typeof order.toObject === 'function' ? order.toObject() : { ...order };
  const hasShipment = Boolean(plain.shipment?.labelId);

  return {
    ...plain,
    shipment: undefined, // ẩn dữ liệu nội bộ
    fulfillmentPending:
      plain.status === 'confirmed' && !hasShipment && plain.paymentMethod !== 'installment',
    hasActiveShipment: hasShipment,
  };
}
```

## Bước 2 — Áp proxy ở API khách

```js
// trước
res.json(order);

// sau
res.json(createCustomerOrderView(order));
// hoặc danh sách:
res.json({ items: orders.map(createCustomerOrderView) });
```

## Bước 3 — API admin giữ bản đầy đủ

```js
// admin route: không bắt buộc qua proxy khách
res.json(order); // vẫn có shipment / GHN chi tiết
```

## File thật trong project

`server/src/patterns/proxy/OrderCustomerProxy.js`, dùng trong `server/src/routes/orders.js`
