// Ami Platform — Comprehensive TypeScript Types

export enum Tier {
  TIER_0 = 0, // Unverified
  TIER_1 = 1, // Verified University Email
  TIER_2 = 2, // Physical QR Verified
}

export enum Permission {
  VIEW_MAP = 'VIEW_MAP',
  VIEW_EVENTS = 'VIEW_EVENTS',
  RSVP_EVENT = 'RSVP_EVENT',
  RATE_ROUTE_TIER_1 = 'RATE_ROUTE_TIER_1',
  CREATE_EVENT = 'CREATE_EVENT',
  BUDDY_MATCHING = 'BUDDY_MATCHING',
  RATE_ROUTE_TIER_2 = 'RATE_ROUTE_TIER_2',
  GENERATE_QR = 'GENERATE_QR',
}

export interface AuthPayload {
  sub: string;
  email: string;
  tier: number;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, any>;
}

// 1. User Auth
export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

// 2. Profile
export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  university_domain?: string | null;
  interests?: string[] | null;
  approx_lat?: number | null;
  approx_lng?: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// 3. User Verification
export interface UserVerification {
  id: string;
  user_id: string;
  email: string;
  email_verified: boolean;
  email_verified_at?: Date | null;
  university_domain?: string | null;
  identity_check_status: 'pending' | 'passed' | 'failed' | 'manual_review';
  identity_check_provider?: string | null;
  identity_check_reference?: string | null;
  liveness_passed: boolean;
  created_at: Date;
  updated_at: Date;
}

// 4. User Trust Status
export interface UserTrustStatus {
  id: string;
  user_id: string;
  tier: Tier;
  tier1_granted_at?: Date | null;
  tier2_granted_at?: Date | null;
  is_suspended: boolean;
  suspension_reason?: string | null;
  updated_at: Date;
}

// 5. User Session
export interface UserSession {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address?: string | null;
  user_agent?: string | null;
  expires_at: Date;
  created_at: Date;
}

// 6. Event
export interface Event {
  id: string;
  host_id: string;
  title: string;
  description?: string | null;
  category: 'sports' | 'cafe_meetup' | 'workshop' | 'career' | 'societies' | 'study' | 'cultural' | 'community';
  start_time: Date;
  end_time: Date;
  location_name: string;
  address?: string | null;
  lat: number;
  lng: number;
  max_attendees?: number | null;
  current_attendees: number;
  price: number;
  required_tier: Tier;
  status: 'pending_approval' | 'active' | 'cancelled' | 'completed';
  created_at: Date;
  updated_at: Date;
}

// 7. Event Attendee
export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: 'rsvp' | 'attended' | 'cancelled';
  rsvp_at: Date;
  created_at: Date;
}

// 8. Event QR Token
export interface EventQrToken {
  id: string;
  event_id: string;
  host_id: string;
  token_hash: string;
  expires_at: Date;
  is_used: boolean;
  used_by_user_id?: string | null;
  host_lat?: number | null;
  host_lng?: number | null;
  created_at: Date;
}

// 9. Physical Verification
export interface PhysicalVerification {
  id: string;
  user_id: string;
  event_id: string;
  verified_by_host_id: string;
  qr_token_id?: string | null;
  attendee_lat?: number | null;
  attendee_lng?: number | null;
  verified_at: Date;
  method: 'qr_scan' | 'manual_review';
}

// 10. Verification Audit Log
export interface VerificationAuditLog {
  id: string;
  user_id: string;
  action: string;
  from_tier: number;
  to_tier: number;
  verified_by?: string | null;
  metadata?: Record<string, any> | null;
  created_at: Date;
}

// 11. Route Segment
export interface RouteSegment {
  id: string;
  name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  polyline?: string | null;
  length_meters?: number | null;
  lighting_score?: number | null;
  foot_traffic_score?: number | null;
  overall_score?: number | null;
  is_simulated: boolean;
  created_at: Date;
  updated_at: Date;
}

// 12. Route Rating
export interface RouteRating {
  id: string;
  segment_id: string;
  user_id: string;
  rating: number; // 1-5
  tier_weight: number; // 1.0 or 2.0
  notes?: string | null;
  created_at: Date;
}

// 13. Streetlight Report
export interface StreetlightReport {
  id: string;
  reporter_id: string;
  lat: number;
  lng: number;
  is_working: boolean;
  pole_number?: string | null;
  notes?: string | null;
  status: 'reported' | 'acknowledged' | 'repaired';
  created_at: Date;
  updated_at: Date;
}

// 14. Safety Incident Report
export interface SafetyIncidentReport {
  id: string;
  reporter_id: string;
  incident_type: 'poor_lighting' | 'harassment' | 'suspicious_activity' | 'obstruction' | 'other';
  description?: string | null;
  lat: number;
  lng: number;
  incident_time: Date;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'verified' | 'dismissed';
  created_at: Date;
  updated_at: Date;
}

// 15. Nearby Place
export interface NearbyPlace {
  id: string;
  name: string;
  place_type: 'cafe' | 'pharmacy' | 'station' | 'library' | 'hospital' | 'police_station' | 'shop';
  address?: string | null;
  lat: number;
  lng: number;
  is_open_late: boolean;
  is_verified: boolean;
  safety_features?: string[] | null;
  created_at: Date;
  updated_at: Date;
}

// 16. Business Partner
export interface BusinessPartner {
  id: string;
  place_id: string;
  business_name: string;
  contact_email: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// 17. Discount Offer
export interface DiscountOffer {
  id: string;
  partner_id: string;
  title: string;
  description?: string | null;
  discount_percent: number;
  promo_code: string;
  valid_from: Date;
  valid_until: Date;
  is_active: boolean;
  created_at: Date;
}

// 18. Buddy Profile
export interface BuddyProfile {
  id: string;
  user_id: string;
  interests?: string[] | null;
  bio?: string | null;
  preferred_radius_km: number;
  preferred_activities?: string[] | null;
  is_available: boolean;
  created_at: Date;
  updated_at: Date;
}

// 19. Buddy Request
export interface BuddyRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message?: string | null;
  created_at: Date;
  updated_at: Date;
}

// 20. Buddy Match
export interface BuddyMatch {
  id: string;
  user1_id: string;
  user2_id: string;
  matched_at: Date;
  is_active: boolean;
  updated_at: Date;
}

// 21. Conversation
export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  user1_id: string;
  user2_id: string;
  created_at: Date;
  updated_at: Date;
}

// 22. Message
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: Date;
}

// 23. User Report
export interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details?: string | null;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  created_at: Date;
}

// 24. Moderation Case
export interface ModerationCase {
  id: string;
  report_id: string;
  moderator_id?: string | null;
  action_taken?: string | null;
  notes?: string | null;
  resolved_at?: Date | null;
  created_at: Date;
}

// 25. Trusted Contact
export interface TrustedContact {
  id: string;
  user_id: string;
  contact_name: string;
  phone_number: string;
  relationship?: string | null;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

// 26. Emergency Action Log
export interface EmergencyActionLog {
  id: string;
  user_id: string;
  action_type: 'call_999' | 'call_112' | 'contact_trusted' | 'share_location';
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
  created_at: Date;
}

// 27. AI Call Session
export interface AiCallSession {
  id: string;
  user_id: string;
  started_at: Date;
  ended_at?: Date | null;
  duration_seconds?: number | null;
  distress_flag_count: number;
  created_at: Date;
}

// 28. AI Call Consent Settings
export interface AiCallConsentSettings {
  id: string;
  user_id: string;
  distress_detection_enabled: boolean;
  consent_updated_at: Date;
}

// 29. Distress Alert Event
export interface DistressAlertEvent {
  id: string;
  session_id?: string | null;
  user_id: string;
  trigger_type: string;
  confidence_score?: number | null;
  outcome: 'dismissed' | 'okay' | 'help_requested';
  lat?: number | null;
  lng?: number | null;
  created_at: Date;
}

// Express Request type augmentation
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
