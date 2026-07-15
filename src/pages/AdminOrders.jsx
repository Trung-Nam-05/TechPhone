import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ORDER_STATUS_OPTIONS,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from '../constants/orderLabels';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/OrderStatusBadge';

const SUPPORT_STATUS_OPTIONS = ['none', 'customer_contacted', 'awaiting_response', 'resolved'];
const SUPPORT_STATUS_LABELS = {
  none: 'Chưa xử lý hỗ trợ',
  customer_contacted: 'Đã liên hệ khách',
  awaiting_response: 'Chờ khách phản hồi',
  resolved: 'Đã xử lý xong',
};
const INSTALLMENT_STATUS_OPTIONS = ['draft', 'pending_review', 'approved', 'rejected', 'completed', 'cancelled'];

export default function AdminOrders() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [events, setEvents] = useState([]);
  const [shipmentEvents, setShipmentEvents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelFilter, setCancelFilter] = useState('');
  const [overrideModal, setOverrideModal] = useState(null);

  const selectedOrder = useMemo(
    () => items.find((item) => item._id === selectedOrderId) || null,
    [items, selectedOrderId],
  );

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.set('status', statusFilter);
      if (cancelFilter) query.set('cancelRequestStatus', cancelFilter);
      const payload = await authFetch(`/api/admin/orders?${query.toString()}`);
      setItems(payload.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, cancelFilter]);

  const resolveCancellation = async (orderId, action) => {
    try {
      const updated = await authFetch(`/api/admin/orders/${orderId}/cancellation`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      setItems((prev) => prev.map((item) => (item._id === orderId ? updated.order : item)));
      await loadEvents(orderId);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadEvents = async (orderId) => {
    try {
      const payload = await authFetch(`/api/admin/orders/${orderId}/events`);
      setEvents(payload.items || []);
    } catch {
      setEvents([]);
    }
  };

  const loadShipmentEvents = async (orderId) => {
    try {
      const payload = await authFetch(`/api/admin/orders/${orderId}/shipment-events`);
      setShipmentEvents(payload.items || []);
    } catch {
      setShipmentEvents([]);
    }
  };

  const retryGhn = async (orderId) => {
    try {
      const payload = await authFetch(`/api/admin/orders/${orderId}/ghn/retry`, { method: 'POST' });
      setItems((prev) => prev.map((item) => (item._id === orderId ? payload.order : item)));
      await loadEvents(orderId);
      await loadShipmentEvents(orderId);
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelGhn = async (orderId) => {
    if (!window.confirm('Hủy vận đơn GHN cho đơn này?')) return;
    try {
      const payload = await authFetch(`/api/admin/orders/${orderId}/ghn/cancel`, { method: 'POST' });
      setItems((prev) => prev.map((item) => (item._id === orderId ? payload.order : item)));
      await loadEvents(orderId);
      await loadShipmentEvents(orderId);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateOrder = async (orderId, patch) => {
    try {
      const isInstallmentPatch = Object.prototype.hasOwnProperty.call(patch, 'installmentStatus');
      const endpoint = isInstallmentPatch
        ? `/api/admin/orders/${orderId}/installment`
        : `/api/admin/orders/${orderId}/status`;
      const body = isInstallmentPatch
        ? {
            status: patch.installmentStatus,
            note: patch.note || '',
          }
        : patch;
      const updated = await authFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setItems((prev) => prev.map((item) => (item._id === orderId ? updated : item)));
      await loadEvents(orderId);
      return updated;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const submitOverride = async () => {
    if (!overrideModal) return;
    const { orderId, newStatus, reason } = overrideModal;
    if (!newStatus || String(reason).trim().length < 10) {
      setError('Lý do ghi đè phải có ít nhất 10 ký tự.');
      return;
    }
    const updated = await updateOrder(orderId, {
      status: newStatus,
      override: true,
      reason: String(reason).trim(),
    });
    if (updated) setOverrideModal(null);
  };

  return (
    <div>
      <h1 style={{ fontSize: 30, marginBottom: 12 }}>Quản lý đơn hàng</h1>
      <p className="text-muted" style={{ marginBottom: 12 }}>
        Trạng thái theo dõi hỗ trợ đơn hàng (nội bộ admin): dùng dropdown trên từng đơn để ghi nhận tiến độ xử lý khiếu nại, giao trễ hoặc liên hệ khách.
      </p>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <label>
          Lọc trạng thái:
          <select
            className="input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ marginLeft: 8, minWidth: 180 }}
          >
            <option value="">Tất cả</option>
            {ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getOrderStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Yêu cầu hủy:
          <select
            className="input"
            value={cancelFilter}
            onChange={(event) => setCancelFilter(event.target.value)}
            style={{ marginLeft: 8, minWidth: 160 }}
          >
            <option value="">Tất cả</option>
            <option value="none">Không</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã đồng ý</option>
            <option value="rejected">Từ chối</option>
          </select>
        </label>
      </div>
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
      <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 14 }}>
        <div className="card" style={{ padding: 12 }}>
          {loading ? (
            <p className="text-muted">Đang tải đơn hàng...</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {items.map((order) => (
                <article key={order._id} className="card" style={{ padding: 10, border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                    <strong>{order._id}</strong>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <OrderStatusBadge status={order.status} />
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                  </div>
                  <p className="text-sm text-muted" style={{ marginBottom: 4 }}>
                    {order.shippingInfo?.fullName} — {order.shippingInfo?.phone}
                  </p>
                  <p className="text-sm">Tổng: {(order.total || 0).toLocaleString('vi-VN')} đ</p>
                  {order.shipment?.labelId && (
                    <p className="text-sm text-muted">Vận đơn GHN: {order.shipment.labelId}</p>
                  )}
                  {order.shipment?.submitError && (
                    <p className="text-sm" style={{ color: '#dc2626' }}>
                      Lỗi GHN: {order.shipment.submitError}
                    </p>
                  )}
                  {order.paymentMethod === 'installment' && (
                    <p className="text-sm text-muted">
                      Trả góp: {order.installment?.status || 'draft'} | {order.installment?.provider || 'N/A'} |{' '}
                      {order.installment?.planMonths || 0} tháng
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <OrderStatusBadge status={order.status} />
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() =>
                        setOverrideModal({
                          orderId: order._id,
                          currentStatus: order.status,
                          newStatus: order.status,
                          reason: '',
                        })
                      }
                    >
                      Ghi đè (ngoại lệ)
                    </button>
                    <select
                      className="input"
                      value={order.supportStatus || 'none'}
                      onChange={(event) => updateOrder(order._id, { supportStatus: event.target.value })}
                      title="Trạng thái theo dõi hỗ trợ đơn hàng"
                    >
                      {SUPPORT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {SUPPORT_STATUS_LABELS[status] || status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={async () => {
                        setSelectedOrderId(order._id);
                        await loadEvents(order._id);
                        await loadShipmentEvents(order._id);
                      }}
                    >
                      Chi tiết
                    </button>
                    {(order.shipment?.submitError || order.status === 'confirmed') && (
                      <button type="button" className="btn btn-outline" onClick={() => retryGhn(order._id)}>
                        Tạo lại GHN
                      </button>
                    )}
                    {order.shipment?.labelId && !['completed', 'cancelled', 'returned'].includes(order.status) && (
                      <button type="button" className="btn btn-outline" onClick={() => cancelGhn(order._id)}>
                        Hủy GHN
                      </button>
                    )}
                    <Link to={`/account/orders/${order._id}`} className="btn btn-outline" style={{ fontSize: 12 }}>
                      Xem như khách
                    </Link>
                  </div>
                  {order.cancelRequestStatus === 'pending' && (
                    <div style={{ marginTop: 8, padding: 8, background: '#fffbeb', borderRadius: 8 }}>
                      <p className="text-sm" style={{ marginBottom: 6 }}>
                        <strong>Yêu cầu hủy đơn</strong>
                        {order.cancelRequestNote ? ` — ${order.cancelRequestNote}` : ''}
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => resolveCancellation(order._id, 'approve')}
                        >
                          Đồng ý hủy
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => resolveCancellation(order._id, 'reject')}
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  )}
                  {order.paymentMethod === 'installment' && (
                    <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          className="input"
                          defaultValue={order.installment?.status || 'draft'}
                          onChange={(event) =>
                            updateOrder(order._id, {
                              installmentStatus: event.target.value,
                            })
                          }
                        >
                          {INSTALLMENT_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              installment: {status}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="text-sm text-muted">
                        <p>Trả trước: {(order.installment?.downPaymentAmount || 0).toLocaleString('vi-VN')} đ</p>
                        <p>Tài trợ: {(order.installment?.financedAmount || 0).toLocaleString('vi-VN')} đ</p>
                        <p>Mỗi tháng: {(order.installment?.monthlyAmount || 0).toLocaleString('vi-VN')} đ</p>
                      </div>
                    </div>
                  )}
                </article>
              ))}
              {items.length === 0 && <p className="text-muted">Chưa có đơn hàng.</p>}
            </div>
          )}
        </div>
        <aside className="card" style={{ padding: 12 }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Timeline đơn hàng</h2>
          {!selectedOrder && <p className="text-muted">Chọn đơn hàng để xem lịch sử.</p>}
          {selectedOrder && (
            <>
              <p style={{ marginBottom: 8 }}>
                <strong>Đơn:</strong> {selectedOrder._id}
              </p>
              <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
                Thanh toán: {getPaymentStatusLabel(selectedOrder.paymentStatus)}
              </p>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>Sự kiện đơn hàng</h3>
              <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                {events.map((item) => (
                  <div key={item._id} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
                    <strong>{getOrderStatusLabel(item.toStatus) || item.toStatus}</strong>
                    <p className="text-sm text-muted">{new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                    {item.note && <p className="text-sm">{item.note}</p>}
                  </div>
                ))}
                {events.length === 0 && <p className="text-muted">Chưa có sự kiện.</p>}
              </div>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>Hành trình GHN</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {shipmentEvents.map((item) => (
                  <div key={item._id} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
                    <strong>{item.note || item.carrierStatus || 'GHN'}</strong>
                    <p className="text-sm text-muted">{new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                    {item.labelId && <p className="text-sm text-muted">Mã: {item.labelId}</p>}
                  </div>
                ))}
                {shipmentEvents.length === 0 && <p className="text-muted">Chưa có cập nhật GHN.</p>}
              </div>
            </>
          )}
        </aside>
      </div>

      {overrideModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: 16,
          }}
          onClick={() => setOverrideModal(null)}
        >
          <div
            className="card"
            style={{ padding: 20, maxWidth: 420, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>Ghi đè trạng thái (ngoại lệ)</h2>
            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
              Hiện tại: <strong>{getOrderStatusLabel(overrideModal.currentStatus)}</strong>
            </p>
            <label className="text-sm" style={{ display: 'block', marginBottom: 12 }}>
              Trạng thái mới
              <select
                className="input"
                style={{ display: 'block', width: '100%', marginTop: 6 }}
                value={overrideModal.newStatus}
                onChange={(e) => setOverrideModal((prev) => ({ ...prev, newStatus: e.target.value }))}
              >
                {ORDER_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {getOrderStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm" style={{ display: 'block', marginBottom: 16 }}>
              Lý do (bắt buộc, tối thiểu 10 ký tự)
              <textarea
                className="input"
                rows={4}
                style={{ display: 'block', width: '100%', marginTop: 6 }}
                value={overrideModal.reason}
                onChange={(e) => setOverrideModal((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Mô tả lý do ghi đè trạng thái..."
              />
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setOverrideModal(null)}>
                Hủy
              </button>
              <button type="button" className="btn btn-primary" onClick={submitOverride}>
                Xác nhận ghi đè
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
