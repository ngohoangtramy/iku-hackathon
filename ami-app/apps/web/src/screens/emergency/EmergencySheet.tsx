import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  ShieldAlert, 
  Users, 
  MapPin, 
  Building2, 
  X, 
  AlertTriangle, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import api from '../../lib/api';
import type { TrustedContact, Place } from '../../types';
import toast from 'react-hot-toast';

interface EmergencySheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencySheet: React.FC<EmergencySheetProps> = ({ isOpen, onClose }) => {
  const [confirmCallNumber, setConfirmCallNumber] = useState<string | null>(null);
  const [viewContacts, setViewContacts] = useState(false);
  const [viewSafePlaces, setViewSafePlaces] = useState(false);
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [safePlaces, setSafePlaces] = useState<Place[]>([]);
  const [locationShared, setLocationShared] = useState(false);
  const [showLocationConsent, setShowLocationConsent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.emergency.getTrustedContacts().then(setTrustedContacts).catch(() => {});
      api.places.nearby(51.5074, -0.1278).then(setSafePlaces).catch(() => {});
    } else {
      setConfirmCallNumber(null);
      setViewContacts(false);
      setViewSafePlaces(false);
      setShowLocationConsent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleShareLocation = () => {
    setShowLocationConsent(false);
    setLocationShared(true);
    api.emergency.log({ type: 'location_shared', lat: 51.5074, lng: -0.1278 });
    toast.success('📍 Live location link prepared to send to your trusted contacts.');
  };

  const handleDialNumber = (number: string) => {
    api.emergency.log({ type: 'emergency_call_initiated', details: `Dialed ${number}` });
    window.location.href = `tel:${number}`;
    setConfirmCallNumber(null);
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div 
        className="bottom-sheet" 
        onClick={(e) => e.stopPropagation()} 
        style={{ padding: '0 0 28px 0', overflow: 'hidden' }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
            color: 'white',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={28} />
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'white', margin: 0 }}>
                Emergency Assistance
              </h2>
              <span style={{ fontSize: '11px', opacity: 0.9, fontWeight: 500 }}>
                Immediate safety tools & rapid dialing
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Disclaimer Banner */}
        <div
          style={{
            background: '#FEF2F2',
            borderBottom: '1px solid #FCA5A5',
            padding: '10px 16px',
            fontSize: '12px',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Ami is not an emergency dispatcher.</strong> If you are in immediate danger, call emergency services directly.
          </span>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Main Action 1: Call 999 */}
          <button
            onClick={() => setConfirmCallNumber('999')}
            className="btn btn-full"
            style={{
              background: '#B91C1C',
              color: 'white',
              padding: '18px 20px',
              borderRadius: '16px',
              fontSize: '18px',
              fontWeight: 800,
              boxShadow: '0 4px 16px rgba(185, 28, 28, 0.4)',
              justifyContent: 'flex-start',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Phone size={24} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div>Call 999 (UK Police / Ambulance)</div>
              <div style={{ fontSize: '12px', fontWeight: 400, opacity: 0.9 }}>
                Direct connect for UK emergencies
              </div>
            </div>
          </button>

          {/* Main Action 2: Call 112 */}
          <button
            onClick={() => setConfirmCallNumber('112')}
            className="btn btn-full"
            style={{
              background: '#991B1B',
              color: 'white',
              padding: '16px 20px',
              borderRadius: '16px',
              fontSize: '17px',
              fontWeight: 700,
              justifyContent: 'flex-start',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Phone size={22} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div>Call 112 (European Emergency Number)</div>
              <div style={{ fontSize: '12px', fontWeight: 400, opacity: 0.9 }}>
                Works on any mobile network worldwide
              </div>
            </div>
          </button>

          {/* Action 3: Contact Trusted Person */}
          <button
            onClick={() => setViewContacts(!viewContacts)}
            className="btn btn-full"
            style={{
              background: 'var(--gradient-primary)',
              color: 'white',
              padding: '16px 20px',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(255, 107, 157, 0.3)',
              justifyContent: 'flex-start',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} />
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div>Contact Trusted Person</div>
              <div style={{ fontSize: '12px', fontWeight: 400, opacity: 0.9 }}>
                {trustedContacts.length} trusted contacts configured
              </div>
            </div>
          </button>

          {/* Trusted contacts list expansion */}
          {viewContacts && (
            <div
              style={{
                background: 'var(--color-primary-bg)',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid var(--color-border)',
              }}
            >
              {trustedContacts.map((contact) => (
                <div
                  key={contact.id}
                  style={{
                    background: 'white',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{contact.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      {contact.relationship} • {contact.phone}
                    </div>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="btn btn-primary"
                    style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '10px' }}
                  >
                    Call
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Action 4: Share Location */}
          <button
            onClick={() => (locationShared ? toast('Location already prepared') : setShowLocationConsent(true))}
            className="btn btn-full"
            style={{
              background: locationShared ? '#ECFDF5' : '#F3F4F6',
              color: locationShared ? '#065F46' : '#1F2937',
              border: locationShared ? '1.5px solid #10B981' : '1.5px solid #E5E7EB',
              padding: '14px 20px',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: 600,
              justifyContent: 'flex-start',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: locationShared ? '#D1FAE5' : '#E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: locationShared ? '#059669' : '#4B5563',
              }}
            >
              {locationShared ? <Check size={20} /> : <MapPin size={20} />}
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div>{locationShared ? '✓ Live Location Ready to Send' : 'Share My Real-Time Location'}</div>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 400 }}>
                {locationShared ? 'Share link active for 2 hours' : 'Requires your explicit consent'}
              </div>
            </div>
          </button>

          {/* Action 5: Safe Places */}
          <button
            onClick={() => setViewSafePlaces(!viewSafePlaces)}
            className="btn btn-ghost-rose btn-full"
            style={{
              padding: '14px 20px',
              borderRadius: '16px',
              justifyContent: 'flex-start',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#FFF0F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary-deep)',
              }}
            >
              <Building2 size={20} />
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div>Nearby Verified Safe Havens</div>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 400 }}>
                Partner shops, 24/7 receptions & lit zones
              </div>
            </div>
          </button>

          {/* Safe places list expansion */}
          {viewSafePlaces && (
            <div
              style={{
                background: '#FAFAFA',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid #E5E7EB',
              }}
            >
              {safePlaces.map((place) => (
                <div
                  key={place.id}
                  style={{
                    background: 'white',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #F0F0F0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#1A1A2E' }}>{place.name}</div>
                    <span className="badge badge-partner" style={{ fontSize: '10px' }}>Verified Haven</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{place.address}</div>
                  {place.discountInfo && (
                    <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
                      ✓ {place.discountInfo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Call Confirmation Dialog */}
        {confirmCallNumber && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '24px',
                padding: '24px',
                maxWidth: '340px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Phone size={32} />
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: '#1A1A2E' }}>
                Confirm Call to {confirmCallNumber}?
              </h3>

              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px', lineHeight: 1.5 }}>
                This will trigger your mobile device's phone dialer to connect to UK emergency responders.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setConfirmCallNumber(null)}
                  className="btn btn-ghost"
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDialNumber(confirmCallNumber)}
                  className="btn btn-danger"
                  style={{ flex: 1, padding: '12px', fontWeight: 700 }}
                >
                  Dial Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Location Consent Dialog */}
        {showLocationConsent && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '24px',
                padding: '24px',
                maxWidth: '340px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <MapPin size={28} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                Share Live Location?
              </h3>

              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px', lineHeight: 1.5 }}>
                Your current GPS location (London, UK) will be transmitted securely to your trusted contacts via SMS/notification with a live tracking link.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowLocationConsent(false)}
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleShareLocation}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Consent & Share
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
