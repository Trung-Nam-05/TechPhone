/**
 * Thương hiệu gợi ý theo danh mục — dùng cho form admin tạo/sửa sản phẩm.
 * `key` lưu vào DB (khớp seed); `label` hiển thị trên UI.
 */
export const BRANDS_BY_CATEGORY = {
  'dien-thoai': [
    { key: 'apple', label: 'Apple' },
    { key: 'samsung', label: 'Samsung' },
    { key: 'xiaomi', label: 'Xiaomi' },
    { key: 'oppo', label: 'OPPO' },
    { key: 'vivo', label: 'vivo' },
    { key: 'realme', label: 'realme' },
    { key: 'honor', label: 'HONOR' },
    { key: 'tecno', label: 'TECNO' },
    { key: 'nokia', label: 'Nokia' },
    { key: 'nubia', label: 'nubia' },
    { key: 'tcl', label: 'TCL' },
    { key: 'masstel', label: 'Masstel' },
  ],
  'may-tinh-bang': [
    { key: 'apple', label: 'Apple' },
    { key: 'samsung', label: 'Samsung' },
    { key: 'xiaomi', label: 'Xiaomi' },
    { key: 'lenovo', label: 'Lenovo' },
    { key: 'huawei', label: 'Huawei' },
    { key: 'oppo', label: 'OPPO' },
  ],
  laptop: [
    { key: 'apple', label: 'Apple' },
    { key: 'asus', label: 'ASUS' },
    { key: 'dell', label: 'Dell' },
    { key: 'hp', label: 'HP' },
    { key: 'lenovo', label: 'Lenovo' },
    { key: 'acer', label: 'Acer' },
    { key: 'msi', label: 'MSI' },
    { key: 'lg', label: 'LG' },
    { key: 'samsung', label: 'Samsung' },
  ],
  'may-lanh': [
    { key: 'daikin', label: 'Daikin' },
    { key: 'panasonic', label: 'Panasonic' },
    { key: 'lg', label: 'LG' },
    { key: 'samsung', label: 'Samsung' },
    { key: 'sharp', label: 'Sharp' },
    { key: 'casper', label: 'Casper' },
    { key: 'comfee', label: 'Comfee' },
    { key: 'xiaomi', label: 'Xiaomi' },
    { key: 'toshiba', label: 'Toshiba' },
    { key: 'aqua', label: 'Aqua' },
    { key: 'lenson', label: 'Lenson' },
    { key: 'nagakawa', label: 'Nagakawa' },
  ],
  'dien-may': [
    { key: 'samsung', label: 'Samsung' },
    { key: 'lg', label: 'LG' },
    { key: 'sony', label: 'Sony' },
    { key: 'tcl', label: 'TCL' },
    { key: 'xiaomi', label: 'Xiaomi' },
    { key: 'sharp', label: 'Sharp' },
    { key: 'toshiba', label: 'Toshiba' },
    { key: 'panasonic', label: 'Panasonic' },
    { key: 'aqua', label: 'Aqua' },
    { key: 'casper', label: 'Casper' },
    { key: 'dreame', label: 'Dreame' },
    { key: 'electrolux', label: 'Electrolux' },
  ],
  'phu-kien': [
    { key: 'apple', label: 'Apple' },
    { key: 'samsung', label: 'Samsung' },
    { key: 'anker', label: 'Anker' },
    { key: 'logitech', label: 'Logitech' },
    { key: 'sony', label: 'Sony' },
    { key: 'jbl', label: 'JBL' },
    { key: 'baseus', label: 'Baseus' },
    { key: 'ugreen', label: 'Ugreen' },
    { key: 'keychron', label: 'Keychron' },
    { key: 'xiaomi', label: 'Xiaomi' },
  ],
};

export function getBrandsForCategory(categoryKey) {
  return BRANDS_BY_CATEGORY[categoryKey] || [];
}

export function getBrandLabel(categoryKey, brandKey) {
  if (!brandKey) return '';
  const normalized = String(brandKey).trim().toLowerCase();
  const brands = getBrandsForCategory(categoryKey);
  const found = brands.find((b) => b.key === normalized || b.label.toLowerCase() === normalized);
  if (found) return found.label;
  return brandKey;
}

export function normalizeBrandKey(categoryKey, brandValue) {
  if (!brandValue) return '';
  const normalized = String(brandValue).trim().toLowerCase();
  const brands = getBrandsForCategory(categoryKey);
  const found = brands.find((b) => b.key === normalized || b.label.toLowerCase() === normalized);
  return found ? found.key : normalized;
}
