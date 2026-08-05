# Hướng dẫn Deploy TechPhone lên Render (Docker all-in-one)

Một container phục vụ **React (dist/) + Express API + Socket.io** trên cùng URL.  
Repo: https://github.com/Trung-Nam-05/TechPhone

---

## 1. Chuẩn bị trước khi deploy

- [ ] Code đã push lên branch `main` (có `Dockerfile` ở root)
- [ ] MongoDB Atlas: **Network Access** → Allow `0.0.0.0/0` (hoặc IP Render)
- [ ] Copy sẵn giá trị từ `.env` local: `MONGODB_URI`, `VNPAY_*`, `GEMINI_*`, SMTP…
- [ ] **Không** commit file `.env`

---

## 2. Tạo Web Service Docker mới trên Render

1. Đăng nhập [Render Dashboard](https://dashboard.render.com)
2. **New +** → **Web Service**
3. Connect GitHub → repo **TechPhone**, branch **main**
4. Cấu hình:
   - **Name:** `techphone` (URL: `https://techphone-xxxx.onrender.com`)
   - **Region:** Singapore
   - **Runtime:** **Docker** (Render đọc `Dockerfile` tự động)
   - **Instance type:** Free
5. **Create Web Service** — chưa Resume nếu đang hỏi; điền Environment trước

### Xử lý 2 service cũ

| Service cũ | Hành động |
|------------|-----------|
| `techphone-api` (Node) | Giữ **Suspended** hoặc xóa sau khi service mới OK |
| `techphone-frontend` (Static) | **Không cần** — xóa khi demo ổn |

---

## 3. Environment Variables (nhập 1 lần)

Vào service **techphone** → **Environment** → Add Environment Variable.

Thay `https://YOUR-APP.onrender.com` bằng URL thật (vd `https://techphone-abc123.onrender.com`).

### Bắt buộc

Thay `https://YOUR-APP.onrender.com` bằng **URL thật** trên Render Dashboard (vd `https://techphone-c4ue.onrender.com`).  
Render tự inject `RENDER_EXTERNAL_URL` — app dùng làm fallback CORS nếu bạn nhập sai URL.

| Key | Value |
|-----|-------|
| `MONGODB_URI` | *(copy từ .env local)* |
| `JWT_SECRET` | Chuỗi random dài, **khác** local dev |
| `CLIENT_ORIGIN` | URL thật từ Dashboard (copy chính xác, **không** slash cuối) |
| `API_PUBLIC_URL` | Cùng URL (VNPAY return, email verify) |
| `SOCKET_CORS_ORIGIN` | Cùng URL (chat realtime) |
| `ALLOW_LOCALHOST_ORIGINS` | `false` |
| `SERVE_STATIC` | `true` |
| `NODE_ENV` | `production` |

### VNPAY (thanh toán sandbox)

| Key | Value |
|-----|-------|
| `VNPAY_TMN_CODE` | *(copy local)* |
| `VNPAY_HASH_SECRET` | *(copy local)* |
| `VNPAY_PAYMENT_URL` | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |

### Admin (tuỳ chọn)

| Key | Value |
|-----|-------|
| `ADMIN_EMAIL` | Email admin |
| `ADMIN_PASSWORD` | Mật khẩu admin |

Sau deploy, nếu DB trống: **Shell** trên Render → `node server/scripts/seedProducts.js`

### GHN (tuỳ chọn — demo đơn giản)

| Key | Value |
|-----|-------|
| `GHN_ENABLED` | `false` |

Hoặc copy toàn bộ block `GHN_*` từ `.env` nếu cần demo vận chuyển.

### AI chat (tuỳ chọn)

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | *(copy local)* |
| `GEMINI_MODEL` | `gemini-flash-latest` |
| `AI_CHAT_RATE_LIMIT` | `20` |
| `AI_CHAT_HTTP_RATE_LIMIT` | `60` |

### SMTP email (tuỳ chọn)

| Key | Value |
|-----|-------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | Gmail của bạn |
| `SMTP_PASS` | App Password |
| `MAIL_FROM` | `TechPhone <email@gmail.com>` |

### Không cần nhập

| Key | Lý do |
|-----|-------|
| `PORT` | Render tự inject |
| `VITE_API_BASE_URL` / `VITE_SOCKET_URL` | Dockerfile build same-origin |
| `VITE_*` | Không dùng trên Render runtime |

---

## 4. Deploy & Auto-Deploy

1. **Save** Environment → Render build Docker (5–10 phút lần đầu)
2. **Logs** → chờ `TechPhone API listening`
3. Bật **Auto-Deploy** branch `main` → mỗi `git push` deploy lại (env **giữ nguyên**)
4. **Resume** service nếu đang Suspended

---

## 5. Kiểm tra sau deploy

| # | Test | Kỳ vọng |
|---|------|---------|
| 1 | `https://YOUR-APP.onrender.com/api/health` | `{"ok":true,...}` |
| 2 | Mở trang chủ | UI load |
| 3 | DevTools → Network | Request `/api/...` **cùng domain**, không localhost |
| 4 | Đăng nhập / giỏ hàng / COD | OK |
| 5 | VNPAY sandbox | Redirect + return (cold start free ~30–60s) |
| 6 | Chat Nhân viên | Socket kết nối |

---

## 6. Local Docker (tuỳ chọn)

```bash
docker compose up --build
# http://localhost:4000
# Ctrl+C hoặc: npm run docker:down
```

Dev hàng ngày vẫn dùng: `npm run dev:full`

---

## 7. Troubleshooting

| Triệu chứng | Nguyên nhân | Cách sửa |
|-------------|-------------|----------|
| Build fail OOM | Free tier RAM thấp | Deploy lại; hoặc upgrade plan tạm |
| 403 khi POST API | `CLIENT_ORIGIN` sai | Trùng URL Dashboard; hoặc chờ deploy mới (dùng `RENDER_EXTERNAL_URL`) |
| VNPAY lỗi callback | `API_PUBLIC_URL` sai | = URL Render, HTTPS |
| MongoDB timeout | Atlas chặn IP | Network Access `0.0.0.0/0` |
| Trang trắng | Build FE fail | Xem Logs build stage |
| Cold start chậm | Free tier sleep | Mở URL trước khi demo 1 phút |

---

## 8. DevOps / CI

GitHub Actions (`.github/workflows/ci.yml`): mỗi push → `lint` + `build` + `docker build`.

Báo cáo mục **3.6 Deploy**: mô tả Docker all-in-one + Render Web Service + biến môi trường + CI.
