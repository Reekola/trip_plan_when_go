# Trip Planner

An AI agent that tells you not just **how** to get from A to B, but **exactly when to leave** — combining traffic, weather, daylight, and elevation across car, motorcycle, bicycle, and walking modes.

Built for the **Google Cloud Rapid Agent Hackathon** (Elastic track).

## What makes it different from Google Maps

Google Maps answers "given a time, how do I get there?" This agent answers: *"given my whole day and preferences, when should I leave?"*

- **Explainable departure recommendations** — every suggestion has a plain-language "why" (e.g. "leave by 2 pm because you're cycling, sunset is 5:30, and a headwind builds after 4 pm")
- **Preference learning** — the agent remembers your travel style (scenic cafés, avoids hills) via Elastic, so trip two is smarter than trip one
- **Mode comparison with a recommendation** — "drive or cycle Saturday?" returns a reasoned answer, not just two times side by side
- **Destination events as timing inputs** — "there's a market Saturday morning, leave earlier"

## Stack

| Layer | Technology |
|---|---|
| Frontend + backend | Next.js 15 (App Router, one deployment) |
| Styling | Tailwind CSS |
| Map | Google Maps JS API (supporting panel) |
| Agent runtime | Google Cloud Agent Builder — Gemini 2.0 Flash |
| Memory + search | Elastic Cloud Serverless (MCP) |
| Weather + daylight | Open-Meteo (free, no key) |
| Traffic | Google Routes API + TomTom Traffic Stats |
| Elevation | Open-Elevation (free) |
| Deploy | Cloud Run + Docker + Secret Manager |

## Setup

```bash
cp .env.local.example .env.local
# Fill in your API keys (see .env.local.example for all required vars)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
├── app/                  # Next.js App Router pages + API routes
│   ├── page.tsx          # Home — origin, destination, mode, date
│   ├── trips/[id]/       # Trip results — reasoning-forward layout
│   ├── history/          # Past trips from Elastic
│   ├── preferences/      # Learned travel style (makes memory tangible)
│   ├── share/[id]/       # Read-only public share page
│   └── api/              # Route handlers
│       ├── plan/         # POST — calls Agent Builder, streams plan
│       ├── weather/      # GET — Open-Meteo proxy
│       ├── traffic/      # GET — Routes API + TomTom proxy
│       └── trips/        # GET|POST — Elastic trip store
├── components/           # UI components
└── lib/
    ├── types.ts          # Shared TypeScript types
    ├── elastic.ts        # Elastic client + index names
    ├── vertex.ts         # Vertex AI / Agent Builder client
    ├── agent/            # Core agent functions (planTrip, rankDepartures, …)
    └── data/             # External data fetchers (weather, traffic, …)
```

## License

MIT — see [LICENSE](LICENSE).
