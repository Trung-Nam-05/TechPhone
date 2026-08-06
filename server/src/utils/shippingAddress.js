function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeStreetAddress(street, { ward, district, province } = {}) {
  let value = String(street || '').trim();
  if (!value) return '';

  const adminParts = [
    ward,
    district,
    province,
    'Việt Nam',
    'Vietnam',
    'Hồ Chí Minh',
    'Ho Chi Minh',
    'TP HCM',
    'TP. HCM',
    'Sài Gòn',
    'Saigon',
  ].filter(Boolean);

  let changed = true;
  while (changed) {
    changed = false;
    for (const part of adminParts) {
      const pattern = new RegExp(`[,\\s]*${escapeRegex(part)}\\s*$`, 'i');
      if (pattern.test(value)) {
        value = value.replace(pattern, '').trim();
        changed = true;
      }
    }
  }

  return value.replace(/[,\s]+$/, '').trim();
}

export function formatFullShippingAddress(info) {
  if (!info) return '';
  const street = normalizeStreetAddress(info.address, info);
  return [street, info.ward, info.district, info.province].filter(Boolean).join(', ');
}
