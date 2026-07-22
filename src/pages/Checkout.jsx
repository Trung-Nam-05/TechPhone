import { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Ticket, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { apiFetch, getOrderIdempotencyKey, rotateOrderIdempotencyKey } from '../config/api';
import { useAnalytics } from '../context/AnalyticsContext';
import { useAuth } from '../context/AuthContext';
import { calculateCouponPricing, getStoredSelectedCouponIds } from '../data/coupons';
import OrderSuccessResult from '../components/OrderSuccessResult';
import './Checkout.css';

const PAYMENT_OPTIONS = [
  { key: 'cod', label: 'Thanh toán khi nhận hàng', icon: '💵', orderPaymentMethod: 'cod' },
  { key: 'bank', label: 'Chuyển khoản ngân hàng (QR Code)', icon: '🏦', orderPaymentMethod: 'cod', demoNote: 'Demo: xử lý như COD' },
  { key: 'vnpay', label: 'Thẻ ATM / Ví (VNPAY)', icon: '💳', orderPaymentMethod: 'vnpay' },
  { key: 'international', label: 'Thẻ Quốc tế Visa/Master/JCB/AMEX', icon: '💳', orderPaymentMethod: 'cod', demoNote: 'Coming soon — hiện xử lý như COD' },
  { key: 'zalopay', label: 'Ví ZaloPay', icon: '🟦', orderPaymentMethod: 'cod', demoNote: 'Coming soon — hiện xử lý như COD' },
  { key: 'momo', label: 'Ví điện tử MoMo', icon: '🟪', orderPaymentMethod: 'cod', demoNote: 'Coming soon — hiện xử lý như COD' },
  { key: 'installment', label: 'Trả góp', icon: '💰', orderPaymentMethod: 'installment' },
];

const INSTALLMENT_METHODS = [
  { key: 'kredivo', label: 'Trả góp qua Kredivo', icon: '🟧' },
  { key: 'home-paylater', label: 'Trả góp qua Home Paylater', icon: '🟥' },
  { key: 'finance-company', label: 'Trả góp qua công ty tài chính', icon: '🏛️' },
  { key: 'credit-installment', label: 'Trả góp qua thẻ tín dụng', icon: '💳' },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { authFetch, isAuthenticated } = useAuth();
  const { cartItems, cartCount, cartTotal, clearCart, syncCartNow } = useCart();
  const { track } = useAnalytics();
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [orderError, setOrderError] = useState(null);
  const [selectedPaymentKey, setSelectedPaymentKey] = useState('cod');
  const [deliveryMethod, setDeliveryMethod] = useState('home');
  const [invoiceEnabled, setInvoiceEnabled] = useState(false);
  const [specialRequests, setSpecialRequests] = useState({
    callBeforeDelivery: false,
    supportInstall: false,
    customNote: false,
  });
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [selectedCouponIds] = useState(() => getStoredSelectedCouponIds());
  const [orderLoadError, setOrderLoadError] = useState(null);

  const shippingFee = 0;
  const { selectedCoupons, totalDiscount } = useMemo(
    () => calculateCouponPricing(cartItems, cartTotal, selectedCouponIds),
    [cartItems, cartTotal, selectedCouponIds],
  );
  const productDiscount = 0;
  const voucherDiscount = totalDiscount;
  const totalPromotion = productDiscount + voucherDiscount;
  const totalAmount = Math.max(cartTotal + shippingFee - totalPromotion, 0);
  const selectedPayment = PAYMENT_OPTIONS.find((item) => item.key === selectedPaymentKey) || PAYMENT_OPTIONS[0];
  const isInstallmentSelected = selectedPayment.orderPaymentMethod === 'installment';

  const handleSpecialRequest = (key) => {
    setSpecialRequests((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setOrderError(null);

    const formData = new FormData(event.currentTarget);
    const noteParts = [
      String(formData.get('note') || '').trim(),
      specialRequests.callBeforeDelivery ? 'Nhờ gọi trước khi giao' : '',
      specialRequests.supportInstall ? 'Cần hỗ trợ kỹ thuật' : '',
      invoiceEnabled ? 'Xuất hoá đơn điện tử' : '',
      `Hình thức nhận hàng: ${deliveryMethod === 'home' ? 'Giao tận nơi' : 'Nhận tại cửa hàng'}`,
      `Phương thức thanh toán: ${selectedPayment.label}`,
      selectedCoupons.length > 0 ? `Ưu đãi đã chọn: ${selectedCoupons.map((item) => item.id).join(', ')}` : '',
    ].filter(Boolean);

    const shippingInfo = {
      fullName: String(formData.get('fullName') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      province: String(formData.get('province') || '').trim(),
      district: String(formData.get('district') || '').trim(),
      ward: String(formData.get('ward') || '').trim(),
      address: String(formData.get('address') || '').trim(),
      note: noteParts.join(' | '),
    };

    try {
      await syncCartNow();

      await track('begin_checkout', {
        metadata: {
          cartCount,
          cartTotal,
          paymentOption: selectedPayment.key,
          couponCount: selectedCoupons.length,
          couponDiscount: totalDiscount,
        },
      });

      const payload = await apiFetch('/api/orders', {
        method: 'POST',
        headers: {
          'x-idempotency-key': getOrderIdempotencyKey(),
        },
        body: JSON.stringify({
          shippingInfo,
          invoiceRequested: invoiceEnabled,
          paymentMethod: selectedPayment.orderPaymentMethod,
          installment: selectedPayment.orderPaymentMethod === 'installment' ? { provider: selectedPayment.key } : null,
        }),
      });

      if (payload?.paymentUrl) {
        clearCart();
        rotateOrderIdempotencyKey();
        window.location.assign(payload.paymentUrl);
        return;
      }

      clearCart();
      rotateOrderIdempotencyKey();
      setCreatedOrder(payload?.order || null);
      setIsSuccess(true);

      await track('purchase', {
        metadata: {
          orderId: payload?.order?._id || null,
          total: payload?.order?.total || totalAmount,
        },
      });
    } catch (error) {
      setOrderError(error.message);
    }
  };

  useEffect(() => {
    if (!isSuccess || !createdOrder?._id) return undefined;

    let cancelled = false;
    const loadOrder = async () => {
      try {
        const payload = isAuthenticated
          ? await authFetch(`/api/orders/${createdOrder._id}`)
          : await apiFetch(`/api/orders/${createdOrder._id}`);
        if (!cancelled) {
          setCreatedOrder(payload);
          setOrderLoadError(null);
        }
      } catch (error) {
        if (!cancelled) setOrderLoadError(error.message);
      }
    };

    loadOrder();
    const timer = setInterval(loadOrder, 3000);
    const stop = setTimeout(() => clearInterval(timer), 15000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [authFetch, isAuthenticated, isSuccess, createdOrder?._id]);

  if (isSuccess) {
    return (
      <OrderSuccessResult
        success
        orderId={createdOrder?._id || ''}
        order={createdOrder}
        loadError={orderLoadError}
        title="Đặt hàng thành công!"
        subtitle="Đơn hàng COD đã được xác nhận tự động. Vận đơn GHN sẽ được tạo trong giây lát (môi trường DEV)."
      />
    );
  }

  return (
    <div className="tp-checkout-page">
      <div className="container">
        <form id="checkout-form" onSubmit={handleSubmit} className="tp-checkout-layout">
          <section className="tp-checkout-left">
            <Link to="/cart" className="tp-checkout-back">
              <ChevronLeft size={15} />
              Quay lại giỏ hàng
            </Link>

            <div className="tp-checkout-card">
              <h3>Sản phẩm trong đơn ({cartCount})</h3>
              {cartItems.length === 0 ? (
                <p className="tp-checkout-empty">
                  Giỏ hàng đang trống. <Link to="/products">Tiếp tục mua sắm</Link>
                </p>
              ) : (
                <>
                  {cartItems.map((item) => (
                    <article key={item.id} className="tp-checkout-product">
                      <img src={item.image} alt={item.name} />
                      <div>
                        <h4>{item.name}</h4>
                        <p>Màu: Xám</p>
                      </div>
                      <span>x{item.quantity}</span>
                      <strong>{(item.quantity * item.price).toLocaleString('vi-VN')}đ</strong>
                    </article>
                  ))}
                  <button type="button" className="tp-checkout-gift">
                    🎁 2 Quà tặng đơn hàng
                  </button>
                </>
              )}
            </div>

            <div className="tp-checkout-card">
              <h3>Người đặt hàng</h3>
              <div className="tp-checkout-input-grid">
                <input required name="fullName" type="text" className="input" placeholder="Họ và tên" />
                <input required name="phone" type="tel" className="input" placeholder="Số điện thoại" />
                <input name="email" type="email" className="input" placeholder="Email (Không bắt buộc)" />
              </div>
            </div>

            <div className="tp-checkout-card">
              <h3>Hình thức nhận hàng</h3>
              <div className="tp-checkout-radio-row">
                <label>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="home"
                    checked={deliveryMethod === 'home'}
                    onChange={() => setDeliveryMethod('home')}
                  />
                  <span>Giao hàng tận nơi</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="store"
                    checked={deliveryMethod === 'store'}
                    onChange={() => setDeliveryMethod('store')}
                  />
                  <span>Nhận tại cửa hàng</span>
                </label>
              </div>
              <div className="tp-checkout-input-grid">
                <input
                  required
                  name="province"
                  type="text"
                  className="input"
                  placeholder="Tỉnh/Thành phố (vd: Hồ Chí Minh)"
                />
                <input
                  required
                  name="district"
                  type="text"
                  className="input"
                  placeholder="Quận/Huyện (vd: Quận 1)"
                />
                <input name="ward" type="text" className="input" placeholder="Phường/Xã (vd: Phuong Ben Nghe)" />
                <input
                  required
                  name="address"
                  type="text"
                  className="input"
                  placeholder={deliveryMethod === 'home' ? 'Số nhà, tên đường' : 'Chọn cửa hàng gần bạn'}
                />
              </div>
            </div>

            <div className="tp-checkout-card">
              <h3>Yêu cầu đặc biệt</h3>
              <div className="tp-checkout-request-list">
                <label>
                  <input
                    type="checkbox"
                    checked={specialRequests.callBeforeDelivery}
                    onChange={() => handleSpecialRequest('callBeforeDelivery')}
                  />
                  <span>Nhờ người khác nhận hàng</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={specialRequests.supportInstall}
                    onChange={() => handleSpecialRequest('supportInstall')}
                  />
                  <span>
                    Yêu cầu hỗ trợ kỹ thuật <CircleHelp size={13} />
                  </span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={specialRequests.customNote}
                    onChange={() => handleSpecialRequest('customNote')}
                  />
                  <span>Ghi chú khác</span>
                </label>
              </div>
              {specialRequests.customNote && (
                <textarea name="note" rows={3} className="input" placeholder="Nhập ghi chú cho đơn hàng..." />
              )}
            </div>

            <div className="tp-checkout-card">
              <div className="tp-checkout-switch-row">
                <h3>Xuất hóa đơn điện tử</h3>
                <button
                  type="button"
                  className={invoiceEnabled ? 'tp-switch tp-switch-on' : 'tp-switch'}
                  onClick={() => setInvoiceEnabled((prev) => !prev)}
                >
                  <span />
                </button>
              </div>
            </div>

            <div className="tp-checkout-card">
              <h3>Phương thức thanh toán</h3>
              <div className="tp-checkout-payment-list">
                {PAYMENT_OPTIONS.map((option) => (
                  <label key={option.key} className={selectedPaymentKey === option.key ? 'tp-payment-active' : ''}>
                    <input
                      type="radio"
                      name="paymentOption"
                      value={option.key}
                      checked={selectedPaymentKey === option.key}
                      onChange={() => setSelectedPaymentKey(option.key)}
                    />
                    <span className="tp-payment-icon">{option.icon}</span>
                    <span>
                      {option.label}
                      {option.demoNote && (
                        <small style={{ display: 'block', color: '#64748b', fontWeight: 400, fontSize: 12 }}>
                          {option.demoNote}
                        </small>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {orderError && <p className="tp-checkout-error">{orderError}</p>}
          </section>

          <aside className="tp-checkout-right">
            <Link to="/coupon?from=checkout" className="tp-checkout-offer">
              <Ticket size={15} />
              Đã chọn {selectedCoupons.length} ưu đãi và khuyến mãi
              <ChevronLeft size={14} className="tp-rotate-180" />
            </Link>
            <button type="button" className="tp-checkout-points">
              🪙 Đăng nhập để sử dụng điểm thưởng
            </button>

            <div className="tp-checkout-summary">
              <h3>Thông tin đơn hàng</h3>
              <p>
                <span>Tổng tiền</span>
                <strong>{cartTotal.toLocaleString('vi-VN')}đ</strong>
              </p>
              <p>
                <span>Tổng khuyến mãi</span>
                <strong>{totalPromotion.toLocaleString('vi-VN')}đ</strong>
              </p>
              <p>
                <span>Giảm giá sản phẩm</span>
                <strong>{productDiscount.toLocaleString('vi-VN')}đ</strong>
              </p>
              <p>
                <span>Voucher</span>
                <strong>{voucherDiscount.toLocaleString('vi-VN')}đ</strong>
              </p>
              <p>
                <span>Phí vận chuyển</span>
                <strong>Miễn phí</strong>
              </p>
              <p className="tp-checkout-pay">
                <span>Cần thanh toán</span>
                <strong>{totalAmount.toLocaleString('vi-VN')}đ</strong>
              </p>
              <p className="tp-checkout-point-row">
                <span>Điểm thưởng</span>
                <strong>+697</strong>
              </p>
            </div>

            {isInstallmentSelected ? (
              <button
                type="button"
                className="tp-checkout-submit"
                onClick={() => setShowInstallmentModal(true)}
              >
                Trả góp
              </button>
            ) : (
              <button type="submit" form="checkout-form" className="tp-checkout-submit">
                Đặt hàng
              </button>
            )}

            <p className="tp-checkout-policy">
              ☑️ Bằng việc tiến hành đặt mua hàng, bạn đồng ý với Điều khoản dịch vụ và Chính sách xử lý dữ liệu cá nhân của FPT Shop.
            </p>

            <button type="button" className="tp-checkout-choice">
              Tùy chọn <ChevronDown size={14} />
            </button>
          </aside>
        </form>
      </div>

      {showInstallmentModal && (
        <div className="tp-checkout-modal-mask" role="presentation" onClick={() => setShowInstallmentModal(false)}>
          <div className="tp-checkout-modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3>Chọn phương thức trả góp</h3>
              <button type="button" onClick={() => setShowInstallmentModal(false)}>
                <X size={24} />
              </button>
            </header>
            <div className="tp-checkout-method-list">
              {INSTALLMENT_METHODS.map((method) => (
                <button
                  key={method.key}
                  type="button"
                  onClick={() => {
                    setShowInstallmentModal(false);
                    navigate(`/installment?provider=${method.key}`);
                  }}
                >
                  <span className="tp-checkout-method-icon">{method.icon}</span>
                  <span>{method.label}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
