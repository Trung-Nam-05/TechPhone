import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronDown, Search } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { PRODUCT_CATEGORIES, PRODUCTS, getCategoryLabel } from '../data/products';
import { API_BASE_URL } from '../config/api';
import { formatCountdown, getFlashSaleState } from '../utils/flashSale';
import './Products.css';

const PHONE_HERO_BANNERS = [
  'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/H1_1440x242_f7303547a2.png',
  'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/H1_1440x242_b0ac49aa7d.png',
  'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/H1_1440x242_23f4156810.png',
];

const PHONE_BRANDS = [
  { key: 'apple', label: 'iPhone', logo: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/logo_iphone_ngang_eac93ff477.png' },
  { key: 'samsung', label: 'Samsung', logo: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/logo_samsung_ngang_1624d75bd8.png' },
  { key: 'honor', label: 'HONOR', logo: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/logo_honor_ngang_814fca59e4.png' },
  { key: 'tecno', label: 'TECNO', logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_tecno_ngang_c587e5f1fa.png' },
  { key: 'nokia', label: 'nokia', logo: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/logo_nokia_ngang_15416db151.png' },
  { key: 'viettel', label: 'viettel' },
  { key: 'realme', label: 'realme', logo: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/logo_realme_ngang_0185815a13.png' },
  { key: 'mobell', label: 'mobell' },
  { key: 'xiaomi', label: 'Xiaomi', logo: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/logo_xiaomi_ngang_0faf267234.png' },
  { key: 'oppo', label: 'OPPO', logo: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/logo_oppo_ngang_68d31fcd73.png' },
  { key: 'redmagic', label: 'REDMAGIC', logo: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/logo_redmagic_ngang_505d29c537.png' },
  { key: 'nubia', label: 'ZTE nubia' },
  { key: 'masstel', label: 'Masstel', logo: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/logo_masstel_ngang_2a96b9898c.png' },
  { key: 'tcl', label: 'TCL', logo: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/logo_tcl_ngang_0ed4175607.png' },
  { key: 'benco', label: 'benco' },
  { key: 'inoi', label: 'inoi' },
];

const FALLBACK_FEATURE_PRODUCTS = [
  {
    id: 201,
    name: 'Nubia A76 4GB 128GB (NFC)',
    brand: 'nubia',
    price: 2790000,
    oldPrice: 3290000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/nubia_a76_xam_5_87aade2a96.jpg',
  },
  {
    id: 202,
    name: 'Tecno Spark 40C 8GB 256GB',
    brand: 'tecno',
    price: 3190000,
    oldPrice: 3790000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/tecno_spark_40c_xanh_5_c23af5300b.png',
  },
  {
    id: 203,
    name: 'Xiaomi Poco M7 Pro 5G 8GB 256GB',
    brand: 'xiaomi',
    price: 5990000,
    oldPrice: 6290000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/xiaomi_poco_m7_pro_xanh_5_20cec22a7c.jpg',
  },
  {
    id: 204,
    name: 'Honor X9d 5G 8GB 256GB',
    brand: 'honor',
    price: 9490000,
    oldPrice: 10990000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/honor_x9d_do_5_5835eff2ec.png',
  },
  {
    id: 205,
    name: 'OPPO Find N3 5G 16GB 512GB',
    brand: 'oppo',
    price: 26990000,
    oldPrice: 44190000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/2023_11_7_638349536349641250_oppo-find-n3-5g-den-7.jpg',
  },
];

const FALLBACK_PHONE_EXTRA_PRODUCTS = [
  {
    id: 206,
    name: 'OPPO Find N6 5G 16GB 512GB',
    brand: 'oppo',
    category: 'dien-thoai',
    price: 64990000,
    oldPrice: 69990000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/2025_8_26_638918155212802493_Dien-thoai-OPPO-Find-N6-5G-16GB-512GB-Titan-CPH2765-01.png',
  },
  {
    id: 207,
    name: 'Samsung Galaxy S26 5G 12GB 256GB',
    brand: 'samsung',
    category: 'dien-thoai',
    price: 21990000,
    oldPrice: 25990000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samsung_galaxy_s26_xanh_09a3e3a2d1.png',
  },
  {
    id: 208,
    name: 'Samsung Galaxy S26 Plus 5G 12GB 256GB',
    brand: 'samsung',
    category: 'dien-thoai',
    price: 25990000,
    oldPrice: 29990000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samsung_galaxy_s26_plus_xanh_d187590277.png',
  },
  {
    id: 209,
    name: 'Samsung Galaxy S26 Ultra 5G 12GB 256GB',
    brand: 'samsung',
    category: 'dien-thoai',
    price: 32990000,
    oldPrice: 36990000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samsung_galaxy_s26_ultra_tim_d3898ec641.png',
  },
  {
    id: 210,
    name: 'Xiaomi Redmi Note 15 6GB 128GB',
    brand: 'xiaomi',
    category: 'dien-thoai',
    price: 5690000,
    oldPrice: 5990000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/xiaomi_redmi_note_15_xanh_1935de8379.png',
  },
  {
    id: 211,
    name: 'OPPO Reno15 F 5G 8GB 256GB',
    brand: 'oppo',
    category: 'dien-thoai',
    price: 11990000,
    oldPrice: 12990000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/oppo_reno15_f_xanh_5_a866ea3714.png',
  },
  {
    id: 212,
    name: 'Samsung Galaxy Z Fold7 5G 12GB 256GB',
    brand: 'samsung',
    category: 'dien-thoai',
    price: 40290000,
    oldPrice: 46990000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samsung_galaxy_z_fold7_xanh_1_f38c49efb2.png',
  },
  {
    id: 213,
    name: 'Xiaomi 15T Pro 5G 12GB 512GB',
    brand: 'xiaomi',
    category: 'dien-thoai',
    price: 17990000,
    oldPrice: 19490000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/xiaomi_15t_pro_vang_5_1e3becf88b.png',
  },
  {
    id: 214,
    name: 'Samsung Galaxy A07 5G 4GB 128GB',
    brand: 'samsung',
    category: 'dien-thoai',
    price: 4390000,
    oldPrice: 4690000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samssung_galaxy_a07_5g_xanh_5_938303e676.png',
  },
  {
    id: 215,
    name: 'Samsung Galaxy A07 8GB 256GB',
    brand: 'samsung',
    category: 'dien-thoai',
    price: 4490000,
    oldPrice: 4690000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/samsung_galaxy_a07_xanh_193bd56760.png',
  },
  {
    id: 216,
    name: 'Xiaomi Redmi 13x 8GB 128GB',
    brand: 'xiaomi',
    category: 'dien-thoai',
    price: 7790000,
    oldPrice: 8090000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/xiaomi_redmi_13x_xanh_5_2f17e30bdd.png',
  },
  {
    id: 217,
    name: 'Nubia V80 Design 8GB',
    brand: 'nubia',
    category: 'dien-thoai',
    price: 3790000,
    oldPrice: 3990000,
    image: 'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/nubia_v80_design_vang_5_9c21ee8a79.png',
  },
];

const PRICE_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'under-2m', label: 'Dưới 2 triệu' },
  { key: '2m-4m', label: 'Từ 2 - 4 triệu' },
  { key: '4m-7m', label: 'Từ 4 - 7 triệu' },
  { key: '7m-13m', label: 'Từ 7 - 13 triệu' },
  { key: '13m-20m', label: 'Từ 13 - 20 triệu' },
  { key: 'over-20m', label: 'Trên 20 triệu' },
];

const NEED_FILTERS = [
  { key: 'nfc', label: 'NFC' },
  { key: 'big-battery', label: 'Pin trên 5500 mAh' },
  { key: 'five-g', label: '5G' },
  { key: 'ai', label: 'Điện thoại AI' },
  { key: 'gaming', label: 'Gaming phone' },
];

const ADVANCED_FILTER_SECTIONS = [
  {
    id: 'resolution',
    title: 'Độ phân giải',
    type: 'chip',
    options: ['Retina (iPhone)', '2K/2K+', '1.5K', 'FHD/FHD+', 'HD/HD+', 'QXGA', 'QQVGA/QVGA'],
  },
  {
    id: 'refresh-rate',
    title: 'Tần số quét',
    type: 'chip',
    options: ['Trên 144 Hz', '120 Hz', '90 Hz', '60 Hz'],
  },
  {
    id: 'camera',
    title: 'Camera',
    type: 'check',
    options: ['Tất cả', 'Quay phim Slow Motion', 'AI Camera', 'Hiệu ứng làm đẹp', 'Zoom quang học', 'Chống rung OIS'],
    showMore: true,
  },
  {
    id: 'special',
    title: 'Tính năng đặc biệt',
    type: 'check',
    options: ['Tất cả', 'Sạc không dây', 'Sạc ngược cho thiết bị khác'],
  },
  {
    id: 'os',
    title: 'Hệ điều hành',
    type: 'chip',
    options: ['iOS', 'Android'],
  },
  {
    id: 'rom',
    title: 'Dung lượng ROM',
    type: 'chip',
    options: ['≤128 GB', '256 GB', '512 GB', '1 TB'],
  },
  {
    id: 'connectivity',
    title: 'Kết nối',
    type: 'chip',
    options: ['NFC', 'Bluetooth', 'Hồng ngoại'],
  },
  {
    id: 'battery',
    title: 'Hiệu năng và Pin',
    type: 'check',
    options: ['Tất cả', 'Dưới 3000 mAh', 'Pin từ 3000 - 4000 mAh', 'Pin từ 4000 - 5500 mAh', 'Pin trâu: trên 5500 mAh'],
  },
  {
    id: 'network',
    title: 'Hỗ trợ mạng',
    type: 'chip',
    options: ['5G', '4G'],
  },
];

const getBrandKeyFromName = (name = '') => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('iphone') || lowerName.includes('apple')) return 'apple';
  if (lowerName.includes('samsung')) return 'samsung';
  if (lowerName.includes('xiaomi') || lowerName.includes('redmi') || lowerName.includes('poco')) return 'xiaomi';
  if (lowerName.includes('oppo')) return 'oppo';
  if (lowerName.includes('honor')) return 'honor';
  if (lowerName.includes('realme')) return 'realme';
  if (lowerName.includes('tecno')) return 'tecno';
  if (lowerName.includes('nokia')) return 'nokia';
  if (lowerName.includes('nubia')) return 'nubia';
  return 'other';
};

const normalizeBrand = (brand = '') => String(brand || '').trim().toLowerCase();

const isInPriceRange = (price, rangeKey) => {
  if (rangeKey === 'all') return true;
  if (rangeKey === 'under-2m') return price < 2000000;
  if (rangeKey === '2m-4m') return price >= 2000000 && price < 4000000;
  if (rangeKey === '4m-7m') return price >= 4000000 && price < 7000000;
  if (rangeKey === '7m-13m') return price >= 7000000 && price < 13000000;
  if (rangeKey === '13m-20m') return price >= 13000000 && price < 20000000;
  if (rangeKey === 'over-20m') return price >= 20000000;
  return true;
};

const matchesNeed = (product, needKey) => {
  const name = product.name.toLowerCase();
  if (needKey === 'nfc') {
    return /nfc|nubia|tecno|a07|redmi|oppo/.test(name);
  }
  if (needKey === 'big-battery') {
    return /a07|poco|x9d|15t|redmi|spark|v80/.test(name);
  }
  if (needKey === 'five-g') {
    return /5g|s26|fold|x9d|15t|find/.test(name);
  }
  if (needKey === 'ai') {
    return /s26|find|iphone|ai/.test(name);
  }
  if (needKey === 'gaming') {
    return /poco|redmagic|ultra|fold|x9d/.test(name);
  }
  return true;
};

const normalizeText = (value = '') => String(value || '').toLowerCase();

const ADVANCED_MATCHERS = {
  resolution: (product, selections) => {
    if (!selections.length) return true;
    const n = normalizeText(product.name);
    return selections.some((item) => {
      const option = normalizeText(item);
      if (option.includes('retina')) return n.includes('iphone');
      if (option.includes('2k')) return /ultra|pro/.test(n);
      if (option.includes('1.5k')) return /plus|pro/.test(n);
      if (option.includes('fhd')) return /5g|galaxy|note|reno|xiaomi|oppo/.test(n);
      if (option.includes('hd')) return /a07|pho thong|v80/.test(n);
      return true;
    });
  },
  'refresh-rate': (product, selections) => {
    if (!selections.length) return true;
    const n = normalizeText(product.name);
    return selections.some((item) => {
      const option = normalizeText(item);
      if (option.includes('144')) return /gaming|redmagic|ultra/.test(n);
      if (option.includes('120')) return /s26|fold|find|15t|x9d|poco/.test(n);
      if (option.includes('90')) return /redmi|reno|a07|v80/.test(n);
      if (option.includes('60')) return /pho thong|co ban/.test(n);
      return true;
    });
  },
  camera: (product, selections) => {
    if (!selections.length || selections.includes('Tất cả')) return true;
    const n = normalizeText(product.name);
    return selections.every((item) => {
      const option = normalizeText(item);
      if (option.includes('slow')) return /iphone|samsung|xiaomi|oppo/.test(n);
      if (option.includes('ai')) return /ai|s26|iphone|find|xiaomi|honor/.test(n);
      if (option.includes('làm đẹp')) return /oppo|reno|honor|xiaomi/.test(n);
      if (option.includes('zoom')) return /ultra|pro|fold|find/.test(n);
      if (option.includes('ois')) return /ultra|pro|x9d|find|s26/.test(n);
      return true;
    });
  },
  special: (product, selections) => {
    if (!selections.length || selections.includes('Tất cả')) return true;
    const n = normalizeText(product.name);
    return selections.every((item) => {
      const option = normalizeText(item);
      if (option.includes('không dây')) return /iphone|s26|fold|find|ultra/.test(n);
      if (option.includes('sạc ngược')) return /samsung|ultra|fold|xiaomi/.test(n);
      return true;
    });
  },
  os: (product, selections) => {
    if (!selections.length) return true;
    const n = normalizeText(product.name);
    return selections.some((item) => {
      const option = normalizeText(item);
      if (option === 'ios') return n.includes('iphone');
      if (option === 'android') return !n.includes('iphone');
      return true;
    });
  },
  rom: (product, selections) => {
    if (!selections.length) return true;
    const n = normalizeText(product.name);
    return selections.some((item) => {
      const option = normalizeText(item);
      if (option.includes('128')) return /128gb/.test(n);
      if (option.includes('256')) return /256gb/.test(n);
      if (option.includes('512')) return /512gb/.test(n);
      if (option.includes('1 tb')) return /1tb/.test(n);
      return true;
    });
  },
  connectivity: (product, selections) => {
    if (!selections.length) return true;
    const n = normalizeText(product.name);
    return selections.some((item) => {
      const option = normalizeText(item);
      if (option.includes('nfc')) return /nfc|x9d|poco|spark|a07|reno/.test(n);
      if (option.includes('bluetooth')) return true;
      if (option.includes('hồng ngoại')) return /xiaomi|redmi|poco/.test(n);
      return true;
    });
  },
  battery: (product, selections) => {
    if (!selections.length || selections.includes('Tất cả')) return true;
    const n = normalizeText(product.name);
    return selections.every((item) => {
      const option = normalizeText(item);
      if (option.includes('dưới 3000')) return /iphone/.test(n);
      if (option.includes('3000 - 4000')) return /iphone|fold/.test(n);
      if (option.includes('4000 - 5500')) return /s26|oppo|honor|xiaomi/.test(n);
      if (option.includes('trên 5500')) return /a07|redmi|poco|spark|v80/.test(n);
      return true;
    });
  },
  network: (product, selections) => {
    if (!selections.length) return true;
    const n = normalizeText(product.name);
    return selections.some((item) => {
      const option = normalizeText(item);
      if (option === '5g') return n.includes('5g');
      if (option === '4g') return !n.includes('5g');
      return true;
    });
  },
};

function matchesAdvancedFilters(product, selectionsBySection) {
  return Object.entries(selectionsBySection).every(([sectionId, selections]) => {
    const matcher = ADVANCED_MATCHERS[sectionId];
    if (!matcher) return true;
    return matcher(product, selections || []);
  });
}

export default function Products() {
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get('category') || 'all');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [selectedNeeds, setSelectedNeeds] = useState([]);
  const [advancedSelections, setAdvancedSelections] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const [sortBy, setSortBy] = useState('featured');
  const [heroIndex, setHeroIndex] = useState(0);
  const [queryInput, setQueryInput] = useState(searchParams.get('search') || '');
  const [remoteProducts, setRemoteProducts] = useState([]);
  const [hasRemoteLoaded, setHasRemoteLoaded] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category') || 'all';
    setFilter(categoryFromUrl);
    const nextSearch = searchParams.get('search') || '';
    setSearchTerm(nextSearch);
    setQueryInput(nextSearch);
  }, [searchParams]);

  useEffect(() => {
    if (filter !== 'dien-thoai') return undefined;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % PHONE_HERO_BANNERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadProducts = async () => {
      try {
        const params = new URLSearchParams();
        if (filter !== 'all') params.set('category', filter);
        if (searchTerm.trim()) params.set('search', searchTerm.trim());
        if (sortBy === 'price-asc') params.set('sort', 'priceAsc');
        if (sortBy === 'price-desc') params.set('sort', 'priceDesc');
        params.set('limit', '48');

        const response = await fetch(`${API_BASE_URL}/api/products?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to load products');
        const payload = await response.json();
        if (!isMounted) return;

        const normalized = (payload.items || []).map((item) => ({
          ...item,
          id: item.legacyId || item._id,
          category: item.category?.key || 'phu-kien',
        }));
        setRemoteProducts(normalized);
        setHasRemoteLoaded(true);
      } catch (error) {
        if (!isMounted || error.name === 'AbortError') return;
        setRemoteProducts([]);
        setHasRemoteLoaded(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [filter, searchTerm, sortBy]);

  const fallbackPhoneProducts = useMemo(
    () => [
      ...PRODUCTS.filter((product) => product.category === 'dien-thoai').map((product) => ({
        ...product,
        brand: normalizeBrand(product.brand) || getBrandKeyFromName(product.name),
      })),
      ...FALLBACK_PHONE_EXTRA_PRODUCTS,
    ],
    [],
  );

  const remotePhoneProducts = useMemo(
    () =>
      remoteProducts
        .filter((product) => product.category === 'dien-thoai')
        .map((product) => ({
          ...product,
          brand: normalizeBrand(product.brand) || getBrandKeyFromName(product.name),
        })),
    [remoteProducts],
  );

  const phoneProducts = useMemo(() => {
    if (filter === 'dien-thoai' && hasRemoteLoaded) {
      return remotePhoneProducts;
    }
    return fallbackPhoneProducts;
  }, [fallbackPhoneProducts, filter, hasRemoteLoaded, remotePhoneProducts]);

  const featuredPhoneProducts = useMemo(
    () => (phoneProducts.length > 0 ? phoneProducts.slice(0, 5) : FALLBACK_FEATURE_PRODUCTS),
    [phoneProducts],
  );

  const handleFilterChange = (category) => {
    setFilter(category);
    setSelectedBrands([]);
    setSelectedPrice('all');
    setSelectedNeeds([]);
    setAdvancedSelections({});
    setSortBy('featured');
    if (category === 'all') {
      const nextParams = {};
      if (searchTerm) nextParams.search = searchTerm;
      setSearchParams(nextParams);
      return;
    }
    const nextParams = { category };
    if (searchTerm) nextParams.search = searchTerm;
    setSearchParams(nextParams);
  };

  const toggleBrand = (brandKey) => {
    setSelectedBrands((prev) =>
      prev.includes(brandKey) ? prev.filter((item) => item !== brandKey) : [...prev, brandKey],
    );
  };

  const sortedPhoneProducts = useMemo(() => {
    let result = [...phoneProducts];

    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (normalizedSearch) {
      result = result.filter((product) => product.name.toLowerCase().includes(normalizedSearch));
    }

    if (selectedBrands.length > 0) {
      result = result.filter((product) => selectedBrands.includes(product.brand));
    }

    result = result.filter((product) => isInPriceRange(product.price, selectedPrice));

    if (selectedNeeds.length > 0) {
      result = result.filter((product) => selectedNeeds.every((need) => matchesNeed(product, need)));
    }
    result = result.filter((product) => matchesAdvancedFilters(product, advancedSelections));

    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'discount') {
      result.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    }

    return result;
  }, [phoneProducts, selectedBrands, selectedPrice, selectedNeeds, sortBy, searchTerm, advancedSelections]);

  const toggleNeed = (needKey) => {
    setSelectedNeeds((prev) =>
      prev.includes(needKey) ? prev.filter((item) => item !== needKey) : [...prev, needKey],
    );
  };

  const toggleSection = (sectionId) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const toggleAdvancedOption = (section, option) => {
    setAdvancedSelections((prev) => {
      const current = prev[section.id] || [];
      const isSelected = current.includes(option);

      if (section.type === 'check') {
        if (option === 'Tất cả') {
          return { ...prev, [section.id]: ['Tất cả'] };
        }
        const withoutAll = current.filter((item) => item !== 'Tất cả');
        const next = isSelected
          ? withoutAll.filter((item) => item !== option)
          : [...withoutAll, option];
        return { ...prev, [section.id]: next.length > 0 ? next : ['Tất cả'] };
      }

      const next = isSelected
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, [section.id]: next };
    });
  };

  const filteredProducts = useMemo(
    () => {
      if (hasRemoteLoaded) {
        return remoteProducts;
      }
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const byCategory = filter === 'all' ? PRODUCTS : PRODUCTS.filter((product) => product.category === filter);
      if (!normalizedSearch) return byCategory;
      return byCategory.filter((product) => product.name.toLowerCase().includes(normalizedSearch));
    },
    [filter, searchTerm, remoteProducts, hasRemoteLoaded],
  );

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const normalized = queryInput.trim();
    const nextParams = {};
    if (filter !== 'all') nextParams.category = filter;
    if (normalized) nextParams.search = normalized;
    setSearchParams(nextParams);
  };

  return (
    <div className="container tp-products-page">
      {filter === 'dien-thoai' ? (
        <div className="tp-phone-page">
          <div className="tp-phone-head">
            <div className="tp-phone-head-main">
              <p className="tp-breadcrumb">Trang chủ / Điện thoại</p>
              <h1>Điện thoại</h1>
              <div className="tp-phone-need-filter">
                <p>Tìm sản phẩm theo nhu cầu</p>
                <div>
                  {NEED_FILTERS.map((need) => (
                    <button
                      key={need.key}
                      className={selectedNeeds.includes(need.key) ? 'tp-need-active' : ''}
                      onClick={() => toggleNeed(need.key)}
                    >
                      {need.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <img
              className="tp-phone-head-art"
              src="https://cdn2.fptshop.com.vn/unsafe/640x0/filters:format(webp):quality(75)/Dien_thoai_cbbb797a59.png"
              alt="Điện thoại nổi bật"
            />
          </div>

          <section className="tp-phone-carousel-wrap">
            <section className="tp-phone-hero">
              <img src={PHONE_HERO_BANNERS[heroIndex]} alt="Banner điện thoại" />
              <button
                className="tp-phone-hero-arrow tp-phone-hero-arrow-left"
                onClick={() => setHeroIndex((prev) => (prev - 1 + PHONE_HERO_BANNERS.length) % PHONE_HERO_BANNERS.length)}
              >
                <ArrowLeft size={18} />
              </button>
              <button
                className="tp-phone-hero-arrow tp-phone-hero-arrow-right"
                onClick={() => setHeroIndex((prev) => (prev + 1) % PHONE_HERO_BANNERS.length)}
              >
                <ArrowRight size={18} />
              </button>
            </section>
            <div className="tp-phone-hero-dots">
              {PHONE_HERO_BANNERS.map((_, index) => (
                <button
                  key={index}
                  className={index === heroIndex ? 'tp-phone-hero-dot tp-phone-hero-dot-active' : 'tp-phone-hero-dot'}
                  onClick={() => setHeroIndex(index)}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </section>

          <section className="tp-phone-brand-list">
            {PHONE_BRANDS.map((brand) => (
              <button
                key={brand.key}
                type="button"
                onClick={() => toggleBrand(brand.key)}
                className={selectedBrands.includes(brand.key) ? 'tp-filter-brand-active' : ''}
              >
                {brand.logo ? <img src={brand.logo} alt={brand.label} /> : <span>{brand.label}</span>}
              </button>
            ))}
          </section>

          <section className="tp-phone-trend-banner">
            <img
              src="https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/H9_1240x132_2x_2f0ab811b2.png"
              alt="Trend banner"
            />
          </section>

          <section className="tp-phone-featured">
            <h3>Đặc quyền chỉ có tại TechPhone</h3>
            <div className="tp-phone-featured-grid">
              {featuredPhoneProducts.map((product) => (
                <article key={product.id || product.legacyId || product._id}>
                  <img src={product.image} alt={product.name} />
                  <span className="tp-installment">
                    {(() => {
                      const flashState = getFlashSaleState(product.flashSale, nowMs);
                      if (flashState === 'active') {
                        return `Flash Sale ${formatCountdown(product.flashSale?.endsAt, nowMs)}`;
                      }
                      if (flashState === 'upcoming') {
                        return `Sap sale ${formatCountdown(product.flashSale?.startsAt, nowMs)}`;
                      }
                      return 'Trả góp 0%';
                    })()}
                  </span>
                  <p className="tp-price">{product.price.toLocaleString('vi-VN')} đ</p>
                  <p className="tp-old-price">{product.oldPrice.toLocaleString('vi-VN')} đ</p>
                  <h4>{product.name}</h4>
                  {product.flashSale && (
                    <p className="text-sm text-muted">Con lai: {product.flashSale.remainingQuantity || 0} suat</p>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline"
                    data-testid="add-to-cart"
                    onClick={() => addToCart(product)}
                  >
                    Thêm vào giỏ
                  </button>
                </article>
              ))}
            </div>
          </section>

          <div className="tp-phone-content">
            <aside className="tp-phone-filter">
              <h3>Bộ lọc tìm kiếm</h3>

              <div className="tp-filter-box">
                <h4>Hãng sản xuất</h4>
                <div className="tp-filter-brand-grid">
                  {PHONE_BRANDS.slice(0, 6).map((brand) => (
                    <button
                      key={brand.key}
                      className={selectedBrands.includes(brand.key) ? 'tp-filter-brand-active' : ''}
                      onClick={() => toggleBrand(brand.key)}
                    >
                      <img src={brand.logo} alt={brand.label} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="tp-filter-box">
                <h4>Mức giá</h4>
                {PRICE_FILTERS.map((item) => (
                  <label key={item.key}>
                    <input
                      type="radio"
                      name="price"
                      checked={selectedPrice === item.key}
                      onChange={() => setSelectedPrice(item.key)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              {ADVANCED_FILTER_SECTIONS.map((section) => (
                <div className="tp-filter-box" key={section.id}>
                  <button className="tp-filter-section-toggle" onClick={() => toggleSection(section.id)} type="button">
                    <h4>{section.title}</h4>
                    <ChevronDown
                      size={18}
                      className={collapsedSections[section.id] ? 'tp-chevron tp-chevron-collapsed' : 'tp-chevron'}
                    />
                  </button>
                  {!collapsedSections[section.id] && (
                    <>
                      <div className={section.type === 'chip' ? 'tp-filter-chip-grid' : 'tp-filter-check-grid'}>
                        {section.options.map((option) => {
                          const selected = (advancedSelections[section.id] || []).includes(option);
                          return section.type === 'chip' ? (
                            <button
                              key={option}
                              type="button"
                              className={selected ? 'tp-filter-chip tp-filter-chip-active' : 'tp-filter-chip'}
                              onClick={() => toggleAdvancedOption(section, option)}
                            >
                              {option}
                            </button>
                          ) : (
                            <label key={option} className="tp-filter-check-item">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleAdvancedOption(section, option)}
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                      {section.showMore && (
                        <Link to="/support/tro-giup" className="tp-filter-more-link">
                          Xem thêm
                        </Link>
                      )}
                    </>
                  )}
                </div>
              ))}
            </aside>

            <section className="tp-phone-results">
              <div className="tp-phone-results-header">
                <p>Tìm thấy {sortedPhoneProducts.length} kết quả</p>
                <div>
                  <button className={sortBy === 'featured' ? 'tp-sort-active' : ''} onClick={() => setSortBy('featured')}>
                    Nổi bật
                  </button>
                  <button className={sortBy === 'price-asc' ? 'tp-sort-active' : ''} onClick={() => setSortBy('price-asc')}>
                    Giá tăng dần
                  </button>
                  <button className={sortBy === 'price-desc' ? 'tp-sort-active' : ''} onClick={() => setSortBy('price-desc')}>
                    Giá giảm dần
                  </button>
                  <button className={sortBy === 'discount' ? 'tp-sort-active' : ''} onClick={() => setSortBy('discount')}>
                    Trợ giá tốt
                  </button>
                </div>
              </div>

              <div className="tp-phone-grid">
                {sortedPhoneProducts.map((product) => (
                  <article key={product.id || product.legacyId || product._id} className="tp-phone-card">
                    <Link to={`/product/${product.id || product.legacyId || product._id}`}>
                      <img src={product.image} alt={product.name} />
                    </Link>
                    <span className="tp-installment">
                      {(() => {
                        const flashState = getFlashSaleState(product.flashSale, nowMs);
                        if (flashState === 'active') {
                          return `Flash Sale ${formatCountdown(product.flashSale?.endsAt, nowMs)}`;
                        }
                        if (flashState === 'upcoming') {
                          return `Sap sale ${formatCountdown(product.flashSale?.startsAt, nowMs)}`;
                        }
                        return 'Trả góp 0%';
                      })()}
                    </span>
                    <p className="tp-price">{product.price.toLocaleString('vi-VN')} đ</p>
                    {product.oldPrice && <p className="tp-old-price">{product.oldPrice.toLocaleString('vi-VN')} đ</p>}
                    <Link to={`/product/${product.id || product.legacyId || product._id}`}>
                      <h4>{product.name}</h4>
                    </Link>
                    {product.flashSale && (
                      <p className="text-sm text-muted">Con lai: {product.flashSale.remainingQuantity || 0} suat</p>
                    )}
                    <div className="tp-phone-card-actions">
                      <button
                        type="button"
                        className="btn btn-outline"
                        data-testid="add-to-cart"
                        onClick={() => addToCart(product)}
                      >
                        Thêm vào giỏ
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div>
          <div className="tp-products-toolbar">
            <div className="tp-products-category-tabs">
              <button
                type="button"
                className={filter === 'all' ? 'tp-products-tab tp-products-tab-active' : 'tp-products-tab'}
                onClick={() => handleFilterChange('all')}
              >
                Tất cả
              </button>
              {PRODUCT_CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  className={filter === category.key ? 'tp-products-tab tp-products-tab-active' : 'tp-products-tab'}
                  onClick={() => handleFilterChange(category.key)}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <form className="tp-products-search" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Tìm theo tên sản phẩm..."
              />
              <button type="submit" aria-label="Tìm kiếm sản phẩm">
                <Search size={16} />
              </button>
            </form>
          </div>
          <div className="tp-products-header">
            <h1>{filter === 'all' ? 'Tất cả sản phẩm' : getCategoryLabel(filter)}</h1>
            <p>{filteredProducts.length} sản phẩm</p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} nowMs={nowMs} />
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted">
                Không tìm thấy sản phẩm phù hợp.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
