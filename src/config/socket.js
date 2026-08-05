function resolveSocketUrl() {
  const configured = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL;
  if (configured !== undefined && String(configured).trim() !== '') {
    return String(configured).replace(/\/$/, '');
  }
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:4000';
}

export const SOCKET_URL = resolveSocketUrl();
