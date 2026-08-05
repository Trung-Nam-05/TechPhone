/**
 * =====================================================================
 * CODE TRƯỚC KHI ÁP DỤNG — Strategy (Discount)
 * =====================================================================
 * Vấn đề: mọi kiểu giảm giá nhồi trong 1 hàm if/else của pricing
 * =====================================================================
 */

function isCouponActive(coupon, now = new Date()) {
  if (!coupon || coupon.isActive === false || coupon.isDeleted === true) return false;
  if (coupon.startsAt && now < new Date(coupon.startsAt)) return false;
  if (coupon.endsAt && now > new Date(coupon.endsAt)) return false;
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return false;
  return true;
}

/**
 * Tính giảm giá — phiên bản chưa tách Strategy
 */
export function calculateDiscountBeforePattern(coupon, baseAmount) {
  if (!isCouponActive(coupon)) {
    throw new Error('Coupon không còn hiệu lực');
  }
  if (baseAmount < (coupon.minOrderValue || 0)) {
    throw new Error('Chưa đạt giá trị đơn tối thiểu');
  }

  let amount = 0;

  // ========== IF/ELSE CẦN THAY BẰNG DISCOUNT STRATEGY ==========
  if (coupon.discountType === 'percentage') {
    amount = (baseAmount * Number(coupon.discountValue)) / 100;
    if (coupon.maxDiscountValue != null) {
      amount = Math.min(amount, Number(coupon.maxDiscountValue));
    }
  } else if (coupon.discountType === 'fixed') {
    amount = Number(coupon.discountValue);
  } else if (coupon.discountType === 'free_shipping') {
    // Thêm loại mới = sửa tiếp hàm này
    amount = Number(coupon.shippingFee || 30000);
  } else {
    amount = 0;
  }
  // ============================================================

  if (!Number.isFinite(amount) || amount < 0) amount = 0;
  if (amount > baseAmount) amount = baseAmount;
  return Math.round(amount);
}

/**
 * Pricing cũ: vừa tính tạm tính vừa chứa công thức coupon
 */
export function calculatePricingBeforePattern({ items, shippingFee = 30000, coupons = [] }) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let productDiscountTotal = 0;
  let shippingDiscountTotal = 0;
  const applied = [];

  for (const coupon of coupons) {
    if (coupon.scope === 'product') {
      const amount = calculateDiscountBeforePattern(coupon, subtotal);
      productDiscountTotal += amount;
      applied.push({ code: coupon.code, scope: 'product', amount });
    } else if (coupon.scope === 'shipping') {
      const amount = calculateDiscountBeforePattern(coupon, shippingFee);
      shippingDiscountTotal += amount;
      applied.push({ code: coupon.code, scope: 'shipping', amount });
    }
  }

  const total = Math.max(
    0,
    subtotal - productDiscountTotal + shippingFee - shippingDiscountTotal,
  );

  return {
    subtotal,
    shippingFee,
    productDiscountTotal,
    shippingDiscountTotal,
    couponDiscountTotal: productDiscountTotal + shippingDiscountTotal,
    total,
    applied,
  };
}
