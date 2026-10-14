import "server-only";
import { LatLng, GeocodeResultItem } from "@/lib/schemas";
import { serverEnv } from "@/server/config/env";
import { GeocodeOptions, GeocodeResponseInternal, ReverseGeocodeResponseInternal } from "../types";

interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    osm_id?: number;
    osm_type?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

export class PhotonAdapter {
  private baseUrl: string;
  private userAgent: string;

  constructor(
    baseUrl: string = serverEnv.PHOTON_BASE_URL,
    userAgent: string = serverEnv.UPSTREAM_USER_AGENT
  ) {
    this.baseUrl = baseUrl;
    this.userAgent = userAgent;
  }

  public async search(options: GeocodeOptions): Promise<GeocodeResponseInternal> {
    const params = new URLSearchParams({
      q: options.query,
      limit: String(options.limit || 5),
    });

    if (options.bias) {
      params.set("lat", String(options.bias.lat));
      params.set("lon", String(options.bias.lng));
    }

    const res = await fetch(`${this.baseUrl}/api/?${params.toString()}`, {
      method: "GET",
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      throw new Error(`Photon search failed with status ${res.status}`);
    }

    const data = (await res.json()) as PhotonResponse;
    const results: GeocodeResultItem[] = (data.features || []).map((feat, idx) => {
      const [lng, lat] = feat.geometry.coordinates;
      const p = feat.properties;
      const primary = p.name || p.street || "Unnamed Location";

      const secondaryParts: string[] = [];
      if (p.street && p.street !== primary) {
        secondaryParts.push(p.housenumber ? `${p.street} ${p.housenumber}` : p.street);
      }
      if (p.city) secondaryParts.push(p.city);
      if (p.country) secondaryParts.push(p.country);

      return {
        id: `pho_${p.osm_id || idx}_${lat.toFixed(5)}_${lng.toFixed(5)}`,
        label: primary,
        secondaryLabel: secondaryParts.length > 0 ? secondaryParts.join(", ") : undefined,
        lat: lat!,
        lng: lng!,
        kind: p.type || p.osm_value,
      };
    });

    return {
      provider: "photon",
      results,
    };
  }

  public async reverse(coord: LatLng): Promise<ReverseGeocodeResponseInternal> {
    const params = new URLSearchParams({
      lat: String(coord.lat),
      lon: String(coord.lng),
    });

    const res = await fetch(`${this.baseUrl}/reverse?${params.toString()}`, {
      method: "GET",
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      throw new Error(`Photon reverse geocoding failed with status ${res.status}`);
    }

    const data = (await res.json()) as PhotonResponse;
    const first = data.features?.[0];
    if (!first) {
      return { provider: "photon", place: null };
    }

    const p = first.properties;
    const primary = p.name || p.street || "Selected Location";
    const parts = [primary];
    if (p.city) parts.push(p.city);

    return {
      provider: "photon",
      place: {
        lat: first.geometry.coordinates[1]!,
        lng: first.geometry.coordinates[0]!,
        label: parts.join(", "),
      },
    };
  }
}
