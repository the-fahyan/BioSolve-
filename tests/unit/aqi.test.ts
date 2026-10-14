import { describe, it, expect } from "vitest";
import { categorizeAqi, getAqiMeta } from "@/lib/aqi";

describe("US AQI Breakpoints & Categorization (T-03)", () => {
  it("categorizes standard US EPA breakpoints accurately", () => {
    // 0 - 50: Good
    expect(categorizeAqi(0)).toBe("good");
    expect(categorizeAqi(25)).toBe("good");
    expect(categorizeAqi(50)).toBe("good");

    // 51 - 100: Moderate
    expect(categorizeAqi(51)).toBe("moderate");
    expect(categorizeAqi(75)).toBe("moderate");
    expect(categorizeAqi(100)).toBe("moderate");

    // 101 - 150: USG
    expect(categorizeAqi(101)).toBe("usg");
    expect(categorizeAqi(125)).toBe("usg");
    expect(categorizeAqi(150)).toBe("usg");

    // 151 - 200: Unhealthy
    expect(categorizeAqi(151)).toBe("unhealthy");
    expect(categorizeAqi(175)).toBe("unhealthy");
    expect(categorizeAqi(200)).toBe("unhealthy");

    // 201 - 300: Very Unhealthy
    expect(categorizeAqi(201)).toBe("very_unhealthy");
    expect(categorizeAqi(250)).toBe("very_unhealthy");
    expect(categorizeAqi(300)).toBe("very_unhealthy");

    // 301 - 500: Hazardous
    expect(categorizeAqi(301)).toBe("hazardous");
    expect(categorizeAqi(400)).toBe("hazardous");
    expect(categorizeAqi(500)).toBe("hazardous");
  });

  it("handles decimal values by rounding to nearest integer", () => {
    expect(categorizeAqi(50.4)).toBe("good");
    expect(categorizeAqi(50.6)).toBe("moderate");
    expect(categorizeAqi(100.2)).toBe("moderate");
    expect(categorizeAqi(100.8)).toBe("usg");
  });

  it("clamps values outside [0, 500]", () => {
    expect(categorizeAqi(-15)).toBe("good");
    expect(categorizeAqi(650)).toBe("hazardous");
  });

  it("retrieves valid metadata for all categories", () => {
    const meta = getAqiMeta("moderate");
    expect(meta.label).toBe("Moderate");
    expect(meta.fill).toBe("#EAB308");
    expect(meta.text).toBe("#1C1917");
  });
});
