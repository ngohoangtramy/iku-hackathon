import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCw, ShieldCheck, Users, Clock, Sparkles } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export const QRHostScreen: React.FC = () => {
  const { eventId = 'evt_01' } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [qrToken, setQrToken] = useState('ami_host_demo_token_8892');
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch or refresh QR
  const refreshQR = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.verification.generateQR(eventId);
      setQrToken(res.token);
      setSecondsLeft(30);
    } catch {
      setQrToken('ami_host_demo_token_' + Date.now());
      setSecondsLeft(30);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    refreshQR();
  }, [eventId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          refreshQR();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAF7FA',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 20px 36px',
      }}
    >
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'white',
              border: '1px solid var(--color-border)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#1A1A2E',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <span className="badge badge-tier2">
            <ShieldCheck size={14} /> Host Verification
          </span>
          <div style={{ width: '40px' }} />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1A2E' }}>
            Event Presence QR
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Sunset 5K Running Club • London Eye Plaza
          </p>
        </div>

        {/* White Card with QR Code */}
        <div
          className="card"
          style={{
            padding: '28px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            border: '2px solid #FFCCD9',
          }}
        >
          {/* Refreshing Spinner Overlay */}
          {isRefreshing && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(4px)',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <div className="spinner" style={{ width: '32px', height: '32px', marginBottom: '8px' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#E8528A' }}>Refreshing secure QR...</span>
            </div>
          )}

          {/* SVG QR Code Graphic */}
          <div
            style={{
              width: '210px',
              height: '210px',
              background: '#FFFFFF',
              padding: '12px',
              borderRadius: '16px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: '1px solid #F0E0E8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
              {/* Corner 1 */}
              <rect x="5" y="5" width="28" height="28" fill="#1A1A2E" rx="4" />
              <rect x="9" y="9" width="20" height="20" fill="#FFFFFF" rx="2" />
              <rect x="13" y="13" width="12" height="12" fill="#E8528A" rx="2" />

              {/* Corner 2 */}
              <rect x="67" y="5" width="28" height="28" fill="#1A1A2E" rx="4" />
              <rect x="71" y="9" width="20" height="20" fill="#FFFFFF" rx="2" />
              <rect x="75" y="13" width="12" height="12" fill="#E8528A" rx="2" />

              {/* Corner 3 */}
              <rect x="5" y="67" width="28" height="28" fill="#1A1A2E" rx="4" />
              <rect x="9" y="71" width="20" height="20" fill="#FFFFFF" rx="2" />
              <rect x="13" y="75" width="12" height="12" fill="#E8528A" rx="2" />

              {/* Simulated QR Pattern Data Dots */}
              <rect x="42" y="8" width="6" height="6" fill="#1A1A2E" />
              <rect x="52" y="14" width="6" height="6" fill="#1A1A2E" />
              <rect x="42" y="24" width="6" height="6" fill="#1A1A2E" />
              <rect x="12" y="44" width="6" height="6" fill="#1A1A2E" />
              <rect x="22" y="50" width="6" height="6" fill="#1A1A2E" />
              <rect x="44" y="44" width="12" height="12" fill="#FF6B9D" rx="3" />
              <rect x="62" y="42" width="6" height="6" fill="#1A1A2E" />
              <rect x="78" y="46" width="6" height="6" fill="#1A1A2E" />
              <rect x="40" y="68" width="6" height="6" fill="#1A1A2E" />
              <rect x="52" y="76" width="6" height="6" fill="#1A1A2E" />
              <rect x="68" y="70" width="6" height="6" fill="#1A1A2E" />
              <rect x="80" y="80" width="6" height="6" fill="#1A1A2E" />
            </svg>
          </div>

          {/* Countdown Ring & Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '3px solid #FF6B9D',
                borderTopColor: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '12px',
                color: '#E8528A',
              }}
            >
              {secondsLeft}
            </div>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
              Auto-regenerates in {secondsLeft}s
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.5, maxWidth: '280px' }}>
            Show this dynamic code to attendees at the physical event to verify presence and unlock Tier 2 trust.
          </p>
        </div>
      </div>

      {/* Manual Refresh Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={refreshQR}
          disabled={isRefreshing}
          className="btn btn-secondary btn-full"
          style={{ gap: '8px' }}
        >
          <RotateCw size={18} />
          Regenerate QR Code Now
        </button>
      </div>
    </div>
  );
};
