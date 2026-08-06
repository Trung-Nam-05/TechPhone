import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../config/api';
import { toUserFacingError } from '../utils/userFacingError';

export default function ForgotPassword() {
  const [contactEmail, setContactEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const payload = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ contactEmail: contactEmail.trim() }),
      });
      setMessage(payload?.message || 'Nếu email đã liên kết và xác minh, bạn sẽ nhận hướng dẫn khôi phục mật khẩu.');
    } catch (err) {
      setError(toUserFacingError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520, paddingTop: 28, paddingBottom: 28 }}>
      <div className="card" style={{ padding: 20 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Quên mật khẩu</h1>
        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
          Nhập email liên kết đã xác minh tại mục Bảo mật tài khoản. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Email liên kết</label>
            <input
              type="email"
              className="input"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>
          {message && <p style={{ color: '#16a34a', marginBottom: 12 }}>{message}</p>}
          {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}
          </button>
        </form>
        <p className="text-sm text-muted" style={{ marginTop: 12 }}>
          <Link to="/login">← Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
