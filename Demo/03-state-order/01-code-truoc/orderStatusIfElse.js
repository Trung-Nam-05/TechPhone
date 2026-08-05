/**
 * =====================================================================
 * CODE TRƯỚC KHI ÁP DỤNG — State (Order lifecycle)
 * =====================================================================
 * Vấn đề: luật chuyển trạng thái rải if/else, admin gần như muốn gì cũng được
 * =====================================================================
 */

export function canCustomerCancelBeforePattern(order) {
  if (order.status === 'pending') return { ok: true, mode: 'immediate' };
  if (order.status === 'confirmed') return { ok: true, mode: 'request' };
  if (order.status === 'shipping') return { ok: true, mode: 'request' };
  if (order.status === 'completed' || order.status === 'cancelled') {
    return { ok: false, reason: 'ORDER_NOT_CANCELLABLE' };
  }
  return { ok: false, reason: 'ORDER_NOT_CANCELLABLE' };
}

/**
 * Đổi status — phiên bản chưa có State Machine
 */
export function changeOrderStatusBeforePattern(order, toStatus, actor, reason = '') {
  const fromStatus = order.status;

  if (!toStatus || fromStatus === toStatus) {
    return { ok: false, message: 'Không có thay đổi trạng thái' };
  }

  // ========== LUẬT RỜI RẠC — KHÓ BẢO TRÌ ==========
  let allowed = false;

  if (fromStatus === 'pending' && (toStatus === 'confirmed' || toStatus === 'cancelled')) {
    allowed = true;
  } else if (fromStatus === 'confirmed' && (toStatus === 'await_pickup' || toStatus === 'cancelled' || toStatus === 'shipping')) {
    allowed = true;
  } else if (fromStatus === 'await_pickup' && (toStatus === 'picked' || toStatus === 'cancelled')) {
    allowed = true;
  } else if (fromStatus === 'picked' && toStatus === 'shipping') {
    allowed = true;
  } else if (fromStatus === 'shipping' && (toStatus === 'completed' || toStatus === 'delivery_failed' || toStatus === 'returned')) {
    allowed = true;
  }

  // Admin "mở hết" — nguy hiểm, không bắt buộc lý do rõ ràng
  if (!allowed && actor === 'admin') {
    allowed = true;
  }

  // Khách tự ý nhảy status nếu biết API
  if (!allowed && actor === 'customer' && toStatus === 'completed') {
    // bug tiềm ẩn: thiếu chặn
    allowed = false;
  }
  // ===============================================

  if (!allowed) {
    return { ok: false, message: `Không thể chuyển ${fromStatus} → ${toStatus}` };
  }

  order.status = toStatus;
  order.events = order.events || [];
  order.events.push({
    fromStatus,
    toStatus,
    actor,
    reason,
    at: new Date(),
  });

  return { ok: true, order };
}

export function applyGhnUpdateBeforePattern(order, ghnStatus) {
  // Map GHN trộn luôn vào đổi status — chưa tách Adapter + State
  let next = order.status;
  if (ghnStatus === 'delivering') next = 'shipping';
  if (ghnStatus === 'delivered') next = 'completed';
  return changeOrderStatusBeforePattern(order, next, 'system');
}
