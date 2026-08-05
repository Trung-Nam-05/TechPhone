# State — Đơn hàng: Biện luận

Trước khi có State Pattern, luật chuyển trạng thái đơn được viết bằng các điều kiện rời rạc nên rất dễ cho phép nhảy trạng thái sai, đặc biệt khi admin được “mở hết” mà không có ràng buộc. Sau khi gom hành vi vào state machine và registry, mọi cập nhật từ VNPAY, GHN, khách hủy đơn hay admin đổi status đều đi qua cùng một cổng kiểm tra. Hệ thống chỉ được tiến theo chiều hợp lệ, còn override của admin phải kèm lý do đủ dài, nhờ đó vòng đời đơn phản ánh đúng nghiệp vụ vận hành thay vì phụ thuộc cảm giác của từng đoạn code.

Ưu điểm lớn nhất là giảm lỗi chuyển trạng thái và giúp UI timeline/stepper dùng chung nguồn luật với backend. Nhược điểm là khi bổ sung trạng thái mới phải cập nhật đồng bộ constants, registry và máy trạng thái; nếu cập nhật thiếu một chỗ sẽ xuất hiện hành vi không nhất quán giữa các kênh cập nhật đơn.
