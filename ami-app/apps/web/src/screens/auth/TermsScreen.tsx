import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckSquare, Square, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const TermsScreen: React.FC = () => {
  const navigate = useNavigate();

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [consentAi, setConsentAi] = useState(true);
  const [consentCamera, setConsentCamera] = useState(false);

  const canContinue = agreeTerms && agreePrivacy;

  const handleContinue = () => {
    if (!canContinue) {
      toast.error('Please accept the required Terms and Privacy Policy to continue');
      return;
    }
    toast.success('Preferences saved');
    navigate('/map');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        padding: '36px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '18px',
              background: 'var(--gradient-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary-deep)',
              marginBottom: '16px',
            }}
          >
            <Shield size={28} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Terms & Safety Consent</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Please review and confirm your preferences to keep our community safe.
          </p>
        </div>

        {/* Scrollable Terms Content */}
        <div
          style={{
            background: '#F9FAFB',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '16px',
            maxHeight: '180px',
            overflowY: 'auto',
            fontSize: '13px',
            color: '#4B5563',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}
        >
          <p style={{ marginBottom: '10px' }}>
            <strong>1. Community Commitment:</strong> Ami is dedicated to women's and non-binary individuals' personal safety, mobility, and community discovery. Harassment, misrepresentation, or misuse of safety data will result in immediate permanent expulsion.
          </p>
          <p style={{ marginBottom: '10px' }}>
            <strong>2. Safety Information Disclaimer:</strong> Safety scores, streetlight data, and route indicators are community-assisted and simulated in demo environments. They do not constitute an infallible safety guarantee. In genuine emergencies, always dial 999 or 112 immediately.
          </p>
          <p style={{ marginBottom: '10px' }}>
            <strong>3. Privacy & Device Processing:</strong> Video and audio during AI companion calls are processed ephemeral on-device and in memory. No CCTV-style feeds or biometric face templates are retained.
          </p>
        </div>

        {/* Checkbox Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Required 1 */}
          <div
            onClick={() => setAgreeTerms(!agreeTerms)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div style={{ color: agreeTerms ? 'var(--color-primary-deep)' : 'var(--color-muted)', marginTop: '2px' }}>
              {agreeTerms ? <CheckSquare size={20} /> : <Square size={20} />}
            </div>
            <div style={{ fontSize: '14px' }}>
              <span style={{ fontWeight: 600 }}>I agree to the Terms of Service</span>
              <span style={{ color: '#E8528A', marginLeft: '4px', fontWeight: 700 }}>*</span>
            </div>
          </div>

          {/* Required 2 */}
          <div
            onClick={() => setAgreePrivacy(!agreePrivacy)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div style={{ color: agreePrivacy ? 'var(--color-primary-deep)' : 'var(--color-muted)', marginTop: '2px' }}>
              {agreePrivacy ? <CheckSquare size={20} /> : <Square size={20} />}
            </div>
            <div style={{ fontSize: '14px' }}>
              <span style={{ fontWeight: 600 }}>I agree to the Privacy Policy</span>
              <span style={{ color: '#E8528A', marginLeft: '4px', fontWeight: 700 }}>*</span>
            </div>
          </div>

          {/* Optional 3 */}
          <div
            onClick={() => setConsentAi(!consentAi)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div style={{ color: consentAi ? 'var(--color-primary-deep)' : 'var(--color-muted)', marginTop: '2px' }}>
              {consentAi ? <CheckSquare size={20} /> : <Square size={20} />}
            </div>
            <div style={{ fontSize: '13px', color: '#4B5563' }}>
              <span>I understand this app uses AI companion features for simulated phone companionship (Optional)</span>
            </div>
          </div>

          {/* Optional 4 */}
          <div
            onClick={() => setConsentCamera(!consentCamera)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div style={{ color: consentCamera ? 'var(--color-primary-deep)' : 'var(--color-muted)', marginTop: '2px' }}>
              {consentCamera ? <CheckSquare size={20} /> : <Square size={20} />}
            </div>
            <div style={{ fontSize: '13px', color: '#4B5563' }}>
              <span>I consent to optional camera analysis during AI calls for experimental distress detection (Optional)</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '28px' }}>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="btn btn-primary btn-full"
          style={{
            opacity: canContinue ? 1 : 0.5,
            cursor: canContinue ? 'pointer' : 'not-allowed',
            gap: '8px',
          }}
        >
          <span>Continue to Ami</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
