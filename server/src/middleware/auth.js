import User from '../models/User.js';
import { verifyAccessToken } from '../utils/auth.js';

function extractBearerToken(req) {
  const authHeader = req.header('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice('Bearer '.length).trim();
}

async function attachAuthContext(req, token) {
  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub).select('_id name email role isActive');
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  if (user.isActive === false) {
    throw new Error('USER_INACTIVE');
  }
  req.auth = {
    userId: String(user._id),
    role: user.role,
    user,
  };
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized. Missing access token.' });
    }
    await attachAuthContext(req, token);
    return next();
  } catch (error) {
    if (error?.message === 'USER_INACTIVE') {
      return res.status(403).json({ message: 'Account is disabled.' });
    }
    return res.status(401).json({ message: 'Unauthorized. Invalid or expired token.' });
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return next();
    }
    await attachAuthContext(req, token);
    return next();
  } catch (error) {
    if (error?.message === 'USER_INACTIVE') {
      return res.status(403).json({ message: 'Account is disabled.' });
    }
    return next();
  }
}

export function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }
  return next();
}
