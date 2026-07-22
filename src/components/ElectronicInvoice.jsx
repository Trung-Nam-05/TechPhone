import { Printer } from 'lucide-react';
import { getPaymentMethodLabel } from '../constants/orderLabels';
import { formatInvoiceDate, formatInvoiceNumber } from '../utils/orderInvoice';
import './ElectronicInvoice.css';

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

export default function ElectronicInvoice({ order }) {
  if (!order) return null;

  const invoiceNo = formatInvoiceNumber(order._id);
  const buyer = order.shippingInfo || {};
  const items = order.items || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="e-invoice" aria-label="Hóa đơn điện tử">
      <div className="e-invoice-header">
        <div>
          <p className="e-invoice-brand">TechPhone</p>
          <p className="e-invoice-sub">Hóa đơn bán hàng điện tử</p>
        </div>
        <div className="e-invoice-meta">
          <div>
            Số HĐ: <strong>{invoiceNo}</strong>
          </div>
          <div>Ngày: {formatInvoiceDate(order)}</div>
          <div>
            Mã đơn: <strong>{String(order._id || '').slice(-8).toUpperCase()}</strong>
          </div>
        </div>
      </div>

      <div className="e-invoice-body">
        <p className="e-invoice-section-title">Người mua</p>
        <div className="e-invoice-buyer">
          <div>
            <strong>{buyer.fullName}</strong>
          </div>
          <div>ĐT: {buyer.phone}</div>
          {buyer.email && <div>Email: {buyer.email}</div>}
          <div>
            {[buyer.address, buyer.ward, buyer.district, buyer.province].filter(Boolean).join(', ')}
          </div>
        </div>

        <p className="e-invoice-section-title">Chi tiết hàng hóa</p>
        <table className="e-invoice-table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th className="num">SL</th>
              <th className="num">Đơn giá</th>
              <th className="num">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.product}-${index}`}>
                <td>{item.name}</td>
                <td className="num">{item.quantity}</td>
                <td className="num">{formatMoney(item.price)}</td>
                <td className="num">{formatMoney(item.lineTotal ?? item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="e-invoice-totals">
          <div className="e-invoice-totals-row">
            <span>Tạm tính</span>
            <span>{formatMoney(order.subtotal)}</span>
          </div>
          {Number(order.couponDiscountTotal) > 0 && (
            <div className="e-invoice-totals-row">
              <span>Giảm giá</span>
              <span>-{formatMoney(order.couponDiscountTotal)}</span>
            </div>
          )}
          <div className="e-invoice-totals-row">
            <span>Phí vận chuyển</span>
            <span>{formatMoney(order.shippingFee)}</span>
          </div>
          <div className="e-invoice-totals-row grand">
            <span>Tổng cộng</span>
            <span>{formatMoney(order.total)}</span>
          </div>
          <div className="e-invoice-totals-row">
            <span>Thanh toán</span>
            <span>{getPaymentMethodLabel(order.paymentMethod)}</span>
          </div>
        </div>
      </div>

      <div className="e-invoice-footer">
        Hóa đơn điện tử được phát hành tự động sau khi đặt hàng thành công. Đây là bản sao điện tử phục vụ
        tra cứu; hóa đơn GTGT (nếu có) sẽ được shop xử lý theo quy định.
      </div>

      <div className="e-invoice-actions">
        <button type="button" className="btn btn-outline" onClick={handlePrint}>
          <Printer size={16} aria-hidden style={{ verticalAlign: 'middle', marginRight: 6 }} />
          In / Lưu PDF
        </button>
      </div>
    </section>
  );
}
