-- Ami Safety Platform — Complete PostgreSQL / TimescaleDB Schema
-- Migration 001: Core Tables, Relations, and Constraints

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users (Auth credentials)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles: user display data (separate from auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  university_domain VARCHAR(255),
  interests TEXT[],
  approx_lat DECIMAL(9,6),
  approx_lng DECIMAL(9,6),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Verifications: privacy-separated verification details
CREATE TABLE IF NOT EXISTS user_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  university_domain VARCHAR(255),
  identity_check_status VARCHAR(50) DEFAULT 'pending' CHECK (identity_check_status IN ('pending','passed','failed','manual_review')),
  identity_check_provider VARCHAR(100),
  identity_check_reference VARCHAR(255),
  liveness_passed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Trust Status: tier management (0 = Unverified, 1 = Verified Email, 2 = Physical QR Verified)
CREATE TABLE IF NOT EXISTS user_trust_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  tier INTEGER NOT NULL DEFAULT 0 CHECK (tier IN (0,1,2)),
  tier1_granted_at TIMESTAMPTZ,
  tier2_granted_at TIMESTAMPTZ,
  is_suspended BOOLEAN DEFAULT false,
  suspension_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES profiles(user_id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('sports', 'cafe_meetup', 'workshop', 'career', 'societies', 'study', 'cultural', 'community')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location_name VARCHAR(200) NOT NULL,
  address TEXT,
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0.00,
  required_tier INTEGER DEFAULT 1 CHECK (required_tier IN (0,1,2)),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('pending_approval', 'active', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Event Attendees
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'rsvp' CHECK (status IN ('rsvp', 'attended', 'cancelled')),
  rsvp_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

-- 8. Event QR Tokens (Time-limited, single-use physical verification tokens)
CREATE TABLE IF NOT EXISTS event_qr_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES profiles(user_id),
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_by_user_id UUID REFERENCES profiles(user_id),
  host_lat DECIMAL(9,6),
  host_lng DECIMAL(9,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Physical Verifications
CREATE TABLE IF NOT EXISTS physical_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  event_id UUID NOT NULL REFERENCES events(id),
  verified_by_host_id UUID NOT NULL REFERENCES profiles(user_id),
  qr_token_id UUID REFERENCES event_qr_tokens(id),
  attendee_lat DECIMAL(9,6),
  attendee_lng DECIMAL(9,6),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  method VARCHAR(50) DEFAULT 'qr_scan' CHECK (method IN ('qr_scan', 'manual_review'))
);

-- 10. Verification Audit Logs
CREATE TABLE IF NOT EXISTS verification_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  action VARCHAR(100) NOT NULL,
  from_tier INTEGER NOT NULL,
  to_tier INTEGER NOT NULL,
  verified_by UUID REFERENCES profiles(user_id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Route Segments
CREATE TABLE IF NOT EXISTS route_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  start_lat DECIMAL(9,6) NOT NULL,
  start_lng DECIMAL(9,6) NOT NULL,
  end_lat DECIMAL(9,6) NOT NULL,
  end_lng DECIMAL(9,6) NOT NULL,
  polyline TEXT,
  length_meters INTEGER,
  lighting_score DECIMAL(3,2),
  foot_traffic_score DECIMAL(3,2),
  overall_score DECIMAL(3,2),
  is_simulated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Route Ratings
CREATE TABLE IF NOT EXISTS route_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  segment_id UUID NOT NULL REFERENCES route_segments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tier_weight DECIMAL(3,1) DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Streetlight Reports
CREATE TABLE IF NOT EXISTS streetlight_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(user_id),
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  is_working BOOLEAN NOT NULL,
  pole_number VARCHAR(50),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'reported' CHECK (status IN ('reported', 'acknowledged', 'repaired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Safety Incident Reports
CREATE TABLE IF NOT EXISTS safety_incident_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(user_id),
  incident_type VARCHAR(100) NOT NULL CHECK (incident_type IN ('poor_lighting', 'harassment', 'suspicious_activity', 'obstruction', 'other')),
  description TEXT,
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  incident_time TIMESTAMPTZ NOT NULL,
  severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Nearby Places (Safe spaces, open businesses, transport hubs)
CREATE TABLE IF NOT EXISTS nearby_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  place_type VARCHAR(100) NOT NULL CHECK (place_type IN ('cafe', 'pharmacy', 'station', 'library', 'hospital', 'police_station', 'shop')),
  address TEXT,
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  is_open_late BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  safety_features TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Business Partners
CREATE TABLE IF NOT EXISTS business_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES nearby_places(id) ON DELETE CASCADE,
  business_name VARCHAR(200) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Discount Offers
CREATE TABLE IF NOT EXISTS discount_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES business_partners(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  promo_code VARCHAR(50) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Buddy Profiles
CREATE TABLE IF NOT EXISTS buddy_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  interests TEXT[],
  bio TEXT,
  preferred_radius_km INTEGER DEFAULT 5,
  preferred_activities TEXT[],
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Buddy Requests
CREATE TABLE IF NOT EXISTS buddy_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sender_id, recipient_id)
);

-- 20. Buddy Matches
CREATE TABLE IF NOT EXISTS buddy_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user1_id, user2_id)
);

-- 21. Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  user1_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user1_id, user2_id)
);

-- 22. Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. User Reports
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  details TEXT,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. Moderation Cases
CREATE TABLE IF NOT EXISTS moderation_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES user_reports(id) ON DELETE CASCADE,
  moderator_id UUID REFERENCES profiles(user_id),
  action_taken VARCHAR(100),
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. Trusted Contacts
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  contact_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  relationship VARCHAR(50),
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. Emergency Action Logs (Timescale compatible composite PK)
CREATE TABLE IF NOT EXISTS emergency_action_logs (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('call_999', 'call_112', 'contact_trusted', 'share_location')),
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
);

-- 27. AI Call Sessions (Timescale compatible composite PK)
CREATE TABLE IF NOT EXISTS ai_call_sessions (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  distress_flag_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, started_at)
);

-- 28. AI Call Consent Settings
CREATE TABLE IF NOT EXISTS ai_call_consent_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  distress_detection_enabled BOOLEAN DEFAULT false,
  consent_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. Distress Alert Events (Timescale compatible composite PK)
CREATE TABLE IF NOT EXISTS distress_alert_events (
  id UUID DEFAULT uuid_generate_v4(),
  session_id UUID,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  trigger_type VARCHAR(100) NOT NULL,
  confidence_score DECIMAL(4,3),
  outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('dismissed', 'okay', 'help_requested')),
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
);

-- Geographic BBOX & Performance Indexes
CREATE INDEX IF NOT EXISTS idx_events_lat_lng ON events (lat, lng);
CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);
CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);
CREATE INDEX IF NOT EXISTS idx_route_segments_coords ON route_segments (start_lat, start_lng, end_lat, end_lng);
CREATE INDEX IF NOT EXISTS idx_streetlights_coords ON streetlight_reports (lat, lng);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_coords ON safety_incident_reports (lat, lng);
CREATE INDEX IF NOT EXISTS idx_nearby_places_coords ON nearby_places (lat, lng);
CREATE INDEX IF NOT EXISTS idx_route_ratings_segment ON route_ratings (segment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_event_qr_tokens_hash ON event_qr_tokens (token_hash);

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_update_updated_at ON %I;', tbl);
    EXECUTE format('CREATE TRIGGER trg_update_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_updated_at();', tbl);
  END LOOP;
END $$;
