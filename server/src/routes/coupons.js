import express from 'express';
import Cart from '../models/Cart.js';
import { getOwnershipFilter, getOwnershipForWrite } from '../utils/ownership.js';
import { calculatePricing, PricingError } from '../services/pricing.js';

const router = express.Router();

router.post('/preview', async (req, res, next) => {
  try {
    const ownershipFilter = getOwnershipFilter(req);
    const ownershipForWrite = getOwnershipForWrite(req);
    if (!ownershipFilter || !ownershipForWrite) {
      return res.status(400).json({ message: 'Missing cart ownership context.' });
    }

    const cart = await Cart.findOne(ownershipFilter).populate('items.product');
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    const couponCodes = Array.isArray(req.body?.couponCodes) ? req.body.couponCodes : [];
    const lineItems = cart.items.map((item) => ({
      quantity: item.quantity,
      price: item.product?.price || 0,
    }));
    const pricing = await calculatePricing({
      lineItems,
      couponCodes,
    });

    cart.appliedCoupons = pricing.appliedCoupons.map((coupon) => ({
      coupon: coupon.coupon,
      code: coupon.code,
      scope: coupon.scope,
    }));
    cart.user = ownershipForWrite.user || null;
    cart.sessionId = ownershipForWrite.sessionId || null;
    await cart.save();

    return res.json({
      subtotal: pricing.subtotal,
      shippingFee: pricing.shippingFee,
      productDiscountTotal: pricing.productDiscountTotal,
      shippingDiscountTotal: pricing.shippingDiscountTotal,
      couponDiscountTotal: pricing.couponDiscountTotal,
      total: pricing.total,
      appliedCoupons: pricing.appliedCoupons,
    });
  } catch (error) {
    if (error instanceof PricingError) {
      return res.status(400).json({ message: error.message, code: error.code });
    }
    return next(error);
  }
});

router.delete('/applied', async (req, res, next) => {
  try {
    const ownershipFilter = getOwnershipFilter(req);
    if (!ownershipFilter) {
      return res.status(400).json({ message: 'Missing cart ownership context.' });
    }

    await Cart.findOneAndUpdate(ownershipFilter, { appliedCoupons: [] }, { upsert: true, new: true });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
