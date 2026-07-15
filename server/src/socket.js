import { Server } from 'socket.io';
import {
  sendMessage,
  markConversationRead,
  assertConversationAccess,
  resolveSocketUser,
} from './services/supportChat.js';

let io = null;

const ADMIN_SUPPORT_ROOM = 'admin:support';

function conversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

export function getIo() {
  return io;
}

export function emitConversationUpdated(conversation) {
  if (!io || !conversation?._id) return;
  const payload = { conversation };
  io.to(conversationRoom(conversation._id)).emit('conversation:updated', payload);
  io.to(ADMIN_SUPPORT_ROOM).emit('conversation:updated', payload);
}

export function emitConversationRead(conversationId, readerRole) {
  if (!io || !conversationId) return;
  const payload = { conversationId: String(conversationId), readerRole };
  io.to(conversationRoom(conversationId)).emit('conversation:read', payload);
  io.to(ADMIN_SUPPORT_ROOM).emit('conversation:read', payload);
}

export function emitTypingUpdate(conversationId, role, typing) {
  if (!io || !conversationId) return;
  const payload = { conversationId: String(conversationId), role, typing: Boolean(typing) };
  io.to(conversationRoom(conversationId)).emit('typing:update', payload);
  io.to(ADMIN_SUPPORT_ROOM).emit('typing:update', payload);
}

export function emitAdminSupportMessage(message) {
  if (!io || !message) return;
  io.to(ADMIN_SUPPORT_ROOM).emit('message:new', { message });
}

export function initSocket(httpServer) {
  const clientOrigin = process.env.SOCKET_CORS_ORIGIN || process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const allowLocalhostOrigins = process.env.ALLOW_LOCALHOST_ORIGINS !== 'false';

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (origin === clientOrigin) return callback(null, true);
        if (allowLocalhostOrigins && /^http:\/\/localhost:\d+$/.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: false,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Missing token');
      const user = await resolveSocketUser(token);
      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      socket.data.user = user;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.data.role === 'admin') {
      socket.join(ADMIN_SUPPORT_ROOM);
    }

    socket.on('conversation:join', async ({ conversationId } = {}) => {
      try {
        if (!conversationId) throw new Error('Missing conversationId');
        await assertConversationAccess(conversationId, {
          userId: socket.data.userId,
          role: socket.data.role,
        });
        await socket.join(conversationRoom(conversationId));
      } catch (error) {
        socket.emit('error', { message: error.message || 'Cannot join conversation.' });
      }
    });

    socket.on('message:send', async ({ conversationId, body } = {}) => {
      try {
        if (!conversationId) throw new Error('Missing conversationId');
        const result = await sendMessage({
          conversationId,
          senderId: socket.data.userId,
          senderRole: socket.data.role,
          body,
        });
        const room = conversationRoom(conversationId);
        io.to(room).emit('message:new', { message: result.message });
        emitAdminSupportMessage(result.message);
        emitConversationUpdated(result.conversation);
        socket.emit('message:ack', { message: result.message });
        emitTypingUpdate(conversationId, socket.data.role, false);
      } catch (error) {
        const code = error.message;
        let message = 'Failed to send message.';
        if (code === 'RATE_LIMIT') message = 'Too many messages. Please wait a moment.';
        if (code === 'CONVERSATION_CLOSED') message = 'Conversation is closed.';
        if (code === 'EMPTY_MESSAGE' || code === 'MESSAGE_TOO_LONG') message = 'Invalid message body.';
        socket.emit('error', { message });
      }
    });

    socket.on('message:read', async ({ conversationId } = {}) => {
      try {
        if (!conversationId) throw new Error('Missing conversationId');
        const conversation = await markConversationRead(conversationId, {
          userId: socket.data.userId,
          role: socket.data.role,
        });
        emitConversationUpdated(conversation);
        emitConversationRead(conversationId, socket.data.role);
      } catch (error) {
        socket.emit('error', { message: error.message || 'Cannot mark as read.' });
      }
    });

    socket.on('typing:start', ({ conversationId } = {}) => {
      if (!conversationId) return;
      emitTypingUpdate(conversationId, socket.data.role, true);
    });

    socket.on('typing:stop', ({ conversationId } = {}) => {
      if (!conversationId) return;
      emitTypingUpdate(conversationId, socket.data.role, false);
    });

    socket.on('message:delivered', ({ conversationId, messageId } = {}) => {
      if (!conversationId || !messageId) return;
      const payload = { conversationId: String(conversationId), messageId: String(messageId) };
      io.to(conversationRoom(conversationId)).emit('message:delivered', payload);
      io.to(ADMIN_SUPPORT_ROOM).emit('message:delivered', payload);
    });
  });

  return io;
}
