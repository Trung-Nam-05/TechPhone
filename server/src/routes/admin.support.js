import express from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  listAdminConversations,
  listAdminSupportCustomers,
  listMessages,
  listMessagesByCustomer,
  markAllCustomerConversationsRead,
  assignConversation,
  closeConversation,
  markConversationRead,
  getAdminUnreadTotal,
  assertConversationAccess,
} from '../services/supportChat.js';
import { emitConversationUpdated, emitConversationRead } from '../socket.js';

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

router.get('/customers', async (req, res, next) => {
  try {
    const items = await listAdminSupportCustomers({ limit: req.query.limit });
    const unreadTotal = await getAdminUnreadTotal();
    return res.json({ items, unreadTotal });
  } catch (error) {
    return next(error);
  }
});

router.get('/customers/:customerId/messages', async (req, res, next) => {
  try {
    const { customerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: 'Invalid customer id.' });
    }
    const items = await listMessagesByCustomer(customerId, { limit: req.query.limit });
    return res.json({ items });
  } catch (error) {
    if (error.message === 'INVALID_ID') return res.status(400).json({ message: 'Invalid customer id.' });
    return next(error);
  }
});

router.post('/customers/:customerId/read', async (req, res, next) => {
  try {
    const { customerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: 'Invalid customer id.' });
    }
    const conversationIds = await markAllCustomerConversationsRead(customerId, { role: 'admin' });
    for (const convId of conversationIds) {
      if (convId) emitConversationRead(String(convId), 'admin');
    }
    const unreadTotal = await getAdminUnreadTotal();
    return res.json({ unreadTotal });
  } catch (error) {
    if (error.message === 'INVALID_ID') return res.status(400).json({ message: 'Invalid customer id.' });
    if (error.message === 'FORBIDDEN') return res.status(403).json({ message: 'Forbidden.' });
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
    emitConversationRead(id, 'admin');
    return res.json({ conversation });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Conversation not found.' });
    return next(error);
  }
});

export default router;
