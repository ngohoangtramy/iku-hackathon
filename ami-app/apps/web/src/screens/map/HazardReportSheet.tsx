import React, { useState } from 'react';
import { ShieldAlert, MapPin, X, AlertTriangle, Lightbulb, UserX, Construction, HelpCircle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface HazardReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted?: () => void;
  currentLat?: number;
  currentLng?: number;
}

export const HazardReportSheet: React.FC<HazardReportSheetProps> = ({
  isOpen,
  onClose,
  onReportSubmitted,
  currentLat = 51.5074,
  currentLng = -0.1278,
}) => {
  const [selectedType, setSelectedType] = useState<'streetlight' | 'incident' | 'hazard' | 'other'>('streetlight');
  const [description, setDescription] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const hazardTypes = [
    { id: 'streetlight', label: 'Poor / Dark Lighting', icon: <Lightbulb size={18} /> },
    { id: 'incident', label: 'Suspicious Activity', icon: <UserX size={18} /> },
    { id: 'hazard', label: 'Blocked / Unsafe Path', icon: <Construction size={18} /> },
    { id: 'other', label: 'Other Hazard', icon: <HelpCircle size={18} /> },
  ] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please provide a brief description of the condition');
      return;
    }

    setLoading(true);
    try {
      await api.map.reportHazard({
        lat: currentLat,
        lng: currentLng,
        type: selectedType === 'other' ? 'hazard' : selectedType,
        description,
      });
      toast.success('Thank you! Community report submitted.');
      if (onReportSubmitted) onReportSubmitted();
      onClose();
    } catch {
      toast.error('Could not submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-handle" />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Report Safety Hazard</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Type Selector */}
          <div>
            <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>
              Hazard Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {hazardTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedType(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '14px',
                    border: selectedType === t.id ? '2px solid #FF6B9D' : '1.5px solid var(--color-border)',
                    background: selectedType === t.id ? '#FFF0F5' : 'white',
                    color: selectedType === t.id ? '#E8528A' : '#374151',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="input-group">
            <label className="input-label">Description / Details</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Streetlights off along pedestrian tunnel, narrow detour..."
              rows={3}
              className="input"
              style={{ resize: 'none', fontSize: '14px' }}
              required
            />
          </div>

          {/* Location toggle */}
          <div
            onClick={() => setUseCurrentLocation(!useCurrentLocation)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F9FAFB',
              border: '1px solid var(--color-border)',
              borderRadius: '14px',
              padding: '12px 14px',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} color="#E8528A" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Use my current location</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                  London, Central (51.5074, -0.1278)
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={useCurrentLocation}
              onChange={() => {}}
              style={{ accentColor: '#FF6B9D', width: '18px', height: '18px' }}
            />
          </div>

          {/* Disclaimer */}
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              padding: '10px 12px',
              fontSize: '11px',
              color: '#92400E',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              Reports are community-contributed to alert peers and may not reflect real-time council maintenance.
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full"
            style={{ marginTop: '4px' }}
          >
            {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Submit Community Report'}
          </button>
        </form>
      </div>
    </div>
  );
};
