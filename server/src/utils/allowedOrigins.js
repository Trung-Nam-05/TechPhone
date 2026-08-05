export function normalizeOrigin(value) {
  if (!value) return null;
  const trimmed = String(value).trim().replace(/\/$/, '');
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

/** Origins trusted for CORS / CSRF (Render injects RENDER_EXTERNAL_URL). */
export function getAllowedOrigins() {
  const origins = new Set();
  for (const value of [
    process.env.CLIENT_ORIGIN,
    process.env.API_PUBLIC_URL,
    process.env.SOCKET_CORS_ORIGIN,
    process.env.RENDER_EXTERNAL_URL,
  ]) {
    const normalized = normalizeOrigin(value);
    if (normalized) origins.add(normalized);
  }
  if (origins.size === 0) {
    origins.add('http://localhost:5173');
  }
  return origins;
}

export function getPrimaryClientOrigin() {
  return (
    normalizeOrigin(process.env.CLIENT_ORIGIN)
    || normalizeOrigin(process.env.RENDER_EXTERNAL_URL)
    || normalizeOrigin(process.env.API_PUBLIC_URL)
    || 'http://localhost:5173'
  );
}

export function isAllowedOrigin(originOrReferer) {
  const origin = normalizeOrigin(originOrReferer);
  if (!origin) return false;
  if (getAllowedOrigins().has(origin)) return true;
  const allowLocalhost = process.env.ALLOW_LOCALHOST_ORIGINS !== 'false';
  if (allowLocalhost && /^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

export function createCorsOriginCallback() {
  const allowed = getAllowedOrigins();
  const allowLocalhost = process.env.ALLOW_LOCALHOST_ORIGINS !== 'false';

  return (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = normalizeOrigin(origin);
    if (normalized && allowed.has(normalized)) return callback(null, true);
    if (allowLocalhost && /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  };
}
