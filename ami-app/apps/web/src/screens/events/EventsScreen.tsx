import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Plus, 
  Check, 
  Sparkles, 
  Search, 
  Filter, 
  ShieldCheck, 
  Lock 
} from 'lucide-react';
import api from '../../lib/api';
import type { Event, EventCategory } from '../../types';
import { CATEGORY_COLORS } from '../map/ExploreOverlay';
import { BottomNav } from '../../components/ui/BottomNav';
import { EventBottomSheet } from '../map/EventBottomSheet';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

export const EventsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useStore();

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'today' | 'week' | 'month'>('week');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.events.list()
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    { id: 'all', label: 'All Events' },
    { id: 'sports_fitness', label: 'Sports & Run' },
    { id: 'cafe_social', label: 'Café Social' },
    { id: 'workshop_creative', label: 'Workshops' },
    { id: 'study_session', label: 'Study Sessions' },
    { id: 'career_networking', label: 'Career' },
    { id: 'uni_society', label: 'Societies' },
    { id: 'cultural', label: 'Cultural' },
    { id: 'community', label: 'Community' },
  ];

  const filteredEvents = events.filter((evt) => {
    const matchesCategory = selectedCategory === 'all' || evt.category === selectedCategory;
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleToggleRsvp = async (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    const userTier = user?.tier ?? 0;
    if (userTier < event.requiredTier) {
      toast.error(`Tier ${event.requiredTier} verification required to RSVP`);
      return;
    }

    try {
      if (event.isRsvped) {
        await api.events.cancelRsvp(event.id);
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === event.id ? { ...ev, isRsvped: false, attendeeCount: Math.max(0, ev.attendeeCount - 1) } : ev
          )
        );
        toast('RSVP cancelled');
      } else {
        await api.events.rsvp(event.id);
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === event.id ? { ...ev, isRsvped: true, attendeeCount: ev.attendeeCount + 1 } : ev
          )
        );
        toast.success("You're attending! Added to your schedule.");
      }
    } catch {
      toast.error('Could not update RSVP');
    }
  };

  return (
    <div className="screen-container">
      {/* Hero Header */}
      <div className="hero-pink">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9, fontWeight: 700 }}>
              Campus & Community
            </span>
            <h1 style={{ fontSize: '28px', color: 'white', marginTop: '4px' }}>Discover Events</h1>
          </div>
          {/* Host Event Button (Tier 2 feature) */}
          {(user?.tier ?? 0) >= 2 && (
            <button
              onClick={() => navigate('/qr-host/evt_01')}
              className="btn"
              style={{
                background: 'white',
                color: '#E8528A',
                borderRadius: '100px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <Plus size={16} /> Host QR
            </button>
          )}
        </div>

        {/* Search Input inside Hero */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          }}
        >
          <Search size={18} color="#FF6B9D" style={{ marginRight: '8px', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, runs, cafes, study hubs..."
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '14px',
              color: '#1A1A2E',
              fontFamily: 'var(--font-family)',
            }}
          />
        </div>
      </div>

      {/* Date Filter Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          padding: '16px 20px 8px',
        }}
      >
        {(['today', 'week', 'month'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedDateFilter(filter)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '12px',
              border: 'none',
              background: selectedDateFilter === filter ? '#FFF0F5' : '#F3F4F6',
              color: selectedDateFilter === filter ? '#E8528A' : '#6B7280',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s',
            }}
          >
            {filter === 'week' ? 'This Week' : filter === 'month' ? 'This Month' : 'Today'}
          </button>
        ))}
      </div>

      {/* Category Filter Chips Horizontal Scroll */}
      <div className="scroll-x" style={{ padding: '8px 20px 16px' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`chip ${selectedCategory === cat.id ? 'active' : ''}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div style={{ padding: '0 20px 24px', display: 'flex', flex: 1, flexDirection: 'column', gap: '14px' }}>
        {filteredEvents.length === 0 ? (
          /* Empty State */
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '28px',
                background: 'var(--gradient-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF6B9D',
                marginBottom: '16px',
              }}
            >
              <Calendar size={36} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>No events found</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', maxWidth: '260px' }}>
              Try adjusting your category or search query to find more community activities.
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const theme = CATEGORY_COLORS[event.category] || { bg: '#FF6B9D', icon: '✨' };

            return (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="card"
                style={{
                  padding: '16px',
                  borderLeft: `5px solid ${theme.bg}`,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Header Row: Category chip & Price badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: theme.bg,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {theme.icon} {event.category.replace('_', ' ')}
                  </span>

                  {event.isFree ? (
                    <span className="badge badge-tier1" style={{ fontSize: '11px' }}>
                      Free
                    </span>
                  ) : (
                    <span className="badge badge-partner" style={{ fontSize: '11px' }}>
                      £{event.price.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Event Title */}
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1A1A2E', marginBottom: '8px', lineHeight: 1.3 }}>
                  {event.title}
                </h3>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4B5563' }}>
                    <Calendar size={14} color="#9B59B6" />
                    <span>
                      {new Date(event.startTime).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })} • {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4B5563' }}>
                    <MapPin size={14} color="#FF6B9D" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.venueName}
                    </span>
                  </div>
                </div>

                {/* Footer: Attendees & RSVP */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #F3F4F6',
                    paddingTop: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
                    <Users size={15} color="#10B981" />
                    <span><strong>{event.attendeeCount}</strong> attending</span>
                  </div>

                  <button
                    onClick={(e) => handleToggleRsvp(e, event)}
                    className={`btn ${event.isRsvped ? 'btn-secondary' : 'btn-primary'}`}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      borderRadius: '12px',
                      gap: '4px',
                    }}
                  >
                    {event.isRsvped ? (
                      <>
                        <Check size={14} /> Going
                      </>
                    ) : (
                      'RSVP'
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Event Details Sheet */}
      <EventBottomSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onGetDirections={(evt) => navigate('/map')}
      />

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
};
