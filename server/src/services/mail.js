import nodemailer from 'nodemailer';

function getMailConfig() {
  return {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@techphone.local',
  };
}

export function isMailConfigured() {
  const cfg = getMailConfig();
  return Boolean(cfg.host && cfg.user && cfg.pass);
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

async function sendMail({ to, subject, text, html }) {
  const cfg = getMailConfig();
  const transport = createTransport();
  await transport.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html,
  });
}

export async function sendContactEmailVerification({ to, verifyUrl, username }) {
  const subject = 'Xác minh email liên kết — TechPhone';
  const text = `Xin chào ${username || 'bạn'},\n\nNhấn liên kết sau để xác minh email liên kết tài khoản TechPhone:\n${verifyUrl}\n\nLiên kết hết hạn sau 24 giờ.`;
  const html = `<p>Xin chào <strong>${username || 'bạn'}</strong>,</p><p>Nhấn nút bên dưới để xác minh email liên kết tài khoản TechPhone:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Liên kết hết hạn sau 24 giờ.</p>`;
  await sendMail({ to, subject, text, html });
}

export async function sendPasswordResetEmail({ to, resetUrl, username }) {
  const subject = 'Khôi phục mật khẩu — TechPhone';
  const text = `Xin chào ${username || 'bạn'},\n\nNhấn liên kết sau để đặt lại mật khẩu TechPhone:\n${resetUrl}\n\nLiên kết hết hạn sau 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.`;
  const html = `<p>Xin chào <strong>${username || 'bạn'}</strong>,</p><p><a href="${resetUrl}">Đặt lại mật khẩu</a></p><p>Liên kết hết hạn sau 1 giờ.</p>`;
  await sendMail({ to, subject, text, html });
}
