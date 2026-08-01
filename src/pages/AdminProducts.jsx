import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import {
  getBrandLabel,
  getBrandsForCategory,
  normalizeBrandKey,
} from '../data/brandsByCategory';
import { productMatchesQuery } from '../utils/adminSearch';

const DEFAULT_FORM = {
  name: '',
  categoryKey: 'dien-thoai',
  categoryLabel: 'Điện thoại',
  brand: '',
  price: '',
  stock: 0,
  image: '',
  description: '',
  isActive: true,
};

const FALLBACK_CATEGORIES = [
  { key: 'dien-thoai', label: 'Điện thoại' },
  { key: 'may-tinh-bang', label: 'Máy tính bảng' },
  { key: 'laptop', label: 'Laptop' },
  { key: 'may-lanh', label: 'Máy lạnh' },
  { key: 'dien-may', label: 'Điện máy' },
  { key: 'phu-kien', label: 'Phụ kiện' },
];

export default function AdminProducts() {
  const { authFetch } = useAuth();
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingProductId, setEditingProductId] = useState(null);
  const [editingSnapshot, setEditingSnapshot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);

  const isEditing = Boolean(editingProductId);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return items;
    return items.filter((item) => productMatchesQuery(item, q));
  }, [items, searchQuery]);

  const brandOptions = useMemo(() => {
    const options = getBrandsForCategory(form.categoryKey);
    const current = normalizeBrandKey(form.categoryKey, form.brand);
    if (current && !options.some((b) => b.key === current)) {
      return [{ key: current, label: form.brand || current }, ...options];
    }
    return options;
  }, [form.categoryKey, form.brand]);

  const resetForm = () => {
    setEditingProductId(null);
    setEditingSnapshot(null);
    setForm({
      ...DEFAULT_FORM,
      categoryKey: categories[0]?.key || 'dien-thoai',
      categoryLabel: categories[0]?.label || 'Điện thoại',
    });
  };

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsPayload, categoriesPayload] = await Promise.all([
        authFetch('/api/admin/products'),
        authFetch('/api/admin/categories').catch(() => null),
      ]);
      setItems(productsPayload.items || []);
      const nextCategories = (categoriesPayload?.items || []).filter((item) => item.isActive !== false);
      if (nextCategories.length > 0) {
        setCategories(nextCategories.map((item) => ({ key: item.key, label: item.label })));
      }
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

  useEffect(() => {
    const q = searchParams.get('q')?.trim() || '';
    if (q) setSearchQuery(q);
  }, [searchParams]);

  const handleCategoryChange = (key) => {
    const selected = categories.find((option) => option.key === key);
    const nextBrands = getBrandsForCategory(key);
    setForm((prev) => {
      const currentBrand = normalizeBrandKey(key, prev.brand);
      const stillValid = nextBrands.some((b) => b.key === currentBrand);
      return {
        ...prev,
        categoryKey: key,
        categoryLabel: selected?.label || prev.categoryLabel,
        brand: stillValid ? currentBrand : '',
      };
    });
  };

  const handleEdit = (product) => {
    const categoryKey = product.category?.key || 'dien-thoai';
    setEditingProductId(product._id);
    setEditingSnapshot({
      price: product.price ?? null,
      oldPrice: product.oldPrice ?? null,
    });
    setForm({
      name: product.name || '',
      categoryKey,
      categoryLabel: product.category?.label || 'Điện thoại',
      brand: normalizeBrandKey(categoryKey, product.brand || ''),
      price: product.price ?? '',
      stock: product.stock ?? 0,
      image: product.image || '',
      description: product.description || '',
      isActive: Boolean(product.isActive),
    });
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      'Xóa sản phẩm? Hệ thống sẽ chặn nếu sản phẩm đang bán chạy, đang trong đơn chưa xong, hoặc đang flash sale.\n\nGợi ý: tạm ngưng bán bằng cách tắt "Đang bán" thay vì xóa.',
    );
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

    if (!form.brand) {
      setError('Vui lòng chọn thương hiệu phù hợp với danh mục.');
      return;
    }

    const payload = {
      ...form,
      brand: normalizeBrandKey(form.categoryKey, form.brand),
      price: Number(form.price),
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
        subtitle="Tạo/sửa sản phẩm. Giá cũ chỉ tự sinh khi giảm giá. Xóa là soft-delete — SP bán chạy hoặc đang trong đơn sẽ bị chặn."
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
                  {categories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thương hiệu</label>
                <select
                  className="input"
                  value={normalizeBrandKey(form.categoryKey, form.brand)}
                  onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))}
                  required
                >
                  <option value="">Chọn thương hiệu</option>
                  {brandOptions.map((brand) => (
                    <option key={brand.key} value={brand.key}>
                      {brand.label}
                    </option>
                  ))}
                </select>
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
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium mb-1">Giá cũ hiển thị</label>
                  <p className="text-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                    {editingSnapshot?.oldPrice != null
                      ? `${Number(editingSnapshot.oldPrice).toLocaleString('vi-VN')} đ`
                      : 'Chưa có'}
                  </p>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                    Tự lưu giá trước khi đổi khi bạn giảm giá bán. Không nhập tay.
                  </p>
                </div>
              )}
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
          <div className="admin-products-search" style={{ marginBottom: 12, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              className="input"
              style={{ paddingLeft: 34, width: '100%' }}
              placeholder="Tìm tên, thương hiệu, danh mục..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          {loading ? (
            <p className="admin-empty">Đang tải dữ liệu...</p>
          ) : (
            <div>
              {filteredItems.map((item) => (
                <div key={item._id} className="admin-product-row">
                  <img
                    src={item.image || 'https://via.placeholder.com/52x52.png?text=P'}
                    alt={item.name}
                  />
                  <div className="admin-list-row-meta">
                    <strong>{item.name}</strong>
                    <p>
                      {item.category?.label}
                      {item.brand ? ` · ${getBrandLabel(item.category?.key, item.brand)}` : ''} ·{' '}
                      {item.price?.toLocaleString('vi-VN')} đ · Tồn: {item.stock}
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
              {filteredItems.length === 0 && !loading && (
                <p className="admin-empty">
                  {searchQuery.trim() ? 'Không tìm thấy sản phẩm phù hợp.' : 'Chưa có sản phẩm.'}
                </p>
              )}
              {items.length > 0 && searchQuery.trim() && filteredItems.length > 0 && (
                <p className="text-muted" style={{ marginTop: 8, fontSize: 13 }}>
                  Hiển thị {filteredItems.length}/{items.length} sản phẩm
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
