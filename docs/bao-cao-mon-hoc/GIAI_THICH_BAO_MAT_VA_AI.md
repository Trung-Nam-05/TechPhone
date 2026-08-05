# Giải thích Phase C (Bảo mật) và Chatbox AI Gemini

Tài liệu tham khảo cho báo cáo / vấn đáp giảng viên.

---

## 1. Rate limit — dùng gì, không phải “thuật toán phức tạp”

TechPhone dùng thư viện **`express-rate-limit`**. Cơ chế đơn giản:

**Fixed window counter (đếm request theo cửa sổ thời gian cố định)**

```
Với mỗi IP (hoặc route):
  - Cửa sổ = 15 phút (hoặc 1 phút tùy tier)
  - Đếm số request trong cửa sổ
  - Nếu > max → trả HTTP 429 Too Many Requests
  - Hết cửa sổ → reset đếm
```

Lưu trong **RAM (Map memory store)** — dev đủ dùng; production nên Redis để nhiều server cùng chia sẻ.

### Các tầng đã cấu hình (`server/src/middleware/rateLimit.js`)

| Tầng | Route | Giới hạn | Mục đích |
|------|-------|----------|----------|
| Global | Mọi `/api/*` | 300 / 15 phút / IP | Chống spam API tổng thể |
| Auth | `/api/auth/login`, `/register` | 20 / 15 phút / IP | Chống brute-force mật khẩu |
| Order | `POST /api/orders` | 10 / phút / IP | Chống spam tạo đơn |
| AI chat HTTP | `/api/ai-chat` | 60 / 15 phút (env) | Bổ sung limit HTTP |

**Thêm:** Login còn có throttle riêng trong `server/src/utils/auth.js` (khóa tạm sau 6 lần sai). AI chat còn limit **trong service** `aiChat.js` (`AI_CHAT_RATE_LIMIT`, mặc định 20 tin/phút/session).

---

## 2. CSRF guard — là gì, tại sao SPA + JWT vẫn thêm?

**CSRF (Cross-Site Request Forgery):** site xấu lừa trình duyệt gửi request hộ bạn (vd: chuyển tiền, đổi mật khẩu).

TechPhone dùng **JWT trong header `Authorization`**, không dùng cookie session → rủi ro CSRF **thấp hơn** (site lạ khó đọc token từ localStorage). Vẫn thêm lớp phòng thủ:

### `csrfGuard.js` kiểm tra 3 thứ (chỉ với POST/PUT/PATCH/DELETE):

1. **Header `X-Requested-With: TechPhone`**  
   Frontend (`api.js`, `AuthContext`) luôn gửi header cố định. Request từ form HTML site lạ thường không có header tùy ý này.

2. **Header `Origin` hoặc `Referer`**  
   Phải khớp `CLIENT_ORIGIN` (vd `http://localhost:5173`) hoặc localhost dev.

3. **Exclude webhook**  
   VNPAY return/IPN, installment webhook **không** qua guard (Gmail/VNPAY gọi từ server họ, không có header TechPhone).

**GET** (xem sản phẩm, load giỏ) **không** qua guard — chỉ request “ghi/sửa/xóa” mới check.

---

## 3. Chatbox AI Gemini — thật sự làm gì?

### Không phải “chỉ lọc database”

Luồng thực tế (`gemini.js` + `aiChatTools.js`):

```
User gõ câu hỏi
    ↓
Backend gửi câu + lịch sử chat → Google Gemini API
    ↓
Gemini (LLM) đọc system prompt + quyết định:
  - Trả lời trực tiếp (ngôn ngữ tự nhiên)
  - HOẶC gọi "tool" (function calling): searchProducts, getTopProducts, getProductDetail, getOrderStatus...
    ↓
Nếu gọi tool → server query MongoDB → trả kết quả cho Gemini
    ↓
Gemini viết câu trả lời cuối (tối đa ~100 từ, có quy tắc trong SYSTEM_PROMPT)
    ↓
Hiển thị cho user
```

**Database/tools** = nguồn dữ liệu **đúng** (giá, tồn kho, đơn hàng).  
**Gemini** = “não” hiểu câu hỏi tiếng Việt tự nhiên, chọn tool, tóm tắt, từ chối lịch sự.

### So với bộ lọc sản phẩm thường

| | Lọc / search UI | Chatbox Gemini |
|---|-----------------|----------------|
| Input | Chọn category, brand, giá | Câu tự nhiên: "laptop dưới 20 triệu cho học code" |
| Logic | Code cố định if/else | Model suy luận + gọi tool phù hợp |
| Ngoài phạm vi shop | Không trả lời | Có thể trả lời một phần hoặc gợi ý chuyển Nhân viên |

### Câu hỏi ngoài phạm vi — ví dụ "dạy tôi học C#"

System prompt **bắt buộc**:

- Chỉ dùng dữ liệu tools cho giá/SP/đơn
- Câu ngoài phạm vi → gợi ý tab **"Nhân viên"**
- Không bịa giá

**Thực tế khi hỏi "dạy tôi học C#"**: Gemini vẫn là mô hình ngôn ngữ lớn — có thể trả lời **ngắn** về C# (giống chat Google một phần), nhưng bị giới hạn bởi prompt (ngắn, ưu tiên TechPhone). Không giống mở Gemini app full — ở đây `maxOutputTokens: 280`, temperature thấp, prompt ép vai trò **trợ lý cửa hàng điện thoại**.

**Demo cho GV:** Thử 3 câu:
1. "iPhone rẻ nhất" → gọi `getTopProducts` → trả SP thật từ DB
2. "đơn hàng của tôi" (đã login) → `getOrderStatus`
3. "dạy C#" → trả lời ngắn / từ chối / gợi ý Nhân viên (tùy model)

### Tools hiện có (Command pattern)

- `searchProducts` — tìm theo từ khóa
- `getTopProducts` — rẻ nhất/đắt nhất theo category
- `getProductDetail` — chi tiết 1 SP
- `getOrderStatus` — trạng thái đơn (user đã login)

Gemini **quyết định** gọi tool nào; code **không** hard-code "câu này → query này" cho mọi câu.

---

## 4. Tóm tắt một câu cho báo cáo

- **Rate limit:** đếm request/IP theo cửa sời thời gian, chặn khi vượt ngưỡng.  
- **CSRF guard:** chỉ cho request ghi từ đúng website TechPhone (Origin + header đặc biệt).  
- **AI chat:** Gemini hiểu ngôn ngữ + gọi tool lấy dữ liệu shop; không thay thế hoàn toàn bộ lọc nhưng linh hoạt hơn cho hội thoại tự nhiên.
