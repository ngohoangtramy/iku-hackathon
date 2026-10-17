import React from 'react';
import { ShieldCheck, Wind } from 'lucide-react';

interface DistressConsentSheetProps {
  isOpen: boolean;
  onConsent: () => void;
  onCancel: () => void;
}

export const DistressConsentSheet: React.FC<DistressConsentSheetProps> = ({
  isOpen,
  onConsent,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="bottom-sheet-overlay" onClick={onCancel}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-handle" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#FCE7F3',
              color: '#BE185D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wind size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1A1A2E' }}>
              Breathing check
            </h3>
          </div>
        </div>

        <div
          style={{
            background: '#F9FAFB',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            fontSize: '14px',
            color: '#374151',
            lineHeight: 1.45,
            marginBottom: '20px',
          }}
        >
          Live camera frames will be sent to Ami's API and processed using SmartSpectra for up to 90 seconds. Keep your face and upper chest in view. Ami does not save the frames or readings. This is a wellness estimate, not a medical or safety assessment. Five or more readings averaging 30 breaths/min or above will prompt a check-in only.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={onConsent}
            className="btn btn-primary btn-full"
            style={{ gap: '8px' }}
          >
            <ShieldCheck size={18} />
            Start breathing check
          </button>

          <button
            onClick={onCancel}
            className="btn btn-ghost btn-full"
            style={{ color: '#6B7280' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
