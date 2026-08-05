# Proxy — Order: Biện luận

Trước khi dùng Proxy, API khách trả nguyên document đơn hàng lấy từ database nên có thể lộ thông tin vận hành như chi tiết shipment, lỗi submit hay số lần retry mà người mua không cần biết. Sau khi thêm `createCustomerOrderView`, mọi response phía khách đi qua một lớp trung gian để ẩn `shipment` và chỉ giữ các cờ UI cần thiết như `fulfillmentPending`. Admin vẫn xem bản đầy đủ khi xử lý đơn, nhờ đó cùng một thực thể Order phục vụ hai góc nhìn khác nhau mà không phải nhân đôi model.

Ưu điểm là tăng kiểm soát dữ liệu trả ra và làm gọn payload cho frontend khách. Nhược điểm là nếu một endpoint quên gọi proxy thì vẫn có nguy cơ lộ field nội bộ; đồng thời khi UI khách cần thêm thông tin vận chuyển công khai thì phải chủ động mở rộng view proxy thay vì trả nguyên object DB.
