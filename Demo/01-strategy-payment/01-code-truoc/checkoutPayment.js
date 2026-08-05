/**
 * =====================================================================
 * CODE TRƯỚC KHI ÁP DỤNG DESIGN PATTERN — Strategy (Payment)
 * =====================================================================
 * Vấn đề:
 * - Toàn bộ quy tắc COD / VNPAY / Trả góp nằm trong 1 hàm checkout
 * - Thêm PTTT mới = sửa tiếp if/else, dễ làm hỏng luồng cũ
 * - Khó test từng phương thức thanh toán độc lập
 * =====================================================================
 */

function validateShippingInfo(shippingInfo) {
  if (!shippingInfo?.fullName?.trim()) throw new Error('Thiếu họ tên');
  if (!shippingInfo?.phone?.trim()) throw new Error('Thiếu số điện thoại');
  if (!shippingInfo?.address?.trim()) throw new Error('Thiếu địa chỉ');
  return true;
}

function calculateCartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function createVnpayUrlFake(order, clientIp) {
  const amount = order.total * 100;
  return `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=${amount}&vnp_IpAddr=${clientIp}&vnp_TxnRef=${order.id}`;
}

function buildInstallmentFake(body, total) {
  const months = Number(body?.installment?.planMonths || 6);
  const downRate = Number(body?.installment?.downPaymentRate || 20);
  const downPaymentAmount = Math.round((total * downRate) / 100);
  const financedAmount = total - downPaymentAmount;
  return {
    provider: body?.installment?.provider || 'kredivo',
    planMonths: months,
    downPaymentRate: downRate,
    downPaymentAmount,
    financedAmount,
    monthlyAmount: Math.round(financedAmount / months),
    status: 'pending_review',
    requestedAt: new Date(),
  };
}

/**
 * Checkout "cũ": mọi thứ nhồi if/else theo paymentMethod
 */
export function createOrderBeforePattern(req) {
  const shippingInfo = req.body?.shippingInfo || {};
  const paymentMethod = String(req.body?.paymentMethod || 'cod').trim();
  const items = req.body?.items || [];
  const clientIp = req.ip || '127.0.0.1';

  validateShippingInfo(shippingInfo);

  if (!items.length) {
    throw new Error('Giỏ hàng trống');
  }

  const subtotal = calculateCartTotal(items);
  const shippingFee = 30000;
  const total = subtotal + shippingFee;

  let status = 'pending';
  let paymentStatus = 'pending';
  let paymentUrl = null;
  let installment = { status: 'draft' };
  let note = 'Order created by checkout flow.';

  // ========== KHỐI IF/ELSE CẦN THAY BẰNG STRATEGY ==========
  if (paymentMethod === 'cod') {
    status = 'confirmed';
    paymentStatus = 'pending'; // trả khi nhận hàng
    note = 'Đơn COD — xác nhận ngay sau checkout.';

    if (!shippingInfo.province || !shippingInfo.district) {
      throw new Error('COD bắt buộc chọn tỉnh/huyện để giao hàng');
    }
  } else if (paymentMethod === 'vnpay') {
    status = 'pending';
    paymentStatus = 'pending';
    note = 'Đơn VNPAY — chờ IPN/return để confirmed.';

    if (!process.env.VNPAY_TMN_CODE || !process.env.VNPAY_HASH_SECRET) {
      throw new Error('VNPAY chưa cấu hình');
    }
    if (!shippingInfo.province || !shippingInfo.district) {
      throw new Error('VNPAY bắt buộc chọn tỉnh/huyện');
    }

    // Tạo URL ngay trong checkout — khó tách / khó test
    const tempOrder = { id: `TMP-${Date.now()}`, total };
    paymentUrl = createVnpayUrlFake(tempOrder, clientIp);
  } else if (paymentMethod === 'installment') {
    status = 'pending';
    paymentStatus = 'pending';
    note = 'Đơn trả góp — chờ duyệt hồ sơ.';

    if (!req.body?.installment?.provider) {
      throw new Error('Thiếu nhà cung cấp trả góp');
    }
    if (total < 3000000) {
      throw new Error('Đơn trả góp tối thiểu 3.000.000đ');
    }

    // Trả góp có thể không bắt buộc tỉnh/huyện lúc tạo hồ sơ
    installment = buildInstallmentFake(req.body, total);
  } else if (paymentMethod === 'momo') {
    // Cứ thêm PTTT là phải sửa tiếp hàm này
    status = 'pending';
    paymentUrl = `https://momo.fake/pay?amount=${total}`;
    note = 'Đơn MoMo (ví dụ mở rộng — càng ngày if càng dài).';
  } else {
    throw new Error('Invalid payment method: ' + paymentMethod);
  }
  // ========================================================

  const order = {
    id: `ORD-${Date.now()}`,
    items,
    shippingInfo,
    subtotal,
    shippingFee,
    total,
    paymentMethod,
    paymentStatus,
    status,
    installment,
    note,
    createdAt: new Date(),
  };

  return {
    order,
    paymentUrl, // chỉ có khi VNPAY/MoMo
  };
}
