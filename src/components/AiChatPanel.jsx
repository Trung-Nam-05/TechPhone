import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, RefreshCw } from 'lucide-react';
import { useAiChat } from '../context/AiChatContext';
import './AiChatPanel.css';

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function AiChatPanel({ onSwitchToHuman }) {
  const { messages, loading, sending, error, loadSession, sendMessage, clearSession } = useAiChat();
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    loadSession().catch(() => {});
  }, [loadSession]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading, sending]);

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    try {
      await sendMessage(text);
    } catch {
      /* error via context */
    }
  };

  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-desc">
        <Bot size={14} />
        <span>Phân tích nhanh, trả lời gọn — tư vấn sản phẩm, giá, tồn kho, chính sách cơ bản.</span>
      </div>

      <div className="ai-chat-messages" ref={listRef}>
        {loading && (
          <div className="ai-chat-empty">
            <Loader2 size={20} className="ai-chat-spin" />
            <p>Đang tải hội thoại AI...</p>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="ai-chat-empty">
            <Bot size={28} className="ai-chat-empty-icon" />
            <p>Xin chào! Hỏi tôi về điện thoại, giá hoặc đơn hàng (khi đã đăng nhập).</p>
          </div>
        )}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg._id} className={`ai-chat-bubble-row ${isUser ? 'mine' : 'theirs'}`}>
              {!isUser && (
                <span className="ai-chat-avatar">
                  <Bot size={14} />
                </span>
              )}
              <div className={`ai-chat-bubble ${msg.pending ? 'pending' : ''}`}>
                <p>{msg.body}</p>
                {!msg.pending && <span>{formatTime(msg.createdAt)}</span>}
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="ai-chat-bubble-row theirs">
            <span className="ai-chat-avatar">
              <Bot size={14} />
            </span>
            <div className="ai-chat-bubble ai-chat-typing">
              <span className="ai-chat-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}
      </div>

      {error && <p className="ai-chat-error">{error}</p>}

      <footer className="ai-chat-footer">
        <form className="ai-chat-form" onSubmit={handleSend}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Hỏi về sản phẩm, giá, đơn hàng..."
            maxLength={2000}
          />
          <button type="submit" className="ai-chat-send" disabled={sending || !draft.trim()}>
            {sending ? <Loader2 size={16} className="ai-chat-spin" /> : <Send size={16} />}
          </button>
        </form>
        <div className="ai-chat-actions">
          <button type="button" className="ai-chat-action-btn" onClick={() => {
            bootedRef.current = false;
            clearSession().then(() => loadSession()).catch(() => {});
          }}>
            <RefreshCw size={14} />
            Làm mới
          </button>
          <button type="button" className="ai-chat-action-btn ai-chat-action-primary" onClick={onSwitchToHuman}>
            Chuyển sang nhân viên
          </button>
        </div>
      </footer>
    </div>
  );
}
