import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import HeroCarousel from '../components/HeroCarousel';
import './Home.css';

const HIGHLIGHT_CATEGORIES = [
  {
    label: 'Điện thoại',
    href: '/products?category=dien-thoai',
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/icon_cate_dienthoai_1a4a34c043.png',
  },
  {
    label: 'Máy tính bảng',
    href: '/products',
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/may_tinh_bang_ic_cate_dccb57ff5c.png',
  },
  {
    label: 'Laptop',
    href: '/products?category=laptop',
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/laptop_ic_cate_47e7264bc7.png',
  },
  {
    label: 'Màn hình',
    href: '/products',
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/man_hinh_ic_cate_7663908793.png',
  },
  {
    label: 'PC - Máy tính để bàn',
    href: '/products',
    image:
      'https://images.unsplash.com/photo-1593640495253-23196b27a87f?auto=format&fit=crop&w=180&h=180&q=80',
  },
  {
    label: 'Phụ kiện',
    href: '/products?category=phu-kien',
    image:
      'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=180&h=180&q=80',
  },
  {
    label: 'Sim FPT',
    href: '/products',
    image:
      'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=180&h=180&q=80',
  },
  {
    label: 'Đồng hồ thông minh',
    href: '/products?category=phu-kien',
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=180&h=180&q=80',
  },
  {
    label: 'Tivi',
    href: '/products?category=dien-may',
    image: 'https://cdn2.fptshop.com.vn/thumb/thumb/tivi_ad77c6b2eb.gif',
    badge: true,
  },
  {
    label: 'Máy lạnh - Điều hòa',
    href: '/products?category=dien-may',
    image: 'https://cdn2.fptshop.com.vn/thumb/thumb/may_lanh_dieu_hoa_42f5e11390.gif',
    badge: true,
  },
  {
    label: 'Robot hút bụi',
    href: '/products?category=dien-may',
    image: 'https://cdn2.fptshop.com.vn/thumb/thumb/robot_hut_bui_c5ba74b695.gif',
    badge: true,
  },
  {
    label: 'Máy lọc nước',
    href: '/products?category=dien-may',
    image: 'https://cdn2.fptshop.com.vn/thumb/thumb/may_loc_nuoc_f5c5f2d359.gif',
    badge: true,
  },
  {
    label: 'Quạt điều hòa',
    href: '/products?category=dien-may',
    image:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=180&h=180&q=80',
  },
  {
    label: 'Máy giặt',
    href: '/products?category=dien-may',
    image:
      'https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=180&h=180&q=80',
    badge: true,
  },
  {
    label: 'Tủ lạnh',
    href: '/products?category=dien-may',
    image:
      'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&w=180&h=180&q=80',
    badge: true,
  },
  {
    label: 'Máy cũ giá rẻ',
    href: '/products',
    image:
      'https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?auto=format&fit=crop&w=180&h=180&q=80',
  },
];

const DEAL_GROUPS = [
  {
    title: 'Công nghệ',
    items: [
      {
        name: 'Laptop',
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=120&h=120&q=80',
      },
      {
        name: 'Máy tính bảng',
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=120&h=120&q=80',
      },
      {
        name: 'Màn hình',
        image: 'https://images.unsplash.com/photo-1527443224154-c4f0617d6eb1?auto=format&fit=crop&w=120&h=120&q=80',
      },
      {
        name: 'Điện thoại',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=120&h=120&q=80',
      },
    ],
  },
  {
    title: 'Phụ kiện',
    items: [
      {
        name: 'Máy chiếu',
        image: 'https://images.unsplash.com/photo-1623410439349-0f8d0be4f7d6?auto=format&fit=crop&w=120&h=120&q=80',
      },
      {
        name: 'Đồng hồ',
        image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=120&h=120&q=80',
      },
      {
        name: 'Loa',
        image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=120&h=120&q=80',
      },
      {
        name: 'Tai nghe',
        image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=120&h=120&q=80',
      },
    ],
  },
  {
    title: 'Nghiện nhà',
    items: [
      {
        name: 'Máy lạnh',
        image: 'https://images.unsplash.com/photo-1581275234979-6ef7b2f05cd5?auto=format&fit=crop&w=120&h=120&q=80',
      },
      {
        name: 'Máy giặt',
        image: 'https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=120&h=120&q=80',
      },
      {
        name: 'Máy sấy',
        image: 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=120&h=120&q=80',
      },
      {
        name: 'Máy lọc không khí',
        image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=120&h=120&q=80',
      },
    ],
  },
];

const DEAL_HERO_IMAGE =
  'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/343x446_15499066a3.png';

const MOBILE_TRENDS = ['iPhone 17', 'Laptop', 'Điện thoại Samsung', 'iPhone 16', 'Samsung Galaxy S26', 'Máy lạnh'];

const MOBILE_NEWS = [
  {
    title: 'HONOR 600 Pro lộ ảnh thực tế: Thiết kế mới, camera xịn',
    image:
      'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=140&h=100&q=80',
  },
  {
    title: 'REDMI K90 Max sắp ra mắt: Tập trung hiệu năng bền bỉ',
    image:
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=140&h=100&q=80',
  },
  {
    title: 'HONOR Magic 9 series lộ diện với camera hợp tác Leica',
    image:
      'https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?auto=format&fit=crop&w=140&h=100&q=80',
  },
  {
    title: 'Galaxy Z Fold8 và Z Flip8 xuất hiện trên BIS, hé lộ thông số',
    image:
      'https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=140&h=100&q=80',
  },
];

export default function Home() {
  return (
    <div className="tp-home-page">
      <section className="tp-home-hero">
        <div className="container tp-home-hero-container">
          <div className="tp-home-hero-grid tp-home-hero-grid-main">
            <div className="tp-home-hero-main tp-home-hero-main-full">
              <HeroCarousel />
            </div>
          </div>

        </div>
      </section>

      <section className="container tp-mobile-search-panel">
        <Link to="/products?search=khuyen%20mai" className="tp-mobile-search-banner">
          <img
            src="https://images.unsplash.com/photo-1607861716497-e65ab29fc7ac?auto=format&fit=crop&w=700&h=120&q=80"
            alt="Triệu lời cảm ơn"
          />
        </Link>
        <h3>Xu hướng tìm kiếm</h3>
        <div className="tp-mobile-trends">
          {MOBILE_TRENDS.map((item) => (
            <Link key={item} to={`/products?search=${encodeURIComponent(item)}`}>
              {item}
            </Link>
          ))}
        </div>
        <div className="tp-mobile-news-head">
          <h4>Gợi ý cho bạn</h4>
          <Link to="/products?search=goi%20y">Gợi ý khác</Link>
        </div>
        <div className="tp-mobile-news-grid">
          {MOBILE_NEWS.map((item) => (
            <Link key={item.title} to={`/products?search=${encodeURIComponent(item.title.slice(0, 24))}`}>
              <img src={item.image} alt={item.title} />
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container tp-highlight-section">
        <h2>Danh mục nổi bật</h2>
        <div className="tp-highlight-grid">
          {HIGHLIGHT_CATEGORIES.map(({ label, href, image, badge }) => (
            <Link key={label} to={href} className="tp-highlight-item">
              <div className="tp-highlight-thumb-wrap">
                <img src={image} alt={label} className="tp-highlight-thumb" loading="lazy" />
                {badge && <em>1 đổi 1</em>}
              </div>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container tp-home-deal-section">
        <div className="tp-home-deal-heading">
          <h2>Vạn deal hàng hiệu, triệu lời cảm ơn</h2>
          <Link to="/products?search=deal">
            Xem gợi ý khác <ArrowRight size={14} />
          </Link>
        </div>

        <div className="tp-home-deal-grid">
          <Link to="/products?search=deal%20hang%20hieu" className="tp-deal-hero-card">
            <img src={DEAL_HERO_IMAGE} alt="Vạn deal hàng hiệu" loading="lazy" />
          </Link>

          {DEAL_GROUPS.map((group) => (
            <article key={group.title} className="tp-deal-column">
              <h4>{group.title}</h4>
              <div>
                {group.items.map((item) => (
                  <Link to={`/products?search=${encodeURIComponent(item.name)}`} key={item.name} className="tp-deal-item">
                    <img src={item.image} alt={`${item.name}.png`} loading="lazy" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
