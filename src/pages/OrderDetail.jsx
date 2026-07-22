import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { apiFetch } from '../config/api';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/OrderStatusBadge';
import {
  ACTIVE_SHIPMENT_STATUSES,
  canCustomerCancelImmediate,
  canRequestCancel,
  getOrderStatusLabel,
  getPaymentMethodLabel,
} from '../constants/orderLabels';
import ElectronicInvoice from '../components/ElectronicInvoice';
import { orderRequestedInvoice } from '../utils/orderInvoice';

const TIMELINE_POLL_STATUSES = new Set(['confirmed', ...ACTIVE_SHIPMENT_STATUSES]);

function shortOrderId(id) {
  if (!id) return '';
  return String(id).slice(-8).toUpperCase();
}

function OrderStepper({ steps = [], status }) {
  if (status === 'cancelled') {
    return (
      <div className="order-stepper order-stepper--cancelled">
        <p className="order-stepper-cancelled-msg">Đơn hàng đã bị hủy</p>
      </div>
    );
  }

  return (
    <div className="order-stepper" role="list" aria-label="Tiến trình đơn hàng">
      {steps.map((step, index) => {
        const state = step.error ? 'error' : step.active ? 'active' : step.done ? 'done' : 'pending';
        return (
          <div key={step.key} className={`order-stepper-step order-stepper-step--${state}`} role="listitem">
            <div className="order-stepper-marker">
              <span className="order-stepper-dot" />
              {index < steps.length - 1 && <span className="order-stepper-line" />}
            </div>
            <span className="order-stepper-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const { authFetch, isAuthenticated } = useAuth();
  const { formatPrice, locale } = useI18n();
  const dateLocale = locale === 'en' ? 'en-US' : 'vi-VN';

  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelNote, setCancelNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadTimeline = useCallback(async () => {
    setError(null);
    try {
      const payload = await authFetch(`/api/orders/${orderId}/timeline`);
      setTimeline(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, orderId]);

  useEffect(() => {
    if (!isAuthenticated || !orderId) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    loadTimeline();
    return undefined;
  }, [isAuthenticated, orderId, loadTimeline]);

  useEffect(() => {
    const order = timeline?.order;
    if (!order || !TIMELINE_POLL_STATUSES.has(order.status)) return undefined;

    const timer = setInterval(() => {
      loadTimeline();
    }, 30000);

    return () => clearInterval(timer);
  }, [timeline?.order?.status, loadTimeline]);

  const cancelImmediate = async () => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn này?')) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/orders/${orderId}/cancel-immediate`, { method: 'POST' });
      await loadTimeline();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const requestCancel = async (event) => {
    event.preventDefault();
    setActionLoading(true);
    try {
      await apiFetch(`/api/orders/${orderId}/request-cancellation`, {
        method: 'POST',
        body: JSON.stringify({ note: cancelNote }),
      });
      setCancelNote('');
      await loadTimeline();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <p>
          Vui lòng <Link to="/login">đăng nhập</Link> để xem đơn hàng.
        </p>
      </div>
    );
  }

  const order = timeline?.order;
  const steps = timeline?.steps || [];
  const statusHistory = (timeline?.events || []).filter((event) => event.source === 'order');

  return (
    <div className="container order-detail-page" style={{ maxWidth: 900, padding: '24px 16px' }}>
      <p style={{ marginBottom: 16 }}>
        <Link to="/account/orders">← Danh sách đơn hàng</Link>
        {' · '}
        <Link to="/account/profile">Tài khoản</Link>
      </p>

      {loading && <p className="text-muted">Đang tải chi tiết đơn...</p>}
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      {order && (
        <>
          <header className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 24, marginBottom: 8 }}>Đơn #{shortOrderId(order._id)}</h1>
                <p className="text-sm text-muted">
                  Đặt lúc {order.createdAt ? new Date(order.createdAt).toLocaleString(dateLocale) : '—'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
              <div>
                <div className="text-sm text-muted">Tổng tiền</div>
                <strong>{formatPrice(order.total || 0)}</strong>
              </div>
              <div>
                <div className="text-sm text-muted">Thanh toán</div>
                <strong>{getPaymentMethodLabel(order.paymentMethod)}</strong>
              </div>
              <div>
                <div className="text-sm text-muted">Trạng thái</div>
                <strong>{getOrderStatusLabel(order.status)}</strong>
              </div>
            </div>
          </header>

          {order.fulfillmentPending && (
            <section className="card" style={{ padding: 16, marginBottom: 16, background: '#f8fafc' }}>
              <p className="text-sm" style={{ margin: 0 }}>
                Shop đang xác nhận và chuẩn bị đơn hàng. Bạn sẽ thấy cập nhật giao hàng khi đơn được chuyển vận chuyển.
              </p>
            </section>
          )}

          <section className="card" style={{ padding: 16, marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>Tiến trình đơn hàng</h2>
            <OrderStepper steps={steps} status={order.status} />
          </section>

          {statusHistory.length > 1 && (
            <section className="card" style={{ padding: 16, marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, marginBottom: 12 }}>Cập nhật trạng thái</h2>
              <ol className="order-timeline">
                {[...statusHistory].reverse().map((event, index) => (
                  <li key={`${event.at}-${event.status}-${index}`} className="order-timeline-item order-timeline-item--order">
                    <span className="order-timeline-icon" aria-hidden>📋</span>
                    <div className="order-timeline-body">
                      <div className="order-timeline-title">{event.title}</div>
                      <div className="order-timeline-time">
                        {event.at ? new Date(event.at).toLocaleString(dateLocale) : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="card" style={{ padding: 16, marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Thông tin giao hàng</h2>
            <p>{order.shippingInfo?.fullName}</p>
            <p className="text-sm text-muted">{order.shippingInfo?.phone}</p>
            <p className="text-sm">{order.shippingInfo?.address}</p>
            {(order.shippingInfo?.ward || order.shippingInfo?.district || order.shippingInfo?.province) && (
              <p className="text-sm text-muted">
                {[order.shippingInfo?.ward, order.shippingInfo?.district, order.shippingInfo?.province].filter(Boolean).join(', ')}
              </p>
            )}
          </section>

          {orderRequestedInvoice(order) && (
            <section style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, marginBottom: 12 }}>Hóa đơn điện tử</h2>
              <ElectronicInvoice order={order} />
            </section>
          )}

          <section className="card" style={{ padding: 16 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Hành động</h2>
            {order.cancelRequestStatus === 'pending' && (
              <div style={{ padding: 12, background: '#fffbeb', borderRadius: 8, marginBottom: 12 }}>
                Yêu cầu hủy đơn đang chờ shop xử lý.
                {order.cancelRequestNote && <p className="text-sm" style={{ marginTop: 6 }}>Lý do: {order.cancelRequestNote}</p>}
              </div>
            )}
            {canCustomerCancelImmediate(order.status) && order.paymentMethod !== 'installment' && (
              <button type="button" className="btn btn-outline" onClick={cancelImmediate} disabled={actionLoading}>
                Hủy đơn ngay
              </button>
            )}
            {canRequestCancel(order.status) && order.cancelRequestStatus !== 'pending' && (
              <form onSubmit={requestCancel} style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                <label className="text-sm">
                  Yêu cầu hủy đơn
                  <textarea
                    className="input"
                    rows={3}
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    placeholder="Nhập lý do hủy (tùy chọn)"
                    style={{ display: 'block', width: '100%', marginTop: 6 }}
                  />
                </label>
                {(order.status === 'picked' || order.status === 'shipping') && (
                  <p className="text-sm" style={{ color: '#ca8a04' }}>
                    Lưu ý: Đơn có thể đã được lấy hàng. Shop sẽ xem xét và xử lý nếu cần.
                  </p>
                )}
                <button type="submit" className="btn btn-outline" disabled={actionLoading}>
                  Gửi yêu cầu hủy
                </button>
              </form>
            )}
            {!canCustomerCancelImmediate(order.status) && !canRequestCancel(order.status) && order.cancelRequestStatus !== 'pending' && (
              <p className="text-muted text-sm">Không thể hủy đơn ở trạng thái hiện tại.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
