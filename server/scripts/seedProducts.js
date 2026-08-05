import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase } from '../src/config/db.js';
import Product from '../src/models/Product.js';
import User from '../src/models/User.js';
import { hashPassword } from '../src/utils/auth.js';
import { PRODUCTS } from '../../src/data/products.js';
import { buildProductDescription } from '../src/data/productDescriptionBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CATEGORY_LABEL_BY_KEY = {
  'dien-thoai': 'Điện thoại',
  'may-tinh-bang': 'Máy tính bảng',
  laptop: 'Laptop',
  'may-lanh': 'Máy lạnh',
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

  // —— Máy tính bảng ——
  {
    id: 401,
    name: 'iPad Air M2 11 inch WiFi 128GB',
    brand: 'apple',
    category: 'may-tinh-bang',
    price: 16990000,
    oldPrice: 18990000,
    image:
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=700',
    description: 'Chip Apple M2, màn Liquid Retina 11 inch, hỗ trợ Apple Pencil Pro, pin cả ngày.',
  },
  {
    id: 402,
    name: 'iPad gen 10 10.9 inch WiFi 64GB',
    brand: 'apple',
    category: 'may-tinh-bang',
    price: 9990000,
    oldPrice: 11490000,
    image:
      'https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&q=80&w=700',
    description: 'Màn Liquid Retina 10.9 inch, chip A14, USB-C, phù hợp học tập và giải trí.',
  },
  {
    id: 403,
    name: 'Samsung Galaxy Tab S9 FE WiFi 6GB 128GB',
    brand: 'samsung',
    category: 'may-tinh-bang',
    price: 8990000,
    oldPrice: 10490000,
    image:
      'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?auto=format&fit=crop&q=80&w=700',
    description: 'Màn 10.9 inch, S Pen đi kèm, kháng nước IP68, tối ưu ghi chú và xem phim.',
  },
  {
    id: 404,
    name: 'Xiaomi Pad 6 8GB 256GB',
    brand: 'xiaomi',
    category: 'may-tinh-bang',
    price: 7490000,
    oldPrice: 8490000,
    image:
      'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&q=80&w=700',
    description: 'Màn 144Hz 11 inch, Snapdragon 870, loa 4 chiều, pin lớn cho học online.',
  },
  {
    id: 405,
    name: 'Lenovo Tab P12 8GB 128GB',
    brand: 'lenovo',
    category: 'may-tinh-bang',
    price: 6990000,
    oldPrice: 7990000,
    image:
      'https://images.unsplash.com/photo-1623126908029-58cb08a2b272?auto=format&fit=crop&q=80&w=700',
    description: 'Màn 12.7 inch 3K, loa JBL, hỗ trợ bút cảm ứng, làm việc văn phòng nhẹ.',
  },

  // —— Máy lạnh ——
  {
    id: 301,
    name: 'Máy lạnh Daikin Inverter 1 HP ATKFY25XVMV',
    brand: 'daikin',
    category: 'may-lanh',
    price: 8990000,
    oldPrice: 10490000,
    image:
      'https://images.unsplash.com/photo-1631545806609-35f9859918e4?auto=format&fit=crop&q=80&w=700',
    description: 'Inverter tiết kiệm điện, làm lạnh nhanh, lọc khí Streamer, phù hợp phòng ~15m².',
  },
  {
    id: 302,
    name: 'Máy lạnh Panasonic Inverter 1.5 HP CU/CS-PU12AKH-8',
    brand: 'panasonic',
    category: 'may-lanh',
    price: 11990000,
    oldPrice: 13490000,
    image:
      'https://images.unsplash.com/photo-1581275234979-6ef7b2f05cd5?auto=format&fit=crop&q=80&w=700',
    description: 'Nanoe-G lọc bụi mịn, công nghệ Aerowings, êm ái cho phòng ngủ và phòng khách vừa.',
  },
  {
    id: 303,
    name: 'Máy lạnh LG Dual Cool Inverter 1 HP V10API1',
    brand: 'lg',
    category: 'may-lanh',
    price: 8490000,
    oldPrice: 9790000,
    image:
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&q=80&w=700',
    description: 'Dual Inverter, làm lạnh sâu, vận hành êm, bảo hành máy nén dài hạn.',
  },
  {
    id: 304,
    name: 'Máy lạnh Samsung WindFree Inverter 1.5 HP AR13CYFAAWKNSV',
    brand: 'samsung',
    category: 'may-lanh',
    price: 12990000,
    oldPrice: 14990000,
    image:
      'https://images.unsplash.com/photo-1615876235081-9b0b3a8b0f1e?auto=format&fit=crop&q=80&w=700',
    description: 'Công nghệ WindFree thổi mát không gió buốt, AI Auto Comfort, kết nối SmartThings.',
  },
  {
    id: 305,
    name: 'Máy lạnh Sharp Inverter 2 HP AH-X18ZEW',
    brand: 'sharp',
    category: 'may-lanh',
    price: 13990000,
    oldPrice: 15990000,
    image:
      'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&q=80&w=700',
    description: 'Công suất 2HP cho phòng lớn ~25–30m², Plasmacluster ion, chế độ tiết kiệm.',
  },
  {
    id: 306,
    name: 'Máy lạnh Casper Inverter 1 HP GC-09IS35',
    brand: 'casper',
    category: 'may-lanh',
    price: 6990000,
    oldPrice: 7990000,
    image:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=700',
    description: 'Giá tốt, inverter ổn định, lắp đặt phổ biến cho căn hộ và phòng trọ.',
  },
  {
    id: 307,
    name: 'Máy lạnh Comfee Inverter 1 HP CFS-10VGPF',
    brand: 'comfee',
    category: 'may-lanh',
    price: 4990000,
    oldPrice: 8390000,
    discount: 41,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/comfee_inverter_1_hp_cfs_10vgpf_4d3fdb96a5.png',
    description: 'Eco+ tiết kiệm điện, AI Frost Clean, điều khiển qua điện thoại, phù hợp phòng ~15m².',
  },
  {
    id: 308,
    name: 'Máy lạnh Comfee Inverter 1.5 HP CFS-13VGPF',
    brand: 'comfee',
    category: 'may-lanh',
    price: 5990000,
    oldPrice: 9390000,
    discount: 36,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/comfee_inverter_15_hp_cfs_13vgpf_dd3ca9040b.png',
    description: 'Công suất 1.5HP cho phòng 20–25m², Eco+, tự làm sạch dàn lạnh.',
  },
  {
    id: 309,
    name: 'Máy lạnh Xiaomi Mijia Pro Eco Inverter 1 HP ASC-09W/N1C5-VN',
    brand: 'xiaomi',
    category: 'may-lanh',
    price: 7990000,
    oldPrice: 10990000,
    discount: 27,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/mijia_air_conditioner_pro_eco_inverter_1_6c6f6f5160.png',
    description: 'Xiaomi Home điều khiển thông minh, làm lạnh nhanh 30 giây, tự làm sạch dàn lạnh.',
  },
  {
    id: 310,
    name: 'Máy lạnh Panasonic Inverter 1 HP CU/CS-RU9CKH-8D',
    brand: 'panasonic',
    category: 'may-lanh',
    price: 11490000,
    oldPrice: 12690000,
    discount: 9,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/small/panasonic_cu_cs_ru9_12_18ckh_8d_1_0987187996.png',
    description: 'Lọc bụi mịn PM2.5, làm lạnh nhanh, thổi gió dễ chịu, tự chỉnh công suất thông minh.',
  },
  {
    id: 311,
    name: 'Máy lạnh Lenson Inverter 1 HP LV-09CX1',
    brand: 'lenson',
    category: 'may-lanh',
    price: 4790000,
    oldPrice: 6990000,
    discount: 31,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/89058_Anh_chinh_719157015978_lenson_inverter_1_hp_lv_09cx1_64_2a9b1e6670.png',
    description: 'Làm lạnh Turbo, iClean tự làm sạch, cảm biến nhiệt độ iFeel.',
  },
  {
    id: 312,
    name: 'Máy lạnh Comfee Inverter 1 HP CFS-10VGX',
    brand: 'comfee',
    category: 'may-lanh',
    price: 4990000,
    oldPrice: 7990000,
    discount: 38,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/comfee_cfs_vgx_1_7041341b97.png',
    description: 'Tự chỉnh công suất thông minh, tự làm sạch dàn lạnh, điều khiển giọng nói.',
  },
  {
    id: 313,
    name: 'Máy lạnh Comfee Inverter 1.5 HP CFS-13VGX',
    brand: 'comfee',
    category: 'may-lanh',
    price: 6990000,
    oldPrice: 8990000,
    discount: 22,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/comfee_cfs_vgx_1_7041341b97.png',
    description: '1.5HP cho phòng vừa, Eco mode, kết nối app điều khiển từ xa.',
  },
  {
    id: 314,
    name: 'Máy lạnh Comfee Inverter 2 HP CFS-18VGX',
    brand: 'comfee',
    category: 'may-lanh',
    price: 10990000,
    oldPrice: 12990000,
    discount: 15,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/comfee_cfs_vgx_1_7041341b97.png',
    description: 'Công suất 2HP cho phòng lớn 30–35m², làm lạnh nhanh, vận hành êm.',
  },
  {
    id: 315,
    name: 'Máy lạnh Xiaomi Mijia Pro Eco Inverter 1.5 HP ASC-12W/N1C5-VN',
    brand: 'xiaomi',
    category: 'may-lanh',
    price: 9490000,
    oldPrice: 12990000,
    discount: 27,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/mijia_air_conditioner_pro_eco_inverter_1_6c6f6f5160.png',
    description: '1.5HP, Mi Home, làm lạnh nhanh 30 giây, tự làm sạch dàn lạnh.',
  },
  {
    id: 316,
    name: 'Máy lạnh Panasonic Inverter 1.5 HP CU/CS-RU12CKH-8D',
    brand: 'panasonic',
    category: 'may-lanh',
    price: 13990000,
    oldPrice: 15390000,
    discount: 9,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/small/panasonic_cu_cs_ru9_12_18ckh_8d_1_0987187996.png',
    description: 'Lọc PM2.5, khử mùi diệt khuẩn, thổi gió dễ chịu cho phòng 20–25m².',
  },
  {
    id: 317,
    name: 'Máy lạnh Panasonic Inverter 2 HP CU/CS-RU18CKH-8D',
    brand: 'panasonic',
    category: 'may-lanh',
    price: 21590000,
    oldPrice: 23090000,
    discount: 6,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/small/panasonic_cu_cs_ru9_12_18ckh_8d_1_0987187996.png',
    description: '2HP cho phòng lớn, lọc bụi mịn PM2.5, tự chỉnh công suất thông minh.',
  },

  // —— Laptop bổ sung ——
  {
    id: 501,
    name: 'Lenovo IdeaPad Slim 5 14 OLED Ryzen 7',
    brand: 'lenovo',
    category: 'laptop',
    price: 18990000,
    oldPrice: 21490000,
    image:
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&q=80&w=700',
    description: 'Màn OLED 2.8K, Ryzen 7, mỏng nhẹ, phù hợp sinh viên và làm việc di động.',
  },
  {
    id: 502,
    name: 'HP Pavilion 15 Intel Core i5 16GB 512GB',
    brand: 'hp',
    category: 'laptop',
    price: 16490000,
    oldPrice: 18490000,
    image:
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=700',
    description: 'Cấu hình cân bằng văn phòng – học tập, bàn phím số, cổng kết nối đầy đủ.',
  },
  {
    id: 503,
    name: 'Acer Aspire 7 Gaming RTX 3050',
    brand: 'acer',
    category: 'laptop',
    price: 19990000,
    oldPrice: 22990000,
    image:
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=700',
    description: 'GPU RTX 3050, màn 144Hz, tản nhiệt tốt cho game và đồ họa nhẹ.',
  },
  {
    id: 504,
    name: 'MacBook Pro 14 inch M3 8GB 512GB',
    brand: 'apple',
    category: 'laptop',
    price: 39990000,
    oldPrice: 42990000,
    image:
      'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&q=80&w=700',
    description: 'Chip M3, màn Liquid Retina XDR, hiệu năng chuyên nghiệp cho sáng tạo nội dung.',
  },

  // —— Điện máy bổ sung ——
  {
    id: 601,
    name: 'Smart TV Samsung Crystal UHD 55 inch 4K',
    brand: 'samsung',
    category: 'dien-may',
    price: 10990000,
    oldPrice: 12990000,
    image:
      'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&q=80&w=700',
    description: 'Crystal Processor 4K, Tizen OS, âm thanh Object Tracking Sound Lite.',
  },
  {
    id: 602,
    name: 'Smart TV LG OLED 48 inch C3 4K',
    brand: 'lg',
    category: 'dien-may',
    price: 24990000,
    oldPrice: 28990000,
    image:
      'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&q=80&w=700',
    description: 'Tấm nền OLED tự phát sáng, webOS, chơi game 120Hz, độ tương phản vô hạn.',
  },
  {
    id: 606,
    name: 'Samsung Smart AI TV QLED 55 inch 4K QA55Q6FA',
    brand: 'samsung',
    category: 'dien-may',
    price: 9990000,
    oldPrice: 14490000,
    discount: 31,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samsung_qa75q6faakxxv_1_3ecbbf5af2.png',
    description: 'Màn QLED 4K, tần số quét 60Hz, trợ lý ảo tiếng Việt, trả góp 0%.',
  },
  {
    id: 607,
    name: 'TCL Google TV 55 inch 4K 55P638',
    brand: 'tcl',
    category: 'dien-may',
    price: 10290000,
    oldPrice: 12990000,
    discount: 21,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/tcl_p638_1_29fe0d4d07.png',
    description: 'HDR10, Dolby, Dynamic Color Enhancement, Google TV đầy đủ ứng dụng.',
  },
  {
    id: 608,
    name: 'Xiaomi Google TV 43 inch Full HD A 2026 L43MB-AFSEA',
    brand: 'xiaomi',
    category: 'dien-may',
    price: 6190000,
    oldPrice: 6490000,
    discount: 5,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/xiaomi_tv_a_43_2026_1_bafe229b33.png',
    description: 'Google TV, điều khiển giọng nói, phù hợp phòng nhỏ dưới 15m².',
  },
  {
    id: 609,
    name: 'Samsung Smart TV 55 inch 4K UA55U8500F',
    brand: 'samsung',
    category: 'dien-may',
    price: 10490000,
    oldPrice: 15890000,
    discount: 34,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samsung_uau8500fkxxv_1_6a4aeb360e.png',
    description: 'Tivi 4K Ultra HD, Bixby tiếng Việt, tần số quét 50Hz.',
  },
  {
    id: 610,
    name: 'LG Smart TV QNED 43 inch 4K 43QNED80BSA',
    brand: 'lg',
    category: 'dien-may',
    price: 11390000,
    oldPrice: 13390000,
    discount: 15,
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/lg_43qned80bsa_1_a5fe0e7452.png',
    description: 'QNED 4K sắc nét, webOS AI, tần số quét 60Hz.',
  },
  {
    id: 603,
    name: 'Máy giặt LG Inverter 10kg FV1410S4W1',
    brand: 'lg',
    category: 'dien-may',
    price: 8990000,
    oldPrice: 10490000,
    image:
      'https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&q=80&w=700',
    description: 'AI DD, Steam vệ sinh, giặt lớn 10kg, tiết kiệm điện nước.',
  },
  {
    id: 604,
    name: 'Tủ lạnh Samsung Inverter 300L RT32CG5424B1SV',
    brand: 'samsung',
    category: 'dien-may',
    price: 9490000,
    oldPrice: 10990000,
    image:
      'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&q=80&w=700',
    description: 'Ngăn đông trên, Digital Inverter, khử mùi, phù hợp gia đình 3–4 người.',
  },
  {
    id: 605,
    name: 'Robot hút bụi lau nhà Xiaomi Vacuum S10+',
    brand: 'xiaomi',
    category: 'dien-may',
    price: 7490000,
    oldPrice: 8990000,
    image:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=700',
    description: 'Lazer navigation, hút + lau, tự đổ rác, điều khiển app Mi Home.',
  },

  // —— Phụ kiện bổ sung ——
  {
    id: 701,
    name: 'Sạc nhanh Anker 65W GaN 3 cổng',
    brand: 'anker',
    category: 'phu-kien',
    price: 1290000,
    oldPrice: 1590000,
    image:
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&q=80&w=700',
    description: 'GaN nhỏ gọn, sạc laptop và điện thoại cùng lúc, chuẩn PD/PPS.',
  },
  {
    id: 702,
    name: 'Chuột không dây Logitech MX Master 3S',
    brand: 'logitech',
    category: 'phu-kien',
    price: 2490000,
    oldPrice: 2790000,
    image:
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=700',
    description: 'Cảm biến 8K DPI, cuộn MagSpeed, kết nối đa thiết bị cho dân văn phòng.',
  },
  {
    id: 703,
    name: 'Bàn phím cơ Keychron K2 Wireless',
    brand: 'keychron',
    category: 'phu-kien',
    price: 2190000,
    oldPrice: 2490000,
    image:
      'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=700',
    description: 'Bluetooth + có dây, layout 75%, switch Gateron, tương thích macOS/Windows.',
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
    description: buildProductDescription({
      ...product,
      legacyId: product.id,
      category: { key: categoryKey, label: categoryLabel },
    }),
    isActive: true,
  };
}

async function seed() {
  await connectDatabase();
  const mergedProducts = [...PRODUCTS, ...EXTRA_PRODUCTS];
  const documents = mergedProducts.map(mapToSeedDocument);

  await Product.deleteMany({});
  await Product.insertMany(documents, { ordered: false });

  const byCategory = await Product.aggregate([
    { $group: { _id: '$category.key', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
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
  console.log(
    'By category:',
    byCategory.map((row) => `${row._id}=${row.count}`).join(', '),
  );
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
