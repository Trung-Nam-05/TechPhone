import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DEFAULT_FORM = {
  name: '',
  productId: '',
  flashPrice: '',
  startsAt: '',
  endsAt: '',
  quota: 50,
  maxPerOrderQty: 2,
  isEnabled: true,
};

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function AdminFlashSales() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const isEditing = Boolean(editingId);

  const productOptions = useMemo(
    () => products.map((item) => ({ id: item._id, name: item.name, price: item.price })),
    [products],
  );

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...DEFAULT_FORM,
      productId: productOptions[0]?.id || '',
    });
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesPayload, productsPayload] = await Promise.all([
        authFetch('/api/admin/flash-sales'),
        authFetch('/api/admin/products'),
      ]);
      const nextProducts = productsPayload.items || [];
      setProducts(nextProducts);
      setItems(salesPayload.items || []);
      setForm((prev) => ({
        ...prev,
        productId: prev.productId || nextProducts[0]?._id || '',
      }));
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      const payload = {
        name: form.name,
        productId: form.productId,
        flashPrice: Number(form.flashPrice),
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        quota: Number(form.quota),
        maxPerOrderQty: Number(form.maxPerOrderQty),
        isEnabled: Boolean(form.isEnabled),
      };

      if (isEditing) {
        const updated = await authFetch(`/api/admin/flash-sales/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setItems((prev) => prev.map((item) => (item._id === editingId ? updated : item)));
      } else {
        const created = await authFetch('/api/admin/flash-sales', {
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

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || '',
      productId: item.product?._id || item.product || '',
      flashPrice: item.flashPrice ?? '',
      startsAt: toDateTimeLocalValue(item.startsAt),
      endsAt: toDateTimeLocalValue(item.endsAt),
      quota: item.quota ?? 50,
      maxPerOrderQty: item.maxPerOrderQty ?? 2,
      isEnabled: Boolean(item.isEnabled),
    });
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Ban chac chan muon xoa flash sale nay?');
    if (!confirmed) return;
    try {
      await authFetch(`/api/admin/flash-sales/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item._id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 30, marginBottom: 12 }}>Quan ly Flash Sale</h1>
      <p className="text-muted" style={{ marginBottom: 14 }}>
        Tao campaign giam gia theo khung gio va quota, he thong se check theo server time.
      </p>

      {error && (
        <div className="card" style={{ padding: 12, marginBottom: 14, borderColor: '#fca5a5' }}>
          <p style={{ color: '#dc2626' }}>{error}</p>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '380px 1fr', gap: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <h2 style={{ fontSize: 20, marginBottom: 10 }}>
            {isEditing ? 'Cap nhat Flash Sale' : 'Tao Flash Sale moi'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Ten campaign</label>
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">San pham</label>
              <select
                className="input"
                value={form.productId}
                onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
                required
              >
                {productOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({Number(item.price || 0).toLocaleString('vi-VN')} đ)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Gia Flash</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={form.flashPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, flashPrice: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quota</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  value={form.quota}
                  onChange={(event) => setForm((prev) => ({ ...prev, quota: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bat dau</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.startsAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ket thuc</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.endsAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Max moi don</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  value={form.maxPerOrderQty}
                  onChange={(event) => setForm((prev) => ({ ...prev, maxPerOrderQty: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trang thai</label>
                <select
                  className="input"
                  value={String(form.isEnabled)}
                  onChange={(event) => setForm((prev) => ({ ...prev, isEnabled: event.target.value === 'true' }))}
                >
                  <option value="true">Bat</option>
                  <option value="false">Tat</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {isEditing ? 'Luu thay doi' : 'Tao flash sale'}
              </button>
              {isEditing && (
                <button type="button" className="btn btn-outline" onClick={resetForm}>
                  Huy
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card" style={{ padding: 12 }}>
          {loading ? (
            <p className="text-muted">Dang tai Flash Sale...</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {items.map((item) => (
                <article key={item._id} className="card" style={{ padding: 10, border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong>{item.name}</strong>
                    <span className="text-sm text-muted">{item.status || 'unknown'}</span>
                  </div>
                  <p className="text-sm" style={{ marginBottom: 4 }}>
                    {item.product?.name || 'Unknown product'}
                  </p>
                  <p className="text-sm text-muted">
                    Gia flash: {Number(item.flashPrice || 0).toLocaleString('vi-VN')} đ | Quota:{' '}
                    {item.soldCount || 0}/{item.quota || 0}
                  </p>
                  <p className="text-sm text-muted">
                    {item.startsAt ? new Date(item.startsAt).toLocaleString('vi-VN') : '-'} -{' '}
                    {item.endsAt ? new Date(item.endsAt).toLocaleString('vi-VN') : '-'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button className="btn btn-outline" onClick={() => handleEdit(item)}>
                      Sua
                    </button>
                    <button className="btn btn-outline" onClick={() => handleDelete(item._id)}>
                      Xoa
                    </button>
                  </div>
                </article>
              ))}
              {items.length === 0 && <p className="text-muted">Chua co campaign flash sale.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
