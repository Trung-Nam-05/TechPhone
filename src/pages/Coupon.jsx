import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Ticket, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import {
  COUPON_ITEMS,
  MAX_PRICE_COUPONS,
  calculateCouponPricing,
  getStoredSelectedCouponIds,
  getCouponEligibility,
  saveSelectedCouponIds,
} from '../data/coupons';
import './Coupon.css';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

export default function Coupon() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cartItems, cartTotal } = useCart();
  const [selectedIds, setSelectedIds] = useState(() => getStoredSelectedCouponIds());
  const [expanded, setExpanded] = useState(false);

  const visibleItems = expanded ? COUPON_ITEMS : COUPON_ITEMS.slice(0, 3);
  const { totalDiscount, finalTotal } = useMemo(
    () => calculateCouponPricing(cartItems, cartTotal, selectedIds),
    [cartItems, cartTotal, selectedIds],
  );
  const returnTo = searchParams.get('from') === 'installment' ? '/installment' : '/checkout';
  const providerParam = searchParams.get('provider');

  const toggleItem = (id) => {
    setSelectedIds((prev) => {
      const hasId = prev.includes(id);
      if (hasId) return prev.filter((item) => item !== id);

      const selectedCouponCount = prev
        .map((couponId) => COUPON_ITEMS.find((item) => item.id === couponId))
        .filter((item) => item?.amount > 0).length;
      const nextCoupon = COUPON_ITEMS.find((item) => item.id === id);

      if (nextCoupon?.amount > 0 && selectedCouponCount >= MAX_PRICE_COUPONS) {
        return prev;
      }

      return [...prev, id];
    });
  };

  const handleConfirm = () => {
    saveSelectedCouponIds(selectedIds);
    if (returnTo === '/installment') {
      navigate(providerParam ? `/installment?provider=${providerParam}` : '/installment');
      return;
    }
    navigate('/checkout');
  };

  const handleClose = () => {
    if (returnTo === '/installment') {
      navigate(providerParam ? `/installment?provider=${providerParam}` : '/installment');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="tp-coupon-page">
      <div className="tp-coupon-header">
        <h1>Khuyến mãi và ưu đãi</h1>
        <button type="button" onClick={handleClose} aria-label="Đóng">
          <X size={30} />
        </button>
      </div>

      <div className="tp-coupon-section">
        <h2>Mã giảm giá</h2>
        <button type="button" className="tp-coupon-input-row">
          <Ticket size={18} />
          <span>Nhập mã giảm giá của bạn tại đây nhé</span>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="tp-coupon-section">
        <h2>Khuyến mãi</h2>
        <div className="tp-coupon-list">
          {visibleItems.map((item) => {
            const active = selectedIds.includes(item.id);
            const eligibility = getCouponEligibility(item, cartItems, cartTotal);
            const disabledByRule = item.amount > 0 && !eligibility.isEligible && !active;
            return (
              <article
                key={item.id}
                className={disabledByRule ? 'tp-coupon-item tp-coupon-item-disabled' : 'tp-coupon-item'}
              >
                <div className="tp-coupon-icon">%</div>
                <div>
                  <h3>{item.title}</h3>
                  {item.subtitle ? <p>{item.subtitle}</p> : null}
                  {item.amount > 0 && !eligibility.isEligible ? (
                    <p className="tp-coupon-rule">{eligibility.reason}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  disabled={disabledByRule}
                  className={active ? 'tp-coupon-check tp-coupon-check-active' : 'tp-coupon-check'}
                >
                  <Check size={16} />
                </button>
              </article>
            );
          })}
        </div>
        {COUPON_ITEMS.length > 3 && (
          <button type="button" className="tp-coupon-more" onClick={() => setExpanded((prev) => !prev)}>
            {expanded ? 'Thu gọn khuyến mãi' : `Xem thêm ${COUPON_ITEMS.length - 3} khuyến mãi khác`}
            <ChevronDown size={16} className={expanded ? 'tp-coupon-more-up' : ''} />
          </button>
        )}
      </div>

      <footer className="tp-coupon-footer">
        <div>
          <p>Đã chọn {selectedIds.length} khuyến mãi và ưu đãi</p>
          <strong>{formatCurrency(finalTotal)}đ</strong>
          <span>Tiết kiệm {formatCurrency(totalDiscount)}đ</span>
        </div>
        <button type="button" onClick={handleConfirm}>
          Xác nhận
        </button>
      </footer>
    </div>
  );
}
