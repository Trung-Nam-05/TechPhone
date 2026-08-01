export function normalizeAdminSearchQuery(raw) {
  return String(raw || '').trim().toLowerCase().replace(/^#/, '');
}

export function orderMatchesQuery(order, rawQuery) {
  const q = normalizeAdminSearchQuery(rawQuery);
  if (!q) return true;

  const id = String(order._id || '').toLowerCase();
  const shortId = id.slice(-8);
  const name = String(order.shippingInfo?.fullName || '').toLowerCase();
  const phone = String(order.shippingInfo?.phone || '').toLowerCase();
  const email = String(order.shippingInfo?.email || '').toLowerCase();

  return (
    id.includes(q) ||
    shortId.includes(q) ||
    name.includes(q) ||
    phone.includes(q) ||
    email.includes(q)
  );
}

export function productMatchesQuery(product, rawQuery) {
  const q = normalizeAdminSearchQuery(rawQuery);
  if (!q) return true;

  const name = String(product.name || '').toLowerCase();
  const brand = String(product.brand || '').toLowerCase();
  const category = String(product.category?.label || '').toLowerCase();
  const slug = String(product.slug || '').toLowerCase();

  return name.includes(q) || brand.includes(q) || category.includes(q) || slug.includes(q);
}

export function userMatchesQuery(user, rawQuery) {
  const q = normalizeAdminSearchQuery(rawQuery);
  if (!q) return true;

  const name = String(user.name || '').toLowerCase();
  const email = String(user.email || '').toLowerCase();
  const id = String(user.id || user._id || '').toLowerCase();

  return name.includes(q) || email.includes(q) || id.includes(q);
}

export function supportCustomerMatchesQuery(item, rawQuery) {
  const q = normalizeAdminSearchQuery(rawQuery);
  if (!q) return true;

  const name = String(item.customer?.name || '').toLowerCase();
  const email = String(item.customer?.email || '').toLowerCase();
  const preview = String(item.lastMessagePreview || '').toLowerCase();
  const id = String(item.customerId || item.customer?._id || '').toLowerCase();

  return name.includes(q) || email.includes(q) || preview.includes(q) || id.includes(q);
}

export function priceHistoryMatchesQuery(item, rawQuery) {
  const q = normalizeAdminSearchQuery(rawQuery);
  if (!q) return true;

  const name = String(item.product?.name || item.productName || '').toLowerCase();
  const note = String(item.note || '').toLowerCase();
  const source = String(item.source || '').toLowerCase();
  const actorName = String(item.actor?.name || '').toLowerCase();
  const actorEmail = String(item.actor?.email || '').toLowerCase();
  const productId = String(item.product?._id || item.product || '').toLowerCase();

  return (
    name.includes(q) ||
    note.includes(q) ||
    source.includes(q) ||
    actorName.includes(q) ||
    actorEmail.includes(q) ||
    productId.includes(q) ||
    productMatchesQuery(item.product || { name: item.productName, brand: '', slug: '' }, rawQuery)
  );
}
