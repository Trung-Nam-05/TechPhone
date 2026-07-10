import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function AccountProfile() {
  const { user, updateProfile } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const body = { name: name.trim() };
      if (newPassword.trim()) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      await updateProfile(body);
      setMessage(t('account.saved'));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 560, padding: '24px 16px' }}>
      <p style={{ marginBottom: 16 }}>
        <Link to="/account/orders">{t('account.profileLink')}</Link>
        {' · '}
        <Link to="/">{t('account.homeLink')}</Link>
      </p>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>{t('account.profileTitle')}</h1>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        {user?.email}
      </p>

      {message && <p style={{ color: '#16a34a', marginBottom: 12 }}>{message}</p>}
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      <form onSubmit={handleSubmit} className="card" style={{ padding: 16, display: 'grid', gap: 14 }}>
        <div>
          <label className="block text-sm font-medium mb-1">{t('account.nameLabel')}</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('account.newPassword')}</label>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {newPassword ? (
          <div>
            <label className="block text-sm font-medium mb-1">{t('account.currentPassword')}</label>
            <input
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? t('account.saving') : t('account.save')}
        </button>
      </form>
    </div>
  );
}
