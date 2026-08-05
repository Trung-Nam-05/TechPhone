# Hướng dẫn cấu hình SMTP — Liên kết email TechPhone

## Email có cần API như VNPAY không?

**Không.** VNPAY cần đăng ký merchant (`TMN_CODE`, `HASH_SECRET`). Email chỉ cần **SMTP** — giao thức gửi mail chuẩn. Với đồ án/dev, **Gmail + Mật khẩu ứng dụng** là đủ, không cần đăng ký dịch vụ riêng.

TechPhone dùng **nodemailer** (`server/src/services/mail.js`) để gửi:

- Email **xác minh liên kết** (`/account/security`)
- Email **quên mật khẩu** (`/forgot-password`)

---

## Các biến trong `.env` — điền gì?

| Biến | Bắt buộc | Ý nghĩa | Ví dụ (Gmail) |
|------|----------|---------|----------------|
| `SMTP_HOST` | Có | Máy chủ SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Có | Cổng (Gmail dùng 587) | `587` |
| `SMTP_SECURE` | Có | `true` nếu port 465; Gmail 587 để `false` | `false` |
| `SMTP_USER` | Có | Email đăng nhập SMTP | `ban@gmail.com` |
| `SMTP_PASS` | Có | **Mật khẩu ứng dụng** (App Password), không phải mật khẩu Gmail thường | `abcd efgh ijkl mnop` |
| `MAIL_FROM` | Khuyến nghị | Tên hiển thị khi gửi | `TechPhone <ban@gmail.com>` |
| `API_PUBLIC_URL` | Có | URL API — link trong email xác minh trỏ về đây | `http://localhost:4000` |
| `CLIENT_ORIGIN` | Có | URL web — sau xác minh redirect về site | `http://localhost:5173` |

**Ba biến server kiểm tra trước khi gửi mail:** `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` — thiếu một cái sẽ báo *"SMTP chưa cấu hình"*.

---

## Cách lấy App Password Gmail (khuyến nghị cho sinh viên)

1. Vào https://myaccount.google.com/ → **Bảo mật**
2. Bật **Xác minh 2 bước** (bắt buộc)
3. Tìm **Mật khẩu ứng dụng** (App passwords)
4. Chọn ứng dụng: **Mail**, thiết bị: **Windows** hoặc **Khác (TechPhone)**
5. Google tạo chuỗi 16 ký tự → copy vào `SMTP_PASS` trong `.env`

Ví dụ block `.env` hoàn chỉnh:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tenban@gmail.com
SMTP_PASS=abcdefghijklmnop
MAIL_FROM=TechPhone <tenban@gmail.com>

API_PUBLIC_URL=http://localhost:4000
CLIENT_ORIGIN=http://localhost:5173
```

6. **Lưu `.env`** → **tắt và chạy lại** server: `npm run server:dev` hoặc `npm run dev:full`

---

## Test liên kết email trên web

1. Đăng nhập → **Tài khoản** → **Bảo mật** (`http://localhost:5173/account/security`)
2. Nhập email thật (có thể khác Gmail gửi đi)
3. Bấm **Gửi email xác minh**
4. Mở hộp thư (kể cả **Spam**) → bấm link
5. Trình duyệt mở `http://localhost:4000/api/auth/verify-email?token=...` → chuyển về site với thông báo thành công

---

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| SMTP chưa cấu hình | `SMTP_USER` hoặc `SMTP_PASS` để trống | Điền đủ 3 biến HOST/USER/PASS |
| Invalid login / 535 | Dùng mật khẩu Gmail thường | Dùng **App Password** |
| Không nhận mail | Spam / chưa restart server | Restart API; kiểm tra Spam |
| Link xác minh lỗi | API không chạy | Chạy server port 4000; `API_PUBLIC_URL` đúng |

---

## Outlook / dịch vụ khác (tùy chọn)

**Outlook / Hotmail:**

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ban@outlook.com
SMTP_PASS=mat_khau_outlook
```

**SendGrid / Brevo:** dùng khi deploy production, gửi nhiều email marketing — cần đăng ký tài khoản và lấy API key/SMTP credentials từ dashboard họ.

---

## Marketing email

Hiện tại app **chưa** gửi email khuyến mãi tự động. Liên kết + xác minh email là **nền tảng** để sau này gửi newsletter / xác nhận đơn qua cùng `mail.js`. Trong báo cáo GV mục 3.3.4, giải thích: *đã có SMTP + email liên kết xác minh; marketing campaign mở rộng sau*.
