import { ShoppingCart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import './Cart.css';

const VIEWED_PRODUCTS = [
  {
    id: 'v1',
    name: 'Máy hút bụi cầm tay Gaabor',
    price: 1590000,
    oldPrice: 2990000,
    image:
      'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=260',
  },
  {
    id: 'v2',
    name: 'Xiaomi Redmi 13x 8GB 128GB',
    price: 3690000,
    oldPrice: 4190000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/xiaomi_redmi_13x_xanh_5_2f17e30bdd.png',
  },
  {
    id: 'v3',
    name: 'Samsung Galaxy S25 Ultra 5G',
    price: 27490000,
    oldPrice: 33390000,
    image:
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&q=80&w=260',
  },
  {
    id: 'v4',
    name: 'Xiaomi Redmi Note 15',
    price: 5690000,
    oldPrice: 5990000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/xiaomi_redmi_note_15_xanh_1935de8379.png',
  },
];

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

      <section className="tp-cart-viewed">
        <h2>{t('cart.viewedTitle')}</h2>
        <div className="tp-cart-viewed-list">
          {VIEWED_PRODUCTS.map((item) => (
            <article key={item.id}>
              <img src={item.image} alt={item.name} />
              <div>
                <h4>{item.name}</h4>
                <p>
                  <strong>{formatPrice(item.price)}</strong>
                  <span>{formatPrice(item.oldPrice)}</span>
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
