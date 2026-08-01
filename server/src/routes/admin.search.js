import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = express.Router();

function normalizeQuery(raw) {
  return String(raw || '').trim().toLowerCase().replace(/^#/, '');
}

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const q = normalizeQuery(req.query.q);
    if (q.length < 2) {
      return res.json({ orders: [], products: [], users: [] });
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const limit = 8;

    const orderOr = [
      { 'shippingInfo.fullName': regex },
      { 'shippingInfo.phone': regex },
      { 'shippingInfo.email': regex },
    ];
    if (mongoose.Types.ObjectId.isValid(q)) {
      orderOr.push({ _id: q });
    }

    const [orderDocs, productDocs, userDocs] = await Promise.all([
      Order.find({ $or: orderOr }).sort({ createdAt: -1 }).limit(40).lean(),
      Product.find({
        deletedAt: null,
        $or: [{ name: regex }, { brand: regex }, { slug: regex }, { 'category.label': regex }],
      })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean(),
      User.find({
        role: 'customer',
        $or: [{ name: regex }, { email: regex }],
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('_id name email')
        .lean(),
    ]);

    let orderCandidates = orderDocs;
    if (/^[a-f0-9]{4,24}$/i.test(q) && orderCandidates.length === 0) {
      orderCandidates = await Order.find({}).sort({ createdAt: -1 }).limit(300).lean();
    }

    const orders = orderCandidates
      .filter((order) => {
        const id = String(order._id).toLowerCase();
        return (
          id.includes(q) ||
          id.slice(-8).includes(q) ||
          regex.test(order.shippingInfo?.fullName || '') ||
          regex.test(order.shippingInfo?.phone || '') ||
          regex.test(order.shippingInfo?.email || '')
        );
      })
      .slice(0, limit)
      .map((order) => ({
        id: String(order._id),
        shortId: String(order._id).slice(-8).toUpperCase(),
        label: order.shippingInfo?.fullName || 'Khách hàng',
        meta: `${Number(order.total || 0).toLocaleString('vi-VN')} đ · ${order.status}`,
        href: `/admin/orders?q=${encodeURIComponent(q)}&orderId=${order._id}`,
      }));

    const products = productDocs.map((product) => ({
      id: String(product._id),
      label: product.name,
      meta: `${product.category?.label || ''} · ${Number(product.price || 0).toLocaleString('vi-VN')} đ`,
      href: `/admin/prices?q=${encodeURIComponent(product.name)}`,
    }));

    const users = userDocs.map((user) => ({
      id: String(user._id),
      label: user.name,
      meta: user.email,
      href: `/admin/users?q=${encodeURIComponent(user.email || user.name)}`,
    }));

    return res.json({ orders, products, users, query: q });
  } catch (error) {
    return next(error);
  }
});

export default router;
