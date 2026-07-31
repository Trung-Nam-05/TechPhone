import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminPageHeader from '../components/admin/AdminPageHeader';

const DEFAULT_FORM = {
  key: '',
  label: '',
  sortOrder: 0,
  isActive: true,
};

export default function AdminCategories() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const isEditing = Boolean(editingId);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await authFetch('/api/admin/categories');
      setItems(payload.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      key: item.key,
      label: item.label,
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive !== false,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const body = {
        key: form.key,
        label: form.label,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      if (isEditing) {
        await authFetch(`/api/admin/categories/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setSuccess('Đã cập nhật danh mục.');
      } else {
        await authFetch('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setSuccess('Đã tạo danh mục.');
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (item) => {
    if (item.productCount > 0) {
      window.alert(
        `Không thể xóa "${item.label}" vì còn ${item.productCount} sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước.`,
      );
      return;
    }
    if (!window.confirm(`Xóa danh mục "${item.label}"?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await authFetch(`/api/admin/categories/${item._id}`, { method: 'DELETE' });
      setSuccess('Đã xóa danh mục.');
      if (editingId === item._id) resetForm();
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Quản lý danh mục"
        subtitle="CRUD danh mục hàng bán. Không xóa được danh mục còn sản phẩm."
      />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      <div className="admin-split-layout">
        <div className="admin-panel" style={{ height: 'fit-content' }}>
          <h2 className="admin-panel-title">{isEditing ? 'Cập nhật danh mục' : 'Tạo danh mục'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label>Tên hiển thị</label>
              <input
                className="input"
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                required
                placeholder="VD: Đồ gia dụng"
              />
            </div>
            <div className="admin-form-group">
              <label>Mã (key)</label>
              <input
                className="input"
                value={form.key}
                onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))}
                placeholder="Tự tạo từ tên nếu để trống"
                disabled={isEditing && items.find((i) => i._id === editingId)?.productCount > 0}
              />
              <p className="text-sm text-muted" style={{ marginTop: 6 }}>
                Không đổi mã khi danh mục đã có sản phẩm (chỉ đổi tên hiển thị).
              </p>
            </div>
            <div className="admin-form-group">
              <label>Thứ tự</label>
              <input
                className="input"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
              />
            </div>
            <label className="admin-checkbox-row" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              <span>Đang hoạt động</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">
                {isEditing ? 'Lưu' : 'Tạo'}
              </button>
              {isEditing && (
                <button type="button" className="btn btn-outline" onClick={resetForm}>
                  Hủy
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-panel">
          <h2 className="admin-panel-title">Danh sách ({items.length})</h2>
          {loading && <p className="text-muted">Đang tải...</p>}
          {!loading && items.length === 0 && <p className="text-muted">Chưa có danh mục.</p>}
          {!loading && items.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Mã</th>
                    <th>SP</th>
                    <th>TT</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.label}</strong>
                      </td>
                      <td>
                        <code>{item.key}</code>
                      </td>
                      <td>{item.productCount || 0}</td>
                      <td>{item.sortOrder}</td>
                      <td>{item.isActive ? 'Active' : 'Ẩn'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn btn-outline" onClick={() => startEdit(item)}>
                          Sửa
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => handleDelete(item)}>
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
    </div>
  );
}
