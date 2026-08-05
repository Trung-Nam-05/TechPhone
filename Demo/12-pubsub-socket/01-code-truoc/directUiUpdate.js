/**
 * =====================================================================
 * CODE TRƯỚC KHI ÁP DỤNG — Pub-Sub (Socket.io)
 * =====================================================================
 * Vấn đề: sender gọi thẳng UI receiver — không scale nhiều client/browser
 * =====================================================================
 */

let adminInboxUi = null;
let customerChatUi = null;

export function registerAdminUiBeforePattern(ui) {
  adminInboxUi = ui;
}

export function registerCustomerUiBeforePattern(ui) {
  customerChatUi = ui;
}

export function customerSendMessageBeforePattern(message) {
  // Gắn cứng: chỉ cập nhật được nếu cùng process
  if (adminInboxUi && typeof adminInboxUi.appendMessage === 'function') {
    adminInboxUi.appendMessage({
      ...message,
      senderRole: 'customer',
      createdAt: new Date(),
    });
  } else {
    console.warn('Admin UI chưa register — tin nhắn "mất"');
  }

  // Không có room, không có nhiều tab admin cùng nhận
  return { deliveredToAdminUi: Boolean(adminInboxUi) };
}

export function adminSendMessageBeforePattern(message) {
  if (customerChatUi && typeof customerChatUi.appendMessage === 'function') {
    customerChatUi.appendMessage({
      ...message,
      senderRole: 'admin',
      createdAt: new Date(),
    });
  } else {
    console.warn('Customer UI chưa register — tin nhắn "mất"');
  }
  return { deliveredToCustomerUi: Boolean(customerChatUi) };
}

/** Thử “broadcast” kiểu cũ — vẫn không phải Pub-Sub thật */
export function notifyAllBeforePattern(message) {
  const targets = [adminInboxUi, customerChatUi].filter(Boolean);
  targets.forEach((ui) => ui.appendMessage?.(message));
  return { count: targets.length };
}
