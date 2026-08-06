import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../config/api';
import { toUserFacingError } from '../utils/userFacingError';

export default function ForgotPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const resetToken = params.get('token') || '';
  const urlError = params.get('error') || '';

  const [login, setLogin] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [preview, setPreview] = useState(null);
  const [step, setStep] = useState('login');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetUser, setResetUser] = useState(null);
  const [validatingToken, setValidatingToken] = useState(Boolean(resetToken));

  useEffect(() => {
    if (urlError === 'invalid') {
      setError('Liên kết xác thực không hợp lệ hoặc đã hết hạn.');
    } else if (urlError === 'missing') {
      setError('Thiếu liên kết xác thực.');
    }
  }, [urlError]);

  useEffect(() => {
    if (!resetToken) {
      setValidatingToken(false);
      return undefined;
    }

    let cancelled = false;
    setValidatingToken(true);
    apiFetch(`/api/auth/forgot-password/validate?token=${encodeURIComponent(resetToken)}`)
      .then((payload) => {
        if (!cancelled) {
          setResetUser(payload);
          setStep('reset');
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(toUserFacingError(err.message));
          setStep('login');
        }
      })
      .finally(() => {
        if (!cancelled) setValidatingToken(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resetToken]);

  const handlePreview = async (event) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const payload = await apiFetch('/api/auth/forgot-password/preview', {
        method: 'POST',
        body: JSON.stringify({ login: login.trim() }),
      });
      setPreview(payload);
      setStep('confirm');
    } catch (err) {
      setError(toUserFacingError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const payload = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          login: login.trim(),
          method: 'email',
          contactEmail: preview?.needsEmailInput ? contactEmail.trim() : undefined,
        }),
      });
      setMessage(payload?.message || 'Đã gửi email hướng dẫn.');
      setStep('sent');
    } catch (err) {
      setError(toUserFacingError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.');
      return;
    }

    setLoading(true);
    try {
      const payload = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      setMessage(payload?.message || 'Đã đặt lại mật khẩu thành công.');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(toUserFacingError(err.message));
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="container" style={{ maxWidth: 520, paddingTop: 28 }}>
        <p className="text-muted">Đang kiểm tra liên kết...</p>
      </div>
    );
  }

  if (step === 'reset' && resetToken) {
    return (
      <div className="container" style={{ maxWidth: 520, paddingTop: 28, paddingBottom: 28 }}>
        <div className="card" style={{ padding: 20 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Đặt mật khẩu mới</h1>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            {resetUser?.username
              ? `Tài khoản: ${resetUser.username}`
              : 'Nhập mật khẩu mới cho tài khoản của bạn.'}
          </p>
          <form onSubmit={handleReset}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Mật khẩu mới</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Xác nhận mật khẩu</label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {message && <p style={{ color: '#16a34a', marginBottom: 12 }}>{message}</p>}
            {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 520, paddingTop: 28, paddingBottom: 28 }}>
      <div className="card" style={{ padding: 20 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Quên mật khẩu</h1>

        {step === 'login' && (
          <>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Nhập tên đăng nhập. Chúng tôi sẽ gửi hướng dẫn qua email liên kết (hoặc email thật nếu bạn chưa liên kết).
            </p>
            <form onSubmit={handlePreview}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Tên đăng nhập</label>
                <input
                  type="text"
                  className="input"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="vd: ungtrungnam"
                  required
                />
              </div>
              {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Đang kiểm tra...' : 'Tiếp tục'}
              </button>
            </form>
          </>
        )}

        {step === 'confirm' && preview && (
          <>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Tài khoản <strong>{preview.login}</strong> — chọn gửi xác thực qua email.
            </p>
            <form onSubmit={handleSend}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Phương thức</label>
                <div className="input" style={{ background: '#f8fafc' }}>Email</div>
              </div>

              {preview.hasVerifiedEmail ? (
                <p className="text-sm" style={{ marginBottom: 16 }}>
                  Gửi liên kết đặt lại mật khẩu tới: <strong>{preview.maskedEmail}</strong>
                </p>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Email thật của bạn</label>
                  <input
                    type="email"
                    className="input"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@gmail.com"
                    required
                  />
                  <p className="text-sm text-muted" style={{ marginTop: 8 }}>
                    Chưa liên kết email — nhập email thật để nhận liên kết xác thực và đặt mật khẩu mới.
                  </p>
                </div>
              )}

              {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi email xác thực'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => {
                  setStep('login');
                  setPreview(null);
                  setError(null);
                }}
              >
                Quay lại
              </button>
            </form>
          </>
        )}

        {step === 'sent' && (
          <>
            {message && <p style={{ color: '#16a34a', marginBottom: 12 }}>{message}</p>}
            <p className="text-sm text-muted">
              Kiểm tra hộp thư (cả mục Spam/Quảng cáo). Sau khi bấm liên kết trong email, trang này sẽ chuyển sang đặt mật khẩu mới.
            </p>
          </>
        )}

        <p className="text-sm text-muted" style={{ marginTop: 12 }}>
          <Link to="/login">← Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
