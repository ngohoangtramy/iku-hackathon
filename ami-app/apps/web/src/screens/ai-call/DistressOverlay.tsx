import React from 'react';
import { AlertCircle, ShieldAlert, Check } from 'lucide-react';

interface DistressOverlayProps {
  isOpen: boolean;
  onConfirmSafe: () => void;
  onGetHelp: () => void;
  onDismiss: () => void;
}

export const DistressOverlay: React.FC<DistressOverlayProps> = ({
  isOpen,
  onConfirmSafe,
  onGetHelp,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '110px',
        left: '20px',
        right: '20px',
        background: '#FFFFFF',
        borderRadius: '24px',
        padding: '20px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 0 2px #FF6B9D',
        zIndex: 60,
        animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        textAlign: 'center',
      }}
    >
      {/* Animated Pulse Indicator */}
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#FEE2E2',
          color: '#DC2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
          animation: 'pulse 1.2s infinite',
        }}
      >
        <AlertCircle size={32} />
      </div>

      <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1A1A2E', marginBottom: '6px' }}>
        Are you okay?
      </h3>

      <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '18px', lineHeight: 1.4 }}>
        Your breathing rate was elevated during this check.
      </p>

      {/* 3 Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* 1. I'm okay */}
        <button
          onClick={onConfirmSafe}
          className="btn btn-secondary btn-full"
          style={{ padding: '12px 18px', gap: '8px' }}
        >
          <Check size={18} /> I'm Okay
        </button>

        {/* 2. Get Help */}
        <button
          onClick={onGetHelp}
          className="btn btn-danger btn-full"
          style={{ padding: '12px 18px', gap: '8px', fontWeight: 700 }}
        >
          <ShieldAlert size={18} /> Get Help / Emergency SOS
        </button>

        {/* 3. Dismiss */}
        <button
          onClick={onDismiss}
          className="btn btn-ghost"
          style={{ fontSize: '12px', color: '#9CA3AF' }}
        >
          Dismiss
        </button>
      </div>

      {/* Disclaimer */}
      <p style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '12px' }}>
        This wellness estimate is not a medical or safety assessment.
      </p>
    </div>
  );
};
