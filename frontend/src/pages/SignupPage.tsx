import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Full name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password);
      setLoading(false);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check your information.');
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
            <div className="logo-mark"><Zap size={16} fill="#111" color="#111" /></div>
            <span className="logo-text">ACTIFY</span>
          </div>
          <h1>Create Account</h1>
          <p>Start detecting deadline clusters today</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-body">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">Full Name <span className="req">*</span></label>
            <input
              id="signup-name"
              type="text"
              className="form-input"
              placeholder="Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">Email <span className="req">*</span></label>
            <input
              id="signup-email"
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
            <label className="form-label" htmlFor="signup-password">Password <span className="req">*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                id="signup-password"
                type={showPwd ? 'text' : 'password'}
                className="form-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                minLength={6}
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

          <div className="form-group">
            <label className="form-label" htmlFor="signup-confirm">Confirm Password <span className="req">*</span></label>
            <input
              id="signup-confirm"
              type="password"
              className="form-input"
              placeholder="Re-enter your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="auth-submit">
            <button
              id="signup-submit-btn"
              type="submit"
              className="btn btn-coral btn-lg btn-block"
              disabled={loading}
            >
              {loading ? <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> CREATING ACCOUNT...</> : 'CREATE ACCOUNT →'}
            </button>
          </div>
        </form>

        <div className="auth-footer-link">
          Already have an account?{' '}
          <Link to="/login">Log In</Link>
        </div>
      </motion.div>
    </div>
  );
}
