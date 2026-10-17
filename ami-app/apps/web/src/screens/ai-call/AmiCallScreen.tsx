import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ConversationProvider,
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
} from '@elevenlabs/react';
import { Mic, MicOff, PhoneOff, Video, VideoOff, Minimize2, ShieldAlert } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { AdamAvatar } from './AdamAvatar';
import { DistressConsentSheet } from './DistressConsentSheet';
import { DistressOverlay } from './DistressOverlay';
import { EmergencySheet } from '../emergency/EmergencySheet';
import { connectBreathingMonitor } from '../../lib/api';
import toast from 'react-hot-toast';

const ADAM_AGENT_ID = 'agent_9301m54rkhavej6b26s0fbfdgc7j';

export const AmiCallScreen: React.FC = () => (
  <ConversationProvider agentId={ADAM_AGENT_ID}>
    <AdamCallSession />
  </ConversationProvider>
);

const AdamCallSession: React.FC = () => {
  const navigate = useNavigate();
  const { setEmergencyOpen, isEmergencyOpen } = useStore();
  const { startSession, endSession } = useConversationControls();
  const { isMuted, setMuted } = useConversationInput();
  const { isSpeaking, isListening } = useConversationMode();
  const { status, message: voiceStatusMessage } = useConversationStatus();

  const [callDuration, setCallDuration] = useState(0);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [breathingStatus, setBreathingStatus] = useState<'off' | 'starting' | 'active'>('off');
  const [showDistressConsent, setShowDistressConsent] = useState(false);
  const [showDistressAlert, setShowDistressAlert] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const hasStartedSession = useRef(false);
  const monitorSocket = useRef<WebSocket | null>(null);
  const captureTimer = useRef<number | null>(null);
  const userStoppedMonitor = useRef(false);
  const monitorAttempt = useRef(0);

  const stopFrameCapture = useCallback(() => {
    if (captureTimer.current !== null) {
      window.clearInterval(captureTimer.current);
      captureTimer.current = null;
    }
  }, []);

  const stopBreathingCheck = useCallback(() => {
    monitorAttempt.current += 1;
    userStoppedMonitor.current = true;
    stopFrameCapture();
    const socket = monitorSocket.current;
    monitorSocket.current = null;
    setBreathingStatus('off');
    if (!socket) return;
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'stop' }));
    }
    socket.close();
  }, [stopFrameCapture]);

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
    setCameraUnavailable(false);
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
          setCameraUnavailable(true);
        });
    } else if (isVideoOn) {
      setCameraUnavailable(true);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoOn]);

  useEffect(() => {
    if (!isVideoOn && breathingStatus !== 'off') stopBreathingCheck();
  }, [isVideoOn, breathingStatus, stopBreathingCheck]);

  useEffect(() => () => stopBreathingCheck(), [stopBreathingCheck]);

  const startBreathingCheck = useCallback(async () => {
    const video = videoRef.current;
    if (!isVideoOn || !video || !video.videoWidth || !video.videoHeight) {
      toast.error('Turn on your camera before starting a breathing check.');
      return;
    }

    const attempt = ++monitorAttempt.current;
    userStoppedMonitor.current = false;
    setBreathingStatus('starting');

    let socket: WebSocket;
    try {
      socket = await connectBreathingMonitor();
    } catch (error) {
      if (attempt === monitorAttempt.current && !userStoppedMonitor.current) {
        setBreathingStatus('off');
        toast.error(error instanceof Error ? error.message : 'Could not start the breathing check.');
      }
      return;
    }

    if (attempt !== monitorAttempt.current || userStoppedMonitor.current) {
      socket.close();
      return;
    }
    monitorSocket.current = socket;

    let completed = false;
    socket.onopen = () => {
      if (attempt !== monitorAttempt.current) return;
      socket.send(JSON.stringify({ type: 'consent', accepted: true }));
    };
    socket.onmessage = (event) => {
      if (attempt !== monitorAttempt.current || monitorSocket.current !== socket) return;
      let message: {
        type?: string;
        message?: string;
        hint?: string;
        needsCheckIn?: boolean;
        enoughSamples?: boolean;
      };
      try {
        message = JSON.parse(String(event.data)) as typeof message;
      } catch {
        toast.error('Received an invalid breathing check response.');
        stopBreathingCheck();
        return;
      }

      if (message.type === 'ready') {
        setBreathingStatus('active');
        toast('Breathing check started. Keep your face and upper chest in view.');
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 640 / video.videoWidth, 720 / video.videoHeight);
        canvas.width = Math.max(1, Math.floor(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.floor(video.videoHeight * scale));
        const context = canvas.getContext('2d', { willReadFrequently: false });
        if (!context) {
          toast.error('Camera frames could not be prepared.');
          stopBreathingCheck();
          return;
        }
        let framePending = false;
        captureTimer.current = window.setInterval(() => {
          if (
            attempt !== monitorAttempt.current ||
            framePending ||
            socket.readyState !== WebSocket.OPEN ||
            socket.bufferedAmount > 1_500_000
          ) return;
          const currentVideo = videoRef.current;
          if (!currentVideo || !currentVideo.videoWidth || !currentVideo.videoHeight) return;

          framePending = true;
          context.drawImage(currentVideo, 0, 0, canvas.width, canvas.height);
          const timestampUs = performance.now() * 1000;
          canvas.toBlob((blob) => {
            if (!blob) {
              framePending = false;
              return;
            }
            void blob.arrayBuffer().then((image) => {
              if (attempt !== monitorAttempt.current || socket.readyState !== WebSocket.OPEN) return;
              const packet = new Uint8Array(12 + image.byteLength);
              const header = new DataView(packet.buffer);
              header.setUint16(0, canvas.width, true);
              header.setUint16(2, canvas.height, true);
              header.setFloat64(4, timestampUs, true);
              packet.set(new Uint8Array(image), 12);
              socket.send(packet);
            }).catch(() => {
              if (attempt === monitorAttempt.current) {
                toast.error('A camera frame could not be sent.');
                stopBreathingCheck();
              }
            }).finally(() => {
              framePending = false;
            });
          }, 'image/jpeg', 0.75);
        }, 1000 / 15);
        return;
      }

      if (message.type === 'validation' && message.hint) {
        toast(message.hint);
        return;
      }

      if (message.type === 'completed') {
        completed = true;
        stopFrameCapture();
        monitorSocket.current = null;
        setBreathingStatus('off');
        if (message.needsCheckIn) {
          setShowDistressAlert(true);
        } else if (message.enoughSamples) {
          toast('Breathing check complete');
        } else {
          toast('Not enough clear readings for a check-in');
        }
        return;
      }

      if (message.type === 'error') {
        toast.error(message.message || 'Breathing check could not continue.');
        stopBreathingCheck();
      }
    };
    socket.onerror = () => {
      if (attempt !== monitorAttempt.current || monitorSocket.current !== socket) return;
      if (!userStoppedMonitor.current) {
        toast.error('Breathing check is unavailable right now. Try again shortly.');
      }
      stopBreathingCheck();
    };
    socket.onclose = () => {
      if (attempt !== monitorAttempt.current) return;
      stopFrameCapture();
      if (monitorSocket.current === socket) monitorSocket.current = null;
      setBreathingStatus('off');
      if (!completed && !userStoppedMonitor.current) {
        toast.error('Breathing check ended before completion.');
      }
    };
  }, [isVideoOn, stopBreathingCheck, stopFrameCapture]);

  const startAdamCall = useCallback(() => {
    setVoiceError('');
    try {
      startSession({
        onError: (message) => setVoiceError(message || 'Could not connect to Adam. Check microphone access and try again.'),
      });
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : 'Could not connect to Adam. Check microphone access and try again.');
    }
  }, [startSession]);

  useEffect(() => {
    if (hasStartedSession.current) return;
    hasStartedSession.current = true;
    startAdamCall();
  }, [startAdamCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    stopBreathingCheck();
    try {
      endSession();
      toast('Call ended');
      navigate('/map');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not end the voice call.');
    }
  };

  return (
    <div
      className="ami-call-screen"
      style={{
        position: 'relative',
        width: '100%',
        height: '100dvh',
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
            Adam • ElevenLabs
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
          onClick={() => void handleEndCall()}
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

      <div className="ami-call-stage">
        {isVideoOn ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="ami-call-user-video"
            />
            {cameraUnavailable && <div className="ami-camera-message">Camera unavailable</div>}
          </>
        ) : (
          <div className="ami-camera-off">
            <VideoOff size={28} />
            <span>Camera off</span>
          </div>
        )}
        <div className="ami-companion-pip">
          <AdamAvatar isSpeaking={false} isListening={status === 'connected'} />
          <div className="ami-companion-caption">
            <strong>Adam</strong>
            <span>{isSpeaking ? 'Speaking' : isListening ? 'Listening' : status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting' : 'Voice call'}</span>
          </div>
        </div>
      </div>
      {(voiceError || (status === 'error' ? voiceStatusMessage : '')) && (
        <div className="ami-call-error" role="alert">
          <span>{voiceError || voiceStatusMessage || 'Could not connect to Adam. Check microphone access and try again.'}</span>
          <button onClick={startAdamCall} type="button">Retry</button>
        </div>
      )}

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
        <button
          onClick={() => {
            try {
              setMuted(!isMuted);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Could not change microphone state.');
            }
          }}
          disabled={status !== 'connected'}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: isMuted ? '#D85E9D' : 'rgba(255, 255, 255, 0.18)',
            border: 'none',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: status === 'connected' ? 'pointer' : 'not-allowed',
            opacity: status === 'connected' ? 1 : 0.5,
          }}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
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

        {/* Distress Alerts Toggle / Test */}
        <button
          onClick={() => {
            if (breathingStatus === 'active') {
              stopBreathingCheck();
            } else if (breathingStatus === 'off') {
              setShowDistressConsent(true);
            }
          }}
          disabled={breathingStatus === 'starting'}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: breathingStatus === 'active' ? '#D85E9D' : 'rgba(255, 255, 255, 0.18)',
            border: 'none',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: breathingStatus === 'starting' ? 'wait' : 'pointer',
            opacity: breathingStatus === 'starting' ? 0.6 : 1,
          }}
          title={breathingStatus === 'active' ? 'Stop breathing check' : 'Start breathing check'}
          aria-label={breathingStatus === 'active' ? 'Stop breathing check' : 'Start breathing check'}
        >
          <ShieldAlert size={20} />
        </button>
      </div>

      {/* Distress Consent Sheet */}
      <DistressConsentSheet
        isOpen={showDistressConsent}
        onConsent={() => {
          setShowDistressConsent(false);
          startBreathingCheck();
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
