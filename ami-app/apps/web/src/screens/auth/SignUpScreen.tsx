import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export const SignUpScreen: React.FC = () => {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Live University Domain Validation
  const universityCheck = useMemo(() => {
    if (!email || !email.includes('@')) return null;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    const validSuffixes = ['.ac.uk', '.edu', '.ox.ac.uk', '.cam.ac.uk', '.ucl.ac.uk', '.kcl.ac.uk', '.ic.ac.uk', '.lse.ac.uk'];
    const isUni = validSuffixes.some((suffix) => domain.endsWith(suffix));

    return {
      domain,
      isUni,
    };
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.auth.register({ email, password, displayName });
      toast.success('Account created! Please verify your email.');
      navigate('/verify-email', { state: { email, displayName } });
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="ami-auth-screen ami-signup-screen"
      style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        padding: '40px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#E8528A', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
            <ShieldCheck size={16} /> Women's Safety & Social Discovery
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-dark)' }}>
            Join Ami
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Create your account with your university or personal email
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label className="input-label">Preferred Name / Display Name</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sarah Chen"
                className="input"
                style={{ paddingLeft: '44px' }}
                required
              />
              <User
                size={18}
                color="var(--color-muted)"
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ucl.ac.uk or gmail.com"
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

            {/* Live Domain Status Chip */}
            {universityCheck && (
              <div style={{ marginTop: '6px' }}>
                {universityCheck.isUni ? (
                  <span
                    className="badge"
                    style={{
                      background: '#ECFDF5',
                      color: '#065F46',
                      border: '1px solid #A7F3D0',
                      gap: '5px',
                    }}
                  >
                    <CheckCircle2 size={13} color="#059669" />
                    ✓ Verified university email ({universityCheck.domain})
                  </span>
                ) : (
                  <span
                    className="badge"
                    style={{
                      background: '#FFFBEB',
                      color: '#92400E',
                      border: '1px solid #FDE68A',
                      gap: '5px',
                    }}
                  >
                    <AlertCircle size={13} color="#D97706" />
                    ⚠ Not a recognized university domain (requires Tier 1 manual verify)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="input"
                style={{ paddingLeft: '44px' }}
                required
              />
              <Lock
                size={18}
                color="var(--color-muted)"
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="input"
                style={{ paddingLeft: '44px' }}
                required
              />
              <Lock
                size={18}
                color="var(--color-muted)"
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          {/* Legal agreement disclaimer */}
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.5, marginTop: '4px' }}>
            By registering, you agree to Ami's{' '}
            <Link to="/terms" style={{ color: '#E8528A', fontWeight: 600, textDecoration: 'none' }}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/terms" style={{ color: '#E8528A', fontWeight: 600, textDecoration: 'none' }}>
              Privacy Policy
            </Link>
            .
          </p>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full"
            style={{ marginTop: '8px' }}
          >
            {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Create Account'}
          </button>
        </form>
      </div>

      {/* Footer Sign In */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#E8528A', fontWeight: 700, textDecoration: 'none' }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
