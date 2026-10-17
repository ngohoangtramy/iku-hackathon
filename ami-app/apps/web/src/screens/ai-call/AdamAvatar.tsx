import React from 'react';

interface AdamAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
}

export const AdamAvatar: React.FC<AdamAvatarProps> = ({ isSpeaking, isListening }) => (
  <div className={`ami-avatar ${isSpeaking ? 'is-speaking' : ''} ${isListening ? 'is-listening' : ''}`}>
    <img
      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=520&q=85"
      alt="Adam, AI companion"
    />
    {(isSpeaking || isListening) && <span className="ami-avatar-status-ring" />}
  </div>
);
