import User from '../models/User.js';
import { verifyAccessToken } from '../utils/auth.js';
import { MSG } from '../utils/userMessages.js';

function extractBearerToken(req) {
  const authHeader = req.header('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice('Bearer '.length).trim();
}

async function attachAuthContext(req, token) {
  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub).select(
    '_id name username email contactEmail contactEmailVerified phone avatar role isActive createdAt updatedAt',
  );
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
      return res.status(401).json({ message: MSG.UNAUTHORIZED_NO_TOKEN });
    }
    await attachAuthContext(req, token);
    return next();
  } catch (error) {
    if (error?.message === 'USER_INACTIVE') {
      return res.status(403).json({ message: MSG.AUTH_ACCOUNT_DISABLED });
    }
    return res.status(401).json({ message: MSG.UNAUTHORIZED_INVALID_TOKEN });
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
      return res.status(403).json({ message: MSG.AUTH_ACCOUNT_DISABLED });
    }
    return next();
  }
}

export function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== 'admin') {
    return res.status(403).json({ message: MSG.FORBIDDEN_ADMIN });
  }
  return next();
}
