import './Footer.css';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';

const ABOUT_LINK_KEYS = [
  { k: 'intro', href: '/support/tro-giup' },
  { k: 'rules', href: '/policies/bao-mat' },
  { k: 'enterprise', href: '/segments' },
  { k: 'promos', href: '/products?search=khuyen%20mai' },
  { k: 'genuinePhones', href: '/products?category=dien-thoai' },
  { k: 'tradeIn', href: '/support/tro-giup' },
  { k: 'onlineGuide', href: '/support/tro-giup' },
];

const POLICY_LINK_KEYS = [
  { k: 'warranty', href: '/policies/bao-hanh' },
  { k: 'returns', href: '/policies/doi-tra' },
  { k: 'privacy', href: '/policies/bao-mat' },
  { k: 'installment', href: '/policies/tra-gop' },
  { k: 'unboxing', href: '/support/tro-giup' },
  { k: 'delivery', href: '/policies/giao-hang' },
  { k: 'techRegs', href: '/support/tro-giup' },
];

const PAYMENT_BADGES = ['VISA', 'Master', 'JCB', 'ATM', 'Payoo', 'Momo', 'VNPay', 'Apple Pay'];

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="tp-footer">
      <div className="container">
        <div className="tp-footer-top">
          <div>
            <h3>{t('footer.nationwideTitle')}</h3>
            <p>{t('footer.nationwideDesc')}</p>
          </div>
          <Link to="/support/he-thong-cua-hang" className="btn btn-primary">
            {t('footer.storeList')}
          </Link>
        </div>

        <div className="tp-footer-grid">
          <section>
            <h4>{t('footer.downloadApp')}</h4>
            <div className="tp-footer-apps">
              <div className="tp-footer-qr">QR</div>
              <div className="tp-footer-store-list">
                <Link to="/support/tro-giup">{t('footer.appStore')}</Link>
                <Link to="/support/tro-giup">{t('footer.googlePlay')}</Link>
              </div>
            </div>
            <h5>{t('footer.connect')}</h5>
            <div className="tp-footer-social">
              <a href="https://facebook.com" target="_blank" rel="noreferrer">
                f
              </a>
              <a href="https://zalo.me" target="_blank" rel="noreferrer">
                z
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer">
                yt
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noreferrer">
                tt
              </a>
            </div>
            <h5>{t('footer.hotline')}</h5>
            <ul className="tp-footer-hotline">
              <li>
                {t('footer.salesConsult')} <a href="tel:18006601">1800.6601</a>
              </li>
              <li>
                {t('footer.techSupport')} <a href="tel:18006601">1800.6601</a>
              </li>
            </ul>
          </section>

          <section>
            <h4>{t('footer.about')}</h4>
            <ul>
              {ABOUT_LINK_KEYS.map((item) => (
                <li key={item.k}>
                  <Link to={item.href}>{t(`footer.aboutLinks.${item.k}`)}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4>{t('footer.policies')}</h4>
            <ul>
              {POLICY_LINK_KEYS.map((item) => (
                <li key={item.k}>
                  <Link to={item.href}>{t(`footer.policyLinks.${item.k}`)}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4>{t('footer.paymentMethodsTitle')}</h4>
            <div className="tp-footer-payment">
              {PAYMENT_BADGES.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            <h4 className="tp-footer-cert-title">{t('footer.certificationTitle')}</h4>
            <div className="tp-footer-cert">
              <span>{t('footer.certGovernment')}</span>
              <span>{t('footer.certDmca')}</span>
              <span>{t('footer.certIso')}</span>
            </div>
          </section>
        </div>
      </div>
    </footer>
  );
}
