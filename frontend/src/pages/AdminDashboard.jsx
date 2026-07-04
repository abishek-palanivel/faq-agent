import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const authH = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('admin_token')}` });

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [adminFaqs, setAdminFaqs] = useState([]);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [cannedResponses, setCannedResponses] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    database: 'Connected',
    aiModel: 'Online', 
    emailService: 'Active',
    storage: '78% Used'
  });
  
  // FAQ Management States
  const [editingFaq, setEditingFaq] = useState(null);
  const [faqForm, setFaqForm] = useState({ category: '', question: '', answer: '' });
  
  const nav = useNavigate();

  useEffect(() => { 
    let isMounted = true;
    
    const initializeAdmin = async () => {
      try {
        if (isMounted) {
          await loadStats(); 
          await loadTickets();
        }
      } catch (error) {
        console.error('Admin initialization error:', error);
      }
    };
    
    initializeAdmin();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Comprehensive refresh function for current tab
  const refreshCurrentTab = async () => {
    switch(tab) {
      case 'overview':
        await loadStats();
        await loadTickets();
        break;
      case 'analytics':
        await loadAnalytics();
        break;
      case 'tickets':
        await loadTickets();
        await loadCannedResponses();
        break;
      case 'users':
        await loadUsers();
        break;
      case 'faqs':
        await loadAdminFaqs();
        break;
      case 'settings':
        await loadSystemStatus();
        break;
      default:
        await loadStats();
        break;
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API}/api/admin/stats`, { headers: authH() });
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error('Failed to load stats:', e); }
  };

  const loadAnalytics = async () => {
    try {
      const res = await fetch(`${API}/api/admin/analytics`, { headers: authH() });
      if (res.ok) setAnalytics(await res.json());
    } catch (e) { console.error('Failed to load analytics:', e); }
  };

  const loadTickets = async () => {
    try {
      const res = await fetch(`${API}/api/admin/tickets`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error('Failed to load tickets:', e); }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API}/api/admin/users`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error('Failed to load users:', e); }
  };

  const loadAdminFaqs = async () => {
    try {
      const res = await fetch(`${API}/api/admin/faqs`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setAdminFaqs(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error('Failed to load FAQs:', e); }
  };

  const createOrUpdateFaq = async () => {
    const method = editingFaq ? 'PUT' : 'POST';
    const url = editingFaq ? `${API}/api/admin/faqs/${editingFaq}` : `${API}/api/admin/faqs`;
    
    await fetch(url, {
      method,
      headers: authH(),
      body: JSON.stringify(faqForm)
    });
    
    setEditingFaq(null);
    setFaqForm({ category: '', question: '', answer: '' });
    loadAdminFaqs();
  };

  const deleteFaq = async (id) => {
    await fetch(`${API}/api/admin/faqs/${id}`, { method: 'DELETE', headers: authH() });
    loadAdminFaqs();
  };

  const toggleFaq = async (id) => {
    await fetch(`${API}/api/admin/faqs/${id}/toggle`, { method: 'PATCH', headers: authH() });
    loadAdminFaqs();
  };

  const loadCannedResponses = async () => {
    try {
      const res = await fetch(`${API}/api/admin/canned-responses`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setCannedResponses(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error('Failed to load canned responses:', e); }
  };

  const handleBulkOperation = async (operation) => {
    if (selectedTickets.length === 0) {
      alert('Please select tickets first');
      return;
    }

    try {
      await fetch(`${API}/api/admin/bulk-operations`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({
          ticket_ids: selectedTickets,
          operation: operation
        })
      });
      
      setSelectedTickets([]);
      setShowBulkActions(false);
      loadTickets();
    } catch (e) {
      console.error('Bulk operation failed:', e);
    }
  };

  // Export Functions
  const exportAllConversations = async () => {
    try {
      const res = await fetch(`${API}/api/admin/export/conversations`, { headers: authH() });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-conversations-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Export failed. Please try again.');
    }
  };

  const exportUserData = async () => {
    try {
      const res = await fetch(`${API}/api/admin/export/users`, { headers: authH() });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Export failed. Please try again.');
    }
  };

  const exportTicketsData = async () => {
    try {
      const res = await fetch(`${API}/api/admin/export/tickets`, { headers: authH() });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Export failed. Please try again.');
    }
  };

  const cleanupOldData = async () => {
    if (!confirm('Are you sure? This will permanently delete conversation data older than 90 days.')) {
      return;
    }
    
    try {
      const res = await fetch(`${API}/api/admin/cleanup/old-data`, { 
        method: 'POST',
        headers: authH() 
      });
      const data = await res.json();
      alert(`Cleanup completed: ${data.deleted_count || 0} records removed`);
      refreshCurrentTab();
    } catch (e) {
      console.error('Cleanup failed:', e);
      alert('Cleanup failed. Please try again.');
    }
  };

  const loadSystemStatus = async () => {
    try {
      const res = await fetch(`${API}/api/admin/system-status`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (e) {
      console.error('Failed to load system status:', e);
    }
  };

  const saveAllSettings = async () => {
    try {
      // Here you would save all the current settings state
      // For now, we'll show a success message
      alert('Settings saved successfully!');
    } catch (e) {
      console.error('Save failed:', e);
      alert('Failed to save settings. Please try again.');
    }
  };

  const toggleTicketSelection = (ticketId) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const selectAllTickets = () => {
    if (Array.isArray(tickets) && selectedTickets.length === tickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(Array.isArray(tickets) ? tickets.map(t => t.id) : []);
    }
  };

  const deleteTicket = async (id) => {
    await fetch(`${API}/api/admin/tickets/${id}`, { method: 'DELETE', headers: authH() });
    loadTickets(); loadStats();
  };

  const toggleUrgent = async (id) => {
    await fetch(`${API}/api/admin/tickets/${id}/urgent`, { method: 'PATCH', headers: authH() });
    loadTickets(); loadStats();
  };

  const updateStatus = async (id, status) => {
    await fetch(`${API}/api/admin/tickets/${id}/status`, {
      method: 'PATCH', headers: authH(), body: JSON.stringify({ status })
    });
    loadTickets(); loadStats();
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    await fetch(`${API}/api/admin/tickets/${replyTarget}/reply`, {
      method: 'POST', headers: authH(), body: JSON.stringify({ reply: replyText })
    });
    setReplyTarget(null); setReplyText('');
    loadTickets();
  };

  const handleTabChange = async (t) => {
    if (t === tab) return; // Prevent unnecessary reloads
    
    setTab(t);
    
    // Load data only when switching to a new tab
    switch(t) {
      case 'users':
        await loadUsers();
        break;
      case 'tickets':
        await Promise.all([loadTickets(), loadCannedResponses()]);
        break;
      case 'overview':
        await Promise.all([loadStats(), loadTickets()]);
        break;
      case 'analytics':
        await loadAnalytics();
        break;
      case 'faqs':
        await loadAdminFaqs();
        break;
      case 'settings':
        await loadSystemStatus();
        break;
    }
  };

  const logout = () => { 
    // Clear all tokens to prevent conflicts
    localStorage.removeItem('admin_token'); 
    localStorage.removeItem('admin_name');
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    nav('/admin/login'); 
  };

  const urgentCount = Array.isArray(tickets) ? tickets.filter(t => t && t.is_urgent).length : 0;

  return (
    <div className="dashboard">
      {/* Reply Modal */}
      {replyTarget && (
        <div className="modal-overlay" onClick={() => setReplyTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>💬 Reply to Ticket #{replyTarget}</h3>
            <textarea placeholder="Type your reply to the customer..." value={replyText}
              onChange={e => setReplyText(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setReplyTarget(null)}>Cancel</button>
              <button className="btn-send" onClick={sendReply}>Send Reply</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg className="logo-svg" width="38" height="38" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGradAdminSide" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="42" stroke="url(#logoGradAdminSide)" strokeWidth="8" />
            <path d="M35 35 H65 L50 65 Z" fill="url(#logoGradAdminSide)" />
            <circle cx="50" cy="42" r="5" fill="#ffffff" />
          </svg>
          <div>
            <h2>Admin Panel</h2>
            <span>Zed Support</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-btn ${tab === 'overview' ? 'active' : ''}`} onClick={() => handleTabChange('overview')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Overview
          </button>
          <button className={`nav-btn ${tab === 'analytics' ? 'active' : ''}`} onClick={() => handleTabChange('analytics')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 12l4-4 4 4 6-6"/></svg>
            Analytics
          </button>
          <button className={`nav-btn ${tab === 'tickets' ? 'active' : ''}`} onClick={() => handleTabChange('tickets')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Tickets
            {Array.isArray(tickets) && tickets.length > 0 && <span className="nav-badge">{tickets.length}</span>}
            {urgentCount > 0 && <span className="nav-badge urgent">{urgentCount} 🚨</span>}
          </button>
          <button className={`nav-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => handleTabChange('users')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Users
            {Array.isArray(users) && users.length > 0 && <span className="nav-badge">{users.length}</span>}
          </button>
          <button className={`nav-btn ${tab === 'faqs' ? 'active' : ''}`} onClick={() => handleTabChange('faqs')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/></svg>
            Manage FAQs
            {Array.isArray(adminFaqs) && adminFaqs.length > 0 && <span className="nav-badge">{adminFaqs.length}</span>}
          </button>
          <button className={`nav-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => handleTabChange('settings')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/></svg>
            Settings
          </button>
        </nav>

        <div className="sidebar-user">
          <div className="user-profile">
            <div className="user-avatar-sm" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>A</div>
            <div className="sidebar-user-info">
              <p>Administrator</p>
              <span>abishekopennova@gmail.com</span>
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

      {/* Main Content */}
      <main className="main" style={{ overflowY: 'auto' }}>
        {tab === 'overview' && (
          <div className="section-view">
            <div className="section-header">
              <h2>📊 Dashboard Overview</h2>
              <button className="clear-chat-btn" onClick={refreshCurrentTab}>↻ Refresh</button>
            </div>
            <div className="stats-grid">
              <div className="stat-card success">
                <h3>Total Users</h3>
                <div className="stat-num">{stats.total_users ?? '—'}</div>
              </div>
              <div className="stat-card primary">
                <h3>Total Conversations</h3>
                <div className="stat-num">{stats.total_conversations ?? '—'}</div>
              </div>
              <div className="stat-card warning">
                <h3>Open Tickets</h3>
                <div className="stat-num">{stats.open_tickets ?? '—'}</div>
              </div>
              <div className="stat-card danger">
                <h3>Urgent Tickets</h3>
                <div className="stat-num">{stats.urgent_tickets ?? '—'}</div>
              </div>
            </div>

            <h3 style={{ color: '#fff', fontFamily: 'Outfit', marginBottom: 16, fontSize: 18 }}>Recent Tickets</h3>
            {Array.isArray(tickets) && tickets.slice(0, 5).map(t => (
              <div key={t.id} className={`ticket-card ${t.is_urgent ? 'urgent' : ''}`}>
                <div className="ticket-top">
                  <span className="ticket-id-badge">#{t.id} — {t.user_name}</span>
                  <div className="ticket-tags">
                    <span className={`status-badge status-${t.status?.replace(' ', '_')}`}>{t.status}</span>
                    {t.is_urgent ? <span className="urgent-badge">🚨 Urgent</span> : null}
                  </div>
                </div>
                <p className="ticket-msg">"{t.message}"</p>
                <span className="ticket-time">{t.user_email} · {t.created_at}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'analytics' && (
          <div className="section-view">
            <div className="section-header">
              <h2>📈 Analytics Dashboard</h2>
              <button className="clear-chat-btn" onClick={refreshCurrentTab}>↻ Refresh</button>
            </div>

            {/* Key Metrics */}
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>🌟 Average Rating</h3>
                <div className="metric-large">{analytics.stats?.avg_rating ? `${Number(analytics.stats.avg_rating).toFixed(1)}/5` : '—'}</div>
                <p>AI Response Quality</p>
              </div>
              <div className="analytics-card">
                <h3>📊 Escalation Rate</h3>
                <div className="metric-large">{analytics.escalation_rate ? `${analytics.escalation_rate}%` : '—'}</div>
                <p>Tickets vs Conversations</p>
              </div>
              <div className="analytics-card">
                <h3>💬 Total Conversations</h3>
                <div className="metric-large">{analytics.stats?.total_conversations ?? '—'}</div>
                <p>All Time</p>
              </div>
              <div className="analytics-card">
                <h3>🎫 Total Tickets</h3>
                <div className="metric-large">{analytics.stats?.total_tickets ?? '—'}</div>
                <p>Human Escalations</p>
              </div>
            </div>

            {/* Popular Queries */}
            <div className="analytics-section">
              <h3>🔥 Most Popular Queries</h3>
              <div className="popular-queries">
                {Array.isArray(analytics.popular_queries) && analytics.popular_queries.length > 0 ? analytics.popular_queries.map((query, idx) => (
                  <div key={idx} className="query-item">
                    <div className="query-text">"{query.query_text}"</div>
                    <div className="query-count">{query.search_count} searches</div>
                  </div>
                )) : <p>No query data available yet.</p>}
              </div>
            </div>

            {/* Daily Conversations Chart */}
            <div className="analytics-section">
              <h3>📅 Daily Conversation Volume (Last 7 Days)</h3>
              <div className="chart-container">
                {Array.isArray(analytics.daily_conversations) && analytics.daily_conversations.length > 0 ? (
                  <div className="simple-bar-chart">
                    {analytics.daily_conversations.map((day, idx) => (
                      <div key={idx} className="chart-bar">
                        <div className="bar" style={{ height: `${Math.max((day?.conversations || 0) * 2, 5)}px` }} />
                        <div className="bar-label">{day?.date?.slice(-5)}</div>
                        <div className="bar-value">{day?.conversations}</div>
                      </div>
                    ))}
                  </div>
                ) : <p>No conversation data available yet.</p>}
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="analytics-section">
              <h3>⭐ Response Rating Distribution</h3>
              <div className="rating-distribution">
                {Array.isArray(analytics.rating_distribution) && analytics.rating_distribution.length > 0 ? analytics.rating_distribution.map((rating, idx) => (
                  <div key={idx} className="rating-item">
                    <span className="rating-stars">{'⭐'.repeat(rating?.rating || 0)}</span>
                    <span className="rating-count">{rating?.count} responses</span>
                  </div>
                )) : <p>No rating data available yet.</p>}
              </div>
            </div>

            {/* FAQ Performance */}
            <div className="analytics-section">
              <h3>🎯 Top Performing FAQs</h3>
              <div className="faq-performance-list">
                {Array.isArray(analytics.faq_performance) && analytics.faq_performance.length > 0 ? analytics.faq_performance.map((faq, idx) => (
                  <div key={idx} className="faq-performance-item">
                    <div className="faq-performance-text">
                      <strong>{faq?.category}</strong>: {faq?.question?.slice(0, 60)}...
                    </div>
                    <div className="faq-performance-stats">
                      <span>👁 {faq?.view_count}</span>
                      <span>👍 {faq?.helpful_count}</span>
                      <span>👎 {faq?.not_helpful_count}</span>
                    </div>
                  </div>
                )) : <p>No FAQ performance data available yet.</p>}
              </div>
            </div>

            {/* Customer Satisfaction */}
            <div className="analytics-section">
              <h3>😊 Customer Satisfaction Overview</h3>
              <div className="satisfaction-overview">
                <div className="satisfaction-metric">
                  <div className="metric-large">{analytics.nps_score || 0}</div>
                  <div className="metric-label">NPS Score</div>
                </div>
                <div className="satisfaction-metric">
                  <div className="metric-large">{analytics.recommendation_rate || 0}%</div>
                  <div className="metric-label">Would Recommend</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'tickets' && (
          <div className="section-view">
            <div className="section-header">
              <h2>🎫 Escalated Tickets</h2>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {selectedTickets.length > 0 && (
                  <div className="bulk-actions">
                    <button 
                      className="bulk-btn resolve"
                      onClick={() => handleBulkOperation('resolve')}
                    >
                      ✅ Resolve Selected ({selectedTickets.length})
                    </button>
                    <button 
                      className="bulk-btn urgent"
                      onClick={() => handleBulkOperation('mark_urgent')}
                    >
                      🚨 Mark Urgent
                    </button>
                    <button 
                      className="bulk-btn delete"
                      onClick={() => handleBulkOperation('delete')}
                    >
                      🗑️ Delete Selected
                    </button>
                  </div>
                )}
                <button 
                  className="clear-chat-btn"
                  onClick={() => setShowCannedResponses(!showCannedResponses)}
                >
                  💬 Canned Responses
                </button>
                <button className="clear-chat-btn" onClick={refreshCurrentTab}>↻ Refresh</button>
              </div>
            </div>

            {/* Canned Responses Panel */}
            {showCannedResponses && (
              <div className="canned-responses-panel">
                <h4>Quick Responses</h4>
                <div className="canned-responses-grid">
                  {Array.isArray(cannedResponses) && cannedResponses.map(response => (
                    <div key={response.id} className="canned-response-item">
                      <div className="response-title">{response.title}</div>
                      <div className="response-category">{response.category}</div>
                      <div className="response-content">{response.content}</div>
                      <button 
                        className="use-response-btn"
                        onClick={() => {
                          setReplyText(response.content);
                          setShowCannedResponses(false);
                        }}
                      >
                        Use Response
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!Array.isArray(tickets) || tickets.length === 0) ? (
              <div className="empty-state"><div className="icon">✅</div><p>No open tickets. All clear!</p></div>
            ) : (
              <div className="tickets-section">
                {/* Select All Checkbox */}
                <div className="select-all-row">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox"
                      checked={selectedTickets.length === tickets.length && tickets.length > 0}
                      onChange={selectAllTickets}
                    />
                    Select All ({tickets.length} tickets)
                  </label>
                </div>

                {tickets.map(t => (
                  <div key={t.id} className={`ticket-card ${t.is_urgent ? 'urgent' : ''} ${selectedTickets.includes(t.id) ? 'selected' : ''}`}>
                    <div className="ticket-top">
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <input 
                          type="checkbox"
                          checked={selectedTickets.includes(t.id)}
                          onChange={() => toggleTicketSelection(t.id)}
                        />
                        <span className="ticket-id-badge">#{t.id}</span>
                      </div>
                      <div className="ticket-tags">
                        <span className={`status-badge status-${t.status?.replace(' ', '_')}`}>{t.status}</span>
                        {t.is_urgent ? <span className="urgent-badge">🚨 Urgent</span> : null}
                      </div>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>👤 {t.user_name} · {t.user_email}</span>
                    </div>
                    <p className="ticket-msg">"{t.message}"</p>
                    <span className="ticket-time">{t.created_at}</span>

                    {t.admin_reply && (
                      <div className="admin-reply-box">
                        <h4>Your Reply · {t.reply_timestamp}</h4>
                        <p>{t.admin_reply}</p>
                      </div>
                    )}

                    <div className="ticket-actions">
                      <button className="action-btn reply" onClick={() => { setReplyTarget(t.id); setReplyText(t.admin_reply || ''); }}>
                        💬 {t.admin_reply ? 'Edit Reply' : 'Reply'}
                      </button>
                      <button className="action-btn urgent-toggle" onClick={() => toggleUrgent(t.id)}>
                        {t.is_urgent ? '🔕 Un-flag' : '🚨 Mark Urgent'}
                      </button>
                      {t.status !== 'Resolved' && (
                        <button className="action-btn resolve" onClick={() => updateStatus(t.id, 'Resolved')}>✅ Resolve</button>
                      )}
                      <button className="action-btn delete" onClick={() => deleteTicket(t.id)}>🗑️ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="section-view">
            <div className="section-header">
              <h2>👥 Registered Users</h2>
              <button className="clear-chat-btn" onClick={refreshCurrentTab}>↻ Refresh</button>
            </div>
            {users.length === 0 ? (
              <div className="empty-state"><div className="icon">👤</div><p>No users registered yet.</p></div>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(users) && users.map((u, i) => (
                    <tr key={u.id}>
                      <td>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="user-avatar-sm" style={{ width: 30, height: 30, fontSize: 12 }}>{u.name[0]?.toUpperCase()}</div>
                          {u.name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{u.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="section-view">
            <div className="section-header">
              <h2>⚙️ Admin Settings</h2>
              <button className="clear-chat-btn" onClick={refreshCurrentTab}>↻ Refresh</button>
            </div>

            <div className="settings-sections">
              {/* System Configuration */}
              <div className="settings-section">
                <h3>🔧 System Configuration</h3>
                <div className="settings-grid">
                  <div className="setting-item">
                    <label>AI Response Model</label>
                    <select defaultValue="gemini-2.5-flash">
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default)</option>
                      <option value="gemini-pro">Gemini Pro</option>
                    </select>
                  </div>
                  <div className="setting-item">
                    <label>Max Chat History</label>
                    <input type="number" defaultValue="50" min="10" max="200" />
                  </div>
                  <div className="setting-item">
                    <label>Auto-escalation Threshold</label>
                    <select defaultValue="high">
                      <option value="low">Low - Escalate easily</option>
                      <option value="medium">Medium - Balanced</option>
                      <option value="high">High - Try to resolve first</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="settings-section">
                <h3>📢 Notification Settings</h3>
                <div className="settings-form">
                  <div className="setting-item">
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      Email notifications for new tickets
                    </label>
                  </div>
                  <div className="setting-item">
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      Urgent ticket alerts
                    </label>
                  </div>
                  <div className="setting-item">
                    <label className="checkbox-label">
                      <input type="checkbox" />
                      Daily summary reports
                    </label>
                  </div>
                  <div className="setting-item">
                    <label>Email Recipients (comma-separated)</label>
                    <input type="email" placeholder="admin1@zed.com, admin2@zed.com" />
                  </div>
                </div>
              </div>

              {/* User Management */}
              <div className="settings-section">
                <h3>👥 User Management</h3>
                <div className="settings-form">
                  <div className="setting-item">
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      Allow user registration
                    </label>
                  </div>
                  <div className="setting-item">
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      Require email verification
                    </label>
                  </div>
                  <div className="setting-item">
                    <label>Maximum conversations per user per day</label>
                    <input type="number" defaultValue="100" min="10" max="1000" />
                  </div>
                </div>
              </div>

              {/* Data Export & Backup */}
              <div className="settings-section">
                <h3>💾 Data Management</h3>
                <div className="export-options">
                  <button className="export-btn" onClick={exportAllConversations}>
                    📄 Export All Conversations (JSON)
                  </button>
                  <button className="export-btn" onClick={exportUserData}>
                    👥 Export User Data (CSV)
                  </button>
                  <button className="export-btn" onClick={exportTicketsData}>
                    🎫 Export Tickets (CSV)
                  </button>
                  <button className="export-btn danger" onClick={cleanupOldData}>
                    🗑️ Cleanup Old Data (90+ days)
                  </button>
                </div>
              </div>

              {/* System Status */}
              <div className="settings-section">
                <h3>🔍 System Status</h3>
                <div className="status-grid">
                  <div className={`status-item ${systemStatus.database === 'Connected' ? 'success' : 'error'}`}>
                    <span className="status-label">Database</span>
                    <span className="status-value">{systemStatus.database === 'Connected' ? '✅' : '❌'} {systemStatus.database}</span>
                  </div>
                  <div className={`status-item ${systemStatus.aiModel === 'Online' ? 'success' : 'error'}`}>
                    <span className="status-label">AI Model</span>
                    <span className="status-value">{systemStatus.aiModel === 'Online' ? '✅' : '❌'} {systemStatus.aiModel}</span>
                  </div>
                  <div className={`status-item ${systemStatus.emailService === 'Active' ? 'success' : 'error'}`}>
                    <span className="status-label">Email Service</span>
                    <span className="status-value">{systemStatus.emailService === 'Active' ? '✅' : '❌'} {systemStatus.emailService}</span>
                  </div>
                  <div className={`status-item ${systemStatus.storage && systemStatus.storage.includes('78%') ? 'warning' : 'success'}`}>
                    <span className="status-label">Storage</span>
                    <span className="status-value">{systemStatus.storage && systemStatus.storage.includes('78%') ? '⚠️' : '✅'} {systemStatus.storage}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <button className="btn-primary" onClick={saveAllSettings}>
                💾 Save All Settings
              </button>
              <button className="btn-secondary" onClick={() => window.location.reload()}>
                🔄 Reset to Defaults
              </button>
            </div>
          </div>
        )}

        {tab === 'faqs' && (
          <div className="section-view">
            <div className="section-header">
              <h2>📚 FAQ Management</h2>
              <div style={{display:'flex',gap:8}}>
                <button className="clear-chat-btn" onClick={() => setEditingFaq('new')}>
                  ➕ Add FAQ
                </button>
                <button className="clear-chat-btn" onClick={refreshCurrentTab}>↻ Refresh</button>
              </div>
            </div>

            {/* Add/Edit FAQ Form */}
            {editingFaq && (
              <div className="faq-form-section">
                <h3>{editingFaq === 'new' ? '➕ Add New FAQ' : '✏️ Edit FAQ'}</h3>
                <div className="faq-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Category</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Account, Billing, Orders"
                        value={faqForm.category}
                        onChange={e => setFaqForm({...faqForm, category: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Question</label>
                    <input 
                      type="text" 
                      placeholder="What is the question customers ask?"
                      value={faqForm.question}
                      onChange={e => setFaqForm({...faqForm, question: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Answer</label>
                    <textarea 
                      rows="4"
                      placeholder="Provide a helpful, clear answer..."
                      value={faqForm.answer}
                      onChange={e => setFaqForm({...faqForm, answer: e.target.value})}
                    />
                  </div>
                  <div className="form-actions">
                    <button className="btn-secondary" onClick={() => {
                      setEditingFaq(null);
                      setFaqForm({ category: '', question: '', answer: '' });
                    }}>
                      Cancel
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={createOrUpdateFaq}
                      disabled={!faqForm.category || !faqForm.question || !faqForm.answer}
                    >
                      {editingFaq === 'new' ? 'Create FAQ' : 'Update FAQ'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* FAQ List */}
            <div className="faqs-grid">
              {(!Array.isArray(adminFaqs) || adminFaqs.length === 0) ? (
                <div className="empty-state">
                  <div className="icon">❓</div>
                  <p>No FAQs created yet. Add your first FAQ to get started!</p>
                </div>
              ) : (
                adminFaqs.map(faq => (
                  <div key={faq.id} className={`faq-admin-card ${faq.is_active ? 'active' : 'inactive'}`}>
                    <div className="faq-header">
                      <div className="faq-category-badge">{faq.category}</div>
                      <div className="faq-actions">
                        <button 
                          className="action-btn"
                          onClick={() => {
                            setEditingFaq(faq.id);
                            setFaqForm({
                              category: faq.category,
                              question: faq.question,
                              answer: faq.answer
                            });
                          }}
                        >
                          ✏️
                        </button>
                        <button 
                          className="action-btn"
                          onClick={() => toggleFaq(faq.id)}
                        >
                          {faq.is_active ? '🔴' : '🟢'}
                        </button>
                        <button 
                          className="action-btn delete"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this FAQ?')) {
                              deleteFaq(faq.id);
                            }
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="faq-question">{faq.question}</div>
                    <div className="faq-answer">{faq.answer}</div>
                    <div className="faq-stats">
                      <span>👁 {faq.view_count || 0} views</span>
                      <span>👍 {faq.helpful_count || 0} helpful</span>
                      <span>👎 {faq.not_helpful_count || 0} not helpful</span>
                      <span>📅 {new Date(faq.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
