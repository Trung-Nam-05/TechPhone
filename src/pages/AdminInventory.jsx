import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminPageHeader from '../components/admin/AdminPageHeader';

export default function AdminInventory() {
  const { authFetch } = useAuth();
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    productId: '',
    delta: 0,
    note: '',
  });

  const loadData = async () => {
    setError(null);
    try {
      const [movementsPayload, productsPayload] = await Promise.all([
        authFetch('/api/admin/inventory/movements?limit=100'),
        authFetch('/api/admin/products'),
      ]);
      setMovements(movementsPayload.items || []);
      setProducts(productsPayload.items || []);
      if (!form.productId && (productsPayload.items || []).length > 0) {
        setForm((prev) => ({ ...prev, productId: productsPayload.items[0]._id }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdjust = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await authFetch('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: form.productId,
          delta: Number(form.delta),
          note: form.note,
        }),
      });
      setForm((prev) => ({ ...prev, delta: 0, note: '' }));
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Quản lý tồn kho"
        subtitle="Điều chỉnh số lượng tồn và theo dõi lịch sử biến động kho."
      />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-split-layout">
        <div className="admin-panel">
          <h2 className="admin-panel-title">Điều chỉnh tồn kho</h2>
          <form onSubmit={handleAdjust}>
            <div className="admin-form-group">
              <label>Sản phẩm</label>
              <select
                className="input"
                value={form.productId}
                onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
              >
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} (tồn: {product.stock})
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-form-group">
              <label>Số lượng điều chỉnh (+/-)</label>
              <input
                type="number"
                className="input"
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
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Cập nhật tồn kho
            </button>
          </form>
        </div>

        <div className="admin-panel">
          <h2 className="admin-panel-title">Lịch sử biến động</h2>
          <div className="admin-list">
            {movements.map((item) => (
              <div key={item._id} className="admin-list-row" style={{ alignItems: 'flex-start' }}>
                <div className="admin-list-row-meta">
                  <strong>{item.product?.name || item.product}</strong>
                  <p>
                    {item.type} · {item.quantity > 0 ? '+' : ''}
                    {item.quantity} · {item.previousStock} → {item.nextStock}
                  </p>
                  <p>{new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                </div>
              </div>
            ))}
            {movements.length === 0 && <p className="admin-empty">Chưa có lịch sử tồn kho.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
