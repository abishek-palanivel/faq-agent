import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  }, []);

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
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      
      // Clear any existing user tokens to prevent conflicts
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_name'); 
      localStorage.removeItem('user_email');
      
      // Set admin tokens
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_name', data.name);
      
      // Force navigation to admin dashboard
      window.location.href = '/admin/dashboard';
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg className="logo-svg" width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '16px' }}>
            <defs>
              <linearGradient id="logoGradAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <filter id="logoGlowAdmin" x="-20%" y="-20%" width="140%" height="140%">
                <stop offset="0%" stopColor="#ef4444" />
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <circle cx="50" cy="50" r="40" stroke="url(#logoGradAdmin)" strokeWidth="6" filter="url(#logoGlowAdmin)" />
            <path d="M35 35 H65 L50 65 Z" fill="url(#logoGradAdmin)" />
            <circle cx="50" cy="42" r="5" fill="#ffffff" />
          </svg>
          <h1>Admin Portal</h1>
          <p>Zed AI Support Management</p>
        </div>
        <div className="auth-admin-badge">🔒 Restricted Access — Administrators Only</div>
        {error && <div className="auth-error">⚠️ {error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Admin Email</label>
            <input type="email" placeholder="admin@zed.com" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Admin Sign In'}
          </button>
        </form>
        <div className="auth-footer">
          <Link to="/login">← Back to Customer Login</Link>
        </div>
      </div>
    </div>
  );
}
