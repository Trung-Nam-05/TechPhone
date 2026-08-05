import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase } from '../src/config/db.js';
import Product from '../src/models/Product.js';
import {
  buildProductDescription,
  isPlaceholderDescription,
} from '../src/data/productDescriptionBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const forceAll = process.argv.includes('--force');

await connectDatabase();

const products = await Product.find().select('name brand category legacyId description').lean();
let updated = 0;

for (const product of products) {
  const needsRichHtml =
    forceAll ||
    isPlaceholderDescription(product.description || '') ||
    (product.description || '').length < 400 ||
    !/<[a-z][\s\S]*>/i.test(product.description || '');

  if (!needsRichHtml) continue;

  const html = buildProductDescription(product, { force: true });
  await Product.updateOne({ _id: product._id }, { $set: { description: html } });
  updated += 1;
  console.log(`✓ ${product.legacyId || '—'}\t${product.name}`);
}

console.log(`\nĐã cập nhật mô tả cho ${updated}/${products.length} sản phẩm.`);
process.exit(0);
