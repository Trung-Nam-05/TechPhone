import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../config/api';

const AiChatContext = createContext(null);

export function AiChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const bootedRef = useRef(false);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch('/api/ai-chat/session');
      setSession(payload?.session || null);
      setMessages(payload?.messages || []);
      setLoaded(true);
      return payload;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (text) => {
    const body = String(text || '').trim();
    if (!body) return;

    setSending(true);
    setError(null);
    const optimisticUser = {
      _id: `temp-user-${Date.now()}`,
      role: 'user',
      body,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const payload = await apiFetch('/api/ai-chat', {
        method: 'POST',
        body: JSON.stringify({ message: body }),
      });
      if (payload?.session) setSession(payload.session);
      setMessages((prev) => {
        const withoutTemp = prev.filter((item) => item._id !== optimisticUser._id);
        const next = [...withoutTemp];
        if (payload?.userMessage) next.push(payload.userMessage);
        if (payload?.assistantMessage) next.push(payload.assistantMessage);
        return next;
      });
      return payload;
    } catch (err) {
      setMessages((prev) => prev.filter((item) => item._id !== optimisticUser._id));
      setError(err.message);
      throw err;
    } finally {
      setSending(false);
    }
  }, []);

  const clearSession = useCallback(async () => {
    setError(null);
    try {
      await apiFetch('/api/ai-chat/session', { method: 'DELETE' });
      setSession(null);
      setMessages([]);
      setLoaded(false);
      bootedRef.current = false;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({
      messages,
      session,
      loading,
      sending,
      error,
      loaded,
      loadSession,
      sendMessage,
      clearSession,
    }),
    [messages, session, loading, sending, error, loaded, loadSession, sendMessage, clearSession],
  );

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

export function useAiChat() {
  const context = useContext(AiChatContext);
  if (!context) {
    throw new Error('useAiChat must be used within AiChatProvider.');
  }
  return context;
}
