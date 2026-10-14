import "server-only";
import { LatLng } from "@/lib/schemas";
import {
  haversineDistance,
  forwardBearing,
  destinationPoint,
  densifyPolyline,
  arePolylinesNearIdentical,
} from "@/lib/geo";
import { RoutingProvider, RawRouteCandidate } from "../providers/types";

const MAX_VIA_CANDIDATES = 4;
const VIA_FRACTIONS = [0.2, 0.4] as const; // fractions of total distance for via-point offset
const VIA_PERPENDICULAR_OFFSETS_DEG = [-90, 90] as const; // perpendicular directions

/**
 * Spur filter: drops routes with > 10% doubled-back edges.
 * Detects doubled-back by checking if consecutive segment pairs
 * have an angular reversal of more than 150 degrees.
 */
function hasExcessiveSpur(coordinates: [number, number][]): boolean {
  if (coordinates.length < 3) return false;

  let doubledBackSegments = 0;
  const total = coordinates.length - 1;

  for (let i = 0; i < coordinates.length - 2; i++) {
    const [lng1, lat1] = coordinates[i]!;
    const [lng2, lat2] = coordinates[i + 1]!;
    const [lng3, lat3] = coordinates[i + 2]!;

    const bearing1 = forwardBearing(
      { lat: lat1, lng: lng1 },
      { lat: lat2, lng: lng2 }
    );
    const bearing2 = forwardBearing(
      { lat: lat2, lng: lng2 },
      { lat: lat3, lng: lng3 }
    );

    const diff = Math.abs(bearing2 - bearing1);
    const angleDiff = diff > 180 ? 360 - diff : diff;

    if (angleDiff > 150) {
      doubledBackSegments++;
    }
  }

  return doubledBackSegments / total > 0.1;
}

/**
 * Generate all route candidates:
 * 1. Base route + OSRM alternatives
 * 2. Perpendicular via-routes at f=[0.2, 0.4] of total distance at ±90° offsets
 * Then apply spur filter and symmetric deduplication.
 */
export async function generateCandidates(
  origin: LatLng,
  destination: LatLng,
  routing: RoutingProvider
): Promise<RawRouteCandidate[]> {
  const totalDistanceM = haversineDistance(origin, destination);
  const baseBearing = forwardBearing(origin, destination);

  // 1. Base routes + OSRM alternatives
  const baseRoutesPromise = routing.getFootRoutes(origin, destination);

  // 2. Via-routes: perpendicular points at fractions of total distance
  const viaPromises: Promise<RawRouteCandidate[]>[] = [];
  let viaCount = 0;

  for (const fraction of VIA_FRACTIONS) {
    for (const offset of VIA_PERPENDICULAR_OFFSETS_DEG) {
      if (viaCount >= MAX_VIA_CANDIDATES) break;

      const midpointOnLine = destinationPoint(
        origin,
        baseBearing,
        totalDistanceM * fraction
      );
      const perpendicularBearing = (baseBearing + offset + 360) % 360;
      const sideOffset = totalDistanceM * 0.15; // 15% of total distance sideways
      const viaPoint = destinationPoint(midpointOnLine, perpendicularBearing, sideOffset);

      viaPromises.push(
        routing.getFootRoutes(origin, destination, [viaPoint]).catch(() => [])
      );
      viaCount++;
    }
  }

  // Execute all concurrently
  const [baseRoutes, ...viaResults] = await Promise.all([
    baseRoutesPromise,
    ...viaPromises,
  ]);

  const allCandidates: RawRouteCandidate[] = [
    ...(baseRoutes ?? []),
    ...viaResults.flat(),
  ];

  // Apply spur filter
  const filtered = allCandidates.filter(
    (c) => !hasExcessiveSpur(c.coordinates)
  );

  // Symmetric deduplication: keep faster route of near-identical pairs
  return deduplicateCandidates(filtered);
}

function toLatLngArray(coords: [number, number][]): LatLng[] {
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

function deduplicateCandidates(candidates: RawRouteCandidate[]): RawRouteCandidate[] {
  const kept: RawRouteCandidate[] = [];

  for (const candidate of candidates) {
    const lineA = densifyPolyline(toLatLngArray(candidate.coordinates), 50);
    let isDuplicate = false;

    for (let i = 0; i < kept.length; i++) {
      const existing = kept[i]!;
      const lineB = densifyPolyline(toLatLngArray(existing.coordinates), 50);

      if (arePolylinesNearIdentical(lineA, lineB)) {
        isDuplicate = true;
        // Keep the faster one
        if (candidate.durationS < existing.durationS) {
          kept[i] = candidate;
        }
        break;
      }
    }

    if (!isDuplicate) {
      kept.push(candidate);
    }
  }

  return kept;
}
