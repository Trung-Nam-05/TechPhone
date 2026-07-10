import express from 'express';
import Product from '../models/Product.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { writeAdminAuditLog } from '../utils/audit.js';

const router = express.Router();

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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
      oldPrice = null,
      stock = 0,
      image = '',
      description = '',
      brand = '',
      isActive = true,
      slug,
    } = req.body || {};

    if (!name?.trim() || !categoryKey?.trim() || !categoryLabel?.trim() || Number(price) < 0) {
      return res.status(400).json({ message: 'Invalid payload.' });
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
        key: categoryKey.trim(),
        label: categoryLabel.trim(),
      },
      brand: brand.trim(),
      price: Number(price),
      oldPrice: oldPrice === null || oldPrice === '' ? null : Number(oldPrice),
      stock: Number(stock),
      image: image.trim(),
      images: image ? [image.trim()] : [],
      description: description.trim(),
      isActive: Boolean(isActive),
      deletedAt: null,
      deletedBy: null,
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
      oldPrice,
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

    if (name !== undefined) product.name = name;
    if (categoryKey !== undefined) product.category.key = categoryKey;
    if (categoryLabel !== undefined) product.category.label = categoryLabel;
    if (price !== undefined) product.price = Number(price);
    if (oldPrice !== undefined) product.oldPrice = oldPrice === null || oldPrice === '' ? null : Number(oldPrice);
    if (stock !== undefined) product.stock = Number(stock);
    if (image !== undefined) {
      product.image = image;
      product.images = image ? [image] : [];
    }
    if (description !== undefined) product.description = description;
    if (brand !== undefined) product.brand = brand;
    if (isActive !== undefined) product.isActive = Boolean(isActive);
    if (slug !== undefined && slug.trim()) product.slug = slugify(slug.trim());

    await product.save();
    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'product.update',
      entityType: 'product',
      entityId: product._id,
      metadata: { name: product.name, price: product.price, stock: product.stock, isActive: product.isActive },
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
    product.isActive = false;
    product.deletedAt = new Date();
    product.deletedBy = req.auth.userId;
    await product.save();
    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'product.soft_delete',
      entityType: 'product',
      entityId: product._id,
      metadata: { name: product.name },
    });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
