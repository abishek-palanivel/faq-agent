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
        startResendTimer();
      } else {
        setError(data.detail || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
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
          <div className="logo-mark">Z</div>
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
          <div className="reset-sent">
            <div className="reset-icon">📧</div>
            <h3>Check your email</h3>
            <p>We've sent a password reset link to <strong>{email}</strong></p>
            
            <div className="reset-actions">
              <button 
                onClick={resend}
                disabled={resendTimer > 0}
                className="btn-secondary"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Email'}
              </button>
            </div>
          </div>
        )}

        <div className="auth-footer">
          <Link to="/login">← Back to Sign In</Link>
          <span>Remember your password? <Link to="/login">Sign in</Link></span>
        </div>
        
        <div className="auth-links">
          <Link to="/signup" className="admin-link">Create Account →</Link>
        </div>
      </div>
    </div>
  );
}