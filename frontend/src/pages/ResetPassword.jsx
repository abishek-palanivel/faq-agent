import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('token');
    
    if (!resetToken) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }
    
    setToken(resetToken);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password.length > 72) {
      setError('Password too long - maximum 72 characters allowed');
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: token,
          new_password: password 
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert('Password reset successfully! You can now sign in with your new password.');
        navigate('/login');
      } else {
        setError(data.detail || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token && error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <h1>Reset Password</h1>
          </div>
          <div className="auth-error">⚠️ {error}</div>
          <div className="auth-footer">
            <Link to="/forgot-password">Request New Reset Link</Link>
            <br />
            <Link to="/login">← Back to Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

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
          <h1>Set New Password</h1>
          <p>Enter your new password</p>
        </div>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>New Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)} 
              required 
              minLength="6"
              maxLength="72"
            />
            <small style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
              6-72 characters required
            </small>
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} 
              required 
            />
          </div>
          <button className="btn-primary" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}