# WhenGo — Leave at the right time

AI-powered trip departure planner that tells you **when to leave**, not just how to get there — combining live traffic, weather, daylight, and public holiday detection across every country your route passes through.

Built for the **Google Cloud Rapid Agent Hackathon** (Elastic track).

**Live:** https://trip-planner-kjr7whn7wa-ez.a.run.app

---

## What makes it different from Google Maps

Google Maps answers "given a time, how do I get there?" WhenGo answers: *"given my whole day, when should I leave?"*

- **Per-hour traffic scoring** — real delay data from the Google Routes API for every candidate departure hour, not estimated averages
- **Holiday detection for transit countries** — detects public holidays not just at origin and destination, but in every country the route passes through, sampled at 19 waypoints
- **Live traffic banner** — shows current delays (or historical expected delays for future dates) on your specific route
- **Explainable recommendations** — Gemini writes a plain-language reason for every suggestion
- **Departure window selector** — filter to Morning / Midday / Afternoon / Evening, with past windows auto-disabled for today

---

## Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 15 (App Router, standalone output) |
| Styling | Tailwind CSS |
| Map | Google Maps JavaScript API + Directions |
| Autocomplete | Google Places API |
| Geocoding | Google Geocoding API |
| Traffic | Google Routes API (`TRAFFIC_AWARE_OPTIMAL`) |
| AI narrative | Vertex AI — Gemini 3 Flash |
| Trip storage | Elastic Cloud Serverless |
| Weather | Open-Meteo (free, no key required) |
| Daylight | Sunrise-Sunset API (free, no key required) |
| Holidays | Nager.Date public holiday API (free) |
| Deploy | Cloud Run + Cloud Build |

---

## How the agent works

```
User submits origin / destination / date / window
    │
    ▼
POST /api/plan
    │
    ├── Geocode origin + destination
    ├── Sample 19 route waypoints → detect transit countries
    ├── Fetch public holidays for all countries on the route
    ├── Fetch hourly weather forecast (Open-Meteo)
    ├── Fetch daylight window (Sunrise-Sunset API)
    ├── Fetch per-hour traffic delays (Google Routes API) — parallel
    │
    ├── rankDepartures() — score every candidate hour
    │       Traffic 50% · Weather 30% · Daylight 20%
    │       Holiday penalty applied to all hours on affected days
    │
    ├── searchPOIs() — find stops along the route (Elastic)
    ├── composePlan() — Gemini narrative + departure reason
    └── saveTrip() — persist to Elastic
```

---

## Departure scoring

`src/lib/agent/rankDepartures.ts` rates every hour in the selected window:

- **Traffic** (50%) — ratio of delay vs free-flow duration; 0 = no delay, 1 = standstill
- **Weather** (30%) — precipitation + wind penalty, temperature comfort bonus
- **Daylight** (20%) — penalty for departing near or after sunset
- **Holiday** — flat penalty applied when a public holiday falls on the travel date in any transit country; shown as a note on affected windows

Windows are sorted best-first. The top window is marked as recommended.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                  # Home — origin, destination, date, window
│   ├── trips/[id]/page.tsx       # Results — departure card, map, scores, stops
│   ├── history/page.tsx          # Past trips from Elastic
│   ├── preferences/page.tsx      # Travel style preferences
│   └── api/
│       ├── plan/                 # POST — orchestration entry point
│       ├── autocomplete/         # GET — Places Autocomplete proxy
│       ├── logo/                 # GET — serves logo.png
│       ├── trips/                # GET|POST — Elastic trip store + ratings
│       └── ...
├── components/
│   ├── LocationInput.tsx         # Debounced autocomplete input
│   ├── Map.tsx                   # Google Maps route renderer
│   ├── ScoreBreakdown.tsx        # Traffic / Daylight / Weather bars
│   └── StopCard.tsx              # POI stop card
└── lib/
    ├── agent/
    │   ├── planTrip.ts           # Main orchestrator
    │   ├── rankDepartures.ts     # Hourly scoring algorithm
    │   ├── composePlan.ts        # Gemini narrative generation
    │   ├── searchPOIs.ts         # Elastic POI search
    │   └── selectStops.ts        # Stop selection logic
    └── data/
        ├── fetchWeather.ts       # Open-Meteo
        ├── fetchTraffic.ts       # Google Routes API
        ├── fetchDaylight.ts      # Sunrise-Sunset API
        ├── fetchHolidays.ts      # Nager.Date API
        └── geocode.ts            # Google Geocoding + reverse geocode
```

---

## Local setup

### Prerequisites

- Node.js 18+
- Google Cloud project with these APIs enabled: Maps JavaScript, Places, Geocoding, Routes
- Elastic Cloud Serverless account (free trial works)

### 1. Install

```bash
git clone https://github.com/YOUR_USERNAME/trip_planner.git
cd trip_planner
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_ROUTES_API_KEY` | Same key — enable Routes API |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Same key (restrict by HTTP referrer in production) |
| `ELASTIC_URL` | Elastic Cloud → your project → endpoint URL |
| `ELASTIC_API_KEY` | Elastic Cloud → API Keys → Create key |
| `GOOGLE_CLOUD_PROJECT_ID` | Your GCP project ID |
| `GOOGLE_CLOUD_REGION` | e.g. `europe-west3` |

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Try **Vienna → Poreč** on a date with a Slovenian public holiday to see transit country holiday detection in action.

---

## Deploy to Cloud Run

```bash
# Build image
gcloud builds submit --config cloudbuild.yaml \
  --substitutions "_MAPS_API_KEY=YOUR_KEY,_APP_URL=https://YOUR_SERVICE_URL"

# Deploy
gcloud run deploy trip-planner \
  --image gcr.io/YOUR_PROJECT/trip-planner \
  --region europe-west4 \
  --platform managed \
  --allow-unauthenticated

# Set runtime env vars
gcloud run services update trip-planner \
  --region europe-west4 \
  --set-env-vars "ELASTIC_URL=...,ELASTIC_API_KEY=...,GOOGLE_MAPS_API_KEY=...,GOOGLE_CLOUD_PROJECT_ID=..."
```

Gemini on Vertex AI uses Application Default Credentials — no separate API key needed on Cloud Run, just ensure the service account has `roles/aiplatform.user`.

---

## License

MIT
