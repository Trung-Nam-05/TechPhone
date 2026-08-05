import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { apiFetch } from '../config/api';
import OrderSuccessResult from '../components/OrderSuccessResult';

/**
 * Landing page after VNPAY redirects back to the storefront (via API redirect).
 */
export default function VnpayResult() {
  const [params] = useSearchParams();
  const { authFetch, isAuthenticated } = useAuth();
  const { clearCart, reloadCartFromServer } = useCart();
  const success = params.get('success') === '1';
  const orderId = params.get('orderId') || '';
  const message = params.get('message') || '';
  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const cartClearedRef = useRef(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return null;
    const payload = isAuthenticated
      ? await authFetch(`/api/orders/${encodeURIComponent(orderId)}`)
      : await apiFetch(`/api/orders/${encodeURIComponent(orderId)}`);
    setOrder(payload);
    return payload;
  }, [authFetch, isAuthenticated, orderId]);

  useEffect(() => {
    if (!orderId) return undefined;
    let isMounted = true;

    const load = async () => {
      try {
        const payload = await fetchOrder();
        if (!isMounted) return;
        if (success && payload?.paymentStatus === 'paid' && !cartClearedRef.current) {
          cartClearedRef.current = true;
          clearCart();
        }
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
  }, [orderId, success, fetchOrder, clearCart]);

  const retryVnpay = async () => {
    setActionError(null);
    const request = { method: 'POST' };
    const payload = isAuthenticated
      ? await authFetch(`/api/orders/${encodeURIComponent(orderId)}/vnpay/retry-payment`, request)
      : await apiFetch(`/api/orders/${encodeURIComponent(orderId)}/vnpay/retry-payment`, request);
    if (payload?.paymentUrl) {
      window.location.assign(payload.paymentUrl);
      return;
    }
    throw new Error('Không tạo được liên kết thanh toán VNPAY.');
  };

  const cancelAndRestore = async () => {
    if (!window.confirm('Hủy đơn và đưa sản phẩm trở lại giỏ hàng?')) return;
    setActionError(null);
    const request = { method: 'POST' };
    if (isAuthenticated) {
      await authFetch(`/api/orders/${encodeURIComponent(orderId)}/cancel-immediate`, request);
    } else {
      await apiFetch(`/api/orders/${encodeURIComponent(orderId)}/cancel-immediate`, request);
    }
    await reloadCartFromServer();
    window.location.assign('/cart');
  };

  return (
    <OrderSuccessResult
      success={success}
      orderId={orderId}
      order={order}
      loadError={loadError}
      message={message}
      onRetryVnpay={orderId ? retryVnpay : undefined}
      onCancelVnpay={orderId ? cancelAndRestore : undefined}
      actionError={actionError}
    />
  );
}
