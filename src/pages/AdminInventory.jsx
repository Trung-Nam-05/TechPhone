import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
    <div>
      <h1 style={{ fontSize: 30, marginBottom: 12 }}>Quan ly ton kho</h1>
      {error && <p style={{ color: '#dc2626', marginBottom: 10 }}>{error}</p>}
      <div className="grid" style={{ gridTemplateColumns: '360px 1fr', gap: 14 }}>
        <div className="card" style={{ padding: 12 }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Dieu chinh ton kho</h2>
          <form onSubmit={handleAdjust}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">San pham</label>
              <select
                className="input"
                value={form.productId}
                onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
              >
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} (ton: {product.stock})
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">So luong dieu chinh (+/-)</label>
              <input
                type="number"
                className="input"
                value={form.delta}
                onChange={(event) => setForm((prev) => ({ ...prev, delta: event.target.value }))}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Ghi chu</label>
              <textarea
                className="input"
                rows={3}
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Cap nhat ton kho
            </button>
          </form>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Inventory movements</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {movements.map((item) => (
              <div key={item._id} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
                <strong>{item.product?.name || item.product}</strong>
                <p className="text-sm text-muted">
                  {item.type} | {item.quantity > 0 ? '+' : ''}
                  {item.quantity} | {item.previousStock}{' -> '}{item.nextStock}
                </p>
                <p className="text-sm text-muted">{new Date(item.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            ))}
            {movements.length === 0 && <p className="text-muted">Chưa có lịch sử tồn kho.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
