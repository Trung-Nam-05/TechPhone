import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase } from '../src/config/db.js';
import Product from '../src/models/Product.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

await connectDatabase();
const items = await Product.find().select('legacyId name category brand description').sort({ legacyId: 1 }).lean();
for (const p of items) {
  console.log(
    `${p.legacyId}\t${p.category?.key}\t${p.brand}\t${p.name}\t${(p.description || '').length}`,
  );
}
process.exit(0);
