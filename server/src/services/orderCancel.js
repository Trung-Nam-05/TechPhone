import Product from '../models/Product.js';
import FlashSale from '../models/FlashSale.js';
import InventoryMovement from '../models/InventoryMovement.js';

/**
 * Restore stock (and flash sale counters) after an order is cancelled.
 * Must run inside the same Mongo session as other order updates when applicable.
 */
export async function restoreInventoryForCancelledOrder(order, { session, actorUserId = null, note = '' } = {}) {
  const orderId = order._id;
  for (const line of order.items || []) {
    const productId = line.product;
    const qty = line.quantity || 0;
    if (!productId || qty <= 0) continue;

    const product = await Product.findById(productId).session(session || null);
    if (!product) continue;

    const previousStock = product.stock;
    product.stock = previousStock + qty;
    await product.save({ session });

    await InventoryMovement.create(
      [
        {
          product: productId,
          type: 'adjustment',
          quantity: qty,
          previousStock,
          nextStock: product.stock,
          note: note || 'Stock restored after order cancellation.',
          order: orderId,
          actor: actorUserId,
        },
      ],
      { session },
    );

    if (line.priceSource === 'flash_sale' && line.flashSaleId) {
      const sale = await FlashSale.findById(line.flashSaleId).session(session || null);
      if (sale) {
        sale.soldCount = Math.max(0, (sale.soldCount || 0) - qty);
        await sale.save({ session });
      }
    }
  }
}

export function isOrderOwnedByUser(order, userId) {
  if (!order?.user || !userId) return false;
  return String(order.user) === String(userId);
}
