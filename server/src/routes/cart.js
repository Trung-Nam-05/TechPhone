import express from 'express';
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { getOwnershipFilter, getOwnershipForWrite } from '../utils/ownership.js';
import { calculatePricing, PricingError } from '../services/pricing.js';
import { MAX_LINE_QUANTITY } from '../constants/cartLimits.js';

const router = express.Router();

async function formatCart(cartDoc) {
  const cart = cartDoc?.toObject ? cartDoc.toObject() : cartDoc;
  if (!cart) {
    const pricing = await calculatePricing({ lineItems: [], couponCodes: [] });
    return {
      items: [],
      itemCount: 0,
      subtotal: pricing.subtotal,
      shippingFee: pricing.shippingFee,
      productDiscountTotal: pricing.productDiscountTotal,
      shippingDiscountTotal: pricing.shippingDiscountTotal,
      couponDiscountTotal: pricing.couponDiscountTotal,
      total: pricing.total,
      appliedCoupons: [],
    };
  }

  const items = (cart.items || []).map((item) => {
    const product = item.product;
    const price = product?.price || 0;
    return {
      product: product
        ? {
            _id: product._id,
            legacyId: product.legacyId,
            name: product.name,
            image: product.image,
            price: product.price,
            oldPrice: product.oldPrice,
            category: product.category,
            slug: product.slug,
          }
        : null,
      quantity: item.quantity,
      lineTotal: price * item.quantity,
    };
  });

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const pricing = await calculatePricing({
    lineItems: items.map((item) => ({
      quantity: item.quantity,
      price: item.product?.price || 0,
    })),
    couponCodes: (cart.appliedCoupons || []).map((item) => item.code),
  });

  return {
    items,
    itemCount,
    subtotal: pricing.subtotal,
    shippingFee: pricing.shippingFee,
    productDiscountTotal: pricing.productDiscountTotal,
    shippingDiscountTotal: pricing.shippingDiscountTotal,
    couponDiscountTotal: pricing.couponDiscountTotal,
    total: pricing.total,
    appliedCoupons: pricing.appliedCoupons,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const ownershipFilter = getOwnershipFilter(req);
    if (!ownershipFilter) {
      return res.status(400).json({ message: 'Missing cart ownership context.' });
    }

    const cart = await Cart.findOne(ownershipFilter).populate('items.product').lean();
    return res.json(await formatCart(cart));
  } catch (error) {
    return next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const ownership = getOwnershipForWrite(req);
    if (!ownership) {
      return res.status(400).json({ message: 'Missing cart ownership context.' });
    }

    const incomingItems = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!incomingItems) {
      return res.status(400).json({ message: 'Body must include items array.' });
    }

    const normalized = [];
    for (const item of incomingItems) {
      const quantity = Number(item?.quantity || 0);
      if (quantity <= 0) continue;
      if (quantity > MAX_LINE_QUANTITY) {
        return res.status(400).json({
          message: `Mỗi sản phẩm tối đa ${MAX_LINE_QUANTITY} sản phẩm/đơn.`,
        });
      }

      const productId = item?.productId;
      const isObjectId = mongoose.Types.ObjectId.isValid(productId);
      const isLegacyId = /^\d+$/.test(String(productId || ''));
      if (!productId || (!isObjectId && !isLegacyId)) {
        return res.status(400).json({ message: `Invalid productId: ${productId}` });
      }
      normalized.push({ product: String(productId), quantity });
    }

    const resolvedItems = [];
    for (const item of normalized) {
      const rawProductId = String(item.product);
      let product = null;
      if (mongoose.Types.ObjectId.isValid(rawProductId)) {
        product = await Product.findOne({ _id: rawProductId, isActive: true }).select('_id stock');
      } else if (/^\d+$/.test(rawProductId)) {
        product = await Product.findOne({ legacyId: Number(rawProductId), isActive: true }).select('_id stock');
      }

      if (!product) {
        return res.status(400).json({ message: `Product not found: ${rawProductId}` });
      }

      resolvedItems.push({ product: String(product._id), quantity: item.quantity });
    }

    const dedupedByProduct = new Map();
    for (const item of resolvedItems) {
      const current = dedupedByProduct.get(item.product);
      dedupedByProduct.set(item.product, current ? current + item.quantity : item.quantity);
    }

    const dedupedItems = Array.from(dedupedByProduct.entries()).map(([product, quantity]) => ({
      product,
      quantity,
    }));

    const productIds = dedupedItems.map((item) => item.product);
    const existingProducts = await Product.find({ _id: { $in: productIds }, isActive: true }).select('_id stock price');
    const productMap = new Map(existingProducts.map((product) => [String(product._id), product]));

    for (const item of dedupedItems) {
      const existing = productMap.get(String(item.product));
      if (!existing) {
        return res.status(400).json({ message: `Product not found: ${item.product}` });
      }
      if (item.quantity > existing.stock) {
        return res
          .status(400)
          .json({ message: `Quantity exceeds stock for product ${item.product}. Available: ${existing.stock}` });
      }
    }

    const couponCodes = Array.isArray(req.body?.couponCodes) ? req.body.couponCodes : [];
    const pricing = await calculatePricing({
      lineItems: dedupedItems.map((item) => ({
        quantity: item.quantity,
        price: productMap.get(String(item.product))?.price || 0,
      })),
      couponCodes,
    });

    await Cart.findOneAndUpdate(
      ownership.user ? { user: ownership.user } : { sessionId: ownership.sessionId },
      {
        ...ownership,
        items: dedupedItems,
        appliedCoupons: pricing.appliedCoupons.map((coupon) => ({
          coupon: coupon.coupon,
          code: coupon.code,
          scope: coupon.scope,
        })),
      },
      { upsert: true, new: true, runValidators: true },
    );

    const updatedCart = await Cart.findOne(
      ownership.user ? { user: ownership.user } : { sessionId: ownership.sessionId },
    ).populate('items.product');
    return res.json(await formatCart(updatedCart));
  } catch (error) {
    if (error instanceof PricingError) {
      return res.status(400).json({ message: error.message, code: error.code });
    }
    return next(error);
  }
});

export default router;
