import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { MAX_LINE_QUANTITY } from '../constants/cartLimits.js';

/**
 * Merge cancelled order line items back into the customer's cart when stock allows.
 */
export async function restoreCartFromOrder(order, ownershipForWrite, { session } = {}) {
  if (!order?.items?.length) {
    return { restoredLines: 0, skippedLines: 0, itemCount: 0 };
  }

  const cartFilter = ownershipForWrite.user
    ? { user: ownershipForWrite.user }
    : { sessionId: ownershipForWrite.sessionId };

  const cart = await Cart.findOne(cartFilter).session(session || null);
  const merged = new Map((cart?.items || []).map((item) => [String(item.product), item.quantity]));

  let restoredLines = 0;
  let skippedLines = 0;

  for (const line of order.items) {
    const productId = String(line.product);
    const product = await Product.findOne({ _id: productId, isActive: true }).session(session || null);
    if (!product) {
      skippedLines += 1;
      continue;
    }

    const requestedQty = line.quantity || 0;
    const currentQty = merged.get(productId) || 0;
    const roomInLine = Math.max(0, MAX_LINE_QUANTITY - currentQty);
    const qtyToAdd = Math.min(requestedQty, product.stock, roomInLine);

    if (qtyToAdd <= 0) {
      skippedLines += 1;
      continue;
    }

    merged.set(productId, currentQty + qtyToAdd);
    restoredLines += 1;
    if (qtyToAdd < requestedQty) {
      skippedLines += 1;
    }
  }

  const items = Array.from(merged.entries()).map(([product, quantity]) => ({ product, quantity }));

  await Cart.findOneAndUpdate(
    cartFilter,
    { ...ownershipForWrite, items },
    { upsert: true, session, new: true },
  );

  return { restoredLines, skippedLines, itemCount: items.length };
}
