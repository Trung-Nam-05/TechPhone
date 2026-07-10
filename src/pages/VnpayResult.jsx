import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import OrderSuccessResult from '../components/OrderSuccessResult';

/**
 * Landing page after VNPAY redirects back to the storefront (via API redirect).
 */
export default function VnpayResult() {
  const [params] = useSearchParams();
  const { authFetch, isAuthenticated } = useAuth();
  const success = params.get('success') === '1';
  const orderId = params.get('orderId') || '';
  const message = params.get('message') || '';
  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!orderId) return undefined;
    let isMounted = true;

    const load = async () => {
      try {
        const payload = isAuthenticated
          ? await authFetch(`/api/orders/${encodeURIComponent(orderId)}`)
          : await apiFetch(`/api/orders/${encodeURIComponent(orderId)}`);
        if (isMounted) setOrder(payload);
      } catch (error) {
        if (isMounted) setLoadError(error.message);
      }
    };

    load();
    if (success) {
      const timer = setInterval(load, 3000);
      const stop = setTimeout(() => clearInterval(timer), 15000);
      return () => {
        isMounted = false;
        clearInterval(timer);
        clearTimeout(stop);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [orderId, authFetch, isAuthenticated, success]);

  return (
    <OrderSuccessResult
      success={success}
      orderId={orderId}
      order={order}
      loadError={loadError}
      message={message}
    />
  );
}
