import { createHash } from 'node:crypto';

const USERNAME_REGEX = /^[a-z][a-z0-9_]{5,19}$/;

const USERNAME_BLACKLIST = new Set([
  'admin',
  'administrator',
  'root',
  'support',
  'helpdesk',
  'system',
  'moderator',
  'mod',
  'staff',
  'techphone',
  'null',
  'undefined',
  'anonymous',
  'guest',
  'user',
  'test',
  'demo',
]);

export function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

export function validateUsername(rawValue) {
  const username = normalizeUsername(rawValue);
  if (!username) {
    return { ok: false, message: 'Vui lòng nhập tên đăng nhập.' };
  }
  if (username.length < 6 || username.length > 20) {
    return { ok: false, message: 'Tên đăng nhập phải từ 6–20 ký tự.' };
  }
  if (!USERNAME_REGEX.test(username)) {
    return {
      ok: false,
      message: 'Tên đăng nhập phải bắt đầu bằng chữ cái, chỉ gồm chữ thường, số và dấu gạch dưới.',
    };
  }
  if (/^\d+$/.test(username)) {
    return { ok: false, message: 'Tên đăng nhập không được toàn số.' };
  }
  if (/(.)\1\1/.test(username)) {
    return { ok: false, message: 'Tên đăng nhập không được có 3 ký tự giống nhau liên tiếp.' };
  }
  if (USERNAME_BLACKLIST.has(username)) {
    return { ok: false, message: 'Tên đăng nhập này không được phép sử dụng.' };
  }
  return { ok: true, username };
}

export function buildInternalEmail(username) {
  return `${username}@users.techphone.local`;
}

export function isInternalLoginEmail(email) {
  return String(email || '').toLowerCase().endsWith('@users.techphone.local');
}

export function hashOpaqueToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}
