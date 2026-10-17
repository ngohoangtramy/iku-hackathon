import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, ShieldCheck, CreditCard, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export const IdentityVerificationScreen: React.FC = () => {
  const navigate = useNavigate();
  const { updateUser } = useStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [idCaptured, setIdCaptured] = useState(false);
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCaptureId = () => {
    setIdCaptured(true);
    toast.success('Student ID photo captured (simulated)');
    setTimeout(() => setStep(2), 600);
  };

  const handleCaptureSelfie = () => {
    setSelfieCaptured(true);
    toast.success('Liveness check completed (simulated)');
    setTimeout(() => {
      setStep(3);
      handleSubmit();
    }, 600);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.auth.identityVerify({ photoId: 'simulated_id', selfie: 'simulated_selfie' });
      updateUser({ tier: 1 });
      setTimeout(() => {
        toast.success('🎉 Identity verified! Tier 1 active.');
        navigate('/map');
      }, 1500);
    } catch {
      navigate('/map');
    }
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
        {/* Demo Mode Banner */}
        <div
          style={{
            background: '#FFF8E1',
            border: '1px solid #FFE082',
            borderRadius: '16px',
            padding: '10px 14px',
            color: '#8D6E14',
            fontSize: '12px',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0 }} />
          <span>
            <strong>DEMO MODE:</strong> This verification is simulated for prototype review. In production, connect a verified identity provider (e.g. Onfido, Persona).
          </span>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '20px',
              background: 'var(--gradient-soft)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary-deep)',
              marginBottom: '12px',
            }}
          >
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Student Identity Check</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Step {step} of 2 • Fast 30-second verification
          </p>
        </div>

        {/* Step 1: ID Photo */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: '100%',
                height: '180px',
                borderRadius: '20px',
                border: '2px dashed var(--color-primary-light)',
                background: 'var(--color-primary-bg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '20px',
                position: 'relative',
              }}
            >
              <CreditCard size={48} color="#FF6B9D" />
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-deep)' }}>
                Position Student Card or National ID
              </div>
              <span className="badge badge-demo" style={{ position: 'absolute', top: '12px', right: '12px' }}>
                DEMO
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '24px' }}>
              Ensure your name, university logo, and photo are clearly visible without glare.
            </p>

            <button
              onClick={handleCaptureId}
              className="btn btn-primary btn-full"
              style={{ gap: '8px' }}
            >
              <Camera size={18} />
              Take Photo of ID (Simulate)
            </button>
          </div>
        )}

        {/* Step 2: Selfie Liveness Check */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                border: '4px solid var(--color-primary)',
                background: 'var(--gradient-soft)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '20px',
                position: 'relative',
                boxShadow: '0 8px 30px rgba(255, 107, 157, 0.25)',
              }}
            >
              <div
                style={{
                  width: '120px',
                  height: '140px',
                  borderRadius: '50%',
                  border: '2px dashed rgba(232, 82, 138, 0.6)',
                }}
              />
              <span className="badge badge-demo" style={{ position: 'absolute', bottom: '12px' }}>
                DEMO
              </span>
            </div>

            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
              Center your face in the oval
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '24px' }}>
              Quick liveness check to confirm you are the registered student.
            </p>

            <button
              onClick={handleCaptureSelfie}
              className="btn btn-primary btn-full"
              style={{ gap: '8px' }}
            >
              <Camera size={18} />
              Capture Selfie (Simulate)
            </button>
          </div>
        )}

        {/* Step 3: Submitting */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="spinner" style={{ width: '48px', height: '48px', margin: '0 auto 20px', borderWidth: '4px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
              Verifying credentials...
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
              Simulating fast verification with automated university records.
            </p>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => navigate('/map')}
          className="btn btn-ghost"
          style={{ fontSize: '13px' }}
        >
          Skip verification for now
        </button>
      </div>
    </div>
  );
};
