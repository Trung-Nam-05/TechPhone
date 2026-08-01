import express from 'express';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { writeAdminAuditLog } from '../utils/audit.js';
import { recordProductPriceChange } from '../services/priceHistory.js';
import {
  applyProductPriceFields,
  assertNewPriceAboveFlashSales,
  parseVndPrice,
} from '../services/productPrice.js';
import { getBrandsForCategory, normalizeBrandKey } from '../../../src/data/brandsByCategory.js';
import { assertProductCanBeDeleted } from '../services/productGuards.js';

const router = express.Router();

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function assertBrandForCategory(categoryKey, brand) {
  const brands = getBrandsForCategory(categoryKey);
  if (!brands.length) return { ok: true, brand: String(brand || '').trim() };
  const normalized = normalizeBrandKey(categoryKey, brand);
  if (!normalized || !brands.some((item) => item.key === normalized)) {
    return {
      ok: false,
      message: `Thương hiệu không hợp lệ cho danh mục. Chọn một trong: ${brands.map((b) => b.label).join(', ')}.`,
    };
  }
  return { ok: true, brand: normalized };
}

async function resolveCategory(categoryKey, categoryLabel) {
  const key = String(categoryKey || '').trim().toLowerCase();
  if (!key) {
    return { ok: false, message: 'categoryKey is required.' };
  }
  const category = await Category.findOne({ key, isDeleted: false, isActive: true }).lean();
  if (!category) {
    return {
      ok: false,
      message: `Danh mục "${key}" không tồn tại hoặc đã bị tắt. Hãy tạo/bật danh mục trước.`,
    };
  }
  return {
    ok: true,
    key: category.key,
    label: String(categoryLabel || category.label || '').trim() || category.label,
  };
}

router.use(requireAuth, requireAdmin);

router.get('/', async (_req, res, next) => {
  try {
    const items = await Product.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      categoryKey,
      categoryLabel,
      price,
      stock = 0,
      image = '',
      description = '',
      brand = '',
      isActive = true,
      slug,
    } = req.body || {};

    if (!name?.trim() || !categoryKey?.trim() || Number(price) < 0) {
      return res.status(400).json({ message: 'Invalid payload.' });
    }

    const categoryCheck = await resolveCategory(categoryKey, categoryLabel);
    if (!categoryCheck.ok) {
      return res.status(400).json({ message: categoryCheck.message });
    }

    const brandCheck = assertBrandForCategory(categoryCheck.key, brand);
    if (!brandCheck.ok) {
      return res.status(400).json({ message: brandCheck.message });
    }

    const computedSlug = (slug?.trim() || slugify(name)).toLowerCase();
    const existedSlug = await Product.findOne({ slug: computedSlug }).select('_id');
    if (existedSlug) {
      return res.status(409).json({ message: 'Slug already exists.' });
    }

    const product = await Product.create({
      name: name.trim(),
      slug: computedSlug,
      category: {
        key: categoryCheck.key,
        label: categoryCheck.label,
      },
      brand: brandCheck.brand,
      price: Number(price),
      oldPrice: null,
      discount: 0,
      stock: Number(stock),
      image: image.trim(),
      images: image ? [image.trim()] : [],
      description: description.trim(),
      isActive: Boolean(isActive),
      deletedAt: null,
      deletedBy: null,
    });
    await recordProductPriceChange({
      product,
      oldPrice: null,
      newPrice: product.price,
      actor: req.auth.userId,
      source: 'create',
      note: 'Giá khởi tạo khi tạo sản phẩm.',
    });
    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'product.create',
      entityType: 'product',
      entityId: product._id,
      metadata: { name: product.name, price: product.price, stock: product.stock },
    });

    return res.status(201).json(product);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      categoryKey,
      categoryLabel,
      price,
      stock,
      image,
      description,
      brand,
      isActive,
      slug,
    } = req.body || {};

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const previousPrice = Number(product.price);
    let priceChanged = false;
    let nextPrice = previousPrice;

    if (name !== undefined) product.name = name;
    if (categoryKey !== undefined || categoryLabel !== undefined) {
      const categoryCheck = await resolveCategory(
        categoryKey !== undefined ? categoryKey : product.category.key,
        categoryLabel !== undefined ? categoryLabel : product.category.label,
      );
      if (!categoryCheck.ok) {
        return res.status(400).json({ message: categoryCheck.message });
      }
      product.category.key = categoryCheck.key;
      product.category.label = categoryCheck.label;
    }
    if (price !== undefined) {
      const priceCheck = parseVndPrice(price);
      if (!priceCheck.ok) {
        return res.status(400).json({ message: priceCheck.message });
      }
      nextPrice = priceCheck.price;
      if (nextPrice !== previousPrice) {
        const flashCheck = await assertNewPriceAboveFlashSales(product._id, nextPrice);
        if (!flashCheck.ok) {
          return res.status(400).json({
            message: flashCheck.message,
            code: flashCheck.code,
          });
        }
        priceChanged = true;
        applyProductPriceFields(product, previousPrice, nextPrice);
      }
    }
    if (stock !== undefined) product.stock = Number(stock);
    if (image !== undefined) {
      product.image = image;
      product.images = image ? [image] : [];
    }
    if (description !== undefined) product.description = description;
    if (brand !== undefined || categoryKey !== undefined) {
      const brandCheck = assertBrandForCategory(
        product.category.key,
        brand !== undefined ? brand : product.brand,
      );
      if (!brandCheck.ok) {
        return res.status(400).json({ message: brandCheck.message });
      }
      product.brand = brandCheck.brand;
    }
    if (isActive !== undefined) product.isActive = Boolean(isActive);
    if (slug !== undefined && slug.trim()) product.slug = slugify(slug.trim());

    await product.save();

    if (priceChanged) {
      await recordProductPriceChange({
        product,
        oldPrice: previousPrice,
        newPrice: nextPrice,
        actor: req.auth.userId,
        source: 'product_update',
        note: 'Cập nhật giá từ trang Quản lý sản phẩm.',
      });
    }

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'product.update',
      entityType: 'product',
      entityId: product._id,
      metadata: {
        name: product.name,
        price: product.price,
        stock: product.stock,
        isActive: product.isActive,
        priceChanged,
        previousPrice: priceChanged ? previousPrice : undefined,
      },
    });
    return res.json(product);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    if (product.deletedAt) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const guard = await assertProductCanBeDeleted(product._id);
    if (!guard.ok) {
      return res.status(409).json({
        message: guard.message,
        code: guard.code,
        details: guard.details || null,
      });
    }

    product.isActive = false;
    product.deletedAt = new Date();
    product.deletedBy = req.auth.userId;
    await product.save();
    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'product.soft_delete',
      entityType: 'product',
      entityId: product._id,
      metadata: { name: product.name, soldUnits: guard.soldUnits || 0 },
    });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
