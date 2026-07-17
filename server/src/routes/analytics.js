import express from 'express';
import mongoose from 'mongoose';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
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

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

router.get('/dashboard', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const chartStart = new Date(todayStart);
    chartStart.setDate(chartStart.getDate() - 14);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      orderCountsByStatus,
      paymentMethodBreakdown,
      paymentStatusBreakdown,
      revenueCompleted,
      revenueAll,
      ordersToday,
      ordersWeek,
      revenueToday,
      revenueWeek,
      revenueMonth,
      revenueByDay,
      topProducts,
      totalCustomers,
      totalProducts,
      pendingCancelRequests,
      pendingSupport,
      funnelSteps,
      recentOrdersRaw,
    ] = await Promise.all([
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } }]),
      Order.aggregate([{ $group: { _id: '$paymentStatus', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' }, orderCount: { $sum: 1 } } },
      ]),
      Order.aggregate([{ $group: { _id: null, grandTotal: { $sum: '$total' }, count: { $sum: 1 } } }]),
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      Order.countDocuments({ createdAt: { $gte: weekStart } }),
      Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: chartStart } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            quantitySold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.lineTotal' },
          },
        },
        { $sort: { quantitySold: -1 } },
        { $limit: 5 },
      ]),
      User.countDocuments({ role: { $ne: 'admin' } }),
      Product.countDocuments({ isActive: true, deletedAt: null }),
      Order.countDocuments({ cancelRequestStatus: 'pending' }),
      Order.countDocuments({ supportStatus: { $in: ['customer_contacted', 'awaiting_response'] } }),
      Promise.all([
        AnalyticsEvent.countDocuments({ eventName: 'view_product' }),
        AnalyticsEvent.countDocuments({ eventName: 'add_to_cart' }),
        AnalyticsEvent.countDocuments({ eventName: 'begin_checkout' }),
        AnalyticsEvent.countDocuments({ eventName: 'purchase' }),
      ]),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(6)
        .select('items shippingInfo total status createdAt paymentMethod')
        .lean(),
    ]);

    const completedRow = revenueCompleted[0] || { totalRevenue: 0, orderCount: 0 };
    const allRow = revenueAll[0] || { grandTotal: 0, count: 0 };
    const [viewProduct, addToCart, beginCheckout, purchase] = funnelSteps;

    const statusMap = Object.fromEntries(orderCountsByStatus.map((row) => [row._id, row.count]));
    const paymentMethods = paymentMethodBreakdown.map((row) => ({
      method: row._id || 'unknown',
      count: row.count,
      total: row.total,
    }));
    const paymentStatuses = Object.fromEntries(paymentStatusBreakdown.map((row) => [row._id, row.count]));

    return res.json({
      summary: {
        totalOrders: allRow.count || 0,
        totalRevenue: completedRow.totalRevenue || 0,
        ordersToday,
        ordersThisWeek: ordersWeek,
        revenueToday: revenueToday[0]?.total || 0,
        revenueThisWeek: revenueWeek[0]?.total || 0,
        revenueThisMonth: revenueMonth[0]?.total || 0,
        totalCustomers,
        activeProducts: totalProducts,
        pendingCancelRequests,
        openSupportCases: pendingSupport,
        averageOrderValue:
          completedRow.orderCount > 0 ? Math.round(completedRow.totalRevenue / completedRow.orderCount) : 0,
      },
      ordersByStatus: statusMap,
      paymentMethods,
      paymentStatuses,
      revenueByDay: revenueByDay.map((row) => ({
        date: row._id,
        orders: row.orders,
        revenue: row.revenue,
      })),
      topProducts: topProducts.map((row) => ({
        productId: row._id,
        name: row.name,
        quantitySold: row.quantitySold,
        revenue: row.revenue,
      })),
      funnel: {
        steps: { viewProduct, addToCart, beginCheckout, purchase },
        conversionRates: {
          viewToCart: viewProduct > 0 ? Number(((addToCart / viewProduct) * 100).toFixed(1)) : 0,
          cartToCheckout: addToCart > 0 ? Number(((beginCheckout / addToCart) * 100).toFixed(1)) : 0,
          checkoutToPurchase: beginCheckout > 0 ? Number(((purchase / beginCheckout) * 100).toFixed(1)) : 0,
        },
      },
      recentOrders: (recentOrdersRaw || []).map((order) => ({
        id: order._id,
        productName: order.items?.[0]?.name || '—',
        customerName: order.shippingInfo?.fullName || '—',
        address: order.shippingInfo?.address || order.shippingInfo?.city || '—',
        pieceCount: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        total: order.total || 0,
        status: order.status,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
      })),
      allOrdersValue: allRow.grandTotal || 0,
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
