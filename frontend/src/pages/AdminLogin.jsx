import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    // Clear any existing sessions when accessing admin login
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_name');
    
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      nav('/admin/dashboard');
    }
  }, [nav]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid admin credentials');
      
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_name'); 
      localStorage.removeItem('user_email');
      
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_name', data.name);
      
      nav('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page admin-auth">
      <div className="auth-card admin-card">
        <div className="auth-logo">
          {/* Admin SVG Logo */}
          <svg className="logo-svg" width="56" height="56" viewBox="0 0 56 56" fill="none">
            <defs>
              <linearGradient id="adminGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ef4444"/>
                <stop offset="1" stopColor="#f97316"/>
              </linearGradient>
            </defs>
            <rect width="56" height="56" rx="16" fill="url(#adminGrad)"/>
            <path d="M28 14l12 10v14H16V24l12-10z" fill="white" opacity="0.9"/>
            <rect x="24" y="30" width="8" height="8" rx="1" fill="url(#adminGrad)"/>
            <circle cx="28" cy="24" r="3" fill="url(#adminGrad)"/>
          </svg>
          <h1>Admin Portal</h1>
          <p>Zed AI Support Management</p>
        </div>
        
        <div className="auth-admin-badge">
          🔒 Restricted Access — Administrators Only
        </div>
        
        {error && <div className="auth-error">⚠️ {error}</div>}
        
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Admin Email</label>
            <input 
              type="email" 
              placeholder="admin@example.com" 
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} 
              required 
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Admin Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} 
              required 
              autoComplete="current-password"
            />
          </div>
          
          <button className="btn-primary admin-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Authenticating...
              </>
            ) : 'Access Admin Dashboard'}
          </button>
        </form>

        <div className="admin-features">
          <h4>Admin Dashboard Features:</h4>
          <div className="features-grid">
            <span>📊 Analytics</span>
            <span>🎫 Tickets</span>
            <span>👥 Users</span>
            <span>🤖 AI Training</span>
            <span>📝 FAQ Mgmt</span>
            <span>⚙️ Settings</span>
          </div>
        </div>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-footer">
          <Link to="/login">← Back to Customer Login</Link>
        </div>

        <div className="auth-footer" style={{marginTop: '8px'}}>
          <span className="security-note">🛡️ Secure Admin Access</span>
        </div>
      </div>
    </div>
  );
}
