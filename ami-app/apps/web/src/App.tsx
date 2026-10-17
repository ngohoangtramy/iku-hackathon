import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';

// Screens
import { SplashScreen } from './screens/auth/SplashScreen';
import { OnboardingCarousel } from './screens/auth/OnboardingCarousel';
import { LoginScreen } from './screens/auth/LoginScreen';
import { SignUpScreen } from './screens/auth/SignUpScreen';
import { EmailVerificationScreen } from './screens/auth/EmailVerificationScreen';
import { IdentityVerificationScreen } from './screens/auth/IdentityVerificationScreen';
import { TermsScreen } from './screens/auth/TermsScreen';

import { MapScreen } from './screens/map/MapScreen';
import { EventsScreen } from './screens/events/EventsScreen';
import { BuddiesScreen } from './screens/buddies/BuddiesScreen';
import { MessagesScreen } from './screens/messages/MessagesScreen';
import { ChatScreen } from './screens/messages/ChatScreen';
import { AmiCallScreen } from './screens/ai-call/AmiCallScreen';
import { ProfileScreen } from './screens/profile/ProfileScreen';

import { QRHostScreen } from './screens/verification/QRHostScreen';
import { QRScanScreen } from './screens/verification/QRScanScreen';
import { TierUpgradeCard } from './components/ui/TierUpgradeCard';
import { BottomNav } from './components/ui/BottomNav';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredTier?: number;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredTier = 0 }) => {
  const { user } = useStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentTier = user.tier ?? 0;
  if (currentTier < requiredTier) {
    return (
      <div className="screen-container">
        <div className="hero-pink" style={{ textAlign: 'center', paddingBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', color: 'white' }}>Verification Required</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)' }}>
            This feature requires higher trust level
          </p>
        </div>
        <div style={{ padding: '24px 16px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TierUpgradeCard featureName={`Tier ${requiredTier} Feature`} />
        </div>
        <BottomNav />
      </div>
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <div className="app-shell">
      <BrowserRouter>
        <Routes>
          {/* Public & Auth Routes */}
          <Route path="/" element={<SplashScreen />} />
          <Route path="/onboarding" element={<OnboardingCarousel />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignUpScreen />} />
          <Route path="/verify-email" element={<EmailVerificationScreen />} />
          <Route path="/identity-verify" element={<IdentityVerificationScreen />} />
          <Route path="/terms" element={<TermsScreen />} />

          {/* Protected Main App Routes */}
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <EventsScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buddies"
            element={
              <ProtectedRoute>
                <BuddiesScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:id"
            element={
              <ProtectedRoute>
                <ChatScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-call"
            element={
              <ProtectedRoute>
                <AmiCallScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileScreen />
              </ProtectedRoute>
            }
          />

          {/* Verification Routes */}
          <Route
            path="/qr-host/:eventId"
            element={
              <ProtectedRoute requiredTier={2}>
                <QRHostScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qr-scan"
            element={
              <ProtectedRoute>
                <QRScanScreen />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Global Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '16px',
            background: '#1A1A2E',
            color: '#FFFFFF',
            fontSize: '13px',
            fontFamily: 'var(--font-family)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
          },
          success: {
            iconTheme: {
              primary: '#FF6B9D',
              secondary: '#FFFFFF',
            },
          },
        }}
      />
    </div>
  );
};

export default App;
