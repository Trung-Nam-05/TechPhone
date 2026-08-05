export function isInternalLoginEmail(email) {
  return String(email || '').toLowerCase().endsWith('@users.techphone.local');
}

export function getDisplayLoginEmail(user) {
  if (!user?.email) return '';
  return isInternalLoginEmail(user.email) ? '' : user.email;
}
