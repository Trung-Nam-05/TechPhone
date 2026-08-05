# Registry / Factory: Biện luận

Dù đã có các class Strategy, nếu chỗ gọi vẫn dùng `if` để `new` từng strategy thì điểm mở rộng vẫn nằm rải ở client và dễ sót khi thêm phương thức mới. Registry/Factory giải quyết việc đó bằng cách giữ một danh sách instance đã đăng ký và cung cấp hàm `resolve...` duy nhất. Sau khi áp dụng, route checkout không còn quan tâm cách khởi tạo COD hay VNPAY; nó chỉ xin “strategy phù hợp với giá trị đầu vào”, còn việc bổ sung PTTT mới tập trung ở đăng ký mảng `STRATEGIES`.

Ưu điểm là giảm trùng lặp, làm rõ nơi mở rộng hệ thống và đi cùng Strategy rất tự nhiên. Nhược điểm là registry trở thành điểm phụ thuộc trung tâm: quên push strategy mới hoặc normalize sai key sẽ khiến toàn bộ luồng resolve thất bại dù class đã viết xong.
