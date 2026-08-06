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

let transportCache = null;

export function resetMailTransport() {
  transportCache = null;
}

function createTransport() {
  const cfg = getMailConfig();
  if (!isMailConfigured()) {
    throw new Error('MAIL_NOT_CONFIGURED');
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
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
    return { ok: false, reason: error?.message || 'verify_failed' };
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
