import { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronLeft, CircleHelp, FileText, Ticket, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { apiFetch, getOrderIdempotencyKey, rotateOrderIdempotencyKey } from '../config/api';
import { useAnalytics } from '../context/AnalyticsContext';
import { useAuth } from '../context/AuthContext';
import { calculateCouponPricing, getStoredSelectedCouponIds } from '../data/coupons';
import OrderSuccessResult from '../components/OrderSuccessResult';
import PendingVnpayBanner from '../components/PendingVnpayBanner';
import {
  getPrimaryPaymentOptions,
  getSecondaryPaymentOptions,
  resolvePaymentUiStrategy,
} from '../patterns/paymentUiStrategies';
import './Checkout.css';

const PRIMARY_PAYMENTS = getPrimaryPaymentOptions();
const SECONDARY_PAYMENTS = getSecondaryPaymentOptions();

const EMPTY_SHIPPING_FORM = {
  fullName: '',
  phone: '',
  email: '',
  province: '',
  district: '',
  ward: '',
  address: '',
};

export default function Checkout() {
  const { authFetch, isAuthenticated, user, updateProfile } = useAuth();
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
  const [selectedCouponIds] = useState(() => getStoredSelectedCouponIds());
  const [showMorePayments, setShowMorePayments] = useState(false);
  const [pendingVnpayOrders, setPendingVnpayOrders] = useState([]);
  const [orderLoadError, setOrderLoadError] = useState(null);
  const [shippingForm, setShippingForm] = useState(() => ({
    ...EMPTY_SHIPPING_FORM,
    fullName: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  }));

  const updateShippingField = (field) => (event) => {
    setShippingForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  // Prefill from profile + last order when logged in
  useEffect(() => {
    if (!isAuthenticated || !user) return undefined;

    let cancelled = false;
    const applyShipping = (lastShipping = null) => {
      if (cancelled) return;
      setShippingForm((prev) => ({
        fullName: prev.fullName || user.name || lastShipping?.fullName || '',
        phone: prev.phone || user.phone || lastShipping?.phone || '',
        email: prev.email || user.email || lastShipping?.email || '',
        province: prev.province || lastShipping?.province || '',
        district: prev.district || lastShipping?.district || '',
        ward: prev.ward || lastShipping?.ward || '',
        address: prev.address || lastShipping?.address || '',
      }));
    };

    const loadLastShipping = async () => {
      try {
        const payload = await authFetch('/api/orders');
        if (cancelled) return;
        applyShipping(payload?.items?.[0]?.shippingInfo);
      } catch {
        applyShipping();
      }
    };
    loadLastShipping();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, user?.id, user?.name, user?.phone, user?.email, authFetch]);

  useEffect(() => {
    let cancelled = false;
    const loadPendingVnpay = async () => {
      try {
        const payload = isAuthenticated
          ? await authFetch('/api/orders')
          : await apiFetch('/api/orders');
        if (!cancelled) setPendingVnpayOrders(payload?.items || []);
      } catch {
        if (!cancelled) setPendingVnpayOrders([]);
      }
    };
    loadPendingVnpay();
    return () => {
      cancelled = true;
    };
  }, [authFetch, isAuthenticated]);

  const shippingFee = 0;
  const { selectedCoupons, totalDiscount } = useMemo(
    () => calculateCouponPricing(cartItems, cartTotal, selectedCouponIds),
    [cartItems, cartTotal, selectedCouponIds],
  );
  const productDiscount = 0;
  const voucherDiscount = totalDiscount;
  const totalPromotion = productDiscount + voucherDiscount;
  const totalAmount = Math.max(cartTotal + shippingFee - totalPromotion, 0);
  const selectedPayment = resolvePaymentUiStrategy(selectedPaymentKey);
  const isDemoPaymentBlocked = selectedPayment.comingSoon === true;

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

      const orderRequest = {
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
      };
      // Đã login → authFetch (Bearer + session); guest → apiFetch (session)
      const payload = isAuthenticated
        ? await authFetch('/api/orders', orderRequest)
        : await apiFetch('/api/orders', orderRequest);

      if (payload?.paymentUrl) {
        rotateOrderIdempotencyKey();
        if (isAuthenticated && shippingInfo.phone && !user?.phone) {
          updateProfile({ phone: shippingInfo.phone }).catch(() => {});
        }
        window.location.assign(payload.paymentUrl);
        return;
      }

      clearCart();
      rotateOrderIdempotencyKey();
      setCreatedOrder(payload?.order || null);
      setIsSuccess(true);

      // Lưu SĐT vào hồ sơ nếu tài khoản chưa có, để lần sau khỏi nhập lại
      if (isAuthenticated && shippingInfo.phone && !user?.phone) {
        updateProfile({ phone: shippingInfo.phone }).catch(() => {});
      }

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
        <PendingVnpayBanner orders={pendingVnpayOrders} />
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
              {isAuthenticated && (
                <p className="text-sm text-muted" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
                  Đã điền sẵn theo tài khoản{shippingForm.address ? ' và đơn gần nhất' : ''}. Bạn có thể chỉnh sửa nếu cần.
                </p>
              )}
              <div className="tp-checkout-input-grid">
                <input
                  required
                  name="fullName"
                  type="text"
                  className="input"
                  placeholder="Họ và tên"
                  value={shippingForm.fullName}
                  onChange={updateShippingField('fullName')}
                  autoComplete="name"
                />
                <input
                  required
                  name="phone"
                  type="tel"
                  className="input"
                  placeholder="Số điện thoại"
                  value={shippingForm.phone}
                  onChange={updateShippingField('phone')}
                  autoComplete="tel"
                />
                <input
                  name="email"
                  type="email"
                  className="input"
                  placeholder="Email (Không bắt buộc)"
                  value={shippingForm.email}
                  onChange={updateShippingField('email')}
                  autoComplete="email"
                />
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
                  value={shippingForm.province}
                  onChange={updateShippingField('province')}
                  autoComplete="address-level1"
                />
                <input
                  required
                  name="district"
                  type="text"
                  className="input"
                  placeholder="Quận/Huyện (vd: Quận 1)"
                  value={shippingForm.district}
                  onChange={updateShippingField('district')}
                  autoComplete="address-level2"
                />
                <input
                  name="ward"
                  type="text"
                  className="input"
                  placeholder="Phường/Xã (vd: Phuong Ben Nghe)"
                  value={shippingForm.ward}
                  onChange={updateShippingField('ward')}
                />
                <input
                  required
                  name="address"
                  type="text"
                  className="input"
                  placeholder={deliveryMethod === 'home' ? 'Số nhà, tên đường' : 'Chọn cửa hàng gần bạn'}
                  value={shippingForm.address}
                  onChange={updateShippingField('address')}
                  autoComplete="street-address"
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
                <div className="tp-invoice-switch-label">
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {invoiceEnabled && <FileText size={18} color="#2563eb" aria-hidden />}
                    Xuất hóa đơn điện tử
                  </h3>
                  <small className={invoiceEnabled ? 'is-on' : ''}>
                    {invoiceEnabled ? 'Đã bật — hóa đơn sẽ kèm theo đơn hàng' : 'Tắt — bật nếu bạn cần hóa đơn VAT'}
                  </small>
                </div>
                <button
                  type="button"
                  className={invoiceEnabled ? 'tp-switch tp-switch-on' : 'tp-switch'}
                  onClick={() => setInvoiceEnabled((prev) => !prev)}
                  aria-pressed={invoiceEnabled}
                  aria-label={invoiceEnabled ? 'Tắt xuất hóa đơn điện tử' : 'Bật xuất hóa đơn điện tử'}
                >
                  <span />
                </button>
              </div>
            </div>

            <div className="tp-checkout-card">
              <h3>Phương thức thanh toán</h3>
              <div className="tp-checkout-payment-list">
                {PRIMARY_PAYMENTS.map((option) => (
                  <label key={option.key} className={selectedPaymentKey === option.key ? 'tp-payment-active' : ''}>
                    <input
                      type="radio"
                      name="paymentOption"
                      value={option.key}
                      checked={selectedPaymentKey === option.key}
                      onChange={() => setSelectedPaymentKey(option.key)}
                    />
                    <span className="tp-payment-icon">{option.icon}</span>
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="tp-checkout-more-payments"
                onClick={() => setShowMorePayments((prev) => !prev)}
                aria-expanded={showMorePayments}
              >
                <Wallet size={16} />
                {showMorePayments
                  ? 'Thu gọn phương thức khác'
                  : `Xem thêm ${SECONDARY_PAYMENTS.length} phương thức thanh toán`}
                <ChevronDown size={16} className={showMorePayments ? 'tp-rotate-180' : ''} />
              </button>
              {showMorePayments && (
                <div className="tp-checkout-payment-list tp-checkout-payment-list-secondary">
                  {SECONDARY_PAYMENTS.map((option) => (
                    <div key={option.key} className="tp-payment-coming-soon" aria-disabled="true">
                      <span className="tp-payment-icon">{option.icon}</span>
                      <span>
                        {option.label}
                        <small>Sắp ra mắt</small>
                      </span>
                    </div>
                  ))}
                </div>
              )}
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

            <button
              type="submit"
              form="checkout-form"
              className="tp-checkout-submit"
              disabled={isDemoPaymentBlocked}
            >
              Đặt hàng
            </button>

            <p className="tp-checkout-policy">
              ☑️ Bằng việc tiến hành đặt mua hàng, bạn đồng ý với Điều khoản dịch vụ và Chính sách xử lý dữ liệu cá nhân của TechPhone Shop.
            </p>

            <button type="button" className="tp-checkout-choice">
              Tùy chọn <ChevronDown size={14} />
            </button>
          </aside>
        </form>
      </div>

    </div>
  );
}
