import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { formatCountdown, getFlashSaleState } from '../utils/flashSale';

export default function ProductCard({ product, nowMs }) {
  const { addToCart } = useCart();
  const { t, formatPrice } = useI18n();
  const clock = typeof nowMs === 'number' ? nowMs : 0;
  const flashState = getFlashSaleState(product.flashSale, clock);
  const showFlash = flashState === 'active' || flashState === 'upcoming';

  const catKey = product.category ? `categories.${product.category}` : 'categories.fallback';
  const catResolved = t(catKey);
  const categoryLabel = catResolved !== catKey ? catResolved : t('categories.fallback');

  const handleAddToCart = (e) => {
    e.preventDefault(); // Prevent navigating to detail page if button is inside a link wrapper
    addToCart(product);
  };

  return (
    <div className="card relative flex flex-col h-full group">
      {product.discount && (
        <div className="absolute top-2 right-2 z-10">
          <span className="badge">-{product.discount}%</span>
        </div>
      )}
      {showFlash && (
        <div className="absolute top-2 left-2 z-10">
          <span className="badge">
            {flashState === 'active'
              ? `${t('productCard.flashSale')} ${formatCountdown(product.flashSale?.endsAt, clock)}`
              : `${t('productCard.saleStartsIn')} ${formatCountdown(product.flashSale?.startsAt, clock)}`}
          </span>
        </div>
      )}

      <Link
        to={`/product/${product.id || product.legacyId || product._id}`}
        className="block overflow-hidden bg-subtle aspect-square relative p-4 flex items-center justify-center"
      >
        <img
          src={product.image || 'https://via.placeholder.com/300x300.png?text=TechPhone'}
          alt={product.name}
          className="object-contain h-full w-full transition duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="p-4 flex flex-col flex-grow">
        <p className="text-muted text-sm mb-1">{categoryLabel}</p>
        <Link to={`/product/${product.id || product.legacyId || product._id}`}>
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 min-h-[40px] hover:text-primary transition">{product.name}</h3>
        </Link>
        <div className="mt-auto flex flex-col gap-1 mb-4">
          <span className="font-bold text-lg text-primary">{formatPrice(product.price)}</span>
          {product.oldPrice && (
            <span className="text-sm text-text-muted line-through">{formatPrice(product.oldPrice)}</span>
          )}
          {product.flashSale && (
            <span className="text-xs text-muted">
              {t('productCard.remaining', { n: Math.max(Number(product.flashSale.remainingQuantity || 0), 0) })}
            </span>
          )}
        </div>
        <button
          type="button"
          data-testid="add-to-cart"
          onClick={handleAddToCart}
          className="btn btn-outline w-full hover:btn-primary text-sm font-semibold"
        >
          {t('productCard.addToCart')}
        </button>
      </div>
    </div>
  );
}
