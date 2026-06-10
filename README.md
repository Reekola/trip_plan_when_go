# WhenGo — Trip Departure Planner

An AI agent that tells you not just **how** to get from A to B, but **exactly when to leave** — combining traffic, weather, daylight, and elevation across car, motorcycle, bicycle, and walking modes.

Built for the **Google Cloud Rapid Agent Hackathon** (Elastic track).

## What makes it different from Google Maps

Google Maps answers "given a time, how do I get there?" WhenGo answers: *"given my whole day and preferences, when should I leave?"*

- **Explainable departure recommendations** — every suggestion has a plain-language reason (e.g. "Leave at 09:00 because traffic clears after the morning peak and you'll arrive before the afternoon thunderstorm builds over the Downs")
- **Mode comparison with a recommendation** — "drive or cycle Saturday?" returns a reasoned answer with a winner, not just two times side by side
- **Preference learning** — the agent remembers your travel style (scenic cafés, avoids hills) via Elastic, so trip two is smarter than trip one
- **Destination events as timing inputs** — "there's a market Saturday morning — leave earlier to arrive in time"

## Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| Map | Google Maps JavaScript API |
| Agent orchestration | Google Cloud Agent Builder — Gemini 2.0 Flash function calling |
| Memory + search | Elastic Cloud Serverless — MCP server integration |
| Weather + daylight | Open-Meteo (free, no key required) |
| Traffic | Google Routes API v2 |
| Elevation | Open-Elevation (free, no key required) |
| Geocoding | Google Geocoding API |
| Deploy | Cloud Run + Docker |

## Prerequisites

- Node.js 18+
- An [Elastic Cloud Serverless](https://cloud.elastic.co) account (free trial works)
- A [Google Cloud](https://console.cloud.google.com) project with the following APIs enabled:
  - Maps JavaScript API
  - Geocoding API
  - Routes API

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/trip_planner.git
cd trip_planner
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `ELASTIC_CLOUD_ID` | Elastic Cloud console → your deployment → Cloud ID |
| `ELASTIC_API_KEY` | Elastic Cloud → API Keys → Create key |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_ROUTES_API_KEY` | Same key — enable Routes API on it |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Same key (restrict by domain in production) |

### 3. Create Elastic indexes and seed demo data

```bash
npx tsx scripts/setup-elastic.ts
npx tsx scripts/seed-data.ts
```

This creates 4 indexes (`trip-planner-users`, `trip-planner-trips`, `trip-planner-pois`, `trip-planner-events`) and seeds points of interest along the London → Brighton demo route.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Try **London → Brighton** with mode **bicycle** for a date next weekend to see the full departure reasoning.

## How the agent works

```
User request
    │
    ▼
POST /api/plan
    │
    ├─ (USE_AGENT_BUILDER=true)  → Gemini 2.0 Flash function-calling loop
    │                                  getUserContext → geocode → parallel data fetches
    │                                  → rankDepartures → searchPOIs + queryEvents
    │                                  → saveTrip → JSON plan
    │
    └─ (USE_AGENT_BUILDER=false) → planTrip() direct orchestration (same tools, no LLM loop)
```

**Departure scoring** (`src/lib/agent/rankDepartures.ts`) rates every hour 5 am–9 pm with mode-weighted factors:
- Car/motorcycle: traffic 50%, weather 30%, daylight 20%
- Bicycle: weather 45%, daylight 35%, elevation 20% — hard zero after sunset
- Walk: weather 60%, daylight 40% — hard zero after sunset

## Elastic integration

The project uses Elastic Cloud Serverless for:
- **POI search** — hybrid BM25 + ELSER semantic search (`trip-planner-pois` index)
- **Event lookup** — destination events filtered by date and location (`trip-planner-events`)
- **Trip persistence** — completed plans stored and retrieved (`trip-planner-trips`)
- **User preferences** — travel style profile updated after each trip (`trip-planner-users`)

The Elastic MCP server is registered in Google Cloud Agent Platform and used as the tool source for Elastic operations in the agent loop.

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Home — origin, destination, mode, date
│   ├── trips/[id]/           # Trip result — departure reasoning layout
│   ├── history/              # Past trips from Elastic
│   ├── preferences/          # Learned travel style
│   └── api/
│       ├── plan/             # POST — agent orchestration entry point
│       ├── geocode/          # GET — address → lat/lng
│       ├── weather/          # GET — Open-Meteo forecast
│       ├── traffic/          # GET — Google Routes traffic
│       ├── elevation/        # GET — elevation profile
│       ├── rank/             # POST — departure window scoring
│       └── trips/            # GET|POST — Elastic trip store
└── lib/
    ├── agent/
    │   ├── agentBuilder.ts   # Gemini function-calling loop
    │   ├── planTrip.ts       # Direct orchestration path
    │   ├── rankDepartures.ts # Departure scoring algorithm
    │   ├── composePlan.ts    # Gemini narrative generation
    │   ├── searchPOIs.ts     # Elastic hybrid search
    │   └── queryEvents.ts    # Elastic event lookup
    └── data/
        ├── fetchWeather.ts   # Open-Meteo
        ├── fetchTraffic.ts   # Google Routes API
        ├── fetchElevation.ts # Open-Elevation
        └── geocode.ts        # Google Geocoding API
```

## Deploy to Cloud Run

```bash
gcloud run deploy trip-planner \
  --source . \
  --port 8080 \
  --region europe-west3 \
  --set-env-vars USE_AGENT_BUILDER=true \
  --set-env-vars GOOGLE_CLOUD_PROJECT_ID=whengoproject \
  --set-env-vars GOOGLE_CLOUD_REGION=europe-west3
```

Set secrets via `--set-secrets` or Secret Manager for the API keys.

## License

MIT — see [LICENSE](LICENSE).
