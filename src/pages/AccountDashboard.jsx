import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { OrderStatusBadge } from '../components/OrderStatusBadge';

function shortOrderId(id) {
  if (!id) return '';
  return String(id).slice(-8).toUpperCase();
}

export default function AccountDashboard() {
  const { user, authFetch } = useAuth();
  const { formatPrice } = useI18n();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authFetch('/api/orders')
      .then((payload) => {
        if (!cancelled) setOrders(payload?.items || []);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length;
  const recentOrders = orders.slice(0, 3);

  return (
    <div>
      <h1 className="account-page-title">Xin chào, {user?.name}</h1>
      <p className="account-page-sub">Quản lý đơn hàng, thông tin cá nhân và bảo mật tài khoản TechPhone.</p>

      <div className="account-stats">
        <article className="card account-stat-card">
          <span className="text-muted">Tổng đơn hàng</span>
          <strong>{orders.length}</strong>
        </article>
        <article className="card account-stat-card">
          <span className="text-muted">Đang xử lý</span>
          <strong>{pendingOrders}</strong>
        </article>
        <article className="card account-stat-card">
          <span className="text-muted">Tổng chi tiêu</span>
          <strong>{formatPrice(totalSpent)}</strong>
        </article>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18 }}>Đơn hàng gần đây</h2>
          <Link to="/account/orders" className="btn btn-outline" style={{ fontSize: 13 }}>
            Xem tất cả
          </Link>
        </div>
        {loading && <p className="text-muted">Đang tải...</p>}
        {!loading && recentOrders.length === 0 && (
          <p className="text-muted">Bạn chưa có đơn hàng nào. <Link to="/products">Mua sắm ngay</Link></p>
        )}
        {!loading &&
          recentOrders.map((order) => (
            <Link
              key={order._id}
              to={`/account/orders/${order._id}`}
              className="card"
              style={{
                display: 'block',
                padding: 12,
                marginBottom: 8,
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>#{shortOrderId(order._id)}</strong>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                {formatPrice(order.total || 0)} · {new Date(order.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </Link>
          ))}
      </div>

      <div className="account-quick-actions">
        <Link to="/account/profile" className="btn btn-primary">Cập nhật hồ sơ</Link>
        <Link to="/products" className="btn btn-outline">Tiếp tục mua sắm</Link>
      </div>
    </div>
  );
}
