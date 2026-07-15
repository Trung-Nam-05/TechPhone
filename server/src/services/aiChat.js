import mongoose from 'mongoose';
import AiSession from '../models/AiSession.js';
import AiMessage from '../models/AiMessage.js';
import { generateAiReply, isGeminiConfigured } from './gemini.js';
import { getSessionId } from '../utils/cart.js';

const RATE_WINDOW_MS = 60_000;
const rateMap = new Map();

function readRateLimit() {
  const value = Number(process.env.AI_CHAT_RATE_LIMIT);
  return Number.isFinite(value) && value > 0 ? value : 20;
}

function checkRateLimit(key) {
  const now = Date.now();
  const state = rateMap.get(key) || { count: 0, windowStart: now };
  if (now - state.windowStart > RATE_WINDOW_MS) {
    state.count = 0;
    state.windowStart = now;
  }
  state.count += 1;
  rateMap.set(key, state);
  if (state.count > readRateLimit()) {
    throw new Error('RATE_LIMIT');
  }
}

export function resolveSessionKey(req) {
  if (req.auth?.userId) return `user:${req.auth.userId}`;
  const sessionId = getSessionId(req);
  if (sessionId) return `guest:${sessionId}`;
  return null;
}

export async function getOrCreateAiSession(req) {
  const sessionKey = resolveSessionKey(req);
  if (!sessionKey) throw new Error('MISSING_SESSION');

  let session = await AiSession.findOne({ sessionKey });
  if (!session) {
    session = await AiSession.create({
      sessionKey,
      user: req.auth?.userId ? new mongoose.Types.ObjectId(req.auth.userId) : null,
    });
  } else if (req.auth?.userId && !session.user) {
    session.user = new mongoose.Types.ObjectId(req.auth.userId);
    await session.save();
  }

  const messages = await AiMessage.find({ session: session._id })
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();

  return {
    session,
    messages: messages.map((msg) => ({
      _id: msg._id,
      role: msg.role,
      body: msg.body,
      toolCalls: msg.toolCalls || [],
      createdAt: msg.createdAt,
    })),
  };
}

export async function clearAiSession(req) {
  const sessionKey = resolveSessionKey(req);
  if (!sessionKey) throw new Error('MISSING_SESSION');

  const session = await AiSession.findOne({ sessionKey });
  if (!session) return { ok: true };

  await AiMessage.deleteMany({ session: session._id });
  await AiSession.deleteOne({ _id: session._id });
  return { ok: true };
}

export async function sendAiChatMessage(req, body) {
  if (!isGeminiConfigured()) throw new Error('GEMINI_NOT_CONFIGURED');

  const text = String(body || '').trim();
  if (!text) throw new Error('EMPTY_MESSAGE');
  if (text.length > 2000) throw new Error('MESSAGE_TOO_LONG');

  const sessionKey = resolveSessionKey(req);
  if (!sessionKey) throw new Error('MISSING_SESSION');
  checkRateLimit(sessionKey);

  const { session, messages } = await getOrCreateAiSession(req);

  const userMessage = await AiMessage.create({
    session: session._id,
    role: 'user',
    body: text,
  });

  if (!session.title) {
    session.title = text.slice(0, 200);
  }

  try {
    const history = messages.map((msg) => ({ role: msg.role, body: msg.body }));
    const reply = await generateAiReply({
      history,
      userMessage: text,
      toolContext: { userId: req.auth?.userId || null },
    });

    const assistantMessage = await AiMessage.create({
      session: session._id,
      role: 'assistant',
      body: reply.text,
      toolCalls: reply.toolCalls,
    });

    session.lastMessageAt = new Date();
    await session.save();

    return {
      session: session.toObject(),
      userMessage: userMessage.toObject(),
      assistantMessage: assistantMessage.toObject(),
    };
  } catch (error) {
    await AiMessage.deleteOne({ _id: userMessage._id });
    throw error;
  }
}
