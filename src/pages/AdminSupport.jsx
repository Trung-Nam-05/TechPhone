import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useSupportChat } from '../context/SupportChatContext';
import { getOwnMessageStatus } from '../utils/supportMessageStatus';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import './AdminSupport.css';

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCustomerId(item) {
  return String(item?.customerId || item?.customer?._id || '');
}

const TYPING_IDLE_MS = 60_000;

export default function AdminSupport() {
  const {
    supportCustomers,
    selectedCustomerId,
    selectCustomer,
    messages,
    loading,
    error,
    sendMessage,
    emitTyping,
    loadAdminSupportCustomers,
    socketConnected,
    activeConversationId,
    selectedCustomer,
    peerTyping,
  } = useSupportChat();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    loadAdminSupportCustomers().catch(() => {});
  }, [loadAdminSupportCustomers]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, selectedCustomerId, peerTyping]);

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    emitTyping(false);
  }, [emitTyping]);

  const handleDraftChange = (value) => {
    setDraft(value);
    if (!activeConversationId) return;
    emitTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => emitTyping(false), TYPING_IDLE_MS);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || !selectedCustomer) return;
    setDraft('');
    emitTyping(false);
    setSending(true);
    try {
      await sendMessage(text);
    } finally {
      setSending(false);
    }
  };

  const canReply = Boolean(selectedCustomer);

  return (
    <div className="admin-page admin-support-page">
      <AdminPageHeader
        title="Hỗ trợ khách hàng"
        subtitle={`Hội thoại từ tab Nhân viên — ${socketConnected ? 'Realtime đang bật' : 'Đang đồng bộ qua polling'}`}
        actions={
          <button type="button" className="btn btn-outline" onClick={() => loadAdminSupportCustomers()}>
            Làm mới
          </button>
        }
      />

      <div className="admin-support-layout">
        <aside className="admin-support-list">
          {supportCustomers.length === 0 && (
            <p className="admin-support-empty">Chưa có khách hàng đã chat.</p>
          )}
          {supportCustomers.map((item) => {
            const id = getCustomerId(item);
            const isActive = id === String(selectedCustomerId || '');
            return (
              <button
                key={id}
                type="button"
                className={`admin-support-item ${isActive ? 'active' : ''}`}
                onClick={() => selectCustomer(id)}
              >
                <div className="admin-support-item-top">
                  <strong>{item.customer?.name || 'Khách hàng'}</strong>
                  {item.unreadByAdmin > 0 && (
                    <span className="admin-support-unread">{item.unreadByAdmin}</span>
                  )}
                </div>
                <p>{item.customer?.email}</p>
                <p className="admin-support-preview">{item.lastMessagePreview || 'Chưa có tin nhắn'}</p>
                <span>{formatTime(item.lastMessageAt)}</span>
              </button>
            );
          })}
        </aside>

        <section className="admin-support-chat">
          {!selectedCustomer ? (
            <div className="admin-support-placeholder">Chọn khách hàng để xem lịch sử chat.</div>
          ) : (
            <>
              <header className="admin-support-chat-header">
                <div>
                  <h2>{selectedCustomer.customer?.name}</h2>
                  <p>{selectedCustomer.customer?.email}</p>
                </div>
              </header>

              <div className="admin-support-messages" ref={listRef}>
                {loading && <p className="admin-support-empty">Đang tải tin nhắn...</p>}
                {!loading && messages.length === 0 && (
                  <p className="admin-support-empty">Chưa có tin nhắn trong lịch sử.</p>
                )}
                {!loading && messages.map((msg) => {
                  const isMine = msg.senderRole === 'admin';
                  const statusLabel = getOwnMessageStatus(msg, messages, 'admin');
                  return (
                    <div key={msg._id} className={`admin-support-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                      <div className="admin-support-bubble">
                        <p>{msg.body}</p>
                        <div className="admin-support-bubble-meta">
                          {!msg.pending && <span>{formatTime(msg.createdAt)}</span>}
                          {statusLabel && <span className="chat-message-status">{statusLabel}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {peerTyping && (
                  <p className="admin-support-typing">Khách hàng đang nhập tin nhắn...</p>
                )}
              </div>

              {error && <p className="admin-support-error">{error}</p>}

              {canReply ? (
                <form className="admin-support-form" onSubmit={handleSend}>
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    placeholder="Nhập phản hồi..."
                    maxLength={2000}
                  />
                  <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim()}>
                    <Send size={16} />
                    Gửi
                  </button>
                </form>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
