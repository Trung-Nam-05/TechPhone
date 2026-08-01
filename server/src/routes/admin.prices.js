import express from 'express';
import Product from '../models/Product.js';
import PriceHistory from '../models/PriceHistory.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { writeAdminAuditLog } from '../utils/audit.js';
import { getPriceHistorySince, recordProductPriceChange } from '../services/priceHistory.js';
import {
  applyProductPriceFields,
  assertNewPriceAboveFlashSales,
  assertValidProductObjectId,
  parseVndPrice,
  trimPriceNote,
} from '../services/productPrice.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/prices/history
 * Query: productId?, days? (1–365, mặc định 365), limit? (1–500)
 */
router.get('/history', async (req, res, next) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days || 365), 1), 365);
    const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 500);
    const productId = String(req.query.productId || '').trim();

    const filter = { createdAt: { $gte: getPriceHistorySince(days) } };
    if (productId) {
      const idCheck = assertValidProductObjectId(productId);
      if (!idCheck.ok) {
        return res.status(400).json({ message: idCheck.message });
      }
      filter.product = productId;
    }

    const items = await PriceHistory.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('product', 'name price oldPrice slug')
      .populate('actor', 'name email')
      .lean();

    return res.json({
      items,
      meta: {
        days,
        since: getPriceHistorySince(days).toISOString(),
        count: items.length,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/admin/prices/adjust
 * Body: { productId, newPrice, note? }
 * Đổi giá bán + ghi lịch sử (giá cũ → giá mới).
 */
router.post('/adjust', async (req, res, next) => {
  try {
    const productIdRaw = String(req.body?.productId || '').trim();
    const note = trimPriceNote(req.body?.note);

    const idCheck = assertValidProductObjectId(productIdRaw);
    if (!idCheck.ok) {
      return res.status(400).json({ message: idCheck.message });
    }

    const priceCheck = parseVndPrice(req.body?.newPrice);
    if (!priceCheck.ok) {
      return res.status(400).json({ message: priceCheck.message });
    }
    const newPrice = priceCheck.price;

    const product = await Product.findById(productIdRaw);
    if (!product || product.deletedAt) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    }

    const previousPrice = Number(product.price);
    if (previousPrice === newPrice) {
      return res.status(400).json({ message: 'Giá mới phải khác giá hiện tại.' });
    }

    const flashCheck = await assertNewPriceAboveFlashSales(product._id, newPrice);
    if (!flashCheck.ok) {
      return res.status(400).json({
        message: flashCheck.message,
        code: flashCheck.code,
      });
    }

    applyProductPriceFields(product, previousPrice, newPrice);
    await product.save();

    const history = await recordProductPriceChange({
      product,
      oldPrice: previousPrice,
      newPrice,
      actor: req.auth.userId,
      source: 'manual_adjust',
      note: note || 'Điều chỉnh giá thủ công từ trang Quản lý giá.',
    });

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'price.adjust',
      entityType: 'product',
      entityId: product._id,
      metadata: { oldPrice: previousPrice, newPrice, note, isActive: product.isActive },
    });

    return res.json({
      product,
      history,
      warning: product.isActive === false ? 'Sản phẩm đang tắt hiển thị (isActive = false).' : null,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
