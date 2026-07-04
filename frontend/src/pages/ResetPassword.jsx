import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
            {/* Proper SVG Logo consistent with Login */}
            <svg className="logo-svg" width="56" height="56" viewBox="0 0 56 56" fill="none">
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/>
                  <stop offset="1" stopColor="#a855f7"/>
                </linearGradient>
              </defs>
              <rect width="56" height="56" rx="16" fill="url(#logoGrad)"/>
              <path d="M17 18h22l-6 8h-10l-6-8zm0 20l6-8h10l6 8H17z" fill="white" opacity="0.95"/>
              <circle cx="28" cy="28" r="4" fill="white"/>
            </svg>
            <h1>Reset Password</h1>
          </div>
          <div className="auth-error">⚠️ {error}</div>
          <div className="auth-footer" style={{marginTop: '24px'}}>
            <Link to="/forgot-password" style={{display: 'block', marginBottom: '12px'}}>Request New Reset Link</Link>
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
          {/* Proper SVG Logo consistent with Login */}
          <svg className="logo-svg" width="56" height="56" viewBox="0 0 56 56" fill="none">
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1"/>
                <stop offset="1" stopColor="#a855f7"/>
              </linearGradient>
            </defs>
            <rect width="56" height="56" rx="16" fill="url(#logoGrad)"/>
            <path d="M17 18h22l-6 8h-10l-6-8zm0 20l6-8h10l6 8H17z" fill="white" opacity="0.95"/>
            <circle cx="28" cy="28" r="4" fill="white"/>
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
            <small style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
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

        <div className="auth-footer" style={{marginTop: '24px'}}>
          <Link to="/login">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}