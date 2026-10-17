import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useStore();

  useEffect(() => {
    if (user) {
      // Auto-redirect if authenticated
      const timer = setTimeout(() => {
        navigate('/map');
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  return (
    <div
      className="ami-auth-screen ami-splash-screen"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #FF8DAF 0%, #FF6B9D 40%, #E8528A 80%, #C0392B 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 28px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background glow circles */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          right: '-20%',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '-20%',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        {/* Animated Brand Emblem */}
        <div
          style={{
            animation: 'slideDown 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), breathe 4s ease-in-out infinite',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '28px',
              background: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(16px)',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.15)',
              marginBottom: '20px',
            }}
          >
            <Heart size={44} color="#FFFFFF" fill="#FFFFFF" />
          </div>

          <h1
            style={{
              fontSize: '64px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              marginBottom: '16px',
              textShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            }}
          >
            ami
          </h1>

          <p
            style={{
              fontSize: '17px',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.95)',
              textAlign: 'center',
              maxWidth: '280px',
              lineHeight: 1.45,
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            Feel safer. Go further. Find your people.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          width: '100%',
          animation: 'slideUp 0.6s ease-out 0.2s both',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate('/onboarding')}
          className="btn"
          style={{
            background: '#FFFFFF',
            color: '#E8528A',
            padding: '18px 24px',
            borderRadius: '18px',
            fontSize: '16px',
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            gap: '8px',
          }}
        >
          <span>Get Started</span>
          <ArrowRight size={18} />
        </button>

        <button
          onClick={() => navigate('/login')}
          className="btn"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            color: '#FFFFFF',
            border: '2px solid rgba(255, 255, 255, 0.6)',
            padding: '16px 24px',
            borderRadius: '18px',
            fontSize: '16px',
            fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
};
