import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminProducts from './pages/AdminProducts';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import StoreLayout from './layouts/StoreLayout';
import PolicyPage from './pages/PolicyPage';
import SupportPage from './pages/SupportPage';
import CustomerSegments from './pages/CustomerSegments';
import ExecutionProgram from './pages/ExecutionProgram';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminOrders from './pages/AdminOrders';
import AdminInventory from './pages/AdminInventory';
import AdminPrices from './pages/AdminPrices';
import AdminFlashSales from './pages/AdminFlashSales';
import AdminReviews from './pages/AdminReviews';
import AdminCategories from './pages/AdminCategories';
import AdminCoupons from './pages/AdminCoupons';
import AdminMarketing from './pages/AdminMarketing';
import Installment from './pages/Installment';
import Coupon from './pages/Coupon';
import AccountLayout from './layouts/AccountLayout';
import AccountDashboard from './pages/AccountDashboard';
import AccountProfile from './pages/AccountProfile';
import AccountOrders from './pages/AccountOrders';
import AccountSecurity from './pages/AccountSecurity';
import OrderDetail from './pages/OrderDetail';
import AdminUsers from './pages/AdminUsers';
import AdminSupport from './pages/AdminSupport';
import VnpayResult from './pages/VnpayResult';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailVerified from './pages/EmailVerified';

function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={(
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="prices" element={<AdminPrices />} />
        <Route path="flash-sales" element={<AdminFlashSales />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="marketing" element={<AdminMarketing />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      <Route
        path="/account"
        element={(
          <ProtectedRoute>
            <StoreLayout />
          </ProtectedRoute>
        )}
      >
        <Route element={<AccountLayout />}>
          <Route index element={<AccountDashboard />} />
          <Route path="profile" element={<AccountProfile />} />
          <Route path="orders" element={<AccountOrders />} />
          <Route path="orders/:orderId" element={<OrderDetail />} />
          <Route path="security" element={<AccountSecurity />} />
        </Route>
      </Route>

      <Route path="/" element={<StoreLayout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="product/:id" element={<ProductDetail />} />
        <Route path=":categoryKey/:productSlug" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="checkout/vnpay-result" element={<VnpayResult />} />
        <Route path="installment" element={<Installment />} />
        <Route path="coupon" element={<Coupon />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="email-verified" element={<EmailVerified />} />
        <Route path="segments" element={<CustomerSegments />} />
        <Route path="program" element={<ExecutionProgram />} />
        <Route path="policies/:slug" element={<PolicyPage />} />
        <Route path="support/:slug" element={<SupportPage />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}

export default App;
