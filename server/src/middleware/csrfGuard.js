import { isAllowedOrigin } from '../utils/allowedOrigins.js';
import { MSG } from '../utils/userMessages.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const CSRF_EXEMPT_PREFIXES = [
  '/api/payments/vnpay',
  '/api/webhooks/installment',
  '/api/health',
];

function isExempt(pathname) {
  return CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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
    return res.status(403).json({ message: MSG.CSRF_HEADER });
  }

  const origin = req.get('origin');
  const referer = req.get('referer');
  const originOk = isAllowedOrigin(origin) || isAllowedOrigin(referer);

  if (!originOk) {
    return res.status(403).json({ message: MSG.CSRF_ORIGIN });
  }

  return next();
}
