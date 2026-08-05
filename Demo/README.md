# Demo Design Patterns — TechPhone

Mỗi thư mục = **1 mẫu thiết kế**, trình bày theo thứ tự:

1. `01-code-truoc/` — code **trước** khi áp dụng design pattern (file `.js` đã viết dài hơn)  
   - `code-truoc.html` — mở bằng Chrome/Edge để **copy sang Word còn màu** (xem `HUONG-DAN-COPY-WORD.md`)  
2. `02-demo-cac-buoc-ap-dung-bang-code.md` — **demo các bước áp dụng bằng code**  
3. `03-bien-luan.md` — biện luận sau khi áp dụng (được gì, ưu/nhược) bằng **đoạn văn**

Tạo lại HTML màu (nếu sửa file `.js`):

```bash
node Demo/_shared/generate-code-html.mjs
```

| # | Thư mục | Pattern |
|---|---------|---------|
| 01 | `01-strategy-payment` | Strategy — Thanh toán |
| 02 | `02-strategy-discount` | Strategy — Giảm giá |
| 03 | `03-state-order` | State — Đơn hàng |
| 04 | `04-adapter-ghn` | Adapter — GHN |
| 05 | `05-proxy-order` | Proxy — Order |
| 06 | `06-command-ai` | Command — AI Tools |
| 07 | `07-chain-auth` | Chain of Responsibility |
| 08 | `08-observer-chat` | Observer |
| 09 | `09-registry-factory` | Registry / Factory |
| 10 | `10-facade-ai` | Facade |
| 11 | `11-repository-mongoose` | Repository |
| 12 | `12-pubsub-socket` | Pub-Sub |
