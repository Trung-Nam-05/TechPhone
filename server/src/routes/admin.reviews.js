import express from 'express';
import Review from '../models/Review.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { writeAdminAuditLog } from '../utils/audit.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const status = String(req.query.status || 'all').toLowerCase();
    const filter = { isDeleted: false };
    if (status === 'pending') filter.isApproved = false;
    if (status === 'approved') filter.isApproved = true;

    const items = await Review.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('product', 'name slug image')
      .limit(200)
      .lean();

    const [pendingCount, approvedCount] = await Promise.all([
      Review.countDocuments({ isDeleted: false, isApproved: false }),
      Review.countDocuments({ isDeleted: false, isApproved: true }),
    ]);

    return res.json({
      items,
      meta: { pendingCount, approvedCount, total: pendingCount + approvedCount },
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/approve', async (req, res, next) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, isDeleted: false });
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }
    review.isApproved = true;
    await review.save();
    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'review.approve',
      entityType: 'review',
      entityId: review._id,
      metadata: { product: review.product, user: review.user },
    });
    const populated = await Review.findById(review._id)
      .populate('user', 'name email')
      .populate('product', 'name slug image')
      .lean();
    return res.json(populated);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/reject', async (req, res, next) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, isDeleted: false });
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }
    review.isApproved = false;
    await review.save();
    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'review.reject',
      entityType: 'review',
      entityId: review._id,
    });
    const populated = await Review.findById(review._id)
      .populate('user', 'name email')
      .populate('product', 'name slug image')
      .lean();
    return res.json(populated);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, isDeleted: false });
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }
    review.isDeleted = true;
    review.isApproved = false;
    await review.save();
    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'review.soft_delete',
      entityType: 'review',
      entityId: review._id,
    });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
