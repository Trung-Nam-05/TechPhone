import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminPageHeader from '../components/admin/AdminPageHeader';

const DEFAULT_FORM = {
  name: '',
  categoryKey: 'dien-thoai',
  categoryLabel: 'Điện thoại',
  brand: '',
  price: '',
  oldPrice: '',
  stock: 0,
  image: '',
  description: '',
  isActive: true,
};

const CATEGORY_OPTIONS = [
  { key: 'dien-thoai', label: 'Điện thoại' },
  { key: 'laptop', label: 'Laptop' },
  { key: 'dien-may', label: 'Điện máy' },
  { key: 'phu-kien', label: 'Phụ kiện' },
];

export default function AdminProducts() {
  const { authFetch } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingProductId, setEditingProductId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const isEditing = Boolean(editingProductId);

  const resetForm = () => {
    setEditingProductId(null);
    setForm(DEFAULT_FORM);
  };

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await authFetch('/api/admin/products');
      setItems(payload.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategoryChange = (key) => {
    const selected = CATEGORY_OPTIONS.find((option) => option.key === key);
    setForm((prev) => ({
      ...prev,
      categoryKey: key,
      categoryLabel: selected?.label || prev.categoryLabel,
    }));
  };

  const handleEdit = (product) => {
    setEditingProductId(product._id);
    setForm({
      name: product.name || '',
      categoryKey: product.category?.key || 'dien-thoai',
      categoryLabel: product.category?.label || 'Điện thoại',
      brand: product.brand || '',
      price: product.price ?? '',
      oldPrice: product.oldPrice ?? '',
      stock: product.stock ?? 0,
      image: product.image || '',
      description: product.description || '',
      isActive: Boolean(product.isActive),
    });
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Bạn chắc chắn muốn xoá sản phẩm này?');
    if (!confirmed) return;

    try {
      await authFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item._id !== id));
      if (editingProductId === id) {
        resetForm();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const payload = {
      ...form,
      price: Number(form.price),
      oldPrice: form.oldPrice === '' ? null : Number(form.oldPrice),
      stock: Number(form.stock),
    };

    try {
      if (isEditing) {
        const updated = await authFetch(`/api/admin/products/${editingProductId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setItems((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      } else {
        const created = await authFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Quản lý sản phẩm"
        subtitle={`CRUD sản phẩm cho admin. Tổng hiện tại: ${items.length}`}
      />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-split-layout">
        <div className="admin-panel" style={{ height: 'fit-content' }}>
          <h2 className="admin-panel-title">{isEditing ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm mới'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label>Tên sản phẩm</label>
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Danh mục</label>
                <select
                  className="input"
                  value={form.categoryKey}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thương hiệu</label>
                <input
                  className="input"
                  value={form.brand}
                  onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Giá bán</label>
                <input
                  type="number"
                  className="input"
                  value={form.price}
                  onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                  min={0}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Giá cũ</label>
                <input
                  type="number"
                  className="input"
                  value={form.oldPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, oldPrice: event.target.value }))}
                  min={0}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tồn kho</label>
                <input
                  type="number"
                  className="input"
                  value={form.stock}
                  onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trạng thái</label>
                <select
                  className="input"
                  value={String(form.isActive)}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))
                  }
                >
                  <option value="true">Đang bán</option>
                  <option value="false">Ẩn</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Ảnh (URL)</label>
              <input
                className="input"
                value={form.image}
                onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <textarea
                className="input"
                rows={4}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {isEditing ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
              </button>
              {isEditing && (
                <button type="button" className="btn btn-outline" onClick={resetForm}>
                  Huỷ
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-panel">
          {loading ? (
            <p className="admin-empty">Đang tải dữ liệu...</p>
          ) : (
            <div>
              {items.map((item) => (
                <div key={item._id} className="admin-product-row">
                  <img
                    src={item.image || 'https://via.placeholder.com/52x52.png?text=P'}
                    alt={item.name}
                  />
                  <div className="admin-list-row-meta">
                    <strong>{item.name}</strong>
                    <p>
                      {item.category?.label} · {item.price?.toLocaleString('vi-VN')} đ · Tồn: {item.stock}
                    </p>
                  </div>
                  <div className="admin-list-row-actions">
                    <button type="button" className="btn btn-outline" onClick={() => handleEdit(item)}>
                      Sửa
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => handleDelete(item._id)}>
                      Xoá
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="admin-empty">Chưa có sản phẩm.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
