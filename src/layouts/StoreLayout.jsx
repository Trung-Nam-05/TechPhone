import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import ChatWidget from '../components/ChatWidget';
import { useAuth } from '../context/AuthContext';

export default function StoreLayout() {
  const { isAdmin } = useAuth();

  return (
    <>
      <Header />
      <main style={{ minHeight: '80vh' }}>
        <Outlet />
      </main>
      <Footer />
      <Toast />
      {!isAdmin && <ChatWidget />}
    </>
  );
}
