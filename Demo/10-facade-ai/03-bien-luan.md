# Facade — AI Tools: Biện luận

Trước khi có Facade, tầng AI phải import trực tiếp handlers và registry nên bị gắn chặt vào cấu trúc thư mục nội bộ; mỗi lần tách file Command lại kéo theo sửa import ở nhiều nơi. Sau khi tạo `aiChatTools.js` làm mặt tiền, consumer chỉ nói chuyện với một API ổn định gồm các hàm nghiệp vụ và `executeTool`, còn chi tiết bên trong được giấu đi. Điều này giúp hiện thực Command Pattern sâu hơn mà không làm rối chỗ gọi Gemini.

Ưu điểm là giảm độ phức tạp cảm nhận được từ phía ngoài và dễ refactor bên trong. Nhược điểm là nếu nhồi quá nhiều thứ vào facade thì nó trở thành “thùng chứa lớn”; cần giữ facade đúng vai trò cổng đơn giản, không biến thành nơi chứa thêm business logic mới.
