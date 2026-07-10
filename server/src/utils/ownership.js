import { getSessionId } from './cart.js';

export function getOwnershipFilter(req) {
  if (req.auth?.userId) {
    return { user: req.auth.userId };
  }

  const sessionId = getSessionId(req);
  if (!sessionId) {
    return null;
  }
  return { sessionId };
}

export function getOwnershipForWrite(req) {
  if (req.auth?.userId) {
    return { user: req.auth.userId };
  }

  const sessionId = getSessionId(req);
  if (!sessionId) {
    return null;
  }
  return { sessionId };
}
