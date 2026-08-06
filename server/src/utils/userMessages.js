/** User-facing API messages (Vietnamese). */

export const MSG = {
  // Auth
  AUTH_FIELDS_REQUIRED: 'Vui lòng nhập đầy đủ tên, tên đăng nhập và mật khẩu.',
  AUTH_PASSWORD_MIN: 'Mật khẩu phải có ít nhất 6 ký tự.',
  AUTH_USERNAME_TAKEN: 'Tên đăng nhập đã được sử dụng.',
  AUTH_LOGIN_REQUIRED: 'Vui lòng nhập tên đăng nhập/email và mật khẩu.',
  AUTH_LOGIN_LOCKED: (seconds) => `Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${seconds} giây.`,
  AUTH_INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không đúng.',
  AUTH_ACCOUNT_DISABLED: 'Tài khoản đã bị vô hiệu hóa.',
  AUTH_NAME_EMPTY: 'Họ tên không được để trống.',
  AUTH_AVATAR_INVALID: 'Ảnh đại diện phải là ảnh hợp lệ.',
  AUTH_AVATAR_TOO_LARGE: 'Ảnh đại diện quá lớn (tối đa khoảng 150KB).',
  AUTH_CURRENT_PASSWORD_WRONG: 'Mật khẩu hiện tại không đúng.',
  AUTH_USER_NOT_FOUND: 'Không tìm thấy tài khoản.',
  AUTH_CONTACT_EMAIL_REQUIRED: 'Vui lòng nhập email liên kết.',
  AUTH_RESET_FIELDS_REQUIRED: 'Vui lòng nhập liên kết khôi phục và mật khẩu mới.',
  AUTH_RESET_INVALID: 'Liên kết khôi phục không hợp lệ hoặc đã hết hạn.',
  AUTH_RESET_SUCCESS: 'Đã đặt lại mật khẩu thành công. Bạn có thể đăng nhập.',
  AUTH_FORGOT_GENERIC: 'Nếu email đã liên kết và xác minh, bạn sẽ nhận hướng dẫn khôi phục mật khẩu.',
  AUTH_FORGOT_LOGIN_REQUIRED: 'Vui lòng nhập tên đăng nhập hoặc email liên kết.',
  AUTH_FORGOT_ACCOUNT_NOT_FOUND: 'Không tìm thấy tài khoản.',
  AUTH_FORGOT_METHOD_INVALID: 'Phương thức xác thực không hợp lệ.',
  AUTH_FORGOT_EMAIL_REAL_REQUIRED: 'Vui lòng nhập email thật để nhận liên kết xác thực.',
  AUTH_FORGOT_EMAIL_TAKEN: 'Email này đã được liên kết tài khoản khác.',
  AUTH_FORGOT_SENT_MASKED: (masked) => `Đã gửi liên kết đặt lại mật khẩu tới ${masked}. Kiểm tra hộp thư (cả mục Spam).`,
  AUTH_FORGOT_VERIFY_SENT: (masked) => `Đã gửi email xác thực tới ${masked}. Bấm liên kết trong email để đặt mật khẩu mới.`,
  AUTH_MAIL_NOT_CONFIGURED: 'Hệ thống email chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ shop.',

  // Username validation
  USERNAME_REQUIRED: 'Vui lòng nhập tên đăng nhập.',
  USERNAME_LENGTH: 'Tên đăng nhập phải từ 6–20 ký tự.',
  USERNAME_FORMAT: 'Tên đăng nhập phải bắt đầu bằng chữ cái, chỉ gồm chữ thường, số và dấu gạch dưới.',
  USERNAME_ALL_NUMBERS: 'Tên đăng nhập không được toàn số.',
  USERNAME_REPEAT_CHARS: 'Tên đăng nhập không được có 3 ký tự giống nhau liên tiếp.',
  USERNAME_NOT_ALLOWED: 'Tên đăng nhập này không được phép sử dụng.',

  // Middleware
  UNAUTHORIZED_NO_TOKEN: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
  UNAUTHORIZED_INVALID_TOKEN: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  FORBIDDEN_ADMIN: 'Bạn không có quyền truy cập khu vực quản trị.',
  CSRF_HEADER: 'Yêu cầu không hợp lệ. Vui lòng tải lại trang và thử lại.',
  CSRF_ORIGIN: 'Nguồn yêu cầu không được phép. Vui lòng mở đúng địa chỉ website shop.',
  RATE_LIMIT_GLOBAL: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
  RATE_LIMIT_AUTH: 'Đăng nhập/đăng ký quá nhiều lần. Vui lòng thử lại sau.',
  RATE_LIMIT_ORDER: 'Đặt hàng quá nhanh. Vui lòng đợi vài giây.',
  RATE_LIMIT_AI: 'Chat AI đang bận. Vui lòng thử lại sau.',
  INTERNAL_ERROR: 'Lỗi hệ thống. Vui lòng thử lại sau.',

  // Orders (customer-facing)
  ORDER_OWNERSHIP: 'Không xác định được giỏ hàng/đơn hàng. Vui lòng tải lại trang.',
  ORDER_INVALID_PAYMENT: 'Phương thức thanh toán không hợp lệ.',
  ORDER_SHIPPING_REQUIRED: 'Vui lòng nhập họ tên, số điện thoại và địa chỉ giao hàng.',
  ORDER_PROVINCE_DISTRICT: 'Vui lòng chọn tỉnh/thành và quận/huyện.',
  ORDER_CART_EMPTY: 'Giỏ hàng đang trống.',
  ORDER_PRODUCT_UNAVAILABLE: 'Một số sản phẩm không còn bán.',
  ORDER_OUT_OF_STOCK: (id) => `Sản phẩm đã hết hàng: ${id}.`,
  ORDER_ALREADY_CREATED: 'Đơn hàng đã được tạo trước đó.',
  ORDER_VNPAY_URL_FAILED: 'Đã tạo đơn nhưng không mở được cổng VNPAY. Vui lòng thử thanh toán lại trong chi tiết đơn.',
  ORDER_CREATED: 'Đặt hàng thành công.',
  ORDER_INVALID_ID: 'Mã đơn hàng không hợp lệ.',
  ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng.',
  ORDER_CANCEL_PENDING: 'Yêu cầu hủy đơn đang được xử lý.',
  ORDER_CANNOT_CANCEL: 'Đơn hàng này không thể hủy.',

  // Cart
  CART_OWNERSHIP: 'Không xác định được giỏ hàng. Vui lòng tải lại trang.',
  CART_ITEMS_INVALID: 'Dữ liệu giỏ hàng không hợp lệ.',
  CART_PRODUCT_INVALID: (id) => `Sản phẩm không hợp lệ: ${id}.`,
  CART_PRODUCT_NOT_FOUND: (id) => `Không tìm thấy sản phẩm: ${id}.`,
  CART_STOCK_EXCEEDED: (id, available) => `Số lượng vượt tồn kho sản phẩm ${id}. Còn lại: ${available}.`,

  // Marketing
  MARKETING_NO_RECIPIENTS: 'Không có khách hàng nào có email liên kết đã xác minh để gửi.',
  MARKETING_SEND_FAILED: 'Không gửi được email nào. Kiểm tra cấu hình SMTP hoặc hộp thư Spam.',
};

export function maskContactEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const [local, domain] = normalized.split('@');
  if (!local || !domain) return '***';
  const visible = local.length <= 2 ? local.slice(0, 1) : `${local.slice(0, 2)}***`;
  return `${visible}@${domain}`;
}

export function isDeliverableContactEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return false;
  if (normalized.endsWith('@users.techphone.local')) return false;
  if (normalized.endsWith('@techphone.local')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}
