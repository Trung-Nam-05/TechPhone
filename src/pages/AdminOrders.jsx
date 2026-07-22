import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  XCircle,
  DollarSign,
  Clock,
  PackageCheck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ORDER_STATUS_OPTIONS,
  getOrderStatusLabel,
  getGhnAdminTrackingUrl,
} from '../constants/orderLabels';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/OrderStatusBadge';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import AdminKpiCard from '../components/admin/AdminKpiCard';
import './AdminOrders.css';

const SUPPORT_STATUS_OPTIONS = ['none', 'customer_contacted', 'awaiting_response', 'resolved'];
const SUPPORT_STATUS_LABELS = {
  none: 'Chưa xử lý',
  customer_contacted: 'Đã liên hệ khách',
  awaiting_response: 'Chờ khách phản hồi',
  resolved: 'Đã xử lý xong',
};
const INSTALLMENT_STATUS_OPTIONS = ['draft', 'pending_review', 'approved', 'rejected', 'completed', 'cancelled'];
const PAYMENT_METHOD_LABELS = {
  cod: 'COD',
  vnpay: 'VNPAY',
  installment: 'Trả góp',
};

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function shortOrderId(id) {
  return id ? `#${String(id).slice(-8).toUpperCase()}` : '—';
}

function canConfirmFulfillment(order) {
  if (!order || order.status !== 'confirmed' || order.shipment?.labelId) return false;
  if (order.paymentMethod === 'installment') return false;
  if (order.paymentMethod === 'vnpay' && order.paymentStatus !== 'paid') return false;
  return true;
}

export default function AdminOrders() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [events, setEvents] = useState([]);
  const [shipmentEvents, setShipmentEvents] = useState([]);
  const [copiedLabelId, setCopiedLabelId] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelFilter, setCancelFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [overrideModal, setOverrideModal] = useState(null);

  const selectedOrder = useMemo(
    () => items.find((item) => item._id === selectedOrderId) || null,
    [items, selectedOrderId],
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((order) => {
      const id = String(order._id || '').toLowerCase();
      const name = String(order.shippingInfo?.fullName || '').toLowerCase();
      const phone = String(order.shippingInfo?.phone || '').toLowerCase();
      const email = String(order.shippingInfo?.email || '').toLowerCase();
      return id.includes(q) || name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [items, searchQuery]);

  const kpis = useMemo(() => {
    const pending = items.filter((o) => o.status === 'pending').length;
    const awaitingFulfillment = items.filter(
      (o) =>
        o.status === 'confirmed' &&
        !o.shipment?.labelId &&
        o.paymentMethod !== 'installment' &&
        (o.paymentMethod !== 'vnpay' || o.paymentStatus === 'paid'),
    ).length;
    const shipping = items.filter((o) => ['await_pickup', 'picked', 'shipping'].includes(o.status)).length;
    const cancelPending = items.filter((o) => o.cancelRequestStatus === 'pending').length;
    const revenue = items
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    return { total: items.length, pending, awaitingFulfillment, shipping, cancelPending, revenue };
  }, [items]);

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

  const selectOrder = async (orderId) => {
    setSelectedOrderId(orderId);
    setCopiedLabelId(false);
    await loadEvents(orderId);
    await loadShipmentEvents(orderId);
  };

  const copyLabelId = async (labelId) => {
    try {
      await navigator.clipboard.writeText(labelId);
      setCopiedLabelId(true);
      setTimeout(() => setCopiedLabelId(false), 2000);
    } catch {
      setError('Không thể sao chép mã vận đơn.');
    }
  };

  const retryGhn = async (orderId, event) => {
    event?.stopPropagation();
    try {
      const payload = await authFetch(`/api/admin/orders/${orderId}/ghn/retry`, { method: 'POST' });
      setItems((prev) => prev.map((item) => (item._id === orderId ? payload.order : item)));
      if (selectedOrderId === orderId) {
        await loadEvents(orderId);
        await loadShipmentEvents(orderId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmFulfillment = async (orderId, event) => {
    event?.stopPropagation();
    if (!window.confirm('Xác nhận đã kiểm kho, đóng gói và gửi vận đơn GHN (staging)?')) return;
    try {
      const payload = await authFetch(`/api/admin/orders/${orderId}/confirm-fulfillment`, { method: 'POST' });
      setItems((prev) => prev.map((item) => (item._id === orderId ? payload.order : item)));
      if (selectedOrderId === orderId) {
        await loadEvents(orderId);
        await loadShipmentEvents(orderId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelGhn = async (orderId, event) => {
    event?.stopPropagation();
    if (!window.confirm('Hủy vận đơn GHN cho đơn này?')) return;
    try {
      const payload = await authFetch(`/api/admin/orders/${orderId}/ghn/cancel`, { method: 'POST' });
      setItems((prev) => prev.map((item) => (item._id === orderId ? payload.order : item)));
      if (selectedOrderId === orderId) {
        await loadEvents(orderId);
        await loadShipmentEvents(orderId);
      }
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
        ? { status: patch.installmentStatus, note: patch.note || '' }
        : patch;
      const updated = await authFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setItems((prev) => prev.map((item) => (item._id === orderId ? updated : item)));
      if (selectedOrderId === orderId) await loadEvents(orderId);
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
    <div className="admin-page admin-orders-page">
      <AdminPageHeader
        title="Quản lý đơn hàng"
        subtitle="Theo dõi, xử lý và cập nhật trạng thái đơn hàng theo quy trình vận hành."
      />

      <div className="admin-kpi-grid">
        <AdminKpiCard label="Tổng đơn" value={kpis.total} icon={ShoppingBag} tone="blue" />
        <AdminKpiCard label="Chờ xử lý" value={kpis.pending} icon={Clock} tone="orange" />
        <AdminKpiCard label="Chờ xác nhận GHN" value={kpis.awaitingFulfillment} icon={PackageCheck} tone="orange" />
        <AdminKpiCard label="Đang giao" value={kpis.shipping} icon={Truck} tone="purple" />
        <AdminKpiCard label="Yêu cầu hủy" value={kpis.cancelPending} icon={XCircle} tone="red" />
        <AdminKpiCard label="Doanh thu hoàn tất" value={formatMoney(kpis.revenue)} icon={DollarSign} tone="green" />
      </div>

      <div className="admin-orders-toolbar">
        <div className="admin-orders-search" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="input"
            style={{ paddingLeft: 34, width: '100%' }}
            placeholder="Tìm mã đơn, tên, SĐT, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {ORDER_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {getOrderStatusLabel(status)}
            </option>
          ))}
        </select>
        <select className="input" value={cancelFilter} onChange={(e) => setCancelFilter(e.target.value)}>
          <option value="">Yêu cầu hủy</option>
          <option value="none">Không có</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã đồng ý</option>
          <option value="rejected">Từ chối</option>
        </select>
        <button type="button" className="btn btn-outline" onClick={loadOrders} title="Làm mới">
          <RefreshCw size={16} />
        </button>
      </div>

      {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}

      <div className="admin-orders-layout">
        <div className="admin-orders-table-wrap">
          {loading ? (
            <p className="admin-orders-empty">Đang tải đơn hàng...</p>
          ) : filteredItems.length === 0 ? (
            <p className="admin-orders-empty">Không tìm thấy đơn hàng phù hợp.</p>
          ) : (
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Thanh toán</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Ngày đặt</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((order) => (
                  <tr
                    key={order._id}
                    className={selectedOrderId === order._id ? 'is-selected' : ''}
                    onClick={() => selectOrder(order._id)}
                  >
                    <td>
                      <span className="admin-order-code">{shortOrderId(order._id)}</span>
                      {order.cancelRequestStatus === 'pending' && (
                        <span style={{ display: 'block', fontSize: 11, color: '#d97706', marginTop: 2 }}>
                          Yêu cầu hủy
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="admin-order-customer">
                        <strong>{order.shippingInfo?.fullName || '—'}</strong>
                        <span>{order.shippingInfo?.phone}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 12 }}>{PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</span>
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </div>
                    </td>
                    <td className="admin-order-amount">{formatMoney(order.total)}</td>
                    <td>
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="admin-order-date">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="admin-order-actions">
                        <button type="button" className="btn btn-outline" onClick={() => selectOrder(order._id)}>
                          Chi tiết
                        </button>
                        {order.cancelRequestStatus === 'pending' && (
                          <>
                            <button type="button" className="btn btn-primary" onClick={() => resolveCancellation(order._id, 'approve')}>
                              Duyệt hủy
                            </button>
                            <button type="button" className="btn btn-outline" onClick={() => resolveCancellation(order._id, 'reject')}>
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="admin-orders-detail">
          <h2>Chi tiết đơn hàng</h2>
          {!selectedOrder && <p className="text-muted">Chọn một dòng trong bảng để xem timeline và thao tác.</p>}
          {selectedOrder && (
            <>
              <p style={{ margin: '0 0 12px', fontSize: 13 }}>
                <strong>{shortOrderId(selectedOrder._id)}</strong>
                {' · '}
                {selectedOrder.shippingInfo?.fullName}
                {' · '}
                {formatMoney(selectedOrder.total)}
              </p>

              <div className="admin-orders-detail-section">
                <h3>Hỗ trợ nội bộ</h3>
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={selectedOrder.supportStatus || 'none'}
                  onChange={(e) => updateOrder(selectedOrder._id, { supportStatus: e.target.value })}
                >
                  {SUPPORT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {SUPPORT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrder.shipment?.labelId && (
                <div className="admin-orders-detail-section">
                  <h3>Vận đơn GHN</h3>
                  <p className="text-sm" style={{ margin: '0 0 8px' }}>
                    Mã vận đơn:{' '}
                    <strong>{selectedOrder.shipment.labelId}</strong>{' '}
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ marginLeft: 6, padding: '2px 8px', fontSize: 12 }}
                      onClick={() => copyLabelId(selectedOrder.shipment.labelId)}
                    >
                      {copiedLabelId ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                  </p>
                  <p className="text-sm text-muted" style={{ margin: '0 0 12px' }}>
                    Trạng thái trên TechPhone: <strong>{getOrderStatusLabel(selectedOrder.status)}</strong>
                  </p>
                  <a
                    href={getGhnAdminTrackingUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                  >
                    <ExternalLink size={16} aria-hidden />
                    Tra cứu vận đơn GHN
                  </a>
                  <p className="text-sm text-muted" style={{ margin: '8px 0 0', lineHeight: 1.45 }}>
                    Mở 5sao.ghn.dev → đăng nhập shop → dán mã vận đơn ở trên để xem trên GHN staging.
                  </p>
                </div>
              )}
              {selectedOrder.shipment?.submitError && (
                <p className="text-sm" style={{ color: '#dc2626', marginBottom: 12 }}>
                  Lỗi GHN: {selectedOrder.shipment.submitError}
                </p>
              )}

              <div className="admin-order-actions" style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() =>
                    setOverrideModal({
                      orderId: selectedOrder._id,
                      currentStatus: selectedOrder.status,
                      newStatus: selectedOrder.status,
                      reason: '',
                    })
                  }
                >
                  Ghi đè trạng thái
                </button>
                {canConfirmFulfillment(selectedOrder) && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={(e) => confirmFulfillment(selectedOrder._id, e)}
                  >
                    Xác nhận & gửi GHN
                  </button>
                )}
                {selectedOrder.shipment?.submitError && (
                  <button type="button" className="btn btn-outline" onClick={(e) => retryGhn(selectedOrder._id, e)}>
                    Thử lại tạo GHN
                  </button>
                )}
                {selectedOrder.shipment?.labelId && !['completed', 'cancelled', 'returned'].includes(selectedOrder.status) && (
                  <button type="button" className="btn btn-outline" onClick={(e) => cancelGhn(selectedOrder._id, e)}>
                    Hủy GHN
                  </button>
                )}
                <Link to={`/account/orders/${selectedOrder._id}`} className="btn btn-outline">
                  Xem như khách
                </Link>
              </div>

              {selectedOrder.paymentMethod === 'installment' && (
                <div className="admin-orders-detail-section">
                  <h3>Trả góp</h3>
                  <select
                    className="input"
                    style={{ width: '100%', marginBottom: 8 }}
                    value={selectedOrder.installment?.status || 'draft'}
                    onChange={(e) => updateOrder(selectedOrder._id, { installmentStatus: e.target.value })}
                  >
                    {INSTALLMENT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-muted" style={{ margin: 0 }}>
                    Trả trước: {formatMoney(selectedOrder.installment?.downPaymentAmount)} · Tháng:{' '}
                    {formatMoney(selectedOrder.installment?.monthlyAmount)}
                  </p>
                </div>
              )}

              <div className="admin-orders-detail-section">
                <h3>Lịch sử đơn hàng</h3>
                {events.map((item) => (
                  <div key={item._id} className="admin-orders-timeline-item">
                    <strong>{getOrderStatusLabel(item.toStatus) || item.toStatus}</strong>
                    <p className="text-sm text-muted" style={{ margin: '2px 0' }}>
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </p>
                    {item.note && <p className="text-sm" style={{ margin: 0 }}>{item.note}</p>}
                  </div>
                ))}
                {events.length === 0 && <p className="text-muted">Chưa có sự kiện.</p>}
              </div>

              <div className="admin-orders-detail-section">
                <h3>Hành trình GHN</h3>
                {shipmentEvents.map((item) => (
                  <div key={item._id} className="admin-orders-timeline-item">
                    <strong>{item.note || item.carrierStatus || 'GHN'}</strong>
                    <p className="text-sm text-muted" style={{ margin: '2px 0' }}>
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                ))}
                {shipmentEvents.length === 0 && <p className="text-muted">Chưa có cập nhật GHN.</p>}
              </div>

              {selectedOrder.cancelRequestStatus === 'pending' && (
                <div className="admin-orders-cancel-banner">
                  <p className="text-sm" style={{ margin: '0 0 8px' }}>
                    <strong>Yêu cầu hủy:</strong> {selectedOrder.cancelRequestNote || 'Không có ghi chú'}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-primary" onClick={() => resolveCancellation(selectedOrder._id, 'approve')}>
                      Đồng ý hủy
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => resolveCancellation(selectedOrder._id, 'reject')}>
                      Từ chối
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {overrideModal && (
        <div className="admin-orders-modal-backdrop" onClick={() => setOverrideModal(null)}>
          <div className="admin-orders-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
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
              Lý do (tối thiểu 10 ký tự)
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
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
