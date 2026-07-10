import 'dotenv/config';
import { connectDatabase } from '../src/config/db.js';
import Product from '../src/models/Product.js';
import User from '../src/models/User.js';
import { hashPassword } from '../src/utils/auth.js';
import { PRODUCTS } from '../../src/data/products.js';

const CATEGORY_LABEL_BY_KEY = {
  'dien-thoai': 'Điện thoại',
  laptop: 'Laptop',
  'dien-may': 'Điện máy',
  'phu-kien': 'Phụ kiện',
};

const EXTRA_PRODUCTS = [
  {
    id: 201,
    name: 'Nubia A76 4GB 128GB (NFC)',
    brand: 'nubia',
    category: 'dien-thoai',
    price: 2790000,
    oldPrice: 3290000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/nubia_a76_xam_5_87aade2a96.jpg',
  },
  {
    id: 202,
    name: 'Tecno Spark 40C 8GB 256GB',
    brand: 'tecno',
    category: 'dien-thoai',
    price: 3190000,
    oldPrice: 3790000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/tecno_spark_40c_xanh_5_c23af5300b.png',
  },
  {
    id: 203,
    name: 'Xiaomi Poco M7 Pro 5G 8GB 256GB',
    brand: 'xiaomi',
    category: 'dien-thoai',
    price: 5990000,
    oldPrice: 6290000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/xiaomi_poco_m7_pro_xanh_5_20cec22a7c.jpg',
  },
  {
    id: 204,
    name: 'Honor X9d 5G 8GB 256GB',
    brand: 'honor',
    category: 'dien-thoai',
    price: 9490000,
    oldPrice: 10990000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/honor_x9d_do_5_5835eff2ec.png',
  },
  {
    id: 205,
    name: 'OPPO Find N3 5G 16GB 512GB',
    brand: 'oppo',
    category: 'dien-thoai',
    price: 26990000,
    oldPrice: 44190000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/2023_11_7_638349536349641250_oppo-find-n3-5g-den-7.jpg',
  },
  {
    id: 206,
    name: 'OPPO Find N6 5G 16GB 512GB',
    brand: 'oppo',
    category: 'dien-thoai',
    price: 64990000,
    oldPrice: 69990000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/2025_8_26_638918155212802493_Dien-thoai-OPPO-Find-N6-5G-16GB-512GB-Titan-CPH2765-01.png',
  },
  {
    id: 207,
    name: 'Samsung Galaxy S26 5G 12GB 256GB',
    brand: 'samsung',
    category: 'dien-thoai',
    price: 21990000,
    oldPrice: 25990000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samsung_galaxy_s26_xanh_09a3e3a2d1.png',
  },
  {
    id: 208,
    name: 'Samsung Galaxy S26 Plus 5G 12GB 256GB',
    brand: 'samsung',
    category: 'dien-thoai',
    price: 25990000,
    oldPrice: 29990000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samsung_galaxy_s26_plus_xanh_d187590277.png',
  },
  {
    id: 209,
    name: 'Samsung Galaxy S26 Ultra 5G 12GB 256GB',
    brand: 'samsung',
    category: 'dien-thoai',
    price: 32990000,
    oldPrice: 36990000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samsung_galaxy_s26_ultra_tim_d3898ec641.png',
  },
  {
    id: 210,
    name: 'Xiaomi Redmi Note 15 6GB 128GB',
    brand: 'xiaomi',
    category: 'dien-thoai',
    price: 5690000,
    oldPrice: 5990000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/xiaomi_redmi_note_15_xanh_1935de8379.png',
  },
  {
    id: 211,
    name: 'OPPO Reno15 F 5G 8GB 256GB',
    brand: 'oppo',
    category: 'dien-thoai',
    price: 11990000,
    oldPrice: 12990000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/oppo_reno15_f_xanh_5_a866ea3714.png',
  },
  {
    id: 212,
    name: 'Samsung Galaxy Z Fold7 5G 12GB 256GB',
    brand: 'samsung',
    category: 'dien-thoai',
    price: 40290000,
    oldPrice: 46990000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samsung_galaxy_z_fold7_xanh_1_f38c49efb2.png',
  },
  {
    id: 213,
    name: 'Xiaomi 15T Pro 5G 12GB 512GB',
    brand: 'xiaomi',
    category: 'dien-thoai',
    price: 17990000,
    oldPrice: 19490000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/xiaomi_15t_pro_vang_5_1e3becf88b.png',
  },
  {
    id: 214,
    name: 'Samsung Galaxy A07 5G 4GB 128GB',
    brand: 'samsung',
    category: 'dien-thoai',
    price: 4390000,
    oldPrice: 4690000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samssung_galaxy_a07_5g_xanh_5_938303e676.png',
  },
  {
    id: 215,
    name: 'Samsung Galaxy A07 8GB 256GB',
    brand: 'samsung',
    category: 'dien-thoai',
    price: 4490000,
    oldPrice: 4690000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samsung_galaxy_a07_xanh_193bd56760.png',
  },
  {
    id: 216,
    name: 'Xiaomi Redmi 13x 8GB 128GB',
    brand: 'xiaomi',
    category: 'dien-thoai',
    price: 7790000,
    oldPrice: 8090000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/xiaomi_redmi_13x_xanh_5_2f17e30bdd.png',
  },
  {
    id: 217,
    name: 'Nubia V80 Design 8GB',
    brand: 'nubia',
    category: 'dien-thoai',
    price: 3790000,
    oldPrice: 3990000,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/nubia_v80_design_vang_5_9c21ee8a79.png',
  },
];

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mapToSeedDocument(product) {
  const categoryKey = product.category || 'phu-kien';
  const categoryLabel = CATEGORY_LABEL_BY_KEY[categoryKey] || 'Sản phẩm';
  const slugSuffix = product.id ? `-${product.id}` : '';

  return {
    legacyId: product.id,
    name: product.name,
    slug: `${slugify(product.name)}${slugSuffix}`,
    category: {
      key: categoryKey,
      label: categoryLabel,
    },
    brand: product.brand || '',
    price: product.price,
    oldPrice: product.oldPrice || null,
    discount: product.discount || 0,
    stock: 100,
    image: product.image || '',
    images: product.image ? [product.image] : [],
    description: product.description || 'Thông tin sản phẩm đang được cập nhật.',
    isActive: true,
  };
}

async function seed() {
  await connectDatabase();
  const mergedProducts = [...PRODUCTS, ...EXTRA_PRODUCTS];
  const documents = mergedProducts.map(mapToSeedDocument);

  await Product.deleteMany({});
  await Product.insertMany(documents, { ordered: false });
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@techphone.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const passwordHash = hashPassword(adminPassword);

  await User.findOneAndUpdate(
    { email: adminEmail },
    {
      name: 'TechPhone Admin',
      email: adminEmail,
      passwordHash,
      role: 'admin',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`Seeded ${documents.length} products and ensured admin user (${adminEmail}).`);
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
