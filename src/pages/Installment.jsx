import { useMemo, useState } from 'react';
import { CircleAlert, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { apiFetch, getOrderIdempotencyKey, rotateOrderIdempotencyKey } from '../config/api';
import { useAnalytics } from '../context/AnalyticsContext';
import { calculateCouponPricing, getStoredSelectedCouponIds } from '../data/coupons';
import './Installment.css';

const PROVIDERS = [
  { key: 'kredivo', label: 'Trả góp qua Kredivo', logo: '🟧', disabled: false },
  { key: 'home-paylater', label: 'Trả góp qua Home Paylater', logo: '🟥', disabled: false },
  { key: 'finance-company', label: 'Trả góp qua công ty tài chính', logo: '🏛️', disabled: false },
  { key: 'credit-installment', label: 'Trả góp qua thẻ tín dụng', logo: '💳', disabled: false },
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

export default function Installment() {
  const { cartItems, cartCount, cartTotal, clearCart } = useCart();
  const { track } = useAnalytics();
  const [searchParams] = useSearchParams();
  const providerFromQuery = searchParams.get('provider');

  const [selectedProvider, setSelectedProvider] = useState(
    PROVIDERS.some((item) => item.key === providerFromQuery) ? providerFromQuery : 'kredivo',
  );
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('home');
  const [selectedAmount, setSelectedAmount] = useState(cartTotal || 50000000);
  const [selectedTerm, setSelectedTerm] = useState(9);
  const [orderError, setOrderError] = useState('');
  const [successOrderId, setSuccessOrderId] = useState('');
  const [selectedCouponIds] = useState(() => getStoredSelectedCouponIds());

  const amountOptions = useMemo(() => {
    const raw = [cartTotal, 50000000, Math.max(Math.round(cartTotal * 0.8), 3000000)];
    return [...new Set(raw.filter((value) => Number(value) > 0))].sort((a, b) => b - a);
  }, [cartTotal]);

  const selectedProviderInfo = PROVIDERS.find((item) => item.key === selectedProvider) || PROVIDERS[0];
  const { selectedCoupons, totalDiscount } = useMemo(
    () => calculateCouponPricing(cartItems, cartTotal, selectedCouponIds),
    [cartItems, cartTotal, selectedCouponIds],
  );
  const totalAmount = Number(selectedAmount || cartTotal || 0);
  const paidAmount = Math.max(totalAmount - totalDiscount, 0);

  const termRows = useMemo(() => {
    const terms = [6, 9, 12];
    return terms.map((term) => {
      const baseMonthly = totalAmount / term;
      const interestFee = totalAmount * (term === 6 ? 0.02 : term === 9 ? 0.045 : 0.07);
      const monthly = Math.ceil((totalAmount + interestFee) / term);
      const diffPerMonth = Math.max(monthly - Math.ceil(baseMonthly), 0);

      return {
        term,
        installmentPrice: totalAmount,
        totalDiscount: 0,
        loanAmount: totalAmount,
        receiveDevice: Math.max(cartTotal - totalAmount, 0),
        monthly,
        diffPerMonth,
      };
    });
  }, [cartTotal, totalAmount]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setOrderError('');

    const formData = new FormData(event.currentTarget);
    const shippingInfo = {
      fullName: String(formData.get('fullName') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      address: String(formData.get('address') || '').trim(),
      note: [
        String(formData.get('note') || '').trim(),
        `Hình thức nhận hàng: ${deliveryMethod === 'home' ? 'Giao hàng tận nơi' : 'Nhận tại cửa hàng'}`,
        `Nhà cung cấp trả góp: ${selectedProviderInfo.label}`,
        `Số tiền trả góp: ${formatCurrency(selectedAmount)}đ`,
        `Kỳ hạn: ${selectedTerm} tháng`,
        selectedCoupons.length > 0 ? `Ưu đãi đã chọn: ${selectedCoupons.map((item) => item.id).join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' | '),
    };

    try {
      await track('begin_checkout', {
        metadata: {
          cartCount,
          cartTotal,
          paymentOption: selectedProvider,
          installmentAmount: selectedAmount,
          installmentTerm: selectedTerm,
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
          paymentMethod: 'installment',
          installment: {
            provider: selectedProvider,
            amount: selectedAmount,
            planMonths: selectedTerm,
          },
        }),
      });

      clearCart();
      rotateOrderIdempotencyKey();
      setSuccessOrderId(payload?.order?._id || '');

      await track('purchase', {
        metadata: {
          orderId: payload?.order?._id || null,
          total: payload?.order?.total || totalAmount,
          paymentOption: selectedProvider,
        },
      });
    } catch (error) {
      setOrderError(error.message);
    }
  };

  if (successOrderId) {
    return (
      <div className="container tp-installment-success">
        <h1>Đăng ký trả góp thành công</h1>
        <p>
          Mã đơn hàng: <strong>{successOrderId}</strong>. Nhân viên sẽ liên hệ sớm để hoàn tất hồ sơ trả góp.
        </p>
        <div>
          <Link className="btn btn-primary" to="/">
            Về trang chủ
          </Link>
          <Link className="btn btn-outline" to="/products">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="tp-installment-page">
      <div className="container">
        <form className="tp-installment-layout" onSubmit={handleSubmit}>
          <section className="tp-installment-left">
            <div className="tp-installment-top">
              <Link to="/checkout">
                <ChevronLeft size={15} />
                Quay lại
              </Link>
              <strong>{selectedProviderInfo.label}</strong>
              <button type="button" onClick={() => setShowProviderModal(true)}>
                Thay đổi
              </button>
            </div>

            <div className="tp-installment-card">
              <h3>Sản phẩm trong đơn ({cartCount})</h3>
              {cartItems.length === 0 ? (
                <p className="tp-installment-empty">
                  Giỏ hàng trống. <Link to="/products">Tiếp tục mua sắm</Link>
                </p>
              ) : (
                <>
                  {cartItems.map((item) => (
                    <article className="tp-installment-product" key={item.id}>
                      <img src={item.image} alt={item.name} />
                      <div>
                        <h4>{item.name}</h4>
                        <p>Màu: Xám</p>
                      </div>
                      <strong>{formatCurrency(item.price * item.quantity)}đ</strong>
                    </article>
                  ))}
                  <button type="button" className="tp-installment-gift">
                    🎁 9 Quà tặng đơn hàng
                  </button>
                </>
              )}
            </div>

            <div className="tp-installment-card">
              <h3>Người đặt hàng</h3>
              <div className="tp-installment-inputs">
                <input required name="fullName" className="input" placeholder="Họ và tên" />
                <input required name="phone" className="input" placeholder="Số điện thoại" />
                <input name="email" className="input" placeholder="Email (Không bắt buộc)" />
              </div>
            </div>

            <div className="tp-installment-card">
              <h3>Hình thức nhận hàng</h3>
              <div className="tp-installment-radios">
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
              <input
                name="address"
                required
                className="input"
                placeholder={deliveryMethod === 'home' ? 'Tỉnh/Thành Phố, Phường Xã' : 'Chọn cửa hàng gần bạn'}
              />
              <textarea name="note" className="input" rows={3} placeholder="Ghi chú (Ví dụ: Hãy gọi tôi khi chuẩn bị hàng xong)" />
            </div>

            <button type="button" className="tp-installment-note">
              <CircleAlert size={14} />
              Xem lưu ý quan trọng khi tham gia trả góp
              <ChevronRight size={14} />
            </button>

            <div className="tp-installment-card">
              <h3>Chọn số tiền trả góp</h3>
              <select
                className="input"
                value={selectedAmount}
                onChange={(event) => setSelectedAmount(Number(event.target.value))}
              >
                {amountOptions.map((amount) => (
                  <option key={amount} value={amount}>
                    {formatCurrency(amount)}đ
                  </option>
                ))}
              </select>

              <h4 className="tp-installment-table-title">Tham khảo gói trả góp</h4>
              <div className="tp-installment-table-wrap">
                <table className="tp-installment-table">
                  <thead>
                    <tr>
                      <th>Kỳ hạn</th>
                      {termRows.map((row) => (
                        <th key={row.term}>{row.term} tháng</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Giá mua trả góp</td>
                      {termRows.map((row) => (
                        <td key={`${row.term}-price`}>{formatCurrency(row.installmentPrice)}đ</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Tổng giảm giá</td>
                      {termRows.map((row) => (
                        <td key={`${row.term}-discount`}>{formatCurrency(row.totalDiscount)}đ</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Tổng tiền trả góp</td>
                      {termRows.map((row) => (
                        <td key={`${row.term}-loan`}>{formatCurrency(row.loanAmount)}đ</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Thanh toán khi nhận máy</td>
                      {termRows.map((row) => (
                        <td key={`${row.term}-device`}>{formatCurrency(row.receiveDevice)}đ</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Góp mỗi tháng</td>
                      {termRows.map((row) => (
                        <td key={`${row.term}-monthly`}>
                          <button
                            type="button"
                            className={selectedTerm === row.term ? 'tp-term-active' : 'tp-term-button'}
                            onClick={() => setSelectedTerm(row.term)}
                          >
                            {formatCurrency(row.monthly)}đ
                          </button>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Chênh lệch trả tháng</td>
                      {termRows.map((row) => (
                        <td key={`${row.term}-diff`}>{formatCurrency(row.diffPerMonth)}đ</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="tp-installment-hint">
                Các kỳ hạn và mức phí trên chỉ mang tính chất tham khảo. Quý khách vui lòng kiểm tra và lựa chọn kỳ hạn phù hợp
                tại trang thanh toán của Kredivo.
              </p>
            </div>

            <div className="tp-installment-card">
              <h3>Ưu đãi thanh toán qua {selectedProviderInfo.label.replace('Trả góp qua ', '')}</h3>
              <div className="tp-installment-benefit">
                Giảm ngay 50% tối đa 100.000đ hoặc Giảm 5% tối đa 200.000đ đơn hàng từ 700.000đ khi thanh toán qua{' '}
                {selectedProviderInfo.label.replace('Trả góp qua ', '')}.
              </div>
              <p>Giảm ngay 300.000đ cho đơn hàng từ 6 triệu cho khách hàng đăng ký mới và thanh toán lần đầu.</p>
            </div>
          </section>

          <aside className="tp-installment-right">
            <Link to={`/coupon?from=installment&provider=${selectedProvider}`} className="tp-installment-side-box">
              🎟️ Đã chọn {selectedCoupons.length} ưu đãi và khuyến mãi <ChevronRight size={13} />
            </Link>
            <button type="button" className="tp-installment-side-box">
              🪙 Đăng nhập để sử dụng điểm thưởng
            </button>

            <div className="tp-installment-summary">
              <h3>Thông tin đơn hàng</h3>
              <p>
                <span>Tổng tiền</span>
                <strong>{formatCurrency(cartTotal)}đ</strong>
              </p>
              <p>
                <span>Tổng khuyến mãi</span>
                <strong>{formatCurrency(totalDiscount)}đ</strong>
              </p>
              <p>
                <span>Phí vận chuyển</span>
                <strong>Miễn phí</strong>
              </p>
              <p className="tp-installment-pay">
                <span>Cần thanh toán</span>
                <strong>{formatCurrency(paidAmount)}đ</strong>
              </p>
              <p>
                <span>Điểm thưởng</span>
                <strong>+16,247</strong>
              </p>
              <button type="submit">Trả góp</button>
              <p className="tp-installment-policy">
                ☑️ Bằng việc tiến hành đặt mua hàng, bạn đồng ý với Điều khoản dịch vụ và Chính sách xử lý dữ liệu cá nhân của
                FPT Shop.
              </p>
            </div>
          </aside>
        </form>
      </div>

      {showProviderModal && (
        <div className="tp-installment-modal-mask" role="presentation" onClick={() => setShowProviderModal(false)}>
          <div className="tp-installment-modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3>Chọn phương thức trả góp</h3>
              <button type="button" onClick={() => setShowProviderModal(false)}>
                <X size={24} />
              </button>
            </header>
            <div className="tp-installment-provider-list">
              {PROVIDERS.map((provider) => (
                <button
                  type="button"
                  key={provider.key}
                  disabled={provider.disabled}
                  onClick={() => {
                    setSelectedProvider(provider.key);
                    setShowProviderModal(false);
                  }}
                >
                  <span className="tp-provider-logo">{provider.logo}</span>
                  <span>{provider.label}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {orderError ? <p className="tp-installment-error">{orderError}</p> : null}
    </div>
  );
}
