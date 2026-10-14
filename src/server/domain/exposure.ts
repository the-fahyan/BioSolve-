import "server-only";
import { LatLng } from "@/lib/schemas";
import { categorizeAqi } from "@/lib/aqi";
import { EXPOSURE_CONFIG } from "@/lib/exposure-config";
import { densifyPolyline } from "@/lib/geo";
import { RoadSpatialIndex } from "./road-index";
import { AqiGridSample } from "../providers/types";
import { AqiCategory } from "@/lib/schemas";

export interface ExposureScores {
  /** Per-vertex exposure index array (clamped [0,500], integers) */
  perVertex: number[];
  /** Length-weighted average exposure index */
  avgExposure: number;
  /** Maximum exposure index along route */
  maxExposure: number;
  /** Percentage of vertices within 250m of a road segment */
  nearTrafficPct: number;
  /** AQI category of average exposure */
  exposureCategory: AqiCategory;
}

/**
 * Compute 2D Inverse Distance Weighting (IDW) background AQI at point p
 * from a grid of AQI samples.
 */
function idwBackground(p: LatLng, samples: AqiGridSample[]): number {
  if (samples.length === 0) return 0;

  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;

  let weightedSum = 0;
  let weightSum = 0;

  for (const sample of samples) {
    // Haversine distance in meters
    const dLat = toRad(sample.coord.lat - p.lat);
    const dLng = toRad(sample.coord.lng - p.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(p.lat)) * Math.cos(toRad(sample.coord.lat)) * Math.sin(dLng / 2) ** 2;
    const distM = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // IDW: w = 1 / max(dist, 1000m)^2
    const w = 1 / Math.max(distM, EXPOSURE_CONFIG.idwMinDistanceMeters) ** 2;
    weightedSum += w * sample.usAqi;
    weightSum += w;
  }

  return weightSum > 0 ? weightedSum / weightSum : 0;
}

/**
 * Get the road weight W(r) based on OSM highway type.
 */
function getRoadWeight(highway: string): number {
  const weights = EXPOSURE_CONFIG.roadWeights;
  const linkMultiplier = EXPOSURE_CONFIG.linkRoadMultiplier;

  if (highway.endsWith("_link")) {
    const baseType = highway.replace("_link", "") as keyof typeof weights;
    const base = weights[baseType] ?? 0;
    return base * linkMultiplier;
  }

  return weights[highway as keyof typeof weights] ?? 0;
}

/**
 * Compute traffic factor tf(p) for a vertex p using the R-tree spatial index.
 * tf(p) = max over nearby roads of: W(r) * exp(-dist/60)
 */
function computeTrafficFactor(p: LatLng, roadIndex: RoadSpatialIndex): number {
  const nearbyRoads = roadIndex.findNearbyRoads(p, EXPOSURE_CONFIG.searchRadiusMeters);

  if (nearbyRoads.length === 0) return 0;

  let maxFactor = 0;
  for (const { segment, distanceM } of nearbyRoads) {
    const weight = getRoadWeight(segment.highway);
    if (weight === 0) continue;
    const factor = weight * Math.exp(-distanceM / EXPOSURE_CONFIG.decayLengthMeters);
    if (factor > maxFactor) maxFactor = factor;
  }

  return maxFactor;
}

/**
 * Compute exposure scores for a route's coordinate array.
 *
 * @param rawCoords GeoJSON [lng, lat] coordinate pairs
 * @param aqiSamples 3×3 grid of CAMS AQI samples for background IDW
 * @param roadIndex Spatial index of road segments for traffic proximity
 * @returns ExposureScores with per-vertex EI, averages, and metadata
 */
export function computeExposureScores(
  rawCoords: [number, number][],
  aqiSamples: AqiGridSample[],
  roadIndex: RoadSpatialIndex
): ExposureScores {
  const { roadsideUplift } = EXPOSURE_CONFIG;

  // Convert [lng, lat] → LatLng and densify to ≤50m steps
  const latLngs = rawCoords.map(([lng, lat]) => ({ lat, lng }));
  const densified = densifyPolyline(latLngs, 50);

  const perVertexFloat: number[] = [];
  let nearTrafficCount = 0;

  for (const p of densified) {
    const bg = idwBackground(p, aqiSamples);
    const tf = computeTrafficFactor(p, roadIndex);

    // EI(p) = clamp(bg * (1 + α * tf), 0, 500)
    const ei = Math.max(0, Math.min(500, bg * (1 + roadsideUplift * tf)));
    perVertexFloat.push(ei);

    if (tf > 0) nearTrafficCount++;
  }

  // Integer-round per-vertex array
  const perVertex = perVertexFloat.map((v) => Math.round(v));

  // Length-weighted average: use uniform weight (vertex count proxy for length)
  const avgExposure =
    perVertexFloat.length > 0
      ? perVertexFloat.reduce((s, v) => s + v, 0) / perVertexFloat.length
      : 0;

  const maxExposure =
    perVertexFloat.length > 0 ? Math.max(...perVertexFloat) : 0;

  const nearTrafficPct =
    densified.length > 0
      ? Math.round((nearTrafficCount / densified.length) * 100)
      : 0;

  return {
    perVertex,
    avgExposure,
    maxExposure,
    nearTrafficPct,
    exposureCategory: categorizeAqi(avgExposure),
  };
}
