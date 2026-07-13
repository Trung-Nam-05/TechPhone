import { Server } from 'socket.io';
import {
  sendMessage,
  markConversationRead,
  assertConversationAccess,
  resolveSocketUser,
} from './services/supportChat.js';

let io = null;

function conversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

export function getIo() {
  return io;
}

export function emitConversationUpdated(conversation) {
  if (!io || !conversation?._id) return;
  const room = conversationRoom(conversation._id);
  io.to(room).emit('conversation:updated', { conversation });
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
        io.to(room).emit('conversation:updated', { conversation: result.conversation });
        socket.emit('message:ack', { message: result.message });
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
        const room = conversationRoom(conversationId);
        io.to(room).emit('conversation:updated', { conversation });
      } catch (error) {
        socket.emit('error', { message: error.message || 'Cannot mark as read.' });
      }
    });
  });

  return io;
}
