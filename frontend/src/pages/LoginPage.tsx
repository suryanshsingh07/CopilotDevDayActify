import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!password) { setError('Password is required.'); return; }

    setLoading(true);
    try {
      await login(email.trim(), password);
      setLoading(false);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Don\'t have an account? Sign up first.');
      setLoading(false);
    }
  }

  // Quick 1-click login with demo credentials requested by user
  async function handleDemoLogin() {
    setEmail('john@gmail.com');
    setPassword('123456');
    setError('');
    setLoading(true);
    try {
      await login('john@gmail.com', '123456', 'John Doe');
      setLoading(false);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Demo login failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-back">
        <Link to="/"><ArrowLeft size={12} style={{ display: 'inline' }} /> Back to Home</Link>
      </div>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="auth-header">
          <div className="landing-logo auth-logo" style={{ marginBottom: '1.25rem' }}>
            <div className="logo-mark"><Zap size={16} fill="currentColor" color="currentColor" /></div>
            <span className="logo-text">ACTIFY</span>
          </div>
          <h1>Welcome Back</h1>
          <p>Log in to continue your deadline collision map</p>
        </div>

        {/* Demo Credentials Box */}
        <div style={{
          background: 'var(--yellow-light)',
          border: 'var(--border)',
          boxShadow: 'var(--shadow-xs)',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.72rem', fontWeight: 700, color: 'var(--yellow-dark)' }}>
              ⚡ DEMO CREDENTIALS
            </span>
            <span style={{ fontSize: '0.72rem', fontFamily: 'Space Mono', color: 'var(--ink)' }}>
              Instant Access
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', fontFamily: 'Space Mono, monospace', color: 'var(--ink)' }}>
            <strong>Email:</strong> john@gmail.com <br />
            <strong>Password:</strong> 123456
          </div>
          <button
            type="button"
            id="demo-login-fill-btn"
            className="btn btn-primary btn-sm"
            onClick={handleDemoLogin}
            disabled={loading}
            style={{ width: '100%', marginTop: '0.25rem' }}
          >
            <Sparkles size={14} /> 1-CLICK DEMO LOGIN (JOHN)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-body">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email <span className="req">*</span></label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password <span className="req">*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPwd ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', color: 'var(--ink-muted)', cursor: 'pointer',
                }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="auth-submit">
            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'LOGGING IN...' : 'LOG IN'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup"><strong>Sign up</strong></Link>
        </div>
      </motion.div>
    </div>
  );
}
