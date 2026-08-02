import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import { enrichProductsWithFlashSale } from '../../services/flashSale.js';
import { buildOrderTimeline } from '../../services/orderTimeline.js';

const PRODUCT_FIELDS = 'name slug brand price oldPrice stock category description';
const DEFAULT_LIMIT = 3;

const CATEGORY_ALIASES = {
  laptop: 'laptop',
  laptops: 'laptop',
  'dien thoai': 'dien-thoai',
  'điện thoại': 'dien-thoai',
  'dien-thoai': 'dien-thoai',
  smartphone: 'dien-thoai',
  phone: 'dien-thoai',
  'phu kien': 'phu-kien',
  'phụ kiện': 'phu-kien',
  'phu-kien': 'phu-kien',
  'dien may': 'dien-may',
  'điện máy': 'dien-may',
  'dien-may': 'dien-may',
};

function normalizeCategoryKey(category) {
  const raw = String(category || '').trim();
  if (!raw || raw === 'all') return '';
  const lowered = raw.toLowerCase();
  return CATEGORY_ALIASES[lowered] || lowered;
}

function formatPrice(value) {
  return Number(value || 0);
}

function sanitizeProduct(product, { shortDescription = true } = {}) {
  return {
    name: product.name,
    slug: product.slug,
    brand: product.brand || '',
    price: formatPrice(product.price),
    oldPrice: product.oldPrice != null ? formatPrice(product.oldPrice) : null,
    stock: product.stock ?? 0,
    category: product.category?.label || product.category?.key || '',
    inStock: (product.stock ?? 0) > 0,
    description: String(product.description || '').slice(0, shortDescription ? 80 : 500),
  };
}

export async function searchProducts({ search = '', category = '', brand = '', maxPrice, limit } = {}) {
  try {
    const query = { isActive: true, deletedAt: null };
    const text = String(search || '').trim();
    if (text) query.$text = { $search: text };
    if (category && category !== 'all') query['category.key'] = normalizeCategoryKey(category);
    if (brand) query.brand = new RegExp(String(brand).trim(), 'i');
    if (maxPrice != null && Number(maxPrice) > 0) {
      query.price = { $lte: Number(maxPrice) };
    }

    const cap = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 5);
    const raw = await Product.find(query)
      .select(PRODUCT_FIELDS)
      .sort(text ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .limit(cap)
      .lean();

    const items = await enrichProductsWithFlashSale(raw);
    return { items: items.map((item) => sanitizeProduct(item)), count: items.length };
  } catch (error) {
    console.warn('[aiChatTools] searchProducts failed:', error.message?.slice(0, 120));
    return { error: 'search_failed', items: [], count: 0 };
  }
}

export async function getTopProducts({ sort = 'price_desc', category = '', limit } = {}) {
  try {
    const query = { isActive: true, deletedAt: null };
    if (category && category !== 'all') query['category.key'] = normalizeCategoryKey(category);

    const cap = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 5);
    const sortDir = sort === 'price_asc' ? 1 : -1;

    const raw = await Product.find(query)
      .select(PRODUCT_FIELDS)
      .sort({ price: sortDir })
      .limit(cap)
      .lean();

    const items = await enrichProductsWithFlashSale(raw);
    return { items: items.map((item) => sanitizeProduct(item)), count: items.length, sort };
  } catch (error) {
    console.warn('[aiChatTools] getTopProducts failed:', error.message?.slice(0, 120));
    return { error: 'top_products_failed', items: [], count: 0 };
  }
}

export async function getProductDetail({ slugOrId } = {}) {
  const key = String(slugOrId || '').trim();
  if (!key) return { error: 'missing_slug_or_id' };

  try {
    let product = null;
    if (mongoose.Types.ObjectId.isValid(key)) {
      product = await Product.findOne({ _id: key, isActive: true, deletedAt: null }).select(PRODUCT_FIELDS).lean();
    }
    if (!product) {
      product = await Product.findOne({ slug: key, isActive: true, deletedAt: null }).select(PRODUCT_FIELDS).lean();
    }
    if (!product && /^\d+$/.test(key)) {
      product = await Product.findOne({ legacyId: Number(key), isActive: true, deletedAt: null }).select(PRODUCT_FIELDS).lean();
    }
    if (!product) return { error: 'product_not_found' };

    const [enriched] = await enrichProductsWithFlashSale([product]);
    return { product: sanitizeProduct(enriched, { shortDescription: false }) };
  } catch (error) {
    console.warn('[aiChatTools] getProductDetail failed:', error.message?.slice(0, 120));
    return { error: 'product_detail_failed' };
  }
}

export async function getMyOrders({ userId } = {}) {
  if (!userId) return { error: 'login_required', message: 'Cần đăng nhập để tra đơn hàng.' };

  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('code status total paymentMethod paymentStatus createdAt shipment.labelId')
    .lean();

  return {
    items: orders.map((order) => ({
      code: order.code,
      status: order.status,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      trackingCode: order.shipment?.labelId || null,
    })),
  };
}

export async function getOrderTimeline({ userId, orderCode } = {}) {
  if (!userId) return { error: 'login_required', message: 'Cần đăng nhập để tra đơn hàng.' };

  const code = String(orderCode || '').trim().toUpperCase();
  if (!code) return { error: 'missing_order_code' };

  const order = await Order.findOne({ code, user: userId }).lean();
  if (!order) return { error: 'order_not_found' };

  const timeline = await buildOrderTimeline(order);
  return {
    order: {
      code: order.code,
      status: order.status,
      total: order.total,
      trackingCode: order.shipment?.labelId || null,
      carrierStatus: order.shipment?.carrierStatus || null,
    },
    events: (timeline.events || []).slice(-6).map((event) => ({
      title: event.title,
      status: event.status,
      at: event.at,
      note: event.note || '',
    })),
  };
}
