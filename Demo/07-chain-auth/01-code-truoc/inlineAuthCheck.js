/**
 * =====================================================================
 * CODE TRƯỚC KHI ÁP DỤNG — Chain of Responsibility (Auth)
 * =====================================================================
 * Vấn đề: mỗi handler tự copy verify JWT + check role
 * =====================================================================
 */

function extractBearerToken(req) {
  const authHeader = req.headers?.authorization || req.header?.('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

function verifyTokenFake(token) {
  if (!token || token === 'invalid') throw new Error('INVALID_TOKEN');
  if (token === 'customer-token') return { id: 'u1', role: 'customer', isActive: true };
  if (token === 'admin-token') return { id: 'a1', role: 'admin', isActive: true };
  if (token === 'disabled-token') return { id: 'u2', role: 'customer', isActive: false };
  return { id: 'u0', role: 'customer', isActive: true };
}

/** Handler admin orders — tự check auth trong hàm */
export async function adminListOrdersBeforePattern(req, res) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ message: 'Unauthorized. Missing access token.' });

  let user;
  try {
    user = verifyTokenFake(token);
  } catch {
    return res.status(401).json({ message: 'Unauthorized. Invalid or expired token.' });
  }

  if (user.isActive === false) {
    return res.status(403).json({ message: 'Account is disabled.' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  // ... business
  return res.json({ items: [], actor: user.id });
}

/** Handler cập nhật user — COPY LẠI gần như y nguyên */
export async function adminPatchUserBeforePattern(req, res) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ message: 'Unauthorized. Missing access token.' });

  let user;
  try {
    user = verifyTokenFake(token);
  } catch {
    return res.status(401).json({ message: 'Unauthorized. Invalid or expired token.' });
  }

  if (user.isActive === false) {
    return res.status(403).json({ message: 'Account is disabled.' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  return res.json({ updated: true, actor: user.id, target: req.params?.id });
}

/** Handler /me — lại copy một phần */
export async function getMeBeforePattern(req, res) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ message: 'Unauthorized. Missing access token.' });
  try {
    const user = verifyTokenFake(token);
    if (user.isActive === false) return res.status(403).json({ message: 'Account is disabled.' });
    return res.json({ user });
  } catch {
    return res.status(401).json({ message: 'Unauthorized. Invalid or expired token.' });
  }
}
