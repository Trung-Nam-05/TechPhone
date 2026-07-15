import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  CircleHelp,
  CreditCard,
  Menu,
  ShoppingCart,
  Smartphone,
  User,
  WalletCards,
  LogOut,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import ProductSearchInput from './ProductSearchInput';
import './Header.css';

const QUICK_LINK_KEYS = [
  { k: 'iphone17', href: '/products?search=iphone%2017' },
  { k: 'laptop', href: '/products?category=laptop' },
  { k: 'samsung', href: '/products?search=samsung' },
  { k: 'iphone16', href: '/products?search=iphone%2016' },
  { k: 'macbook', href: '/products?search=macbook' },
  { k: 'ipad', href: '/products?search=ipad' },
  { k: 'airConditioner', href: '/products?search=m%C3%A1y%20l%E1%BA%A1nh' },
];

const MENU_ITEM_DEFS = [
  {
    key: 'dien-thoai',
    labelKey: 'header.menu.phones',
    href: '/products?category=dien-thoai',
    icon: 'https://cdn2.fptshop.com.vn/svg/Phone_34e165ffd8.svg',
  },
  {
    key: 'laptop',
    labelKey: 'header.menu.laptop',
    href: '/products?category=laptop',
    icon: 'https://cdn2.fptshop.com.vn/svg/laptop_5db0bc4284.svg',
  },
  {
    key: 'dien-may',
    labelKey: 'header.menu.appliances',
    href: '/products?category=dien-may',
    icon: 'https://cdn2.fptshop.com.vn/svg/laundry_db19ad5b73.svg',
  },
  {
    key: 'phu-kien',
    labelKey: 'header.menu.accessories',
    href: '/products?category=phu-kien',
    icon: 'https://cdn2.fptshop.com.vn/svg/Headphone_9e2cb21b09.svg',
  },
  { key: 'tivi', labelKey: 'header.menu.tvAc', href: '/products?category=dien-may' },
  { key: 'tu-lanh', labelKey: 'header.menu.fridges', href: '/products?category=dien-may' },
  { key: 'may-giat', labelKey: 'header.menu.laundry', href: '/products?category=dien-may' },
  { key: 'dong-ho', labelKey: 'header.menu.tablets', href: '/products?category=phu-kien' },
  { key: 'pc', labelKey: 'header.menu.pc', href: '/products?search=pc' },
];

const MENU_DETAIL = {
  'dien-thoai': {
    title: '🔥 Gợi ý cho bạn',
    brands: [
      {
        label: 'iPhone',
        logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_iphone_ngang_eac93ff477.png',
      },
      {
        label: 'Samsung',
        logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_samsung_ngang_1624d75bd8.png',
      },
      {
        label: 'Xiaomi',
        logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_xiaomi_ngang_0faf267234.png',
      },
      {
        label: 'OPPO',
        logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_oppo_ngang_68d31fcd73.png',
      },
      {
        label: 'HONOR',
        logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_honor_ngang_814fca59e4.png',
      },
      {
        label: 'TECNO',
        logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_tecno_ngang_c587e5f1fa.png',
      },
    ],
    tags: [
      {
        label: 'Điện thoại 5G',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/icon_dien_thoai_5g_26dd40b4ad.png',
      },
      {
        label: 'Điện thoại AI',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/icon_dien_thoai_ai_76d81abd6a.png',
      },
      {
        label: 'Gaming phone',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/small/Choi_game_7a1e21b716.png',
      },
      {
        label: 'Camera chống rung',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/small/Camera_chong_rung_7b307edb2c.png',
      },
      {
        label: 'Phổ thông 4G',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/DT_pho_thong_023f991327.png',
      },
    ],
    columns: [
      { title: 'Apple (iPhone)', items: ['iPhone 17 Series', 'iPhone 16 Series', 'iPhone 15 Series', 'iPhone 14 Series'] },
      { title: 'Samsung', items: ['Galaxy AI', 'Galaxy S Series', 'Galaxy Z Series', 'Galaxy A Series'] },
      { title: 'Xiaomi', items: ['Poco Series', 'Xiaomi Series', 'Redmi Note Series', 'Redmi Series'] },
      { title: 'OPPO', items: ['OPPO Reno Series', 'OPPO Find Series', 'OPPO A Series'] },
      { title: 'HONOR', items: ['HONOR 400 Series', 'HONOR Magic Series', 'HONOR X Series'] },
      { title: 'Thương hiệu khác', items: ['Tecno', 'Realme', 'Nubia - ZTE', 'Inoi', 'Benco'] },
    ],
    sideBanner: 'https://cdn2.fptshop.com.vn/unsafe/480x0/filters:format(webp):quality(75)/opt1_36152d3691.png',
  },
  laptop: {
    title: '🔥 Gợi ý cho bạn',
    brands: [
      {
        label: 'MacBook',
        logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_macbook_ngang_dde8d75478.png',
      },
      {
        label: 'ASUS',
        logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_asus_ngang_ac594ab664.png',
      },
      {
        label: 'Dell',
        logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_dell_ngang_5152294265.png',
      },
      {
        label: 'Lenovo',
        logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_lenovo_ngang_9db13437a1.png',
      },
      {
        label: 'HP',
        logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_hp_ngang_b77a1ee753.png',
      },
      {
        label: 'Acer',
        logo: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/logo_acer_ngang_38e8924b9d.png',
      },
    ],
    tags: [
      {
        label: 'Gaming đồ họa',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/small/Gaming_do_hoa_bda9a0ce46.png',
      },
      {
        label: 'Laptop AI',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/small/Laptop_AI_a18198d206.png',
      },
      {
        label: 'Sinh viên - Văn phòng',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/small/Hoc_tap_1e8958339e.png',
      },
      {
        label: 'Mỏng nhẹ',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/small/Mong_nhe_e3777444c7.png',
      },
      {
        label: 'Doanh nhân',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/small/Doanh_nhan_9213b16ed0.png',
      },
    ],
    columns: [
      { title: 'Apple (Macbook)', items: ['MacBook Neo', 'MacBook Air 13 inch', 'MacBook Air 15 inch', 'MacBook Pro 14 inch'] },
      { title: 'Lenovo', items: ['Lenovo Gaming LOQ', 'Lenovo Legion Gaming', 'Lenovo Yoga', 'Lenovo IdeaPad'] },
      { title: 'Dell', items: ['Dell XPS', 'Dell Inspiron', 'Dell Latitude', 'Dell 15'] },
      { title: 'Asus', items: ['Asus ZenBook', 'Asus VivoBook', 'Asus TUF Gaming', 'Asus ROG'] },
      { title: 'Acer', items: ['Acer Aspire', 'Acer Aspire Gaming', 'Acer Nitro'] },
      { title: 'HP', items: ['HP 14/15', 'HP ProBook', 'HP Envy', 'HP Victus'] },
    ],
    sideBanner: 'https://cdn2.fptshop.com.vn/unsafe/480x0/filters:format(webp):quality(75)/224x224_0b8df04986.png',
  },
  'dien-may': {
    title: '🔥 Gợi ý cho bạn',
    brands: [],
    tags: [
      {
        label: 'Máy lạnh - Điều hòa 1 chiều',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/dieu_hoa_mot_chieu_af79cf05dc.png',
      },
      {
        label: 'Tivi 4K',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/small/tivi4k_a4c5f8ae9b.png',
      },
      {
        label: 'Tivi QLED',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/small/tivi_qled_80169c2de8.png',
      },
      {
        label: 'Máy giặt cửa trước',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/small/may_giat_cua_truoc_7ca348d575.png',
      },
      {
        label: 'Tủ lạnh Inverter',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/small/tu_lanh_invester_6312e21e64.png',
      },
    ],
    columns: [
      { title: 'Tivi', items: ['Tivi QLED', 'Tivi 4K', 'Google TV'] },
      { title: 'Máy lạnh - Điều hòa', items: ['Máy lạnh - Điều hòa 1 chiều', 'Máy lạnh - Điều hòa 2 chiều', 'Máy lạnh - điều hòa Inverter'] },
      { title: 'Tủ lạnh', items: ['Tủ lạnh Inverter', 'Tủ lạnh nhiều cửa', 'Side by side', 'Mini'] },
      { title: 'Máy giặt', items: ['Máy giặt cửa trước', 'Máy giặt cửa trên', 'Máy giặt sấy'] },
      { title: 'Máy sấy', items: ['Sấy thông hơi', 'Sấy ngưng tụ', 'Sấy bơm nhiệt'] },
      { title: 'Tủ đông', items: ['Tủ đông mini', 'Tủ đông đứng', 'Tủ mát'] },
      { title: 'Phụ kiện điện máy', items: ['Vật tư máy lạnh', 'Phụ kiện máy giặt', 'Phụ kiện Tivi'] },
    ],
    sideBanner: 'https://cdn2.fptshop.com.vn/unsafe/480x0/filters:format(webp):quality(75)/RC_1000_X1000_1_2085b9e2ac.png',
  },
  'phu-kien': {
    title: '🔥 Gợi ý cho bạn',
    brands: [],
    tags: [
      {
        label: 'Loa',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/icon_loa_d47c19eb1a.png',
      },
      {
        label: 'Tai nghe',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/small/Tai_nghe_khong_day_61f7928270.png',
      },
      {
        label: 'Camera hành động',
        icon: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=96&h=96&q=80',
      },
      {
        label: 'Chuột',
        icon: 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=96&h=96&q=80',
      },
      {
        label: 'Bàn phím cơ',
        icon: 'https://cdn2.fptshop.com.vn/unsafe/96x0/filters:format(webp):quality(75)/icon_ban_phim_co_c8ed3b2e8f.png',
      },
    ],
    columns: [
      { title: 'Âm thanh', items: ['Tai nghe nhét tai', 'Tai nghe chụp tai', 'Tai nghe không dây', 'Loa Bluetooth', 'Loa karaoke', 'Loa vi tính'] },
      {
        title: 'Phụ kiện di động',
        items: ['Sạc, Cáp', 'Sạc dự phòng', 'Bao da, Ốp lưng', 'Thẻ nhớ', 'Miếng dán màn hình', 'Bút cảm ứng'],
      },
      {
        title: 'Phụ kiện Laptop',
        items: ['Chuột', 'Bàn phím', 'Balo, Túi xách', 'Bút trình chiếu', 'Webcam', 'Giá đỡ'],
      },
      { title: 'Kính thông minh', items: ['Kính AI', 'Kính chụp ảnh'] },
      { title: 'Camera', items: ['Camera hành động', 'Flycam'] },
      { title: 'Thiết bị lưu trữ dữ liệu', items: ['USB', 'Thẻ nhớ', 'Ổ cứng di động'] },
      { title: 'Gaming Gear', items: ['Thiết bị chơi game', 'Tai nghe Gaming', 'Chuột Gaming', 'Bàn phím Gaming'] },
      { title: 'Phụ kiện khác', items: ['TV Box', 'Hub chuyển đổi', 'Phụ bàn phím', 'USB'] },
    ],
    sideBanner: 'https://cdn2.fptshop.com.vn/unsafe/480x0/filters:format(webp):quality(75)/Danh_muc_Phu_kien_937f9a1854.png',
  },
};

export default function Header() {
  const { cartCount } = useCart();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState('dien-thoai');
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef(null);
  const activeDetail = MENU_DETAIL[activeMenuKey] || MENU_DETAIL['dien-thoai'];

  const menuItems = useMemo(
    () => MENU_ITEM_DEFS.map((item) => ({ ...item, label: t(item.labelKey) })),
    [t],
  );

  const handleSearchSubmit = (query) => {
    const trimmedQuery = String(query || searchQuery).trim();
    if (!trimmedQuery) return;
    navigate(`/products?search=${encodeURIComponent(trimmedQuery)}`);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  return (
    <header className="tp-header" ref={menuRef}>
      <div className="tp-header-top">
        <div className="container tp-header-main-row">
          <div className="tp-logo-lang">
            <Link to="/" className="tp-logo">
              <span className="tp-logo-mark">Tech</span>
              <span className="tp-logo-text">Phone</span>
            </Link>
            <div className="tp-lang" role="group" aria-label={t('language.switch')}>
              <button
                type="button"
                className={locale === 'vi' ? 'tp-lang-on' : ''}
                onClick={() => setLocale('vi')}
              >
                VI
              </button>
              <button
                type="button"
                className={locale === 'en' ? 'tp-lang-on' : ''}
                onClick={() => setLocale('en')}
              >
                EN
              </button>
            </div>
          </div>

          <button
            type="button"
            className={`tp-menu-trigger ${isMenuOpen ? 'tp-menu-trigger-open' : ''}`}
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            <Menu size={18} />
            <span>{t('header.menuCategory')}</span>
          </button>

          <ProductSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearchSubmit}
            placeholder={t('header.searchPlaceholder')}
            className="tp-search-bar-wrap"
            inputClassName="tp-search-bar"
          />

          {isAuthenticated ? (
            <>
              <Link
                to="/account"
                className="tp-round-action"
                aria-label={t('header.account')}
                title={user?.name || t('header.account')}
              >
                <User size={18} />
              </Link>
              <Link
                to="/account/orders"
                className="tp-round-action"
                aria-label={t('header.myOrders')}
                title={t('header.myOrders')}
              >
                <WalletCards size={18} />
              </Link>
              <button
                type="button"
                className="tp-round-action"
                data-testid="header-logout"
                aria-label={t('header.logout')}
                title={t('header.logout')}
                onClick={logout}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link to="/login" className="tp-round-action" aria-label={t('header.login')}>
              <User size={18} />
            </Link>
          )}

          {isAdmin && (
            <Link to="/admin" className="tp-round-action" aria-label={t('header.admin')}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{t('header.adminShort')}</span>
            </Link>
          )}

          <Link to="/cart" className="tp-cart-action" data-testid="header-cart">
            <ShoppingCart size={18} />
            <span>{t('header.cart')}</span>
            {cartCount > 0 && <em data-testid="header-cart-count">{cartCount}</em>}
          </Link>
        </div>

        <div className="container tp-mobile-search-row">
          <ProductSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearchSubmit}
            placeholder={t('header.searchPlaceholder')}
            className="tp-search-bar-wrap"
            inputClassName="tp-search-bar"
          />
        </div>
      </div>

      <div className="tp-header-bottom">
        <div className="container tp-quick-links">
          {QUICK_LINK_KEYS.map((item) => (
            <Link key={item.k} to={item.href}>
              {t(`header.quickLinks.${item.k}`)}
            </Link>
          ))}
        </div>
      </div>

      {isMenuOpen && (
        <div className="tp-mega-menu-wrap">
          <div className="container">
            <div className="tp-mega-menu">
              <aside className="tp-mega-left">
                {menuItems.map((item) => (
                  item.href ? (
                    <Link
                      key={item.key}
                      to={item.href}
                      onMouseEnter={() => setActiveMenuKey(item.key)}
                      onClick={() => setIsMenuOpen(false)}
                      className={activeMenuKey === item.key ? 'tp-mega-left-active' : ''}
                    >
                      {item.icon && <img src={item.icon} alt={item.label} />}
                      <span>{item.label}</span>
                      <ChevronRight size={14} />
                    </Link>
                  ) : (
                    <button type="button" key={item.key}>
                      <span>{item.label}</span>
                    </button>
                  )
                ))}
              </aside>

              <section className="tp-mega-center">
                <header>
                  <h4>
                    🔥 {t('header.suggestionTitle')}
                  </h4>
                  {activeDetail.brands.length > 0 && (
                    <div className="tp-mega-brand-row">
                      {activeDetail.brands.map((brand) => (
                        <Link to={`/products?search=${encodeURIComponent(brand.label)}`} key={brand.label} onClick={() => setIsMenuOpen(false)}>
                          <img src={brand.logo} alt={brand.label} />
                        </Link>
                      ))}
                    </div>
                  )}
                  {activeDetail.tags.length > 0 && (
                    <div className="tp-mega-tag-row">
                      {activeDetail.tags.map((tag) => (
                        <Link to={`/products?search=${encodeURIComponent(tag.label)}`} key={tag.label} onClick={() => setIsMenuOpen(false)}>
                          <img src={tag.icon} alt={tag.label} />
                          <span>{tag.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </header>

                <div className="tp-mega-grid">
                  {activeDetail.columns.map((group) => (
                    <article key={group.title}>
                      <h5>{group.title}</h5>
                      {group.items.map((item) => (
                        <Link to={`/products?search=${encodeURIComponent(item)}`} key={item} onClick={() => setIsMenuOpen(false)}>
                          {item}
                        </Link>
                      ))}
                    </article>
                  ))}
                </div>
              </section>

              <aside className="tp-mega-right">
                <Link to="/products?search=may%20cu" onClick={() => setIsMenuOpen(false)}>
                  <Smartphone size={16} />
                  {t('header.usedPhones')}
                </Link>
                <Link to="/support/tro-giup" onClick={() => setIsMenuOpen(false)}>
                  <CircleHelp size={16} />
                  {t('header.usefulInfo')}
                </Link>
                <Link to="/policies/tra-gop" onClick={() => setIsMenuOpen(false)}>
                  <CreditCard size={16} />
                  {t('header.paymentUtilities')}
                </Link>
                <Link to="/segments" onClick={() => setIsMenuOpen(false)}>
                  <WalletCards size={16} />
                  {t('header.enterpriseDiscount')}
                </Link>
                <Link to="/support/tro-giup" onClick={() => setIsMenuOpen(false)}>
                  <CircleHelp size={16} />
                  {t('header.onlineSupport')}
                </Link>
                {activeDetail.sideBanner && (
                  <Link to="/products?search=khuyen%20mai" className="tp-mega-right-banner" onClick={() => setIsMenuOpen(false)}>
                    <img src={activeDetail.sideBanner} alt={t('header.categoryBanner')} />
                  </Link>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
