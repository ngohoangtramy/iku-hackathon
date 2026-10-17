import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, QrCode, Calendar, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

interface TierUpgradeCardProps {
  featureName?: string;
  onUnlocked?: () => void;
}

export const TierUpgradeCard: React.FC<TierUpgradeCardProps> = ({
  featureName = 'Buddy Matching',
  onUnlocked,
}) => {
  const navigate = useNavigate();
  const { updateUser } = useStore();

  const handleSimulateUnlock = () => {
    updateUser({ tier: 2 });
    toast.success('🎉 Tier 2 Trust Unlocked (Demo)!');
    if (onUnlocked) onUnlocked();
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4EE 100%)',
        border: '2px solid #FFB3CC',
        borderRadius: '24px',
        padding: '24px 20px',
        margin: '16px',
        textAlign: 'center',
        boxShadow: '0 8px 24px rgba(255, 107, 157, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--gradient-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 4px 16px rgba(255, 107, 157, 0.4)',
          marginBottom: '16px',
        }}
      >
        <Lock size={26} />
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
        <span className="badge badge-tier2" style={{ fontSize: '11px' }}>
          <ShieldCheck size={12} /> Tier 2 Required
        </span>
      </div>

      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1A1A2E', marginBottom: '8px' }}>
        Unlock {featureName}
      </h3>

      <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.5, marginBottom: '20px', maxWidth: '320px' }}>
        To keep our community safe and verified, peer matching and host privileges require attending an Ami community event and scanning the host's in-person QR code.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        <button
          onClick={() => navigate('/events')}
          className="btn btn-primary btn-full"
          style={{ gap: '8px' }}
        >
          <Calendar size={18} />
          Find Events Near Me
        </button>

        <button
          onClick={() => navigate('/qr-scan')}
          className="btn btn-secondary btn-full"
          style={{ gap: '8px' }}
        >
          <QrCode size={18} />
          Scan Event QR Code
        </button>

        <button
          onClick={handleSimulateUnlock}
          className="btn btn-ghost"
          style={{
            fontSize: '12px',
            color: '#E8528A',
            gap: '6px',
            marginTop: '4px',
            background: 'rgba(255, 255, 255, 0.8)',
            border: '1px dashed #FFB3CC',
            borderRadius: '12px',
          }}
        >
          <Sparkles size={14} />
          Demo Mode: Instant Tier 2 Unlock
        </button>
      </div>
    </div>
  );
};
