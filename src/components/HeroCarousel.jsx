import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import './HeroCarousel.css';

const BANNERS = [
  {
    href: 'https://fptshop.com.vn/ctkm/sang-mua-chieu-mat',
    bg: 'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(90)/desk_header_bg_0b008ca699.png',
    image: 'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(90)/desk_header_dfc8e31223.png',
    alt: 'Sáng mua chiều mát',
  },
  {
    href: 'https://fptshop.com.vn/ctkm/kho-vang-uu-dai',
    bg: 'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(90)/desk_header_bg_0039c11813.png',
    image: 'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(90)/desk_header_820a26ebf4.png',
    alt: 'Kho vàng ưu đãi',
  },
  {
    href: 'https://fptshop.com.vn/phu-kien/loa',
    bg: 'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(90)/desk_header_bg_7249c246fa.png',
    image: 'https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(90)/desk_header_21eb59acfe.png',
    alt: 'Phụ kiện loa',
  },
];

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    
    // Auto slide every 4 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [isHovered]);

  const nextSlide = (e) => {
    e?.preventDefault();
    setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
  };

  const prevSlide = (e) => {
    e?.preventDefault();
    setCurrentIndex((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
  };

  const goToSlide = (index, e) => {
    e?.preventDefault();
    setCurrentIndex(index);
  };

  return (
    <div
      className="tp-hero-carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {BANNERS.map((banner, index) => (
        <a
          key={banner.image}
          href={banner.href}
          target="_blank"
          rel="noreferrer"
          className={`tp-hero-slide ${index === currentIndex ? 'tp-hero-slide-active' : ''}`}
        >
          <img className="tp-hero-slide-bg" src={banner.bg} alt="" aria-hidden="true" fetchPriority="high" />
          <div className="tp-hero-slide-inner">
            <img className="tp-hero-slide-main" src={banner.image} alt={banner.alt} fetchPriority="high" />
          </div>
        </a>
      ))}

      <button
        onClick={prevSlide}
        className="tp-hero-arrow tp-hero-arrow-prev"
        aria-label="Previous slide"
      >
        <ArrowRight size={20} />
      </button>
      <button
        onClick={nextSlide}
        className="tp-hero-arrow tp-hero-arrow-next"
        aria-label="Next slide"
      >
        <ArrowRight size={20} />
      </button>

      <div className="tp-hero-dots">
        {BANNERS.map((_, index) => (
          <button
            key={index}
            onClick={(e) => goToSlide(index, e)}
            className={index === currentIndex ? 'tp-dot tp-dot-active' : 'tp-dot'}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
