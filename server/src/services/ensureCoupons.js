import Coupon from '../models/Coupon.js';

const DEFAULT_COUPONS = [
  {
    code: 'GIAM50K',
    description: 'Giảm 50.000đ cho đơn từ 2.000.000đ',
    scope: 'product',
    discountType: 'fixed',
    discountValue: 50000,
    minOrderValue: 2000000,
    maxDiscountValue: null,
    usageLimit: null,
    isActive: true,
  },
  {
    code: 'FREESHIP',
    description: 'Miễn phí vận chuyển (tối đa 30.000đ)',
    scope: 'shipping',
    discountType: 'fixed',
    discountValue: 30000,
    minOrderValue: 500000,
    maxDiscountValue: 30000,
    usageLimit: null,
    isActive: true,
  },
  {
    code: 'SALE10',
    description: 'Giảm 10% tối đa 500.000đ cho đơn từ 3.000.000đ',
    scope: 'product',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 3000000,
    maxDiscountValue: 500000,
    usageLimit: 200,
    isActive: true,
  },
];

export async function ensureDefaultCoupons() {
  for (const item of DEFAULT_COUPONS) {
    await Coupon.updateOne(
      { code: item.code },
      {
        $setOnInsert: {
          ...item,
          usedCount: 0,
          startsAt: null,
          endsAt: null,
          isDeleted: false,
        },
      },
      { upsert: true },
    );
  }
}
