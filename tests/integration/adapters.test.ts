import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResilientGeocodingService } from "@/server/providers/geocoding";
import {
  MockGeocodingProvider,
  MockRoutingProvider,
  MockAqiProvider,
  MockRoadsProvider,
} from "@/server/providers/mock/mock-providers";
import { OsrmFootAdapter } from "@/server/providers/routing/osrm-foot-adapter";
import { OpenMeteoAqiAdapter } from "@/server/providers/aqi/open-meteo-aqi-adapter";

describe("Provider Adapters & Resilient Orchestration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Mock Providers Suite", () => {
    it("returns deterministic geocode results", async () => {
      const geo = new MockGeocodingProvider();
      const res = await geo.search({ query: "Alexanderplatz" });
      expect(res.provider).toBe("mock");
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.results[0]!.lat).toBeCloseTo(52.52, 1);
    });

    it("returns valid foot routes with GeoJSON coordinates", async () => {
      const router = new MockRoutingProvider();
      const routes = await router.getFootRoutes(
        { lat: 52.52, lng: 13.4 },
        { lat: 52.53, lng: 13.41 }
      );
      expect(routes.length).toBeGreaterThanOrEqual(1);
      expect(routes[0]!.coordinates.length).toBeGreaterThan(1);
      expect(routes[0]!.durationS).toBeGreaterThan(0);
    });

    it("returns valid AQI readings", async () => {
      const aqi = new MockAqiProvider();
      const reading = await aqi.getPointAqi({ lat: 52.52, lng: 13.4 });
      expect(reading).not.toBeNull();
      expect(reading!.usAqi).toBeGreaterThanOrEqual(0);
      expect(reading!.category).toBe("good");
    });

    it("returns valid road segments", async () => {
      const roads = new MockRoadsProvider();
      const segments = await roads.getRoadSegmentsInBBox(52.5, 13.3, 52.6, 13.5);
      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0]!.weight).toBe(0.85);
    });
  });

  describe("Geocoding Service & Upstream Policy Enforcement", () => {
    it("queries Photon exclusively on typeahead without calling Nominatim (T-18)", async () => {
      const service = new ResilientGeocodingService();
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("photon")) {
          // Simulate Photon failure
          return new Response("Internal Server Error", { status: 500 });
        }
        if (urlStr.includes("nominatim")) {
          throw new Error("Nominatim should NOT be called on typeahead!");
        }
        return new Response("{}", { status: 200 });
      });

      await expect(
        service.search({ query: "brandenburg", explicit: false })
      ).rejects.toThrow();

      // Assert Nominatim was never contacted
      for (const call of fetchSpy.mock.calls) {
        expect(String(call[0])).not.toContain("nominatim");
      }
    });

    it("calls Nominatim first on explicit search with Photon fallback (T-19)", async () => {
      const service = new ResilientGeocodingService();
      let nominatimCalled = false;
      let photonCalled = false;

      vi.spyOn(global, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("nominatim")) {
          nominatimCalled = true;
          // Simulate Nominatim 503 / failure
          return new Response("Service Unavailable", { status: 503 });
        }
        if (urlStr.includes("photon")) {
          photonCalled = true;
          return new Response(
            JSON.stringify({
              features: [
                {
                  geometry: { coordinates: [13.405, 52.52] },
                  properties: { name: "Berlin" },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("{}", { status: 200 });
      });

      const res = await service.search({ query: "berlin", explicit: true });

      expect(nominatimCalled).toBe(true);
      expect(photonCalled).toBe(true);
      expect(res.provider).toBe("photon");
      expect(res.results.length).toBe(1);
      expect(res.results[0]!.label).toBe("Berlin");
    });
  });

  describe("OSRM Foot Adapter", () => {
    it("parses OSRM GeoJSON response and applies foot routing prefix", async () => {
      const adapter = new OsrmFootAdapter();
      vi.spyOn(global, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        expect(urlStr).toContain("/routed-foot/route/v1/driving/");
        return new Response(
          JSON.stringify({
            code: "Ok",
            routes: [
              {
                distance: 1250,
                duration: 900,
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [13.404, 52.52],
                    [13.41, 52.525],
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const routes = await adapter.getFootRoutes(
        { lat: 52.52, lng: 13.404 },
        { lat: 52.525, lng: 13.41 }
      );

      expect(routes.length).toBe(1);
      expect(routes[0]!.distanceM).toBe(1250);
      expect(routes[0]!.durationS).toBe(900);
      expect(routes[0]!.coordinates).toEqual([
        [13.404, 52.52],
        [13.41, 52.525],
      ]);
    });
  });

  describe("Open-Meteo AQI Adapter", () => {
    it("parses single-point current AQI response accurately", async () => {
      const adapter = new OpenMeteoAqiAdapter();
      vi.spyOn(global, "fetch").mockImplementation(async () => {
        return new Response(
          JSON.stringify({
            latitude: 52.52,
            longitude: 13.405,
            current: {
              time: "2026-10-14T06:00:00Z",
              us_aqi: 65,
              pm2_5: 18.2,
              pm10: 25.4,
              nitrogen_dioxide: 32.1,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const aqi = await adapter.getPointAqi({ lat: 52.52, lng: 13.405 });
      expect(aqi).not.toBeNull();
      expect(aqi!.usAqi).toBe(65);
      expect(aqi!.category).toBe("moderate");
      expect(aqi!.pm25).toBe(18.2);
    });
  });
});
