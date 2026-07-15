import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../config/socket';

const SupportChatContext = createContext(null);

function getConversationId(conversation) {
  return conversation?._id || conversation?.id || null;
}

function getCustomerId(customer) {
  return customer?.customerId || customer?.customer?._id || customer?._id || null;
}

function upsertMessage(prev, message) {
  const msgId = String(message._id);
  const existsIdx = prev.findIndex((item) => String(item._id) === msgId);
  if (existsIdx !== -1) {
    const next = [...prev];
    next[existsIdx] = { ...message, pending: false };
    return next;
  }

  const pendingIdx = prev.findIndex(
    (item) =>
      item.pending &&
      item.body === message.body &&
      item.senderRole === message.senderRole,
  );
  if (pendingIdx !== -1) {
    const next = [...prev];
    next[pendingIdx] = { ...message, pending: false };
    return next;
  }

  return [...prev, message];
}

function sumAdminUnread(customers) {
  return customers.reduce((total, item) => total + (item.unreadByAdmin || 0), 0);
}

function applyInboxConversationUpdate(prev, updated) {
  const customerId = String(updated.customer?._id || updated.customer || '');
  if (!customerId) return prev;
  if (!String(updated.lastMessagePreview || '').trim()) return prev;

  const idx = prev.findIndex((item) => String(getCustomerId(item)) === customerId);
  let next;

  if (idx === -1) {
    next = [
      {
        customerId: updated.customer?._id || customerId,
        customer:
          typeof updated.customer === 'object' && updated.customer !== null
            ? updated.customer
            : { _id: customerId, name: 'Khách hàng', email: '' },
        lastMessageAt: updated.lastMessageAt || new Date().toISOString(),
        lastMessagePreview: updated.lastMessagePreview || '',
        unreadByAdmin: updated.unreadByAdmin ?? 0,
        activeConversationId: updated._id,
        activeStatus: updated.status === 'closed' ? 'closed' : 'open',
        assignedAdmin: updated.assignedAdmin || null,
        conversationCount: 1,
      },
      ...prev,
    ];
  } else {
    next = [...prev];
    const existing = next[idx];
    next[idx] = {
      ...existing,
      customer:
        typeof updated.customer === 'object' && updated.customer?.name
          ? updated.customer
          : existing.customer,
      lastMessageAt: updated.lastMessageAt || existing.lastMessageAt,
      lastMessagePreview: updated.lastMessagePreview || existing.lastMessagePreview,
      unreadByAdmin: updated.unreadByAdmin ?? existing.unreadByAdmin,
      activeConversationId:
        updated.status === 'open' ? updated._id : existing.activeConversationId,
      activeStatus: updated.status === 'open' ? 'open' : existing.activeStatus,
      assignedAdmin: updated.assignedAdmin ?? existing.assignedAdmin,
    };
  }

  return next.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
}

function bumpCustomerFromMessage(prev, message, viewingCustomerId = null) {
  const convId = String(message.conversation);
  const idx = prev.findIndex((item) => String(item.activeConversationId) === convId);
  if (idx === -1) return prev;

  const next = [...prev];
  const existing = next[idx];
  const customerId = String(existing.customerId || getCustomerId(existing));
  const incomingFromCustomer = message.senderRole === 'customer';
  const isViewingThisCustomer =
    viewingCustomerId && customerId === String(viewingCustomerId);

  next[idx] = {
    ...existing,
    lastMessageAt: message.createdAt || new Date().toISOString(),
    lastMessagePreview: String(message.body || '').slice(0, 200),
    unreadByAdmin:
      incomingFromCustomer && !isViewingThisCustomer
        ? (existing.unreadByAdmin || 0) + 1
        : existing.unreadByAdmin,
  };

  const [row] = next.splice(idx, 1);
  return [row, ...next];
}

export function SupportChatProvider({ children }) {
  const { token, isAuthenticated, isAdmin, authFetch } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [supportCustomers, setSupportCustomers] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [adminUnreadTotal, setAdminUnreadTotal] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const activeConversationIdRef = useRef(null);
  const pendingSendRef = useRef(null);
  const conversationsRef = useRef(conversations);
  const supportCustomersRef = useRef(supportCustomers);
  const selectedCustomerIdRef = useRef(selectedCustomerId);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    supportCustomersRef.current = supportCustomers;
  }, [supportCustomers]);

  useEffect(() => {
    selectedCustomerIdRef.current = selectedCustomerId;
  }, [selectedCustomerId]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return supportCustomers.find((item) => String(getCustomerId(item)) === String(selectedCustomerId)) || null;
  }, [supportCustomers, selectedCustomerId]);

  const unreadCount = useMemo(() => {
    if (isAdmin) return adminUnreadTotal;
    return conversation?.unreadByCustomer || 0;
  }, [isAdmin, adminUnreadTotal, conversation?.unreadByCustomer]);

  const activeConversationId = useMemo(() => {
    if (isAdmin) {
      return (
        getConversationId({ _id: selectedCustomer?.activeConversationId }) ||
        selectedConversationId
      );
    }
    return getConversationId(conversation);
  }, [isAdmin, selectedCustomer, selectedConversationId, conversation]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    setPeerTyping(false);
  }, [activeConversationId]);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocketConnected(false);
  }, []);

  const joinConversation = useCallback((conversationId) => {
    if (!socketRef.current?.connected || !conversationId) return;
    socketRef.current.emit('conversation:join', { conversationId });
  }, []);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    const path = isAdmin
      ? `/api/admin/support/conversations/${conversationId}/messages`
      : `/api/support/conversations/${conversationId}/messages`;
    const payload = await authFetch(path);
    setMessages(payload?.items || []);
  }, [authFetch, isAdmin]);

  const loadCustomerMessages = useCallback(async (customerId) => {
    if (!customerId) return;
    const payload = await authFetch(`/api/admin/support/customers/${customerId}/messages`);
    setMessages(payload?.items || []);
  }, [authFetch]);

  const markAllCustomerRead = useCallback(async (customerId) => {
    if (!customerId) return;
    setSupportCustomers((prev) => {
      const next = prev.map((item) =>
        String(getCustomerId(item)) === String(customerId)
          ? { ...item, unreadByAdmin: 0 }
          : item,
      );
      setAdminUnreadTotal(sumAdminUnread(next));
      return next;
    });
    try {
      const payload = await authFetch(`/api/admin/support/customers/${customerId}/read`, {
        method: 'POST',
      });
      if (payload?.unreadTotal != null) {
        setAdminUnreadTotal(payload.unreadTotal);
      }
    } catch {
      /* ignore */
    }
  }, [authFetch]);

  const markRead = useCallback(async (conversationId) => {
    if (!conversationId) return;

    if (isAdmin) {
      setSupportCustomers((prev) => {
        const next = prev.map((item) =>
          String(item.activeConversationId) === String(conversationId)
            ? { ...item, unreadByAdmin: 0 }
            : item,
        );
        setAdminUnreadTotal(sumAdminUnread(next));
        return next;
      });
    }

    const path = isAdmin
      ? `/api/admin/support/conversations/${conversationId}/read`
      : `/api/support/conversations/${conversationId}/read`;
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('message:read', { conversationId });
      } else {
        const payload = await authFetch(path, { method: 'POST' });
        if (payload?.conversation) {
          if (isAdmin) {
            setSupportCustomers((prev) => {
              const next = applyInboxConversationUpdate(prev, payload.conversation);
              setAdminUnreadTotal(sumAdminUnread(next));
              return next;
            });
          } else {
            setConversation(payload.conversation);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, [authFetch, isAdmin]);

  const loadAdminConversations = useCallback(async () => {
    const payload = await authFetch('/api/admin/support/conversations?status=open');
    setConversations(payload?.items || []);
    setAdminUnreadTotal(payload?.unreadTotal || 0);
  }, [authFetch]);

  const loadAdminSupportCustomers = useCallback(async () => {
    const payload = await authFetch('/api/admin/support/customers');
    setSupportCustomers(payload?.items || []);
    setAdminUnreadTotal(payload?.unreadTotal || 0);
  }, [authFetch]);

  const ensureCustomerConversation = useCallback(async (orderId) => {
    const payload = await authFetch('/api/support/conversations', {
      method: 'POST',
      body: JSON.stringify(orderId ? { orderId } : {}),
    });
    setConversation(payload?.conversation || null);
    return payload?.conversation || null;
  }, [authFetch]);

  const refreshCustomerConversation = useCallback(async () => {
    const payload = await authFetch('/api/support/conversations/me');
    setConversation(payload?.conversation || null);
    return payload?.conversation || null;
  }, [authFetch]);

  const connectSocket = useCallback(() => {
    if (!token || socketRef.current) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      const currentId = activeConversationIdRef.current;
      if (currentId) {
        socket.emit('conversation:join', { conversationId: currentId });
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('message:new', ({ message }) => {
      if (!message) return;
      const msgConvId = String(message.conversation);
      const currentId = activeConversationIdRef.current;

      if (isAdmin) {
        setSupportCustomers((prev) => {
          const bumped = bumpCustomerFromMessage(prev, message, selectedCustomerIdRef.current);
          setAdminUnreadTotal(sumAdminUnread(bumped));
          return bumped;
        });

        const selectedCustomer = supportCustomersRef.current.find(
          (item) => String(getCustomerId(item)) === String(selectedCustomerIdRef.current),
        );
        const belongsToSelected =
          selectedCustomer &&
          (String(selectedCustomer.activeConversationId) === msgConvId ||
            String(currentId) === msgConvId);

        if (belongsToSelected) {
          setMessages((prev) => upsertMessage(prev, message));
          if (message.senderRole === 'customer' && socket.connected) {
            socket.emit('message:delivered', { conversationId: msgConvId, messageId: message._id });
          }
        }
        return;
      }

      if (currentId && String(currentId) !== msgConvId) return;
      setMessages((prev) => upsertMessage(prev, message));
      if (message.senderRole === 'admin' && socket.connected) {
        socket.emit('message:delivered', { conversationId: msgConvId, messageId: message._id });
      }
    });

    socket.on('message:delivered', ({ conversationId, messageId }) => {
      if (!messageId) return;
      const currentId = activeConversationIdRef.current;
      if (currentId && String(currentId) !== String(conversationId)) return;
      setMessages((prev) =>
        prev.map((item) =>
          String(item._id) === String(messageId) ? { ...item, delivered: true } : item,
        ),
      );
    });

    socket.on('conversation:read', ({ conversationId, readerRole }) => {
      const currentId = activeConversationIdRef.current;
      if (currentId && String(currentId) !== String(conversationId)) return;
      const ownRole = isAdmin ? 'admin' : 'customer';
      if (readerRole === ownRole) return;
      const readAt = new Date().toISOString();
      setMessages((prev) =>
        prev.map((item) =>
          item.senderRole === ownRole && !item.readAt ? { ...item, readAt, delivered: true } : item,
        ),
      );
    });

    socket.on('typing:update', ({ conversationId, role, typing }) => {
      const currentId = activeConversationIdRef.current;
      if (currentId && String(currentId) !== String(conversationId)) return;
      const ownRole = isAdmin ? 'admin' : 'customer';
      if (role === ownRole) return;
      setPeerTyping(Boolean(typing));
    });

    socket.on('message:ack', ({ message }) => {
      if (!message) return;
      pendingSendRef.current = null;
      setMessages((prev) => upsertMessage(prev, { ...message, delivered: false }));
      if (isAdmin && selectedCustomerIdRef.current) {
        loadAdminSupportCustomers().catch(() => {});
      }
    });

    socket.on('conversation:updated', ({ conversation: updated }) => {
      if (!updated) return;
      const updatedId = getConversationId(updated);

      if (isAdmin) {
        setSupportCustomers((prev) => {
          const next = applyInboxConversationUpdate(prev, updated);
          setAdminUnreadTotal(sumAdminUnread(next));
          return next;
        });

        setConversations((prev) => {
          const idx = prev.findIndex((item) => getConversationId(item) === updatedId);
          if (idx === -1) {
            if (updated.status !== 'open') return prev;
            return [...prev, updated].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
          }
          const next = [...prev];
          next[idx] = { ...next[idx], ...updated };
          return next.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        });
      } else {
        setConversation((prev) => {
          if (!prev || getConversationId(prev) !== updatedId) return prev;
          return { ...prev, ...updated };
        });
      }
    });

    socket.on('error', ({ message }) => {
      if (pendingSendRef.current) {
        const tempId = pendingSendRef.current;
        pendingSendRef.current = null;
        setMessages((prev) => prev.filter((item) => item._id !== tempId));
      }
      setError(message || 'Socket error');
    });

    socketRef.current = socket;
  }, [token, isAdmin]);

  const emitTyping = useCallback((typing) => {
    const conversationId = activeConversationIdRef.current;
    if (!socketRef.current?.connected || !conversationId) return;
    socketRef.current.emit(typing ? 'typing:start' : 'typing:stop', { conversationId });
  }, []);

  const sendMessage = useCallback(async (body) => {
    let conversationId = activeConversationId;
    const text = String(body || '').trim();
    if (!text) return;

    if (!isAdmin && !conversationId) {
      const conv = await ensureCustomerConversation();
      if (!conv) throw new Error('Chưa có hội thoại.');
      setConversation(conv);
      conversationId = getConversationId(conv);
      joinConversation(conversationId);
    }

    if (!conversationId) throw new Error('Chưa có hội thoại.');

    const senderRole = isAdmin ? 'admin' : 'customer';
    const tempId = `temp-${Date.now()}`;
    pendingSendRef.current = tempId;
    const optimistic = {
      _id: tempId,
      body: text,
      senderRole,
      pending: true,
      createdAt: new Date().toISOString(),
      conversation: conversationId,
    };
    setMessages((prev) => [...prev, optimistic]);
    setError(null);

    if (socketRef.current?.connected) {
      socketRef.current.emit('message:send', { conversationId, body: text });
      return;
    }

    try {
      const path = `/api/support/conversations/${conversationId}/messages`;
      const result = await authFetch(path, {
        method: 'POST',
        body: JSON.stringify({ body: text }),
      });
      pendingSendRef.current = null;
      if (result?.message) {
        setMessages((prev) => upsertMessage(prev, result.message));
      }
      if (result?.conversation) {
        if (isAdmin) {
          loadAdminSupportCustomers().catch(() => {});
        } else {
          setConversation(result.conversation);
        }
      }
    } catch (err) {
      pendingSendRef.current = null;
      setMessages((prev) => prev.filter((item) => item._id !== tempId));
      throw err;
    }
  }, [activeConversationId, authFetch, isAdmin, loadAdminSupportCustomers, ensureCustomerConversation, joinConversation]);

  const closeConversation = useCallback(async () => {
    const conversationId = activeConversationId;
    if (!conversationId) return;
    const path = isAdmin
      ? `/api/admin/support/conversations/${conversationId}/close`
      : `/api/support/conversations/${conversationId}/close`;
    const method = isAdmin ? 'PATCH' : 'POST';
    const payload = await authFetch(path, { method });
    if (payload?.conversation) {
      if (isAdmin) {
        await loadAdminSupportCustomers();
        if (selectedCustomerIdRef.current) {
          await loadCustomerMessages(selectedCustomerIdRef.current);
        }
      } else {
        setConversation(payload.conversation);
      }
    }
  }, [activeConversationId, authFetch, isAdmin, loadAdminSupportCustomers]);

  const assignToMe = useCallback(async () => {
    const conversationId = activeConversationId;
    if (!conversationId) return;
    const payload = await authFetch(`/api/admin/support/conversations/${conversationId}/assign`, {
      method: 'PATCH',
    });
    if (payload?.conversation) {
      await loadAdminSupportCustomers();
    }
  }, [activeConversationId, authFetch, loadAdminSupportCustomers]);

  const selectConversation = useCallback(async (conversationId) => {
    setSelectedConversationId(conversationId);
    setMessages([]);
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      await loadMessages(conversationId);
      joinConversation(conversationId);
      await markRead(conversationId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [joinConversation, loadMessages, markRead]);

  const selectCustomer = useCallback(async (customerId) => {
    if (String(selectedCustomerIdRef.current) === String(customerId)) return;

    setSelectedCustomerId(customerId);
    setMessages([]);
    setError(null);

    const customer = supportCustomersRef.current.find(
      (item) => String(getCustomerId(item)) === String(customerId),
    );
    const convId = customer?.activeConversationId
      ? getConversationId({ _id: customer.activeConversationId })
      : null;
    setSelectedConversationId(convId);

    if (!customerId) return;

    setLoading(true);
    try {
      if (convId) {
        joinConversation(convId);
      }
      await loadCustomerMessages(customerId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }

    markAllCustomerRead(customerId)
      .then(() => loadAdminSupportCustomers())
      .catch(() => {});
  }, [joinConversation, loadCustomerMessages, loadAdminSupportCustomers, markAllCustomerRead]);

  const openWidget = useCallback(async (orderId) => {
    setIsOpen(true);
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      connectSocket();
      if (isAdmin) {
        await loadAdminSupportCustomers();
      } else {
        const conv = await refreshCustomerConversation();
        if (conv) {
          const convId = getConversationId(conv);
          await loadMessages(convId);
          joinConversation(convId);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    isAuthenticated,
    connectSocket,
    isAdmin,
    loadAdminSupportCustomers,
    refreshCustomerConversation,
    loadMessages,
    joinConversation,
  ]);

  const closeWidget = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      setConversation(null);
      setConversations([]);
      setSupportCustomers([]);
      setSelectedCustomerId(null);
      setMessages([]);
      setIsOpen(false);
      pendingSendRef.current = null;
      return undefined;
    }

    if (isAdmin) {
      connectSocket();
      loadAdminSupportCustomers().catch(() => {});
      return () => disconnectSocket();
    }

    connectSocket();
    refreshCustomerConversation().catch(() => {});
    return undefined;
  }, [isAuthenticated, isAdmin, connectSocket, disconnectSocket, loadAdminSupportCustomers, refreshCustomerConversation]);

  useEffect(() => {
    if (!socketRef.current?.connected || !activeConversationId) return;
    joinConversation(activeConversationId);
  }, [activeConversationId, socketConnected, joinConversation]);

  useEffect(() => {
    if (socketConnected || !isAuthenticated) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return undefined;
    }

    const shouldPoll = isAdmin || isOpen;
    if (!shouldPoll) return undefined;

    pollRef.current = setInterval(() => {
      if (isAdmin) {
        loadAdminSupportCustomers().catch(() => {});
        if (selectedCustomerIdRef.current) {
          loadCustomerMessages(selectedCustomerIdRef.current).catch(() => {});
        }
      } else {
        refreshCustomerConversation().catch(() => {});
        if (activeConversationIdRef.current) {
          loadMessages(activeConversationIdRef.current).catch(() => {});
        }
      }
    }, 10000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [
    socketConnected,
    isAuthenticated,
    isAdmin,
    isOpen,
    loadAdminSupportCustomers,
    loadCustomerMessages,
    loadMessages,
    refreshCustomerConversation,
  ]);

  const value = useMemo(
    () => ({
      isOpen,
      openWidget,
      closeWidget,
      conversation,
      conversations,
      supportCustomers,
      selectedCustomerId,
      selectedCustomer,
      selectedConversationId,
      selectConversation,
      selectCustomer,
      messages,
      unreadCount,
      adminUnreadTotal,
      peerTyping,
      socketConnected,
      loading,
      error,
      sendMessage,
      emitTyping,
      closeConversation,
      assignToMe,
      loadAdminConversations,
      loadAdminSupportCustomers,
      markRead,
      activeConversationId,
    }),
    [
      isOpen,
      openWidget,
      closeWidget,
      conversation,
      conversations,
      supportCustomers,
      selectedCustomerId,
      selectedCustomer,
      selectedConversationId,
      selectConversation,
      selectCustomer,
      messages,
      unreadCount,
      adminUnreadTotal,
      peerTyping,
      socketConnected,
      loading,
      error,
      sendMessage,
      emitTyping,
      closeConversation,
      assignToMe,
      loadAdminConversations,
      loadAdminSupportCustomers,
      markRead,
      activeConversationId,
    ],
  );

  return <SupportChatContext.Provider value={value}>{children}</SupportChatContext.Provider>;
}

export function useSupportChat() {
  const context = useContext(SupportChatContext);
  if (!context) {
    throw new Error('useSupportChat must be used within SupportChatProvider.');
  }
  return context;
}
