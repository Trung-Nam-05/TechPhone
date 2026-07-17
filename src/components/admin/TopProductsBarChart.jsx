export default function TopProductsBarChart({ products, formatMoney, loading = false }) {
  const items = products || [];
  const maxQty = Math.max(1, ...items.map((p) => p.quantitySold || 0));

  if (loading) {
    return (
      <div className="admin-top-products-chart">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="admin-top-products-bar-row">
            <span className="admin-skeleton admin-skeleton-rank" />
            <div className="admin-top-products-bar-meta">
              <span className="admin-skeleton admin-skeleton-line" />
              <span className="admin-skeleton admin-skeleton-track" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="admin-chart-empty">Chưa có dữ liệu bán hàng.</p>;
  }

  return (
    <div className="admin-top-products-chart">
      {items.map((item, index) => (
        <div key={item.productId || index} className="admin-top-products-bar-row">
          <span className="admin-top-products-rank">{index + 1}</span>
          <div className="admin-top-products-bar-meta">
            <span className="admin-top-products-name" title={item.name}>
              {item.name || 'Sản phẩm'}
            </span>
            <div className="admin-top-products-track">
              <div
                className="admin-top-products-fill"
                style={{ width: `${((item.quantitySold || 0) / maxQty) * 100}%` }}
              />
            </div>
          </div>
          <span className="admin-top-products-qty">{item.quantitySold} sp</span>
          <span className="admin-top-products-revenue">{formatMoney(item.revenue)}</span>
        </div>
      ))}
    </div>
  );
}
