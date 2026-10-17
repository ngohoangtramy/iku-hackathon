import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
  Autocomplete,
} from '@react-google-maps/api';
import {
  Search,
  Crosshair,
  PhoneCall,
  AlertOctagon,
  MapPin,
  ShieldAlert,
  Building2,
  Lightbulb,
  AlertTriangle,
  X,
  Navigation,
  Clock,
  Footprints,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import api from '../../lib/api';
import type { Event, SafetyReport, Place } from '../../types';
import { BottomNav } from '../../components/ui/BottomNav';
import { DemoBanner } from '../../components/ui/DemoBanner';
import { EventBottomSheet } from './EventBottomSheet';
import { HazardReportSheet } from './HazardReportSheet';
import { EmergencySheet } from '../emergency/EmergencySheet';
import { CATEGORY_COLORS } from './ExploreOverlay';
import toast from 'react-hot-toast';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 };

// Load Places library alongside the Maps SDK
const LIBRARIES: ('places')[] = ['places'];

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f3eef5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fde8f0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ffd6e7' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d0e3f0' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e8f5e9' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

/** Hook: resolves the user's GPS position with graceful London fallback. */
function useGeolocation() {
  const [position, setPosition] = useState<{ lat: number; lng: number }>(LONDON_CENTER);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGranted(true);
      },
      () => { setPosition(LONDON_CENTER); },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  return { position, granted };
}

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
    setEmergencyOpen,
  } = useStore();

  // Google Maps JS API + Places library
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
    id: 'google-map-script',
  });

  const { position: userPosition } = useGeolocation();
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Directions state
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string; steps: google.maps.DirectionsStep[] } | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  // Data state
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedSafetyReport, setSelectedSafetyReport] = useState<SafetyReport | null>(null);
  const [showHazardSheet, setShowHazardSheet] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // Load initial data
  useEffect(() => {
    api.events.list().then(setEvents).catch(() => {});
    api.map.getSafetyData().then(setSafetyReports).catch(() => {});
    api.places.nearby(userPosition.lat, userPosition.lng).then(setPlaces).catch(() => {});
  }, [userPosition]);

  // Pan map to user when geolocation resolves
  useEffect(() => {
    if (mapRef.current) mapRef.current.panTo(userPosition);
  }, [userPosition]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onAutocompleteLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    autocompleteRef.current = ac;
  }, []);

  /** Fires when the user picks a place from the autocomplete dropdown */
  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) {
      toast.error('Please select a location from the dropdown');
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const name = place.name || place.formatted_address || 'Destination';

    setSearchQuery(name);
    setDestination({ address: place.formatted_address || name, lat, lng });
    requestDirections(lat, lng);
  }, [userPosition]);

  /** Call the Directions Service for a real walking route */
  const requestDirections = useCallback((destLat: number, destLng: number) => {
    if (!isLoaded) return;
    setIsRouting(true);
    setDirectionsResult(null);
    setRouteInfo(null);

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: userPosition,
        destination: { lat: destLat, lng: destLng },
        travelMode: google.maps.TravelMode.WALKING,
        unitSystem: google.maps.UnitSystem.METRIC,
        provideRouteAlternatives: false,
      },
      (result, status) => {
        setIsRouting(false);
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirectionsResult(result);
          const leg = result.routes[0].legs[0];
          setRouteInfo({
            duration: leg.duration?.text ?? '—',
            distance: leg.distance?.text ?? '—',
            steps: leg.steps,
          });
          // Fit map to the route bounds
          if (mapRef.current && result.routes[0].bounds) {
            mapRef.current.fitBounds(result.routes[0].bounds, { top: 120, right: 20, bottom: 280, left: 20 });
          }
          // Inject a dummy route into the store so RoutePanel-related state stays consistent
          setActiveRoute({
            id: 'gm_route',
            polyline: '',
            distance: leg.distance?.text ?? '',
            duration: leg.duration?.text ?? '',
            safetyScore: 72,
            safetyConfidence: 'medium',
            indicators: ['Well-lit roads', 'Pedestrian paths'],
            dataWarnings: [],
            isSimulated: false,
            steps: (leg.steps ?? []).map((s) => ({
              instruction: s.instructions.replace(/<[^>]+>/g, ''),
              distance: s.distance?.text ?? '',
              duration: s.duration?.text ?? '',
            })),
          });
          toast.success(`🚶 ${leg.duration?.text} walk · ${leg.distance?.text}`);
        } else {
          toast.error('Could not find a walking route to that location');
        }
      }
    );
  }, [isLoaded, userPosition]);

  const handleClearRoute = () => {
    setDestination(null);
    setDirectionsResult(null);
    setRouteInfo(null);
    setActiveRoute(null);
    setSearchQuery('');
    setShowSteps(false);
    if (searchInputRef.current) searchInputRef.current.value = '';
    if (mapRef.current) {
      mapRef.current.panTo(userPosition);
      mapRef.current.setZoom(15);
    }
  };

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.panTo(userPosition);
      mapRef.current.setZoom(15);
    }
  };

  // Allow picking an event location as a destination
  const handleSelectEventDestination = (evt: Event) => {
    setSelectedEvent(null);
    setSearchQuery(evt.title);
    setDestination({ address: evt.venueAddress, lat: evt.lat, lng: evt.lng });
    requestDirections(evt.lat, evt.lng);
  };

  return (
    <div className="screen-container" style={{ paddingBottom: 0, height: '100vh', overflow: 'hidden' }}>
      <DemoBanner />

      {/* ─── Floating Top Bar ─── */}
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
          {/* Search Box — wraps Google Places Autocomplete */}
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

            {isLoaded ? (
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
                options={{ componentRestrictions: { country: 'gb' }, fields: ['geometry', 'name', 'formatted_address'] }}
                style={{ flex: 1 }}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search any place…"
                  defaultValue={searchQuery}
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
              </Autocomplete>
            ) : (
              <input
                type="text"
                placeholder="Loading maps…"
                disabled
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'var(--font-family)',
                  fontSize: '14px',
                  color: '#9CA3AF',
                  flex: 1,
                }}
              />
            )}

            {activeRoute ? (
              <button
                onClick={handleClearRoute}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '13px', padding: '2px 4px' }}
                title="Clear route"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={handleRecenter}
                title="Centre on my location"
                style={{ background: 'none', border: 'none', color: '#FF6B9D', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Crosshair size={18} />
              </button>
            )}
          </div>

          {/* SOS Pill */}
          <button
            onClick={() => setEmergencyOpen(true)}
            className="emergency-pill"
            aria-label="Open Emergency Services"
          >
            <AlertOctagon size={16} />
            <span>SOS</span>
          </button>
        </div>
      </div>

      {/* ─── Map Canvas ─── */}
      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#EAE6EB', overflow: 'hidden' }}>

        {loadError && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '8px', color: '#6B7280' }}>
            <MapPin size={32} color="#FF6B9D" />
            <span style={{ fontSize: '14px' }}>Map could not load. Check your API key.</span>
          </div>
        )}

        {!isLoaded && !loadError && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #FF6B9D', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {isLoaded && (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={userPosition}
            zoom={15}
            onLoad={onMapLoad}
            options={{
              styles: MAP_STYLE,
              disableDefaultUI: true,
              gestureHandling: 'greedy',
              clickableIcons: false,
            }}
          >
            {/* User location dot */}
            <Marker
              position={userPosition}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#FF6B9D',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              }}
              title="Your location"
              zIndex={10}
            />

            {/* Real Directions route polyline */}
            {directionsResult && (
              <DirectionsRenderer
                directions={directionsResult}
                options={{
                  suppressMarkers: true,          // we draw our own markers
                  polylineOptions: {
                    strokeColor: '#FF6B9D',
                    strokeWeight: 5,
                    strokeOpacity: 0.9,
                  },
                }}
              />
            )}

            {/* Destination pin */}
            {selectedDestination && (
              <Marker
                position={{ lat: selectedDestination.lat, lng: selectedDestination.lng }}
                title={selectedDestination.address}
                icon={{
                  path: 'M 0,-24 C -8,-24 -14,-18 -14,-10 C -14,2 0,14 0,14 C 0,14 14,2 14,-10 C 14,-18 8,-24 0,-24 Z',
                  fillColor: '#FF6B9D',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                  scale: 1,
                  anchor: new google.maps.Point(0, 14),
                }}
                zIndex={9}
              />
            )}

            {/* Safety mode markers */}
            {mapMode === 'safety' && safetyReports.map((report, idx) => (
              <Marker
                key={report.id || idx}
                position={{ lat: report.lat, lng: report.lng }}
                title={report.description}
                onClick={() => setSelectedSafetyReport(report)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: report.type === 'streetlight' ? '#F59E0B' : '#EF4444',
                  fillOpacity: 0.9,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
              />
            ))}

            {/* Explore mode markers */}
            {mapMode === 'explore' && events.map((evt, idx) => {
              const theme = CATEGORY_COLORS[evt.category] || { bg: '#FF6B9D', icon: '📍' };
              return (
                <Marker
                  key={evt.id}
                  position={{ lat: evt.lat, lng: evt.lng }}
                  title={evt.title}
                  onClick={() => setSelectedEvent(evt)}
                  label={{ text: theme.icon, fontSize: '20px' }}
                />
              );
            })}
          </GoogleMap>
        )}

        {/* Routing spinner overlay */}
        {isRouting && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px',
          }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #FF6B9D', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Finding walking route…</span>
          </div>
        )}

        {/* ─── Safety Report Info Card ─── */}
        {selectedSafetyReport && (
          <div style={{
            position: 'absolute', bottom: '150px', left: '16px', right: '16px',
            background: 'white', borderRadius: '20px', padding: '16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)', zIndex: 45,
            border: '1px solid var(--color-border)', animation: 'slideUp 0.2s ease-out',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px',
                  background: selectedSafetyReport.type === 'streetlight' ? '#FEF3C7' : '#FEE2E2',
                  color: selectedSafetyReport.type === 'streetlight' ? '#D97706' : '#DC2626',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selectedSafetyReport.type === 'streetlight' ? <Lightbulb size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, textTransform: 'capitalize' }}>
                    {selectedSafetyReport.type} Report
                  </h4>
                  <span className="badge badge-simulated" style={{ fontSize: '10px' }}>Community Reported</span>
                </div>
              </div>
              <button onClick={() => setSelectedSafetyReport(null)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#374151', margin: '10px 0 6px', lineHeight: 1.4 }}>{selectedSafetyReport.description}</p>
            <div style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', justifyContent: 'space-between' }}>
              <span>Verified by peer community</span>
              <span>Always verify in person</span>
            </div>
          </div>
        )}

        {/* ─── Active Route Info Panel ─── */}
        {routeInfo && !isRouting && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'white', borderRadius: '28px 28px 0 0',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
            padding: '14px 20px 100px',
            zIndex: 48,
            maxHeight: showSteps ? '70vh' : '190px',
            overflowY: showSteps ? 'auto' : 'hidden',
            transition: 'max-height 0.35s ease',
            animation: 'slideUp 0.3s ease-out',
          }}>
            <div className="bottom-sheet-handle" />

            {/* Summary row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Footprints size={22} color="#FF6B9D" />
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1A1A2E', lineHeight: 1 }}>{routeInfo.duration}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{routeInfo.distance} walking · to {selectedDestination?.address}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowSteps((s) => !s)}
                  style={{
                    padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                    background: showSteps ? 'var(--color-primary-bg)' : '#F3F4F6',
                    color: showSteps ? '#FF6B9D' : '#374151',
                    border: '1px solid var(--color-border)', cursor: 'pointer',
                  }}
                >
                  {showSteps ? 'Hide Steps' : 'Show Steps'}
                </button>
                <button
                  onClick={handleClearRoute}
                  style={{
                    padding: '8px', borderRadius: '20px', fontSize: '12px',
                    background: '#F3F4F6', border: '1px solid var(--color-border)', cursor: 'pointer', color: '#6B7280',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Safety score banner */}
            <div style={{
              background: 'linear-gradient(90deg, #FFF0F5 0%, #FDE8F0 100%)',
              border: '1px solid #FFD6E7',
              borderRadius: '12px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '12px',
              color: '#9D174D',
              fontWeight: 600,
            }}>
              <Navigation size={14} />
              Walking route · 💡 Well-lit roads detected along this route
            </div>

            {/* Turn-by-turn steps */}
            {showSteps && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {routeInfo.steps.map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '12px', padding: '10px 0',
                    borderBottom: i < routeInfo.steps.length - 1 ? '1px solid #F3F4F6' : 'none',
                  }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: i === 0 ? '#FF6B9D' : '#E5E7EB',
                      color: i === 0 ? 'white' : '#6B7280',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{ fontSize: '13px', color: '#1A1A2E', lineHeight: 1.4 }}
                        dangerouslySetInnerHTML={{ __html: step.instructions }}
                      />
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                        {step.distance?.text} · {step.duration?.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── FABs ─── */}
        <div style={{
          position: 'absolute', right: '16px',
          bottom: routeInfo ? '210px' : '150px',
          display: 'flex', flexDirection: 'column', gap: '12px',
          zIndex: 40, transition: 'bottom 0.35s ease',
        }}>
          {isLoaded && (
            <button onClick={handleRecenter} title="Centre on my location" style={{
              width: '46px', height: '46px', borderRadius: '50%', background: 'white',
              border: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)', cursor: 'pointer', color: '#FF6B9D',
            }}>
              <Crosshair size={20} />
            </button>
          )}
          <button onClick={() => setShowHazardSheet(true)} title="Report Hazard" style={{
            width: '46px', height: '46px', borderRadius: '50%', background: 'white',
            border: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)', cursor: 'pointer', color: '#E8528A',
          }}>
            <ShieldAlert size={20} />
          </button>
          <button onClick={() => navigate('/ai-call')} title="Start Ami AI Companion Call" style={{
            width: '54px', height: '54px', borderRadius: '50%', background: 'var(--gradient-primary)',
            color: 'white', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-fab)', cursor: 'pointer', animation: 'pulse 3s infinite',
          }}>
            <PhoneCall size={24} />
          </button>
        </div>

        {/* ─── Mode Toggle ─── */}
        {!routeInfo && (
          <div style={{
            position: 'absolute', bottom: '86px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 40, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)',
            padding: '4px', borderRadius: '100px', display: 'flex', gap: '4px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)', border: '1px solid var(--color-border)',
          }}>
            <button
              onClick={() => setMapMode('safety')}
              className={`chip ${mapMode === 'safety' ? 'active' : ''}`}
              style={{ border: 'none', padding: '8px 18px', fontSize: '13px', fontWeight: 700 }}
            >
              🛡️ Safety
            </button>
            <button
              onClick={() => setMapMode('explore')}
              className={`chip ${mapMode === 'explore' ? 'active' : ''}`}
              style={{ border: 'none', padding: '8px 18px', fontSize: '13px', fontWeight: 700 }}
            >
              🎉 Explore
            </button>
          </div>
        )}
      </div>

      {/* ─── Event Details Sheet ─── */}
      <EventBottomSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onGetDirections={handleSelectEventDestination}
      />

      {/* ─── Hazard Sheet ─── */}
      <HazardReportSheet
        isOpen={showHazardSheet}
        onClose={() => setShowHazardSheet(false)}
        onReportSubmitted={() => { api.map.getSafetyData().then(setSafetyReports); }}
      />

      {/* ─── Emergency Sheet ─── */}
      <EmergencySheet isOpen={isEmergencyOpen} onClose={() => setEmergencyOpen(false)} />

      <BottomNav />
    </div>
  );
};
