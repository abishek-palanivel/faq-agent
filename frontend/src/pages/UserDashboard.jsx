import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const authH = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('user_token')}` });

export default function UserDashboard() {
  const [tab, setTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [userPreferences, setUserPreferences] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const nav = useNavigate();

  const name = localStorage.getItem('user_name') || 'User';
  const email = localStorage.getItem('user_email') || '';

  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  useEffect(() => {
    loadUserPreferences();
    loadNotifications();
    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hi ${name}! 👋 I'm your AI assistant. I can help you with questions about orders, billing, returns, account issues, or anything else. What can I help you with today?`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, []);

  // Load user preferences
  const loadUserPreferences = async () => {
    try {
      const res = await fetch(`${API}/api/user/preferences`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setUserPreferences(data);
      }
    } catch (e) {
      console.log('Failed to load preferences:', e);
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    try {
      const res = await fetch(`${API}/api/notifications`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.log('Failed to load notifications:', e);
    }
  };

  // Load tickets
  const loadTickets = async () => {
    try {
      const res = await fetch(`${API}/api/tickets/user`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (e) {
      console.log('Failed to load tickets:', e);
    }
  };

  // Load FAQs
  const loadFaqs = async () => {
    try {
      const res = await fetch(`${API}/api/faqs`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setFaqs(data);
      }
    } catch (e) {
      console.log('Failed to load FAQs:', e);
    }
  };

  // Load suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (input.length > 1) {
        try {
          const res = await fetch(`${API}/api/suggestions?q=${encodeURIComponent(input)}`, { headers: authH() });
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(data.suggestions?.length > 0);
        } catch (e) {
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [input]);

  // Send message
  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMsg = { role: 'user', content: messageText.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ message: messageText, history: messages })
      });

      const data = await res.json();
      
      if (res.ok) {
        const botMsg = { 
          role: 'assistant', 
          content: data.response, 
          timestamp: new Date().toISOString(),
          escalated: data.escalated,
          ticket_id: data.ticket_id,
          quick_actions: data.quick_actions || []
        };
        setMessages(prev => [...prev, botMsg]);

        // If ticket was created, refresh tickets
        if (data.ticket_id) {
          loadTickets();
        }
      } else {
        throw new Error(data.detail || 'Failed to send message');
      }
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `I'm having trouble connecting right now. Please try again in a moment. ${err.message}`,
        timestamp: new Date().toISOString(),
        error: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      // Focus input after sending
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Handle quick actions
  const handleQuickAction = async (action, data = {}) => {
    try {
      const res = await fetch(`${API}/api/quick-action`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ action, data })
      });

      const result = await res.json();
      
      if (res.ok) {
        const actionMsg = {
          role: 'assistant',
          content: result.message,
          timestamp: new Date().toISOString(),
          action_result: true
        };
        setMessages(prev => [...prev, actionMsg]);
        
        // Refresh relevant data
        loadTickets();
        loadNotifications();
      }
    } catch (err) {
      console.error('Quick action failed:', err);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_name');  
    localStorage.removeItem('user_email');
    nav('/login');
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <div className="logo-section">
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="40" stroke="url(#logoGrad)" strokeWidth="6" />
              <path d="M35 35 H65 L50 65 Z" fill="url(#logoGrad)" />
              <circle cx="50" cy="42" r="5" fill="#ffffff" />
            </svg>
            <span className="logo-text">Zed Support</span>
          </div>
        </div>
        
        <div className="header-right">
          <div className="user-info">
            <div className="notification-bell" onClick={() => setShowNotifications(!showNotifications)}>
              🔔
              {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}
            </div>
            <div className="user-avatar">{name[0].toUpperCase()}</div>
            <div className="user-details">
              <span className="user-name">{name}</span>
              <span className="user-email">{email}</span>
            </div>
            <button onClick={logout} className="logout-btn">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="notifications-panel">
          <div className="notifications-header">
            <h4>Notifications</h4>
            <button onClick={() => setShowNotifications(false)}>✕</button>
          </div>
          <div className="notifications-list">
            {notifications.length === 0 ? (
              <p className="no-notifications">No new notifications</p>
            ) : (
              notifications.map((notif, i) => (
                <div key={i} className="notification-item">
                  <h5>{notif.title}</h5>
                  <p>{notif.message}</p>
                  <small>{new Date(notif.created_at).toLocaleString()}</small>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="dashboard-content">
        {/* Sidebar */}
        <div className="sidebar">
          <nav className="nav-menu">
            <button 
              className={`nav-item ${tab === 'chat' ? 'active' : ''}`}
              onClick={() => setTab('chat')}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
              </svg>
              Live Chat
            </button>
            
            <button 
              className={`nav-item ${tab === 'tickets' ? 'active' : ''}`}
              onClick={() => { setTab('tickets'); loadTickets(); }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12.793a.5.5 0 0 0 .854.353l2.853-2.853A1 1 0 0 1 4.414 12H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
              </svg>
              My Tickets
            </button>
            
            <button 
              className={`nav-item ${tab === 'faqs' ? 'active' : ''}`}
              onClick={() => { setTab('faqs'); loadFaqs(); }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
              </svg>
              Browse FAQs
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {tab === 'chat' && (
            <div className="chat-container">
              <div className="chat-header">
                <h2>💬 AI Assistant</h2>
                <p>Get instant help with your questions</p>
              </div>
              
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}>
                    <div className="message-avatar">
                      {msg.role === 'user' ? (
                        <div className="user-avatar">{name[0]}</div>
                      ) : (
                        <div className="bot-avatar">🤖</div>
                      )}
                    </div>
                    <div className="message-content">
                      <div className={`message-bubble ${msg.error ? 'error' : ''} ${msg.escalated ? 'escalated' : ''}`}>
                        {msg.content}
                        {msg.escalated && (
                          <div className="escalation-notice">
                            🎯 This has been escalated to our support team. Ticket #{msg.ticket_id}
                          </div>
                        )}
                      </div>
                      {msg.quick_actions && msg.quick_actions.length > 0 && (
                        <div className="quick-actions">
                          {msg.quick_actions.map((action, j) => (
                            <button
                              key={j}
                              className={`quick-action-btn ${action.type}`}
                              onClick={() => handleQuickAction(action.action)}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="message assistant">
                    <div className="message-avatar">
                      <div className="bot-avatar">🤖</div>
                    </div>
                    <div className="message-content">
                      <div className="message-bubble typing">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={endRef} />
              </div>

              {/* Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions">
                  {suggestions.slice(0, 3).map((suggestion, i) => (
                    <button
                      key={i}
                      className="suggestion-btn"
                      onClick={() => {
                        setInput(suggestion);
                        setShowSuggestions(false);
                        inputRef.current?.focus();
                      }}
                    >
                      💡 {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input */}
              <div className="chat-input-container">
                <div className="chat-input">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message here..."
                    disabled={loading}
                  />
                  <button 
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className="send-btn"
                  >
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M15.854.146a.5.5 0 0 1 .11.54L13.026 8 15.964 15.314a.5.5 0 0 1-.468.65.558.558 0 0 1-.142-.02L0 9.5 5.5 8 0 6.5l15.354-6.354z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'tickets' && (
            <div className="tickets-container">
              <div className="tickets-header">
                <h2>🎫 My Support Tickets</h2>
                <p>Track your support requests</p>
              </div>
              
              <div className="tickets-list">
                {tickets.length === 0 ? (
                  <div className="empty-state">
                    <p>No support tickets yet. Start a chat to get help!</p>
                  </div>
                ) : (
                  tickets.map(ticket => (
                    <div key={ticket.id} className="ticket-card">
                      <div className="ticket-header">
                        <span className="ticket-id">#{ticket.id}</span>
                        <span className={`ticket-status ${ticket.status.toLowerCase().replace(' ', '-')}`}>
                          {ticket.status}
                        </span>
                      </div>
                      <div className="ticket-content">
                        <p>{ticket.message}</p>
                        {ticket.admin_reply && (
                          <div className="ticket-reply">
                            <strong>Admin Reply:</strong>
                            <p>{ticket.admin_reply}</p>
                          </div>
                        )}
                      </div>
                      <div className="ticket-footer">
                        <small>Created: {new Date(ticket.created_at).toLocaleDateString()}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'faqs' && (
            <div className="faqs-container">
              <div className="faqs-header">
                <h2>❓ Frequently Asked Questions</h2>
                <p>Find quick answers to common questions</p>
              </div>
              
              <div className="faqs-list">
                {faqs.length === 0 ? (
                  <div className="empty-state">
                    <p>No FAQs available at the moment.</p>
                  </div>
                ) : (
                  faqs.map(faq => (
                    <div key={faq.id} className="faq-card">
                      <h4>{faq.question}</h4>
                      <p>{faq.answer}</p>
                      <div className="faq-category">{faq.category}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}