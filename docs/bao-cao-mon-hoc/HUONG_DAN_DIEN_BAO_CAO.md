# Hướng dẫn điền báo cáo GV — TechPhone (Business + UX + Security)

Tài liệu này map các tính năng đã triển khai vào template **BÁO CÁO - Thương mại điện tử.docx**.  
Chụp screenshot theo từng mục khi chạy local (`npm run dev:full`).

---

## Phase A — UX Checkout

| Mục GV | Nội dung điền | Screenshot gợi ý |
|--------|---------------|------------------|
| 3.4.3 Payment (UI) | Chỉ **COD + VNPAY** hiển thị chính; 5 phương thức còn lại gom sau nút **"Xem thêm"**, badge **Sắp ra mắt**, disabled | `/checkout` — phần thanh toán |
| 3.2.x UX bán hàng | Toggle hóa đơn điện tử: **OFF xám (#e2e8f0)**, **ON xanh (#2563eb)**, có `aria-pressed` | `/checkout` — toggle hóa đơn |

**Giải thích ngắn:** Gom phương thức thanh toán giúp người dùng tập trung luồng thật (COD/VNPAY), tránh nhầm demo MoMo/ZaloPay.

---

## Phase B — Luồng VNPAY

| Mục GV | Nội dung điền | Screenshot gợi ý |
|--------|---------------|------------------|
| **3.2.3 OTP / Thanh toán online** | Sơ đồ luồng mới: không xóa giỏ trước redirect; `clearCart` khi success; API `POST /api/orders/:id/vnpay/retry-payment`; hủy pending + khôi phục giỏ | VNPAY fail → màn hình có nút **Thanh toán lại** / **Hủy đơn** |
| 3.2.3 | Banner **"Bạn có 1 đơn chờ thanh toán VNPAY"** trên `/checkout` và `/account/orders` | Checkout hoặc danh sách đơn |

**Điểm kỹ thuật (copy vào báo cáo):**

1. `Checkout.jsx`: bỏ `clearCart()` trước `window.location.assign(paymentUrl)`.
2. `VnpayResult.jsx`: gọi `clearCart()` khi `paymentStatus === 'paid'`.
3. `POST /api/orders/:id/vnpay/retry-payment` — điều kiện: `vnpay`, `pending`, `paymentStatus ∈ {pending, failed}`.
4. `cancel-immediate` + `cartRestore.js` merge `order.items` về Cart.

---

## Phase C — Bảo mật

| Mục GV | Nội dung điền | Ghi chú |
|--------|---------------|---------|
| **3.5.1** Rate limiting | `express-rate-limit`: global 300/15ph, auth 20/15ph, tạo đơn 10/phút, AI chat HTTP tier | File: `server/src/middleware/rateLimit.js` |
| **3.5.2** CSRF / Origin | Middleware kiểm tra `Origin`/`Referer` + header `X-Requested-With: TechPhone`; webhook VNPAY/installment **exclude** | File: `server/src/middleware/csrfGuard.js`, `src/config/api.js` |
| **3.5.3** JWT | Giữ Bearer JWT; ghi chú rủi ro CSRF thấp hơn cookie session | Đã có sẵn |

**Production:** Ghi chú dùng **Redis store** cho rate limit thay memory store.

---

## Phase D — SEO

| Mục GV | Nội dung điền | Screenshot / URL |
|--------|---------------|------------------|
| **3.3.2 SEO** | Meta title/description/canonical qua `PageMeta.jsx`; `index.html` lang=vi | View source trang sản phẩm |
| **3.3.2 Sitemap** | `GET /sitemap.xml` — Product + Category active | `http://localhost:4000/sitemap.xml` |
| 3.3.2 | `public/robots.txt` trỏ Sitemap | `http://localhost:5173/robots.txt` |

**Giải thích tiếng Việt (mục 3.3.2):**

- **Meta tags:** Tiêu đề + mô tả giúp Google hiểu trang; link share đẹp hơn trên mạng xã hội.
- **Sitemap:** File XML liệt kê URL để Google thu thập nhanh hơn.
- **URL thân thiện:** `/{categoryKey}/{slug}` đã có — bổ sung meta theo route.

---

## Phase E — Tài khoản & Marketing email

| Mục GV | Nội dung điền | Screenshot gợi ý |
|--------|---------------|------------------|
| **3.3.4 Marketing** | Username + **email liên kết** (`contactEmail`), xác minh SMTP, quên mật khẩu qua email đã xác minh | `/account/security`, `/register`, `/forgot-password` |
| 3.5.x | User mới: username 6–20 ký tự; email nội bộ `@users.techphone.local`; user cũ login email không đổi | Đăng ký + đăng nhập |

**API mới:**

- `POST /api/auth/link-email`
- `GET /api/auth/verify-email?token=`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

**Cấu hình:** Block SMTP trong `.env.example`.

---

## Phase F — Mục để trống / cuối cùng

| Mục GV | Nội dung |
|--------|----------|
| **3.4.2 B2B / EDI** | *"Dự án chỉ triển khai B2C; chưa có luồng B2B/EDI."* (1 câu) |
| **3.6 Deploy** | **Cuối cùng** — chưa làm trong đợt này (Vercel/Railway) |
| Ch6 Mobile app | Không làm — ghi *"Ngoài phạm vi đồ án web"* |

---

## Checklist screenshot trước khi nộp

- [ ] Checkout: toggle hóa đơn ON/OFF (2 màu rõ)
- [ ] Checkout: COD + VNPAY, nút "Xem thêm phương thức"
- [ ] VNPAY thất bại: nút thanh toán lại + hủy đơn
- [ ] Banner đơn VNPAY pending
- [ ] DevTools Network: header `X-Requested-With: TechPhone`
- [ ] `/sitemap.xml` mở được
- [ ] View page source: meta description
- [ ] Đăng ký username, liên kết email, quên mật khẩu (nếu đã cấu hình SMTP)

---

## Lệnh chạy demo

```bash
cd TechPhone-main
npm install
npm run dev:full
```

Frontend: `http://localhost:5173`  
API: `http://localhost:4000`
