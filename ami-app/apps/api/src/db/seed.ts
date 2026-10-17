import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool, logDatabaseStatus } from './connection';

async function seed() {
  console.log('[SEED] Starting database seeding...');
  logDatabaseStatus();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Clean existing seed data
    console.log('[SEED] Truncating tables...');
    await client.query(`
      TRUNCATE TABLE
        distress_alert_events,
        ai_call_consent_settings,
        ai_call_sessions,
        emergency_action_logs,
        trusted_contacts,
        moderation_cases,
        user_reports,
        messages,
        conversations,
        buddy_matches,
        buddy_requests,
        buddy_profiles,
        discount_offers,
        business_partners,
        nearby_places,
        safety_incident_reports,
        streetlight_reports,
        route_ratings,
        route_segments,
        verification_audit_logs,
        physical_verifications,
        event_qr_tokens,
        event_attendees,
        events,
        user_sessions,
        user_trust_status,
        user_verifications,
        profiles,
        users
      CASCADE;
    `);

    // 2. Demo Users & Profiles
    console.log('[SEED] Inserting 5 demo users with trust tiers...');
    const defaultPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const demoUsers = [
      {
        email: 'sophie.chen@kcl.ac.uk',
        displayName: 'Sophie Chen',
        bio: 'Biomedical Science @ King’s. Love campus running, boba, and group study sessions!',
        domain: 'kcl.ac.uk',
        interests: ['running', 'study_buddies', 'boba', 'badminton'],
        lat: 51.5115,
        lng: -0.1160,
        tier: 2,
        emailVerified: true,
        identityPassed: true,
        tier1GrantedAt: new Date(Date.now() - 30 * 86400000),
        tier2GrantedAt: new Date(Date.now() - 15 * 86400000),
      },
      {
        email: 'maya.patel@ucl.ac.uk',
        displayName: 'Maya Patel',
        bio: 'MSc Computer Science @ UCL. Tech events, café meetups, and evening walks around Bloomsbury.',
        domain: 'ucl.ac.uk',
        interests: ['tech', 'hackathons', 'coffee', 'museums'],
        lat: 51.5246,
        lng: -0.1340,
        tier: 2,
        emailVerified: true,
        identityPassed: true,
        tier1GrantedAt: new Date(Date.now() - 40 * 86400000),
        tier2GrantedAt: new Date(Date.now() - 10 * 86400000),
      },
      {
        email: 'elena.rostova@imperial.ac.uk',
        displayName: 'Elena Rostova',
        bio: 'Physics undergrad @ Imperial. New to London, exploring Kensington & cycling routes.',
        domain: 'imperial.ac.uk',
        interests: ['cycling', 'board_games', 'astronomy', 'tea'],
        lat: 51.4988,
        lng: -0.1749,
        tier: 1,
        emailVerified: true,
        identityPassed: true,
        tier1GrantedAt: new Date(Date.now() - 5 * 86400000),
        tier2GrantedAt: null,
      },
      {
        email: 'zara.ahmed@student.manchester.ac.uk',
        displayName: 'Zara Ahmed',
        bio: 'Law student visiting London libraries for thesis research. Looking for daytime study partners.',
        domain: 'student.manchester.ac.uk',
        interests: ['reading', 'libraries', 'law', 'art_galleries'],
        lat: 51.5188,
        lng: -0.1281,
        tier: 1,
        emailVerified: true,
        identityPassed: true,
        tier1GrantedAt: new Date(Date.now() - 3 * 86400000),
        tier2GrantedAt: null,
      },
      {
        email: 'chloe.taylor@gmail.com',
        displayName: 'Chloe Taylor',
        bio: 'Prospective applicant exploring London universities.',
        domain: null,
        interests: ['tours', 'campus_visits'],
        lat: 51.5300,
        lng: -0.1240,
        tier: 0,
        emailVerified: false,
        identityPassed: false,
        tier1GrantedAt: null,
        tier2GrantedAt: null,
      },
    ];

    const userMap: Record<string, string> = {};

    for (const u of demoUsers) {
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [u.email, passwordHash]
      );
      const userId = userRes.rows[0].id;
      userMap[u.email] = userId;

      await client.query(
        `INSERT INTO profiles (user_id, display_name, bio, university_domain, interests, approx_lat, approx_lng, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [userId, u.displayName, u.bio, u.domain, u.interests, u.lat, u.lng]
      );

      await client.query(
        `INSERT INTO user_verifications (user_id, email, email_verified, email_verified_at, university_domain, identity_check_status, liveness_passed)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          u.email,
          u.emailVerified,
          u.emailVerified ? new Date() : null,
          u.domain,
          u.identityPassed ? 'passed' : 'pending',
          u.identityPassed,
        ]
      );

      await client.query(
        `INSERT INTO user_trust_status (user_id, tier, tier1_granted_at, tier2_granted_at, is_suspended)
         VALUES ($1, $2, $3, $4, false)`,
        [userId, u.tier, u.tier1GrantedAt, u.tier2GrantedAt]
      );

      await client.query(
        `INSERT INTO ai_call_consent_settings (user_id, distress_detection_enabled)
         VALUES ($1, true)`,
        [userId]
      );
    }

    const sophieId = userMap['sophie.chen@kcl.ac.uk'];
    const mayaId = userMap['maya.patel@ucl.ac.uk'];
    const elenaId = userMap['elena.rostova@imperial.ac.uk'];
    const zaraId = userMap['zara.ahmed@student.manchester.ac.uk'];

    // 3. Events (8 categories across London)
    console.log('[SEED] Inserting 8 diverse events...');
    const events = [
      {
        hostId: sophieId,
        title: 'Sunset 5K Campus Group Run',
        description: 'Friendly non-competitive group run from King’s Strand Campus along the Victoria Embankment. Well-lit and beginner friendly!',
        category: 'sports',
        startTime: new Date(Date.now() + 2 * 86400000),
        endTime: new Date(Date.now() + 2 * 86400000 + 7200000),
        locationName: 'Strand Campus Quad',
        address: 'Strand, London WC2R 2LS',
        lat: 51.5115,
        lng: -0.1160,
        maxAttendees: 15,
        currentAttendees: 6,
        price: 0,
        requiredTier: 1,
        status: 'active',
      },
      {
        hostId: mayaId,
        title: 'Bloomsbury Café & Thesis Coworking',
        description: 'Grab a table, share coffee, and get productive together in a calm, female-only student study group.',
        category: 'cafe_meetup',
        startTime: new Date(Date.now() + 3 * 86400000),
        endTime: new Date(Date.now() + 3 * 86400000 + 10800000),
        locationName: 'Dillon’s Coffee @ Waterstones',
        address: '82 Gower St, London WC1E 6EQ',
        lat: 51.5222,
        lng: -0.1328,
        maxAttendees: 8,
        currentAttendees: 5,
        price: 0,
        requiredTier: 1,
        status: 'active',
      },
      {
        hostId: mayaId,
        title: 'Self-Defense & Situational Awareness Workshop',
        description: 'Led by a certified female martial arts instructor. Practical everyday boundary setting and physical release techniques.',
        category: 'workshop',
        startTime: new Date(Date.now() + 5 * 86400000),
        endTime: new Date(Date.now() + 5 * 86400000 + 7200000),
        locationName: 'UCL Student Centre Room 204',
        address: '27-28 Gordon Square, London WC1H 0AH',
        lat: 51.5249,
        lng: -0.1322,
        maxAttendees: 20,
        currentAttendees: 12,
        price: 5.0,
        requiredTier: 2,
        status: 'active',
      },
      {
        hostId: sophieId,
        title: 'Women in STEM Career Networking Evening',
        description: 'Meet mentors and fellow students in computing, engineering, and sciences. Refreshments provided by partner societies.',
        category: 'career',
        startTime: new Date(Date.now() + 7 * 86400000),
        endTime: new Date(Date.now() + 7 * 86400000 + 10800000),
        locationName: 'Bush House Arcade',
        address: '30 Aldwych, London WC2B 4BG',
        lat: 51.5128,
        lng: -0.1177,
        maxAttendees: 40,
        currentAttendees: 25,
        price: 0,
        requiredTier: 1,
        status: 'active',
      },
      {
        hostId: sophieId,
        title: 'Badminton & Social Rally Club',
        description: 'Courts booked for recreational play. Rackets and shuttles provided, all skill levels welcome!',
        category: 'societies',
        startTime: new Date(Date.now() + 4 * 86400000),
        endTime: new Date(Date.now() + 4 * 86400000 + 7200000),
        locationName: 'Seymour Leisure Centre',
        address: 'Seymour Pl, London W1H 5TJ',
        lat: 51.5186,
        lng: -0.1645,
        maxAttendees: 12,
        currentAttendees: 8,
        price: 3.5,
        requiredTier: 1,
        status: 'active',
      },
      {
        hostId: mayaId,
        title: 'British Library Quiet Study Sprint',
        description: 'Reserved study desks on Upper Ground Floor. Structured 50-minute Pomodoro focus blocks.',
        category: 'study',
        startTime: new Date(Date.now() + 1 * 86400000),
        endTime: new Date(Date.now() + 1 * 86400000 + 14400000),
        locationName: 'British Library St Pancras',
        address: '96 Euston Rd, London NW1 2DB',
        lat: 51.5299,
        lng: -0.1277,
        maxAttendees: 10,
        currentAttendees: 9,
        price: 0,
        requiredTier: 1,
        status: 'active',
      },
      {
        hostId: sophieId,
        title: 'Tate Modern Evening Gallery Walk',
        description: 'Free evening viewing of modern exhibits followed by hot chocolate on the South Bank.',
        category: 'cultural',
        startTime: new Date(Date.now() + 6 * 86400000),
        endTime: new Date(Date.now() + 6 * 86400000 + 7200000),
        locationName: 'Tate Modern Turbine Hall',
        address: 'Bankside, London SE1 9TG',
        lat: 51.5076,
        lng: -0.0994,
        maxAttendees: 16,
        currentAttendees: 7,
        price: 0,
        requiredTier: 1,
        status: 'active',
      },
      {
        hostId: mayaId,
        title: 'Community Clothing Swap & Eco Social',
        description: 'Bring pre-loved wardrobe items and trade with fellow students. Sustainable fashion meetup with tea and snacks.',
        category: 'community',
        startTime: new Date(Date.now() + 8 * 86400000),
        endTime: new Date(Date.now() + 8 * 86400000 + 10800000),
        locationName: 'Marchmont Community Hall',
        address: '62 Marchmont St, London WC1N 1AB',
        lat: 51.5255,
        lng: -0.1245,
        maxAttendees: 25,
        currentAttendees: 14,
        price: 0,
        requiredTier: 1,
        status: 'active',
      },
    ];

    const eventIds: string[] = [];
    for (const ev of events) {
      const res = await client.query(
        `INSERT INTO events (host_id, title, description, category, start_time, end_time, location_name, address, lat, lng, max_attendees, current_attendees, price, required_tier, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
        [
          ev.hostId,
          ev.title,
          ev.description,
          ev.category,
          ev.startTime,
          ev.endTime,
          ev.locationName,
          ev.address,
          ev.lat,
          ev.lng,
          ev.maxAttendees,
          ev.currentAttendees,
          ev.price,
          ev.requiredTier,
          ev.status,
        ]
      );
      eventIds.push(res.rows[0].id);
    }

    // RSVPs
    console.log('[SEED] Linking event attendees...');
    await client.query(
      `INSERT INTO event_attendees (event_id, user_id, status) VALUES
       ($1, $2, 'rsvp'),
       ($1, $3, 'rsvp'),
       ($2, $4, 'rsvp'),
       ($3, $2, 'rsvp')`,
      [eventIds[0], elenaId, zaraId, sophieId]
    );

    // 4. Sample QR Tokens
    console.log('[SEED] Generating event QR tokens (valid and expired)...');
    const validRawToken = crypto.randomUUID();
    const validHash = crypto.createHash('sha256').update(validRawToken).digest('hex');
    const expiredRawToken = crypto.randomUUID();
    const expiredHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');

    await client.query(
      `INSERT INTO event_qr_tokens (event_id, host_id, token_hash, expires_at, is_used, host_lat, host_lng)
       VALUES
       ($1, $2, $3, NOW() + INTERVAL '30 seconds', false, 51.5115, -0.1160),
       ($4, $5, $6, NOW() - INTERVAL '10 minutes', false, 51.5246, -0.1340)`,
      [eventIds[0], sophieId, validHash, eventIds[1], mayaId, expiredHash]
    );

    // 5. Nearby Places & Business Partners (Near King's Cross / Bloomsbury)
    console.log('[SEED] Inserting 8 nearby partner places with student offers...');
    const places = [
      {
        name: 'Origin Coffee Roasters Kings Cross',
        type: 'cafe',
        address: '65 Charlotte Rd & 84 Marchmont St, London',
        lat: 51.5273,
        lng: -0.1248,
        openLate: true,
        features: ['well_lit', 'cctv', 'friendly_staff', 'free_wifi'],
        partner: 'Origin Coffee Ltd',
        contact: 'partnerships@origincoffee.co.uk',
        discount: { title: '15% Off All Drinks & Pastries', pct: 15, code: 'AMI-ORIGIN15' },
      },
      {
        name: 'The Fellow Gastro & Study Lounge',
        type: 'cafe',
        address: '24 York Way, London N1 9AA',
        lat: 51.5322,
        lng: -0.1228,
        openLate: true,
        features: ['security_door', 'well_lit', 'spacious'],
        partner: 'The Fellow Kings Cross',
        contact: 'manager@thefellow.co.uk',
        discount: { title: '20% Student Food Discount', pct: 20, code: 'AMI-FELLOW20' },
      },
      {
        name: 'Boots Pharmacy St Pancras Station',
        type: 'pharmacy',
        address: 'St Pancras International, Euston Rd, London N1C 4QP',
        lat: 51.5315,
        lng: -0.1262,
        openLate: true,
        features: ['safe_space_registered', 'security_patrols', 'well_lit'],
        partner: 'Boots Safe Haven UK',
        contact: 'community@boots.com',
        discount: { title: '10% Off Health & Personal Care', pct: 10, code: 'AMI-BOOTS10' },
      },
      {
        name: 'Bloomsbury Coffee House',
        type: 'cafe',
        address: '20 Tavistock Pl, London WC1H 9RE',
        lat: 51.5251,
        lng: -0.1259,
        openLate: false,
        features: ['warm_atmosphere', 'female_staff_presence', 'safe_haven'],
        partner: 'Bloomsbury Hospitality',
        contact: 'hello@bloomsburycoffee.com',
        discount: { title: 'Free Pastry With Large Latte', pct: 25, code: 'AMI-BLOOM25' },
      },
      {
        name: 'King’s Cross Station Safe Hub & Help Point',
        type: 'station',
        address: 'Euston Rd, London N1 9AL',
        lat: 51.5317,
        lng: -0.1243,
        openLate: true,
        features: ['24h_cctv', 'british_transport_police', 'staffed_helpdesk'],
        partner: 'Network Rail Safe Travel',
        contact: 'community@networkrail.co.uk',
        discount: { title: '10% Station Food Court Voucher', pct: 10, code: 'AMI-STATION10' },
      },
      {
        name: 'Waterstones Gower Street Book Café',
        type: 'library',
        address: '82 Gower St, London WC1E 6EQ',
        lat: 51.5224,
        lng: -0.1331,
        openLate: true,
        features: ['quiet_zones', 'cctv', 'well_lit', 'female_security'],
        partner: 'Waterstones Booksellers',
        contact: 'gowerst@waterstones.com',
        discount: { title: '10% Book & Café Bundle', pct: 10, code: 'AMI-READ10' },
      },
      {
        name: 'Dishoom King’s Cross',
        type: 'restaurant',
        address: '5 Stable St, London N1C 4AB',
        lat: 51.5351,
        lng: -0.1253,
        openLate: true,
        features: ['well_lit', 'staffed', 'accessible_entrance'],
        partner: 'Dishoom',
        contact: 'community@dishoom.com',
        discount: { title: '10% Student Dining Offer', pct: 10, code: 'AMI-DISHOOM10' },
      },
      {
        name: 'The Life Goddess Restaurant',
        type: 'restaurant',
        address: '29 Store St, London WC1E 7DH',
        lat: 51.5207,
        lng: -0.1349,
        openLate: false,
        features: ['well_lit', 'staffed', 'busy_public_location'],
        partner: 'The Life Goddess',
        contact: 'hello@thelifegoddess.com',
        discount: { title: '10% Student Dining Offer', pct: 10, code: 'AMI-LIFE10' },
      },
    ];

    for (const p of places) {
      const pRes = await client.query(
        `INSERT INTO nearby_places (name, place_type, address, lat, lng, is_open_late, is_verified, safety_features)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7) RETURNING id`,
        [p.name, p.type, p.address, p.lat, p.lng, p.openLate, p.features]
      );
      const placeId = pRes.rows[0].id;

      const bpRes = await client.query(
        `INSERT INTO business_partners (place_id, business_name, contact_email, is_active)
         VALUES ($1, $2, $3, true) RETURNING id`,
        [placeId, p.partner, p.contact]
      );
      const partnerId = bpRes.rows[0].id;

      await client.query(
        `INSERT INTO discount_offers (partner_id, title, description, discount_percent, promo_code, valid_from, valid_until, is_active)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days', true)`,
        [
          partnerId,
          p.discount.title,
          `Exclusive for Ami verified students. Show code at till.`,
          p.discount.pct,
          p.discount.code,
        ]
      );
    }

    // 6. 20 Route Segments Covering Central London
    console.log('[SEED] Inserting 20 central London walking segments...');
    const segments = [
      { name: 'Euston Rd West (St Pancras to Tottenham Ct Rd)', sLat: 51.5298, sLng: -0.1265, eLat: 51.5262, eLng: -0.1345, len: 650, light: 4.8, foot: 4.6, ovr: 4.7 },
      { name: 'Tottenham Court Road Main Thoroughfare', sLat: 51.5262, sLng: -0.1345, eLat: 51.5165, eLng: -0.1308, len: 1100, light: 4.7, foot: 4.8, ovr: 4.75 },
      { name: 'Gower Street Academic Corridor', sLat: 51.5246, sLng: -0.1340, eLat: 51.5195, eLng: -0.1312, len: 600, light: 4.2, foot: 3.9, ovr: 4.1 },
      { name: 'Russell Square North Pathway', sLat: 51.5220, sLng: -0.1260, eLat: 51.5218, eLng: -0.1235, len: 200, light: 3.6, foot: 3.2, ovr: 3.4 },
      { name: 'Russell Square South Walk', sLat: 51.5210, sLng: -0.1258, eLat: 51.5208, eLng: -0.1232, len: 210, light: 3.8, foot: 3.5, ovr: 3.65 },
      { name: 'Southampton Row Lighted Walkway', sLat: 51.5212, sLng: -0.1225, eLat: 51.5168, eLng: -0.1205, len: 520, light: 4.5, foot: 4.3, ovr: 4.4 },
      { name: 'Kingsway Central Avenue', sLat: 51.5168, sLng: -0.1205, eLat: 51.5126, eLng: -0.1182, len: 500, light: 4.8, foot: 4.5, ovr: 4.65 },
      { name: 'Strand River Terrace Route', sLat: 51.5115, sLng: -0.1160, eLat: 51.5101, eLng: -0.1228, len: 550, light: 4.6, foot: 4.4, ovr: 4.5 },
      { name: 'Victoria Embankment Well-Lit Riverwalk', sLat: 51.5108, sLng: -0.1152, eLat: 51.5065, eLng: -0.1215, len: 650, light: 4.7, foot: 4.6, ovr: 4.65 },
      { name: 'Marchmont Street High Street Corridor', sLat: 51.5262, sLng: -0.1248, eLat: 51.5230, eLng: -0.1252, len: 380, light: 4.3, foot: 4.1, ovr: 4.2 },
      { name: 'Tavistock Square Garden Walk', sLat: 51.5250, sLng: -0.1285, eLat: 51.5238, eLng: -0.1292, len: 180, light: 3.2, foot: 2.8, ovr: 3.0 },
      { name: 'Gordon Square Student Pathway', sLat: 51.5244, sLng: -0.1315, eLat: 51.5232, eLng: -0.1322, len: 160, light: 3.9, foot: 3.8, ovr: 3.85 },
      { name: 'Pancras Road Station Access', sLat: 51.5320, sLng: -0.1270, eLat: 51.5350, eLng: -0.1285, len: 350, light: 4.6, foot: 4.2, ovr: 4.4 },
      { name: 'York Way Vibrant Strip', sLat: 51.5320, sLng: -0.1225, eLat: 51.5365, eLng: -0.1220, len: 500, light: 4.4, foot: 4.0, ovr: 4.2 },
      { name: 'Goodge Street Food District', sLat: 51.5198, sLng: -0.1350, eLat: 51.5195, eLng: -0.1388, len: 320, light: 4.5, foot: 4.4, ovr: 4.45 },
      { name: 'Charlotte Street Evening Walk', sLat: 51.5190, sLng: -0.1368, eLat: 51.5160, eLng: -0.1355, len: 360, light: 4.6, foot: 4.5, ovr: 4.55 },
      { name: 'Charing Cross Road Connecting Walk', sLat: 51.5165, sLng: -0.1308, eLat: 51.5118, eLng: -0.1280, len: 580, light: 4.7, foot: 4.8, ovr: 4.75 },
      { name: 'Bloomsbury Way East-West Path', sLat: 51.5180, sLng: -0.1250, eLat: 51.5175, eLng: -0.1215, len: 300, light: 4.2, foot: 4.0, ovr: 4.1 },
      { name: 'High Holborn Commercial Corridor', sLat: 51.5175, sLng: -0.1215, eLat: 51.5182, eLng: -0.1130, len: 650, light: 4.6, foot: 4.4, ovr: 4.5 },
      { name: 'Great Russell Street Museum Approach', sLat: 51.5185, sLng: -0.1290, eLat: 51.5192, eLng: -0.1255, len: 300, light: 4.4, foot: 4.2, ovr: 4.3 },
    ];

    const segmentIds: string[] = [];
    for (const seg of segments) {
      const res = await client.query(
        `INSERT INTO route_segments (name, start_lat, start_lng, end_lat, end_lng, length_meters, lighting_score, foot_traffic_score, overall_score, is_simulated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING id`,
        [seg.name, seg.sLat, seg.sLng, seg.eLat, seg.eLng, seg.len, seg.light, seg.foot, seg.ovr]
      );
      segmentIds.push(res.rows[0].id);
    }

    // 7. 15 Streetlight Reports
    console.log('[SEED] Inserting 15 streetlight reports...');
    const streetlights = [
      { lat: 51.5295, lng: -0.1270, working: true, pole: 'SL-KC-101', notes: 'Bright LED lamp installed recently' },
      { lat: 51.5288, lng: -0.1280, working: true, pole: 'SL-KC-102', notes: 'Fully lit' },
      { lat: 51.5255, lng: -0.1290, working: false, pole: 'SL-TAV-204', notes: 'Flickering and intermittently off near square corner' },
      { lat: 51.5240, lng: -0.1288, working: true, pole: 'SL-TAV-205', notes: 'Good coverage' },
      { lat: 51.5248, lng: -0.1335, working: true, pole: 'SL-UCL-01', notes: 'Campus perimeter lantern bright' },
      { lat: 51.5230, lng: -0.1332, working: true, pole: 'SL-UCL-02', notes: 'Operating normally' },
      { lat: 51.5218, lng: -0.1250, working: false, pole: 'SL-RS-09', notes: 'Shaded by tree branches, dark blindspot' },
      { lat: 51.5210, lng: -0.1245, working: true, pole: 'SL-RS-10', notes: 'Functional' },
      { lat: 51.5170, lng: -0.1210, working: true, pole: 'SL-SH-301', notes: 'High output street lamp' },
      { lat: 51.5140, lng: -0.1190, working: true, pole: 'SL-KW-401', notes: 'Double mast lighting' },
      { lat: 51.5118, lng: -0.1165, working: true, pole: 'SL-KCL-12', notes: 'Directly outside main doors' },
      { lat: 51.5105, lng: -0.1180, working: true, pole: 'SL-EMB-88', notes: 'Heritage style embankment light, fully lit' },
      { lat: 51.5260, lng: -0.1245, working: true, pole: 'SL-MC-55', notes: 'Clear view of road' },
      { lat: 51.5195, lng: -0.1375, working: true, pole: 'SL-GD-19', notes: 'Shop fronts also illuminate pavement' },
      { lat: 51.5330, lng: -0.1250, working: false, pole: 'SL-STP-04', notes: 'Bulb burned out near rear exit' },
    ];

    for (const sl of streetlights) {
      await client.query(
        `INSERT INTO streetlight_reports (reporter_id, lat, lng, is_working, pole_number, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'reported')`,
        [sophieId, sl.lat, sl.lng, sl.working, sl.pole, sl.notes]
      );
    }

    // 8. 10 Safety Incident Reports
    console.log('[SEED] Inserting 10 community safety incident reports...');
    const incidents = [
      { type: 'poor_lighting', desc: 'Overhanging tree leaves block streetlight completely along park perimeter.', lat: 51.5219, lng: -0.1248, sev: 'medium' },
      { type: 'harassment', desc: 'Verbal catcalling reported by group near alleyway exit after 10pm.', lat: 51.5270, lng: -0.1340, sev: 'high' },
      { type: 'suspicious_activity', desc: 'Individual lingering behind phone booths observing passersby.', lat: 51.5182, lng: -0.1275, sev: 'medium' },
      { type: 'obstruction', desc: 'Construction scaffolding creates very narrow blind walkway.', lat: 51.5235, lng: -0.1320, sev: 'low' },
      { type: 'poor_lighting', desc: 'Dark underpass walkway with no working bulb.', lat: 51.5325, lng: -0.1245, sev: 'high' },
      { type: 'suspicious_activity', desc: 'Unmarked scooter riding on pavement following pedestrians.', lat: 51.5160, lng: -0.1330, sev: 'high' },
      { type: 'harassment', desc: 'Unwanted following for two blocks until entering open café.', lat: 51.5228, lng: -0.1250, sev: 'high' },
      { type: 'obstruction', desc: 'Temporary barrier forced pedestrian into road.', lat: 51.5120, lng: -0.1170, sev: 'low' },
      { type: 'poor_lighting', desc: 'Extremely dim lighting between garden gates after sunset.', lat: 51.5248, lng: -0.1282, sev: 'medium' },
      { type: 'other', desc: 'Uneven broken pavement causing tripping hazard in dim light.', lat: 51.5190, lng: -0.1220, sev: 'low' },
    ];

    for (const inc of incidents) {
      await client.query(
        `INSERT INTO safety_incident_reports (reporter_id, incident_type, description, lat, lng, incident_time, severity, status)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '2 days', $6, 'verified')`,
        [mayaId, inc.type, inc.desc, inc.lat, inc.lng, inc.sev]
      );
    }

    // 9. 5 Route Ratings
    console.log('[SEED] Inserting 5 route ratings...');
    await client.query(
      `INSERT INTO route_ratings (segment_id, user_id, rating, tier_weight, notes)
       VALUES
       ($1, $2, 5, 2.0, 'Always feels well-lit and busy, safe to walk even after 9pm.'),
       ($1, $3, 4, 2.0, 'Good foot traffic, plenty of open shops along the way.'),
       ($4, $2, 2, 2.0, 'Avoid Russell Square park paths after dark; use Southampton Row instead.'),
       ($7, $3, 5, 2.0, 'Wide pavements, bright streetlights, police station nearby.'),
       ($10, $4, 4, 1.0, 'Lovely high street with friendly local shopkeepers.')`,
      [segmentIds[0], sophieId, mayaId, segmentIds[3], segmentIds[6], segmentIds[9], elenaId]
    );

    // 10. 3 Buddy Profiles
    console.log('[SEED] Inserting 3 buddy profiles...');
    await client.query(
      `INSERT INTO buddy_profiles (user_id, interests, bio, preferred_radius_km, preferred_activities, is_available)
       VALUES
       ($1, ARRAY['running', 'study_buddies', 'boba', 'badminton'], 'Sophie @ KCL. Looking for evening run partners and library buddies!', 5, ARRAY['running', 'studying', 'walking'], true),
       ($2, ARRAY['tech', 'hackathons', 'coffee', 'museums'], 'Maya @ UCL. Happy to walk together to Russell Sq / St Pancras stations!', 6, ARRAY['coffee', 'evening_walk', 'libraries'], true),
       ($3, ARRAY['cycling', 'board_games', 'astronomy', 'tea'], 'Elena @ Imperial. Cycling companion or safe walk home buddy.', 8, ARRAY['cycling', 'study'], true)`,
      [sophieId, mayaId, elenaId]
    );

    // 11. 2 Buddy Matches with Conversations and Messages
    console.log('[SEED] Inserting 2 buddy matches, conversations, and messages...');
    // Match 1: Sophie & Maya
    await client.query(
      `INSERT INTO buddy_matches (user1_id, user2_id, matched_at, is_active)
       VALUES ($1, $2, NOW() - INTERVAL '5 days', true)`,
      [sophieId, mayaId]
    );

    const conv1 = await client.query(
      `INSERT INTO conversations (type, user1_id, user2_id)
       VALUES ('direct', $1, $2) RETURNING id`,
      [sophieId, mayaId]
    );
    const conv1Id = conv1.rows[0].id;

    await client.query(
      `INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
       VALUES
       ($1, $2, 'Hey Maya! Are you heading to the British Library study sprint this Thursday?', true, NOW() - INTERVAL '3 hours'),
       ($1, $3, 'Yes! Would love to walk together from Russell Square station if you want?', true, NOW() - INTERVAL '2 hours'),
       ($1, $2, 'Perfect! Let us meet outside Dillon’s café at 5:45pm.', false, NOW() - INTERVAL '1 hour')`,
      [conv1Id, sophieId, mayaId]
    );

    // Match 2: Maya & Elena
    await client.query(
      `INSERT INTO buddy_matches (user1_id, user2_id, matched_at, is_active)
       VALUES ($1, $2, NOW() - INTERVAL '2 days', true)`,
      [mayaId, elenaId]
    );

    const conv2 = await client.query(
      `INSERT INTO conversations (type, user1_id, user2_id)
       VALUES ('direct', $1, $2) RETURNING id`,
      [mayaId, elenaId]
    );
    const conv2Id = conv2.rows[0].id;

    await client.query(
      `INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
       VALUES
       ($1, $2, 'Hi Elena! Welcome to London! How is Imperial so far?', true, NOW() - INTERVAL '1 day'),
       ($1, $3, 'Loving it so far! Still figuring out the safest tube exits at night though haha.', true, NOW() - INTERVAL '18 hours')`,
      [conv2Id, mayaId, elenaId]
    );

    // 12. 2 Trusted Contacts
    console.log('[SEED] Inserting 2 trusted emergency contacts...');
    await client.query(
      `INSERT INTO trusted_contacts (user_id, contact_name, phone_number, relationship, priority)
       VALUES
       ($1, 'Alice Chen (Sister)', '+44 7700 900123', 'Sister', 1),
       ($1, 'KCL Security Control', '+44 20 7848 2222', 'Campus Security', 2),
       ($2, 'Priya Patel (Mum)', '+44 7700 900456', 'Parent', 1)`,
      [sophieId, mayaId]
    );

    await client.query('COMMIT');
    console.log('[SEED] Seeding completed successfully!');
    console.log('[SEED] Summary:');
    console.log(' - 5 Demo users created (Passwords: Password123!)');
    console.log('   * sophie.chen@kcl.ac.uk (Tier 2)');
    console.log('   * maya.patel@ucl.ac.uk (Tier 2)');
    console.log('   * elena.rostova@imperial.ac.uk (Tier 1)');
    console.log('   * zara.ahmed@student.manchester.ac.uk (Tier 1)');
    console.log('   * chloe.taylor@gmail.com (Tier 0)');
    console.log(' - 8 Events across London');
    console.log(' - 6 Business partners & discount offers');
    console.log(' - 20 Route segments with 15 streetlights and 10 safety incidents');
    console.log(' - 3 Buddy profiles, 2 matches, active conversations & messages');
    console.log(' - Trusted contacts and QR verification tokens');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[SEED] Seeding failed with error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed();
}

export { seed };
