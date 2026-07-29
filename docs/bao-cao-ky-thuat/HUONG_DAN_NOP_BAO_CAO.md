# Hướng dẫn nộp báo cáo kỹ thuật TechPhone

## Sinh file Word

```powershell
cd d:\DoAn_TMDT\TechPhone-main\TechPhone-main\docs\bao-cao-ky-thuat
py generate_bao_cao.py
```

Output: `Bao_cao_Ky_thuat_TechPhone.docx`

## Chạy demo trước khi chụp ảnh

```powershell
cd d:\DoAn_TMDT\TechPhone-main\TechPhone-main
npm run dev:full
```

## Demo theo topic (ưu tiên giảng viên)

### Socket.io + Chat
1. Login customer → mở widget → tab **Nhân viên** → gửi tin
2. Login admin → `/admin/support` → trả lời
3. Chụp badge unread, inbox, thread

### VNPAY
1. Cần `VNPAY_*` + `API_PUBLIC_URL` (ngrok)
2. Checkout → VNPAY → thanh toán sandbox
3. Chụp success + `/account/orders` paid

### GHN
1. Đặt đơn COD → admin `/admin/orders` → **Xác nhận & gửi GHN**
2. Chờ demo progress → chụp stepper `/account/orders/:id`

### Chatbot AI
1. Tab **Trợ lý AI** → hỏi "iPhone giá bao nhiêu?"
2. Chụp câu trả lời từ DB

## Hoàn thiện Word

1. Điền trang bìa
2. Thay `[Chèn ảnh minh chứng: ...]` bằng screenshot
3. Nộp theo hướng dẫn lớp
