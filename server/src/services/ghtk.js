/**
 * GHTK Open API client.
 * Docs: https://pro-docs.ghtk.vn/
 */

function getConfig() {
  return {
    enabled: process.env.GHTK_ENABLED === 'true',
    apiToken: String(process.env.GHTK_API_TOKEN || '').trim(),
    partnerCode: String(process.env.GHTK_PARTNER_CODE || '').trim(),
    apiUrl: String(process.env.GHTK_API_URL || 'https://services.giaohangtietkiem.vn').replace(/\/$/, ''),
    pickName: String(process.env.GHTK_PICK_NAME || 'TechPhone').trim(),
    pickTel: String(process.env.GHTK_PICK_TEL || '').trim(),
    pickAddress: String(process.env.GHTK_PICK_ADDRESS || '').trim(),
    pickProvince: String(process.env.GHTK_PICK_PROVINCE || '').trim(),
    pickDistrict: String(process.env.GHTK_PICK_DISTRICT || '').trim(),
    pickWard: String(process.env.GHTK_PICK_WARD || '').trim(),
  };
}

export function isGhtkConfigured() {
  const cfg = getConfig();
  return Boolean(
    cfg.enabled &&
      cfg.apiToken &&
      cfg.partnerCode &&
      cfg.pickTel &&
      cfg.pickAddress &&
      cfg.pickProvince &&
      cfg.pickDistrict,
  );
}

export function mapGhtkStatusToOrderStatus(statusId) {
  const id = Number(statusId);
  if (!Number.isFinite(id)) return null;
  if (id === -1) return 'cancelled';
  if ([1, 2].includes(id)) return 'await_pickup';
  if ([3, 12, 123].includes(id)) return 'picked';
  if ([4, 45].includes(id)) return 'shipping';
  if ([5, 6].includes(id)) return 'completed';
  if ([9, 49].includes(id)) return 'delivery_failed';
  if ([20, 21].includes(id)) return 'returned';
  return null;
}

export function ghtkStatusLabel(statusId) {
  const labels = {
    [-1]: 'Đã hủy',
    1: 'Chưa tiếp nhận',
    2: 'Đã tiếp nhận',
    3: 'Đã lấy hàng / nhập kho',
    4: 'Đang giao hàng',
    5: 'Giao thành công',
    6: 'Đã đối soát',
    9: 'Giao thất bại',
    12: 'Đang lấy hàng',
    20: 'Đang hoàn hàng',
    21: 'Đã hoàn hàng',
    45: 'Shipper báo giao thành công',
    49: 'Shipper báo giao thất bại',
    123: 'Shipper báo lấy hàng thành công',
  };
  return labels[Number(statusId)] || `GHTK #${statusId}`;
}

function ghtkHeaders(cfg) {
  return {
    Token: cfg.apiToken,
    'X-Client-Source': cfg.partnerCode,
    'Content-Type': 'application/json',
  };
}

async function ghtkRequest(path, { method = 'GET', body } = {}) {
  const cfg = getConfig();
  if (!cfg.apiToken || !cfg.partnerCode) {
    throw new Error('GHTK_NOT_CONFIGURED');
  }

  const url = `${cfg.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method,
    headers: ghtkHeaders(cfg),
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { success: false, message: text || `HTTP ${response.status}` };
  }

  if (!response.ok) {
    const message = data?.message || data?.error_message || `GHTK HTTP ${response.status}`;
    const err = new Error(message);
    err.code = data?.error_code || 'GHTK_HTTP_ERROR';
    err.logId = data?.log_id;
    throw err;
  }

  if (data && data.success === false) {
    const err = new Error(data.message || 'GHTK request failed');
    err.code = data.error_code || 'GHTK_API_ERROR';
    err.logId = data.log_id;
    throw err;
  }

  return data;
}

/** Default product weight (kg) when unknown — phones/laptops ~0.5kg each. */
const DEFAULT_ITEM_WEIGHT_KG = 0.5;

export function buildGhtkOrderPayload(order) {
  const cfg = getConfig();
  const info = order.shippingInfo || {};
  const orderId = String(order._id);

  if (!info.province?.trim() || !info.district?.trim()) {
    throw new Error('GHTK_MISSING_ADDRESS: province and district are required.');
  }

  const isPrepaid = order.paymentMethod === 'vnpay' && order.paymentStatus === 'paid';
  const pickMoney = isPrepaid ? 0 : Math.floor(Number(order.total) || 0);
  const isFreeship = isPrepaid ? 1 : order.shippingFee <= 0 ? 1 : 0;

  const products = (order.items || []).map((item) => ({
    name: String(item.name || 'San pham').slice(0, 200),
    weight: DEFAULT_ITEM_WEIGHT_KG,
    quantity: Number(item.quantity) || 1,
    product_code: String(item.product || item._id || '').slice(0, 50),
  }));

  if (products.length === 0) {
    products.push({ name: 'TechPhone order', weight: DEFAULT_ITEM_WEIGHT_KG, quantity: 1 });
  }

  const noteParts = [];
  if (isPrepaid) noteParts.push('Da thanh toan VNPAY');
  if (info.note?.trim()) noteParts.push(String(info.note).trim());
  const note = noteParts.join(' — ').slice(0, 120);

  return {
    products,
    order: {
      id: orderId,
      pick_name: cfg.pickName,
      pick_address: cfg.pickAddress,
      pick_province: cfg.pickProvince,
      pick_district: cfg.pickDistrict,
      pick_ward: cfg.pickWard || 'Khác',
      pick_tel: cfg.pickTel,
      tel: info.phone,
      name: info.fullName,
      address: info.address,
      province: info.province,
      district: info.district,
      ward: info.ward || 'Khác',
      hamlet: 'Khác',
      is_freeship: isFreeship,
      pick_money: pickMoney,
      note,
      email: info.email || 'noemail@techphone.local',
      value: Math.max(0, Math.floor(Number(order.subtotal) || Number(order.total) || 0)),
      pick_option: 'cod',
    },
  };
}

export async function submitOrder(order) {
  const payload = buildGhtkOrderPayload(order);
  const data = await ghtkRequest('/services/shipment/order?ver=1.5', {
    method: 'POST',
    body: payload,
  });
  const ghtkOrder = data?.order || {};
  return {
    labelId: ghtkOrder.label || ghtkOrder.label_id || '',
    partnerId: ghtkOrder.partner_id || String(order._id),
    fee: Number(ghtkOrder.fee) || null,
    raw: data,
  };
}

export async function cancelShipment(order) {
  const partnerId = order.shipment?.partnerId || String(order._id);
  const labelId = order.shipment?.labelId;
  const path = labelId
    ? `/services/shipment/cancel/${encodeURIComponent(labelId)}`
    : `/services/shipment/cancel/partner_id:${encodeURIComponent(partnerId)}`;
  return ghtkRequest(path, { method: 'POST' });
}

export async function getOrderStatus(order) {
  const labelId = order.shipment?.labelId;
  const partnerId = order.shipment?.partnerId || String(order._id);
  const path = labelId
    ? `/services/shipment/v2/${encodeURIComponent(labelId)}`
    : `/services/shipment/v2/partner_id:${encodeURIComponent(partnerId)}`;
  const data = await ghtkRequest(path);
  return data?.order || null;
}
