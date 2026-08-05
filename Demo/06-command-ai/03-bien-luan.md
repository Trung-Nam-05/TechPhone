# Command — AI Tools: Biện luận

Trước khi áp dụng Command, mỗi tool chatbot được gọi bằng chuỗi điều kiện theo tên nên declaration gửi cho Gemini và hàm xử lý dễ lệch nhau, đồng thời cứ thêm tool là phải nối thêm nhánh. Sau khi đóng gói từng tool thành `AiToolCommand` có cả schema mô tả và `execute`, registry chỉ việc tra tên rồi chạy đúng lệnh. Nhờ đó phần AI không còn phụ thuộc một khối switch ngày càng dài, còn việc mở rộng năng lực trợ lý (tìm SP, tra đơn, xem timeline) trở thành thêm object command mới.

Ưu điểm là đồng bộ giữa khai báo tool và hành vi thực thi, code rõ ràng và dễ kiểm thử từng command. Nhược điểm là phải viết thêm boilerplate cho mỗi tool; nếu đăng ký thiếu vào `COMMANDS` thì Gemini có thể “thấy” tool ở chỗ khác nhưng runtime không execute được.
