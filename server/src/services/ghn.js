/**
 * GHN Open API client — DEV only by default.
 * Docs: https://api.ghn.vn/
 */

const DEV_API_V2 = 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2';
const DEV_API_MASTER = 'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data';

function getConfig() {
  const raw = String(process.env.GHN_API_URL || 'https://dev-online-gateway.ghn.vn').replace(/\/$/, '');
  const root = raw.includes('/shiip/') ? raw.split('/shiip/')[0] : raw;
  return {
    enabled: process.env.GHN_ENABLED === 'true',
    apiToken: String(process.env.GHN_API_TOKEN || '').trim(),
    shopId: Number(process.env.GHN_SHOP_ID || 0),
    apiV2: `${root}/shiip/public-api/v2`,
    apiMaster: `${root}/shiip/public-api/master-data`,
    returnPhone: String(process.env.GHN_RETURN_PHONE || '').trim(),
    returnAddress: String(process.env.GHN_RETURN_ADDRESS || '').trim(),
  };
}

export function isGhnDevApi() {
  const url = String(process.env.GHN_API_URL || 'https://dev-online-gateway.ghn.vn');
  return url.includes('dev-online-gateway.ghn.vn');
}

export function isGhnProductionApi() {
  const url = String(process.env.GHN_API_URL || 'https://dev-online-gateway.ghn.vn');
  return url.includes('online-gateway.ghn.vn') && !isGhnDevApi();
}

export function isGhnConfigured() {
  if (process.env.GHN_ENABLED !== 'true') return false;
  const cfg = getConfig();
  return Boolean(cfg.apiToken && cfg.shopId > 0);
}

export function mapGhnStatusToOrderStatus(ghnStatus) {
  const s = String(ghnStatus || '').toLowerCase().trim();
  if (!s) return null;
  if (['cancel', 'cancelled', 'canceled'].includes(s)) return 'cancelled';
  if (['ready_to_pick', 'picking'].includes(s)) return 'await_pickup';
  if (['picked', 'storing'].includes(s)) return 'picked';
  if (['transporting', 'delivering'].includes(s)) return 'shipping';
  if (['delivered'].includes(s)) return 'completed';
  if (['delivery_fail'].includes(s)) return 'delivery_failed';
  if (['waiting_to_return', 'return', 'returned', 'return_transporting'].includes(s)) return 'returned';
  return null;
}

export function ghnStatusLabel(status) {
  const labels = {
    ready_to_pick: 'Sẵn sàng lấy hàng',
    picking: 'Đang lấy hàng',
    picked: 'Đã lấy hàng',
    storing: 'Đang nhập kho',
    transporting: 'Đang vận chuyển',
    delivering: 'Đang giao hàng',
    delivered: 'Giao thành công',
    delivery_fail: 'Giao thất bại',
    waiting_to_return: 'Chờ hoàn hàng',
    return: 'Đang hoàn hàng',
    returned: 'Đã hoàn hàng',
    cancel: 'Đã hủy',
    cancelled: 'Đã hủy',
  };
  return labels[String(status || '').toLowerCase()] || String(status || 'GHN');
}

async function ghnRequest(path, { method = 'GET', body, shopId, base = 'v2' } = {}) {
  const cfg = getConfig();
  if (!cfg.apiToken || !cfg.shopId) {
    throw new Error('GHN_NOT_CONFIGURED');
  }
  if (isGhnProductionApi() && process.env.GHN_ALLOW_PRODUCTION !== 'true') {
    throw new Error(
      'GHN_PRODUCTION_BLOCKED: Chi cho phep https://dev-online-gateway.ghn.vn khi dev.',
    );
  }

  const apiRoot = base === 'master' ? cfg.apiMaster : cfg.apiV2;
  const url = `${apiRoot}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (base === 'master') {
    headers.token = cfg.apiToken;
  } else {
    headers.Token = cfg.apiToken;
  }
  const sid = shopId || cfg.shopId;
  if (sid && base !== 'master') headers.ShopId = String(sid);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { code: response.status, message: text || `HTTP ${response.status}` };
  }

  if (!response.ok || (data && data.code && data.code !== 200)) {
    let message = data?.message || data?.code_message || `GHN HTTP ${response.status}`;
    const lower = String(message).toLowerCase();
    if (lower.includes('shop') || lower.includes('cửa hàng') || lower.includes('thông tin shop')) {
      message =
        `GHN_SHOP_ERROR: Shop ID ${cfg.shopId} khong thuoc token nay hoac chua co dia chi. Chay: npm run ghn:shops`;
    } else if (lower.includes('token is not valid')) {
      message =
        'GHN_TOKEN_ERROR: Token khong hop le hoac khong khop Shop ID. Lay lai tai 5sao.ghn.dev → Chu cua hang (khong phai sso.ghn.dev).';
    }
    const err = new Error(message);
    err.code = data?.code_message || String(data?.code || 'GHN_API_ERROR');
    throw err;
  }

  return data;
}

export async function fetchProvinces() {
  const data = await ghnRequest('/province', { method: 'GET', base: 'master' });
  return data?.data || [];
}

export async function fetchDistricts(provinceId) {
  const data = await ghnRequest('/district', {
    method: 'POST',
    base: 'master',
    body: { province_id: Number(provinceId) },
  });
  return data?.data || [];
}

export async function fetchWards(districtId) {
  const data = await ghnRequest('/ward', {
    method: 'POST',
    base: 'master',
    body: { district_id: Number(districtId) },
  });
  return data?.data || [];
}

export async function buildGhnOrderPayload(order, addressIds) {
  const info = order.shippingInfo || {};
  const isPrepaid = order.paymentMethod === 'vnpay' && order.paymentStatus === 'paid';
  const codAmount = isPrepaid ? 0 : Math.floor(Number(order.total) || 0);
  const weightGram = Math.max(
    200,
    (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1) * 500, 200),
  );

  const items = (order.items || []).map((item) => ({
    name: String(item.name || 'San pham').slice(0, 200),
    quantity: Number(item.quantity) || 1,
    weight: Math.max(200, Math.floor(weightGram / Math.max(1, order.items?.length || 1))),
  }));
  if (items.length === 0) {
    items.push({ name: 'TechPhone order', quantity: 1, weight: 500 });
  }

  const cfg = getConfig();
  const noteParts = [];
  if (isPrepaid) noteParts.push('Da thanh toan VNPAY');
  if (info.note?.trim()) noteParts.push(String(info.note).trim());

  return {
    payment_type_id: 2,
    required_note: 'KHONGCHOXEMHANG',
    to_name: info.fullName,
    to_phone: info.phone,
    to_address: info.address,
    to_ward_code: addressIds.wardCode,
    to_district_id: addressIds.districtId,
    cod_amount: codAmount,
    content: items.map((i) => i.name).join(', ').slice(0, 200) || 'TechPhone',
    weight: weightGram,
    length: 20,
    width: 15,
    height: 10,
    service_type_id: 2,
    client_order_code: String(order._id),
    note: noteParts.join(' — ').slice(0, 500),
    return_phone: cfg.returnPhone || info.phone,
    return_address: cfg.returnAddress || info.address,
    items,
  };
}

export async function submitOrder(order, addressIds) {
  const payload = await buildGhnOrderPayload(order, addressIds);
  const data = await ghnRequest('/shipping-order/create', { method: 'POST', body: payload });
  const detail = data?.data || {};
  return {
    orderCode: detail.order_code || '',
    sortCode: detail.sort_code || '',
    totalFee: Number(detail.total_fee) || null,
    raw: data,
  };
}

export async function cancelShipment(order) {
  const orderCode = order.shipment?.labelId;
  if (!orderCode) throw new Error('GHN_NO_ORDER_CODE');
  return ghnRequest('/switch-status/cancel', {
    method: 'POST',
    body: { order_codes: [orderCode] },
  });
}

export async function getOrderDetail(orderCode) {
  const data = await ghnRequest('/shipping-order/detail', {
    method: 'POST',
    body: { order_code: orderCode },
  });
  const detail = data?.data;
  return Array.isArray(detail) ? detail[0] : detail;
}
