import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminPageHeader from '../components/admin/AdminPageHeader';

export default function AdminReviews() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ pendingCount: 0, approvedCount: 0, total: 0 });
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadData = async (nextStatus = status) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await authFetch(`/api/admin/reviews?status=${encodeURIComponent(nextStatus)}`);
      setItems(payload.items || []);
      setMeta(payload.meta || { pendingCount: 0, approvedCount: 0, total: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const approve = async (id) => {
    setError(null);
    setSuccess(null);
    try {
      await authFetch(`/api/admin/reviews/${id}/approve`, { method: 'PATCH' });
      setSuccess('Đã duyệt đánh giá.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const reject = async (id) => {
    setError(null);
    setSuccess(null);
    try {
      await authFetch(`/api/admin/reviews/${id}/reject`, { method: 'PATCH' });
      setSuccess('Đã chuyển về chờ duyệt / ẩn khỏi trang sản phẩm.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Xóa đánh giá này? (soft-delete)')) return;
    setError(null);
    setSuccess(null);
    try {
      await authFetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      setSuccess('Đã xóa đánh giá.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Duyệt đánh giá"
        subtitle={`Chờ duyệt: ${meta.pendingCount} · Đã duyệt: ${meta.approvedCount}`}
      />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      <div className="admin-panel" style={{ marginBottom: 16 }}>
        <div className="admin-form-group" style={{ marginBottom: 0, maxWidth: 260 }}>
          <label>Bộ lọc</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="all">Tất cả</option>
          </select>
        </div>
      </div>

      <div className="admin-panel">
        {loading && <p className="text-muted">Đang tải...</p>}
        {!loading && items.length === 0 && <p className="text-muted">Không có đánh giá.</p>}
        {!loading && items.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Khách</th>
                  <th>Sao</th>
                  <th>Nội dung</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.product?.name || '—'}</strong>
                    </td>
                    <td>
                      <div>{item.user?.name || '—'}</div>
                      <div className="text-sm text-muted">{item.user?.email}</div>
                    </td>
                    <td>{item.rating}/5</td>
                    <td style={{ maxWidth: 280 }}>{item.comment || '—'}</td>
                    <td>{item.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}</td>
                    <td>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {!item.isApproved && (
                        <button type="button" className="btn btn-primary" onClick={() => approve(item._id)}>
                          Duyệt
                        </button>
                      )}
                      {item.isApproved && (
                        <button type="button" className="btn btn-outline" onClick={() => reject(item._id)}>
                          Ẩn
                        </button>
                      )}
                      <button type="button" className="btn btn-outline" onClick={() => remove(item._id)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
