import PriceHistory from '../models/PriceHistory.js';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function getPriceHistorySince(days = 365) {
  const safeDays = Math.min(Math.max(Number(days) || 365, 1), 365);
  return new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
}

/**
 * Ghi nhận thay đổi giá bán sản phẩm.
 * @returns {Promise<object|null>} document lịch sử hoặc null nếu không đổi giá
 */
export async function recordProductPriceChange({
  product,
  oldPrice,
  newPrice,
  actor = null,
  source = 'product_update',
  note = '',
}) {
  const next = Number(newPrice);
  if (!Number.isFinite(next) || next < 0) {
    throw new Error('INVALID_NEW_PRICE');
  }

  const prev =
    oldPrice === null || oldPrice === undefined || oldPrice === ''
      ? null
      : Number(oldPrice);

  if (prev !== null && (!Number.isFinite(prev) || prev < 0)) {
    throw new Error('INVALID_OLD_PRICE');
  }

  if (prev !== null && prev === next && source !== 'create') {
    return null;
  }

  const delta = prev === null ? next : next - prev;

  return PriceHistory.create({
    product: product._id || product,
    productName: product.name || '',
    oldPrice: prev,
    newPrice: next,
    delta,
    source,
    note: String(note || '').trim(),
    actor,
  });
}

export { ONE_YEAR_MS };
