# Chain of Responsibility — Auth: Demo các bước áp dụng bằng code

## Bước 1 — Tách thành các middleware độc lập

```js
export async function optionalAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) return next();
  try {
    await attachAuthContext(req, token);
  } catch { /* guest vẫn đi tiếp */ }
  return next();
}

export async function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    await attachAuthContext(req, token);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
}
```

## Bước 2 — Nối chuỗi theo mức bảo vệ (bỏ check inline trong handler)

```js
// trước: handler tự verify token + check role
// sau:
router.get('/api/admin/orders', requireAuth, requireAdmin, listOrdersHandler);
router.get('/api/auth/me', requireAuth, getMeHandler);
app.use('/api/cart', optionalAuth, cartRoutes);
```

## File thật trong project

`server/src/middleware/auth.js`, gắn trong `server/src/index.js` / các route admin
