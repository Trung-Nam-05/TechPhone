import { useEffect, useRef, useState } from 'react';
import { Send, UserCheck, XCircle } from 'lucide-react';
import { useSupportChat } from '../context/SupportChatContext';
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

function getId(item) {
  return item?._id || item?.id;
}

export default function AdminSupport() {
  const {
    conversations,
    selectedConversationId,
    selectConversation,
    messages,
    loading,
    error,
    sendMessage,
    closeConversation,
    assignToMe,
    loadAdminConversations,
    socketConnected,
    markRead,
    activeConversationId,
  } = useSupportChat();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const selected = conversations.find((item) => getId(item) === selectedConversationId);

  useEffect(() => {
    loadAdminConversations().catch(() => {});
  }, [loadAdminConversations]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, selectedConversationId]);

  useEffect(() => {
    if (activeConversationId) {
      markRead(activeConversationId);
    }
  }, [activeConversationId, messages.length, markRead]);

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || !activeConversationId) return;
    setSending(true);
    try {
      await sendMessage(text);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="admin-support-page">
      <div className="admin-support-header">
        <div>
          <h1>Hỗ trợ khách hàng</h1>
          <p>{socketConnected ? 'Realtime đang bật' : 'Đang đồng bộ qua polling'}</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => loadAdminConversations()}>
          Làm mới
        </button>
      </div>

      <div className="admin-support-layout">
        <aside className="admin-support-list">
          {conversations.length === 0 && <p className="admin-support-empty">Chưa có hội thoại mở.</p>}
          {conversations.map((item) => {
            const id = getId(item);
            const isActive = id === selectedConversationId;
            return (
              <button
                key={id}
                type="button"
                className={`admin-support-item ${isActive ? 'active' : ''}`}
                onClick={() => selectConversation(id)}
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
          {!selected ? (
            <div className="admin-support-placeholder">Chọn một hội thoại để bắt đầu trả lời.</div>
          ) : (
            <>
              <header className="admin-support-chat-header">
                <div>
                  <strong>{selected.customer?.name}</strong>
                  <p>{selected.customer?.email}</p>
                  {selected.assignedAdmin?.name && (
                    <p className="admin-support-assigned">Phụ trách: {selected.assignedAdmin.name}</p>
                  )}
                </div>
                <div className="admin-support-actions">
                  <button type="button" className="btn btn-outline" onClick={assignToMe}>
                    <UserCheck size={16} />
                    Gán cho tôi
                  </button>
                  {selected.status === 'open' && (
                    <button type="button" className="btn btn-outline" onClick={closeConversation}>
                      <XCircle size={16} />
                      Đóng hội thoại
                    </button>
                  )}
                </div>
              </header>

              <div className="admin-support-messages" ref={listRef}>
                {loading && <p className="admin-support-empty">Đang tải tin nhắn...</p>}
                {!loading && messages.map((msg) => {
                  const isMine = msg.senderRole === 'admin';
                  return (
                    <div key={msg._id} className={`admin-support-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                      <div className="admin-support-bubble">
                        <p>{msg.body}</p>
                        <span>{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && <p className="admin-support-error">{error}</p>}

              {selected.status === 'closed' ? (
                <p className="admin-support-empty">Hội thoại đã đóng.</p>
              ) : (
                <form className="admin-support-form" onSubmit={handleSend}>
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Nhập phản hồi..."
                    maxLength={2000}
                  />
                  <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim()}>
                    <Send size={16} />
                    Gửi
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
