import { useEffect } from 'react';

export const DEFAULT_SITE_DESCRIPTION =
  'TechPhone — Mua điện thoại, laptop, phụ kiện công nghệ chính hãng. Giao hàng nhanh, thanh toán COD và VNPAY.';

function upsertMeta(name, content) {
  let node = document.querySelector(`meta[name="${name}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute('name', name);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function upsertCanonical(href) {
  let node = document.querySelector('link[rel="canonical"]');
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', 'canonical');
    document.head.appendChild(node);
  }
  node.setAttribute('href', href);
}

/**
 * Sets document title, meta description, and canonical link for SEO.
 */
export default function PageMeta({ title, description = DEFAULT_SITE_DESCRIPTION, canonicalPath }) {
  useEffect(() => {
    document.title = title ? `${title} | TechPhone` : 'TechPhone — Cửa hàng công nghệ';
    upsertMeta('description', description);

    const path = canonicalPath ?? `${window.location.pathname}${window.location.search}`;
    upsertCanonical(`${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`);
  }, [title, description, canonicalPath]);

  return null;
}
