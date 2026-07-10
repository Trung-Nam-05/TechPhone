import express from 'express';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getLoginThrottleState,
  hashPassword,
  registerLoginAttempt,
  signAccessToken,
  toSafeUser,
  verifyPassword,
} from '../utils/auth.js';

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'name, email, password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail }).select('_id');
    if (existing) {
      return res.status(409).json({ message: 'Email is already in use.' });
    }

    const passwordHash = hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'customer',
    });

    const token = signAccessToken({ sub: String(user._id), role: user.role });
    return res.status(201).json({
      token,
      user: toSafeUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'email and password are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const throttleKey = `${normalizedEmail}:${req.ip || 'ip-unknown'}`;
    const throttleState = getLoginThrottleState(throttleKey);
    if (throttleState.blocked) {
      return res.status(429).json({
        message: `Too many failed login attempts. Try again in ${throttleState.retryAfterSeconds}s.`,
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      registerLoginAttempt(throttleKey, false);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    if (user.isActive === false) {
      registerLoginAttempt(throttleKey, false);
      return res.status(403).json({ message: 'Account is disabled.' });
    }

    const isValidPassword = verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      const result = registerLoginAttempt(throttleKey, false);
      if (result.blocked) {
        return res.status(429).json({
          message: `Too many failed login attempts. Try again in ${result.retryAfterSeconds}s.`,
        });
      }
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    registerLoginAttempt(throttleKey, true);

    const token = signAccessToken({ sub: String(user._id), role: user.role });
    return res.json({
      token,
      user: toSafeUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({
    user: toSafeUser(req.auth.user),
  });
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user || user.isActive === false) {
      return res.status(403).json({ message: 'Account is disabled.' });
    }
    const { name, currentPassword, newPassword } = req.body || {};
    if (name !== undefined) {
      const nextName = String(name || '').trim();
      if (!nextName) {
        return res.status(400).json({ message: 'name cannot be empty.' });
      }
      user.name = nextName;
    }
    if (newPassword !== undefined && String(newPassword).trim()) {
      const pwd = String(newPassword);
      if (pwd.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters.' });
      }
      if (!currentPassword || !verifyPassword(String(currentPassword), user.passwordHash)) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
      user.passwordHash = hashPassword(pwd);
    }
    await user.save();
    const fresh = await User.findById(user._id).select('_id name email role isActive createdAt updatedAt');
    return res.json({ user: toSafeUser(fresh) });
  } catch (error) {
    return next(error);
  }
});

export default router;
