import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function UserLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('user_token');
    if (token) {
      nav('/dashboard');
    }
  }, [nav]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      
      // Clear any existing admin tokens to prevent conflicts
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_name');
      
      // Set user tokens
      localStorage.setItem('user_token', data.token);
      localStorage.setItem('user_name', data.name);
      localStorage.setItem('user_email', data.email);
      nav('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-mark">Z</div>
          <h1>Welcome to Zed AI</h1>
          <p>Sign in to access customer support</p>
        </div>
        {error && <div className="auth-error">⚠️ {error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="you@example.com" 
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} 
              required 
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} 
              required
              autoComplete="current-password"
            />
          </div>
          <button className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/forgot-password">Forgot your password?</Link>
          <span>Don't have an account? <Link to="/signup">Sign up</Link></span>
        </div>
        
        <div className="auth-links">
          <Link to="/admin/login" className="admin-link">Admin Login →</Link>
        </div>
      </div>
    </div>
  );
}
