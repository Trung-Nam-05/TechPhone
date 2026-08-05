import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Star,
  MapPin,
  Store,
  Smartphone,
  Camera,
  Cpu,
  Shield,
  Truck,
  Headphones,
} from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { API_BASE_URL } from '../config/api';
import { getProductPath } from '../utils/productUrl';
import { trackProductView } from '../utils/recentlyViewed';
import PageMeta from '../components/PageMeta';
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

const POLICY_ITEMS = [
  { icon: Shield, text: 'Hàng chính hãng - Bảo hành 12 tháng' },
  { icon: Truck, text: 'Miễn phí giao hàng toàn quốc (*)' },
  { icon: Headphones, text: 'Kỹ thuật viên hỗ trợ trực tuyến' },
];

const PROMO_ITEMS = [
  'Tặng thêm ưu đãi khi mua kèm phụ kiện chính hãng',
  'Trả góp 0% qua thẻ tín dụng',
  'Giảm thêm khi thu cũ đổi mới',
];

function extractCapacityOptions(name = '') {
  const matches = [...name.matchAll(/(\d+)\s*GB/gi)].map((m) => `${m[1]} GB`);
  return [...new Set(matches)];
}

function extractHighlightSpecs(name = '', categoryKey = '') {
  const capacities = extractCapacityOptions(name);
  const ram = capacities.length >= 2 ? capacities[0] : capacities[0] || '8 GB';
  const storage = capacities.length >= 2 ? capacities[1] : capacities[0] || '256 GB';

  if (categoryKey === 'dien-thoai' || categoryKey === 'may-tinh-bang') {
    return [
      { label: 'Kích thước màn hình', value: '6.57 inch', icon: Smartphone },
      { label: 'Camera', value: '50.0 MP', icon: Camera },
      { label: 'RAM', value: ram, icon: Cpu },
      { label: 'Bộ nhớ', value: storage, icon: Cpu },
    ].slice(0, 4);
  }

  return [
    { label: 'Thương hiệu', value: name.split(' ')[0] || 'TechPhone', icon: Shield },
    { label: 'Bảo hành', value: '12 tháng', icon: Shield },
    { label: 'Giao hàng', value: 'Toàn quốc', icon: Truck },
  ];
}

const SIMILAR_CARD_PROMOS = [
  { id: 'installment', shortLabel: 'TG', label: 'Trả góp 0% qua thẻ tín dụng', color: '#1250dc' },
  { id: 'tradein', shortLabel: 'TC', label: 'Giảm thêm khi thu cũ đổi mới', color: '#16a34a' },
  { id: 'accessory', shortLabel: 'PK', label: 'Tặng thêm ưu đãi khi mua kèm phụ kiện chính hãng', color: '#9333ea' },
  { id: 'warranty', shortLabel: 'BH', label: 'Bảo hành chính hãng 12 tháng', color: '#ea580c' },
];

function getItemCategoryKey(item, fallback = '') {
  if (typeof item?.category === 'string') return item.category;
  return item?.category?.key || fallback;
}

function extractSimilarCardSpecs(name = '', categoryKey = '') {
  const capacities = extractCapacityOptions(name);
  const ram = capacities.length >= 2 ? capacities[0] : '8 GB';
  const storage = capacities.length >= 2 ? capacities[1] : capacities[0] || '256 GB';
  const cameraMatch = name.match(/(\d+)\s*MP/i);
  const cameraLine = cameraMatch ? `Camera ${cameraMatch[1]}MP` : 'Camera 50MP';
  const brand = name.split(' ')[0] || 'Chip';

  if (categoryKey === 'dien-thoai' || categoryKey === 'may-tinh-bang') {
    return [
      { icon: Cpu, line1: brand, line2: ram },
      { icon: Smartphone, line1: 'Màn hình', line2: 'AMOLED' },
      { icon: Camera, line1: cameraLine, line2: '' },
    ];
  }

  return [
    { icon: Shield, line1: 'Bảo hành', line2: '12 tháng' },
    { icon: Truck, line1: 'Giao hàng', line2: 'Toàn quốc' },
    { icon: Cpu, line1: storage, line2: 'Bộ nhớ' },
  ];
}

function SimilarProductCard({ item, categoryKey, formatPrice }) {
  const [activePromo, setActivePromo] = useState(0);
  const itemCategory = getItemCategoryKey(item, categoryKey);
  const specs = useMemo(
    () => extractSimilarCardSpecs(item.name || '', itemCategory),
    [item.name, itemCategory],
  );
  const discountAmount =
    item.oldPrice && item.price ? Math.max(item.oldPrice - item.price, 0) : 0;
  const productPath = getProductPath(item);
  const activePromoItem = SIMILAR_CARD_PROMOS[activePromo] || SIMILAR_CARD_PROMOS[0];

  return (
    <div className="tp-detail-similar-slide">
      <article className="tp-detail-similar-card-item">
        <div className="tp-detail-similar-card-inner">
          <Link to={productPath} className="tp-detail-similar-media" title={item.name}>
            <div className="tp-detail-similar-image-col">
              <img
                src={item.image || 'https://via.placeholder.com/200x200.png?text=TechPhone'}
                alt={item.name}
                loading="lazy"
              />
            </div>
            <div className="tp-detail-similar-specs">
              {specs.map((spec) => {
                const SpecIcon = spec.icon;
                return (
                  <div key={`${spec.line1}-${spec.line2}`} className="tp-detail-similar-spec">
                    <div className="tp-detail-similar-spec-icon">
                      <SpecIcon size={14} strokeWidth={1.75} />
                    </div>
                    <div className="tp-detail-similar-spec-text">
                      <p>{spec.line1}</p>
                      {spec.line2 ? <p>{spec.line2}</p> : <p aria-hidden="true">&nbsp;</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Link>

          <div className="tp-detail-similar-card-info">
            <Link to={productPath} title={item.name}>
              <div className="tp-detail-similar-prices">
                {item.oldPrice ? (
                  <p>
                    <span className="tp-detail-similar-old">{formatPrice(item.oldPrice)}</span>
                  </p>
                ) : null}
                <p className="tp-detail-similar-price">{formatPrice(item.price || 0)}</p>
                {discountAmount > 0 ? (
                  <p className="tp-detail-similar-discount">Giảm {formatPrice(discountAmount)}</p>
                ) : null}
              </div>
              <h3>{item.name}</h3>
            </Link>

            <div className="tp-detail-similar-promo">
              <div className="tp-detail-similar-promo-logos">
                {SIMILAR_CARD_PROMOS.map((promo, index) => (
                  <button
                    key={promo.id}
                    type="button"
                    className={`tp-detail-similar-promo-badge ${index === activePromo ? 'is-active' : ''}`}
                    onClick={() => setActivePromo(index)}
                    aria-label={promo.label}
                  >
                    <span style={{ backgroundColor: promo.color }}>{promo.shortLabel}</span>
                  </button>
                ))}
              </div>
              <p className="tp-detail-similar-promo-text">{activePromoItem.label}</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function averageRating(reviews = []) {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

function ratingDistribution(reviews = []) {
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const n = Math.round(Number(r.rating) || 0);
    if (Object.prototype.hasOwnProperty.call(dist, n)) dist[n] += 1;
  });
  return dist;
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'KH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function looksLikeHtml(text = '') {
  return /<[a-z][\s\S]*>/i.test(text);
}

function StarIcon({ size = 16, filled = true }) {
  return (
    <Star
      size={size}
      fill={filled ? '#FBBF24' : 'none'}
      stroke={filled ? '#FBBF24' : '#D1D5DB'}
      strokeWidth={1.5}
    />
  );
}

function VideoPlayIcon() {
  return (
    <svg
      width="100"
      height="69"
      viewBox="0 0 100 69"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="tp-detail-video-play-icon"
      aria-hidden="true"
    >
      <g clipPath="url(#tp-video-play-clip)">
        <path
          d="M49.9476 68.8995C49.9476 68.8995 81.2741 68.8995 89.0445 66.8325C93.4197 65.6612 96.71 62.2852 97.8648 58.1167C100 50.4689 100 34.3809 100 34.3809C100 34.3809 100 18.3962 97.8648 10.8172C96.71 6.54545 93.4197 3.23827 89.0445 2.10144C81.2741 0 49.9476 0 49.9476 0C49.9476 0 18.6909 0 10.9556 2.10144C6.65035 3.23827 3.29017 6.54545 2.0651 10.8172C-6.08923e-07 18.3962 0 34.3809 0 34.3809C0 34.3809 -6.08923e-07 50.4689 2.0651 58.1167C3.29017 62.2852 6.65035 65.6612 10.9556 66.8325C18.6909 68.8995 49.9476 68.8995 49.9476 68.8995Z"
          fill="#090D14"
          fillOpacity="0.4"
        />
        <path d="M65.5173 34.4497L39.6553 19.8086V49.0909L65.5173 34.4497Z" fill="white" fillOpacity="0.8" />
      </g>
      <defs>
        <clipPath id="tp-video-play-clip">
          <rect width="100" height="68.8995" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export default function ProductDetail() {
  const { productSlug, id: legacyRouteId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const lookupKey = productSlug || legacyRouteId;
  const { addToCart } = useCart();
  const { isAuthenticated, authFetch } = useAuth();
  const { t, formatPrice, locale } = useI18n();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedColor, setSelectedColor] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState('home');
  const [showAllPromos, setShowAllPromos] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [reviewNotice, setReviewNotice] = useState(null);
  const [infoTab, setInfoTab] = useState('video');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [similarProducts, setSimilarProducts] = useState([]);
  const [descOverflows, setDescOverflows] = useState(false);
  const descBodyRef = useRef(null);
  const similarTrackRef = useRef(null);
  const reviewFormRef = useRef(null);

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
      setReviewEligibility(null);
      setReviewNotice(null);
      try {
        const [pRes, rRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(lookupKey)}`),
          fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(lookupKey)}/reviews`),
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
          setSelectedColor(0);
          const storages = extractCapacityOptions(pJson.name);
          setSelectedStorage(storages[storages.length - 1] || storages[0] || '');
          trackProductView(pJson);
          const canonicalPath = getProductPath(pJson);
          if (location.pathname !== canonicalPath) {
            navigate(canonicalPath, { replace: true });
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (lookupKey) load();
    return () => {
      cancelled = true;
    };
  }, [lookupKey, navigate, location.pathname]);

  useEffect(() => {
    let cancelled = false;
    const loadEligibility = async () => {
      if (!isAuthenticated || !lookupKey) {
        setReviewEligibility(null);
        return;
      }
      try {
        const payload = await authFetch(
          `/api/products/${encodeURIComponent(lookupKey)}/reviews/eligibility`,
        );
        if (!cancelled) setReviewEligibility(payload);
      } catch {
        if (!cancelled) setReviewEligibility(null);
      }
    };
    loadEligibility();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, lookupKey, authFetch]);

  useEffect(() => {
    if (!product?.category?.key) {
      setSimilarProducts([]);
      return undefined;
    }
    let cancelled = false;
    const loadSimilar = async () => {
      try {
        const params = new URLSearchParams({
          category: product.category.key,
          limit: '10',
        });
        const res = await fetch(`${API_BASE_URL}/api/products?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        const currentId = String(product.legacyId || product._id);
        const items = (json.items || [])
          .filter((item) => String(item.legacyId || item._id) !== currentId)
          .slice(0, 8)
          .map((item) => ({
            ...item,
            id: item.legacyId || item._id,
            category: item.category?.key || product.category.key,
          }));
        if (!cancelled) setSimilarProducts(items);
      } catch {
        if (!cancelled) setSimilarProducts([]);
      }
    };
    loadSimilar();
    return () => {
      cancelled = true;
    };
  }, [product]);

  const mainGallery = useMemo(
    () =>
      product?.images?.length > 0
        ? product.images
        : product?.image
          ? [product.image]
          : ['https://via.placeholder.com/600x600.png?text=TechPhone'],
    [product],
  );

  const colorOptions = useMemo(
    () =>
      mainGallery.slice(0, Math.min(3, mainGallery.length)).map((img, index) => ({
        id: index,
        label: ['Tím Nhạt', 'Tím Đen', 'Trắng'][index] || `Màu ${index + 1}`,
        image: img,
      })),
    [mainGallery],
  );

  const storageOptions = useMemo(() => extractCapacityOptions(product?.name || ''), [product?.name]);

  const highlightSpecs = useMemo(
    () => extractHighlightSpecs(product?.name || '', categoryKey || ''),
    [product?.name, categoryKey],
  );

  const ratingAvg = averageRating(reviews);
  const ratingDist = useMemo(() => ratingDistribution(reviews), [reviews]);
  const displayRating = ratingAvg || 5;
  const filteredReviews = useMemo(() => {
    if (reviewFilter === 'all') return reviews;
    return reviews.filter((r) => Math.round(Number(r.rating) || 0) === reviewFilter);
  }, [reviews, reviewFilter]);
  const descIsHtml = looksLikeHtml(product?.description || '');
  const descPlainLines = useMemo(
    () => (product?.description || '').split('\n').filter((line) => line.trim()),
    [product?.description],
  );
  const videoTitle = `Khám phá ${product?.name || 'sản phẩm'} tại TechPhone`;

  useEffect(() => {
    const el = descBodyRef.current;
    if (!el || descExpanded) {
      setDescOverflows(false);
      return undefined;
    }
    const check = () => setDescOverflows(el.scrollHeight > 499);
    const timer = window.setTimeout(check, 0);
    window.addEventListener('resize', check);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', check);
    };
  }, [product?.description, descExpanded, descIsHtml]);

  const installmentMonthly = product?.price ? Math.round(product.price / 24) : 0;
  const skuCode = product?.legacyId || product?._id?.slice(-8)?.toUpperCase() || '—';
  const cartProduct = toCartShape(product);
  const visiblePromos = showAllPromos ? PROMO_ITEMS : PROMO_ITEMS.slice(0, 2);

  const goPrevImage = () => {
    setActiveImage((prev) => (prev - 1 + mainGallery.length) % mainGallery.length);
  };

  const goNextImage = () => {
    setActiveImage((prev) => (prev + 1) % mainGallery.length);
  };

  const scrollSimilar = (direction) => {
    const track = similarTrackRef.current;
    if (!track) return;
    const slide = track.querySelector('.tp-detail-similar-slide');
    const gap = 8;
    const amount = slide ? slide.offsetWidth + gap : 250;
    track.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' });
  };

  const scrollToReviewForm = () => {
    reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !lookupKey) return;
    setReviewSubmitting(true);
    setReviewNotice(null);
    try {
      const result = await authFetch(`/api/products/${encodeURIComponent(lookupKey)}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
          title: '',
        }),
      });
      setReviewComment('');
      setReviewNotice(result?.message || 'Đánh giá đã gửi và đang chờ duyệt.');
      setReviewEligibility((prev) =>
        prev
          ? { ...prev, canReview: false, alreadyReviewed: true, pendingApproval: true }
          : { canReview: false, purchased: true, alreadyReviewed: true, pendingApproval: true },
      );
    } catch (err) {
      setReviewNotice(err.message);
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
    <div className="tp-detail-page">
      <div className="container">
        <PageMeta
          title={product.name}
          description={
            product.description?.slice(0, 155) ||
            `Mua ${product.name} chính hãng tại TechPhone. Giá ${Number(product.price || 0).toLocaleString('vi-VN')}đ.`
          }
          canonicalPath={getProductPath(product)}
        />

        <nav className="tp-detail-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link to="/">{t('productDetail.breadcrumbHome')}</Link>
            </li>
            <li>
              <Link to={`/products?category=${product.category?.key || 'all'}`}>{categoryLabel}</Link>
            </li>
            {product.brand ? (
              <li>
                <Link to={`/products?brand=${encodeURIComponent(product.brand.toLowerCase())}`}>
                  {product.brand}
                </Link>
              </li>
            ) : null}
            <li>
              <span>{product.name}</span>
            </li>
          </ol>
        </nav>

        <section className="tp-detail-hero">
          <div className="tp-detail-left tp-detail-left-sticky">
            <div className="tp-detail-gallery">
              <div className="tp-detail-main-image">
                <img src={mainGallery[activeImage] || mainGallery[0]} alt={product.name} />
                {mainGallery.length > 1 && (
                  <>
                    <button type="button" className="tp-gallery-nav tp-gallery-nav-prev" onClick={goPrevImage} aria-label="Ảnh trước">
                      <ChevronLeft size={20} />
                    </button>
                    <button type="button" className="tp-gallery-nav tp-gallery-nav-next" onClick={goNextImage} aria-label="Ảnh sau">
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              <div className="tp-detail-thumb-wrap">
                <div className="tp-detail-thumb-row">
                  {mainGallery.slice(0, 8).map((image, index) => (
                    <button
                      type="button"
                      key={`${image}-${index}`}
                      className={
                        index === activeImage ? 'tp-detail-thumb tp-detail-thumb-active' : 'tp-detail-thumb'
                      }
                      onClick={() => setActiveImage(index)}
                    >
                      <img src={image} alt={`${product.name} ${index + 1}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="tp-detail-policy">
              <div className="tp-detail-policy-track">
                {[...POLICY_ITEMS, ...POLICY_ITEMS].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={`${item.text}-${index}`} className="tp-detail-policy-item">
                      <Icon size={20} strokeWidth={1.8} />
                      <span>{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="tp-detail-specs-block">
              <div className="tp-detail-specs-head">
                <h2>Thông số nổi bật</h2>
                <button type="button" className="tp-detail-specs-btn" onClick={() => setDescExpanded(true)}>
                  Xem tất cả thông số
                </button>
              </div>
              <div className="tp-detail-specs">
                {highlightSpecs.slice(0, 3).map((spec) => {
                  const Icon = spec.icon;
                  return (
                    <article key={spec.label}>
                      <Icon size={28} strokeWidth={1.5} className="tp-detail-spec-icon" />
                      <div>
                        <span>{spec.label}</span>
                        <strong>{spec.value}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="tp-detail-right">
            <h1>{product.name}</h1>

            <div className="tp-detail-meta-row">
              <span className="tp-detail-sku">No.{skuCode}</span>
              <div className="tp-detail-rating">
                <Star size={16} fill="#FCD34D" stroke="#FCD34D" />
                <strong>{ratingAvg || 5}</strong>
                <span>({reviews.length || 0} đánh giá)</span>
              </div>
            </div>

            <div className="tp-detail-shortcuts">
              <button type="button" onClick={() => setDescExpanded(true)}>
                Thông số
              </button>
              <Link to={`/products?category=${product.category?.key || 'all'}`}>So sánh</Link>
            </div>

            <div className="tp-detail-price-box">
              <div>
                <p className="tp-detail-price">{formatPrice(product.price || 0)}</p>
                {product.oldPrice ? <p className="tp-detail-old-price">{formatPrice(product.oldPrice)}</p> : null}
              </div>
              <div className="tp-detail-price-divider">
                <span>Hoặc</span>
              </div>
              <div className="tp-detail-installment">
                <span>Trả góp</span>
                <strong>
                  {formatPrice(installmentMonthly)}
                  <small>/tháng</small>
                </strong>
              </div>
            </div>

            <div className="tp-detail-tradein">
              <p>
                Thu cũ - Giảm thêm đến <strong>5.000.000đ</strong>
              </p>
              <Link to="/installment">Định giá ngay</Link>
            </div>

            {storageOptions.length > 0 && (
              <div className="tp-detail-option">
                <label>Dung lượng</label>
                <div>
                  {storageOptions.map((storage) => (
                    <button
                      key={storage}
                      type="button"
                      className={selectedStorage === storage ? 'tp-option-active' : ''}
                      onClick={() => setSelectedStorage(storage)}
                    >
                      {storage}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colorOptions.length > 0 && (
              <div className="tp-detail-option">
                <label>Màu sắc</label>
                <div>
                  {colorOptions.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      className={`tp-option-color ${selectedColor === color.id ? 'tp-option-active' : ''}`}
                      onClick={() => {
                        setSelectedColor(color.id);
                        setActiveImage(color.id);
                      }}
                    >
                      <img src={color.image} alt={color.label} />
                      <span>{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="tp-detail-promos">
              <div className="tp-detail-promos-head">
                <h3>Ưu đãi được hưởng</h3>
                <span className="tp-detail-promo-price">{formatPrice(product.price || 0)}</span>
              </div>
              <ul>
                {visiblePromos.map((promo) => (
                  <li key={promo}>{promo}</li>
                ))}
              </ul>
              {PROMO_ITEMS.length > 2 && (
                <button type="button" className="tp-detail-promos-more" onClick={() => setShowAllPromos((v) => !v)}>
                  {showAllPromos ? 'Thu gọn' : `Xem thêm ${PROMO_ITEMS.length - 2} ưu đãi`}
                </button>
              )}
            </div>

            <div className="tp-detail-shipping">
              <h3>Thông tin vận chuyển</h3>
              <div className="tp-detail-shipping-tabs">
                <button
                  type="button"
                  className={deliveryMode === 'home' ? 'tp-shipping-tab-active' : ''}
                  onClick={() => setDeliveryMode('home')}
                >
                  <Truck size={20} />
                  Giao hàng tận nơi
                </button>
                <button
                  type="button"
                  className={deliveryMode === 'store' ? 'tp-shipping-tab-active' : ''}
                  onClick={() => setDeliveryMode('store')}
                >
                  <Store size={20} />
                  Nhận tại cửa hàng
                </button>
              </div>
              <button type="button" className="tp-detail-address-btn">
                <MapPin size={18} />
                Nhập địa chỉ để xem thông tin giao hàng
              </button>
              <Link to="/stores" className="tp-detail-store-link">
                <Store size={18} />
                Xem tất cả cửa hàng có hàng
                <ChevronRight size={18} />
              </Link>
            </div>

            <div className="tp-detail-actions tp-detail-actions-desktop">
              <button type="button" className="btn btn-outline tp-btn-cart-icon" onClick={() => cartProduct && addToCart(cartProduct)} aria-label={t('productDetail.addToCart')}>
                <ShoppingCart size={22} />
              </button>
              <Link to="/checkout" className="btn btn-primary">
                {t('productDetail.buyNow')}
              </Link>
              <Link to="/installment" className="btn btn-dark">
                <span>Trả góp</span>
                <small>(Chỉ từ {formatPrice(installmentMonthly)})</small>
              </Link>
            </div>
          </aside>
        </section>
      </div>

        <div className="tp-detail-band tp-detail-band-desc">
          <div className="tp-detail-band-container">
            <div className="tp-detail-desc-card">
              <div
                id="MoTaSanPham"
                className={`tp-detail-desc-main ${descExpanded ? 'tp-detail-desc-expanded' : ''}`}
              >
                <div className="tp-detail-desc-head">
                  <div className="tp-detail-desc-head-row">
                    <h2>{t('productDetail.description')}</h2>
                  </div>
                  <div className="tp-detail-desc-head-divider" aria-hidden="true" />
                </div>

                <div className="tp-detail-desc-content">
                  <div
                    ref={descBodyRef}
                    className="tp-detail-desc-body tp-detail-desc-prose"
                    {...(product.description && descIsHtml
                      ? { dangerouslySetInnerHTML: { __html: product.description } }
                      : {})}
                  >
                    {product.description ? (
                      descIsHtml ? null : (
                        descPlainLines.map((line, i) => <p key={i}>{line}</p>)
                      )
                    ) : (
                      <p className="text-muted">
                        Sản phẩm {product.name} chính hãng, bảo hành 12 tháng tại TechPhone.
                      </p>
                    )}
                  </div>
                </div>

                {!descExpanded && descOverflows && (
                  <div className="tp-detail-desc-fade">
                    <button type="button" onClick={() => setDescExpanded(true)}>
                      Đọc thêm
                    </button>
                  </div>
                )}
              </div>

              <aside id="VideoSanPham" className="tp-detail-info-aside">
                <div className="tp-detail-info-sticky">
                  <h2 className="tp-detail-info-title">Thông tin hay</h2>
                  <div className="tp-detail-info-tabs">
                    <button
                      type="button"
                      className={infoTab === 'video' ? 'tp-info-tab-active' : ''}
                      onClick={() => setInfoTab('video')}
                    >
                      Góc video
                    </button>
                    <button
                      type="button"
                      className={infoTab === 'articles' ? 'tp-info-tab-active' : ''}
                      onClick={() => setInfoTab('articles')}
                    >
                      Bài viết liên quan
                    </button>
                  </div>
                  {infoTab === 'video' ? (
                    <div className="tp-detail-video-scroll">
                      <div className="tp-detail-video-card">
                        <div className="tp-detail-video-thumb" role="button" tabIndex={0}>
                          <img src={mainGallery[0]} alt={videoTitle} loading="lazy" />
                          <VideoPlayIcon />
                          <p className="tp-detail-video-title">{videoTitle}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="tp-detail-articles-placeholder">
                      <p>Nội dung bài viết liên quan sẽ được cập nhật sớm.</p>
                    </div>
                  )}
                </div>
              </aside>
            </div>
            <div className="tp-detail-band-mobile-divider" aria-hidden="true" />
          </div>
        </div>

        <div className="tp-detail-band">
          <div className="tp-detail-band-inner tp-detail-reviews-card" id="CommentRating">
            <h2 className="tp-detail-reviews-title">Đánh giá và bình luận</h2>

            <div className="tp-detail-reviews-summary">
              <div className="tp-detail-reviews-score">
                <span className="tp-detail-reviews-score-label">Điểm đánh giá</span>
                <strong className="tp-detail-reviews-score-value">{displayRating}</strong>
                <span className="tp-detail-reviews-count">{reviews.length} lượt đánh giá</span>
                <div className="tp-detail-reviews-score-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} size={18} filled={i < Math.round(displayRating)} />
                  ))}
                </div>
                {isAuthenticated && reviewEligibility?.canReview && (
                  <button type="button" className="tp-btn-rate-product" onClick={scrollToReviewForm}>
                    Đánh giá sản phẩm
                  </button>
                )}
              </div>

              <div className="tp-detail-reviews-bars">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDist[star] || 0;
                  const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                  return (
                    <div key={star} className="tp-detail-review-bar-row">
                      <span className="tp-detail-review-bar-label">
                        {star}
                        <StarIcon size={14} />
                      </span>
                      <div className="tp-detail-review-bar-track">
                        <div className="tp-detail-review-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="tp-detail-review-bar-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="tp-detail-comment-box" ref={reviewFormRef}>
              {isAuthenticated ? (
                reviewEligibility?.canReview ? (
                  <form onSubmit={submitReview} className="tp-detail-comment-form">
                    <div className="tp-detail-comment-input-wrap">
                      <textarea
                        className="tp-detail-comment-input"
                        rows={2}
                        maxLength={3000}
                        required
                        placeholder="Nhập nội dung bình luận..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />
                      <span className="tp-detail-comment-count">{reviewComment.length}/3000</span>
                    </div>
                    <div className="tp-detail-comment-rating">
                      <span>Chọn sao:</span>
                      <div className="tp-detail-star-picker">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className="tp-detail-star-picker-btn"
                            onClick={() => setReviewRating(n)}
                            aria-label={`${n} sao`}
                          >
                            <StarIcon size={20} filled={n <= reviewRating} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="tp-btn-submit-comment" disabled={reviewSubmitting}>
                      {reviewSubmitting ? t('productDetail.submitting') : 'Gửi bình luận'}
                    </button>
                    {reviewNotice && <p className="tp-detail-review-notice">{reviewNotice}</p>}
                  </form>
                ) : (
                  <p className="text-muted tp-detail-review-note">
                    {reviewEligibility?.pendingApproval
                      ? 'Bạn đã gửi đánh giá và đang chờ duyệt.'
                      : reviewEligibility?.alreadyReviewed
                        ? 'Bạn đã đánh giá sản phẩm này.'
                        : reviewEligibility?.purchased === false
                          ? 'Chỉ khách đã mua và nhận hàng thành công mới được đánh giá.'
                          : reviewNotice || 'Đang kiểm tra quyền đánh giá...'}
                  </p>
                )
              ) : (
                <p className="text-muted tp-detail-review-note">
                  {t('productDetail.reviewLoginPrefix')}{' '}
                  <Link to="/login">{t('account.login')}</Link> {t('productDetail.reviewLoginSuffix')}
                </p>
              )}
            </div>

            {reviews.length > 0 && (
              <>
                <div className="tp-detail-review-list-head">
                  <span>{filteredReviews.length} Đánh giá</span>
                </div>
                <div className="tp-detail-review-filters">
                  <button
                    type="button"
                    className={reviewFilter === 'all' ? 'tp-review-filter-active' : ''}
                    onClick={() => setReviewFilter('all')}
                  >
                    Tất cả
                  </button>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={reviewFilter === star ? 'tp-review-filter-active' : ''}
                      onClick={() => setReviewFilter(star)}
                    >
                      {star}
                      <Star size={14} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
                <div className="tp-detail-review-items">
                  {filteredReviews.length === 0 ? (
                    <p className="text-muted">Không có đánh giá phù hợp bộ lọc.</p>
                  ) : (
                    filteredReviews.map((r) => {
                      const userName = r.user?.name || t('productDetail.guestName');
                      return (
                        <article key={r._id} className="tp-detail-review-item">
                          <div className="tp-detail-review-avatar">{getInitials(userName)}</div>
                          <div className="tp-detail-review-content">
                            <div className="tp-detail-review-meta">
                              <div className="tp-detail-review-user">
                                <strong>{userName}</strong>
                                <span className="tp-detail-review-divider" />
                                <span className="tp-detail-review-stars">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <StarIcon key={i} size={12} filled={i < r.rating} />
                                  ))}
                                </span>
                              </div>
                            </div>
                            {r.comment && <p className="tp-detail-review-text">{r.comment}</p>}
                            <time className="tp-detail-review-time">
                              {r.createdAt ? new Date(r.createdAt).toLocaleString(dateLocale) : ''}
                            </time>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {reviews.length === 0 && <p className="text-muted">{t('productDetail.noReviews')}</p>}
          </div>
        </div>

        {similarProducts.length > 0 && (
          <div className="tp-detail-band" id="co-the-ban-quan-tam">
            <div className="tp-detail-band-inner tp-detail-similar-section">
              <h2 className="tp-detail-similar-title">Sản phẩm tương tự</h2>
              <div id="SoSanhSanPhamTuongTu" className="tp-detail-similar-wrap">
                <div className="tp-detail-similar-carousel-outer">
                  <div className="tp-detail-similar-carousel">
                    <button
                      type="button"
                      className="tp-similar-nav tp-similar-nav-prev"
                      onClick={() => scrollSimilar('prev')}
                      aria-label="Trước"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="tp-detail-similar-track" ref={similarTrackRef}>
                      {similarProducts.map((item) => (
                        <SimilarProductCard
                          key={item.id}
                          item={item}
                          categoryKey={categoryKey}
                          formatPrice={formatPrice}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="tp-similar-nav tp-similar-nav-next"
                      onClick={() => scrollSimilar('next')}
                      aria-label="Sau"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      <div className="tp-detail-mobile-bar">
        <button type="button" className="tp-mobile-cart" onClick={() => cartProduct && addToCart(cartProduct)} aria-label={t('productDetail.addToCart')}>
          <ShoppingCart size={24} />
        </button>
        <Link to="/checkout" className="tp-mobile-buy">
          {t('productDetail.buyNow')}
        </Link>
        <Link to="/installment" className="tp-mobile-installment">
          <span>Trả góp</span>
          <small>(Chỉ từ {formatPrice(installmentMonthly)})</small>
        </Link>
      </div>
    </div>
  );
}
