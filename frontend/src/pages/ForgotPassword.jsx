import { useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const startResendTimer = () => {
    setResendTimer(60);
    const timer = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      console.log('🔧 Sending password reset request for:', email);
      
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      console.log('📡 Response status:', res.status);
      const data = await res.json();
      console.log('📦 Response data:', data);
      
      if (res.ok) {
        setMessage(data.message);
        setSent(true);
        startResendTimer();
        console.log('✅ Password reset request successful');
      } else {
        console.error('❌ Password reset failed:', data);
        setError(data.detail || data.message || 'Failed to send reset email');
      }
    } catch (err) {
      console.error('❌ Network error during password reset:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendTimer > 0) return;
    await submit({ preventDefault: () => {} });
  };

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
                placeholder="Enter your email address" 
                value={email}
                onChange={e => setEmail(e.target.value)} 
                required 
                autoComplete="email"
                className="auth-input"
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Sending...
                </>
              ) : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div className="reset-sent" style={{textAlign: 'center', margin: '20px 0'}}>
            <div className="reset-icon" style={{fontSize: '48px', marginBottom: '16px'}}>📧</div>
            <h3 style={{color: '#fff', fontSize: '18px', marginBottom: '8px'}}>Check your email</h3>
            <p style={{color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px'}}>
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            
            <div className="troubleshooting" style={{
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <h4 style={{color: '#fff', fontSize: '14px', marginBottom: '8px'}}>📋 Troubleshooting Tips:</h4>
              <ul style={{color: 'var(--text-muted)', fontSize: '12px', margin: 0, paddingLeft: '20px'}}>
                <li>Check your spam/junk folder</li>
                <li>Email may take 1-2 minutes to arrive</li>
                <li>Verify the email address is correct</li>
                <li>Make sure the email account exists in our system</li>
              </ul>
            </div>
            
            <div className="reset-actions">
              <button 
                onClick={resend}
                disabled={resendTimer > 0}
                className="btn-secondary"
                style={{width: '100%'}}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Email'}
              </button>
            </div>
          </div>
        )}

        <div className="auth-footer" style={{marginTop: '24px'}}>
          <Link to="/login">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}