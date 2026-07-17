import { useEffect, useState } from 'react';
import { Clock, Download, DollarSign, ShoppingCart, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { getOrderStatusLabel } from '../constants/orderLabels';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import AdminKpiCard from '../components/admin/AdminKpiCard';
import SalesLineChart from '../components/admin/SalesLineChart';
import TopProductsBarChart from '../components/admin/TopProductsBarChart';
import './AdminAnalytics.css';

const PAYMENT_METHOD_LABELS = {
  cod: 'COD',
  vnpay: 'VNPAY',
  installment: 'Trả góp',
};

const STATUS_ORDER = ['pending', 'confirmed', 'await_pickup', 'picked', 'shipping', 'completed', 'cancelled'];

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function formatMoneyCompact(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} tr đ`;
  return formatMoney(n);
}

function formatMoneyAxis(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fillRevenueDays(rawDays, totalDays = 15) {
  const map = Object.fromEntries((rawDays || []).map((d) => [d.date, d]));
  const result = [];
  for (let i = totalDays - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    result.push(map[key] || { date: key, orders: 0, revenue: 0 });
  }
  return result;
}

export default function AdminAnalytics() {
  const { authFetch, token } = useAuth();
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setRefreshing(true);
      setError(null);
      try {
        const payload = await authFetch('/api/analytics/dashboard');
        if (!mounted) return;
        setData(payload);
      } catch (err) {
        if (!mounted) return;
        setError(err.message);
      } finally {
        if (mounted) setRefreshing(false);
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

  const isLoading = refreshing && !data;

  const summary = data?.summary || {};
  const ordersByStatus = data?.ordersByStatus || {};
  const maxStatusCount = Math.max(1, ...Object.values(ordersByStatus));
  const funnel = data?.funnel;
  const pendingTotal = (summary.pendingCancelRequests || 0) + (summary.openSupportCases || 0);
  const revenueDays = fillRevenueDays(data?.revenueByDay, 15);

  return (
    <div className={`admin-page admin-analytics-page${refreshing ? ' is-refreshing' : ''}`}>
      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <AdminPageHeader
        title="Dashboard"
        subtitle="Tổng quan kinh doanh TechPhone"
        actions={
          <button type="button" className="btn btn-outline" onClick={() => exportOrdersCsv().catch((e) => setError(e.message))}>
            <Download size={16} />
            Xuất CSV
          </button>
        }
      />

      <div className="admin-analytics-kpi-row">
        <AdminKpiCard
          label="Tổng khách hàng"
          value={summary.totalCustomers || 0}
          loading={isLoading}
          hint={
            <span className="admin-kpi-trend up">
              <TrendingUp size={14} /> {summary.activeProducts || 0} sản phẩm đang bán
            </span>
          }
          icon={Users}
          tone="purple"
        />
        <AdminKpiCard
          label="Tổng đơn hàng"
          value={summary.totalOrders || 0}
          loading={isLoading}
          hint={
            <span className="admin-kpi-trend up">
              <TrendingUp size={14} /> {summary.ordersToday || 0} đơn hôm nay
            </span>
          }
          icon={ShoppingCart}
          tone="orange"
        />
        <AdminKpiCard
          label="Doanh thu hoàn tất"
          value={formatMoneyCompact(summary.totalRevenue)}
          loading={isLoading}
          hint={
            <span className="admin-kpi-trend up">
              <TrendingUp size={14} /> TB {formatMoneyCompact(summary.averageOrderValue)}/đơn
            </span>
          }
          icon={DollarSign}
          tone="green"
          highlight
        />
        <AdminKpiCard
          label="Cần xử lý"
          value={pendingTotal}
          loading={isLoading}
          hint={
            <span className={`admin-kpi-trend ${pendingTotal > 0 ? 'down' : 'up'}`}>
              {pendingTotal > 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              {summary.pendingCancelRequests || 0} hủy · {summary.openSupportCases || 0} hỗ trợ
            </span>
          }
          icon={Clock}
          tone="red"
        />
      </div>

      <section className="admin-analytics-section admin-analytics-section-wide">
        <div className="admin-analytics-section-head">
          <h2>Chi tiết doanh thu</h2>
          <span className="admin-analytics-badge">15 ngày qua</span>
        </div>
        <div className={`admin-chart-shell${isLoading ? ' is-loading' : ''}`}>
          <SalesLineChart
            data={revenueDays}
            formatMoney={formatMoneyAxis}
            formatShortDate={formatShortDate}
          />
        </div>
      </section>

      <div className="admin-analytics-two-col">
        <section className="admin-analytics-section">
          <div className="admin-analytics-section-head">
            <h2>Sản phẩm bán chạy</h2>
          </div>
          <TopProductsBarChart products={data?.topProducts || []} formatMoney={formatMoneyCompact} loading={isLoading} />
        </section>

        <section className="admin-analytics-section">
          <div className="admin-analytics-section-head">
            <h2>Đơn theo trạng thái</h2>
          </div>
          <div className="admin-analytics-status-list">
            {isLoading && <p className="admin-chart-empty">Đang cập nhật...</p>}
            {!isLoading && STATUS_ORDER.filter((s) => ordersByStatus[s]).map((status) => (
              <div key={status} className="admin-analytics-bar-row">
                <span className="admin-analytics-bar-label">{getOrderStatusLabel(status)}</span>
                <div className="admin-analytics-bar-track">
                  <div
                    className="admin-analytics-bar-fill"
                    style={{ width: `${(ordersByStatus[status] / maxStatusCount) * 100}%` }}
                  />
                </div>
                <span className="admin-analytics-bar-value">{ordersByStatus[status]}</span>
              </div>
            ))}
            {!isLoading && Object.keys(ordersByStatus).length === 0 && <p className="admin-chart-empty">Chưa có đơn hàng.</p>}
          </div>

          <div className="admin-analytics-section-head admin-analytics-subhead">
            <h3>Phương thức thanh toán</h3>
          </div>
          <div className="admin-analytics-payment-grid">
            {(data?.paymentMethods || []).map((row) => (
              <div key={row.method} className="admin-analytics-payment-item">
                <span>{PAYMENT_METHOD_LABELS[row.method] || row.method}</span>
                <strong>{row.count} đơn</strong>
                <small>{formatMoneyCompact(row.total)}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-analytics-section admin-analytics-section-wide">
        <div className="admin-analytics-section-head">
          <h2>Đơn hàng gần đây</h2>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Khách hàng</th>
                <th>Địa chỉ</th>
                <th>Thời gian</th>
                <th className="admin-table-num">SL</th>
                <th className="admin-table-num">Số tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentOrders || []).map((order) => (
                <tr key={order.id}>
                  <td>
                    <span className="admin-table-product" title={order.productName}>
                      {order.productName}
                    </span>
                  </td>
                  <td>
                    <span className="admin-table-ellipsis" title={order.customerName}>
                      {order.customerName}
                    </span>
                  </td>
                  <td>
                    <span className="admin-table-ellipsis" title={order.address}>
                      {order.address}
                    </span>
                  </td>
                  <td className="admin-table-nowrap">{formatDateTime(order.createdAt)}</td>
                  <td className="admin-table-num">{order.pieceCount}</td>
                  <td className="admin-table-num admin-table-money">{formatMoney(order.total)}</td>
                  <td>
                    <OrderStatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
              {(data?.recentOrders || []).length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="admin-table-empty">
                    Chưa có đơn hàng.
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={7} className="admin-table-empty">Đang tải dữ liệu...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-analytics-section admin-analytics-section-wide">
        <div className="admin-analytics-section-head">
          <h2>Phễu chuyển đổi</h2>
        </div>
        <div className="admin-funnel-grid">
          <div className="admin-funnel-step">
            <span>Xem sản phẩm</span>
            <strong>{funnel?.steps?.viewProduct || 0}</strong>
          </div>
          <div className="admin-funnel-step">
            <span>Thêm giỏ hàng</span>
            <strong>{funnel?.steps?.addToCart || 0}</strong>
          </div>
          <div className="admin-funnel-step">
            <span>Bắt đầu thanh toán</span>
            <strong>{funnel?.steps?.beginCheckout || 0}</strong>
          </div>
          <div className="admin-funnel-step">
            <span>Hoàn tất mua</span>
            <strong>{funnel?.steps?.purchase || 0}</strong>
          </div>
        </div>
        <div className="admin-funnel-rates">
          <span>Xem → Giỏ: <strong>{funnel?.conversionRates?.viewToCart || 0}%</strong></span>
          <span>Giỏ → TT: <strong>{funnel?.conversionRates?.cartToCheckout || 0}%</strong></span>
          <span>TT → Mua: <strong>{funnel?.conversionRates?.checkoutToPurchase || 0}%</strong></span>
        </div>
      </section>
    </div>
  );
}
