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

  // Load user preferences and translations
  useEffect(() => {
    loadUserPreferences();
    loadNotifications();
    loadTranslations();
    
    // Set up notification polling
    const notificationInterval = setInterval(loadNotifications, 30000); // Poll every 30 seconds
    
    // Close export menu when clicking outside
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-dropdown')) {
        setShowExportMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(notificationInterval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // Load translations when language changes
  useEffect(() => {
    loadTranslations();
  }, [currentLanguage]);

  const loadTranslations = async () => {
    try {
      const res = await fetch(`${API}/api/translations/${currentLanguage}`);
      const data = await res.json();
      setTranslations(data);
    } catch (e) {
      console.error('Failed to load translations:', e);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch(`${API}/api/notifications`, { headers: authH() });
      const data = await res.json();
      setNotifications(data);
      
      // Play sound for new notifications if enabled
      if (userPreferences.sound_notifications && data.length > notifications.length) {
        playNotificationSound();
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      
      const audioContext = new AudioCtx();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Could not play notification sound:', e);
    }
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('user_token')}` },
        body: formData
      });
      
      const data = await res.json();
      
      // Add file attachment message
      const fileMsg = {
        role: 'user',
        content: `📎 Attached: ${file.name}`,
        attachment: {
          id: data.attachment_id,
          filename: file.name,
          file_url: data.file_url,
          file_type: data.file_type,
          file_size: data.file_size
        }
      };
      
      setMessages(p => [...p, fileMsg]);
      
      // Auto-send message about the attachment
      setTimeout(() => {
        sendMessage(`I've attached a file: ${file.name}. Can you help me with this?`);
      }, 100);
      
    } catch (e) {
      console.error('File upload failed:', e);
      alert('File upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const loadUserPreferences = async () => {
    try {
      const res = await fetch(`${API}/api/user/preferences`, { headers: authH() });
      const data = await res.json();
      setUserPreferences(data);
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
  };

  const updateUserPreferences = async (newPrefs) => {
    try {
      await fetch(`${API}/api/user/preferences`, {
        method: 'PUT',
        headers: authH(),
        body: JSON.stringify(newPrefs)
      });
      setUserPreferences(newPrefs);
      setCurrentLanguage(newPrefs.language || 'en');
      setShowPreferences(false);
    } catch (e) {
      console.error('Failed to update preferences:', e);
    }
  };

  const performChatSearch = async () => {
    try {
      const res = await fetch(`${API}/api/user/chat-search?q=${encodeURIComponent(searchQuery)}`, { headers: authH() });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (e) {
      console.error('Chat search failed:', e);
      setSearchResults([]);
    }
  };

  const submitSatisfactionSurvey = async (surveyData) => {
    try {
      await fetch(`${API}/api/surveys/satisfaction`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify(surveyData)
      });
      setShowSurvey(false);
      setSurveyTicket(null);
      
      // Show thank you message
      setMessages(p => [...p, { 
        role: 'assistant', 
        content: `Thank you for your feedback! It helps us improve our service.`,
        isSystemMessage: true 
      }]);
    } catch (e) {
      console.error('Survey submission failed:', e);
    }
  };

  const loadFaqs = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (faqSearch) params.append('search', faqSearch);
      
      const res = await fetch(`${API}/api/faqs?${params}`, { headers: authH() });
      const data = await res.json();
      setFaqs(data.faqs);
      setFaqCategories(data.categories);
    } catch (e) {
      console.error('Failed to load FAQs:', e);
    }
  };

  const provideFaqFeedback = async (faqId, isHelpful) => {
    try {
      await fetch(`${API}/api/faqs/${faqId}/feedback`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ faq_id: faqId, is_helpful: isHelpful })
      });
      // Refresh FAQ to show updated counters
      loadFaqs();
    } catch (e) {
      console.error('Failed to submit feedback:', e);
    }
  };

  const loadTickets = async () => {
    const res = await fetch(`${API}/api/user/tickets`, { headers: authH() });
    const data = await res.json();
    setTickets(data);
    setTicketsLoaded(true);
    setHasNewReply(data.some(t => t.admin_reply && !t._seen));
  };

  const logout = () => {
    // Clear all tokens to prevent conflicts
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_name');
    nav('/login');
  };

  const sendMessage = async (text = input) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setShowSuggestions(false);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ message: text, history: messages })
      });
      const data = await res.json();
      const assistantMsg = { 
        role: 'assistant', 
        content: data.response, 
        escalated: data.escalated, 
        ticket_id: data.ticket_id,
        chat_id: data.chat_id,
        quick_actions: data.quick_actions || []
      };
      setMessages(p => [...p, assistantMsg]);
      if (data.ticket_id) setTicketsLoaded(false);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Connection error. Please check the backend is running.' }]);
    } finally { setLoading(false); }
  };

  const handleQuickAction = async (action, actionData = null) => {
    try {
      const res = await fetch(`${API}/api/quick-action`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ action, data: actionData })
      });
      const data = await res.json();
      
      setMessages(p => [...p, { 
        role: 'assistant', 
        content: `✅ ${data.message}`,
        isSystemMessage: true 
      }]);
      
      if (action === 'live_agent') setTicketsLoaded(false);
    } catch (e) {
      console.error('Quick action failed:', e);
    }
  };

  const rateMessage = async (chatId, rating, feedback = '') => {
    try {
      await fetch(`${API}/api/chat/${chatId}/rate`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ rating, feedback })
      });
      setShowRating(prev => ({ ...prev, [chatId]: false }));
      
      // Show thank you message
      setMessages(p => [...p, { 
        role: 'assistant', 
        content: `Thank you for rating! Your feedback helps us improve.`,
        isSystemMessage: true 
      }]);
    } catch (e) {
      console.error('Rating failed:', e);
    }
  };

  const exportConversations = async (format = 'json') => {
    try {
      // Show loading state
      setShowExportMenu(false);
      
      // Check if there are messages to export
      if (messages.length === 0) {
        setMessages(p => [...p, { 
          role: 'assistant', 
          content: `💬 You don't have any conversations to export yet. Start chatting with me first!`,
          isSystemMessage: true 
        }]);
        return;
      }
      
      // Show processing message
      setMessages(p => [...p, { 
        role: 'assistant', 
        content: `⏳ Preparing your ${format.toUpperCase()} export...`,
        isSystemMessage: true 
      }]);
      
      let endpoint = `${API}/api/user/conversations/export`;
      if (format === 'csv') {
        endpoint += '/csv';
      }
      
      const res = await fetch(endpoint, { headers: authH() });
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (res.status === 404) {
          throw new Error('Export service not available. Please contact support.');
        } else {
          throw new Error(`Export failed: ${res.status} ${res.statusText}`);
        }
      }
      
      if (format === 'csv') {
        // Handle CSV download
        const blob = await res.blob();
        
        if (blob.size === 0) {
          throw new Error('Export file is empty. No data to export.');
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zed-conversations-${name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show success message
        setMessages(p => [...p, { 
          role: 'assistant', 
          content: `✅ CSV export completed! Your conversation history has been downloaded as a spreadsheet file.`,
          isSystemMessage: true 
        }]);
      } else {
        // Handle JSON download
        const data = await res.json();
        
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid export data received from server.');
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zed-conversations-${name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show success message with stats
        const totalConversations = data.conversations?.length || 0;
        const totalTickets = data.support_tickets?.length || 0;
        const avgRating = data.statistics?.average_rating || 0;
        
        setMessages(p => [...p, { 
          role: 'assistant', 
          content: `✅ JSON export completed!\n\n📊 Export Summary:\n• ${totalConversations} conversations\n• ${totalTickets} support tickets\n• ${avgRating > 0 ? `Average rating: ${avgRating.toFixed(1)}/5 ⭐` : 'No ratings yet'}\n\nYour complete data history has been downloaded.`,
          isSystemMessage: true 
        }]);
      }
    } catch (e) {
      console.error('Export failed:', e);
      
      // Show error message in chat
      setMessages(p => [...p, { 
        role: 'assistant', 
        content: `❌ Export failed: ${e.message}\n\nPlease try again or contact our support team if the problem persists.`,
        isSystemMessage: true 
      }]);
    }
  };

  const defaultSuggestions = ['How do I track my order?', 'What is your return policy?', 'How do I reset my password?', 'Talk to a human agent'];

  return (
    <div className="dashboard">
      {/* User Preferences Modal */}
      {showPreferences && (
        <div className="modal-overlay" onClick={() => setShowPreferences(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>⚙️ User Preferences</h3>
            <div className="preferences-form">
              <div className="form-group">
                <label>Language</label>
                <select 
                  value={userPreferences.language || 'en'}
                  onChange={e => setUserPreferences({...userPreferences, language: e.target.value})}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={userPreferences.notifications_enabled ?? true}
                    onChange={e => setUserPreferences({...userPreferences, notifications_enabled: e.target.checked})}
                  />
                  Enable notifications
                </label>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={userPreferences.email_notifications ?? true}
                    onChange={e => setUserPreferences({...userPreferences, email_notifications: e.target.checked})}
                  />
                  Email notifications
                </label>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={userPreferences.sound_notifications ?? true}
                    onChange={e => setUserPreferences({...userPreferences, sound_notifications: e.target.checked})}
                  />
                  Sound notifications
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowPreferences(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => updateUserPreferences(userPreferences)}>
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Satisfaction Survey Modal */}
      {showSurvey && surveyTicket && (
        <div className="modal-overlay" onClick={() => setShowSurvey(false)}>
          <div className="modal survey-modal" onClick={e => e.stopPropagation()}>
            <h3>📝 How was your experience?</h3>
            <p>Help us improve by rating your experience with ticket #{surveyTicket.id}</p>
            <SatisfactionSurveyForm 
              ticket={surveyTicket}
              onSubmit={submitSatisfactionSurvey}
              onCancel={() => setShowSurvey(false)}
            />
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg className="logo-svg" width="38" height="38" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGradSide" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="42" stroke="url(#logoGradSide)" strokeWidth="8" />
            <path d="M35 35 H65 L50 65 Z" fill="url(#logoGradSide)" />
            <circle cx="50" cy="42" r="5" fill="#ffffff" />
          </svg>
          <div>
            <h2>Zed Support</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-btn ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Live Chat
          </button>
          <button className={`nav-btn ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            Search History
          </button>
          <button className={`nav-btn ${tab === 'faqs' ? 'active' : ''}`} onClick={() => setTab('faqs')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/></svg>
            Browse FAQs
            {faqs.length > 0 && <span className="nav-badge">{faqs.length}</span>}
          </button>
          <button className={`nav-btn ${tab === 'tickets' ? 'active' : ''}`} onClick={() => setTab('tickets')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            My Tickets
            {tickets.length > 0 && <span className="nav-badge">{tickets.length}</span>}
            {hasNewReply && <span className="notif-dot" />}
          </button>
        </nav>

        <div className="sidebar-user">
          <div className="user-profile">
            <div className="user-avatar-sm">{name[0]?.toUpperCase()}</div>
            <div className="sidebar-user-info">
              <p>{name}</p>
              <span>{email}</span>
            </div>
          </div>
          <div className="user-actions">
            <button className="logout-btn" onClick={logout} title="Logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {tab === 'chat' ? (
          <div className="chat-view">
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="msg-avatar bot" style={{width:38,height:38}}>🤖</div>
                <div>
                  <h2>Zed AI Assistant</h2>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                    <div className="online-dot" />
                    <span style={{fontSize:12,color:'var(--text-muted)'}}>Online · Powered by Gemini</span>
                  </div>
                </div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {/* Notifications Bell */}
                <button 
                  className="clear-chat-btn notification-btn" 
                  onClick={() => setShowNotifications(!showNotifications)}
                  title="Notifications"
                >
                  🔔 
                  {notifications.length > 0 && <span className="notification-count">{notifications.length}</span>}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="notifications-dropdown">
                    <h4>Notifications</h4>
                    {notifications.length === 0 ? (
                      <p>No new notifications</p>
                    ) : (
                      notifications.map(notification => (
                        <div key={notification.id} className="notification-item">
                          <div className="notification-title">{notification.title}</div>
                          <div className="notification-message">{notification.message}</div>
                          <div className="notification-time">
                            {new Date(notification.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                
                <button className="clear-chat-btn" onClick={refreshCurrentTab} title="Refresh">
                  ↻ Refresh
                </button>
                <button className="clear-chat-btn" onClick={() => setShowPreferences(true)} title="Settings">
                  ⚙️ Settings
                </button>
                <div className="export-dropdown">
                  <button className="clear-chat-btn export-trigger" onClick={() => setShowExportMenu(!showExportMenu)} title="Export Conversations">
                    📥 Export ▼
                  </button>
                  {showExportMenu && (
                    <div className="export-menu modern-export-menu">
                      <div className="export-menu-header">
                        📊 Export Your Data
                      </div>
                      <button 
                        className="export-option"
                        onClick={() => exportConversations('json')}
                      >
                        <div className="export-icon">📄</div>
                        <div className="export-details">
                          <div className="export-title">Export as JSON</div>
                          <div className="export-description">Complete data with metadata</div>
                        </div>
                      </button>
                      <button 
                        className="export-option"
                        onClick={() => exportConversations('csv')}
                      >
                        <div className="export-icon">📊</div>
                        <div className="export-details">
                          <div className="export-title">Export as CSV</div>
                          <div className="export-description">Spreadsheet-ready format</div>
                        </div>
                      </button>
                      <div className="export-info">
                        <small>💡 Includes conversations, ratings, and support tickets</small>
                      </div>
                    </div>
                  )}
                </div>
                <button className="clear-chat-btn" onClick={() => setMessages([])}>Clear Chat</button>
              </div>
            </div>

            <div 
              className={`chat-messages modern-chat ${dragOver ? 'drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {dragOver && (
                <div className="drag-overlay modern-drag">
                  <div className="drag-message modern-drag-message">
                    <div className="drag-icon">📎</div>
                    <div className="drag-text">Drop files here to upload</div>
                    <div className="drag-hint">Supports images, PDFs, and documents</div>
                  </div>
                </div>
              )}
              
              {messages.length === 0 && (
                <div className="welcome-screen modern-welcome">
                  <div className="welcome-content">
                    <div className="bot-icon modern-bot">🤖</div>
                    <h3 className="welcome-title">Hi {name.split(' ')[0]}! I'm Zed AI.</h3>
                    <p className="welcome-subtitle">{translations.ask_anything || 'Ask me anything about your orders, billing, returns, or account.'}</p>
                    <div className="quick-suggestions modern-suggestions-grid">
                      {defaultSuggestions.map(s => (
                        <button key={s} className="suggestion-chip modern-chip" onClick={() => sendMessage(s)}>
                          <span className="chip-icon">💬</span>
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="features-preview">
                      <div className="feature-item">
                        <span className="feature-icon">📎</span>
                        <span>Upload files & images</span>
                      </div>
                      <div className="feature-item">
                        <span className="feature-icon">⭐</span>
                        <span>Rate responses</span>
                      </div>
                      <div className="feature-item">
                        <span className="feature-icon">🎫</span>
                        <span>Escalate to human agent</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`msg-row modern-msg-row ${m.role}`}>
                  <div className={`msg-avatar modern-avatar ${m.role === 'assistant' ? 'bot' : 'user'}`}>
                    {m.role === 'assistant' ? (
                      <div className="bot-avatar">🤖</div>
                    ) : (
                      <div className="user-avatar">{name[0]?.toUpperCase()}</div>
                    )}
                  </div>
                  <div className="msg-content modern-msg-content">
                    <div className={`msg-bubble modern-bubble ${m.role} ${m.isSystemMessage ? 'system' : ''}`}>
                      <div className="message-text">{m.content}</div>
                      {m.role === 'assistant' && (
                        <div className="message-meta">
                          <span className="timestamp">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          <span className="ai-badge">✨ AI</span>
                        </div>
                      )}
                    </div>
                    
                    {/* File Attachment Display */}
                    {m.attachment && (
                      <div className="attachment-preview">
                        {m.attachment.file_type?.startsWith('image/') ? (
                          <img 
                            src={`${API}${m.attachment.file_url}`} 
                            alt={m.attachment.filename}
                            className="attachment-image"
                            onClick={() => window.open(`${API}${m.attachment.file_url}`, '_blank')}
                          />
                        ) : (
                          <div className="attachment-file">
                            <div className="file-icon">📄</div>
                            <div className="file-info">
                              <div className="file-name">{m.attachment.filename}</div>
                              <div className="file-size">{Math.round(m.attachment.file_size / 1024)} KB</div>
                            </div>
                            <button 
                              className="download-btn"
                              onClick={() => window.open(`${API}${m.attachment.file_url}`, '_blank')}
                            >
                              📥
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Quick Actions */}
                    {m.quick_actions?.length > 0 && (
                      <div className="quick-actions">
                        {m.quick_actions.map((action, idx) => (
                          <button 
                            key={idx}
                            className={`quick-action-btn ${action.type}`}
                            onClick={() => handleQuickAction(action.action)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Rating System */}
                    {m.role === 'assistant' && m.chat_id && !m.isSystemMessage && (
                      <div className="message-actions">
                        {!showRating[m.chat_id] ? (
                          <button 
                            className="rate-btn"
                            onClick={() => setShowRating(prev => ({ ...prev, [m.chat_id]: true }))}
                          >
                            ⭐ {translations.rate_response || 'Rate Response'}
                          </button>
                        ) : (
                          <div className="rating-panel">
                            <p>How helpful was this response?</p>
                            <div className="rating-stars">
                              {[1,2,3,4,5].map(star => (
                                <button
                                  key={star}
                                  className="star-btn"
                                  onClick={() => rateMessage(m.chat_id, star)}
                                >
                                  ⭐
                                </button>
                              ))}
                            </div>
                            <button 
                              className="cancel-rating"
                              onClick={() => setShowRating(prev => ({ ...prev, [m.chat_id]: false }))}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {m.escalated && (
                      <div className="escalation-badge">
                        🎫 Ticket #{m.ticket_id} created — A human agent will reach out soon
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {uploading && (
                <div className="msg-row user">
                  <div className="msg-avatar user">{name[0]?.toUpperCase()}</div>
                  <div className="msg-bubble user uploading">
                    📎 Uploading file...
                  </div>
                </div>
              )}

              {loading && (
                <div className="msg-row assistant">
                  <div className="msg-avatar bot">🤖</div>
                  <div className="msg-bubble assistant typing-bubble">
                    <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="chat-input-area-fixed">
              <div className="input-wrapper-fixed">
                <div className="textarea-container">
                  <textarea 
                    className="chat-textarea-fixed" 
                    placeholder="Type your message here..." 
                    value={input}
                    onChange={e => setInput(e.target.value)} 
                    disabled={loading}
                    rows={1}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  
                  {/* Smart Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="suggestions-dropdown-fixed">
                      <div className="suggestions-header">💡 Suggestions</div>
                      {suggestions.map((suggestion, idx) => (
                        <div 
                          key={idx}
                          className="suggestion-item-fixed"
                          onClick={() => {
                            setInput(suggestion);
                            setShowSuggestions(false);
                          }}
                        >
                          <span className="suggestion-icon">💬</span>
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="buttons-container-fixed">
                  {/* File Upload Button */}
                  <input 
                    type="file"
                    id="file-upload-fixed"
                    style={{display: 'none'}}
                    accept="image/*,application/pdf,text/*,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  
                  <button 
                    type="button"
                    className="upload-btn-fixed"
                    onClick={() => document.getElementById('file-upload-fixed').click()}
                    disabled={uploading}
                    title="Attach file"
                  >
                    {uploading ? '⏳' : '📎'}
                  </button>
                  
                  {/* Send Button */}
                  <button 
                    type="button" 
                    className="send-btn-fixed" 
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    title="Send message"
                  >
                    {loading ? '⏳' : '➤'}
                  </button>
                </div>
              </div>
              
              {/* Upload Status */}
              {uploading && (
                <div className="upload-status-fixed">
                  📤 Uploading file...
                </div>
              )}
            </div>
          </div>
        ) : tab === 'search' ? (
          <div className="section-view">
            <div className="section-header">
              <h2>🔍 Search Chat History</h2>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <button className="clear-chat-btn" onClick={refreshCurrentTab} title="Refresh">
                  ↻ Refresh
                </button>
                <input 
                  className="search-input"
                  placeholder="Search your conversations..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {searchResults.length === 0 && searchQuery.length > 2 ? (
              <div className="empty-state">
                <div className="icon">🔍</div>
                <p>No conversations found matching "{searchQuery}"</p>
              </div>
            ) : searchQuery.length <= 2 ? (
              <div className="empty-state">
                <div className="icon">💬</div>
                <p>Enter at least 3 characters to search your chat history</p>
              </div>
            ) : (
              <div className="search-results">
                {searchResults.map(result => (
                  <div key={result.id} className="search-result-item">
                    <div className="search-result-header">
                      <span className={`result-role ${result.role}`}>
                        {result.role === 'user' ? '👤 You' : '🤖 AI'}
                      </span>
                      <span className="result-date">{new Date(result.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="result-content">{result.content}</div>
                    <button 
                      className="use-in-chat-btn"
                      onClick={() => {
                        setTab('chat');
                        setInput(result.content);
                      }}
                    >
                      💬 Use in Chat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'faqs' ? (
          <div className="section-view">
            <div className="section-header">
              <h2>📚 Frequently Asked Questions</h2>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <button className="clear-chat-btn" onClick={refreshCurrentTab} title="Refresh">
                  ↻ Refresh
                </button>
                <select 
                  className="category-select"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {faqCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <input 
                  className="faq-search"
                  placeholder="Search FAQs..."
                  value={faqSearch}
                  onChange={e => setFaqSearch(e.target.value)}
                />
              </div>
            </div>
            
            {faqs.length === 0 ? (
              <div className="empty-state">
                <div className="icon">❓</div>
                <p>No FAQs found. Try adjusting your search or category filter.</p>
              </div>
            ) : (
              <div className="faqs-list">
                {faqs.map(faq => (
                  <div key={faq.id} className="faq-item">
                    <div className="faq-header">
                      <span className="faq-category">{faq.category}</span>
                      <div className="faq-stats">
                        <span>👁 {faq.view_count}</span>
                        <span>👍 {faq.helpful_count}</span>
                        <span>👎 {faq.not_helpful_count}</span>
                      </div>
                    </div>
                    <h3 className="faq-question">{faq.question}</h3>
                    <div className="faq-answer">{faq.answer}</div>
                    <div className="faq-actions">
                      <span style={{fontSize:13,color:'var(--text-dim)'}}>Was this helpful?</span>
                      <button 
                        className="faq-feedback-btn helpful"
                        onClick={() => provideFaqFeedback(faq.id, true)}
                      >
                        👍 Yes
                      </button>
                      <button 
                        className="faq-feedback-btn not-helpful"
                        onClick={() => provideFaqFeedback(faq.id, false)}
                      >
                        👎 No
                      </button>
                      <button 
                        className="faq-chat-btn"
                        onClick={() => {
                          setTab('chat');
                          setInput(faq.question);
                        }}
                      >
                        💬 Ask AI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="section-view">
            <div className="section-header">
              <h2>My Support Tickets</h2>
              <button className="clear-chat-btn" onClick={refreshCurrentTab}>↻ Refresh</button>
            </div>
            {tickets.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🎫</div>
                <p>No tickets yet. Tickets are created automatically when the AI escalates your issue.</p>
              </div>
            ) : tickets.map(t => (
              <div key={t.id} className={`ticket-card ${t.is_urgent ? 'urgent' : ''}`}>
                <div className="ticket-top">
                  <span className="ticket-id-badge">#{t.id}</span>
                  <div className="ticket-tags">
                    <span className={`status-badge status-${t.status?.replace(' ', '_')}`}>{t.status}</span>
                    {t.is_urgent ? <span className="urgent-badge">🚨 Urgent</span> : null}
                  </div>
                </div>
                <p className="ticket-msg">"{t.message}"</p>
                <span className="ticket-time">{t.created_at}</span>
                {t.admin_reply && (
                  <div className="admin-reply-box">
                    <h4>💬 Admin Reply {t.reply_timestamp ? `· ${t.reply_timestamp}` : ''}</h4>
                    <p>{t.admin_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
