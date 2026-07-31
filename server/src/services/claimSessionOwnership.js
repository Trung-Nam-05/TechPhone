import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import { getSessionId } from '../utils/cart.js';

/**
 * Gắn đơn/giỏ guest (theo x-session-id) vào user vừa login/register.
 * @returns {{ claimedOrders: number, claimedCart: boolean }}
 */
export async function claimSessionOwnership(req, userId) {
  const sessionId = getSessionId(req);
  if (!sessionId || !userId) {
    return { claimedOrders: 0, claimedCart: false };
  }

  const orderResult = await Order.updateMany(
    {
      sessionId,
      $or: [{ user: null }, { user: { $exists: false } }],
    },
    { $set: { user: userId } },
  );

  let claimedCart = false;
  const guestCart = await Cart.findOne({ sessionId });
  if (guestCart) {
    const userCart = await Cart.findOne({ user: userId });
    if (!userCart) {
      await Cart.updateOne(
        { _id: guestCart._id },
        { $set: { user: userId }, $unset: { sessionId: 1 } },
      );
      claimedCart = true;
    } else if (String(userCart._id) !== String(guestCart._id)) {
      const merged = new Map();
      for (const item of [...(userCart.items || []), ...(guestCart.items || [])]) {
        const key = String(item.product);
        const prev = merged.get(key) || 0;
        merged.set(key, prev + Number(item.quantity || 0));
      }
      userCart.items = [...merged.entries()].map(([product, quantity]) => ({
        product,
        quantity: Math.max(1, quantity),
      }));
      if ((!userCart.appliedCoupons || userCart.appliedCoupons.length === 0) && guestCart.appliedCoupons?.length) {
        userCart.appliedCoupons = guestCart.appliedCoupons;
      }
      await userCart.save();
      await guestCart.deleteOne();
      claimedCart = true;
    }
  }

  return {
    claimedOrders: orderResult.modifiedCount || 0,
    claimedCart,
  };
}
