# Pub-Sub — Socket.io: Biện luận

Trước khi dùng Pub-Sub, phía gửi tin có xu hướng gọi thẳng hàm cập nhật giao diện phía nhận nên mô hình chỉ tưởng tượng được trong một tiến trình, không phù hợp khi customer và admin mở ở hai trình duyệt khác nhau. Sau khi chuyển sang publish/subscribe trên Socket.io, người gửi chỉ phát sự kiện `message:send`, server lưu dữ liệu rồi phát `message:new` vào các room quan tâm; mọi client đang subscribe tự cập nhật state của mình. Nhờ đó sender và receiver không còn liên kết cứng về mặt UI.

Ưu điểm là hỗ trợ nhiều client đồng thời, mở rộng room/inbox dễ hơn và khớp tự nhiên với chat realtime. Nhược điểm là luồng sự kiện khó debug hơn gọi trực tiếp; cần quản lý join/leave room cẩn thận để tránh nhận nhầm tin hoặc bỏ sót thông báo.
