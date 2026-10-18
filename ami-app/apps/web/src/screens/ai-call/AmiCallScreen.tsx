import React, { useState } from 'react';
import { Mic, MicOff, PhoneOff, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';

export const AmiCallScreen: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    const widget = document.querySelector('elevenlabs-convai');
    const muteButton = widget?.shadowRoot?.querySelector<HTMLButtonElement>(
      `button[aria-label="${isMuted ? 'Unmute microphone' : 'Mute microphone'}"]`,
    );
    if (!muteButton) {
      toast.error('Microphone controls are not available yet.');
      return;
    }
    muteButton.click();
    setIsMuted((muted) => !muted);
  };

  const endCall = () => window.dispatchEvent(new Event('ami-call-end'));

  return (
    <main className="ami-call-screen">
      <img
        className="ami-call-background"
        src="/images/adam.png"
        alt=""
        aria-hidden="true"
      />
      <div className="ami-call-shade" />
      <header className="ami-call-header">
        <div className="ami-call-status-icon"><UserRound size={18} /></div>
        <div className="ami-call-header-copy">
          <strong>Adam</strong>
          <span>ElevenLabs voice call</span>
        </div>
      </header>
      <div className="ami-call-agent">
        <div className="ami-call-agent-caption">
          <h1>Adam</h1>
          <p>Tap the microphone to mute or unmute</p>
        </div>
      </div>
      <footer className="ami-call-controls">
        <div className="ami-call-control-row">
          <button
            className={`ami-call-control-button ${isMuted ? 'is-active' : ''}`}
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute Adam call microphone' : 'Mute Adam call microphone'}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          <button
            className="ami-call-end-button"
            type="button"
            onClick={endCall}
            aria-label="End call"
            title="End call"
          >
            <PhoneOff size={24} />
          </button>
          <span className="ami-call-control-spacer" aria-hidden="true" />
        </div>
      </footer>
    </main>
  );
};
