import { describe, it, expect } from "vitest";
import {
  formatDistance,
  formatDuration,
  formatExtraTime,
  formatExtraDistance,
  formatExposureReduction,
} from "@/lib/format";
import { EXPOSURE_CONFIG } from "@/lib/exposure-config";

describe("Formatting Utilities (src/lib/format.ts)", () => {
  describe("formatDistance", () => {
    it("formats meters below 1000m without decimal", () => {
      expect(formatDistance(350)).toBe("350 m");
      expect(formatDistance(999)).toBe("999 m");
    });

    it("formats kilometers above 1000m with 1 decimal place", () => {
      expect(formatDistance(1000)).toBe("1.0 km");
      expect(formatDistance(1500)).toBe("1.5 km");
      expect(formatDistance(5200)).toBe("5.2 km");
    });
  });

  describe("formatDuration", () => {
    it("formats durations under 1 minute", () => {
      expect(formatDuration(25)).toBe("< 1 min");
    });

    it("formats durations under 1 hour in minutes", () => {
      expect(formatDuration(60)).toBe("1 min");
      expect(formatDuration(840)).toBe("14 min");
      expect(formatDuration(3540)).toBe("59 min");
    });

    it("formats durations over 1 hour with hours and minutes", () => {
      expect(formatDuration(3600)).toBe("1 hr");
      expect(formatDuration(3900)).toBe("1 hr 5 min");
      expect(formatDuration(7200)).toBe("2 hr");
    });
  });

  describe("Trade-off Comparison Formats", () => {
    it("formats extra time vs fastest route", () => {
      expect(formatExtraTime(20)).toBe("Same time");
      expect(formatExtraTime(120)).toBe("+2 min");
      expect(formatExtraTime(360)).toBe("+6 min");
    });

    it("formats extra distance vs fastest route", () => {
      expect(formatExtraDistance(15)).toBe("Same distance");
      expect(formatExtraDistance(250)).toBe("+250 m");
      expect(formatExtraDistance(1200)).toBe("+1.2 km");
    });

    it("formats exposure reduction percentage", () => {
      expect(formatExposureReduction(null)).toBe("Similar exposure");
      expect(formatExposureReduction(0)).toBe("Similar exposure");
      expect(formatExposureReduction(-5)).toBe("Similar exposure");
      expect(formatExposureReduction(18)).toBe("18% cleaner");
      expect(formatExposureReduction(24.7)).toBe("25% cleaner");
    });
  });

  describe("Exposure Configuration Check", () => {
    it("verifies immutable exposure configuration parameters", () => {
      expect(EXPOSURE_CONFIG.modelVersion).toBe("1.0.0");
      expect(EXPOSURE_CONFIG.roadsideUplift).toBe(0.8);
      expect(EXPOSURE_CONFIG.decayLengthMeters).toBe(60);
      expect(EXPOSURE_CONFIG.searchRadiusMeters).toBe(250);
      expect(EXPOSURE_CONFIG.detourLimits.strict).toBe(0.15);
      expect(EXPOSURE_CONFIG.detourLimits.standard).toBe(0.3);
      expect(EXPOSURE_CONFIG.detourLimits.flexible).toBe(0.5);
    });
  });
});
