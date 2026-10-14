import "server-only";
import { LatLng, GeocodeResultItem } from "@/lib/schemas";
import { serverEnv } from "@/server/config/env";
import { GeocodeOptions, GeocodeResponseInternal, ReverseGeocodeResponseInternal } from "../types";

class NominatimQueue {
  private lastRunTime = 0;
  private minSpacingMs = 1050; // enforce >= 1000ms between request starts
  private runningPromise: Promise<void> = Promise.resolve();

  public enqueue<T>(task: () => Promise<T>): Promise<T> {
    const nextInChain = this.runningPromise.then(async () => {
      const now = Date.now();
      const elapsed = now - this.lastRunTime;
      if (elapsed < this.minSpacingMs) {
        await new Promise((r) => setTimeout(r, this.minSpacingMs - elapsed));
      }
      this.lastRunTime = Date.now();
      return task();
    });

    this.runningPromise = nextInChain.then(
      () => {},
      () => {}
    );
    return nextInChain;
  }
}

const nominatimQueue = new NominatimQueue();

interface RawNominatimItem {
  place_id: number;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    country?: string;
  };
}

export class NominatimAdapter {
  private baseUrl: string;
  private userAgent: string;

  constructor(
    baseUrl: string = serverEnv.NOMINATIM_BASE_URL,
    userAgent: string = serverEnv.UPSTREAM_USER_AGENT
  ) {
    this.baseUrl = baseUrl;
    this.userAgent = userAgent;
  }

  public async search(options: GeocodeOptions): Promise<GeocodeResponseInternal> {
    return nominatimQueue.enqueue(async () => {
      const params = new URLSearchParams({
        q: options.query,
        format: "jsonv2",
        addressdetails: "1",
        limit: String(options.limit || 5),
      });

      if (options.bias) {
        // Approximate a 0.5-deg viewbox around bias coordinate
        const lat = options.bias.lat;
        const lng = options.bias.lng;
        params.set("viewbox", `${lng - 0.25},${lat + 0.25},${lng + 0.25},${lat - 0.25}`);
        params.set("bounded", "0");
      }

      const res = await fetch(`${this.baseUrl}/search?${params.toString()}`, {
        method: "GET",
        headers: {
          "User-Agent": this.userAgent,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        throw new Error(`Nominatim search failed with status ${res.status}`);
      }

      const data = (await res.json()) as RawNominatimItem[];
      const results: GeocodeResultItem[] = data.map((item) => {
        const parts = item.display_name.split(",").map((p) => p.trim());
        const primary = item.name || parts[0] || "Unknown place";
        const secondary = parts.slice(1, 4).join(", ");

        return {
          id: `nom_${item.place_id}`,
          label: primary,
          secondaryLabel: secondary || undefined,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          kind: item.type || item.class,
        };
      });

      return {
        provider: "nominatim",
        results,
      };
    });
  }

  public async reverse(coord: LatLng): Promise<ReverseGeocodeResponseInternal> {
    return nominatimQueue.enqueue(async () => {
      const params = new URLSearchParams({
        lat: String(coord.lat),
        lon: String(coord.lng),
        format: "jsonv2",
        addressdetails: "1",
        zoom: "18",
      });

      const res = await fetch(`${this.baseUrl}/reverse?${params.toString()}`, {
        method: "GET",
        headers: {
          "User-Agent": this.userAgent,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        throw new Error(`Nominatim reverse geocoding failed with status ${res.status}`);
      }

      const data = (await res.json()) as RawNominatimItem;
      if (!data || !data.display_name) {
        return { provider: "nominatim", place: null };
      }

      const parts = data.display_name.split(",").map((p) => p.trim());
      const label = parts.slice(0, 3).join(", ");

      return {
        provider: "nominatim",
        place: {
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lon),
          label: label || data.display_name,
        },
      };
    });
  }
}
