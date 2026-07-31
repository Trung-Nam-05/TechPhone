import express from 'express';
import Coupon from '../models/Coupon.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { writeAdminAuditLog } from '../utils/audit.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

function parseOptionalDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function parseOptionalNumber(value, { allowNull = true } = {}) {
  if (value === null || value === undefined || value === '') {
    return allowNull ? null : undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function validateCouponBody(body, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || body.code !== undefined) {
    const code = String(body.code || '')
      .trim()
      .toUpperCase();
    if (!code) errors.push('code is required.');
    else data.code = code;
  }

  if (!partial || body.description !== undefined) {
    data.description = String(body.description || '').trim();
  }

  if (!partial || body.scope !== undefined) {
    const scope = String(body.scope || '').trim();
    if (!['product', 'shipping'].includes(scope)) {
      errors.push('scope must be product or shipping.');
    } else {
      data.scope = scope;
    }
  }

  if (!partial || body.discountType !== undefined) {
    const discountType = String(body.discountType || 'percentage').trim();
    if (!['percentage', 'fixed'].includes(discountType)) {
      errors.push('discountType must be percentage or fixed.');
    } else {
      data.discountType = discountType;
    }
  }

  if (!partial || body.discountValue !== undefined) {
    const discountValue = Number(body.discountValue);
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      errors.push('discountValue must be >= 0.');
    } else {
      data.discountValue = discountValue;
    }
  }

  if (body.minOrderValue !== undefined) {
    const minOrderValue = Number(body.minOrderValue || 0);
    if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
      errors.push('minOrderValue must be >= 0.');
    } else {
      data.minOrderValue = minOrderValue;
    }
  }

  if (body.maxDiscountValue !== undefined) {
    const maxDiscountValue = parseOptionalNumber(body.maxDiscountValue);
    if (maxDiscountValue === undefined) errors.push('maxDiscountValue invalid.');
    else data.maxDiscountValue = maxDiscountValue;
  }

  if (body.usageLimit !== undefined) {
    const usageLimit = parseOptionalNumber(body.usageLimit);
    if (usageLimit === undefined || (usageLimit !== null && usageLimit < 1)) {
      errors.push('usageLimit must be null or >= 1.');
    } else {
      data.usageLimit = usageLimit;
    }
  }

  if (body.startsAt !== undefined) {
    const startsAt = parseOptionalDate(body.startsAt);
    if (startsAt === undefined) errors.push('startsAt invalid.');
    else data.startsAt = startsAt;
  }

  if (body.endsAt !== undefined) {
    const endsAt = parseOptionalDate(body.endsAt);
    if (endsAt === undefined) errors.push('endsAt invalid.');
    else data.endsAt = endsAt;
  }

  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive);
  }

  if (
    data.startsAt &&
    data.endsAt &&
    data.startsAt instanceof Date &&
    data.endsAt instanceof Date &&
    data.startsAt >= data.endsAt
  ) {
    errors.push('startsAt must be before endsAt.');
  }

  if (data.discountType === 'percentage' && data.discountValue > 100) {
    errors.push('percentage discountValue cannot exceed 100.');
  }

  return { errors, data };
}

router.get('/', async (_req, res, next) => {
  try {
    const items = await Coupon.find({ isDeleted: false }).sort({ createdAt: -1 }).lean();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { errors, data } = validateCouponBody(req.body || {});
    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors });
    }

    const coupon = await Coupon.create({
      ...data,
      minOrderValue: data.minOrderValue ?? 0,
      maxDiscountValue: data.maxDiscountValue ?? null,
      usageLimit: data.usageLimit ?? null,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
      isActive: data.isActive !== false,
      usedCount: 0,
    });

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'coupon.create',
      entityType: 'coupon',
      entityId: coupon._id,
      metadata: { code: coupon.code },
    });
    return res.status(201).json(coupon);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Mã giảm giá đã tồn tại.' });
    }
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, isDeleted: false });
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found.' });
    }

    const { errors, data } = validateCouponBody(req.body || {}, { partial: true });
    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors });
    }

    if (data.code && data.code !== coupon.code) {
      const clash = await Coupon.findOne({ code: data.code, isDeleted: false, _id: { $ne: coupon._id } });
      if (clash) {
        return res.status(409).json({ message: 'Mã giảm giá đã tồn tại.' });
      }
    }

    Object.assign(coupon, data);

    const startsAt = coupon.startsAt;
    const endsAt = coupon.endsAt;
    if (startsAt && endsAt && startsAt >= endsAt) {
      return res.status(400).json({ message: 'startsAt must be before endsAt.' });
    }
    if (coupon.discountType === 'percentage' && coupon.discountValue > 100) {
      return res.status(400).json({ message: 'percentage discountValue cannot exceed 100.' });
    }

    await coupon.save();
    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'coupon.update',
      entityType: 'coupon',
      entityId: coupon._id,
      metadata: { code: coupon.code },
    });
    return res.json(coupon);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, isDeleted: false });
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found.' });
    }
    if (coupon.usedCount > 0) {
      // Đã dùng rồi → chỉ tắt, không soft-delete để giữ audit/đối soát.
      coupon.isActive = false;
      await coupon.save();
      await writeAdminAuditLog({
        actor: req.auth.userId,
        action: 'coupon.deactivate_used',
        entityType: 'coupon',
        entityId: coupon._id,
        metadata: { code: coupon.code, usedCount: coupon.usedCount },
      });
      return res.json({
        ...coupon.toObject(),
        message: 'Mã đã từng được dùng nên chỉ bị tắt (không xóa) để giữ lịch sử.',
      });
    }

    coupon.isDeleted = true;
    coupon.isActive = false;
    await coupon.save();
    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'coupon.soft_delete',
      entityType: 'coupon',
      entityId: coupon._id,
      metadata: { code: coupon.code },
    });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
