import "server-only";
import { EXPOSURE_CONFIG } from "@/lib/exposure-config";
import { serverEnv } from "@/server/config/env";
import { serverCacheStore } from "@/server/cache/lru-cache-store";
import { RoadSegment, RoadsProvider } from "../types";

interface OverpassWayNode {
  lat: number;
  lon: number;
}

interface OverpassWay {
  type: "way";
  id: number;
  tags?: {
    highway?: string;
  };
  geometry?: OverpassWayNode[];
}

interface OverpassResponse {
  elements?: OverpassWay[];
}

function getHighwayWeight(highwayType?: string): number {
  if (!highwayType) return 0;

  const isLink = highwayType.endsWith("_link");
  const baseType = isLink ? highwayType.replace("_link", "") : highwayType;
  const weights = EXPOSURE_CONFIG.roadWeights as Record<string, number>;
  const baseWeight = weights[baseType] ?? 0;

  return isLink ? baseWeight * EXPOSURE_CONFIG.linkRoadMultiplier : baseWeight;
}

export class OverpassRoadsAdapter implements RoadsProvider {
  private primaryUrl: string;
  private mirrorUrl: string;
  private userAgent: string;
  private softTimeoutMs: number;

  constructor(
    primaryUrl: string = serverEnv.OVERPASS_PRIMARY_URL,
    mirrorUrl: string = serverEnv.OVERPASS_MIRROR_URL,
    userAgent: string = serverEnv.UPSTREAM_USER_AGENT,
    softTimeoutMs: number = serverEnv.OVERPASS_SOFT_TIMEOUT_MS
  ) {
    this.primaryUrl = primaryUrl;
    this.mirrorUrl = mirrorUrl;
    this.userAgent = userAgent;
    this.softTimeoutMs = softTimeoutMs;
  }

  public async getRoadSegmentsInBBox(
    south: number,
    west: number,
    north: number,
    east: number
  ): Promise<RoadSegment[]> {
    // 0.05 degree aligned tile indices
    const tileStep = 0.05;
    const minLatIdx = Math.floor(south / tileStep);
    const maxLatIdx = Math.floor(north / tileStep);
    const minLngIdx = Math.floor(west / tileStep);
    const maxLngIdx = Math.floor(east / tileStep);

    const allSegments: RoadSegment[] = [];
    const seenSegmentIds = new Set<string>();

    for (let latIdx = minLatIdx; latIdx <= maxLatIdx; latIdx++) {
      for (let lngIdx = minLngIdx; lngIdx <= maxLngIdx; lngIdx++) {
        const cacheKey = `roads:t:${latIdx}:${lngIdx}`;
        const tSouth = latIdx * tileStep;
        const tWest = lngIdx * tileStep;
        const tNorth = (latIdx + 1) * tileStep;
        const tEast = (lngIdx + 1) * tileStep;

        const { data } = await serverCacheStore.fetchOrCompute<RoadSegment[]>(
          cacheKey,
          () => this.fetchTile(tSouth, tWest, tNorth, tEast),
          { ttlMs: 1000 * 60 * 60 * 24 * 7 } // 7-day TTL
        );

        for (const seg of data) {
          if (!seenSegmentIds.has(seg.id)) {
            seenSegmentIds.add(seg.id);
            allSegments.push(seg);
          }
        }
      }
    }

    return allSegments;
  }

  private async fetchTile(
    south: number,
    west: number,
    north: number,
    east: number
  ): Promise<RoadSegment[]> {
    const query = `[out:json][timeout:25];way["highway"~"^(motorway|trunk|primary|secondary|tertiary)(_link)?$"]["tunnel"!="yes"](${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)});out geom;`;

    // Try primary endpoint with soft timeout; on failure try mirror
    let response: Response;
    const startTime = Date.now();

    try {
      response = await this.executeOverpassQuery(this.primaryUrl, query, this.softTimeoutMs);
    } catch {
      const remainingMs = Math.max(1000, this.softTimeoutMs - (Date.now() - startTime));
      response = await this.executeOverpassQuery(this.mirrorUrl, query, remainingMs);
    }

    if (!response.ok) {
      throw new Error(`Overpass returned status ${response.status}`);
    }

    const data = (await response.json()) as OverpassResponse;
    const segments: RoadSegment[] = [];

    if (!data.elements) return segments;

    for (const way of data.elements) {
      if (way.type !== "way" || !way.geometry || way.geometry.length < 2) continue;

      const highway = way.tags?.highway || "secondary";
      const weight = getHighwayWeight(highway);
      if (weight <= 0) continue;

      for (let i = 0; i < way.geometry.length - 1; i++) {
        const p1 = way.geometry[i]!;
        const p2 = way.geometry[i + 1]!;

        const segId = `w_${way.id}_${i}`;
        const start = { lat: p1.lat, lng: p1.lon };
        const end = { lat: p2.lat, lng: p2.lon };

        segments.push({
          id: segId,
          highway,
          weight,
          start,
          end,
          minX: Math.min(start.lng, end.lng),
          minY: Math.min(start.lat, end.lat),
          maxX: Math.max(start.lng, end.lng),
          maxY: Math.max(start.lat, end.lat),
        });
      }
    }

    return segments;
  }

  private async executeOverpassQuery(
    url: string,
    query: string,
    timeoutMs: number
  ): Promise<Response> {
    const body = new URLSearchParams({ data: query });

    return fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": this.userAgent,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(timeoutMs),
    });
  }
}

export const overpassRoadsAdapter = new OverpassRoadsAdapter();
