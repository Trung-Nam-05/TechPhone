import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../ProductCard';
import ProductSearchInput from '../ProductSearchInput';

const HERO_BANNERS = [
  {
    desktop:
      'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/C3_1240x428_chuyen_trang_dien_may_4a8495cb44.png',
    href: '/products?category=dien-may&search=máy+giặt',
  },
  {
    desktop:
      'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/C3_2eee8050f4.png',
    href: '/products?category=dien-may',
  },
  {
    desktop:
      'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/C3_1240x428_chuyen_trang_dien_may_2beadc4779.png',
    href: '/products?category=dien-may&search=tủ+lạnh',
  },
];

const SUBCATEGORIES = [
  {
    key: 'tivi',
    label: 'Tivi',
    image: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/tivi_78fd29f323.png',
    match: ['tivi', 'tv', 'smart tv'],
    tall: false,
  },
  {
    key: 'tu-lanh',
    label: 'Tủ lạnh',
    image:
      'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/small/tu_lanh_47d42af9b1.png',
    match: ['tủ lạnh', 'tu lanh', 'refrigerator'],
    tall: false,
  },
  {
    key: 'may-giat',
    label: 'Máy giặt',
    image: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/may_giat_e7542aeeb3.png',
    match: ['máy giặt', 'may giat', 'washer'],
    tall: false,
  },
  {
    key: 'may-say',
    label: 'Máy sấy',
    image: 'https://cdn2.fptshop.com.vn/unsafe/180x0/filters:format(webp):quality(75)/may_say_22dd30b83a.png',
    match: ['máy sấy', 'may say', 'dryer'],
    tall: false,
  },
  {
    key: 'dieu-hoa',
    label: 'Điều hòa',
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/small/may_lanh_ad618372de.png',
    match: ['máy lạnh', 'may lanh', 'điều hòa', 'dieu hoa', 'air'],
    category: 'may-lanh',
    tall: true,
  },
  {
    key: 'robot',
    label: 'Robot hút bụi',
    image:
      'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/img_3_d35afe4dac.png',
    match: ['robot', 'hút bụi', 'hut bui'],
    tall: true,
  },
  {
    key: 'tu-dong',
    label: 'Tủ đông',
    image:
      'https://cdn2.fptshop.com.vn/unsafe/360x0/filters:format(webp):quality(75)/tu_dong_cate_thumb_83c5d57343.png',
    match: ['tủ đông', 'tu dong', 'freezer'],
    tall: true,
  },
];

const NEED_GROUPS = [
  {
    title: 'Nhà thông minh',
    items: [
      {
        label: 'Máy lọc không khí',
        image: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/img_1_ae7c7035fd.png',
        match: ['lọc không khí', 'loc khong khi'],
      },
      {
        label: 'Camera giám sát',
        image: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/img_732cd83700.png',
        match: ['camera'],
      },
      {
        label: 'Robot hút bụi',
        image: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/img_3_d35afe4dac.png',
        match: ['robot'],
      },
      {
        label: 'Tivi thông minh',
        image: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/img_2_ec668a504c.png',
        match: ['tivi', 'tv'],
      },
    ],
  },
  {
    title: 'Nhà nhỏ sắm đồ gọn',
    items: [
      {
        label: 'Tủ lạnh 2 cửa',
        image: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/img_4_6863cee768.png',
        match: ['tủ lạnh'],
      },
      {
        label: 'Máy giặt <10kg',
        image:
          'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/Frame_2120413889_4081241173.png',
        match: ['máy giặt'],
      },
      {
        label: 'TV phòng nhỏ',
        image: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/img_2_5ce19a8374.png',
        match: ['tivi', 'tv'],
      },
      {
        label: 'Điều hòa 1HP',
        image:
          'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/img_c7fd7749b8.png',
        match: ['máy lạnh', '1 hp', '1hp'],
        category: 'may-lanh',
      },
    ],
  },
  {
    title: 'Thiết bị lớn cho nhà to',
    items: [
      {
        label: 'Tủ lạnh nhiều cửa',
        image:
          'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/img_9_16b3b4102d.png',
        match: ['tủ lạnh', 'multi'],
      },
      {
        label: 'Điều hòa 1.5 - 2HP',
        image:
          'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/img_7_d0773a67ba.png',
        match: ['máy lạnh', '1.5', '2 hp'],
        category: 'may-lanh',
      },
      {
        label: 'TV phòng lớn',
        image: 'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/img_8_f85c292a0f.png',
        match: ['tivi', 'tv'],
      },
      {
        label: 'Máy giặt >10kg',
        image:
          'https://cdn2.fptshop.com.vn/unsafe/256x0/filters:format(webp):quality(75)/small/Frame_2120413889_1_6b4ed39cf9.png',
        match: ['máy giặt'],
      },
    ],
  },
];

const PROMO_BANNERS = [
  {
    title: 'Bộ đôi giặt sạch sấy khô',
    image: 'https://cdn2.fptshop.com.vn/unsafe/1240x0/filters:format(webp):quality(75)/610x504_d1d85bd52a.png',
    match: ['máy giặt', 'máy sấy'],
  },
  {
    title: 'Bộ đôi lưu trữ thực phẩm',
    image: 'https://cdn2.fptshop.com.vn/unsafe/1240x0/filters:format(webp):quality(75)/610x504_1_03b3444b3e.png',
    match: ['tủ lạnh', 'tủ đông'],
  },
];

const SIDE_PROMO =
  'https://cdn2.fptshop.com.vn/unsafe/828x0/filters:format(webp):quality(75)/400x454_624c8446a1.png';

const POLICIES = [
  {
    title: 'Thương hiệu đảm bảo',
    desc: 'Nhập khẩu, bảo hành chính hãng',
    icon: 'https://cdn2.fptshop.com.vn/estore-v2/img/icons/policy3.svg',
  },
  {
    title: 'Đổi trả dễ dàng',
    desc: 'Theo chính sách đổi trả tại TechPhone',
    icon: 'https://cdn2.fptshop.com.vn/estore-v2/img/icons/policy4.svg',
  },
  {
    title: 'Giao hàng tận nơi',
    desc: 'Trên toàn quốc',
    icon: 'https://cdn2.fptshop.com.vn/estore-v2/img/icons/policy1.svg',
  },
  {
    title: 'Sản phẩm chất lượng',
    desc: 'Đảm bảo tương thích và độ bền cao',
    icon: 'https://cdn2.fptshop.com.vn/estore-v2/img/icons/policy2.svg',
  },
];

function matchesKeywords(product, keywords = []) {
  const name = String(product.name || '').toLowerCase();
  return keywords.some((keyword) => name.includes(String(keyword).toLowerCase()));
}

function ProductRail({ title, products, nowMs, emptyText }) {
  return (
    <section className="tp-appliance-section">
      <div className="tp-appliance-section-head">
        <h2>{title}</h2>
        <span>{products.length} sản phẩm</span>
      </div>
      {products.length === 0 ? (
        <p className="tp-appliance-empty">{emptyText || 'Chưa có sản phẩm phù hợp.'}</p>
      ) : (
        <div className="tp-appliance-product-rail">
          {products.map((product) => (
            <div key={product.id || product.legacyId || product._id} className="tp-appliance-product-item">
              <ProductCard product={product} nowMs={nowMs} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ApplianceCategoryPage({
  categoryKey = 'dien-may',
  title = 'Điện máy',
  products = [],
  allApplianceProducts = [],
  nowMs = 0,
  queryInput = '',
  onQueryChange,
  onSearchSubmit,
  onNavigateCategory,
}) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeSub, setActiveSub] = useState('all');
  const catalog = allApplianceProducts.length > 0 ? allApplianceProducts : products;

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const filteredBySub = useMemo(() => {
    if (activeSub === 'all') return products;
    const sub = SUBCATEGORIES.find((item) => item.key === activeSub);
    if (!sub) return products;
    return products.filter((product) => matchesKeywords(product, sub.match));
  }, [activeSub, products]);

  const topSellers = useMemo(() => {
    return [...catalog]
      .sort((a, b) => (b.discount || 0) - (a.discount || 0) || a.price - b.price)
      .slice(0, 10);
  }, [catalog]);

  const washDryProducts = useMemo(
    () => catalog.filter((product) => matchesKeywords(product, ['máy giặt', 'máy sấy', 'washer', 'dryer'])).slice(0, 10),
    [catalog],
  );

  const fridgeProducts = useMemo(
    () => catalog.filter((product) => matchesKeywords(product, ['tủ lạnh', 'tủ đông', 'fridge'])).slice(0, 10),
    [catalog],
  );

  const acProducts = useMemo(
    () =>
      catalog
        .filter(
          (product) =>
            product.category === 'may-lanh' || matchesKeywords(product, ['máy lạnh', 'điều hòa', 'inverter']),
        )
        .slice(0, 10),
    [catalog],
  );

  const handleSubClick = (sub) => {
    if (sub.category && sub.category !== categoryKey) {
      onNavigateCategory?.(sub.category);
      return;
    }
    setActiveSub((prev) => (prev === sub.key ? 'all' : sub.key));
    const el = document.getElementById('tp-appliance-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNeedClick = (item) => {
    if (item.category && item.category !== categoryKey) {
      onNavigateCategory?.(item.category);
      return;
    }
    const matched = SUBCATEGORIES.find((sub) =>
      (item.match || []).some((keyword) => (sub.match || []).includes(keyword)),
    );
    setActiveSub(matched?.key || 'all');
    const el = document.getElementById('tp-appliance-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="tp-appliance-page">
      <nav className="tp-appliance-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <span aria-current="page">{title}</span>
      </nav>

      <section className="tp-appliance-hero">
        <button
          type="button"
          className="tp-appliance-hero-arrow left"
          aria-label="Previous slide"
          onClick={() => setHeroIndex((prev) => (prev - 1 + HERO_BANNERS.length) % HERO_BANNERS.length)}
        >
          <ChevronLeft size={22} />
        </button>
        <Link to={HERO_BANNERS[heroIndex].href} className="tp-appliance-hero-slide">
          <img src={HERO_BANNERS[heroIndex].desktop} alt={`${title} banner`} />
        </Link>
        <button
          type="button"
          className="tp-appliance-hero-arrow right"
          aria-label="Next slide"
          onClick={() => setHeroIndex((prev) => (prev + 1) % HERO_BANNERS.length)}
        >
          <ChevronRight size={22} />
        </button>
        <ul className="tp-appliance-hero-dots">
          {HERO_BANNERS.map((banner, index) => (
            <li key={banner.desktop}>
              <button
                type="button"
                className={index === heroIndex ? 'active' : ''}
                aria-label={`Slide ${index + 1}`}
                onClick={() => setHeroIndex(index)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="tp-appliance-subcats">
        {SUBCATEGORIES.map((sub) => (
          <button
            key={sub.key}
            type="button"
            className={`tp-appliance-subcat ${sub.tall ? 'tall' : ''} ${activeSub === sub.key ? 'active' : ''}`}
            onClick={() => handleSubClick(sub)}
          >
            <span>{sub.label}</span>
            <img src={sub.image} alt={sub.label} />
          </button>
        ))}
      </section>

      <section className="tp-appliance-needs">
        <div className="tp-appliance-section-head">
          <h2>Lựa chọn phù hợp với mọi nhu cầu</h2>
        </div>
        <div className="tp-appliance-needs-layout">
          <a className="tp-appliance-needs-promo" href="#tp-appliance-catalog">
            <img src={SIDE_PROMO} alt="Ưu đãi điện máy" />
          </a>
          <div className="tp-appliance-needs-groups">
            {NEED_GROUPS.map((group) => (
              <div key={group.title} className="tp-appliance-need-card">
                <p>{group.title}</p>
                <div className="tp-appliance-need-grid">
                  {group.items.map((item) => (
                    <button key={item.label} type="button" onClick={() => handleNeedClick(item)}>
                      <img src={item.image} alt={item.label} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProductRail title="Top điện máy bán chạy" products={topSellers} nowMs={nowMs} />

      <section className="tp-appliance-promo-row">
        <div className="tp-appliance-section-head">
          <h2>Nhà gọn gàng, việc nhà nhẹ tênh</h2>
        </div>
        <div className="tp-appliance-promo-grid">
          {PROMO_BANNERS.map((banner) => (
            <button
              key={banner.title}
              type="button"
              className="tp-appliance-promo-banner"
              onClick={() => {
                setActiveSub('all');
                document.getElementById('tp-appliance-catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <img src={banner.image} alt={banner.title} />
            </button>
          ))}
        </div>
      </section>

      <ProductRail title="Bộ đôi giặt sạch sấy khô" products={washDryProducts} nowMs={nowMs} />
      <ProductRail title="Bộ đôi lưu trữ thực phẩm" products={fridgeProducts} nowMs={nowMs} />
      <ProductRail title="Máy lạnh Inverter tích hợp lọc bụi mịn" products={acProducts} nowMs={nowMs} />

      <section id="tp-appliance-catalog" className="tp-appliance-catalog">
        <div className="tp-appliance-catalog-toolbar">
          <div>
            <h2>{activeSub === 'all' ? `Tất cả ${title.toLowerCase()}` : SUBCATEGORIES.find((s) => s.key === activeSub)?.label}</h2>
            <p>{filteredBySub.length} sản phẩm</p>
          </div>
          <div className="tp-appliance-catalog-actions">
            {activeSub !== 'all' && (
              <button type="button" className="tp-appliance-clear" onClick={() => setActiveSub('all')}>
                Xóa bộ lọc
              </button>
            )}
            <ProductSearchInput
              value={queryInput}
              onChange={onQueryChange}
              onSubmit={onSearchSubmit}
              placeholder="Tìm điện máy..."
              className="tp-products-search-wrap"
              inputClassName="tp-products-search"
            />
          </div>
        </div>
        <div className="tp-appliance-catalog-grid">
          {filteredBySub.map((product) => (
            <ProductCard key={product.id || product.legacyId || product._id} product={product} nowMs={nowMs} />
          ))}
          {filteredBySub.length === 0 && (
            <div className="tp-appliance-empty col-span-full">Không tìm thấy sản phẩm phù hợp.</div>
          )}
        </div>
      </section>

      <section className="tp-appliance-policies">
        {POLICIES.map((policy) => (
          <div key={policy.title} className="tp-appliance-policy">
            <img src={policy.icon} alt={policy.title} />
            <div>
              <p>{policy.title}</p>
              <span>{policy.desc}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
