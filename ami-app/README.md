# Ami — Women's Safety & Social Discovery Platform

> *Feel safer. Go further. Find your people.*

A full-stack monorepo for **Ami**, combining interactive safety mapping, social discovery, AI video-call companion, verified buddy matching, and emergency assistance for female university students.

---

## Prerequisites

- Node.js 20+
- npm 10+

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example apps/api/.env
cp .env.web.example apps/web/.env

# Edit both .env files with your keys

# 3. Run database migrations
npm run migrate

# 4. Seed demo data
npm run seed

# 5. Start API (terminal 1)
npm run dev:api

# 6. Start web app (terminal 2)
npm run dev:web
```

The web app runs on **http://localhost:5173**  
The API runs on **http://localhost:3001**

---

## Environment Variables

### `apps/api/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | TigerData/TimescaleDB connection string |
| `JWT_SECRET` | Random 64-char secret for JWT signing |
| `GEMINI_API_KEY` | Google Gemini API key |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID for Ami character |
| `SMARTSPECTRA_API_KEY` | Presage SmartSpectra key for opt-in breathing checks |
| `ALLOWED_UNI_DOMAINS` | Comma-separated university email domains |
| `QR_TOKEN_EXPIRY_SECONDS` | QR code lifetime (default: 30) |
| `QR_PROXIMITY_THRESHOLD_METERS` | GPS proximity for QR scan (default: 15) |
| `PORT` | API port (default: 3001) |

### `apps/web/.env`

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | API base URL (default: http://localhost:3001) |

The map uses OpenStreetMap tiles, Nominatim place search, and BRouter walking directions; no map API key is required. Search is submitted explicitly and rate-limited to respect Nominatim's public-service usage policy. The Explore layer also shows nearby curated cafes and restaurants from the `nearby_places` API. Keep the map attribution visible when using OpenStreetMap tiles.

---

## Demo Mode

When `GEMINI_API_KEY` or `ELEVENLABS_API_KEY` are absent, text chat and server-generated speech use simulated responses.

All simulated data is labeled with a **"Demo Data"** badge.

The ElevenLabs ConvAI widget for agent `agent_3601m572qh6xedjakhn24g36v275` is hidden until the map's Call Adam button is pressed. That button opens the widget's call/consent flow; starting the conversation opens the Adam call screen while keeping the widget session mounted. The widget handles its own consent and microphone access. The call screen shows the supplied Adam portrait (`apps/web/public/images/adam.png`) and does not request camera access. The agent's first message must be configured in the ElevenLabs dashboard: this agent rejects the widget's `override-first-message` option. Widget audio and transcripts are not exposed to the app. Leaving the call screen ends the widget session and removes it. Configure the agent's public widget access and opening greeting in the ElevenLabs dashboard.

The SmartSpectra breathing-monitor API remains available but is not currently exposed in the call screen; the current call does not request or stream camera frames.

---

## Architecture

```
ami-app/
├── apps/
│   ├── api/          # Express 5 + TypeScript + PostgreSQL
│   └── web/          # React 18 + Vite + TypeScript
├── .env.example
└── README.md
```

## Trust Tiers

| Tier | Requirements | Key Permissions |
|---|---|---|
| Tier 1 | Verified university email | Map, events (RSVP), route ratings (weight 1.0) |
| Tier 2 | Tier 1 + physical QR attendance | Buddy matching, host events, ratings weight 2.0 |

## UK Emergency Numbers

Ami surfaces **999** and **112** with explicit user confirmation. Ami never auto-calls emergency services.

---

## External Service Costs (estimated)

| Service | Tier | Estimated cost |
|---|---|---|
| OpenStreetMap tiles, Nominatim search, BRouter routing | Public services | No API key or per-request charge; follow each provider's attribution and usage policies |
| Google Gemini 1.5 Flash | Pay-per-use | ~$0.075/1M input tokens |
| ElevenLabs | Creator+ | $22+/month or pay-per-char |
| TigerData/Timescale | Cloud | From $75/month (provided) |

---

## Features Requiring Real-Device Testing

- Microphone capture and ElevenLabs audio streaming
- QR code camera scanning
- `tel:` emergency dial intent
- Geolocation accuracy for QR proximity check
- Browser Notifications API permission flow
- Background audio behavior
