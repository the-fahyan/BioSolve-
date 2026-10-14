import "server-only";
import { serverEnv } from "@/server/config/env";
import { geocodingService } from "./geocoding";
import { osrmFootAdapter } from "./routing/osrm-foot-adapter";
import { openMeteoAqiAdapter } from "./aqi/open-meteo-aqi-adapter";
import { overpassRoadsAdapter } from "./roads/overpass-roads-adapter";
import {
  MockGeocodingProvider,
  MockRoutingProvider,
  MockAqiProvider,
  MockRoadsProvider,
} from "./mock/mock-providers";
import {
  GeocodingProvider,
  RoutingProvider,
  AqiProvider,
  RoadsProvider,
} from "./types";

export interface ProviderBundle {
  isMocked: boolean;
  geocoding: GeocodingProvider;
  routing: RoutingProvider;
  aqi: AqiProvider;
  roads: RoadsProvider;
}

export function getProviders(): ProviderBundle {
  if (serverEnv.USE_MOCK_PROVIDERS) {
    return {
      isMocked: true,
      geocoding: new MockGeocodingProvider(),
      routing: new MockRoutingProvider(),
      aqi: new MockAqiProvider(),
      roads: new MockRoadsProvider(),
    };
  }

  return {
    isMocked: false,
    geocoding: geocodingService,
    routing: osrmFootAdapter,
    aqi: openMeteoAqiAdapter,
    roads: overpassRoadsAdapter,
  };
}
