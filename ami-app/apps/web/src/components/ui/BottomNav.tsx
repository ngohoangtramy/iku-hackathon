import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Map, Calendar, HeartHandshake, User, PhoneCall, Lock } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useStore();

  const isTier2 = (user?.tier ?? 0) >= 2;
  const currentPath = location.pathname;

  return (
    <nav className="bottom-nav">
      {/* Tab 1: Map */}
      <button
        type="button"
        className={`nav-item ${currentPath === '/map' ? 'active' : ''}`}
        onClick={() => navigate('/map')}
        aria-label="Map"
      >
        <Map size={22} strokeWidth={currentPath === '/map' ? 2.5 : 2} />
        <span>Map</span>
      </button>

      {/* Tab 2: Events */}
      <button
        type="button"
        className={`nav-item ${currentPath === '/events' ? 'active' : ''}`}
        onClick={() => navigate('/events')}
        aria-label="Events"
      >
        <Calendar size={22} strokeWidth={currentPath === '/events' ? 2.5 : 2} />
        <span>Events</span>
      </button>

      {/* Tab 3: Center FAB - AI Call */}
      <button
        type="button"
        className="nav-fab"
        onClick={() => navigate('/ai-call')}
        aria-label="Ami Companion Call"
        title="Start Ami AI Companion Call"
      >
        <PhoneCall size={24} />
      </button>

      {/* Tab 4: Buddies */}
      <button
        type="button"
        className={`nav-item ${currentPath.startsWith('/buddies') ? 'active' : ''}`}
        onClick={() => navigate('/buddies')}
        aria-label="Buddies"
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <HeartHandshake size={22} strokeWidth={currentPath.startsWith('/buddies') ? 2.5 : 2} />
          {!isTier2 && (
            <div
              style={{
                position: 'absolute',
                top: -3,
                right: -5,
                background: '#E8528A',
                color: 'white',
                borderRadius: '50%',
                width: '12px',
                height: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={8} strokeWidth={3} />
            </div>
          )}
        </div>
        <span>Buddies</span>
      </button>

      {/* Tab 5: Profile */}
      <button
        type="button"
        className={`nav-item ${currentPath === '/profile' ? 'active' : ''}`}
        onClick={() => navigate('/profile')}
        aria-label="Profile"
      >
        <User size={22} strokeWidth={currentPath === '/profile' ? 2.5 : 2} />
        <span>Profile</span>
      </button>
    </nav>
  );
};
