import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { writeAdminAuditLog } from '../utils/audit.js';
import { toSafeUser } from '../utils/auth.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const role = String(req.query.role || 'customer').trim();
    const query = {};
    if (role === 'customer' || role === 'admin') {
      query.role = role;
    }
    const items = await User.find(query).sort({ createdAt: -1 }).select('_id name email role isActive createdAt').lean();
    return res.json({
      items: items.map((u) => toSafeUser(u)),
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'id is invalid.' });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (user.role === 'admin' && req.body?.isActive === false && String(user._id) === req.auth.userId) {
      return res.status(400).json({ message: 'You cannot disable your own admin account.' });
    }
    if (req.body?.isActive !== undefined) {
      user.isActive = Boolean(req.body.isActive);
    }
    await user.save();
    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'user.update_status',
      entityType: 'user',
      entityId: user._id,
      metadata: { email: user.email, isActive: user.isActive },
    });
    const fresh = await User.findById(user._id).select('_id name email role isActive createdAt updatedAt');
    return res.json({ user: toSafeUser(fresh) });
  } catch (error) {
    return next(error);
  }
});

export default router;
