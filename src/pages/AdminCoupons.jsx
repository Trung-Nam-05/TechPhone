import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminPageHeader from '../components/admin/AdminPageHeader';

const DEFAULT_FORM = {
  code: '',
  description: '',
  scope: 'product',
  discountType: 'fixed',
  discountValue: '',
  minOrderValue: 0,
  maxDiscountValue: '',
  usageLimit: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function formatVnd(value) {
  if (value === null || value === undefined || value === '') return '—';
  return `${Number(value).toLocaleString('vi-VN')} đ`;
}

export default function AdminCoupons() {
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
      const payload = await authFetch('/api/admin/coupons');
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
      code: item.code || '',
      description: item.description || '',
      scope: item.scope || 'product',
      discountType: item.discountType || 'fixed',
      discountValue: item.discountValue ?? '',
      minOrderValue: item.minOrderValue ?? 0,
      maxDiscountValue: item.maxDiscountValue ?? '',
      usageLimit: item.usageLimit ?? '',
      startsAt: toDateTimeLocalValue(item.startsAt),
      endsAt: toDateTimeLocalValue(item.endsAt),
      isActive: item.isActive !== false,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const body = {
        code: form.code,
        description: form.description,
        scope: form.scope,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderValue: Number(form.minOrderValue) || 0,
        maxDiscountValue: form.maxDiscountValue === '' ? null : Number(form.maxDiscountValue),
        usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        isActive: form.isActive,
      };
      if (isEditing) {
        await authFetch(`/api/admin/coupons/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setSuccess('Đã cập nhật mã giảm giá.');
      } else {
        await authFetch('/api/admin/coupons', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setSuccess('Đã tạo mã giảm giá.');
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (item) => {
    const tip =
      item.usedCount > 0
        ? `Mã ${item.code} đã dùng ${item.usedCount} lần — hệ thống sẽ TẮT mã (không xóa lịch sử). Tiếp tục?`
        : `Xóa mã ${item.code}?`;
    if (!window.confirm(tip)) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await authFetch(`/api/admin/coupons/${item._id}`, { method: 'DELETE' });
      setSuccess(response?.message || (item.usedCount > 0 ? 'Đã tắt mã giảm giá.' : 'Đã xóa mã giảm giá.'));
      if (editingId === item._id) resetForm();
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Mã giảm giá"
        subtitle="Quản lý coupon áp dụng khi đặt hàng (product / shipping)."
      />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      <div className="admin-split-layout">
        <div className="admin-panel" style={{ height: 'fit-content' }}>
          <h2 className="admin-panel-title">{isEditing ? 'Cập nhật mã' : 'Tạo mã mới'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label>Mã</label>
              <input
                className="input"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                required
                placeholder="VD: SALE10"
              />
            </div>
            <div className="admin-form-group">
              <label>Mô tả</label>
              <input
                className="input"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phạm vi</label>
                <select
                  className="input"
                  value={form.scope}
                  onChange={(e) => setForm((prev) => ({ ...prev, scope: e.target.value }))}
                >
                  <option value="product">Giảm trên sản phẩm</option>
                  <option value="shipping">Giảm phí ship</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loại giảm</label>
                <select
                  className="input"
                  value={form.discountType}
                  onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value }))}
                >
                  <option value="fixed">Số tiền cố định</option>
                  <option value="percentage">Phần trăm (%)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Giá trị giảm</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.discountValue}
                  onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Đơn tối thiểu</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.minOrderValue}
                  onChange={(e) => setForm((prev) => ({ ...prev, minOrderValue: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Giảm tối đa</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.maxDiscountValue}
                  onChange={(e) => setForm((prev) => ({ ...prev, maxDiscountValue: e.target.value }))}
                  placeholder="Để trống = không giới hạn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Giới hạn lượt dùng</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.usageLimit}
                  onChange={(e) => setForm((prev) => ({ ...prev, usageLimit: e.target.value }))}
                  placeholder="Để trống = không giới hạn"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bắt đầu</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kết thúc</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                />
              </div>
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
          {!loading && items.length === 0 && <p className="text-muted">Chưa có mã giảm giá.</p>}
          {!loading && items.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Giảm</th>
                    <th>ĐK</th>
                    <th>Đã dùng</th>
                    <th>TT</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.code}</strong>
                        <div className="text-sm text-muted">{item.description}</div>
                      </td>
                      <td>
                        {item.discountType === 'percentage'
                          ? `${item.discountValue}%`
                          : formatVnd(item.discountValue)}
                        <div className="text-sm text-muted">{item.scope}</div>
                      </td>
                      <td>
                        Min {formatVnd(item.minOrderValue)}
                        {item.maxDiscountValue != null && (
                          <div className="text-sm text-muted">Max {formatVnd(item.maxDiscountValue)}</div>
                        )}
                      </td>
                      <td>
                        {item.usedCount || 0}
                        {item.usageLimit != null ? ` / ${item.usageLimit}` : ''}
                      </td>
                      <td>{item.isActive ? 'Active' : 'Tắt'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn btn-outline" onClick={() => startEdit(item)}>
                          Sửa
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => handleDelete(item)}>
                          {item.usedCount > 0 ? 'Tắt' : 'Xóa'}
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
