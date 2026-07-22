const INVOICE_NOTE_MARKER = 'Xuất hoá đơn điện tử';

export function orderRequestedInvoice(order) {
  if (!order) return false;
  if (order.invoiceRequested === true) return true;
  const note = order.shippingInfo?.note || '';
  return note.includes(INVOICE_NOTE_MARKER);
}

export function formatInvoiceNumber(orderId) {
  if (!orderId) return '—';
  const raw = String(orderId).replace(/[^a-fA-F0-9]/g, '').slice(-8).toUpperCase();
  return `HD-${raw || '00000000'}`;
}

export function formatInvoiceDate(order) {
  const d = order?.createdAt ? new Date(order.createdAt) : new Date();
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
