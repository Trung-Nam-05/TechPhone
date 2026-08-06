const STATUS_MESSAGES = {
  400: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
  401: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy nội dung yêu cầu.',
  409: 'Dữ liệu đã tồn tại hoặc xung đột. Vui lòng thử lại.',
  429: 'Thao tác quá nhanh. Vui lòng thử lại sau.',
  500: 'Lỗi hệ thống. Vui lòng thử lại sau.',
  503: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.',
};

const EXACT = {
  'Internal server error.': 'Lỗi hệ thống. Vui lòng thử lại sau.',
  'Unauthorized. Missing access token.': 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
  'Unauthorized. Invalid or expired token.': 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  'Account is disabled.': 'Tài khoản đã bị vô hiệu hóa.',
  'Forbidden. Admin access required.': 'Bạn không có quyền truy cập khu vực quản trị.',
  'Missing or invalid X-Requested-With header.': 'Yêu cầu không hợp lệ. Vui lòng tải lại trang và thử lại.',
  'Origin not allowed.': 'Nguồn yêu cầu không được phép. Vui lòng mở đúng địa chỉ website shop.',
  'Too many requests. Please try again later.': 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
  'Too many authentication attempts. Please try again later.': 'Đăng nhập/đăng ký quá nhiều lần. Vui lòng thử lại sau.',
  'Too many order attempts. Please wait a moment.': 'Đặt hàng quá nhanh. Vui lòng đợi vài giây.',
  'AI chat rate limit exceeded. Please try again later.': 'Chat AI đang bận. Vui lòng thử lại sau.',
  'name, username, password are required.': 'Vui lòng nhập đầy đủ tên, tên đăng nhập và mật khẩu.',
  'Password must be at least 6 characters.': 'Mật khẩu phải có ít nhất 6 ký tự.',
  'Username is already in use.': 'Tên đăng nhập đã được sử dụng.',
  'login and password are required.': 'Vui lòng nhập tên đăng nhập/email và mật khẩu.',
  'Invalid username/email or password.': 'Tên đăng nhập hoặc mật khẩu không đúng.',
  'name cannot be empty.': 'Họ tên không được để trống.',
  'Avatar must be an image data URL.': 'Ảnh đại diện phải là ảnh hợp lệ.',
  'Avatar file is too large (max ~150KB).': 'Ảnh đại diện quá lớn (tối đa khoảng 150KB).',
  'New password must be at least 6 characters.': 'Mật khẩu mới phải có ít nhất 6 ký tự.',
  'Current password is incorrect.': 'Mật khẩu hiện tại không đúng.',
  'User not found.': 'Không tìm thấy tài khoản.',
  'contactEmail is required.': 'Vui lòng nhập email liên kết.',
  'Vui lòng nhập tên đăng nhập.': 'Vui lòng nhập tên đăng nhập hoặc email liên kết.',
  'Không tìm thấy tài khoản.': 'Không tìm thấy tài khoản.',
  'Vui lòng nhập email thật để nhận liên kết xác thực.': 'Vui lòng nhập email thật để nhận liên kết xác thực.',
  'Email này đã được liên kết tài khoản khác.': 'Email này đã được liên kết tài khoản khác.',
  'Không gửi được email nào. Kiểm tra cấu hình SMTP hoặc hộp thư Spam.':
    'Không gửi được email nào. Kiểm tra cấu hình SMTP hoặc hộp thư Spam.',
  'token and newPassword are required.': 'Vui lòng nhập liên kết khôi phục và mật khẩu mới.',
  'Username is required.': 'Vui lòng nhập tên đăng nhập.',
  'Username must be 6–20 characters.': 'Tên đăng nhập phải từ 6–20 ký tự.',
  'Username must start with a letter and contain only lowercase letters, numbers, and underscores.':
    'Tên đăng nhập phải bắt đầu bằng chữ cái, chỉ gồm chữ thường, số và dấu gạch dưới.',
  'Username cannot be all numbers.': 'Tên đăng nhập không được toàn số.',
  'Username cannot contain three identical characters in a row.':
    'Tên đăng nhập không được có 3 ký tự giống nhau liên tiếp.',
  'This username is not allowed.': 'Tên đăng nhập này không được phép sử dụng.',
  'Missing order ownership context.': 'Không xác định được giỏ hàng/đơn hàng. Vui lòng tải lại trang.',
  'Invalid payment method.': 'Phương thức thanh toán không hợp lệ.',
  'shippingInfo.fullName, shippingInfo.phone, shippingInfo.address are required.':
    'Vui lòng nhập họ tên, số điện thoại và địa chỉ giao hàng.',
  'shippingInfo.province and shippingInfo.district are required for delivery.':
    'Vui lòng chọn tỉnh/thành và quận/huyện.',
  'Cart is empty.': 'Giỏ hàng đang trống.',
  'Some products are no longer available.': 'Một số sản phẩm không còn bán.',
  'Order already created.': 'Đơn hàng đã được tạo trước đó.',
  'Order was created but VNPAY payment URL could not be generated.':
    'Đã tạo đơn nhưng không mở được cổng VNPAY. Vui lòng thử thanh toán lại trong chi tiết đơn.',
  'Order created successfully.': 'Đặt hàng thành công.',
  'Invalid order id.': 'Mã đơn hàng không hợp lệ.',
  'Order not found.': 'Không tìm thấy đơn hàng.',
  'A cancellation request is already pending.': 'Yêu cầu hủy đơn đang được xử lý.',
  'This order cannot be cancelled.': 'Đơn hàng này không thể hủy.',
  'Missing cart ownership context.': 'Không xác định được giỏ hàng. Vui lòng tải lại trang.',
  'Product not found.': 'Không tìm thấy sản phẩm.',
  'GHN is not configured.': 'Dịch vụ GHN chưa được cấu hình.',
  'VNPAY is not configured. Set VNPAY_TMN_CODE and VNPAY_HASH_SECRET (and API_PUBLIC_URL for callbacks).':
    'VNPAY chưa được cấu hình trên hệ thống.',
  'Only customers can start support chat.': 'Chỉ khách hàng mới có thể chat với nhân viên.',
  'Forbidden.': 'Bạn không có quyền thực hiện thao tác này.',
  'Conversation not found.': 'Không tìm thấy cuộc hội thoại.',
  'Conversation is closed.': 'Cuộc hội thoại đã đóng.',
  'Invalid message body.': 'Nội dung tin nhắn không hợp lệ.',
  'Too many messages. Please wait a moment.': 'Gửi tin nhắn quá nhanh. Vui lòng đợi vài giây.',
};

const PATTERNS = [
  [
    /^Request failed with status (\d+)$/,
    (match) => STATUS_MESSAGES[Number(match[1])] || `Yêu cầu thất bại (mã ${match[1]}).`,
  ],
  [
    /^Too many failed login attempts\. Try again in (\d+)s\.$/,
    (match) => `Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${match[1]} giây.`,
  ],
  [
    /^Product out of stock: (.+)$/,
    (match) => `Sản phẩm đã hết hàng: ${match[1]}.`,
  ],
  [
    /^Invalid productId: (.+)$/,
    (match) => `Sản phẩm không hợp lệ: ${match[1]}.`,
  ],
  [
    /^Product not found: (.+)$/,
    (match) => `Không tìm thấy sản phẩm: ${match[1]}.`,
  ],
  [
    /^Quantity exceeds stock for product (.+)\. Available: (.+)$/,
    (match) => `Số lượng vượt tồn kho sản phẩm ${match[1]}. Còn lại: ${match[2]}.`,
  ],
];

function hasVietnameseDiacritics(text) {
  return /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(text);
}

export function toUserFacingError(rawMessage, status) {
  const message = String(rawMessage || '').trim();
  if (!message) {
    return STATUS_MESSAGES[status] || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
  if (EXACT[message]) return EXACT[message];
  for (const [pattern, format] of PATTERNS) {
    const match = message.match(pattern);
    if (match) return format(match);
  }
  if (hasVietnameseDiacritics(message)) return message;
  return STATUS_MESSAGES[status] || 'Đã xảy ra lỗi. Vui lòng thử lại.';
}
