import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

export default function AdminAnalytics() {
  const { authFetch, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [revenue, setRevenue] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [funnelPayload, revenuePayload] = await Promise.all([
          authFetch('/api/analytics/funnel'),
          authFetch('/api/analytics/revenue'),
        ]);
        if (!mounted) return;
        setFunnel(funnelPayload);
        setRevenue(revenuePayload);
      } catch (err) {
        if (!mounted) return;
        setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [authFetch]);

  const exportOrdersCsv = async () => {
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(`${API_BASE_URL}/api/admin/orders/export/csv`, { headers });
    if (!res.ok) {
      const text = await res.text();
      let msg = 'Export failed';
      try {
        const j = JSON.parse(text);
        msg = j.message || msg;
      } catch {
        msg = text.slice(0, 200) || msg;
      }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="text-muted">Đang tải dashboard funnel...</p>;
  }

  if (error) {
    return <p style={{ color: '#dc2626' }}>{error}</p>;
  }

  return (
    <div>
      <h1 style={{ fontSize: 30, marginBottom: 12 }}>Dashboard funnel (đánh giá hàng tuần)</h1>
      <p className="text-muted" style={{ marginBottom: 16 }}>
        Theo dõi 4 bước chính: xem sản phẩm — thêm giỏ — bắt đầu thanh toán — mua hàng.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 14 }}>
        <article className="card" style={{ padding: 12 }}>
          <strong>View product</strong>
          <p style={{ fontSize: 22 }}>{funnel?.steps?.viewProduct || 0}</p>
        </article>
        <article className="card" style={{ padding: 12 }}>
          <strong>Add to cart</strong>
          <p style={{ fontSize: 22 }}>{funnel?.steps?.addToCart || 0}</p>
        </article>
        <article className="card" style={{ padding: 12 }}>
          <strong>Begin checkout</strong>
          <p style={{ fontSize: 22 }}>{funnel?.steps?.beginCheckout || 0}</p>
        </article>
        <article className="card" style={{ padding: 12 }}>
          <strong>Purchase</strong>
          <p style={{ fontSize: 22 }}>{funnel?.steps?.purchase || 0}</p>
        </article>
      </div>
      <div className="card" style={{ padding: 14 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Tỷ lệ chuyển đổi</h2>
        <p style={{ marginBottom: 4 }}>Xem → Giỏ: {funnel?.conversionRates?.viewToCart || 0}%</p>
        <p style={{ marginBottom: 4 }}>Giỏ → Thanh toán: {funnel?.conversionRates?.cartToCheckout || 0}%</p>
        <p>Thanh toán → Mua: {funnel?.conversionRates?.checkoutToPurchase || 0}%</p>
      </div>

      <div className="card" style={{ padding: 14, marginTop: 14 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Doanh thu (tổng tiền đơn)</h2>
        <p style={{ marginBottom: 4 }}>
          Đơn hoàn thành (status=completed):{' '}
          <strong>{(revenue?.completedOrders?.totalRevenue || 0).toLocaleString('vi-VN')} đ</strong> —{' '}
          {revenue?.completedOrders?.orderCount || 0} đơn
        </p>
        <p style={{ marginBottom: 12 }}>
          Tất cả đơn (mọi trạng thái):{' '}
          <strong>{(revenue?.allOrders?.sumTotal || 0).toLocaleString('vi-VN')} đ</strong> — {revenue?.allOrders?.orderCount || 0}{' '}
          đơn
        </p>
        <button type="button" className="btn btn-outline" onClick={() => exportOrdersCsv().catch((e) => setError(e.message))}>
          Xuất CSV đơn hàng
        </button>
        <p className="text-sm text-muted" style={{ marginTop: 8 }}>
          File CSV có thể mở bằng Excel. Bao gồm mã đơn, trạng thái, tổng tiền, email, yêu cầu hủy.
        </p>
      </div>
    </div>
  );
}
