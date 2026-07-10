import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
    <div>
      <h1 style={{ fontSize: 30, marginBottom: 12 }}>Khach hang</h1>
      <p className="text-muted" style={{ marginBottom: 14 }}>
        Kich hoat / vo hieu hoa tai khoan. Tai khoan bi vo hieu khong the dang nhap.
      </p>
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
      {loading ? (
        <p className="text-muted">Dang tai...</p>
      ) : (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((u) => {
              const id = u.id || u._id;
              const active = u.isActive !== false;
              return (
                <div
                  key={String(id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #e5e7eb',
                    paddingBottom: 10,
                  }}
                >
                  <div>
                    <strong>{u.name}</strong>
                    <p className="text-sm text-muted">{u.email}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => toggleActive(id, !active)}
                  >
                    {active ? 'Vo hieu hoa' : 'Kich hoat'}
                  </button>
                </div>
              );
            })}
            {items.length === 0 && <p className="text-muted">Chua co khach hang.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
