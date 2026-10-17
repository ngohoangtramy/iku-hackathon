import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, CheckCircle2, RotateCw } from 'lucide-react';
import api, { MOCK_USER } from '../../lib/api';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

export const EmailVerificationScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useStore();

  const userEmail = (location.state as any)?.email || 'sarah.chen@ucl.ac.uk';
  const displayName = (location.state as any)?.displayName || 'Sarah Chen';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(60);
  const [loading, setLoading] = useState(false);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Cooldown countdown timer
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    const char = value.slice(-1);
    if (!/^[0-9]?$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto-advance
    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (char && index === 5 && newDigits.every((d) => d !== '')) {
      handleVerify(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code: string) => {
    setLoading(true);
    try {
      await api.auth.verifyEmail(code);
      // Promote to Tier 1
      const verifiedUser = {
        ...MOCK_USER,
        email: userEmail,
        displayName,
        tier: 1 as const,
        universityDomain: userEmail.split('@')[1] || 'ucl.ac.uk',
      };
      setAuth(verifiedUser, 'verified_token_' + Date.now());
      toast.success('Email verified successfully! Welcome to Tier 1.');
      navigate('/terms');
    } catch {
      toast.error('Verification code invalid. Please try 123456');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    setCooldown(60);
    toast.success('A new 6-digit code has been sent!');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        padding: '50px 24px 36px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'center',
      }}
    >
      <div>
        {/* Envelope Illustration */}
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '28px',
            background: 'var(--gradient-soft)',
            border: '2px solid var(--color-primary-light)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 28px rgba(255, 107, 157, 0.2)',
            marginBottom: '20px',
          }}
        >
          <Mail size={40} color="#FF6B9D" />
        </div>

        <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-dark)', marginBottom: '8px' }}>
          Check your email
        </h2>

        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: '32px' }}>
          We sent a 6-digit verification code to<br />
          <strong style={{ color: '#1A1A2E' }}>{userEmail}</strong>
        </p>

        {/* 6-digit OTP Boxes */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputsRef.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              style={{
                width: '46px',
                height: '56px',
                fontSize: '24px',
                fontWeight: 700,
                textAlign: 'center',
                borderRadius: '14px',
                border: digit ? '2px solid #FF6B9D' : '2px solid var(--color-border)',
                background: digit ? '#FFF0F5' : 'white',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
            />
          ))}
        </div>

        {/* Demo Helper */}
        <div
          style={{
            fontSize: '12px',
            color: '#9B59B6',
            background: '#F3E5F5',
            padding: '8px 14px',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '24px',
          }}
        >
          💡 Demo tip: Type any 6 digits (e.g. 1 2 3 4 5 6) to advance
        </div>

        <button
          onClick={() => handleVerify(digits.join('') || '123456')}
          disabled={loading}
          className="btn btn-primary btn-full"
        >
          {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Verify Email'}
        </button>
      </div>

      {/* Resend Cooldown */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="btn btn-ghost"
          style={{
            color: cooldown > 0 ? 'var(--color-muted)' : '#E8528A',
            fontWeight: 600,
            gap: '6px',
          }}
        >
          <RotateCw size={14} className={cooldown === 0 ? '' : ''} />
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code Now'}
        </button>
      </div>
    </div>
  );
};
