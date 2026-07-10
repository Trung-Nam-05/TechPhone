import express from 'express';
import mongoose from 'mongoose';
import FlashSale from '../models/FlashSale.js';
import Product from '../models/Product.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { writeAdminAuditLog } from '../utils/audit.js';
import { getFlashSaleStatus } from '../services/flashSale.js';

const router = express.Router();

function toDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parsePayload(body = {}) {
  const name = String(body.name || '').trim();
  const productId = String(body.productId || '').trim();
  const flashPrice = Number(body.flashPrice);
  const startsAt = toDate(body.startsAt);
  const endsAt = toDate(body.endsAt);
  const quota = Number(body.quota);
  const maxPerOrderQty = body.maxPerOrderQty === undefined ? 5 : Number(body.maxPerOrderQty);
  const isEnabled = body.isEnabled === undefined ? true : Boolean(body.isEnabled);
  const rawPerUserLimit = body.perUserLimit;
  const perUserLimit =
    rawPerUserLimit === undefined || rawPerUserLimit === null || rawPerUserLimit === ''
      ? null
      : Number(rawPerUserLimit);
  return {
    name,
    productId,
    flashPrice,
    startsAt,
    endsAt,
    quota,
    maxPerOrderQty,
    perUserLimit,
    isEnabled,
  };
}

async function ensureNoOverlap({ productId, startsAt, endsAt, excludeId = null }) {
  const query = {
    product: productId,
    isDeleted: false,
    startsAt: { $lt: endsAt },
    endsAt: { $gt: startsAt },
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existed = await FlashSale.findOne(query).select('_id name startsAt endsAt');
  if (existed) {
    return existed;
  }
  return null;
}

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim();
    const now = new Date();
    const items = await FlashSale.find({ isDeleted: false })
      .sort({ startsAt: -1 })
      .populate('product', 'name price stock image isActive')
      .lean();

    const normalized = items
      .map((item) => ({
        ...item,
        status: getFlashSaleStatus(item, now),
        remainingQuantity: Math.max((item.quota || 0) - (item.soldCount || 0), 0),
      }))
      .filter((item) => (status ? item.status === status : true));

    return res.json({ items: normalized });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = parsePayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ message: 'name is required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(payload.productId)) {
      return res.status(400).json({ message: 'productId is invalid.' });
    }
    if (!payload.startsAt || !payload.endsAt || payload.startsAt >= payload.endsAt) {
      return res.status(400).json({ message: 'startsAt must be before endsAt.' });
    }
    if (!Number.isFinite(payload.flashPrice) || payload.flashPrice < 0) {
      return res.status(400).json({ message: 'flashPrice is invalid.' });
    }
    if (!Number.isFinite(payload.quota) || payload.quota <= 0) {
      return res.status(400).json({ message: 'quota must be greater than 0.' });
    }
    if (!Number.isFinite(payload.maxPerOrderQty) || payload.maxPerOrderQty <= 0) {
      return res.status(400).json({ message: 'maxPerOrderQty must be greater than 0.' });
    }
    if (payload.perUserLimit !== null && (!Number.isFinite(payload.perUserLimit) || payload.perUserLimit <= 0)) {
      return res.status(400).json({ message: 'perUserLimit must be greater than 0 when provided.' });
    }

    const product = await Product.findById(payload.productId).select('_id name price isActive deletedAt');
    if (!product || product.deletedAt || !product.isActive) {
      return res.status(400).json({ message: 'Product is not eligible for flash sale.' });
    }
    if (payload.flashPrice >= Number(product.price)) {
      return res.status(400).json({ message: 'flashPrice must be lower than product price.' });
    }

    const overlap = await ensureNoOverlap({
      productId: product._id,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
    });
    if (overlap) {
      return res.status(409).json({
        message: `Flash sale overlaps with existing campaign "${overlap.name}".`,
      });
    }

    const flashSale = await FlashSale.create({
      name: payload.name,
      product: product._id,
      flashPrice: payload.flashPrice,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      quota: payload.quota,
      soldCount: 0,
      maxPerOrderQty: payload.maxPerOrderQty,
      perUserLimit: payload.perUserLimit,
      isEnabled: payload.isEnabled,
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'flash_sale.create',
      entityType: 'flash_sale',
      entityId: flashSale._id,
      metadata: {
        productId: String(product._id),
        productName: product.name,
        flashPrice: payload.flashPrice,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
      },
    });

    const populated = await FlashSale.findById(flashSale._id).populate('product', 'name price stock image');
    return res.status(201).json(populated);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'id is invalid.' });
    }

    const flashSale = await FlashSale.findById(id);
    if (!flashSale || flashSale.isDeleted) {
      return res.status(404).json({ message: 'Flash sale not found.' });
    }

    const payload = parsePayload({
      ...flashSale.toObject(),
      ...req.body,
      productId: req.body?.productId || String(flashSale.product),
      startsAt: req.body?.startsAt || flashSale.startsAt,
      endsAt: req.body?.endsAt || flashSale.endsAt,
      flashPrice: req.body?.flashPrice ?? flashSale.flashPrice,
      quota: req.body?.quota ?? flashSale.quota,
      maxPerOrderQty: req.body?.maxPerOrderQty ?? flashSale.maxPerOrderQty,
      perUserLimit: req.body?.perUserLimit ?? flashSale.perUserLimit,
      isEnabled: req.body?.isEnabled ?? flashSale.isEnabled,
      name: req.body?.name ?? flashSale.name,
    });

    if (!payload.name) {
      return res.status(400).json({ message: 'name is required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(payload.productId)) {
      return res.status(400).json({ message: 'productId is invalid.' });
    }
    if (!payload.startsAt || !payload.endsAt || payload.startsAt >= payload.endsAt) {
      return res.status(400).json({ message: 'startsAt must be before endsAt.' });
    }
    if (!Number.isFinite(payload.flashPrice) || payload.flashPrice < 0) {
      return res.status(400).json({ message: 'flashPrice is invalid.' });
    }
    if (!Number.isFinite(payload.quota) || payload.quota <= 0) {
      return res.status(400).json({ message: 'quota must be greater than 0.' });
    }
    if (!Number.isFinite(payload.maxPerOrderQty) || payload.maxPerOrderQty <= 0) {
      return res.status(400).json({ message: 'maxPerOrderQty must be greater than 0.' });
    }
    if (payload.perUserLimit !== null && (!Number.isFinite(payload.perUserLimit) || payload.perUserLimit <= 0)) {
      return res.status(400).json({ message: 'perUserLimit must be greater than 0 when provided.' });
    }
    if (payload.quota < flashSale.soldCount) {
      return res.status(400).json({ message: 'quota cannot be lower than soldCount.' });
    }

    const product = await Product.findById(payload.productId).select('_id name price isActive deletedAt');
    if (!product || product.deletedAt || !product.isActive) {
      return res.status(400).json({ message: 'Product is not eligible for flash sale.' });
    }
    if (payload.flashPrice >= Number(product.price)) {
      return res.status(400).json({ message: 'flashPrice must be lower than product price.' });
    }

    const overlap = await ensureNoOverlap({
      productId: product._id,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      excludeId: flashSale._id,
    });
    if (overlap) {
      return res.status(409).json({
        message: `Flash sale overlaps with existing campaign "${overlap.name}".`,
      });
    }

    flashSale.name = payload.name;
    flashSale.product = product._id;
    flashSale.flashPrice = payload.flashPrice;
    flashSale.startsAt = payload.startsAt;
    flashSale.endsAt = payload.endsAt;
    flashSale.quota = payload.quota;
    flashSale.maxPerOrderQty = payload.maxPerOrderQty;
    flashSale.perUserLimit = payload.perUserLimit;
    flashSale.isEnabled = payload.isEnabled;
    flashSale.updatedBy = req.auth.userId;
    await flashSale.save();

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'flash_sale.update',
      entityType: 'flash_sale',
      entityId: flashSale._id,
      metadata: {
        productId: String(product._id),
        flashPrice: flashSale.flashPrice,
        startsAt: flashSale.startsAt,
        endsAt: flashSale.endsAt,
      },
    });

    const populated = await FlashSale.findById(flashSale._id).populate('product', 'name price stock image');
    return res.json(populated);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'id is invalid.' });
    }
    const flashSale = await FlashSale.findById(id);
    if (!flashSale || flashSale.isDeleted) {
      return res.status(404).json({ message: 'Flash sale not found.' });
    }

    flashSale.isDeleted = true;
    flashSale.isEnabled = false;
    flashSale.updatedBy = req.auth.userId;
    await flashSale.save();

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'flash_sale.delete',
      entityType: 'flash_sale',
      entityId: flashSale._id,
      metadata: { name: flashSale.name },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
