import crypto from 'crypto';

/**
 * VNPAY Payment Gateway (sandbox / production).
 * Docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 *
 * Signature must be computed on the same URL-encoded query string sent to VNPAY
 * (URLSearchParams), not on raw key=value pairs.
 */

function getConfig() {
  const tmnCode = String(process.env.VNPAY_TMN_CODE || '').trim();
  const hashSecret = String(process.env.VNPAY_HASH_SECRET || '').trim();
  const paymentUrl = String(
    process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  ).trim();
  const apiPublic = String(process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`).replace(
    /\/$/,
    '',
  );
  return { tmnCode, hashSecret, paymentUrl, apiPublic };
}

export function isVnpayConfigured() {
  const { tmnCode, hashSecret } = getConfig();
  return Boolean(tmnCode && hashSecret);
}

function buildVnpaySearchParams(params) {
  const searchParams = new URLSearchParams();
  const sortedKeys = Object.keys(params)
    .filter((key) => {
      const value = params[key];
      return value !== undefined && value !== null && String(value) !== '';
    })
    .sort();

  for (const key of sortedKeys) {
    searchParams.append(key, String(params[key]));
  }
  return searchParams;
}

export function buildVnpaySignData(params) {
  return buildVnpaySearchParams(params).toString();
}

export function signVnpay(signData, hashSecret) {
  return crypto.createHmac('sha512', hashSecret).update(Buffer.from(signData, 'utf-8')).digest('hex');
}

export function verifyVnpayCallback(query) {
  const { hashSecret } = getConfig();
  if (!hashSecret) return { ok: false, reason: 'not_configured' };
  const secureHash = query.vnp_SecureHash;
  if (!secureHash) return { ok: false, reason: 'missing_hash' };

  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const signData = buildVnpaySignData(params);
  const expected = signVnpay(signData, hashSecret);
  if (expected !== secureHash) return { ok: false, reason: 'bad_signature' };
  return { ok: true };
}

/** yyyyMMddHHmmss in Asia/Ho_Chi_Minh */
function vnpCreateDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t)?.value ?? '';
  return `${g('year')}${g('month')}${g('day')}${g('hour')}${g('minute')}${g('second')}`;
}

function normalizeIpAddr(raw) {
  const ip = String(raw || '127.0.0.1').trim();
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.slice('::ffff:'.length);
  return ip.slice(0, 45);
}

function isLocalApiUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(String(url || ''));
}

/**
 * @param {object} opts
 * @param {number} opts.amountVnd - order total in VND (integer)
 * @param {string} opts.orderId - unique ref (Mongo _id string)
 * @param {string} opts.orderInfo - ASCII preferred
 * @param {string} opts.ipAddr
 */
export function buildVnpayPaymentUrl({ amountVnd, orderId, orderInfo, ipAddr }) {
  const { tmnCode, hashSecret, paymentUrl, apiPublic } = getConfig();
  if (!tmnCode || !hashSecret) {
    throw new Error('VNPAY_NOT_CONFIGURED');
  }

  const returnUrl = `${apiPublic}/api/payments/vnpay/return`;
  const safeInfo = String(orderInfo || 'Thanh toan don hang TechPhone')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s\-_.:]/g, ' ')
    .trim()
    .slice(0, 240);

  const amount = Math.max(0, Math.floor(Number(amountVnd) || 0));
  const vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: String(orderId),
    vnp_OrderInfo: safeInfo || `Order ${orderId}`,
    vnp_OrderType: 'other',
    vnp_Amount: String(amount * 100),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: normalizeIpAddr(ipAddr),
    vnp_CreateDate: vnpCreateDate(),
  };

  // IPN only when API has a public HTTPS URL (optional param — omit for localhost).
  if (!isLocalApiUrl(apiPublic) && apiPublic.startsWith('https://')) {
    vnp_Params.vnp_IpnUrl = `${apiPublic}/api/payments/vnpay/ipn`;
  }

  const signData = buildVnpaySignData(vnp_Params);
  const vnp_SecureHash = signVnpay(signData, hashSecret);

  return `${paymentUrl}?${signData}&vnp_SecureHash=${vnp_SecureHash}`;
}
