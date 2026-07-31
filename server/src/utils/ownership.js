import { getSessionId } from './cart.js';

/**
 * Filter đọc/ghi giỏ & tạo đơn:
 * - Đã login → theo user (không lẫn cart guest)
 * - Guest → theo sessionId
 *
 * @param {object} req
 * @param {{ includeGuestSession?: boolean }} [options]
 *   includeGuestSession: khi login, vẫn thấy đơn guest cùng session chưa claim (chỉ dùng cho Order)
 */
export function getOwnershipFilter(req, options = {}) {
  const { includeGuestSession = false } = options;
  const sessionId = getSessionId(req);

  if (req.auth?.userId) {
    if (includeGuestSession && sessionId) {
      return {
        $or: [
          { user: req.auth.userId },
          { sessionId, $or: [{ user: null }, { user: { $exists: false } }] },
        ],
      };
    }
    return { user: req.auth.userId };
  }

  if (!sessionId) {
    return null;
  }
  return { sessionId };
}

/**
 * Ownership khi tạo/ghi:
 * - Đã login: gắn user + giữ sessionId (nếu có)
 * - Guest: chỉ sessionId
 */
export function getOwnershipForWrite(req) {
  const sessionId = getSessionId(req);

  if (req.auth?.userId) {
    const payload = { user: req.auth.userId };
    if (sessionId) {
      payload.sessionId = sessionId;
    }
    return payload;
  }

  if (!sessionId) {
    return null;
  }
  return { sessionId };
}
