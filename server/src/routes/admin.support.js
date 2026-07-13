import express from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  listAdminConversations,
  listMessages,
  assignConversation,
  closeConversation,
  markConversationRead,
  getAdminUnreadTotal,
  assertConversationAccess,
} from '../services/supportChat.js';
import { emitConversationUpdated } from '../socket.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/conversations', async (req, res, next) => {
  try {
    const status = String(req.query.status || 'open').trim();
    const items = await listAdminConversations({ status, limit: req.query.limit });
    const unreadTotal = await getAdminUnreadTotal();
    return res.json({ items, unreadTotal });
  } catch (error) {
    return next(error);
  }
});

router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid conversation id.' });
    }
    await assertConversationAccess(id, { userId: req.auth.userId, role: 'admin' });
    const items = await listMessages(id, {
      before: req.query.before,
      limit: req.query.limit,
    });
    return res.json({ items });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Conversation not found.' });
    return next(error);
  }
});

router.patch('/conversations/:id/assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid conversation id.' });
    }
    const conversation = await assignConversation(id, req.auth.userId);
    emitConversationUpdated(conversation);
    return res.json({ conversation });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Conversation not found.' });
    return next(error);
  }
});

router.patch('/conversations/:id/close', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid conversation id.' });
    }
    const conversation = await closeConversation(id, {
      userId: req.auth.userId,
      role: 'admin',
    });
    emitConversationUpdated(conversation);
    return res.json({ conversation });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Conversation not found.' });
    return next(error);
  }
});

router.post('/conversations/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid conversation id.' });
    }
    const conversation = await markConversationRead(id, {
      userId: req.auth.userId,
      role: 'admin',
    });
    emitConversationUpdated(conversation);
    return res.json({ conversation });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Conversation not found.' });
    return next(error);
  }
});

export default router;
