import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import {
  getOrCreateOpenConversation,
  getCustomerConversation,
  listMessages,
  markConversationRead,
  closeConversation,
  sendMessage,
  assertConversationAccess,
} from '../services/supportChat.js';
import { emitConversationUpdated, emitAdminSupportMessage, emitConversationRead, getIo } from '../socket.js';

const router = express.Router();

router.use(requireAuth);

router.post('/conversations', async (req, res, next) => {
  try {
    if (req.auth.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can start support chat.' });
    }
    const orderId = String(req.body?.orderId || '').trim() || null;
    const conversation = await getOrCreateOpenConversation(req.auth.userId, { orderId });
    return res.status(201).json({ conversation });
  } catch (error) {
    return next(error);
  }
});

router.get('/conversations/me', async (req, res, next) => {
  try {
    if (req.auth.role !== 'customer') {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    const conversation = await getCustomerConversation(req.auth.userId);
    return res.json({ conversation });
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
    await assertConversationAccess(id, { userId: req.auth.userId, role: req.auth.role });
    const items = await listMessages(id, {
      before: req.query.before,
      limit: req.query.limit,
    });
    return res.json({ items });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Conversation not found.' });
    if (error.message === 'FORBIDDEN') return res.status(403).json({ message: 'Forbidden.' });
    return next(error);
  }
});

router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid conversation id.' });
    }
    const result = await sendMessage({
      conversationId: id,
      senderId: req.auth.userId,
      senderRole: req.auth.role,
      body: req.body?.body,
    });
    emitConversationUpdated(result.conversation);
    emitAdminSupportMessage(result.message);
    const io = getIo();
    if (io) {
      io.to(`conversation:${id}`).emit('message:new', { message: result.message });
    }
    return res.status(201).json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Conversation not found.' });
    if (error.message === 'FORBIDDEN') return res.status(403).json({ message: 'Forbidden.' });
    if (error.message === 'CONVERSATION_CLOSED') {
      return res.status(400).json({ message: 'Conversation is closed.' });
    }
    if (error.message === 'RATE_LIMIT') {
      return res.status(429).json({ message: 'Too many messages. Please wait a moment.' });
    }
    if (error.message === 'EMPTY_MESSAGE' || error.message === 'MESSAGE_TOO_LONG') {
      return res.status(400).json({ message: 'Invalid message body.' });
    }
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
      role: req.auth.role,
    });
    emitConversationUpdated(conversation);
    emitConversationRead(id, req.auth.role);
    return res.json({ conversation });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Conversation not found.' });
    if (error.message === 'FORBIDDEN') return res.status(403).json({ message: 'Forbidden.' });
    return next(error);
  }
});

router.post('/conversations/:id/close', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid conversation id.' });
    }
    const conversation = await closeConversation(id, {
      userId: req.auth.userId,
      role: req.auth.role,
    });
    emitConversationUpdated(conversation);
    return res.json({ conversation });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Conversation not found.' });
    if (error.message === 'FORBIDDEN') return res.status(403).json({ message: 'Forbidden.' });
    return next(error);
  }
});

export default router;
