import express from 'express';
import mongoose from 'mongoose';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import Order from '../models/Order.js';
import { getOwnershipForWrite } from '../utils/ownership.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = express.Router();

const ALLOWED_EVENT_NAMES = new Set(['view_product', 'add_to_cart', 'begin_checkout', 'purchase']);

router.post('/events', async (req, res, next) => {
  try {
    const ownership = getOwnershipForWrite(req);
    if (!ownership) {
      return res.status(400).json({ message: 'Missing analytics ownership context.' });
    }

    const eventName = String(req.body?.eventName || '').trim();
    if (!ALLOWED_EVENT_NAMES.has(eventName)) {
      return res.status(400).json({ message: 'Unsupported eventName.' });
    }

    const productIdRaw = req.body?.productId;
    const productId = mongoose.Types.ObjectId.isValid(productIdRaw) ? productIdRaw : null;
    const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

    await AnalyticsEvent.create({
      eventName,
      user: ownership.user,
      sessionId: ownership.sessionId,
      path: String(req.body?.path || '').slice(0, 256),
      productId,
      metadata,
    });

    return res.status(201).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/funnel', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [viewProduct, addToCart, beginCheckout, purchase] = await Promise.all([
      AnalyticsEvent.countDocuments({ eventName: 'view_product' }),
      AnalyticsEvent.countDocuments({ eventName: 'add_to_cart' }),
      AnalyticsEvent.countDocuments({ eventName: 'begin_checkout' }),
      AnalyticsEvent.countDocuments({ eventName: 'purchase' }),
    ]);

    return res.json({
      steps: { viewProduct, addToCart, beginCheckout, purchase },
      conversionRates: {
        viewToCart: viewProduct > 0 ? Number(((addToCart / viewProduct) * 100).toFixed(2)) : 0,
        cartToCheckout: addToCart > 0 ? Number(((beginCheckout / addToCart) * 100).toFixed(2)) : 0,
        checkoutToPurchase: beginCheckout > 0 ? Number(((purchase / beginCheckout) * 100).toFixed(2)) : 0,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/revenue', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const matchCompleted = { status: 'completed' };
    const [aggCompleted, aggAll] = await Promise.all([
      Order.aggregate([
        { $match: matchCompleted },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([{ $group: { _id: null, grandTotal: { $sum: '$total' }, count: { $sum: 1 } } }]),
    ]);
    const completedRow = aggCompleted[0] || { totalRevenue: 0, orderCount: 0 };
    const allRow = aggAll[0] || { grandTotal: 0, count: 0 };
    return res.json({
      completedOrders: {
        totalRevenue: completedRow.totalRevenue || 0,
        orderCount: completedRow.orderCount || 0,
      },
      allOrders: {
        sumTotal: allRow.grandTotal || 0,
        orderCount: allRow.count || 0,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
