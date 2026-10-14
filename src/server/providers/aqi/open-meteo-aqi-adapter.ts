import "server-only";
import { LatLng, AqiReading } from "@/lib/schemas";
import { categorizeAqi } from "@/lib/aqi";
import { serverEnv } from "@/server/config/env";
import { serverCacheStore } from "@/server/cache/lru-cache-store";
import { AqiGridSample, AqiProvider } from "../types";

interface OpenMeteoCurrentData {
  time: string;
  us_aqi?: number | null;
  pm2_5?: number | null;
  pm10?: number | null;
  nitrogen_dioxide?: number | null;
}

interface OpenMeteoSingleResponse {
  latitude: number;
  longitude: number;
  current?: OpenMeteoCurrentData;
}

export class OpenMeteoAqiAdapter implements AqiProvider {
  private baseUrl: string;
  private userAgent: string;

  constructor(
    baseUrl: string = serverEnv.OPEN_METEO_BASE_URL,
    userAgent: string = serverEnv.UPSTREAM_USER_AGENT
  ) {
    this.baseUrl = baseUrl;
    this.userAgent = userAgent;
  }

  public async getPointAqi(coord: LatLng): Promise<AqiReading | null> {
    const lat2 = coord.lat.toFixed(2);
    const lng2 = coord.lng.toFixed(2);
    const cacheKey = `aqi:${lat2}:${lng2}`;

    const { data } = await serverCacheStore.fetchOrCompute<{ reading: AqiReading | null }>(
      cacheKey,
      async () => {
        const params = new URLSearchParams({
          latitude: coord.lat.toFixed(4),
          longitude: coord.lng.toFixed(4),
          current: "us_aqi,pm2_5,pm10,nitrogen_dioxide",
          domains: "cams_europe",
        });

        const res = await fetch(`${this.baseUrl}/v1/air-quality?${params.toString()}`, {
          method: "GET",
          headers: {
            "User-Agent": this.userAgent,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) {
          throw new Error(`Open-Meteo AQI request failed with status ${res.status}`);
        }

        const json = (await res.json()) as OpenMeteoSingleResponse;
        const cur = json.current;
        if (!cur || cur.us_aqi === undefined || cur.us_aqi === null) {
          return { reading: null };
        }

        const usAqi = Math.round(cur.us_aqi);
        const reading: AqiReading = {
          usAqi,
          category: categorizeAqi(usAqi),
          pm25: cur.pm2_5 ?? null,
          pm10: cur.pm10 ?? null,
          no2: cur.nitrogen_dioxide ?? null,
          observedAt: cur.time ? new Date(cur.time).toISOString() : new Date().toISOString(),
          source: "open-meteo-cams",
        };

        return { reading };
      },
      { ttlMs: 1000 * 60 * 30 } // 30m TTL
    );

    return data.reading;
  }

  public async getGridAqi(coords: LatLng[]): Promise<AqiGridSample[]> {
    if (coords.length === 0) return [];

    // Check cached samples first
    const uncachedCoords: LatLng[] = [];
    const results: AqiGridSample[] = [];

    for (const c of coords) {
      const lat2 = c.lat.toFixed(2);
      const lng2 = c.lng.toFixed(2);
      const cached = serverCacheStore.get<AqiGridSample>(`aqi:${lat2}:${lng2}`);
      if (cached) {
        results.push(cached);
      } else {
        uncachedCoords.push(c);
      }
    }

    if (uncachedCoords.length === 0) {
      return results;
    }

    // Query uncached coordinates in multi-location batch
    const lats = uncachedCoords.map((c) => c.lat.toFixed(4)).join(",");
    const lngs = uncachedCoords.map((c) => c.lng.toFixed(4)).join(",");

    const params = new URLSearchParams({
      latitude: lats,
      longitude: lngs,
      current: "us_aqi,pm2_5,pm10,nitrogen_dioxide",
      domains: "cams_europe",
    });

    const res = await fetch(`${this.baseUrl}/v1/air-quality?${params.toString()}`, {
      method: "GET",
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo grid AQI failed with status ${res.status}`);
    }

    const rawData = (await res.json()) as
      | OpenMeteoSingleResponse
      | OpenMeteoSingleResponse[];

    const items: OpenMeteoSingleResponse[] = Array.isArray(rawData)
      ? rawData
      : [rawData];

    items.forEach((item, idx) => {
      const cur = item.current;
      const refCoord = uncachedCoords[idx];
      if (refCoord && cur && cur.us_aqi !== undefined && cur.us_aqi !== null) {
        const usAqi = Math.round(cur.us_aqi);
        const sample: AqiGridSample = {
          coord: refCoord,
          usAqi,
          pm25: cur.pm2_5 ?? null,
          pm10: cur.pm10 ?? null,
          no2: cur.nitrogen_dioxide ?? null,
          observedAt: cur.time ? new Date(cur.time).toISOString() : new Date().toISOString(),
        };

        const lat2 = refCoord.lat.toFixed(2);
        const lng2 = refCoord.lng.toFixed(2);
        serverCacheStore.set(`aqi:${lat2}:${lng2}`, sample, 1000 * 60 * 30);
        results.push(sample);
      }
    });

    return results;
  }
}

export const openMeteoAqiAdapter = new OpenMeteoAqiAdapter();
