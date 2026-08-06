import rateLimit from 'express-rate-limit';
import { MSG } from '../utils/userMessages.js';

const standardHeaders = true;
const legacyHeaders = false;

/** Global API tier: 300 requests / 15 minutes / IP (memory store — use Redis in production). */
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders,
  legacyHeaders,
  message: { message: MSG.RATE_LIMIT_GLOBAL },
});

/** Auth tier: login + register — 20 / 15 minutes / IP. */
export const authRouteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders,
  legacyHeaders,
  message: { message: MSG.RATE_LIMIT_AUTH },
});

/** Order creation: 10 POST / minute / IP. */
export const orderCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders,
  legacyHeaders,
  skip: (req) => !(req.method === 'POST' && (req.path === '/' || req.path === '')),
  message: { message: MSG.RATE_LIMIT_ORDER },
});

/** AI chat HTTP tier — complements in-service AI_CHAT_RATE_LIMIT. */
export const aiChatHttpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AI_CHAT_HTTP_RATE_LIMIT || 60),
  standardHeaders,
  legacyHeaders,
  message: { message: MSG.RATE_LIMIT_AI },
});
