import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import { productMatchesQuery } from '../utils/adminSearch';

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

const NOTE_MAX_LENGTH = 500;
const LARGE_CHANGE_RATIO = 0.3;

function parseFormPrice(raw) {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default function AdminPrices() {
  const { authFetch } = useAuth();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    productId: '',
    newPrice: '',
    note: '',
  });

  const selectedProduct = useMemo(
    () => products.find((item) => item._id === form.productId) || null,
    [products, form.productId],
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return products;
    return products.filter((item) => productMatchesQuery(item, q));
  }, [products, searchQuery]);

  const productOptions = useMemo(() => {
    const selected = products.find((item) => item._id === form.productId);
    if (!selected || filteredProducts.some((item) => item._id === selected._id)) {
      return filteredProducts;
    }
    return [selected, ...filteredProducts];
  }, [products, filteredProducts, form.productId]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setError(null);
    try {
      const productsPayload = await authFetch('/api/admin/products');
      setProducts(productsPayload.items || []);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách sản phẩm.');
    } finally {
      setProductsLoading(false);
    }
  }, [authFetch]);

  const loadHistory = useCallback(
    async (productId) => {
      if (!productId) {
        setHistory([]);
        setMeta(null);
        return;
      }

      setHistoryLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({ days: '365', limit: '300', productId });
        const historyPayload = await authFetch(`/api/admin/prices/history?${query.toString()}`);
        setHistory(historyPayload.items || []);
        setMeta(historyPayload.meta || null);
      } catch (err) {
        setHistory([]);
        setMeta(null);
        setError(err.message || 'Không tải được lịch sử giá.');
      } finally {
        setHistoryLoading(false);
      }
    },
    [authFetch],
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const q = searchParams.get('q')?.trim() || '';
    if (q) setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    if (productsLoading || products.length === 0) return;

    const q = searchParams.get('q')?.trim() || searchQuery.trim();
    if (!q || form.productId) return;

    const match = products.find((item) => productMatchesQuery(item, q));
    if (match) {
      setForm((prev) => ({
        ...prev,
        productId: match._id,
        newPrice: String(match.price ?? ''),
      }));
    }
  }, [products, productsLoading, searchParams, searchQuery, form.productId]);

  useEffect(() => {
    loadHistory(form.productId);
  }, [form.productId, loadHistory]);

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

    const newPrice = parseFormPrice(form.newPrice);
    if (!form.productId) {
      setError('Vui lòng chọn sản phẩm.');
      return;
    }
    if (newPrice === null) {
      setError('Giá mới phải là số nguyên VND lớn hơn 0.');
      return;
    }
    if (selectedProduct && Number(selectedProduct.price) === newPrice) {
      setError('Giá mới phải khác giá hiện tại.');
      return;
    }

    const currentPrice = Number(selectedProduct?.price || 0);
    if (currentPrice > 0) {
      const changeRatio = Math.abs(newPrice - currentPrice) / currentPrice;
      if (changeRatio > LARGE_CHANGE_RATIO) {
        const direction = newPrice < currentPrice ? 'giảm' : 'tăng';
        const percent = (changeRatio * 100).toFixed(1);
        const ok = window.confirm(
          `Giá sẽ ${direction} ${percent}% (${formatVnd(currentPrice)} → ${formatVnd(newPrice)}). Bạn có chắc muốn tiếp tục?`,
        );
        if (!ok) return;
      }
    }

    setSaving(true);
    try {
      const payload = await authFetch('/api/admin/prices/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: form.productId,
          newPrice,
          note: form.note.trim().slice(0, NOTE_MAX_LENGTH),
        }),
      });
      setForm((prev) => ({ ...prev, note: '', newPrice: String(newPrice) }));
      setProducts((prev) =>
        prev.map((item) =>
          item._id === form.productId
            ? {
                ...item,
                price: newPrice,
                oldPrice: payload?.product?.oldPrice ?? null,
                discount: payload?.product?.discount ?? item.discount,
              }
            : item,
        ),
      );
      const warning = payload?.warning ? ` ${payload.warning}` : '';
      setSuccess(
        `Đã đổi giá ${payload?.product?.name || 'sản phẩm'}: ${formatVnd(payload?.history?.oldPrice)} → ${formatVnd(newPrice)}.${warning}`,
      );
      await loadHistory(form.productId);
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
        subtitle="Chọn sản phẩm để xem lịch sử thay đổi giá trong 12 tháng và điều chỉnh giá bán."
      />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      <div className="admin-products-search" style={{ marginBottom: 16, position: 'relative', maxWidth: 420 }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
        />
        <input
          type="search"
          className="input"
          style={{ paddingLeft: 34 }}
          placeholder="Tìm sản phẩm theo tên, thương hiệu, danh mục..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <div className="admin-split-layout">
        <div className="admin-panel" style={{ height: 'fit-content' }}>
          <h2 className="admin-panel-title">Điều chỉnh giá bán</h2>
          {productsLoading ? (
            <p className="admin-empty">Đang tải sản phẩm...</p>
          ) : products.length === 0 ? (
            <p className="admin-empty">Chưa có sản phẩm để điều chỉnh giá.</p>
          ) : productOptions.length === 0 ? (
            <p className="admin-empty">Không tìm thấy sản phẩm phù hợp.</p>
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
                  <option value="">— Chọn sản phẩm —</option>
                  {productOptions.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} — {formatVnd(product.price)}
                    </option>
                  ))}
                </select>
                {searchQuery.trim() && (
                  <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                    {filteredProducts.length}/{products.length} sản phẩm khớp tìm kiếm
                  </p>
                )}
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
                  {selectedProduct.isActive === false && (
                    <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13, color: '#b45309' }}>
                      Sản phẩm đang tắt hiển thị — vẫn có thể đổi giá.
                    </p>
                  )}
                </div>
              )}

              <div className="admin-form-group">
                <label>Giá mới</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  step={1000}
                  value={form.newPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, newPrice: event.target.value }))}
                  disabled={!form.productId}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Ghi chú</label>
                <textarea
                  className="input"
                  rows={3}
                  maxLength={NOTE_MAX_LENGTH}
                  placeholder="VD: Giảm giá đợt khuyến mãi tháng 7"
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                  disabled={!form.productId}
                />
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                  {form.note.length}/{NOTE_MAX_LENGTH} ký tự
                </p>
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving || !form.productId}>
                {saving ? 'Đang cập nhật...' : 'Cập nhật giá & ghi lịch sử'}
              </button>
            </form>
          )}
        </div>

        <div className="admin-panel">
          <h2 className="admin-panel-title" style={{ margin: 0, marginBottom: 12 }}>
            Lịch sử giá (1 năm)
            {selectedProduct ? `: ${selectedProduct.name}` : ''}
          </h2>

          {!form.productId ? (
            <p className="admin-empty">Chọn sản phẩm bên trái để xem lịch sử thay đổi giá.</p>
          ) : historyLoading ? (
            <p className="admin-empty">Đang tải lịch sử giá...</p>
          ) : (
            <>
              {meta && (
                <p className="text-muted" style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>
                  Từ {new Date(meta.since).toLocaleDateString('vi-VN')} · {meta.count} bản ghi
                </p>
              )}

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
                        <p style={{ margin: '0 0 6px' }}>
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
                    Sản phẩm này chưa có thay đổi giá trong 12 tháng qua.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
