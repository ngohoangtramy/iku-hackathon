import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const DemoBanner: React.FC = () => {
  const { isDemoBannerDismissed, setDemoBannerDismissed } = useStore();

  if (isDemoBannerDismissed) return null;

  return (
    <div
      style={{
        backgroundColor: '#FFF8E1',
        borderBottom: '1px solid #FFE082',
        color: '#8D6E14',
        padding: '8px 14px',
        fontSize: '12px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 45,
        lineHeight: 1.35,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, paddingRight: '8px' }}>
        <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#B45309' }}>Demo Mode:</strong> Safety data is simulated for London demonstrator. Always use your own judgment and contact emergency services if in danger.
        </span>
      </div>
      <button
        onClick={() => setDemoBannerDismissed(true)}
        aria-label="Dismiss banner"
        style={{
          background: 'none',
          border: 'none',
          color: '#8D6E14',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
};
