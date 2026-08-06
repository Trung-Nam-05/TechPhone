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

function isSmtpConfigured() {
  const cfg = getMailConfig();
  return Boolean(cfg.host && cfg.user && cfg.pass);
}

function isBrevoConfigured() {
  return Boolean(String(process.env.BREVO_API_KEY || '').trim());
}

/** smtp | brevo | none — Brevo dùng HTTPS, chạy được trên Render free (SMTP bị chặn cổng 587/465). */
export function getMailProvider() {
  if (isBrevoConfigured()) return 'brevo';
  if (isSmtpConfigured()) return 'smtp';
  return 'none';
}

export function isMailConfigured() {
  return getMailProvider() !== 'none';
}

function parseFromAddress(from) {
  const raw = String(from || '').trim();
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: 'TechPhone', email: raw };
}

/** Which mail env keys are present (for admin diagnostics — never exposes secrets). */
export function getMailEnvStatus() {
  const cfg = getMailConfig();
  const provider = getMailProvider();
  return {
    configured: isMailConfigured(),
    provider,
    keys: {
      BREVO_API_KEY: isBrevoConfigured(),
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
    return 'Gmail từ chối đăng nhập — tạo lại App Password (16 ký tự) và dán vào SMTP_PASS.';
  }
  if (
    msg.includes('timeout')
    || msg.includes('timed out')
    || msg.includes('etimedout')
    || msg.includes('enetunreach')
    || msg.includes('econnrefused')
  ) {
    return 'Render free tier chặn cổng SMTP (25/465/587) nên Gmail SMTP không kết nối được. Thêm BREVO_API_KEY trên Render (gửi qua HTTPS) hoặc nâng cấp Render paid.';
  }
  if (msg.includes('self signed') || msg.includes('certificate')) {
    return 'Lỗi chứng chỉ TLS — kiểm tra SMTP_PORT=587 và SMTP_SECURE=false.';
  }
  return raw || 'Không xác minh được email.';
}

let transportCache = null;

export function resetMailTransport() {
  transportCache = null;
}

function createTransport() {
  const cfg = getMailConfig();
  if (!isSmtpConfigured()) {
    throw new Error('MAIL_NOT_CONFIGURED');
  }

  const auth = { user: cfg.user, pass: cfg.pass };

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

async function verifyBrevoConnection() {
  const apiKey = String(process.env.BREVO_API_KEY || '').trim();
  try {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': apiKey, accept: 'application/json' },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        reason: body.message || `Brevo HTTP ${res.status}`,
        hint: body.message || 'Kiểm tra BREVO_API_KEY trên Render.',
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error?.message || 'verify_failed',
      hint: translateSmtpError(error?.message),
    };
  }
}

export async function verifyMailConnection() {
  if (!isMailConfigured()) {
    return { ok: false, reason: 'not_configured', hint: 'Thiếu BREVO_API_KEY hoặc SMTP_HOST / SMTP_USER / SMTP_PASS.' };
  }

  if (getMailProvider() === 'brevo') {
    return verifyBrevoConnection();
  }

  try {
    await getTransport().verify();
    return { ok: true };
  } catch (error) {
    transportCache = null;
    return {
      ok: false,
      reason: error?.message || 'verify_failed',
      hint: translateSmtpError(error?.message),
    };
  }
}

async function sendViaBrevo({ to, subject, text, html }) {
  const apiKey = String(process.env.BREVO_API_KEY || '').trim();
  const cfg = getMailConfig();
  const sender = parseFromAddress(cfg.from);

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
      replyTo: { email: sender.email, name: sender.name },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Brevo gửi thất bại (HTTP ${res.status})`);
  }

  const data = await res.json();
  return {
    messageId: data.messageId || '',
    accepted: [to],
    rejected: [],
  };
}

async function sendViaSmtp({ to, subject, text, html }) {
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

async function sendMail({ to, subject, text, html }) {
  if (getMailProvider() === 'brevo') {
    return sendViaBrevo({ to, subject, text, html });
  }
  return sendViaSmtp({ to, subject, text, html });
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
