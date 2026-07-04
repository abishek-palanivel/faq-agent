import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LiveChatWidget({ isOpen, onToggle, onLogin }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const endRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: '👋 Hi! I\'m Zed AI. I can help you with questions about our services. What can I assist you with today?',
        timestamp: new Date().toISOString(),
        suggestions: [
          'Product information',
          'Pricing questions', 
          'Technical support',
          'Account help'
        ]
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setIsTyping(true);

    try {
      // Simulate AI response (replace with actual API call)
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: getAutoResponse(messageText),
          timestamp: new Date().toISOString(),
          suggestions: getContextualSuggestions(messageText)
        }]);
        setLoading(false);
        
        if (isMinimized) {
          setUnreadCount(prev => prev + 1);
        }
      }, 1000 + Math.random() * 1000);

    } catch (error) {
      setIsTyping(false);
      setLoading(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again or contact our support team.',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const getAutoResponse = (message) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return '💰 I\'d be happy to help with pricing! Our plans start at $29/month for basic support. Would you like me to connect you with our sales team for detailed pricing?';
    }
    if (lowerMessage.includes('technical') || lowerMessage.includes('bug')) {
      return '🔧 I can help with technical issues! Can you describe the problem you\'re experiencing? Our technical team is also available 24/7.';
    }
    if (lowerMessage.includes('account') || lowerMessage.includes('login')) {
      return '👤 For account-related issues, I can help you right away! Are you having trouble logging in or need to update your account information?';
    }
    if (lowerMessage.includes('demo') || lowerMessage.includes('trial')) {
      return '🎯 Great! We offer a 14-day free trial. I can set that up for you right now. What\'s your business email?';
    }
    
    return `Thanks for reaching out! I understand you're asking about "${message.substring(0, 50)}...". Let me help you with that. Would you like me to connect you with a human agent or can I answer this myself?`;
  };

  const getContextualSuggestions = (message) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('price')) {
      return ['See pricing plans', 'Schedule a demo', 'Talk to sales'];
    }
    if (lowerMessage.includes('technical')) {
      return ['View documentation', 'Report a bug', 'Contact tech support'];
    }
    if (lowerMessage.includes('account')) {
      return ['Reset password', 'Update billing', 'Cancel subscription'];
    }
    
    return ['More information', 'Speak to human agent', 'See related FAQs'];
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      setUnreadCount(0);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="chat-widget-trigger" onClick={onToggle}>
        <div className="chat-icon">💬</div>
        <div className="chat-tooltip">Need help? Chat with us!</div>
      </div>
    );
  }

  return (
    <div className={`chat-widget ${isMinimized ? 'minimized' : ''}`}>
      <div className="chat-widget-header" onClick={handleMinimize}>
        <div className="chat-header-info">
          <div className="chat-avatar">Z</div>
          <div>
            <div className="chat-title">Zed AI Support</div>
            <div className="chat-status">
              <span className="status-dot online"></span>
              Online now
            </div>
          </div>
        </div>
        <div className="chat-header-actions">
          {unreadCount > 0 && (
            <span className="chat-unread-badge">{unreadCount}</span>
          )}
          <button className="minimize-btn">
            {isMinimized ? '▲' : '▼'}
          </button>
          <button className="close-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="chat-widget-content">
          <div className="chat-widget-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role}`}>
                <div className="message-bubble">
                  {msg.content}
                </div>
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                {msg.suggestions && (
                  <div className="message-suggestions">
                    {msg.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        className="suggestion-chip"
                        onClick={() => sendMessage(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="chat-message assistant">
                <div className="message-bubble typing">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={endRef} />
          </div>

          <div className="chat-widget-input">
            <div className="input-container">
              <textarea
                className="chat-textarea"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={1}
              />
              <button 
                className="send-button"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
              >
                {loading ? '⏳' : '➤'}
              </button>
            </div>
            
            <div className="chat-footer">
              <span>Powered by Zed AI</span>
              <button className="login-prompt" onClick={onLogin}>
                Sign in for full support →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}