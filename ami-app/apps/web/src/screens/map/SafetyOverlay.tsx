import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import type { SafetyReport } from '../../types';
import { Lightbulb, AlertTriangle, Building2, X, ShieldAlert } from 'lucide-react';

interface SafetyOverlayProps {
  onSelectReport?: (report: SafetyReport) => void;
  reports?: SafetyReport[];
}

export const SafetyOverlay: React.FC<SafetyOverlayProps> = ({ onSelectReport, reports: customReports }) => {
  const [reports, setReports] = useState<SafetyReport[]>(customReports || []);
  const [activeReport, setActiveReport] = useState<SafetyReport | null>(null);

  useEffect(() => {
    if (!customReports) {
      api.map.getSafetyData().then(setReports).catch(() => {});
    } else {
      setReports(customReports);
    }
  }, [customReports]);

  return (
    <>
      {/* Floating InfoCard if a marker is selected */}
      {activeReport && (
        <div
          style={{
            position: 'absolute',
            bottom: '140px',
            left: '16px',
            right: '16px',
            background: 'white',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            zIndex: 40,
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
                  background:
                    activeReport.type === 'streetlight'
                      ? '#FEF3C7'
                      : activeReport.type === 'incident'
                      ? '#FEE2E2'
                      : '#CCFBF1',
                  color:
                    activeReport.type === 'streetlight'
                      ? '#D97706'
                      : activeReport.type === 'incident'
                      ? '#DC2626'
                      : '#0D9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeReport.type === 'streetlight' && <Lightbulb size={18} />}
                {activeReport.type === 'incident' && <AlertTriangle size={18} />}
                {activeReport.type === 'hazard' && <ShieldAlert size={18} />}
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, textTransform: 'capitalize' }}>
                  {activeReport.type} Report
                </h4>
                <span className="badge badge-simulated" style={{ fontSize: '10px' }}>
                  Community Reported
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveReport(null)}
              style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          <p style={{ fontSize: '13px', color: '#374151', margin: '10px 0 6px', lineHeight: 1.4 }}>
            {activeReport.description}
          </p>

          <div
            style={{
              fontSize: '11px',
              color: '#9CA3AF',
              borderTop: '1px solid #F3F4F6',
              paddingTop: '6px',
              marginTop: '6px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Reported {new Date(activeReport.reportedAt).toLocaleDateString()}</span>
            <span>Verify in person</span>
          </div>
        </div>
      )}
    </>
  );
};
