import { describe, it, expect, vi } from "vitest";
import { generateCandidates } from "@/server/domain/candidates";
import { computeExposureScores } from "@/server/domain/exposure";
import { selectRoutes, ScoredCandidate } from "@/server/domain/select";
import { RoadSpatialIndex } from "@/server/domain/road-index";
import { RawRouteCandidate } from "@/server/providers/types";

// ── T-04: Traffic factor decay — monotonic decrease, 0 beyond 250m ─────────
describe("T-04: Traffic factor decay", () => {
  it("traffic exposure should generally decrease as distance from roads increases", () => {
    const roadIndex = new RoadSpatialIndex([
      {
        id: "road-1",
        highway: "primary",
        weight: 0.85,
        start: { lat: 51.5, lng: -0.1 },
        end: { lat: 51.501, lng: -0.1 },
        minX: -0.1,
        minY: 51.5,
        maxX: -0.1,
        maxY: 51.501,
      },
    ]);

    const mockAqiSamples = [
      {
        coord: { lat: 51.5, lng: -0.1 },
        usAqi: 60,
        pm25: 15,
        pm10: 20,
        no2: 10,
        observedAt: new Date().toISOString(),
      },
    ];

    // Close point — near the road
    const closeScores = computeExposureScores(
      [[-0.1, 51.5001]], // ~11m from road
      mockAqiSamples,
      roadIndex
    );

    // Far point — well beyond 250m search radius
    const farScores = computeExposureScores(
      [[-0.1, 51.508]], // ~780m from road — clearly beyond 250m search radius
      mockAqiSamples,
      roadIndex
    );

    // Close to road should have higher exposure
    expect(closeScores.avgExposure).toBeGreaterThan(farScores.avgExposure);
    // Far point (>250m) should have no road proximity traffic factor
    expect(farScores.nearTrafficPct).toBe(0);
  });
});

// ── T-05: Exposure Index clamp [0, 500] ───────────────────────────────────
describe("T-05: Exposure Index clamping", () => {
  it("EI values must be clamped to [0, 500]", () => {
    const roadIndex = new RoadSpatialIndex([
      {
        id: "motorway-1",
        highway: "motorway",
        weight: 1.0,
        start: { lat: 51.5, lng: -0.1 },
        end: { lat: 51.5001, lng: -0.1 },
        minX: -0.1,
        minY: 51.5,
        maxX: -0.1,
        maxY: 51.5001,
      },
    ]);

    // Extreme AQI (400) near motorway — should not exceed 500
    const extremeSamples = [
      {
        coord: { lat: 51.5, lng: -0.1 },
        usAqi: 400,
        pm25: 200,
        pm10: 300,
        no2: 150,
        observedAt: new Date().toISOString(),
      },
    ];

    const scores = computeExposureScores(
      [[-0.1, 51.5001]], // directly on road
      extremeSamples,
      roadIndex
    );

    for (const v of scores.perVertex) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(500);
    }
    expect(scores.maxExposure).toBeLessThanOrEqual(500);
  });

  it("EI values are never negative even with zero AQI", () => {
    const emptyIndex = new RoadSpatialIndex([]);
    const scores = computeExposureScores(
      [[-0.1, 51.5]],
      [{ coord: { lat: 51.5, lng: -0.1 }, usAqi: 0, pm25: 0, pm10: 0, no2: 0, observedAt: new Date().toISOString() }],
      emptyIndex
    );
    for (const v of scores.perVertex) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── T-06: Route selection adheres to detour preset bounds ─────────────────
describe("T-06: Route selection detour bounds", () => {
  function makeScoredCandidate(id: string, durationS: number, avgExposure: number): ScoredCandidate {
    return {
      raw: {
        id,
        distanceM: durationS * 1.4, // approx
        durationS,
        coordinates: [[-0.1, 51.5], [-0.09, 51.501]] as [number, number][],
      },
      exposure: {
        perVertex: [Math.round(avgExposure)],
        avgExposure,
        maxExposure: avgExposure,
        nearTrafficPct: 10,
        exposureCategory: "moderate",
      },
      distanceM: durationS * 1.4,
    };
  }

  it("strict detour (15%) excludes candidates > 15% slower", () => {
    const fastest = makeScoredCandidate("fast", 600, 80);
    const withinStrict = makeScoredCandidate("ok", 680, 50); // +13%
    const overStrict = makeScoredCandidate("slow", 800, 40); // +33%

    const result = selectRoutes(
      [fastest, withinStrict, overStrict],
      "strict",
      true
    );

    const ids = result.routes.map((r) => r.id);
    expect(ids).not.toContain("slow");
  });

  it("flexible detour (50%) includes candidates up to 50% slower", () => {
    const fastest = makeScoredCandidate("fast", 600, 80);
    const longClean = makeScoredCandidate("long", 870, 20); // +45%

    const result = selectRoutes(
      [fastest, longClean],
      "flexible",
      true
    );

    const ids = result.routes.map((r) => r.id);
    expect(ids).toContain("long");
  });
});

// ── T-07: Collapse to single route when reduction < 3% ────────────────────
describe("T-07: Minimum 3% reduction rule", () => {
  it("returns single combined route when exposure reduction is < 3%", () => {
    const candidates: ScoredCandidate[] = [
      {
        raw: {
          id: "route-a",
          distanceM: 1000,
          durationS: 720,
          coordinates: [[-0.1, 51.5], [-0.09, 51.501]] as [number, number][],
        },
        exposure: {
          perVertex: [80],
          avgExposure: 80,
          maxExposure: 80,
          nearTrafficPct: 20,
          exposureCategory: "moderate",
        },
        distanceM: 1000,
      },
      {
        raw: {
          id: "route-b",
          distanceM: 1100,
          durationS: 800,
          coordinates: [[-0.11, 51.5], [-0.095, 51.502]] as [number, number][],
        },
        exposure: {
          perVertex: [79],
          avgExposure: 79, // only 1.25% reduction — below 3%
          maxExposure: 79,
          nearTrafficPct: 18,
          exposureCategory: "moderate",
        },
        distanceM: 1100,
      },
    ];

    const result = selectRoutes(candidates, "standard", true);

    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]?.tags).toContain("fastest");
    expect(result.routes[0]?.tags).toContain("cleanest");
  });
});

// ── T-09: Spur filter ──────────────────────────────────────────────────────
describe("T-09: Candidate generation (spur filter integrated)", () => {
  it("generateCandidates calls routing provider and returns candidates", async () => {
    const mockRouting = {
      getFootRoutes: vi.fn().mockResolvedValue([
        {
          id: "mock-route-1",
          distanceM: 1200,
          durationS: 864,
          coordinates: [
            [-0.1, 51.5],
            [-0.099, 51.501],
            [-0.098, 51.502],
          ] as [number, number][],
        },
      ] as RawRouteCandidate[]),
    };

    const origin = { lat: 51.5, lng: -0.1 };
    const destination = { lat: 51.502, lng: -0.098 };

    const result = await generateCandidates(origin, destination, mockRouting);

    expect(mockRouting.getFootRoutes).toHaveBeenCalled();
    expect(result.length).toBeGreaterThan(0);
    // All results should have valid coordinates
    for (const c of result) {
      expect(c.coordinates.length).toBeGreaterThan(1);
    }
  });
});
