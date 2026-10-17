import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, CheckCircle2, QrCode, AlertCircle, Camera } from 'lucide-react';
import { useStore } from '../../store/useStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export const QRScanScreen: React.FC = () => {
  const navigate = useNavigate();
  const { updateUser } = useStore();

  const [scanning, setScanning] = useState(true);
  const [success, setSuccess] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          setCameraError(true);
        });
    } else {
      setCameraError(true);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleScanSuccess = async (token = 'demo_qr_token') => {
    setScanning(false);
    try {
      const res = await api.verification.redeemQR(token);
      updateUser({ tier: 2 });
      setSuccess(true);
      toast.success('🎉 Tier 2 Unlocked! Full community privileges granted.');
    } catch {
      toast.error('Invalid or expired QR code');
      setScanning(true);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: '#0F172A',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '16px' }}>Scan Event QR</span>
        <div style={{ width: '40px' }} />
      </div>

      {/* Main Viewport */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Background Camera Feed / Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: cameraError ? 0.2 : 0.8,
          }}
        />

        {cameraError && (
          <div
            style={{
              position: 'absolute',
              textAlign: 'center',
              padding: '20px',
              color: '#94A3B8',
              maxWidth: '280px',
            }}
          >
            <Camera size={44} style={{ margin: '0 auto 12px', opacity: 0.7 }} />
            <p style={{ fontSize: '13px', lineHeight: 1.4 }}>
              Camera simulation active for desktop / prototype browser.
            </p>
          </div>
        )}

        {/* Scan Frame with Animated Glowing Corners */}
        {!success ? (
          <div
            style={{
              position: 'relative',
              width: '240px',
              height: '240px',
              borderRadius: '24px',
              border: '2px dashed rgba(255, 107, 157, 0.7)',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            {/* 4 Corner Accents */}
            <div style={{ position: 'absolute', top: -3, left: -3, width: 24, height: 24, borderTop: '4px solid #FF6B9D', borderLeft: '4px solid #FF6B9D', borderTopLeftRadius: 12 }} />
            <div style={{ position: 'absolute', top: -3, right: -3, width: 24, height: 24, borderTop: '4px solid #FF6B9D', borderRight: '4px solid #FF6B9D', borderTopRightRadius: 12 }} />
            <div style={{ position: 'absolute', bottom: -3, left: -3, width: 24, height: 24, borderBottom: '4px solid #FF6B9D', borderLeft: '4px solid #FF6B9D', borderBottomLeftRadius: 12 }} />
            <div style={{ position: 'absolute', bottom: -3, right: -3, width: 24, height: 24, borderBottom: '4px solid #FF6B9D', borderRight: '4px solid #FF6B9D', borderBottomRightRadius: 12 }} />

            {/* Scanning line animation */}
            <div
              style={{
                position: 'absolute',
                width: '90%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #FF6B9D, transparent)',
                boxShadow: '0 0 12px #FF6B9D',
                animation: 'pulse 1.8s ease-in-out infinite alternate',
              }}
            />
          </div>
        ) : (
          /* Celebration View on Success */
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '28px',
              padding: '32px 24px',
              textAlign: 'center',
              color: '#1A1A2E',
              maxWidth: '320px',
              zIndex: 30,
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>
              Physical Presence Verified!
            </h3>

            <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.5, marginBottom: '20px' }}>
              You have been verified at <strong>Sunset 5K Running Club</strong>. Your account is now elevated to <strong>Tier 2 Verified Peer</strong>.
            </p>

            <button
              onClick={() => navigate('/buddies')}
              className="btn btn-primary btn-full"
            >
              Explore Buddy Matches
            </button>
          </div>
        )}
      </div>

      {/* Bottom Instructions and Simulation Button */}
      <div
        style={{
          padding: '24px 20px 36px',
          textAlign: 'center',
          zIndex: 30,
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 100%)',
        }}
      >
        <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '16px' }}>
          Point camera at the event host's QR code
        </p>

        {!success && (
          <button
            onClick={() => handleScanSuccess('demo_token')}
            className="btn btn-secondary btn-full"
            style={{ gap: '8px', background: 'rgba(255, 255, 255, 0.95)', border: 'none' }}
          >
            <Sparkles size={16} color="#E8528A" />
            Simulate Successful Scan (Demo)
          </button>
        )}
      </div>
    </div>
  );
};
