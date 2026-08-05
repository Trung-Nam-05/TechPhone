import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { VERIFY_CHANNEL, VERIFY_STORAGE_KEY } from '../pages/EmailVerified';

export default function AccountSecurity() {
  const { updateProfile, authFetch, refreshUser, user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.contactEmail || '');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [linkingEmail, setLinkingEmail] = useState(false);

  const markVerifiedFromSync = useCallback(async () => {
    const fresh = await refreshUser();
    if (fresh?.contactEmailVerified) {
      setMessage('Email liên kết đã được xác minh thành công.');
      setError(null);
    }
    return fresh;
  }, [refreshUser]);

  useEffect(() => {
    setContactEmail(user?.contactEmail || '');
  }, [user?.contactEmail]);

  // Tab đang chờ: tự cập nhật khi tab khác (link email) xác minh xong
  useEffect(() => {
    if (!user?.contactEmail || user?.contactEmailVerified) {
      return undefined;
    }

    const onStorage = (event) => {
      if (event.key === VERIFY_STORAGE_KEY) {
        markVerifiedFromSync();
      }
    };

    window.addEventListener('storage', onStorage);

    let channel;
    try {
      channel = new BroadcastChannel(VERIFY_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === 'email-verified') {
          markVerifiedFromSync();
        }
      };
    } catch {
      // ignore
    }

    const pollTimer = setInterval(() => {
      markVerifiedFromSync();
    }, 4000);

    return () => {
      window.removeEventListener('storage', onStorage);
      channel?.close();
      clearInterval(pollTimer);
    };
  }, [user?.contactEmail, user?.contactEmailVerified, markVerifiedFromSync]);

  const handlePasswordSubmit = async (event) => {
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

  const handleLinkEmail = async (event) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setLinkingEmail(true);
    try {
      const payload = await authFetch('/api/auth/link-email', {
        method: 'POST',
        body: JSON.stringify({ contactEmail: contactEmail.trim() }),
      });
      setMessage(payload?.message || 'Đã gửi email xác minh. Mở link trong hộp thư — tab này sẽ tự cập nhật.');
      if (payload?.user) {
        await refreshUser();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLinkingEmail(false);
    }
  };

  return (
    <div>
      <h1 className="account-page-title">Bảo mật tài khoản</h1>
      <p className="account-page-sub">
        Liên kết email thật để nhận khuyến mãi và khôi phục mật khẩu. Đổi mật khẩu định kỳ để bảo vệ tài khoản.
      </p>

      {message && <p style={{ color: '#16a34a', marginBottom: 12 }}>{message}</p>}
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      <form
        onSubmit={handleLinkEmail}
        className="card"
        style={{ padding: 16, display: 'grid', gap: 14, maxWidth: 520, marginBottom: 16 }}
      >
        <h2 style={{ fontSize: 18, margin: 0 }}>Email liên kết</h2>
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          Email liên kết dùng để nhận khuyến mãi và khôi phục mật khẩu (khác email đăng nhập nội bộ).
        </p>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            className="input"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="email@example.com"
            required
            disabled={user?.contactEmailVerified}
          />
          {user?.contactEmailVerified && (
            <p style={{ color: '#16a34a', fontSize: 13, marginTop: 6 }}>✓ Đã xác minh</p>
          )}
          {user?.contactEmail && !user?.contactEmailVerified && (
            <p style={{ color: '#ca8a04', fontSize: 13, marginTop: 6 }}>
              Chờ xác minh — mở link trong email.
            </p>
          )}
        </div>
        {!user?.contactEmailVerified && (
          <button type="submit" className="btn btn-outline" disabled={linkingEmail}>
            {linkingEmail ? 'Đang gửi...' : user?.contactEmail ? 'Gửi lại email xác minh' : 'Gửi email xác minh'}
          </button>
        )}
      </form>

      <form onSubmit={handlePasswordSubmit} className="card" style={{ padding: 16, display: 'grid', gap: 14, maxWidth: 520 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Đổi mật khẩu</h2>
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
