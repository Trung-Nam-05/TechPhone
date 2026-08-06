import nodemailer from 'nodemailer';
import {
  getDefaultFlashSaleVariables,
  renderNamedEmailTemplate,
} from './emailTemplates.js';

function getMailConfig() {
  return {
    host: String(process.env.SMTP_HOST || '').trim(),
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: String(process.env.SMTP_USER || '').trim(),
    pass: String(process.env.SMTP_PASS || '').replace(/\s/g, ''),
    from: String(process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@techphone.local').trim(),
  };
}

export function isMailConfigured() {
  const cfg = getMailConfig();
  return Boolean(cfg.host && cfg.user && cfg.pass);
}

/** Which SMTP env keys are present (for admin diagnostics — never exposes secrets). */
export function getMailEnvStatus() {
  const cfg = getMailConfig();
  return {
    configured: isMailConfigured(),
    keys: {
      SMTP_HOST: Boolean(String(process.env.SMTP_HOST || '').trim()),
      SMTP_PORT: Boolean(String(process.env.SMTP_PORT || '').trim()),
      SMTP_SECURE: process.env.SMTP_SECURE !== undefined,
      SMTP_USER: Boolean(String(process.env.SMTP_USER || '').trim()),
      SMTP_PASS: Boolean(String(process.env.SMTP_PASS || '').trim()),
      MAIL_FROM: Boolean(String(process.env.MAIL_FROM || '').trim()),
    },
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    from: cfg.from,
    user: cfg.user,
  };
}

export function translateSmtpError(raw) {
  const msg = String(raw || '').toLowerCase();
  if (msg.includes('invalid login') || msg.includes('535') || msg.includes('username and password')) {
    return 'Gmail từ chối đăng nhập — tạo lại App Password (16 ký tự) và dán vào SMTP_PASS trên Render.';
  }
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('etimedout')) {
    return 'Không kết nối được tới smtp.gmail.com — thử redeploy hoặc kiểm tra mạng Render.';
  }
  if (msg.includes('self signed') || msg.includes('certificate')) {
    return 'Lỗi chứng chỉ TLS — kiểm tra SMTP_PORT=587 và SMTP_SECURE=false.';
  }
  return raw || 'Không xác minh được SMTP.';
}

let transportCache = null;

export function resetMailTransport() {
  transportCache = null;
}

function createTransport() {
  const cfg = getMailConfig();
  if (!isMailConfigured()) {
    throw new Error('MAIL_NOT_CONFIGURED');
  }

  const auth = { user: cfg.user, pass: cfg.pass };

  // Gmail: dùng preset nodemailer ổn định hơn cấu hình host/port thủ công trên cloud.
  if (cfg.host === 'smtp.gmail.com' || cfg.user.endsWith('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth,
    });
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: !cfg.secure && cfg.port === 587,
    auth,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 25_000,
  });
}

function getTransport() {
  if (!transportCache) {
    transportCache = createTransport();
  }
  return transportCache;
}

export async function verifyMailConnection() {
  if (!isMailConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }
  try {
    await getTransport().verify();
    return { ok: true };
  } catch (error) {
    transportCache = null;
    return { ok: false, reason: error?.message || 'verify_failed', hint: translateSmtpError(error?.message) };
  }
}

async function sendMail({ to, subject, text, html }) {
  const cfg = getMailConfig();
  const info = await getTransport().sendMail({
    from: cfg.from,
    to,
    replyTo: cfg.user || undefined,
    subject,
    text,
    html,
  });
  return {
    messageId: info.messageId || '',
    accepted: Array.isArray(info.accepted) ? info.accepted : [],
    rejected: Array.isArray(info.rejected) ? info.rejected : [],
  };
}

export async function sendContactEmailVerification({ to, verifyUrl, username }) {
  const subject = 'Xác minh email liên kết — TechPhone';
  const text = `Xin chào ${username || 'bạn'},\n\nNhấn liên kết sau để xác minh email liên kết tài khoản TechPhone:\n${verifyUrl}\n\nLiên kết hết hạn sau 24 giờ.`;
  const html = `<p>Xin chào <strong>${username || 'bạn'}</strong>,</p><p>Nhấn nút bên dưới để xác minh email liên kết tài khoản TechPhone:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Liên kết hết hạn sau 24 giờ.</p>`;
  return sendMail({ to, subject, text, html });
}

export async function sendPasswordResetEmail({ to, resetUrl, username }) {
  const subject = 'Khôi phục mật khẩu — TechPhone';
  const text = `Xin chào ${username || 'bạn'},\n\nNhấn liên kết sau để đặt lại mật khẩu TechPhone:\n${resetUrl}\n\nLiên kết hết hạn sau 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.`;
  const html = `<p>Xin chào <strong>${username || 'bạn'}</strong>,</p><p><a href="${resetUrl}">Đặt lại mật khẩu TechPhone</a></p><p>Liên kết hết hạn sau 1 giờ.</p>`;
  return sendMail({ to, subject, text, html });
}

export async function sendForgotPasswordVerifyEmail({ to, openUrl, username }) {
  const subject = 'Xác thực email và đặt lại mật khẩu — TechPhone';
  const text = `Xin chào ${username || 'bạn'},\n\nBạn vừa yêu cầu khôi phục mật khẩu TechPhone.\nNhấn liên kết sau để xác thực email và đặt mật khẩu mới:\n${openUrl}\n\nLiên kết hết hạn sau 24 giờ.`;
  const html = `<p>Xin chào <strong>${username || 'bạn'}</strong>,</p><p>Bạn vừa yêu cầu khôi phục mật khẩu TechPhone.</p><p><a href="${openUrl}">Xác thực email và đặt mật khẩu mới</a></p><p>Liên kết hết hạn sau 24 giờ.</p>`;
  return sendMail({ to, subject, text, html });
}

export async function renderFlashSaleEmail(variables = {}) {
  const vars = getDefaultFlashSaleVariables(variables);
  return renderNamedEmailTemplate('flash-sale', vars);
}

export async function sendFlashSaleMarketingEmail({ to, variables = {} }) {
  const vars = getDefaultFlashSaleVariables(variables);
  const html = await renderNamedEmailTemplate('flash-sale', vars);
  const subject = `Flash Sale TechPhone — Giảm ${vars.discountPercent}% với mã ${vars.promoCode}`;
  const text = [
    `Xin chào ${vars.customerName},`,
    '',
    `Flash Sale tại TechPhone — giảm đến ${vars.discountPercent}%.`,
    `Mã ưu đãi: ${vars.promoCode} (hết hạn ${vars.expiresAt}).`,
    `Mua ngay: ${vars.shopUrl}`,
    '',
    'TechPhone — Điện thoại & công nghệ chính hãng.',
  ].join('\n');
  return sendMail({ to, subject, text, html });
}
