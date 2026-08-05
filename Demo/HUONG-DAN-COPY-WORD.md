# Cách copy code sang Word vẫn còn màu

File `.js` / `.md` copy thẳng thường **mất màu**. Làm theo 1 trong các cách dưới.

---

## Cách 1 — Mở `code-truoc.html` (khuyên dùng)

Trong mỗi mẫu đã có file:

`Demo/0x-.../01-code-truoc/code-truoc.html`

1. Double-click mở bằng **Chrome** hoặc **Edge** (cần mạng lần đầu để tải bộ tô màu).
2. Bôi đen toàn bộ khối code màu.
3. `Ctrl + C`.
4. Trong Word: `Ctrl + V`.
5. Nếu mất màu: chuột phải chỗ dán → **Keep Source Formatting** / **Giữ định dạng nguồn**.  
   Hoặc **Paste Special** → **HTML Format**.

Sau khi sửa file `.js`, chạy lại:

```bash
node Demo/_shared/generate-code-html.mjs
```

---

## Cách 2 — Copy từ Cursor / VS Code

1. Mở file `.js` trong Cursor.
2. Bôi đen code.
3. `Ctrl + Shift + P` → gõ **Copy With Syntax Highlighting** → Enter.  
   (Hoặc chuột phải nếu có menu đó.)
4. Dán Word bằng **Keep Source Formatting**.

---

## Cách 3 — Chụp ảnh màn hình

Luôn giữ màu 100%, nhưng không sửa được chữ trong Word. Dùng khi chỉ cần minh họa slide.

---

## Lưu ý Word

- Word đôi khi “nuốt” màu nếu dán vào style Heading/Normal đặc biệt → dán vào đoạn văn thường.
- Nên dán vào bảng 1 cột hoặc khung text để code không bị nhảy font.
