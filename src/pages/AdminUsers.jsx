import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import { userMatchesQuery } from '../utils/adminSearch';

export default function AdminUsers() {
  const { authFetch } = useAuth();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q')?.trim() || '');

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return items;
    return items.filter((user) => userMatchesQuery(user, q));
  }, [items, searchQuery]);

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

  useEffect(() => {
    const q = searchParams.get('q')?.trim() || '';
    if (q) setSearchQuery(q);
  }, [searchParams]);

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
        <div style={{ marginBottom: 12, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="input"
            style={{ paddingLeft: 34, width: '100%' }}
            placeholder="Tìm tên hoặc email khách hàng..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        {loading ? (
          <p className="admin-empty">Đang tải...</p>
        ) : (
          <div className="admin-list">
            {filteredItems.map((u) => {
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
            {filteredItems.length === 0 && (
              <p className="admin-empty">
                {searchQuery.trim() ? 'Không tìm thấy khách hàng phù hợp.' : 'Chưa có khách hàng.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
