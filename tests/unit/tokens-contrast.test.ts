import { describe, it, expect } from "vitest";

// WCAG 2.2 Relative Luminance and Contrast Ratio calculation
function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace("#", "");
  const r = parseInt(sanitized.substring(0, 2), 16);
  const g = parseInt(sanitized.substring(2, 4), 16);
  const b = parseInt(sanitized.substring(4, 6), 16);
  return [r, g, b];
}

function channelLuminance(val: number): number {
  const s = val / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe("Design System Color Contrast Verification (T-36 / WCAG 2.2 AA)", () => {
  it("verifies primary and muted text on white and app background >= 4.5:1", () => {
    const white = "#FFFFFF";
    const appBg = "#F8FAFC";
    const textPrimary = "#0F172A";
    const textMuted = "#475569";

    expect(getContrastRatio(textPrimary, white)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(textPrimary, appBg)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(textMuted, white)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(textMuted, appBg)).toBeGreaterThanOrEqual(4.5);
  });

  it("verifies primary brand button text contrast >= 4.5:1", () => {
    const white = "#FFFFFF";
    const brand700 = "#0F766E";
    const brand800 = "#115E59";
    const brand900 = "#134E4A";

    expect(getContrastRatio(white, brand700)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(white, brand800)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(white, brand900)).toBeGreaterThanOrEqual(4.5);
  });

  it("verifies semantic status banners meet text contrast >= 4.5:1", () => {
    // Info
    expect(getContrastRatio("#1E3A8A", "#EFF6FF")).toBeGreaterThanOrEqual(4.5);
    // Warning
    expect(getContrastRatio("#78350F", "#FFFBEB")).toBeGreaterThanOrEqual(4.5);
    // Error
    expect(getContrastRatio("#7F1D1D", "#FEF2F2")).toBeGreaterThanOrEqual(4.5);
    // Success
    expect(getContrastRatio("#14532D", "#F0FDF4")).toBeGreaterThanOrEqual(4.5);
  });

  it("verifies route tag chips meet text contrast >= 4.5:1", () => {
    // Fastest
    expect(getContrastRatio("#1E3A8A", "#DBEAFE")).toBeGreaterThanOrEqual(4.5);
    // Cleanest
    expect(getContrastRatio("#14532D", "#DCFCE7")).toBeGreaterThanOrEqual(4.5);
    // Balanced
    expect(getContrastRatio("#78350F", "#FEF3C7")).toBeGreaterThanOrEqual(4.5);
  });

  it("verifies US AQI category badges meet contrast requirement", () => {
    // Good (white on dark green)
    expect(getContrastRatio("#FFFFFF", "#15803D")).toBeGreaterThanOrEqual(4.5);
    // Moderate (dark text #1C1917 on yellow #EAB308)
    expect(getContrastRatio("#1C1917", "#EAB308")).toBeGreaterThanOrEqual(4.5);
    // USG (white on dark orange #C2410C)
    expect(getContrastRatio("#FFFFFF", "#C2410C")).toBeGreaterThanOrEqual(4.5);
    // Unhealthy (white on red #B91C1C)
    expect(getContrastRatio("#FFFFFF", "#B91C1C")).toBeGreaterThanOrEqual(4.5);
    // Very Unhealthy (white on purple #7E22CE)
    expect(getContrastRatio("#FFFFFF", "#7E22CE")).toBeGreaterThanOrEqual(4.5);
    // Hazardous (white on maroon #7F1D1D)
    expect(getContrastRatio("#FFFFFF", "#7F1D1D")).toBeGreaterThanOrEqual(4.5);
  });
});
