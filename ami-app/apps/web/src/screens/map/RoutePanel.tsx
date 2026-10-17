import React from 'react';
import { RouteOption } from '../../types';
import { Navigation, Clock, Shield, AlertTriangle, CheckCircle, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface RoutePanelProps {
  routes: RouteOption[];
  activeRoute: RouteOption | null;
  onSelectRoute: (route: RouteOption) => void;
  onClose: () => void;
  destinationAddress?: string;
}

export const RoutePanel: React.FC<RoutePanelProps> = ({
  routes,
  activeRoute,
  onSelectRoute,
  onClose,
  destinationAddress,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10B981'; // Green
    if (score >= 40) return '#F59E0B'; // Amber
    return '#9CA3AF'; // Grey
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'High indicator coverage';
    if (score >= 40) return 'Moderate indicator coverage';
    return 'Low indicator coverage';
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderRadius: '28px 28px 0 0',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
        padding: '12px 20px 24px',
        zIndex: 48,
        maxHeight: '65vh',
        overflowY: 'auto',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div className="bottom-sheet-handle" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-dark)' }}>
            Suggested Walking Routes
          </h3>
          {destinationAddress && (
            <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              To: {destinationAddress}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '4px' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Routes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {routes.map((route) => {
          const isSelected = activeRoute?.id === route.id;
          const scoreColor = getScoreColor(route.safetyScore);

          return (
            <div
              key={route.id}
              onClick={() => onSelectRoute(route)}
              style={{
                border: isSelected ? '2px solid #FF6B9D' : '1.5px solid var(--color-border)',
                background: isSelected ? 'var(--color-primary-bg)' : 'white',
                borderRadius: '20px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Top Row: Distance & Time */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Navigation size={18} color="#FF6B9D" />
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>{route.duration}</span>
                  <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>({route.distance})</span>
                </div>
                {route.isSimulated && (
                  <span className="badge badge-simulated" style={{ fontSize: '10px' }}>
                    Demo Data
                  </span>
                )}
              </div>

              {/* Score Bar */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>
                    Route Indicator Score: {route.safetyScore}/100
                  </span>
                  <span style={{ color: scoreColor, fontWeight: 700 }}>
                    {getScoreLabel(route.safetyScore)}
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${route.safetyScore}%`,
                      height: '100%',
                      background: scoreColor,
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Indicators Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {route.indicators.map((ind, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid var(--color-border)',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      color: '#374151',
                    }}
                  >
                    {ind}
                  </span>
                ))}
              </div>

              {/* Data Warnings */}
              {route.dataWarnings && route.dataWarnings.length > 0 && (
                <div
                  style={{
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    fontSize: '11px',
                    color: '#92400E',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '10px',
                  }}
                >
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>{route.dataWarnings[0]}</span>
                </div>
              )}

              {/* Select Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRoute(route);
                  toast.success(`Navigation started via ${route.duration} route`);
                }}
                className={`btn btn-full ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '10px 16px', fontSize: '13px', borderRadius: '12px' }}
              >
                {isSelected ? '✓ Route Active — Follow Path' : 'Select This Route'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
