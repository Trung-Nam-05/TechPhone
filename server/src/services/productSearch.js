export function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildProductSearchFilter(term) {
  const text = String(term || '').trim();
  if (!text) return null;

  const escaped = escapeRegex(text);
  const regex = new RegExp(escaped, 'i');
  return {
    $or: [{ name: regex }, { brand: regex }, { slug: regex }, { 'category.label': regex }],
  };
}

export function scoreProductMatch(product, term) {
  const query = String(term || '').trim().toLowerCase();
  if (!query) return 0;

  const name = String(product.name || '').toLowerCase();
  const brand = String(product.brand || '').toLowerCase();
  const slug = String(product.slug || '').toLowerCase();

  if (name === query) return 1000;
  if (name.startsWith(query)) return 800;
  if (name.includes(query)) return 600;
  if (brand.startsWith(query)) return 500;
  if (brand.includes(query)) return 400;
  if (slug.includes(query.replace(/\s+/g, '-'))) return 300;
  return 100;
}

export function sortProductsByRelevance(items, term) {
  const query = String(term || '').trim();
  if (!query) return items;

  return [...items].sort((a, b) => {
    const scoreDiff = scoreProductMatch(b, query) - scoreProductMatch(a, query);
    if (scoreDiff !== 0) return scoreDiff;
    return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
  });
}
