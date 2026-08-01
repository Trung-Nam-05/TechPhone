import mongoose from 'mongoose';
import FlashSale from '../models/FlashSale.js';
import { getFlashSaleStatus } from './flashSale.js';

export const PRICE_NOTE_MAX_LENGTH = 500;

/**
 * Parse & validate giá bán VND (số nguyên > 0).
 */
export function parseVndPrice(raw) {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, message: 'Giá phải là số nguyên VND lớn hơn 0.' };
  }
  return { ok: true, price: n };
}

export function assertValidProductObjectId(productId) {
  const id = String(productId || '').trim();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { ok: false, message: 'Mã sản phẩm không hợp lệ.' };
  }
  return { ok: true, id };
}

/**
 * Cập nhật price / oldPrice / discount trên document Product (mongoose).
 * Chỉ set oldPrice khi giảm giá — đồng bộ với trang Quản lý sản phẩm.
 */
export function applyProductPriceFields(product, previousPrice, newPrice) {
  const prev = Number(previousPrice);
  const next = Number(newPrice);
  product.price = next;

  if (next < prev) {
    product.oldPrice = prev;
    product.discount = Math.max(0, Math.round(((prev - next) / prev) * 100));
  } else {
    product.oldPrice = null;
    product.discount = 0;
  }
}

/**
 * Giá bán mới phải cao hơn mọi flash sale đang/upcoming của SP.
 */
export async function assertNewPriceAboveFlashSales(productId, newPrice) {
  const now = new Date();
  const sales = await FlashSale.find({
    product: productId,
    isDeleted: false,
    isEnabled: true,
    endsAt: { $gt: now },
  }).lean();

  for (const sale of sales) {
    const status = getFlashSaleStatus(sale, now);
    if (status === 'ended' || status === 'inactive') continue;

    const flashPrice = Number(sale.flashPrice);
    if (Number(newPrice) <= flashPrice) {
      const statusLabel = status === 'upcoming' ? 'sắp diễn ra' : 'đang chạy';
      return {
        ok: false,
        code: 'FLASH_SALE_PRICE_CONFLICT',
        message: `Giá mới phải cao hơn giá flash sale "${sale.name}" (${flashPrice.toLocaleString('vi-VN')} đ, ${statusLabel}). Hãy hạ giá flash hoặc chọn giá bán cao hơn.`,
        flashPrice,
        saleName: sale.name,
        saleStatus: status,
      };
    }
  }

  return { ok: true };
}

export function trimPriceNote(raw, maxLength = PRICE_NOTE_MAX_LENGTH) {
  return String(raw || '').trim().slice(0, maxLength);
}
