import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX, 
  Minimize2, 
  Sparkles, 
  ShieldAlert, 
  AlertTriangle,
  Send,
  Camera
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import api from '../../lib/api';
import { AmiAvatar } from './AmiAvatar';
import { DistressConsentSheet } from './DistressConsentSheet';
import { DistressOverlay } from './DistressOverlay';
import { EmergencySheet } from '../emergency/EmergencySheet';
import toast from 'react-hot-toast';

export const AmiCallScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setEmergencyOpen, isEmergencyOpen } = useStore();

  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [distressEnabled, setDistressEnabled] = useState(false);
  const [showDistressConsent, setShowDistressConsent] = useState(false);
  const [showDistressAlert, setShowDistressAlert] = useState(false);

  const [transcript, setTranscript] = useState<{ sender: 'user' | 'ami'; text: string }[]>([
    { sender: 'ami', text: "Hi Sarah! I'm Leo, your Ami companion. Where are you walking right now? I'm right here with you." }
  ]);
  const [userPrompt, setUserPrompt] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Call timer counter
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web camera initialization with simulated fallback
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isVideoOn && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          // Camera access unavailable or blocked in sandboxed iframe — fallback to simulation
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoOn]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    toast('Call ended safely');
    navigate('/map');
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    setTranscript((prev) => [...prev, { sender: 'user', text }]);
    setUserPrompt('');
    setIsListening(false);
    setIsSpeaking(true);

    try {
      const response = await api.aiCall.sendMessage('session_active', text);
      setTimeout(() => {
        setTranscript((prev) => [...prev, { sender: 'ami', text: response.reply }]);
        // Stop speaking animation after 3.5 seconds
        setTimeout(() => setIsSpeaking(false), 3500);
      }, 900);
    } catch {
      setIsSpeaking(false);
    }
  };

  const triggerSimulatedSpeech = (phrase: string) => {
    handleSendMessage(phrase);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(180deg, #1A1A2E 0%, #2D1B36 50%, #4A1942 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        color: 'white',
      }}
    >
      {/* Top Bar: DEMO Badge, Timer, Minimize */}
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="badge badge-demo"
            style={{
              background: 'rgba(255, 180, 0, 0.2)',
              color: '#FBBF24',
              border: '1px solid #F59E0B',
              fontSize: '11px',
            }}
          >
            AI Companion • DEMO
          </span>
        </div>

        {/* Timer */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(8px)',
            borderRadius: '100px',
            padding: '4px 14px',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '1px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {formatDuration(callDuration)}
        </div>

        {/* Minimize Button */}
        <button
          onClick={() => navigate('/map')}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Minimize call"
        >
          <Minimize2 size={18} />
        </button>
      </div>

      {/* User Self-View Front Camera Card (Top-Right Floating 100x140) */}
      <div
        style={{
          position: 'absolute',
          top: '70px',
          right: '16px',
          width: '100px',
          height: '140px',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          border: '2px solid rgba(255, 255, 255, 0.4)',
          background: '#2B2B3E',
          zIndex: 40,
        }}
      >
        {isVideoOn ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF',
              fontSize: '10px',
              gap: '4px',
            }}
          >
            <VideoOff size={20} />
            <span>Camera Off</span>
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            left: '4px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '6px',
            padding: '2px 6px',
            fontSize: '9px',
            color: 'white',
          }}
        >
          You
        </div>
      </div>

      {/* Main Avatar Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '10px 0',
        }}
      >
        <AmiAvatar
          isSpeaking={isSpeaking}
          isListening={isListening}
          emotion="happy"
        />

        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginBottom: '2px' }}>
            Leo • Ami AI Companion
          </h2>
          <span style={{ fontSize: '12px', color: '#FFB3CC', fontWeight: 600 }}>
            {isSpeaking ? 'Speaking...' : isListening ? 'Listening to you...' : 'Connected • Keeping you company'}
          </span>
        </div>

        {/* Speech indicator waveform */}
        {isSpeaking && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '18px', marginTop: '8px' }}>
            {[14, 22, 10, 26, 18, 12, 24, 16].map((h, i) => (
              <div
                key={i}
                style={{
                  width: '3px',
                  height: `${h}px`,
                  background: '#FF6B9D',
                  borderRadius: '2px',
                  animation: 'pulse 0.6s ease-in-out infinite alternate',
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Live Transcript Bubble */}
      <div style={{ padding: '0 20px', zIndex: 30 }}>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(12px)',
            borderRadius: '20px',
            padding: '12px 16px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            maxHeight: '90px',
            overflowY: 'auto',
          }}
        >
          {transcript.slice(-2).map((item, idx) => (
            <div key={idx} style={{ fontSize: '13px', lineHeight: 1.4, marginBottom: '4px' }}>
              <strong style={{ color: item.sender === 'ami' ? '#FFB3CC' : '#93C5FD' }}>
                {item.sender === 'ami' ? 'Leo: ' : 'You: '}
              </strong>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Demo Fast Speaking Suggestions */}
        <div className="scroll-x" style={{ paddingTop: '8px' }}>
          {[
            "I'm walking past the station now",
            "Can you stay with me until I reach home?",
            "It looks a bit dark ahead",
            "What well-lit route should I take?",
          ].map((phrase, i) => (
            <button
              key={i}
              onClick={() => triggerSimulatedSpeech(phrase)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: 'white',
                padding: '5px 12px',
                borderRadius: '100px',
                fontSize: '11px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              💬 "{phrase}"
            </button>
          ))}
        </div>
      </div>

      {/* Controls Bar at Bottom */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '16px 20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 40,
        }}
      >
        {/* Mute toggle */}
        <button
          onClick={() => {
            setIsMuted(!isMuted);
            toast(isMuted ? 'Microphone on' : 'Microphone muted');
          }}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: isMuted ? '#EF4444' : 'rgba(255, 255, 255, 0.18)',
            border: 'none',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Camera toggle */}
        <button
          onClick={() => setIsVideoOn(!isVideoOn)}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: isVideoOn ? 'rgba(255, 255, 255, 0.18)' : '#EF4444',
            border: 'none',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={isVideoOn ? 'Turn camera off' : 'Turn camera on'}
        >
          {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {/* End Call Button (Large Red Circle) */}
        <button
          onClick={handleEndCall}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#EF4444',
            border: '3px solid white',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(239, 68, 68, 0.5)',
            transform: 'scale(1)',
            transition: 'transform 0.15s ease',
          }}
          title="End Call"
        >
          <PhoneOff size={28} />
        </button>

        {/* Speaker toggle */}
        <button
          onClick={() => setIsSpeakerOn(!isSpeakerOn)}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.18)',
            border: 'none',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={isSpeakerOn ? 'Speaker on' : 'Speaker muted'}
        >
          {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>

        {/* Distress Alerts Toggle / Test */}
        <button
          onClick={() => {
            if (!distressEnabled) {
              setShowDistressConsent(true);
            } else {
              // Trigger test simulated distress alert
              setShowDistressAlert(true);
            }
          }}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: distressEnabled ? '#D97706' : 'rgba(255, 255, 255, 0.18)',
            border: 'none',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={distressEnabled ? 'Tap to test distress detection' : 'Enable distress detection'}
        >
          <ShieldAlert size={20} />
        </button>
      </div>

      {/* Distress Consent Sheet */}
      <DistressConsentSheet
        isOpen={showDistressConsent}
        onConsent={() => {
          setDistressEnabled(true);
          setShowDistressConsent(false);
          toast.success('Experimental distress detection activated for this call');
        }}
        onCancel={() => setShowDistressConsent(false)}
      />

      {/* Distress Overlay */}
      <DistressOverlay
        isOpen={showDistressAlert}
        onConfirmSafe={() => {
          setShowDistressAlert(false);
          toast.success("Glad you're safe!");
        }}
        onGetHelp={() => {
          setShowDistressAlert(false);
          setEmergencyOpen(true);
        }}
        onDismiss={() => setShowDistressAlert(false)}
      />

      {/* Emergency Sheet */}
      <EmergencySheet
        isOpen={isEmergencyOpen}
        onClose={() => setEmergencyOpen(false)}
      />
    </div>
  );
};
