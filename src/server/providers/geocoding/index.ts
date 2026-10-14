import "server-only";
import { LatLng } from "@/lib/schemas";
import { serverCacheStore } from "@/server/cache/lru-cache-store";
import { NominatimAdapter } from "./nominatim-adapter";
import { PhotonAdapter } from "./photon-adapter";
import {
  GeocodeOptions,
  GeocodeResponseInternal,
  ReverseGeocodeResponseInternal,
  GeocodingProvider,
} from "../types";

export class ResilientGeocodingService implements GeocodingProvider {
  private photon: PhotonAdapter;
  private nominatim: NominatimAdapter;

  constructor() {
    this.photon = new PhotonAdapter();
    this.nominatim = new NominatimAdapter();
  }

  public async search(options: GeocodeOptions): Promise<GeocodeResponseInternal> {
    const normQ = options.query.trim().toLowerCase();
    const lat1 = options.bias ? options.bias.lat.toFixed(1) : "none";
    const lng1 = options.bias ? options.bias.lng.toFixed(1) : "none";
    const limit = options.limit || 5;
    const isExplicit = Boolean(options.explicit);

    const cacheKey = `geo:s:${isExplicit ? "exp" : "typ"}:${normQ}:${lat1}:${lng1}:${limit}`;

    const { data } = await serverCacheStore.fetchOrCompute(
      cacheKey,
      async () => {
        // T-19: Explicit search queries Nominatim first, with Photon fallback
        if (isExplicit) {
          try {
            const nomRes = await this.nominatim.search(options);
            if (nomRes.results.length > 0) {
              return nomRes;
            }
          } catch {
            // Fall back to Photon
          }
          return this.photon.search(options);
        }

        // T-18: Typeahead queries Photon exclusively; do not call Nominatim
        return this.photon.search(options);
      },
      { ttlMs: 1000 * 60 * 60 * 24 } // 24h TTL
    );

    return data;
  }

  public async reverse(coord: LatLng): Promise<ReverseGeocodeResponseInternal> {
    const lat4 = coord.lat.toFixed(4);
    const lng4 = coord.lng.toFixed(4);
    const cacheKey = `geo:r:${lat4}:${lng4}`;

    const { data } = await serverCacheStore.fetchOrCompute(
      cacheKey,
      async () => {
        try {
          const nomRes = await this.nominatim.reverse(coord);
          if (nomRes.place) {
            return nomRes;
          }
        } catch {
          // Fall back to Photon
        }

        try {
          return await this.photon.reverse(coord);
        } catch {
          return {
            provider: "photon" as const,
            place: null,
          };
        }
      },
      { ttlMs: 1000 * 60 * 60 * 24 } // 24h TTL
    );

    return data;
  }
}

export const geocodingService = new ResilientGeocodingService();
