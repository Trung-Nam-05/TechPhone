# Strategy — Giảm giá: Biện luận

Trước khi áp dụng Strategy, công thức giảm phần trăm và giảm cố định nằm chung trong một hàm pricing với nhiều nhánh điều kiện, khiến tầng tính tiền vừa phải hiểu nghiệp vụ đơn hàng vừa phải chứa từng kiểu coupon. Sau khi tách mỗi kiểu giảm thành strategy và để `calculateDiscountAmount` chọn đúng thuật toán theo `discountType`, service định giá chỉ còn vai trò điều phối: nhận giỏ hàng, áp coupon, cộng phí ship. Việc này giúp khi cần thêm kiểu giảm mới thì chỉ bổ sung class strategy thay vì khoan sâu vào lõi pricing.

Ưu điểm là code dễ bảo trì và dễ kiểm thử từng cách tính giảm độc lập. Nhược điểm là với hệ thống chỉ có một hoặc hai kiểu giảm đơn giản thì số lớp class có thể trông “dài dòng” hơn đoạn if ngắn; đồng thời vẫn phải đảm bảo mọi `discountType` đều được đăng ký trong registry nếu không muốn rơi về strategy mặc định ngoài ý muốn.
