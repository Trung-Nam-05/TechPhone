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

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateParam(value) {
  const str = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [year, month, day] = str.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function resolveRevenueDateRange(query) {
  const todayStart = startOfDay(new Date());
  const todayKey = formatDateKey(todayStart);

  let startDate = parseDateParam(query.startDate);
  let endDate = parseDateParam(query.endDate);

  if (!startDate || !endDate) {
    endDate = new Date(todayStart);
    startDate = addDays(todayStart, -6);
    return {
      startDate,
      endDate,
      startKey: formatDateKey(startDate),
      endKey: formatDateKey(endDate),
      isDefault: true,
    };
  }

  const startKey = formatDateKey(startDate);
  const endKey = formatDateKey(endDate);

  if (startDate > todayStart) {
    return { error: 'Ngày bắt đầu không được lớn hơn hôm nay.' };
  }
  if (endDate < startDate) {
    return { error: 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.' };
  }
  if (endDate > todayStart) {
    endDate = new Date(todayStart);
  }

  return {
    startDate,
    endDate,
    startKey: formatDateKey(startDate),
    endKey: formatDateKey(endDate),
    isDefault: startKey === formatDateKey(addDays(todayStart, -6)) && endKey === todayKey,
  };
}

router.get('/dashboard', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const range = resolveRevenueDateRange(req.query);
    if (range.error) {
      return res.status(400).json({ message: range.error });
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const rangeEndExclusive = addDays(range.endDate, 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedRangeMatch = {
      status: 'completed',
      createdAt: { $gte: range.startDate, $lt: rangeEndExclusive },
    };

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
      periodRevenueAgg,
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
        { $match: completedRangeMatch },
        { $group: { _id: null, totalRevenue: { $sum: '$total' }, orderCount: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: completedRangeMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
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
    const periodRow = periodRevenueAgg[0] || { totalRevenue: 0, orderCount: 0 };
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
        periodRevenue: periodRow.totalRevenue || 0,
        periodOrderCount: periodRow.orderCount || 0,
        periodAverageOrderValue:
          periodRow.orderCount > 0 ? Math.round(periodRow.totalRevenue / periodRow.orderCount) : 0,
      },
      revenueRange: {
        startDate: range.startKey,
        endDate: range.endKey,
        isDefault: range.isDefault,
      },
      ordersByStatus: statusMap,
      paymentMethods,
      paymentStatuses,
      revenueByDay: revenueByDay.map((row) => ({
        date: row._id,
        orders: row.orders,
        completedOrders: row.completedOrders || 0,
        revenue: row.revenue,
      })),
      ordersByDay: revenueByDay.map((row) => ({
        date: row._id,
        orders: row.orders,
        completedOrders: row.completedOrders || 0,
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
