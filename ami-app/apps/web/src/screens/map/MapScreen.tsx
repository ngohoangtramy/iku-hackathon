import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Crosshair, 
  PhoneCall, 
  AlertOctagon, 
  Sparkles, 
  Plus, 
  MapPin, 
  ShieldAlert, 
  Building2, 
  Lightbulb, 
  AlertTriangle,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import api from '../../lib/api';
import type { Event, SafetyReport, RouteOption, Place } from '../../types';
import { BottomNav } from '../../components/ui/BottomNav';
import { DemoBanner } from '../../components/ui/DemoBanner';
import { RoutePanel } from './RoutePanel';
import { EventBottomSheet } from './EventBottomSheet';
import { HazardReportSheet } from './HazardReportSheet';
import { EmergencySheet } from '../emergency/EmergencySheet';
import { CATEGORY_COLORS } from './ExploreOverlay';
import toast from 'react-hot-toast';

export const MapScreen: React.FC = () => {
  const navigate = useNavigate();
  const { 
    mapMode, 
    setMapMode, 
    selectedDestination, 
    setDestination,
    activeRoute,
    setActiveRoute,
    isEmergencyOpen,
    setEmergencyOpen 
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedSafetyReport, setSelectedSafetyReport] = useState<SafetyReport | null>(null);
  const [showHazardSheet, setShowHazardSheet] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load initial data
  useEffect(() => {
    api.events.list().then(setEvents).catch(() => {});
    api.map.getSafetyData().then(setSafetyReports).catch(() => {});
    api.places.nearby(51.5074, -0.1278).then(setPlaces).catch(() => {});
  }, []);

  // Search destination and fetch routes
  const handleSelectDestination = async (destinationName: string, lat: number, lng: number) => {
    setSearchQuery(destinationName);
    setShowSuggestions(false);
    setDestination({ address: destinationName, lat, lng });

    try {
      const routes = await api.map.getRoutes({
        originLat: 51.5074,
        originLng: -0.1278,
        destLat: lat,
        destLng: lng,
      });
      setRouteOptions(routes);
      if (routes.length > 0) {
        setActiveRoute(routes[0]);
      }
    } catch {
      toast.error('Could not load routes');
    }
  };

  const handleClearRoute = () => {
    setDestination(null);
    setRouteOptions([]);
    setActiveRoute(null);
    setSearchQuery('');
  };

  return (
    <div className="screen-container" style={{ paddingBottom: 0, height: '100vh', overflow: 'hidden' }}>
      {/* Top Demo Banner */}
      <DemoBanner />

      {/* Floating Top Bar: Search & Emergency Pill */}
      <div
        style={{
          position: 'absolute',
          top: '46px',
          left: '16px',
          right: '16px',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Search Box Card */}
          <div
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(10px)',
              borderRadius: '24px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
              border: '1.5px solid rgba(255, 255, 255, 0.8)',
            }}
          >
            <Search size={18} color="#FF6B9D" style={{ marginRight: '8px', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Where are you going?"
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontFamily: 'var(--font-family)',
                fontSize: '14px',
                color: '#1A1A2E',
                width: '100%',
              }}
            />
            {searchQuery ? (
              <button
                onClick={handleClearRoute}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '13px' }}
              >
                ✕
              </button>
            ) : (
              <button
                onClick={() => handleSelectDestination("Student Central Hub", 51.5205, -0.1302)}
                title="Current Location"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FF6B9D',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Crosshair size={18} />
              </button>
            )}
          </div>

          {/* Emergency Pill */}
          <button
            onClick={() => setEmergencyOpen(true)}
            className="emergency-pill"
            aria-label="Open Emergency Services"
          >
            <AlertOctagon size={16} />
            <span>SOS</span>
          </button>
        </div>

        {/* Quick Destination Suggestions Popup */}
        {showSuggestions && !selectedDestination && (
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '12px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', padding: '4px 8px' }}>
              SUGGESTED CAMPUS DESTINATIONS
            </div>
            {[
              { name: "King's Strand Campus", address: 'Strand, London WC2R 2LS', lat: 51.5115, lng: -0.1160 },
              { name: 'UCL Student Centre', address: '27-28 Gordon Sq, WC1H 0AW', lat: 51.5245, lng: -0.1325 },
              { name: 'Senate House Library', address: 'Malet St, WC1E 7HU', lat: 51.5210, lng: -0.1298 },
            ].map((dest, i) => (
              <div
                key={i}
                onClick={() => handleSelectDestination(dest.name, dest.lat, dest.lng)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF0F5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <MapPin size={16} color="#FF6B9D" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{dest.name}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>{dest.address}</div>
                </div>
                <ChevronRight size={14} color="#9CA3AF" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Styled Map Canvas Area */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          background: '#EAE6EB',
          overflow: 'hidden',
        }}
      >
        {/* Map Grid Vector Pattern Background (London City Grid Simulation) */}
        <svg
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0.9,
          }}
        >
          <defs>
            <pattern id="streetGrid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#D8D2DD" strokeWidth="2.5" />
              <path d="M 40 0 L 40 80 M 0 40 L 80 40" fill="none" stroke="#F1EDF4" strokeWidth="1" />
            </pattern>
            {/* Illuminated Route Line Glow */}
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#FF6B9D" flood-opacity="0.8" />
            </filter>
          </defs>

          {/* Background Map Fill */}
          <rect width="100%" height="100%" fill="#F3EEF5" />
          <rect width="100%" height="100%" fill="url(#streetGrid)" />

          {/* Thames River Wave Curve */}
          <path
            d="M -50 480 Q 120 450, 220 520 T 450 490"
            fill="none"
            stroke="#D0E3F0"
            strokeWidth="32"
            strokeLinecap="round"
          />

          {/* Main Well-Lit Thoroughfares */}
          <path d="M 50 120 L 380 320" fill="none" stroke="#FFFFFF" strokeWidth="12" />
          <path d="M 50 120 L 380 320" fill="none" stroke="#FDE68A" strokeWidth="4" strokeDasharray="6 4" />
          <path d="M 215 100 L 215 550" fill="none" stroke="#FFFFFF" strokeWidth="14" />
          <path d="M 90 320 L 390 180" fill="none" stroke="#FFFFFF" strokeWidth="10" />

          {/* Active Navigation Polyline if destination chosen */}
          {activeRoute && (
            <path
              d="M 215 360 L 215 280 L 310 220 L 340 180"
              fill="none"
              stroke="#FF6B9D"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#routeGlow)"
            />
          )}

          {/* User Current Location Dot with Breathing Ripple */}
          <circle cx="215" cy="360" r="16" fill="rgba(255, 107, 157, 0.25)" style={{ animation: 'ripple 2s infinite' }} />
          <circle cx="215" cy="360" r="8" fill="#FF6B9D" stroke="#FFFFFF" strokeWidth="2.5" />
        </svg>

        {/* ----------------- SAFETY MODE MARKERS ----------------- */}
        {mapMode === 'safety' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {/* Streetlight Reports 💡 */}
            <div
              onClick={() => setSelectedSafetyReport(safetyReports[0])}
              style={{
                position: 'absolute',
                top: '32%',
                left: '42%',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#FEF3C7',
                border: '2px solid #F59E0B',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                pointerEvents: 'auto',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Lightbulb size={20} color="#D97706" />
            </div>

            <div
              onClick={() => setSelectedSafetyReport(safetyReports[1])}
              style={{
                position: 'absolute',
                top: '48%',
                left: '65%',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#FEF3C7',
                border: '2px solid #F59E0B',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                pointerEvents: 'auto',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Lightbulb size={18} color="#D97706" />
            </div>

            {/* Incident Report ⚠️ */}
            <div
              onClick={() => setSelectedSafetyReport(safetyReports[2])}
              style={{
                position: 'absolute',
                top: '42%',
                left: '22%',
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: '#FEE2E2',
                border: '2px solid #EF4444',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                pointerEvents: 'auto',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <AlertTriangle size={20} color="#DC2626" />
            </div>

            {/* Verified Safe Haven 🏪 */}
            <div
              onClick={() => toast.success("Gail's Bakery: 24hr verified safe haven with staff presence")}
              style={{
                position: 'absolute',
                top: '25%',
                left: '72%',
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: '#CCFBF1',
                border: '2px solid #0D9488',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                pointerEvents: 'auto',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Building2 size={20} color="#0F766E" />
            </div>
          </div>
        )}

        {/* ----------------- EXPLORE MODE MARKERS ----------------- */}
        {mapMode === 'explore' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {events.map((evt, idx) => {
              const theme = CATEGORY_COLORS[evt.category] || { bg: '#FF6B9D', icon: '📍' };
              // Disperse markers visually on demo map
              const positions = [
                { top: '35%', left: '30%' },
                { top: '24%', left: '60%' },
                { top: '55%', left: '72%' },
                { top: '65%', left: '38%' },
              ];
              const pos = positions[idx % positions.length];

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  style={{
                    position: 'absolute',
                    top: pos.top,
                    left: pos.left,
                    background: theme.bg,
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
                    border: '2.5px solid white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    transform: 'translate(-50%, -50%)',
                    whiteSpace: 'nowrap',
                    animation: 'slideDown 0.3s ease-out',
                  }}
                >
                  <span style={{ fontSize: '15px' }}>{theme.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{evt.title.slice(0, 16)}...</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Right FABs: AMI AI Call & Report Hazard */}
        <div
          style={{
            position: 'absolute',
            right: '16px',
            bottom: activeRoute ? '280px' : '150px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 40,
            transition: 'bottom 0.3s ease',
          }}
        >
          {/* Report Hazard button */}
          <button
            onClick={() => setShowHazardSheet(true)}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'white',
              border: '1.5px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              color: '#E8528A',
            }}
            title="Report Hazard"
          >
            <ShieldAlert size={20} />
          </button>

          {/* AI Call FAB */}
          <button
            onClick={() => navigate('/ai-call')}
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'var(--gradient-primary)',
              color: 'white',
              border: '3px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-fab)',
              cursor: 'pointer',
              animation: 'pulse 3s infinite',
            }}
            title="Start Ami AI Companion Call"
          >
            <PhoneCall size={24} />
          </button>
        </div>

        {/* Mode Toggle: Safety | Explore (Centered Floating Pill) */}
        {!activeRoute && (
          <div
            style={{
              position: 'absolute',
              bottom: '86px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 40,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              padding: '4px',
              borderRadius: '100px',
              display: 'flex',
              gap: '4px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              onClick={() => setMapMode('safety')}
              className={`chip ${mapMode === 'safety' ? 'active' : ''}`}
              style={{
                border: 'none',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              🛡️ Safety
            </button>
            <button
              onClick={() => setMapMode('explore')}
              className={`chip ${mapMode === 'explore' ? 'active' : ''}`}
              style={{
                border: 'none',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              🎉 Explore
            </button>
          </div>
        )}
      </div>

      {/* Selected Safety Report Info Card */}
      {selectedSafetyReport && (
        <div
          style={{
            position: 'absolute',
            bottom: '150px',
            left: '16px',
            right: '16px',
            background: 'white',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            zIndex: 45,
            border: '1px solid var(--color-border)',
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: selectedSafetyReport.type === 'streetlight' ? '#FEF3C7' : '#FEE2E2',
                  color: selectedSafetyReport.type === 'streetlight' ? '#D97706' : '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selectedSafetyReport.type === 'streetlight' ? <Lightbulb size={18} /> : <AlertTriangle size={18} />}
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, textTransform: 'capitalize' }}>
                  {selectedSafetyReport.type} Report
                </h4>
                <span className="badge badge-simulated" style={{ fontSize: '10px' }}>
                  Community Reported
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedSafetyReport(null)}
              style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#374151', margin: '10px 0 6px', lineHeight: 1.4 }}>
            {selectedSafetyReport.description}
          </p>
          <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', justifyContent: 'space-between' }}>
            <span>Verified by peer community</span>
            <span>Always verify in person</span>
          </div>
        </div>
      )}

      {/* Route Panel Bottom Sheet */}
      {routeOptions.length > 0 && (
        <RoutePanel
          routes={routeOptions}
          activeRoute={activeRoute}
          onSelectRoute={setActiveRoute}
          onClose={handleClearRoute}
          destinationAddress={selectedDestination?.address}
        />
      )}

      {/* Event Details Bottom Sheet */}
      <EventBottomSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onGetDirections={(evt) => handleSelectDestination(evt.title, evt.lat, evt.lng)}
      />

      {/* Hazard Report Bottom Sheet */}
      <HazardReportSheet
        isOpen={showHazardSheet}
        onClose={() => setShowHazardSheet(false)}
        onReportSubmitted={() => {
          api.map.getSafetyData().then(setSafetyReports);
        }}
      />

      {/* Emergency Sheet */}
      <EmergencySheet
        isOpen={isEmergencyOpen}
        onClose={() => setEmergencyOpen(false)}
      />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
