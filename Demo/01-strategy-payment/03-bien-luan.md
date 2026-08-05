# Strategy — Thanh toán: Biện luận

Trước khi áp dụng Strategy, toàn bộ hành vi thanh toán COD, VNPAY và trả góp bị nhồi vào một chuỗi `if/else` ngay trong luồng tạo đơn, nên mỗi lần bổ sung cổng thanh toán mới phải sửa tiếp khối điều kiện trung tâm và dễ làm ảnh hưởng phần đã chạy ổn. Sau khi tách mỗi phương thức thành một strategy cùng interface và để checkout chỉ gọi `resolvePaymentStrategy()`, quy trình đặt hàng trở thành khung chung còn khác biệt nghiệp vụ nằm ở từng class riêng. Nhờ đó hệ thống mở rộng theo nguyên tắc Open/Closed: thêm MoMo hay ZaloPay chủ yếu là thêm class mới và đăng ký registry, không phải viết lại logic tạo đơn.

Ưu điểm nổi bật là code checkout gọn hơn, dễ đọc và dễ kiểm thử từng PTTT độc lập. Nhược điểm là số lượng file tăng lên và người mới vào project cần hiểu cơ chế registry trước khi chỉnh sửa thanh toán; nếu quên đăng ký strategy mới thì resolve sẽ trả về `null` và checkout báo lỗi phương thức không hợp lệ.
