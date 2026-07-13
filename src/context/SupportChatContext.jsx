import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../config/socket';

const SupportChatContext = createContext(null);

function getConversationId(conversation) {
  return conversation?._id || conversation?.id || null;
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

export function SupportChatProvider({ children }) {
  const { token, isAuthenticated, isAdmin, authFetch } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [adminUnreadTotal, setAdminUnreadTotal] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const activeConversationIdRef = useRef(null);
  const pendingSendRef = useRef(null);

  const unreadCount = useMemo(() => {
    if (isAdmin) return adminUnreadTotal;
    return conversation?.unreadByCustomer || 0;
  }, [isAdmin, adminUnreadTotal, conversation?.unreadByCustomer]);

  const activeConversationId = isAdmin ? selectedConversationId : getConversationId(conversation);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
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

  const markRead = useCallback(async (conversationId) => {
    if (!conversationId) return;
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
            setConversations((prev) =>
              prev.map((item) =>
                getConversationId(item) === conversationId ? payload.conversation : item,
              ),
            );
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
      if (currentId && String(currentId) !== msgConvId) return;
      setMessages((prev) => upsertMessage(prev, message));
    });

    socket.on('message:ack', ({ message }) => {
      if (!message) return;
      pendingSendRef.current = null;
      setMessages((prev) => upsertMessage(prev, message));
    });

    socket.on('conversation:updated', ({ conversation: updated }) => {
      if (!updated) return;
      const updatedId = getConversationId(updated);
      if (isAdmin) {
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
        setAdminUnreadTotal((prev) => {
          const unread = updated.unreadByAdmin ?? 0;
          const oldUnread = conversations.find((item) => getConversationId(item) === updatedId)?.unreadByAdmin ?? 0;
          return Math.max(0, prev - oldUnread + unread);
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
  }, [token, isAdmin, conversations]);

  const sendMessage = useCallback(async (body) => {
    const conversationId = activeConversationId;
    if (!conversationId) throw new Error('Chưa có hội thoại.');
    const text = String(body || '').trim();
    if (!text) return;

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
          setConversations((prev) =>
            prev.map((item) =>
              getConversationId(item) === conversationId ? result.conversation : item,
            ),
          );
        } else {
          setConversation(result.conversation);
        }
      }
    } catch (err) {
      pendingSendRef.current = null;
      setMessages((prev) => prev.filter((item) => item._id !== tempId));
      throw err;
    }
  }, [activeConversationId, authFetch, isAdmin]);

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
        setConversations((prev) =>
          payload.conversation.status === 'closed'
            ? prev.filter((item) => getConversationId(item) !== conversationId)
            : prev.map((item) =>
                getConversationId(item) === conversationId ? payload.conversation : item,
              ),
        );
        if (payload.conversation.status === 'closed') {
          setSelectedConversationId(null);
          setMessages([]);
        }
      } else {
        setConversation(payload.conversation);
      }
    }
  }, [activeConversationId, authFetch, isAdmin]);

  const assignToMe = useCallback(async () => {
    const conversationId = activeConversationId;
    if (!conversationId) return;
    const payload = await authFetch(`/api/admin/support/conversations/${conversationId}/assign`, {
      method: 'PATCH',
    });
    if (payload?.conversation) {
      setConversations((prev) =>
        prev.map((item) =>
          getConversationId(item) === conversationId ? payload.conversation : item,
        ),
      );
    }
  }, [activeConversationId, authFetch]);

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

  const openWidget = useCallback(async (orderId) => {
    if (!isAuthenticated) return;
    setIsOpen(true);
    setLoading(true);
    setError(null);
    try {
      connectSocket();
      let conv = null;
      if (isAdmin) {
        await loadAdminConversations();
      } else {
        conv = await ensureCustomerConversation(orderId);
        if (!conv) {
          conv = await refreshCustomerConversation();
        }
        if (conv) {
          const convId = getConversationId(conv);
          await loadMessages(convId);
          joinConversation(convId);
          await markRead(convId);
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
    loadAdminConversations,
    ensureCustomerConversation,
    refreshCustomerConversation,
    loadMessages,
    joinConversation,
    markRead,
  ]);

  const closeWidget = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      setConversation(null);
      setConversations([]);
      setMessages([]);
      setIsOpen(false);
      pendingSendRef.current = null;
      return undefined;
    }

    if (isAdmin) {
      connectSocket();
      loadAdminConversations().catch(() => {});
      return () => disconnectSocket();
    }

    connectSocket();
    refreshCustomerConversation().catch(() => {});
    return undefined;
  }, [isAuthenticated, isAdmin, connectSocket, disconnectSocket, loadAdminConversations, refreshCustomerConversation]);

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
        loadAdminConversations().catch(() => {});
        if (activeConversationId) {
          loadMessages(activeConversationId).catch(() => {});
        }
      } else {
        refreshCustomerConversation().catch(() => {});
        if (activeConversationId) {
          loadMessages(activeConversationId).catch(() => {});
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
    activeConversationId,
    loadAdminConversations,
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
      selectedConversationId,
      selectConversation,
      messages,
      unreadCount,
      adminUnreadTotal,
      socketConnected,
      loading,
      error,
      sendMessage,
      closeConversation,
      assignToMe,
      loadAdminConversations,
      markRead,
      activeConversationId,
    }),
    [
      isOpen,
      openWidget,
      closeWidget,
      conversation,
      conversations,
      selectedConversationId,
      selectConversation,
      messages,
      unreadCount,
      adminUnreadTotal,
      socketConnected,
      loading,
      error,
      sendMessage,
      closeConversation,
      assignToMe,
      loadAdminConversations,
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
