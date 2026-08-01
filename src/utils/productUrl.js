export function getProductCategoryKey(product) {
  if (!product) return 'san-pham';
  if (typeof product.category === 'string') return product.category;
  return product.category?.key || 'san-pham';
}

export function getProductSlug(product) {
  if (!product) return '';
  return product.slug || String(product.legacyId || product.id || product._id || '');
}

/** Canonical storefront URL: /{categoryKey}/{slug} */
export function getProductPath(product) {
  const categoryKey = getProductCategoryKey(product);
  const slug = getProductSlug(product);
  if (!slug) return '/products';
  return `/${categoryKey}/${slug}`;
}
