import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const authH = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('user_token')}` });

// Satisfaction Survey Component
function SatisfactionSurveyForm({ ticket, onSubmit, onCancel }) {
  const [ratings, setRatings] = useState({
    satisfaction_rating: 5,
    resolution_rating: 5,
    speed_rating: 5,
    would_recommend: true,
    comments: ''
  });

  const handleSubmit = () => {
    onSubmit({
      ticket_id: ticket.id,
      ...ratings
    });
  };

  const StarRating = ({ value, onChange, label }) => (
    <div className="star-rating-group">
      <label>{label}</label>
      <div className="star-rating">
        {[1,2,3,4,5].map(star => (
          <button
            key={star}
            type="button"
            className={`star ${star <= value ? 'filled' : ''}`}
            onClick={() => onChange(star)}
          >
            ⭐
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="survey-form">
      <StarRating 
        value={ratings.satisfaction_rating}
        onChange={(val) => setRatings({...ratings, satisfaction_rating: val})}
        label="Overall Satisfaction"
      />
      <StarRating 
        value={ratings.resolution_rating}
        onChange={(val) => setRatings({...ratings, resolution_rating: val})}
        label="Problem Resolution"
      />
      <StarRating 
        value={ratings.speed_rating}
        onChange={(val) => setRatings({...ratings, speed_rating: val})}
        label="Response Speed"
      />
      
      <div className="form-group">
        <label className="checkbox-label">
          <input 
            type="checkbox"
            checked={ratings.would_recommend}
            onChange={e => setRatings({...ratings, would_recommend: e.target.checked})}
          />
          I would recommend this service to others
        </label>
      </div>

      <div className="form-group">
        <label>Additional Comments (Optional)</label>
        <textarea 
          value={ratings.comments}
          onChange={e => setRatings({...ratings, comments: e.target.value})}
          placeholder="Tell us more about your experience..."
          rows={3}
        />
      </div>

      <div className="modal-actions">
        <button className="btn-cancel" onClick={onCancel}>Skip</button>
        <button className="btn-primary" onClick={handleSubmit}>Submit Feedback</button>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const [tab, setTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);
  const [hasNewReply, setHasNewReply] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showRating, setShowRating] = useState({});
  const [faqs, setFaqs] = useState([]);
  const [faqCategories, setFaqCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [faqSearch, setFaqSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userPreferences, setUserPreferences] = useState({});
  const [showPreferences, setShowPreferences] = useState(false);
  const [surveyTicket, setSurveyTicket] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  // File drag and drop states
  const [dragOver, setDragOver] = useState(false);
  const [translations, setTranslations] = useState({});
  const endRef = useRef(null);
  const nav = useNavigate();

  const name = localStorage.getItem('user_name') || 'User';
  const email = localStorage.getItem('user_email') || '';

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (tab === 'tickets' && !ticketsLoaded) loadTickets();
    if (tab === 'faqs') loadFaqs();
  }, [tab]);

  // Comprehensive refresh function for current tab
  const refreshCurrentTab = async () => {
    switch(tab) {
      case 'chat':
        // Refresh notifications and user preferences
        await loadNotifications();
        await loadUserPreferences();
        break;
      case 'search':
        // Re-perform search if there's an active query
        if (searchQuery.length > 2) {
          await performChatSearch();
        }
        break;
      case 'faqs':
        await loadFaqs();
        break;
      case 'tickets':
        await loadTickets();
        break;
      default:
        // Default refresh for chat
        await loadNotifications();
        await loadUserPreferences();
        break;
    }
  };

  // Smart suggestions as user types
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

  // FAQ search effect
  useEffect(() => {
    if (tab === 'faqs') {
      const debounce = setTimeout(() => {
        loadFaqs();
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [faqSearch, selectedCategory]);

  // Chat search effect
  useEffect(() => {
    if (searchQuery.length > 2) {
      const debounce = setTimeout(() => {
        performChatSearch();
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

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
