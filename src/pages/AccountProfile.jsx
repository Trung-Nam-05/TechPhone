import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AccountProfile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setAvatar(user?.avatar || '');
  }, [user?.name, user?.phone, user?.avatar]);

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 150 * 1024) {
      setError('Ảnh tối đa 150KB. Hãy chọn ảnh nhỏ hơn.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAvatar(dataUrl);
      setError(null);
    } catch {
      setError('Không đọc được file ảnh.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim(), avatar });
      setMessage('Đã cập nhật thông tin cá nhân.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="account-page-title">Thông tin cá nhân</h1>
      <p className="account-page-sub">Cập nhật ảnh đại diện, họ tên và số điện thoại liên hệ.</p>

      {message && <p style={{ color: '#16a34a', marginBottom: 12 }}>{message}</p>}
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      <form onSubmit={handleSubmit} className="card" style={{ padding: 16, display: 'grid', gap: 14, maxWidth: 560 }}>
        <div className="account-avatar-upload">
          <div className="account-avatar-preview">
            {avatar ? (
              <img src={avatar} alt="Ảnh đại diện" />
            ) : (
              <span>{name?.charAt(0)?.toUpperCase() || 'K'}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ marginBottom: 6 }}>Ảnh đại diện</p>
            <button type="button" className="btn btn-outline" onClick={() => fileRef.current?.click()}>
              Chọn ảnh từ máy
            </button>
            <p className="text-sm text-muted" style={{ marginTop: 6 }}>JPG/PNG/WEBP, tối đa 150KB.</p>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Họ và tên</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input className="input" value={user?.email || ''} disabled />
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>Email đăng nhập không thể đổi tại đây.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Số điện thoại</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xx xxx xxx"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  );
}
