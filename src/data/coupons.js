export const COUPON_STORAGE_KEY = 'techphone-selected-coupons';
export const MAX_PRICE_COUPONS = 2;

export const COUPON_ITEMS = [
  {
    id: 'cp-1',
    title: 'Giảm 300.000đ cho đơn Điện máy',
    subtitle: 'Áp dụng khi tổng sản phẩm Điện máy từ 6.000.000đ',
    amount: 300000,
    categoryKey: 'dien-may',
    minCategorySubtotal: 6000000,
  },
  {
    id: 'cp-2',
    title: 'Giảm 100.000đ cho đơn Phụ kiện',
    subtitle: 'Áp dụng khi tổng sản phẩm Phụ kiện từ 1.500.000đ',
    amount: 100000,
    categoryKey: 'phu-kien',
    minCategorySubtotal: 1500000,
  },
  {
    id: 'cp-3',
    title: 'Giảm 50.000đ cho đơn từ 2.000.000đ',
    subtitle: 'Mã theo tổng giá trị đơn hàng',
    amount: 50000,
    minOrderTotal: 2000000,
  },
  {
    id: 'cp-4',
    title: 'Tặng phiếu mua hàng 500.000đ mua Đồng Hồ Oppo Watch X',
    subtitle: 'Áp dụng cho OPPO Find N6 5G 16GB 512GB Titan CPH2765',
    amount: 0,
  },
  {
    id: 'cp-5',
    title: 'Tặng phiếu mua hàng 200.000đ mua tai nghe Enco Buds Series',
    subtitle: 'Áp dụng cho OPPO Find N6 5G 16GB 512GB Titan CPH2765',
    amount: 0,
  },
  {
    id: 'cp-6',
    title: 'Tặng phiếu mua hàng 500.000đ mua OPPO Watch S',
    subtitle: 'Áp dụng cho OPPO Find N6 5G 16GB 512GB Titan CPH2765',
    amount: 0,
  },
  { id: 'cp-7', title: 'Tặng phiếu mua hàng 50.000đ khi mua sim FPT kèm máy', amount: 0 },
];

function parseStoredIds(raw) {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function getStoredSelectedCouponIds() {
  if (typeof window === 'undefined') return [];
  return parseStoredIds(window.localStorage.getItem(COUPON_STORAGE_KEY));
}

export function saveSelectedCouponIds(ids) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(ids));
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function getCategorySubtotal(cartItems, categoryKey) {
  return (cartItems || [])
    .filter((item) => item.category === categoryKey)
    .reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
}

export function getCouponEligibility(coupon, cartItems, cartTotal) {
  if (!coupon) {
    return { isEligible: false, reason: 'Mã không hợp lệ.', eligibleBase: 0 };
  }

  const orderTotal = Number(cartTotal || 0);

  if (coupon.minOrderTotal && orderTotal < coupon.minOrderTotal) {
    return {
      isEligible: false,
      reason: `Đơn tối thiểu ${formatCurrency(coupon.minOrderTotal)}đ`,
      eligibleBase: 0,
    };
  }

  if (coupon.categoryKey) {
    const categorySubtotal = getCategorySubtotal(cartItems, coupon.categoryKey);

    if (categorySubtotal <= 0) {
      return {
        isEligible: false,
        reason: 'Giỏ hàng chưa có sản phẩm thuộc ngành hàng áp dụng.',
        eligibleBase: 0,
      };
    }

    if (coupon.minCategorySubtotal && categorySubtotal < coupon.minCategorySubtotal) {
      return {
        isEligible: false,
        reason: `Ngành hàng cần tối thiểu ${formatCurrency(coupon.minCategorySubtotal)}đ`,
        eligibleBase: categorySubtotal,
      };
    }

    return { isEligible: true, reason: '', eligibleBase: categorySubtotal };
  }

  return { isEligible: true, reason: '', eligibleBase: orderTotal };
}

export function calculateCouponPricing(cartItems, cartTotal, selectedIds) {
  const selectedSet = new Set(selectedIds || []);
  const selectedCoupons = COUPON_ITEMS.filter((coupon) => selectedSet.has(coupon.id));
  const orderTotal = Math.max(Number(cartTotal || 0), 0);
  const categoryBudget = {};
  const pricedCoupons = [];
  let remainingOrderBudget = orderTotal;

  selectedCoupons
    .filter((coupon) => coupon.amount > 0)
    .slice(0, MAX_PRICE_COUPONS)
    .forEach((coupon) => {
      const eligibility = getCouponEligibility(coupon, cartItems, cartTotal);
      if (!eligibility.isEligible || remainingOrderBudget <= 0) return;

      if (coupon.categoryKey && categoryBudget[coupon.categoryKey] === undefined) {
        categoryBudget[coupon.categoryKey] = eligibility.eligibleBase;
      }

      const availableForCoupon = coupon.categoryKey
        ? Math.max(Number(categoryBudget[coupon.categoryKey] || 0), 0)
        : remainingOrderBudget;
      const appliedAmount = Math.min(Number(coupon.amount || 0), availableForCoupon, remainingOrderBudget);

      if (appliedAmount <= 0) return;

      if (coupon.categoryKey) {
        categoryBudget[coupon.categoryKey] -= appliedAmount;
      }
      remainingOrderBudget -= appliedAmount;
      pricedCoupons.push({ ...coupon, appliedAmount });
    });

  const totalDiscount = pricedCoupons.reduce((sum, coupon) => sum + Number(coupon.appliedAmount || 0), 0);
  const selectedCouponStates = selectedCoupons.map((coupon) => ({
    ...coupon,
    eligibility: getCouponEligibility(coupon, cartItems, cartTotal),
  }));

  return {
    selectedCoupons: selectedCouponStates,
    appliedPriceCoupons: pricedCoupons,
    totalDiscount,
    finalTotal: Math.max(orderTotal - totalDiscount, 0),
  };
}
