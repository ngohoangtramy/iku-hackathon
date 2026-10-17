import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import api, { MOCK_USER } from '../../lib/api';
import toast from 'react-hot-toast';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      setAuth(res.user, res.token);
      toast.success(`Welcome back, ${res.user.displayName}!`);
      navigate('/map');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (tier: 1 | 2) => {
    if (tier === 2) {
      setEmail('sarah.chen@ucl.ac.uk');
      setPassword('password123');
      setAuth(MOCK_USER, 'demo_token_tier2');
      toast.success('Logged in as Sarah Chen (Tier 2 Verified)');
      navigate('/map');
    } else {
      const tier1User = {
        ...MOCK_USER,
        displayName: 'Maya Patel',
        email: 'maya.patel@kcl.ac.uk',
        tier: 1 as const,
        universityDomain: 'kcl.ac.uk',
      };
      setEmail('maya.patel@kcl.ac.uk');
      setPassword('password123');
      setAuth(tier1User, 'demo_token_tier1');
      toast.success('Logged in as Maya Patel (Tier 1 Verified)');
      navigate('/map');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        padding: '48px 24px 36px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        {/* Top Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '22px',
              background: 'var(--gradient-soft)',
              border: '2px solid var(--color-primary-light)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(255, 107, 157, 0.2)',
              marginBottom: '12px',
            }}
          >
            <Heart size={32} color="#FF6B9D" fill="#FF6B9D" />
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-dark)' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Sign in to continue exploring safely
          </p>
        </div>

        {/* Demo Fast Logins */}
        <div
          style={{
            background: 'var(--color-primary-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '12px 14px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#E8528A', marginBottom: '8px' }}>
            <Sparkles size={14} /> Quick Demo Sign-In
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleDemoFill(2)}
              className="btn btn-ghost-rose"
              style={{ flex: 1, padding: '8px 10px', fontSize: '12px' }}
            >
              Sarah (Tier 2)
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill(1)}
              className="btn btn-ghost-rose"
              style={{ flex: 1, padding: '8px 10px', fontSize: '12px' }}
            >
              Maya (Tier 1)
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="input-group">
            <label className="input-label">University or Personal Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.ac.uk"
                className="input"
                style={{ paddingLeft: '44px' }}
                required
              />
              <Mail
                size={18}
                color="var(--color-muted)"
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label">Password</label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  toast('Reset link sent to registered email');
                }}
                style={{ fontSize: '12px', color: '#E8528A', textDecoration: 'none', fontWeight: 600 }}
              >
                Forgot password?
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="input"
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
                required
              />
              <Lock
                size={18}
                color="var(--color-muted)"
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-muted)',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full"
            style={{ marginTop: '8px' }}
          >
            {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '24px 0',
            color: 'var(--color-muted)',
            fontSize: '13px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          <span style={{ padding: '0 12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={() => handleDemoFill(2)}
          className="btn btn-full"
          style={{
            background: 'white',
            border: '2px solid var(--color-border)',
            borderRadius: '16px',
            padding: '14px',
            color: 'var(--color-dark)',
            fontSize: '15px',
            fontWeight: 600,
            gap: '12px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.43 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.57 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          Continue with Google
        </button>
      </div>

      {/* Footer Link */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#E8528A', fontWeight: 700, textDecoration: 'none' }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};
