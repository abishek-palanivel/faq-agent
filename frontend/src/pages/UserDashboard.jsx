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
        <div className="content" style={{background: 'var(--bg)', minHeight: 'calc(100vh - 60px)', display: 'block', position: 'relative'}}>
          {/* Debug info - ALWAYS SHOW */}
          <div style={{position: 'fixed', top: '10px', right: '10px', background: 'rgba(255,255,255,0.1)', color: 'white', padding: '8px', zIndex: 9999, fontSize: '12px', borderRadius: '4px'}}>
            Tab: {tab} | Messages: {messages.length} | Loaded: {JSON.stringify(dataLoaded)}
          </div>
          
          {/* FORCE RENDER CONTENT BASED ON TAB */}
          {tab === 'chat' ? (
            <div className="chat-container" style={{background: 'var(--bg)', minHeight: '100%', display: 'flex', flexDirection: 'column'}}>
              <div className="chat-messages" style={{flex: 1, padding: '24px', background: 'var(--bg)', minHeight: '400px', display: 'flex', flexDirection: 'column'}}>
                {messages.length === 0 ? (
                  <div className="welcome-message" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: 'var(--text)'}}>
                    <div className="bot-icon" style={{fontSize: '64px', marginBottom: '20px'}}>🤖</div>
                    <h3 style={{color: 'var(--text)', fontSize: '24px', marginBottom: '12px'}}>Welcome to Zed AI Support</h3>
                    <p style={{color: 'var(--text-muted)', fontSize: '16px'}}>Loading your chat experience...</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`} style={{marginBottom: '16px', display: 'block'}}>
                      <div className="message-content" style={{padding: '12px 16px', borderRadius: '16px', background: msg.role === 'user' ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'var(--surface)', color: msg.role === 'user' ? 'white' : 'var(--text)', marginBottom: '4px'}}>
                        {msg.content}
                      </div>
                      <div className="message-time" style={{fontSize: '11px', color: 'var(--text-dim)'}}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="message-suggestions" style={{display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap'}}>
                          {msg.suggestions.slice(0, 3).map((suggestion, idx) => (
                            <button 
                              key={idx}
                              className="suggestion-btn"
                              onClick={() => sendMessage(suggestion)}
                              style={{padding: '6px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '16px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px'}}
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
                  <div className="message assistant typing" style={{marginBottom: '16px'}}>
                    <div className="typing-indicator" style={{display: 'flex', gap: '4px', padding: '12px 16px', background: 'var(--surface)', borderRadius: '16px', width: 'fit-content'}}>
                      <span style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'typing 1.4s infinite'}}></span>
                      <span style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'typing 1.4s infinite', animationDelay: '0.2s'}}></span>
                      <span style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'typing 1.4s infinite', animationDelay: '0.4s'}}></span>
                    </div>
                  </div>
                )}
                
                <div ref={endRef} />
              </div>
              
              <div className="chat-input-container" style={{padding: '20px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: '12px', alignItems: 'flex-end'}}>
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  placeholder="Type your message here..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  style={{flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '12px 16px', color: 'var(--text)', fontSize: '14px', outline: 'none', resize: 'none', minHeight: '20px', maxHeight: '100px', fontFamily: 'inherit', lineHeight: 1.4}}
                />
                <button 
                  className="send-btn"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  style={{width: '44px', height: '44px', border: 'none', borderRadius: '50%', background: loading || !input.trim() ? 'var(--text-dim)' : 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'}}
                >
                  {loading ? '⏳' : '➤'}
                </button>
              </div>
            </div>
          ) : tab === 'faqs' ? (
            <div className="faq-browser" style={{padding: '24px', background: 'var(--bg)', minHeight: '100%'}}>
              <h2 style={{color: 'var(--text)', marginBottom: '20px'}}>Frequently Asked Questions</h2>
              <div className="faq-controls" style={{display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center'}}>
                <div className="search-bar" style={{flex: 1}}>
                  <input
                    type="text"
                    placeholder="Search FAQs..."
                    value={faqSearch}
                    onChange={e => setFaqSearch(e.target.value)}
                    className="search-input"
                    style={{width: '100%', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '14px', outline: 'none'}}
                  />
                </div>
                
                <div className="category-filter" style={{minWidth: '150px'}}>
                  <select 
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="category-select"
                    style={{width: '100%', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '14px', outline: 'none', cursor: 'pointer'}}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="faq-results">
                <p className="results-count" style={{color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 16px 0'}}>
                  {filteredFaqs.length} FAQ{filteredFaqs.length !== 1 ? 's' : ''} found
                </p>
                
                <div className="faq-list">
                  {filteredFaqs.length > 0 ? filteredFaqs.map((faq, i) => (
                    <div key={i} className="faq-item" style={{background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '16px'}}>
                      <div className="faq-question" style={{marginBottom: '12px'}}>
                        <span className="category-tag" style={{display: 'inline-block', background: 'var(--primary)', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', marginBottom: '8px'}}>{faq.category}</span>
                        <h3 style={{color: 'var(--text)', fontSize: '16px', fontWeight: '600', margin: '0', lineHeight: 1.4}}>{faq.question}</h3>
                      </div>
                      <div className="faq-answer" style={{marginBottom: '16px'}}>
                        <p style={{color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, margin: 0}}>{faq.answer}</p>
                      </div>
                      <div className="faq-actions" style={{display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)'}}>
                        <button 
                          className="ask-followup-btn"
                          onClick={() => {
                            setTab('chat');
                            setInput(`I have a follow-up question about: ${faq.question}`);
                            inputRef.current?.focus();
                          }}
                          style={{background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: 'var(--primary)', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'}}
                        >
                          Ask Follow-up
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="no-results" style={{textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)'}}>
                      <p style={{fontSize: '16px', margin: '0 0 16px 0'}}>Loading FAQs...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : tab === 'tickets' ? (
            <div className="tickets-section" style={{padding: '24px', background: 'var(--bg)', minHeight: '100%'}}>
              <div className="tickets-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                <h2 style={{color: 'var(--text)', margin: 0}}>Your Support Tickets</h2>
                <button 
                  className="btn-primary"
                  onClick={() => setTab('chat')}
                  style={{background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer'}}
                >
                  Create New Ticket
                </button>
              </div>
              
              <div className="tickets-list">
                {tickets.length > 0 ? tickets.map((ticket, i) => (
                  <div key={i} className="ticket-card" style={{background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '16px'}}>
                    <div className="ticket-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                      <span className="ticket-id" style={{color: 'var(--primary)', fontWeight: '700', fontSize: '14px'}}>#{ticket.id}</span>
                      <span className={`status-badge ${ticket.status?.toLowerCase()}`} style={{padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase'}}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="ticket-content">
                      <h4 style={{color: 'var(--text)', fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0'}}>{ticket.subject || 'Support Request'}</h4>
                      <p style={{color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 12px 0'}}>{ticket.message?.substring(0, 100)}...</p>
                      <div className="ticket-meta" style={{fontSize: '12px', color: 'var(--text-dim)'}}>
                        <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="no-tickets" style={{textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)'}}>
                    <p style={{fontSize: '16px', margin: '0 0 16px 0'}}>You don't have any support tickets yet.</p>
                    <button 
                      className="btn-primary"
                      onClick={() => setTab('chat')}
                      style={{background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer'}}
                    >
                      Start a conversation with our AI assistant
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'profile' ? (
            <div className="profile-section" style={{padding: '24px', background: 'var(--bg)', minHeight: '100%'}}>
              <div className="profile-card" style={{background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px', maxWidth: '400px', margin: '0 auto'}}>
                <div className="profile-header" style={{display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px'}}>
                  <div className="profile-avatar" style={{width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '32px', fontWeight: '700'}}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="profile-info">
                    <h2 style={{color: 'var(--text)', fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0'}}>{name}</h2>
                    <p style={{color: 'var(--text-muted)', fontSize: '14px', margin: 0}}>{email}</p>
                  </div>
                </div>
                
                <div className="profile-actions" style={{display: 'flex', justifyContent: 'center'}}>
                  <button className="btn-secondary" onClick={logout} style={{background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer'}}>
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="fallback-content" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '40px 20px', background: 'var(--bg)', minHeight: '400px'}}>
              <h2 style={{color: 'var(--text)', fontSize: '24px', marginBottom: '12px'}}>Welcome to Zed AI Support</h2>
              <p style={{color: 'var(--text-muted)', fontSize: '16px', margin: 0}}>Please select a tab from the sidebar to get started.</p>
              <div style={{marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center'}}>
                <button onClick={() => setTab('chat')} style={{background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer'}}>Start Chat</button>
                <button onClick={() => setTab('faqs')} style={{background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer'}}>Browse FAQs</button>
              </div>
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