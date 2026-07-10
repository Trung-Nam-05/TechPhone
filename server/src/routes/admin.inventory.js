import express from 'express';
import Product from '../models/Product.js';
import InventoryMovement from '../models/InventoryMovement.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { writeAdminAuditLog } from '../utils/audit.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/movements', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const items = await InventoryMovement.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('product', 'name')
      .lean();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post('/adjust', async (req, res, next) => {
  try {
    const productId = String(req.body?.productId || '').trim();
    const delta = Number(req.body?.delta || 0);
    const note = String(req.body?.note || '').trim();
    if (!productId || !Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ message: 'productId and non-zero delta are required.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    const previousStock = product.stock;
    const nextStock = previousStock + delta;
    if (nextStock < 0) {
      return res.status(400).json({ message: 'Stock cannot be negative.' });
    }

    product.stock = nextStock;
    await product.save();

    await InventoryMovement.create({
      product: product._id,
      type: 'adjustment',
      quantity: delta,
      previousStock,
      nextStock,
      note: note || 'Manual stock adjustment.',
      actor: req.auth.userId,
    });

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'inventory.adjust',
      entityType: 'product',
      entityId: product._id,
      metadata: { previousStock, nextStock, delta, note },
    });

    return res.json(product);
  } catch (error) {
    return next(error);
  }
});

export default router;
