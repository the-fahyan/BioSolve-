import "server-only";
import { LatLng, DetourLimit, RoutesResponse, BackgroundAqiSchema } from "@/lib/schemas";
import { EXPOSURE_CONFIG } from "@/lib/exposure-config";
import { haversineDistance } from "@/lib/geo";
import { categorizeAqi } from "@/lib/aqi";
import { serverCacheStore } from "../cache/lru-cache-store";
import { ProviderBundle } from "../providers/registry";
import { AqiGridSample, RoadSegment } from "../providers/types";
import { generateCandidates } from "./candidates";
import { computeExposureScores } from "./exposure";
import { RoadSpatialIndex } from "./road-index";
import { selectRoutes, ScoredCandidate } from "./select";

const CANDIDATE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const AQI_TTL_MS = 30 * 60 * 1000; // 30 minutes
const ROADS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface RoutePlannerInput {
  origin: LatLng;
  destination: LatLng;
  detourLimit: DetourLimit;
  requestId: string;
}

interface CacheStatus {
  routing: "hit" | "miss";
  aqi: "hit" | "miss";
  roads: "hit" | "miss";
}

interface RoutePlannerOutput {
  response: Omit<RoutesResponse, "requestId" | "generatedAt">;
  timings: Record<string, number>;
  degraded: string[];
  cacheStatus: CacheStatus;
}

/**
 * Generate a 3×3 grid of coordinate samples centered around the midpoint
 * of origin and destination at ~0.05° spacing.
 */
function buildAqiGrid(origin: LatLng, destination: LatLng): LatLng[] {
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;
  const step = 0.05;
  const coords: LatLng[] = [];
  for (let dlat = -1; dlat <= 1; dlat++) {
    for (let dlng = -1; dlng <= 1; dlng++) {
      coords.push({
        lat: midLat + dlat * step,
        lng: midLng + dlng * step,
      });
    }
  }
  return coords;
}

/**
 * Compute the bounding box for a set of coordinates.
 */
function getBoundingBox(coords: LatLng[]): {
  south: number;
  west: number;
  north: number;
  east: number;
} {
  let south = Infinity,
    west = Infinity,
    north = -Infinity,
    east = -Infinity;
  for (const c of coords) {
    if (c.lat < south) south = c.lat;
    if (c.lng < west) west = c.lng;
    if (c.lat > north) north = c.lat;
    if (c.lng > east) east = c.lng;
  }
  // Add small padding
  const PAD = 0.005;
  return {
    south: south - PAD,
    west: west - PAD,
    north: north + PAD,
    east: east + PAD,
  };
}

/**
 * Convert bbox to 0.05° tile index strings for cache keys.
 */
function bboxToTileKeys(bbox: ReturnType<typeof getBoundingBox>): string[] {
  const TILE_SIZE = 0.05;
  const keys: string[] = [];
  const latStart = Math.floor(bbox.south / TILE_SIZE);
  const latEnd = Math.ceil(bbox.north / TILE_SIZE);
  const lngStart = Math.floor(bbox.west / TILE_SIZE);
  const lngEnd = Math.ceil(bbox.east / TILE_SIZE);
  for (let latIdx = latStart; latIdx <= latEnd; latIdx++) {
    for (let lngIdx = lngStart; lngIdx <= lngEnd; lngIdx++) {
      keys.push(`roads:t:${latIdx}:${lngIdx}`);
    }
  }
  return keys;
}

/**
 * Main route planner orchestrator.
 */
export async function planRoutes(
  input: RoutePlannerInput,
  providers: ProviderBundle
): Promise<RoutePlannerOutput> {
  const { origin, destination, detourLimit } = input;
  const degraded: string[] = [];
  const cacheStatus: CacheStatus = { routing: "miss", aqi: "miss", roads: "miss" };
  const timings: Record<string, number> = {};

  if (providers.isMocked) {
    degraded.push("mocked");
  }

  // ── 1. Fetch candidates (routing) ──────────────────────────────────────
  const candidateCacheKey = `cand:${origin.lat.toFixed(4)}:${origin.lng.toFixed(4)}:${destination.lat.toFixed(4)}:${destination.lng.toFixed(4)}`;

  const t0Routing = performance.now();
  const { data: rawCandidates, cacheHit: routingCacheHit } =
    await serverCacheStore.fetchOrCompute(
      candidateCacheKey,
      () => generateCandidates(origin, destination, providers.routing),
      { ttlMs: CANDIDATE_TTL_MS }
    );
  timings["routing"] = Math.round(performance.now() - t0Routing);
  if (routingCacheHit) cacheStatus.routing = "hit";

  if (!rawCandidates || rawCandidates.length === 0) {
    throw Object.assign(new Error("No routes found between these coordinates"), {
      code: "NO_ROUTE_FOUND",
    });
  }

  // ── 2. Fetch background AQI grid ────────────────────────────────────────
  const aqiGridCoords = buildAqiGrid(origin, destination);
  const aqiCacheKey = `aqi:${origin.lat.toFixed(2)}:${origin.lng.toFixed(2)}:${destination.lat.toFixed(2)}:${destination.lng.toFixed(2)}`;

  let aqiSamples: AqiGridSample[] = [];
  let aqiAvailable = true;

  const t0Aqi = performance.now();
  try {
    const { data: samples, cacheHit: aqiCacheHit } =
      await serverCacheStore.fetchOrCompute(
        aqiCacheKey,
        () => providers.aqi.getGridAqi(aqiGridCoords),
        { ttlMs: AQI_TTL_MS }
      );
    aqiSamples = samples;
    if (aqiCacheHit) cacheStatus.aqi = "hit";
  } catch {
    aqiAvailable = false;
    degraded.push("aqi_unavailable");
  }
  timings["aqi"] = Math.round(performance.now() - t0Aqi);

  // ── 3. Fetch road segments for proximity scoring ─────────────────────────
  const allCoords: LatLng[] = rawCandidates.flatMap((c) =>
    c.coordinates.map(([lng, lat]) => ({ lat, lng }))
  );
  const bbox = getBoundingBox([origin, destination, ...allCoords]);
  const tileKeys = bboxToTileKeys(bbox);

  let roadSegments: RoadSegment[] = [];
  let roadsAvailable = true;

  const t0Roads = performance.now();
  try {
    // Use a composite tile cache key
    const roadsCacheKey = tileKeys.join("|");
    const { data: segments, cacheHit: roadsCacheHit } =
      await serverCacheStore.fetchOrCompute(
        roadsCacheKey,
        () =>
          providers.roads.getRoadSegmentsInBBox(
            bbox.south,
            bbox.west,
            bbox.north,
            bbox.east
          ),
        { ttlMs: ROADS_TTL_MS }
      );
    roadSegments = segments;
    if (roadsCacheHit) cacheStatus.roads = "hit";
  } catch {
    roadsAvailable = false;
    degraded.push("roads_unavailable");
  }
  timings["roads"] = Math.round(performance.now() - t0Roads);

  // Build spatial index
  const roadIndex = new RoadSpatialIndex(roadsAvailable ? roadSegments : []);

  // ── 4. Score candidates ──────────────────────────────────────────────────
  const t0Score = performance.now();
  const scoredCandidates: ScoredCandidate[] = rawCandidates.map((raw) => {
    const routeLatLngs = raw.coordinates.map(([lng, lat]) => ({
      lat,
      lng,
    }));
    const distanceM = raw.distanceM > 0 ? raw.distanceM : (() => {
      let d = 0;
      for (let i = 0; i < routeLatLngs.length - 1; i++) {
        d += haversineDistance(routeLatLngs[i]!, routeLatLngs[i + 1]!);
      }
      return d;
    })();

    const exposure =
      aqiAvailable
        ? computeExposureScores(raw.coordinates, aqiSamples, roadIndex)
        : null;

    return { raw, exposure, distanceM };
  });
  timings["score"] = Math.round(performance.now() - t0Score);

  // ── 5. Select final routes ───────────────────────────────────────────────
  const { routes, recommendedRouteId } = selectRoutes(
    scoredCandidates,
    detourLimit,
    aqiAvailable
  );

  // ── 6. Build background AQI aggregate ───────────────────────────────────
  let background: RoutesResponse["background"] = null;
  if (aqiAvailable && aqiSamples.length > 0) {
    const midpoint = {
      lat: (origin.lat + destination.lat) / 2,
      lng: (origin.lng + destination.lng) / 2,
    };

    // IDW background at midpoint for summary
    const totalWeight = aqiSamples.reduce((sum, s) => {
      const R = 6371000;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(s.coord.lat - midpoint.lat);
      const dLng = toRad(s.coord.lng - midpoint.lng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(midpoint.lat)) *
          Math.cos(toRad(s.coord.lat)) *
          Math.sin(dLng / 2) ** 2;
      const distM = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return sum + 1 / Math.max(distM, 1000) ** 2;
    }, 0);

    const bgAqi =
      totalWeight > 0
        ? aqiSamples.reduce((sum, s) => {
            const R = 6371000;
            const toRad = (d: number) => (d * Math.PI) / 180;
            const dLat = toRad(s.coord.lat - midpoint.lat);
            const dLng = toRad(s.coord.lng - midpoint.lng);
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(midpoint.lat)) *
                Math.cos(toRad(s.coord.lat)) *
                Math.sin(dLng / 2) ** 2;
            const distM = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const w = 1 / Math.max(distM, 1000) ** 2;
            return sum + (w * s.usAqi) / totalWeight;
          }, 0)
        : aqiSamples.reduce((s, x) => s + x.usAqi, 0) / aqiSamples.length;

    const firstSample = aqiSamples[0];
    background = BackgroundAqiSchema.parse({
      usAqi: Math.round(bgAqi),
      category: categorizeAqi(bgAqi),
      pm25: firstSample?.pm25 ?? null,
      pm10: firstSample?.pm10 ?? null,
      no2: firstSample?.no2 ?? null,
      observedAt: firstSample?.observedAt ?? new Date().toISOString(),
      source: "open-meteo-cams",
      gridSamples: aqiSamples.length,
    });
  }

  // ── 7. Check alternatives availability ──────────────────────────────────
  if (rawCandidates.length <= 1 && !degraded.includes("aqi_unavailable")) {
    degraded.push("alternatives_unavailable");
  }

  return {
    response: {
      origin,
      destination,
      background,
      recommendedRouteId,
      routes,
      meta: {
        modelVersion: EXPOSURE_CONFIG.modelVersion,
        exposureModel: EXPOSURE_CONFIG.exposureModel,
        providers: {
          routing: providers.isMocked ? "mock" : "osrm-foot",
          aqi: providers.isMocked ? "mock" : "open-meteo-cams",
          roads: providers.isMocked ? "mock" : "overpass",
        },
        candidatesEvaluated: rawCandidates.length,
        degraded,
        mocked: providers.isMocked,
        cache: cacheStatus,
        computeMs: Object.values(timings).reduce((s, v) => s + v, 0),
      },
    },
    timings,
    degraded,
    cacheStatus,
  };
}
