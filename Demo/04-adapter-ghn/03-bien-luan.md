# Adapter — GHN: Biện luận

Trước khi có Adapter, mã trạng thái của GHN bị map thẳng vào `order.status` ngay trong service đồng bộ nên domain nội bộ bị dính chặt API bên ngoài; nếu webhook, poll và retry mỗi nơi copy một đoạn map thì rất dễ lệch nhau. Sau khi đưa lớp `GhnStatusAdapter` vào, TechPhone giữ bộ trạng thái riêng và chỉ “dịch” tín hiệu carrier sang ngôn ngữ của hệ thống trước khi đưa qua state machine. Nhờ đó phần còn lại của project không cần biết `delivering` hay `ready_to_pick` nghĩa là gì theo GHN.

Ưu điểm là tách biệt rõ hệ thống ngoài và nghiệp vụ nội bộ, đồng thời mở đường thêm nhà vận chuyển khác bằng adapter mới. Nhược điểm nằm ở chất lượng bảng map: nếu thiếu mã hoặc map sai thì đơn sẽ đứng yên hoặc nhảy sai trạng thái dù các lớp khác đã đúng thiết kế.
