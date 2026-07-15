import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AccountSecurity() {
  const { updateProfile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ currentPassword, newPassword });
      setMessage('Đã cập nhật mật khẩu thành công.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="account-page-title">Bảo mật tài khoản</h1>
      <p className="account-page-sub">Đổi mật khẩu định kỳ để bảo vệ tài khoản mua sắm của bạn.</p>

      {message && <p style={{ color: '#16a34a', marginBottom: 12 }}>{message}</p>}
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      <form onSubmit={handleSubmit} className="card" style={{ padding: 16, display: 'grid', gap: 14, maxWidth: 520 }}>
        <div>
          <label className="block text-sm font-medium mb-1">Mật khẩu hiện tại</label>
          <input
            type="password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mật khẩu mới</label>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Xác nhận mật khẩu mới</label>
          <input
            type="password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
        </button>
      </form>
    </div>
  );
}
