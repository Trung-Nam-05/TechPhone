# Hướng dẫn trình bày Design Pattern — TechPhone

Tài liệu này giúp bạn trả lời giảng viên: **pattern nào, ở đâu, chạy thế nào, hiển thị trên website chỗ nào**.

Thang mức áp dụng trong project (sau refactor):
- ⭐ = nhận diện được / pattern ngầm
- ⭐⭐ = tách module rõ, còn if/else
- ⭐⭐⭐ = class/registry/interface rõ ràng, dễ mở rộng

---

## Bản đồ pattern core (⭐⭐⭐)

| Pattern | Mức | Thư mục code | Trang web liên quan |
|---------|-----|--------------|---------------------|
| **State** | ⭐⭐⭐ | `server/src/patterns/state/` + `orderStateMachine.js` | `/account/orders/:id`, Admin Orders |
| **Strategy (Payment)** | ⭐⭐⭐ | `server/src/patterns/payment/` + `src/patterns/paymentUiStrategies.js` | `/checkout` |
| **Strategy (Discount)** | ⭐⭐⭐ | `server/src/patterns/discount/` + `pricing.js` | `/checkout`, `/coupon` |
| **Adapter (GHN)** | ⭐⭐⭐ | `server/src/patterns/adapters/GhnStatusAdapter.js` | Order tracking, Admin Orders |
| **Proxy (Order)** | ⭐⭐⭐ | `server/src/patterns/proxy/OrderCustomerProxy.js` | `/account/orders`, API khách |
| **Command (AI Tools)** | ⭐⭐⭐ | `server/src/patterns/commands/` | Chat widget AI |
| **Chain of Responsibility** | ⭐⭐⭐ | `server/src/middleware/auth.js` | Mọi API cần login/admin |
| **Observer** | ⭐⭐⭐ | `server/src/socket.js` + React Context | Chat hỗ trợ, Support admin |

---

## 1. State Pattern — Máy trạng thái đơn hàng ⭐⭐⭐

### Pattern là gì?
Mỗi **trạng thái** (`pending`, `confirmed`, `shipping`...) có **quy tắc chuyển đổi riêng**. Behavior thay đổi theo state — không dùng if/else khổng lồ rải khắp code.

### Code ở đâu?
```
server/src/constants/orderStatus.js          → rank & shouldTransitionOrderStatus()
server/src/patterns/state/orderTransitionRegistry.js → metadata từng state
server/src/services/orderStateMachine.js     → validateSystemTransition, validateAdminStatusChange
server/src/services/orderTimeline.js         → buildOrderTimeline → buildTrackingSteps
```

### Luồng thực tế (trả lời giảng viên)

```
[Khách đặt COD]     → confirmed (auto)
[Khách đặt VNPAY]   → pending → (IPN thành công) → confirmed
[Admin xác nhận]    → confirmed → await_pickup (tạo vận đơn GHN)
[GHN webhook/poll]  → picked → shipping → completed
[Khách hủy]         → cancelled (nếu còn trong window cho phép)
[Admin override]    → bất kỳ terminal state (cần lý do ≥ 10 ký tự)
```

**Bước 1 — Checkout tạo đơn:** `orders.js` gọi `paymentStrategy.getInitialOrderStatus()` → COD = `confirmed`, VNPAY/trả góp = `pending`.

**Bước 2 — GHN cập nhật:** `ghnShipment.js` nhận status GHN → `mapGhnStatusToOrderStatus()` (Adapter) → `shouldTransitionOrderStatus()` (State) → lưu DB + `OrderEvent`.

**Bước 3 — Khách xem:** Frontend gọi `GET /api/orders/:id/timeline` → `buildOrderTimeline()` → trả `steps[]` cho stepper UI.

### Hiển thị trên website
| Vị trí | File frontend | Hiển thị gì |
|--------|---------------|-------------|
| Chi tiết đơn | `src/pages/OrderDetail.jsx` | Stepper 6 bước (Đặt hàng → Hoàn tất) |
| Danh sách đơn | `src/pages/AccountOrders.jsx` | Badge trạng thái |
| Admin | `src/pages/AdminOrders.jsx` | Dropdown đổi status + override |

### Câu trả lời mẫu cho giảng viên
> "Em dùng **State Pattern** cho vòng đời đơn hàng. Mọi chuyển trạng thái đều qua `orderStateMachine.js` — hệ thống GHN/VNPAY chỉ được tiến forward, admin override cần lý do. UI stepper ở trang Order Detail đọc `buildTrackingSteps()` từ backend, không hard-code logic ở React."

---

## 2. Strategy Pattern — Thanh toán ⭐⭐⭐

### Pattern là gì?
Mỗi phương thức thanh toán là **strategy độc lộn** implement cùng interface. Client (`orders.js`) gọi `resolvePaymentStrategy()` — **Open/Closed**: thêm MoMo chỉ cần class mới, không sửa checkout core.

### Code ở đâu?
```
server/src/patterns/payment/PaymentStrategy.js       → interface (class cơ sở)
server/src/patterns/payment/CodPaymentStrategy.js
server/src/patterns/payment/VnpayPaymentStrategy.js
server/src/patterns/payment/InstallmentPaymentStrategy.js
server/src/patterns/payment/paymentStrategyRegistry.js → resolvePaymentStrategy()
server/src/routes/orders.js                          → client dùng strategy
src/patterns/paymentUiStrategies.js                  → map UI → backend method
src/pages/Checkout.jsx                               → chọn phương thức
```

### Luồng thực tế

```
Checkout.jsx chọn "VNPAY"
    ↓
POST /api/orders { paymentMethod: 'vnpay' }
    ↓
resolvePaymentStrategy('vnpay') → VnpayPaymentStrategy
    ↓
validateCheckout() → kiểm tra VNPAY_TMN_CODE đã config
getInitialOrderStatus() → 'pending'
buildPostCreatePayload() → { paymentUrl, paymentProvider: 'vnpay' }
    ↓
Frontend redirect sang VNPAY
    ↓
VNPAY IPN → payments.vnpay.js → pending → confirmed
```

**COD Strategy:** `getInitialOrderStatus()` = `confirmed` — không cần chờ thanh toán online.

**Installment Strategy:** `buildInstallmentPayload()` tạo subdocument trả góp; `requiresProvinceDistrict()` = false.

### Hiển thị trên website
| Trang | Hành vi |
|-------|---------|
| `/checkout` | Radio chọn COD / VNPAY / Trả góp |
| `/checkout/vnpay-result` | Kết quả thanh toán VNPAY |
| `/installment` | Form trả góp (modal từ checkout) |

### Câu trả lời mẫu
> "Em tách 3 strategy: COD, VNPAY, Installment. Route checkout chỉ gọi interface chung — validate, initial status, post-create URL. Frontend có registry riêng map 7 option UI xuống 3 method backend. Muốn thêm ZaloPay em chỉ thêm `ZaloPayPaymentStrategy` và đăng ký vào registry."

---

## 3. Strategy Pattern — Giảm giá coupon ⭐⭐⭐

### Code
```
server/src/patterns/discount/PercentageDiscountStrategy.js  → giảm %
server/src/patterns/discount/FixedDiscountStrategy.js      → giảm cố định VND
server/src/patterns/discount/discountStrategyRegistry.js   → getDiscountStrategy(type)
server/src/services/pricing.js                             → calculatePricing()
```

### Luồng
```
Checkout gửi coupon codes
    ↓
calculatePricing() load coupon từ DB
    ↓
coupon.discountType === 'percentage' → PercentageDiscountStrategy.calculate()
coupon.discountType === 'fixed'      → FixedDiscountStrategy.calculate()
    ↓
Trả subtotal, shippingFee, total
```

### Hiển thị website
- `/checkout` — dòng giảm giá voucher
- `/coupon` — chọn mã trước checkout

### Câu trả lời mẫu
> "Mỗi loại coupon là một discount strategy. Pricing service không biết công thức cụ thể — chỉ delegate qua registry theo `discountType`."

---

## 4. Adapter Pattern — GHN vận chuyển ⭐⭐⭐

### Pattern là gì?
GHN API dùng mã riêng (`ready_to_pick`, `transporting`...). TechPhone dùng mã nội bộ (`await_pickup`, `shipping`...). **Adapter** chuyển đổi giữa hai hệ thống.

### Code
```
server/src/patterns/adapters/CarrierStatusAdapter.js  → interface
server/src/patterns/adapters/GhnStatusAdapter.js      → implementation
server/src/services/ghn.js                              → re-export mapGhnStatusToOrderStatus()
server/src/services/ghnShipment.js                      → applyGhnStatusUpdate()
```

### Luồng
```
GHN API trả status "transporting"
    ↓
GhnStatusAdapter.toOrderStatus("transporting") → "shipping"
    ↓
shouldTransitionOrderStatus("picked", "shipping") → true
    ↓
Order.status = "shipping" + OrderEvent + ShipmentEvent
    ↓
Khách thấy stepper nhảy sang "Đang giao"
```

### Hiển thị website
- Order Detail stepper cập nhật theo poll/webhook GHN
- Admin Orders: cột carrier status, nút retry GHN

### Câu trả lời mẫu
> "Em wrap GHN qua `GhnStatusAdapter` implement `CarrierStatusAdapter`. Sau này tích hợp GHTK chỉ cần `GhtkStatusAdapter` mới — core order logic không đổi."

---

## 5. Proxy Pattern — Ẩn dữ liệu vận chuyển ⭐⭐⭐

### Pattern là gì?
**Protection Proxy** — client nhận view an toàn của Order, không thấy `shipment.labelId`, token GHN nội bộ.

### Code
```
server/src/patterns/proxy/OrderCustomerProxy.js → createCustomerOrderView()
server/src/utils/orderSanitize.js               → re-export (backward compat)
server/src/routes/orders.js                     → GET /api/orders dùng sanitize
```

### Luồng
```
GET /api/orders (khách hàng)
    ↓
Order.find() → raw document có shipment.labelId
    ↓
sanitizeOrdersForCustomer() → shipment = undefined
    ↓
Thêm fulfillmentPending: true nếu confirmed nhưng chưa có vận đơn
    ↓
React AccountOrders hiển thị trạng thái, không lộ mã GHN
```

Admin route **không** qua proxy — thấy đầy đủ shipment.

### Câu trả lời mẫu
> "Proxy che thông tin carrier khỏi API khách hàng. Admin vẫn thấy full object. Đây là Protection Proxy — kiểm soát quyền truy cập dữ liệu."

---

## 6. Command Pattern — AI Chat Tools ⭐⭐⭐

### Code
```
server/src/patterns/commands/AiToolCommandRegistry.js  → AiToolCommand class + registry
server/src/patterns/commands/aiChatToolHandlers.js     → logic thực thi
server/src/services/gemini.js                          → gọi executeTool()
src/components/AiChatPanel.jsx                         → UI chat
```

### Luồng
```
Khách hỏi "iPhone rẻ nhất?"
    ↓
Gemini model quyết định gọi tool getTopProducts
    ↓
executeToolCommand('getTopProducts', args, { userId })
    ↓
AiToolCommand.execute() → query MongoDB → trả JSON
    ↓
Gemini tóm tắt → hiển thị trong chat widget
```

### Hiển thị website
- Góc phải màn hình: **ChatWidget** → tab AI
- `/support` — trang hỗ trợ

### Câu trả lời mẫu
> "Mỗi AI tool là một Command object có `execute()` và `declaration`. Registry map tên → command — thay switch/case rải rác, dễ thêm tool mới."

---

## 7. Chain of Responsibility — Middleware xác thực ⭐⭐⭐

### Code
```
server/src/middleware/auth.js
  optionalAuth → requireAuth → requireAdmin
server/src/index.js → app.use(optionalAuth) trước cart/orders
```

### Luồng
```
Request GET /api/admin/orders
    ↓
requireAuth: verify JWT → gắn req.auth
    ↓
requireAdmin: kiểm tra role === 'admin'
    ↓
Route handler xử lý
```

Frontend tương ứng: `ProtectedRoute.jsx` — redirect `/login` nếu chưa auth.

### Hiển thị website
- `/admin/*` — chỉ admin vào được
- `/account/*` — cần login

---

## 8. Observer Pattern — Real-time chat ⭐⭐⭐

### Code
```
server/src/socket.js                    → emit('message:new'), on('message:send')
src/context/SupportChatContext.jsx      → socket.on → setState
src/components/ChatWidget.jsx           → UI
```

### Luồng
```
Khách gửi tin nhắn
    ↓
socket.emit('message:send', { conversationId, body })
    ↓
Server lưu DB → io.to(room).emit('message:new', { message })
    ↓
Admin SupportChatContext nhận event → cập nhật inbox (không cần refresh)
```

### Hiển thị website
- Chat widget góc phải (khách)
- `/admin/support` (admin)

---

## Sơ đồ tổng hợp — Luồng đặt hàng (demo cho giảng viên)

```
[Trang Checkout]
       │
       ├─ Strategy Payment: chọn COD/VNPAY/Installment
       ├─ Strategy Discount: áp coupon
       │
       ▼
POST /api/orders
       │
       ├─ Chain of Responsibility: optionalAuth (guest có sessionId)
       ├─ Strategy Payment: resolvePaymentStrategy()
       ├─ pricing.calculatePricing() → Discount Strategy
       ├─ MongoDB Transaction: trừ stock, tạo Order
       ├─ State: initial status theo payment strategy
       │
       ▼
[VNPAY?] → redirect paymentUrl
[COD?]   → confirmed ngay → GHN tạo vận đơn
       │
       ▼
GHN webhook/poll
       │
       ├─ Adapter: GHN status → order status
       ├─ State: validate transition
       │
       ▼
GET /api/orders/:id/timeline
       │
       ├─ Proxy: sanitize cho khách
       └─ State: buildTrackingSteps → UI stepper
```

---

## Checklist trước khi bảo vệ / trả lời giảng viên

1. **Mở file pattern** trong IDE và chỉ đúng class/interface (`PaymentStrategy`, `GhnStatusAdapter`...).
2. **Demo live:** đặt đơn COD → xem stepper; đặt VNPAY → xem pending → confirmed.
3. **Giải thích SOLID:** Strategy = Open/Closed; Proxy = Single Responsibility; State = tách behavior theo trạng thái.
4. **So sánh C#:** "Interface `IPaymentStrategy` trong C# tương đương class `PaymentStrategy` + các subclass trong JS."
5. **Pattern từ thư viện:** Express middleware (Chain), React Context (Observer), Mongoose Model (Repository), Socket.io (Observer/Pub-Sub).

---

## Cấu trúc thư mục pattern (tham chiếu nhanh)

```
server/src/patterns/
├── payment/          Strategy — thanh toán
├── discount/         Strategy — giảm giá
├── adapters/         Adapter — GHN/carrier
├── state/            State — registry trạng thái đơn
├── commands/         Command — AI tools
└── proxy/            Proxy — order view khách hàng

src/patterns/
└── paymentUiStrategies.js   Strategy UI checkout
```
