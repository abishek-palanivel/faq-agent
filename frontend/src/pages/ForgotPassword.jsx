import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
        setSent(true);
      } else {
        setError(data.detail || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
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
          <h1>Reset Password</h1>
          <p>Enter your email to receive a password reset link</p>
        </div>

        {error && <div className="auth-error">⚠️ {error}</div>}
        {message && <div className="auth-success">✅ {message}</div>}

        {!sent ? (
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
            <button className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ 
              fontSize: '48px', 
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              📧
            </div>
            <p style={{ color: 'var(--text-dim)', marginBottom: '20px' }}>
              Check your email for the password reset link
            </p>
            <button onClick={() => setSent(false)} className="btn-secondary">
              Send Another Reset Link
            </button>
          </div>
        )}

        <div className="auth-footer">
          <Link to="/login">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}