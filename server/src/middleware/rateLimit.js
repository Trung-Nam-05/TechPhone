import rateLimit from 'express-rate-limit';

const standardHeaders = true;
const legacyHeaders = false;

/** Global API tier: 300 requests / 15 minutes / IP (memory store — use Redis in production). */
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders,
  legacyHeaders,
  message: { message: 'Too many requests. Please try again later.' },
});

/** Auth tier: login + register — 20 / 15 minutes / IP. */
export const authRouteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders,
  legacyHeaders,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

/** Order creation: 10 POST / minute / IP. */
export const orderCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders,
  legacyHeaders,
  skip: (req) => !(req.method === 'POST' && (req.path === '/' || req.path === '')),
  message: { message: 'Too many order attempts. Please wait a moment.' },
});

/** AI chat HTTP tier — complements in-service AI_CHAT_RATE_LIMIT. */
export const aiChatHttpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AI_CHAT_HTTP_RATE_LIMIT || 60),
  standardHeaders,
  legacyHeaders,
  message: { message: 'AI chat rate limit exceeded. Please try again later.' },
});
