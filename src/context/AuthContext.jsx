import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, getSessionId } from '../config/api';

const AUTH_STORAGE_KEY = 'techphone-auth';
const AuthContext = createContext();

async function parseError(response) {
  const payload = await response.json().catch(() => ({}));
  return payload?.message || `Request failed with status ${response.status}`;
}

function readStoredAuth() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredAuth()?.token || null);
  const [user, setUser] = useState(() => readStoredAuth()?.user || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
  }, [token, user]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const authFetch = useCallback(
    async (path, options = {}) => {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      headers.set('x-session-id', getSessionId());
      headers.set('X-Requested-With', 'TechPhone');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

      if (response.status === 401) {
        setToken(null);
        setUser(null);
        throw new Error(await parseError(response));
      }

      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      if (response.status === 204) return null;
      return response.json();
    },
    [token],
  );

  const login = async ({ login: loginId, email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': getSessionId(),
          'X-Requested-With': 'TechPhone',
        },
        body: JSON.stringify({ login: loginId || email, password }),
      });
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const payload = await response.json();
      setToken(payload.token);
      setUser(payload.user);
      return payload.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ name, username, email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': getSessionId(),
          'X-Requested-With': 'TechPhone',
        },
        body: JSON.stringify({ name, username: username || email, password }),
      });
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const payload = await response.json();
      setToken(payload.token);
      setUser(payload.user);
      return payload.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!token) return null;
    try {
      const payload = await authFetch('/api/auth/me');
      if (payload?.user) {
        setUser(payload.user);
        return payload.user;
      }
    } catch {
      /* ignore — authFetch clears bad token */
    }
    return null;
  };

  const updateProfile = async (body) => {
    const payload = await authFetch('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    if (payload?.user) {
      setUser(payload.user);
    }
    return payload?.user;
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === 'admin',
      loading,
      error,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      authFetch,
    }),
    [token, user, loading, error, authFetch, logout, login, register, refreshUser, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
