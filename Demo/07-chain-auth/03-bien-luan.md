# Chain of Responsibility — Auth: Biện luận

Trước khi áp dụng Chain of Responsibility, mỗi handler tự viết lại đoạn lấy token, verify JWT và kiểm tra role nên logic bảo mật bị copy-paste và rất dễ quên ở một endpoint nào đó. Sau khi tách thành chuỗi `optionalAuth → requireAuth → requireAdmin`, request phải đi qua các mắt xích phù hợp trước khi chạm business logic: guest vẫn mua hàng được nhờ optional auth, trang tài khoản bắt buộc login, còn API admin chỉ mở khi đủ quyền. Cách làm này biến kiểm soát truy cập thành một pipeline tái sử dụng thay vì đoạn code lặp trong từng route.

Ưu điểm là tập trung chính sách bảo mật, giảm sót phân quyền và làm handler nghiệp vụ ngắn hơn. Nhược điểm là thứ tự gắn middleware rất quan trọng; nếu đặt `requireAdmin` trước `requireAuth` hoặc quên gắn middleware cho route mới thì hệ thống có thể báo lỗi khó hiểu hoặc vô tình mở endpoint.
