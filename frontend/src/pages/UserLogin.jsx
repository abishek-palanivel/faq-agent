import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function UserLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const name = params.get('name');
    const email = params.get('email');
    const err = params.get('error');

    if (err) {
      setError(err);
    } else if (token && name && email) {
      // Clear any existing admin tokens to prevent conflicts
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_name');
      
      // Set user tokens
      localStorage.setItem('user_token', token);
      localStorage.setItem('user_name', name);
      localStorage.setItem('user_email', email);
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

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch(`${API}/api/auth/google/url`);
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Handle gracefully when Google OAuth is not available
        setError(data.message || 'Google sign-in is temporarily unavailable. Please use email/password login.');
      }
    } catch (err) {
      setError('Google sign-in is temporarily unavailable. Please use email/password login.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg className="logo-svg" width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '16px' }}>
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
                <stop offset="0%" stopColor="#6366f1" />
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <circle cx="50" cy="50" r="40" stroke="url(#logoGrad)" strokeWidth="6" filter="url(#logoGlow)" />
            <path d="M35 35 H65 L50 65 Z" fill="url(#logoGrad)" />
            <circle cx="50" cy="42" r="5" fill="#ffffff" />
          </svg>
          <h1>Welcome to Zed AI</h1>
          <p>Sign in to access customer support</p>
        </div>
        {error && <div className="auth-error">⚠️ {error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <button className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-dim)' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          <span style={{ padding: '0 10px', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          className="google-btn"
          style={{
            width: '100%',
            padding: '12px',
            background: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            color: '#1f2937',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.target.style.background = '#f3f4f6'}
          onMouseOut={e => e.target.style.background = '#ffffff'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
          <br />
          <Link to="/forgot-password" style={{ color: '#64748b', fontSize: '13px' }}>Forgot Password?</Link>
          <br /><br />
          <Link to="/admin/login" style={{ color: '#64748b', fontSize: '12px' }}>Admin Login →</Link>
        </div>
      </div>
    </div>
  );
}
