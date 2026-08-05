/**
 * =====================================================================
 * CODE TRƯỚC KHI ÁP DỤNG — Proxy (Order view cho khách)
 * =====================================================================
 * Vấn đề: API khách trả nguyên document DB, lộ dữ liệu vận hành
 * =====================================================================
 */

export async function getOrderDetailBeforePattern(OrderModel, orderId, ownershipFilter) {
  const order = await OrderModel.findOne({ _id: orderId, ...ownershipFilter }).lean();
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  // ========== TRẢ NGUYÊN OBJECT — KHÔNG QUA PROXY ==========
  return order;
  
}

export async function listOrdersBeforePattern(OrderModel, ownershipFilter) {
  const items = await OrderModel.find(ownershipFilter).sort({ createdAt: -1 }).lean();
  // Cũng trả nguyên — lộ shipment trên cả danh sách
  return { items };
}

export function renderCustomerOrderCardBeforePattern(order) {
  // Frontend nếu nhận full object có thể vô tình render field nội bộ
  return {
    id: order._id,
    status: order.status,
    total: order.total,
    shipmentDebug: order.shipment, // không nên đưa ra UI khách
    retryCount: order.shipment?.retryCount,
    submitError: order.shipment?.submitError,
  };
}
