import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function Register() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await register({ name, username, password });
      navigate('/', { replace: true });
    } catch {
      // Error state is exposed by auth context.
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520, paddingTop: 28, paddingBottom: 28 }}>
      <div className="card" style={{ padding: 20 }}>
        <h1 style={{ fontSize: 28, marginBottom: 16 }}>{t('register.title')}</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">{t('register.name')}</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('register.namePlaceholder')}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Tên đăng nhập</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              placeholder="vd: nam_phone"
              minLength={6}
              maxLength={20}
              pattern="[a-z][a-z0-9_]{5,19}"
              required
            />
            <p className="text-sm text-muted" style={{ marginTop: 6 }}>
              6–20 ký tự, chữ thường, số và dấu gạch dưới. Bắt đầu bằng chữ cái.
            </p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">{t('register.password')}</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('register.passwordHint')}
              minLength={6}
              required
            />
          </div>
          {error && (
            <p className="text-sm mb-4" style={{ color: '#dc2626' }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? t('register.submitting') : t('register.submit')}
          </button>
        </form>
        <p className="text-sm text-muted" style={{ marginTop: 12 }}>
          {t('register.hasAccount')}{' '}
          <Link to="/login" className="text-primary">
            {t('register.login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
