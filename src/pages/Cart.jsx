import { ShoppingCart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import RecentlyViewedSection from '../components/RecentlyViewedSection';
import './Cart.css';

export default function Cart() {
  const { cartItems, cartTotal, updateQuantity, removeFromCart } = useCart();
  const { t, formatPrice } = useI18n();
  const shippingFee = cartItems.length > 0 ? 30000 : 0;
  const grandTotal = cartTotal + shippingFee;

  return (
    <div className="container tp-cart-page">
      {cartItems.length === 0 ? (
        <section className="tp-cart-empty">
          <div>
            <h1>{t('cart.emptyTitle')}</h1>
            <p>{t('cart.emptyDesc')}</p>
            <Link className="btn btn-primary" to="/products?category=dien-thoai">
              {t('cart.shopNow')}
            </Link>
          </div>
          <div className="tp-cart-empty-icon">
            <ShoppingCart size={68} />
          </div>
        </section>
      ) : (
        <section className="tp-cart-content">
          <div className="tp-cart-items">
            <h1>{t('cart.title')}</h1>
            {cartItems.map((item) => (
              <article key={item.id} className="tp-cart-item">
                <img src={item.image} alt={item.name} />
                <div>
                  <h3>{item.name}</h3>
                  <p className="tp-cart-price">{formatPrice(item.price)}</p>
                  <div className="tp-cart-quantity">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <button className="tp-cart-remove" onClick={() => removeFromCart(item.id)}>
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
          <aside className="tp-cart-summary">
            <h2>{t('cart.summary')}</h2>
            <p>
              <span>{t('cart.subtotal')}</span>
              <strong>{formatPrice(cartTotal)}</strong>
            </p>
            <p>
              <span>{t('cart.shipping')}</span>
              <strong>{formatPrice(shippingFee)}</strong>
            </p>
            <p className="tp-cart-total">
              <span>{t('cart.total')}</span>
              <strong>{formatPrice(grandTotal)}</strong>
            </p>
            <Link className="btn btn-primary" to="/checkout">
              {t('cart.checkout')}
            </Link>
          </aside>
        </section>
      )}

      <RecentlyViewedSection className="tp-cart-recently-viewed" />
    </div>
  );
}
