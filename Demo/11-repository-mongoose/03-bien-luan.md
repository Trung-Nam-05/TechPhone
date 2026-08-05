# Repository — Mongoose: Biện luận

Trước khi dùng Repository qua Mongoose Model, route dễ đụng thẳng driver/collection nên tầng HTTP vừa xử lý request vừa nắm chi tiết lưu trữ, khó đọc và khó thay đổi cách truy vấn. Sau khi mỗi thực thể nghiệp vụ có Model riêng (`User`, `Order`, `Product`…), các use case chỉ làm việc với API mức domain như `find`, `create`, `save`. Schema, index và một phần validation được gom tại model, giúp tách trách nhiệm rõ hơn giữa “xử lý nghiệp vụ” và “cách dữ liệu nằm trong MongoDB”.

Ưu điểm là code ứng dụng sạch hơn, nhất quán và dễ bảo trì theo từng thực thể. Nhược điểm là vẫn phụ thuộc Mongoose; với truy vấn rất phức tạp đôi khi vẫn phải viết aggregate riêng, và nếu nhét quá nhiều logic vào model thì Repository có thể phình ngoài vai trò truy cập dữ liệu.
