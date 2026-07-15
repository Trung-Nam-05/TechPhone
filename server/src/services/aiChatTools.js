import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { enrichProductsWithFlashSale } from './flashSale.js';
import { buildOrderTimeline } from './orderTimeline.js';

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

export const TOOL_DECLARATIONS = [
  {
    name: 'searchProducts',
    description: 'Tìm sản phẩm theo tên, hãng, danh mục hoặc giá tối đa. Trả về tối đa 3 kết quả.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Từ khóa tìm kiếm, ví dụ iPhone 15' },
        category: { type: 'string', description: 'Mã danh mục, ví dụ dien-thoai' },
        brand: { type: 'string', description: 'Thương hiệu, ví dụ Apple, Samsung' },
        maxPrice: { type: 'number', description: 'Giá tối đa VND' },
        limit: { type: 'number', description: 'Số kết quả (mặc định 3)' },
      },
    },
  },
  {
    name: 'getTopProducts',
    description: 'Lấy sản phẩm đắt nhất hoặc rẻ nhất theo giá. Dùng khi hỏi mắc nhất/rẻ nhất/đắt nhất. category: dien-thoai, laptop, phu-kien, dien-may.',
    parameters: {
      type: 'object',
      properties: {
        sort: { type: 'string', description: 'price_desc (đắt nhất) hoặc price_asc (rẻ nhất)' },
        category: { type: 'string', description: 'Mã danh mục, ví dụ dien-thoai' },
        limit: { type: 'number', description: 'Số kết quả (mặc định 3)' },
      },
    },
  },
  {
    name: 'getProductDetail',
    description: 'Lấy chi tiết một sản phẩm theo slug hoặc id.',
    parameters: {
      type: 'object',
      properties: {
        slugOrId: { type: 'string', description: 'Slug hoặc MongoDB id sản phẩm' },
      },
      required: ['slugOrId'],
    },
  },
  {
    name: 'getMyOrders',
    description: 'Lấy danh sách đơn hàng gần nhất của khách đang đăng nhập. Chỉ dùng khi user đã login.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'getOrderTimeline',
    description: 'Tra cứu trạng thái đơn hàng theo mã đơn (ví dụ LAN7EW). Chỉ đơn của user đang login.',
    parameters: {
      type: 'object',
      properties: {
        orderCode: { type: 'string', description: 'Mã đơn hàng TechPhone' },
      },
      required: ['orderCode'],
    },
  },
];

export async function executeTool(name, args, { userId } = {}) {
  switch (name) {
    case 'searchProducts':
      return searchProducts(args || {});
    case 'getTopProducts':
      return getTopProducts(args || {});
    case 'getProductDetail':
      return getProductDetail(args || {});
    case 'getMyOrders':
      return getMyOrders({ userId });
    case 'getOrderTimeline':
      return getOrderTimeline({ userId, orderCode: args?.orderCode });
    default:
      return { error: 'unknown_tool' };
  }
}
