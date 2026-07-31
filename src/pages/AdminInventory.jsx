import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminPageHeader from '../components/admin/AdminPageHeader';

export default function AdminInventory() {
  const { authFetch } = useAuth();
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    delta: '',
    note: '',
  });

  const selectedProduct = useMemo(
    () => products.find((item) => item._id === form.productId) || null,
    [products, form.productId],
  );

  const loadData = async (keepProductId = form.productId) => {
    setLoading(true);
    setError(null);
    try {
      const [movementsPayload, productsPayload] = await Promise.all([
        authFetch('/api/admin/inventory/movements?limit=100'),
        authFetch('/api/admin/products'),
      ]);
      const productItems = productsPayload.items || [];
      setMovements(movementsPayload.items || []);
      setProducts(productItems);

      setForm((prev) => {
        const stillExists = productItems.some((item) => item._id === keepProductId);
        if (stillExists) return { ...prev, productId: keepProductId };
        if (productItems.length === 0) return { ...prev, productId: '' };
        return { ...prev, productId: productItems[0]._id };
      });
    } catch (err) {
      setError(err.message || 'Không tải được dữ liệu tồn kho.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdjust = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const delta = Number(form.delta);
    if (!form.productId) {
      setError('Vui lòng chọn sản phẩm.');
      return;
    }
    if (!Number.isFinite(delta) || delta === 0) {
      setError('Số lượng điều chỉnh phải khác 0 (vd: 5 hoặc -3).');
      return;
    }

    setSaving(true);
    try {
      const updated = await authFetch('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: form.productId,
          delta,
          note: form.note,
        }),
      });
      setForm((prev) => ({ ...prev, delta: '', note: '' }));
      setSuccess(
        `Đã cập nhật tồn kho: ${updated?.name || 'sản phẩm'} → ${updated?.stock ?? '—'} sản phẩm.`,
      );
      await loadData(form.productId);
    } catch (err) {
      setError(err.message || 'Điều chỉnh tồn kho thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Quản lý tồn kho"
        subtitle="Điều chỉnh số lượng tồn và theo dõi lịch sử biến động kho."
      />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      <div className="admin-split-layout">
        <div className="admin-panel" style={{ height: 'fit-content' }}>
          <h2 className="admin-panel-title">Điều chỉnh tồn kho</h2>
          {loading && products.length === 0 ? (
            <p className="admin-empty">Đang tải sản phẩm...</p>
          ) : products.length === 0 ? (
            <p className="admin-empty">Chưa có sản phẩm để điều chỉnh tồn kho.</p>
          ) : (
            <form onSubmit={handleAdjust}>
              <div className="admin-form-group">
                <label>Sản phẩm</label>
                <select
                  className="input"
                  value={form.productId}
                  onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
                  required
                >
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} (tồn: {product.stock})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="admin-form-group">
                  <label>Tồn hiện tại</label>
                  <p className="text-muted" style={{ margin: 0 }}>
                    {selectedProduct.stock} sản phẩm
                  </p>
                </div>
              )}

              <div className="admin-form-group">
                <label>Số lượng điều chỉnh (+/-)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Ví dụ: 10 hoặc -5"
                  value={form.delta}
                  onChange={(event) => setForm((prev) => ({ ...prev, delta: event.target.value }))}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>Ghi chú</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="VD: Nhập thêm hàng từ NCC"
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang cập nhật...' : 'Cập nhật tồn kho'}
              </button>
            </form>
          )}
        </div>

        <div className="admin-panel">
          <h2 className="admin-panel-title">Lịch sử biến động</h2>
          {loading ? (
            <p className="admin-empty">Đang tải lịch sử...</p>
          ) : (
            <div className="admin-list">
              {movements.map((item) => (
                <div key={item._id} className="admin-list-row" style={{ alignItems: 'flex-start' }}>
                  <div className="admin-list-row-meta">
                    <strong>{item.product?.name || 'Sản phẩm đã xóa'}</strong>
                    <p>
                      {item.type} · {item.quantity > 0 ? '+' : ''}
                      {item.quantity} · {item.previousStock} → {item.nextStock}
                    </p>
                    <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                      {item.note ? ` · ${item.note}` : ''}
                    </p>
                  </div>
                </div>
              ))}
              {movements.length === 0 && <p className="admin-empty">Chưa có lịch sử tồn kho.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
