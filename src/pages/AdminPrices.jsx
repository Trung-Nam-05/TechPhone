import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminPageHeader from '../components/admin/AdminPageHeader';

function formatVnd(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString('vi-VN')} đ`;
}

function formatDelta(delta) {
  const n = Number(delta || 0);
  if (!n) return '0 đ';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString('vi-VN')} đ`;
}

export default function AdminPrices() {
  const { authFetch } = useAuth();
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterProductId, setFilterProductId] = useState('');
  const [form, setForm] = useState({
    productId: '',
    newPrice: '',
    note: '',
  });

  const selectedProduct = useMemo(
    () => products.find((item) => item._id === form.productId) || null,
    [products, form.productId],
  );

  const loadData = async (productId = filterProductId, preferredFormProductId = form.productId) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ days: '365', limit: '300' });
      if (productId) query.set('productId', productId);

      const [historyPayload, productsPayload] = await Promise.all([
        authFetch(`/api/admin/prices/history?${query.toString()}`),
        authFetch('/api/admin/products'),
      ]);

      const productItems = productsPayload.items || [];
      setHistory(historyPayload.items || []);
      setMeta(historyPayload.meta || null);
      setProducts(productItems);

      setForm((prev) => {
        const keepId =
          preferredFormProductId && productItems.some((item) => item._id === preferredFormProductId)
            ? preferredFormProductId
            : prev.productId && productItems.some((item) => item._id === prev.productId)
              ? prev.productId
              : productItems[0]?._id || '';
        const product = productItems.find((item) => item._id === keepId);
        return {
          ...prev,
          productId: keepId,
          newPrice: product ? String(product.price ?? '') : prev.newPrice,
        };
      });
    } catch (err) {
      setError(err.message || 'Không tải được dữ liệu giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData('', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = async (productId) => {
    setFilterProductId(productId);
    await loadData(productId, form.productId);
  };

  const handleProductSelect = (productId) => {
    const product = products.find((item) => item._id === productId);
    setForm((prev) => ({
      ...prev,
      productId,
      newPrice: product ? String(product.price ?? '') : '',
    }));
  };

  const handleAdjust = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const newPrice = Number(form.newPrice);
    if (!form.productId) {
      setError('Vui lòng chọn sản phẩm.');
      return;
    }
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      setError('Giá mới không hợp lệ.');
      return;
    }
    if (selectedProduct && Number(selectedProduct.price) === newPrice) {
      setError('Giá mới phải khác giá hiện tại.');
      return;
    }

    setSaving(true);
    try {
      const payload = await authFetch('/api/admin/prices/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: form.productId,
          newPrice,
          note: form.note,
        }),
      });
      setForm((prev) => ({ ...prev, note: '', newPrice: String(newPrice) }));
      setSuccess(
        `Đã đổi giá ${payload?.product?.name || 'sản phẩm'}: ${formatVnd(payload?.history?.oldPrice)} → ${formatVnd(newPrice)}.`,
      );
      await loadData(filterProductId, form.productId);
    } catch (err) {
      setError(err.message || 'Cập nhật giá thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Quản lý giá"
        subtitle="Theo dõi giá cũ → giá mới trong 12 tháng gần nhất. Đổi giá sẽ tự lưu lịch sử."
      />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      <div className="admin-split-layout">
        <div className="admin-panel" style={{ height: 'fit-content' }}>
          <h2 className="admin-panel-title">Điều chỉnh giá bán</h2>
          {loading && products.length === 0 ? (
            <p className="admin-empty">Đang tải sản phẩm...</p>
          ) : products.length === 0 ? (
            <p className="admin-empty">Chưa có sản phẩm để điều chỉnh giá.</p>
          ) : (
            <form onSubmit={handleAdjust}>
              <div className="admin-form-group">
                <label>Sản phẩm</label>
                <select
                  className="input"
                  value={form.productId}
                  onChange={(event) => handleProductSelect(event.target.value)}
                  required
                >
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} — {formatVnd(product.price)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="admin-form-group">
                  <label>Giá hiện tại</label>
                  <p className="text-muted" style={{ margin: 0 }}>
                    {formatVnd(selectedProduct.price)}
                    {selectedProduct.oldPrice != null && (
                      <span> · Giá cũ hiển thị: {formatVnd(selectedProduct.oldPrice)}</span>
                    )}
                  </p>
                </div>
              )}

              <div className="admin-form-group">
                <label>Giá mới</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  step={1000}
                  value={form.newPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, newPrice: event.target.value }))}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Ghi chú</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="VD: Giảm giá đợt khuyến mãi tháng 7"
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang cập nhật...' : 'Cập nhật giá & ghi lịch sử'}
              </button>
            </form>
          )}
        </div>

        <div className="admin-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <h2 className="admin-panel-title" style={{ margin: 0 }}>
              Lịch sử giá (1 năm)
            </h2>
            <select
              className="input"
              style={{ maxWidth: 280 }}
              value={filterProductId}
              onChange={(event) => handleFilterChange(event.target.value)}
            >
              <option value="">Tất cả sản phẩm</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {meta && (
            <p className="text-muted" style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>
              Từ {new Date(meta.since).toLocaleDateString('vi-VN')} · {meta.count} bản ghi (tối đa 300)
            </p>
          )}

          {loading ? (
            <p className="admin-empty">Đang tải lịch sử giá...</p>
          ) : (
            <div className="admin-list">
              {history.map((item) => {
                const percent =
                  item.oldPrice != null && Number(item.oldPrice) > 0
                    ? (((Number(item.newPrice) - Number(item.oldPrice)) / Number(item.oldPrice)) * 100).toFixed(1)
                    : null;
                const up = Number(item.delta) > 0;
                const down = Number(item.delta) < 0;

                return (
                  <div key={item._id} className="admin-list-row" style={{ alignItems: 'flex-start' }}>
                    <div className="admin-list-row-meta" style={{ width: '100%' }}>
                      <strong>{item.product?.name || item.productName || 'Sản phẩm đã xóa'}</strong>
                      <p style={{ margin: '6px 0' }}>
                        <span style={{ textDecoration: item.oldPrice != null ? 'line-through' : 'none', opacity: 0.7 }}>
                          {formatVnd(item.oldPrice)}
                        </span>
                        {' → '}
                        <strong>{formatVnd(item.newPrice)}</strong>
                        {' · '}
                        <span style={{ color: up ? '#b45309' : down ? '#15803d' : undefined }}>
                          {formatDelta(item.delta)}
                          {percent != null ? ` (${up ? '+' : ''}${percent}%)` : ''}
                        </span>
                      </p>
                      <p style={{ margin: 0, fontSize: 13 }} className="text-muted">
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                        {item.actor?.name ? ` · ${item.actor.name}` : ''}
                        {item.source ? ` · ${item.source}` : ''}
                        {item.note ? ` · ${item.note}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              {history.length === 0 && (
                <p className="admin-empty">
                  Chưa có thay đổi giá trong 12 tháng. Hãy điều chỉnh giá bên trái hoặc sửa giá ở trang Sản phẩm.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
