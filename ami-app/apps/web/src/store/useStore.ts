import { create } from 'zustand';
import type { User, RouteOption, AiCallSession } from '../types';
import { getToken, setToken, clearToken } from '../lib/auth';
import { MOCK_USER } from '../lib/api';

const USER_STORAGE_KEY = 'ami_auth_user';

function getInitialUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const token = getToken();
    if (token) return MOCK_USER;
    return null;
  } catch {
    return null;
  }
}

export interface AppStore {
  // Auth
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (updates: Partial<User>) => void;
  clearAuth: () => void;
  
  // Map
  mapMode: 'safety' | 'explore';
  setMapMode: (mode: 'safety' | 'explore') => void;
  selectedDestination: { lat: number; lng: number; address: string } | null;
  setDestination: (dest: { lat: number; lng: number; address: string } | null) => void;
  mapCenter: { lat: number; lng: number };
  setMapCenter: (center: { lat: number; lng: number }) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;
  activeRoute: RouteOption | null;
  setActiveRoute: (route: RouteOption | null) => void;
  
  // AI Call
  aiCallSession: AiCallSession | null;
  setAiCallSession: (session: AiCallSession | null) => void;
  isCallActive: boolean;
  setCallActive: (active: boolean) => void;
  
  // Emergency
  isEmergencyOpen: boolean;
  setEmergencyOpen: (open: boolean) => void;

  // Global demo banner
  isDemoBannerDismissed: boolean;
  setDemoBannerDismissed: (dismissed: boolean) => void;
}

export const useStore = create<AppStore>((set) => ({
  // Auth state
  user: getInitialUser(),
  token: getToken(),
  setAuth: (user, token) => {
    setToken(token);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to store user', e);
    }
    set({ user, token });
  },
  updateUser: (updates) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...updates };
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update stored user', e);
      }
      return { user: updated };
    });
  },
  clearAuth: () => {
    clearToken();
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {}
    set({ user: null, token: null });
  },

  // Map state
  mapMode: 'safety',
  setMapMode: (mapMode) => set({ mapMode }),
  selectedDestination: null,
  setDestination: (selectedDestination) => set({ selectedDestination }),
  mapCenter: { lat: 51.5074, lng: -0.1278 }, // Central London
  setMapCenter: (mapCenter) => set({ mapCenter }),
  mapZoom: 14,
  setMapZoom: (mapZoom) => set({ mapZoom }),
  activeRoute: null,
  setActiveRoute: (activeRoute) => set({ activeRoute }),

  // AI Call
  aiCallSession: null,
  setAiCallSession: (aiCallSession) => set({ aiCallSession }),
  isCallActive: false,
  setCallActive: (isCallActive) => set({ isCallActive }),

  // Emergency
  isEmergencyOpen: false,
  setEmergencyOpen: (isEmergencyOpen) => set({ isEmergencyOpen }),

  // Demo banner
  isDemoBannerDismissed: false,
  setDemoBannerDismissed: (isDemoBannerDismissed) => set({ isDemoBannerDismissed }),
}));
