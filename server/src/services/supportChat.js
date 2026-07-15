import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const MAX_BODY_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_MESSAGES_PER_WINDOW = 10;
const sendRateMap = new Map();

function previewText(body) {
  return String(body || '').trim().slice(0, 200);
}

function checkSendRate(userId) {
  const now = Date.now();
  const state = sendRateMap.get(userId) || { count: 0, windowStart: now };
  if (now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
    state.count = 0;
    state.windowStart = now;
  }
  state.count += 1;
  sendRateMap.set(userId, state);
  if (state.count > MAX_MESSAGES_PER_WINDOW) {
    throw new Error('RATE_LIMIT');
  }
}

export function validateMessageBody(body) {
  const text = String(body || '').trim();
  if (!text) throw new Error('EMPTY_MESSAGE');
  if (text.length > MAX_BODY_LENGTH) throw new Error('MESSAGE_TOO_LONG');
  return text;
}

export async function getOrCreateOpenConversation(customerId, { orderId } = {}) {
  const customerOid = new mongoose.Types.ObjectId(customerId);
  let conversation = await Conversation.findOne({ customer: customerOid, status: 'open' });
  if (conversation) {
    if (orderId && !conversation.order) {
      conversation.order = new mongoose.Types.ObjectId(orderId);
      await conversation.save();
    }
    return conversation;
  }

  conversation = await Conversation.create({
    customer: customerOid,
    order: orderId ? new mongoose.Types.ObjectId(orderId) : null,
    status: 'open',
    lastMessageAt: new Date(),
  });
  return conversation;
}

export async function assertConversationAccess(conversationId, { userId, role }) {
  const conversation = await Conversation.findById(conversationId)
    .populate('customer', 'name email')
    .populate('assignedAdmin', 'name email');
  if (!conversation) throw new Error('NOT_FOUND');
  if (role === 'admin') return conversation;
  if (String(conversation.customer._id || conversation.customer) !== String(userId)) {
    throw new Error('FORBIDDEN');
  }
  return conversation;
}

export async function listMessages(conversationId, { before, limit = 50 } = {}) {
  const query = { conversation: conversationId };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }
  const cap = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const items = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(cap)
    .populate('sender', 'name email role')
    .lean();
  return items.reverse();
}

export async function sendMessage({ conversationId, senderId, senderRole, body }) {
  checkSendRate(String(senderId));
  const text = validateMessageBody(body);
  const conversation = await assertConversationAccess(conversationId, {
    userId: senderId,
    role: senderRole,
  });
  if (conversation.status === 'closed') {
    if (senderRole !== 'admin') throw new Error('CONVERSATION_CLOSED');
    conversation.status = 'open';
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: senderId,
    senderRole,
    body: text,
    readAt: null,
  });

  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview = previewText(text);
  if (senderRole === 'customer') {
    conversation.unreadByAdmin += 1;
  } else {
    conversation.unreadByCustomer += 1;
  }
  await conversation.save();

  const populated = await Message.findById(message._id).populate('sender', 'name email role').lean();
  const populatedConversation = await Conversation.findById(conversation._id)
    .populate('customer', 'name email')
    .populate('assignedAdmin', 'name email')
    .lean();
  return { message: populated, conversation: populatedConversation };
}

export async function markConversationRead(conversationId, { userId, role }) {
  const conversation = await assertConversationAccess(conversationId, { userId, role });
  const readAt = new Date();
  const otherRole = role === 'admin' ? 'customer' : 'admin';

  if (role === 'admin') {
    conversation.unreadByAdmin = 0;
  } else {
    conversation.unreadByCustomer = 0;
  }
  await conversation.save();

  await Message.updateMany(
    { conversation: conversation._id, senderRole: otherRole, readAt: null },
    { $set: { readAt } },
  );

  return Conversation.findById(conversationId)
    .populate('customer', 'name email')
    .populate('assignedAdmin', 'name email')
    .lean();
}

export async function closeConversation(conversationId, { userId, role }) {
  const conversation = await assertConversationAccess(conversationId, { userId, role });
  conversation.status = 'closed';
  await conversation.save();
  return Conversation.findById(conversationId)
    .populate('customer', 'name email')
    .populate('assignedAdmin', 'name email')
    .lean();
}

export async function assignConversation(conversationId, adminId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error('NOT_FOUND');
  conversation.assignedAdmin = new mongoose.Types.ObjectId(adminId);
  await conversation.save();
  return Conversation.findById(conversationId)
    .populate('customer', 'name email')
    .populate('assignedAdmin', 'name email')
    .lean();
}

export async function listAdminConversations({ status = 'open', limit = 50 } = {}) {
  const query = {};
  if (status && status !== 'all') query.status = status;
  const cap = Math.min(Math.max(Number(limit) || 50, 1), 100);
  return Conversation.find(query)
    .sort({ lastMessageAt: -1 })
    .limit(cap)
    .populate('customer', 'name email')
    .populate('assignedAdmin', 'name email')
    .lean();
}

export async function listAdminSupportCustomers({ limit = 100 } = {}) {
  const cap = Math.min(Math.max(Number(limit) || 100, 1), 200);

  const rows = await Conversation.aggregate([
    {
      $lookup: {
        from: 'messages',
        localField: '_id',
        foreignField: 'conversation',
        as: 'messageDocs',
      },
    },
    { $match: { 'messageDocs.0': { $exists: true } } },
    { $sort: { lastMessageAt: -1 } },
    {
      $group: {
        _id: '$customer',
        lastMessageAt: { $first: '$lastMessageAt' },
        lastMessagePreview: { $first: '$lastMessagePreview' },
        unreadByAdmin: { $sum: '$unreadByAdmin' },
        latestConversationId: { $first: '$_id' },
        conversations: {
          $push: {
            _id: '$_id',
            status: '$status',
            lastMessageAt: '$lastMessageAt',
            assignedAdmin: '$assignedAdmin',
          },
        },
      },
    },
    { $sort: { lastMessageAt: -1 } },
    { $limit: cap },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'customerDoc',
      },
    },
    { $unwind: { path: '$customerDoc', preserveNullAndEmptyArrays: true } },
  ]);

  return rows.map((row) => {
    const openConv = row.conversations.find((item) => item.status === 'open');
    const activeConversationId = openConv?._id || row.latestConversationId;
    const activeStatus = openConv ? 'open' : 'closed';
    const activeAssignedAdmin = openConv?.assignedAdmin || null;

    return {
      customerId: row._id,
      customer: {
        _id: row.customerDoc?._id,
        name: row.customerDoc?.name || 'Khách hàng',
        email: row.customerDoc?.email || '',
      },
      lastMessageAt: row.lastMessageAt,
      lastMessagePreview: row.lastMessagePreview || '',
      unreadByAdmin: row.unreadByAdmin || 0,
      activeConversationId,
      activeStatus,
      assignedAdmin: activeAssignedAdmin,
      conversationCount: row.conversations.length,
    };
  });
}

export async function listMessagesByCustomer(customerId, { limit = 200 } = {}) {
  if (!mongoose.Types.ObjectId.isValid(customerId)) throw new Error('INVALID_ID');

  const customerOid = new mongoose.Types.ObjectId(customerId);
  const conversations = await Conversation.find({ customer: customerOid }).select('_id').lean();
  if (!conversations.length) return [];

  const convIds = conversations.map((item) => item._id);
  const cap = Math.min(Math.max(Number(limit) || 200, 1), 500);

  const items = await Message.find({ conversation: { $in: convIds } })
    .sort({ createdAt: 1 })
    .limit(cap)
    .populate('sender', 'name email role')
    .lean();

  return items;
}

export async function markAllCustomerConversationsRead(customerId, { role } = {}) {
  if (role !== 'admin') throw new Error('FORBIDDEN');
  if (!mongoose.Types.ObjectId.isValid(customerId)) throw new Error('INVALID_ID');

  const customerOid = new mongoose.Types.ObjectId(customerId);
  const readAt = new Date();
  const conversations = await Conversation.find({ customer: customerOid }).select('_id').lean();
  const convIds = conversations.map((item) => item._id);

  if (!convIds.length) return [];

  await Conversation.updateMany({ customer: customerOid }, { $set: { unreadByAdmin: 0 } });
  await Message.updateMany(
    { conversation: { $in: convIds }, senderRole: 'customer', readAt: null },
    { $set: { readAt } },
  );

  return convIds;
}

export async function getCustomerConversation(customerId) {
  return Conversation.findOne({ customer: customerId, status: 'open' })
    .populate('assignedAdmin', 'name email')
    .lean();
}

export async function getAdminUnreadTotal() {
  const result = await Conversation.aggregate([
    { $match: { status: 'open' } },
    { $group: { _id: null, total: { $sum: '$unreadByAdmin' } } },
  ]);
  return result[0]?.total || 0;
}

export async function resolveSocketUser(token) {
  const { verifyAccessToken } = await import('../utils/auth.js');
  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub).select('_id name email role isActive');
  if (!user || user.isActive === false) throw new Error('UNAUTHORIZED');
  return user;
}
