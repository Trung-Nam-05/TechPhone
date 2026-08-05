const STORAGE_KEY = 'techphone-recently-viewed';
const MAX_ITEMS = 12;
const UPDATE_EVENT = 'techphone-recently-viewed-updated';

function getProductKey(product) {
  if (!product) return '';
  return String(product.slug || product.legacyId || product._id || product.id || '').trim();
}

function normalizeProduct(product) {
  const key = getProductKey(product);
  if (!key) return null;

  const category =
    typeof product.category === 'string'
      ? product.category
      : product.category?.key || product.categoryKey || 'san-pham';

  return {
    key,
    legacyId: product.legacyId ?? null,
    _id: product._id ? String(product._id) : null,
    slug: product.slug || null,
    category,
    name: product.name || 'Sản phẩm',
    price: Number(product.price) || 0,
    oldPrice: product.oldPrice != null ? Number(product.oldPrice) : null,
    image: product.image || '',
    viewedAt: Date.now(),
  };
}

function readItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function trackProductView(product) {
  const entry = normalizeProduct(product);
  if (!entry) return;

  const items = readItems().filter((item) => item.key !== entry.key);
  writeItems([entry, ...items].slice(0, MAX_ITEMS));
}

export function getRecentlyViewedProducts(limit = MAX_ITEMS) {
  return readItems()
    .sort((a, b) => (b.viewedAt || 0) - (a.viewedAt || 0))
    .slice(0, limit);
}

export function subscribeRecentlyViewed(callback) {
  const handler = () => callback(getRecentlyViewedProducts());
  window.addEventListener(UPDATE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(UPDATE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
