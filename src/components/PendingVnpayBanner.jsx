import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { isPendingVnpayOrder } from '../utils/vnpayOrder';

function shortOrderId(id) {
  if (!id) return '';
  return String(id).slice(-8).toUpperCase();
}

export default function PendingVnpayBanner({ orders = [], className = '' }) {
  const pendingOrders = (orders || []).filter(isPendingVnpayOrder);
  if (pendingOrders.length === 0) return null;

  const primary = pendingOrders[0];

  return (
    <div
      className={`tp-pending-vnpay-banner ${className}`.trim()}
      role="status"
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 14px',
        marginBottom: 16,
        borderRadius: 8,
        background: '#fffbeb',
        border: '1px solid #fcd34d',
        color: '#92400e',
        fontSize: 14,
      }}
    >
      <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
      <div>
        <strong>
          {pendingOrders.length === 1
            ? `Bạn có 1 đơn chờ thanh toán VNPAY (#${shortOrderId(primary._id)})`
            : `Bạn có ${pendingOrders.length} đơn chờ thanh toán VNPAY`}
        </strong>
        <p style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
          Hoàn tất thanh toán hoặc hủy đơn để tránh giữ kho sản phẩm.{' '}
          <Link to={`/account/orders/${primary._id}`} style={{ color: '#b45309', fontWeight: 600 }}>
            Xem đơn →
          </Link>
        </p>
      </div>
    </div>
  );
}
