import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ExternalLink,
  LayoutDashboard,
  MessageCircle,
  Package,
  Search,
  ShoppingBag,
  Users,
  Warehouse,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSupportChat } from '../context/SupportChatContext';
import { useI18n } from '../context/I18nContext';
import './AdminLayout.css';

function navClass({ isActive }) {
  return isActive ? 'admin-nav-link admin-nav-link-active' : 'admin-nav-link';
}

function getInitials(name) {
  const parts = String(name || 'A').trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return String(name || 'A').slice(0, 2).toUpperCase();
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
        <Link to="/admin/analytics" className="admin-brand">
          <span className="admin-brand-icon">T</span>
          <span>{t('admin.brand')}</span>
        </Link>

        <p className="admin-nav-section">Menu chính</p>
        <nav className="admin-nav">
          <NavLink to="/admin/analytics" className={navClass}>
            <LayoutDashboard size={20} />
            <span className="admin-nav-label">Thống kê</span>
          </NavLink>
          <NavLink to="/admin/orders" className={navClass}>
            <ShoppingBag size={20} />
            <span className="admin-nav-label">{t('admin.orders')}</span>
          </NavLink>
          <NavLink to="/admin/products" className={navClass}>
            <Package size={20} />
            <span className="admin-nav-label">{t('admin.products')}</span>
          </NavLink>
          <NavLink to="/admin/users" className={navClass}>
            <Users size={20} />
            <span className="admin-nav-label">{t('admin.customers')}</span>
          </NavLink>
          <NavLink to="/admin/support" className={navClass}>
            <MessageCircle size={20} />
            <span className="admin-nav-label">Hỗ trợ</span>
            {adminUnreadTotal > 0 && (
              <span className="admin-nav-badge">{adminUnreadTotal > 9 ? '9+' : adminUnreadTotal}</span>
            )}
          </NavLink>
        </nav>

        <p className="admin-nav-section">Vận hành</p>
        <nav className="admin-nav">
          <NavLink to="/admin/inventory" className={navClass}>
            <Warehouse size={20} />
            <span className="admin-nav-label">{t('admin.inventory')}</span>
          </NavLink>
          <NavLink to="/admin/flash-sales" className={navClass}>
            <Zap size={20} />
            <span className="admin-nav-label">{t('admin.flashSales')}</span>
          </NavLink>
          <NavLink to="/admin/program" className={navClass}>
            <CalendarDays size={20} />
            <span className="admin-nav-label">{t('admin.program')}</span>
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <Link to="/">
            <ExternalLink size={16} />
            Về cửa hàng
          </Link>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-search">
            <Search size={18} />
            <input type="search" placeholder="Tìm kiếm..." aria-label="Tìm kiếm" />
          </div>
          <div className="admin-topbar-right">
            <div className="admin-topbar-user">
              <span className="admin-topbar-avatar">{getInitials(user?.name)}</span>
              <div className="admin-topbar-user-info">
                <strong>{user?.name || 'Admin'}</strong>
                <p>{user?.email}</p>
              </div>
            </div>
            <button type="button" className="btn btn-outline" onClick={handleLogout}>
              {t('admin.logout')}
            </button>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
