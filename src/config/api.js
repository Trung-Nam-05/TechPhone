export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const SESSION_STORAGE_KEY = 'techphone-session-id';
const AUTH_STORAGE_KEY = 'techphone-auth';
const IDEMPOTENCY_STORAGE_KEY = 'techphone-idempotency-order';

export function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('x-session-id', getSessionId());
  try {
    const authState = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
    if (authState?.token) {
      headers.set('Authorization', `Bearer ${authState.token}`);
    }
  } catch {
    // Ignore malformed auth state and continue as guest.
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getOrderIdempotencyKey() {
  let key = localStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(IDEMPOTENCY_STORAGE_KEY, key);
  }
  return key;
}

export function rotateOrderIdempotencyKey() {
  const key = crypto.randomUUID();
  localStorage.setItem(IDEMPOTENCY_STORAGE_KEY, key);
  return key;
}
