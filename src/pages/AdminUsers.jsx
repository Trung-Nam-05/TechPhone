import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminPageHeader from '../components/admin/AdminPageHeader';

export default function AdminUsers() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await authFetch('/api/admin/users?role=customer');
      setItems(payload.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleActive = async (id, nextActive) => {
    try {
      const updated = await authFetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive }),
      });
      setItems((prev) => prev.map((u) => (u.id === id || u._id === id ? updated.user : u)));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Khách hàng"
        subtitle="Kích hoạt / vô hiệu hóa tài khoản. Tài khoản bị vô hiệu không thể đăng nhập."
      />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-panel">
        {loading ? (
          <p className="admin-empty">Đang tải...</p>
        ) : (
          <div className="admin-list">
            {items.map((u) => {
              const id = u.id || u._id;
              const active = u.isActive !== false;
              return (
                <div key={String(id)} className="admin-list-row">
                  <div className="admin-list-row-meta">
                    <strong>{u.name}</strong>
                    <p>{u.email}</p>
                  </div>
                  <div className="admin-list-row-actions">
                    <button type="button" className="btn btn-outline" onClick={() => toggleActive(id, !active)}>
                      {active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    </button>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && <p className="admin-empty">Chưa có khách hàng.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
