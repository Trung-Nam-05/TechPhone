import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error } = useAuth();
  const { t } = useI18n();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  const redirectPath = location.state?.from || '/';

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await login({ login: loginId, password });
      navigate(redirectPath, { replace: true });
    } catch {
      // Error state is exposed by auth context.
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520, paddingTop: 28, paddingBottom: 28 }}>
      <div className="card" style={{ padding: 20 }}>
        <h1 style={{ fontSize: 28, marginBottom: 16 }}>{t('login.title')}</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Tên đăng nhập hoặc email</label>
            <input
              type="text"
              className="input"
              data-testid="login-email"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              placeholder="username hoặc email@example.com"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">{t('login.password')}</label>
            <input
              type="password"
              className="input"
              data-testid="login-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <p className="text-sm" style={{ marginBottom: 12 }}>
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </p>
          {error && (
            <p className="text-sm mb-4" style={{ color: '#dc2626' }} data-testid="login-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
            data-testid="login-submit"
          >
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        <p className="text-sm text-muted" style={{ marginTop: 12 }}>
          {t('login.noAccount')}{' '}
          <Link to="/register" className="text-primary">
            {t('login.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
