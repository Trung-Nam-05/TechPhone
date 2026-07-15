import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './ProductSearchInput.css';

function formatPrice(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

export default function ProductSearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Tìm sản phẩm...',
  className = '',
  inputClassName = '',
  showButton = true,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const query = String(value || '').trim();
    if (query.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/products/suggest?q=${encodeURIComponent(query)}&limit=8`,
          { headers: { Accept: 'application/json' } },
        );
        if (!response.ok) throw new Error('suggest failed');
        const payload = await response.json();
        setSuggestions(payload.items || []);
        setOpen((payload.items || []).length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    setOpen(false);
    onSubmit?.(String(value || '').trim());
  };

  const handlePick = (name) => {
    onChange?.(name);
    setOpen(false);
    onSubmit?.(name);
  };

  return (
    <div className={`product-search-input ${className}`} ref={wrapRef}>
      <form onSubmit={handleSubmit} className={inputClassName || 'product-search-form'}>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {showButton && (
          <button type="submit" aria-label="Tìm kiếm">
            <Search size={16} />
          </button>
        )}
      </form>

      {open && (
        <div className="product-search-suggest">
          {loading && <p className="product-search-suggest-empty">Đang gợi ý...</p>}
          {!loading && suggestions.length === 0 && (
            <p className="product-search-suggest-empty">Không có gợi ý phù hợp</p>
          )}
          {!loading &&
            suggestions.map((item) => (
              <button
                key={item._id || item.slug}
                type="button"
                className="product-search-suggest-item"
                onClick={() => handlePick(item.name)}
              >
                <img src={item.image} alt="" />
                <div>
                  <strong>{item.name}</strong>
                  <span>{formatPrice(item.price)} đ</span>
                </div>
              </button>
            ))}
          {!loading && suggestions.length > 0 && (
            <Link
              to={`/products?search=${encodeURIComponent(String(value || '').trim())}`}
              className="product-search-suggest-more"
              onClick={() => setOpen(false)}
            >
              Xem tất cả kết quả cho &quot;{value}&quot;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
