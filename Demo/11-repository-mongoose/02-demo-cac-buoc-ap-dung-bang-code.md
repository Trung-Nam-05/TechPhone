# Repository — Mongoose: Demo các bước áp dụng bằng code

## Bước 1 — Khai báo Model (Repository) theo thực thể

```js
// models/User.js
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
```

## Bước 2 — Route/service gọi Model thay vì collection thô

```js
// trước
db.collection('users').insertOne({ ... })
db.collection('orders').find({ user: userId })

// sau
await User.create({ name, email, passwordHash, role: 'customer' });
const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
```

## Bước 3 — Đưa validation/index vào schema

```js
orderSchema.index({ user: 1, createdAt: -1 });
productSchema.index({ slug: 1 }, { unique: true });
```

## File thật trong project

`server/src/models/*.js`, dùng trong `routes/auth.js`, `routes/orders.js`, …
