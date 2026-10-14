import "server-only";
import { LatLng, AqiReading } from "@/lib/schemas";
import { categorizeAqi } from "@/lib/aqi";
import {
  GeocodeOptions,
  GeocodeResponseInternal,
  ReverseGeocodeResponseInternal,
  GeocodingProvider,
  RawRouteCandidate,
  RoutingProvider,
  AqiGridSample,
  AqiProvider,
  RoadSegment,
  RoadsProvider,
} from "../types";

export class MockGeocodingProvider implements GeocodingProvider {
  public async search(options: GeocodeOptions): Promise<GeocodeResponseInternal> {
    const q = options.query.toLowerCase();

    const mockDatabase = [
      {
        id: "mock_1",
        label: "Alexanderplatz, Berlin",
        secondaryLabel: "Mitte, Berlin, Germany",
        lat: 52.521918,
        lng: 13.413215,
        kind: "square",
      },
      {
        id: "mock_2",
        label: "Brandenburger Tor, Berlin",
        secondaryLabel: "Pariser Platz, Berlin, Germany",
        lat: 52.516275,
        lng: 13.377704,
        kind: "monument",
      },
      {
        id: "mock_3",
        label: "Potsdamer Platz, Berlin",
        secondaryLabel: "Tiergarten, Berlin, Germany",
        lat: 52.509649,
        lng: 13.375944,
        kind: "square",
      },
      {
        id: "mock_4",
        label: "Museumsinsel, Berlin",
        secondaryLabel: "Bodestraße, Berlin, Germany",
        lat: 52.516887,
        lng: 13.401912,
        kind: "island",
      },
    ];

    const matched = mockDatabase.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.secondaryLabel && item.secondaryLabel.toLowerCase().includes(q))
    );

    return {
      provider: "mock",
      results: matched.length > 0 ? matched : [mockDatabase[0]!],
    };
  }

  public async reverse(coord: LatLng): Promise<ReverseGeocodeResponseInternal> {
    return {
      provider: "mock",
      place: {
        lat: coord.lat,
        lng: coord.lng,
        label: `Mock Location (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`,
      },
    };
  }
}

export class MockRoutingProvider implements RoutingProvider {
  public async getFootRoutes(
    origin: LatLng,
    destination: LatLng,
    viaPoints?: LatLng[]
  ): Promise<RawRouteCandidate[]> {
    const straightDist =
      Math.hypot(destination.lng - origin.lng, destination.lat - origin.lat) * 111000;
    const walkingSpeedMps = 1.35; // ~4.86 km/h
    const baseDuration = Math.round(straightDist / walkingSpeedMps);

    // Direct route
    const baseCoords: [number, number][] = [
      [origin.lng, origin.lat],
      [(origin.lng + destination.lng) / 2, (origin.lat + destination.lat) / 2],
      [destination.lng, destination.lat],
    ];

    const candidates: RawRouteCandidate[] = [
      {
        id: "mock_fastest",
        distanceM: Math.round(straightDist * 1.1),
        durationS: baseDuration,
        coordinates: baseCoords,
      },
    ];

    // Park detour route (cleaner alternative)
    if (!viaPoints || viaPoints.length === 0) {
      const parkOffset = 0.003;
      const parkCoords: [number, number][] = [
        [origin.lng, origin.lat],
        [(origin.lng + destination.lng) / 2 + parkOffset, (origin.lat + destination.lat) / 2 + parkOffset],
        [destination.lng, destination.lat],
      ];

      candidates.push({
        id: "mock_cleanest",
        distanceM: Math.round(straightDist * 1.25),
        durationS: Math.round(baseDuration * 1.15),
        coordinates: parkCoords,
      });
    }

    return candidates;
  }
}

export class MockAqiProvider implements AqiProvider {
  public async getPointAqi(coord: LatLng): Promise<AqiReading | null> {
    const usAqi = Math.round(35 + (Math.abs(coord.lat * 10) % 20)); // Good
    return {
      usAqi,
      category: categorizeAqi(usAqi),
      pm25: 8.5,
      pm10: 14.2,
      no2: 18.0,
      observedAt: new Date().toISOString(),
      source: "open-meteo-cams",
    };
  }

  public async getGridAqi(coords: LatLng[]): Promise<AqiGridSample[]> {
    return coords.map((c, idx) => ({
      coord: c,
      usAqi: 35 + (idx % 15),
      pm25: 7.0 + (idx % 5),
      pm10: 12.0 + (idx % 6),
      no2: 15.0 + (idx % 10),
      observedAt: new Date().toISOString(),
    }));
  }
}

export class MockRoadsProvider implements RoadsProvider {
  public async getRoadSegmentsInBBox(
    south: number,
    west: number,
    north: number,
    east: number
  ): Promise<RoadSegment[]> {
    const midLat = (south + north) / 2;
    return [
      {
        id: "mock_road_primary",
        highway: "primary",
        weight: 0.85,
        start: { lat: midLat, lng: west },
        end: { lat: midLat, lng: east },
        minX: west,
        minY: midLat,
        maxX: east,
        maxY: midLat,
      },
    ];
  }
}
