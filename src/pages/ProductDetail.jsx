import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { API_BASE_URL } from '../config/api';
import './ProductDetail.css';

function toCartShape(p) {
  if (!p) return null;
  return {
    id: p.legacyId || p._id,
    _id: p._id,
    legacyId: p.legacyId,
    name: p.name,
    price: p.price,
    oldPrice: p.oldPrice,
    image: p.image,
    category: p.category?.key || p.category || 'phu-kien',
    flashSale: p.flashSale,
  };
}

const NOT_FOUND = '__NOT_FOUND__';

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { isAuthenticated, authFetch } = useAuth();
  const { t, formatPrice, locale } = useI18n();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const dateLocale = locale === 'en' ? 'en-US' : 'vi-VN';

  const categoryKey = product?.category?.key || product?.category;
  const catLookupKey = categoryKey ? `categories.${categoryKey}` : 'categories.fallback';
  const catResolved = t(catLookupKey);
  const categoryLabel = catResolved !== catLookupKey ? catResolved : t('categories.fallback');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setProduct(null);
      try {
        const [pRes, rRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(id)}`),
          fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(id)}/reviews`),
        ]);
        if (!pRes.ok) {
          if (!cancelled) setError(NOT_FOUND);
          return;
        }
        const pJson = await pRes.json();
        const rJson = rRes.ok ? await rRes.json() : { items: [] };
        if (!cancelled) {
          setProduct(pJson);
          setReviews(rJson.items || []);
          setActiveImage(0);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const mainGallery =
    product?.images?.length > 0
      ? product.images
      : product?.image
        ? [product.image]
        : ['https://via.placeholder.com/600x600.png?text=TechPhone'];

  const cartProduct = toCartShape(product);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !id) return;
    setReviewSubmitting(true);
    try {
      await authFetch(`/api/products/${encodeURIComponent(id)}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
          title: '',
        }),
      });
      const rRes = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(id)}/reviews`);
      const rJson = rRes.ok ? await rRes.json() : { items: [] };
      setReviews(rJson.items || []);
      setReviewComment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container tp-detail-page" style={{ padding: 40 }}>
        <p className="text-muted">{t('productDetail.loading')}</p>
      </div>
    );
  }

  if (error || !product) {
    const message =
      error === NOT_FOUND ? t('productDetail.notFound') : error || t('productDetail.noData');
    return (
      <div className="container tp-detail-page" style={{ padding: 40 }}>
        <p style={{ color: '#dc2626' }}>{message}</p>
        <Link to="/products">{t('productDetail.backToList')}</Link>
      </div>
    );
  }

  return (
    <div className="container tp-detail-page">
      <p className="tp-detail-breadcrumb">
        <Link to="/">{t('productDetail.breadcrumbHome')}</Link> /{' '}
        <Link to={`/products?category=${product.category?.key || 'all'}`}>{categoryLabel}</Link> / <span>{product.name}</span>
      </p>

      <section className="tp-detail-main">
        <div className="tp-detail-left">
          <div className="tp-detail-main-image">
            <img src={mainGallery[activeImage] || mainGallery[0]} alt={product.name} />
            {mainGallery.length > 1 && (
              <button type="button" onClick={() => setActiveImage((prev) => (prev + 1) % mainGallery.length)}>
                <ChevronRight size={18} />
              </button>
            )}
          </div>

          <div className="tp-detail-thumb-row">
            {mainGallery.slice(0, 8).map((image, index) => (
              <button
                type="button"
                key={image}
                className={index === activeImage ? 'tp-detail-thumb tp-detail-thumb-active' : 'tp-detail-thumb'}
                onClick={() => setActiveImage(index)}
              >
                <img src={image} alt={`${product.name} ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>

        <aside className="tp-detail-right">
          <h1>{product.name}</h1>
          <p className="tp-detail-meta">{product.brand ? `${product.brand} · ` : ''}{t('common.appName')}</p>

          <div className="tp-detail-price-box">
            <div>
              <p className="tp-detail-price">{formatPrice(product.price || 0)}</p>
              {product.oldPrice ? <p className="tp-detail-old-price">{formatPrice(product.oldPrice || 0)}</p> : null}
            </div>
          </div>

          {product.description ? (
            <p className="text-muted" style={{ marginBottom: 16 }}>
              {product.description}
            </p>
          ) : null}

          <div className="tp-detail-actions">
            <button type="button" className="btn btn-primary" onClick={() => cartProduct && addToCart(cartProduct)}>
              {t('productDetail.addToCart')}
            </button>
            <Link to="/checkout" className="btn btn-outline">
              {t('productDetail.buyNow')}
            </Link>
          </div>
        </aside>
      </section>

      <section className="tp-detail-bottom" style={{ marginTop: 32 }}>
        <div className="tp-detail-description">
          <h2>{t('productDetail.reviewsTitle', { count: reviews.length })}</h2>
          {reviews.length === 0 && <p className="text-muted">{t('productDetail.noReviews')}</p>}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {reviews.map((r) => (
              <li key={r._id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
                <strong>{r.user?.name || t('productDetail.guestName')}</strong>
                <span className="text-muted" style={{ marginLeft: 8 }}>
                  {r.rating} / 5
                </span>
                {r.comment && <p style={{ marginTop: 6 }}>{r.comment}</p>}
                <p className="text-sm text-muted">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString(dateLocale) : ''}
                </p>
              </li>
            ))}
          </ul>

          {isAuthenticated ? (
            <form onSubmit={submitReview} className="card" style={{ padding: 14, marginTop: 16 }}>
              <h3>{t('productDetail.reviewFormHeading')}</h3>
              <div style={{ marginBottom: 8 }}>
                <label className="text-sm">{t('productDetail.ratingLabel')} </label>
                <select
                  className="input"
                  style={{ maxWidth: 80 }}
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className="input"
                rows={3}
                placeholder={t('productDetail.commentPlaceholder')}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }} disabled={reviewSubmitting}>
                {reviewSubmitting ? t('productDetail.submitting') : t('productDetail.submitReview')}
              </button>
            </form>
          ) : (
            <p className="text-muted" style={{ marginTop: 12 }}>
              {t('productDetail.reviewLoginPrefix')}{' '}
              <Link to="/login">{t('account.login')}</Link> {t('productDetail.reviewLoginSuffix')}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
