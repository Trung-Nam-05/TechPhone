import express from 'express';
import Category from '../models/Category.js';

const router = express.Router();

const FALLBACK_CATEGORIES = [
  { key: 'dien-thoai', label: 'Điện thoại', sortOrder: 1 },
  { key: 'may-tinh-bang', label: 'Máy tính bảng', sortOrder: 2 },
  { key: 'laptop', label: 'Laptop', sortOrder: 3 },
  { key: 'may-lanh', label: 'Máy lạnh', sortOrder: 4 },
  { key: 'dien-may', label: 'Điện máy', sortOrder: 5 },
  { key: 'phu-kien', label: 'Phụ kiện', sortOrder: 6 },
];

router.get('/', async (_req, res, next) => {
  try {
    const items = await Category.find({ isDeleted: false, isActive: true })
      .sort({ sortOrder: 1, label: 1 })
      .select('key label sortOrder')
      .lean();

    if (items.length === 0) {
      return res.json({ items: FALLBACK_CATEGORIES, source: 'fallback' });
    }
    return res.json({ items, source: 'db' });
  } catch (error) {
    return next(error);
  }
});

export default router;
