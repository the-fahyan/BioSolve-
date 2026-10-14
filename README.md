<h1 align="center">
  <br/>
  🌿 BreatheWay
  <br/>
</h1>

<h4 align="center">Clean-Air Walking Routes — Powered by Real-Time Air Quality & OpenStreetMap</h4>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.4-black?logo=next.js&logoColor=white" alt="Next.js 16"/></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5"/></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19"/></a>
  <a href="https://leafletjs.com/"><img src="https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white" alt="Leaflet"/></a>
  <a href="https://sdgs.un.org/goals/goal3"><img src="https://img.shields.io/badge/UN%20SDG-3%20Health%20%26%20Well--Being-4CAF50" alt="UN SDG 3"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License"/></a>
</p>

<p align="center">
  <b>Compare pedestrian routes scored by real-time air quality and road-traffic proximity.</b><br/>
  BreatheWay shows you not just the <em>fastest</em> way to walk — but the <em>cleanest</em>.
</p>

---

## Table of Contents

- [Why BreatheWay?](#why-breatheway)
- [Live Demo](#live-demo)
- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Exposure Model](#exposure-model)
- [Data Sources and Licenses](#data-sources-and-licenses)
- [Docker](#docker)
- [Testing](#testing)
- [Accessibility](#accessibility)
- [Limitations and Disclaimer](#limitations-and-disclaimer)
- [Privacy](#privacy)
- [Contributing to SDG 3](#contributing-to-sdg-3)

---

## Why BreatheWay?

People choose walking routes based on **distance or time** — but **air pollution is invisible**. A parallel street, park path, or side lane a few minutes away can expose you to significantly less traffic-related pollution. Repeated exposure is associated with respiratory and cardiovascular harm, and people with asthma are especially vulnerable.

**BreatheWay** makes that invisible trade-off visible and actionable — in real time, with open data, and zero sign-up.

> Built for the **UN SDG 3 — Good Health and Well-Being** hackathon (Target 3.9: reduce illness from air pollution).

---

## Live Demo

```
http://localhost:3000
```

> Try the built-in **"Tower Bridge to St Paul's"** quick-start button to see a live route comparison instantly.

---

## Features

| Feature | Details |
|---|---|
| Interactive Map | Leaflet + OpenStreetMap tiles; routes color-coded by exposure level |
| Real-Time AQI | Open-Meteo CAMS European/Global forecast (~25 km grid resolution) |
| Route Comparison | Up to 3 routes: **Fastest**, **Cleanest**, **Balanced** |
| Exposure Scoring | Hybrid Exposure Index: background AQI multiplied by road-traffic proximity factor |
| Smart Place Search | Photon typeahead + Nominatim explicit search with bias toward map center |
| Map Pick Mode | Click anywhere on the map to set a start or destination |
| Deep Links | Shareable URLs — bookmark and share any trip comparison |
| Fully Responsive | Mobile bottom sheet + desktop split-panel layout |
| Graceful Degradation | Works (with warnings) when any upstream data source is unavailable |
| WCAG 2.2 AA | Full keyboard nav, screen reader support, WAI-ARIA combobox patterns |
| Zero Accounts | No sign-up, no tracking, no cookies — privacy by design |

---

## How It Works

### One-Paragraph Summary

The Next.js backend (Route Handlers on the Node.js runtime) asks a walking router (OSRM) for several candidate routes, fetches **real current AQI** from Open-Meteo (CAMS data), fetches **real major-road geometry** from OpenStreetMap (Overpass), and scores every route with a documented **Exposure Index**: background AQI multiplied by a traffic-proximity factor that rises near busy roads. The cleanest route within a user-chosen detour limit is recommended. The Leaflet frontend draws each route with segments colored by estimated exposure.

### Request Sequence

```
User → Next.js Client → POST /api/routes
                           ├── OSRM: base route + alternatives (parallel)
                           ├── OSRM: via-waypoint routes (parallel)
                           └── Open-Meteo: 3x3 AQI grid sample (parallel)
                        → Dedupe, spur filter, duration filter
                        → Overpass: major roads in padded bbox
                        → Densify vertices, score EI per point
                        → Select Fastest / Cleanest / Balanced
                        → Return routes + degradation flags
                     ← Fit bounds, color polylines, announce result
```

### Why a Hybrid Model?

Open-Meteo CAMS grid resolution is 11–45 km. Within a city walk, background AQI is nearly constant — **AQI alone cannot distinguish two nearby streets**. BreatheWay adds a road-proximity factor derived from real OSM geometry to produce meaningful street-level relative comparisons. This is a modelled relative estimate, not a measured concentration, and the product states this everywhere it matters.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 — App Router, React Server Components, Route Handlers |
| **UI** | React 19, Tailwind CSS v4, Lucide React |
| **Maps** | Leaflet 1.9 + react-leaflet 5 + OpenStreetMap raster tiles |
| **State** | Zustand 5 (client store) |
| **Data Fetching** | TanStack Query 5 |
| **Validation** | Zod 4 |
| **Spatial Index** | RBush 4 (road-proximity lookups) |
| **Notifications** | Sonner 2 |
| **Routing Provider** | FOSSGIS OSRM — foot profile (keyless public instance) |
| **AQI Provider** | Open-Meteo Air Quality API (CAMS) |
| **Geocoding** | Photon (typeahead) + Nominatim (explicit + reverse) |
| **Road Data** | Overpass API (OSM major roads, with mirror failover) |
| **Cache** | In-memory LRU with single-flight deduplication |
| **Testing** | Vitest 3 + MSW 2 + Playwright + axe-core/playwright |
| **Language** | TypeScript 5 (strict mode) |

---

## Getting Started

### Prerequisites

- **Node.js 22 LTS** — use nvm: `nvm use` (`.nvmrc` is included)
- **npm 10+**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/breatheway.git
cd breatheway

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local if you want a custom OSRM instance, custom map center, etc.

# 4. Start the development server
npm run dev
```

Open **http://localhost:3000** — the app is fully functional with no API keys required.

**Tip:** Hit the **"Try a sample route"** button (Tower Bridge to St Paul's) to see a live route comparison immediately without typing.

---

## Environment Variables

All variables are optional — the app works out of the box with keyless public providers.

| Variable | Default | Description |
|---|---|---|
| `PHOTON_BASE_URL` | `https://photon.komoot.io` | Photon geocoder (typeahead) endpoint |
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` | Nominatim geocoder endpoint |
| `NOMINATIM_USER_AGENT` | `BreatheWay/1.0` | Required by Nominatim ToS — use your contact info |
| `OSRM_BASE_URL` | `https://routing.openstreetmap.de` | OSRM foot routing endpoint |
| `OPEN_METEO_AQI_URL` | `https://air-quality-api.open-meteo.com` | Open-Meteo AQI endpoint |
| `OVERPASS_BASE_URL` | `https://overpass-api.de/api/interpreter` | Overpass primary endpoint |
| `OVERPASS_MIRROR_URL` | `https://overpass.private.coffee/api/interpreter` | Overpass mirror (automatic failover) |
| `USE_MOCK_PROVIDERS` | `false` | Use synthetic mock data — **dev/testing only** |
| `LOG_LEVEL` | `info` | Server log verbosity: `debug`, `info`, `warn`, `error` |
| `NEXT_PUBLIC_DEFAULT_MAP_CENTER` | `51.505,-0.09` | Initial map center as `lat,lng` |
| `NEXT_PUBLIC_DEFAULT_MAP_ZOOM` | `13` | Initial map zoom level |

> **Warning:** `USE_MOCK_PROVIDERS=true` is **blocked** when `NODE_ENV=production` and will throw at startup to prevent shipping fake data.

---

## Available Scripts

```bash
npm run dev            # Start development server (http://localhost:3000)
npm run build          # Production build
npm run start          # Start production server (after build)
npm run typecheck      # TypeScript type-checking (tsc --noEmit)
npm run lint           # ESLint
npm run test           # Run all unit + integration tests (Vitest)
npm run test:watch     # Vitest in watch mode
npm run test:coverage  # Tests with V8 coverage report
npm run test:e2e       # Playwright end-to-end + accessibility tests
npm run verify         # CI gate: typecheck + lint + test
npm run smoke:live     # Live smoke test against a running server
npm run benchmark      # Route latency benchmark (20 origin/destination pairs)
```

---

## Project Structure

```
breatheway/
├── public/
│   └── icon.svg                   # SVG favicon (teal wind glyph)
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── api/
│   │   │   ├── routes/            # POST /api/routes — core scoring engine
│   │   │   ├── geocode/           # GET /api/geocode — place search
│   │   │   │   └── reverse/       # GET /api/geocode/reverse
│   │   │   ├── aqi/               # GET /api/aqi — standalone AQI lookup
│   │   │   └── health/            # GET /api/health — liveness + deep check
│   │   ├── about/                 # /about — methodology & data-sources page
│   │   ├── globals.css            # Tailwind v4 design tokens, AQI color palette
│   │   ├── layout.tsx             # Root layout (Inter font, metadata, Toaster)
│   │   └── page.tsx               # Planner page (responsive split/sheet layout)
│   ├── components/
│   │   ├── map/
│   │   │   └── MapView.tsx        # Leaflet map (SSR:false), markers, route layers
│   │   ├── planner/
│   │   │   ├── SearchForm.tsx     # Origin/destination inputs, detour selector, submit
│   │   │   ├── LocationInput.tsx  # WAI-ARIA combobox with locate/pick/clear
│   │   │   ├── RouteCard.tsx      # Route comparison card (metrics + details)
│   │   │   ├── ResultsPanel.tsx   # Route card list, copy-link, disclaimer
│   │   │   ├── MobileSheet.tsx    # Bottom sheet (collapsed/expanded) for mobile
│   │   │   └── AirQualityChip.tsx # Regional AQI chip with category label
│   │   ├── layout/
│   │   │   └── Header.tsx
│   │   └── ui/
│   │       ├── AqiBadge.tsx       # AQI category pill (color + text)
│   │       ├── StatusBanner.tsx   # Info/warning/error banners
│   │       ├── Chip.tsx
│   │       └── Skeleton.tsx
│   ├── hooks/
│   │   ├── use-geocode-search.ts  # Photon typeahead with debounce + abort
│   │   ├── use-planner-data.ts    # Route mutation + TanStack Query wiring
│   │   ├── use-url-sync.ts        # URL <-> Zustand store sync
│   │   └── use-geolocation.ts     # navigator.geolocation wrapper
│   ├── lib/
│   │   ├── aqi.ts                 # US AQI categorize() — shared client + server
│   │   ├── exposure-config.ts     # EI model parameters (imported by About page)
│   │   ├── geo.ts                 # Haversine, densify, GeoJSON helpers
│   │   ├── format.ts              # Duration, distance, exposure formatters
│   │   ├── schemas.ts             # Zod API schemas (RouteRequest, RouteResponse...)
│   │   └── storage.ts             # localStorage wrapper (try/catch, recents, prefs)
│   ├── server/
│   │   ├── cache/
│   │   │   └── cache-store.ts     # LRU + single-flight cache
│   │   ├── config/
│   │   │   └── env.ts             # Environment variable validation (Zod)
│   │   ├── domain/
│   │   │   ├── route-planner.ts   # Orchestrator: candidates -> score -> select
│   │   │   ├── candidates.ts      # OSRM base route + via-waypoint diversification
│   │   │   ├── exposure.ts        # CAMS IDW + road-proximity EI scoring
│   │   │   ├── road-index.ts      # RBush spatial index for Overpass road segments
│   │   │   └── select.ts          # Route selection: fastest, cleanest, balanced
│   │   ├── http/
│   │   │   ├── envelope.ts        # Standard API envelope + error codes
│   │   │   └── rate-limit.ts      # In-memory sliding-window rate limiter
│   │   └── providers/
│   │       ├── photon.ts
│   │       ├── nominatim.ts
│   │       ├── osrm.ts
│   │       ├── open-meteo.ts
│   │       ├── overpass.ts
│   │       └── mock/              # Mock providers (dev/test only)
│   └── stores/
│       └── planner-store.ts       # Zustand store (origin, destination, routes, UI state)
├── tests/                         # Vitest unit + integration tests
├── scripts/
│   ├── live-smoke.ts              # Live end-to-end smoke test
│   └── benchmark.ts               # Route latency benchmark
├── Dockerfile
├── .env.example
├── next.config.ts
├── vitest.config.ts
└── tsconfig.json
```

---

## API Reference

All API responses use a standard envelope:

```json
{
  "data": { },
  "error": null,
  "meta": {
    "requestId": "req_abc123",
    "durationMs": 1840,
    "degraded": []
  }
}
```

### POST /api/routes

Compute and score walking routes between two points.

**Request body:**

```json
{
  "origin":      { "lat": 51.5055, "lng": -0.0754 },
  "destination": { "lat": 51.5143, "lng": -0.0982 },
  "detourLimit": "standard"
}
```

| Field | Type | Description |
|---|---|---|
| `origin` | `{ lat, lng }` | Start point (WGS84) |
| `destination` | `{ lat, lng }` | End point (WGS84) |
| `detourLimit` | `strict` / `standard` / `flexible` | Max acceptable detour vs fastest route |

**Detour presets:**

| Preset | Time overhead | Hard caps |
|---|---|---|
| `strict` | <= +15% | min +2 min allowance |
| `standard` (default) | <= +30% | min +2 min, max +20 min |
| `flexible` | <= +50% | max +20 min |

**Successful response (HTTP 200):**

```json
{
  "data": {
    "routes": [
      {
        "id": "fastest",
        "tags": ["fastest"],
        "distance": 2100,
        "duration": 1520,
        "exposure": {
          "average": 74,
          "max": 112,
          "category": "moderate",
          "nearTrafficPct": 38,
          "perVertex": [72, 75, 80]
        },
        "vsFastest": null,
        "geometry": { "type": "LineString", "coordinates": [[]] }
      },
      {
        "id": "cleanest",
        "tags": ["cleanest", "recommended"],
        "exposure": {
          "average": 61,
          "vsFastest": { "exposureDelta": -18, "durationDelta": 180 }
        }
      }
    ],
    "recommendedRouteId": "cleanest",
    "background": {
      "usAqi": 68,
      "category": "moderate",
      "observedAt": "2026-10-14T14:30:00Z"
    }
  },
  "meta": {
    "degraded": [],
    "cache": { "routing": "miss", "aqi": "hit" }
  }
}
```

**Error codes:**

| Code | HTTP | Description |
|---|---|---|
| `ROUTE_TOO_LONG` | 422 | Straight-line distance > 15 km |
| `SAME_LOCATION` | 422 | Points are within 50 m of each other |
| `NO_ROUTE_FOUND` | 422 | Router returned no valid path |
| `ROUTING_FAILED` | 502 | All routing providers unavailable |
| `INVALID_REQUEST` | 400 | Schema validation error |
| `RATE_LIMITED` | 429 | Too many requests from this IP |

**Degradation flags (`meta.degraded`):**

| Flag | Cause | Behavior |
|---|---|---|
| `aqi_unavailable` | Open-Meteo timeout/failure | Returns fastest route only, no EI values |
| `roads_unavailable` | Overpass timeout/failure | EI = background AQI only (road factor = 1) |
| `alternatives_unavailable` | Via-route requests all failed | Single route returned |
| `mocked` | `USE_MOCK_PROVIDERS=true` | All data is synthetic; banner shown in UI |

### GET /api/geocode

Typeahead place search via Photon.

```
GET /api/geocode?q=Tower+Bridge&lat=51.5&lng=-0.1&limit=6
```

### GET /api/geocode/reverse

Reverse geocode a coordinate to a place label.

```
GET /api/geocode/reverse?lat=51.5055&lng=-0.0754
```

### GET /api/aqi

Standalone regional AQI lookup for a point (for pre-route context display).

```
GET /api/aqi?lat=51.5055&lng=-0.0754
```

### GET /api/health

Liveness check. Add `?deep=1` to ping all upstream providers with short timeouts.

```json
{ "status": "ok", "version": "1.0.0", "uptime": 3600 }
```

---

## Exposure Model

BreatheWay uses a two-factor **Exposure Index (EI)** designed to produce meaningful route differences using entirely open data:

```
EI(p) = clamp( bg(p) x (1 + alpha x tf(p)), 0, 500 )
```

| Symbol | Value | Description |
|---|---|---|
| `bg(p)` | — | Background US AQI at point `p` via 2D Inverse Distance Weighting (IDW) from a 3x3 CAMS grid sample |
| `tf(p)` | 0–1 | Traffic-proximity factor: exponential decay over major-road segments within 250 m |
| `alpha` | **0.8** | Traffic amplification weight |
| `lambda` | **60 m** | Decay distance constant — factor halves every ~42 m |

**Traffic proximity decay:**

```
tf(p) = max over all road segments r within 250m of:
          exp(-dist(p, r) / lambda) x weight(r)
```

**Road weights by OSM highway class:**

| OSM highway type | Weight |
|---|---|
| `motorway`, `trunk` | 1.0 |
| `primary` | 0.9 |
| `secondary` | 0.7 |
| `tertiary` | 0.5 |
| `residential`, `other` | 0.3 |

**AQI display categories (US AQI breakpoints):**

| Category | Range | Color | Label |
|---|---|---|---|
| Good | 0–50 | Green `#15803D` | Good |
| Moderate | 51–100 | Yellow `#EAB308` | Moderate |
| USG | 101–150 | Orange `#C2410C` | Unhealthy for Sensitive Groups |
| Unhealthy | 151–200 | Red `#B91C1C` | Unhealthy |
| Very Unhealthy | 201–300 | Purple `#7E22CE` | Very Unhealthy |
| Hazardous | 301–500 | Maroon `#7F1D1D` | Hazardous |

> **Important:** The Exposure Index is a **relative, modelled indicator** expressed on the AQI scale for intuition. It is not a measured street-level pollutant concentration and does not constitute medical or environmental health advice. See the `/about#methodology` page for full model parameters and stated limitations.

---

## Data Sources and Licenses

| Source | Data | License |
|---|---|---|
| OpenStreetMap | Road geometry, pedestrian network | ODbL 1.0 |
| Open-Meteo | CAMS AQI forecast (PM2.5, PM10, NO2, US AQI) | CC BY 4.0 (non-commercial) |
| FOSSGIS OSRM | Walking route geometry | ODbL 1.0 / Fair use |
| Photon (Komoot) | Geocoding typeahead | CC BY-SA / Fair use |
| Nominatim | Explicit geocoding + reverse geocoding | ODbL 1.0 (max 1 req/s) |
| Overpass API | OSM feature queries | ODbL 1.0 |

Map attribution "© OpenStreetMap contributors" is displayed at all times per ODbL license requirements.

---

## Docker

```bash
# Build the image
docker build -t breatheway .

# Run with default settings (no API keys required)
docker run -p 3000:3000 breatheway

# Run with a custom Nominatim user-agent (recommended for production)
docker run -p 3000:3000 \
  -e NOMINATIM_USER_AGENT="YourApp/1.0 (you@example.com)" \
  breatheway
```

The `Dockerfile` uses a multi-stage build:
1. **Builder** — installs all dependencies and runs `next build`
2. **Runner** — copies only `.next/standalone` and `public/` for a minimal production image

---

## Testing

```bash
# Run all unit + integration tests
npm run test

# Watch mode (for development)
npm run test:watch

# Coverage report
npm run test:coverage

# End-to-end + accessibility tests (Playwright + axe-core)
npm run test:e2e

# Full CI gate (typecheck + lint + test)
npm run verify
```

**Coverage targets:**

| Module | Target |
|---|---|
| `src/server/domain/` | >= 80% line coverage |
| `src/lib/` | >= 80% line coverage |
| Accessibility | 0 serious/critical axe violations on `/` and `/about` |
| Performance | Lighthouse Accessibility >= 95, LCP <= 2.5 s on Slow 4G emulation |

The test suite uses **MSW** (Mock Service Worker) to intercept and mock all upstream HTTP provider calls. The `USE_MOCK_PROVIDERS=true` flag injects fully synthetic data for offline testing and always shows a visible "Simulated data" banner in the UI.

---

## Accessibility

BreatheWay targets **WCAG 2.2 Level AA** compliance:

- **Contrast:** >= 4.5:1 for text; >= 3:1 for UI components and focus indicators
- **Color independence:** AQI always shows category text alongside color; route tags always have text chips
- **WAI-ARIA:** Full combobox pattern (1.2) for place search; `role="alert"` for errors; `aria-live="polite"` for route results
- **Keyboard navigation:** All controls reachable without a mouse; arrow keys navigate route card selection; Escape cancels map pick mode
- **Focus management:** After results load, focus moves to the "Routes" heading; after error, focus moves to the error banner
- **Touch targets:** >= 44x44 px for all primary interactions
- **Reduced motion:** All animations and Leaflet transitions disabled under `prefers-reduced-motion: reduce`
- **Text resize:** Interface functions correctly with text scaled to 200%
- **Skip links:** "Skip to results" and "Skip to map" — visually hidden until focused

---

## Limitations and Disclaimer

- **AQI resolution:** Based on CAMS model grids (~11–45 km). Not a street-level sensor measurement.
- **Relative, not absolute:** The Exposure Index shows relative differences between routes — not absolute pollutant concentrations.
- **Walking only:** MVP supports the OSRM foot profile only. Cycling, transit, and driving are out of scope.
- **Network completeness:** Route alternatives depend on the OSM pedestrian network completeness in the queried area.
- **Not medical advice:** BreatheWay does not provide personalized health recommendations. Consult a healthcare professional for medical decisions related to air quality.
- **Serverless caching:** In-memory LRU cache is per-server-instance. A Redis layer is recommended for multi-instance production deployments.

---

## Privacy

- **No personal data stored.** Coordinates are truncated to 2 decimal places in server logs.
- **No cookies.** User preferences (detour limit, recent places) are stored only in browser `localStorage`, never sent to any server.
- **No analytics or tracking.** No third-party analytics scripts are loaded.
- **Rate limiting** uses in-memory IP counters — IPs are never written to disk.
- All data leaves the browser only as the API requests documented in this README.

---

## Contributing to SDG 3

BreatheWay was built for the **UN Sustainable Development Goal 3 — Good Health and Well-Being**, specifically Target 3.9:

> "By 2030, substantially reduce the number of deaths and illnesses from hazardous chemicals and air, water and soil pollution and contamination."

By making air-quality trade-offs visible at the moment of route choice, BreatheWay empowers individuals — especially those with respiratory conditions — to reduce their personal pollution exposure as a daily habit.

---

Built with care for [UN SDG 3 — Good Health and Well-Being](https://sdgs.un.org/goals/goal3)

Data © OpenStreetMap contributors (ODbL 1.0), Open-Meteo (CC BY 4.0)
