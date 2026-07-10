import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../config/api';
import { useAnalytics } from './AnalyticsContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { track } = useAnalytics();
  const [cartItems, setCartItems] = useState(() => {
    try {
      const stored = localStorage.getItem('techphone-cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [toastMessage, setToastMessage] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const syncCartToServer = async (nextItems) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const payload = await apiFetch('/api/cart', {
        method: 'PUT',
        body: JSON.stringify({
          items: nextItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const normalizedItems = (payload.items || [])
        .filter((item) => item.product)
        .map((item) => ({
          id: item.product.legacyId || item.product._id,
          _id: item.product._id,
          legacyId: item.product.legacyId,
          name: item.product.name,
          price: item.product.price,
          oldPrice: item.product.oldPrice,
          image: item.product.image,
          category: item.product.category?.key || 'phu-kien',
          quantity: item.quantity,
        }));

      setCartItems(normalizedItems);
      return normalizedItems;
    } catch (error) {
      setSyncError(error.message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('techphone-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    let isMounted = true;

    const loadCart = async () => {
      try {
        const payload = await apiFetch('/api/cart');
        if (!isMounted) return;
        const normalizedItems = (payload.items || [])
          .filter((item) => item.product)
          .map((item) => ({
            id: item.product.legacyId || item.product._id,
            _id: item.product._id,
            legacyId: item.product.legacyId,
            name: item.product.name,
            price: item.product.price,
            oldPrice: item.product.oldPrice,
            image: item.product.image,
            category: item.product.category?.key || 'phu-kien',
            quantity: item.quantity,
          }));

        if (normalizedItems.length > 0) {
          setCartItems(normalizedItems);
          return;
        }

        const localItems = (() => {
          try {
            const stored = localStorage.getItem('techphone-cart');
            return stored ? JSON.parse(stored) : [];
          } catch {
            return [];
          }
        })();

        if (localItems.length > 0) {
          await syncCartToServer(localItems);
        }
      } catch (error) {
        setSyncError(error.message);
      }
    };

    loadCart();
    return () => {
      isMounted = false;
    };
  }, []);

  const addToCart = (product) => {
    setCartItems((prev) => {
      const incomingId = product.id || product.legacyId || product._id;
      const existingItem = prev.find((item) => item.id === incomingId);
      let nextItems;
      if (existingItem) {
        nextItems = prev.map((item) =>
          item.id === incomingId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      } else {
        nextItems = [
          ...prev,
          {
            id: incomingId,
            _id: product._id,
            name: product.name,
            price: product.price,
            oldPrice: product.oldPrice,
            image: product.image,
            category: product.category?.key || product.category,
            quantity: 1,
          },
        ];
      }
      syncCartToServer(nextItems).catch(() => {});
      return nextItems;
    });

    setToastMessage(`Thêm "${product.name}" vào giỏ thành công!`);
    track('add_to_cart', {
      productId: product._id || null,
      metadata: {
        productName: product.name,
        price: product.price,
      },
    });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => {
      const nextItems = prev.filter((item) => item.id !== productId);
      syncCartToServer(nextItems).catch(() => {});
      return nextItems;
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prev) => {
      const nextItems = prev.map((item) => (item.id === productId ? { ...item, quantity } : item));
      syncCartToServer(nextItems).catch(() => {});
      return nextItems;
    });
  };

  const clearCart = () => {
    setCartItems((prev) => {
      if (prev.length > 0) {
        syncCartToServer([]).catch(() => {});
      }
      return [];
    });
  };

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems],
  );

  const cartTotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity * item.price, 0),
    [cartItems],
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toastMessage,
        isSyncing,
        syncError,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
