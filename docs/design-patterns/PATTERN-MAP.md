# Bản đồ Design Pattern — TechPhone (đầy đủ vị trí áp dụng)

Tài liệu này liệt kê **mọi nơi** mỗi pattern được dùng. Dùng khi giảng viên hỏi: *"Pattern X nằm ở đâu, chạy khi nào, demo được không?"*

**Chú thích:**
- 🏠 **Tự viết** — module trong `server/src/patterns/` hoặc service có class/interface rõ
- 📦 **Thư viện** — pattern có sẵn trong framework (Express, React, Mongoose, Socket.io…)

**Thang mức:** ⭐⭐⭐ = dễ trình bày | ⭐⭐ = gián tiếp / implicit | ⭐ = ngầm

---

## Bảng master — 15 pattern

| # | Pattern | Nguồn | Mức | Core code | Demo? |
|---|---------|-------|-----|-----------|-------|
| 1 | State (đơn hàng) | 🏠 | ⭐⭐⭐ | `patterns/state/orderTransitionService.js` | ✅ |
| 2 | State (flash sale) | 🏠 | ⭐⭐⭐ | `patterns/state/flashSaleStateRegistry.js` | ✅ |
| 3 | Strategy (thanh toán) | 🏠 | ⭐⭐⭐ | `patterns/payment/` | ✅ |
| 4 | Strategy (giảm giá) | 🏠 | ⭐⭐⭐ | `patterns/discount/` | ✅ |
| 5 | Adapter (GHN) | 🏠 | ⭐⭐⭐ | `patterns/adapters/GhnStatusAdapter.js` | ✅* |
| 6 | Singleton (database) | 🏠 | ⭐⭐⭐ | `patterns/singleton/DatabaseConnection.js` | ✅ |
| 7 | Command (AI) | 🏠 | ⭐⭐⭐ | `patterns/commands/` | ✅ |
| 8 | Template Method | 🏠 | ⭐⭐ | `orderStateMachine.buildTrackingSteps()` | ✅ |
| 9 | Facade | 🏠 | ⭐⭐ | `api.js`, `vnpay.js`, `orderTimeline.js` | ✅ |
| 10 | Chain of Responsibility | 📦 Express | ⭐⭐⭐ | `middleware/auth.js` | ✅ |
| 11 | Observer | 📦 Socket.io + React | ⭐⭐⭐ | `socket.js` + `SupportChatContext.jsx` | ✅ |
| 12 | Composite | 📦 React | ⭐⭐ | `src/components/`, layouts | ✅ |
| 13 | Repository | 📦 Mongoose | ⭐⭐ | `server/src/models/*` | ⚠️ |
| 14 | Front Controller | 📦 React Router | ⭐⭐ | `src/App.jsx` | ✅ |
| 15 | Unit of Work | 📦 MongoDB | ⭐⭐ | checkout transaction `orders.js` | ⚠️ |

\* Adapter GHN: cần vận đơn GHN hoặc env demo.

**Không có 🏠 rõ:** Decorator (pricing stack chưa tách class).

---

## Giải thích ngắn — Adapter / Command / Observer

### Adapter (mục 5)
**Có — chuyển trạng thái GHN → trạng thái web (`order.status`).**  
`GhnStatusAdapter.toOrderStatus('transporting')` → `'shipping'`. Sau đó State Pattern validate và lưu.

| GoF | File |
|-----|------|
| Target | `CarrierStatusAdapter.js` |
| Adaptee | GHN API status codes |
| Adapter | `GhnStatusAdapter.js` |
| Client | `ghnShipment.js`, `ghnSync.js`, `shipping.ghn.js` |

### Command (mục 7)
**Có — mỗi tool chatbox AI là một lệnh (Command object).**  
Gemini gọi `executeToolCommand(name, args)` → `AiToolCommand.execute()`.

| GoF | File |
|-----|------|
| Command | `AiToolCommand` class |
| ConcreteCommand | 5 tools trong registry |
| Invoker | `gemini.js` |
| Receiver | `aiChatToolHandlers.js` |

### Observer (mục 12)
**Không phải user abstract → user con.**  
TechPhone dùng **Pub-Sub**: server **Subject** (`io.emit`) → client **Observer** (`socket.on`).

| GoF | TechPhone |
|-----|-----------|
| Subject | `socket.js` — `io.to(room).emit('message:new', …)` |
| Observer | `SupportChatContext.jsx` — `socket.on('message:new', …)` |
| Attach/Subscribe | `socket.on(...)` khi connect |
| Notify | Server emit sau `sendMessage()` |
| Update | `setState` → UI chat cập nhật |

**Room** (`conversation:{id}`, `admin:support`) = nhóm observer, **không** phải cây user cha-con.

---

## 1. State Pattern — Vòng đời đơn hàng 🏠 ⭐⭐⭐

**Mục đích:** Mọi chuyển `order.status` qua `orderTransitionService.js`, validate trước khi lưu.

### Core modules
| File | Vai trò | Vai trò pattern |
|------|---------|-----------------|
| `constants/orderStatus.js` | Rank, `shouldTransitionOrderStatus()` | Guard rules |
| `patterns/state/orderTransitionRegistry.js` | Label, tracking flow | Registry metadata |
| `patterns/state/orderTransitionService.js` | **Single entry** | **Context / Service** |
| `services/orderStateMachine.js` | Validator + `buildTrackingSteps` | Validator + Template Method |

### Tất cả nơi gọi chuyển trạng thái

| # | Nơi gọi | Hàm | Trang web |
|---|---------|-----|-----------|
| 1 | `routes/orders.js` | Checkout — `getInitialOrderStatus()` | `/checkout` |
| 2 | `routes/payments.vnpay.js` | `applyVnpayPaymentSuccess()` | `/checkout/vnpay-result` |
| 3 | `services/ghnShipment.js` | `applySystemOrderTransition` | Order stepper |
| 4 | `services/ghnShipment.js` | `applyOrderCancellation` | Admin Orders |
| 5 | `services/orderFulfillment.js` | Demo fulfillment | (env demo) |
| 6 | `routes/admin.orders.js` | Admin đóng gói | `/admin/orders` |
| 7 | `routes/admin.orders.js` | `applyAdminOrderTransition` | `/admin/orders` |
| 8 | `routes/admin.orders.js` | `applyOrderCancellation` | `/admin/orders` |
| 9 | `routes/orders.js` | Khách hủy pending | `/account/orders/:id` |
| 10 | `services/orderTimeline.js` | `buildTrackingSteps()` (read-only) | Order Detail |

### Demo
Đặt COD → stepper; VNPAY pending→confirmed; admin đổi status.

---

## 2. State Pattern — Flash Sale 🏠 ⭐⭐⭐

| File | Vai trò |
|------|---------|
| `patterns/state/flashSaleStateRegistry.js` | `resolveFlashSaleState()` |

| # | File | Cách dùng |
|---|------|-----------|
| 1 | `services/flashSale.js` | `getFlashSaleStatus()` |
| 2 | `services/productPrice.js` | Guard giá vs flash sale |
| 3 | `services/productGuards.js` | Guard xóa SP (business rules, không phải pattern) |
| 4 | `routes/orders.js` | Giá flash checkout |
| 5 | `src/utils/flashSale.js` | UI countdown |

---

## 3. Strategy Pattern — Thanh toán 🏠 ⭐⭐⭐

| File | Vai trò |
|------|---------|
| `patterns/payment/PaymentStrategy.js` | Strategy interface |
| `patterns/payment/CodPaymentStrategy.js` | ConcreteStrategy |
| `patterns/payment/VnpayPaymentStrategy.js` | ConcreteStrategy |
| `patterns/payment/InstallmentPaymentStrategy.js` | ConcreteStrategy |
| `patterns/payment/paymentStrategyRegistry.js` | Context lookup |

| # | File |
|---|------|
| 1 | `routes/orders.js` — checkout |
| 2 | `routes/payments.vnpay.js` — IPN |
| 3 | `services/ghnShipment.js` — skip GHN nếu installment |
| 4 | `routes/admin.orders.js` — validate VNPAY paid |
| 5 | `src/patterns/paymentUiStrategies.js` + `Checkout.jsx` |

---

## 4. Strategy Pattern — Giảm giá 🏠 ⭐⭐⭐

| File | Vai trò |
|------|---------|
| `patterns/discount/DiscountStrategy.js` | Interface |
| `patterns/discount/PercentageDiscountStrategy.js` | ConcreteStrategy |
| `patterns/discount/FixedDiscountStrategy.js` | ConcreteStrategy |
| `patterns/discount/discountStrategyRegistry.js` | Registry |

| # | File |
|---|------|
| 1 | `services/pricing.js` |
| 2 | `routes/orders.js` |
| 3 | `routes/admin.coupons.js` |

> `src/data/coupons.js` = demo UI localStorage, **không** dùng backend strategy.

---

## 5. Adapter Pattern — GHN 🏠 ⭐⭐⭐

**Chuyển mã status GHN → `order.status` web.**

| File | Vai trò |
|------|---------|
| `patterns/adapters/CarrierStatusAdapter.js` | Target interface |
| `patterns/adapters/GhnStatusAdapter.js` | Adapter |
| `services/ghn.js` | Re-export `mapGhnStatusToOrderStatus()` |

| # | File |
|---|------|
| 1 | `services/ghnShipment.js` → `applyGhnStatusUpdate()` |
| 2 | `services/ghnSync.js` |
| 3 | `services/ghnDemoProgress.js` |
| 4 | `routes/shipping.ghn.js` — webhook |

**Mapping ví dụ:**
| GHN (Adaptee) | Web (Target) |
|---------------|--------------|
| `ready_to_pick`, `picking` | `await_pickup` |
| `transporting`, `delivering` | `shipping` |
| `delivered` | `completed` |

Placeholder: `services/installment/providerAdapter.js` — chưa có provider con.

---

## 6. Singleton Pattern — MongoDB 🏠 ⭐⭐⭐

**Một connection pool duy nhất cho toàn server.**

| Thuật ngữ GoF | File / code |
|---------------|-------------|
| Singleton | `patterns/singleton/DatabaseConnection.js` |
| getInstance() | `DatabaseConnection.getInstance()` |
| Client | `config/db.js` → `index.js` start |

| File | Vai trò |
|------|---------|
| `patterns/singleton/DatabaseConnection.js` | Class Singleton — `connect()`, `getConnection()` |
| `config/db.js` | Facade — `connectDatabase()` giữ API cũ |
| `index.js` | Gọi `connectDatabase()` **một lần** khi boot |

**Singleton phụ (ngầm):** `socket.js` — `let io = null`, một instance Socket.io.

### Demo
Mở `DatabaseConnection.js` → chỉ `getInstance()` + private constructor → start server một lần connect.

### Câu trả lời mẫu
> "Singleton đảm bảo chỉ một instance kết nối MongoDB. Mọi Model Mongoose dùng chung pool, không tạo connection mới mỗi request."

---

## 7. Command Pattern — AI Chat 🏠 ⭐⭐⭐

**Lệnh cho chatbox AI — mỗi tool = Command object.**

| File | Vai trò |
|------|---------|
| `patterns/commands/AiToolCommandRegistry.js` | Command + registry |
| `patterns/commands/aiChatToolHandlers.js` | Receiver logic |
| `services/aiChatTools.js` | Facade |
| `services/gemini.js` | Invoker |

**5 commands:** searchProducts, getTopProducts, getProductDetail, getMyOrders, getOrderTimeline

| Frontend |
|----------|
| `context/AiChatContext.jsx`, `AiChatPanel.jsx`, `ChatWidget.jsx` |

---

## 8. Template Method 🏠 ⭐⭐

| File | Khung / Primitive |
|------|-------------------|
| `services/orderStateMachine.js` | `buildTrackingSteps()` — 6 bước cố định; primitive: `STATUS_TO_STEP`, labels |

| # | File |
|---|------|
| 1 | `services/orderTimeline.js` |
| 2 | UI Order Detail stepper |

---

## 9. Facade Pattern 🏠 ⭐⭐

| File | Che giấu |
|------|----------|
| `src/config/api.js` | HTTP + JWT + session |
| `server/src/services/vnpay.js` | HMAC + URL |
| `server/src/services/orderTimeline.js` | events + steps + sanitize khách |
| `server/src/services/aiChatTools.js` | command layer |
| `server/src/config/db.js` | wrap Singleton DB |

---

## 10. Chain of Responsibility 📦 Express ⭐⭐⭐

| File | Middleware |
|------|------------|
| `middleware/auth.js` | `optionalAuth`, `requireAuth`, `requireAdmin` |
| `index.js` | Pipeline mount |
| `admin.*.js` routes | `router.use(requireAuth, requireAdmin)` |
| `src/components/ProtectedRoute.jsx` | Frontend chain |

---

## 11. Observer 📦 Socket.io + React ⭐⭐⭐

### Socket.io (Pub-Sub) — demo chính

| Vai trò | File | Code tiêu biểu |
|---------|------|-----------------|
| Subject | `server/src/socket.js` | `io.to(room).emit('message:new', …)` |
| Observer | `src/context/SupportChatContext.jsx` | `socket.on('message:new', …)` |
| Events | cả hai | `message:new`, `conversation:updated`, `typing:update` |

| # | Luồng |
|---|-------|
| 1 | Khách `message:send` → server `sendMessage()` |
| 2 | Server emit `message:new` tới `conversation:{id}` |
| 3 | Server emit tới `admin:support` room |
| 4 | Admin `socket.on` → `setMessages` / inbox update |

### React Context Observer (📦 React)

| Subject | Observer |
|---------|----------|
| State trong `*Provider` | `useContext()` consumers |
| 6 contexts | `AuthContext`, `CartContext`, `SupportChatContext`, `AiChatContext`, `I18nContext`, `AnalyticsContext` |

| URL demo |
|----------|
| Chat widget (khách) + `/admin/support` |

---

## 12. Composite 📦 React ⭐⭐

| Loại | Ví dụ file |
|------|------------|
| Composite | `StoreLayout.jsx`, `AdminLayout.jsx`, `App.jsx` |
| Leaf | `ProductCard.jsx`, `Button`, `Header.jsx` |

Toàn bộ `src/` — cây component đồng nhất qua `children` props.

---

## 13. Repository 📦 Mongoose ⭐⭐

| Model | Dùng ở |
|-------|--------|
| `Order`, `Product`, `User`, `Coupon`… | Routes + services |
| Checkout transaction | `orders.js` — atomic create |

Pattern **Active Record** (Mongoose): model vừa schema vừa query methods.

---

## 14. Front Controller 📦 React Router ⭐⭐

| File | Vai trò |
|------|---------|
| `src/App.jsx` | Route table — mọi URL qua một map |
| `src/main.jsx` | Mount router |

---

## 15. Unit of Work 📦 MongoDB ⭐⭐

| File | Vai trò |
|------|---------|
| `routes/orders.js` | `startSession()` + transaction: stock + order + coupon |

Rollback nếu bất kỳ bước fail.

---

## Pattern từ thư viện — tóm tắt 📦

| Thư viện | Pattern | Files |
|----------|---------|-------|
| **Express** | Chain of Responsibility | `index.js`, routes |
| **Mongoose** | Repository + Active Record | `models/*` |
| **MongoDB driver** | Unit of Work | checkout session |
| **React** | Observer + Composite | `src/` |
| **React Context** | Provider (Observer variant) | `src/context/*` |
| **React Router** | Front Controller | `App.jsx` |
| **Socket.io** | Observer / Pub-Sub | `socket.js` |
| **@google/generative-ai** | Command (function calling) | `gemini.js` |
| **Vite** | Build pipeline | `vite.config.js` |

---

## Cấu trúc thư mục 🏠 (pattern tự viết)

```
server/src/patterns/
├── payment/           Strategy — thanh toán
├── discount/          Strategy — giảm giá
├── adapters/          Adapter — GHN → order.status
├── state/             State — order + flash sale + transition service
├── commands/          Command — AI tools
├── singleton/         Singleton — DatabaseConnection

src/patterns/
└── paymentUiStrategies.js
```

Pattern 📦 **không** gom vào folder trên — nằm trong middleware, models, socket, React tree.

---

## Phân loại file trong 1 pattern (🏠)

| Loại | Ví dụ | Vai trò |
|------|-------|---------|
| Interface | `PaymentStrategy.js` | Hợp đồng method |
| Concrete | `CodPaymentStrategy.js` | Implementation |
| Registry | `paymentStrategyRegistry.js` | Map key → instance |
| Service | `orderTransitionService.js` | Điểm vào — pattern chạy thật |
| Validator | `orderStateMachine.js` | Rule nghiệp vụ |
| Facade re-export | `config/db.js` | Wrap Singleton cho import cũ |

---

## Checklist trình bày nhanh

1. Mở bảng master → chọn pattern → chỉ file core + bảng "Nơi gọi".
2. **Demo ưu tiên:** Singleton (`DatabaseConnection.js`) → Checkout → Chat Observer.
3. Nhấn mạnh: **Adapter dịch mã GHN**, **Singleton = một DB connection**, **Observer = emit/on**.
4. Phân biệt 🏠 (7 pattern trong `patterns/`) vs 📦 (Express, React, Socket.io…).
5. Chi tiết demo + câu trả lời mẫu: [`HUONG-DAN-TRINH-BAY.md`](./HUONG-DAN-TRINH-BAY.md)
