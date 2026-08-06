import express from 'express';
import { randomBytes } from 'node:crypto';
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
import {
  buildInternalEmail,
  hashOpaqueToken,
  validateUsername,
} from '../utils/username.js';
import { claimSessionOwnership } from '../services/claimSessionOwnership.js';
import {
  isMailConfigured,
  sendContactEmailVerification,
  sendForgotPasswordVerifyEmail,
  sendPasswordResetEmail,
} from '../services/mail.js';
import { isDeliverableContactEmail, MSG, maskContactEmail } from '../utils/userMessages.js';

const router = express.Router();
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const apiPublic = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;

async function findUserByLoginIdentifier(identifier) {
  const normalized = String(identifier || '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('@')) {
    return User.findOne({ email: normalized });
  }
  const byUsername = await User.findOne({ username: normalized });
  if (byUsername) return byUsername;
  return User.findOne({ email: normalized });
}

async function issuePasswordReset(user, toEmail) {
  const rawToken = randomBytes(32).toString('hex');
  user.resetPasswordTokenHash = hashOpaqueToken(rawToken);
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = `${clientOrigin}/forgot-password?token=${encodeURIComponent(rawToken)}`;
  await sendPasswordResetEmail({
    to: toEmail,
    resetUrl,
    username: user.username || user.name,
  });
  return rawToken;
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, username, password } = req.body || {};
    if (!name?.trim() || !username?.trim() || !password?.trim()) {
      return res.status(400).json({ message: MSG.AUTH_FIELDS_REQUIRED });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: MSG.AUTH_PASSWORD_MIN });
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.ok) {
      return res.status(400).json({ message: usernameValidation.message });
    }

    const normalizedUsername = usernameValidation.username;
    const internalEmail = buildInternalEmail(normalizedUsername);

    const existingUsername = await User.findOne({ username: normalizedUsername }).select('_id');
    if (existingUsername) {
      return res.status(409).json({ message: MSG.AUTH_USERNAME_TAKEN });
    }
    const existingEmail = await User.findOne({ email: internalEmail }).select('_id');
    if (existingEmail) {
      return res.status(409).json({ message: MSG.AUTH_USERNAME_TAKEN });
    }

    const passwordHash = hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      username: normalizedUsername,
      email: internalEmail,
      passwordHash,
      role: 'customer',
    });

    const claim = await claimSessionOwnership(req, user._id);
    const token = signAccessToken({ sub: String(user._id), role: user.role });
    return res.status(201).json({
      token,
      user: toSafeUser(user),
      claim,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const identifier = req.body?.login || req.body?.email;
    const { password } = req.body || {};
    if (!identifier?.trim() || !password?.trim()) {
      return res.status(400).json({ message: MSG.AUTH_LOGIN_REQUIRED });
    }

    const normalizedIdentifier = String(identifier).trim().toLowerCase();
    const throttleKey = `${normalizedIdentifier}:${req.ip || 'ip-unknown'}`;
    const throttleState = getLoginThrottleState(throttleKey);
    if (throttleState.blocked) {
      return res.status(429).json({
        message: MSG.AUTH_LOGIN_LOCKED(throttleState.retryAfterSeconds),
      });
    }

    const user = await findUserByLoginIdentifier(normalizedIdentifier);
    if (!user) {
      registerLoginAttempt(throttleKey, false);
      return res.status(401).json({ message: MSG.AUTH_INVALID_CREDENTIALS });
    }
    if (user.isActive === false) {
      registerLoginAttempt(throttleKey, false);
      return res.status(403).json({ message: MSG.AUTH_ACCOUNT_DISABLED });
    }

    const isValidPassword = verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      const result = registerLoginAttempt(throttleKey, false);
      if (result.blocked) {
        return res.status(429).json({
          message: MSG.AUTH_LOGIN_LOCKED(result.retryAfterSeconds),
        });
      }
      return res.status(401).json({ message: MSG.AUTH_INVALID_CREDENTIALS });
    }
    registerLoginAttempt(throttleKey, true);

    const claim = await claimSessionOwnership(req, user._id);
    const token = signAccessToken({ sub: String(user._id), role: user.role });
    return res.json({
      token,
      user: toSafeUser(user),
      claim,
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
      return res.status(403).json({ message: MSG.AUTH_ACCOUNT_DISABLED });
    }
    const { name, phone, avatar, currentPassword, newPassword } = req.body || {};
    if (name !== undefined) {
      const nextName = String(name || '').trim();
      if (!nextName) {
        return res.status(400).json({ message: MSG.AUTH_NAME_EMPTY });
      }
      user.name = nextName;
    }
    if (phone !== undefined) {
      user.phone = String(phone || '').trim();
    }
    if (avatar !== undefined) {
      const nextAvatar = String(avatar || '').trim();
      if (nextAvatar && !nextAvatar.startsWith('data:image/')) {
        return res.status(400).json({ message: MSG.AUTH_AVATAR_INVALID });
      }
      if (nextAvatar.length > 220_000) {
        return res.status(400).json({ message: MSG.AUTH_AVATAR_TOO_LARGE });
      }
      user.avatar = nextAvatar;
    }
    if (newPassword !== undefined && String(newPassword).trim()) {
      const pwd = String(newPassword);
      if (pwd.length < 6) {
        return res.status(400).json({ message: MSG.AUTH_PASSWORD_MIN });
      }
      if (!currentPassword || !verifyPassword(String(currentPassword), user.passwordHash)) {
        return res.status(400).json({ message: MSG.AUTH_CURRENT_PASSWORD_WRONG });
      }
      user.passwordHash = hashPassword(pwd);
    }
    await user.save();
    const fresh = await User.findById(user._id);
    return res.json({ user: toSafeUser(fresh) });
  } catch (error) {
    return next(error);
  }
});

router.post('/link-email', requireAuth, async (req, res, next) => {
  try {
    const contactEmail = String(req.body?.contactEmail || req.body?.email || '').trim().toLowerCase();
    if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return res.status(400).json({ message: 'Email liên kết không hợp lệ.' });
    }
    if (contactEmail.endsWith('@users.techphone.local') || contactEmail.endsWith('@internal.local')) {
      return res.status(400).json({ message: 'Vui lòng dùng email thật để liên kết.' });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({ message: MSG.AUTH_USER_NOT_FOUND });
    }

    const taken = await User.findOne({
      _id: { $ne: user._id },
      contactEmail,
      contactEmailVerified: true,
    }).select('_id');
    if (taken) {
      return res.status(409).json({ message: 'Email này đã được liên kết tài khoản khác.' });
    }

    if (!isMailConfigured()) {
      return res.status(503).json({ message: 'SMTP chưa cấu hình. Không thể gửi email xác minh.' });
    }

    const rawToken = randomBytes(32).toString('hex');
    user.contactEmail = contactEmail;
    user.contactEmailVerified = false;
    user.emailVerifyTokenHash = hashOpaqueToken(rawToken);
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verifyUrl = `${apiPublic}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
    await sendContactEmailVerification({
      to: contactEmail,
      verifyUrl,
      username: user.username || user.name,
    });

    return res.json({
      message: 'Đã gửi email xác minh. Vui lòng kiểm tra hộp thư.',
      user: toSafeUser(user),
    });
  } catch (error) {
    if (error.message === 'MAIL_NOT_CONFIGURED') {
      return res.status(503).json({ message: 'SMTP chưa cấu hình.' });
    }
    return next(error);
  }
});

router.get('/verify-email', async (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token) {
    return res.redirect(`${clientOrigin}/email-verified?status=missing`);
  }

  const user = await User.findOne({
    emailVerifyTokenHash: hashOpaqueToken(token),
    emailVerifyExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.redirect(`${clientOrigin}/email-verified?status=invalid`);
  }

  user.contactEmailVerified = true;
  user.emailVerifyTokenHash = null;
  user.emailVerifyExpires = null;
  await user.save();

  return res.redirect(`${clientOrigin}/email-verified?status=success`);
});

router.post('/forgot-password/preview', async (req, res, next) => {
  try {
    const login = String(req.body?.login || req.body?.username || '').trim().toLowerCase();
    if (!login) {
      return res.status(400).json({ message: MSG.AUTH_FORGOT_LOGIN_REQUIRED });
    }

    const user = await findUserByLoginIdentifier(login);
    if (!user) {
      return res.status(404).json({ message: MSG.AUTH_FORGOT_ACCOUNT_NOT_FOUND });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: MSG.AUTH_ACCOUNT_DISABLED });
    }

    const hasVerifiedEmail = Boolean(
      user.contactEmailVerified
      && user.contactEmail
      && isDeliverableContactEmail(user.contactEmail),
    );

    return res.json({
      login: user.username,
      name: user.name,
      hasVerifiedEmail,
      maskedEmail: hasVerifiedEmail ? maskContactEmail(user.contactEmail) : '',
      needsEmailInput: !hasVerifiedEmail,
      methods: ['email'],
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const login = String(req.body?.login || req.body?.username || '').trim().toLowerCase();
    const method = String(req.body?.method || 'email').trim().toLowerCase();
    const contactEmailInput = String(req.body?.contactEmail || req.body?.email || '').trim().toLowerCase();

    if (!login) {
      return res.status(400).json({ message: MSG.AUTH_FORGOT_LOGIN_REQUIRED });
    }
    if (method !== 'email') {
      return res.status(400).json({ message: MSG.AUTH_FORGOT_METHOD_INVALID });
    }
    if (!isMailConfigured()) {
      return res.status(503).json({ message: MSG.AUTH_MAIL_NOT_CONFIGURED });
    }

    const user = await findUserByLoginIdentifier(login);
    if (!user) {
      return res.status(404).json({ message: MSG.AUTH_FORGOT_ACCOUNT_NOT_FOUND });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: MSG.AUTH_ACCOUNT_DISABLED });
    }

    const hasVerifiedEmail = Boolean(
      user.contactEmailVerified
      && user.contactEmail
      && isDeliverableContactEmail(user.contactEmail),
    );

    if (hasVerifiedEmail) {
      await issuePasswordReset(user, user.contactEmail);
      return res.json({
        message: MSG.AUTH_FORGOT_SENT_MASKED(maskContactEmail(user.contactEmail)),
        sentTo: maskContactEmail(user.contactEmail),
      });
    }

    if (!contactEmailInput || !isDeliverableContactEmail(contactEmailInput)) {
      return res.status(400).json({
        message: MSG.AUTH_FORGOT_EMAIL_REAL_REQUIRED,
        needsEmailInput: true,
      });
    }

    const taken = await User.findOne({
      _id: { $ne: user._id },
      contactEmail: contactEmailInput,
      contactEmailVerified: true,
    }).select('_id');
    if (taken) {
      return res.status(409).json({ message: MSG.AUTH_FORGOT_EMAIL_TAKEN });
    }

    const rawToken = randomBytes(32).toString('hex');
    user.contactEmail = contactEmailInput;
    user.contactEmailVerified = false;
    user.emailVerifyTokenHash = hashOpaqueToken(rawToken);
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.resetPasswordTokenHash = hashOpaqueToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const openUrl = `${apiPublic}/api/auth/forgot-password/open?token=${encodeURIComponent(rawToken)}`;
    await sendForgotPasswordVerifyEmail({
      to: contactEmailInput,
      openUrl,
      username: user.username || user.name,
    });

    return res.json({
      message: MSG.AUTH_FORGOT_VERIFY_SENT(maskContactEmail(contactEmailInput)),
      sentTo: maskContactEmail(contactEmailInput),
      needsVerification: true,
    });
  } catch (error) {
    if (error.message === 'MAIL_NOT_CONFIGURED') {
      return res.status(503).json({ message: MSG.AUTH_MAIL_NOT_CONFIGURED });
    }
    return next(error);
  }
});

router.get('/forgot-password/open', async (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token) {
    return res.redirect(`${clientOrigin}/forgot-password?error=missing`);
  }

  const user = await User.findOne({
    emailVerifyTokenHash: hashOpaqueToken(token),
    emailVerifyExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.redirect(`${clientOrigin}/forgot-password?error=invalid`);
  }

  user.contactEmailVerified = true;
  user.emailVerifyTokenHash = null;
  user.emailVerifyExpires = null;
  await user.save();

  return res.redirect(`${clientOrigin}/forgot-password?token=${encodeURIComponent(token)}`);
});

router.get('/forgot-password/validate', async (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token) {
    return res.status(400).json({ ok: false, message: MSG.AUTH_RESET_INVALID });
  }

  const user = await User.findOne({
    resetPasswordTokenHash: hashOpaqueToken(token),
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ ok: false, message: MSG.AUTH_RESET_INVALID });
  }

  return res.json({ ok: true, username: user.username, name: user.name });
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || req.body?.password || '').trim();
    if (!token || !newPassword) {
      return res.status(400).json({ message: MSG.AUTH_RESET_FIELDS_REQUIRED });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: MSG.AUTH_PASSWORD_MIN });
    }

    const user = await User.findOne({
      resetPasswordTokenHash: hashOpaqueToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: MSG.AUTH_RESET_INVALID });
    }

    user.passwordHash = hashPassword(newPassword);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ message: MSG.AUTH_RESET_SUCCESS });
  } catch (error) {
    return next(error);
  }
});

export default router;
