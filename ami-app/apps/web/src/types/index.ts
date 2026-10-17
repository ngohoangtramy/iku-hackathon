export type TrustTier = 0 | 1 | 2;

export interface User {
  id: string;
  email: string;
  displayName: string;
  tier: TrustTier;
  avatarUrl?: string;
  bio?: string;
  interests: string[];
  universityDomain?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  description: string;
  venueName: string;
  venueAddress: string;
  lat: number;
  lng: number;
  startTime: string;
  endTime: string;
  organizerName: string;
  organizerVerified: boolean;
  maxAttendees?: number;
  attendeeCount: number;
  price: number;
  isFree: boolean;
  participationRules?: string;
  requiredTier: TrustTier;
  status: 'active' | 'cancelled' | 'past';
  isRsvped?: boolean;
}

export type EventCategory = 
  | 'sports_fitness'
  | 'cafe_social'
  | 'workshop_creative'
  | 'career_networking'
  | 'uni_society'
  | 'study_session'
  | 'cultural'
  | 'community';

export interface SafetyReport {
  id: string;
  lat: number;
  lng: number;
  type: 'streetlight' | 'incident' | 'hazard';
  description: string;
  reportedAt: string;
  isVerified: boolean;
  isSimulated: boolean;
}

export interface RouteOption {
  id: string;
  polyline: string;
  distance: string;
  duration: string;
  safetyScore: number;
  safetyConfidence: 'high' | 'medium' | 'low' | 'insufficient';
  indicators: string[];
  dataWarnings: string[];
  isSimulated: boolean;
  steps: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
  isOpen: boolean;
  isPartner: boolean;
  discountInfo?: string;
  rating?: number;
}

export interface BuddyProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  interests: string[];
  avatarUrl?: string;
  matchScore?: number;
  isMatched?: boolean;
  tier?: TrustTier;
  university?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
}

export interface Conversation {
  id: string;
  otherUser: BuddyProfile;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface AiCallSession {
  id: string;
  startedAt: string;
  isActive: boolean;
  distressDetectionEnabled: boolean;
}

export interface DistressSettings {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  autoAlertContacts: boolean;
  consentGrantedAt?: string;
}
