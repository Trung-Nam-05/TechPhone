import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { getProductPath } from '../utils/productUrl';
import { getRecentlyViewedProducts, subscribeRecentlyViewed } from '../utils/recentlyViewed';
import './RecentlyViewedSection.css';

export default function RecentlyViewedSection({ limit = 4, className = '' }) {
  const { t, formatPrice } = useI18n();
  const items = useSyncExternalStore(
    subscribeRecentlyViewed,
    () => getRecentlyViewedProducts(limit),
    () => [],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <section className={`tp-recently-viewed ${className}`.trim()}>
      <div className="tp-recently-viewed-head">
        <h2>{t('cart.viewedTitle')}</h2>
        <Link to="/products">{t('cart.viewMore')}</Link>
      </div>
      <div className="tp-recently-viewed-list">
        {items.map((item) => (
          <Link key={item.key} to={getProductPath(item)} className="tp-recently-viewed-card">
            <div className="tp-recently-viewed-thumb">
              <img
                src={item.image || 'https://via.placeholder.com/120x120.png?text=TechPhone'}
                alt={item.name}
                loading="lazy"
              />
            </div>
            <div className="tp-recently-viewed-body">
              <h4>{item.name}</h4>
              <p>
                <strong>{formatPrice(item.price)}</strong>
                {item.oldPrice ? <span>{formatPrice(item.oldPrice)}</span> : null}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
