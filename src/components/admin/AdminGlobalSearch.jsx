import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminGlobalSearch.css';

function ResultGroup({ title, items, onPick }) {
  if (!items?.length) return null;
  return (
    <div className="admin-global-search-group">
      <p className="admin-global-search-group-title">{title}</p>
      {items.map((item) => (
        <button
          key={`${title}-${item.id}`}
          type="button"
          className="admin-global-search-item"
          onClick={() => onPick(item.href)}
        >
          <strong>{item.label}</strong>
          {item.meta && <span>{item.meta}</span>}
        </button>
      ))}
    </div>
  );
}

export default function AdminGlobalSearch() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({ orders: [], products: [], users: [] });

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults({ orders: [], products: [], users: [] });
      setError(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const payload = await authFetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
        setResults({
          orders: payload.orders || [],
          products: payload.products || [],
          users: payload.users || [],
        });
        setOpen(true);
      } catch (err) {
        setError(err.message || 'Không tìm được kết quả.');
        setResults({ orders: [], products: [], users: [] });
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, authFetch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasResults =
    results.orders.length > 0 || results.products.length > 0 || results.users.length > 0;

  const goTo = (href) => {
    setOpen(false);
    setQuery('');
    navigate(href);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (results.orders.length === 1 && !results.products.length && !results.users.length) {
      goTo(results.orders[0].href);
      return;
    }
    goTo(`/admin/orders?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="admin-global-search" ref={wrapRef}>
      <form className="admin-topbar-search" onSubmit={handleSubmit}>
        <Search size={18} />
        <input
          type="search"
          placeholder="Tìm đơn, sản phẩm, khách hàng..."
          aria-label="Tìm kiếm admin"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
        />
      </form>

      {open && query.trim().length >= 2 && (
        <div className="admin-global-search-panel">
          {loading && <p className="admin-global-search-hint">Đang tìm...</p>}
          {!loading && error && <p className="admin-global-search-error">{error}</p>}
          {!loading && !error && !hasResults && (
            <p className="admin-global-search-hint">Không có kết quả cho &quot;{query.trim()}&quot;</p>
          )}
          {!loading && !error && hasResults && (
            <>
              <ResultGroup title="Đơn hàng" items={results.orders} onPick={goTo} />
              <ResultGroup title="Sản phẩm" items={results.products} onPick={goTo} />
              <ResultGroup title="Khách hàng" items={results.users} onPick={goTo} />
            </>
          )}
          {!loading && query.trim().length >= 2 && (
            <button type="button" className="admin-global-search-all" onClick={() => goTo(`/admin/orders?q=${encodeURIComponent(query.trim())}`)}>
              Xem tất cả đơn khớp &quot;{query.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
