import Coupon from '../models/Coupon.js';

export const DEFAULT_SHIPPING_FEE = 30000;

export class PricingError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'PricingError';
    this.code = code;
    this.details = details;
  }
}

function normalizeCouponCodes(couponCodes = []) {
  if (!Array.isArray(couponCodes)) {
    return [];
  }
  return couponCodes
    .map((code) => String(code || '').trim().toUpperCase())
    .filter(Boolean);
}

function ensureCouponCodesAreValid(couponCodes) {
  if (couponCodes.length > 2) {
    throw new PricingError('COUPON_LIMIT_EXCEEDED', 'Toi da 2 ma giam gia cho moi don hang.');
  }

  const uniqueCodes = new Set(couponCodes);
  if (uniqueCodes.size !== couponCodes.length) {
    throw new PricingError('COUPON_DUPLICATED', 'Khong the ap cung mot ma giam gia nhieu lan.');
  }
}

function checkCouponAvailability(coupon, subtotal, nowDate) {
  if (!coupon.isActive || coupon.isDeleted) {
    throw new PricingError('COUPON_INACTIVE', `Ma ${coupon.code} hien khong hoat dong.`);
  }
  if (coupon.startsAt && coupon.startsAt > nowDate) {
    throw new PricingError('COUPON_NOT_STARTED', `Ma ${coupon.code} chua den thoi gian ap dung.`);
  }
  if (coupon.endsAt && coupon.endsAt < nowDate) {
    throw new PricingError('COUPON_EXPIRED', `Ma ${coupon.code} da het han.`);
  }
  if (coupon.minOrderValue > subtotal) {
    throw new PricingError(
      'COUPON_MIN_ORDER_NOT_MET',
      `Ma ${coupon.code} yeu cau don toi thieu ${coupon.minOrderValue.toLocaleString('vi-VN')} đ.`,
    );
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new PricingError('COUPON_USAGE_LIMIT_REACHED', `Ma ${coupon.code} da het luot su dung.`);
  }
}

function calculateCouponAmount(coupon, baseAmount) {
  if (baseAmount <= 0) return 0;

  let amount = 0;
  if (coupon.discountType === 'percentage') {
    amount = (baseAmount * Number(coupon.discountValue || 0)) / 100;
  } else {
    amount = Number(coupon.discountValue || 0);
  }

  if (coupon.maxDiscountValue !== null && coupon.maxDiscountValue !== undefined) {
    amount = Math.min(amount, Number(coupon.maxDiscountValue || 0));
  }
  amount = Math.min(amount, baseAmount);
  return Math.max(Math.floor(amount), 0);
}

async function loadCoupons(couponCodes, session = null) {
  if (couponCodes.length === 0) return [];
  const query = Coupon.find({
    code: { $in: couponCodes },
    isDeleted: false,
  });
  if (session) {
    query.session(session);
  }
  const docs = await query;
  if (docs.length !== couponCodes.length) {
    const foundCodes = new Set(docs.map((doc) => doc.code));
    const missing = couponCodes.filter((code) => !foundCodes.has(code));
    throw new PricingError('COUPON_NOT_FOUND', `Ma khong ton tai: ${missing.join(', ')}`);
  }
  return docs;
}

function ensureScopeRule(couponDocs) {
  const scopeSet = new Set();
  for (const coupon of couponDocs) {
    if (scopeSet.has(coupon.scope)) {
      throw new PricingError(
        'COUPON_SCOPE_CONFLICT',
        'Khong the ap dung 2 ma cung loai. Moi don chi duoc 1 ma san pham va 1 ma shipping.',
      );
    }
    scopeSet.add(coupon.scope);
  }
}

function buildSubtotal(lineItems = []) {
  return lineItems.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    return sum + Math.max(quantity, 0) * Math.max(price, 0);
  }, 0);
}

export async function calculatePricing({
  lineItems = [],
  couponCodes = [],
  session = null,
}) {
  const subtotal = buildSubtotal(lineItems);
  const shippingFee = subtotal > 0 ? DEFAULT_SHIPPING_FEE : 0;
  const normalizedCodes = normalizeCouponCodes(couponCodes);

  ensureCouponCodesAreValid(normalizedCodes);
  const couponDocs = await loadCoupons(normalizedCodes, session);
  ensureScopeRule(couponDocs);

  const nowDate = new Date();
  for (const coupon of couponDocs) {
    checkCouponAvailability(coupon, subtotal, nowDate);
  }

  const productCoupon = couponDocs.find((coupon) => coupon.scope === 'product') || null;
  const shippingCoupon = couponDocs.find((coupon) => coupon.scope === 'shipping') || null;

  const productDiscountTotal = productCoupon ? calculateCouponAmount(productCoupon, subtotal) : 0;
  const shippingDiscountTotal = shippingCoupon ? calculateCouponAmount(shippingCoupon, shippingFee) : 0;
  const couponDiscountTotal = productDiscountTotal + shippingDiscountTotal;
  const total = Math.max(subtotal - productDiscountTotal + shippingFee - shippingDiscountTotal, 0);

  const appliedCoupons = [
    productCoupon
      ? {
          coupon: productCoupon._id,
          code: productCoupon.code,
          scope: productCoupon.scope,
          discountType: productCoupon.discountType,
          discountValue: productCoupon.discountValue,
          amount: productDiscountTotal,
        }
      : null,
    shippingCoupon
      ? {
          coupon: shippingCoupon._id,
          code: shippingCoupon.code,
          scope: shippingCoupon.scope,
          discountType: shippingCoupon.discountType,
          discountValue: shippingCoupon.discountValue,
          amount: shippingDiscountTotal,
        }
      : null,
  ].filter(Boolean);

  return {
    subtotal,
    shippingFee,
    productDiscountTotal,
    shippingDiscountTotal,
    couponDiscountTotal,
    total,
    appliedCoupons,
    couponDocs,
  };
}

export async function consumeCouponsUsage(couponDocs = [], session = null) {
  for (const coupon of couponDocs) {
    const filter = { _id: coupon._id };
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
      filter.usedCount = { $lt: coupon.usageLimit };
    }
    const query = Coupon.updateOne(filter, { $inc: { usedCount: 1 } });
    if (session) {
      query.session(session);
    }
    const result = await query;
    if (!result.modifiedCount) {
      throw new PricingError('COUPON_USAGE_LIMIT_REACHED', `Ma ${coupon.code} da het luot su dung.`);
    }
  }
}
