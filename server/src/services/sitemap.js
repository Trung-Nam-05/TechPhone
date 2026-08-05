import Product from '../models/Product.js';
import Category from '../models/Category.js';

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function buildSitemapXml(siteUrl) {
  const base = siteUrl.replace(/\/$/, '');
  const [products, categories] = await Promise.all([
    Product.find({ isActive: true, deletedAt: null }).select('slug category.key updatedAt').lean(),
    Category.find({ isActive: true, isDeleted: false }).select('key updatedAt').lean(),
  ]);

  const urls = [
    { loc: `${base}/`, priority: '1.0' },
    { loc: `${base}/products`, priority: '0.9' },
    ...categories.map((category) => ({
      loc: `${base}/products?category=${encodeURIComponent(category.key)}`,
      priority: '0.8',
      lastmod: category.updatedAt,
    })),
    ...products.map((product) => ({
      loc: `${base}/${product.category?.key || 'san-pham'}/${product.slug}`,
      priority: '0.7',
      lastmod: product.updatedAt,
    })),
  ];

  const body = urls
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${new Date(entry.lastmod).toISOString().slice(0, 10)}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n    <priority>${entry.priority}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}
