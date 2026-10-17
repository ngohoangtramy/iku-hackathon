import React from 'react';

interface AmiAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  emotion?: 'neutral' | 'happy' | 'concerned';
}

export const AmiAvatar: React.FC<AmiAvatarProps> = ({
  isSpeaking,
  isListening,
  emotion = 'happy',
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: '260px',
        height: '260px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Listening / Speaking Pulse Ring */}
      {isListening && (
        <div
          style={{
            position: 'absolute',
            width: '270px',
            height: '270px',
            borderRadius: '50%',
            border: '3px solid #60A5FA',
            boxShadow: '0 0 35px rgba(96, 165, 250, 0.6)',
            animation: 'pulse 1.8s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {isSpeaking && (
        <div
          style={{
            position: 'absolute',
            width: '276px',
            height: '276px',
            borderRadius: '50%',
            border: '3px solid #FF6B9D',
            boxShadow: '0 0 40px rgba(255, 107, 157, 0.7)',
            animation: 'pulse 1.2s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main Avatar Character SVG */}
      <svg
        viewBox="0 0 200 200"
        style={{
          width: '100%',
          height: '100%',
          animation: 'breathe 4s ease-in-out infinite, headBob 7s ease-in-out infinite',
          filter: isSpeaking ? 'drop-shadow(0 12px 30px rgba(255, 107, 157, 0.4))' : 'drop-shadow(0 10px 24px rgba(0, 0, 0, 0.25))',
          transformOrigin: 'bottom center',
        }}
      >
        <defs>
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="100%" stopColor="#FDBA74" />
          </linearGradient>
          <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4A2810" />
            <stop offset="100%" stopColor="#2B1608" />
          </linearGradient>
        </defs>

        {/* Shoulders & Chest / Collar */}
        <path
          d="M 35 195 C 40 155, 65 140, 100 140 C 135 140, 160 155, 165 195 Z"
          fill="url(#shirtGrad)"
        />
        {/* Shirt Collar V-neck */}
        <path d="M 85 140 L 100 165 L 115 140 Z" fill="#FED7AA" />
        <path d="M 100 165 L 100 180" stroke="#E59866" strokeWidth="2" strokeLinecap="round" />

        {/* Neck */}
        <rect x="88" y="115" width="24" height="30" rx="8" fill="url(#skinGrad)" />

        {/* Head Base */}
        <circle cx="100" cy="85" r="44" fill="url(#skinGrad)" />

        {/* Ears */}
        <circle cx="56" cy="86" r="8" fill="#FDBA74" />
        <circle cx="144" cy="86" r="8" fill="#FDBA74" />

        {/* Short Brown Hair */}
        <path
          d="M 56 75 C 56 42, 75 32, 100 32 C 125 32, 144 42, 144 75 C 140 70, 134 68, 128 68 C 120 68, 114 74, 100 70 C 86 66, 76 70, 68 74 C 62 76, 58 72, 56 75 Z"
          fill="url(#hairGrad)"
        />

        {/* Eyebrows */}
        <path
          d={
            emotion === 'concerned'
              ? 'M 74 65 Q 85 68 92 64'
              : isSpeaking
              ? 'M 74 62 Q 83 60 92 63'
              : 'M 74 64 Q 83 62 92 65'
          }
          stroke="#3B220C"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'all 0.3s ease' }}
        />
        <path
          d={
            emotion === 'concerned'
              ? 'M 108 64 Q 115 68 126 65'
              : isSpeaking
              ? 'M 108 63 Q 117 60 126 62'
              : 'M 108 65 Q 117 62 126 64'
          }
          stroke="#3B220C"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'all 0.3s ease' }}
        />

        {/* Eyes with Animated Blinking */}
        <g style={{ animation: 'blink 4s infinite' }}>
          {/* Left Eye */}
          <ellipse cx="83" cy="76" rx="4.5" ry="5.5" fill="#1E293B" />
          <circle cx="81.5" cy="74.5" r="1.5" fill="#FFFFFF" />

          {/* Right Eye */}
          <ellipse cx="117" cy="76" rx="4.5" ry="5.5" fill="#1E293B" />
          <circle cx="115.5" cy="74.5" r="1.5" fill="#FFFFFF" />
        </g>

        {/* Cheeks Blush */}
        <circle cx="72" cy="88" r="7" fill="#F472B6" opacity="0.3" />
        <circle cx="128" cy="88" r="7" fill="#F472B6" opacity="0.3" />

        {/* Gentle Nose */}
        <path d="M 100 78 L 98 88 L 103 88" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75" />

        {/* Expressive Mouth */}
        {isSpeaking ? (
          /* Animated Speaking Mouth */
          <ellipse
            cx="100"
            cy="104"
            rx="11"
            ry="7"
            fill="#881337"
            stroke="#EA580C"
            strokeWidth="1.5"
            style={{ transition: 'ry 0.15s ease' }}
          >
            {/* Teeth bar */}
            <path d="M 94 100 Q 100 102 106 100" stroke="#FFFFFF" strokeWidth="2" fill="none" />
          </ellipse>
        ) : (
          /* Friendly Smile */
          <path
            d="M 90 102 Q 100 110 110 102"
            stroke="#9A3412"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
};
