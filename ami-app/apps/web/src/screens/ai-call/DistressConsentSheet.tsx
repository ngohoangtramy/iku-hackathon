import React from 'react';
import { AlertTriangle, ShieldCheck, X, Check } from 'lucide-react';

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
              background: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1A1A2E' }}>
              About Distress Detection
            </h3>
            <span style={{ fontSize: '12px', color: '#D97706', fontWeight: 700 }}>
              Experimental Safety Feature
            </span>
          </div>
        </div>

        {/* Limitations List */}
        <div
          style={{
            background: '#F9FAFB',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '13px',
            color: '#374151',
            lineHeight: 1.45,
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: '#D97706', fontWeight: 700 }}>•</span>
            <span><strong>May produce false alarms</strong> (e.g. dropping phone, sudden jogging).</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: '#D97706', fontWeight: 700 }}>•</span>
            <span><strong>Cannot reliably detect danger</strong> or replace calling 999/112 in real threats.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: '#059669', fontWeight: 700 }}>•</span>
            <span><strong>Zero facial recognition:</strong> Does not create biometric profiles or track identity.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: '#374151', fontWeight: 700 }}>•</span>
            <span>Monitors for rapid phone drops, sudden shaking, and prolonged camera obstruction only.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: '#059669', fontWeight: 700 }}>•</span>
            <span><strong>Private on-device processing:</strong> No video or audio is stored on servers or saved.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: '#374151', fontWeight: 700 }}>•</span>
            <span>You can disable this anytime in your call or profile settings.</span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={onConsent}
            className="btn btn-primary btn-full"
            style={{ gap: '8px' }}
          >
            <ShieldCheck size={18} />
            Enable (Experimental)
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
