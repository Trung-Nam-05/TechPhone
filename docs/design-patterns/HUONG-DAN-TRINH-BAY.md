# Hướng dẫn trình bày Design Pattern — TechPhone

> **Bản đồ đầy đủ mọi vị trí áp dụng:** xem [`PATTERN-MAP.md`](./PATTERN-MAP.md)

Tài liệu này giúp bạn trả lời giảng viên: **pattern nào, ở đâu, chạy thế nào, demo được không, hiển thị trên website chỗ nào**.

**Chú thích nguồn pattern:**
- 🏠 **Tự viết** — code trong `server/src/patterns/` hoặc service tách class/interface rõ
- 📦 **Thư viện** — pattern có sẵn trong Express, React, Mongoose, Socket.io… (project **dùng** pattern, không tự implement lại)

**Thang mức:**
- ⭐ = nhận diện được / pattern ngầm
- ⭐⭐ = tách module rõ hoặc qua thư viện
- ⭐⭐⭐ = class/registry/interface rõ ràng, dễ trình bày

---

## Bảng tổng hợp TẤT CẢ pattern (15 mục)

| # | Pattern | Nguồn | Mức | Demo live? | Trang / tính năng demo |
|---|---------|-------|-----|------------|------------------------|
| 1 | **State** (đơn hàng) | 🏠 Tự viết | ⭐⭐⭐ | ✅ Có | `/checkout`, Order Detail stepper, Admin Orders |
| 2 | **State** (flash sale) | 🏠 Tự viết | ⭐⭐⭐ | ✅ Có | Trang flash sale, countdown |
| 3 | **Strategy** (thanh toán) | 🏠 Tự viết | ⭐⭐⭐ | ✅ Có | `/checkout` — COD / VNPAY / trả góp |
| 4 | **Strategy** (giảm giá) | 🏠 Tự viết | ⭐⭐⭐ | ✅ Có | `/checkout` + nhập coupon |
| 5 | **Adapter** (GHN) | 🏠 Tự viết | ⭐⭐⭐ | ✅ Có* | Order tracking (cần GHN sync/webhook) |
| 6 | **Singleton** (database) | 🏠 Tự viết | ⭐⭐⭐ | ✅ Có | Start server — một connection MongoDB duy nhất |
| 7 | **Command** (AI tools) | 🏠 Tự viết | ⭐⭐⭐ | ✅ Có | Chat widget AI — hỏi "iPhone rẻ nhất" |
| 8 | **Template Method** | 🏠 Tự viết | ⭐⭐ | ✅ Có | Order Detail — stepper 6 bước |
| 9 | **Facade** | 🏠 Tự viết | ⭐⭐ | ✅ Có | Mọi trang gọi `api.js` thay vì fetch thô |
| 10 | **Chain of Responsibility** | 📦 Express | ⭐⭐⭐ | ✅ Có | Vào `/admin` không login → 401/redirect |
| 11 | **Observer** (real-time chat) | 📦 Socket.io + React | ⭐⭐⭐ | ✅ Có | 2 tab: khách chat + admin `/admin/support` |
| 12 | **Composite** (UI tree) | 📦 React | ⭐⭐ | ✅ Có | Mở React DevTools — cây component |
| 13 | **Repository** | 📦 Mongoose | ⭐⭐ | ⚠️ Gián tiếp | Checkout trừ stock — model `Order`, `Product` |
| 14 | **Front Controller** | 📦 React Router | ⭐⭐ | ✅ Có | Đổi URL → `App.jsx` route map |
| 15 | **Unit of Work** | 📦 MongoDB session | ⭐⭐ | ⚠️ Gián tiếp | Checkout transaction — rollback nếu lỗi |

\* Adapter GHN: demo tốt nhất khi có vận đơn GHN thật hoặc bật demo fulfillment env.

**Chưa có pattern tự viết rõ:** Decorator (pricing stack coupon + flash sale còn if/else — chỉ nhắc nếu giảng viên hỏi mở rộng).

---

## Giải đáp nhanh 3 câu hỏi hay nhầm

### Adapter — có phải chuyển trạng thái GHN sang trạng thái web không?

**Đúng.** GHN API trả mã riêng (`ready_to_pick`, `transporting`, `delivered`…). TechPhone dùng mã nội bộ (`await_pickup`, `shipping`, `completed`…). `GhnStatusAdapter.toOrderStatus()` **chuyển đổi** mã GHN → `order.status` của web. Sau đó **State Pattern** mới validate và lưu.

| Thuật ngữ GoF | Trong TechPhone |
|---------------|-----------------|
| **Adaptee** | GHN API (mã status bên ngoài) |
| **Target** | `CarrierStatusAdapter.toOrderStatus()` — interface web mong muốn |
| **Adapter** | `GhnStatusAdapter` |
| **Client** | `ghnShipment.js`, `ghnSync.js`, webhook GHN |

### Command — có phải tạo lệnh cho chatbox AI không?

**Đúng.** Mỗi chức năng AI (tìm SP, xem đơn, timeline…) là một **Command object** có `execute()` và `declaration` (schema cho Gemini). Gemini quyết định gọi lệnh nào → registry tìm command → `execute()` query DB → trả kết quả cho AI tóm tắt.

| Thuật ngữ GoF | Trong TechPhone |
|---------------|-----------------|
| **Command** | Class `AiToolCommand` |
| **ConcreteCommand** | `searchProducts`, `getTopProducts`, `getMyOrders`… |
| **Invoker** | `gemini.js` — gọi `executeToolCommand()` |
| **Receiver** | `aiChatToolHandlers.js` — logic MongoDB |

**Không nhầm với:** Command trong terminal/CMD. Ở đây là **Command Pattern OOP** — đóng gói request thành object.

### Observer — có phải user abstract báo cho user con không?

**Không đúng với TechPhone.** Mô hình bạn mô tả (cha truyền xuống con) gần **Composite + notification** hơn. Trong project, Observer là **Pub-Sub real-time**:

| Thuật ngữ GoF | Trong TechPhone (chat hỗ trợ) |
|---------------|-------------------------------|
| **Subject** (phát sự kiện) | Server Socket.io: `io.to(room).emit('message:new', …)` |
| **Observer** (đăng ký lắng nghe) | Client: `socket.on('message:new', handler)` trong `SupportChatContext.jsx` |
| **Notify** | Khi khách gửi tin → server lưu DB → emit tới **room** `conversation:{id}` và room `admin:support` |
| **Update** | Mọi observer trong room cập nhật UI (không F5) |

**Không có** class `AbstractUser` hay cây user cha-con. Có **room** (nhóm socket): ai `join` room thì nhận event — admin room nhận mọi tin mới.

**Observer thứ hai (📦 React):** `SupportChatProvider` giữ state → component con `useContext` → state đổi thì re-render (Observer qua React).

---

## 1. State Pattern — Máy trạng thái đơn hàng 🏠 ⭐⭐⭐

### Pattern là gì?
Mỗi **trạng thái** (`pending`, `confirmed`, `shipping`…) có **quy tắc chuyển đổi riêng**. Mọi đổi `order.status` qua một cổng duy nhất.

### Code ở đâu?
```
server/src/constants/orderStatus.js
server/src/patterns/state/orderTransitionRegistry.js   → metadata label
server/src/patterns/state/orderTransitionService.js    → applySystemOrderTransition (điểm vào)
server/src/services/orderStateMachine.js               → validate + buildTrackingSteps
```

### Luồng thực tế
```
[COD checkout]     → confirmed
[VNPAY checkout]   → pending → (IPN OK) → confirmed
[Admin đóng gói]  → await_pickup → GHN sync → picked → shipping → completed
[Khách hủy]        → cancelled (nếu còn trong window)
```

**GHN cập nhật:** Adapter chuyển mã GHN → `order.status` → `applySystemOrderTransition()` (State) → lưu DB + `OrderEvent`.

### Demo cho giảng viên
1. Đặt đơn COD → vào Order Detail → stepper nhảy qua "Xác nhận".
2. Đặt VNPAY → thấy `pending` → thanh toán xong → `confirmed`.
3. Admin đổi status → chỉ route admin, qua `applyAdminOrderTransition`.

### Hiển thị website
| Vị trí | File | Hiển thị |
|--------|------|----------|
| Chi tiết đơn | `OrderDetail.jsx` | Stepper 6 bước |
| Admin | `AdminOrders.jsx` | Dropdown status |

### Câu trả lời mẫu
> "State Pattern em gom về `orderTransitionService.js`. GHN, VNPAY, admin đều gọi `applySystemOrderTransition` — không set `order.status` trực tiếp."

---

## 2. State Pattern — Flash Sale 🏠 ⭐⭐⭐

### Code
`server/src/patterns/state/flashSaleStateRegistry.js` → `resolveFlashSaleState()` (inactive / upcoming / active / sold_out / ended)

### Demo
- Mở trang flash sale khi campaign active → badge/countdown.

---

## 3. Strategy Pattern — Thanh toán 🏠 ⭐⭐⭐

### Code
```
server/src/patterns/payment/PaymentStrategy.js + Cod/Vnpay/Installment
server/src/patterns/payment/paymentStrategyRegistry.js
src/patterns/paymentUiStrategies.js + Checkout.jsx
```

### Luồng
```
Checkout chọn VNPAY → resolvePaymentStrategy('vnpay')
→ getInitialOrderStatus() = 'pending'
→ buildPostCreatePayload() = { paymentUrl }
→ redirect VNPAY → IPN → confirmed
```

### Demo
- `/checkout`: đổi COD ↔ VNPAY ↔ trả góp, chỉ ra initial status khác nhau.

### Câu trả lời mẫu
> "3 ConcreteStrategy: COD, VNPAY, Installment. Client `orders.js` chỉ gọi interface — Open/Closed."

---

## 4. Strategy Pattern — Giảm giá coupon 🏠 ⭐⭐⭐

### Code
`patterns/discount/` + `pricing.js` → `getDiscountStrategy(discountType)`

### Demo
- Checkout + mã coupon `%` hoặc `fixed` → dòng giảm giá đổi theo strategy.

---

## 5. Adapter Pattern — GHN 🏠 ⭐⭐⭐

### Pattern là gì?
**Chuyển đổi interface** giữa hai hệ thống: mã trạng thái GHN → mã `order.status` nội bộ TechPhone. **Không** tự giao hàng — chỉ **dịch** status.

### Code
```
server/src/patterns/adapters/CarrierStatusAdapter.js  → Target (interface)
server/src/patterns/adapters/GhnStatusAdapter.js      → Adapter
server/src/services/ghnShipment.js                    → Client
```

### Luồng
```
GHN trả "transporting"
  → GhnStatusAdapter.toOrderStatus("transporting") = "shipping"
  → applySystemOrderTransition(order, "shipping")   ← State (bước sau Adapter)
  → UI stepper: "Đang giao"
```

### Demo
- Có đơn GHN: xem Admin Orders carrier status vs stepper khách.
- Hoặc mô tả mapping trong `GhnStatusAdapter.js` (mở file chỉ dòng map).

### Câu trả lời mẫu
> "Adapter **chuyển mã GHN sang status web**. State Pattern **quản lý** việc được phép đổi status hay không. Hai pattern phối hợp, không thay nhau."

---

## 6. Singleton Pattern — Kết nối MongoDB 🏠 ⭐⭐⭐

### Pattern là gì?
**Singleton** đảm bảo class chỉ có **một instance** — toàn server dùng chung một connection pool MongoDB, không tạo connection mới mỗi request.

| Thuật ngữ GoF | Trong TechPhone |
|---------------|-----------------|
| **Singleton** | Class `DatabaseConnection` |
| **getInstance()** | `DatabaseConnection.getInstance()` |
| **Private constructor** | `constructor()` throw nếu gọi `new` trực tiếp lần 2 |
| **Client** | `index.js` → `connectDatabase()` lúc start server |

### Code
```
server/src/patterns/singleton/DatabaseConnection.js  → class Singleton
server/src/config/db.js                              → Facade: connectDatabase()
server/src/index.js                                  → await connectDatabase() (một lần)
```

### Luồng
```
node index.js
  → connectDatabase()
  → DatabaseConnection.getInstance().connect()
  → mongoose.connect() một lần
  → mọi Model (Order, Product…) dùng chung mongoose.connection
```

### Demo cho giảng viên
1. Mở `DatabaseConnection.js` — chỉ ra `static getInstance()` và guard constructor.
2. Start server → log "TechPhone API listening" — chỉ **một** lần connect DB (không connect lại mỗi API).
3. (Tuỳ chọn) So sánh C#: `DatabaseConnection.Instance` tương đương `getInstance()`.

**Singleton phụ (ngầm):** `socket.js` — biến `let io = null`, `initSocket()` gán một instance Socket.io.

### Câu trả lời mẫu
> "Em dùng Singleton cho kết nối MongoDB: class `DatabaseConnection` có `getInstance()`, server start gọi `connect()` một lần. Mọi route/model dùng chung connection pool — tránh mở nhiều connection tốn tài nguyên."

---

## 7. Command Pattern — AI Chat Tools 🏠 ⭐⭐⭐

### Pattern là gì?
Mỗi **lệnh** AI có thể gọi (tìm SP, xem đơn…) là object Command — tách **ai gọi** (Gemini) khỏi **làm gì** (handler).

### 5 commands
`searchProducts`, `getTopProducts`, `getProductDetail`, `getMyOrders`, `getOrderTimeline`

### Luồng
```
Khách: "iPhone rẻ nhất?"
  → Gemini chọn tool getTopProducts
  → executeToolCommand('getTopProducts', args)
  → AiToolCommand.execute() → MongoDB
  → JSON trả Gemini → câu trả lời chat
```

### Demo
- Mở ChatWidget tab AI → hỏi sản phẩm / đơn hàng → chỉ `AiToolCommandRegistry.js` khi giảng viên hỏi sâu.

### Câu trả lời mẫu
> "Command Pattern đóng gói từng tool AI thành object có `execute()`. Thêm tool mới = thêm ConcreteCommand vào registry, không sửa Gemini core."

---

## 8. Template Method 🏠 ⭐⭐

### Pattern là gì?
Khung thuật toán **cố định** (`buildTrackingSteps`: 6 bước), các bước con điền theo **primitive** (`STATUS_TO_STEP`, labels).

### Code
`orderStateMachine.js` → `buildTrackingSteps(currentStatus)`

### Demo
- Order Detail: pending vs shipping vs cancelled — cùng 6 bước khung, trạng thái done/active/error khác nhau.

### Thuật ngữ (giống đề thi Câu 2)
- **Template Method:** `buildTrackingSteps()`
- **Primitive Operation:** map status → index, label từ registry

---

## 9. Facade Pattern 🏠 ⭐⭐

### Pattern là gì?
Che **nhiều bước phức tạp** sau một API đơn giản.

| Facade | Che giấu |
|--------|----------|
| `src/config/api.js` | fetch, header JWT, session, error |
| `server/src/services/vnpay.js` | HMAC, build URL VNPAY |
| `server/src/services/orderTimeline.js` | events + steps + sanitize khách |
| `server/src/services/aiChatTools.js` | re-export command layer |

### Demo
- Mở `api.js` — mọi page gọi `authFetch('/orders')` thay vì tự ghép header.

---

## 10. Chain of Responsibility 📦 Express ⭐⭐⭐

### Pattern là gì?
Request đi qua **chuỗi middleware** — mỗi handler xử lý hoặc chuyển tiếp.

### Code
```
server/src/middleware/auth.js → optionalAuth → requireAuth → requireAdmin
server/src/index.js
src/components/ProtectedRoute.jsx  (frontend tương ứng)
```

### Demo
- Vào `/admin/orders` chưa login → redirect login (chuỗi auth chặn).

### Câu trả lời mẫu
> "Chain of Responsibility từ **thư viện Express** — em cấu hình pipeline auth, không tự viết lại framework."

---

## 11. Observer Pattern 📦 Socket.io + React ⭐⭐⭐

### Hai lớp Observer trong project

**A. Real-time chat (Socket.io) — demo chính**

```
Subject:  server socket.js → io.to(room).emit('message:new', payload)
Observer: SupportChatContext → socket.on('message:new', handler)
```

Luồng:
```
Khách gửi tin (tab 1)
  → socket.emit('message:send')
  → server lưu DB
  → emit tới room conversation:{id} VÀ admin:support
  → Admin tab 2: socket.on nhận → cập nhật inbox (không refresh)
```

**B. React re-render (📦 React Context)**
```
Subject:  state trong SupportChatProvider
Observer: component dùng useContext(SupportChatContext)
Notify:   setState → React re-render subscribers
```

### Demo (quan trọng nhất)
1. Mở 2 trình duyệt: khách + admin `/admin/support`.
2. Khách gửi tin → admin thấy ngay.
3. Giải thích: **Subject = server emit**, **Observer = socket.on** — không phải user cha-con.

### Câu trả lời mẫu
> "Observer em demo qua chat real-time: server là Subject phát event, client đăng ký `socket.on` là Observer. Pattern từ **Socket.io** (Pub-Sub)."

---

## 12. Composite Pattern 📦 React ⭐⭐

### Pattern là gì?
Cây component: **Composite** (layout chứa con) và **Leaf** (nút lá) cùng interface render.

### Ví dụ
```
App.jsx
  └─ StoreLayout (Composite)
       ├─ Header (Leaf)
       ├─ Outlet → ProductPage (Composite)
       └─ Footer (Leaf)
```

### Demo
- React DevTools → Components tree.

---

## 13. Repository 📦 Mongoose ⭐⭐

### Pattern là gì?
Model Mongoose (`Order`, `Product`) đóng vai **Repository** — abstract truy cập DB.

### Demo gián tiếp
- Checkout: `Product.findById`, `Order.create` trong transaction.

---

## 14. Front Controller 📦 React Router ⭐⭐

### Code
`src/App.jsx` — mọi URL map về một route table.

### Demo
- Đổi `/checkout` ↔ `/account/orders` — một entry point điều phối.

---

## 15. Unit of Work 📦 MongoDB session ⭐⭐

### Code
Checkout trong `orders.js` — `mongoose.startSession()` + transaction: trừ stock + tạo order + coupon usage — rollback nếu lỗi.

---

## Sơ đồ tổng hợp — Luồng đặt hàng (demo cho giảng viên)

```
[Trang Checkout]
       │
       ├─ Strategy Payment (🏠)
       ├─ Strategy Discount (🏠)
       ▼
POST /api/orders
       │
       ├─ Chain of Responsibility (📦 Express)
       ├─ Strategy Payment + Discount
       ├─ Unit of Work (📦 MongoDB transaction)
       ├─ State: initial status (🏠)
       ▼
[VNPAY?] redirect | [COD?] confirmed → GHN
       ▼
GHN webhook/poll
       │
       ├─ Adapter: GHN → order.status (🏠)
       ├─ State: applySystemOrderTransition (🏠)
       ▼
GET /api/orders/:id/timeline
       │
       └─ Template Method: buildTrackingSteps (🏠)
```

---

## Checklist trước khi bảo vệ

1. **Phân biệt 🏠 vs 📦** — 7 pattern tự viết trong `patterns/` + 8 pattern thư viện/gián tiếp.
2. **Demo ưu tiên:** Start server (Singleton) → Checkout (Strategy) → Order stepper (State) → Chat 2 tab (Observer).
3. **Ba câu không nhầm:** Adapter = dịch mã GHN; Command = lệnh AI; Observer = emit/on, không phải user abstract.
4. **SOLID:** Strategy = Open/Closed; Singleton = một connection DB; State = tách theo trạng thái.
5. **So C#:** `interface IPaymentStrategy` ≈ class `PaymentStrategy` + subclass JS.

---

## Cấu trúc thư mục pattern (🏠 tự viết)

```
server/src/patterns/
├── payment/          Strategy — thanh toán
├── discount/         Strategy — giảm giá
├── adapters/         Adapter — GHN → order.status
├── state/            State — đơn + flash sale + transition service
├── commands/         Command — AI tools
├── singleton/        Singleton — DatabaseConnection

src/patterns/
└── paymentUiStrategies.js
```

Pattern 📦 thư viện **không** nằm trong folder này — xem bảng tổng hợp mục đầu tài liệu.
