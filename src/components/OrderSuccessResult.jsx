import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { OrderStatusBadge, PaymentStatusBadge } from './OrderStatusBadge';

/**
 * Màn hình kết quả đặt hàng / thanh toán — dùng chung cho COD và VNPAY.
 */
export default function OrderSuccessResult({
  success = true,
  orderId = '',
  order = null,
  title,
  subtitle,
  loadError = null,
  message = '',
}) {
  const heading = title || (success ? 'Thanh toán thành công' : 'Thanh toán chưa hoàn tất');
  const detailHref = orderId ? `/account/orders/${orderId}` : '/account/orders';

  return (
    <div className="container" style={{ maxWidth: 560, padding: '40px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        {success ? <CheckCircle2 size={64} color="#16a34a" /> : <XCircle size={64} color="#dc2626" />}
      </div>
      <h1 style={{ fontSize: 26, marginBottom: 12, textAlign: 'center' }}>{heading}</h1>
      {orderId && (
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: 8 }}>
          Mã đơn hàng: <strong>{orderId}</strong>
        </p>
      )}
      {order && (
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          <p style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>Trạng thái đơn:</span>
            <OrderStatusBadge status={order.status} />
          </p>
          <p style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>Thanh toán:</span>
            <PaymentStatusBadge status={order.paymentStatus} />
          </p>
          <p style={{ margin: '4px 0' }}>
            Tổng tiền: <strong>{Number(order.total || 0).toLocaleString('vi-VN')} đ</strong>
          </p>
          {order.shipment?.labelId && (
            <p style={{ margin: '4px 0' }} className="text-muted">
              Mã vận đơn GHN: <strong>{order.shipment.labelId}</strong>
            </p>
          )}
        </div>
      )}
      {loadError && (
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: 8, fontSize: 13 }}>
          Không tải được chi tiết đơn ({loadError}).
        </p>
      )}
      {!success && message && (
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: 16 }}>
          {message}
        </p>
      )}
      {success && (
        <p style={{ textAlign: 'center', marginBottom: 24 }}>
          {subtitle ||
            'Đơn hàng đã được xác nhận tự động. Vận đơn GHN (DEV) sẽ được tạo trong giây lát.'}
        </p>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        {success && (
          <Link className="btn btn-primary" to={detailHref}>
            Xem đơn hàng của tôi
          </Link>
        )}
        <Link className="btn btn-outline" to={success ? '/products' : '/'}>
          {success ? 'Tiếp tục mua sắm' : 'Về trang chủ'}
        </Link>
      </div>
    </div>
  );
}
