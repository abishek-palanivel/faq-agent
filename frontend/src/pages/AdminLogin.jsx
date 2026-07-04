import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDefaultCredentials, setShowDefaultCredentials] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    // Clear any existing sessions when accessing admin login
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_name');
    
    // Check if already logged in as admin
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
      
      // Clear any existing user tokens to prevent conflicts
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_name'); 
      localStorage.removeItem('user_email');
      
      // Set admin tokens
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_name', data.name);
      
      nav('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const fillDefaultCredentials = () => {
    setForm({
      email: 'abishekopennova@gmail.com',
      password: 'abi@1234'
    });
  };

  return (
    <div className="auth-page admin-auth">
      <div className="auth-card admin-card">
        <div className="auth-logo">
          <div className="logo-mark admin-logo">A</div>
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

        {process.env.NODE_ENV === 'development' && (
          <div className="dev-helpers">
            <button 
              type="button" 
              className="dev-fill-btn"
              onClick={fillDefaultCredentials}
            >
              🔧 Fill Default Credentials
            </button>
            <button 
              type="button"
              className="dev-info-btn"
              onClick={() => setShowDefaultCredentials(!showDefaultCredentials)}
            >
              ℹ️ Show Credentials
            </button>
            
            {showDefaultCredentials && (
              <div className="default-credentials">
                <h4>Default Admin Credentials:</h4>
                <p><strong>Email:</strong> abishekopennova@gmail.com</p>
                <p><strong>Password:</strong> abi@1234</p>
              </div>
            )}
          </div>
        )}

        <div className="admin-features">
          <h4>Admin Dashboard Features:</h4>
          <ul>
            <li>📊 Advanced Analytics</li>
            <li>🎫 Ticket Management</li>
            <li>👥 User Administration</li>
            <li>🤖 AI Training & Monitoring</li>
            <li>📝 FAQ Management</li>
            <li>⚙️ System Configuration</li>
          </ul>
        </div>

        <div className="auth-footer">
          <Link to="/login">← Back to Customer Login</Link>
          <span className="security-note">🛡️ Secure Admin Access</span>
        </div>
      </div>
    </div>
  );
}
