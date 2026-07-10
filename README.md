# TechPhone

TechPhone is a React + Vite storefront with a Node.js + Express + MongoDB API.

## Stack

- Frontend: React, Vite, React Router
- Backend: Express, Mongoose
- Database: MongoDB Atlas

## Setup

1. Install dependencies:
   - `npm install`
2. Create `.env` from `.env.example` and set your MongoDB Atlas URI:
   - `MONGODB_URI=...`
   - `VITE_API_BASE_URL=http://localhost:4000`
3. Seed initial product data:
   - `npm run seed`

## Run

- Frontend only:
  - `npm run dev`
- Backend only:
  - `npm run server:dev`
- Frontend + Backend together:
  - `npm run dev:full`

Frontend runs on `http://localhost:5173` and API runs on `http://localhost:4000`.

## API endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)
- `GET /api/products`
- `GET /api/products/:id` (`id` can be `legacyId`, `ObjectId`, or `slug`)
- `GET /api/cart` (requires `x-session-id` header)
- `PUT /api/cart` (requires `x-session-id` header)
- `POST /api/orders` (requires `x-session-id` header)
- `GET /api/orders` (requires `x-session-id` header)
- `GET /api/admin/products` (admin)
- `POST /api/admin/products` (admin)
- `PUT /api/admin/products/:id` (admin)
- `DELETE /api/admin/products/:id` (admin)

## Atlas quick-start

1. Create an Atlas free cluster.
2. In **Database Access**, create a DB user.
3. In **Network Access**, allow your current IP (or `0.0.0.0/0` for development only).
4. Copy connection string and replace:
   - `<username>`
   - `<password>`
   - `<cluster>`
5. Save `.env`, then run:
   - `npm run seed`
   - `npm run dev:full`

The seed command also ensures an admin account:

- Email: value from `ADMIN_EMAIL`
- Password: value from `ADMIN_PASSWORD`

Then login and open `/admin/products` for CRUD.

## Luồng thanh toán tự động (Automated payment flow)

Hệ thống tự cập nhật trạng thái đơn hàng theo phương thức thanh toán — admin **không cần** bấm xác nhận cho COD/VNPAY thành công.

### COD (Thanh toán khi nhận hàng)

1. Khách đặt hàng → `POST /api/orders` với `paymentMethod: "cod"`
2. **Tự động:** `status = confirmed`, `paymentStatus = pending` (thu tiền khi giao)
3. Ghi `OrderEvent`: "Don COD duoc tu dong xac nhan"

### VNPAY (Thẻ ATM / ví)

1. Khách chọn VNPAY → tạo đơn `pending` → redirect sang cổng VNPAY
2. Thanh toán OK (`vnp_ResponseCode=00`) → callback **IPN** hoặc **return**:
   - `paymentStatus = paid`
   - `status = confirmed`
   - Ghi `OrderEvent`
3. Thanh toán thất bại → `paymentStatus = failed` (đơn giữ `pending`)

**Cấu hình VNPAY Sandbox:**

1. Đăng ký tại [https://sandbox.vnpayment.vn/devreg/](https://sandbox.vnpayment.vn/devreg/)
2. Lấy `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` → thêm vào `.env`
3. Chạy local: dùng [ngrok](https://ngrok.com/) expose port 4000:
   - `ngrok http 4000`
   - Set `API_PUBLIC_URL=https://<subdomain>.ngrok-free.app` trong `.env`
4. Trong VNPAY sandbox, return URL mặc định trỏ về `{API_PUBLIC_URL}/api/payments/vnpay/return`

### Demo fulfillment (tuỳ chọn)

Bật trong `.env`:

```env
FULFILLMENT_DEMO_ENABLED=true
```

Job nền tự chuyển đơn COD/VNPAY đã xác nhận:

- `confirmed` → `shipping` (mặc định sau 1 giờ)
- `shipping` → `completed` (mặc định sau 24 giờ)

Rút ngắn để test nhanh:

```env
FULFILLMENT_CONFIRM_TO_SHIPPING_MS=60000
FULFILLMENT_SHIPPING_TO_COMPLETE_MS=120000
```

### MoMo / ZaloPay

UI checkout hiển thị nhưng **chưa tích hợp API** — hiện xử lý như COD (demo).

---

## Luồng giao hàng GHTK (tự động)

Khi `GHTK_ENABLED=true`, hệ thống **tự tạo vận đơn** sau khi đơn chuyển sang `confirmed` (COD hoặc VNPAY thành công).

```text
pending → confirmed → await_pickup → picked → shipping → completed
                              ↓                      ↓
                         cancelled              delivery_failed / returned
```

| Trạng thái | Ý nghĩa |
|------------|---------|
| `pending` | Chờ thanh toán (VNPAY) |
| `confirmed` | Đã xác nhận, đang gửi sang GHTK |
| `await_pickup` | Đã tạo vận đơn, chờ shipper lấy hàng |
| `picked` | Đã lấy hàng / nhập kho GHTK |
| `shipping` | Đang giao |
| `completed` | Giao thành công (COD → `paymentStatus=paid`) |
| `delivery_failed` | Giao thất bại |
| `returned` | Hoàn hàng |
| `cancelled` | Đã hủy |

**Cấu hình GHTK** (xem `.env.example`):

1. Lấy **Token** + **Mã shop (PARTNER_CODE)** tại [khachhang.giaohangtietkiem.vn](https://khachhang.giaohangtietkiem.vn) → Thông tin shop
2. Điền `GHTK_*` và địa chỉ kho lấy hàng `GHTK_PICK_*`
3. Set `FULFILLMENT_DEMO_ENABLED=false` (tránh xung đột với job demo cũ)
4. **Webhook** (khuyến nghị): đăng ký URL `{API_PUBLIC_URL}/api/shipping/ghtk/webhook` với GHTK (cần ngrok khi dev local)
5. **Poll fallback**: `GHTK_POLL_ENABLED=true` — đồng bộ trạng thái mỗi 2 phút nếu chưa có webhook
6. **Auto-retry**: đơn `confirmed` + `submitError` được thử lại GHTK mỗi 5 phút (`GHTK_RETRY_MS`, tối đa 3 lần)
7. **Demo tiến trình** (`GHTK_DEMO_PROGRESS_ENABLED=true`): mô phỏng `await_pickup → picked → shipping → completed` khi **không có shipper thật** (môi trường đồ án). Tắt khi go-live có giao hàng thực.

**Thực tế vs Demo:**

| Môi trường | Trạng thái GHTK thay đổi khi nào |
|------------|----------------------------------|
| **Production / shipper thật** | GHTK cập nhật qua webhook hoặc poll khi shipper lấy hàng, giao hàng |
| **Demo đồ án** | Bật `GHTK_DEMO_PROGRESS_ENABLED=true` — hệ thống tự chuyển bước sau vài phút (mặc định: 2p → 2p → 3p) |

**State machine**: trạng thái đơn chuyển tự động qua GHTK/VNPAY; admin chỉ **ghi đè ngoại lệ** kèm lý do (≥ 10 ký tự) và audit log.

Trang khách: `/account/orders/:orderId` — stepper 6 bước + mã vận đơn GHTK (tra cứu i.ghtk.vn). Không spam log poll trùng trạng thái.

Checkout yêu cầu thêm **Tỉnh/Quận/Phường** (đúng tên GHTK, vd. `TP. Ho Chi Minh`, `Quan 1`).

---

## Checklist test

### Test COD (1 case)

- [ ] Thêm sản phẩm vào giỏ → Checkout → chọn **Thanh toán khi nhận hàng**
- [ ] Điền thông tin giao hàng → Đặt hàng
- [ ] Kiểm tra `/account/orders` hoặc Admin → Orders: `status = confirmed`, `paymentStatus = pending`
- [ ] Không cần admin bấm "xác nhận"

### Test VNPAY Sandbox (1 case)

- [ ] Cấu hình `VNPAY_*` + `API_PUBLIC_URL` (ngrok)
- [ ] Restart backend (`npm run server:dev`)
- [ ] Checkout → chọn **VNPAY** → redirect sang sandbox
- [ ] Thanh toán thành công → redirect về `/checkout/vnpay-result?success=1`
- [ ] Trang kết quả hiển thị: đơn **Đã xác nhận**, thanh toán **Đã thanh toán**
- [ ] Admin/Orders: `paymentStatus = paid`, `status = confirmed`

### Test theo dõi đơn hàng (User)

- [ ] Đặt đơn COD mới → `/account/orders` → click vào đơn → thấy stepper + mã GHTK
- [ ] Với `GHTK_DEMO_PROGRESS_ENABLED=true`: stepper tự tiến `await_pickup → picked → shipping → completed` (không cần admin)
- [ ] Trang chi tiết **không** spam cùng một trạng thái GHTK nhiều lần
- [ ] Yêu cầu hủy chỉ có trong trang chi tiết, không còn ở danh sách đơn
- [ ] Admin **Ghi đè (ngoại lệ)** với lý do ≥ 10 ký tự → ghi audit; override ngược bị chặt
- [ ] Admin duyệt hủy → đơn `cancelled` + GHTK cancel (nếu có `labelId`)

### Test GHTK (1 case)

- [ ] Lấy `GHTK_PARTNER_CODE` từ portal GHTK → điền `.env`
- [ ] `GHTK_ENABLED=true`, `FULFILLMENT_DEMO_ENABLED=false`, restart backend
- [ ] Checkout COD với Tỉnh/Quận/Phường + địa chỉ chi tiết
- [ ] Đơn chuyển `confirmed` → vài giây sau `await_pickup`, có `shipment.labelId`
- [ ] `/account/orders/:id` hoặc Admin → Chi tiết → xem timeline GHTK
- [ ] (Có webhook/ngrok hoặc poll) trạng thái cập nhật khi GHTK giao hàng
- [ ] Đơn `confirmed` + lỗi GHTK → auto-retry mỗi 5 phút (tối đa 3 lần)

---

## API endpoints (bổ sung)

- `GET /api/payments/vnpay/return` — VNPAY redirect sau thanh toán
- `GET /api/payments/vnpay/ipn` — VNPAY IPN (server-to-server)
- `POST /api/shipping/ghtk/webhook` — GHTK webhook cập nhật trạng thái vận chuyển
- `GET /api/orders/:id/timeline` — Timeline đơn + stepper (khách, owner)
- `POST /api/orders/:id/refresh-shipment` — Poll GHTK 1 lần cho đơn này
- `GET /api/orders/:id/shipment-events` — Lịch sử GHTK (khách/admin)
- `PATCH /api/admin/orders/:id/status` — Cập nhật status (override cần `override: true` + `reason`)
- `PATCH /api/admin/orders/:id/cancellation` — Duyệt/từ chối hủy (approve → auto GHTK cancel)
- `POST /api/admin/orders/:id/ghtk/retry` — Tạo lại vận đơn GHTK
- `POST /api/admin/orders/:id/ghtk/cancel` — Hủy vận đơn GHTK
