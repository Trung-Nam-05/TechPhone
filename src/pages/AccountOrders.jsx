import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/OrderStatusBadge';

function shortOrderId(id) {
  if (!id) return '';
  return String(id).slice(-8).toUpperCase();
}

export default function AccountOrders() {
  const { authFetch, isAuthenticated } = useAuth();
  const { t, formatPrice, locale } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const dateLocale = locale === 'en' ? 'en-US' : 'vi-VN';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const payload = await authFetch('/api/orders');
        if (!cancelled) setItems(payload.items || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [authFetch, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <p>
          {t('account.viewOrdersLoginPrefix')}{' '}
          <Link to="/login">{t('account.login')}</Link>{' '}
          {t('account.viewOrdersLoginSuffix')}
        </p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 900, padding: '24px 16px' }}>
      <p style={{ marginBottom: 16 }}>
        <Link to="/account/profile">{t('account.profileNav')}</Link>
        {' · '}
        <Link to="/">{t('account.homeLink')}</Link>
      </p>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>{t('account.ordersTitle')}</h1>
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
      {loading ? (
        <p className="text-muted">{t('account.loadingOrders')}</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((order) => (
            <Link
              key={order._id}
              to={`/account/orders/${order._id}`}
              className="card order-list-card"
              style={{ padding: 14, textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong>{t('account.orderCode')}</strong> #{shortOrderId(order._id)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.paymentStatus} />
                  {order.cancelRequestStatus === 'pending' && (
                    <span style={{ color: '#ca8a04', fontSize: 13 }}>{t('account.pendingCancel')}</span>
                  )}
                </div>
              </div>
              <p className="text-sm" style={{ marginTop: 8 }}>
                {t('account.orderTotal')} {formatPrice(order.total || 0)} ·{' '}
                {order.createdAt ? new Date(order.createdAt).toLocaleString(dateLocale) : ''}
              </p>
              {order.shipment?.labelId && (
                <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                  Mã vận đơn GHN: <strong>{order.shipment.labelId}</strong>
                </p>
              )}
              <p className="text-sm text-muted" style={{ marginTop: 6 }}>
                Xem chi tiết & theo dõi →
              </p>
            </Link>
          ))}
          {items.length === 0 && <p className="text-muted">{t('account.noOrders')}</p>}
        </div>
      )}
    </div>
  );
}
