import React from 'react';
import { AlertTriangle, Phone, X } from 'lucide-react';

interface SafetyAlertOverlayProps {
  alert: { reason: string; countdown: number } | null;
  onCancel: () => void;
  onGetHelp: () => void;
}

export const SafetyAlertOverlay: React.FC<SafetyAlertOverlayProps> = ({
  alert,
  onCancel,
  onGetHelp,
}) => {
  if (!alert) return null;

  return (
    <div className="ami-safety-alert-backdrop">
      <section className="ami-safety-alert" role="alertdialog" aria-modal="true" aria-labelledby="ami-safety-alert-title">
        <div className="ami-safety-alert-icon"><AlertTriangle size={28} /></div>
        <h2 id="ami-safety-alert-title">Do you need emergency help?</h2>
        <p>{alert.reason}</p>
        <p className="ami-safety-countdown">
          Opening the emergency dialer in <strong>{alert.countdown}</strong> seconds.
        </p>
        <div className="ami-safety-alert-actions">
          <button type="button" className="btn btn-secondary btn-full" onClick={onCancel}>
            <X size={18} /> I&apos;m safe — cancel
          </button>
          <button type="button" className="btn btn-danger btn-full" onClick={onGetHelp}>
            <Phone size={18} /> Open emergency help now
          </button>
        </div>
        <small>At the end of the countdown, the app opens the phone dialer. You must confirm the call.</small>
      </section>
    </div>
  );
};
