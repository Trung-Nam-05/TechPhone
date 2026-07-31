import mongoose from 'mongoose';
import Order from '../models/Order.js';
import FlashSale from '../models/FlashSale.js';

/** Đơn còn đang xử lý / giao — không được xóa SP đang nằm trong các đơn này. */
export const ACTIVE_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'await_pickup',
  'picked',
  'shipping',
  'delivery_failed',
];

/** Ngưỡng "bán chạy": đủ số lượng đã giao thành công thì không cho soft-delete. */
export const BESTSELLER_SOLD_UNITS = Number(process.env.PRODUCT_BESTSELLER_SOLD_UNITS || 10);

/**
 * Tổng số lượng đã bán (đơn hoàn tất) của một sản phẩm.
 */
export async function getCompletedSoldUnits(productId) {
  const oid = new mongoose.Types.ObjectId(String(productId));
  const [row] = await Order.aggregate([
    { $match: { status: 'completed' } },
    { $unwind: '$items' },
    { $match: { 'items.product': oid } },
    {
      $group: {
        _id: '$items.product',
        soldUnits: { $sum: '$items.quantity' },
      },
    },
  ]);
  return Number(row?.soldUnits || 0);
}

export async function countActiveOrdersContainingProduct(productId) {
  const oid = new mongoose.Types.ObjectId(String(productId));
  return Order.countDocuments({
    status: { $in: ACTIVE_ORDER_STATUSES },
    'items.product': oid,
  });
}

export async function hasActiveFlashSale(productId) {
  const now = new Date();
  const sale = await FlashSale.findOne({
    product: productId,
    isDeleted: false,
    isEnabled: true,
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  })
    .select('_id')
    .lean();
  return Boolean(sale);
}

/**
 * Kiểm tra có được soft-delete sản phẩm không.
 * @returns {{ ok: true } | { ok: false, code: string, message: string, details?: object }}
 */
export async function assertProductCanBeDeleted(productId) {
  const activeOrders = await countActiveOrdersContainingProduct(productId);
  if (activeOrders > 0) {
    return {
      ok: false,
      code: 'PRODUCT_IN_ACTIVE_ORDERS',
      message: `Không thể xóa: sản phẩm đang nằm trong ${activeOrders} đơn hàng chưa hoàn tất. Hãy hoàn tất/hủy đơn hoặc tạm ngưng bán (tắt "Đang bán").`,
      details: { activeOrders },
    };
  }

  const soldUnits = await getCompletedSoldUnits(productId);
  if (soldUnits >= BESTSELLER_SOLD_UNITS) {
    return {
      ok: false,
      code: 'PRODUCT_BESTSELLER',
      message: `Không thể xóa: sản phẩm đang bán chạy (đã bán ${soldUnits} đơn vị, ngưỡng ${BESTSELLER_SOLD_UNITS}). Chỉ nên tạm ngưng bán thay vì xóa để giữ lịch sử đơn/đánh giá.`,
      details: { soldUnits, threshold: BESTSELLER_SOLD_UNITS },
    };
  }

  if (await hasActiveFlashSale(productId)) {
    return {
      ok: false,
      code: 'PRODUCT_IN_FLASH_SALE',
      message: 'Không thể xóa: sản phẩm đang trong flash sale. Hãy tắt/kết thúc flash sale trước.',
    };
  }

  return { ok: true, soldUnits };
}
