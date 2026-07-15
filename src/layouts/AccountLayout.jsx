import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, UserRound, Shield, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AccountLayout.css';

function navClass({ isActive }) {
  return isActive ? 'account-nav-link account-nav-link-active' : 'account-nav-link';
}

const NAV_ITEMS = [
  { to: '/account', end: true, label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/account/orders', label: 'Đơn hàng của tôi', icon: Package },
  { to: '/account/profile', label: 'Thông tin cá nhân', icon: UserRound },
  { to: '/account/security', label: 'Bảo mật', icon: Shield },
];

export default function AccountLayout() {
  const { user } = useAuth();

  return (
    <div className="account-shell container">
      <aside className="account-sidebar card">
        <div className="account-user-card">
          <div className="account-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user?.name || 'Avatar'} className="account-avatar-img" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || 'K'
            )}
          </div>
          <div>
            <strong>{user?.name}</strong>
            <p>{user?.email}</p>
          </div>
        </div>
        <nav className="account-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
          <NavLink to="/" className="account-nav-link account-nav-home">
            <Home size={16} />
            Về trang chủ
          </NavLink>
        </nav>
      </aside>
      <main className="account-main">
        <Outlet />
      </main>
    </div>
  );
}
