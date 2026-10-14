# BreatheWay — Clean-Air Walking Routes

> Compare pedestrian routes scored by real-time air quality and road traffic proximity. Find your cleanest path.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Features

- 🗺️ **Interactive Leaflet map** with OpenStreetMap tiles
- 💨 **Real-time AQI scoring** via Open-Meteo CAMS European/Global model
- 🏃 **Multiple walking route candidates** scored by exposure index
- 📊 **Route comparison** — Fastest, Cleanest, and Balanced options
- 🔗 **Shareable deep links** — bookmark and share any trip
- 📍 **Place search** via Photon (typeahead) + Nominatim (explicit)
- 🌡️ **Graceful degradation** when upstream providers are unavailable
- ♿ **WCAG 2.2 AA** accessible interface

## Quick Start

### Prerequisites

- Node.js 22 LTS ([nvm](https://github.com/nvm-sh/nvm): `nvm use`)
- npm 10+

### Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PHOTON_BASE_URL` | `https://photon.komoot.io` | Photon geocoder endpoint |
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` | Nominatim geocoder endpoint |
| `NOMINATIM_USER_AGENT` | `BreatheWay/1.0` | Required by Nominatim ToS |
| `OSRM_BASE_URL` | `https://routing.openstreetmap.de` | OSRM foot routing endpoint |
| `OPEN_METEO_AQI_URL` | `https://air-quality-api.open-meteo.com` | Open-Meteo AQI endpoint |
| `OVERPASS_BASE_URL` | `https://overpass-api.de/api/interpreter` | Overpass primary endpoint |
| `OVERPASS_MIRROR_URL` | `https://overpass.private.coffee/api/interpreter` | Overpass mirror failover |
| `USE_MOCK_PROVIDERS` | `false` | Use mock data (dev/testing only, **not** in production) |
| `LOG_LEVEL` | `info` | Server log verbosity (`debug`, `info`, `warn`, `error`) |

> **Note:** `USE_MOCK_PROVIDERS=true` is **forbidden** in `NODE_ENV=production` and will throw at startup.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm run test         # Run unit + integration tests
npm run test:coverage # Run tests with coverage report
npm run verify       # typecheck + lint + test (CI gate)
npm run smoke:live   # Live smoke test (requires running server)
npm run benchmark    # Route performance benchmark
```

## Architecture

```
src/
├── app/              # Next.js App Router pages & API routes
│   ├── api/routes/   # POST /api/routes — domain scoring engine
│   ├── api/geocode/  # GET /api/geocode — place search
│   ├── api/aqi/      # GET /api/aqi — standalone AQI
│   ├── api/health/   # GET /api/health — liveness + deep check
│   └── about/        # Methodology & data sources page
├── components/
│   ├── map/          # MapView (Leaflet, SSR:false)
│   ├── planner/      # SearchForm, LocationInput, RouteCard, ResultsPanel
│   ├── layout/       # Header
│   └── ui/           # AqiBadge, StatusBanner, Chip, Skeleton
├── hooks/            # useGeocodeSearch, useRouteMutation, useUrlSync, useGeolocation
├── lib/              # Isomorphic utilities (geo, aqi, schemas, format, storage, exposure-config)
├── server/
│   ├── cache/        # LRU + single-flight cache store
│   ├── config/       # Environment variable validation
│   ├── domain/       # Pure scoring engine (candidates, exposure, select, route-planner)
│   ├── http/         # API handler envelope, rate limiter
│   └── providers/    # Adapter implementations (Photon, Nominatim, OSRM, Open-Meteo, Overpass)
└── stores/           # Zustand planner store
```

## Exposure Model

BreatheWay uses a two-factor exposure index model:

```
EI(p) = clamp(bg(p) × (1 + 0.8 × tf(p)), 0, 500)
```

- **bg(p)**: background US AQI via 2D IDW from a 3×3 CAMS grid
- **tf(p)**: traffic proximity factor using exponential decay (λ=60m) over road segments within 250m

See the [About page](/about#methodology) for full details.

## Data Sources & Licenses

| Source | License |
|---|---|
| OpenStreetMap | ODbL 1.0 |
| Open-Meteo CAMS AQI | CC BY 4.0 (non-commercial) |
| OSRM (FOSSGIS) | ODbL 1.0 / Fair use |
| Photon (Komoot) | CC BY-SA / Fair use |
| Nominatim | ODbL 1.0 (max 1 req/sec) |

## Docker

```bash
# Build image
docker build -t breatheway .

# Run container
docker run -p 3000:3000 \
  -e NOMINATIM_USER_AGENT="YourApp/1.0 (you@example.com)" \
  breatheway
```

## Limitations

- AQI is based on regional CAMS model grids (~25km resolution), not street-level sensors
- Walking speed is fixed at ~5 km/h (OSRM foot profile)
- Route alternatives depend on OSM pedestrian network completeness
- Not a substitute for professional environmental health advice

## Privacy

No personal data is stored or logged. Coordinates are truncated to 2 decimal places in logs. Client IPs are used only for in-memory rate limiting and never written to disk.

---

Built with ♻️ by the BreatheWay team. Contributing to [UN SDG 3 — Good Health and Well-Being](https://sdgs.un.org/goals/goal3).
