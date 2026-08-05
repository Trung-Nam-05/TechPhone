/**
 * =====================================================================
 * CODE TRƯỚC KHI ÁP DỤNG — Adapter (GHN)
 * =====================================================================
 * Vấn đề: mã GHN map thẳng vào order.status, copy ở nhiều chỗ
 * =====================================================================
 */

export function syncFromWebhookBeforePattern(order, payload) {
  const ghnStatus = String(payload?.status || payload?.Status || '').toLowerCase();

  // Copy 1: trong webhook
  if (ghnStatus === 'ready_to_pick' || ghnStatus === 'picking') {
    order.status = 'await_pickup';
  } else if (ghnStatus === 'picked' || ghnStatus === 'storing') {
    order.status = 'picked';
  } else if (ghnStatus === 'transporting' || ghnStatus === 'delivering') {
    order.status = 'shipping';
  } else if (ghnStatus === 'delivered') {
    order.status = 'completed';
  } else if (ghnStatus === 'delivery_fail') {
    order.status = 'delivery_failed';
  } else if (['waiting_to_return', 'return', 'returned', 'return_transporting'].includes(ghnStatus)) {
    order.status = 'returned';
  } else if (['cancel', 'cancelled', 'canceled'].includes(ghnStatus)) {
    order.status = 'cancelled';
  }

  order.shipment = order.shipment || {};
  order.shipment.carrierStatus = ghnStatus;
  order.shipment.lastWebhookAt = new Date();
  order.shipment.rawPayload = payload;
  return order;
}

export function syncFromPollingBeforePattern(order, apiResponse) {
  const ghnStatus = String(apiResponse?.data?.status || '').toLowerCase();

  // Copy 2: trong polling — gần giống webhook nhưng dễ lệch
  if (ghnStatus === 'delivering' || ghnStatus === 'transporting') {
    order.status = 'shipping';
  } else if (ghnStatus === 'delivered') {
    order.status = 'completed';
  } else if (ghnStatus === 'ready_to_pick') {
    order.status = 'await_pickup';
  } else if (ghnStatus === 'picked') {
    order.status = 'picked';
  } else if (ghnStatus === 'delivery_fail') {
    order.status = 'delivery_failed';
  }

  order.shipment = order.shipment || {};
  order.shipment.carrierStatus = ghnStatus;
  order.shipment.labelId = apiResponse?.data?.order_code || order.shipment.labelId;
  return order;
}

export function retryFulfillmentBeforePattern(order, createResult) {
  // Copy 3: chỗ retry cũng tự map
  const ghnStatus = String(createResult?.status || 'ready_to_pick').toLowerCase();
  if (ghnStatus === 'ready_to_pick') order.status = 'await_pickup';
  order.shipment = {
    ...(order.shipment || {}),
    provider: 'ghn',
    labelId: createResult?.order_code,
    carrierStatus: ghnStatus,
    retryCount: (order.shipment?.retryCount || 0) + 1,
  };
  return order;
}
