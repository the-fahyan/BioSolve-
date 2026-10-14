import "server-only";
import { LatLng, GeocodeResultItem, AqiReading } from "@/lib/schemas";

export interface GeocodeOptions {
  query: string;
  limit?: number;
  bias?: LatLng;
  explicit?: boolean;
}

export interface GeocodeResponseInternal {
  provider: "photon" | "nominatim" | "mock";
  results: GeocodeResultItem[];
}

export interface ReverseGeocodeResponseInternal {
  provider: "photon" | "nominatim" | "mock";
  place: {
    lat: number;
    lng: number;
    label: string;
  } | null;
}

export interface GeocodingProvider {
  search(options: GeocodeOptions): Promise<GeocodeResponseInternal>;
  reverse(coord: LatLng): Promise<ReverseGeocodeResponseInternal>;
}

export interface RawRouteCandidate {
  id: string;
  distanceM: number;
  durationS: number;
  coordinates: [number, number][]; // [lng, lat] GeoJSON format
}

export interface RoutingProvider {
  getFootRoutes(
    origin: LatLng,
    destination: LatLng,
    viaPoints?: LatLng[]
  ): Promise<RawRouteCandidate[]>;
}

export interface AqiGridSample {
  coord: LatLng;
  usAqi: number;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  observedAt: string;
}

export interface AqiProvider {
  getPointAqi(coord: LatLng): Promise<AqiReading | null>;
  getGridAqi(coords: LatLng[]): Promise<AqiGridSample[]>;
}

export interface RoadSegment {
  id: string;
  highway: string;
  weight: number;
  start: LatLng;
  end: LatLng;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RoadsProvider {
  getRoadSegmentsInBBox(
    south: number,
    west: number,
    north: number,
    east: number
  ): Promise<RoadSegment[]>;
}
