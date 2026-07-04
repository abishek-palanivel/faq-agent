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
  const [faqs, setFaqs] = useState([]);
  const [filteredFaqs, setFilteredFaqs] = useState([]);
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [dataLoaded, setDataLoaded] = useState({
    faqs: false,
    tickets: false,
    notifications: false
  });
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const nav = useNavigate();

  const name = localStorage.getItem('user_name') || 'User';
  const email = localStorage.getItem('user_email') || '';

  console.log('UserDashboard rendered, current tab:', tab);
  console.log('Messages length:', messages.length);
  console.log('Data loaded status:', dataLoaded);

  // Auto scroll to bottom of messages
  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  // Initialize dashboard once with proper error handling
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
    
    const initializeDashboard = async () => {
      try {
        if (isMounted) {
          await loadInitialData();
          
          // Always set initial message for chat
          if (isMounted) {
            setMessages([{
              role: 'assistant',
              content: `Hi ${name}! 👋 I'm your AI assistant. I can help you with questions about orders, billing, returns, account issues, or anything else. What can I help you with today?`,
              timestamp: new Date().toISOString(),
              suggestions: ['Check my order status', 'Return an item', 'Billing question', 'Account settings']
            }]);
          }
        }
      } catch (error) {
        console.error('Dashboard initialization error:', error);
        // Set fallback message even if API fails
        if (isMounted) {
          setMessages([{
            role: 'assistant',
            content: `Hi ${name}! 👋 Welcome to Zed AI Support. I'm here to help you!`,
            timestamp: new Date().toISOString(),
            suggestions: ['Get Started', 'Browse FAQs', 'Contact Support']
          }]);
        }
      }
    };
    
    initializeDashboard();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array to run only once

  const loadInitialData = async () => {
    // Only load data that hasn't been loaded yet
    const promises = [];
    
    if (!dataLoaded.notifications) {
      promises.push(loadNotifications());
    }
    if (!dataLoaded.faqs) {
      promises.push(loadFaqs());
    }
    if (!dataLoaded.tickets) {
      promises.push(loadTickets());
    }
    
    await Promise.all(promises);
  };

  const loadNotifications = async () => {
    if (dataLoaded.notifications) return; // Prevent duplicate calls
    
    try {
      const res = await fetch(`${API}/api/notifications`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setDataLoaded(prev => ({ ...prev, notifications: true }));
      }
    } catch (e) {
      console.log('Failed to load notifications:', e);
    }
  };

  const loadTickets = async () => {
    if (dataLoaded.tickets) return; // Prevent duplicate calls
    
    try {
      const res = await fetch(`${API}/api/user/tickets`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        setDataLoaded(prev => ({ ...prev, tickets: true }));
      }
    } catch (e) {
      console.log('Failed to load tickets:', e);
    }
  };

  const loadFaqs = async () => {
    if (dataLoaded.faqs) return; // Prevent duplicate calls
    
    try {
      const res = await fetch(`${API}/api/faqs`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setFaqs(data);
        setFilteredFaqs(data);
        setDataLoaded(prev => ({ ...prev, faqs: true }));
      }
    } catch (e) {
      console.log('Failed to load FAQs:', e);
    }
  };

  // Filter FAQs based on search and category
  useEffect(() => {
    let filtered = faqs;
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }
    
    if (faqSearch.trim()) {
      const searchLower = faqSearch.toLowerCase();
      filtered = filtered.filter(faq =>
        faq.question.toLowerCase().includes(searchLower) ||
        faq.answer.toLowerCase().includes(searchLower) ||
        faq.category.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredFaqs(filtered);
  }, [faqs, faqSearch, selectedCategory]);

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
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({
          message: messageText.trim(),
          history: messages
        })
      });

      if (!res.ok) throw new Error('Failed to send message');
      
      const data = await res.json();
      
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          suggestions: data.suggestions || []
        }]);
        setLoading(false);
      }, 500);

    } catch (error) {
      setIsTyping(false);
      setLoading(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again or contact support if the problem persists.',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const logout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    nav('/login');
  };

  const categories = ['All', ...new Set(faqs.map(faq => faq.category))];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="dashboard">
      {/* Sidebar Overlay for Mobile */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-mark">Z</div>
            <span className="sidebar-title">Zed AI Support</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${tab === 'chat' ? 'active' : ''}`}
            onClick={() => { setTab('chat'); setSidebarOpen(false); }}
          >
            <span>💬</span>
            AI Assistant
          </button>
          <button 
            className={`nav-item ${tab === 'faqs' ? 'active' : ''}`}
            onClick={() => { 
              setTab('faqs'); 
              setSidebarOpen(false); 
              // Only load FAQs if not already loaded
              if (!dataLoaded.faqs) {
                loadFaqs(); 
              }
            }}
          >
            <span>📚</span>
            Browse FAQs
          </button>
          <button 
            className={`nav-item ${tab === 'tickets' ? 'active' : ''}`}
            onClick={() => { 
              setTab('tickets'); 
              setSidebarOpen(false); 
              // Only load tickets if not already loaded
              if (!dataLoaded.tickets) {
                loadTickets(); 
              }
            }}
          >
            <span>🎫</span>
            My Tickets
          </button>
          <button 
            className={`nav-item ${tab === 'profile' ? 'active' : ''}`}
            onClick={() => { setTab('profile'); setSidebarOpen(false); }}
          >
            <span>👤</span>
            Profile
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <button 
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <h1 className="header-title">
              {tab === 'chat' && 'AI Assistant'}
              {tab === 'faqs' && 'Knowledge Base'}
              {tab === 'tickets' && 'Support Tickets'}
              {tab === 'profile' && 'Profile Settings'}
            </h1>
          </div>
          
          <div className="header-right">
            <button 
              className="notifications-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
            
            <div className="user-menu" onClick={logout}>
              <div className="user-avatar">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden-mobile">{name}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="content">
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{position: 'fixed', top: 0, right: 0, background: 'red', color: 'white', padding: '4px', zIndex: 9999, fontSize: '12px'}}>
              Tab: {tab} | Messages: {messages.length}
            </div>
          )}
          
          {/* AI Chat Tab */}
          {tab === 'chat' && (
            <div className="chat-container">
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="welcome-message">
                    <div className="bot-icon">🤖</div>
                    <h3>Welcome to Zed AI Support</h3>
                    <p>Loading your chat experience...</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                      <div className="message-content">
                        {msg.content}
                      </div>
                      <div className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="message-suggestions">
                          {msg.suggestions.slice(0, 3).map((suggestion, idx) => (
                            <button 
                              key={idx}
                              className="suggestion-btn"
                              onClick={() => sendMessage(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                
                {isTyping && (
                  <div className="message assistant typing">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
                
                <div ref={endRef} />
              </div>
              
              <div className="chat-input-container">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  placeholder="Type your message here..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button 
                  className="send-btn"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                >
                  {loading ? '⏳' : '➤'}
                </button>
              </div>
            </div>
          )}

          {/* FAQ Browser Tab */}
          {tab === 'faqs' && (
            <div className="faq-browser">
              <div className="faq-controls">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="Search FAQs..."
                    value={faqSearch}
                    onChange={e => setFaqSearch(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                <div className="category-filter">
                  <select 
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="category-select"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="faq-results">
                <p className="results-count">
                  {filteredFaqs.length} FAQ{filteredFaqs.length !== 1 ? 's' : ''} found
                </p>
                
                <div className="faq-list">
                  {filteredFaqs.length > 0 ? filteredFaqs.map((faq, i) => (
                    <div key={i} className="faq-item">
                      <div className="faq-question">
                        <span className="category-tag">{faq.category}</span>
                        <h3>{faq.question}</h3>
                      </div>
                      <div className="faq-answer">
                        <p>{faq.answer}</p>
                      </div>
                      <div className="faq-actions">
                        <button 
                          className="ask-followup-btn"
                          onClick={() => {
                            setTab('chat');
                            setInput(`I have a follow-up question about: ${faq.question}`);
                            inputRef.current?.focus();
                          }}
                        >
                          Ask Follow-up
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="no-results">
                      <p>Loading FAQs...</p>
                    </div>
                  )}
                </div>
                
                {filteredFaqs.length === 0 && faqs.length > 0 && (
                  <div className="no-results">
                    <p>No FAQs found matching your search.</p>
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        setTab('chat');
                        setInput(faqSearch ? `I need help with: ${faqSearch}` : '');
                      }}
                    >
                      Ask AI Assistant Instead
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tickets Tab */}
          {tab === 'tickets' && (
            <div className="tickets-section">
              <div className="tickets-header">
                <h2>Your Support Tickets</h2>
                <button 
                  className="btn-primary"
                  onClick={() => setTab('chat')}
                >
                  Create New Ticket
                </button>
              </div>
              
              <div className="tickets-list">
                {tickets.length > 0 ? tickets.map((ticket, i) => (
                  <div key={i} className="ticket-card">
                    <div className="ticket-header">
                      <span className="ticket-id">#{ticket.id}</span>
                      <span className={`status-badge ${ticket.status?.toLowerCase()}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="ticket-content">
                      <h4>{ticket.subject || 'Support Request'}</h4>
                      <p>{ticket.message?.substring(0, 100)}...</p>
                      <div className="ticket-meta">
                        <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="no-tickets">
                    <p>You don't have any support tickets yet.</p>
                    <button 
                      className="btn-primary"
                      onClick={() => setTab('chat')}
                    >
                      Start a conversation with our AI assistant
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="profile-section">
              <div className="profile-card">
                <div className="profile-header">
                  <div className="profile-avatar">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="profile-info">
                    <h2>{name}</h2>
                    <p>{email}</p>
                  </div>
                </div>
                
                <div className="profile-actions">
                  <button className="btn-secondary" onClick={logout}>
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fallback content if no tab matches */}
          {!['chat', 'faqs', 'tickets', 'profile'].includes(tab) && (
            <div className="fallback-content">
              <h2>Welcome to Zed AI Support</h2>
              <p>Please select a tab from the sidebar to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="notifications-panel">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <button onClick={() => setShowNotifications(false)}>✕</button>
          </div>
          <div className="notifications-list">
            {notifications.length > 0 ? notifications.slice(0, 5).map((notif, i) => (
              <div key={i} className={`notification-item ${!notif.read ? 'unread' : ''}`}>
                <p>{notif.message}</p>
                <span>{new Date(notif.created_at).toLocaleDateString()}</span>
              </div>
            )) : (
              <p className="no-notifications">No notifications</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}