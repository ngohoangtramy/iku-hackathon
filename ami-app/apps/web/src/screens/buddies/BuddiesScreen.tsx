import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  X, 
  Sparkles, 
  MessageCircle, 
  ShieldCheck, 
  GraduationCap, 
  MapPin, 
  Compass, 
  RotateCcw 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import api from '../../lib/api';
import type { BuddyProfile } from '../../types';
import { TierUpgradeCard } from '../../components/ui/TierUpgradeCard';
import { BottomNav } from '../../components/ui/BottomNav';
import toast from 'react-hot-toast';

export const BuddiesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useStore();

  const isTier2 = (user?.tier ?? 0) >= 2;

  const [activeTab, setActiveTab] = useState<'discover' | 'matches'>('discover');
  const [buddies, setBuddies] = useState<BuddyProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<BuddyProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isTier2) {
      setLoading(true);
      Promise.all([api.buddies.discover(), api.buddies.matches()])
        .then(([discovered, matched]) => {
          setBuddies(discovered);
          setMatches(matched);
        })
        .finally(() => setLoading(false));
    }
  }, [isTier2]);

  const currentBuddy = buddies[currentIndex];

  const handleLike = async () => {
    if (!currentBuddy) return;
    try {
      await api.buddies.sendRequest(currentBuddy.userId);
      toast.success(`Connected with ${currentBuddy.displayName}! Match created 🎉`);
      setMatches((prev) => [...prev, currentBuddy]);
      setCurrentIndex((prev) => prev + 1);
    } catch {
      toast.error('Could not send match request');
    }
  };

  const handleSkip = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  const handleResetCards = () => {
    setCurrentIndex(0);
  };

  // If Tier 1: Render Gate
  if (!isTier2) {
    return (
      <div className="screen-container">
        <div className="hero-pink" style={{ textAlign: 'center', paddingBottom: '24px' }}>
          <h1 style={{ fontSize: '26px', color: 'white', marginBottom: '6px' }}>Peer Buddy Matching</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
            Find trusted campus walking buddies & study companions
          </p>
        </div>

        <div style={{ padding: '20px 10px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TierUpgradeCard
            featureName="Buddy Matching"
            onUnlocked={() => {
              // Reload discover data upon demo unlock
              api.buddies.discover().then(setBuddies);
              api.buddies.matches().then(setMatches);
            }}
          />
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="screen-container">
      {/* Top Header */}
      <div className="app-header">
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-dark)' }}>Buddies</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setActiveTab('discover')}
            className={`chip ${activeTab === 'discover' ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            <Compass size={14} /> Discover
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`chip ${activeTab === 'matches' ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            <MessageCircle size={14} /> Matches ({matches.length})
          </button>
        </div>
      </div>

      {activeTab === 'discover' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px 24px' }}>
          {/* Horizontal Active Buddies Avatar Scroll */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ACTIVE ON CAMPUS NOW
            </span>
            <div className="scroll-x" style={{ paddingTop: '10px' }}>
              {buddies.map((buddy, i) => (
                <div
                  key={buddy.id}
                  onClick={() => setCurrentIndex(i)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    minWidth: '60px',
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      padding: '2px',
                      border: i === currentIndex ? '2.5px solid #E8528A' : '2px solid #F0E0E8',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={buddy.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={buddy.displayName}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#10B981',
                        border: '2px solid white',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px', textAlign: 'center', width: '56px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {buddy.displayName.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Main Discovery Card */}
          {currentBuddy && currentIndex < buddies.length ? (
            <div
              className="card"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 16px 40px rgba(255, 107, 157, 0.2)',
                border: '1px solid #FFCCD9',
              }}
            >
              {/* Profile Image with Gradient Vignette */}
              <div style={{ position: 'relative', height: '320px', width: '100%' }}>
                <img
                  src={currentBuddy.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500'}
                  alt={currentBuddy.displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(26, 26, 46, 0.9) 0%, rgba(26, 26, 46, 0) 50%)',
                  }}
                />

                {/* Match Score Badge Top Right */}
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '100px',
                    padding: '6px 14px',
                    color: '#E8528A',
                    fontWeight: 800,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  }}
                >
                  <Sparkles size={16} />
                  <span>{currentBuddy.matchScore || 92}% Match</span>
                </div>

                {/* Identity info floating over image bottom */}
                <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', color: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'white' }}>
                      {currentBuddy.displayName}
                    </h3>
                    <span className="badge badge-verified" style={{ fontSize: '10px' }}>
                      <ShieldCheck size={12} /> Tier 2
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', opacity: 0.9 }}>
                    <GraduationCap size={16} />
                    <span>{currentBuddy.university || 'University College London'}</span>
                  </div>
                </div>
              </div>

              {/* Bio & Interests */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: 1.5 }}>
                  {currentBuddy.bio}
                </p>

                {/* Interests Chips */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', marginBottom: '6px' }}>
                    COMMON INTERESTS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {currentBuddy.interests.map((interest, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '12px',
                          background: '#FFF0F5',
                          color: '#E8528A',
                          border: '1px solid #FFCCD9',
                          padding: '4px 10px',
                          borderRadius: '100px',
                          fontWeight: 600,
                        }}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Skip (X) & Like (Heart) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '24px',
                  padding: '12px 16px 20px',
                }}
              >
                {/* Skip */}
                <button
                  onClick={handleSkip}
                  style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '2px solid #E5E7EB',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6B7280',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <X size={26} strokeWidth={2.5} />
                </button>

                {/* Like / Connect */}
                <button
                  onClick={handleLike}
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(255, 107, 157, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <Heart size={34} fill="white" />
                </button>
              </div>
            </div>
          ) : (
            /* All cards reviewed */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '40px 20px',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'var(--gradient-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FF6B9D',
                  marginBottom: '16px',
                }}
              >
                <Sparkles size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>
                You've seen all buddies nearby!
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px', maxWidth: '280px' }}>
                Check back soon or view your matched peer conversations.
              </p>
              <button
                onClick={handleResetCards}
                className="btn btn-secondary"
                style={{ gap: '8px' }}
              >
                <RotateCcw size={16} /> Review Again
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Matches Tab */
        <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ color: 'var(--color-muted)' }}>No matches yet. Like active buddies to start chatting!</p>
            </div>
          ) : (
            matches.map((buddy) => (
              <div
                key={buddy.id}
                onClick={() => navigate('/messages/conv_01')}
                className="card"
                style={{
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={buddy.avatarUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'}
                    alt={buddy.displayName}
                    style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFB3CC' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px' }}>{buddy.displayName}</span>
                      <span className="badge badge-verified" style={{ fontSize: '9px' }}>Tier 2</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {buddy.university || 'Imperial College London'}
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '12px', gap: '6px' }}
                >
                  <MessageCircle size={14} /> Chat
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
};
