import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSupportChat } from '../context/SupportChatContext';
import { useI18n } from '../context/I18nContext';
import './AdminLayout.css';

function navClass({ isActive }) {
  return isActive ? 'admin-nav-link admin-nav-link-active' : 'admin-nav-link';
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { adminUnreadTotal } = useSupportChat();
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-brand">
          {t('admin.brand')}
        </Link>
        <nav className="admin-nav">
          <NavLink to="/admin/users" className={navClass}>
            {t('admin.customers')}
          </NavLink>
          <NavLink to="/admin/products" className={navClass}>
            {t('admin.products')}
          </NavLink>
          <NavLink to="/admin/orders" className={navClass}>
            {t('admin.orders')}
          </NavLink>
          <NavLink to="/admin/support" className={navClass}>
            Hỗ trợ
            {adminUnreadTotal > 0 && (
              <span className="admin-nav-badge">{adminUnreadTotal > 9 ? '9+' : adminUnreadTotal}</span>
            )}
          </NavLink>
          <NavLink to="/admin/inventory" className={navClass}>
            {t('admin.inventory')}
          </NavLink>
          <NavLink to="/admin/flash-sales" className={navClass}>
            {t('admin.flashSales')}
          </NavLink>
          <NavLink to="/admin/analytics" className={navClass}>
            {t('admin.analytics')}
          </NavLink>
          <NavLink to="/admin/program" className={navClass}>
            {t('admin.program')}
          </NavLink>
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <strong>{user?.name || 'Admin'}</strong>
            <p>{user?.email}</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={handleLogout}>
            {t('admin.logout')}
          </button>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
