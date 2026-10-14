import "server-only";
import { LatLng } from "@/lib/schemas";
import { serverEnv } from "@/server/config/env";
import { RawRouteCandidate, RoutingProvider } from "../types";

class OsrmThrottle {
  private activeCount = 0;
  private maxConcurrent = 2;
  private minSpacingMs = 260; // >= 250ms spacing between request starts
  private lastStartTime = 0;
  private queue: Array<() => void> = [];

  public async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      this.queue.push(() => resolve(() => this.release()));
      this.drain();
    });
  }

  private drain(): void {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastStartTime;
    const waitMs = Math.max(0, this.minSpacingMs - elapsed);

    setTimeout(() => {
      if (this.queue.length === 0 || this.activeCount >= this.maxConcurrent) return;
      this.lastStartTime = Date.now();
      this.activeCount++;
      const next = this.queue.shift();
      if (next) next();
    }, waitMs);
  }

  private release(): void {
    this.activeCount--;
    this.drain();
  }
}

const osrmThrottle = new OsrmThrottle();

interface OsrmRouteGeometry {
  coordinates: [number, number][]; // [lng, lat]
  type: "LineString";
}

interface OsrmRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: OsrmRouteGeometry;
}

interface OsrmResponse {
  code: string;
  routes: OsrmRoute[];
}

export class OsrmFootAdapter implements RoutingProvider {
  private baseUrl: string;
  private userAgent: string;

  constructor(
    baseUrl: string = serverEnv.OSRM_BASE_URL,
    userAgent: string = serverEnv.UPSTREAM_USER_AGENT
  ) {
    this.baseUrl = baseUrl;
    this.userAgent = userAgent;
  }

  public async getFootRoutes(
    origin: LatLng,
    destination: LatLng,
    viaPoints?: LatLng[]
  ): Promise<RawRouteCandidate[]> {
    const coordsList: string[] = [
      `${origin.lng.toFixed(6)},${origin.lat.toFixed(6)}`,
    ];

    if (viaPoints && viaPoints.length > 0) {
      for (const vp of viaPoints) {
        coordsList.push(`${vp.lng.toFixed(6)},${vp.lat.toFixed(6)}`);
      }
    }

    coordsList.push(`${destination.lng.toFixed(6)},${destination.lat.toFixed(6)}`);

    const coordsPath = coordsList.join(";");
    const hasVia = Boolean(viaPoints && viaPoints.length > 0);
    // Request alternatives only for direct 2-point routes
    const alternativesQuery = hasVia ? "alternatives=false" : "alternatives=true";
    const url = `${this.baseUrl}/route/v1/driving/${coordsPath}?overview=full&geometries=geojson&${alternativesQuery}&steps=false`;

    const release = await osrmThrottle.acquire();
    try {
      const fetchWithRetry = async (attempt: number = 0): Promise<Response> => {
        try {
          const res = await fetch(url, {
            method: "GET",
            headers: {
              "User-Agent": this.userAgent,
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(8000),
          });
          return res;
        } catch (err) {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 300));
            return fetchWithRetry(1);
          }
          throw err;
        }
      };

      const res = await fetchWithRetry();
      if (!res.ok) {
        throw new Error(`OSRM routing failed with status ${res.status}`);
      }

      const data = (await res.json()) as OsrmResponse;
      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        return [];
      }

      return data.routes.map((r, idx) => ({
        id: `osrm_${hasVia ? "via" : "base"}_${idx}_${Math.round(r.duration)}s`,
        distanceM: Math.round(r.distance),
        durationS: Math.round(r.duration),
        coordinates: r.geometry.coordinates,
      }));
    } finally {
      release();
    }
  }
}

export const osrmFootAdapter = new OsrmFootAdapter();
