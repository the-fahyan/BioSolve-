import { LatLng } from "./schemas";

export const EARTH_RADIUS_METERS = 6371000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * 1. Haversine distance between two coordinates in meters.
 */
export function haversineDistance(p1: LatLng, p2: LatLng): number {
  const phi1 = toRadians(p1.lat);
  const phi2 = toRadians(p2.lat);
  const deltaPhi = toRadians(p2.lat - p1.lat);
  const deltaLambda = toRadians(p2.lng - p1.lng);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return EARTH_RADIUS_METERS * c;
}

/**
 * 2. Forward azimuth bearing in degrees [0, 360).
 */
export function forwardBearing(start: LatLng, end: LatLng): number {
  const phi1 = toRadians(start.lat);
  const phi2 = toRadians(end.lat);
  const deltaLambda = toRadians(end.lng - start.lng);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const thetaRad = Math.atan2(y, x);
  const thetaDeg = toDegrees(thetaRad);
  return (thetaDeg + 360) % 360;
}

/**
 * 3. Great-circle destination point given start point, bearing (degrees), and distance (meters).
 */
export function destinationPoint(start: LatLng, bearingDeg: number, distanceM: number): LatLng {
  const delta = distanceM / EARTH_RADIUS_METERS;
  const theta = toRadians(bearingDeg);
  const phi1 = toRadians(start.lat);
  const lambda1 = toRadians(start.lng);

  const sinPhi2 =
    Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(Math.max(-1, Math.min(1, sinPhi2)));

  const y = Math.sin(theta) * Math.sin(delta) * Math.cos(phi1);
  const x = Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2);
  const lambda2 = lambda1 + Math.atan2(y, x);

  // Normalize longitude to [-180, 180]
  const lngDeg = ((toDegrees(lambda2) + 540) % 360) - 180;
  return {
    lat: toDegrees(phi2),
    lng: lngDeg,
  };
}

/**
 * 4. Planar point-to-segment distance in meters via local equirectangular projection.
 */
export function pointToSegmentDistance(
  p: LatLng,
  a: LatLng,
  b: LatLng
): number {
  const phiMean = toRadians((p.lat + a.lat + b.lat) / 3);
  const cosPhi = Math.cos(phiMean);

  // Project to Cartesian (meters)
  const px = toRadians(p.lng) * EARTH_RADIUS_METERS * cosPhi;
  const py = toRadians(p.lat) * EARTH_RADIUS_METERS;

  const ax = toRadians(a.lng) * EARTH_RADIUS_METERS * cosPhi;
  const ay = toRadians(a.lat) * EARTH_RADIUS_METERS;

  const bx = toRadians(b.lng) * EARTH_RADIUS_METERS * cosPhi;
  const by = toRadians(b.lat) * EARTH_RADIUS_METERS;

  const vx = bx - ax;
  const vy = by - ay;
  const ux = px - ax;
  const uy = py - ay;

  const vLenSq = vx * vx + vy * vy;
  if (vLenSq < 1e-9) {
    // Segment endpoints are identical
    return Math.sqrt(ux * ux + uy * uy);
  }

  const t = Math.max(0, Math.min(1, (ux * vx + uy * vy) / vLenSq));
  const projX = ax + t * vx;
  const projY = ay + t * vy;

  const dx = px - projX;
  const dy = py - projY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 5. Polyline densification: divides segments longer than maxStepM (default 50m).
 * Original vertices are strictly preserved.
 */
export function densifyPolyline(
  points: LatLng[],
  maxStepM: number = 50
): LatLng[] {
  if (points.length <= 1) return [...points];

  const result: LatLng[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]!;
    const next = points[i + 1]!;
    result.push(current);

    const dist = haversineDistance(current, next);
    if (dist > maxStepM) {
      const numDivisions = Math.ceil(dist / maxStepM);
      for (let step = 1; step < numDivisions; step++) {
        const fraction = step / numDivisions;
        result.push({
          lat: current.lat + fraction * (next.lat - current.lat),
          lng: current.lng + fraction * (next.lng - current.lng),
        });
      }
    }
  }

  // Preserve final original vertex
  result.push(points[points.length - 1]!);
  return result;
}

/**
 * Calculate minimum distance from a point to a polyline in meters.
 */
export function pointToPolylineDistance(point: LatLng, polyline: LatLng[]): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return haversineDistance(point, polyline[0]!);

  let minDistance = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentDistance(point, polyline[i]!, polyline[i + 1]!);
    if (d < minDistance) {
      minDistance = d;
      if (minDistance === 0) return 0;
    }
  }
  return minDistance;
}

/**
 * 6. Symmetric polyline deduplication.
 * Returns true if >= 90% of vertices in A are within thresholdM of B,
 * AND >= 90% of vertices in B are within thresholdM of A.
 */
export function arePolylinesNearIdentical(
  lineA: LatLng[],
  lineB: LatLng[],
  thresholdM: number = 20,
  overlapRatio: number = 0.9
): boolean {
  if (lineA.length === 0 || lineB.length === 0) return false;

  const densifiedA = densifyPolyline(lineA, 50);
  const densifiedB = densifyPolyline(lineB, 50);

  // Check A within B
  let closeCountA = 0;
  for (const pt of densifiedA) {
    if (pointToPolylineDistance(pt, densifiedB) <= thresholdM) {
      closeCountA++;
    }
  }
  const matchRatioA = closeCountA / densifiedA.length;
  if (matchRatioA < overlapRatio) return false;

  // Check B within A
  let closeCountB = 0;
  for (const pt of densifiedB) {
    if (pointToPolylineDistance(pt, densifiedA) <= thresholdM) {
      closeCountB++;
    }
  }
  const matchRatioB = closeCountB / densifiedB.length;
  return matchRatioB >= overlapRatio;
}
