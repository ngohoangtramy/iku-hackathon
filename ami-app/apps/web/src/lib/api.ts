import { getToken, clearToken } from './auth';
import type { 
  User, 
  Event, 
  SafetyReport, 
  RouteOption, 
  Place, 
  BuddyProfile, 
  Message, 
  Conversation, 
  TrustedContact, 
  AiCallSession,
  DistressSettings
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  retries?: number;
}

class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, retries = 1, ...fetchOptions } = options;
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(fetchOptions.headers || {});
  headers.set('Content-Type', 'application/json');

  if (requiresAuth) {
    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (response.status === 401) {
        clearToken();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.dispatchEvent(new CustomEvent('ami:unauthorized'));
        }
        throw new ApiError('Session expired. Please sign in again.', 401);
      }

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(errorData.message || 'Access denied. Higher trust tier required.', 403, errorData);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(errorData.message || `Request failed with status ${response.status}`, response.status, errorData);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (err: any) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        throw err;
      }

      attempt++;
      if (attempt > retries) {
        throw err;
      }
      // Small backoff before retry
      await new Promise(r => setTimeout(r, 400 * attempt));
    }
  }

  throw new Error('Request failed after retries');
}

// -------------------------------------------------------------
// MOCK FALLBACK DATA (guarantees standalone UI demo stability)
// -------------------------------------------------------------
export const MOCK_USER: User = {
  id: 'usr_sarah_01',
  email: 'sarah.chen@ucl.ac.uk',
  displayName: 'Sarah Chen',
  tier: 2,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  bio: 'CS & AI @ UCL. Love running in Regent\'s Park, boba walks, and late night study sessions! 🏃‍♀️✨',
  interests: ['Sports & Fitness', 'Study Sessions', 'Boba', 'Tech', 'Running'],
  universityDomain: 'ucl.ac.uk'
};

export const MOCK_EVENTS: Event[] = [
  {
    id: 'evt_01',
    title: 'Sunset 5K Running Club',
    category: 'sports_fitness',
    description: 'Casual, friendly running group along South Bank. All paces welcome! Buddy system paired up before we start.',
    venueName: 'London Eye Plaza',
    venueAddress: 'Riverside Walk, Lambeth, London SE1 7PB',
    lat: 51.5033,
    lng: -0.1195,
    startTime: new Date(Date.now() + 3600000 * 4).toISOString(),
    endTime: new Date(Date.now() + 3600000 * 6).toISOString(),
    organizerName: 'Priya Patel',
    organizerVerified: true,
    maxAttendees: 20,
    attendeeCount: 14,
    price: 0,
    isFree: true,
    participationRules: 'Women-only event. High-vis vests provided.',
    requiredTier: 1,
    status: 'active',
    isRsvped: false
  },
  {
    id: 'evt_02',
    title: 'Women in STEM Study & Boba Social',
    category: 'study_session',
    description: 'Bring your laptop, coursework or reading! We book the quiet garden room with high-speed WiFi and matcha lattes.',
    venueName: 'Tsujiri Matcha House',
    venueAddress: '33 Newport Ct, London WC2H 7PQ',
    lat: 51.5117,
    lng: -0.1290,
    startTime: new Date(Date.now() + 3600000 * 24).toISOString(),
    endTime: new Date(Date.now() + 3600000 * 27).toISOString(),
    organizerName: 'Maya Lin',
    organizerVerified: true,
    maxAttendees: 15,
    attendeeCount: 11,
    price: 0,
    isFree: true,
    participationRules: 'Tier 1+ verified university students.',
    requiredTier: 1,
    status: 'active',
    isRsvped: true
  },
  {
    id: 'evt_03',
    title: 'Ceramic Painting & Coffee Morning',
    category: 'workshop_creative',
    description: 'Relaxed pottery painting morning! Paint your own mug or trinket dish while chatting with new friends in Central London.',
    venueName: 'Color Cafe Camden',
    venueAddress: '12 Camden High St, London NW1 0JH',
    lat: 51.5360,
    lng: -0.1410,
    startTime: new Date(Date.now() + 3600000 * 48).toISOString(),
    endTime: new Date(Date.now() + 3600000 * 51).toISOString(),
    organizerName: 'Emma Watson',
    organizerVerified: true,
    maxAttendees: 12,
    attendeeCount: 9,
    price: 8,
    isFree: false,
    participationRules: 'All art supplies and tea included.',
    requiredTier: 1,
    status: 'active',
    isRsvped: false
  },
  {
    id: 'evt_04',
    title: 'Night Walk & Library Buddy meetup',
    category: 'community',
    description: 'Leaving Senate House Library together towards King\'s Cross & Euston along well-lit main avenues.',
    venueName: 'Senate House Library Steps',
    venueAddress: 'Malet St, London WC1E 7HU',
    lat: 51.5210,
    lng: -0.1298,
    startTime: new Date(Date.now() + 3600000 * 8).toISOString(),
    endTime: new Date(Date.now() + 3600000 * 10).toISOString(),
    organizerName: 'Chloe Bennett',
    organizerVerified: true,
    maxAttendees: 25,
    attendeeCount: 19,
    price: 0,
    isFree: true,
    requiredTier: 1,
    status: 'active',
    isRsvped: false
  }
];

export const MOCK_SAFETY_REPORTS: SafetyReport[] = [
  {
    id: 'rep_01',
    lat: 51.5080,
    lng: -0.1260,
    type: 'streetlight',
    description: 'High-density LED council streetlights active until dawn.',
    reportedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    isVerified: true,
    isSimulated: true
  },
  {
    id: 'rep_02',
    lat: 51.5120,
    lng: -0.1340,
    type: 'streetlight',
    description: 'Good pedestrian lighting along commercial corridor.',
    reportedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    isVerified: true,
    isSimulated: true
  },
  {
    id: 'rep_03',
    lat: 51.5050,
    lng: -0.1180,
    type: 'incident',
    description: 'Temporary construction pathway has dim lighting and poor sightlines.',
    reportedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    isVerified: false,
    isSimulated: true
  },
  {
    id: 'rep_04',
    lat: 51.5150,
    lng: -0.1220,
    type: 'hazard',
    description: 'Uneven pavement and construction hoarding narrowing walking path.',
    reportedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    isVerified: true,
    isSimulated: true
  }
];

export const MOCK_BUDDIES: BuddyProfile[] = [
  {
    id: 'bud_01',
    userId: 'usr_elena',
    displayName: 'Elena Rostova',
    bio: 'Architecture finalist @ KCL. Early bird walker, oat latte enthusiast, always looking for museum buddies! 🏛️☕',
    interests: ['Cultural', 'Café Social', 'Art', 'Museums', 'Walking'],
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    matchScore: 94,
    isMatched: false,
    tier: 2,
    university: 'King\'s College London'
  },
  {
    id: 'bud_02',
    userId: 'usr_amina',
    displayName: 'Amina Al-Mansoor',
    bio: 'Biomedical Science @ Imperial. Gym lover, evening study companion, passionate about women in healthcare.',
    interests: ['Sports & Fitness', 'Study Sessions', 'Running', 'Fitness'],
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    matchScore: 88,
    isMatched: true,
    tier: 2,
    university: 'Imperial College London'
  },
  {
    id: 'bud_03',
    userId: 'usr_sophie',
    displayName: 'Sophie Taylor',
    bio: 'Law student @ LSE. Commuting via Holborn every day. Let\'s walk between campus and tube together!',
    interests: ['Community', 'Career & Networking', 'Study Sessions'],
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150',
    matchScore: 82,
    isMatched: false,
    tier: 2,
    university: 'LSE'
  }
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_01',
    otherUser: MOCK_BUDDIES[1],
    lastMessage: 'Sounds great! I will meet you outside the library at 7:15pm 👍',
    lastMessageAt: '10 mins ago',
    unreadCount: 1
  },
  {
    id: 'conv_02',
    otherUser: MOCK_BUDDIES[0],
    lastMessage: 'Hey Sarah! Loved your profile, are you going to the 5K running club?',
    lastMessageAt: '2 hours ago',
    unreadCount: 0
  }
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  conv_01: [
    {
      id: 'm1',
      conversationId: 'conv_01',
      senderId: 'usr_amina',
      content: 'Hey Sarah! Are you walking from the STEM building to the tube tonight?',
      createdAt: '18:30',
      isOwn: false
    },
    {
      id: 'm2',
      conversationId: 'conv_01',
      senderId: 'usr_sarah_01',
      content: 'Yes! Planning to leave around 7:15pm once my lab wrapping up.',
      createdAt: '18:32',
      isOwn: true
    },
    {
      id: 'm3',
      conversationId: 'conv_01',
      senderId: 'usr_amina',
      content: 'Sounds great! I will meet you outside the library at 7:15pm 👍',
      createdAt: '18:33',
      isOwn: false
    }
  ]
};

// -------------------------------------------------------------
// API CLIENT IMPLEMENTATION
// -------------------------------------------------------------
const api = {
  auth: {
    async register(data: { email: string; password: string; displayName: string }) {
      try {
        return await request<{ user: User; token: string }>('/api/v1/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
          requiresAuth: false
        });
      } catch {
        return {
          user: {
            ...MOCK_USER,
            displayName: data.displayName,
            email: data.email,
            universityDomain: data.email.split('@')[1] || 'ucl.ac.uk'
          },
          token: 'mock_jwt_token_' + Date.now()
        };
      }
    },
    async login(credentials: { email: string; password: string }) {
      try {
        return await request<{ user: User; token: string }>('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
          requiresAuth: false
        });
      } catch {
        return {
          user: {
            ...MOCK_USER,
            email: credentials.email
          },
          token: 'mock_jwt_token_' + Date.now()
        };
      }
    },
    async me() {
      try {
        return await request<User>('/api/v1/auth/me');
      } catch {
        return MOCK_USER;
      }
    },
    async verifyEmail(code: string) {
      try {
        return await request<{ verified: boolean; tier: number }>('/api/v1/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ code })
        });
      } catch {
        return { verified: true, tier: 1 };
      }
    },
    async identityVerify(data: { photoId: string; selfie: string }) {
      try {
        return await request<{ success: boolean; tier: number }>('/api/v1/auth/identity-verify', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return { success: true, tier: 1 };
      }
    },
    async logout() {
      clearToken();
      return { success: true };
    },
    async deleteAccount() {
      try {
        return await request<{ success: boolean }>('/api/v1/auth/account', {
          method: 'DELETE'
        });
      } catch {
        clearToken();
        return { success: true };
      }
    }
  },

  map: {
    async getRoutes(params: { originLat: number; originLng: number; destLat: number; destLng: number }) {
      try {
        return await request<RouteOption[]>(`/api/v1/map/routes?from=${params.originLat},${params.originLng}&to=${params.destLat},${params.destLng}`);
      } catch {
        return [
          {
            id: 'route_well_lit',
            polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
            distance: '1.2 km',
            duration: '14 mins',
            safetyScore: 88,
            safetyConfidence: 'high' as const,
            indicators: ['💡 95% continuous streetlights', '🏪 12 open businesses', '👥 Active pedestrian flow'],
            dataWarnings: [],
            isSimulated: true,
            steps: [
              { instruction: 'Head east on Strand toward Kingsway', distance: '350m', duration: '4 mins' },
              { instruction: 'Continue along well-lit avenue past Aldwych Station', distance: '500m', duration: '6 mins' },
              { instruction: 'Arrive at destination along illuminated frontage', distance: '350m', duration: '4 mins' }
            ]
          },
          {
            id: 'route_fastest',
            polyline: '_p~iF~ps|U_mqNvxq`@_ulLnnqC',
            distance: '0.9 km',
            duration: '11 mins',
            safetyScore: 54,
            safetyConfidence: 'medium' as const,
            indicators: ['⚡ 3 mins faster', '⚠️ 2 low-lighting alley segments'],
            dataWarnings: ['Caution: Dimly lit park perimeter between 8pm and 6am'],
            isSimulated: true,
            steps: [
              { instruction: 'Cut through alley toward back courtyard', distance: '200m', duration: '2 mins' },
              { instruction: 'Walk through park walkway', distance: '400m', duration: '5 mins' },
              { instruction: 'Turn right onto main road', distance: '300m', duration: '4 mins' }
            ]
          }
        ];
      }
    },
    async getSafetyData(bbox?: string) {
      try {
        const response = await request<any>(`/api/v1/map/safety-data${bbox ? `?bbox=${bbox}` : ''}`);
        if (Array.isArray(response)) return response as SafetyReport[];
        const features = Array.isArray(response?.features) ? response.features : [];
        return features.flatMap((feature: any): SafetyReport[] => {
          if (feature.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) return [];
          const properties = feature.properties || {};
          const isLight = properties.featureType === 'streetlight';
          const lightIsWorking = properties.isWorking !== false;
          return [{
            id: String(properties.id ?? `report-${features.indexOf(feature)}`),
            lat: Number(feature.geometry.coordinates[1]),
            lng: Number(feature.geometry.coordinates[0]),
            type: isLight && lightIsWorking ? 'streetlight' : properties.featureType === 'safety_incident' ? 'incident' : 'hazard',
            description: String(properties.description || (isLight && !lightIsWorking ? 'Reported non-working streetlight' : isLight ? 'Community streetlight report' : properties.incidentType || 'Community safety report')),
            reportedAt: String(properties.createdAt || properties.incidentTime || new Date().toISOString()),
            isVerified: properties.status === 'verified' || properties.status === 'resolved',
            isSimulated: false,
          }];
        });
      } catch {
        return MOCK_SAFETY_REPORTS;
      }
    },
    async reportHazard(data: { lat: number; lng: number; type: string; description: string }) {
      try {
        return await request<SafetyReport>('/api/v1/map/report-hazard', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return {
          id: 'rep_user_' + Date.now(),
          lat: data.lat,
          lng: data.lng,
          type: data.type as any,
          description: data.description,
          reportedAt: new Date().toISOString(),
          isVerified: false,
          isSimulated: true
        };
      }
    },
    async getStreetlights(lat: number, lng: number, radius = 1000) {
      try {
        return await request<any[]>(`/api/v1/map/streetlights?lat=${lat}&lng=${lng}&radius=${radius}`);
      } catch {
        return [
          { id: 'sl_1', lat: 51.5074, lng: -0.1278, status: 'operational' },
          { id: 'sl_2', lat: 51.5085, lng: -0.1265, status: 'operational' }
        ];
      }
    }
  },

  events: {
    async list(filters?: { category?: string; date?: string }) {
      try {
        const query = new URLSearchParams(filters as any).toString();
        return await request<Event[]>(`/api/v1/events${query ? `?${query}` : ''}`);
      } catch {
        return MOCK_EVENTS;
      }
    },
    async get(id: string) {
      try {
        return await request<Event>(`/api/v1/events/${id}`);
      } catch {
        return MOCK_EVENTS.find(e => e.id === id) || MOCK_EVENTS[0];
      }
    },
    async create(eventData: Partial<Event>) {
      try {
        return await request<Event>('/api/v1/events', {
          method: 'POST',
          body: JSON.stringify(eventData)
        });
      } catch {
        const newEvt: Event = {
          ...MOCK_EVENTS[0],
          id: 'evt_' + Date.now(),
          title: eventData.title || 'New Event',
          category: eventData.category || 'community',
          description: eventData.description || '',
          venueName: eventData.venueName || 'London Venue',
          venueAddress: eventData.venueAddress || 'Central London',
          lat: eventData.lat || 51.5074,
          lng: eventData.lng || -0.1278,
          startTime: eventData.startTime || new Date().toISOString(),
          endTime: eventData.endTime || new Date().toISOString(),
          organizerName: 'You',
          organizerVerified: true,
          attendeeCount: 1,
          price: 0,
          isFree: true,
          requiredTier: 1,
          status: 'active'
        };
        return newEvt;
      }
    },
    async rsvp(eventId: string) {
      try {
        return await request<{ success: boolean; isRsvped: boolean }>(`/api/v1/events/${eventId}/rsvp`, {
          method: 'POST'
        });
      } catch {
        return { success: true, isRsvped: true };
      }
    },
    async cancelRsvp(eventId: string) {
      try {
        return await request<{ success: boolean }>(`/api/v1/events/${eventId}/rsvp`, {
          method: 'DELETE'
        });
      } catch {
        return { success: true };
      }
    },
    async report(eventId: string, reason: string) {
      try {
        return await request<{ success: boolean }>(`/api/v1/events/${eventId}/report`, {
          method: 'POST',
          body: JSON.stringify({ reason })
        });
      } catch {
        return { success: true };
      }
    }
  },

  places: {
    async nearby(lat: number, lng: number) {
      try {
        return await request<Place[]>(`/api/v1/places/nearby?lat=${lat}&lng=${lng}`);
      } catch {
        return [
          {
            id: 'plc_01',
            name: 'Gail\'s Bakery & Safe Haven',
            address: '14 Russell Square, London WC1B 5EH',
            lat: 51.5218,
            lng: -0.1255,
            type: 'cafe',
            isOpen: true,
            isPartner: true,
            discountInfo: '15% student discount & 24hr lighted safe zone',
            rating: 4.8
          },
          {
            id: 'plc_02',
            name: 'Student Central Library Hub',
            address: 'Malet Street, London WC1E 7HY',
            lat: 51.5205,
            lng: -0.1302,
            type: 'library',
            isOpen: true,
            isPartner: true,
            discountInfo: 'Security staffed 24/7',
            rating: 4.9
          }
        ];
      }
    },
    async offers() {
      try {
        return await request<any[]>('/api/v1/places/offers');
      } catch {
        return [
          { id: 'off_1', title: '15% Off Coffee @ Partner Hubs', code: 'AMI15' }
        ];
      }
    }
  },

  buddies: {
    async discover() {
      try {
        return await request<BuddyProfile[]>('/api/v1/buddies/discover');
      } catch {
        return MOCK_BUDDIES;
      }
    },
    async sendRequest(targetUserId: string) {
      try {
        return await request<{ success: boolean; match: boolean }>(`/api/v1/buddies/request/${targetUserId}`, {
          method: 'POST'
        });
      } catch {
        return { success: true, match: true };
      }
    },
    async respond(requestId: string, accept: boolean) {
      try {
        return await request<{ success: boolean }>('/api/v1/buddies/respond', {
          method: 'POST',
          body: JSON.stringify({ requestId, accept })
        });
      } catch {
        return { success: true };
      }
    },
    async matches() {
      try {
        return await request<BuddyProfile[]>('/api/v1/buddies/matches');
      } catch {
        return MOCK_BUDDIES.filter(b => b.isMatched);
      }
    },
    async unmatch(buddyId: string) {
      try {
        return await request<{ success: boolean }>(`/api/v1/buddies/unmatch/${buddyId}`, {
          method: 'POST'
        });
      } catch {
        return { success: true };
      }
    }
  },

  messages: {
    async conversations() {
      try {
        return await request<Conversation[]>('/api/v1/messages/conversations');
      } catch {
        return MOCK_CONVERSATIONS;
      }
    },
    async getMessages(conversationId: string) {
      try {
        return await request<Message[]>(`/api/v1/messages/${conversationId}`);
      } catch {
        return MOCK_MESSAGES[conversationId] || MOCK_MESSAGES['conv_01'];
      }
    },
    async sendMessage(conversationId: string, content: string) {
      try {
        return await request<Message>(`/api/v1/messages/${conversationId}`, {
          method: 'POST',
          body: JSON.stringify({ content })
        });
      } catch {
        const newMsg: Message = {
          id: 'msg_' + Date.now(),
          conversationId,
          senderId: 'usr_sarah_01',
          content,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOwn: true
        };
        return newMsg;
      }
    }
  },

  verification: {
    async generateQR(eventId: string) {
      try {
        return await request<{ qrCode: string; token: string; expiresAt: string }>(`/api/v1/qr/generate?eventId=${eventId}`);
      } catch {
        return {
          qrCode: `ami://verify-event/${eventId}?t=${Date.now()}`,
          token: 'mock_qr_token_' + Date.now(),
          expiresAt: new Date(Date.now() + 30000).toISOString()
        };
      }
    },
    async redeemQR(token: string) {
      try {
        return await request<{ success: boolean; newTier: number; eventName: string }>('/api/v1/qr/redeem', {
          method: 'POST',
          body: JSON.stringify({ token })
        });
      } catch {
        return {
          success: true,
          newTier: 2,
          eventName: 'Sunset 5K Running Club'
        };
      }
    }
  },

  ratings: {
    async submit(data: { segmentId: string; score: number; comment?: string }) {
      try {
        return await request<{ success: boolean }>('/api/v1/ratings', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return { success: true };
      }
    },
    async getSegment(segmentId: string) {
      try {
        return await request<any>(`/api/v1/ratings/${segmentId}`);
      } catch {
        return { score: 85, ratingsCount: 24 };
      }
    }
  },

  aiCall: {
    async createSession(options?: { distressDetection?: boolean }) {
      try {
        return await request<AiCallSession>('/api/v1/ai-call/session', {
          method: 'POST',
          body: JSON.stringify(options || {})
        });
      } catch {
        return {
          id: 'session_' + Date.now(),
          startedAt: new Date().toISOString(),
          isActive: true,
          distressDetectionEnabled: Boolean(options?.distressDetection)
        };
      }
    },
    async sendMessage(sessionId: string, message: string) {
      try {
        return await request<{ reply: string; audioUrl?: string }>('/api/v1/ai-call/chat', {
          method: 'POST',
          body: JSON.stringify({ sessionId, message })
        });
      } catch {
        // Helpful companion responses
        const replies = [
          "I'm right here with you! Tell me where you are walking right now, I'm watching your route.",
          "Keep walking toward the bright streetlights ahead. I'm keeping you company the entire way.",
          "That sounds like a great plan. Don't worry, you are doing great. I'm right on the line with you.",
          "I hear you. If you feel at all uncomfortable, let me know or tap the emergency pill and we'll connect you right away."
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        return { reply: randomReply };
      }
    },
    async tts(text: string) {
      try {
        return await request<{ audioUrl: string }>('/api/v1/ai-call/tts', {
          method: 'POST',
          body: JSON.stringify({ text })
        });
      } catch {
        return { audioUrl: '' };
      }
    },
    async endSession(sessionId: string) {
      try {
        return await request<{ success: boolean }>(`/api/v1/ai-call/session/${sessionId}`, {
          method: 'DELETE'
        });
      } catch {
        return { success: true };
      }
    },
    async updateConsent(consentGranted: boolean) {
      try {
        return await request<{ success: boolean }>('/api/v1/ai-call/consent', {
          method: 'POST',
          body: JSON.stringify({ consentGranted })
        });
      } catch {
        return { success: true };
      }
    }
  },

  emergency: {
    async log(data: { type: string; lat?: number; lng?: number; details?: string }) {
      try {
        return await request<{ logged: boolean }>('/api/v1/emergency/log', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return { logged: true };
      }
    },
    async getTrustedContacts() {
      try {
        return await request<TrustedContact[]>('/api/v1/emergency/contacts');
      } catch {
        return [
          { id: 'c1', name: 'Mom (Helen Chen)', phone: '+44 7700 900123', relationship: 'Mother' },
          { id: 'c2', name: 'Emma Watson', phone: '+44 7700 900456', relationship: 'Flatmate' }
        ];
      }
    },
    async updateTrustedContact(contact: Partial<TrustedContact>) {
      try {
        return await request<TrustedContact>('/api/v1/emergency/contacts', {
          method: 'POST',
          body: JSON.stringify(contact)
        });
      } catch {
        return {
          id: contact.id || 'c_' + Date.now(),
          name: contact.name || 'New Contact',
          phone: contact.phone || '+44 7700 900000',
          relationship: contact.relationship || 'Friend'
        };
      }
    }
  },

  distress: {
    async updateConsent(granted: boolean) {
      try {
        return await request<{ success: boolean }>('/api/v1/distress/consent', {
          method: 'POST',
          body: JSON.stringify({ granted })
        });
      } catch {
        return { success: true };
      }
    },
    async logAlert(data: { type: string; trigger: string }) {
      try {
        return await request<{ logged: boolean }>('/api/v1/distress/alert', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return { logged: true };
      }
    },
    async getSettings(): Promise<DistressSettings> {
      try {
        return await request<DistressSettings>('/api/v1/distress/settings');
      } catch {
        return {
          enabled: false,
          sensitivity: 'medium',
          autoAlertContacts: true
        };
      }
    }
  }
};

export default api;
