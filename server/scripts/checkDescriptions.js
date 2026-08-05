import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase } from '../src/config/db.js';
import Product from '../src/models/Product.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

await connectDatabase();
const total = await Product.countDocuments();
const products = await Product.find().select('name slug description category').lean();
const empty = products.filter(
  (p) => !p.description || p.description.trim() === '' || p.description === 'Thông tin sản phẩm đang được cập nhật.',
);
console.log('Total:', total);
console.log('Missing/placeholder descriptions:', empty.length);
console.log('Sample empty:', empty.slice(0, 5).map((p) => p.name));
console.log('Sample with desc:', products.filter((p) => p.description && p.description.length > 50).slice(0, 3).map((p) => ({ name: p.name, len: p.description.length })));
process.exit(0);
