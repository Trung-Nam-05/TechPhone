import express from 'express';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { writeAdminAuditLog } from '../utils/audit.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

function slugifyKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

router.get('/', async (_req, res, next) => {
  try {
    const items = await Category.find({ isDeleted: false }).sort({ sortOrder: 1, label: 1 }).lean();
    const counts = await Product.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$category.key', productCount: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((row) => [row._id, row.productCount]));
    return res.json({
      items: items.map((item) => ({
        ...item,
        productCount: countMap[item.key] || 0,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const label = String(req.body?.label || '').trim();
    const keyInput = String(req.body?.key || '').trim();
    const sortOrder = Number(req.body?.sortOrder ?? 0);
    const isActive = req.body?.isActive !== false;

    if (!label) {
      return res.status(400).json({ message: 'label is required.' });
    }
    const key = slugifyKey(keyInput || label);
    if (!key) {
      return res.status(400).json({ message: 'Invalid category key.' });
    }

    const existing = await Category.findOne({ key });
    if (existing && !existing.isDeleted) {
      return res.status(409).json({ message: `Danh mục "${key}" đã tồn tại.` });
    }

    let category;
    if (existing?.isDeleted) {
      existing.label = label;
      existing.sortOrder = Number.isFinite(sortOrder) ? sortOrder : 0;
      existing.isActive = isActive;
      existing.isDeleted = false;
      category = await existing.save();
    } else {
      category = await Category.create({
        key,
        label,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        isActive,
      });
    }

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'category.create',
      entityType: 'category',
      entityId: category._id,
      metadata: { key: category.key, label: category.label },
    });
    return res.status(201).json(category);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Category key already exists.' });
    }
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, isDeleted: false });
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    const prevKey = category.key;
    const prevLabel = category.label;

    if (req.body?.label !== undefined) {
      const nextLabel = String(req.body.label || '').trim();
      if (!nextLabel) {
        return res.status(400).json({ message: 'label cannot be empty.' });
      }
      category.label = nextLabel;
    }
    if (req.body?.sortOrder !== undefined) {
      const sortOrder = Number(req.body.sortOrder);
      if (!Number.isFinite(sortOrder)) {
        return res.status(400).json({ message: 'sortOrder must be a number.' });
      }
      category.sortOrder = sortOrder;
    }
    if (req.body?.isActive !== undefined) {
      category.isActive = Boolean(req.body.isActive);
    }

    // Không cho đổi key khi đã có sản phẩm (tránh orphan / lệch filter).
    if (req.body?.key !== undefined) {
      const nextKey = slugifyKey(req.body.key);
      if (nextKey && nextKey !== category.key) {
        const productCount = await Product.countDocuments({
          'category.key': category.key,
          deletedAt: null,
        });
        if (productCount > 0) {
          return res.status(409).json({
            message: `Không thể đổi mã danh mục vì còn ${productCount} sản phẩm. Chỉ đổi tên hiển thị (label).`,
          });
        }
        const clash = await Category.findOne({ key: nextKey, isDeleted: false, _id: { $ne: category._id } });
        if (clash) {
          return res.status(409).json({ message: `Mã danh mục "${nextKey}" đã tồn tại.` });
        }
        category.key = nextKey;
      }
    }

    await category.save();

    // Đồng bộ label trên sản phẩm khi đổi tên hiển thị.
    if (category.label !== prevLabel || category.key !== prevKey) {
      await Product.updateMany(
        { 'category.key': prevKey, deletedAt: null },
        { $set: { 'category.key': category.key, 'category.label': category.label } },
      );
    }

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'category.update',
      entityType: 'category',
      entityId: category._id,
      metadata: { key: category.key, label: category.label, prevKey, prevLabel },
    });
    return res.json(category);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, isDeleted: false });
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    const productCount = await Product.countDocuments({
      'category.key': category.key,
      deletedAt: null,
    });
    if (productCount > 0) {
      return res.status(409).json({
        message: `Không thể xóa danh mục "${category.label}" vì còn ${productCount} sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước.`,
        code: 'CATEGORY_HAS_PRODUCTS',
        details: { productCount },
      });
    }

    category.isDeleted = true;
    category.isActive = false;
    await category.save();

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'category.soft_delete',
      entityType: 'category',
      entityId: category._id,
      metadata: { key: category.key },
    });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
