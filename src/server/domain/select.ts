import "server-only";
import { DetourLimit, RouteResult, RouteTag } from "@/lib/schemas";
import { EXPOSURE_CONFIG } from "@/lib/exposure-config";
import { ExposureScores } from "./exposure";
import { RawRouteCandidate } from "../providers/types";

export interface ScoredCandidate {
  raw: RawRouteCandidate;
  exposure: ExposureScores | null;
  distanceM: number;
}

export interface RouteSelectionResult {
  routes: RouteResult[];
  recommendedRouteId: string;
}

const DETOUR_MULTIPLIERS: Record<DetourLimit, number> = {
  strict: EXPOSURE_CONFIG.detourLimits.strict,
  standard: EXPOSURE_CONFIG.detourLimits.standard,
  flexible: EXPOSURE_CONFIG.detourLimits.flexible,
};

/**
 * Select the final set of routes (fastest, cleanest, balanced) from scored candidates.
 * Implements rules in architecture spec §5.6.
 */
export function selectRoutes(
  candidates: ScoredCandidate[],
  detourLimit: DetourLimit,
  aqiAvailable: boolean
): RouteSelectionResult {
  if (candidates.length === 0) {
    throw new Error("No candidates to select from");
  }

  // 1. Find fastest route (min durationS)
  const fastest = candidates.reduce((min, c) =>
    c.raw.durationS < min.raw.durationS ? c : min
  );

  const maxAllowedDuration = Math.max(
    fastest.raw.durationS * (1 + DETOUR_MULTIPLIERS[detourLimit]),
    fastest.raw.durationS + EXPOSURE_CONFIG.minDetourBufferSeconds
  );

  // 2. Filter candidates within detour bounds
  const allowed = candidates.filter(
    (c) =>
      c.raw.durationS <= maxAllowedDuration &&
      c.raw.durationS - fastest.raw.durationS <= EXPOSURE_CONFIG.maxDetourSecondsCap
  );

  if (!aqiAvailable) {
    // Degraded: return fastest only with null exposure
    const fastestResult = buildRouteResult(fastest, ["fastest", "cleanest"], fastest, null);
    return {
      routes: [fastestResult],
      recommendedRouteId: fastestResult.id,
    };
  }

  // 3. Find cleanest route (min avgExposure in allowed set)
  const withExposure = allowed.filter((c) => c.exposure !== null);

  // Sort by avgExposure ascending
  const byExposure = [...withExposure].sort(
    (a, b) => (a.exposure?.avgExposure ?? 0) - (b.exposure?.avgExposure ?? 0)
  );

  const cleanest = byExposure[0] ?? fastest;

  // Compute exposure reduction %
  const fastestAvg = fastest.exposure?.avgExposure ?? 0;
  const cleanestAvg = cleanest.exposure?.avgExposure ?? 0;

  let exposureReductionPct: number | null = null;
  if (fastestAvg > 0) {
    exposureReductionPct = Math.round(((fastestAvg - cleanestAvg) / fastestAvg) * 100);
  }

  const isSameRoute = cleanest.raw.id === fastest.raw.id;
  const reductionInsignificant =
    exposureReductionPct === null ||
    exposureReductionPct < EXPOSURE_CONFIG.minExposureReductionPct;

  const routes: RouteResult[] = [];
  let recommendedRouteId: string;

  if (isSameRoute || reductionInsignificant) {
    // Single route tagged as both fastest & cleanest
    const combined = buildRouteResult(
      fastest,
      ["fastest", "cleanest"],
      fastest,
      exposureReductionPct
    );
    routes.push(combined);
    recommendedRouteId = combined.id;
  } else {
    // Separate fastest and cleanest
    const fastestResult = buildRouteResult(fastest, ["fastest"], fastest, 0);
    const cleanestResult = buildRouteResult(cleanest, ["cleanest"], fastest, exposureReductionPct);
    routes.push(fastestResult);
    routes.push(cleanestResult);
    recommendedRouteId = cleanestResult.id;

    // 4. Balanced route
    const remaining = withExposure.filter(
      (c) => c.raw.id !== fastest.raw.id && c.raw.id !== cleanest.raw.id
    );

    if (remaining.length > 0 && fastestAvg > 0 && fastest.raw.durationS > 0) {
      let bestBalanced: ScoredCandidate | null = null;
      let bestCost = Infinity;

      for (const c of remaining) {
        const timeCost = c.raw.durationS / fastest.raw.durationS;
        const exposureCost = (c.exposure?.avgExposure ?? 0) / fastestAvg;
        const cost =
          EXPOSURE_CONFIG.balancedRoute.timeWeight * timeCost +
          EXPOSURE_CONFIG.balancedRoute.exposureWeight * exposureCost;

        const reductionVsFastest =
          fastestAvg > 0
            ? Math.round(((fastestAvg - (c.exposure?.avgExposure ?? 0)) / fastestAvg) * 100)
            : 0;

        if (
          cost < EXPOSURE_CONFIG.balancedRoute.maxCost &&
          reductionVsFastest >= EXPOSURE_CONFIG.balancedRoute.minReductionPct &&
          cost < bestCost
        ) {
          bestCost = cost;
          bestBalanced = c;
        }
      }

      if (bestBalanced) {
        const balancedReduction =
          fastestAvg > 0
            ? Math.round(
                ((fastestAvg - (bestBalanced.exposure?.avgExposure ?? 0)) / fastestAvg) * 100
              )
            : null;
        routes.push(
          buildRouteResult(bestBalanced, ["balanced"], fastest, balancedReduction)
        );
      }
    }
  }

  return { routes, recommendedRouteId };
}

function buildRouteResult(
  candidate: ScoredCandidate,
  tags: RouteTag[],
  fastest: ScoredCandidate,
  exposureReductionPct: number | null
): RouteResult {
  const extraSeconds = Math.round(candidate.raw.durationS - fastest.raw.durationS);
  const extraMeters = Math.round(candidate.distanceM - fastest.distanceM);

  return {
    id: candidate.raw.id,
    tags,
    distanceM: Math.round(candidate.distanceM),
    durationS: Math.round(candidate.raw.durationS),
    avgExposure: candidate.exposure
      ? Math.round(candidate.exposure.avgExposure)
      : null,
    maxExposure: candidate.exposure
      ? Math.round(candidate.exposure.maxExposure)
      : null,
    exposureCategory: candidate.exposure?.exposureCategory ?? null,
    nearTrafficPct: candidate.exposure?.nearTrafficPct ?? null,
    vsFastest: {
      extraSeconds: Math.max(0, extraSeconds),
      extraMeters,
      exposureReductionPct,
    },
    geometry: {
      type: "LineString",
      coordinates: candidate.raw.coordinates,
    },
    exposure: candidate.exposure
      ? candidate.exposure.perVertex
      : null,
  };
}
