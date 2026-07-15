import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle,
  Send,
  Headphones,
  User,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSupportChat } from '../context/SupportChatContext';
import { getOwnMessageStatus } from '../utils/supportMessageStatus';
import './ChatWidget.css';

const TYPING_IDLE_MS = 60_000;

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function HumanSupportPanel({ isActive }) {
  const { isAuthenticated, user } = useAuth();
  const {
    openWidget,
    conversation,
    messages,
    loading,
    error,
    sendMessage,
    emitTyping,
    socketConnected,
    markRead,
    activeConversationId,
    peerTyping,
  } = useSupportChat();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const bootedRef = useRef(false);
  const typingTimerRef = useRef(null);

  const isClosed = conversation?.status === 'closed';

  useEffect(() => {
    if (!isActive || !isAuthenticated || bootedRef.current) return;
    bootedRef.current = true;
    openWidget().catch(() => {});
  }, [isActive, isAuthenticated, openWidget]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, peerTyping]);

  useEffect(() => {
    if (!isActive || !activeConversationId) return;
    markRead(activeConversationId);
  }, [isActive, activeConversationId, markRead, messages.length]);

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
    if (!text || sending) return;
    setDraft('');
    emitTyping(false);
    setSending(true);
    try {
      await sendMessage(text);
    } catch {
      /* error shown via context */
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="human-chat-panel">
        <div className="human-chat-desc">
          <Headphones size={14} />
          <span>Tư vấn kỹ thuật cá nhân hóa — đơn hàng, khiếu nại, hỗ trợ chuyên sâu.</span>
        </div>
        <div className="human-chat-login">
          <Headphones size={32} />
          <p>Đăng nhập để chat với nhân viên TechPhone.</p>
          <Link to="/login" className="human-chat-login-btn">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="human-chat-panel">
      <div className="human-chat-desc">
        <Headphones size={14} />
        <span>Tư vấn kỹ thuật cá nhân hóa — đơn hàng, khiếu nại, hỗ trợ chuyên sâu.</span>
        <span
          className={`chat-widget-status-dot ${socketConnected ? 'online' : 'offline'}`}
          title={socketConnected ? 'Đã kết nối' : 'Đang kết nối...'}
        />
        {isClosed && <span className="chat-widget-closed-badge">Đã kết thúc</span>}
      </div>

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
          const statusLabel = getOwnMessageStatus(msg, messages, 'customer');
          return (
            <div key={msg._id} className={`chat-widget-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
              {!isMine && (
                <span className="chat-widget-avatar chat-widget-avatar-admin">
                  <AvatarIcon size={14} />
                </span>
              )}
              <div className={`chat-widget-bubble ${msg.pending ? 'pending' : ''}`}>
                <p>{msg.body}</p>
                <div className="chat-widget-bubble-meta">
                  {!msg.pending && <span>{formatTime(msg.createdAt)}</span>}
                  {statusLabel && <span className="chat-message-status">{statusLabel}</span>}
                </div>
              </div>
              {isMine && (
                <span className="chat-widget-avatar chat-widget-avatar-user">
                  <AvatarIcon size={14} />
                </span>
              )}
            </div>
          );
        })}
        {peerTyping && (
          <div className="chat-widget-waiting">
            <span className="chat-widget-avatar chat-widget-avatar-admin">
              <Headphones size={14} />
            </span>
            <div className="chat-widget-waiting-bubble">
              <span>Nhân viên hỗ trợ đang phản hồi</span>
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
              onChange={(e) => handleDraftChange(e.target.value)}
              placeholder="Nhập tin nhắn..."
              maxLength={2000}
            />
            <button type="submit" className="btn chat-widget-send" disabled={sending || !draft.trim()}>
              {sending ? <Loader2 size={16} className="chat-widget-spin" /> : <Send size={16} />}
            </button>
          </form>
        )}
      </footer>
    </div>
  );
}
