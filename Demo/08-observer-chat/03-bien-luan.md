# Observer — Chat: Biện luận

Trước khi dùng Observer, client phải poll API tin nhắn theo chu kỳ nên vừa tốn request vừa mang độ trễ nhân tạo dù không có tin mới. Sau khi chuyển sang mô hình sự kiện, server trở thành subject phát `message:new` còn các client đang join room đóng vai observer để cập nhật state ngay khi có thay đổi. Nhờ đó chat hỗ trợ giữa khách và admin phản hồi realtime, đồng thời tách rời việc “có dữ liệu mới” khỏi việc “ai đang nhìn màn hình nào”.

Ưu điểm rõ ràng là trải nghiệm tức thì và giảm tải so với polling dày. Nhược điểm là phụ thuộc kết nối socket ổn định; cần xử lý mất mạng, reconnect và tránh đăng ký trùng listener nếu không muốn UI nhận một tin nhiều lần.
