const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const CSRF_EXEMPT_PREFIXES = [
  '/api/payments/vnpay',
  '/api/webhooks/installment',
  '/api/health',
];

function isExempt(pathname) {
  return CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function normalizeOrigin(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isAllowedClientOrigin(originOrReferer) {
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const allowLocalhost = process.env.ALLOW_LOCALHOST_ORIGINS !== 'false';
  const origin = normalizeOrigin(originOrReferer);
  if (!origin) return false;
  if (origin === normalizeOrigin(clientOrigin)) return true;
  if (allowLocalhost && /^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

/**
 * Lightweight CSRF / origin guard for SPA + Bearer JWT.
 * Webhook routes are excluded.
 */
export function csrfGuard(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const pathname = req.path || req.originalUrl?.split('?')[0] || '';
  if (isExempt(pathname)) {
    return next();
  }

  const requestedWith = String(req.get('x-requested-with') || '').trim();
  if (requestedWith !== 'TechPhone') {
    return res.status(403).json({ message: 'Missing or invalid X-Requested-With header.' });
  }

  const origin = req.get('origin');
  const referer = req.get('referer');
  const originOk = isAllowedClientOrigin(origin) || isAllowedClientOrigin(referer);

  if (!originOk) {
    return res.status(403).json({ message: 'Origin not allowed.' });
  }

  return next();
}
