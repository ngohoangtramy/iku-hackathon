import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Crosshair,
  Footprints,
  Heart,
  Lightbulb,
  MapPin,
  Navigation,
  PhoneCall,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  X,
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
import 'leaflet/dist/leaflet.css';

const LONDON_CENTER: [number, number] = [51.5074, -0.1278];
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const BROUTER_URL = 'https://brouter.de/brouter';

interface SearchPlace {
  lat: number;
  lng: number;
  name: string;
  address: string;
}

interface WalkingRoute {
  id: string;
  label: string;
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  safetyScore: number;
  safetyConfidence: 'high' | 'medium' | 'low' | 'insufficient';
  indicators: string[];
  reportCount: number;
  isRecommended: boolean;
}

function createPinIcon(emoji: string, variant: 'pink' | 'mint' = 'pink') {
  const color = variant === 'mint' ? '#54B987' : '#EE6D9D';
  return L.divIcon({
    className: 'ami-map-pin-wrap',
    html: `<span class="ami-map-pin" style="--pin-color:${color}"><i>${emoji}</i></span>`,
    iconSize: [38, 44],
    iconAnchor: [19, 40],
    popupAnchor: [0, -36],
  });
}

const userIcon = L.divIcon({
  className: 'ami-user-pin-wrap',
  html: '<span class="ami-user-pin"><span></span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapViewport({
  center,
  route,
}: {
  center: [number, number];
  route: WalkingRoute | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (route?.coordinates.length) {
      map.fitBounds(route.coordinates, { paddingTopLeft: [36, 120], paddingBottomRight: [36, 300], maxZoom: 17 });
      return;
    }
    map.setView(center, 15, { animate: true });
  }, [center, map, route]);

  return null;
}

function distanceToRouteMeters(report: SafetyReport, route: WalkingRoute): number {
  let nearest = Number.POSITIVE_INFINITY;
  const latFactor = 111_320;
  const lngFactor = Math.cos((report.lat * Math.PI) / 180) * 111_320;

  for (const [lat, lng] of route.coordinates) {
    const dy = (lat - report.lat) * latFactor;
    const dx = (lng - report.lng) * lngFactor;
    nearest = Math.min(nearest, Math.sqrt(dx * dx + dy * dy));
  }

  return nearest;
}

function scoreRoute(route: WalkingRoute, reports: SafetyReport[]) {
  const nearby = reports.filter((report) => distanceToRouteMeters(report, route) <= 60);
  const lights = nearby.filter((report) => report.type === 'streetlight').length;
  const hazards = nearby.length - lights;

  return {
    safetyScore: Math.max(0, Math.min(100, 60 + lights * 8 - hazards * 15)),
    safetyConfidence: nearby.length >= 5 ? 'medium' as const : nearby.length ? 'low' as const : 'insufficient' as const,
    indicators: nearby.length
      ? [`${lights} working-light report${lights === 1 ? '' : 's'}`, `${hazards} hazard/incident report${hazards === 1 ? '' : 's'}`]
      : ['No community reports found along this path'],
    reportCount: nearby.length,
  };
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min${minutes === 1 ? '' : 's'}`;
}

function simplifyAddress(address: string): string {
  return address.split(',').slice(0, 3).join(',').trim();
}

/** Gets the user's location when available; otherwise use the demo's London centre. */
function useGeolocation() {
  const [position, setPosition] = useState<[number, number]>(LONDON_CENTER);
  const [hasGps, setHasGps] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition([coords.latitude, coords.longitude]);
        setHasGps(true);
      },
      () => setHasGps(false),
      { timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  return { position, hasGps };
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
    isDemoBannerDismissed,
  } = useStore();
  const { position: userPosition, hasGps } = useGeolocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [routes, setRoutes] = useState<WalkingRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>([]);
  const [, setPlaces] = useState<Place[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedSafetyReport, setSelectedSafetyReport] = useState<SafetyReport | null>(null);
  const [showHazardSheet, setShowHazardSheet] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchAbortRef = useRef<AbortController | null>(null);
  const lastGeocodeAtRef = useRef(0);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  useEffect(() => {
    api.events.list().then(setEvents).catch(() => {});
    api.map.getSafetyData().then(setSafetyReports).catch(() => {});
    api.places.nearby(userPosition[0], userPosition[1]).then(setPlaces).catch(() => {});
  }, [userPosition]);

  const findRoutes = useCallback(async (place: SearchPlace) => {
    setDestination({ address: place.address, lat: place.lat, lng: place.lng });
    setSearchQuery(place.name);
    setSearchResults([]);
    setSearchError('');
    setIsRouting(true);
    setRoutes([]);
    setSelectedRouteId(null);
    setActiveRoute(null);

    try {
      const foundRoutes: WalkingRoute[] = [];
      for (let alternative = 0; alternative < 3; alternative += 1) {
        const params = new URLSearchParams({
          lonlats: `${userPosition[1]},${userPosition[0]}|${place.lng},${place.lat}`,
          profile: 'trekking',
          alternativeidx: String(alternative),
          format: 'geojson',
        });
        const response = await fetch(`${BROUTER_URL}?${params.toString()}`);
        if (!response.ok) {
          if (alternative === 0) throw new Error('The walking-route service is temporarily unavailable. Please try again shortly.');
          break;
        }

        const data = await response.json() as {
          features?: Array<{
            geometry?: { type?: string; coordinates?: [number, number][] };
            properties?: Record<string, unknown>;
          }>;
        };
        const feature = data.features?.find((item) => item.geometry?.type === 'LineString' && item.geometry.coordinates?.length);
        if (!feature?.geometry?.coordinates) break;

        const properties = feature.properties ?? {};
        const path: WalkingRoute = {
          id: `brouter-${alternative}`,
          label: alternative === 0 ? 'Scenic walking path' : `Walking alternative ${alternative}`,
          coordinates: feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          distanceMeters: Number(properties['track-length']) || 0,
          durationSeconds: Number(properties['total-time']) || 0,
          safetyScore: 60,
          safetyConfidence: 'insufficient',
          indicators: [],
          reportCount: 0,
          isRecommended: false,
        };
        foundRoutes.push({ ...path, ...scoreRoute(path, safetyReports) });
      }

      if (!foundRoutes.length) throw new Error('No walkable route was found for those locations. Try a nearby address.');

      foundRoutes.sort((a, b) => b.safetyScore - a.safetyScore || a.durationSeconds - b.durationSeconds);
      foundRoutes[0].isRecommended = true;
      setRoutes(foundRoutes);
      setSelectedRouteId(foundRoutes[0].id);
      setActiveRoute({
        id: foundRoutes[0].id,
        polyline: '',
        distance: formatDistance(foundRoutes[0].distanceMeters),
        duration: formatDuration(foundRoutes[0].durationSeconds),
        safetyScore: foundRoutes[0].safetyScore,
        safetyConfidence: foundRoutes[0].safetyConfidence,
        indicators: foundRoutes[0].indicators,
        dataWarnings: ['OpenStreetMap walking route compared with available community reports. Conditions can change; no route is guaranteed safe.'],
        isSimulated: foundRoutes[0].reportCount === 0,
        steps: [{ instruction: 'Follow the highlighted walking path to your destination.', distance: formatDistance(foundRoutes[0].distanceMeters), duration: formatDuration(foundRoutes[0].durationSeconds) }],
      });
      toast.success(`Route ready · ${formatDuration(foundRoutes[0].durationSeconds)} walk`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not find a walking route.';
      setSearchError(message);
      toast.error(message);
    } finally {
      setIsRouting(false);
    }
  }, [safetyReports, setActiveRoute, setDestination, userPosition]);

  const searchLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchError('Type at least 3 characters to search.');
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const waitMs = Math.max(0, 1100 - (Date.now() - lastGeocodeAtRef.current));
      if (waitMs) await new Promise((resolve) => window.setTimeout(resolve, waitMs));
      if (controller.signal.aborted) return;
      lastGeocodeAtRef.current = Date.now();
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'gb',
      });
      const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Place search is temporarily unavailable. Please try again.');
      const results = await response.json() as Array<{ lat: string; lon: string; name?: string; display_name: string }>;
      const placesFound = results.map((result) => ({
        lat: Number(result.lat),
        lng: Number(result.lon),
        name: result.name || simplifyAddress(result.display_name),
        address: result.display_name,
      }));
      if (!placesFound.length) {
        setSearchError('No places found. Try a full address or a nearby landmark.');
      } else if (placesFound.length === 1) {
        await findRoutes(placesFound[0]);
      } else {
        setSearchResults(placesFound);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setSearchError(error instanceof Error ? error.message : 'Place search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const activateRoute = (route: WalkingRoute) => {
    setSelectedRouteId(route.id);
    setActiveRoute({
      id: route.id,
      polyline: '',
      distance: formatDistance(route.distanceMeters),
      duration: formatDuration(route.durationSeconds),
      safetyScore: route.safetyScore,
      safetyConfidence: route.safetyConfidence,
      indicators: route.indicators,
      dataWarnings: ['OpenStreetMap walking route compared with available community reports. Conditions can change; no route is guaranteed safe.'],
      isSimulated: route.reportCount === 0,
      steps: [{ instruction: 'Follow the highlighted walking path to your destination.', distance: formatDistance(route.distanceMeters), duration: formatDuration(route.durationSeconds) }],
    });
  };

  const clearRoute = () => {
    setDestination(null);
    setRoutes([]);
    setSelectedRouteId(null);
    setActiveRoute(null);
    setSearchResults([]);
    setSearchError('');
    setShowSteps(false);
    setSearchQuery('');
  };

  const handleRecenter = () => {
    const map = document.querySelector('.leaflet-container') as HTMLElement | null;
    if (map) map.dispatchEvent(new CustomEvent('ami-map-recenter'));
  };

  const handleEventDestination = (event: Event) => {
    setSelectedEvent(null);
    void findRoutes({ lat: event.lat, lng: event.lng, name: event.title, address: event.venueAddress });
  };

  return (
    <main className="ami-map-screen screen-container">
      <DemoBanner />

      <div className="ami-map-canvas">
        <MapContainer
          center={userPosition}
          zoom={15}
          zoomControl={false}
          scrollWheelZoom
          className="ami-leaflet-map"
          preferCanvas
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewport center={userPosition} route={selectedRoute} />
          <RecenterControl center={userPosition} />

          {selectedRoute && (
            <Polyline
              positions={selectedRoute.coordinates}
              pathOptions={{ color: '#EA6B9A', weight: 8, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }}
            />
          )}
          {routes.filter((route) => route.id !== selectedRouteId).map((route) => (
            <Polyline
              key={route.id}
              positions={route.coordinates}
              pathOptions={{ color: '#9F8DC8', weight: 4, opacity: 0.55, dashArray: '8 10' }}
            />
          ))}
          {selectedRoute && (
            <Polyline
              positions={selectedRoute.coordinates}
              pathOptions={{ color: '#EA6B9A', weight: 6, opacity: 0.96, lineCap: 'round', lineJoin: 'round' }}
            />
          )}

          <Marker position={userPosition} icon={userIcon} title={hasGps ? 'Your location' : 'Demo location'}>
            <Popup>{hasGps ? 'You are here' : 'Demo start location — enable location for your real position'}</Popup>
          </Marker>
          {selectedDestination && (
            <Marker position={[selectedDestination.lat, selectedDestination.lng]} icon={createPinIcon('💗')}>
              <Popup>{selectedDestination.address}</Popup>
            </Marker>
          )}

          {mapMode === 'safety' && safetyReports.map((report) => (
            <CircleMarker
              key={report.id}
              center={[report.lat, report.lng]}
              radius={9}
              pathOptions={{
                color: '#fff',
                weight: 3,
                fillColor: report.type === 'streetlight' ? '#E8AA52' : '#E57686',
                fillOpacity: 0.95,
              }}
              eventHandlers={{ click: () => setSelectedSafetyReport(report) }}
            />
          ))}
          {mapMode === 'explore' && events.map((event) => {
            const theme = CATEGORY_COLORS[event.category] || { bg: '#EE6D9D', icon: '📍' };
            return (
              <Marker
                key={event.id}
                position={[event.lat, event.lng]}
                icon={createPinIcon(theme.icon, 'mint')}
                eventHandlers={{ click: () => setSelectedEvent(event) }}
              />
            );
          })}
        </MapContainer>

        <header className="ami-map-topbar" style={{ top: isDemoBannerDismissed ? 13 : 51 }}>
          <div className="ami-map-brandline">
            <div className="ami-map-brand"><span className="ami-brand-flower">✿</span> ami <span className="ami-brand-dot">·</span> your city buddy</div>
            <button className="ami-sos-button" onClick={() => setEmergencyOpen(true)} aria-label="Open emergency help">
              <AlertOctagon size={16} /> help
            </button>
          </div>
          <div className="ami-map-headline">Where to, lovely?</div>
          <form className="ami-map-search" onSubmit={searchLocation}>
            <Search size={19} aria-hidden="true" />
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchResults([]);
                setSearchError('');
              }}
              placeholder="Search an address or place"
              aria-label="Search for a place"
            />
            {searchQuery && (
              <button type="button" className="ami-clear-search" aria-label="Clear search" onClick={clearRoute}><X size={17} /></button>
            )}
            <button className="ami-search-submit" type="submit" disabled={isSearching || isRouting} aria-label="Search">
              {isSearching ? <span className="ami-mini-spinner" /> : <ArrowRight size={18} />}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="ami-search-results" role="listbox" aria-label="Place search results">
              {searchResults.map((place) => (
                <button key={`${place.lat}-${place.lng}`} onClick={() => void findRoutes(place)} role="option" aria-selected="false">
                  <span className="ami-result-pin"><MapPin size={17} /></span>
                  <span><strong>{place.name}</strong><small>{place.address}</small></span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          )}
          {searchError && <div className="ami-search-error"><AlertTriangle size={15} />{searchError}</div>}
        </header>

        <div className="ami-map-mode-switch" aria-label="Map layer">
          <button className={mapMode === 'safety' ? 'is-selected' : ''} onClick={() => setMapMode('safety')}>
            <Shield size={15} /> Safety
          </button>
          <button className={mapMode === 'explore' ? 'is-selected' : ''} onClick={() => setMapMode('explore')}>
            <Sparkles size={15} /> Explore
          </button>
        </div>

        <div className={`ami-map-floating-actions ${routes.length ? 'has-route' : ''}`}>
          <button className="ami-map-fab ami-recenter-fab" onClick={handleRecenter} title="Centre on my location" aria-label="Centre on my location">
            <Crosshair size={20} />
          </button>
          <button className="ami-map-fab ami-report-fab" onClick={() => setShowHazardSheet(true)} title="Report a safety issue" aria-label="Report a safety issue">
            <ShieldAlert size={20} />
          </button>
          <button className="ami-map-fab ami-call-fab" onClick={() => navigate('/ai-call')} title="Call Ami" aria-label="Call Ami">
            <PhoneCall size={21} />
          </button>
        </div>

        {selectedSafetyReport && (
          <aside className="ami-report-card">
            <div className="ami-report-card-icon">{selectedSafetyReport.type === 'streetlight' ? <Lightbulb size={18} /> : <AlertTriangle size={18} />}</div>
            <div className="ami-report-card-copy">
              <strong>{selectedSafetyReport.type.replace('_', ' ')} report</strong>
              <span>{selectedSafetyReport.description}</span>
              <small>Community report · please verify conditions</small>
            </div>
            <button aria-label="Close report details" onClick={() => setSelectedSafetyReport(null)}><X size={18} /></button>
          </aside>
        )}

        {isRouting && (
          <div className="ami-routing-toast"><span className="ami-mini-spinner" />Finding a lovely walking route…</div>
        )}

        {!routes.length && !isRouting && !selectedDestination && (
          <div className="ami-map-nudge"><span>🌷</span><div><strong>Little steps, more confidence</strong><small>Search a place to see a walking route and local reports.</small></div></div>
        )}

        {selectedRoute && !isRouting && (
          <section className={`ami-route-sheet ${showSteps ? 'is-expanded' : ''}`}>
            <div className="ami-sheet-handle" />
            <div className="ami-route-heading">
              <div className="ami-route-heading-icon"><Footprints size={21} /></div>
              <div className="ami-route-heading-copy">
                <div className="ami-route-eyebrow"><span className="ami-sparkle-dot">✦</span> Your walking plan</div>
                <strong>{selectedDestination?.address ? simplifyAddress(selectedDestination.address) : 'Your destination'}</strong>
              </div>
              <button className="ami-route-close" onClick={clearRoute} aria-label="Clear route"><X size={18} /></button>
            </div>

            <div className="ami-route-summary">
              <div><strong>{formatDuration(selectedRoute.durationSeconds)}</strong><span>walking</span></div>
              <i />
              <div><strong>{formatDistance(selectedRoute.distanceMeters)}</strong><span>distance</span></div>
              <div className="ami-route-score"><span className="ami-score-flower">✿</span><div><strong>{selectedRoute.safetyConfidence === 'insufficient' ? 'No data yet' : `${selectedRoute.safetyScore}/100`}</strong><span>community reports</span></div></div>
            </div>

            {routes.length > 1 && (
              <div className="ami-route-options">
                <div className="ami-section-label">Pick your path <span>({routes.length} options)</span></div>
                <div className="ami-route-option-list">
                  {routes.map((route, index) => (
                    <button
                      key={route.id}
                      className={`ami-route-option ${route.id === selectedRoute.id ? 'is-selected' : ''}`}
                      onClick={() => activateRoute(route)}
                      aria-pressed={route.id === selectedRoute.id}
                    >
                      <span className="ami-option-check">{route.id === selectedRoute.id ? <Check size={14} /> : <span>{index + 1}</span>}</span>
                      <span className="ami-option-copy"><strong>{index === 0 && route.isRecommended ? 'Best match' : route.label}</strong><small>{formatDuration(route.durationSeconds)} · {formatDistance(route.distanceMeters)}</small></span>
                      <span className="ami-option-rating">{route.safetyConfidence === 'insufficient' ? '—' : route.safetyScore}</span>
                    </button>
                  ))}
                </div>
                <p className="ami-route-disclaimer">Suggestions are based on nearby community reports, not a safety guarantee. Stay aware and trust your instincts.</p>
              </div>
            )}

            <button className="ami-steps-toggle" onClick={() => setShowSteps((shown) => !shown)}>
              {showSteps ? 'Hide route details' : 'See route details'} <ArrowRight size={15} className={showSteps ? 'rotate-down' : ''} />
            </button>
            {showSteps && <p className="ami-step-detail"><Navigation size={15} /> Follow the highlighted walking path to your destination.</p>}
            <button className="ami-start-route" onClick={() => toast.success('Route selected — stay aware and enjoy your walk!')}>
              <Heart size={17} fill="currentColor" /> Let’s go
            </button>
          </section>
        )}
      </div>

      <EventBottomSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} onGetDirections={handleEventDestination} />
      <HazardReportSheet
        isOpen={showHazardSheet}
        onClose={() => setShowHazardSheet(false)}
        currentLat={userPosition[0]}
        currentLng={userPosition[1]}
        onReportSubmitted={() => { api.map.getSafetyData().then(setSafetyReports); }}
      />
      <EmergencySheet isOpen={isEmergencyOpen} onClose={() => setEmergencyOpen(false)} />
      <BottomNav />
    </main>
  );
};

function RecenterControl({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const element = map.getContainer();
    const recenter = () => map.setView(center, 15, { animate: true });
    element.addEventListener('ami-map-recenter', recenter);
    return () => element.removeEventListener('ami-map-recenter', recenter);
  }, [center, map]);
  return null;
}