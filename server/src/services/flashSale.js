import FlashSale from '../models/FlashSale.js';

export function getFlashSaleStatus(saleDoc, now = new Date()) {
  if (!saleDoc || saleDoc.isDeleted || !saleDoc.isEnabled) {
    return 'inactive';
  }
  if (saleDoc.startsAt > now) return 'upcoming';
  if (saleDoc.endsAt <= now) return 'ended';
  if (saleDoc.soldCount >= saleDoc.quota) return 'sold_out';
  return 'active';
}

function toSalePayload(saleDoc, now = new Date()) {
  if (!saleDoc) return null;
  const status = getFlashSaleStatus(saleDoc, now);
  return {
    id: saleDoc._id,
    name: saleDoc.name,
    status,
    startsAt: saleDoc.startsAt,
    endsAt: saleDoc.endsAt,
    flashPrice: saleDoc.flashPrice,
    quota: saleDoc.quota,
    soldCount: saleDoc.soldCount,
    remainingQuantity: Math.max((saleDoc.quota || 0) - (saleDoc.soldCount || 0), 0),
    maxPerOrderQty: saleDoc.maxPerOrderQty,
  };
}

export async function getFlashSalesForProducts(productIds = [], now = new Date()) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return new Map();
  }

  const sales = await FlashSale.find({
    product: { $in: productIds },
    isDeleted: false,
    isEnabled: true,
    endsAt: { $gt: now },
  })
    .sort({ startsAt: 1 })
    .lean();

  const map = new Map();
  for (const sale of sales) {
    const productId = String(sale.product);
    if (!map.has(productId)) {
      map.set(productId, []);
    }
    map.get(productId).push(sale);
  }
  return map;
}

export function pickBestFlashSale(sales = [], now = new Date()) {
  if (!Array.isArray(sales) || sales.length === 0) return null;

  const activeSales = sales.filter((sale) => getFlashSaleStatus(sale, now) === 'active');
  if (activeSales.length > 0) {
    activeSales.sort((a, b) => a.flashPrice - b.flashPrice || a.startsAt - b.startsAt);
    return toSalePayload(activeSales[0], now);
  }

  const upcomingSales = sales.filter((sale) => getFlashSaleStatus(sale, now) === 'upcoming');
  if (upcomingSales.length > 0) {
    upcomingSales.sort((a, b) => a.startsAt - b.startsAt);
    return toSalePayload(upcomingSales[0], now);
  }

  return null;
}

export async function enrichProductsWithFlashSale(products = [], now = new Date()) {
  if (!Array.isArray(products) || products.length === 0) return [];

  const productIds = products.map((product) => product._id);
  const salesMap = await getFlashSalesForProducts(productIds, now);

  return products.map((product) => {
    const sales = salesMap.get(String(product._id)) || [];
    const flashSale = pickBestFlashSale(sales, now);
    if (!flashSale) {
      return { ...product, flashSale: null };
    }

    if (flashSale.status === 'active') {
      return {
        ...product,
        flashSale,
        originalPrice: product.price,
        price: flashSale.flashPrice,
        oldPrice: product.oldPrice || product.price,
      };
    }

    return {
      ...product,
      flashSale,
      originalPrice: product.price,
    };
  });
}
