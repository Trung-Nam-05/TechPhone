import mongoose from 'mongoose';
import Order from '../models/Order.js';
import FlashSale from '../models/FlashSale.js';
import { ACTIVE_FULFILLMENT_ORDER_STATUSES } from '../constants/orderStatus.js';
import { isFlashSaleBlockingDelete, resolveFlashSaleState } from '../patterns/state/flashSaleStateRegistry.js';

export const BESTSELLER_SOLD_UNITS = Number(process.env.PRODUCT_BESTSELLER_SOLD_UNITS || 10);

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
    status: { $in: ACTIVE_FULFILLMENT_ORDER_STATUSES },
    'items.product': oid,
  });
}

/** Kiểm tra sản phẩm có được soft-delete không. */
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

  const now = new Date();
  const sale = await FlashSale.findOne({
    product: productId,
    isDeleted: false,
    isEnabled: true,
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  })
    .select('_id name startsAt endsAt soldCount quota isDeleted isEnabled')
    .lean();

  if (sale && isFlashSaleBlockingDelete(resolveFlashSaleState(sale, now))) {
    return {
      ok: false,
      code: 'PRODUCT_IN_FLASH_SALE',
      message: 'Không thể xóa: sản phẩm đang trong flash sale. Hãy tắt/kết thúc flash sale trước.',
    };
  }

  return { ok: true, soldUnits };
}

export { ACTIVE_FULFILLMENT_ORDER_STATUSES as ACTIVE_ORDER_STATUSES } from '../constants/orderStatus.js';
