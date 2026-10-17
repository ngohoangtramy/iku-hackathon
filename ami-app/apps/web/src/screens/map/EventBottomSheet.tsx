import React, { useState } from 'react';
import type { Event } from '../../types';
import { CATEGORY_COLORS } from './ExploreOverlay';
import { useStore } from '../../store/useStore';
import api from '../../lib/api';
import { 
  MapPin, 
  Calendar, 
  Users, 
  ShieldCheck, 
  X, 
  Navigation, 
  Flag, 
  Check, 
  Lock, 
  Sparkles 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EventBottomSheetProps {
  event: Event | null;
  onClose: () => void;
  onGetDirections?: (event: Event) => void;
}

export const EventBottomSheet: React.FC<EventBottomSheetProps> = ({
  event,
  onClose,
  onGetDirections,
}) => {
  const { user } = useStore();
  const [isRsvped, setIsRsvped] = useState(event?.isRsvped ?? false);
  const [attendeeCount, setAttendeeCount] = useState(event?.attendeeCount ?? 0);
  const [loading, setLoading] = useState(false);

  if (!event) return null;

  const categoryTheme = CATEGORY_COLORS[event.category] || { bg: '#FF6B9D', text: '#FFFFFF', icon: '✨' };
  const userTier = user?.tier ?? 0;
  const isTierEligible = userTier >= event.requiredTier;

  const handleToggleRsvp = async () => {
    if (!isTierEligible) {
      toast.error(`Tier ${event.requiredTier} verification required to RSVP to this event`);
      return;
    }

    setLoading(true);
    try {
      if (isRsvped) {
        await api.events.cancelRsvp(event.id);
        setIsRsvped(false);
        setAttendeeCount((prev) => Math.max(0, prev - 1));
        toast('RSVP cancelled');
      } else {
        await api.events.rsvp(event.id);
        setIsRsvped(true);
        setAttendeeCount((prev) => prev + 1);
        toast.success("You're going! Added to your events.");
      }
    } catch {
      toast.error('Could not update RSVP');
    } finally {
      setLoading(false);
    }
  };

  const handleReport = () => {
    toast('Event reported for moderator review.');
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '0 0 32px 0', overflow: 'hidden' }}
      >
        {/* Category Color Banner */}
        <div
          style={{
            background: categoryTheme.bg,
            color: 'white',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>{categoryTheme.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'capitalize' }}>
              {event.category.replace('_', ' ')}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px' }}>
          {/* Title & Badges */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {event.isFree ? (
                <span className="badge badge-tier1">Free Event</span>
              ) : (
                <span className="badge badge-partner">£{event.price.toFixed(2)}</span>
              )}
              {event.organizerVerified && (
                <span className="badge badge-verified">
                  <ShieldCheck size={12} /> Verified Organizer
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1A1A2E', lineHeight: 1.3 }}>
              {event.title}
            </h2>
          </div>

          {/* Logistics Info Cards */}
          <div
            style={{
              background: '#F9FAFB',
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              border: '1px solid var(--color-border)',
              marginBottom: '18px',
            }}
          >
            {/* Location */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <MapPin size={18} color="#FF6B9D" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1A1A2E' }}>
                  {event.venueName}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  {event.venueAddress}
                </div>
              </div>
            </div>

            {/* Date Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={18} color="#9B59B6" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: '#374151' }}>
                {new Date(event.startTime).toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })} • {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Attendees & Host */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={18} color="#10B981" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: '#374151' }}>
                <strong>{attendeeCount}</strong> attending {event.maxAttendees ? `(max ${event.maxAttendees})` : ''} • Hosted by <strong>{event.organizerName}</strong>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>About this event</h4>
            <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: 1.5 }}>
              {event.description}
            </p>
          </div>

          {/* Participation Rules */}
          {event.participationRules && (
            <div
              style={{
                background: 'var(--color-primary-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '14px',
                padding: '12px',
                fontSize: '12px',
                color: '#831843',
                marginBottom: '20px',
              }}
            >
              <strong>Community Guidelines:</strong> {event.participationRules}
            </div>
          )}

          {/* Tier Gate Warning if not qualified */}
          {!isTierEligible && (
            <div
              style={{
                background: '#FFF3E0',
                border: '1px solid #FFE0B2',
                borderRadius: '14px',
                padding: '12px',
                fontSize: '13px',
                color: '#E65100',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <Lock size={16} />
              <span>Tier {event.requiredTier} verification required to join this event.</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleToggleRsvp}
              disabled={loading || !isTierEligible}
              className={`btn btn-full ${isRsvped ? 'btn-secondary' : 'btn-primary'}`}
              style={{ gap: '8px' }}
            >
              {isRsvped ? (
                <>
                  <Check size={18} /> You're Going (Tap to Cancel)
                </>
              ) : (
                <>
                  <Sparkles size={18} /> RSVP for Event
                </>
              )}
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  if (onGetDirections) onGetDirections(event);
                  onClose();
                }}
                className="btn btn-ghost-rose"
                style={{ flex: 1, gap: '6px' }}
              >
                <Navigation size={16} />
                Get Directions
              </button>

              <button
                onClick={handleReport}
                className="btn btn-ghost"
                style={{ fontSize: '12px', color: '#9CA3AF', gap: '4px' }}
              >
                <Flag size={14} /> Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
