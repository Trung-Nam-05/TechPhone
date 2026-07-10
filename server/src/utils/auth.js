import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 6;
const loginAttempts = new Map();

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, '=').replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET in environment variables.');
  }
  return secret;
}

export function signAccessToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: now, exp: now + TOKEN_TTL_SECONDS };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const unsigned = `${encodedHeader}.${encodedBody}`;

  const signature = createHmac('sha256', getJwtSecret()).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export function verifyAccessToken(token) {
  const [encodedHeader, encodedBody, signature] = String(token || '').split('.');
  if (!encodedHeader || !encodedBody || !signature) {
    throw new Error('Invalid token');
  }

  const unsigned = `${encodedHeader}.${encodedBody}`;
  const expected = createHmac('sha256', getJwtSecret()).update(unsigned).digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(base64UrlDecode(encodedBody));
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, originalHash] = String(storedHash || '').split(':');
  if (!salt || !originalHash) return false;
  const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  const hashBuffer = Buffer.from(hash);
  const originalBuffer = Buffer.from(originalHash);
  if (hashBuffer.length !== originalBuffer.length) return false;
  return timingSafeEqual(hashBuffer, originalBuffer);
}

function getAttemptState(key) {
  const now = Date.now();
  const state = loginAttempts.get(key);
  if (!state || state.expiresAt <= now) {
    return { count: 0, expiresAt: now + LOGIN_WINDOW_MS, blockedUntil: 0 };
  }
  return state;
}

export function registerLoginAttempt(key, isSuccess) {
  const now = Date.now();
  const state = getAttemptState(key);
  if (isSuccess) {
    loginAttempts.delete(key);
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const nextCount = state.count + 1;
  const blocked = nextCount >= MAX_FAILED_LOGIN_ATTEMPTS;
  const blockedUntil = blocked ? now + 5 * 60 * 1000 : 0;
  loginAttempts.set(key, {
    count: nextCount,
    expiresAt: state.expiresAt,
    blockedUntil,
  });
  return {
    blocked,
    retryAfterSeconds: blocked ? Math.ceil((blockedUntil - now) / 1000) : 0,
  };
}

export function getLoginThrottleState(key) {
  const state = getAttemptState(key);
  if (!state.blockedUntil) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  if (state.blockedUntil <= now) {
    loginAttempts.delete(key);
    return { blocked: false, retryAfterSeconds: 0 };
  }
  return {
    blocked: true,
    retryAfterSeconds: Math.ceil((state.blockedUntil - now) / 1000),
  };
}

export function toSafeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
