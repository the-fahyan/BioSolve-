import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  forwardBearing,
  destinationPoint,
  pointToSegmentDistance,
  densifyPolyline,
  arePolylinesNearIdentical,
} from "@/lib/geo";

describe("Geospatial Mathematical Procedures (src/lib/geo.ts)", () => {
  describe("Haversine Distance (T-01)", () => {
    it("returns 0 for identical points", () => {
      const p = { lat: 51.5074, lng: -0.1278 };
      expect(haversineDistance(p, p)).toBe(0);
    });

    it("accurately computes distance between known reference coordinates", () => {
      // London to Paris is ~343.5 km
      const london = { lat: 51.5074, lng: -0.1278 };
      const paris = { lat: 48.8566, lng: 2.3522 };
      const dist = haversineDistance(london, paris);
      expect(dist).toBeGreaterThan(340000);
      expect(dist).toBeLessThan(346000);
    });

    it("accurately computes pedestrian walking scale distances (< 1 km)", () => {
      const p1 = { lat: 52.520008, lng: 13.404954 };
      const p2 = { lat: 52.520845, lng: 13.406124 };
      const dist = haversineDistance(p1, p2);
      expect(dist).toBeGreaterThan(100);
      expect(dist).toBeLessThan(140);
    });
  });

  describe("Forward Bearing & Destination Point", () => {
    it("computes cardinal bearings accurately", () => {
      const origin = { lat: 0, lng: 0 };
      expect(forwardBearing(origin, { lat: 1, lng: 0 })).toBeCloseTo(0, 1); // North
      expect(forwardBearing(origin, { lat: 0, lng: 1 })).toBeCloseTo(90, 1); // East
      expect(forwardBearing({ lat: 1, lng: 0 }, origin)).toBeCloseTo(180, 1); // South
      expect(forwardBearing({ lat: 0, lng: 1 }, origin)).toBeCloseTo(270, 1); // West
    });

    it("destination point round-trips distance accurately", () => {
      const start = { lat: 52.52, lng: 13.405 };
      const dest = destinationPoint(start, 90, 500); // 500m East
      const measuredDist = haversineDistance(start, dest);
      expect(measuredDist).toBeCloseTo(500, 0);
    });
  });

  describe("Planar Point-to-Segment Distance", () => {
    it("returns 0 for a point exactly on the segment", () => {
      const a = { lat: 52.52, lng: 13.4 };
      const b = { lat: 52.52, lng: 13.41 };
      const midpoint = { lat: 52.52, lng: 13.405 };
      expect(pointToSegmentDistance(midpoint, a, b)).toBeCloseTo(0, 1);
    });

    it("measures distance to a zero-length segment (identical endpoints)", () => {
      const a = { lat: 52.52, lng: 13.4 };
      const p = { lat: 52.521, lng: 13.4 };
      const d = pointToSegmentDistance(p, a, a);
      expect(d).toBeGreaterThan(100);
      expect(d).toBeLessThan(125);
    });

    it("measures perpendicular distance accurately", () => {
      const a = { lat: 52.52, lng: 13.4 };
      const b = { lat: 52.52, lng: 13.41 };
      // 0.001 deg North is ~111m
      const p = { lat: 52.521, lng: 13.405 };
      const d = pointToSegmentDistance(p, a, b);
      expect(d).toBeGreaterThan(100);
      expect(d).toBeLessThan(125);
    });
  });

  describe("Polyline Densification (T-02)", () => {
    it("preserves start and end vertices strictly", () => {
      const start = { lat: 52.52, lng: 13.4 };
      const end = { lat: 52.522, lng: 13.402 };
      const densified = densifyPolyline([start, end], 50);

      expect(densified[0]).toEqual(start);
      expect(densified[densified.length - 1]).toEqual(end);
    });

    it("subdivides segments longer than 50 meters into edges <= 50 meters", () => {
      const start = { lat: 52.52, lng: 13.4 };
      // ~222 meters away
      const end = { lat: 52.522, lng: 13.4 };
      const densified = densifyPolyline([start, end], 50);

      expect(densified.length).toBeGreaterThan(3);
      for (let i = 0; i < densified.length - 1; i++) {
        const segDist = haversineDistance(densified[i]!, densified[i + 1]!);
        expect(segDist).toBeLessThanOrEqual(51); // small float tolerance
      }
    });

    it("does not subdivide segments that are already <= 50 meters", () => {
      const start = { lat: 52.52, lng: 13.4 };
      const end = destinationPoint(start, 90, 30); // 30m away
      const densified = densifyPolyline([start, end], 50);
      expect(densified.length).toBe(2);
    });
  });

  describe("Symmetric Polyline Deduplication (T-08)", () => {
    it("identifies near-identical polylines as duplicates", () => {
      const lineA = [
        { lat: 52.52, lng: 13.4 },
        { lat: 52.521, lng: 13.401 },
        { lat: 52.522, lng: 13.402 },
      ];
      // Offset by 5 meters (~0.00004 deg)
      const lineB = [
        { lat: 52.52004, lng: 13.40004 },
        { lat: 52.52104, lng: 13.40104 },
        { lat: 52.52204, lng: 13.40204 },
      ];

      expect(arePolylinesNearIdentical(lineA, lineB, 20)).toBe(true);
    });

    it("rejects divergent polylines as non-duplicates", () => {
      const lineA = [
        { lat: 52.52, lng: 13.4 },
        { lat: 52.521, lng: 13.401 },
        { lat: 52.522, lng: 13.402 },
      ];
      // Significantly divergent path (> 100 meters away)
      const lineB = [
        { lat: 52.52, lng: 13.4 },
        { lat: 52.525, lng: 13.41 },
        { lat: 52.522, lng: 13.402 },
      ];

      expect(arePolylinesNearIdentical(lineA, lineB, 20)).toBe(false);
    });
  });
});
