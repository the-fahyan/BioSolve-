# BreatheWay — Verified Implementation Progress Ledger

| Project Tracking Metadata | Current Value |
|---|---|
| **System** | BreatheWay — Eco-Route Air Quality Navigation Web App |
| **Active Git Branch** | `main` (will branch to `feat/mvp` in Phase 0) |
| **Last Audit Date** | 2026-10-14 |
| **Overall Implementation Status** | **Phase 0 Pending — Implementation-Ready Baseline Established** |
| **Code Implementation Status** | 0% (Documentation phase complete, ready for scaffolding) |
| **Documentation Audit Status** | **100% Complete & Verified** |
| **Companion Documents** | [PRD.md](file:///g:/work%20space/BioSolve-/PRD.md), [architecture.md](file:///g:/work%20space/BioSolve-/architecture.md), [build-rule.md](file:///g:/work%20space/BioSolve-/build-rule.md), [implementation-plan.md](file:///g:/work%20space/BioSolve-/implementation-plan.md) |

---

## 1. Implementation Phase Progress Ledger

*Note: Per the Antigravity integrity directive, no phase or task is marked complete without verified execution evidence.*

| Phase | Phase Name | Status | Verified Test Count | Phase Gate Checkpoint | Git Commit Hash |
|---|---|---|---|---|---|
| **Phase 0** | Workspace Scaffolding & Tooling Baseline | `NOT STARTED` | 0 | `CP-0: Clean baseline build` | Pending |
| **Phase 1** | Design System & App Shell | `NOT STARTED` | 0 | `CP-1: Shell renders & axe clean` | Pending |
| **Phase 2** | Server Foundation & Shared Libs | `NOT STARTED` | 0 | `CP-2a: 80% lib test coverage` | Pending |
| **Phase 3** | Provider Adapters, Mocks & Health APIs | `NOT STARTED` | 0 | `CP-2b: Providers & health ok` | Pending |
| **Phase 4** | Domain Scoring Engine & Route API | `NOT STARTED` | 0 | `CP-3: POST /api/routes valid` | Pending |
| **Phase 5** | Planner UI & Leaflet Map (Vertical Slice) | `NOT STARTED` | 0 | `CP-4: Golden path works end-to-end`| Pending |
| **Phase 6** | URL State, Degraded Modes & About Page | `NOT STARTED` | 0 | `CP-4b: Deep links & degraded mode` | Pending |
| **Phase 7** | WCAG 2.2 AA A11y, Responsive & Hardening | `NOT STARTED` | 0 | `CP-5: 0 axe errors, 80% coverage` | Pending |
| **Phase 8** | Production CSP, Benchmarks & Deployment | `NOT STARTED` | 0 | `CP-6: Production release gate` | Pending |

---

## 2. Feature Implementation Status Matrix

| Feature ID | Feature Name | Priority | Target Phase | Implementation Status | Verification Evidence |
|---|---|---|---|---|---|
| **F-01** | Place Search & Selection (Combobox, Typeahead, Geolocation, Pick) | P0 | Phase 5 | `NOT IMPLEMENTED` | Pending |
| **F-02** | Route Computation & Exposure Scoring Engine | P0 | Phase 4 | `NOT IMPLEMENTED` | Pending |
| **F-03** | Interactive Leaflet Map Visualization & Layers | P0 | Phase 5 | `NOT IMPLEMENTED` | Pending |
| **F-04** | Route Comparison Panel & Trade-off Cards | P0 | Phase 5 | `NOT IMPLEMENTED` | Pending |
| **F-05** | Detour Limit Presets (Strict, Standard, Flexible) | P0 | Phase 4–5 | `NOT IMPLEMENTED` | Pending |
| **F-06** | Air Quality Context & Status Chips | P0 | Phase 5 | `NOT IMPLEMENTED` | Pending |
| **F-07** | Shareable Deep Links & URL State Sync | P0 | Phase 6 | `NOT IMPLEMENTED` | Pending |
| **F-08** | Graceful Degradation & Status Banners | P0 | Phase 3, 6 | `NOT IMPLEMENTED` | Pending |
| **F-09** | About & Transparent Methodology Page | P0 | Phase 6 | `NOT IMPLEMENTED` | Pending |
| **F-10** | Local Recents & Preferences Persistence | P0 | Phase 2, 5 | `NOT IMPLEMENTED` | Pending |
| **F-11** | System & Provider Health API (`/api/health`) | P0 | Phase 3 | `NOT IMPLEMENTED` | Pending |

---

## 3. Test Suite & Verification Matrix (T-01 to T-36)

| Test ID | Target Component / Scenario | Status | Executed Result |
|---|---|---|---|
| `T-01` | Haversine distance accuracy vs reference coordinates | `PENDING` | Not yet executed |
| `T-02` | Polyline densification preserves vertices & divides edges > 50m | `PENDING` | Not yet executed |
| `T-03` | US AQI category breakpoints (50, 51, 100, 101, 150, 151, etc.) | `PENDING` | Not yet executed |
| `T-04` | Traffic factor decay: monotonic decrease, 0 beyond 250m | `PENDING` | Not yet executed |
| `T-05` | Exposure Index clamp [0, 500] and 2D IDW background interpolation | `PENDING` | Not yet executed |
| `T-06` | Route selection adheres to detour preset bounds | `PENDING` | Not yet executed |
| `T-07` | Route selection collapses to single route if clean reduction < 3% | `PENDING` | Not yet executed |
| `T-08` | Symmetric deduplication drops slower near-identical route | `PENDING` | Not yet executed |
| `T-09` | Spur filter drops routes with > 10% doubled-back edges | `PENDING` | Not yet executed |
| `T-10` | `POST /api/routes` returns 200 with valid JSON response schema | `PENDING` | Not yet executed |
| `T-11` | Open-Meteo failure returns 200 with `aqi_unavailable` degradation | `PENDING` | Not yet executed |
| `T-12` | Overpass failure returns 200 with `roads_unavailable` degradation | `PENDING` | Not yet executed |
| `T-13` | Unroutable coordinates return 422 `NO_ROUTE_FOUND` | `PENDING` | Not yet executed |
| `T-14` | Complete routing outage returns 503 `ROUTING_UNAVAILABLE` | `PENDING` | Not yet executed |
| `T-15` | Coordinates < 50m or > 15km return 422 with specific error code | `PENDING` | Not yet executed |
| `T-16` | Malformed JSON or unknown keys return 400 `VALIDATION_ERROR` | `PENDING` | Not yet executed |
| `T-17` | Exceeding 10 req/min on `/api/routes` returns 429 `RATE_LIMITED` | `PENDING` | Not yet executed |
| `T-18` | Photon failure on typeahead returns 503 without calling Nominatim | `PENDING` | Not yet executed |
| `T-19` | Explicit search (`explicit=1`) calls Nominatim first with Photon fallback | `PENDING` | Not yet executed |
| `T-20` | Second identical route request returns `meta.cache.routing = "hit"` | `PENDING` | Not yet executed |
| `T-21` | Concurrent identical requests coalesce into 1 upstream call | `PENDING` | Not yet executed |
| `T-22` | `USE_MOCK_PROVIDERS=true` when `NODE_ENV=production` throws at boot | `PENDING` | Not yet executed |
| `T-23` | Mock provider returns `meta.mocked = true` and warning banner | `PENDING` | Not yet executed |
| `T-24` | Malformed URL query params decoded safely with non-blocking notice | `PENDING` | Not yet executed |
| `T-25` | Playwright E2E: Golden path J1 trip search, map render, card select | `PENDING` | Not yet executed |
| `T-26` | Playwright E2E: Swap buttons and detour radio change trigger re-run | `PENDING` | Not yet executed |
| `T-27` | Playwright E2E: Degraded mode banners appear on provider failure | `PENDING` | Not yet executed |
| `T-28` | Playwright E2E: Deep link opens pre-populated inputs and auto-runs | `PENDING` | Not yet executed |
| `T-29` | Full keyboard operability (Combobox, cards, Esc in pick mode) | `PENDING` | Not yet executed |
| `T-30` | Automated axe scans report 0 serious/critical violations | `PENDING` | Not yet executed |
| `T-31` | Responsive layouts: bottom sheet at 375px, side panel at 1280px | `PENDING` | Not yet executed |
| `T-32` | Production security headers (CSP, nosniff, frame protection) verified | `PENDING` | Not yet executed |
| `T-33` | Corrupt client `localStorage` handled gracefully without crash | `PENDING` | Not yet executed |
| `T-34` | Geolocation permission denial displays inline non-blocking notice | `PENDING` | Not yet executed |
| `T-35` | Live smoke test asserts walking speed between 3 and 7 km/h | `PENDING` | Not yet executed |
| `T-36` | Automated contrast test for all design-system token combinations | `PENDING` | Not yet executed |

---

## 4. Acceptance Criteria Checklist

- [ ] **AC-01.1** Debounced 350ms typeahead starts at $\ge 3$ characters
- [ ] **AC-01.2** WAI-ARIA 1.2 combobox keyboard navigation (ArrowDown/Up, Enter, Esc)
- [ ] **AC-01.3** Geolocation denial displays helpful message; state preserved
- [ ] **AC-01.4** Swap button swaps origin/destination positions and markers
- [ ] **AC-02.1** $\ge 1$ route returned, exactly one tagged `fastest`, `recommendedRouteId` matches
- [ ] **AC-02.2** Cache hits logged on repeated requests within TTL
- [ ] **AC-02.3** Straight-line distance $> 15\text{ km}$ returns 422 `ROUTE_TOO_LONG`
- [ ] **AC-02.4** AQI failure returns 200 with fastest route only and `aqi_unavailable` degraded tag
- [ ] **AC-02.5** Output exposure array length strictly matches geometry coordinates length
- [ ] **AC-03.1** OpenStreetMap attribution visible at all breakpoints
- [ ] **AC-03.2** Viewport auto-fits bounds containing all returned route vertices
- [ ] **AC-03.3** Route polyline click updates selection and scrolls card into view
- [ ] **AC-03.4** Zero hydration warnings and zero `window is not defined` errors
- [ ] **AC-04.1** Every exposure value displays textual category label (no color-only reliance)
- [ ] **AC-04.2** Radio group keyboard navigation controls route selection
- [ ] **AC-05.1** Strict detour $\le 15\%$, Flexible detour $\le 50\%$
- [ ] **AC-06.1** AQI categories match US EPA breakpoints
- [ ] **AC-07.1** Opening deep-link URL reproduces matching route comparison
- [ ] **AC-08.1** Degraded banners use `role="status"`, errors use `role="alert"`
- [ ] **AC-09.1** About page lists all data sources and licenses
- [ ] **AC-09.2** About page passes axe scans with 0 serious/critical violations

---

## 5. Known Deviations Log

*No deviations from the specifications currently exist.*
Any necessary adjustments during implementation must be recorded here with timestamp, rationale, and affected requirements.
