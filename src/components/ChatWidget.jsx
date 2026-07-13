import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle,
  X,
  Send,
  Headphones,
  User,
  PhoneOff,
  Loader2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSupportChat } from '../context/SupportChatContext';
import './ChatWidget.css';

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWidget() {
  const { isAuthenticated, user } = useAuth();
  const {
    isOpen,
    openWidget,
    closeWidget,
    conversation,
    messages,
    unreadCount,
    loading,
    error,
    sendMessage,
    closeConversation,
    socketConnected,
    markRead,
    activeConversationId,
  } = useSupportChat();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const isClosed = conversation?.status === 'closed';
  const hasPending = messages.some((msg) => msg.pending);

  const showWaiting = useMemo(() => {
    if (isClosed || loading || hasPending) return false;
    const confirmed = messages.filter((msg) => !msg.pending);
    if (confirmed.length === 0) return false;
    const last = confirmed[confirmed.length - 1];
    return last.senderRole === 'customer';
  }, [isClosed, loading, hasPending, messages]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isOpen, showWaiting]);

  useEffect(() => {
    if (isOpen && activeConversationId) {
      markRead(activeConversationId);
    }
  }, [isOpen, activeConversationId, messages.length, markRead]);

  const handleToggle = () => {
    if (!isAuthenticated) return;
    if (isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendMessage(text);
      setDraft('');
    } catch {
      /* error shown via context */
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-widget-root">
      {isOpen && (
        <div className="chat-widget-panel">
          <header className="chat-widget-header">
            <div className="chat-widget-header-title">
              <span className="chat-widget-header-icon">
                <Headphones size={18} />
              </span>
              <strong>Hỗ trợ TechPhone</strong>
              <span
                className={`chat-widget-status-dot ${socketConnected ? 'online' : 'offline'}`}
                title={socketConnected ? 'Đã kết nối' : 'Đang kết nối...'}
              />
              {isClosed && (
                <span className="chat-widget-closed-badge" title="Hội thoại đã kết thúc">
                  Đã kết thúc
                </span>
              )}
            </div>
            <div className="chat-widget-header-actions">
              {!isClosed && conversation && (
                <button
                  type="button"
                  className="chat-widget-icon-btn"
                  onClick={closeConversation}
                  aria-label="Kết thúc hội thoại"
                  title="Kết thúc hội thoại"
                >
                  <PhoneOff size={17} />
                </button>
              )}
              <button type="button" className="chat-widget-icon-btn" onClick={closeWidget} aria-label="Đóng chat">
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="chat-widget-messages" ref={listRef}>
            {loading && (
              <div className="chat-widget-empty">
                <Loader2 size={20} className="chat-widget-spin" />
                <p>Đang tải...</p>
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div className="chat-widget-empty">
                <MessageCircle size={28} className="chat-widget-empty-icon" />
                <p>Xin chào {user?.name || 'bạn'}!</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMine = msg.senderRole === 'customer';
              const AvatarIcon = isMine ? User : Headphones;
              return (
                <div key={msg._id} className={`chat-widget-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                  {!isMine && (
                    <span className="chat-widget-avatar chat-widget-avatar-admin">
                      <AvatarIcon size={14} />
                    </span>
                  )}
                  <div className={`chat-widget-bubble ${msg.pending ? 'pending' : ''}`}>
                    <p>{msg.body}</p>
                    {msg.pending ? (
                      <span className="chat-widget-pending">
                        <Clock size={10} />
                      </span>
                    ) : (
                      <span>{formatTime(msg.createdAt)}</span>
                    )}
                  </div>
                  {isMine && (
                    <span className="chat-widget-avatar chat-widget-avatar-user">
                      <AvatarIcon size={14} />
                    </span>
                  )}
                </div>
              );
            })}
            {showWaiting && (
              <div className="chat-widget-waiting">
                <span className="chat-widget-avatar chat-widget-avatar-admin">
                  <Headphones size={14} />
                </span>
                <div className="chat-widget-waiting-bubble">
                  <span>Đang chờ hỗ trợ viên</span>
                  <span className="chat-widget-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && <p className="chat-widget-error">{error}</p>}

          <footer className="chat-widget-footer">
            {isClosed ? (
              <p className="chat-widget-muted">Hội thoại đã kết thúc. Mở lại chat để bắt đầu mới.</p>
            ) : (
              <form className="chat-widget-form" onSubmit={handleSend}>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  maxLength={2000}
                  disabled={!conversation}
                />
                <button type="submit" className="chat-widget-send" disabled={sending || !draft.trim() || !conversation}>
                  {sending ? <Loader2 size={16} className="chat-widget-spin" /> : <Send size={16} />}
                </button>
              </form>
            )}
          </footer>
        </div>
      )}

      {isAuthenticated ? (
        <button type="button" className="chat-widget-fab" onClick={handleToggle} aria-label="Mở hỗ trợ">
          <MessageCircle size={22} />
          {unreadCount > 0 && <span className="chat-widget-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
      ) : (
        <Link to="/login" className="chat-widget-fab chat-widget-fab-login" aria-label="Đăng nhập để chat">
          <MessageCircle size={22} />
        </Link>
      )}
    </div>
  );
}
