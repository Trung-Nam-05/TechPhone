import { useState } from 'react';
import { MessageCircle, X, Bot, Headphones, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSupportChat } from '../context/SupportChatContext';
import AiChatPanel from './AiChatPanel';
import HumanSupportPanel from './HumanSupportPanel';
import './ChatWidget.css';

export default function ChatWidget() {
  const { isAdmin } = useAuth();
  const { isOpen, openWidget, closeWidget, unreadCount } = useSupportChat();
  const [activeTab, setActiveTab] = useState('ai');

  if (isAdmin) return null;

  const handleToggle = () => {
    if (isOpen) {
      closeWidget();
    } else {
      setActiveTab('ai');
      openWidget().catch(() => {});
    }
  };

  const handleSwitchToHuman = () => {
    setActiveTab('human');
  };

  return (
    <div className="chat-widget-root">
      {isOpen && (
        <div className="chat-widget-panel">
          <header className="chat-widget-header">
            <div className="chat-widget-header-title">
              <span className="chat-widget-header-icon">
                {activeTab === 'ai' ? <Sparkles size={18} /> : <Headphones size={18} />}
              </span>
              <strong>{activeTab === 'ai' ? 'Trợ lý AI' : 'Nhân viên'}</strong>
            </div>
            <button type="button" className="chat-widget-icon-btn" onClick={closeWidget} aria-label="Đóng chat">
              <X size={18} />
            </button>
          </header>

          <div className="chat-widget-tabs">
            <button
              type="button"
              className={`chat-widget-tab ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <Bot size={15} />
              Trợ lý AI
            </button>
            <button
              type="button"
              className={`chat-widget-tab ${activeTab === 'human' ? 'active' : ''}`}
              onClick={() => setActiveTab('human')}
            >
              <Headphones size={15} />
              Nhân viên
              {unreadCount > 0 && activeTab !== 'human' && (
                <span className="chat-widget-tab-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
          </div>

          <div className="chat-widget-body">
            {activeTab === 'ai' ? (
              <AiChatPanel onSwitchToHuman={handleSwitchToHuman} />
            ) : (
              <HumanSupportPanel isActive={isOpen && activeTab === 'human'} />
            )}
          </div>
        </div>
      )}

      <button type="button" className="chat-widget-fab" onClick={handleToggle} aria-label="Mở hỗ trợ">
        <MessageCircle size={22} />
        {unreadCount > 0 && (!isOpen || activeTab !== 'human') && (
          <span className="chat-widget-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
    </div>
  );
}
