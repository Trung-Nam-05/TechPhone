import Category from '../models/Category.js';

const DEFAULT_CATEGORIES = [
  { key: 'dien-thoai', label: 'Điện thoại', sortOrder: 1 },
  { key: 'may-tinh-bang', label: 'Máy tính bảng', sortOrder: 2 },
  { key: 'laptop', label: 'Laptop', sortOrder: 3 },
  { key: 'may-lanh', label: 'Máy lạnh', sortOrder: 4 },
  { key: 'dien-may', label: 'Điện máy', sortOrder: 5 },
  { key: 'phu-kien', label: 'Phụ kiện', sortOrder: 6 },
];

export async function ensureDefaultCategories() {
  for (const item of DEFAULT_CATEGORIES) {
    await Category.updateOne(
      { key: item.key },
      {
        $setOnInsert: {
          key: item.key,
          label: item.label,
          sortOrder: item.sortOrder,
          isActive: true,
          isDeleted: false,
        },
      },
      { upsert: true },
    );
  }
}
