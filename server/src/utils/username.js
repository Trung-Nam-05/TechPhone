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
    return { ok: false, message: 'Username is required.' };
  }
  if (username.length < 6 || username.length > 20) {
    return { ok: false, message: 'Username must be 6–20 characters.' };
  }
  if (!USERNAME_REGEX.test(username)) {
    return {
      ok: false,
      message: 'Username must start with a letter and contain only lowercase letters, numbers, and underscores.',
    };
  }
  if (/^\d+$/.test(username)) {
    return { ok: false, message: 'Username cannot be all numbers.' };
  }
  if (/(.)\1\1/.test(username)) {
    return { ok: false, message: 'Username cannot contain three identical characters in a row.' };
  }
  if (USERNAME_BLACKLIST.has(username)) {
    return { ok: false, message: 'This username is not allowed.' };
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
