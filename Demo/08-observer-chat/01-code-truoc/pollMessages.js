/**
 * =====================================================================
 * CODE TRƯỚC KHI ÁP DỤNG — Observer (Chat realtime)
 * =====================================================================
 * Vấn đề: client poll API liên tục, chậm và tốn request
 * =====================================================================
 */

export function createChatStoreBeforePattern() {
  let messages = [];
  let listeners = [];

  return {
    getMessages() {
      return messages;
    },
    setMessages(next) {
      messages = next;
      listeners.forEach((fn) => fn(messages));
    },
    subscribe(fn) {
      listeners.push(fn);
      return () => {
        listeners = listeners.filter((x) => x !== fn);
      };
    },
  };
}

/**
 * Polling mỗi 2 giây — chưa dùng Socket Observer
 */
export function startPollingMessagesBeforePattern({
  conversationId,
  authFetch,
  onUpdate,
  intervalMs = 2000,
}) {
  let stopped = false;
  let timer = null;
  let inFlight = false;

  async function tick() {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const data = await authFetch(`/api/support/conversations/${conversationId}/messages`);
      onUpdate(data?.items || []);
    } catch (error) {
      console.error('Poll messages failed', error);
    } finally {
      inFlight = false;
    }
  }

  tick();
  timer = setInterval(tick, intervalMs);

  return function stopPolling() {
    stopped = true;
    if (timer) clearInterval(timer);
  };
}

/** Gửi tin xong vẫn phải chờ poll mới thấy tin phía bên kia */
export async function sendMessageBeforePattern({ conversationId, body, authFetch }) {
  await authFetch(`/api/support/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  // Không có push realtime → admin/customer phải đợi lần poll kế tiếp
  return { ok: true, realtime: false };
}
